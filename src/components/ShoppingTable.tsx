"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { ChevronDown } from "lucide-react";
import type { ShoppingItem, ShoppingPriority } from "@/domain/models";
import { Money } from "@/components/ui";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends import("@tanstack/react-table").RowData, TValue> {
    label?: string;
  }
}

const columnHelper = createColumnHelper<ShoppingItem>();

const PRIORITY_RANK: Record<ShoppingPriority, number> = {
  "buy-first": 0,
  "can-wait": 1,
  optional: 2,
};

const PRIORITY_TONE: Record<ShoppingPriority, string> = {
  "buy-first": "bg-brand-soft text-brand-strong",
  "can-wait": "bg-border/60 text-muted",
  optional: "bg-accent/10 text-accent",
};

// Rows revealed before the "show more" affordance appears. Sorting always
// applies across the full list, so the visible window is just presentation.
const PAGE_SIZE = 8;

export function ShoppingTable({ items }: { items: ShoppingItem[] }) {
  const t = useTranslations("Result");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [expanded, setExpanded] = useState(false);

  const priorityLabel: Record<ShoppingPriority, string> = useMemo(
    () => ({
      "buy-first": t("buyFirst"),
      "can-wait": t("canWait"),
      optional: t("optionalUpgrades"),
    }),
    [t],
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: () => t("colItem"),
        meta: { label: t("colItem") },
        cell: (c) => <span className="text-foreground">{c.getValue()}</span>,
      }),
      columnHelper.accessor((row) => `${row.quantity} ${row.unit}`, {
        id: "quantity",
        header: () => t("colQuantity"),
        meta: { label: t("colQuantity") },
        sortingFn: (a, b) => a.original.quantity - b.original.quantity,
        cell: (c) => (
          <span className="whitespace-nowrap text-muted">
            {c.row.original.quantity} {c.row.original.unit}
            {c.row.original.quantity > 1 ? "s" : ""}
          </span>
        ),
      }),
      columnHelper.accessor("priority", {
        header: () => t("colPriority"),
        meta: { label: t("colPriority") },
        sortingFn: (a, b) =>
          PRIORITY_RANK[a.original.priority] - PRIORITY_RANK[b.original.priority],
        cell: (c) => (
          <span
            className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_TONE[c.getValue()]}`}
          >
            {priorityLabel[c.getValue()]}
          </span>
        ),
      }),
      columnHelper.accessor((row) => row.price.min, {
        id: "price",
        header: () => t("colPrice"),
        meta: { label: t("colPrice") },
        cell: (c) => <Money value={c.row.original.price} />,
      }),
    ],
    [t, priorityLabel],
  );

  // TanStack Table manages its own memoization; the React Compiler can't analyze
  // its hook and warns spuriously. Safe to ignore here.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: items,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Sorted rows in current order; the window only hides overflow, never reorders.
  const allRows = table.getRowModel().rows;
  const overflow = allRows.length > PAGE_SIZE;
  const rows = expanded ? allRows : allRows.slice(0, PAGE_SIZE);
  const hiddenCount = allRows.length - PAGE_SIZE;

  return (
    <div>
      {/* Mobile: stacked cards (≥44px tap targets, no horizontal scroll) */}
      <ul className="space-y-2 sm:hidden">
        {rows.map((row) => {
          const item = row.original;
          return (
            <li key={row.id} className="rounded-lg border border-border bg-surface p-3">
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm font-medium text-foreground">{item.name}</span>
                <span className="shrink-0 text-sm font-semibold text-foreground">
                  <Money value={item.price} />
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                <span>
                  {item.quantity} {item.unit}
                  {item.quantity > 1 ? "s" : ""}
                </span>
                <span aria-hidden>·</span>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 font-medium ${PRIORITY_TONE[item.priority]}`}
                >
                  {priorityLabel[item.priority]}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Desktop: sortable table */}
      <div className="-mx-1 hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[28rem] text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-border text-left">
                {hg.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  const label = (header.column.columnDef.meta as { label?: string })?.label ?? "";
                  return (
                    <th key={header.id} className="px-2 py-2 font-semibold text-muted">
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="inline-flex min-h-9 items-center gap-1 hover:text-foreground"
                        aria-label={t("sortBy", { column: label })}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <span aria-hidden className="text-[10px]">
                          {sorted === "asc" ? "▲" : sorted === "desc" ? "▼" : "↕"}
                        </span>
                      </button>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border/60 transition hover:bg-brand-soft/40">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-2 py-2">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {overflow ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-border text-sm font-medium text-foreground transition hover:border-brand hover:text-brand-strong"
        >
          {expanded ? t("showLess") : t("showMore", { count: hiddenCount })}
          <ChevronDown
            className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
      ) : null}
    </div>
  );
}
