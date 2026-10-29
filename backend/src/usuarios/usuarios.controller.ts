import {
  Controller,
  Post,
  Get,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsuariosService } from './usuarios.service';
import {
  RegisterPersonaDto,
  LoginDto,
  UpdatePerfilDto,
  ResolverSolicitudDto,
} from './dto/usuarios.dto';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('api/v1')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  // ─── Auth ────────────────────────────────────────────────────────────

  @Post('auth/register')
  async register(@Body() dto: RegisterPersonaDto) {
    return this.usuariosService.register(dto);
  }

  @Post('auth/login')
  async login(@Body() dto: LoginDto) {
    return this.usuariosService.login(dto);
  }

  // ─── Perfil ──────────────────────────────────────────────────────────

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  async getPerfil(@Request() req) {
    return this.usuariosService.getPerfil(req.user.id_usuario);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('profile')
  async updatePerfil(@Request() req, @Body() dto: UpdatePerfilDto) {
    return this.usuariosService.updatePerfil(req.user.id_usuario, dto);
  }

  // ─── Solicitudes de permiso ──────────────────────────────────────────

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('GERENTE', 'ADMINISTRADOR')
  @Get('permission-requests')
  async listarSolicitudes(@Query('estado') estado?: string) {
    return this.usuariosService.listarSolicitudes(estado);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('GERENTE', 'ADMINISTRADOR')
  @Patch('permission-requests/:id')
  async resolverSolicitud(
    @Param('id') id: string,
    @Body() dto: ResolverSolicitudDto,
    @Request() req,
  ) {
    return this.usuariosService.resolverSolicitud(id, dto, req.user.id_usuario);
  }

  // ─── Gestión de usuarios (Admin) ─────────────────────────────────────

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMINISTRADOR')
  @Get('users')
  async listarUsuarios(
    @Query('rol') rol?: string,
    @Query('estado') estado?: string,
  ) {
    return this.usuariosService.listarUsuarios(rol, estado);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMINISTRADOR')
  @Patch('users/:id/status')
  async cambiarEstadoUsuario(
    @Param('id') id: string,
    @Body('estado') estado: string,
  ) {
    return this.usuariosService.cambiarEstadoUsuario(id, estado);
  }
}