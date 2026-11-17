import { dateOffset, dowOf, pool } from './db';
import { Fixtures } from './fixtures';

const fixtures = new Fixtures(pool);

let created: {
  idPersona: string;
  idCancha: string;
  idFranja: string;
} | null = null;

afterEach(async () => {
  await fixtures.cleanup();
});

afterAll(async () => {
  await pool.end();
});

describe('fábricas y limpieza', () => {
  it('crea persona, usuario, cancha y franja con ids únicos', async () => {
    const idDisciplina = await fixtures.disciplina();
    const cancha = await fixtures.cancha(idDisciplina);
    const fecha = await dateOffset(7);
    const diaSemana = await dowOf(fecha);
    const idFranja = await fixtures.franja(cancha.id, diaSemana);
    const idPersona = await fixtures.usuarioActivo();

    created = { idPersona, idCancha: cancha.id, idFranja };

    const result = await pool.query(
      `SELECT
         (SELECT count(*) FROM usuarios WHERE id_usuario = $1) AS usuarios,
         (SELECT count(*) FROM canchas WHERE id_cancha = $2) AS canchas,
         (SELECT count(*) FROM franjas_horarias WHERE id_franja = $3) AS franjas`,
      [idPersona, cancha.id, idFranja],
    );

    expect(Number(result.rows[0].usuarios)).toBe(1);
    expect(Number(result.rows[0].canchas)).toBe(1);
    expect(Number(result.rows[0].franjas)).toBe(1);
  });

  it('el afterEach deja las tablas sin las filas propias', async () => {
    expect(created).not.toBeNull();

    const { idPersona, idCancha, idFranja } = created as {
      idPersona: string;
      idCancha: string;
      idFranja: string;
    };

    const result = await pool.query(
      `SELECT
         (SELECT count(*) FROM usuarios WHERE id_usuario = $1) AS usuarios,
         (SELECT count(*) FROM personas WHERE id_persona = $1) AS personas,
         (SELECT count(*) FROM canchas WHERE id_cancha = $2) AS canchas,
         (SELECT count(*) FROM franjas_horarias WHERE id_franja = $3) AS franjas`,
      [idPersona, idCancha, idFranja],
    );

    expect(Number(result.rows[0].usuarios)).toBe(0);
    expect(Number(result.rows[0].personas)).toBe(0);
    expect(Number(result.rows[0].canchas)).toBe(0);
    expect(Number(result.rows[0].franjas)).toBe(0);
  });
});
