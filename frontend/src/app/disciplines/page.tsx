"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PublicLayout } from "@/components";
import { api } from "@/lib/http-client";
import { courtCount, isVisibleEntity, normalizeDisciplina } from "@/lib/api-mappers";
import type { Disciplina } from "@/lib/types";
import { IconSearch, IconTrophy } from "@/components/icons";

export default function DisciplinesPage() {
  const [search, setSearch] = useState("");

  const { data: disciplinas, isLoading } = useQuery<Disciplina[]>({
    queryKey: ["disciplines"],
    queryFn: () =>
      api
        .get<unknown[]>("/disciplines")
        .then((list) => list.map(normalizeDisciplina)),
  });

  const activas = (disciplinas ?? []).filter(isVisibleEntity);
  const filtradas = search.trim()
    ? activas.filter((d) =>
        d.nombre.toLowerCase().includes(search.trim().toLowerCase())
      )
    : activas;

  return (
    <PublicLayout>
      <div className="py-8 sm:py-12">
        <h1 className="text-2xl font-semibold text-text-primary sm:text-3xl">
          Disciplinas
        </h1>
        <p className="mt-2 text-text-secondary">
          Conocé las disciplinas disponibles en el club y sus canchas.
        </p>

        {/* Búsqueda */}
        <label className="relative mt-6 block max-w-sm">
          <span className="sr-only">Buscar disciplina</span>
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre…"
            className="w-full rounded-xl border border-border bg-surface py-2.5 pl-10 pr-3 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none"
          />
        </label>

        {/* Listado */}
        {isLoading ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-2xl border border-border bg-surface p-5"
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-surface-2" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-24 rounded bg-surface-2" />
                    <div className="h-4 w-full rounded bg-surface-2" />
                    <div className="h-3 w-16 rounded bg-surface-2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtradas.length === 0 ? (
          <p className="mt-8 rounded-xl border border-dashed border-border bg-surface-2 px-4 py-10 text-center text-sm text-text-secondary">
            {search.trim()
              ? `No se encontraron disciplinas que coincidan con "${search.trim()}".`
              : "No hay disciplinas disponibles en este momento."}
          </p>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtradas.map((disciplina) => {
              const totalCanchas = courtCount(disciplina);
              return (
                <Link
                  key={disciplina.id}
                  href={`/disciplines/${disciplina.id}`}
                  className="group rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-primary/50 hover:bg-surface-2"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <IconTrophy className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="font-semibold text-text-primary group-hover:text-primary">
                        {disciplina.nombre}
                      </h2>
                      {disciplina.descripcion && (
                        <p className="mt-1 text-sm text-text-secondary line-clamp-2">
                          {disciplina.descripcion}
                        </p>
                      )}
                      <p className="mt-2 text-xs font-medium text-text-secondary">
                        {totalCanchas}{" "}
                        {totalCanchas === 1
                          ? "cancha disponible"
                          : "canchas disponibles"}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}