"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { AuthenticatedLayout } from "@/components/layouts/authenticated-layout";
import { DataTable, StatusBadge, type DataTableColumn, type DataTableFilter } from "@/components";
import { api } from "@/lib/http-client";
import { formatDateTime } from "@/lib/format";
import type { PermissionRequestStatus } from "@/lib/types";

interface PermissionRequest {
  id: string;
  id_persona?: string;
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  telefono?: string;
  estado: PermissionRequestStatus;
  fecha_solicitud: string;
  creado_en?: string;
}

export default function PermissionRequestsPage() {
  const router = useRouter();

  const { data: requests = [], isLoading } = useQuery<PermissionRequest[]>({
    queryKey: ["permission-requests"],
    queryFn: () => api.get("/permission-requests"),
  });

  const columns: DataTableColumn<PermissionRequest>[] = [
    {
      id: "nombre",
      header: "Solicitante",
      cell: (row) => (
        <div>
          <p className="font-medium text-text-primary">
            {row.nombre} {row.apellido}
          </p>
          <p className="text-xs text-text-secondary">{row.dni}</p>
        </div>
      ),
      sortAccessor: (row) => `${row.apellido} ${row.nombre}`,
    },
    {
      id: "email",
      header: "Contacto",
      cell: (row) => (
        <div>
          <p className="text-sm">{row.email}</p>
          {row.telefono ? (
            <p className="text-xs text-text-secondary">{row.telefono}</p>
          ) : null}
        </div>
      ),
      sortAccessor: (row) => row.email,
    },
    {
      id: "fecha_solicitud",
      header: "Fecha solicitud",
      cell: (row) => formatDateTime(row.fecha_solicitud || row.creado_en || ""),
      sortAccessor: (row) => row.fecha_solicitud || row.creado_en || "",
    },
    {
      id: "estado",
      header: "Estado",
      cell: (row) => <StatusBadge status={row.estado} />,
      sortAccessor: (row) => row.estado,
    },
  ];

  const filters: DataTableFilter<PermissionRequest>[] = [
    {
      id: "estado",
      label: "Estado",
      options: [
        { value: "PENDIENTE", label: "Pendiente" },
        { value: "APROBADA", label: "Aprobada" },
        { value: "RECHAZADA", label: "Rechazada" },
      ],
      accessor: (row) => row.estado,
    },
  ];

  return (
    <AuthenticatedLayout withSidebar>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Solicitudes de Permiso</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Revisá y gestioná las solicitudes de registro de nuevos socios.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-text-secondary">Cargando solicitudes…</p>
          </div>
        ) : (
          <DataTable
            data={requests}
            columns={columns}
            getRowId={(row) => row.id}
            filters={filters}
            searchAccessor={(row) => `${row.nombre} ${row.apellido} ${row.dni} ${row.email}`}
            searchPlaceholder="Buscar por nombre, DNI o email…"
            onRowClick={(row) => router.push(`/permission-requests/${row.id}`)}
            emptyMessage="No hay solicitudes de permiso para mostrar."
          />
        )}
      </div>
    </AuthenticatedLayout>
  );
}