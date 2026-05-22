import Link from "next/link";

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
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-10 px-6 py-16">
      <header className="space-y-4">
        <p className="text-sm font-medium uppercase tracking-wide text-brand">Bloomprint</p>
        <h1 className="text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
          Buildable yard plans for real homes.
        </h1>
        <p className="max-w-xl text-lg text-muted">
          Tell us a little about your yard and Bloomprint turns it into a plan you can actually
          build — what to buy, how much, what tools, and in what order.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {CTAS.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className={`card flex flex-col gap-2 p-5 transition hover:-translate-y-0.5 hover:shadow-sm ${
              c.primary ? "ring-2 ring-brand" : ""
            }`}
          >
            <span className="text-base font-semibold text-foreground">{c.title}</span>
            <span className="text-sm text-muted">{c.desc}</span>
          </Link>
        ))}
      </div>

      <p className="text-xs text-muted">
        Plans use the Bloomprint Core Library and approximate regional rules. Prices are ranges,
        not quotes — confirm local availability before buying.
      </p>
    </main>
  );
}
