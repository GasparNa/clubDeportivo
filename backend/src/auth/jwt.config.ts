const PLACEHOLDERS_JWT = new Set(
  [
    'default-secret-change-me',
    'dev-secret-change-me',
    'your-jwt-secret-change-me',
    'CAMBIAR_POR_TOKEN_CRIPTOGRAFICO_ALEATORIO_DE_MINIMO_32_CHARS',
    'ci-placeholder-ci-placeholder-32chars',
  ].map((placeholder) => placeholder.toLowerCase()),
);

export function validarJwtSecret(secreto: string | undefined): string | null {
  if (secreto === undefined) {
    return 'no definido';
  }

  const valor = secreto.trim();

  if (!valor) {
    return 'vacío';
  }

  if (valor.length < 32) {
    return 'menos de 32 caracteres';
  }

  const normalizado = valor.toLowerCase();

  if (PLACEHOLDERS_JWT.has(normalizado)) {
    return 'placeholder conocido';
  }

  if (normalizado.includes('change-me')) {
    return "contiene 'change-me'";
  }

  if (normalizado.includes('placeholder')) {
    return "contiene 'placeholder'";
  }

  if (normalizado.includes('cambiar_por')) {
    return "contiene 'cambiar_por'";
  }

  return null;
}

export function obtenerJwtSecret(): string {
  const secreto = process.env.JWT_SECRET;
  const motivo = validarJwtSecret(secreto);

  if (motivo) {
    throw new Error(`JWT_SECRET inválido: ${motivo}`);
  }

  return (secreto ?? '').trim();
}

export function obtenerJwtExpiration(): string {
  return process.env.JWT_EXPIRATION?.trim() || '24h';
}
