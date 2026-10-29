import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePagoDto,
  UpdatePagoEstadoDto,
  AuditoriaQueryDto,
} from './dto/pagos.dto';

@Injectable()
export class PagosService {
  constructor(private prisma: PrismaService) {}

  // ════════════════════════════════════════════════════════════════════
  // Pagos (simulados - sin gateway de pago real)
  // ════════════════════════════════════════════════════════════════════

  /**
   * Registrar un pago para una reserva.
   * Como no hay gateway de pago real, se simula el registro.
   */
  async crearPago(dto: CreatePagoDto) {
    const reserva = await this.prisma.reserva.findUnique({
      where: { id_reserva: dto.id_reserva },
    });

    if (!reserva) {
      throw new NotFoundException('Reserva no encontrada');
    }

    if (reserva.estado === 'CANCELADA') {
      throw new BadRequestException('No se puede pagar una reserva cancelada');
    }

    // Registrar el pago en la tabla de auditoría (no hay tabla de pagos explícita en el esquema)
    // Usamos registros_auditoria para tracking de pagos
    const pago = await this.prisma.registroAuditoria.create({
      data: {
        actor_tipo: 'USUARIO',
        id_usuario: reserva.id_persona,
        evento: 'PAGO_REGISTRADO',
        entidad: 'reservas',
        id_entidad: dto.id_reserva,
        detalle: {
          monto: dto.monto,
          metodo_pago: dto.metodo_pago || 'EFECTIVO',
          estado: 'COMPLETADO',
          fecha_pago: new Date().toISOString(),
        },
      },
    });

    return {
      message: 'Pago registrado exitosamente',
      id_registro: pago.id_registro,
      monto: dto.monto,
      estado: 'COMPLETADO',
    };
  }

  /**
   * Consultar estado de pagos de una reserva.
   */
  async getPagosReserva(id_reserva: string) {
    const reserva = await this.prisma.reserva.findUnique({
      where: { id_reserva },
    });

    if (!reserva) {
      throw new NotFoundException('Reserva no encontrada');
    }

    const pagos = await this.prisma.registroAuditoria.findMany({
      where: {
        entidad: 'reservas',
        id_entidad: id_reserva,
        evento: { in: ['PAGO_REGISTRADO', 'PAGO_REEMBOLSADO', 'PAGO_FALLIDO'] },
      },
      orderBy: { fecha: 'desc' },
    });

    return {
      id_reserva,
      monto_total: reserva.monto_total,
      pagos: pagos.map((p) => ({
        id: p.id_registro,
        evento: p.evento,
        detalle: p.detalle,
        fecha: p.fecha,
      })),
    };
  }

  /**
   * Listar todos los pagos (Admin/Gerente).
   */
  async listarPagos(filtros: { fecha_desde?: string; fecha_hasta?: string }) {
    const where: any = {
      evento: { in: ['PAGO_REGISTRADO', 'PAGO_REEMBOLSADO', 'PAGO_FALLIDO'] },
    };

    if (filtros.fecha_desde || filtros.fecha_hasta) {
      where.fecha = {};
      if (filtros.fecha_desde) where.fecha.gte = new Date(filtros.fecha_desde);
      if (filtros.fecha_hasta) where.fecha.lte = new Date(filtros.fecha_hasta);
    }

    return this.prisma.registroAuditoria.findMany({
      where,
      orderBy: { fecha: 'desc' },
    });
  }

  // ════════════════════════════════════════════════════════════════════
  // Auditoría
  // ════════════════════════════════════════════════════════════════════

  /**
   * Consultar registros de auditoría con filtros.
   */
  async getAuditoria(filtros: AuditoriaQueryDto) {
    const where: any = {};

    if (filtros.id_usuario) where.id_usuario = filtros.id_usuario;
    if (filtros.entidad) where.entidad = filtros.entidad;
    if (filtros.evento) where.evento = filtros.evento;

    if (filtros.fecha_desde || filtros.fecha_hasta) {
      where.fecha = {};
      if (filtros.fecha_desde) where.fecha.gte = new Date(filtros.fecha_desde);
      if (filtros.fecha_hasta) where.fecha.lte = new Date(filtros.fecha_hasta);
    }

    return this.prisma.registroAuditoria.findMany({
      where,
      include: {
        usuario: {
          include: {
            persona: true,
          },
        },
      },
      orderBy: { fecha: 'desc' },
      take: 500,
    });
  }

  /**
   * Generar reporte resumido de auditoría para un rango de fechas.
   */
  async getReporteAuditoria(fecha_desde: string, fecha_hasta: string) {
    const where = {
      fecha: {
        gte: new Date(fecha_desde),
        lte: new Date(fecha_hasta),
      },
    };

    const [totalEventos, porEvento, porEntidad, porUsuario] = await Promise.all([
      this.prisma.registroAuditoria.count({ where }),

      this.prisma.registroAuditoria.groupBy({
        by: ['evento'],
        where,
        _count: { evento: true },
        orderBy: { _count: { evento: 'desc' } },
      }),

      this.prisma.registroAuditoria.groupBy({
        by: ['entidad'],
        where,
        _count: { entidad: true },
        orderBy: { _count: { entidad: 'desc' } },
      }),

      this.prisma.registroAuditoria.groupBy({
        by: ['id_usuario'],
        where: { ...where, id_usuario: { not: null } },
        _count: { id_usuario: true },
        orderBy: { _count: { id_usuario: 'desc' } },
        take: 20,
      }),
    ]);

    return {
      periodo: { desde: fecha_desde, hasta: fecha_hasta },
      total_eventos: totalEventos,
      por_evento: porEvento,
      por_entidad: porEntidad,
      top_usuarios: porUsuario,
    };
  }

  // ════════════════════════════════════════════════════════════════════
  // Notificaciones (simuladas)
  // ════════════════════════════════════════════════════════════════════

  /**
   * Enviar notificación (simulada - registra en auditoría).
   * En producción, aquí se integraría con un servicio de email (SendGrid, etc.)
   */
  async enviarNotificacion(params: {
    id_usuario: string;
    tipo: string;
    mensaje: string;
    id_reserva?: string;
  }) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario: params.id_usuario },
      include: {
        persona: {
          include: {
            contactos: {
              where: { tipo_contacto: 'EMAIL', estado: 'ACTIVO' },
              take: 1,
            },
          },
        },
      },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const email = usuario.persona.contactos[0]?.valor_contacto || 'sin-email';

    // Registrar la notificación en auditoría
    await this.prisma.registroAuditoria.create({
      data: {
        actor_tipo: 'SISTEMA',
        id_usuario: params.id_usuario,
        evento: `NOTIFICACION_${params.tipo.toUpperCase()}`,
        entidad: 'notificaciones',
        id_entidad: params.id_reserva || null,
        detalle: {
          email,
          mensaje: params.mensaje,
          enviado_en: new Date().toISOString(),
        },
      },
    });

    return {
      message: 'Notificación enviada (simulada)',
      email,
      tipo: params.tipo,
    };
  }
}