"use client";

import { cn } from "@/lib/cn";
import { formatTime } from "@/lib/format";
import type { TimeSlotAvailability } from "@/lib/types";

interface TimeSlotGridProps {
  slots: TimeSlotAvailability[];
  selectedId?: string | null;
  onSelect?: (slot: TimeSlotAvailability) => void;
  disabled?: boolean;
  className?: string;
  emptyMessage?: string;
}

export function TimeSlotGrid({
  slots,
  selectedId,
  onSelect,
  disabled = false,
  className,
  emptyMessage = "No hay franjas horarias para esta fecha.",
}: TimeSlotGridProps) {
  if (slots.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-surface-2 px-4 py-8 text-center text-sm text-text-secondary">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-text-secondary">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-success" aria-hidden="true" />
          Libre
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-error" aria-hidden="true" />
          Ocupada
        </span>
      </div>

      <div
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
        role="listbox"
        aria-label="Franjas horarias"
      >
        {slots.map((slot) => {
          const selected = selectedId === slot.id_franja;
          const interactive = Boolean(onSelect) && slot.disponible && !disabled;
          const label = `${formatTime(slot.hora_inicio)} – ${formatTime(slot.hora_fin)}`;

          const classes = cn(
            "rounded-xl border px-3 py-3 text-left text-sm transition-colors",
            slot.disponible
              ? "border-success/40 bg-success/10 text-success"
              : "cursor-not-allowed border-error/40 bg-error/10 text-error",
            selected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
            interactive && "hover:bg-success/20",
            disabled && "opacity-60",
          );

          if (interactive) {
            return (
              <button
                key={slot.id_franja}
                type="button"
                role="option"
                aria-selected={selected}
                aria-label={`${label}, libre`}
                className={classes}
                onClick={() => onSelect?.(slot)}
              >
                <span className="block font-semibold">{label}</span>
                <span className="mt-1 block text-xs opacity-80">Libre</span>
              </button>
            );
          }

          return (
            <div
              key={slot.id_franja}
              role="option"
              aria-selected={selected}
              aria-disabled="true"
              aria-label={`${label}, ${slot.disponible ? "libre" : "ocupada"}`}
              className={classes}
            >
              <span className="block font-semibold">{label}</span>
              <span className="mt-1 block text-xs opacity-80">
                {slot.disponible ? "Libre" : "Ocupada"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
