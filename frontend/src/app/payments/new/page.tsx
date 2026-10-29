"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthenticatedLayout } from "@/components/layouts/authenticated-layout";
import { api, ApiError } from "@/lib/http-client";
import { formatDate, formatCurrency } from "@/lib/format";
import { normalizeReserva } from "@/lib/api-mappers";
import { cn } from "@/lib/cn";

export default function NewPaymentPage() {
  const router = useRouter();
  const [selectedReservaId, setSelectedReservaId] = useState("");
  const [monto, setMonto] = useState("");
  const [concepto, setConcepto] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const { data: rawReservations = [], isLoading } = useQuery<unknown[]>({
    queryKey: ["reservations", "active-for-payment"],
    queryFn: () => api.get("/reservations", { params: { estado: "CONFIRMADA,EN_CURSO" } }),
  });

  const activeReservations = rawReservations
    .map(normalizeReserva)
    .filter((r) => r.estado === "CONFIRMADA" || r.estado === "EN_CURSO");

  const selectedReserva = activeReservations.find((r) => r.id === selectedReservaId);

  const paymentMutation = useMutation({
    mutationFn: () =>
      api.post("/payments", {
        id_reserva: selectedReservaId,
        monto: Number(monto),
        concepto: concepto || undefined,
      }),
    onSuccess: () => {
      setSuccess(true);
      setError("");
    },
    onError: (err: ApiError) => {
      setError(err.message || "Error al registrar el pago.");
    },
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (!selectedReservaId) {
      setError("Seleccioná una reserva.");
      return;
    }
    if (!monto || Number(monto) <= 0) {
      setError("Ingresá un monto válido.");
      return;
    }

    paymentMutation.mutate();
  }

  if (success) {
    return (
      <AuthenticatedLayout withSidebar>
        <div className="mx-auto max-w-lg space-y-6 text-center">
          <div className="rounded-2xl border border-border bg-surface p-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <span className="text-3xl">✅</span>
            </div>
            <h1 className="mt-4 text-xl font-bold text-text-primary">¡Pago registrado!</h1>
            <p className="mt-2 text-sm text-text-secondary">
              El pago de {formatCurrency(Number(monto))} fue registrado correctamente.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setSuccess(false);
                  setSelectedReservaId("");
                  setMonto("");
                  setConcepto("");
                }}
                className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-hover"
              >
                Registrar otro pago
              </button>
              <button
                type="button"
                onClick={() => router.push("/reservations/manage")}
                className="flex-1 rounded-xl border border-border px-4 py-3 text-sm font-medium text-text-primary hover:bg-surface-2"
              >
                Ir a reservas
              </button>
            </div>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout withSidebar>
      <div className="mx-auto max-w-lg space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Registrar Pago</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Registrá un pago asociado a una reserva activa.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-surface p-6 space-y-5">
          {/* Selector de reserva */}
          <div>
            <label
              htmlFor="reserva"
              className="block text-sm font-medium text-text-primary"
            >
              Reserva
            </label>
            {isLoading ? (
              <p className="mt-1 text-sm text-text-secondary">Cargando reservas…</p>
            ) : (
              <select
                id="reserva"
                value={selectedReservaId}
                onChange={(e) => setSelectedReservaId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none"
                required
              >
                <option value="">Seleccionar reserva…</option>
                {activeReservations.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.persona?.nombre} {r.persona?.apellido} —{" "}
                    {r.franja?.cancha?.nombre ?? "Cancha"} —{" "}
                    {formatDate(r.fecha)} ({r.estado})
                  </option>
                ))}
              </select>
            )}
            {selectedReserva ? (
              <p className="mt-1 text-xs text-text-secondary">
                {selectedReserva.persona?.nombre} {selectedReserva.persona?.apellido} |{" "}
                {selectedReserva.franja?.cancha?.disciplina?.nombre} —{" "}
                {selectedReserva.franja?.cancha?.nombre} |{" "}
                {formatDate(selectedReserva.fecha)} | Total:{" "}
                {formatCurrency(selectedReserva.monto_total ?? 0)}
              </p>
            ) : null}
          </div>

          {/* Monto */}
          <div>
            <label
              htmlFor="monto"
              className="block text-sm font-medium text-text-primary"
            >
              Monto ($)
            </label>
            <input
              id="monto"
              type="number"
              min="0"
              step="0.01"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="Ej: 5000"
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none"
              required
            />
          </div>

          {/* Concepto */}
          <div>
            <label
              htmlFor="concepto"
              className="block text-sm font-medium text-text-primary"
            >
              Concepto{" "}
              <span className="text-text-secondary">(opcional)</span>
            </label>
            <input
              id="concepto"
              type="text"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder="Ej: Pago de seña"
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none"
            />
          </div>

          {error ? (
            <div className="rounded-lg bg-error/10 px-4 py-3 text-sm text-error">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={paymentMutation.isPending}
            className={cn(
              "w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover",
              paymentMutation.isPending && "opacity-50 cursor-not-allowed",
            )}
          >
            {paymentMutation.isPending ? "Registrando…" : "Registrar pago"}
          </button>
        </form>
      </div>
    </AuthenticatedLayout>
  );
}