"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PublicLayout, StatusBadge } from "@/components";
import { api } from "@/lib/http-client";
import { normalizeDisciplina } from "@/lib/api-mappers";
import { formatCurrency } from "@/lib/format";
import type { Disciplina } from "@/lib/types";
import { IconChevronLeft, IconLandmark } from "@/components/icons";

export default function DisciplineDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: disciplina, isLoading } = useQuery<Disciplina>({
    queryKey: ["disciplines", id],
    queryFn: () =>
      api.get<unknown>(`/disciplines/${id}`).then(normalizeDisciplina),
    enabled: Boolean(id),
  });

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="animate-pulse py-8 sm:py-12">
          <div className="mb-6 h-6 w-24 rounded bg-surface-2" />
          <div className="mb-2 h-8 w-64 rounded bg-surface-2" />
          <div className="mb-8 h-5 w-full max-w-md rounded bg-surface-2" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-surface-2" />
            ))}
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (!disciplina) {
    return (
      <PublicLayout>
        <div className="py-16 text-center">
          <h1 className="text-2xl font-semibold text-text-primary">
            Disciplina no encontrada
          </h1>
          <p className="mt-2 text-text-secondary">
            La disciplina que buscás no existe o fue desactivada.
          </p>
          <Link
            href="/disciplines"
            className="mt-6 inline-block rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-surface transition-colors hover:bg-primary-hover"
          >
            Ver todas las disciplinas
          </Link>
        </div>
      </PublicLayout>
    );
  }

  const canchasActivas = (disciplina.canchas ?? []).filter(
    (c) => c.estado !== "INACTIVO"
  );

  return (
    <PublicLayout>
      <div className="py-8 sm:py-12">
        {/* Breadcrumb */}
        <Link
          href="/disciplines"
          className="mb-4 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-primary"
        >
          <IconChevronLeft className="h-4 w-4" />
          Todas las disciplinas
        </Link>

        {/* Info disciplina */}
        <h1 className="text-2xl font-semibold text-text-primary sm:text-3xl">
          {disciplina.nombre}
        </h1>
        {disciplina.descripcion && (
          <p className="mt-2 max-w-2xl text-text-secondary">
            {disciplina.descripcion}
          </p>
        )}

        {/* Canchas */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold text-text-primary">
            Canchas ({canchasActivas.length})
          </h2>

          {canchasActivas.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-border bg-surface-2 px-4 py-8 text-center text-sm text-text-secondary">
              No hay canchas disponibles para esta disciplina en este momento.
            </p>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {canchasActivas.map((cancha) => (
                <article
                  key={cancha.id}
                  className="rounded-2xl border border-border bg-surface p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <IconLandmark className="h-5 w-5" />
                      </span>
                      <div>
                        <h3 className="font-semibold text-text-primary">
                          {cancha.nombre}
                        </h3>
                        {cancha.superficie && (
                          <p className="mt-1 text-sm capitalize text-text-secondary">
                            {cancha.superficie.replace(/_/g, " ")}
                          </p>
                        )}
                      </div>
                    </div>
                    <StatusBadge status={cancha.estado} />
                  </div>
                  <p className="mt-4 text-lg font-semibold text-secondary">
                    {formatCurrency(cancha.precio_base)}
                    <span className="text-sm font-normal text-text-secondary">
                      {" "}
                      / turno
                    </span>
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* CTA */}
        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href={`/availability?discipline_id=${disciplina.id}`}
            className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-surface transition-colors hover:bg-primary-hover"
          >
            Ver disponibilidad
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-border bg-surface px-5 py-3 text-sm font-semibold text-text-primary hover:bg-surface-2"
          >
            Iniciar sesión para reservar
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
}