"use client";

import { useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { HelpCircle } from "lucide-react";
import type { BudgetBreakdown, InstallPhase } from "@/domain/models";
import {
  Tooltip as Hint,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/** Honest helper that explains what a chart's bars and axis represent. */
function AxisHint({ label, children }: { label: string; children: string }) {
  return (
    <figcaption className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted">
      {label}
      <Hint>
        <TooltipTrigger
          type="button"
          aria-label={label}
          className="inline-flex size-4 items-center justify-center rounded-full text-muted/70 transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <HelpCircle className="size-3.5" aria-hidden />
        </TooltipTrigger>
        <TooltipContent className="max-w-[15rem] leading-relaxed normal-case tracking-normal">
          {children}
        </TooltipContent>
      </Hint>
    </figcaption>
  );
}

// Calm palette pulled from theme CSS variables so charts adapt to dark mode.
const BUDGET_COLORS = [
  "var(--brand)",
  "var(--accent)",
  "var(--trust)",
  "var(--blueprint)",
  "var(--warn)",
];

const mid = (r: { min: number; max: number }) => Math.round((r.min + r.max) / 2);

export function PlanCharts({
  budget,
  installPhases,
}: {
  budget: BudgetBreakdown;
  installPhases: InstallPhase[];
}) {
  const t = useTranslations("Charts");

  const budgetData = budget.byCategory.map((c) => ({
    name: c.category,
    value: mid(c.price),
    min: c.price.min,
    max: c.price.max,
  }));

  const laborData = installPhases
    .filter((p) => p.estHours > 0)
    .map((p) => ({ name: `${p.order}. ${p.title}`, hours: p.estHours }));

  const money = (v: number) => `$${v.toLocaleString()}`;

  return (
    <div className="mt-4 grid gap-5 border-t border-border pt-4 sm:grid-cols-2">
      <figure>
        <AxisHint label={t("budgetTitle")}>{t("budgetAxisTip")}</AxisHint>
        <ResponsiveContainer width="100%" height={Math.max(120, budgetData.length * 34)}>
          <BarChart
            data={budgetData}
            layout="vertical"
            margin={{ top: 0, right: 12, bottom: 0, left: 4 }}
          >
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              width={92}
              tick={{ fontSize: 11, fill: "var(--muted)" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: "var(--brand-soft)", opacity: 0.4 }}
              formatter={(_v, _n, item) => {
                const p = item.payload as { min: number; max: number };
                return [`${money(p.min)}–${money(p.max)}`, t("budgetTooltip")];
              }}
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "0.5rem",
                fontSize: 12,
                color: "var(--foreground)",
              }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
              {budgetData.map((_, i) => (
                <Cell key={i} fill={BUDGET_COLORS[i % BUDGET_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </figure>

      {laborData.length > 0 ? (
        <figure>
          <AxisHint label={t("laborTitle")}>{t("laborAxisTip")}</AxisHint>
          <ResponsiveContainer width="100%" height={Math.max(120, laborData.length * 34)}>
            <BarChart
              data={laborData}
              layout="vertical"
              margin={{ top: 0, right: 12, bottom: 0, left: 4 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={92}
                tick={{ fontSize: 11, fill: "var(--muted)" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ fill: "var(--brand-soft)", opacity: 0.4 }}
                formatter={(v) => [t("laborHours", { hours: Number(v) }), t("laborTooltip")]}
                contentStyle={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "0.5rem",
                  fontSize: 12,
                  color: "var(--foreground)",
                }}
              />
              <Bar dataKey="hours" radius={[0, 4, 4, 0]} barSize={16} fill="var(--accent)" />
            </BarChart>
          </ResponsiveContainer>
        </figure>
      ) : null}
    </div>
  );
}
