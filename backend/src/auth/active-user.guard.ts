import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Guard que verifica que el usuario autenticado tiene estado ACTIVO.
 * A diferencia de SuspendedUserGuard, este requiere explícitamente ACTIVO
 * y bloquea también PENDIENTE, etc.
 */
@Injectable()
export class ActiveUserGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id_usuario;

    if (!userId) {
      throw new ForbiddenException('Se requiere autenticación');
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario: userId },
      select: { estado: true, rol: true },
    });

    if (!usuario || usuario.estado !== 'ACTIVO') {
      throw new ForbiddenException('El usuario debe estar ACTIVO para realizar esta operación');
    }

    // Opcional: también verificar que sea SOCIO (no GERENTE/ADMIN)
    // según los requisitos, los gerentes/admins pueden hacer reservas MANUAL_GERENCIA
    // pero este guard es para endpoints autogestionados
    return true;
  }
}