import { BriefcaseBusiness, CalendarDays, FileCheck2, Leaf, PackageCheck, Users } from "lucide-react";
import { Link } from "@/i18n/navigation";

const rows = [
  ["Mrs. Zhang", "Oakville Front Yard", "Waiting for approval", "$1,200-$2,400"],
  ["Patel family", "Backyard shade bed", "Needs photos", "$600-$1,100"],
  ["Store customer", "Driveway privacy strip", "Material list ready", "$900-$1,700"],
];

export default function ProPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-7 px-4 py-8 sm:px-6 sm:py-12">
      <header className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">
            Landscaper / Pro Mode <span className="ml-1 rounded-full bg-border px-2 py-0.5 text-[10px] font-semibold text-muted">Preview</span>
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-foreground sm:text-5xl">
            Manage clients, properties, plan versions, photos, and material lists.
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted">
            A preview of the operational workspace for quote-ready summaries and multiple parallel yard
            projects. The clients, counts, and projects shown below are sample data.
          </p>
        </div>
        <Link href="/plan?mode=staff" className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-on-strong">
          New assisted plan
        </Link>
      </header>

      <section className="grid gap-3 sm:grid-cols-4">
        {[
          { icon: Users, label: "Active clients", value: "4" },
          { icon: Leaf, label: "Plans in progress", value: "7" },
          { icon: FileCheck2, label: "Waiting approval", value: "2" },
          { icon: PackageCheck, label: "Material lists ready", value: "3" },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="card hover-lift p-4">
            <Icon className="mb-2 size-5 text-brand" aria-hidden />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[13rem_1fr]">
        <nav className="rounded-xl border border-border bg-surface p-3 text-sm">
          {["Dashboard", "Clients", "Properties", "Plans", "Photos", "Quotes", "Materials", "Calendar", "Settings"].map((item) => (
            <span key={item} className="block rounded-lg px-3 py-2 text-muted first:bg-brand-soft first:text-brand-strong">
              {item}
            </span>
          ))}
        </nav>
        <div className="card hover-lift p-5">
          <div className="flex items-center gap-2">
            <BriefcaseBusiness className="size-5 text-brand" aria-hidden />
            <h2 className="text-lg font-semibold text-foreground">Recent projects</h2>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="py-2">Client</th>
                  <th className="py-2">Property</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Budget</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map(([client, property, status, budget]) => (
                  <tr key={`${client}-${property}`}>
                    <td className="py-3 font-medium text-foreground">{client}</td>
                    <td className="py-3 text-muted">{property}</td>
                    <td className="py-3">
                      <span className="rounded-full bg-brand-soft px-2 py-1 text-xs font-semibold text-brand-strong">
                        {status}
                      </span>
                    </td>
                    <td className="py-3 text-muted">{budget}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 flex items-center gap-2 text-xs text-muted">
            <CalendarDays className="size-4" aria-hidden />
            Calendar, quote export, and client approval sync are staged for backend integration.
          </p>
        </div>
      </section>
    </main>
  );
}
