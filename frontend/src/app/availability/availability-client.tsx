"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { PublicLayout, TimeSlotGrid } from "@/components";
import { api } from "@/lib/http-client";
import { isVisibleEntity, normalizeCancha, normalizeDisciplina } from "@/lib/api-mappers";
import { formatDate } from "@/lib/format";
import type { Disciplina, Cancha, TimeSlotAvailability } from "@/lib/types";

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function AvailabilityClient() {
  const searchParams = useSearchParams();
  const initialDiscipline = searchParams.get("discipline_id") ?? "";

  const [disciplineId, setDisciplineId] = useState(initialDiscipline);
  const [courtId, setCourtId] = useState("");
  const [date, setDate] = useState(todayString());

  // Disciplinas
  const { data: disciplinas } = useQuery<Disciplina[]>({
    queryKey: ["disciplines"],
    queryFn: () =>
      api.get<unknown[]>("/disciplines").then((list) =>
        list.map(normalizeDisciplina)
      ),
  });

  const activas = (disciplinas ?? []).filter(isVisibleEntity);

  // Canchas filtradas por disciplina
  const { data: canchas } = useQuery<Cancha[]>({
    queryKey: ["courts", disciplineId],
    queryFn: () =>
      api
        .get<unknown[]>("/courts", {
          params: { discipline_id: disciplineId },
        })
        .then((list) => list.map(normalizeCancha)),
    enabled: Boolean(disciplineId),
  });

  const canchasActivas = (canchas ?? []).filter(
    (c) => c.estado !== "INACTIVO"
  );

  // Disponibilidad
  const { data: slots, isLoading: slotsLoading } = useQuery<TimeSlotAvailability[]>({
    queryKey: ["availability", courtId, date],
    queryFn: () =>
      api.get<TimeSlotAvailability[]>("/time-slots/availability", {
        params: { court_id: courtId, date },
      }),
    enabled: Boolean(courtId && date),
  });

  // Resetear cancha al cambiar disciplina
  function handleDisciplineChange(newId: string) {
    setDisciplineId(newId);
    setCourtId("");
  }

  return (
    <PublicLayout>
      <div className="py-8 sm:py-12">
        <h1 className="text-2xl font-semibold text-text-primary sm:text-3xl">
          Disponibilidad de canchas
        </h1>
        <p className="mt-2 text-text-secondary">
          Seleccioná disciplina, cancha y fecha para ver las franjas horarias
          disponibles.
        </p>

        {/* Filtros */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {/* Disciplina */}
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text-primary">
              Disciplina
            </span>
            <select
              value={disciplineId}
              onChange={(e) => handleDisciplineChange(e.target.value)}
              className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none"
            >
              <option value="">Seleccionar disciplina</option>
              {activas.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                </option>
              ))}
            </select>
          </label>

          {/* Cancha */}
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text-primary">Cancha</span>
            <select
              value={courtId}
              onChange={(e) => setCourtId(e.target.value)}
              disabled={!disciplineId}
              className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none disabled:opacity-50"
            >
              <option value="">Seleccionar cancha</option>
              {canchasActivas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                  {c.superficie ? ` (${c.superficie.replace(/_/g, " ")})` : ""}
                </option>
              ))}
            </select>
          </label>

          {/* Fecha */}
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text-primary">Fecha</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={todayString()}
              className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none"
            />
          </label>
        </div>

        {/* Resultados */}
        <div className="mt-8">
          {!disciplineId || !courtId ? (
            <p className="rounded-xl border border-dashed border-border bg-surface-2 px-4 py-10 text-center text-sm text-text-secondary">
              Seleccioná una disciplina y una cancha para ver la disponibilidad.
            </p>
          ) : slotsLoading ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-4">
                {[1, 2].map((i) => (
                  <div key={i} className="h-5 w-20 animate-pulse rounded bg-surface-2" />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="h-20 animate-pulse rounded-xl bg-surface-2"
                  />
                ))}
              </div>
            </div>
          ) : (
            <>
              <h2 className="mb-4 text-lg font-semibold text-text-primary">
                Franjas para el {formatDate(date)}
              </h2>
              <TimeSlotGrid
                slots={slots ?? []}
                emptyMessage="No hay franjas horarias configuradas para esta cancha en esta fecha."
              />
            </>
          )}
        </div>

        {/* CTA para reservar */}
        {courtId && slots && slots.length > 0 && (
          <div className="mt-8 rounded-2xl border border-border bg-surface p-5">
            <p className="text-sm text-text-secondary">
              ¿Querés reservar un turno? Iniciá sesión como socio para completar
              la reserva.
            </p>
            <Link
              href="/login"
              className="mt-3 inline-block rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-surface transition-colors hover:bg-primary-hover"
            >
              Iniciar sesión
            </Link>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
