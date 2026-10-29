import { buildDatabaseUrl } from './database-url';

describe('buildDatabaseUrl', () => {
  const base =
    'postgresql://user:pass@localhost:5433/club_deportivo?schema=public';

  it('devuelve la URL original si no hay límite configurado', () => {
    expect(buildDatabaseUrl(base, undefined)).toBe(base);
  });

  it('devuelve undefined si no hay URL', () => {
    expect(buildDatabaseUrl(undefined, '5')).toBeUndefined();
  });

  it('agrega connection_limit preservando el resto de los parámetros', () => {
    const result = buildDatabaseUrl(base, '5');
    const url = new URL(result!);

    expect(url.searchParams.get('schema')).toBe('public');
    expect(url.searchParams.get('connection_limit')).toBe('5');
  });

  it('respeta un connection_limit ya presente en la URL', () => {
    const conLimite = `${base}&connection_limit=9`;
    const url = new URL(buildDatabaseUrl(conLimite, '5')!);

    expect(url.searchParams.get('connection_limit')).toBe('9');
  });

  it('rechaza un límite inválido', () => {
    expect(() => buildDatabaseUrl(base, '0')).toThrow(
      'DB_CONNECTION_LIMIT inválido',
    );
  });
});
