"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthenticatedLayout } from "@/components/layouts/authenticated-layout";
import { api, ApiError } from "@/lib/http-client";
import { cn } from "@/lib/cn";

interface Destinatario {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: string;
}

export default function SendNotificationPage() {
  const router = useRouter();
  const [destinatarioId, setDestinatarioId] = useState("");
  const [asunto, setAsunto] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const { data: destinatarios = [], isLoading } = useQuery<Destinatario[]>({
    queryKey: ["users", "for-notification"],
    queryFn: () => api.get("/users"),
  });

  const notificationMutation = useMutation({
    mutationFn: () =>
      api.post("/notifications", {
        id_usuario: destinatarioId,
        asunto,
        mensaje,
      }),
    onSuccess: () => {
      setSuccess(true);
      setError("");
    },
    onError: (err: ApiError) => {
      setError(err.message || "Error al enviar la notificación.");
    },
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (!destinatarioId) {
      setError("Seleccioná un destinatario.");
      return;
    }
    if (!asunto.trim()) {
      setError("Ingresá un asunto.");
      return;
    }
    if (!mensaje.trim()) {
      setError("Ingresá un mensaje.");
      return;
    }

    notificationMutation.mutate();
  }

  if (success) {
    return (
      <AuthenticatedLayout withSidebar>
        <div className="mx-auto max-w-lg space-y-6 text-center">
          <div className="rounded-2xl border border-border bg-surface p-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <span className="text-3xl">📨</span>
            </div>
            <h1 className="mt-4 text-xl font-bold text-text-primary">¡Notificación enviada!</h1>
            <p className="mt-2 text-sm text-text-secondary">
              La notificación fue enviada correctamente al destinatario.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setSuccess(false);
                  setDestinatarioId("");
                  setAsunto("");
                  setMensaje("");
                }}
                className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-hover"
              >
                Enviar otra
              </button>
              <button
                type="button"
                onClick={() => router.push("/permission-requests")}
                className="flex-1 rounded-xl border border-border px-4 py-3 text-sm font-medium text-text-primary hover:bg-surface-2"
              >
                Ir a solicitudes
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
          <h1 className="text-2xl font-bold text-text-primary">Enviar Notificación</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Enviá una notificación por email a un usuario del club.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-surface p-6 space-y-5">
          {/* Destinatario */}
          <div>
            <label
              htmlFor="destinatario"
              className="block text-sm font-medium text-text-primary"
            >
              Destinatario
            </label>
            {isLoading ? (
              <p className="mt-1 text-sm text-text-secondary">Cargando usuarios…</p>
            ) : (
              <select
                id="destinatario"
                value={destinatarioId}
                onChange={(e) => setDestinatarioId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none"
                required
              >
                <option value="">Seleccionar destinatario…</option>
                {destinatarios.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nombre} {d.apellido} — {d.email} ({d.rol})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Asunto */}
          <div>
            <label
              htmlFor="asunto"
              className="block text-sm font-medium text-text-primary"
            >
              Asunto
            </label>
            <input
              id="asunto"
              type="text"
              value={asunto}
              onChange={(e) => setAsunto(e.target.value)}
              placeholder="Ej: Recordatorio de reserva"
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none"
              required
            />
          </div>

          {/* Mensaje */}
          <div>
            <label
              htmlFor="mensaje"
              className="block text-sm font-medium text-text-primary"
            >
              Mensaje
            </label>
            <textarea
              id="mensaje"
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              placeholder="Escribí el mensaje de la notificación…"
              rows={5}
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none resize-y"
              required
            />
          </div>

          {error ? (
            <div className="rounded-lg bg-error/10 px-4 py-3 text-sm text-error">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={notificationMutation.isPending}
            className={cn(
              "w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover",
              notificationMutation.isPending && "opacity-50 cursor-not-allowed",
            )}
          >
            {notificationMutation.isPending ? "Enviando…" : "📨 Enviar notificación"}
          </button>
        </form>
      </div>
    </AuthenticatedLayout>
  );
}