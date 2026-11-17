import { Pool } from 'pg';

export const TEST_DB_SUFFIX = '_test';

export const DEFAULT_TEST_DATABASE_URL =
  'postgresql://club_deportivo:club_deportivo_dev@localhost:5433/club_deportivo_test';

export function resolveTestDatabaseUrl(): string {
  return process.env.TEST_DATABASE_URL ?? DEFAULT_TEST_DATABASE_URL;
}

export function databaseNameFromUrl(url: string): string {
  const parsed = new URL(url);
  return decodeURIComponent(parsed.pathname.replace(/^\//, ''));
}

export function assertTestDatabaseName(name: string): void {
  if (!name.endsWith(TEST_DB_SUFFIX)) {
    throw new Error(
      `La base de pruebas debe terminar en "${TEST_DB_SUFFIX}" (recibida: "${name}").`,
    );
  }
}

export function testDatabaseUrl(): string {
  const url = resolveTestDatabaseUrl();
  assertTestDatabaseName(databaseNameFromUrl(url));
  return url;
}

export const pool = new Pool({
  connectionString: testDatabaseUrl(),
  max: 5,
});

export async function assertTestDatabase(target: Pool = pool): Promise<void> {
  const result = await target.query<{ nombre: string }>(
    'SELECT current_database() AS nombre',
  );
  assertTestDatabaseName(result.rows[0].nombre);
}

export async function dateOffset(
  days: number,
  target: Pool = pool,
): Promise<string> {
  const result = await target.query<{ fecha: string }>(
    "SELECT to_char(CURRENT_DATE + $1::int, 'YYYY-MM-DD') AS fecha",
    [days],
  );
  return result.rows[0].fecha;
}

export async function dowOf(
  fecha: string,
  target: Pool = pool,
): Promise<number> {
  const result = await target.query<{ dow: number }>(
    'SELECT EXTRACT(DOW FROM $1::date)::int AS dow',
    [fecha],
  );
  return result.rows[0].dow;
}
