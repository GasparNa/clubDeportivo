import { api } from "@/lib/http-client";

/**
 * Limpia las reservas de prueba creadas durante los tests.
 * Ejecuta una petición DELETE a cada reserva ID proporcionada.
 * Si alguna falla, continúa con las demás (no falla todo el cleanup).
 *
 * @param token JWT token del socio autenticado
 * @param reservaIds IDs de las reservas a eliminar
 */
export async function cleanupReservas(
  token: string,
  reservaIds: string[]
): Promise<{ success: string[]; failed: string[] }> {
  const success: string[] = [];
  const failed: string[] = [];

  for (const id of reservaIds) {
    try {
      await api.delete(`/reservations/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      success.push(id);
    } catch {
      failed.push(id);
    }
  }

  return { success, failed };
}

/**
 * Limpia todo el data de test eliminando reservas y cerrando sesión.
 * Esta función está diseñada para ser idempotente - se puede llamar múltiples veces.
 */
export async function cleanupTestData(
  token: string,
  reservaIds: string[] = []
): Promise<{
  deletedReservas: string[];
  errors: string[];
}> {
  const results = { deletedReservas: [] as string[], errors: [] as string[] };

  // Eliminar reservas de prueba si existen
  if (reservaIds.length > 0) {
    const cleanup = await cleanupReservas(token, reservaIds);
    results.deletedReservas = [...results.deletedReservas, ...cleanup.success];
    if (cleanup.failed.length > 0) {
      results.errors.push(
        `${cleanup.failed.length} reservas no pudieron eliminarse`
      );
    }
  }

  return results;
}