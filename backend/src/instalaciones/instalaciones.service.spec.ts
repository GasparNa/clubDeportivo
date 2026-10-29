import { InstalacionesService } from './instalaciones.service';
import { NotFoundException } from '@nestjs/common';

describe('InstalacionesService', () => {
  let service: InstalacionesService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      disciplina: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      cancha: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      franjaHoraria: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      reserva: {
        findMany: jest.fn(),
      },
    };

    service = new InstalacionesService(mockPrisma as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('crearDisciplina', () => {
    it('debe crear una disciplina correctamente', async () => {
      mockPrisma.disciplina.findUnique.mockResolvedValue(null);
      mockPrisma.disciplina.create.mockResolvedValue({
        id_disciplina: 'uuid-disc-1',
        nombre: 'Tenis',
        descripcion: 'Cancha de tenis',
      });

      const result = await service.crearDisciplina({ nombre: 'Tenis', descripcion: 'Cancha de tenis' });

      expect(result).toHaveProperty('id_disciplina');
      expect(result.nombre).toBe('Tenis');
    });
  });

  describe('listarDisciplinas', () => {
    it('debe retornar lista de disciplinas', async () => {
      mockPrisma.disciplina.findMany.mockResolvedValue([
        { id_disciplina: '1', nombre: 'Tenis', _count: { canchas: 2 } },
        { id_disciplina: '2', nombre: 'Fútbol', _count: { canchas: 1 } },
      ]);

      const result = await service.listarDisciplinas();

      expect(result).toHaveLength(2);
    });
  });

  describe('getFranjasDisponibles', () => {
    it('debe retornar franjas con disponibilidad', async () => {
      mockPrisma.franjaHoraria.findMany.mockResolvedValue([
        {
          id_franja: 'uuid-franja-1',
          dia_semana: 1,
          hora_inicio: '10:00',
          hora_fin: '11:00',
        },
      ]);
      mockPrisma.reserva.findMany.mockResolvedValue([]);

      const result = await service.getFranjasDisponibles('uuid-cancha-1', '2026-10-05');

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('disponible', true);
    });

    it('debe marcar como no disponible si ya hay reserva', async () => {
      mockPrisma.franjaHoraria.findMany.mockResolvedValue([
        {
          id_franja: 'uuid-franja-1',
          dia_semana: 1,
          hora_inicio: '10:00',
          hora_fin: '11:00',
        },
      ]);
      mockPrisma.reserva.findMany.mockResolvedValue([
        { id_franja: 'uuid-franja-1' },
      ]);

      const result = await service.getFranjasDisponibles('uuid-cancha-1', '2026-10-05');

      expect(result[0]).toHaveProperty('disponible', false);
    });
  });

  describe('eliminarDisciplina', () => {
    it('debe lanzar NotFoundException si la disciplina no existe', async () => {
      mockPrisma.disciplina.findUnique.mockResolvedValue(null);

      await expect(service.eliminarDisciplina('no-existe')).rejects.toThrow(NotFoundException);
    });

    it('debe eliminar una disciplina existente', async () => {
      mockPrisma.disciplina.findUnique.mockResolvedValue({ id_disciplina: 'uuid-disc-1' });
      mockPrisma.disciplina.delete.mockResolvedValue({ id_disciplina: 'uuid-disc-1' });

      const result = await service.eliminarDisciplina('uuid-disc-1');

      expect(result).toHaveProperty('id_disciplina');
    });
  });
});