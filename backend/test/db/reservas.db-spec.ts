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

async function canchaConFranja(
  fecha: string,
  options: {
    precioBase?: number;
    estado?: 'DISPONIBLE' | 'MANTENIMIENTO';
    horaInicio?: string;
    horaFin?: string;
  } = {},
) {
  const idDisciplina = await fixtures.disciplina();
  const cancha = await fixtures.cancha(idDisciplina, {
    precioBase: options.precioBase,
    estado: options.estado,
  });
  const diaSemana = await dowOf(fecha);
  const idFranja = await fixtures.franja(cancha.id, diaSemana, {
    horaInicio: options.horaInicio,
    horaFin: options.horaFin,
  });

  return { cancha, idFranja, diaSemana };
}

describe('fn_validar_reserva', () => {
  it('crea una reserva válida con el monto del precio base', async () => {
    const fecha = await dateOffset(7);
    const { idFranja } = await canchaConFranja(fecha, { precioBase: 1500.5 });
    const idPersona = await fixtures.usuarioActivo();

    const reserva = await fixtures.reserva({ idPersona, idFranja, fecha });

    const result = await pool.query(
      'SELECT estado, monto_total FROM reservas WHERE id_reserva = $1',
      [reserva.id],
    );

    expect(result.rows[0].estado).toBe('CONFIRMADA');
    expect(Number(result.rows[0].monto_total)).toBe(1500.5);
  });

  it('rechaza una fecha cuyo día no coincide con la franja', async () => {
    const fecha = await dateOffset(7);
    const { idFranja, diaSemana } = await canchaConFranja(fecha);
    const otroDia = (diaSemana + 1) % 7;
    const idFranjaInvalida = await fixtures.franja(
      (
        await pool.query<{ id_cancha: string }>(
          'SELECT id_cancha FROM franjas_horarias WHERE id_franja = $1',
          [idFranja],
        )
      ).rows[0].id_cancha,
      otroDia,
      { horaInicio: '10:00', horaFin: '11:00' },
    );
    const idPersona = await fixtures.usuarioActivo();

    await expect(
      fixtures.reserva({ idPersona, idFranja: idFranjaInvalida, fecha }),
    ).rejects.toThrow(
      'La fecha no corresponde al día de la semana de la franja',
    );
  });

  it('rechaza una reserva en una cancha en mantenimiento', async () => {
    const fecha = await dateOffset(7);
    const { idFranja } = await canchaConFranja(fecha, {
      estado: 'MANTENIMIENTO',
    });
    const idPersona = await fixtures.usuarioActivo();

    await expect(
      fixtures.reserva({ idPersona, idFranja, fecha }),
    ).rejects.toThrow('La cancha se encuentra en mantenimiento');
  });

  it('rechaza usuarios sin cuenta o que no están activos', async () => {
    const fecha = await dateOffset(7);
    const { idFranja } = await canchaConFranja(fecha);
    const idInvitado = await fixtures.persona();
    const idSuspendido = await fixtures.usuarioSuspendido();

    await expect(
      fixtures.reserva({ idPersona: idInvitado, idFranja, fecha }),
    ).rejects.toThrow('Solo usuarios registrados y activos pueden reservar');

    await expect(
      fixtures.reserva({ idPersona: idSuspendido, idFranja, fecha }),
    ).rejects.toThrow('Solo usuarios registrados y activos pueden reservar');
  });

  it('rechaza la tercera reserva confirmada del usuario', async () => {
    const fecha = await dateOffset(7);
    const { cancha, idFranja, diaSemana } = await canchaConFranja(fecha);
    const idFranjaB = await fixtures.franja(cancha.id, diaSemana, {
      horaInicio: '12:00',
      horaFin: '13:00',
    });
    const idPersona = await fixtures.usuarioActivo();

    await fixtures.reserva({ idPersona, idFranja, fecha });
    await fixtures.reserva({ idPersona, idFranja: idFranjaB, fecha });

    await expect(
      fixtures.reserva({
        idPersona,
        idFranja: await fixtures.franja(cancha.id, diaSemana, {
          horaInicio: '14:00',
          horaFin: '15:00',
        }),
        fecha,
      }),
    ).rejects.toThrow(
      'El usuario ya posee el máximo de 2 reservas confirmadas',
    );

    const result = await pool.query(
      `SELECT count(*) FROM reservas
       WHERE id_persona = $1 AND estado = 'CONFIRMADA'`,
      [idPersona],
    );

    expect(Number(result.rows[0].count)).toBe(2);
  });

  it('concurrencia: dos reservas simultáneas dejan una sola confirmada de más', async () => {
    const fechaExistente = await dateOffset(14);
    const existente = await canchaConFranja(fechaExistente);
    const idPersona = await fixtures.usuarioActivo();

    await fixtures.reserva({
      idPersona,
      idFranja: existente.idFranja,
      fecha: fechaExistente,
    });

    const fecha = await dateOffset(7);
    const { cancha, idFranja, diaSemana } = await canchaConFranja(fecha);
    const idFranjaB = await fixtures.franja(cancha.id, diaSemana, {
      horaInicio: '10:00',
      horaFin: '11:00',
    });

    const results = await Promise.allSettled([
      fixtures.reserva({ idPersona, idFranja, fecha }),
      fixtures.reserva({ idPersona, idFranja: idFranjaB, fecha }),
    ]);

    const exitos = results.filter((result) => result.status === 'fulfilled');
    const errores = results.filter(
      (result): result is PromiseRejectedResult =>
        result.status === 'rejected',
    );

    expect(exitos).toHaveLength(1);
    expect(errores).toHaveLength(1);
    expect(errores[0].reason.message).toContain(
      'El usuario ya posee el máximo de 2 reservas confirmadas',
    );

    const result = await pool.query(
      `SELECT count(*) FROM reservas
       WHERE id_persona = $1 AND estado = 'CONFIRMADA'`,
      [idPersona],
    );

    expect(Number(result.rows[0].count)).toBe(2);
  });
});
