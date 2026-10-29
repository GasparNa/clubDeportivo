import { formatTime, parseDateOnly } from "./format";
import type { Reserva, ReservationStatus } from "./types";

export const ACTIVE_RESERVATION_STATUSES: ReservationStatus[] = ["CONFIRMADA", "EN_CURSO"];
export const MAX_ACTIVE_RESERVATIONS = 2;
export const CANCEL_NOTICE_HOURS = 24;

export function isActiveReservation(reserva: Reserva): boolean {
  return ACTIVE_RESERVATION_STATUSES.includes(reserva.estado);
}

export function countActiveReservations(reservas: Reserva[]): number {
  return reservas.filter(isActiveReservation).length;
}

export function reservationStart(reserva: Reserva): Date | null {
  const fecha = reserva.fecha;
  const hora = reserva.franja?.hora_inicio;
  if (!fecha || !hora) return null;
  const date = parseDateOnly(fecha.slice(0, 10));
  const [hours, minutes] = formatTime(hora).split(":").map(Number);
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return date;
}

export function canSocioCancel(
  reserva: Reserva,
  userId?: string,
): { ok: boolean; reason?: string } {
  if (userId && reserva.id_persona && reserva.id_persona !== userId) {
    return { ok: false, reason: "Solo podés cancelar tus propias reservas." };
  }
  if (reserva.estado !== "CONFIRMADA") {
    return { ok: false, reason: "Solo se pueden cancelar reservas confirmadas." };
  }
  if (reserva.origen === "MANUAL_GERENCIA") {
    return { ok: false, reason: "Las reservas de gerencia no se cancelan en autoservicio." };
  }
  const start = reservationStart(reserva);
  if (start) {
    const limit = start.getTime() - CANCEL_NOTICE_HOURS * 60 * 60 * 1000;
    if (Date.now() > limit) {
      return { ok: false, reason: "La cancelación requiere 24 h de anticipación." };
    }
  }
  return { ok: true };
}
