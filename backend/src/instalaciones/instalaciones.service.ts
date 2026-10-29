import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateDisciplinaDto,
  UpdateDisciplinaDto,
  CreateCanchaDto,
  UpdateCanchaDto,
  CreateFranjaHorariaDto,
} from './dto/instalaciones.dto';

@Injectable()
export class InstalacionesService {
  constructor(private prisma: PrismaService) {}

  // ════════════════════════════════════════════════════════════════════
  // Disciplinas
  // ════════════════════════════════════════════════════════════════════

  async listarDisciplinas() {
    return this.prisma.disciplina.findMany({
      include: {
        _count: { select: { canchas: true } },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async getDisciplina(id: string) {
    const disciplina = await this.prisma.disciplina.findUnique({
      where: { id_disciplina: id },
      include: {
        canchas: true,
        equipamientos: true,
      },
    });

    if (!disciplina) {
      throw new NotFoundException('Disciplina no encontrada');
    }

    return disciplina;
  }

  async crearDisciplina(dto: CreateDisciplinaDto) {
    const existente = await this.prisma.disciplina.findUnique({
      where: { nombre: dto.nombre },
    });

    if (existente) {
      throw new ConflictException('Ya existe una disciplina con ese nombre');
    }

    return this.prisma.disciplina.create({ data: dto });
  }

  async actualizarDisciplina(id: string, dto: UpdateDisciplinaDto) {
    await this.getDisciplina(id); // Verifica existencia

    if (dto.nombre) {
      const existente = await this.prisma.disciplina.findUnique({
        where: { nombre: dto.nombre },
      });
      if (existente && existente.id_disciplina !== id) {
        throw new ConflictException('Ya existe una disciplina con ese nombre');
      }
    }

    return this.prisma.disciplina.update({
      where: { id_disciplina: id },
      data: dto,
    });
  }

  async eliminarDisciplina(id: string) {
    await this.getDisciplina(id);
    return this.prisma.disciplina.delete({ where: { id_disciplina: id } });
  }

  // ════════════════════════════════════════════════════════════════════
  // Canchas
  // ════════════════════════════════════════════════════════════════════

  async listarCanchas(id_disciplina?: string) {
    const where = id_disciplina ? { id_disciplina } : {};
    return this.prisma.cancha.findMany({
      where,
      include: {
        disciplina: true,
        franjasHorarias: true,
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async getCancha(id: string) {
    const cancha = await this.prisma.cancha.findUnique({
      where: { id_cancha: id },
      include: {
        disciplina: true,
        franjasHorarias: {
          orderBy: [{ dia_semana: 'asc' }, { hora_inicio: 'asc' }],
        },
      },
    });

    if (!cancha) {
      throw new NotFoundException('Cancha no encontrada');
    }

    return cancha;
  }

  async crearCancha(dto: CreateCanchaDto) {
    // Verificar que la disciplina existe
    await this.prisma.disciplina.findUniqueOrThrow({
      where: { id_disciplina: dto.id_disciplina },
    });

    return this.prisma.cancha.create({ data: dto });
  }

  async actualizarCancha(id: string, dto: UpdateCanchaDto) {
    await this.getCancha(id);
    return this.prisma.cancha.update({
      where: { id_cancha: id },
      data: dto,
    });
  }

  async eliminarCancha(id: string) {
    await this.getCancha(id);
    return this.prisma.cancha.delete({ where: { id_cancha: id } });
  }

  // ════════════════════════════════════════════════════════════════════
  // Franjas Horarias
  // ════════════════════════════════════════════════════════════════════

  async listarFranjas(id_cancha?: string, dia_semana?: number) {
    const where: any = {};
    if (id_cancha) where.id_cancha = id_cancha;
    if (dia_semana !== undefined) where.dia_semana = dia_semana;

    return this.prisma.franjaHoraria.findMany({
      where,
      include: {
        cancha: {
          include: { disciplina: true },
        },
      },
      orderBy: [{ dia_semana: 'asc' }, { hora_inicio: 'asc' }],
    });
  }

  /**
   * Obtener franjas disponibles para una cancha y fecha específica,
   * considerando las reservas existentes.
   */
  async getFranjasDisponibles(id_cancha: string, fecha: string) {
    const fechaDate = new Date(fecha);
    const diaSemana = fechaDate.getUTCDay();

    // Obtener todas las franjas de la cancha para ese día
    const franjas = await this.prisma.franjaHoraria.findMany({
      where: {
        id_cancha,
        dia_semana: diaSemana,
      },
      orderBy: { hora_inicio: 'asc' },
    });

    // Obtener reservas activas para esa fecha
    const reservas = await this.prisma.reserva.findMany({
      where: {
        fecha: fechaDate,
        estado: { in: ['CONFIRMADA', 'EN_CURSO'] },
        franjaHoraria: { id_cancha },
      },
      select: { id_franja: true },
    });

    const franjasOcupadas = new Set(reservas.map((r) => r.id_franja));

    return franjas.map((f) => ({
      ...f,
      disponible: !franjasOcupadas.has(f.id_franja),
    }));
  }

  async crearFranja(dto: CreateFranjaHorariaDto) {
    // Verificar cancha
    await this.prisma.cancha.findUniqueOrThrow({
      where: { id_cancha: dto.id_cancha },
    });

    // Parsear horas
    const [hiH, hiM] = dto.hora_inicio.split(':').map(Number);
    const [hfH, hfM] = dto.hora_fin.split(':').map(Number);

    const horaInicio = new Date();
    horaInicio.setHours(hiH, hiM, 0, 0);

    const horaFin = new Date();
    horaFin.setHours(hfH, hfM, 0, 0);

    return this.prisma.franjaHoraria.create({
      data: {
        id_cancha: dto.id_cancha,
        dia_semana: dto.dia_semana,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
      },
    });
  }

  async eliminarFranja(id: string) {
    const franja = await this.prisma.franjaHoraria.findUnique({
      where: { id_franja: id },
    });

    if (!franja) {
      throw new NotFoundException('Franja horaria no encontrada');
    }

    return this.prisma.franjaHoraria.delete({ where: { id_franja: id } });
  }
}