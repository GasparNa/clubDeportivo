import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'default-secret-change-me',
    });
  }

  async validate(payload: { sub: string; email: string; rol: string }) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario: payload.sub },
      include: {
        contactoLogin: true,
        persona: {
          include: {
            contactos: {
              where: { tipo_contacto: 'EMAIL', estado: 'ACTIVO' },
              take: 1,
            },
          },
        },
      },
    });

    if (!usuario || usuario.estado === 'SUSPENDIDO') {
      throw new UnauthorizedException('Usuario no autorizado o suspendido');
    }

    return {
      id_usuario: usuario.id_usuario,
      email: usuario.contactoLogin?.valor_contacto || usuario.persona.contactos[0]?.valor_contacto,
      rol: usuario.rol,
      estado: usuario.estado,
      nombre: usuario.persona.nombre,
      apellido: usuario.persona.apellido,
    };
  }
}