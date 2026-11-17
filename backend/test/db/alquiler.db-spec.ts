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

async function prepararReserva(options: { precioBase?: number } = {}) {
  const fecha = await dateOffset(7);
  const idDisciplina = await fixtures.disciplina();
  const cancha = await fixtures.cancha(idDisciplina, {
    precioBase: options.precioBase,
  });
  const diaSemana = await dowOf(fecha);
  const idFranja = await fixtures.franja(cancha.id, diaSemana);
  const idPersona = await fixtures.usuarioActivo();
  const reserva = await fixtures.reserva({ idPersona, idFranja, fecha });

  return { idDisciplina, cancha, idPersona, reserva };
}

describe('fn_validar_alquiler_equipamiento', () => {
  it('descuenta stock y calcula precio, subtotal y monto total', async () => {
    const { idDisciplina, reserva } = await prepararReserva({
      precioBase: 1000,
    });
    const equipamiento = await fixtures.equipamiento(idDisciplina, {
      stockTotal: 5,
      precioAlquiler: 100,
    });

    const detalle = await fixtures.detalleAlquiler({
      idReserva: reserva.id,
      idEquipamiento: equipamiento.id,
      cantidad: 2,
    });

    expect(detalle.precioUnitario).toBe(100);
    expect(detalle.subtotal).toBe(200);
    expect(detalle.estado).toBe('PENDIENTE');

    const stock = await pool.query(
      'SELECT stock_disponible FROM equipamientos WHERE id_equipamiento = $1',
      [equipamiento.id],
    );
    expect(Number(stock.rows[0].stock_disponible)).toBe(3);

    const monto = await pool.query(
      'SELECT monto_total FROM reservas WHERE id_reserva = $1',
      [reserva.id],
    );
    expect(Number(monto.rows[0].monto_total)).toBe(1200);
  });

  it('rechaza el alquiler de un invitado', async () => {
    const { idDisciplina, idPersona, reserva } = await prepararReserva();
    const equipamiento = await fixtures.equipamiento(idDisciplina);

    await pool.query('DELETE FROM usuarios WHERE id_usuario = $1', [idPersona]);

    await expect(
      fixtures.detalleAlquiler({
        idReserva: reserva.id,
        idEquipamiento: equipamiento.id,
        cantidad: 1,
      }),
    ).rejects.toThrow('Un invitado no puede alquilar equipamiento');
  });

  it('rechaza el alquiler de un usuario suspendido', async () => {
    const { idDisciplina, idPersona, reserva } = await prepararReserva();
    const equipamiento = await fixtures.equipamiento(idDisciplina);

    await pool.query(
      "UPDATE usuarios SET estado = 'SUSPENDIDO' WHERE id_usuario = $1",
      [idPersona],
    );

    await expect(
      fixtures.detalleAlquiler({
        idReserva: reserva.id,
        idEquipamiento: equipamiento.id,
        cantidad: 1,
      }),
    ).rejects.toThrow('El usuario debe estar ACTIVO para alquilar equipamiento');
  });

  it('rechaza equipamiento de otra disciplina', async () => {
    const { reserva } = await prepararReserva();
    const otraDisciplina = await fixtures.disciplina();
    const equipamiento = await fixtures.equipamiento(otraDisciplina);

    await expect(
      fixtures.detalleAlquiler({
        idReserva: reserva.id,
        idEquipamiento: equipamiento.id,
        cantidad: 1,
      }),
    ).rejects.toThrow(
      'El equipamiento no corresponde a la disciplina de la cancha',
    );
  });

  it('rechaza una cantidad mayor al stock disponible', async () => {
    const { idDisciplina, reserva } = await prepararReserva();
    const equipamiento = await fixtures.equipamiento(idDisciplina, {
      stockTotal: 1,
    });

    await expect(
      fixtures.detalleAlquiler({
        idReserva: reserva.id,
        idEquipamiento: equipamiento.id,
        cantidad: 2,
      }),
    ).rejects.toThrow('Stock insuficiente');
  });
});
