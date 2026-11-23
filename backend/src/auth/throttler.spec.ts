import { Reflector } from '@nestjs/core';
import {
  ThrottlerGuard,
  ThrottlerStorageService,
} from '@nestjs/throttler';
import {
  THROTTLER_LIMIT,
  THROTTLER_TTL,
} from '@nestjs/throttler/dist/throttler.constants';
import { HealthController } from '../health/health.controller';
import { UsuariosController } from '../usuarios/usuarios.controller';
import { configuracionThrottle } from './throttle.config';

const GUARDS_METADATA = '__guards__';
const IP = '203.0.113.10';

function contexto(metodo: 'login' | 'register', ip = IP): any {
  const solicitud = { ip, headers: {}, header: jest.fn() };
  const respuesta = { header: jest.fn() };

  return {
    getHandler: () => UsuariosController.prototype[metodo],
    getClass: () => UsuariosController,
    switchToHttp: () => ({
      getRequest: () => solicitud,
      getResponse: () => respuesta,
    }),
  };
}

describe('ThrottlerGuard en endpoints de autenticación', () => {
  let storage: ThrottlerStorageService;
  let guard: ThrottlerGuard;
  let limite: number;

  beforeEach(async () => {
    const configuracion = configuracionThrottle();
    limite = configuracion.limit;
    storage = new ThrottlerStorageService();
    guard = new ThrottlerGuard([configuracion], storage, new Reflector());
    await guard.onModuleInit();
  });

  afterEach(() => storage.onApplicationShutdown());

  it('permite una solicitud menos que el límite configurado', async () => {
    for (let intento = 0; intento < limite - 1; intento++) {
      await expect(guard.canActivate(contexto('login'))).resolves.toBe(true);
    }
  });

  it('responde 429 al superar el límite configurado de login', async () => {
    for (let intento = 0; intento < limite; intento++) {
      await expect(guard.canActivate(contexto('login'))).resolves.toBe(true);
    }

    await expect(guard.canActivate(contexto('login'))).rejects.toMatchObject({
      status: 429,
    });
  });

  it('responde 429 al superar el límite configurado de register', async () => {
    for (let intento = 0; intento < limite; intento++) {
      await expect(guard.canActivate(contexto('register'))).resolves.toBe(true);
    }

    await expect(guard.canActivate(contexto('register'))).rejects.toMatchObject({
      status: 429,
    });
  });

  it('mantiene contadores separados por IP del cliente', async () => {
    for (let intento = 0; intento < limite; intento++) {
      await expect(guard.canActivate(contexto('login', IP))).resolves.toBe(true);
    }

    await expect(
      guard.canActivate(contexto('login', '203.0.113.20')),
    ).resolves.toBe(true);

    await expect(guard.canActivate(contexto('login', IP))).rejects.toMatchObject({
      status: 429,
    });
    await expect(
      guard.canActivate(contexto('login', '203.0.113.20')),
    ).resolves.toBe(true);
  });

  it('solo register y login llevan ThrottlerGuard y metadata de límite', () => {
    for (const metodo of ['register', 'login'] as const) {
      const handler = UsuariosController.prototype[metodo];
      const guards = Reflect.getMetadata(GUARDS_METADATA, handler) || [];
      const claves = Reflect.getMetadataKeys(handler);

      expect(guards).toContain(ThrottlerGuard);
      expect(
        claves.some((clave) => String(clave).startsWith('THROTTLER:')),
      ).toBe(true);
    }
  });

  it('la metadata real del @Throttle coincide con configuracionThrottle()', () => {
    const { ttl, limit } = configuracionThrottle();

    for (const metodo of ['register', 'login'] as const) {
      const handler = UsuariosController.prototype[metodo];

      expect(Reflect.getMetadata(THROTTLER_LIMIT + 'default', handler)).toBe(
        limit,
      );
      expect(Reflect.getMetadata(THROTTLER_TTL + 'default', handler)).toBe(ttl);
    }
  });

  it('/health no lleva ThrottlerGuard ni metadata de limitación', () => {
    const guards =
      Reflect.getMetadata(GUARDS_METADATA, HealthController.prototype.check) ||
      [];
    const claves = Reflect.getMetadataKeys(HealthController.prototype.check);

    expect(guards).not.toContain(ThrottlerGuard);
    expect(
      claves.some((clave) => String(clave).startsWith('THROTTLER:')),
    ).toBe(false);
  });
});
