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

async function prepararReserva() {
  const fecha = await dateOffset(7);
  const idDisciplina = await fixtures.disciplina();
  const cancha = await fixtures.cancha(idDisciplina);
  const diaSemana = await dowOf(fecha);
  const idFranja = await fixtures.franja(cancha.id, diaSemana);
  const idPersona = await fixtures.usuarioActivo();
  const reserva = await fixtures.reserva({ idPersona, idFranja, fecha });

  return { idPersona, reserva };
}

async function auditoriaDe(
  evento: string,
  idEntidad: string,
): Promise<Array<{ actor_tipo: string; id_usuario: string | null; detalle: any }>> {
  const result = await pool.query<{
    actor_tipo: string;
    id_usuario: string | null;
    detalle: any;
  }>(
    `SELECT actor_tipo, id_usuario, detalle
     FROM registros_auditoria
     WHERE evento = $1 AND id_entidad = $2`,
    [evento, idEntidad],
  );

  return result.rows;
}

describe('fn_auditar_reserva', () => {
  it('registra RESERVA_CREADA al dar de alta la reserva', async () => {
    const { idPersona, reserva } = await prepararReserva();

    const filas = await auditoriaDe('RESERVA_CREADA', reserva.id);

    expect(filas).toHaveLength(1);
    expect(filas[0].actor_tipo).toBe('USUARIO');
    expect(filas[0].id_usuario).toBe(idPersona);
    expect(filas[0].detalle).toMatchObject({
      id_persona: idPersona,
      estado: 'CONFIRMADA',
      origen: 'AUTOGESTIONADA',
    });
  });

  it('registra RESERVA_CAMBIO_ESTADO al cambiar el estado', async () => {
    const { reserva } = await prepararReserva();

    await pool.query(
      "UPDATE reservas SET estado = 'EN_CURSO' WHERE id_reserva = $1",
      [reserva.id],
    );

    const filas = await auditoriaDe('RESERVA_CAMBIO_ESTADO', reserva.id);

    expect(filas).toHaveLength(1);
    expect(filas[0].actor_tipo).toBe('USUARIO');
    expect(filas[0].detalle).toMatchObject({
      estado_anterior: 'CONFIRMADA',
      estado_nuevo: 'EN_CURSO',
    });
  });

  it('no audita un update que no cambia el estado', async () => {
    const { reserva } = await prepararReserva();

    const antes = await auditoriaDe('RESERVA_CAMBIO_ESTADO', reserva.id);
    expect(antes).toHaveLength(0);

    await pool.query(
      'UPDATE reservas SET monto_total = $2 WHERE id_reserva = $1',
      [reserva.id, 1234],
    );

    const despues = await auditoriaDe('RESERVA_CAMBIO_ESTADO', reserva.id);
    expect(despues).toHaveLength(0);

    const monto = await pool.query<{ monto_total: string }>(
      'SELECT monto_total FROM reservas WHERE id_reserva = $1',
      [reserva.id],
    );
    expect(Number(monto.rows[0].monto_total)).toBe(1234);
  });
});
