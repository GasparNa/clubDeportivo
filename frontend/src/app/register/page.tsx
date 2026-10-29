"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { PublicLayout } from "@/components";
import { api, ApiError } from "@/lib/http-client";
import type { RegisterRequest } from "@/lib/types";

const registerSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  apellido: z.string().min(1, "El apellido es requerido"),
  dni: z
    .string()
    .min(7, "El DNI debe tener al menos 7 caracteres")
    .max(9, "El DNI debe tener como máximo 9 caracteres")
    .regex(/^\d+$/, "El DNI solo puede contener números"),
  cuil: z
    .string()
    .regex(/^\d+$/, "El CUIL solo puede contener números")
    .optional()
    .or(z.literal("")),
  fecha_nacimiento: z.string().optional().or(z.literal("")),
  email: z.string().email("Ingresá un email válido"),
  telefono: z.string().optional().or(z.literal("")),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const mutation = useMutation({
    mutationFn: (data: RegisterRequest) => api.post("/auth/register", data),
    onSuccess: () => {
      setSuccess(true);
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError) {
        setServerError(error.message || "Error al registrar. Revisá los datos.");
      } else {
        setServerError("Error de conexión. Intentá de nuevo.");
      }
    },
  });

  function onSubmit(data: RegisterFormData) {
    setServerError(null);
    const payload: RegisterRequest = {
      nombre: data.nombre,
      apellido: data.apellido,
      dni: data.dni,
      email: data.email,
      password: data.password,
      ...(data.cuil ? { cuil: data.cuil } : {}),
      ...(data.fecha_nacimiento ? { fecha_nacimiento: data.fecha_nacimiento } : {}),
      ...(data.telefono ? { telefono: data.telefono } : {}),
    };
    mutation.mutate(payload);
  }

  if (success) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-md py-16 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-success/15">
            <svg
              className="h-8 w-8 text-success"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-text-primary">¡Solicitud enviada!</h1>
          <p className="mt-3 text-text-secondary">
            Tu solicitud fue enviada. Un gerente la revisará pronto.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-block rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-surface transition-colors hover:bg-primary-hover"
          >
            Ir al inicio de sesión
          </Link>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="mx-auto max-w-md py-8 sm:py-12">
        <h1 className="text-2xl font-semibold text-text-primary">Registrarse</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Completá tus datos para solicitar una cuenta en el club.
        </p>

        {serverError && (
          <div role="alert" className="mt-6 rounded-xl border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
          {/* Nombre y Apellido */}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-text-primary">
                Nombre <span className="text-error" aria-hidden="true">*</span>
              </span>
              <input
                type="text"
                autoComplete="given-name"
                aria-required="true"
                aria-invalid={!!errors.nombre}
                aria-describedby={errors.nombre ? "nombre-error" : undefined}
                {...register("nombre")}
                className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none"
                placeholder="Juan"
              />
              {errors.nombre && (
                <span id="nombre-error" role="alert" className="text-xs text-error">{errors.nombre.message}</span>
              )}
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-text-primary">
                Apellido <span className="text-error" aria-hidden="true">*</span>
              </span>
              <input
                type="text"
                autoComplete="family-name"
                aria-required="true"
                aria-invalid={!!errors.apellido}
                aria-describedby={errors.apellido ? "apellido-error" : undefined}
                {...register("apellido")}
                className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none"
                placeholder="Pérez"
              />
              {errors.apellido && (
                <span id="apellido-error" role="alert" className="text-xs text-error">{errors.apellido.message}</span>
              )}
            </label>
          </div>

          {/* DNI y CUIL */}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-text-primary">
                DNI <span className="text-error" aria-hidden="true">*</span>
              </span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                aria-required="true"
                aria-invalid={!!errors.dni}
                aria-describedby={errors.dni ? "dni-error" : undefined}
                {...register("dni")}
                className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none"
                placeholder="12345678"
              />
              {errors.dni && (
                <span id="dni-error" role="alert" className="text-xs text-error">{errors.dni.message}</span>
              )}
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-text-primary">CUIL</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                {...register("cuil")}
                className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none"
                placeholder="20123456789"
              />
              {errors.cuil && (
                <span id="cuil-error" role="alert" className="text-xs text-error">{errors.cuil.message}</span>
              )}
            </label>
          </div>

          {/* Fecha de nacimiento */}
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text-primary">Fecha de nacimiento</span>
            <input
              type="date"
              {...register("fecha_nacimiento")}
              className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none"
            />
          </label>

          {/* Email */}
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text-primary">
              Email <span className="text-error" aria-hidden="true">*</span>
            </span>
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

          {/* Teléfono */}
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text-primary">Teléfono</span>
            <input
              type="tel"
              autoComplete="tel"
              {...register("telefono")}
              className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none"
              placeholder="+54 11 1234-5678"
            />
          </label>

          {/* Contraseña */}
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text-primary">
              Contraseña <span className="text-error" aria-hidden="true">*</span>
            </span>
            <input
              type="password"
              autoComplete="new-password"
              aria-required="true"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
              {...register("password")}
              className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none"
              placeholder="Mínimo 8 caracteres"
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
            {isSubmitting ? "Enviando solicitud…" : "Registrarse"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-text-secondary">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </PublicLayout>
  );
}