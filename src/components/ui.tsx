import type { MoneyRange } from "@/domain/models";
import { cn } from "@/lib/utils";

export function Money({ value }: { value: MoneyRange }) {
  return (
    <span className="tabular-nums">
      ${value.min.toLocaleString()}–${value.max.toLocaleString()}
    </span>
  );
}

export function Section({
  id,
  title,
  subtitle,
  variant = "default",
  children,
}: {
  id?: string;
  title: string;
  subtitle?: string;
  variant?: "default" | "decision" | "action" | "trust" | "quiet";
  children: React.ReactNode;
}) {
  const variantClass = {
    default: "card",
    decision: "rounded-xl border border-brand/30 bg-brand-soft/70",
    action: "rounded-xl border border-accent/30 bg-white",
    trust: "rounded-xl border border-border bg-surface",
    quiet: "rounded-xl border border-border/70 bg-surface/75",
  }[variant];
  return (
    <section id={id} className={cn("scroll-mt-24 p-5", variantClass)}>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {subtitle ? <p className="mt-0.5 text-sm text-muted">{subtitle}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand-strong">
      {children}
    </span>
  );
}

export function MetricPill({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: React.ReactNode;
  tone?: "neutral" | "brand" | "warn";
}) {
  const tones = {
    neutral: "border-border bg-surface text-foreground",
    brand: "border-brand/25 bg-brand-soft text-brand-strong",
    warn: "border-[var(--warn)]/25 bg-[var(--warn)]/10 text-[var(--warn)]",
  };
  return (
    <span className={cn("inline-flex min-h-11 flex-col justify-center rounded-lg border px-3 py-1.5", tones[tone])}>
      <span className="text-[0.68rem] font-medium uppercase tracking-wide opacity-75">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </span>
  );
}

const PRIORITY_BADGE: Record<string, string> = {
  high: "bg-[var(--danger)]/10 text-[var(--danger)]",
  medium: "bg-[var(--warn)]/10 text-[var(--warn)]",
  low: "bg-brand-soft text-brand-strong",
};

export function SeverityTag({ severity }: { severity: "low" | "medium" | "high" }) {
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-semibold capitalize ${PRIORITY_BADGE[severity]}`}>
      {severity}
    </span>
  );
}
