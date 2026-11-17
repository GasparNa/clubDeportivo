import { randomInt, randomUUID } from 'node:crypto';
import { Pool } from 'pg';

interface CreatedIds {
  detalle: string[];
  reserva: string[];
  equipamiento: string[];
  franja: string[];
  cancha: string[];
  usuario: string[];
  persona: string[];
  disciplina: string[];
}

interface CanchaOptions {
  nombre?: string;
  precioBase?: number;
  estado?: 'DISPONIBLE' | 'MANTENIMIENTO';
}

interface FranjaOptions {
  horaInicio?: string;
  horaFin?: string;
}

interface EquipamientoOptions {
  nombre?: string;
  stockTotal?: number;
  stockDisponible?: number;
  precioAlquiler?: number;
}

interface UsuarioOptions {
  rol?: 'SOCIO' | 'GERENTE' | 'ADMINISTRADOR';
  incumplimientos?: number;
}

interface ReservaOptions {
  idPersona: string;
  idFranja: string;
  fecha: string;
  estado?: string;
  origen?: 'AUTOGESTIONADA' | 'MANUAL_GERENCIA';
}

interface DetalleOptions {
  idReserva: string;
  idEquipamiento: string;
  cantidad: number;
  precioUnitario?: number | null;
  estado?: string;
}

export class Fixtures {
  private readonly ids: CreatedIds = {
    detalle: [],
    reserva: [],
    equipamiento: [],
    franja: [],
    cancha: [],
    usuario: [],
    persona: [],
    disciplina: [],
  };

  constructor(private readonly pool: Pool) {}

  private async insertOne(
    sql: string,
    params: unknown[],
  ): Promise<Record<string, any>> {
    const result = await this.pool.query(sql, params);
    return result.rows[0];
  }

  async disciplina(nombre = `Disciplina ${randomUUID()}`): Promise<string> {
    const row = await this.insertOne(
      'INSERT INTO disciplinas (nombre, descripcion) VALUES ($1, $2) RETURNING id_disciplina',
      [nombre, 'Disciplina generada por la suite de reglas de negocio'],
    );
    this.ids.disciplina.push(row.id_disciplina);
    return row.id_disciplina;
  }

  async cancha(
    idDisciplina: string,
    options: CanchaOptions = {},
  ): Promise<{ id: string; precioBase: number }> {
    const nombre = options.nombre ?? `Cancha ${randomUUID()}`;
    const precioBase = options.precioBase ?? 1000;
    const estado = options.estado ?? 'DISPONIBLE';

    const row = await this.insertOne(
      `INSERT INTO canchas (id_disciplina, nombre, precio_base, estado)
       VALUES ($1, $2, $3, $4)
       RETURNING id_cancha`,
      [idDisciplina, nombre, precioBase, estado],
    );

    this.ids.cancha.push(row.id_cancha);
    return { id: row.id_cancha, precioBase };
  }

  async franja(
    idCancha: string,
    diaSemana: number,
    options: FranjaOptions = {},
  ): Promise<string> {
    const horaInicio = options.horaInicio ?? '08:00';
    const horaFin = options.horaFin ?? '09:00';

    const row = await this.insertOne(
      `INSERT INTO franjas_horarias (id_cancha, dia_semana, hora_inicio, hora_fin)
       VALUES ($1, $2, $3, $4)
       RETURNING id_franja`,
      [idCancha, diaSemana, horaInicio, horaFin],
    );

    this.ids.franja.push(row.id_franja);
    return row.id_franja;
  }

  async equipamiento(
    idDisciplina: string,
    options: EquipamientoOptions = {},
  ): Promise<{ id: string; precioAlquiler: number; stockDisponible: number }> {
    const nombre = options.nombre ?? `Equipamiento ${randomUUID()}`;
    const stockTotal = options.stockTotal ?? 5;
    const stockDisponible = options.stockDisponible ?? stockTotal;
    const precioAlquiler = options.precioAlquiler ?? 500;

    const row = await this.insertOne(
      `INSERT INTO equipamientos
         (id_disciplina, nombre, stock_total, stock_disponible, precio_alquiler)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id_equipamiento`,
      [idDisciplina, nombre, stockTotal, stockDisponible, precioAlquiler],
    );

    this.ids.equipamiento.push(row.id_equipamiento);
    return {
      id: row.id_equipamiento,
      precioAlquiler,
      stockDisponible,
    };
  }

  async persona(options: {
    dni?: string;
    nombre?: string;
    apellido?: string;
  } = {}): Promise<string> {
    const dni = options.dni ?? String(randomInt(10_000_000, 100_000_000));
    const nombre = options.nombre ?? `Persona ${randomUUID()}`;
    const apellido = options.apellido ?? 'Prueba';

    const row = await this.insertOne(
      `INSERT INTO personas (dni, nombre, apellido)
       VALUES ($1, $2, $3)
       RETURNING id_persona`,
      [dni, nombre, apellido],
    );

    this.ids.persona.push(row.id_persona);
    return row.id_persona;
  }

