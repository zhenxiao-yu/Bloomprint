"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { signOut, updateAccount, useAccount } from "@/lib/accountStore";
import { clearPlans, useSavedPlans } from "@/lib/plansStore";

export default function SettingsPage() {
  const t = useTranslations("Settings");
  const tc = useTranslations("Common");
  const router = useRouter();
  const account = useAccount();
  const plans = useSavedPlans();
  const [saved, setSaved] = useState(false);

  // Redirect when there's no account (navigation only — no setState in this effect).
  useEffect(() => {
    if (!account) router.replace("/signup");
  }, [account, router]);

  if (!account) return null;

  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "");
    if (!name) return;
    updateAccount({ name, email });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 animate-fade-up px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/account" className="text-sm font-semibold text-brand">
        {t("backToAccount")}
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-foreground">{t("title")}</h1>

      <form onSubmit={save} className="card mt-5 space-y-4 p-5">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-foreground">{t("nameLabel")}</span>
          <input name="name" defaultValue={account.name} required className="card w-full p-2.5 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-foreground">
            {t("emailLabel")} <span className="font-normal text-muted">{tc("optional")}</span>
          </span>
          <input
            name="email"
            type="email"
            defaultValue={account.email ?? ""}
            className="card w-full p-2.5 text-sm"
          />
        </label>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-on-strong transition hover:bg-brand-strong"
          >
            {t("saveChanges")}
          </button>
          {saved ? <span className="text-xs font-medium text-brand-strong">{t("savedConfirm")}</span> : null}
        </div>
      </form>

      <div className="card mt-4 space-y-3 p-5">
        <h2 className="text-base font-semibold text-foreground">{t("dataTitle")}</h2>
        <p className="text-sm text-muted">
          {plans.length === 1
            ? t("savedCountOne", { count: plans.length })
            : t("savedCountOther", { count: plans.length })}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              if (confirm(t("clearConfirm"))) clearPlans();
            }}
            className="rounded-full border border-border px-4 py-2 text-sm text-foreground transition hover:border-[var(--danger)]"
          >
            {t("clearPlans")}
          </button>
          <button
            onClick={() => {
              if (confirm(t("signOutConfirm"))) {
                signOut();
                router.push("/");
              }
            }}
            className="rounded-full border border-border px-4 py-2 text-sm text-[var(--danger)] transition hover:border-[var(--danger)]"
          >
            {t("signOut")}
          </button>
        </div>
      </div>
    </main>
  );
}
