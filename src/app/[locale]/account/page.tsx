"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { initials, useAccount } from "@/lib/accountStore";
import { useSavedPlans } from "@/lib/plansStore";
import { CloudSyncCard } from "@/components/CloudSyncCard";
import { ConnectAccountCard } from "@/components/account/ConnectAccountCard";
import { BillingStatus } from "@/components/billing/BillingStatus";

export default function AccountPage() {
  const t = useTranslations("Account");
  const tc = useTranslations("Common");
  const account = useAccount();
  const plans = useSavedPlans();

  if (!account) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
        <div className="card animate-fade-up p-8 text-center">
          <p className="font-medium text-foreground">{t("noAccountTitle")}</p>
          <p className="mt-1 text-sm text-muted">{t("noAccountSubtitle")}</p>
          <Link
            href="/signup"
            className="mt-4 inline-block rounded-full bg-brand px-5 py-2 text-sm font-semibold text-on-strong"
          >
            {tc("createAccount")}
          </Link>
        </div>
        <div className="mt-4">
          <CloudSyncCard />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 animate-fade-up px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex items-center gap-4">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand text-lg font-semibold text-on-strong">
          {initials(account.name) || "🌱"}
        </span>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t("greeting", { name: account.name })}</h1>
          <p className="text-sm text-muted">
            {account.email ? `${account.email} · ` : ""}
            {t("memberSince", { date: new Date(account.createdAt).toLocaleDateString() })}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link href="/plans" className="card p-5 transition hover:-translate-y-0.5 hover:shadow-md">
          <p className="text-2xl font-semibold text-foreground">{plans.length}</p>
          <p className="text-sm text-muted">{plans.length === 1 ? t("savedPlanOne") : t("savedPlanOther")}</p>
        </Link>
        <Link href="/plan" className="card p-5 transition hover:-translate-y-0.5 hover:shadow-md">
          <p className="text-2xl font-semibold text-brand">＋</p>
          <p className="text-sm text-muted">{t("startNew")}</p>
        </Link>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href="/account/settings"
          className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:border-brand"
        >
          {t("settings")}
        </Link>
      </div>

      <div className="mt-4 space-y-3">
        <CloudSyncCard />
        <ConnectAccountCard />
        <BillingStatus />
      </div>

      <p className="mt-6 text-xs text-muted">{t("deviceNote")}</p>
    </main>
  );
}
