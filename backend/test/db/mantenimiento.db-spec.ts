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

async function crearCanchaConFranja(
  fecha: string,
  horaInicio = '08:00',
  horaFin = '09:00',
) {
  const idDisciplina = await fixtures.disciplina();
  const cancha = await fixtures.cancha(idDisciplina);
  const diaSemana = await dowOf(fecha);
  const idFranja = await fixtures.franja(cancha.id, diaSemana, {
    horaInicio,
    horaFin,
  });

  return { idDisciplina, cancha, idFranja };
}

async function estadoDe(idReserva: string): Promise<{
  estado: string;
  canceladoEn: Date | null;
}> {
  const result = await pool.query<{
    estado: string;
    cancelado_en: Date | null;
  }>('SELECT estado, cancelado_en FROM reservas WHERE id_reserva = $1', [
    idReserva,
  ]);

  return {
    estado: result.rows[0].estado,
    canceladoEn: result.rows[0].cancelado_en,
  };
}

describe('fn_cancha_a_mantenimiento', () => {
  it('cancela la reserva confirmada y audita CANCHA_A_MANTENIMIENTO', async () => {
    const fecha = await dateOffset(7);
    const { cancha, idFranja } = await crearCanchaConFranja(fecha);
    const idPersona = await fixtures.usuarioActivo();
    const reserva = await fixtures.reserva({ idPersona, idFranja, fecha });

    await pool.query(
      "UPDATE canchas SET estado = 'MANTENIMIENTO' WHERE id_cancha = $1",
      [cancha.id],
    );

    const estado = await estadoDe(reserva.id);
    expect(estado.estado).toBe('CANCELADA');
    expect(estado.canceladoEn).not.toBeNull();

    const auditoria = await pool.query<{ count: string }>(
      `SELECT count(*) FROM registros_auditoria
       WHERE evento = 'CANCHA_A_MANTENIMIENTO' AND id_entidad = $1`,
      [cancha.id],
    );
    expect(Number(auditoria.rows[0].count)).toBe(1);
  });

  it('cancela sin la restricción de 24 h una reserva AUTOGESTIONADA de hoy', async () => {
    const fecha = await dateOffset(0);
    const { cancha, idFranja } = await crearCanchaConFranja(
      fecha,
      '00:00',
      '01:00',
    );
    const idPersona = await fixtures.usuarioActivo();
    const reserva = await fixtures.reserva({ idPersona, idFranja, fecha });

    await pool.query(
      "UPDATE canchas SET estado = 'MANTENIMIENTO' WHERE id_cancha = $1",
      [cancha.id],
    );

    const estado = await estadoDe(reserva.id);
    expect(estado.estado).toBe('CANCELADA');
    expect(estado.canceladoEn).not.toBeNull();
  });

  it('no cancela reservas pasadas ni reservas EN_CURSO', async () => {
    const fechaFutura = await dateOffset(7);
    const fechaPasada = await dateOffset(-7);
    const { cancha, idFranja } = await crearCanchaConFranja(fechaFutura);
    const diaSemanaPasado = await dowOf(fechaPasada);
    const idFranjaPasada = await fixtures.franja(cancha.id, diaSemanaPasado, {
      horaInicio: '10:00',
      horaFin: '11:00',
    });
    const idPersona = await fixtures.usuarioActivo();

    const pasada = await fixtures.reserva({
      idPersona,
      idFranja: idFranjaPasada,
      fecha: fechaPasada,
    });
    const enCurso = await fixtures.reserva({
      idPersona,
      idFranja,
      fecha: fechaFutura,
    });

    await pool.query(
      "UPDATE reservas SET estado = 'EN_CURSO' WHERE id_reserva = $1",
      [enCurso.id],
    );

    await pool.query(
      "UPDATE canchas SET estado = 'MANTENIMIENTO' WHERE id_cancha = $1",
      [cancha.id],
    );

    expect((await estadoDe(pasada.id)).estado).toBe('CONFIRMADA');
    expect((await estadoDe(enCurso.id)).estado).toBe('EN_CURSO');
  });
});
