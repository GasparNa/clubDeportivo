import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PagosService } from './pagos.service';
import {
  CreatePagoDto,
  AuditoriaQueryDto,
  CreateNotificacionDto,
} from './dto/pagos.dto';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('api/v1')
export class PagosController {
  constructor(private readonly pagosService: PagosService) {}

  // ════════════════════════════════════════════════════════════════════
  // Pagos
  // ════════════════════════════════════════════════════════════════════

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('GERENTE', 'ADMINISTRADOR')
  @Post('payments')
  async crearPago(@Body() dto: CreatePagoDto) {
    return this.pagosService.crearPago(dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('payments')
  async listarPagos(
    @Query('date_from') fecha_desde?: string,
    @Query('date_to') fecha_hasta?: string,
  ) {
    return this.pagosService.listarPagos({ fecha_desde, fecha_hasta });
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('payments/reservation/:id')
  async getPagosReserva(@Param('id') id: string) {
    return this.pagosService.getPagosReserva(id);
  }

  // ════════════════════════════════════════════════════════════════════
  // Auditoría
  // ════════════════════════════════════════════════════════════════════

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMINISTRADOR')
  @Get('audit-logs')
  async getAuditoria(
    @Query() filtros: AuditoriaQueryDto,
  ) {
    return this.pagosService.getAuditoria(filtros);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMINISTRADOR')
  @Get('audit-logs/report')
  async getReporteAuditoria(
    @Query('date_from') fecha_desde: string,
    @Query('date_to') fecha_hasta: string,
  ) {
    return this.pagosService.getReporteAuditoria(fecha_desde, fecha_hasta);
  }

  // ════════════════════════════════════════════════════════════════════
  // Notificaciones
  // ════════════════════════════════════════════════════════════════════

  @UseGuards(AuthGuard('jwt'))
  @Get('notifications')
  async listarNotificaciones(@Request() req) {
    return this.pagosService.listarNotificaciones(req.user.id_usuario);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('GERENTE', 'ADMINISTRADOR')
  @Post('notifications')
  async enviarNotificacion(@Body() dto: CreateNotificacionDto) {
    return this.pagosService.enviarNotificacion(dto);
  }
}