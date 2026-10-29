"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { StatusBadge } from "@/components";
import { api } from "@/lib/http-client";
import { formatDateTime } from "@/lib/format";
import type { Role, UserStatus } from "@/lib/types";

interface UserDetail {
  id: string;
  id_usuario?: string;
  nombre: string;
  apellido: string;
  email: string;
  dni?: string;
  cuil?: string;
  fecha_nacimiento?: string;
  telefono?: string;
  rol: Role;
  estado: UserStatus;
  infracciones_equipamiento?: number;
  creado_en?: string;
  actualizado_en?: string;
}

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = params.id as string;
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: user, isLoading } = useQuery<UserDetail>({
    queryKey: ["admin-user", userId],
    queryFn: () => api.get(`/users/${userId}`),
    enabled: !!userId,
  });

  const statusMutation = useMutation({
    mutationFn: (nuevoEstado: string) =>
      api.patch(`/users/${userId}/status`, { estado: nuevoEstado }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user", userId] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setActionError(null);
    },
    onError: (err: Error) => {
      setActionError(err.message || "Error al cambiar el estado del usuario.");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-text-secondary">Cargando datos del usuario…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-text-secondary">Usuario no encontrado.</p>
        <button
          onClick={() => router.push("/admin/users")}
          className="text-sm text-primary hover:underline"
        >
          ← Volver a Gestión de Usuarios
        </button>
      </div>
    );
  }

  const puedeSuspender = user.estado === "ACTIVO";
  const puedeReactivar = user.estado === "SUSPENDIDO" || user.estado === "INACTIVO";

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <button
        onClick={() => router.push("/admin/users")}
        className="text-sm text-text-secondary hover:text-primary transition-colors"
      >
        ← Volver a Gestión de Usuarios
      </button>

      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          {user.nombre} {user.apellido}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Gestioná el estado y revisá los datos del usuario.
        </p>
      </div>

      {/* Datos del usuario */}
      <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">Datos del Usuario</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoField label="Nombre" value={user.nombre} />
          <InfoField label="Apellido" value={user.apellido} />
          <InfoField label="Email" value={user.email} />
          <InfoField label="DNI" value={user.dni || "—"} />
          <InfoField label="CUIL" value={user.cuil || "—"} />
          <InfoField label="Teléfono" value={user.telefono || "—"} />
          <InfoField
            label="Fecha de Nacimiento"
            value={user.fecha_nacimiento ? formatDateTime(user.fecha_nacimiento) : "—"}
          />
          <InfoField label="Fecha de Registro" value={user.creado_en ? formatDateTime(user.creado_en) : "—"} />
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-text-secondary">Rol</p>
            <StatusBadge status={user.rol} className="mt-1" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-text-secondary">Estado</p>
            <StatusBadge status={user.estado} className="mt-1" />
          </div>
        </div>

        {/* Infracciones de equipamiento */}
        {user.infracciones_equipamiento !== undefined && (
          <div className="mt-4 rounded-lg border border-warning/30 bg-warning/5 p-4">
            <p className="text-sm font-medium text-warning">
              ⚠️ Incumplimientos de equipamiento: {user.infracciones_equipamiento}
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              {user.infracciones_equipamiento >= 3
                ? "El usuario superó el límite de infracciones. Se recomienda mantener la suspensión."
                : "3 o más infracciones resultan en suspensión automática."}
            </p>
          </div>
        )}
      </div>

      {/* Acciones de estado */}
      <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">Gestionar Estado</h2>
        <p className="text-sm text-text-secondary">
          Estado actual:{" "}
          <StatusBadge status={user.estado} />
        </p>

        {actionError && (
          <div className="rounded-lg border border-error/30 bg-error/5 p-3 text-sm text-error">
            {actionError}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {puedeSuspender && (
            <button
              onClick={() => statusMutation.mutate("SUSPENDIDO")}
              disabled={statusMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-error px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-error/80 disabled:opacity-50"
            >
              {statusMutation.isPending ? "Procesando…" : "Suspender Usuario"}
            </button>
          )}
          {puedeReactivar && (
            <button
              onClick={() => statusMutation.mutate("ACTIVO")}
              disabled={statusMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-success/80 disabled:opacity-50"
            >
              {statusMutation.isPending ? "Procesando…" : "Reactivar Usuario"}
            </button>
          )}
          {!puedeSuspender && !puedeReactivar && (
            <p className="text-sm text-text-secondary">No hay acciones disponibles para este estado.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-text-secondary">{label}</p>
      <p className="mt-1 text-sm text-text-primary">{value}</p>
    </div>
  );
}