"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthenticatedLayout, StatusBadge } from "@/components";
import { useAuth, useRequireActiveUser } from "@/lib/auth-provider";
import { api } from "@/lib/http-client";
import { normalizeEquipamiento, normalizeReserva } from "@/lib/api-mappers";
import { formatCurrency } from "@/lib/format";
import type { Equipamiento, Reserva, CreateAlquilerEquipamientoRequest } from "@/lib/types";
import {
  IconChevronLeft,
  IconPackage,
  IconAlertTriangle,
  IconCheckCircle,
} from "@/components/icons";

function RentEquipmentContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const activeUser = useRequireActiveUser();
  
  // Durante build/prerender, activeUser será null
  if (activeUser === null) {
    return null;
  }
  
  const queryClient = useQueryClient();
  const id = params.id;

  const [selected, setSelected] = useState<Record<string, number>>({});

  // Obtener la reserva para saber la disciplina
  const { data: reserva, isLoading: reservaLoading } = useQuery<Reserva>({
    queryKey: ["reservation", id],
    queryFn: async () => {
      const raw = await api.get<unknown>(`/reservations/${id}`);
      return normalizeReserva(raw);
    },
    enabled: Boolean(id),
  });

  const disciplineId = reserva?.franja?.cancha?.id_disciplina;

  // Obtener equipamiento de la disciplina
  const { data: equipamientos, isLoading: equipLoading } = useQuery<Equipamiento[]>({
    queryKey: ["equipment", disciplineId],
    queryFn: async () => {
      const raw = await api.get<unknown[]>("/equipment", {
        params: { discipline_id: disciplineId },
      });
      return (raw as unknown[]).map(normalizeEquipamiento);
    },
    enabled: Boolean(disciplineId),
  });

  const disponibles = (equipamientos ?? []).filter(
    (e) => e.estado === "ACTIVO" && e.stock_disponible > 0,
  );

  const mutation = useMutation({
    mutationFn: (items: CreateAlquilerEquipamientoRequest[]) =>
      Promise.all(items.map((item) => api.post("/equipment-rentals", item))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservation", id] });
      router.push(`/reservations/${id}`);
    },
  });

  const handleQuantityChange = (equipId: string, qty: number) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (qty <= 0) {
        delete next[equipId];
      } else {
        next[equipId] = qty;
      }
      return next;
    });
  };

  const handleSubmit = () => {
    const items: CreateAlquilerEquipamientoRequest[] = Object.entries(selected)
      .filter(([, qty]) => qty > 0)
      .map(([equipId, qty]) => ({
        id_reserva: id,
        id_equipamiento: equipId,
        cantidad: qty,
      }));

    if (items.length === 0) {
      alert("Seleccioná al menos un equipamiento.");
      return;
    }

    mutation.mutate(items);
  };

  const totalItems = Object.values(selected).reduce((sum, q) => sum + q, 0);

  return (
    <AuthenticatedLayout>
      <div className="py-8 sm:py-12">
        {/* Encabezado */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-text-secondary transition-colors hover:bg-surface-2"
            aria-label="Volver"
          >
            <IconChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-text-primary sm:text-3xl">
              Alquilar Equipamiento
            </h1>
            <p className="mt-1 text-text-secondary">
              Reserva: {reserva?.franja?.cancha?.disciplina?.nombre ?? "—"} ·{" "}
              {reserva?.franja?.cancha?.nombre ?? "—"}
            </p>
          </div>
        </div>

        {/* Contenido */}
        {reservaLoading || equipLoading ? (
          <div className="mt-8 animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-surface-2" />
            ))}
          </div>
        ) : disponibles.length === 0 ? (
          <p className="mt-8 rounded-xl border border-dashed border-border bg-surface-2 px-4 py-10 text-center text-sm text-text-secondary">
            No hay equipamiento disponible para esta disciplina.
          </p>
        ) : (
          <div className="mt-8 space-y-4">
            {disponibles.map((equip) => {
              const qty = selected[equip.id] || 0;
              return (
                <div
                  key={equip.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface p-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <IconPackage className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-semibold text-text-primary">{equip.nombre}</p>
                      {equip.descripcion && (
                        <p className="text-xs text-text-secondary">{equip.descripcion}</p>
                      )}
                      <p className="mt-1 text-xs text-text-secondary">
                        Stock: {equip.stock_disponible} ·{" "}
                        {equip.precio_alquiler ? formatCurrency(equip.precio_alquiler) : "Sin costo"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(equip.id, qty - 1)}
                      disabled={qty <= 0}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-secondary transition-colors hover:bg-surface-2 disabled:opacity-30"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm font-semibold text-text-primary">
                      {qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(equip.id, qty + 1)}
                      disabled={qty >= equip.stock_disponible}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-secondary transition-colors hover:bg-surface-2 disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Error */}
        {mutation.isError && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
            <IconAlertTriangle className="h-4 w-4 shrink-0" />
            {(mutation.error as Error)?.message || "Error al alquilar equipamiento."}
          </div>
        )}

        {/* Acciones */}
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-2"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={totalItems === 0 || mutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            <IconCheckCircle className="h-4 w-4" />
            {mutation.isPending
              ? "Alquilando…"
              : `Alquilar ${totalItems > 0 ? `(${totalItems})` : ""}`}
          </button>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}

export default function RentEquipmentPage() {
  try {
    return <RentEquipmentContent />;
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
                Para alquilar equipamiento, necesitas tener una cuenta activa.
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