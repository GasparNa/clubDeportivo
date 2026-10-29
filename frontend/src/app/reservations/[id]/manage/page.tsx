"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { AuthenticatedLayout } from "@/components/layouts/authenticated-layout";
import { StatusBadge } from "@/components";
import { api, ApiError } from "@/lib/http-client";
import { formatDate, formatCurrency, formatDateTime } from "@/lib/format";
import { normalizeReserva } from "@/lib/api-mappers";
import { cn } from "@/lib/cn";
import type { ReservationStatus } from "@/lib/types";

const STATUS_ACTIONS: Record<string, { label: string; nextStatus: ReservationStatus; tone: string }[]> = {
  CONFIRMADA: [
    { label: "Check-in", nextStatus: "EN_CURSO", tone: "bg-info text-white hover:bg-info/90" },
    { label: "Cancelar", nextStatus: "CANCELADA", tone: "bg-error text-white hover:bg-error/90" },
  ],
  EN_CURSO: [
    { label: "Completar", nextStatus: "COMPLETADA", tone: "bg-success text-white hover:bg-success/90" },
    { label: "Cancelar", nextStatus: "CANCELADA", tone: "bg-error text-white hover:bg-error/90" },
  ],
};

export default function ReservationManagePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState("");

  const { data: rawReservation, isLoading } = useQuery<unknown>({
    queryKey: ["reservations", params.id],
    queryFn: () => api.get(`/reservations/${params.id}`),
    enabled: Boolean(params.id),
  });

  const reservation = rawReservation ? normalizeReserva(rawReservation) : null;

  const statusMutation = useMutation({
    mutationFn: (estado: ReservationStatus) =>
      api.patch(`/reservations/${params.id}/status`, { estado }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      router.push("/reservations/manage");
    },
    onError: (error: ApiError) => {
      setActionError(error.message || "Error al cambiar el estado de la reserva.");
    },
  });

  if (isLoading) {
    return (
      <AuthenticatedLayout withSidebar>
        <div className="flex items-center justify-center py-20">
          <p className="text-text-secondary">Cargando reserva…</p>
        </div>
      </AuthenticatedLayout>
    );
  }

  if (!reservation) {
    return (
      <AuthenticatedLayout withSidebar>
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-text-secondary">Reserva no encontrada.</p>
          <button
            type="button"
            onClick={() => router.push("/reservations/manage")}
            className="mt-4 text-sm font-medium text-primary hover:underline"
          >
            Volver a gestión de reservas
          </button>
        </div>
      </AuthenticatedLayout>
    );
  }

  const actions = STATUS_ACTIONS[reservation.estado] ?? [];

  return (
    <AuthenticatedLayout withSidebar>
      <div className="mx-auto max-w-2xl space-y-6">
        <button
          type="button"
          onClick={() => router.push("/reservations/manage")}
          className="text-sm font-medium text-primary hover:underline"
        >
          ← Volver a gestión de reservas
        </button>

        <div className="rounded-2xl border border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-text-primary">Control de Reserva</h1>
            <StatusBadge status={reservation.estado} />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Persona
              </p>
              <p className="mt-1 text-text-primary">
                {reservation.persona?.nombre} {reservation.persona?.apellido}
              </p>
              <p className="text-xs text-text-secondary">DNI: {reservation.persona?.dni}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Fecha
              </p>
              <p className="mt-1 text-text-primary">{formatDate(reservation.fecha)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Disciplina
              </p>
              <p className="mt-1 text-text-primary">
                {reservation.franja?.cancha?.disciplina?.nombre ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Cancha
              </p>
              <p className="mt-1 text-text-primary">
                {reservation.franja?.cancha?.nombre ?? "—"}
                {reservation.franja?.cancha?.superficie
                  ? ` (${reservation.franja.cancha.superficie})`
                  : ""}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Horario
              </p>
              <p className="mt-1 text-text-primary">
                {reservation.franja
                  ? `${reservation.franja.hora_inicio} – ${reservation.franja.hora_fin}`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Origen
              </p>
              <p className="mt-1">
                <StatusBadge status={reservation.origen} />
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Monto total
              </p>
              <p className="mt-1 text-lg font-bold text-text-primary">
                {formatCurrency(reservation.monto_total ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Creada
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                {formatDateTime(reservation.creado_en || "")}
              </p>
            </div>
          </div>

          {/* Equipamiento alquilado */}
          {reservation.alquileres && reservation.alquileres.length > 0 ? (
            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Equipamiento alquilado
              </p>
              <ul className="mt-2 space-y-2">
                {reservation.alquileres.map((alq) => (
                  <li
                    key={alq.id}
                    className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2 text-sm"
                  >
                    <div>
                      <span className="font-medium text-text-primary">
                        {alq.equipamiento?.nombre ?? "Equipamiento"}
                      </span>
                      <span className="ml-2 text-text-secondary">
                        ×{alq.cantidad}
                      </span>
                    </div>
                    <StatusBadge status={alq.estado_devolucion} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Pagos */}
          {reservation.pagos && reservation.pagos.length > 0 ? (
            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Pagos registrados
              </p>
              <ul className="mt-2 space-y-2">
                {reservation.pagos.map((pago) => (
                  <li
                    key={pago.id}
                    className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2 text-sm"
                  >
                    <div>
                      <span className="font-medium text-text-primary">
                        {formatCurrency(pago.monto)}
                      </span>
                      <span className="ml-2 text-text-secondary">
                        {formatDateTime(pago.creado_en || "")}
                      </span>
                    </div>
                    <StatusBadge status={pago.estado} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {actionError ? (
            <div className="mt-4 rounded-lg bg-error/10 px-4 py-3 text-sm text-error">
              {actionError}
            </div>
          ) : null}

          {actions.length > 0 ? (
            <div className="mt-8 flex gap-3">
              {actions.map((action) => (
                <button
                  key={action.nextStatus}
                  type="button"
                  onClick={() => statusMutation.mutate(action.nextStatus)}
                  disabled={statusMutation.isPending}
                  className={cn(
                    "flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition-colors",
                    action.tone,
                    statusMutation.isPending && "opacity-50 cursor-not-allowed",
                  )}
                >
                  {statusMutation.isPending ? "Procesando…" : action.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-lg bg-surface-2 px-4 py-3 text-sm text-text-secondary">
              {reservation.estado === "COMPLETADA"
                ? "Esta reserva ya fue completada."
                : reservation.estado === "CANCELADA"
                  ? "Esta reserva fue cancelada."
                  : "No hay acciones disponibles para esta reserva."}
            </div>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}