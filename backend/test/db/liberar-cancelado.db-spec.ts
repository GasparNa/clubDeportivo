import { assertTestDatabase, dateOffset, dowOf, pool } from './db';
import { Fixtures } from './fixtures';

const fixtures = new Fixtures(pool);

beforeAll(async () => {
  await assertTestDatabase();
});

afterEach(async () => {
  await fixtures.cleanup();
});

afterAll(async () => {
  await pool.end();
});

async function prepararReservaConDetalle() {
  const fecha = await dateOffset(7);
  const idDisciplina = await fixtures.disciplina();
  const cancha = await fixtures.cancha(idDisciplina);
  const diaSemana = await dowOf(fecha);
  const idFranja = await fixtures.franja(cancha.id, diaSemana);
  const idPersona = await fixtures.usuarioActivo();
  const reserva = await fixtures.reserva({ idPersona, idFranja, fecha });
  const equipamiento = await fixtures.equipamiento(idDisciplina, {
    stockTotal: 5,
    precioAlquiler: 100,
  });
  const detalle = await fixtures.detalleAlquiler({
    idReserva: reserva.id,
    idEquipamiento: equipamiento.id,
    cantidad: 2,
  });

  return { reserva, equipamiento, detalle };
}

async function stockDe(idEquipamiento: string): Promise<number> {
  const result = await pool.query<{ stock_disponible: number }>(
    'SELECT stock_disponible FROM equipamientos WHERE id_equipamiento = $1',
    [idEquipamiento],
  );
  return Number(result.rows[0].stock_disponible);
}

async function estadoDetalle(idDetalle: string): Promise<string> {
  const result = await pool.query<{ estado_devolucion: string }>(
    'SELECT estado_devolucion FROM detalle_alquiler_equipamiento WHERE id_detalle = $1',
    [idDetalle],
  );
  return result.rows[0].estado_devolucion;
}

describe('fn_liberar_equipamiento_cancelado', () => {
  it('restaura el stock y cancela el detalle pendiente', async () => {
    const { reserva, equipamiento, detalle } =
      await prepararReservaConDetalle();

    expect(await stockDe(equipamiento.id)).toBe(3);

    await pool.query(
      "UPDATE reservas SET estado = 'CANCELADA' WHERE id_reserva = $1",
      [reserva.id],
    );

    expect(await stockDe(equipamiento.id)).toBe(5);
    expect(await estadoDetalle(detalle.id)).toBe('CANCELADO');

    const cancelada = await pool.query(
      'SELECT estado, cancelado_en FROM reservas WHERE id_reserva = $1',
      [reserva.id],
    );
    expect(cancelada.rows[0].estado).toBe('CANCELADA');
    expect(cancelada.rows[0].cancelado_en).not.toBeNull();
  });

  it('no duplica la restauración si el detalle ya fue devuelto', async () => {
    const { reserva, equipamiento, detalle } =
      await prepararReservaConDetalle();

    await pool.query(
      `UPDATE detalle_alquiler_equipamiento
       SET estado_devolucion = 'DEVUELTO'
       WHERE id_detalle = $1`,
      [detalle.id],
    );

    expect(await stockDe(equipamiento.id)).toBe(5);

    await pool.query(
      "UPDATE reservas SET estado = 'CANCELADA' WHERE id_reserva = $1",
      [reserva.id],
    );

    expect(await stockDe(equipamiento.id)).toBe(5);
    expect(await estadoDetalle(detalle.id)).toBe('DEVUELTO');
  });
});
