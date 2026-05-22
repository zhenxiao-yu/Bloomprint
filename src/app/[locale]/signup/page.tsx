"use client";

import { useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { createAccount, useAccount } from "@/lib/accountStore";
import { accountSchema, type AccountFormValues } from "@/lib/accountForm";
import { trackEvent } from "@/lib/analytics";

export default function SignupPage() {
  const t = useTranslations("Signup");
  const tc = useTranslations("Common");
  const tf = useTranslations("Form");
  const router = useRouter();
  const account = useAccount();

  const schema = useMemo(
    () => accountSchema({ nameRequired: tf("nameRequired"), emailInvalid: tf("emailInvalid") }),
    [tf],
  );
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AccountFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "" },
    mode: "onTouched",
  });

  useEffect(() => {
    if (account) router.replace("/account");
  }, [account, router]);

  function onSubmit(values: AccountFormValues) {
    createAccount({ name: values.name, email: values.email });
    trackEvent("account_created");
    router.push("/account");
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-10 sm:px-6">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-semibold text-foreground">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-foreground">{t("nameLabel")}</span>
            <input
              {...register("name")}
              placeholder={t("namePlaceholder")}
              autoFocus
              aria-invalid={errors.name ? "true" : undefined}
              className="card w-full p-2.5 text-sm"
            />
            {errors.name ? <span className="mt-1 block text-xs text-danger">{errors.name.message}</span> : null}
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-foreground">
              {t("emailLabel")} <span className="font-normal text-muted">{tc("optional")}</span>
            </span>
            <input
              {...register("email")}
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              aria-invalid={errors.email ? "true" : undefined}
              className="card w-full p-2.5 text-sm"
            />
            {errors.email ? <span className="mt-1 block text-xs text-danger">{errors.email.message}</span> : null}
          </label>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-on-strong transition hover:bg-brand-strong disabled:opacity-50"
          >
            {t("createButton")}
          </button>
        </form>

        <p className="mt-4 text-xs text-muted">
          {t("preferNotBefore")}{" "}
          <Link href="/plan" className="font-medium text-brand">
            {t("preferNotLink")}
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
