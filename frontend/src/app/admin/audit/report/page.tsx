"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/http-client";
import { todayISODate } from "@/lib/format";
import type { AuditoriaReporte } from "@/lib/types";

export default function AdminAuditReportPage() {
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  const queryParams: Record<string, string | number | undefined> = {};
  if (fechaDesde) queryParams.date_from = fechaDesde;
  if (fechaHasta) queryParams.date_to = fechaHasta;

  const { data: report, isLoading, error } = useQuery<AuditoriaReporte>({
    queryKey: ["admin-audit-report", queryParams],
    queryFn: () => api.get("/audit-logs/report", { params: queryParams }),
  });

  const limpiarFiltros = () => {
    setFechaDesde("");
    setFechaHasta("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Reporte de Auditoría</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Resumen estadístico de la actividad registrada en el sistema.
        </p>
      </div>

      {/* Filtros de fecha */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[140px]">
            <label htmlFor="fechaDesde" className="block text-xs font-medium text-text-secondary mb-1">
              Fecha desde
            </label>
            <input
              id="fechaDesde"
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="block w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="min-w-[140px]">
            <label htmlFor="fechaHasta" className="block text-xs font-medium text-text-secondary mb-1">
              Fecha hasta
            </label>
            <input
              id="fechaHasta"
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="block w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button
            onClick={limpiarFiltros}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-2"
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-text-secondary">Generando reporte…</p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-error/30 bg-error/5 p-6 text-center">
          <p className="text-error font-medium">Error al cargar el reporte</p>
          <p className="mt-1 text-sm text-text-secondary">{(error as Error).message}</p>
        </div>
      ) : report ? (
        <div className="space-y-6">
          {/* Total de eventos */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total de eventos"
              value={report.total_eventos.toLocaleString("es-AR")}
              tone="info"
            />
            <StatCard
              title="Tipos de evento"
              value={Object.keys(report.eventos_por_tipo).length.toString()}
              tone="success"
            />
            <StatCard
              title="Entidades afectadas"
              value={Object.keys(report.eventos_por_entidad).length.toString()}
              tone="warning"
            />
            <StatCard
              title="Usuarios activos"
              value={report.top_usuarios.length.toString()}
              tone="info"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Eventos por tipo */}
            <div className="rounded-xl border border-border bg-surface p-6">
              <h2 className="text-lg font-semibold text-text-primary mb-4">Eventos por Tipo</h2>
              {Object.keys(report.eventos_por_tipo).length === 0 ? (
                <p className="text-sm text-text-secondary">Sin datos disponibles.</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(report.eventos_por_tipo)
                    .sort(([, a], [, b]) => b - a)
                    .map(([tipo, cantidad]) => (
                      <BarRow
                        key={tipo}
                        label={tipo}
                        value={cantidad}
                        max={Math.max(...Object.values(report.eventos_por_tipo))}
                        tone="info"
                      />
                    ))}
                </div>
              )}
            </div>

            {/* Eventos por entidad */}
            <div className="rounded-xl border border-border bg-surface p-6">
              <h2 className="text-lg font-semibold text-text-primary mb-4">Eventos por Entidad</h2>
              {Object.keys(report.eventos_por_entidad).length === 0 ? (
                <p className="text-sm text-text-secondary">Sin datos disponibles.</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(report.eventos_por_entidad)
                    .sort(([, a], [, b]) => b - a)
                    .map(([entidad, cantidad]) => (
                      <BarRow
                        key={entidad}
                        label={entidad}
                        value={cantidad}
                        max={Math.max(...Object.values(report.eventos_por_entidad))}
                        tone="success"
                      />
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Top 20 usuarios */}
          <div className="rounded-xl border border-border bg-surface p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              Top Usuarios por Actividad
            </h2>
            {report.top_usuarios.length === 0 ? (
              <p className="text-sm text-text-secondary">Sin datos disponibles.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="py-2 text-left font-medium text-text-secondary">#</th>
                      <th className="py-2 text-left font-medium text-text-secondary">ID Usuario</th>
                      <th className="py-2 text-right font-medium text-text-secondary">Total eventos</th>
                      <th className="py-2 text-right font-medium text-text-secondary">% del total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.top_usuarios.slice(0, 20).map((u, i) => {
                      const pct =
                        report.total_eventos > 0
                          ? ((u.total / report.total_eventos) * 100).toFixed(1)
                          : "0.0";
                      return (
                        <tr key={u.id_usuario} className="border-b border-border last:border-0">
                          <td className="py-2 text-text-secondary">{i + 1}</td>
                          <td className="py-2">
                            <span className="font-mono text-xs text-text-primary">
                              {u.id_usuario.slice(0, 12)}…
                            </span>
                          </td>
                          <td className="py-2 text-right font-medium text-text-primary">
                            {u.total.toLocaleString("es-AR")}
                          </td>
                          <td className="py-2 text-right text-text-secondary">{pct}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatCard({
  title,
  value,
  tone,
}: {
  title: string;
  value: string;
  tone: "success" | "warning" | "error" | "info";
}) {
  const bgMap: Record<string, string> = {
    success: "bg-success/10",
    warning: "bg-warning/10",
    error: "bg-error/10",
    info: "bg-info/10",
  };
  const textMap: Record<string, string> = {
    success: "text-success",
    warning: "text-warning",
    error: "text-error",
    info: "text-info",
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-text-secondary">{title}</p>
      <p className={`mt-2 text-3xl font-bold ${textMap[tone]}`}>{value}</p>
    </div>
  );
}

function BarRow({
  label,
  value,
  max,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  tone: "success" | "warning" | "error" | "info";
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const bgMap: Record<string, string> = {
    success: "bg-success",
    warning: "bg-warning",
    error: "bg-error",
    info: "bg-info",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-text-primary">{label}</span>
        <span className="text-sm text-text-secondary">{value.toLocaleString("es-AR")}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-surface-2">
        <div
          className={`h-2 rounded-full ${bgMap[tone]} transition-all duration-500`}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
    </div>
  );
}