"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AuthenticatedLayout, StatusBadge } from "@/components";
import { useAuth } from "@/lib/auth-provider";
import { api } from "@/lib/http-client";
import { normalizePago } from "@/lib/api-mappers";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { Pago } from "@/lib/types";
import { IconDollarSign, IconFilter } from "@/components/icons";

type FilterStatus = "ALL" | "COMPLETADO" | "PENDIENTE" | "FALLIDO" | "REEMBOLSADO";

const FILTER_OPTIONS: { value: FilterStatus; label: string }[] = [
  { value: "ALL", label: "Todos" },
  { value: "COMPLETADO", label: "Completados" },
  { value: "PENDIENTE", label: "Pendientes" },
  { value: "FALLIDO", label: "Fallidos" },
  { value: "REEMBOLSADO", label: "Reembolsados" },
];

export default function MyPaymentsPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<FilterStatus>("ALL");

  const { data: pagos, isLoading } = useQuery<Pago[]>({
    queryKey: ["my-payments", user?.id],
    queryFn: async () => {
      const raw = await api.get<unknown[]>("/payments", {
        params: { person_id: user?.id },
      });
      return (raw as unknown[]).map(normalizePago);
    },
    enabled: Boolean(user?.id),
  });

  const filtered =
    filter === "ALL"
      ? pagos ?? []
      : (pagos ?? []).filter((p) => p.estado === filter);

  const totalCompletado = (pagos ?? [])
    .filter((p) => p.estado === "COMPLETADO")
    .reduce((sum, p) => sum + p.monto, 0);

  const totalPendiente = (pagos ?? [])
    .filter((p) => p.estado === "PENDIENTE")
    .reduce((sum, p) => sum + p.monto, 0);

  return (
    <AuthenticatedLayout>
      <div className="py-8 sm:py-12">
        {/* Encabezado */}
        <div>
          <h1 className="text-2xl font-semibold text-text-primary sm:text-3xl">
            Mis Pagos
          </h1>
          <p className="mt-2 text-text-secondary">
            Historial de pagos realizados y pendientes.
          </p>
        </div>

        {/* Resumen */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-surface p-4">
            <p className="text-xs font-medium text-text-secondary">Total pagado</p>
            <p className="mt-1 text-2xl font-bold text-success">
              {formatCurrency(totalCompletado)}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-4">
            <p className="text-xs font-medium text-text-secondary">Total pendiente</p>
            <p className="mt-1 text-2xl font-bold text-warning">
              {formatCurrency(totalPendiente)}
            </p>
          </div>
        </div>

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
          <div className="mt-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse h-16 rounded-xl bg-surface-2" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="mt-8 rounded-xl border border-dashed border-border bg-surface-2 px-4 py-10 text-center text-sm text-text-secondary">
            {filter === "ALL"
              ? "No tenés pagos registrados."
              : `No tenés pagos con estado "${FILTER_OPTIONS.find((o) => o.value === filter)?.label}".`}
          </p>
        ) : (
          <div className="mt-6 divide-y divide-border rounded-2xl border border-border bg-surface">
            {filtered.map((pago) => (
              <div
                key={pago.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <IconDollarSign className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">
                      {formatCurrency(pago.monto)}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {pago.metodo_pago ? `${pago.metodo_pago} · ` : ""}
                      {formatDateTime(pago.creado_en)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={pago.estado} />
                  {pago.id_reserva && (
                    <Link
                      href={`/reservations/${pago.id_reserva}`}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Ver reserva
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}