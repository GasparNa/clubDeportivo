"use client";

import Link from "next/link";
import { IconAlertTriangle } from "@/components/icons";
import { StatusBadge } from "@/components/status-badge";
import type { UserStatus } from "@/lib/types";

const MENSAJE_PENDIENTE =
  "Tu cuenta está pendiente de aprobación. Mientras tanto podés ver tu perfil, pero todavía no podés reservar.";
const MENSAJE_NO_ACTIVA =
  "Tu cuenta no está activa. Mientras tanto podés ver tu perfil, pero todavía no podés reservar. Comunicate con el club.";

interface AvisoCuentaPendienteProps {
  estado?: UserStatus;
}

export function AvisoCuentaPendiente({ estado }: AvisoCuentaPendienteProps) {
  const estadoVisible = estado ?? "INACTIVO";
  const mensaje = estadoVisible === "PENDIENTE" ? MENSAJE_PENDIENTE : MENSAJE_NO_ACTIVA;

  return (
    <section
      role="status"
      aria-label="Estado de la cuenta"
      className="mt-8 rounded-2xl border border-warning/30 bg-warning/10 p-6"
    >
      <div className="flex flex-wrap items-start gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning/15 text-warning">
          <IconAlertTriangle className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold text-text-primary">Cuenta no activa</h2>
            <StatusBadge status={estadoVisible} />
          </div>
          <p className="mt-2 text-sm text-text-secondary">{mensaje}</p>
          <Link
            href="/profile"
            className="mt-4 inline-flex items-center text-sm font-semibold text-primary hover:underline"
          >
            Mi perfil
          </Link>
        </div>
      </div>
    </section>
  );
}
