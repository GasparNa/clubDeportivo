"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { AuthenticatedLayout } from "@/components/layouts/authenticated-layout";
import { StatusBadge } from "@/components";
import { api, ApiError } from "@/lib/http-client";
import { formatDateTime, formatCurrency } from "@/lib/format";
import { normalizeAlquiler } from "@/lib/api-mappers";
import { cn } from "@/lib/cn";
import type { EquipmentReturnStatus } from "@/lib/types";

const RETURN_ACTIONS: { label: string; status: EquipmentReturnStatus; tone: string }[] = [
  { label: "✅ Devuelto", status: "DEVUELTO", tone: "bg-success text-white hover:bg-success/90" },
  { label: "⚠️ Devuelto tarde", status: "DEVUELTO_TARDE", tone: "bg-warning text-white hover:bg-warning/90" },
  { label: "❌ No devuelto", status: "NO_DEVUELTO", tone: "bg-error text-white hover:bg-error/90" },
];

export default function EquipmentReturnPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState("");

  const { data: rawAlquiler, isLoading } = useQuery<unknown>({
    queryKey: ["equipment-rentals", params.id],
    queryFn: () => api.get(`/equipment-rentals/${params.id}`),
    enabled: Boolean(params.id),
  });

  const alquiler = rawAlquiler ? normalizeAlquiler(rawAlquiler) : null;

  const returnMutation = useMutation({
    mutationFn: (estado_devolucion: EquipmentReturnStatus) =>
      api.patch(`/equipment-rentals/${params.id}/return`, { estado_devolucion }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment-rentals"] });
      router.push("/reservations/manage");
    },
    onError: (error: ApiError) => {
      setActionError(error.message || "Error al registrar la devolución.");
    },
  });

  if (isLoading) {
    return (
      <AuthenticatedLayout withSidebar>
        <div className="flex items-center justify-center py-20">
          <p className="text-text-secondary">Cargando alquiler…</p>
        </div>
      </AuthenticatedLayout>
    );
  }

  if (!alquiler) {
    return (
      <AuthenticatedLayout withSidebar>
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-text-secondary">Alquiler no encontrado.</p>
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

  const alreadyReturned = alquiler.estado_devolucion !== "PENDIENTE";

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
            <h1 className="text-xl font-bold text-text-primary">Devolución de Equipamiento</h1>
            <StatusBadge status={alquiler.estado_devolucion} />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Equipamiento
              </p>
              <p className="mt-1 text-text-primary">
                {alquiler.equipamiento?.nombre ?? "Equipamiento"}
              </p>
              {alquiler.equipamiento?.descripcion ? (
                <p className="text-xs text-text-secondary">
                  {alquiler.equipamiento.descripcion}
                </p>
              ) : null}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Cantidad
              </p>
              <p className="mt-1 text-text-primary">{alquiler.cantidad}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Precio unitario
              </p>
              <p className="mt-1 text-text-primary">
                {formatCurrency(alquiler.precio_unitario ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Subtotal
              </p>
              <p className="mt-1 text-lg font-bold text-text-primary">
                {formatCurrency(alquiler.subtotal ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Reserva asociada
              </p>
              <p className="mt-1 text-sm text-text-primary">{alquiler.id_reserva}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Fecha de alquiler
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                {formatDateTime(alquiler.creado_en || "")}
              </p>
            </div>
          </div>

          {actionError ? (
            <div className="mt-4 rounded-lg bg-error/10 px-4 py-3 text-sm text-error">
              {actionError}
            </div>
          ) : null}

          {!alreadyReturned ? (
            <div className="mt-8 space-y-3">
              <p className="text-sm font-medium text-text-primary">
                Registrar estado de devolución:
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                {RETURN_ACTIONS.map((action) => (
                  <button
                    key={action.status}
                    type="button"
                    onClick={() => returnMutation.mutate(action.status)}
                    disabled={returnMutation.isPending}
                    className={cn(
                      "flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition-colors",
                      action.tone,
                      returnMutation.isPending && "opacity-50 cursor-not-allowed",
                    )}
                  >
                    {returnMutation.isPending ? "Procesando…" : action.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-8 rounded-lg bg-surface-2 px-4 py-3 text-sm text-text-secondary">
              Este equipamiento ya fue registrado como{" "}
              <strong>
                {alquiler.estado_devolucion === "DEVUELTO"
                  ? "Devuelto"
                  : alquiler.estado_devolucion === "DEVUELTO_TARDE"
                    ? "Devuelto tarde"
                    : "No devuelto"}
              </strong>
              . El stock fue actualizado.
            </div>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}