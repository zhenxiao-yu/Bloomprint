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

export function ShoppingTable({ items }: { items: ShoppingItem[] }) {
  const t = useTranslations("Result");
  const [sorting, setSorting] = useState<SortingState>([]);

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
          <span className="whitespace-nowrap text-muted">{priorityLabel[c.getValue()]}</span>
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

  const table = useReactTable({
    data: items,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="-mx-1 overflow-x-auto">
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
                      className="inline-flex items-center gap-1 hover:text-foreground"
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
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-b border-border/60">
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
  );
}
