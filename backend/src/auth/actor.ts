export interface Actor {
  id_persona: string;
  rol: string;
}

export function esGerencia(actor?: { rol?: string } | null): boolean {
  return actor?.rol === 'ADMINISTRADOR' || actor?.rol === 'GERENTE';
}
