import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateReservaDto,
  UpdateReservaEstadoDto,
  CreateAlquilerEquipamientoDto,
  UpdateDevolucionDto,
} from './dto/reservas.dto';

@Injectable()
export class ReservasService {
  constructor(private prisma: PrismaService) {}

  // ════════════════════════════════════════════════════════════════════
  // Reservas
  // ════════════════════════════════════════════════════════════════════

  /**
   * Listar reservas con filtros opcionales.
   */
  async listarReservas(filtros: {
    id_persona?: string;
    fecha?: string;
    estado?: string;
  }) {
    const where: any = {};

    if (filtros.id_persona) where.id_persona = filtros.id_persona;
    if (filtros.fecha) where.fecha = new Date(filtros.fecha);
    if (filtros.estado) where.estado = filtros.estado;

    return this.prisma.reserva.findMany({
      where,
      include: {
        franjaHoraria: {
          include: {
            cancha: {
              include: { disciplina: true },
            },
          },
        },
        persona: true,
        detallesAlquiler: {
          include: { equipamiento: true },
        },
      },
      orderBy: [{ fecha: 'desc' }, { creado_en: 'desc' }],
    });
  }

  /**
   * Obtener una reserva por ID.
   */
  async getReserva(id: string) {
    const reserva = await this.prisma.reserva.findUnique({
      where: { id_reserva: id },
      include: {
        franjaHoraria: {
          include: {
            cancha: {
              include: { disciplina: true },
            },
          },
        },
        persona: {
          include: {
            usuario: true,
            contactos: {
              where: { estado: 'ACTIVO' },
            },
          },
        },
        detallesAlquiler: {
          include: { equipamiento: true },
        },
      },
    });

    if (!reserva) {
      throw new NotFoundException('Reserva no encontrada');
    }

    return reserva;
  }

