import { assertTestDatabase, assertTestDatabaseName, pool } from './db';

describe('guardia de base de datos de pruebas', () => {
  afterAll(async () => {
    await pool.end();
  });

  it('acepta una base terminada en _test', () => {
    expect(() => assertTestDatabaseName('club_deportivo_test')).not.toThrow();
  });

  it('rechaza una base sin el sufijo _test', () => {
    expect(() => assertTestDatabaseName('club_deportivo')).toThrow(
      'La base de pruebas debe terminar en "_test"',
    );
  });

  it('confirma que la base conectada termina en _test', async () => {
    await assertTestDatabase();

    const result = await pool.query<{ nombre: string }>(
      'SELECT current_database() AS nombre',
    );

    expect(result.rows[0].nombre).toMatch(/_test$/);
  });
});
