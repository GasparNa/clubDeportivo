"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AuthenticatedLayout, StatusBadge } from "@/components";
import { useAuth, useRequireActiveUser } from "@/lib/auth-provider";
import { api } from "@/lib/http-client";
import { normalizeDisciplina, normalizeCancha, normalizeSlot, isVisibleEntity } from "@/lib/api-mappers";
import { formatDate, formatCurrency, todayISODate } from "@/lib/format";
import { countActiveReservations, MAX_ACTIVE_RESERVATIONS } from "@/lib/reservation-rules";
import type { Disciplina, Cancha, TimeSlotAvailability, Reserva, CreateReservaRequest } from "@/lib/types";
import {
  IconChevronLeft,
  IconChevronRight,
  IconCheckCircle,
  IconAlertTriangle,
  IconTrophy,
  IconMapPin,
  IconClock,
  IconCalendar,
} from "@/components/icons";

type Step = 1 | 2 | 3 | 4;

function NewReservationContent() {
  const router = useRouter();
  const { user } = useAuth();
  const activeUser = useRequireActiveUser();
  
  // Durante build/prerender, activeUser será null
  if (activeUser === null) {
    return null;
  }
  
  // Steps
  const [step, setStep] = useState<Step>(1);

  // Step 1: Disciplina
  const [disciplineId, setDisciplineId] = useState("");

  // Step 2: Cancha
  const [courtId, setCourtId] = useState("");

  // Step 3: Franja horaria
  const [date, setDate] = useState(todayISODate());
  const [slotId, setSlotId] = useState("");

  // Step 4: Confirmación
  const [confirmed, setConfirmed] = useState(false);

  // Queries
  const { data: disciplinas } = useQuery<Disciplina[]>({
    queryKey: ["disciplines"],
    queryFn: () => api.get<unknown[]>("/disciplines").then((list) => list.map(normalizeDisciplina)),
  });

  const activas = (disciplinas ?? []).filter(isVisibleEntity);
  const selectedDiscipline = activas.find((d) => d.id === disciplineId);

  const { data: canchas } = useQuery<Cancha[]>({
    queryKey: ["courts", disciplineId],
    queryFn: () =>
      api.get<unknown[]>("/courts", { params: { discipline_id: disciplineId } }).then((list) =>
        list.map(normalizeCancha),
      ),
    enabled: Boolean(disciplineId),
  });

  const canchasActivas = (canchas ?? []).filter((c) => c.estado !== "INACTIVO");
  const selectedCourt = canchasActivas.find((c) => c.id === courtId);

  const { data: slots, isLoading: slotsLoading } = useQuery<TimeSlotAvailability[]>({
    queryKey: ["availability", courtId, date],
    queryFn: () =>
      api.get<unknown[]>("/time-slots/availability", { params: { court_id: courtId, date } }).then((list) =>
        list.map(normalizeSlot),
      ),
    enabled: Boolean(courtId && date),
  });

  const availableSlots = (slots ?? []).filter((s) => s.disponible);
  const selectedSlot = availableSlots.find((s) => s.id_franja === slotId);

  // Verificar límite de reservas activas
  const { data: myReservations } = useQuery<Reserva[]>({
    queryKey: ["my-reservations", user?.id],
    queryFn: () =>
      api.get<unknown[]>("/reservations", { params: { person_id: user?.id } }).then((list) =>
        list.map((r) => r as Reserva),
      ),
    enabled: Boolean(user?.id),
  });

  const activeCount = countActiveReservations(myReservations ?? []);
  const canCreate = activeCount < MAX_ACTIVE_RESERVATIONS;

  // Mutación
  const mutation = useMutation({
    mutationFn: (data: CreateReservaRequest) =>
      api.post<Reserva>("/reservations", data),
    onSuccess: (reserva) => {
      router.push(`/reservations/${reserva.id}`);
    },
  });

  const handleConfirm = () => {
    if (!user?.id || !slotId) return;
    mutation.mutate({
      id_franja: slotId,
      fecha: date,
      id_persona: user.id,
      origen: "AUTOGESTIONADA",
    });
  };

  // Helpers
  const canGoNext = (): boolean => {
    switch (step) {
      case 1: return Boolean(disciplineId);
      case 2: return Boolean(courtId);
      case 3: return Boolean(slotId);
      case 4: return confirmed;
      default: return false;
    }
  };

  const stepLabels = ["Disciplina", "Cancha", "Franja horaria", "Confirmar"];

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
              Nueva Reserva
            </h1>
            <p className="mt-1 text-text-secondary">
              Completá los pasos para reservar tu turno.
            </p>
          </div>
        </div>

        {/* Alerta de límite */}
        {!canCreate && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
            <IconAlertTriangle className="h-4 w-4 shrink-0" />
            Ya tenés {MAX_ACTIVE_RESERVATIONS} reservas activas. Cancelá una antes de crear una nueva.
          </div>
        )}

        {/* Stepper */}
        <nav className="mt-8 flex items-center gap-2" aria-label="Progreso">
          {stepLabels.map((label, i) => {
            const num = (i + 1) as Step;
            const isActive = num === step;
            const isDone = num < step;
            return (
              <div key={label} className="flex items-center gap-2">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                    isDone
                      ? "bg-primary text-surface"
                      : isActive
                        ? "bg-primary text-surface ring-2 ring-primary/30"
                        : "border border-border bg-surface text-text-secondary"
                  }`}
                >
                  {isDone ? <IconCheckCircle className="h-4 w-4" /> : num}
                </span>
                <span
                  className={`hidden text-sm font-medium sm:inline ${
                    isActive ? "text-text-primary" : "text-text-secondary"
                  }`}
                >
                  {label}
                </span>
                {i < stepLabels.length - 1 && (
                  <span className="mx-1 h-px w-6 bg-border" aria-hidden="true" />
                )}
              </div>
            );
          })}
        </nav>

        {/* Contenido del paso */}
        <div className="mt-8">
          {/* Paso 1: Disciplina */}
          {step === 1 && (
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Elegí una disciplina</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {activas.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDisciplineId(d.id)}
                    className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                      disciplineId === d.id
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border bg-surface hover:border-primary/50"
                    }`}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <IconTrophy className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-text-primary">{d.nombre}</p>
                      {d.descripcion && (
                        <p className="text-xs text-text-secondary line-clamp-1">{d.descripcion}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Paso 2: Cancha */}
          {step === 2 && (
            <div>
              <h2 className="text-lg font-semibold text-text-primary">
                Elegí una cancha — {selectedDiscipline?.nombre}
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {canchasActivas.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCourtId(c.id)}
                    className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                      courtId === c.id
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border bg-surface hover:border-primary/50"
                    }`}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                      <IconMapPin className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-text-primary">{c.nombre}</p>
                      <p className="text-xs text-text-secondary">
                        {c.superficie ? `${c.superficie} · ` : ""}
                        {formatCurrency(c.precio_base)}
                      </p>
                      <StatusBadge status={c.estado} className="mt-1" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Paso 3: Franja horaria */}
          {step === 3 && (
            <div>
              <h2 className="text-lg font-semibold text-text-primary">
                Elegí fecha y horario — {selectedCourt?.nombre}
              </h2>

              {/* Fecha */}
              <label className="mt-4 flex flex-col gap-1.5">
                <span className="text-sm font-medium text-text-primary">Fecha</span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setSlotId("");
                  }}
                  min={todayISODate()}
                  className="w-full max-w-xs rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none"
                />
              </label>

              {/* Slots */}
              {slotsLoading ? (
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="animate-pulse h-14 rounded-xl bg-surface-2" />
                  ))}
                </div>
              ) : availableSlots.length === 0 ? (
                <p className="mt-4 rounded-xl border border-dashed border-border bg-surface-2 px-4 py-8 text-center text-sm text-text-secondary">
                  No hay franjas disponibles para esta fecha.
                </p>
              ) : (
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  {availableSlots.map((s) => (
                    <button
                      key={s.id_franja}
                      type="button"
                      onClick={() => setSlotId(s.id_franja)}
                      className={`flex items-center gap-2 rounded-xl border p-3 text-left transition-colors ${
                        slotId === s.id_franja
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border bg-surface hover:border-primary/50"
                      }`}
                    >
                      <IconClock className="h-4 w-4 shrink-0 text-text-secondary" />
                      <span className="text-sm font-medium text-text-primary">
                        {s.hora_inicio} – {s.hora_fin}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Paso 4: Confirmar */}
          {step === 4 && (
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Confirmá tu reserva</h2>

              <div className="mt-4 rounded-2xl border border-border bg-surface p-6">
                <dl className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center gap-3">
                    <IconTrophy className="h-5 w-5 text-text-secondary" />
                    <div>
                      <dt className="text-xs font-medium text-text-secondary">Disciplina</dt>
                      <dd className="text-sm font-semibold text-text-primary">
                        {selectedDiscipline?.nombre}
                      </dd>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <IconMapPin className="h-5 w-5 text-text-secondary" />
                    <div>
                      <dt className="text-xs font-medium text-text-secondary">Cancha</dt>
                      <dd className="text-sm font-semibold text-text-primary">
                        {selectedCourt?.nombre}
                      </dd>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <IconCalendar className="h-5 w-5 text-text-secondary" />
                    <div>
                      <dt className="text-xs font-medium text-text-secondary">Fecha</dt>
                      <dd className="text-sm font-semibold text-text-primary">
                        {formatDate(date)}
                      </dd>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <IconClock className="h-5 w-5 text-text-secondary" />
                    <div>
                      <dt className="text-xs font-medium text-text-secondary">Horario</dt>
                      <dd className="text-sm font-semibold text-text-primary">
                        {selectedSlot ? `${selectedSlot.hora_inicio} – ${selectedSlot.hora_fin}` : "—"}
                      </dd>
                    </div>
                  </div>
                </dl>

                {selectedCourt && (
                  <div className="mt-4 rounded-xl bg-surface-2 px-4 py-3 text-sm text-text-secondary">
                    Precio base: <span className="font-semibold text-text-primary">{formatCurrency(selectedCourt.precio_base)}</span>
                  </div>
                )}

                {/* Checkbox confirmación */}
                <label className="mt-4 flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-text-secondary">
                    Confirmo que los datos son correctos y acepto las condiciones de reserva.
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Error */}
          {mutation.isError && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
              <IconAlertTriangle className="h-4 w-4 shrink-0" />
              {(mutation.error as Error)?.message || "Error al crear la reserva."}
            </div>
          )}
        </div>

        {/* Navegación entre pasos */}
        <div className="mt-8 flex flex-wrap gap-3">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep((prev) => (prev - 1) as Step)}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-2"
            >
              <IconChevronLeft className="h-4 w-4" />
              Anterior
            </button>
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep((prev) => (prev + 1) as Step)}
              disabled={!canGoNext()}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-surface transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              Siguiente
              <IconChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!confirmed || mutation.isPending || !canCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-surface transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              <IconCheckCircle className="h-4 w-4" />
              {mutation.isPending ? "Creando…" : "Confirmar reserva"}
            </button>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}

export default function NewReservationPage() {
  try {
    return <NewReservationContent />;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "NOT_AUTHENTICATED") {
        return (
          <AuthenticatedLayout>
            <div className="py-8 sm:py-12 text-center">
              <IconAlertTriangle className="h-12 w-12 mx-auto text-warning" />
              <h2 className="mt-4 text-xl font-semibold text-text-primary">
                Debes iniciar sesión
              </h2>
              <p className="mt-2 text-text-secondary">
                Para crear una reserva, necesitas tener una cuenta activa.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <a
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
                >
                  Iniciar sesión
                </a>
                <a
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:bg-surface-2"
                >
                  Registrarse
                </a>
              </div>
            </div>
          </AuthenticatedLayout>
        );
      }
      if (error.message === "USER_NOT_ACTIVE") {
        return (
          <AuthenticatedLayout>
            <div className="py-8 sm:py-12 text-center">
              <IconAlertTriangle className="h-12 w-12 mx-auto text-warning" />
              <h2 className="mt-4 text-xl font-semibold text-text-primary">
                Cuenta no activa
              </h2>
              <p className="mt-2 text-text-secondary">
                Tu cuenta no está activa. Contactá a gerencia para activarla.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <a
                  href="/profile"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
                >
                  Ver mi perfil
                </a>
              </div>
            </div>
          </AuthenticatedLayout>
        );
      }
    }
    throw error;
  }
}