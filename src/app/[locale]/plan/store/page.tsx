/**
 * "Take to the store" — a print-optimized, big-type shopping checklist.
 *
 * It reuses the share encoding (`?p=`): we decode the inputs, regenerate the deterministic plan
 * server-side (no AI needed), and render a clean checklist. So this page is itself a shareable,
 * printable URL. No client plan state required.
 */
import { Link } from "@/i18n/navigation";
import type { ShoppingPriority } from "@/domain/models";
import { generateDeterministicPlan } from "@/domain";
import { decodeShare, SHARE_PARAM } from "@/lib/shareLink";
import { PrintBar } from "@/components/PrintBar";

const GROUPS: { key: ShoppingPriority; label: string }[] = [
  { key: "buy-first", label: "Buy first" },
  { key: "can-wait", label: "Can wait" },
  { key: "optional", label: "Optional upgrades" },
];

export default async function StorePage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const raw = sp[SHARE_PARAM];
  const decoded = decodeShare(typeof raw === "string" ? raw : null);

  if (!decoded) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <p className="text-foreground">That store link is missing or invalid.</p>
        <Link href="/plan" className="mt-3 inline-block text-sm font-semibold text-brand">
          ← Start a plan
        </Link>
      </main>
    );
  }

  const plan = generateDeterministicPlan(decoded.intake, { adjustments: decoded.adjustments });
  const backHref = `/plan?${SHARE_PARAM}=${typeof raw === "string" ? raw : ""}`;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6 sm:py-10 print:py-0">
      <PrintBar backHref={backHref} />

      <h1 className="text-2xl font-semibold text-foreground">Shopping list</h1>
      <p className="mt-1 text-sm text-muted">
        {plan.styleLabel} · {plan.intake.goal.replace(/-/g, " ")} · Expected DIY total $
        {plan.budget.diyTotal.min.toLocaleString()}–${plan.budget.diyTotal.max.toLocaleString()}
      </p>
      <p className="mt-1 text-xs text-muted">
        Prices are typical ranges, not quotes — confirm at the store. Best planting window:{" "}
        {plan.bestWeatherWindow}.
      </p>

      {GROUPS.map((g) => {
        const items = plan.shoppingList.filter((i) => i.priority === g.key);
        if (items.length === 0) return null;
        return (
          <section key={g.key} className="mt-6 break-inside-avoid">
            <h2 className="border-b border-border pb-1 text-base font-semibold text-foreground">{g.label}</h2>
            <ul className="mt-2 space-y-2">
              {items.map((item, i) => (
                <li key={`${item.name}-${i}`} className="flex items-center gap-3 text-base">
                  <span className="inline-block h-4 w-4 shrink-0 rounded border border-foreground" aria-hidden />
                  <span className="flex-1 text-foreground">
                    {item.quantity} {item.unit}
                    {item.quantity > 1 ? "s" : ""} · {item.name}
                  </span>
                  <span className="tabular-nums text-muted">
                    ${item.price.min.toLocaleString()}–${item.price.max.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <section className="mt-6 break-inside-avoid">
        <h2 className="border-b border-border pb-1 text-base font-semibold text-foreground">Tools</h2>
        <p className="mt-2 text-sm text-foreground">{plan.tools.map((t) => t.name).join(", ")}</p>
      </section>

      <p className="mt-8 text-xs text-muted">Bloomprint · bloomprint.vercel.app</p>
    </main>
  );
}
