const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');

const DEFAULT_TEST_DATABASE_URL =
  'postgresql://club_deportivo:club_deportivo_dev@localhost:5433/club_deportivo_test';

const TEST_DB_SUFFIX = '_test';

const SCHEMA_PATH = path.join(
  __dirname,
  '..',
  '..',
  'db',
  'esquema-final.sql',
);

function resolveTestDatabaseUrl() {
  return process.env.TEST_DATABASE_URL || DEFAULT_TEST_DATABASE_URL;
}

function databaseNameFromUrl(url) {
  const parsed = new URL(url);
  return decodeURIComponent(parsed.pathname.replace(/^\//, ''));
}

function assertTestDatabaseName(name) {
  if (!name.endsWith(TEST_DB_SUFFIX)) {
    throw new Error(
      `La base de pruebas debe terminar en "${TEST_DB_SUFFIX}" (recibida: "${name}").`,
    );
  }
}

function adminUrlFor(url) {
  const parsed = new URL(url);
  parsed.pathname = '/postgres';
  return parsed.toString();
}

function quoteIdentifier(name) {
  return `"${name.replace(/"/g, '""')}"`;
}

function connectionHint(url) {
  const parsed = new URL(url);
  return `${parsed.hostname}:${parsed.port || '5432'}`;
}

async function connect(client, url) {
  try {
    await client.connect();
  } catch (error) {
    throw new Error(
      `No se pudo conectar a PostgreSQL en ${connectionHint(url)}. ` +
        'Levantá la base con "docker compose up -d db" (puerto 5433) o ' +
        'configurá TEST_DATABASE_URL. ' +
        `Detalle: ${error.message}`,
    );
  }
}

async function prepareTestDatabase(log = () => {}) {
  const url = resolveTestDatabaseUrl();
  const dbName = databaseNameFromUrl(url);

  assertTestDatabaseName(dbName);

  if (process.env.DB_TEST_SKIP_SETUP === '1') {
    log(
      `DB_TEST_SKIP_SETUP=1: se reutiliza la base "${dbName}" sin recrearla.`,
    );
    return;
  }

  const admin = new Client({ connectionString: adminUrlFor(url) });

  await connect(admin, adminUrlFor(url));

  try {
    const quoted = quoteIdentifier(dbName);
    await admin.query(`DROP DATABASE IF EXISTS ${quoted} WITH (FORCE)`);
    await admin.query(`CREATE DATABASE ${quoted}`);
  } finally {
    await admin.end();
  }

  const testClient = new Client({ connectionString: url });

  await connect(testClient, url);

  try {
    const sql = fs.readFileSync(SCHEMA_PATH, 'utf8');
    await testClient.query(sql);
  } finally {
    await testClient.end();
  }

  log(`Base de pruebas "${dbName}" creada y esquema aplicado.`);
}

module.exports = {
  DEFAULT_TEST_DATABASE_URL,
  TEST_DB_SUFFIX,
  SCHEMA_PATH,
  resolveTestDatabaseUrl,
  databaseNameFromUrl,
  assertTestDatabaseName,
  adminUrlFor,
  prepareTestDatabase,
};
