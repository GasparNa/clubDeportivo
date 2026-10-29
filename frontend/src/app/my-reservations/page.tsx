"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthenticatedLayout, ReservationCard, StatusBadge } from "@/components";
import { useAuth, useRequireActiveUser } from "@/lib/auth-provider";
import { api } from "@/lib/http-client";
import { normalizeReserva } from "@/lib/api-mappers";
import { canSocioCancel, countActiveReservations, MAX_ACTIVE_RESERVATIONS } from "@/lib/reservation-rules";
import type { Reserva } from "@/lib/types";
import { IconPlus, IconFilter, IconAlertTriangle } from "@/components/icons";

type FilterStatus = "ALL" | "CONFIRMADA" | "EN_CURSO" | "COMPLETADA" | "CANCELADA";

const FILTER_OPTIONS: { value: FilterStatus; label: string }[] = [
  { value: "ALL", label: "Todas" },
  { value: "CONFIRMADA", label: "Confirmadas" },
  { value: "EN_CURSO", label: "En curso" },
  { value: "COMPLETADA", label: "Completadas" },
  { value: "CANCELADA", label: "Canceladas" },
];

function MyReservationsContent() {
  const { user } = useAuth();
  const activeUser = useRequireActiveUser();
  
  // Durante build/prerender, activeUser será null
  if (activeUser === null) {
    return null;
  }
  
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterStatus>("ALL");

  const { data: reservas, isLoading } = useQuery<Reserva[]>({
    queryKey: ["my-reservations", user?.id],
    queryFn: async () => {
      const raw = await api.get<unknown[]>("/reservations", {
        params: { person_id: user?.id },
      });
      return (raw as unknown[]).map(normalizeReserva);
    },
    enabled: Boolean(user?.id),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) =>
      api.patch<Reserva>(`/reservations/${id}`, { estado: "CANCELADA" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-reservations"] });
    },
  });

  const handleCancel = (reserva: Reserva) => {
    const { ok, reason } = canSocioCancel(reserva, user?.id);
    if (!ok) {
      alert(reason);
      return;
    }
    if (confirm("¿Estás seguro de que querés cancelar esta reserva?")) {
      cancelMutation.mutate(reserva.id);
    }
  };

  const filtered =
    filter === "ALL"
      ? reservas ?? []
      : (reservas ?? []).filter((r) => r.estado === filter);

  const activeCount = countActiveReservations(reservas ?? []);
  const canCreate = activeCount < MAX_ACTIVE_RESERVATIONS;

  return (
    <AuthenticatedLayout>
      <div className="py-8 sm:py-12">
        {/* Encabezado */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary sm:text-3xl">
              Mis Reservas
            </h1>
            <p className="mt-2 text-text-secondary">
              {activeCount} de {MAX_ACTIVE_RESERVATIONS} reservas activas.
            </p>
          </div>
          <Link
            href="/reservations/new"
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-surface transition-colors ${
              canCreate
                ? "bg-primary hover:bg-primary-hover"
                : "cursor-not-allowed bg-text-secondary opacity-50"
            }`}
            {...(canCreate ? {} : { onClick: (e: React.MouseEvent) => e.preventDefault() })}
          >
            <IconPlus className="h-4 w-4" />
            Nueva reserva
          </Link>
        </div>

        {/* Alerta si no puede crear más */}
        {!canCreate && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
            <IconAlertTriangle className="h-4 w-4 shrink-0" />
            Ya tenés {MAX_ACTIVE_RESERVATIONS} reservas activas. Cancelá una para crear una nueva.
          </div>
        )}

        {/* Filtros */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <IconFilter className="h-4 w-4 text-text-secondary" />
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFilter(opt.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filter === opt.value
                  ? "bg-primary text-surface"
                  : "border border-border bg-surface text-text-secondary hover:bg-surface-2"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Listado */}
        {isLoading ? (
          <div className="mt-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse h-40 rounded-2xl bg-surface-2" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="mt-8 rounded-xl border border-dashed border-border bg-surface-2 px-4 py-10 text-center text-sm text-text-secondary">
            {filter === "ALL"
              ? "No tenés reservas todavía."
              : `No tenés reservas con estado "${FILTER_OPTIONS.find((o) => o.value === filter)?.label}".`}
          </p>
        ) : (
          <div className="mt-6 space-y-4">
            {filtered.map((reserva) => (
              <ReservationCard
                key={reserva.id}
                reserva={reserva}
                href={`/reservations/${reserva.id}`}
                actions={
                  reserva.estado === "CONFIRMADA" && reserva.origen === "AUTOGESTIONADA" ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        handleCancel(reserva);
                      }}
                      disabled={cancelMutation.isPending}
                      className="rounded-lg border border-error/30 px-3 py-1.5 text-xs font-medium text-error transition-colors hover:bg-error/10 disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                  ) : undefined
                }
              />
            ))}
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}

export default function MyReservationsPage() {
  try {
    return <MyReservationsContent />;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "NOT_AUTHENTICATED") {
        return (
          <AuthenticatedLayout>
            <div className="py-8 sm:py-12 text-center">
              <IconAlertTriangle className="h-12 w-12 mx-auto text-warning" />
              <h2 className="mt-4 text-xl font-semibold text-text-primary">
                Debes iniciar sesión
              </h2>
              <p className="mt-2 text-text-secondary">
                Para ver tus reservas, necesitas tener una cuenta activa.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <a
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
                >
                  Iniciar sesión
                </a>
                <a
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:bg-surface-2"
                >
                  Registrarse
                </a>
              </div>
            </div>
          </AuthenticatedLayout>
        );
      }
      if (error.message === "USER_NOT_ACTIVE") {
        return (
          <AuthenticatedLayout>
            <div className="py-8 sm:py-12 text-center">
              <IconAlertTriangle className="h-12 w-12 mx-auto text-warning" />
              <h2 className="mt-4 text-xl font-semibold text-text-primary">
                Cuenta no activa
              </h2>
              <p className="mt-2 text-text-secondary">
                Tu cuenta no está activa. Contactá a gerencia para activarla.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <a
                  href="/profile"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
                >
                  Ver mi perfil
                </a>
              </div>
            </div>
          </AuthenticatedLayout>
        );
      }
    }
    throw error;
  }
}