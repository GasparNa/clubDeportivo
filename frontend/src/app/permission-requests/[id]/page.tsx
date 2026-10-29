"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { AuthenticatedLayout } from "@/components/layouts/authenticated-layout";
import { StatusBadge } from "@/components";
import { api, ApiError } from "@/lib/http-client";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { PermissionRequestStatus } from "@/lib/types";

interface PermissionRequestDetail {
  id: string;
  id_persona?: string;
  nombre: string;
  apellido: string;
  dni: string;
  cuil?: string;
  fecha_nacimiento?: string;
  email: string;
  telefono?: string;
  estado: PermissionRequestStatus;
  fecha_solicitud: string;
  creado_en?: string;
  actualizado_en?: string;
}

export default function PermissionRequestDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState("");

  const { data: request, isLoading } = useQuery<PermissionRequestDetail>({
    queryKey: ["permission-requests", params.id],
    queryFn: () => api.get(`/permission-requests/${params.id}`),
    enabled: Boolean(params.id),
  });

  const approveMutation = useMutation({
    mutationFn: () =>
      api.patch(`/permission-requests/${params.id}`, { estado: "APROBADA" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["permission-requests"] });
      router.push("/permission-requests");
    },
    onError: (error: ApiError) => {
      setActionError(error.message || "Error al aprobar la solicitud.");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () =>
      api.patch(`/permission-requests/${params.id}`, { estado: "RECHAZADA" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["permission-requests"] });
      router.push("/permission-requests");
    },
    onError: (error: ApiError) => {
      setActionError(error.message || "Error al rechazar la solicitud.");
    },
  });

  if (isLoading) {
    return (
      <AuthenticatedLayout withSidebar>
        <div className="flex items-center justify-center py-20">
          <p className="text-text-secondary">Cargando solicitud…</p>
        </div>
      </AuthenticatedLayout>
    );
  }

  if (!request) {
    return (
      <AuthenticatedLayout withSidebar>
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-text-secondary">Solicitud no encontrada.</p>
          <button
            type="button"
            onClick={() => router.push("/permission-requests")}
            className="mt-4 text-sm font-medium text-primary hover:underline"
          >
            Volver a solicitudes
          </button>
        </div>
      </AuthenticatedLayout>
    );
  }

  const isPending = request.estado === "PENDIENTE";

  return (
    <AuthenticatedLayout withSidebar>
      <div className="mx-auto max-w-2xl space-y-6">
        <button
          type="button"
          onClick={() => router.push("/permission-requests")}
          className="text-sm font-medium text-primary hover:underline"
        >
          ← Volver a solicitudes
        </button>

        <div className="rounded-2xl border border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-text-primary">Revisar Solicitud</h1>
            <StatusBadge status={request.estado} />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Nombre
              </p>
              <p className="mt-1 text-text-primary">
                {request.nombre} {request.apellido}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                DNI
              </p>
              <p className="mt-1 text-text-primary">{request.dni}</p>
            </div>
            {request.cuil ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  CUIL
                </p>
                <p className="mt-1 text-text-primary">{request.cuil}</p>
              </div>
            ) : null}
            {request.fecha_nacimiento ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Fecha de nacimiento
                </p>
                <p className="mt-1 text-text-primary">
                  {formatDateTime(request.fecha_nacimiento)}
                </p>
              </div>
            ) : null}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Email
              </p>
              <p className="mt-1 text-text-primary">{request.email}</p>
            </div>
            {request.telefono ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Teléfono
                </p>
                <p className="mt-1 text-text-primary">{request.telefono}</p>
              </div>
            ) : null}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Fecha de solicitud
              </p>
              <p className="mt-1 text-text-primary">
                {formatDateTime(request.fecha_solicitud || request.creado_en || "")}
              </p>
            </div>
          </div>

          {actionError ? (
            <div className="mt-4 rounded-lg bg-error/10 px-4 py-3 text-sm text-error">
              {actionError}
            </div>
          ) : null}

          {isPending ? (
            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={() => approveMutation.mutate()}
                disabled={approveMutation.isPending || rejectMutation.isPending}
                className={cn(
                  "flex-1 rounded-xl bg-success px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-success/90",
                  (approveMutation.isPending || rejectMutation.isPending) && "opacity-50 cursor-not-allowed",
                )}
              >
                {approveMutation.isPending ? "Aprobando…" : "✅ Aprobar"}
              </button>
              <button
                type="button"
                onClick={() => rejectMutation.mutate()}
                disabled={approveMutation.isPending || rejectMutation.isPending}
                className={cn(
                  "flex-1 rounded-xl bg-error px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-error/90",
                  (approveMutation.isPending || rejectMutation.isPending) && "opacity-50 cursor-not-allowed",
                )}
              >
                {rejectMutation.isPending ? "Rechazando…" : "❌ Rechazar"}
              </button>
            </div>
          ) : (
            <div className="mt-8 rounded-lg bg-surface-2 px-4 py-3 text-sm text-text-secondary">
              {request.estado === "APROBADA"
                ? "Esta solicitud ya fue aprobada. El usuario ahora está activo."
                : "Esta solicitud fue rechazada."}
            </div>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}