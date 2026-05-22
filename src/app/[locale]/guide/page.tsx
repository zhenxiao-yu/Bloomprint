import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STEPS = [
  {
    title: "Start with the yard problem",
    body: "Privacy, curb appeal, shade, low upkeep, or pollinators. Bloomprint translates that into plant roles and a build order.",
  },
  {
    title: "Check the assumptions",
    body: "Unknown sun, soil, drainage, and local stock lower confidence. Use the accuracy prompts before buying.",
  },
  {
    title: "Buy in priority order",
    body: "Buy First gets the project buildable. Can Wait and Optional upgrades are where you pivot if budget or hauling gets tight.",
  },
  {
    title: "Install back to front",
    body: "Mark the bed, prep soil, place everything first, then plant tall-to-short and finish with edging or mulch.",
  },
];

const STORE_RULES = [
  "Call before driving for plants, heavy materials, or large quantities.",
  "Substitute by role, mature size, sun tolerance, and maintenance before flower color.",
  "Do not tighten plant spacing just to make a first-day bed look full.",
  "Use delivery or mulch pivots when stone, soil, or truck access becomes the blocker.",
];

export default function GuidePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <header className="max-w-3xl">
        <Badge variant="secondary">Homeowner + staff guide</Badge>
        <h1 className="mt-3 text-3xl font-semibold text-foreground sm:text-5xl">
          How to turn a yard idea into a buildable weekend plan.
        </h1>
        <p className="mt-3 text-base text-muted">
          A practical checklist for reading a Bloomprint plan, making safe pivots, and avoiding
          the common mistakes that make suburban yard projects expensive.
        </p>
      </header>

      <section className="grid gap-3 md:grid-cols-4">
        {STEPS.map((step, index) => (
          <Card key={step.title}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-full bg-brand text-xs text-on-strong">
                  {index + 1}
                </span>
                {step.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted">{step.body}</CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="bg-brand-soft">
          <CardHeader>
            <CardTitle>At the store</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2 text-sm text-foreground">
              {STORE_RULES.map((rule) => (
                <li key={rule} className="rounded-lg bg-surface/75 p-3">
                  {rule}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>What Bloomprint will not pretend</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-muted sm:grid-cols-2">
            <p>It does not know exact store inventory, aisle location, or live prices.</p>
            <p>It does not replace local plant tags, bylaws, utility locates, or professional site work.</p>
            <p>It treats AI as wording help only, never as the source of plant or safety facts.</p>
            <p>It keeps working with no photo, no account, no API key, and no paid data source.</p>
          </CardContent>
        </Card>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href="/plan" className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-on-strong">
          Start a plan
        </Link>
        <Link href="/plan?mode=staff" className="rounded-full border border-border px-5 py-2 text-sm font-semibold">
          Open Staff Helper
        </Link>
      </div>
    </main>
  );
}
