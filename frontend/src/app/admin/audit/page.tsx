"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { DataTable, type DataTableColumn, type DataTableFilter } from "@/components";
import { api } from "@/lib/http-client";
import { formatDateTime, todayISODate } from "@/lib/format";
import type { RegistroAuditoria } from "@/lib/types";

export default function AdminAuditPage() {
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [idUsuario, setIdUsuario] = useState("");
  const [entidad, setEntidad] = useState("");
  const [evento, setEvento] = useState("");

  const queryParams: Record<string, string | number | undefined> = {};
  if (fechaDesde) queryParams.fecha_desde = fechaDesde;
  if (fechaHasta) queryParams.fecha_hasta = fechaHasta;
  if (idUsuario) queryParams.id_usuario = idUsuario;
  if (entidad) queryParams.entidad = entidad;
  if (evento) queryParams.evento = evento;

  const { data: logs = [], isLoading } = useQuery<RegistroAuditoria[]>({
    queryKey: ["admin-audit-logs", queryParams],
    queryFn: () => api.get("/audit-logs", { params: queryParams }),
  });

  const columns: DataTableColumn<RegistroAuditoria>[] = [
    {
      id: "creado_en",
      header: "Fecha",
      cell: (row) => (
        <span className="text-sm whitespace-nowrap">{formatDateTime(row.creado_en)}</span>
      ),
      sortAccessor: (row) => row.creado_en,
    },
    {
      id: "id_usuario",
      header: "Usuario",
      cell: (row) => (
        <span className="text-sm font-mono text-text-secondary">
          {row.id_usuario ? row.id_usuario.slice(0, 8) + "…" : "Sistema"}
        </span>
      ),
      sortAccessor: (row) => row.id_usuario || "",
    },
    {
      id: "evento",
      header: "Evento",
      cell: (row) => (
        <span className="inline-flex items-center rounded-full bg-info/10 px-2 py-0.5 text-xs font-medium text-info">
          {row.evento}
        </span>
      ),
      sortAccessor: (row) => row.evento,
    },
    {
      id: "entidad",
      header: "Entidad",
      cell: (row) => (
        <span className="text-sm font-medium text-text-primary">{row.entidad}</span>
      ),
      sortAccessor: (row) => row.entidad,
    },
    {
      id: "id_entidad",
      header: "ID Entidad",
      cell: (row) => (
        <span className="text-xs font-mono text-text-secondary">
          {row.id_entidad ? row.id_entidad.slice(0, 8) + "…" : "—"}
        </span>
      ),
      sortAccessor: (row) => row.id_entidad || "",
    },
    {
      id: "detalle",
      header: "Detalle",
      cell: (row) => (
        <span className="text-sm text-text-secondary line-clamp-2 max-w-xs">
          {row.detalle || "—"}
        </span>
      ),
    },
  ];

  const filters: DataTableFilter<RegistroAuditoria>[] = [
    {
      id: "evento",
      label: "Evento",
      options: Array.from(new Set(logs.map((l) => l.evento).filter(Boolean))).map((e) => ({
        value: e,
        label: e,
      })),
      accessor: (row) => row.evento,
    },
    {
      id: "entidad",
      label: "Entidad",
      options: Array.from(new Set(logs.map((l) => l.entidad).filter(Boolean))).map((e) => ({
        value: e,
        label: e,
      })),
      accessor: (row) => row.entidad,
    },
  ];

  const limpiarFiltros = () => {
    setFechaDesde("");
    setFechaHasta("");
    setIdUsuario("");
    setEntidad("");
    setEvento("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Panel de Auditoría</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Consultá el registro de actividades del sistema. Máximo 500 registros.
        </p>
      </div>

      {/* Filtros avanzados */}
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
          <div className="min-w-[200px]">
            <label htmlFor="idUsuario" className="block text-xs font-medium text-text-secondary mb-1">
              ID Usuario
            </label>
            <input
              id="idUsuario"
              type="text"
              value={idUsuario}
              onChange={(e) => setIdUsuario(e.target.value)}
              placeholder="UUID del usuario…"
              className="block w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="min-w-[140px]">
            <label htmlFor="entidadFiltro" className="block text-xs font-medium text-text-secondary mb-1">
              Entidad
            </label>
            <input
              id="entidadFiltro"
              type="text"
              value={entidad}
              onChange={(e) => setEntidad(e.target.value)}
              placeholder="Ej: reserva"
              className="block w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="min-w-[140px]">
            <label htmlFor="eventoFiltro" className="block text-xs font-medium text-text-secondary mb-1">
              Evento
            </label>
            <input
              id="eventoFiltro"
              type="text"
              value={evento}
              onChange={(e) => setEvento(e.target.value)}
              placeholder="Ej: INSERT"
              className="block w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
          <p className="text-text-secondary">Cargando registros de auditoría…</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-text-secondary">
            Mostrando {logs.length} registro{logs.length !== 1 ? "s" : ""}
            {logs.length >= 500 ? " (límite alcanzado)" : ""}
          </p>
          <DataTable
            data={logs}
            columns={columns}
            getRowId={(row) => row.id}
            filters={filters}
            searchAccessor={(row) =>
              `${row.evento} ${row.entidad} ${row.detalle || ""} ${row.id_usuario || ""}`
            }
            searchPlaceholder="Buscar por evento, entidad, detalle o usuario…"
            emptyMessage="No hay registros de auditoría con los filtros seleccionados."
            pageSize={25}
          />
        </>
      )}
    </div>
  );
}