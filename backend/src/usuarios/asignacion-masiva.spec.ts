import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validate } from 'class-validator';
import { RegisterPersonaDto, UpdatePerfilDto } from './dto/usuarios.dto';

const registroValido = {
  nombre: 'Ana',
  apellido: 'Prueba',
  dni: '12345678',
  email: 'ana@ejemplo.com',
  password: 'clave-segura',
};

async function propiedadesRechazadas(
  dto: object,
  payload: Record<string, unknown>,
): Promise<string[]> {
  const instancia = Object.assign(dto, payload);
  const errores = await validate(instancia, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  return errores.map((error) => error.property);
}

describe('regresión de asignación masiva', () => {
  describe('POST auth/register', () => {
    it('rechaza rol con whitelist y forbidNonWhitelisted', async () => {
      const rechazadas = await propiedadesRechazadas(new RegisterPersonaDto(), {
        ...registroValido,
        rol: 'ADMINISTRADOR',
      });

      expect(rechazadas).toContain('rol');
    });

    it('rechaza estado con whitelist y forbidNonWhitelisted', async () => {
      const rechazadas = await propiedadesRechazadas(new RegisterPersonaDto(), {
        ...registroValido,
        estado: 'ACTIVO',
      });

      expect(rechazadas).toContain('estado');
    });

    it('acepta un payload sin rol ni estado', async () => {
      const rechazadas = await propiedadesRechazadas(
        new RegisterPersonaDto(),
        registroValido,
      );

      expect(rechazadas).toEqual([]);
    });
  });

  describe('PUT profile', () => {
    it('rechaza rol con whitelist y forbidNonWhitelisted', async () => {
      const rechazadas = await propiedadesRechazadas(new UpdatePerfilDto(), {
        nombre: 'Ana',
        rol: 'GERENTE',
      });

      expect(rechazadas).toContain('rol');
    });

    it('rechaza estado con whitelist y forbidNonWhitelisted', async () => {
      const rechazadas = await propiedadesRechazadas(new UpdatePerfilDto(), {
        nombre: 'Ana',
        estado: 'SUSPENDIDO',
      });

      expect(rechazadas).toContain('estado');
    });

    it('acepta un payload sin rol ni estado', async () => {
      const rechazadas = await propiedadesRechazadas(new UpdatePerfilDto(), {
        nombre: 'Ana',
      });

      expect(rechazadas).toEqual([]);
    });
  });

  it('el ValidationPipe global habilita whitelist y forbidNonWhitelisted', () => {
    const main = readFileSync(resolve(__dirname, '../main.ts'), 'utf8');

    expect(main).toMatch(/whitelist:\s*true/);
    expect(main).toMatch(/forbidNonWhitelisted:\s*true/);
  });
});
