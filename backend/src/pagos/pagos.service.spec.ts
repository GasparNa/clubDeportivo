import { PagosService } from './pagos.service';
import { NotFoundException } from '@nestjs/common';

describe('PagosService', () => {
  let service: PagosService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      reserva: {
        findUnique: jest.fn(),
      },
      usuario: {
        findUnique: jest.fn(),
      },
      registroAuditoria: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
      },
    };

    service = new PagosService(mockPrisma as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('crearPago', () => {
    const pagoDto = {
      id_reserva: 'uuid-reserva-1',
      monto: 1500,
      metodo_pago: 'TRANSFERENCIA',
    };

    it('debe crear un pago y registrar en auditoría', async () => {
      mockPrisma.reserva.findUnique.mockResolvedValue({
        id_reserva: 'uuid-reserva-1',
        id_persona: 'uuid-persona-1',
        estado: 'CONFIRMADA',
      });
      mockPrisma.registroAuditoria.create.mockResolvedValue({
        id_registro: 'uuid-audit-1',
        evento: 'PAGO_REGISTRADO',
      });

      const result = await service.crearPago(pagoDto);

      expect(result).toHaveProperty('id_registro');
      expect(result).toHaveProperty('estado', 'COMPLETADO');
    });

    it('debe lanzar NotFoundException si la reserva no existe', async () => {
      mockPrisma.reserva.findUnique.mockResolvedValue(null);

      await expect(service.crearPago(pagoDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAuditoria', () => {
    it('debe retornar registros de auditoría', async () => {
      mockPrisma.registroAuditoria.findMany.mockResolvedValue([
        { id_registro: '1', evento: 'PAGO_REGISTRADO', entidad: 'reservas' },
        { id_registro: '2', evento: 'RESERVA_CREADA', entidad: 'reservas' },
      ]);

      const result = await service.getAuditoria({});

      expect(result).toHaveLength(2);
    });
  });

  describe('getReporteAuditoria', () => {
    it('debe retornar estadísticas agrupadas', async () => {
      mockPrisma.registroAuditoria.count.mockResolvedValue(3);
      mockPrisma.registroAuditoria.groupBy
        .mockResolvedValueOnce([{ evento: 'PAGO_REGISTRADO', _count: { evento: 2 } }, { evento: 'RESERVA_CREADA', _count: { evento: 1 } }])
        .mockResolvedValueOnce([{ entidad: 'reservas', _count: { entidad: 3 } }])
        .mockResolvedValueOnce([{ id_usuario: 'uuid-1', _count: { id_usuario: 2 } }]);

      const result = await service.getReporteAuditoria('2026-01-01', '2026-12-31');

      expect(result).toHaveProperty('total_eventos', 3);
      expect(result).toHaveProperty('por_evento');
      expect(result).toHaveProperty('por_entidad');
    });
  });

  describe('listarNotificaciones', () => {
    const usuarioId = 'uuid-user-1';

    const registroBase = {
      id_registro: 'uuid-notif-1',
      id_usuario: usuarioId,
      evento: 'NOTIFICACION_INFO',
      entidad: 'notificaciones',
      detalle: {
        asunto: 'Recordatorio de reserva',
        mensaje: 'Su reserva es mañana',
      },
      fecha: new Date('2026-03-01T10:00:00Z'),
    };

    it('debe mapear las notificaciones propias con el contrato de la UI', async () => {
      mockPrisma.registroAuditoria.findMany.mockResolvedValue([registroBase]);

      const result = await service.listarNotificaciones(usuarioId);

      expect(result).toEqual([
        {
          id: 'uuid-notif-1',
          titulo: 'Recordatorio de reserva',
          mensaje: 'Su reserva es mañana',
          tipo: 'INFO',
          leida: false,
          creado_en: new Date('2026-03-01T10:00:00Z'),
        },
      ]);
    });

    it('debe consultar solo eventos NOTIFICACION_* del usuario y entidad notificaciones', async () => {
      mockPrisma.registroAuditoria.findMany.mockResolvedValue([]);

      await service.listarNotificaciones(usuarioId);

      expect(mockPrisma.registroAuditoria.findMany).toHaveBeenCalledWith({
        where: {
          id_usuario: usuarioId,
          entidad: 'notificaciones',
          evento: { startsWith: 'NOTIFICACION_' },
        },
        orderBy: { fecha: 'desc' },
        take: 100,
      });
    });

    it('debe devolver una lista vacía cuando el usuario no tiene notificaciones', async () => {
      mockPrisma.registroAuditoria.findMany.mockResolvedValue([]);

      await expect(service.listarNotificaciones(usuarioId)).resolves.toEqual([]);
    });

    it('no debe incluir notificaciones de otros usuarios', async () => {
      mockPrisma.registroAuditoria.findMany.mockResolvedValue([]);

      await service.listarNotificaciones(usuarioId);

      const llamada =
        mockPrisma.registroAuditoria.findMany.mock.calls[0][0];
      expect(llamada.where.id_usuario).toBe(usuarioId);
    });

    it('debe normalizar un tipo desconocido a INFO', async () => {
      mockPrisma.registroAuditoria.findMany.mockResolvedValue([
        { ...registroBase, evento: 'NOTIFICACION_RESERVA_CONFIRMADA' },
      ]);

      const [notificacion] = await service.listarNotificaciones(usuarioId);

      expect(notificacion.tipo).toBe('INFO');
    });

    it('debe usar el título histórico cuando falta detalle.asunto', async () => {
      mockPrisma.registroAuditoria.findMany.mockResolvedValue([
        {
          ...registroBase,
          detalle: { mensaje: 'Mensaje sin asunto', email: 'juan@test.com' },
        },
      ]);

      const [notificacion] = await service.listarNotificaciones(usuarioId);

      expect(notificacion.titulo).toBe('Notificación');
    });

    it('debe limitar la bandeja a las 100 notificaciones más recientes', async () => {
      mockPrisma.registroAuditoria.findMany.mockResolvedValue([]);

      await service.listarNotificaciones(usuarioId);

      expect(
        mockPrisma.registroAuditoria.findMany,
      ).toHaveBeenCalledWith(expect.objectContaining({ take: 100 }));
    });

    it('debe excluir eventos de otra entidad en la consulta', async () => {
      mockPrisma.registroAuditoria.findMany.mockResolvedValue([]);

      await service.listarNotificaciones(usuarioId);

      expect(
        mockPrisma.registroAuditoria.findMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ entidad: 'notificaciones' }),
        }),
      );
    });
  });

  describe('enviarNotificacion', () => {
    it('debe registrar la notificación con asunto y tipo, y responder 201 (simulado)', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue({
        id_usuario: 'uuid-user-1',
        persona: {
          contactos: [{ valor_contacto: 'juan@test.com' }],
        },
      });
      mockPrisma.registroAuditoria.create.mockResolvedValue({
        id_registro: 'uuid-notif-1',
        evento: 'NOTIFICACION_SUCCESS',
      });

      const result = await service.enviarNotificacion({
        id_usuario: 'uuid-user-1',
        asunto: 'Reserva confirmada',
        mensaje: 'Su reserva ha sido confirmada',
        tipo: 'SUCCESS',
      });

      expect(result).toEqual({
        message: 'Notificación enviada (simulada)',
        email: 'juan@test.com',
        tipo: 'SUCCESS',
      });
      expect(mockPrisma.registroAuditoria.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            evento: 'NOTIFICACION_SUCCESS',
            entidad: 'notificaciones',
            detalle: expect.objectContaining({
              asunto: 'Reserva confirmada',
              mensaje: 'Su reserva ha sido confirmada',
              email: 'juan@test.com',
            }),
          }),
        }),
      );
    });

    it('debe aplicar INFO cuando se omite el tipo', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue({
        id_usuario: 'uuid-user-1',
        persona: { contactos: [] },
      });
      mockPrisma.registroAuditoria.create.mockResolvedValue({
        id_registro: 'uuid-notif-2',
        evento: 'NOTIFICACION_INFO',
      });

      const result = await service.enviarNotificacion({
        id_usuario: 'uuid-user-1',
        asunto: 'Aviso',
        mensaje: 'Mensaje',
      });

      expect(result.tipo).toBe('INFO');
      expect(mockPrisma.registroAuditoria.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ evento: 'NOTIFICACION_INFO' }),
        }),
      );
    });

    it('debe lanzar NotFoundException si el destinatario no existe', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(null);

      await expect(
        service.enviarNotificacion({
          id_usuario: 'uuid-inexistente',
          asunto: 'Aviso',
          mensaje: 'Mensaje',
        }),
      ).rejects.toThrow('Usuario no encontrado');
    });
  });
});