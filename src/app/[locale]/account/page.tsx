"use client";

import { useTranslations } from "next-intl";
import { ArrowRight, FileText, Info, Plus, Settings, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { initials, useAccount } from "@/lib/accountStore";
import { useSupabaseSession } from "@/lib/supabase/useSession";
import { useSavedPlans } from "@/lib/plansStore";
import { CloudSyncCard } from "@/components/CloudSyncCard";
import { ConnectAccountCard } from "@/components/account/ConnectAccountCard";
import { BillingStatus } from "@/components/billing/BillingStatus";
import { Photo } from "@/components/ui/photo";
import { Button } from "@/components/ui/button";
import { MagicCard } from "@/components/ui/magic-card";
import { NumberTicker } from "@/components/ui/number-ticker";
import { BlurFade } from "@/components/ui/blur-fade";
import { BorderBeam } from "@/components/ui/border-beam";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function AccountPage() {
  const t = useTranslations("Account");
  const tc = useTranslations("Common");
  const tr = useTranslations("Roles");
  const account = useAccount();
  const plans = useSavedPlans();
  const { configured, status, user } = useSupabaseSession();

  // A cloud sign-in is mirrored into the account by CloudAccountBridge. While that session
  // is still resolving (or a user exists but the mirror hasn't landed yet), hold the empty
  // state back so a freshly-logged-in user never sees "you don't have an account yet".
  if (!account && configured && (status === "loading" || user)) {
    return (
      <main className="page-shell flex-1 py-10 lg:py-14" aria-busy="true">
        <div className="mx-auto w-full max-w-2xl">
          <div className="card h-40 animate-pulse rounded-2xl bg-surface-muted" aria-hidden />
        </div>
      </main>
    );
  }

  if (!account) {
    return (
      <main className="page-shell flex-1 py-10 lg:py-14">
        <div className="mx-auto w-full max-w-2xl">
        <BlurFade inView>
          <div className="card overflow-hidden p-0">
            <Photo
              src="/photos/seedlings.jpg"
              alt={t("noAccountPhotoAlt")}
              scrim
              sizes="(max-width: 672px) 100vw, 672px"
              className="flex min-h-44 items-end"
            >
              <div className="p-5">
                <span className="glass-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white">
                  <Sparkles className="size-3.5" aria-hidden />
                  {t("noAccountBadge")}
                </span>
              </div>
            </Photo>
            <div className="flex flex-col items-center gap-4 p-6 text-center sm:p-8">
              <div>
                <p className="title-1 text-foreground">{t("noAccountTitle")}</p>
                <p className="mx-auto mt-2 max-w-md text-base text-muted-foreground">{t("noAccountSubtitle")}</p>
              </div>
              <Button asChild size="lg" className="rounded-full bg-brand text-on-strong hover:bg-brand-strong">
                <Link href="/signup">
                  <Plus className="size-4" aria-hidden />
                  {tc("createAccount")}
                </Link>
              </Button>
            </div>
          </div>
        </BlurFade>
        <div className="mt-4">
          <CloudSyncCard />
        </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell flex-1 py-10 lg:py-14">
      <div className="grid items-start gap-6 lg:grid-cols-[20rem_1fr] lg:gap-10">
      <BlurFade inView className="lg:sticky lg:top-24">
        <div className="card relative flex items-center gap-4 overflow-hidden p-5 lg:flex-col lg:items-start lg:gap-5 lg:p-6">
          <BorderBeam
            size={110}
            duration={8}
            colorFrom="var(--brand)"
            colorTo="var(--accent)"
            className="opacity-60"
          />
          {account.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={account.avatarUrl}
              alt=""
              referrerPolicy="no-referrer"
              className="size-14 rounded-full object-cover lg:size-16"
            />
          ) : (
            <span className="flex size-14 items-center justify-center rounded-full bg-brand text-lg font-semibold text-on-strong lg:size-16">
              {initials(account.name) || "🌱"}
            </span>
          )}
          <div className="min-w-0">
            <h1 className="title-1 truncate text-foreground">{t("greeting", { name: account.name })}</h1>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {account.email ? `${account.email} · ` : ""}
              {t("memberSince", { date: new Date(account.createdAt).toLocaleDateString() })}
            </p>
            {account.role ? (
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand-strong">
                {tr(account.role)}
              </span>
            ) : null}
            {account.bio ? (
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                {account.bio}
              </p>
            ) : null}
            {!account.role && !account.bio ? (
              <Link
                href="/account/settings"
                className="mt-2 inline-block text-sm font-medium text-brand transition hover:text-brand-strong"
              >
                {t("completeProfile")}
              </Link>
            ) : null}
          </div>
        </div>
      </BlurFade>

      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-2 rounded-full bg-surface-muted p-1">
          <TabsTrigger value="overview" className="rounded-full data-[state=active]:bg-brand data-[state=active]:text-on-strong">
            {t("tabOverview")}
          </TabsTrigger>
          <TabsTrigger value="data" className="rounded-full data-[state=active]:bg-brand data-[state=active]:text-on-strong">
            {t("tabData")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <BlurFade inView className="flex">
              <MagicCard className="card hover-lift h-full w-full rounded-xl" gradientOpacity={0.12}>
                <Link href="/plans" className="flex h-full flex-col p-5">
                  <div className="flex items-start justify-between">
                    <span className="flex size-9 items-center justify-center rounded-full bg-brand-soft text-brand">
                      <FileText className="size-5" aria-hidden />
                    </span>
                    <Tooltip>
                      <TooltipTrigger
                        type="button"
                        onClick={(e) => e.preventDefault()}
                        className="-m-2 rounded-full p-2 text-muted transition hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                        aria-label={t("savedPlansHint")}
                      >
                        <Info className="size-4" aria-hidden />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-56">{t("savedPlansHint")}</TooltipContent>
                    </Tooltip>
                  </div>
                  <NumberTicker value={plans.length} className="numeric mt-3 text-3xl font-semibold !text-foreground" />
                  <p className="mt-1 text-base text-muted-foreground">
                    {plans.length === 1 ? t("savedPlanOne") : t("savedPlanOther")}
                  </p>
                </Link>
              </MagicCard>
            </BlurFade>

            <BlurFade inView delay={0.06} className="flex">
              <div className="card hover-lift flex w-full flex-col p-5">
                <span className="flex size-9 items-center justify-center rounded-full bg-[var(--accent)]/15 text-[var(--accent)]">
                  <Plus className="size-5" aria-hidden />
                </span>
                <p className="mt-3 title-3 text-foreground">{t("startNew")}</p>
                <p className="mt-1 text-base text-muted-foreground">{t("startNewBody")}</p>
                <Button
                  asChild
                  size="sm"
                  className="mt-auto w-fit rounded-full bg-brand text-on-strong hover:bg-brand-strong"
                >
                  <Link href="/plan">
                    {tc("startPlan")}
                    <ArrowRight className="size-3.5" aria-hidden />
                  </Link>
                </Button>
              </div>
            </BlurFade>
          </div>

          <BlurFade inView>
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/account/settings">
                <Settings className="size-4" aria-hidden />
                {t("settings")}
              </Link>
            </Button>
          </BlurFade>
        </TabsContent>

        <TabsContent value="data" className="mt-4 space-y-3">
          <BlurFade inView>
            <CloudSyncCard />
          </BlurFade>
          <BlurFade inView delay={0.04}>
            <ConnectAccountCard />
          </BlurFade>
          <BlurFade inView delay={0.08}>
            <BillingStatus />
          </BlurFade>
          <p className="text-sm text-muted-foreground">{t("deviceNote")}</p>
        </TabsContent>
      </Tabs>
      </div>
    </main>
  );
}
