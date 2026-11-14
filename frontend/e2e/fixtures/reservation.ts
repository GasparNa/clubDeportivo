import { api } from "@/lib/http-client";
import { FranjaHoraria, Reserva } from "@/lib/types";

export interface CreateReservationFixture {
  reserva: Reserva;
  franja: FranjaHoraria;
}

interface CreateReservationRequest {
  id_franja: string;
  fecha: string;
  id_persona: string;
  origen: string;
  id_cancha?: string;
}

/**
 * Calcula una fecha de reserva con más de 24 horas de anticipación.
 * Los triggers del backend validan que la cancelación AUTOGESTIONADA
 * requiere 1 día (24h) de anticipación, y la reserva debe ser en una
 * franja horaria válida para la cancha y disciplina.
 *
 * @param daysOffset Número de días a partir de hoy (debe ser >= 1 para >24h)
 * @returns Fecha en formato ISO string (YYYY-MM-DD)
 */
export function reservationDateOffset(daysOffset: number = 1): string {
  const today = new Date();
  const date = new Date(today);
  date.setDate(today.getDate() + daysOffset);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Calcula una hora de franja que está más de 24 horas desde ahora.
 * Usada para asegurar que la reserva elegida cumpla el notice period
 * para cancelación AUTOGESTIONADA.
 */
export function futureTimeSlotAfterMidnight(): { hora_inicio: string; hora_fin: string } {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const targetHour = hour >= 23 ? 10 : hour + 2; // asegurar >24h difference
  const start = `${String(targetHour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  const endHour = targetHour + 1;
  const end = `${String(endHour % 24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  return { hora_inicio: start, hora_fin: end };
}

/**
 * Crea una reserva mediante la API.
 * El origen por defecto es "AUTOGESTIONADA" ya que este es el escenario
 * de autoservicio para socio.
 *
 * @param token JWT token del socio autenticado
 * @param idFranja ID de la franja horaria seleccionada
 * @param fecha Fecha de la reserva en YYYY-MM-DD (debe ser > 24h para tests de cancelación)
 * @param idPersona ID de la persona/usuario que reserva
 * @param idCancha ID de la cancha (opcional, se obtendrá de las disciplinas si no provisto)
 */
export async function createReservation(
  token: string,
  idFranja: string,
  fecha: string,
  idPersona: string,
  idCancha?: string
): Promise<CreateReservationFixture> {
  const body: CreateReservationRequest = {
    id_franja: idFranja,
    fecha,
    id_persona: idPersona,
    origen: "AUTOGESTIONADA",
  };

  if (idCancha) {
    body.id_cancha = idCancha;
  }

  const response = await api.post<{
    reserva: Reserva;
    franja: FranjaHoraria;
  }>("/reservations", body, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.reserva) {
    throw new Error("No se recibió la reserva creada en la respuesta.");
  }

  return {
    reserva: response.reserva,
    franja: response.franja,
  };
}

/**
 * Obtiene las franjas horarias disponibles para una cancha y fecha determinadas.
 */
export async function getAvailableSlots(
  token: string,
  idCancha: string,
  fecha: string
): Promise<{ id_franja: string; hora_inicio: string; hora_fin: string }[]> {
  const response = await api.get<{
    id_franja: string;
    hora_inicio: string;
    hora_fin: string;
    disponible: boolean;
  }[]>("/time-slots/availability", {
    params: { court_id: idCancha, date: fecha },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response
    .filter((s) => s.disponible)
    .map((s) => ({
      id_franja: s.id_franja,
      hora_inicio: s.hora_inicio,
      hora_fin: s.hora_fin,
    }));
}

/**
 * Obtiene las disciplinas disponibles via API.
 */
export async function getDisciplines(token: string): Promise<
  { id: string; nombre: string; estado: string }[]
> {
  const response = await api.get<{ id: string; nombre: string; estado: string }[]>(
    "/disciplines",
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response;
}

/**
 * Obtiene las canchas de una disciplina determinada.
 */
export async function getCourchesByDiscipline(
  token: string,
  idDisciplina: string
): Promise<
  { id: string; nombre: string; superficie?: string; precio_base: number; estado: string }[]
> {
  const response = await api.get<{
    id: string;
    nombre: string;
    superficie?: string;
    precio_base: number;
    estado: string;
  }[]>("/courts", {
    params: { discipline_id: idDisciplina },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.filter((c) => c.estado !== "INACTIVO");
}