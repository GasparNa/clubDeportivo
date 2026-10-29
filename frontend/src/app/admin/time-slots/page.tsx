"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { DataTable, StatusBadge, type DataTableColumn, type DataTableFilter } from "@/components";
import { api } from "@/lib/http-client";
import { formatDateTime } from "@/lib/format";
import type { FranjaHoraria, CreateFranjaHorariaRequest, Cancha } from "@/lib/types";

const DIA_SEMANA_LABELS: Record<number, string> = {
  0: "Domingo",
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
};

export default function AdminTimeSlotsPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<FranjaHoraria | null>(null);

  const { data: timeSlots = [], isLoading } = useQuery<FranjaHoraria[]>({
    queryKey: ["admin-time-slots"],
    queryFn: () => api.get("/time-slots"),
  });

  const { data: courts = [] } = useQuery<Cancha[]>({
    queryKey: ["admin-courts"],
    queryFn: () => api.get("/courts"),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateFranjaHorariaRequest) => api.post("/time-slots", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-time-slots"] });
      setShowModal(false);
      setFormError(null);
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/time-slots/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-time-slots"] });
      setDeleteConfirm(null);
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const columns: DataTableColumn<FranjaHoraria>[] = [
    {
      id: "cancha",
      header: "Cancha",
      cell: (row) => (
        <div>
          <p className="font-medium text-text-primary">
            {row.cancha?.nombre || "—"}
          </p>
          <p className="text-xs text-text-secondary">
            {row.cancha?.disciplina?.nombre || ""}
          </p>
        </div>
      ),
      sortAccessor: (row) => row.cancha?.nombre || "",
    },
    {
      id: "dia_semana",
      header: "Día",
      cell: (row) => DIA_SEMANA_LABELS[row.dia_semana] ?? `Día ${row.dia_semana}`,
      sortAccessor: (row) => row.dia_semana,
    },
    {
      id: "horario",
      header: "Horario",
      cell: (row) => (
        <span className="text-sm">
          {row.hora_inicio} – {row.hora_fin}
        </span>
      ),
      sortAccessor: (row) => row.hora_inicio,
    },
    {
      id: "estado",
      header: "Estado",
      cell: (row) => <StatusBadge status={row.estado || "ACTIVO"} />,
      sortAccessor: (row) => row.estado || "ACTIVO",
    },
    {
      id: "creado_en",
      header: "Creada",
      cell: (row) => formatDateTime(row.creado_en || ""),
      sortAccessor: (row) => row.creado_en || "",
    },
    {
      id: "acciones",
      header: "Acciones",
      cell: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setDeleteConfirm(row);
          }}
          className="rounded-lg p-1.5 text-text-secondary hover:bg-surface-2 hover:text-error transition-colors"
          aria-label={`Eliminar franja`}
          title="Eliminar"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      ),
    },
  ];

  const filters: DataTableFilter<FranjaHoraria>[] = [
    {
      id: "cancha",
      label: "Cancha",
      options: courts.map((c) => ({
        value: c.id || c.id_cancha || "",
        label: c.nombre,
      })),
      accessor: (row) => row.id_cancha,
    },
    {
      id: "dia_semana",
      label: "Día",
      options: Object.entries(DIA_SEMANA_LABELS).map(([value, label]) => ({
        value,
        label,
      })),
      accessor: (row) => String(row.dia_semana),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Gestión de Franjas Horarias</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Creá y eliminá franjas horarias para cada cancha.
          </p>
        </div>
        <button
          onClick={() => {
            setShowModal(true);
            setFormError(null);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nueva Franja
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-text-secondary">Cargando franjas horarias…</p>
        </div>
      ) : (
        <DataTable
          data={timeSlots}
          columns={columns}
          getRowId={(row) => row.id || row.id_franja || ""}
          filters={filters}
          searchAccessor={(row) =>
            `${row.cancha?.nombre || ""} ${DIA_SEMANA_LABELS[row.dia_semana] || ""} ${row.hora_inicio} ${row.hora_fin}`
          }
          searchPlaceholder="Buscar por cancha, día u horario…"
          emptyMessage="No hay franjas horarias registradas. ¡Creá la primera!"
        />
      )}

      {/* Modal Crear */}
      {showModal && (
        <TimeSlotModal
          courts={courts}
          formError={formError}
          isPending={createMutation.isPending}
          onClose={() => {
            setShowModal(false);
            setFormError(null);
          }}
          onSubmit={(data) => createMutation.mutate(data)}
        />
      )}

      {/* Modal Confirmación Eliminar */}
      {deleteConfirm && (
        <DeleteConfirmModal
          title="Eliminar Franja Horaria"
          message={`¿Estás seguro de que querés eliminar la franja de ${DIA_SEMANA_LABELS[deleteConfirm.dia_semana]} ${deleteConfirm.hora_inicio}–${deleteConfirm.hora_fin}?`}
          isPending={deleteMutation.isPending}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={() => deleteMutation.mutate(deleteConfirm.id || deleteConfirm.id_franja || "")}
        />
      )}
    </div>
  );
}

function TimeSlotModal({
  courts,
  formError,
  isPending,
  onClose,
  onSubmit,
}: {
  courts: Cancha[];
  formError: string | null;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (data: CreateFranjaHorariaRequest) => void;
}) {
  const [idCancha, setIdCancha] = useState("");
  const [diaSemana, setDiaSemana] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!idCancha || !diaSemana || !horaInicio || !horaFin) return;

    onSubmit({
      id_cancha: idCancha,
      dia_semana: Number(diaSemana),
      hora_inicio: horaInicio,
      hora_fin: horaFin,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-text-primary">Nueva Franja Horaria</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="cancha" className="block text-sm font-medium text-text-primary">
              Cancha <span className="text-error">*</span>
            </label>
            <select
              id="cancha"
              value={idCancha}
              onChange={(e) => setIdCancha(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Seleccionar cancha…</option>
              {courts.map((c) => (
                <option key={c.id || c.id_cancha} value={c.id || c.id_cancha}>
                  {c.nombre} {c.disciplina ? `(${c.disciplina.nombre})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="dia" className="block text-sm font-medium text-text-primary">
              Día de la semana <span className="text-error">*</span>
            </label>
            <select
              id="dia"
              value={diaSemana}
              onChange={(e) => setDiaSemana(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Seleccionar día…</option>
              {Object.entries(DIA_SEMANA_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="horaInicio" className="block text-sm font-medium text-text-primary">
                Hora inicio <span className="text-error">*</span>
              </label>
              <input
                id="horaInicio"
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="horaFin" className="block text-sm font-medium text-text-primary">
                Hora fin <span className="text-error">*</span>
              </label>
              <input
                id="horaFin"
                type="time"
                value={horaFin}
                onChange={(e) => setHoraFin(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {formError && (
            <div className="rounded-lg border border-error/30 bg-error/5 p-3 text-sm text-error">
              {formError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-2 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || !idCancha || !diaSemana || !horaInicio || !horaFin}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              {isPending ? "Creando…" : "Crear Franja"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteConfirmModal({
  title,
  message,
  isPending,
  onClose,
  onConfirm,
}: {
  title: string;
  message: string;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-error/15">
            <svg className="h-5 w-5 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
            <p className="mt-1 text-sm text-text-secondary">{message}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-2 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="rounded-lg bg-error px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-error/80 disabled:opacity-50"
          >
            {isPending ? "Eliminando…" : "Eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}