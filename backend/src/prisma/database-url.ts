/**
 * Agrega `connection_limit` a la URL de Prisma si está configurado y la URL
 * todavía no lo trae. Prisma abre un pool por proceso, así que el valor debe
 * calcularse según instancias × workers + margen.
 */
export function buildDatabaseUrl(
  rawUrl: string | undefined,
  connectionLimit: string | undefined = process.env.DB_CONNECTION_LIMIT,
): string | undefined {
  if (!rawUrl || !connectionLimit) {
    return rawUrl;
  }

  const limite = Number(connectionLimit);
  if (!Number.isInteger(limite) || limite <= 0) {
    throw new Error(
      `DB_CONNECTION_LIMIT inválido: "${connectionLimit}" (debe ser un entero positivo)`,
    );
  }

  const url = new URL(rawUrl);
  if (!url.searchParams.has('connection_limit')) {
    url.searchParams.set('connection_limit', String(limite));
  }

  return url.toString();
}
