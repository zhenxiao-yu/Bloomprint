"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { ACCOUNT_ROLES, MAX_BIO_LENGTH, initials, updateAccount, useAccount } from "@/lib/accountStore";
import { useSupabaseSession } from "@/lib/supabase/useSession";
import { signOutEverywhere } from "@/lib/supabase/signOutEverywhere";
import { accountSchema, type AccountFormValues } from "@/lib/accountForm";
import { clearPlans, useSavedPlans } from "@/lib/plansStore";
import { AccountAppSettings } from "@/components/AccountAppSettings";
import { PasswordCard } from "@/components/account/PasswordCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BlurFade } from "@/components/ui/blur-fade";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check } from "lucide-react";

export default function SettingsPage() {
  const t = useTranslations("Settings");
  const tc = useTranslations("Common");
  const tf = useTranslations("Form");
  const tr = useTranslations("Roles");
  const router = useRouter();
  const account = useAccount();
  const plans = useSavedPlans();
  const { configured, status, user } = useSupabaseSession();
  const [saved, setSaved] = useState(false);

  // A cloud session is mirrored into the account asynchronously (CloudAccountBridge), so
  // don't bounce a signed-in cloud user to /signup while that's still resolving.
  const cloudResolving = configured && (status === "loading" || Boolean(user));

  const schema = useMemo(
    () => accountSchema({ nameRequired: tf("nameRequired"), emailInvalid: tf("emailInvalid") }),
    [tf],
  );
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<AccountFormValues>({
    resolver: zodResolver(schema),
    values: {
      name: account?.name ?? "",
      email: account?.email ?? "",
      role: account?.role ?? "",
      bio: account?.bio ?? "",
    },
    mode: "onTouched",
  });
  const bioValue = useWatch({ control, name: "bio" }) ?? "";

  // Redirect when there's no account (navigation only — no setState in this effect).
  useEffect(() => {
    if (!account && !cloudResolving) router.replace("/signup");
  }, [account, cloudResolving, router]);

  if (!account) return null;

  function save(values: AccountFormValues) {
    updateAccount({
      name: values.name,
      email: values.email,
      role: values.role || undefined,
      bio: values.bio,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <main className="page-shell flex-1 py-10 lg:py-14">
      <div className="grid items-start gap-6 lg:grid-cols-[20rem_1fr] lg:gap-10">
      <BlurFade inView className="lg:sticky lg:top-24">
        <div>
          <Link href="/account" className="text-sm font-semibold text-brand hover:text-brand-strong">
            {t("backToAccount")}
          </Link>
          <h1 className="display-lg mt-2 text-foreground">{t("title")}</h1>
          <p className="lead mt-1 text-muted-foreground">{t("subtitle")}</p>
        </div>
      </BlurFade>

      <Tabs defaultValue="profile">
        <TabsList className="grid w-full grid-cols-3 rounded-full bg-surface-muted p-1">
          <TabsTrigger value="profile" className="rounded-full data-[state=active]:bg-brand data-[state=active]:text-on-strong">
            {t("tabProfile")}
          </TabsTrigger>
          <TabsTrigger value="app" className="rounded-full data-[state=active]:bg-brand data-[state=active]:text-on-strong">
            {t("tabApp")}
          </TabsTrigger>
          <TabsTrigger value="data" className="rounded-full data-[state=active]:bg-brand data-[state=active]:text-on-strong">
            {t("tabData")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4 space-y-4">
          <BlurFade inView>
            <form onSubmit={handleSubmit(save)} className="card flex flex-col gap-5 p-6" noValidate>
              {/* Identity at a glance — avatar + who this profile belongs to. */}
              <div className="flex items-center gap-4 border-b border-border/70 pb-5">
                {account.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={account.avatarUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="size-14 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand text-lg font-semibold text-on-strong">
                    {initials(account.name) || "🌱"}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-foreground">{account.name}</p>
                  {account.email ? (
                    <p className="truncate text-sm text-muted-foreground">{account.email}</p>
                  ) : account.role ? (
                    <p className="truncate text-sm text-muted-foreground">{tr(account.role)}</p>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="account-name">{t("nameLabel")}</Label>
                  <Input
                    id="account-name"
                    {...register("name")}
                    aria-invalid={errors.name ? "true" : undefined}
                  />
                  {errors.name ? (
                    <span className="block text-sm text-danger">{errors.name.message}</span>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account-email">
                    {t("emailLabel")} <span className="font-normal text-muted-foreground">{tc("optional")}</span>
                  </Label>
                  <Input
                    id="account-email"
                    type="email"
                    {...register("email")}
                    aria-invalid={errors.email ? "true" : undefined}
                  />
                  {errors.email ? (
                    <span className="block text-sm text-danger">{errors.email.message}</span>
                  ) : null}
                </div>
              </div>

              {/* Role — self-identification that tailors tone/context, never a gate. */}
              <div className="space-y-2">
                <Label htmlFor="account-role">
                  {t("roleLabel")}{" "}
                  <span className="font-normal text-muted-foreground">{tc("optional")}</span>
                </Label>
                <select
                  id="account-role"
                  {...register("role")}
                  className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-brand/40"
                >
                  <option value="">—</option>
                  {ACCOUNT_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {tr(r)}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">{t("roleHint")}</p>
              </div>

              {/* Short bio */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="account-bio">
                    {t("bioLabel")}{" "}
                    <span className="font-normal text-muted-foreground">{tc("optional")}</span>
                  </Label>
                  <span className="numeric text-xs text-muted-foreground">
                    {t("bioHint", { count: bioValue.length, max: MAX_BIO_LENGTH })}
                  </span>
                </div>
                <textarea
                  id="account-bio"
                  rows={3}
                  maxLength={MAX_BIO_LENGTH}
                  placeholder={t("bioPlaceholder")}
                  {...register("bio")}
                  className="w-full resize-none rounded-xl border border-border bg-surface px-3 py-2 text-sm leading-relaxed text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-brand/40"
                />
              </div>

              <div className="flex items-center gap-3">
                <Button type="submit" className="rounded-full bg-brand text-on-strong hover:bg-brand-strong">
                  {t("saveChanges")}
                </Button>
                {saved ? (
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-brand-strong">
                    <Check className="size-3.5" aria-hidden />
                    {t("savedConfirm")}
                  </span>
                ) : null}
              </div>
            </form>
          </BlurFade>
          <BlurFade inView delay={0.05}>
            <PasswordCard />
          </BlurFade>
        </TabsContent>

        <TabsContent value="app" className="mt-4 space-y-4">
          <BlurFade inView>
            <AccountAppSettings />
          </BlurFade>
        </TabsContent>

        <TabsContent value="data" className="mt-4">
          <BlurFade inView>
            <div className="card flex flex-col gap-3 p-6">
              <h2 className="title-3 text-foreground">{t("dataTitle")}</h2>
              <p className="text-base text-muted-foreground">
                {plans.length === 1
                  ? t("savedCountOne", { count: plans.length })
                  : t("savedCountOther", { count: plans.length })}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full hover:border-danger"
                  onClick={() => {
                    if (confirm(t("clearConfirm"))) clearPlans();
                  }}
                >
                  {t("clearPlans")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full text-danger hover:border-danger"
                  onClick={() => {
                    if (confirm(t("signOutConfirm"))) {
                      void signOutEverywhere();
                      router.push("/");
                    }
                  }}
                >
                  {t("signOut")}
                </Button>
              </div>
            </div>
          </BlurFade>
        </TabsContent>
      </Tabs>
      </div>
    </main>
  );
}
