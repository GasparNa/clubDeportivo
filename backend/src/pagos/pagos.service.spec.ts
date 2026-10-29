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

  describe('enviarNotificacion', () => {
    it('debe simular envío de notificación', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue({
        id_usuario: 'uuid-user-1',
        persona: {
          contactos: [{ valor_contacto: 'juan@test.com' }],
        },
      });
      mockPrisma.registroAuditoria.create.mockResolvedValue({
        id_registro: 'uuid-notif-1',
        evento: 'NOTIFICACION_RESERVA_CONFIRMADA',
      });

      const result = await service.enviarNotificacion({
        id_usuario: 'uuid-user-1',
        tipo: 'RESERVA_CONFIRMADA',
        mensaje: 'Su reserva ha sido confirmada',
      });

      expect(result).toHaveProperty('message', 'Notificación enviada (simulada)');
      expect(result).toHaveProperty('email', 'juan@test.com');
      expect(result).toHaveProperty('tipo', 'RESERVA_CONFIRMADA');
    });
  });
});