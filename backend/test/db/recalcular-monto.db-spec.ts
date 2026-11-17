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

async function prepararReserva(precioBase: number) {
  const fecha = await dateOffset(7);
  const idDisciplina = await fixtures.disciplina();
  const cancha = await fixtures.cancha(idDisciplina, { precioBase });
  const diaSemana = await dowOf(fecha);
  const idFranja = await fixtures.franja(cancha.id, diaSemana);
  const idPersona = await fixtures.usuarioActivo();
  const reserva = await fixtures.reserva({ idPersona, idFranja, fecha });
  const equipamiento = await fixtures.equipamiento(idDisciplina, {
    precioAlquiler: 500,
  });

  return { reserva, equipamiento };
}

async function montoDe(idReserva: string): Promise<number> {
  const result = await pool.query<{ monto_total: string }>(
    'SELECT monto_total FROM reservas WHERE id_reserva = $1',
    [idReserva],
  );
  return Number(result.rows[0].monto_total);
}

describe('fn_recalcular_monto_reserva', () => {
  it('suma el subtotal al alta y vuelve al precio base al borrar', async () => {
    const { reserva, equipamiento } = await prepararReserva(1000);

    expect(await montoDe(reserva.id)).toBe(1000);

    const detalle = await fixtures.detalleAlquiler({
      idReserva: reserva.id,
      idEquipamiento: equipamiento.id,
      cantidad: 1,
    });

    expect(detalle.subtotal).toBe(500);
    expect(await montoDe(reserva.id)).toBe(1500);

    await pool.query(
      'DELETE FROM detalle_alquiler_equipamiento WHERE id_detalle = $1',
      [detalle.id],
    );

    expect(await montoDe(reserva.id)).toBe(1000);
  });

  it('excluye del SUM un detalle CANCELADO', async () => {
    const { reserva, equipamiento } = await prepararReserva(1000);

    const detalle = await fixtures.detalleAlquiler({
      idReserva: reserva.id,
      idEquipamiento: equipamiento.id,
      cantidad: 1,
    });

    expect(await montoDe(reserva.id)).toBe(1500);

    await pool.query(
      `UPDATE detalle_alquiler_equipamiento
       SET estado_devolucion = 'CANCELADO'
       WHERE id_detalle = $1`,
      [detalle.id],
    );

    expect(await montoDe(reserva.id)).toBe(1000);
  });
});
