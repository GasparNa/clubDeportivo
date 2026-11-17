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

async function prepararReserva(options: {
  fechaOffset: number;
  horaInicio?: string;
  horaFin?: string;
  origen?: 'AUTOGESTIONADA' | 'MANUAL_GERENCIA';
  estado?: string;
}) {
  const fecha = await dateOffset(options.fechaOffset);
  const idDisciplina = await fixtures.disciplina();
  const cancha = await fixtures.cancha(idDisciplina);
  const diaSemana = await dowOf(fecha);
  const idFranja = await fixtures.franja(cancha.id, diaSemana, {
    horaInicio: options.horaInicio,
    horaFin: options.horaFin,
  });
  const idPersona = await fixtures.usuarioActivo();
  const reserva = await fixtures.reserva({
    idPersona,
    idFranja,
    fecha,
    origen: options.origen,
    estado: options.estado,
  });

  return { fecha, cancha, idFranja, idPersona, reserva };
}

describe('fn_actualizar_reserva', () => {
  it('permite la transición CONFIRMADA -> EN_CURSO -> COMPLETADA y rechaza la inversa', async () => {
    const { reserva } = await prepararReserva({ fechaOffset: 7 });

    const antes = await pool.query(
      'SELECT actualizado_en FROM reservas WHERE id_reserva = $1',
      [reserva.id],
    );

    await pool.query(
      "UPDATE reservas SET estado = 'EN_CURSO' WHERE id_reserva = $1",
      [reserva.id],
    );

    const enCurso = await pool.query(
      'SELECT estado, actualizado_en FROM reservas WHERE id_reserva = $1',
      [reserva.id],
    );

    expect(enCurso.rows[0].estado).toBe('EN_CURSO');
    expect(new Date(enCurso.rows[0].actualizado_en).getTime()).toBeGreaterThanOrEqual(
      new Date(antes.rows[0].actualizado_en).getTime(),
    );

    await pool.query(
      "UPDATE reservas SET estado = 'COMPLETADA' WHERE id_reserva = $1",
      [reserva.id],
    );

    await expect(
      pool.query(
        "UPDATE reservas SET estado = 'CANCELADA' WHERE id_reserva = $1",
        [reserva.id],
      ),
    ).rejects.toThrow('Transición de estado inválida: COMPLETADA -> CANCELADA');
  });

  it('aplica la antelación de 1 día en cancelaciones AUTOGESTIONADA', async () => {
    const pasada = await prepararReserva({
      fechaOffset: -7,
      horaInicio: '00:00',
      horaFin: '01:00',
    });

    await expect(
      pool.query(
        "UPDATE reservas SET estado = 'CANCELADA' WHERE id_reserva = $1",
        [pasada.reserva.id],
      ),
    ).rejects.toThrow('La cancelación requiere al menos 1 día de antelación');

    const pendiente = await pool.query(
      'SELECT estado FROM reservas WHERE id_reserva = $1',
      [pasada.reserva.id],
    );
    expect(pendiente.rows[0].estado).toBe('CONFIRMADA');

    const futura = await prepararReserva({
      fechaOffset: 7,
      horaInicio: '00:00',
      horaFin: '01:00',
    });

    await pool.query(
      "UPDATE reservas SET estado = 'CANCELADA' WHERE id_reserva = $1",
      [futura.reserva.id],
    );

    const cancelada = await pool.query(
      'SELECT estado, cancelado_en FROM reservas WHERE id_reserva = $1',
      [futura.reserva.id],
    );
    expect(cancelada.rows[0].estado).toBe('CANCELADA');
    expect(cancelada.rows[0].cancelado_en).not.toBeNull();
  });

  it('cancela MANUAL_GERENCIA con turno pasado y AUTOGESTIONADA como GERENTE', async () => {
    const manual = await prepararReserva({
      fechaOffset: -7,
      horaInicio: '00:00',
      horaFin: '01:00',
      origen: 'MANUAL_GERENCIA',
    });

    await pool.query(
      "UPDATE reservas SET estado = 'CANCELADA' WHERE id_reserva = $1",
      [manual.reserva.id],
    );

    const canceladaManual = await pool.query(
      'SELECT estado, cancelado_en FROM reservas WHERE id_reserva = $1',
      [manual.reserva.id],
    );
    expect(canceladaManual.rows[0].estado).toBe('CANCELADA');
    expect(canceladaManual.rows[0].cancelado_en).not.toBeNull();

    const autogestionada = await prepararReserva({
      fechaOffset: -7,
      horaInicio: '00:00',
      horaFin: '01:00',
    });

    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await client.query("SET LOCAL app.actor_rol = 'GERENTE'");
      await client.query(
        "UPDATE reservas SET estado = 'CANCELADA' WHERE id_reserva = $1",
        [autogestionada.reserva.id],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    const canceladaGerente = await pool.query(
      'SELECT estado FROM reservas WHERE id_reserva = $1',
      [autogestionada.reserva.id],
    );
    expect(canceladaGerente.rows[0].estado).toBe('CANCELADA');
  });
});