  /**
   * Crear una nueva reserva.
   * Valida: conflicto de horario, usuario activo, máximo 2 reservas.
   */
  async crearReserva(dto: CreateReservaDto, userId?: string) {
    const fecha = new Date(dto.fecha);

    // Validar que la franja existe y corresponde al día de la semana
    const franja = await this.prisma.franjaHoraria.findUnique({
      where: { id_franja: dto.id_franja },
      include: { cancha: true },
    });

    if (!franja) {
      throw new NotFoundException('Franja horaria no encontrada');
    }

    const diaSemana = fecha.getUTCDay();
    if (franja.dia_semana !== diaSemana) {
      throw new BadRequestException(
        'La fecha no corresponde al día de la semana de la franja',
      );
    }

    // Validar que la cancha esté disponible
    if (franja.cancha.estado === 'MANTENIMIENTO') {
      throw new BadRequestException('La cancha se encuentra en mantenimiento');
    }

    // Validar que no exista reserva activa para la misma franja y fecha
    const conflicto = await this.prisma.reserva.findFirst({
      where: {
        id_franja: dto.id_franja,
        fecha,
        estado: { in: ['CONFIRMADA', 'EN_CURSO'] },
      },
    });

    if (conflicto) {
      throw new ConflictException('La franja ya está reservada para esta fecha');
    }

    // Validar usuario activo (requerido para toda reserva)
    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario: dto.id_persona },
    });

    if (!usuario) {
      throw new ForbiddenException('Solo usuarios registrados y activos pueden reservar');
    }

    if (usuario.estado !== 'ACTIVO') {
      throw new ForbiddenException('El usuario debe estar ACTIVO para reservar');
    }

    // Validar máximo 2 reservas confirmadas
    const count = await this.prisma.reserva.count({
      where: {
        id_persona: dto.id_persona,
        estado: 'CONFIRMADA',
      },
    });

    if (count >= 2) {
      throw new BadRequestException(
        'El usuario ya posee el máximo de 2 reservas confirmadas',
      );
    }

    // Crear reserva
    const reserva = await this.prisma.reserva.create({
      data: {
        id_franja: dto.id_franja,
        fecha,
        id_persona: dto.id_persona,
        origen: dto.origen || 'AUTOGESTIONADA',
        monto_total: franja.cancha.precio_base,
      },
      include: {
        franjaHoraria: {
          include: {
            cancha: { include: { disciplina: true } },
          },
        },
        persona: true,
      },
    });

    return reserva;
  }

  /**
   * Actualizar estado de una reserva (check-in, completar, cancelar).
   */
  async actualizarEstadoReserva(id: string, dto: UpdateReservaEstadoDto) {
    const reserva = await this.getReserva(id);

    // Validar transiciones de estado
    const transicionesValidas: Record<string, string[]> = {
      CONFIRMADA: ['EN_CURSO', 'CANCELADA'],
      EN_CURSO: ['COMPLETADA', 'CANCELADA'],
    };

    const estadosPermitidos = transicionesValidas[reserva.estado];
    if (!estadosPermitidos || !estadosPermitidos.includes(dto.estado)) {
      throw new BadRequestException(
        `Transición de estado inválida: ${reserva.estado} -> ${dto.estado}`,
      );
    }

    // Validar cancelación con anticipación (autogestionada)
    if (dto.estado === 'CANCELADA') {
      await this.validarAnticipacionCancelacion(reserva);
    }

    const updateData: any = { estado: dto.estado };
    if (dto.estado === 'CANCELADA') {
      updateData.cancelado_en = new Date();
    }

    return this.prisma.reserva.update({
      where: { id_reserva: id },
      data: updateData,
      include: {
        franjaHoraria: {
          include: { cancha: { include: { disciplina: true } } },
        },
        persona: true,
        detallesAlquiler: true,
      },
    });
  }

  /**
   * Cancela una reserva por parte del Socio que la creó (autogestionada).
   * Valida titularidad, estado y anticipación de 24 horas.
   */
  async cancelarReservaAutogestionada(id: string, userId?: string) {
    const reserva = await this.getReserva(id);

    // Verificar titularidad: solo el Socio dueño de la reserva
    // (en el modelo, Usuario.id_usuario == Persona.id_persona de su cuenta)
    const usuario = userId
      ? await this.prisma.usuario.findUnique({
          where: { id_usuario: userId },
        })
      : null;

    if (!usuario || usuario.id_usuario !== reserva.id_persona) {
      throw new ForbiddenException(
        'No puedes cancelar una reserva de otro usuario',
      );
    }

    // Un Socio solo puede cancelar reservas confirmadas
    if (reserva.estado !== 'CONFIRMADA') {
      throw new BadRequestException(
        `Transición de estado inválida: ${reserva.estado} -> CANCELADA`,
      );
    }

    // Política de anticipación (autogestionada)
    await this.validarAnticipacionCancelacion(reserva);

    return this.prisma.reserva.update({
      where: { id_reserva: id },
      data: { estado: 'CANCELADA', cancelado_en: new Date() },
      include: {
        franjaHoraria: {
          include: { cancha: { include: { disciplina: true } } },
        },
        persona: true,
        detallesAlquiler: true,
      },
    });
  }

  /**
   * Valida que la cancelación de una reserva AUTOGESTIONADA cumpla
   * la anticipación mínima de 24 horas antes del inicio de la franja.
   */
  private async validarAnticipacionCancelacion(reserva: any) {
    if (reserva.origen !== 'AUTOGESTIONADA') {
      return;
    }

    const inicioTurno = new Date(reserva.fecha);
    const franja = await this.prisma.franjaHoraria.findUnique({
      where: { id_franja: reserva.id_franja },
    });

    if (!franja) {
      return;
    }

    const [h, m] = [
      franja.hora_inicio.getUTCHours(),
      franja.hora_inicio.getUTCMinutes(),
    ];
    inicioTurno.setHours(h, m, 0, 0);

    const limiteCancelacion = new Date(
      inicioTurno.getTime() - 24 * 60 * 60 * 1000,
    );

    if (new Date() > limiteCancelacion) {
      throw new BadRequestException(
        'La cancelación requiere al menos 1 día de antelación',
      );
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // Alquiler de Equipamiento
  // ════════════════════════════════════════════════════════════════════

  /**
   * Listar alquileres de equipamiento.
   */
  async listarAlquileres(id_reserva?: string) {
    const where = id_reserva ? { id_reserva } : {};
    return this.prisma.detalleAlquilerEquipamiento.findMany({
      where,
      include: {
        equipamiento: true,
        reserva: {
          include: {
            persona: true,
            franjaHoraria: {
              include: { cancha: { include: { disciplina: true } } },
            },
          },
        },
      },
      orderBy: { creado_en: 'desc' },
    });
  }

  /**
   * Crear alquiler de equipamiento asociado a una reserva.
   * Valida stock, disciplina, y usuario activo.
   */
  async crearAlquiler(dto: CreateAlquilerEquipamientoDto) {
    // Verificar reserva
    const reserva = await this.prisma.reserva.findUnique({
      where: { id_reserva: dto.id_reserva },
      include: {
        franjaHoraria: {
          include: { cancha: true },
        },
      },
    });

    if (!reserva) {
      throw new NotFoundException('Reserva no encontrada');
    }

    if (reserva.estado === 'CANCELADA') {
      throw new BadRequestException('No se puede alquilar en una reserva cancelada');
    }

    // Verificar que el usuario esté activo
    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario: reserva.id_persona },
    });

    if (!usuario) {
      throw new BadRequestException('Un invitado no puede alquilar equipamiento');
    }

    if (usuario.estado !== 'ACTIVO') {
      throw new BadRequestException(
        'El usuario debe estar ACTIVO para alquilar equipamiento',
      );
    }

    // Verificar equipamiento y stock
    const equipamiento = await this.prisma.equipamiento.findUnique({
      where: { id_equipamiento: dto.id_equipamiento },
    });

    if (!equipamiento) {
      throw new NotFoundException('Equipamiento no encontrado');
    }

    if (equipamiento.id_disciplina !== reserva.franjaHoraria.cancha.id_disciplina) {
      throw new BadRequestException(
        'El equipamiento no corresponde a la disciplina de la cancha',
      );
    }

    if (equipamiento.stock_disponible < dto.cantidad) {
      throw new BadRequestException('Stock insuficiente');
    }

    // Verificar que no exista ya un alquiler del mismo equipamiento en la reserva
    const existente = await this.prisma.detalleAlquilerEquipamiento.findUnique({
      where: {
        id_reserva_id_equipamiento: {
          id_reserva: dto.id_reserva,
          id_equipamiento: dto.id_equipamiento,
        },
      },
    });

    if (existente) {
      throw new ConflictException('Ya existe un alquiler de este equipamiento en la reserva');
    }

    // Transacción: crear el alquiler. El trigger `trg_validar_alquiler`
    // valida el stock y lo descuenta; la app no debe duplicar esa lógica.
    const result = await this.prisma.$transaction(async (tx) => {
      // Calcular fecha de devolución estimada
      const franja = await tx.franjaHoraria.findUnique({
        where: { id_franja: reserva.id_franja },
      });

      let fechaDevolucionEstimada: Date | null = null;
      if (franja) {
        fechaDevolucionEstimada = new Date(reserva.fecha);
        fechaDevolucionEstimada.setUTCHours(
          franja.hora_fin.getUTCHours(),
          franja.hora_fin.getUTCMinutes(),
          0,
          0,
        );
        fechaDevolucionEstimada = new Date(
          fechaDevolucionEstimada.getTime() + 15 * 60 * 1000,
        );
      }

      // Crear detalle de alquiler
      const detalle = await tx.detalleAlquilerEquipamiento.create({
        data: {
          id_reserva: dto.id_reserva,
          id_equipamiento: dto.id_equipamiento,
          cantidad: dto.cantidad,
          precio_unitario: equipamiento.precio_alquiler,
          subtotal: Number(equipamiento.precio_alquiler) * dto.cantidad,
          fecha_devolucion_estimada: fechaDevolucionEstimada,
        },
        include: {
          equipamiento: true,
        },
      });

      return detalle;
    });

    return result;
  }

  /**
   * Procesar devolución de equipamiento.
   */
  async procesarDevolucion(id_detalle: string, dto: UpdateDevolucionDto) {
    const detalle = await this.prisma.detalleAlquilerEquipamiento.findUnique({
      where: { id_detalle },
      include: { reserva: true },
    });

    if (!detalle) {
      throw new NotFoundException('Detalle de alquiler no encontrado');
    }

    if (detalle.estado_devolucion !== 'PENDIENTE') {
      throw new BadRequestException('El equipamiento ya fue devuelto o cancelado');
    }

    // Transacción: actualizar la devolución. El trigger
    // `trg_gestionar_devolucion` restaura el stock y marca incumplimientos;
    // la app no debe duplicar esa lógica.
    const result = await this.prisma.$transaction(async (tx) => {
      // Actualizar detalle
      const updated = await tx.detalleAlquilerEquipamiento.update({
        where: { id_detalle },
        data: {
          estado_devolucion: dto.estado_devolucion,
          fecha_devolucion_real: new Date(),
        },
        include: {
          equipamiento: true,
          reserva: {
            include: {
              persona: true,
            },
          },
        },
      });

      return updated;
    });

    return result;
  }

  /**
   * Listar equipamientos disponibles.
   */
  async listarEquipamientos(id_disciplina?: string) {
    const where = id_disciplina ? { id_disciplina } : {};
    return this.prisma.equipamiento.findMany({
      where,
      include: { disciplina: true },
      orderBy: { nombre: 'asc' },
    });
  }
}