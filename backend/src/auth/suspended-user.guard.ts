import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Guard que bloquea a usuarios suspendidos de realizar operaciones.
 */
@Injectable()
export class SuspendedUserGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id_usuario;

    if (!userId) {
      return true; // Sin usuario autenticado, otros guards se encargarán
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario: userId },
      select: { estado: true },
    });

    if (usuario?.estado === 'SUSPENDIDO') {
      throw new UnauthorizedException(
        'Usuario suspendido: no puede realizar reservas ni alquilar equipamiento',
      );
    }

    return true;
  }
}