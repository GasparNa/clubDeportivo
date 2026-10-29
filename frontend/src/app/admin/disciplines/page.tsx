"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { DataTable, StatusBadge, type DataTableColumn } from "@/components";
import { api } from "@/lib/http-client";
import { formatDateTime } from "@/lib/format";
import type { Disciplina, CreateDisciplinaRequest, UpdateDisciplinaRequest } from "@/lib/types";

export default function AdminDisciplinesPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Disciplina | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Disciplina | null>(null);

  const { data: disciplines = [], isLoading } = useQuery<Disciplina[]>({
    queryKey: ["admin-disciplines"],
    queryFn: () => api.get("/disciplines"),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateDisciplinaRequest) => api.post("/disciplines", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-disciplines"] });
      setShowModal(false);
      setFormError(null);
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDisciplinaRequest }) =>
      api.put(`/disciplines/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-disciplines"] });
      setEditing(null);
      setShowModal(false);
      setFormError(null);
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/disciplines/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-disciplines"] });
      setDeleteConfirm(null);
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const columns: DataTableColumn<Disciplina>[] = [
    {
      id: "nombre",
      header: "Nombre",
      cell: (row) => <span className="font-medium text-text-primary">{row.nombre}</span>,
      sortAccessor: (row) => row.nombre,
    },
    {
      id: "descripcion",
      header: "Descripción",
      cell: (row) => (
        <span className="text-sm text-text-secondary line-clamp-2">
          {row.descripcion || "Sin descripción"}
        </span>
      ),
      sortAccessor: (row) => row.descripcion || "",
    },
    {
      id: "canchas",
      header: "Canchas",
      cell: (row) => (
        <span className="text-sm text-text-secondary">
          {row._count?.canchas ?? row.canchas?.length ?? "—"}
        </span>
      ),
      sortAccessor: (row) => String(row._count?.canchas ?? row.canchas?.length ?? 0),
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
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditing(row);
              setShowModal(true);
              setFormError(null);
            }}
            className="rounded-lg p-1.5 text-text-secondary hover:bg-surface-2 hover:text-primary transition-colors"
            aria-label={`Editar ${row.nombre}`}
            title="Editar"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeleteConfirm(row);
            }}
            className="rounded-lg p-1.5 text-text-secondary hover:bg-surface-2 hover:text-error transition-colors"
            aria-label={`Eliminar ${row.nombre}`}
            title="Eliminar"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Gestión de Disciplinas</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Creá, editá y eliminá disciplinas deportivas del club.
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setShowModal(true);
            setFormError(null);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nueva Disciplina
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-text-secondary">Cargando disciplinas…</p>
        </div>
      ) : (
        <DataTable
          data={disciplines}
          columns={columns}
          getRowId={(row) => row.id || row.id_disciplina || ""}
          searchAccessor={(row) => `${row.nombre} ${row.descripcion || ""}`}
          searchPlaceholder="Buscar por nombre o descripción…"
          emptyMessage="No hay disciplinas registradas. ¡Creá la primera!"
        />
      )}

      {/* Modal Crear/Editar */}
      {showModal && (
        <DisciplineModal
          editing={editing}
          formError={formError}
          isPending={createMutation.isPending || updateMutation.isPending}
          onClose={() => {
            setShowModal(false);
            setEditing(null);
            setFormError(null);
          }}
          onSubmit={(data) => {
            if (editing) {
              updateMutation.mutate({ id: editing.id || editing.id_disciplina || "", data });
            } else {
              createMutation.mutate(data as CreateDisciplinaRequest);
            }
          }}
        />
      )}

      {/* Modal Confirmación Eliminar */}
      {deleteConfirm && (
        <DeleteConfirmModal
          title="Eliminar Disciplina"
          message={`¿Estás seguro de que querés eliminar "${deleteConfirm.nombre}"? Esta acción no se puede deshacer.`}
          isPending={deleteMutation.isPending}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={() => deleteMutation.mutate(deleteConfirm.id || deleteConfirm.id_disciplina || "")}
        />
      )}
    </div>
  );
}

function DisciplineModal({
  editing,
  formError,
  isPending,
  onClose,
  onSubmit,
}: {
  editing: Disciplina | null;
  formError: string | null;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (data: CreateDisciplinaRequest | UpdateDisciplinaRequest) => void;
}) {
  const [nombre, setNombre] = useState(editing?.nombre || "");
  const [descripcion, setDescripcion] = useState(editing?.descripcion || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    onSubmit({ nombre: nombre.trim(), descripcion: descripcion.trim() || undefined });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-text-primary">
          {editing ? "Editar Disciplina" : "Nueva Disciplina"}
        </h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="nombre" className="block text-sm font-medium text-text-primary">
              Nombre <span className="text-error">*</span>
            </label>
            <input
              id="nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              placeholder="Ej: Tenis, Fútbol, Pádel"
              className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label htmlFor="descripcion" className="block text-sm font-medium text-text-primary">
              Descripción
            </label>
            <textarea
              id="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              placeholder="Descripción de la disciplina…"
              className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
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
              disabled={isPending || !nombre.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              {isPending ? "Guardando…" : editing ? "Guardar Cambios" : "Crear Disciplina"}
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