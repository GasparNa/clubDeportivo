"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { DataTable, StatusBadge, type DataTableColumn, type DataTableFilter } from "@/components";
import { api } from "@/lib/http-client";
import { formatDateTime } from "@/lib/format";
import type { Role, UserStatus } from "@/lib/types";

interface AdminUser {
  id: string;
  id_usuario?: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: Role;
  estado: UserStatus;
  dni?: string;
  creado_en?: string;
}

export default function AdminUsersPage() {
  const router = useRouter();

  const { data: users = [], isLoading } = useQuery<AdminUser[]>({
    queryKey: ["admin-users"],
    queryFn: () => api.get("/users"),
  });

  const columns: DataTableColumn<AdminUser>[] = [
    {
      id: "nombre",
      header: "Usuario",
      cell: (row) => (
        <div>
          <p className="font-medium text-text-primary">
            {row.nombre} {row.apellido}
          </p>
          <p className="text-xs text-text-secondary">{row.email}</p>
        </div>
      ),
      sortAccessor: (row) => `${row.apellido} ${row.nombre}`,
    },
    {
      id: "dni",
      header: "DNI",
      cell: (row) => row.dni || "—",
      sortAccessor: (row) => row.dni || "",
    },
    {
      id: "rol",
      header: "Rol",
      cell: (row) => <StatusBadge status={row.rol} />,
      sortAccessor: (row) => row.rol,
    },
    {
      id: "estado",
      header: "Estado",
      cell: (row) => <StatusBadge status={row.estado} />,
      sortAccessor: (row) => row.estado,
    },
    {
      id: "creado_en",
      header: "Fecha registro",
      cell: (row) => formatDateTime(row.creado_en || ""),
      sortAccessor: (row) => row.creado_en || "",
    },
  ];

  const filters: DataTableFilter<AdminUser>[] = [
    {
      id: "rol",
      label: "Rol",
      options: [
        { value: "SOCIO", label: "Socio" },
        { value: "GERENTE", label: "Gerente" },
        { value: "ADMINISTRADOR", label: "Administrador" },
        { value: "INVITADO", label: "Invitado" },
      ],
      accessor: (row) => row.rol,
    },
    {
      id: "estado",
      label: "Estado",
      options: [
        { value: "ACTIVO", label: "Activo" },
        { value: "INACTIVO", label: "Inactivo" },
        { value: "PENDIENTE", label: "Pendiente" },
        { value: "SUSPENDIDO", label: "Suspendido" },
      ],
      accessor: (row) => row.estado,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Gestión de Usuarios</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Administrá los usuarios del sistema: revisá perfiles, roles y estados.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-text-secondary">Cargando usuarios…</p>
        </div>
      ) : (
        <DataTable
          data={users}
          columns={columns}
          getRowId={(row) => row.id || row.id_usuario || ""}
          filters={filters}
          searchAccessor={(row) => `${row.nombre} ${row.apellido} ${row.email} ${row.dni || ""}`}
          searchPlaceholder="Buscar por nombre, email o DNI…"
          onRowClick={(row) => router.push(`/admin/users/${row.id || row.id_usuario}`)}
          emptyMessage="No hay usuarios para mostrar."
        />
      )}
    </div>
  );
}