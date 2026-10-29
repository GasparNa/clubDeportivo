"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PublicLayout } from "@/components";
import { api } from "@/lib/http-client";
import { courtCount, isVisibleEntity, normalizeDisciplina } from "@/lib/api-mappers";
import type { Disciplina } from "@/lib/types";
import { IconTrophy } from "@/components/icons";

export default function Home() {
  const { data: disciplinas } = useQuery<Disciplina[]>({
    queryKey: ["disciplines"],
    queryFn: () =>
      api
        .get<unknown[]>("/disciplines")
        .then((list) => list.map(normalizeDisciplina)),
  });

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="flex flex-col items-start gap-6 py-10 sm:py-16">
        <p className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
          Tenis · Fútbol · Pádel
        </p>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-text-primary sm:text-5xl">
          Reservá tu cancha en el Club Deportivo
        </h1>
        <p className="max-w-xl text-lg text-text-secondary">
          Consultá disponibilidad, gestioná turnos y alquilá equipamiento. Un gerente aprueba tu
          cuenta y ya podés jugar.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-surface transition-colors hover:bg-primary-hover"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/register"
            className="rounded-xl border border-border bg-surface px-5 py-3 text-sm font-semibold text-text-primary hover:bg-surface-2"
          >
            Registrarse
          </Link>
          <Link
            href="/availability"
            className="rounded-xl px-5 py-3 text-sm font-semibold text-primary hover:bg-primary/10"
          >
            Ver disponibilidad
          </Link>
        </div>
      </section>

      {/* Disciplinas destacadas */}
      {disciplinas && disciplinas.length > 0 && (
        <section className="py-8">
          <h2 className="mb-6 text-2xl font-semibold text-text-primary">
            Disciplinas disponibles
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {disciplinas
              .filter(isVisibleEntity)
              .map((disciplina) => {
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
                        <h3 className="font-semibold text-text-primary group-hover:text-primary">
                          {disciplina.nombre}
                        </h3>
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
        </section>
      )}

      {/* ¿Cómo funciona? */}
      <section className="py-8">
        <h2 className="mb-6 text-2xl font-semibold text-text-primary">¿Cómo funciona?</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { step: "1", title: "Registrate", body: "Completá tus datos y enviá la solicitud." },
            { step: "2", title: "Te aprueban", body: "Un gerente revisa y activa tu cuenta." },
            { step: "3", title: "Reservá", body: "Elegí disciplina, cancha y franja horaria." },
          ].map((item) => (
            <article key={item.step} className="rounded-2xl border border-border bg-surface p-5">
              <span className="text-sm font-bold text-primary">Paso {item.step}</span>
              <h3 className="mt-2 text-lg font-semibold text-text-primary">{item.title}</h3>
              <p className="mt-1 text-sm text-text-secondary">{item.body}</p>
            </article>
          ))}
        </div>
      </section>
    </PublicLayout>
  );
}
