"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AuthenticatedLayout, StatusBadge } from "@/components";
import { useAuth } from "@/lib/auth-provider";
import { api } from "@/lib/http-client";
import { normalizePerfil } from "@/lib/api-mappers";
import { formatDate } from "@/lib/format";
import type { PerfilUsuario } from "@/lib/types";
import { IconUser, IconMail, IconPhone, IconCalendar, IconEdit } from "@/components/icons";

export default function ProfilePage() {
  const { user } = useAuth();

  const { data: perfil, isLoading } = useQuery<PerfilUsuario>({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const raw = await api.get<unknown>("/profile");
      return normalizePerfil(raw);
    },
    enabled: Boolean(user?.id),
  });

  return (
    <AuthenticatedLayout>
      <div className="py-8 sm:py-12">
        {/* Encabezado */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary sm:text-3xl">
              Mi Perfil
            </h1>
            <p className="mt-2 text-text-secondary">
              Consultá tus datos personales y estado de cuenta.
            </p>
          </div>
          <Link
            href="/profile/edit"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            <IconEdit className="h-4 w-4" />
            Editar perfil
          </Link>
        </div>

        {/* Contenido */}
        {isLoading ? (
          <div className="mt-8 animate-pulse space-y-4">
            <div className="h-48 rounded-2xl bg-surface-2" />
          </div>
        ) : perfil ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {/* Tarjeta principal */}
            <div className="lg:col-span-2 rounded-2xl border border-border bg-surface p-6">
              <div className="flex items-center gap-4">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <IconUser className="h-8 w-8" />
                </span>
                <div>
                  <h2 className="text-xl font-semibold text-text-primary">
                    {perfil.nombre} {perfil.apellido}
                  </h2>
                  <p className="text-sm text-text-secondary">{perfil.email}</p>
                  <div className="mt-2">
                    <StatusBadge status={perfil.rol} />
                    <span className="ml-2">
                      <StatusBadge status={perfil.estado} />
                    </span>
                  </div>
                </div>
              </div>

              <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 p-3">
                  <IconMail className="h-5 w-5 shrink-0 text-text-secondary" />
                  <div className="min-w-0">
                    <dt className="text-xs font-medium text-text-secondary">Email</dt>
                    <dd className="truncate text-sm text-text-primary">{perfil.email || "—"}</dd>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 p-3">
                  <IconPhone className="h-5 w-5 shrink-0 text-text-secondary" />
                  <div className="min-w-0">
                    <dt className="text-xs font-medium text-text-secondary">Teléfono</dt>
                    <dd className="truncate text-sm text-text-primary">{perfil.telefono || "—"}</dd>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 p-3">
                  <IconCalendar className="h-5 w-5 shrink-0 text-text-secondary" />
                  <div className="min-w-0">
                    <dt className="text-xs font-medium text-text-secondary">Fecha de nacimiento</dt>
                    <dd className="truncate text-sm text-text-primary">
                      {perfil.fecha_nacimiento ? formatDate(perfil.fecha_nacimiento) : "—"}
                    </dd>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 p-3">
                  <IconUser className="h-5 w-5 shrink-0 text-text-secondary" />
                  <div className="min-w-0">
                    <dt className="text-xs font-medium text-text-secondary">DNI / CUIL</dt>
                    <dd className="truncate text-sm text-text-primary">
                      {perfil.dni}
                      {perfil.cuil ? ` / ${perfil.cuil}` : ""}
                    </dd>
                  </div>
                </div>
              </dl>
            </div>

            {/* Contactos */}
            <div className="rounded-2xl border border-border bg-surface p-6">
              <h3 className="font-semibold text-text-primary">Contactos</h3>
              {perfil.contactos.length === 0 ? (
                <p className="mt-3 text-sm text-text-secondary">Sin contactos registrados.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {perfil.contactos.map((c, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
                    >
                      <span className="font-medium text-text-primary capitalize">
                        {(c.tipo || c.tipo_contacto || "").toLowerCase()}
                      </span>
                      <span className="text-text-secondary">{c.valor || c.valor_contacto}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-8 rounded-xl border border-dashed border-border bg-surface-2 px-4 py-10 text-center text-sm text-text-secondary">
            No se pudo cargar la información del perfil.
          </p>
        )}
      </div>
    </AuthenticatedLayout>
  );
}