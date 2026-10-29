"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthenticatedLayout, StatusBadge } from "@/components";
import { useAuth } from "@/lib/auth-provider";
import { api } from "@/lib/http-client";
import { normalizeReserva, normalizeAlquiler } from "@/lib/api-mappers";
import { canSocioCancel } from "@/lib/reservation-rules";
import { formatDate, formatTime, formatCurrency } from "@/lib/format";
import type { Reserva, AlquilerEquipamiento } from "@/lib/types";
import {
  IconChevronLeft,
  IconCalendar,
  IconClock,
  IconMapPin,
  IconTrophy,
  IconPackage,
  IconTrash,
  IconDollarSign,
} from "@/components/icons";

export default function ReservationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const id = params.id;

  const { data: reserva, isLoading } = useQuery<Reserva>({
    queryKey: ["reservation", id],
    queryFn: async () => {
      const raw = await api.get<unknown>(`/reservations/${id}`);
      return normalizeReserva(raw);
    },
    enabled: Boolean(id),
  });

  const cancelMutation = useMutation({
    mutationFn: () =>
      api.patch<Reserva>(`/reservations/${id}`, { estado: "CANCELADA" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservation", id] });
      queryClient.invalidateQueries({ queryKey: ["my-reservations"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/reservations/${id}`),
    onSuccess: () => {
      router.push("/my-reservations");
    },
  });

  const handleCancel = () => {
    if (!reserva) return;
    const { ok, reason } = canSocioCancel(reserva, user?.id);
    if (!ok) {
      alert(reason);
      return;
    }
    if (confirm("¿Estás seguro de que querés cancelar esta reserva?")) {
      cancelMutation.mutate();
    }
  };

  const alquileres: AlquilerEquipamiento[] = reserva?.alquileres ?? reserva?.detallesAlquiler ?? [];
  const pagos = reserva?.pagos ?? [];
  const totalPagado = pagos.reduce((sum, p) => sum + p.monto, 0);

  return (
    <AuthenticatedLayout>
      <div className="py-8 sm:py-12">
        {/* Encabezado */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-text-secondary transition-colors hover:bg-surface-2"
            aria-label="Volver"
          >
            <IconChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-text-primary sm:text-3xl">
              Detalle de Reserva
            </h1>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-8 animate-pulse space-y-4">
            <div className="h-64 rounded-2xl bg-surface-2" />
          </div>
        ) : reserva ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {/* Info principal */}
            <div className="lg:col-span-2 rounded-2xl border border-border bg-surface p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-text-primary">
                    {reserva.franja?.cancha?.disciplina?.nombre ?? "—"}
                    <span className="text-text-secondary"> · </span>
                    {reserva.franja?.cancha?.nombre ?? "—"}
                  </h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusBadge status={reserva.estado} />
                    <StatusBadge status={reserva.origen} />
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex flex-wrap gap-2">
                  {reserva.estado === "CONFIRMADA" && reserva.origen === "AUTOGESTIONADA" && (
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={cancelMutation.isPending}
                      className="rounded-lg border border-error/30 px-3 py-1.5 text-xs font-medium text-error transition-colors hover:bg-error/10 disabled:opacity-50"
                    >
                      {cancelMutation.isPending ? "Cancelando…" : "Cancelar reserva"}
                    </button>
                  )}
                  {reserva.estado === "CONFIRMADA" && (
                    <Link
                      href={`/reservations/${id}/rent-equipment`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-hover"
                    >
                      <IconPackage className="h-3.5 w-3.5" />
                      Alquilar equipamiento
                    </Link>
                  )}
                </div>
              </div>

              <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 p-3">
                  <IconCalendar className="h-5 w-5 shrink-0 text-text-secondary" />
                  <div>
                    <dt className="text-xs font-medium text-text-secondary">Fecha</dt>
                    <dd className="text-sm font-semibold text-text-primary">
                      {formatDate(reserva.fecha)}
                    </dd>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 p-3">
                  <IconClock className="h-5 w-5 shrink-0 text-text-secondary" />
                  <div>
                    <dt className="text-xs font-medium text-text-secondary">Horario</dt>
                    <dd className="text-sm font-semibold text-text-primary">
                      {reserva.franja
                        ? `${formatTime(reserva.franja.hora_inicio)} – ${formatTime(reserva.franja.hora_fin)}`
                        : "—"}
                    </dd>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 p-3">
                  <IconMapPin className="h-5 w-5 shrink-0 text-text-secondary" />
                  <div>
                    <dt className="text-xs font-medium text-text-secondary">Cancha</dt>
                    <dd className="text-sm font-semibold text-text-primary">
                      {reserva.franja?.cancha?.nombre ?? "—"}
                    </dd>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 p-3">
                  <IconTrophy className="h-5 w-5 shrink-0 text-text-secondary" />
                  <div>
                    <dt className="text-xs font-medium text-text-secondary">Disciplina</dt>
                    <dd className="text-sm font-semibold text-text-primary">
                      {reserva.franja?.cancha?.disciplina?.nombre ?? "—"}
                    </dd>
                  </div>
                </div>
              </dl>

              {/* Alquileres */}
              {alquileres.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold text-text-primary">Equipamiento alquilado</h3>
                  <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
                    {alquileres.map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center justify-between px-4 py-3 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <IconPackage className="h-4 w-4 text-text-secondary" />
                          <span className="text-text-primary">
                            {a.equipamiento?.nombre ?? "Equipamiento"} × {a.cantidad}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusBadge status={a.estado_devolucion} />
                          {a.subtotal ? (
                            <span className="font-medium text-text-primary">
                              {formatCurrency(a.subtotal)}
                            </span>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Sidebar: Pagos */}
            <div className="rounded-2xl border border-border bg-surface p-6">
              <h3 className="font-semibold text-text-primary">Pagos</h3>

              {pagos.length === 0 ? (
                <p className="mt-3 text-sm text-text-secondary">Sin pagos registrados.</p>
              ) : (
                <ul className="mt-3 divide-y divide-border">
                  {pagos.map((p) => (
                    <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                      <div className="flex items-center gap-2">
                        <IconDollarSign className="h-4 w-4 text-text-secondary" />
                        <span className="text-text-primary">{formatCurrency(p.monto)}</span>
                      </div>
                      <StatusBadge status={p.estado} />
                    </li>
                  ))}
                </ul>
              )}

              {totalPagado > 0 && (
                <div className="mt-4 rounded-xl bg-surface-2 px-4 py-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">Total pagado</span>
                    <span className="font-semibold text-text-primary">{formatCurrency(totalPagado)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-8 rounded-xl border border-dashed border-border bg-surface-2 px-4 py-10 text-center text-sm text-text-secondary">
            Reserva no encontrada.
          </p>
        )}
      </div>
    </AuthenticatedLayout>
  );
}