import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { formatCurrency, formatDate, formatTime } from "@/lib/format";
import type { Reserva, ReservationOrigin, ReservationStatus } from "@/lib/types";
import { IconCalendar, IconClock, IconMapPin } from "./icons";
import { StatusBadge } from "./status-badge";

export interface ReservationCardData {
  id: string;
  fecha: string;
  disciplina: string;
  cancha: string;
  horaInicio: string;
  horaFin: string;
  estado: ReservationStatus;
  origen?: ReservationOrigin;
  monto?: number;
}

export function reservationToCardData(reserva: Reserva): ReservationCardData {
  const pagos = reserva.pagos ?? [];
  const monto = pagos.length > 0 ? pagos.reduce((sum, pago) => sum + pago.monto, 0) : undefined;

  return {
    id: reserva.id,
    fecha: reserva.fecha,
    disciplina: reserva.franja?.cancha?.disciplina?.nombre ?? "—",
    cancha: reserva.franja?.cancha?.nombre ?? "—",
    horaInicio: reserva.franja?.hora_inicio ?? "",
    horaFin: reserva.franja?.hora_fin ?? "",
    estado: reserva.estado,
    origen: reserva.origen,
    monto,
  };
}

interface ReservationCardProps {
  reserva: ReservationCardData | Reserva;
  href?: string;
  className?: string;
  actions?: ReactNode;
}

function isReserva(value: ReservationCardData | Reserva): value is Reserva {
  return "id_franja" in value;
}

export function ReservationCard({ reserva, href, className, actions }: ReservationCardProps) {
  const data = isReserva(reserva) ? reservationToCardData(reserva) : reserva;
  const horario =
    data.horaInicio && data.horaFin
      ? `${formatTime(data.horaInicio)} – ${formatTime(data.horaFin)}`
      : "Horario no disponible";

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-text-primary">
            {data.disciplina}
            <span className="text-text-secondary"> · </span>
            {data.cancha}
          </p>
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-text-secondary">
            <IconMapPin className="h-4 w-4" />
            {data.cancha}
          </p>
        </div>
        <StatusBadge status={data.estado} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2 text-text-secondary">
          <IconCalendar className="h-4 w-4 shrink-0" />
          <span>{formatDate(data.fecha)}</span>
        </div>
        <div className="flex items-center gap-2 text-text-secondary">
          <IconClock className="h-4 w-4 shrink-0" />
          <span>{horario}</span>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {data.origen ? <StatusBadge status={data.origen} /> : null}
          {typeof data.monto === "number" ? (
            <span className="text-sm font-semibold text-secondary">{formatCurrency(data.monto)}</span>
          ) : null}
        </div>
        {actions}
      </div>
    </>
  );

  const cardClass = cn(
    "block rounded-2xl border border-border bg-surface p-4 shadow-sm transition-colors",
    href && "hover:border-primary/50 hover:bg-surface-2",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={cardClass}>
        {content}
      </Link>
    );
  }

  return <article className={cardClass}>{content}</article>;
}
