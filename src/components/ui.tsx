import type { MoneyRange } from "@/domain/models";

export function Money({ value }: { value: MoneyRange }) {
  return (
    <span className="tabular-nums">
      ${value.min.toLocaleString()}–${value.max.toLocaleString()}
    </span>
  );
}

export function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-5">
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
