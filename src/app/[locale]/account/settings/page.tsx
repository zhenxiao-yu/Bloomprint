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
import { PreferencesCard } from "@/components/account/PreferencesCard";
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
          <TabsTrigger value="preferences" className="rounded-full data-[state=active]:bg-brand data-[state=active]:text-on-strong">
            {t("tabPreferences")}
          </TabsTrigger>
          <TabsTrigger value="data" className="rounded-full data-[state=active]:bg-brand data-[state=active]:text-on-strong">
            {t("tabData")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4 space-y-4">
          <BlurFade inView>
            <form onSubmit={handleSubmit(save)} className="card flex flex-col gap-5 p-6" noValidate>
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

        <TabsContent value="preferences" className="mt-4 space-y-4">
          <BlurFade inView>
            <PreferencesCard />
          </BlurFade>
          <BlurFade inView delay={0.05}>
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
                      signOut();
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
