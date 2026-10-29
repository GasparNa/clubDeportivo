"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { PublicLayout } from "@/components";
import { useAuth } from "@/lib/auth-provider";
import { getDashboardPath } from "@/lib/navigation";
import { api, ApiError } from "@/lib/http-client";
import type { AuthResponse } from "@/lib/types";

const loginSchema = z.object({
  email: z.string().email("Ingresá un email válido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const mutation = useMutation({
    mutationFn: (data: LoginFormData) =>
      api.post<AuthResponse>("/auth/login", data),
    onSuccess: (response) => {
      const token = response.token ?? response.access_token;
      if (!token) {
        setServerError("Error: no se recibió token de autenticación.");
        return;
      }
      login(token, {
        id: response.usuario.id ?? response.usuario.id_usuario ?? "",
        email: response.usuario.email,
        rol: response.usuario.rol,
        estado: response.usuario.estado,
        nombre: response.usuario.persona?.nombre ?? response.usuario.nombre,
        apellido: response.usuario.persona?.apellido ?? response.usuario.apellido,
      });
      const redirect = searchParams.get("redirect");
      router.push(redirect || getDashboardPath(response.usuario.rol));
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError) {
        if (error.status === 403) {
          setServerError(
            "Tu cuenta está suspendida. Contactá a un gerente para más información."
          );
        } else if (error.status === 401) {
          setServerError("Email o contraseña incorrectos.");
        } else {
          setServerError(error.message || "Error al iniciar sesión.");
        }
      } else {
        setServerError("Error de conexión. Intentá de nuevo.");
      }
    },
  });

  function onSubmit(data: LoginFormData) {
    setServerError(null);
    mutation.mutate(data);
  }

  return (
    <PublicLayout>
      <div className="mx-auto max-w-md py-8 sm:py-16">
        <h1 className="text-2xl font-semibold text-text-primary">Iniciar sesión</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Ingresá con tu email y contraseña para acceder al club.
        </p>

        {serverError && (
          <div role="alert" className="mt-6 rounded-xl border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text-primary">Email</span>
            <input
              type="email"
              autoComplete="email"
              aria-required="true"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
              {...register("email")}
              className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none"
              placeholder="juan@email.com"
            />
            {errors.email && (
              <span id="email-error" role="alert" className="text-xs text-error">{errors.email.message}</span>
            )}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text-primary">Contraseña</span>
            <input
              type="password"
              autoComplete="current-password"
              aria-required="true"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
              {...register("password")}
              className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none"
              placeholder="Tu contraseña"
            />
            {errors.password && (
              <span id="password-error" role="alert" className="text-xs text-error">{errors.password.message}</span>
            )}
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-surface transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            {isSubmitting ? "Ingresando…" : "Iniciar sesión"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-text-secondary">
          ¿No tenés cuenta?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Registrarse
          </Link>
        </p>
      </div>
    </PublicLayout>
  );
}
