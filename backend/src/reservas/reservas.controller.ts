import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ReservasService } from './reservas.service';
import {
  CreateReservaDto,
  UpdateReservaEstadoDto,
  CancelarReservaDto,
  CreateAlquilerEquipamientoDto,
  UpdateDevolucionDto,
} from './dto/reservas.dto';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ActiveUserGuard } from '../auth/active-user.guard';

@Controller('api/v1')
export class ReservasController {
  constructor(private readonly reservasService: ReservasService) {}

  // ════════════════════════════════════════════════════════════════════
  // Reservas
  // ════════════════════════════════════════════════════════════════════

  @UseGuards(AuthGuard('jwt'))
  @Get('reservations')
  async listarReservas(
    @Query('person_id') personId?: string,
    @Query('date') fecha?: string,
    @Query('status') estado?: string,
  ) {
    return this.reservasService.listarReservas({
      id_persona: personId,
      fecha,
      estado,
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('reservations/:id')
  async getReserva(@Param('id') id: string) {
    return this.reservasService.getReserva(id);
  }

  @UseGuards(AuthGuard('jwt'), ActiveUserGuard)
  @Post('reservations')
  async crearReserva(@Body() dto: CreateReservaDto, @Request() req) {
    return this.reservasService.crearReserva(dto, req.user?.id_usuario);
  }

  /**
   * Cancelación por el socio dueño de la reserva (autoservicio).
   * El frontend llama PATCH /reservations/:id con { estado: "CANCELADA" }.
   * DELETE se mantiene como alias canónico del contrato OpenSpec.
   */
  @UseGuards(AuthGuard('jwt'), ActiveUserGuard)
  @Patch('reservations/:id')
  async cancelarReserva(
    @Param('id') id: string,
    @Body() _dto: CancelarReservaDto,
    @Request() req,
  ) {
    return this.reservasService.cancelarReservaAutogestionada(
      id,
      req.user?.id_usuario,
    );
  }

  @UseGuards(AuthGuard('jwt'), ActiveUserGuard)
  @Delete('reservations/:id')
  async cancelarReservaDelete(@Param('id') id: string, @Request() req) {
    return this.reservasService.cancelarReservaAutogestionada(
      id,
      req.user?.id_usuario,
    );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('GERENTE', 'ADMINISTRADOR')
  @Patch('reservations/:id/status')
  async actualizarEstadoReserva(
    @Param('id') id: string,
    @Body() dto: UpdateReservaEstadoDto,
  ) {
    return this.reservasService.actualizarEstadoReserva(id, dto);
  }

  // ════════════════════════════════════════════════════════════════════
  // Equipamiento
  // ════════════════════════════════════════════════════════════════════

  @Get('equipment')
  async listarEquipamientos(@Query('discipline_id') disciplineId?: string) {
    return this.reservasService.listarEquipamientos(disciplineId);
  }

  // ════════════════════════════════════════════════════════════════════
  // Alquiler de Equipamiento
  // ════════════════════════════════════════════════════════════════════

  @UseGuards(AuthGuard('jwt'))
  @Get('equipment-rentals')
  async listarAlquileres(@Query('reservation_id') reservationId?: string) {
    return this.reservasService.listarAlquileres(reservationId);
  }

  @UseGuards(AuthGuard('jwt'), ActiveUserGuard)
  @Post('equipment-rentals')
  async crearAlquiler(@Body() dto: CreateAlquilerEquipamientoDto) {
    return this.reservasService.crearAlquiler(dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('GERENTE', 'ADMINISTRADOR')
  @Patch('equipment-rentals/:id/return')
  async procesarDevolucion(
    @Param('id') id: string,
    @Body() dto: UpdateDevolucionDto,
  ) {
    return this.reservasService.procesarDevolucion(id, dto);
  }
}