  private async usuarioPara(
    idPersona: string,
    estado: 'ACTIVO' | 'SUSPENDIDO' | 'PENDIENTE',
    options: UsuarioOptions = {},
  ): Promise<string> {
    const rol = options.rol ?? 'SOCIO';
    const incumplimientos = options.incumplimientos ?? 0;

    await this.insertOne(
      `INSERT INTO usuarios (id_usuario, rol, estado, incumplimientos_equipamiento)
       VALUES ($1, $2, $3, $4)
       RETURNING id_usuario`,
      [idPersona, rol, estado, incumplimientos],
    );

    this.ids.usuario.push(idPersona);
    return idPersona;
  }

  async usuarioActivo(options: UsuarioOptions = {}): Promise<string> {
    const idPersona = await this.persona();
    return this.usuarioPara(idPersona, 'ACTIVO', options);
  }

  async usuarioSuspendido(options: UsuarioOptions = {}): Promise<string> {
    const idPersona = await this.persona();
    return this.usuarioPara(idPersona, 'SUSPENDIDO', options);
  }

  async reserva(
    options: ReservaOptions,
  ): Promise<{ id: string; montoTotal: number }> {
    const estado = options.estado ?? 'CONFIRMADA';
    const origen = options.origen ?? 'AUTOGESTIONADA';

    const row = await this.insertOne(
      `INSERT INTO reservas (id_franja, fecha, id_persona, estado, origen)
       VALUES ($1, $2::date, $3, $4, $5)
       RETURNING id_reserva, monto_total`,
      [options.idFranja, options.fecha, options.idPersona, estado, origen],
    );

    this.ids.reserva.push(row.id_reserva);
    return { id: row.id_reserva, montoTotal: Number(row.monto_total) };
  }

  async detalleAlquiler(options: DetalleOptions): Promise<{
    id: string;
    precioUnitario: number | null;
    subtotal: number | null;
    estado: string;
  }> {
    const estado = options.estado ?? 'PENDIENTE';
    const precioUnitario = options.precioUnitario ?? null;

    const row = await this.insertOne(
      `INSERT INTO detalle_alquiler_equipamiento
         (id_reserva, id_equipamiento, cantidad, precio_unitario, estado_devolucion)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id_detalle, precio_unitario, subtotal, estado_devolucion`,
      [
        options.idReserva,
        options.idEquipamiento,
        options.cantidad,
        precioUnitario,
        estado,
      ],
    );

    this.ids.detalle.push(row.id_detalle);
    return {
      id: row.id_detalle,
      precioUnitario:
        row.precio_unitario === null ? null : Number(row.precio_unitario),
      subtotal: row.subtotal === null ? null : Number(row.subtotal),
      estado: row.estado_devolucion,
    };
  }

  async cleanup(): Promise<void> {
    const auditTargets = [
      ...this.ids.reserva,
      ...this.ids.cancha,
      ...this.ids.detalle,
      ...this.ids.persona,
    ];

    await this.pool.query(
      `DELETE FROM detalle_alquiler_equipamiento
       WHERE id_detalle = ANY($1::uuid[])`,
      [this.ids.detalle],
    );

    await this.pool.query(
      'DELETE FROM reservas WHERE id_reserva = ANY($1::uuid[])',
      [this.ids.reserva],
    );

    await this.pool.query(
      `DELETE FROM registros_auditoria
       WHERE id_usuario = ANY($1::uuid[])
          OR id_entidad = ANY($2::uuid[])`,
      [this.ids.usuario, auditTargets],
    );

    await this.pool.query(
      'DELETE FROM equipamientos WHERE id_equipamiento = ANY($1::uuid[])',
      [this.ids.equipamiento],
    );

    await this.pool.query(
      'DELETE FROM franjas_horarias WHERE id_franja = ANY($1::uuid[])',
      [this.ids.franja],
    );

    await this.pool.query(
      'DELETE FROM canchas WHERE id_cancha = ANY($1::uuid[])',
      [this.ids.cancha],
    );

    await this.pool.query(
      'DELETE FROM usuarios WHERE id_usuario = ANY($1::uuid[])',
      [this.ids.usuario],
    );

    await this.pool.query(
      'DELETE FROM personas WHERE id_persona = ANY($1::uuid[])',
      [this.ids.persona],
    );

    await this.pool.query(
      'DELETE FROM disciplinas WHERE id_disciplina = ANY($1::uuid[])',
      [this.ids.disciplina],
    );

    this.ids.detalle = [];
    this.ids.reserva = [];
    this.ids.equipamiento = [];
    this.ids.franja = [];
    this.ids.cancha = [];
    this.ids.usuario = [];
    this.ids.persona = [];
    this.ids.disciplina = [];
  }
}
