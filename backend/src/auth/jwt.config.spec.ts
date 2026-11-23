import { readFileSync } from 'fs';
import { resolve } from 'path';
import { obtenerJwtSecret, validarJwtSecret } from './jwt.config';

const SECRETO_VALIDO = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUV';
const RAIZ_REPO = resolve(__dirname, '..', '..', '..');

const PLACEHOLDERS = [
  'default-secret-change-me',
  'dev-secret-change-me',
  'your-jwt-secret-change-me',
  'CAMBIAR_POR_TOKEN_CRIPTOGRAFICO_ALEATORIO_DE_MINIMO_32_CHARS',
  'ci-placeholder-ci-placeholder-32chars',
];

describe('validarJwtSecret', () => {
  it('rechaza un secreto undefined', () => {
    expect(validarJwtSecret(undefined)).toBe('no definido');
  });

  it('rechaza un secreto vacío', () => {
    expect(validarJwtSecret('')).toBe('vacío');
    expect(validarJwtSecret('   ')).toBe('vacío');
  });

  it('rechaza un secreto corto', () => {
    expect(validarJwtSecret('corto')).toBe('menos de 32 caracteres');
  });

  it.each(PLACEHOLDERS)('rechaza el placeholder %s', (placeholder) => {
    expect(validarJwtSecret(placeholder)).not.toBeNull();
  });

  it('rechaza los placeholders sin distinguir mayúsculas', () => {
    expect(validarJwtSecret('CI-PLACEHOLDER-CI-PLACEHOLDER-32CHARS')).toBe(
      'placeholder conocido',
    );
  });

  it('rechaza el placeholder de CI', () => {
    expect(validarJwtSecret('ci-placeholder-ci-placeholder-32chars')).not.toBeNull();
  });

  it('rechaza el fallback de docker-compose.yml', () => {
    expect(validarJwtSecret('CAMBIAR_POR_SECRETO_JWT_DE_MINIMO_32_CHARS')).not.toBeNull();
  });

  it('acepta un secreto válido', () => {
    expect(validarJwtSecret(SECRETO_VALIDO)).toBeNull();
  });
});

describe('obtenerJwtSecret', () => {
  let jwtOriginal: string | undefined;

  beforeEach(() => {
    jwtOriginal = process.env.JWT_SECRET;
  });

  afterEach(() => {
    process.env.JWT_SECRET = jwtOriginal;
  });

  it('lanza ante un secreto inválido sin incluir el valor en el mensaje', () => {
    const invalido = 'CAMBIAR_POR_SECRETO_JWT_DE_MINIMO_32_CHARS';
    process.env.JWT_SECRET = invalido;

    let mensaje = '';

    try {
      obtenerJwtSecret();
    } catch (error) {
      mensaje = error instanceof Error ? error.message : String(error);
    }

    expect(mensaje).toContain('JWT_SECRET');
    expect(mensaje).toContain('inválido');
    expect(mensaje).not.toContain(invalido);
  });

  it('devuelve el secreto válido', () => {
    process.env.JWT_SECRET = SECRETO_VALIDO;

    expect(obtenerJwtSecret()).toBe(SECRETO_VALIDO);
  });
});

describe('regresión de archivos de configuración', () => {
  it('rechaza el JWT_SECRET de .env.prod.example', () => {
    const contenido = readFileSync(resolve(RAIZ_REPO, '.env.prod.example'), 'utf8');
    const valor = contenido.match(/^\s*JWT_SECRET=(.*)$/m)?.[1]?.trim();

    expect(valor).toBeDefined();
    expect(validarJwtSecret(valor)).not.toBeNull();
  });

  it('rechaza el fallback de JWT_SECRET de docker-compose.yml', () => {
    const contenido = readFileSync(resolve(RAIZ_REPO, 'docker-compose.yml'), 'utf8');
    const valor = contenido.match(
      /JWT_SECRET:\s*\$\{JWT_SECRET:-([^}]+)\}/,
    )?.[1]?.trim();

    expect(valor).toBeDefined();
    expect(validarJwtSecret(valor)).not.toBeNull();
  });
});
