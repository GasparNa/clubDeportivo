import { cn } from "@/lib/cn";

export type BadgeTone = "success" | "warning" | "error" | "info";

const TONE_CLASSES: Record<BadgeTone, string> = {
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  error: "bg-error/15 text-error",
  info: "bg-info/15 text-info",
};

const DOT_CLASSES: Record<BadgeTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-error",
  info: "bg-info",
};

/** Mapeo de estados de dominio → tono semántico (docs/colores.md + design.md). */
export const STATUS_TONE: Record<string, BadgeTone> = {
  CONFIRMADA: "success",
  COMPLETADA: "success",
  COMPLETADO: "success",
  DEVUELTO: "success",
  APROBADA: "success",
  ACTIVO: "success",
  DISPONIBLE: "success",
  PENDIENTE: "warning",
  DEVUELTO_TARDE: "warning",
  CANCELADA: "error",
  SUSPENDIDO: "error",
  NO_DEVUELTO: "error",
  RECHAZADA: "error",
  MANTENIMIENTO: "error",
  INACTIVO: "error",
  FALLIDO: "error",
  EN_CURSO: "info",
  REEMBOLSADO: "info",
  AUTOGESTIONADA: "info",
  MANUAL_GERENCIA: "info",
  SOCIO: "info",
  GERENTE: "info",
  ADMINISTRADOR: "info",
  INVITADO: "info",
};

const STATUS_LABEL: Record<string, string> = {
  CONFIRMADA: "Confirmada",
  EN_CURSO: "En curso",
  COMPLETADA: "Completada",
  CANCELADA: "Cancelada",
  PENDIENTE: "Pendiente",
  COMPLETADO: "Completado",
  FALLIDO: "Fallido",
  REEMBOLSADO: "Reembolsado",
  DEVUELTO: "Devuelto",
  DEVUELTO_TARDE: "Devuelto tarde",
  NO_DEVUELTO: "No devuelto",
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
  ACTIVO: "Activo",
  INACTIVO: "Inactivo",
  SUSPENDIDO: "Suspendido",
  DISPONIBLE: "Disponible",
  MANTENIMIENTO: "Mantenimiento",
  AUTOGESTIONADA: "Autogestionada",
  MANUAL_GERENCIA: "Manual gerencia",
  SOCIO: "Socio",
  GERENTE: "Gerente",
  ADMINISTRADOR: "Administrador",
  INVITADO: "Invitado",
};

function humanize(status: string): string {
  return STATUS_LABEL[status] ?? status.replace(/_/g, " ").toLowerCase();
}

interface StatusBadgeProps {
  status: string;
  tone?: BadgeTone;
  label?: string;
  className?: string;
}

export function StatusBadge({ status, tone, label, className }: StatusBadgeProps) {
  const resolvedTone = tone ?? STATUS_TONE[status] ?? "info";
  const resolvedLabel = label ?? humanize(status);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
        TONE_CLASSES[resolvedTone],
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", DOT_CLASSES[resolvedTone])} aria-hidden="true" />
      {resolvedLabel}
    </span>
  );
}
