"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { signOut, updateAccount, useAccount } from "@/lib/accountStore";
import { accountSchema, type AccountFormValues } from "@/lib/accountForm";
import { clearPlans, useSavedPlans } from "@/lib/plansStore";
import { AccountAppSettings } from "@/components/AccountAppSettings";

export default function SettingsPage() {
  const t = useTranslations("Settings");
  const tc = useTranslations("Common");
  const tf = useTranslations("Form");
  const router = useRouter();
  const account = useAccount();
  const plans = useSavedPlans();
  const [saved, setSaved] = useState(false);

  const schema = useMemo(
    () => accountSchema({ nameRequired: tf("nameRequired"), emailInvalid: tf("emailInvalid") }),
    [tf],
  );
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AccountFormValues>({
    resolver: zodResolver(schema),
    values: { name: account?.name ?? "", email: account?.email ?? "" },
    mode: "onTouched",
  });

  // Redirect when there's no account (navigation only — no setState in this effect).
  useEffect(() => {
    if (!account) router.replace("/signup");
  }, [account, router]);

  if (!account) return null;

  function save(values: AccountFormValues) {
    updateAccount({ name: values.name, email: values.email });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 animate-fade-up px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/account" className="text-sm font-semibold text-brand">
        {t("backToAccount")}
      </Link>
      <div className="mt-2">
        <h1 className="text-2xl font-semibold text-foreground">{t("title")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">{t("subtitle")}</p>
      </div>

      <form onSubmit={handleSubmit(save)} className="card mt-5 flex flex-col gap-4 p-5" noValidate>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-foreground">{t("nameLabel")}</span>
          <input
            {...register("name")}
            aria-invalid={errors.name ? "true" : undefined}
            className="card w-full p-2.5 text-sm"
          />
          {errors.name ? (
            <span className="mt-1 block text-xs text-danger">{errors.name.message}</span>
          ) : null}
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-foreground">
            {t("emailLabel")} <span className="font-normal text-muted">{tc("optional")}</span>
          </span>
          <input
            {...register("email")}
            type="email"
            aria-invalid={errors.email ? "true" : undefined}
            className="card w-full p-2.5 text-sm"
          />
          {errors.email ? (
            <span className="mt-1 block text-xs text-danger">{errors.email.message}</span>
          ) : null}
        </label>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-on-strong transition hover:bg-brand-strong"
          >
            {t("saveChanges")}
          </button>
          {saved ? (
            <span className="text-xs font-medium text-brand-strong">{t("savedConfirm")}</span>
          ) : null}
        </div>
      </form>

      <div className="mt-4">
        <AccountAppSettings />
      </div>

      <div className="card mt-4 flex flex-col gap-3 p-5">
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
