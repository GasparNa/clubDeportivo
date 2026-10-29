"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { AuthenticatedLayout } from "@/components/layouts/authenticated-layout";
import { DataTable, StatusBadge, type DataTableColumn, type DataTableFilter } from "@/components";
import { api } from "@/lib/http-client";
import { formatDate, formatCurrency } from "@/lib/format";
import { normalizeReserva } from "@/lib/api-mappers";
import type { Reserva } from "@/lib/types";

export default function ReservationsManagePage() {
  const router = useRouter();

  const { data: rawReservations = [], isLoading } = useQuery<unknown[]>({
    queryKey: ["reservations", "all"],
    queryFn: () => api.get("/reservations"),
  });

  const reservations = rawReservations.map(normalizeReserva);

  const columns: DataTableColumn<Reserva>[] = [
    {
      id: "persona",
      header: "Persona",
      cell: (row) => (
        <div>
          <p className="font-medium text-text-primary">
            {row.persona?.nombre} {row.persona?.apellido}
          </p>
          <p className="text-xs text-text-secondary">{row.persona?.dni}</p>
        </div>
      ),
      sortAccessor: (row) =>
        `${row.persona?.apellido ?? ""} ${row.persona?.nombre ?? ""}`,
    },
    {
      id: "fecha",
      header: "Fecha",
      cell: (row) => formatDate(row.fecha),
      sortAccessor: (row) => row.fecha,
    },
    {
      id: "disciplina",
      header: "Disciplina / Cancha",
      cell: (row) => (
        <div>
          <p className="text-sm text-text-primary">
            {row.franja?.cancha?.disciplina?.nombre ?? "—"}
          </p>
          <p className="text-xs text-text-secondary">
            {row.franja?.cancha?.nombre ?? "—"}
          </p>
        </div>
      ),
      sortAccessor: (row) => row.franja?.cancha?.disciplina?.nombre ?? "",
    },
    {
      id: "horario",
      header: "Horario",
      cell: (row) =>
        row.franja
          ? `${row.franja.hora_inicio} – ${row.franja.hora_fin}`
          : "—",
      sortAccessor: (row) => row.franja?.hora_inicio ?? "",
    },
    {
      id: "origen",
      header: "Origen",
      cell: (row) => <StatusBadge status={row.origen} />,
      sortAccessor: (row) => row.origen,
    },
    {
      id: "estado",
      header: "Estado",
      cell: (row) => <StatusBadge status={row.estado} />,
      sortAccessor: (row) => row.estado,
    },
    {
      id: "monto",
      header: "Monto",
      cell: (row) => (
        <span className="font-medium">{formatCurrency(row.monto_total ?? 0)}</span>
      ),
      sortAccessor: (row) => row.monto_total ?? 0,
    },
  ];

  const filters: DataTableFilter<Reserva>[] = [
    {
      id: "estado",
      label: "Estado",
      options: [
        { value: "CONFIRMADA", label: "Confirmada" },
        { value: "EN_CURSO", label: "En curso" },
        { value: "COMPLETADA", label: "Completada" },
        { value: "CANCELADA", label: "Cancelada" },
      ],
      accessor: (row) => row.estado,
    },
    {
      id: "origen",
      label: "Origen",
      options: [
        { value: "AUTOGESTIONADA", label: "Autogestionada" },
        { value: "MANUAL_GERENCIA", label: "Manual gerencia" },
      ],
      accessor: (row) => row.origen,
    },
  ];

  return (
    <AuthenticatedLayout withSidebar>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Gestión de Reservas</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Visualizá y gestioná todas las reservas del club. Hacé clic en una fila para ver el detalle y realizar acciones.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-text-secondary">Cargando reservas…</p>
          </div>
        ) : (
          <DataTable
            data={reservations}
            columns={columns}
            getRowId={(row) => row.id}
            filters={filters}
            searchAccessor={(row) =>
              `${row.persona?.nombre ?? ""} ${row.persona?.apellido ?? ""} ${row.persona?.dni ?? ""} ${row.franja?.cancha?.nombre ?? ""}`
            }
            searchPlaceholder="Buscar por persona, DNI o cancha…"
            onRowClick={(row) => router.push(`/reservations/${row.id}/manage`)}
            emptyMessage="No hay reservas para mostrar."
          />
        )}
      </div>
    </AuthenticatedLayout>
  );
}