"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { AuthenticatedLayout } from "@/components";
import { useAuth } from "@/lib/auth-provider";
import { api } from "@/lib/http-client";
import { normalizePerfil } from "@/lib/api-mappers";
import type { PerfilUsuario, UpdatePerfilRequest } from "@/lib/types";
import { IconChevronLeft, IconSave } from "@/components/icons";

export default function EditProfilePage() {
  const router = useRouter();
  const { user } = useAuth();

  const { data: perfil, isLoading } = useQuery<PerfilUsuario>({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const raw = await api.get<unknown>("/profile");
      return normalizePerfil(raw);
    },
    enabled: Boolean(user?.id),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<UpdatePerfilRequest>();

  useEffect(() => {
    if (perfil) {
      reset({
        nombre: perfil.nombre,
        apellido: perfil.apellido,
        email: perfil.email,
        telefono: perfil.telefono,
      });
    }
  }, [perfil, reset]);

  const mutation = useMutation({
    mutationFn: (data: UpdatePerfilRequest) =>
      api.put<PerfilUsuario>("/profile", data),
    onSuccess: () => {
      router.push("/profile");
    },
  });

  const onSubmit = (data: UpdatePerfilRequest) => {
    mutation.mutate(data);
  };

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
              Editar Perfil
            </h1>
            <p className="mt-1 text-text-secondary">
              Modificá tus datos personales.
            </p>
          </div>
        </div>

        {/* Formulario */}
        {isLoading ? (
          <div className="mt-8 animate-pulse space-y-4">
            <div className="h-64 rounded-2xl bg-surface-2" />
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="mt-8 max-w-lg rounded-2xl border border-border bg-surface p-6"
          >
            {mutation.isError && (
              <div className="mb-6 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
                {(mutation.error as Error)?.message || "Error al guardar los cambios."}
              </div>
            )}

            <div className="space-y-5">
              {/* Nombre */}
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-text-primary">Nombre</span>
                <input
                  type="text"
                  {...register("nombre", { required: "El nombre es obligatorio" })}
                  className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none"
                  placeholder="Tu nombre"
                />
                {errors.nombre && (
                  <span className="text-xs text-error">{errors.nombre.message}</span>
                )}
              </label>

              {/* Apellido */}
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-text-primary">Apellido</span>
                <input
                  type="text"
                  {...register("apellido", { required: "El apellido es obligatorio" })}
                  className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none"
                  placeholder="Tu apellido"
                />
                {errors.apellido && (
                  <span className="text-xs text-error">{errors.apellido.message}</span>
                )}
              </label>

              {/* Email */}
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-text-primary">Email</span>
                <input
                  type="email"
                  {...register("email", {
                    required: "El email es obligatorio",
                    pattern: { value: /^\S+@\S+$/i, message: "Email inválido" },
                  })}
                  className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none"
                  placeholder="tu@email.com"
                />
                {errors.email && (
                  <span className="text-xs text-error">{errors.email.message}</span>
                )}
              </label>

              {/* Teléfono */}
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-text-primary">Teléfono</span>
                <input
                  type="tel"
                  {...register("telefono")}
                  className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none"
                  placeholder="+54 11 1234-5678"
                />
              </label>
            </div>

            {/* Acciones */}
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-2"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!isDirty || mutation.isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
              >
                <IconSave className="h-4 w-4" />
                {mutation.isPending ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </form>
        )}
      </div>
    </AuthenticatedLayout>
  );
}