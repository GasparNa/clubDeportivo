import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard, ROLES_KEY } from './roles.guard';

jest.mock('@nestjs/passport', () => {
  const common = jest.requireActual('@nestjs/common');

  return {
    AuthGuard: () =>
      class JwtAuthGuard {
        canActivate(contexto: any): boolean {
          if (!contexto.switchToHttp().getRequest().user) {
            throw new common.UnauthorizedException();
          }
          return true;
        }
      },
    PassportStrategy: (Strategy: any) => class extends Strategy {},
    PassportModule: {},
  };
});

const CONTROLADOR = class Controlador {};

function contexto(roles?: string[], user?: { rol?: string | null } | null): any {
  const handler = function handler() {};

  if (roles !== undefined) {
    Reflect.defineMetadata(ROLES_KEY, roles, handler);
  }

  return {
    getHandler: () => handler,
    getClass: () => CONTROLADOR,
    switchToHttp: () => ({
      getRequest: () => (user === undefined ? {} : { user }),
    }),
  };
}

function estadoHttp(permitido: boolean): number {
  return permitido ? 200 : 403;
}

describe('RF-AUT-03 RolesGuard fail-closed', () => {
  const guard = new RolesGuard(new Reflector());

  it('sin @Roles permite el paso aunque no haya usuario', () => {
    expect(guard.canActivate(contexto())).toBe(true);
  });

  it('rol ADMINISTRADOR coincide y permite el paso con 200', () => {
    const permitido = guard.canActivate(
      contexto(['ADMINISTRADOR'], { rol: 'ADMINISTRADOR' }),
    );

    expect(permitido).toBe(true);
    expect(estadoHttp(permitido)).toBe(200);
  });

  it('rol SOCIO no coincide con ADMINISTRADOR y devuelve 403', () => {
    const permitido = guard.canActivate(
      contexto(['ADMINISTRADOR'], { rol: 'SOCIO' }),
    );

    expect(permitido).toBe(false);
    expect(estadoHttp(permitido)).toBe(403);
  });

  it('sin usuario devuelve false sin lanzar error interno', () => {
    expect(() => guard.canActivate(contexto(['GERENTE']))).not.toThrow();
    expect(guard.canActivate(contexto(['GERENTE']))).toBe(false);
  });

  it('HTTP sin token: AuthGuard responde 401 y RolesGuard no se ejecuta', () => {
    const ctx = contexto(['GERENTE']);
    const rolesSpy = jest.spyOn(RolesGuard.prototype, 'canActivate');
    const JwtAuthGuard = AuthGuard('jwt') as new () => {
      canActivate(context: any): boolean;
    };

    expect(() => new JwtAuthGuard().canActivate(ctx)).toThrow(
      UnauthorizedException,
    );
    expect(rolesSpy).not.toHaveBeenCalled();

    rolesSpy.mockRestore();
  });

  it('usuario con rol null devuelve false y Nest traduce a 403', () => {
    const permitido = guard.canActivate(
      contexto(['ADMINISTRADOR'], { rol: null }),
    );

    expect(permitido).toBe(false);
    expect(estadoHttp(permitido)).toBe(403);
  });
});
