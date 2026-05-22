"use client";

import { PLAN_ORDER, PLANS } from "@/lib/billing/plans";
import { useEntitlements } from "@/lib/billing/useEntitlements";
import { UpgradeButton } from "@/components/billing/UpgradeButton";

export function PricingCards() {
  const { planKey, billingEnabled, loading } = useEntitlements();

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {PLAN_ORDER.map((key) => {
        const plan = PLANS[key];
        const isCurrent = planKey === key && !loading;
        return (
          <div
            key={key}
            className={`card flex flex-col gap-3 p-5 ${isCurrent ? "ring-2 ring-brand" : ""}`}
          >
            <div>
              <div className="flex items-baseline justify-between">
                <h3 className="text-base font-semibold text-foreground">{plan.name}</h3>
                {isCurrent ? (
                  <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand-strong">
                    Current
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-2xl font-semibold text-foreground">
                {plan.monthlyUsd === 0 ? "Free" : `$${plan.monthlyUsd}`}
                {plan.monthlyUsd > 0 ? <span className="text-sm font-normal text-muted">/mo</span> : null}
              </p>
              <p className="mt-1 text-sm text-muted">{plan.blurb}</p>
            </div>

            <ul className="flex-1 space-y-1 text-sm text-foreground">
              {plan.highlights.map((h) => (
                <li key={h} className="flex gap-2">
                  <span className="text-brand">✓</span>
                  {h}
                </li>
              ))}
            </ul>

            {key === "free" ? (
              <p className="text-center text-xs text-muted">
                {isCurrent ? "Your current plan" : "Always included"}
              </p>
            ) : isCurrent ? (
              <p className="text-center text-xs font-medium text-brand-strong">Your current plan</p>
            ) : (
              <UpgradeButton plan={key as "plus" | "pro"} billingEnabled={billingEnabled} label={`Get ${plan.name}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
