"use client";

import { useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { IconChevronLeft, IconChevronRight, IconSearch, IconSort } from "./icons";

export interface DataTableColumn<T> {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  sortAccessor?: (row: T) => string | number | Date | null | undefined;
  className?: string;
}

export interface DataTableFilter<T> {
  id: string;
  label: string;
  options: { value: string; label: string }[];
  accessor: (row: T) => string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  getRowId: (row: T) => string;
  filters?: DataTableFilter<T>[];
  searchAccessor?: (row: T) => string;
  searchPlaceholder?: string;
  pageSize?: number;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  toolbar?: ReactNode;
}

type SortDir = "asc" | "desc";

export function DataTable<T>({
  data,
  columns,
  getRowId,
  filters = [],
  searchAccessor,
  searchPlaceholder = "Buscar…",
  pageSize = 10,
  onRowClick,
  emptyMessage = "No hay registros para mostrar.",
  toolbar,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<{ id: string; dir: SortDir } | null>(null);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return data.filter((row) => {
      const matchesSearch =
        !query ||
        (searchAccessor
          ? searchAccessor(row).toLowerCase().includes(query)
          : columns.some((col) => {
              const value = col.sortAccessor?.(row);
              return value != null && String(value).toLowerCase().includes(query);
            }));

      const matchesFilters = filters.every((filter) => {
        const selected = filterValues[filter.id];
        if (!selected) return true;
        return filter.accessor(row) === selected;
      });

      return matchesSearch && matchesFilters;
    });
  }, [columns, data, filterValues, filters, search, searchAccessor]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const column = columns.find((col) => col.id === sort.id);
    if (!column?.sortAccessor) return filtered;

    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = column.sortAccessor?.(a);
      const bv = column.sortAccessor?.(b);
      const aVal = av instanceof Date ? av.getTime() : (av ?? "");
      const bVal = bv instanceof Date ? bv.getTime() : (bv ?? "");
      if (aVal < bVal) return sort.dir === "asc" ? -1 : 1;
      if (aVal > bVal) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });
    return copy;
  }, [columns, filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pageRows = sorted.slice(start, start + pageSize);

  function toggleSort(column: DataTableColumn<T>) {
    if (!column.sortAccessor) return;
    setPage(1);
    setSort((prev) => {
      if (prev?.id !== column.id) return { id: column.id, dir: "asc" };
      if (prev.dir === "asc") return { id: column.id, dir: "desc" };
      return null;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative block min-w-0 flex-1">
          <span className="sr-only">Buscar</span>
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder={searchPlaceholder}
            className="w-full rounded-xl border border-border bg-surface py-2.5 pl-10 pr-3 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none"
          />
        </label>

        {filters.map((filter) => (
          <label key={filter.id} className="flex min-w-[10rem] flex-col gap-1 text-xs font-medium text-text-secondary">
            {filter.label}
            <select
              value={filterValues[filter.id] ?? ""}
              onChange={(event) => {
                setFilterValues((prev) => ({ ...prev, [filter.id]: event.target.value }));
                setPage(1);
              }}
              className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none"
            >
              <option value="">Todos</option>
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ))}

        {toolbar}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface-2 text-text-secondary">
              <tr>
                {columns.map((column) => {
                  const sortable = Boolean(column.sortAccessor);
                  const ariaSort =
                    sort?.id === column.id ? (sort.dir === "asc" ? "ascending" : "descending") : "none";
                  return (
                    <th key={column.id} scope="col" aria-sort={sortable ? ariaSort : undefined} className={cn("px-4 py-3 font-semibold", column.className)}>
                      {sortable ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(column)}
                          className="inline-flex items-center gap-1 hover:text-text-primary"
                        >
                          {column.header}
                          <IconSort className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        column.header
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-10 text-center text-text-secondary">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                pageRows.map((row) => (
                  <tr
                    key={getRowId(row)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(
                      "border-t border-border",
                      onRowClick && "cursor-pointer hover:bg-surface-2",
                    )}
                  >
                    {columns.map((column) => (
                      <td key={column.id} className={cn("px-4 py-3 text-text-primary", column.className)}>
                        {column.cell(row)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-text-secondary sm:flex-row">
          <p>
            Mostrando {sorted.length === 0 ? 0 : start + 1}–{Math.min(start + pageSize, sorted.length)} de{" "}
            {sorted.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Página anterior"
              disabled={currentPage <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border disabled:opacity-40"
            >
              <IconChevronLeft className="h-4 w-4" />
            </button>
            <span>
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              aria-label="Página siguiente"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border disabled:opacity-40"
            >
              <IconChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
