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

async function prepararDetalle(
  options: {
    cantidad?: number;
    incumplimientos?: number;
    stockTotal?: number;
  } = {},
) {
  const fecha = await dateOffset(7);
  const idDisciplina = await fixtures.disciplina();
  const cancha = await fixtures.cancha(idDisciplina);
  const diaSemana = await dowOf(fecha);
  const idFranja = await fixtures.franja(cancha.id, diaSemana);
  const idPersona = await fixtures.usuarioActivo({
    incumplimientos: options.incumplimientos,
  });
  const reserva = await fixtures.reserva({ idPersona, idFranja, fecha });
  const equipamiento = await fixtures.equipamiento(idDisciplina, {
    stockTotal: options.stockTotal ?? 5,
    precioAlquiler: 100,
  });
  const detalle = await fixtures.detalleAlquiler({
    idReserva: reserva.id,
    idEquipamiento: equipamiento.id,
    cantidad: options.cantidad ?? 2,
  });

  return { idPersona, equipamiento, detalle };
}

async function stockDe(idEquipamiento: string): Promise<number> {
  const result = await pool.query<{ stock_disponible: number }>(
    'SELECT stock_disponible FROM equipamientos WHERE id_equipamiento = $1',
    [idEquipamiento],
  );
  return Number(result.rows[0].stock_disponible);
}

async function estadoUsuario(idPersona: string): Promise<{
  incumplimientos: number;
  estado: string;
}> {
  const result = await pool.query<{
    incumplimientos_equipamiento: number;
    estado: string;
  }>(
    `SELECT incumplimientos_equipamiento, estado
     FROM usuarios WHERE id_usuario = $1`,
    [idPersona],
  );

  return {
    incumplimientos: Number(result.rows[0].incumplimientos_equipamiento),
    estado: result.rows[0].estado,
  };
}

async function contarAuditoria(
  evento: string,
  idEntidad: string,
): Promise<number> {
  const result = await pool.query<{ count: string }>(
    `SELECT count(*) FROM registros_auditoria
     WHERE evento = $1 AND id_entidad = $2`,
    [evento, idEntidad],
  );
  return Number(result.rows[0].count);
}

describe('fn_gestionar_devolucion', () => {
  it('DEVUELTO: restaura stock, registra la fecha real y no suma incumplimientos', async () => {
    const { idPersona, equipamiento, detalle } = await prepararDetalle();

    await pool.query(
      `UPDATE detalle_alquiler_equipamiento
       SET estado_devolucion = 'DEVUELTO',
           fecha_devolucion_real = COALESCE(fecha_devolucion_real, now())
       WHERE id_detalle = $1`,
      [detalle.id],
    );

    expect(await stockDe(equipamiento.id)).toBe(5);
    expect((await estadoUsuario(idPersona)).incumplimientos).toBe(0);

    const fechaReal = await pool.query<{ fecha_devolucion_real: Date | null }>(
      'SELECT fecha_devolucion_real FROM detalle_alquiler_equipamiento WHERE id_detalle = $1',
      [detalle.id],
    );
    expect(fechaReal.rows[0].fecha_devolucion_real).not.toBeNull();
  });

  it('DEVUELTO_TARDE: restaura stock, incrementa incumplimientos y audita', async () => {
    const { idPersona, equipamiento, detalle } = await prepararDetalle();

    await pool.query(
      `UPDATE detalle_alquiler_equipamiento
       SET estado_devolucion = 'DEVUELTO_TARDE'
       WHERE id_detalle = $1`,
      [detalle.id],
    );

    expect(await stockDe(equipamiento.id)).toBe(5);
    expect((await estadoUsuario(idPersona)).incumplimientos).toBe(1);
    expect(
      await contarAuditoria('INCUMPLIMIENTO_EQUIPAMIENTO', detalle.id),
    ).toBe(1);
  });

  it('NO_DEVUELTO: incrementa incumplimientos y audita sin restaurar stock', async () => {
    const { idPersona, equipamiento, detalle } = await prepararDetalle();

    await pool.query(
      `UPDATE detalle_alquiler_equipamiento
       SET estado_devolucion = 'NO_DEVUELTO'
       WHERE id_detalle = $1`,
      [detalle.id],
    );

    expect(await stockDe(equipamiento.id)).toBe(3);
    expect((await estadoUsuario(idPersona)).incumplimientos).toBe(1);
    expect(
      await contarAuditoria('INCUMPLIMIENTO_EQUIPAMIENTO', detalle.id),
    ).toBe(1);
  });

  it('suspende al usuario al llegar a 3 incumplimientos', async () => {
    const { idPersona, detalle } = await prepararDetalle({
      incumplimientos: 2,
    });

    await pool.query(
      `UPDATE detalle_alquiler_equipamiento
       SET estado_devolucion = 'NO_DEVUELTO'
       WHERE id_detalle = $1`,
      [detalle.id],
    );

    const usuario = await estadoUsuario(idPersona);
    expect(usuario.incumplimientos).toBe(3);
    expect(usuario.estado).toBe('SUSPENDIDO');
    expect(
      await contarAuditoria(
        'USUARIO_SUSPENDIDO_POR_INCUMPLIMIENTOS',
        idPersona,
      ),
    ).toBe(1);
  });

  it('doble devolución: NO_DEVUELTO -> DEVUELTO restaura stock una sola vez', async () => {
    const { idPersona, equipamiento, detalle } = await prepararDetalle();

    await pool.query(
      `UPDATE detalle_alquiler_equipamiento
       SET estado_devolucion = 'NO_DEVUELTO'
       WHERE id_detalle = $1`,
      [detalle.id],
    );

    await pool.query(
      `UPDATE detalle_alquiler_equipamiento
       SET estado_devolucion = 'DEVUELTO'
       WHERE id_detalle = $1`,
      [detalle.id],
    );

    expect(await stockDe(equipamiento.id)).toBe(5);
    expect((await estadoUsuario(idPersona)).incumplimientos).toBe(1);
    expect(
      await contarAuditoria('INCUMPLIMIENTO_EQUIPAMIENTO', detalle.id),
    ).toBe(1);
  });
});
