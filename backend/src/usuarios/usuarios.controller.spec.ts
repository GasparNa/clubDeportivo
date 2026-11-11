import { ParseUUIDPipe, BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsuariosController } from './usuarios.controller';
import { RolesGuard, ROLES_KEY } from '../auth/roles.guard';

const GUARDS_METADATA = '__guards__';
const ROUTE_ARGS_METADATA = '__routeArguments__';
const UUID_VALIDO = '550e8400-e29b-41d4-a716-446655440000';

function guardsDe(metodo: keyof UsuariosController) {
  return (
    Reflect.getMetadata(
      GUARDS_METADATA,
      UsuariosController.prototype[metodo],
    ) || []
  );
}

function rolesDe(metodo: keyof UsuariosController) {
  return Reflect.getMetadata(
    ROLES_KEY,
    UsuariosController.prototype[metodo],
  );
}

function esGuardDeAutenticacion(guard: any) {
  return (
    typeof guard === 'function' &&
    guard !== RolesGuard &&
    typeof guard.prototype?.canActivate === 'function'
  );
}

function argumentosDe(metodo: string) {
  return (
    Reflect.getMetadata(ROUTE_ARGS_METADATA, UsuariosController, metodo) || {}
  );
}

function contextoPara(metodo: keyof UsuariosController, rol: string) {
  return {
    getHandler: () => UsuariosController.prototype[metodo],
    getClass: () => UsuariosController,
    switchToHttp: () => ({ getRequest: () => ({ user: { rol } }) }),
  } as any;
}

function puedeAcceder(metodo: keyof UsuariosController, rol: string) {
  const guard = new RolesGuard(new Reflector());
  return guard.canActivate(contextoPara(metodo, rol));
}

describe('UsuariosController', () => {
  let controller: UsuariosController;
  let mockService: any;

  beforeEach(() => {
    mockService = {
      getUsuarioDetalle: jest.fn(),
      listarUsuarios: jest.fn(),
    };
    controller = new UsuariosController(mockService);
  });

  describe('GET users/:id', () => {
    it('debe requerir AuthGuard y RolesGuard', () => {
      const guards = guardsDe('getUsuarioDetalle');

      expect(guards).toContain(RolesGuard);
      expect(guards.some(esGuardDeAutenticacion)).toBe(true);
    });

    it('debe requerir el rol ADMINISTRADOR', () => {
      expect(rolesDe('getUsuarioDetalle')).toEqual(['ADMINISTRADOR']);
    });

    it('debe permitir el acceso solo a ADMINISTRADOR (403 para SOCIO y GERENTE)', () => {
      expect(puedeAcceder('getUsuarioDetalle', 'ADMINISTRADOR')).toBe(true);
      expect(puedeAcceder('getUsuarioDetalle', 'SOCIO')).toBe(false);
      expect(puedeAcceder('getUsuarioDetalle', 'GERENTE')).toBe(false);
    });

    it('debe validar el UUID de ruta con ParseUUIDPipe', () => {
      const args = argumentosDe('getUsuarioDetalle');
      const parametro = args['5:0'];

      expect(parametro).toBeDefined();
      expect(parametro.data).toBe('id');
      expect(parametro.pipes).toContain(ParseUUIDPipe);
    });

    it('ParseUUIDPipe rechaza identificadores inválidos y acepta UUIDs', async () => {
      const pipe = new ParseUUIDPipe();

      expect(() => pipe.transform('no-es-uuid', {} as any)).toThrow(
        BadRequestException,
      );
      expect(await pipe.transform(UUID_VALIDO, {} as any)).toBe(UUID_VALIDO);
    });

    it('debe delegar en el servicio con el identificador recibido', async () => {
      mockService.getUsuarioDetalle.mockResolvedValue({ id: UUID_VALIDO });

      const result = await controller.getUsuarioDetalle(UUID_VALIDO);

      expect(mockService.getUsuarioDetalle).toHaveBeenCalledWith(UUID_VALIDO);
      expect(result).toEqual({ id: UUID_VALIDO });
    });
  });

  describe('GET users', () => {
    it('debe requerir AuthGuard y RolesGuard', () => {
      const guards = guardsDe('listarUsuarios');

      expect(guards).toContain(RolesGuard);
      expect(guards.some(esGuardDeAutenticacion)).toBe(true);
    });

    it('debe requerir el rol ADMINISTRADOR', () => {
      expect(rolesDe('listarUsuarios')).toEqual(['ADMINISTRADOR']);
    });

    it('debe permitir el listado a ADMINISTRADOR y rechazar SOCIO/GERENTE (403)', () => {
      expect(puedeAcceder('listarUsuarios', 'ADMINISTRADOR')).toBe(true);
      expect(puedeAcceder('listarUsuarios', 'SOCIO')).toBe(false);
      expect(puedeAcceder('listarUsuarios', 'GERENTE')).toBe(false);
    });

    it('sin AuthGuard no se puede garantizar el 401: el stub de Jest lo permite', () => {
      // El stub de @nestjs/passport devuelve true siempre. El 401 real lo
      // aplica Nest al resolver AuthGuard('jwt'); aquí solo verificamos que el
      // guard esté declarado en el endpoint.
      expect(guardsDe('listarUsuarios').some(esGuardDeAutenticacion)).toBe(
        true,
      );
    });

    it('debe delegar los filtros de rol y estado al servicio', async () => {
      mockService.listarUsuarios.mockResolvedValue([]);

      const result = await controller.listarUsuarios('SOCIO', 'ACTIVO');

      expect(mockService.listarUsuarios).toHaveBeenCalledWith('SOCIO', 'ACTIVO');
      expect(result).toEqual([]);
    });
  });
});
