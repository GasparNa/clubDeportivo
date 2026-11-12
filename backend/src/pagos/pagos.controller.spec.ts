import { validate } from 'class-validator';
import { Reflector } from '@nestjs/core';
import { PagosController } from './pagos.controller';
import { RolesGuard, ROLES_KEY } from '../auth/roles.guard';
import { CreateNotificacionDto } from './dto/pagos.dto';

const GUARDS_METADATA = '__guards__';
const UUID_VALIDO = '550e8400-e29b-41d4-a716-446655440000';

function guardsDe(metodo: keyof PagosController) {
  return (
    Reflect.getMetadata(GUARDS_METADATA, PagosController.prototype[metodo]) ||
    []
  );
}

function detalleDe(metodo: keyof PagosController) {
  return Reflect.getMetadata(ROLES_KEY, PagosController.prototype[metodo]);
}

function contextoPara(metodo: keyof PagosController, rol: string) {
  return {
    getHandler: () => PagosController.prototype[metodo],
    getClass: () => PagosController,
    switchToHttp: () => ({ getRequest: () => ({ user: { rol } }) }),
  } as any;
}

function puedeAcceder(metodo: keyof PagosController, rol: string) {
  const guard = new RolesGuard(new Reflector());
  return guard.canActivate(contextoPara(metodo, rol));
}

async function erroresDe(payload: Record<string, unknown>) {
  const dto = Object.assign(new CreateNotificacionDto(), payload);
  const errores = await validate(dto);
  return errores.map((error) => error.property);
}

describe('PagosController - notificaciones', () => {
  let controller: PagosController;
  let mockService: any;

  beforeEach(() => {
    mockService = {
      listarNotificaciones: jest.fn(),
      enviarNotificacion: jest.fn(),
    };
    controller = new PagosController(mockService);
  });

  describe('GET notifications', () => {
    it('debe delegar en el servicio con el id_usuario del token', async () => {
      mockService.listarNotificaciones.mockResolvedValue([]);

      const result = await controller.listarNotificaciones({
        user: { id_usuario: 'uuid-user-1' },
      });

      expect(mockService.listarNotificaciones).toHaveBeenCalledWith(
        'uuid-user-1',
      );
      expect(result).toEqual([]);
    });

    it('debe declarar AuthGuard para exigir autenticación (401)', () => {
      // El stub de Jest de AuthGuard siempre permite; el 401 lo produce Nest.
      expect(guardsDe('listarNotificaciones').length).toBeGreaterThan(0);
    });
  });

  describe('POST notifications', () => {
    const payloadValido = {
      id_usuario: UUID_VALIDO,
      asunto: 'Reserva confirmada',
      mensaje: 'Su reserva ha sido confirmada',
    };

    it('debe requerir GERENTE o ADMINISTRADOR y rechazar SOCIO (403)', () => {
      expect(detalleDe('enviarNotificacion')).toEqual([
        'GERENTE',
        'ADMINISTRADOR',
      ]);
      expect(puedeAcceder('enviarNotificacion', 'GERENTE')).toBe(true);
      expect(puedeAcceder('enviarNotificacion', 'ADMINISTRADOR')).toBe(true);
      expect(puedeAcceder('enviarNotificacion', 'SOCIO')).toBe(false);
    });

    it('debe declarar AuthGuard y RolesGuard', () => {
      const guards = guardsDe('enviarNotificacion');

      expect(guards).toContain(RolesGuard);
      expect(guards.some((g: any) => g !== RolesGuard)).toBe(true);
    });

    it('debe aceptar un payload válido', async () => {
      expect(await erroresDe(payloadValido)).toEqual([]);
    });

    it('debe rechazar payloads inválidos (400)', async () => {
      expect(await erroresDe({ ...payloadValido, asunto: '' })).toContain(
        'asunto',
      );
      expect(await erroresDe({ ...payloadValido, mensaje: '' })).toContain(
        'mensaje',
      );
      expect(await erroresDe({ ...payloadValido, tipo: 'OTRO' })).toContain(
        'tipo',
      );
      expect(
        await erroresDe({ ...payloadValido, id_usuario: 'no-es-uuid' }),
      ).toContain('id_usuario');
    });

    it('debe delegar en el servicio la notificación recibida', async () => {
      const dto = Object.assign(new CreateNotificacionDto(), payloadValido);
      mockService.enviarNotificacion.mockResolvedValue({
        message: 'Notificación enviada (simulada)',
        email: 'juan@test.com',
        tipo: 'INFO',
      });

      const result = await controller.enviarNotificacion(dto);

      expect(mockService.enviarNotificacion).toHaveBeenCalledWith(dto);
      expect(result).toHaveProperty('message', 'Notificación enviada (simulada)');
    });
  });
});
