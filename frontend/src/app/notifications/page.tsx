"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AuthenticatedLayout, StatusBadge } from "@/components";
import { useAuth } from "@/lib/auth-provider";
import { api } from "@/lib/http-client";
import { formatDateTime } from "@/lib/format";
import { IconBell, IconFilter, IconInfo } from "@/components/icons";

interface Notificacion {
  id: string;
  titulo: string;
  mensaje: string;
  tipo: "INFO" | "WARNING" | "ERROR" | "SUCCESS";
  leida: boolean;
  creado_en: string;
}

type FilterType = "ALL" | "INFO" | "WARNING" | "ERROR" | "SUCCESS" | "UNREAD";

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: "ALL", label: "Todas" },
  { value: "UNREAD", label: "No leídas" },
  { value: "INFO", label: "Info" },
  { value: "WARNING", label: "Avisos" },
  { value: "ERROR", label: "Errores" },
  { value: "SUCCESS", label: "Éxito" },
];

const TIPO_TONE: Record<string, "info" | "warning" | "error" | "success"> = {
  INFO: "info",
  WARNING: "warning",
  ERROR: "error",
  SUCCESS: "success",
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<FilterType>("ALL");

  const { data: notificaciones, isLoading } = useQuery<Notificacion[]>({
    queryKey: ["notifications", user?.id],
    queryFn: () => api.get<Notificacion[]>("/notifications"),
    enabled: Boolean(user?.id),
  });

  const filtered =
    filter === "ALL"
      ? notificaciones ?? []
      : filter === "UNREAD"
        ? (notificaciones ?? []).filter((n) => !n.leida)
        : (notificaciones ?? []).filter((n) => n.tipo === filter);

  const unreadCount = (notificaciones ?? []).filter((n) => !n.leida).length;

  return (
    <AuthenticatedLayout>
      <div className="py-8 sm:py-12">
        {/* Encabezado */}
        <div>
          <h1 className="text-2xl font-semibold text-text-primary sm:text-3xl">
            Notificaciones
          </h1>
          <p className="mt-2 text-text-secondary">
            {unreadCount > 0
              ? `Tenés ${unreadCount} notificación${unreadCount === 1 ? "" : "es"} sin leer.`
              : "No tenés notificaciones pendientes."}
          </p>
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
              {opt.value === "UNREAD" && unreadCount > 0 && (
                <span className="ml-1 text-primary">{unreadCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* Listado */}
        {isLoading ? (
          <div className="mt-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse h-20 rounded-xl bg-surface-2" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="mt-8 rounded-xl border border-dashed border-border bg-surface-2 px-4 py-10 text-center text-sm text-text-secondary">
            {filter === "ALL"
              ? "No tenés notificaciones."
              : `No tenés notificaciones de tipo "${FILTER_OPTIONS.find((o) => o.value === filter)?.label}".`}
          </p>
        ) : (
          <div className="mt-6 divide-y divide-border rounded-2xl border border-border bg-surface">
            {filtered.map((notif) => (
              <div
                key={notif.id}
                className={`flex items-start gap-4 px-5 py-4 transition-colors ${
                  !notif.leida ? "bg-primary/5" : ""
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    notif.tipo === "ERROR"
                      ? "bg-error/10 text-error"
                      : notif.tipo === "WARNING"
                        ? "bg-warning/10 text-warning"
                        : notif.tipo === "SUCCESS"
                          ? "bg-success/10 text-success"
                          : "bg-info/10 text-info"
                  }`}
                >
                  <IconBell className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-text-primary">
                      {notif.titulo}
                      {!notif.leida && (
                        <span className="ml-2 inline-block h-2 w-2 rounded-full bg-primary" />
                      )}
                    </p>
                    <StatusBadge
                      status={notif.tipo}
                      tone={TIPO_TONE[notif.tipo] ?? "info"}
                    />
                  </div>
                  <p className="mt-1 text-sm text-text-secondary">{notif.mensaje}</p>
                  <p className="mt-2 text-xs text-text-secondary">
                    {formatDateTime(notif.creado_en)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}