import { ReservasService } from './reservas.service';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

describe('ReservasService', () => {
  let service: ReservasService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      franjaHoraria: {
        findUnique: jest.fn(),
      },
      reserva: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      usuario: {
        findUnique: jest.fn(),
      },
      equipamiento: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      detalleAlquilerEquipamiento: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((cb: any) => cb(mockPrisma)),
    };

    service = new ReservasService(mockPrisma as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('crearReserva', () => {
    // 2026-10-07 es miércoles (día 3 en UTC)
    const createDto = {
      id_franja: 'uuid-franja-1',
      fecha: '2026-10-07',
      id_persona: 'uuid-persona-1',
    };

    const actorSocio = { id_usuario: 'uuid-persona-1', rol: 'SOCIO' };
    const actorGerente = { id_usuario: 'uuid-gerente-1', rol: 'GERENTE' };

    const mockFranja = {
      id_franja: 'uuid-franja-1',
      id_cancha: 'uuid-cancha-1',
      dia_semana: 3, // Miércoles
      hora_inicio: '10:00',
      hora_fin: '11:00',
      cancha: {
        id_cancha: 'uuid-cancha-1',
        estado: 'DISPONIBLE',
        precio_base: 1500,
        disciplina: { nombre: 'Tenis' },
      },
    };

    const mockReservaCreada = {
      id_reserva: 'uuid-reserva-1',
      ...createDto,
      estado: 'CONFIRMADA',
      origen: 'AUTOGESTIONADA',
    };

    function mockFlujoOk(usuario: any = { id_usuario: 'uuid-persona-1', estado: 'ACTIVO' }) {
      mockPrisma.franjaHoraria.findUnique.mockResolvedValue(mockFranja);
      mockPrisma.reserva.findFirst.mockResolvedValue(null);
      mockPrisma.usuario.findUnique.mockResolvedValue(usuario);
      mockPrisma.reserva.count.mockResolvedValue(0);
      mockPrisma.reserva.create.mockResolvedValue(mockReservaCreada);
    }

    it('debe crear una reserva correctamente', async () => {
      mockFlujoOk();
      const result = await service.crearReserva(createDto, actorSocio);

      expect(result).toHaveProperty('id_reserva');
      expect(result).toHaveProperty('estado', 'CONFIRMADA');
    });

    it('3.1 SOCIO ACTIVO crea reserva con su propio id_persona → origen AUTOGESTIONADA', async () => {
      mockFlujoOk();
      await service.crearReserva(createDto, actorSocio);

      expect(mockPrisma.reserva.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            id_persona: 'uuid-persona-1',
            origen: 'AUTOGESTIONADA',
          }),
        }),
      );
    });

    it('3.2 SOCIO ACTIVO crea reserva sin id_persona → usa actor.id_usuario y origen AUTOGESTIONADA', async () => {
      mockFlujoOk();
      const dtoSinPersona = { id_franja: createDto.id_franja, fecha: createDto.fecha };
      await service.crearReserva(dtoSinPersona as any, actorSocio);

      expect(mockPrisma.reserva.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            id_persona: 'uuid-persona-1',
            origen: 'AUTOGESTIONADA',
          }),
        }),
      );
    });

    it('3.3 SOCIO envía id_persona de otro usuario → 403 y sin consultas a Prisma', async () => {
      await expect(
        service.crearReserva({ ...createDto, id_persona: 'uuid-otro' }, actorSocio),
      ).rejects.toThrow('No puedes crear reservas a nombre de otro usuario');

      expect(mockPrisma.franjaHoraria.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.reserva.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.usuario.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.reserva.count).not.toHaveBeenCalled();
      expect(mockPrisma.reserva.create).not.toHaveBeenCalled();
    });

    it('3.4 SOCIO envía origen MANUAL_GERENCIA → 403 y sin consultas a Prisma', async () => {
      await expect(
        service.crearReserva({ ...createDto, origen: 'MANUAL_GERENCIA' } as any, actorSocio),
      ).rejects.toThrow('Solo gerencia puede crear reservas manuales');

      expect(mockPrisma.franjaHoraria.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.reserva.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.usuario.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.reserva.count).not.toHaveBeenCalled();
      expect(mockPrisma.reserva.create).not.toHaveBeenCalled();
    });

    it('3.5 GERENTE crea reserva MANUAL_GERENCIA para un SOCIO ACTIVO', async () => {
      mockFlujoOk({ id_usuario: 'uuid-persona-1', estado: 'ACTIVO' });
      mockPrisma.reserva.create.mockResolvedValue({
        ...mockReservaCreada,
        origen: 'MANUAL_GERENCIA',
      });

      await service.crearReserva(
        { ...createDto, origen: 'MANUAL_GERENCIA' } as any,
        actorGerente,
      );

      expect(mockPrisma.reserva.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            id_persona: 'uuid-persona-1',
            origen: 'MANUAL_GERENCIA',
          }),
        }),
      );
    });

    it('3.6 GERENTE usa id_persona de usuario no ACTIVO → 403 error vigente', async () => {
      mockPrisma.franjaHoraria.findUnique.mockResolvedValue(mockFranja);
      mockPrisma.reserva.findFirst.mockResolvedValue(null);
      mockPrisma.usuario.findUnique.mockResolvedValue({
        id_usuario: 'uuid-persona-1',
        estado: 'INACTIVO',
      });

      await expect(service.crearReserva(createDto, actorGerente)).rejects.toThrow(
        'El usuario debe estar ACTIVO para reservar',
      );
    });

    it('3.7 Fail-closed: sin actor o sin id_usuario → 403 antes de cualquier consulta', async () => {
      await expect(service.crearReserva(createDto, undefined)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.crearReserva(createDto, {} as any)).rejects.toThrow(
        ForbiddenException,
      );

      expect(mockPrisma.franjaHoraria.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.reserva.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.usuario.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.reserva.count).not.toHaveBeenCalled();
      expect(mockPrisma.reserva.create).not.toHaveBeenCalled();
    });

    it('3.8 Reglas vigentes con actor SOCIO: límite de 2 reservas y franja ya reservada', async () => {
      mockPrisma.franjaHoraria.findUnique.mockResolvedValue(mockFranja);
      mockPrisma.reserva.findFirst.mockResolvedValue(null);
      mockPrisma.usuario.findUnique.mockResolvedValue({
        id_usuario: 'uuid-persona-1',
        estado: 'ACTIVO',
      });
      mockPrisma.reserva.count.mockResolvedValue(2);

      await expect(service.crearReserva(createDto, actorSocio)).rejects.toThrow(
        'El usuario ya posee el máximo de 2 reservas confirmadas',
      );

      jest.clearAllMocks();
      mockPrisma.franjaHoraria.findUnique.mockResolvedValue(mockFranja);
      mockPrisma.reserva.findFirst.mockResolvedValue({
        id_reserva: 'uuid-conflict',
        estado: 'CONFIRMADA',
      });

      await expect(service.crearReserva(createDto, actorSocio)).rejects.toThrow(
        ConflictException,
      );
    });

    it('3.9 GERENTE con id_persona sin cuenta lanza 403 "Solo usuarios registrados y activos pueden reservar"', async () => {
      mockPrisma.franjaHoraria.findUnique.mockResolvedValue(mockFranja);
      mockPrisma.reserva.findFirst.mockResolvedValue(null);
      mockPrisma.usuario.findUnique.mockResolvedValue(null);

      await expect(service.crearReserva(createDto, actorGerente)).rejects.toThrow(
        'Solo usuarios registrados y activos pueden reservar',
      );
    });

    it('3.10 actor con rol desconocido o ausente se trata como SOCIO (rama restrictiva)', async () => {
      await expect(
        service.crearReserva({ ...createDto, id_persona: 'uuid-otro' }, { id_usuario: 'uuid-persona-1' } as any),
      ).rejects.toThrow('No puedes crear reservas a nombre de otro usuario');

      expect(mockPrisma.franjaHoraria.findUnique).not.toHaveBeenCalled();
    });

    it('debe lanzar NotFoundException si la franja no existe', async () => {
      mockPrisma.franjaHoraria.findUnique.mockResolvedValue(null);

      await expect(service.crearReserva(createDto, actorSocio)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe lanzar BadRequestException si la cancha está en mantenimiento', async () => {
      mockPrisma.franjaHoraria.findUnique.mockResolvedValue({
        ...mockFranja,
        cancha: { ...mockFranja.cancha, estado: 'MANTENIMIENTO' },
      });

      await expect(service.crearReserva(createDto, actorSocio)).rejects.toThrow(
        BadRequestException,
      );
    });
  });


  describe('crearAlquiler', () => {
    const alquilerDto = {
      id_reserva: 'uuid-reserva-1',
      id_equipamiento: 'uuid-equip-1',
      cantidad: 2,
    };

    it('debe crear un alquiler de equipamiento correctamente', async () => {
      mockPrisma.reserva.findUnique.mockResolvedValue({
        id_reserva: 'uuid-reserva-1',
        id_persona: 'uuid-persona-1',
        estado: 'CONFIRMADA',
        franjaHoraria: {
          cancha: { id_disciplina: 'uuid-disc-1' },
        },
      });
      mockPrisma.usuario.findUnique.mockResolvedValue({
        id_usuario: 'uuid-persona-1',
        estado: 'ACTIVO',
      });
      mockPrisma.equipamiento.findUnique.mockResolvedValue({
        id_equipamiento: 'uuid-equip-1',
        id_disciplina: 'uuid-disc-1',
        stock_disponible: 10,
        precio_alquiler: 500,
        nombre: 'Raqueta',
      });
      mockPrisma.detalleAlquilerEquipamiento.findUnique.mockResolvedValue(null);
      mockPrisma.franjaHoraria.findUnique.mockResolvedValue({
        id_franja: 'uuid-franja-1',
        hora_fin: new Date('1970-01-01T11:00:00Z'),
      });
      mockPrisma.equipamiento.update.mockResolvedValue({});
      mockPrisma.detalleAlquilerEquipamiento.create.mockResolvedValue({
        id_detalle: 'uuid-det-1',
        ...alquilerDto,
      });

      const result = await service.crearAlquiler(alquilerDto);

      expect(result).toHaveProperty('id_detalle');
      // El stock lo descuenta el trigger de PostgreSQL, no la aplicación.
      expect(mockPrisma.equipamiento.update).not.toHaveBeenCalled();
    });

    it('debe lanzar BadRequestException si no hay stock suficiente', async () => {
      mockPrisma.reserva.findUnique.mockResolvedValue({
        id_reserva: 'uuid-reserva-1',
        id_persona: 'uuid-persona-1',
        estado: 'CONFIRMADA',
        franjaHoraria: {
          cancha: { id_disciplina: 'uuid-disc-1' },
        },
      });
      mockPrisma.usuario.findUnique.mockResolvedValue({
        id_usuario: 'uuid-persona-1',
        estado: 'ACTIVO',
      });
      mockPrisma.equipamiento.findUnique.mockResolvedValue({
        id_equipamiento: 'uuid-equip-1',
        id_disciplina: 'uuid-disc-1',
        stock_disponible: 1,
        nombre: 'Raqueta',
      });

      await expect(service.crearAlquiler(alquilerDto)).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar BadRequestException si la disciplina no coincide', async () => {
      mockPrisma.reserva.findUnique.mockResolvedValue({
        id_reserva: 'uuid-reserva-1',
        id_persona: 'uuid-persona-1',
        estado: 'CONFIRMADA',
        franjaHoraria: {
          cancha: { id_disciplina: 'uuid-disc-1' },
        },
      });
      mockPrisma.usuario.findUnique.mockResolvedValue({
        id_usuario: 'uuid-persona-1',
        estado: 'ACTIVO',
      });
      mockPrisma.equipamiento.findUnique.mockResolvedValue({
        id_equipamiento: 'uuid-equip-1',
        id_disciplina: 'uuid-disc-2',
        stock_disponible: 10,
        nombre: 'Raqueta',
      });

      await expect(service.crearAlquiler(alquilerDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('procesarDevolucion', () => {
    it('actualiza el detalle sin tocar el stock (lo restaura el trigger)', async () => {
      mockPrisma.detalleAlquilerEquipamiento.findUnique.mockResolvedValue({
        id_detalle: 'uuid-det-1',
        id_equipamiento: 'uuid-equip-1',
        cantidad: 2,
        estado_devolucion: 'PENDIENTE',
        reserva: { id_reserva: 'uuid-reserva-1' },
      });
      mockPrisma.detalleAlquilerEquipamiento.update.mockResolvedValue({
        id_detalle: 'uuid-det-1',
        estado_devolucion: 'DEVUELTO',
      });

      const result = await service.procesarDevolucion('uuid-det-1', {
        estado_devolucion: 'DEVUELTO',
      });

      expect(result).toHaveProperty('estado_devolucion', 'DEVUELTO');
      expect(mockPrisma.equipamiento.update).not.toHaveBeenCalled();
    });
  });

  describe('cancelarReservaAutogestionada', () => {
    const reservaConfirmada = {
      id_reserva: 'uuid-reserva-1',
      id_persona: 'uuid-persona-1',
      id_franja: 'uuid-franja-1',
      fecha: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      origen: 'AUTOGESTIONADA',
      estado: 'CONFIRMADA',
    };

    it('debe cancelar la reserva autogestionada con anticipación suficiente', async () => {
      mockPrisma.reserva.findUnique.mockResolvedValue(reservaConfirmada);
      mockPrisma.usuario.findUnique.mockResolvedValue({
        id_usuario: 'uuid-persona-1',
      });
      mockPrisma.franjaHoraria.findUnique.mockResolvedValue({
        id_franja: 'uuid-franja-1',
        hora_inicio: new Date('1970-01-01T12:00:00Z'),
      });
      mockPrisma.reserva.update.mockResolvedValue({
        ...reservaConfirmada,
        estado: 'CANCELADA',
      });

      const result = await service.cancelarReservaAutogestionada(
        'uuid-reserva-1',
        'uuid-persona-1',
      );

      expect(mockPrisma.reserva.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ estado: 'CANCELADA' }),
        }),
      );
      expect(result).toHaveProperty('estado', 'CANCELADA');
    });

    it('debe rechazar si la reserva pertenece a otro usuario', async () => {
      mockPrisma.reserva.findUnique.mockResolvedValue(reservaConfirmada);
      mockPrisma.usuario.findUnique.mockResolvedValue({
        id_usuario: 'uuid-otro',
      });

      await expect(
        service.cancelarReservaAutogestionada('uuid-reserva-1', 'uuid-otro'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe rechazar si la reserva no está CONFIRMADA', async () => {
      mockPrisma.reserva.findUnique.mockResolvedValue({
        ...reservaConfirmada,
        estado: 'CANCELADA',
      });
      mockPrisma.usuario.findUnique.mockResolvedValue({
        id_usuario: 'uuid-persona-1',
      });

      await expect(
        service.cancelarReservaAutogestionada(
          'uuid-reserva-1',
          'uuid-persona-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe rechazar si falta anticipación (menos de 24 horas)', async () => {
      mockPrisma.reserva.findUnique.mockResolvedValue({
        ...reservaConfirmada,
        fecha: new Date(Date.now() + 3 * 60 * 60 * 1000),
      });
      mockPrisma.usuario.findUnique.mockResolvedValue({
        id_usuario: 'uuid-persona-1',
      });
      mockPrisma.franjaHoraria.findUnique.mockResolvedValue({
        id_franja: 'uuid-franja-1',
        hora_inicio: new Date('1970-01-01T12:00:00Z'),
      });

      await expect(
        service.cancelarReservaAutogestionada(
          'uuid-reserva-1',
          'uuid-persona-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAlquiler', () => {
    const detalleBase = {
      id_detalle: 'uuid-det-1',
      id_reserva: 'uuid-reserva-1',
      id_equipamiento: 'uuid-equip-1',
      cantidad: 2,
      precio_unitario: '500.00',
      subtotal: '1000.00',
      estado_devolucion: 'PENDIENTE',
      creado_en: new Date('2026-03-01T10:00:00Z'),
      equipamiento: {
        id_equipamiento: 'uuid-equip-1',
        nombre: 'Raqueta',
        precio_alquiler: '500.00',
      },
      reserva: {
        id_reserva: 'uuid-reserva-1',
        id_persona: 'uuid-socio-1',
      },
    };

    it('debe permitir a ADMINISTRADOR consultar cualquier alquiler', async () => {
      mockPrisma.detalleAlquilerEquipamiento.findUnique.mockResolvedValue(
        detalleBase,
      );

      const result = await service.getAlquiler('uuid-det-1', {
        id_usuario: 'uuid-admin-1',
        rol: 'ADMINISTRADOR',
      });

      expect(result).toMatchObject({
        id_detalle: 'uuid-det-1',
        id_reserva: 'uuid-reserva-1',
        id_equipamiento: 'uuid-equip-1',
        cantidad: 2,
        precio_unitario: 500,
        subtotal: 1000,
        equipamiento: {
          id_equipamiento: 'uuid-equip-1',
          nombre: 'Raqueta',
          precio_alquiler: 500,
        },
      });
    });

    it('debe permitir a GERENTE consultar cualquier alquiler', async () => {
      mockPrisma.detalleAlquilerEquipamiento.findUnique.mockResolvedValue(
        detalleBase,
      );

      const result = await service.getAlquiler('uuid-det-1', {
        id_usuario: 'uuid-gerente-1',
        rol: 'GERENTE',
      });

      expect(result).toHaveProperty('id_detalle', 'uuid-det-1');
    });

    it('debe permitir al socio consultar un alquiler de su propia reserva', async () => {
      mockPrisma.detalleAlquilerEquipamiento.findUnique.mockResolvedValue(
        detalleBase,
      );

      const result = await service.getAlquiler('uuid-det-1', {
        id_usuario: 'uuid-socio-1',
        rol: 'SOCIO',
      });

      expect(result).toHaveProperty('id_detalle', 'uuid-det-1');
    });

    it('debe rechazar a un socio el alquiler de otra persona con 403', async () => {
      mockPrisma.detalleAlquilerEquipamiento.findUnique.mockResolvedValue(
        detalleBase,
      );

      await expect(
        service.getAlquiler('uuid-det-1', {
          id_usuario: 'uuid-socio-2',
          rol: 'SOCIO',
        }),
      ).rejects.toThrow('No puedes consultar alquileres de otro usuario');
    });

    it('debe lanzar NotFoundException si el alquiler no existe', async () => {
      mockPrisma.detalleAlquilerEquipamiento.findUnique.mockResolvedValue(null);

      await expect(
        service.getAlquiler('uuid-inexistente', {
          id_usuario: 'uuid-admin-1',
          rol: 'ADMINISTRADOR',
        }),
      ).rejects.toThrow('Detalle de alquiler no encontrado');
    });

    it('debe lanzar ForbiddenException sin actor autenticado antes de consultar la base', async () => {
      await expect(
        service.getAlquiler('uuid-det-1', undefined),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.getAlquiler('uuid-det-1', { rol: 'SOCIO' } as any),
      ).rejects.toThrow(ForbiddenException);

      expect(
        mockPrisma.detalleAlquilerEquipamiento.findUnique,
      ).not.toHaveBeenCalled();
    });
  });

  describe('listarAlquileres', () => {
    it('debe filtrar por reservas propias cuando el actor es SOCIO', async () => {
      mockPrisma.detalleAlquilerEquipamiento.findMany.mockResolvedValue([]);

      await service.listarAlquileres(undefined, {
        id_usuario: 'uuid-socio-1',
        rol: 'SOCIO',
      });

      expect(
        mockPrisma.detalleAlquilerEquipamiento.findMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { reserva: { id_persona: 'uuid-socio-1' } },
        }),
      );
    });

    it('debe permitir al socio filtrar por una reserva propia', async () => {
      mockPrisma.reserva.findUnique.mockResolvedValue({
        id_persona: 'uuid-socio-1',
      });
      mockPrisma.detalleAlquilerEquipamiento.findMany.mockResolvedValue([]);

      await service.listarAlquileres('uuid-reserva-1', {
        id_usuario: 'uuid-socio-1',
        rol: 'SOCIO',
      });

      expect(
        mockPrisma.detalleAlquilerEquipamiento.findMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id_reserva: 'uuid-reserva-1',
            reserva: { id_persona: 'uuid-socio-1' },
          },
        }),
      );
    });

    it('debe responder 403 si el socio filtra por una reserva ajena', async () => {
      mockPrisma.reserva.findUnique.mockResolvedValue({
        id_persona: 'uuid-socio-2',
      });

      await expect(
        service.listarAlquileres('uuid-reserva-ajena', {
          id_usuario: 'uuid-socio-1',
          rol: 'SOCIO',
        }),
      ).rejects.toThrow('No puedes consultar alquileres de otro usuario');

      expect(
        mockPrisma.detalleAlquilerEquipamiento.findMany,
      ).not.toHaveBeenCalled();
    });

    it('debe permitir a GERENTE listar sin restricciones de titularidad', async () => {
      mockPrisma.detalleAlquilerEquipamiento.findMany.mockResolvedValue([]);

      await service.listarAlquileres('uuid-reserva-1', {
        id_usuario: 'uuid-gerente-1',
        rol: 'GERENTE',
      });

      expect(mockPrisma.reserva.findUnique).not.toHaveBeenCalled();
      expect(
        mockPrisma.detalleAlquilerEquipamiento.findMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id_reserva: 'uuid-reserva-1' } }),
      );
    });

    it('debe permitir a ADMINISTRADOR listar todos los alquileres', async () => {
      mockPrisma.detalleAlquilerEquipamiento.findMany.mockResolvedValue([]);

      await service.listarAlquileres(undefined, {
        id_usuario: 'uuid-admin-1',
        rol: 'ADMINISTRADOR',
      });

      expect(
        mockPrisma.detalleAlquilerEquipamiento.findMany,
      ).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
    });

    it('debe lanzar ForbiddenException sin actor autenticado antes de consultar la base', async () => {
      await expect(
        service.listarAlquileres(undefined, undefined),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.listarAlquileres('uuid-reserva-1', { rol: 'SOCIO' } as any),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.reserva.findUnique).not.toHaveBeenCalled();
      expect(
        mockPrisma.detalleAlquilerEquipamiento.findMany,
      ).not.toHaveBeenCalled();
    });
  });
});