import { ParseUUIDPipe } from '@nestjs/common';
import { ReservasController } from './reservas.controller';
import { RolesGuard } from '../auth/roles.guard';
import { ActiveUserGuard } from '../auth/active-user.guard';

const GUARDS_METADATA = '__guards__';
const ROUTE_ARGS_METADATA = '__routeArguments__';
const UUID_VALIDO = '550e8400-e29b-41d4-a716-446655440000';

function guardsDe(metodo: keyof ReservasController) {
  return (
    Reflect.getMetadata(
      GUARDS_METADATA,
      ReservasController.prototype[metodo],
    ) || []
  );
}

function esGuardDeAutenticacion(guard: any) {
  return (
    typeof guard === 'function' &&
    guard !== RolesGuard &&
    guard !== ActiveUserGuard &&
    typeof guard.prototype?.canActivate === 'function'
  );
}

function esAuthGuardJwt(guard: any) {
  if (!esGuardDeAutenticacion(guard)) return false;

  const instancia = new guard();
  return instancia.strategy === 'jwt';
}

function argumentosDe(metodo: string) {
  return (
    Reflect.getMetadata(ROUTE_ARGS_METADATA, ReservasController, metodo) || {}
  );
}

describe('ReservasController - alquileres', () => {
  let controller: ReservasController;
  let mockService: any;

  beforeEach(() => {
    mockService = {
      listarAlquileres: jest.fn(),
      getAlquiler: jest.fn(),
    };
    controller = new ReservasController(mockService);
  });

  describe('GET equipment-rentals', () => {
    it("debe declarar AuthGuard('jwt')", () => {
      const guards = guardsDe('listarAlquileres');

      expect(guards.some(esAuthGuardJwt)).toBe(true);
    });

    it('debe pasar req.user al servicio junto con el filtro de reserva', async () => {
      const req = {
        user: { id_usuario: 'uuid-socio-1', rol: 'SOCIO' },
      };
      mockService.listarAlquileres.mockResolvedValue([]);

      const result = await controller.listarAlquileres(
        req as any,
        'uuid-reserva-1',
      );

      expect(mockService.listarAlquileres).toHaveBeenCalledWith(
        'uuid-reserva-1',
        req.user,
      );
      expect(mockService.listarAlquileres.mock.calls[0][1]).toBe(req.user);
      expect(result).toEqual([]);
    });

    it('debe pasar req.user al servicio cuando no hay filtro de reserva', async () => {
      const req = {
        user: { id_usuario: 'uuid-admin-1', rol: 'ADMINISTRADOR' },
      };
      mockService.listarAlquileres.mockResolvedValue([]);

      await controller.listarAlquileres(req as any);

      expect(mockService.listarAlquileres).toHaveBeenCalledWith(
        undefined,
        req.user,
      );
    });
  });

  describe('GET equipment-rentals/:id', () => {
    it("debe declarar AuthGuard('jwt')", () => {
      const guards = guardsDe('getAlquiler');

      expect(guards.some(esAuthGuardJwt)).toBe(true);
    });

    it('debe validar el UUID de ruta con ParseUUIDPipe', () => {
      const args = argumentosDe('getAlquiler');
      const parametro = args['5:0'];

      expect(parametro).toBeDefined();
      expect(parametro.data).toBe('id');
      expect(parametro.pipes).toContain(ParseUUIDPipe);
    });

    it('debe pasar req.user al servicio junto con el id', async () => {
      const req = {
        user: { id_usuario: 'uuid-socio-1', rol: 'SOCIO' },
      };
      mockService.getAlquiler.mockResolvedValue({ id_detalle: UUID_VALIDO });

      const result = await controller.getAlquiler(UUID_VALIDO, req as any);

      expect(mockService.getAlquiler).toHaveBeenCalledWith(
        UUID_VALIDO,
        req.user,
      );
      expect(mockService.getAlquiler.mock.calls[0][1]).toBe(req.user);
      expect(result).toEqual({ id_detalle: UUID_VALIDO });
    });
  });
});
