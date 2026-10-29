import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InstalacionesService } from './instalaciones.service';
import {
  CreateDisciplinaDto,
  UpdateDisciplinaDto,
  CreateCanchaDto,
  UpdateCanchaDto,
  CreateFranjaHorariaDto,
} from './dto/instalaciones.dto';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('api/v1')
export class InstalacionesController {
  constructor(private readonly instalacionesService: InstalacionesService) {}

  // ════════════════════════════════════════════════════════════════════
  // Disciplinas
  // ════════════════════════════════════════════════════════════════════

  @Get('disciplines')
  async listarDisciplinas() {
    return this.instalacionesService.listarDisciplinas();
  }

  @Get('disciplines/:id')
  async getDisciplina(@Param('id') id: string) {
    return this.instalacionesService.getDisciplina(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMINISTRADOR')
  @Post('disciplines')
  async crearDisciplina(@Body() dto: CreateDisciplinaDto) {
    return this.instalacionesService.crearDisciplina(dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMINISTRADOR')
  @Put('disciplines/:id')
  async actualizarDisciplina(@Param('id') id: string, @Body() dto: UpdateDisciplinaDto) {
    return this.instalacionesService.actualizarDisciplina(id, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMINISTRADOR')
  @Delete('disciplines/:id')
  async eliminarDisciplina(@Param('id') id: string) {
    return this.instalacionesService.eliminarDisciplina(id);
  }

  // ════════════════════════════════════════════════════════════════════
  // Canchas
  // ════════════════════════════════════════════════════════════════════

  @Get('courts')
  async listarCanchas(@Query('discipline_id') disciplineId?: string) {
    return this.instalacionesService.listarCanchas(disciplineId);
  }

  @Get('courts/:id')
  async getCancha(@Param('id') id: string) {
    return this.instalacionesService.getCancha(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMINISTRADOR')
  @Post('courts')
  async crearCancha(@Body() dto: CreateCanchaDto) {
    return this.instalacionesService.crearCancha(dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMINISTRADOR')
  @Put('courts/:id')
  async actualizarCancha(@Param('id') id: string, @Body() dto: UpdateCanchaDto) {
    return this.instalacionesService.actualizarCancha(id, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMINISTRADOR')
  @Delete('courts/:id')
  async eliminarCancha(@Param('id') id: string) {
    return this.instalacionesService.eliminarCancha(id);
  }

  // ════════════════════════════════════════════════════════════════════
  // Franjas Horarias
  // ════════════════════════════════════════════════════════════════════

  @Get('time-slots')
  async listarFranjas(
    @Query('court_id') courtId?: string,
    @Query('day') day?: string,
  ) {
    return this.instalacionesService.listarFranjas(
      courtId,
      day ? parseInt(day) : undefined,
    );
  }

  @Get('time-slots/availability')
  async getFranjasDisponibles(
    @Query('court_id') courtId: string,
    @Query('date') fecha: string,
  ) {
    return this.instalacionesService.getFranjasDisponibles(courtId, fecha);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMINISTRADOR')
  @Post('time-slots')
  async crearFranja(@Body() dto: CreateFranjaHorariaDto) {
    return this.instalacionesService.crearFranja(dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMINISTRADOR')
  @Delete('time-slots/:id')
  async eliminarFranja(@Param('id') id: string) {
    return this.instalacionesService.eliminarFranja(id);
  }
}