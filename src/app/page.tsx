import Link from "next/link";
import { ArrowRight, CheckCircle2, ClipboardList, ShieldCheck, ShoppingBag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ShimmerButton } from "@/components/ui/shimmer-button";

const CTAS = [
  {
    href: "/plan",
    title: "Start My Yard Plan",
    desc: "Answer a few quick questions and get a buildable plan.",
    primary: true,
  },
  {
    href: "/plan?mode=staff",
    title: "Help a Customer",
    desc: "Garden-staff view: talking points, Good/Better/Best, substitutions.",
    primary: false,
  },
  {
    href: "/plan?demo=1",
    title: "Try the Demo",
    desc: "See a finished Oakville front-yard plan instantly.",
    primary: false,
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-5 py-10 sm:gap-10 sm:px-6 sm:py-14">
      <header className="animate-fade-up grid gap-7 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
        <p className="text-sm font-medium uppercase tracking-wide text-brand">Bloomprint</p>
        <h1 className="text-3xl font-semibold leading-tight text-foreground sm:text-5xl">
          Buildable yard plans for real homes.
        </h1>
        <p className="max-w-xl text-base text-muted sm:text-lg">
          Tell us a little about your yard and Bloomprint turns it into a plan you can actually
          build — what to buy, how much, what tools, and in what order.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/plan">
            <ShimmerButton background="var(--brand)" className="min-h-11 px-5 py-2.5">
              Start a yard plan <ArrowRight data-icon="inline-end" />
            </ShimmerButton>
          </Link>
          <Link
            href="/plan?demo=1"
            className="inline-flex min-h-11 items-center rounded-full border border-border bg-surface px-5 py-2 text-sm font-semibold text-foreground transition hover:border-brand"
          >
            Try the demo
          </Link>
        </div>
        </div>
        <Card className="bg-surface/90 shadow-sm">
          <CardContent className="grid gap-3 p-4">
            {[
              ["Confidence", "Good fit, with soil and stock checks called out"],
              ["Expected DIY total", "$640–$1,120 range, not a fake quote"],
              ["Install order", "Mark, prep, plant, edge, mulch"],
              ["Store reality", "Search links, substitutions, no inventory claims"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-border bg-background/60 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
                <p className="mt-1 text-sm text-foreground">{value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {CTAS.map((c, i) => (
          <Link
            key={c.href}
            href={c.href}
            style={{ animationDelay: `${80 + i * 70}ms` }}
            className={`card animate-fade-up flex flex-col gap-2 p-5 transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 ${
              c.primary ? "ring-2 ring-brand" : ""
            }`}
          >
            <span className="text-base font-semibold text-foreground">{c.title}</span>
            <span className="text-sm text-muted">{c.desc}</span>
          </Link>
        ))}
      </div>

      <section className="grid gap-3 sm:grid-cols-4">
        {[
          { icon: ClipboardList, label: "Shopping list" },
          { icon: CheckCircle2, label: "Install order" },
          { icon: ShieldCheck, label: "Risks & evidence" },
          { icon: ShoppingBag, label: "Store checklist" },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="rounded-xl border border-border bg-surface p-4 text-sm font-medium text-foreground">
            <Icon className="mb-2 text-brand" aria-hidden="true" />
            {label}
          </div>
        ))}
      </section>

      <p className="text-xs text-muted">
        Plans use the Bloomprint Core Library and approximate regional rules. Prices are ranges,
        not quotes — confirm local availability before buying.
      </p>
    </main>
  );
}
