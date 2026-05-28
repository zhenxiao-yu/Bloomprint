"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, MapPin } from "lucide-react";

import { isValidUsZip, type HardinessResult } from "@/domain/toolbox/hardiness";
import { Link } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import { Field, ToolExplainer } from "@/components/toolbox/_shared";

type Status = "idle" | "loading" | "ok" | "error";
type ApiOk = HardinessResult & { source: string; fetchedAt: string };

/**
 * Live USDA hardiness-zone lookup by ZIP (server proxy → phzmapi.org). Mock-free but graceful:
 * any failure falls back to a clear message + the USDA map, and the tool still explains itself.
 */
export function HardinessCalculator() {
  const t = useTranslations("Tools.hardiness");

  const [zip, setZip] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<ApiOk | null>(null);
  const [errorKey, setErrorKey] = useState<"errNotFound" | "errUnreachable">("errUnreachable");
  // The ZIP a result/error belongs to, so a changed ZIP never shows a stale zone.
  const [forZip, setForZip] = useState("");

  const valid = isValidUsZip(zip);

  useEffect(() => {
    if (!isValidUsZip(zip)) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setStatus("loading");
      try {
        const res = await fetch(`/api/toolbox/hardiness?zip=${zip}`, { signal: controller.signal });
        if (controller.signal.aborted) return;
        if (res.ok) {
          setResult((await res.json()) as ApiOk);
          setForZip(zip);
          setStatus("ok");
        } else {
          setErrorKey(res.status === 404 ? "errNotFound" : "errUnreachable");
          setForZip(zip);
          setStatus("error");
        }
      } catch {
        if (!controller.signal.aborted) {
          setErrorKey("errUnreachable");
          setForZip(zip);
          setStatus("error");
        }
      }
    }, 400);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [zip]);

  const fresh = forZip === zip;
  const showOk = valid && fresh && status === "ok" && result;
  const showError = valid && fresh && status === "error";
  const showLoading = valid && !showOk && !showError;
  const evidence = t.has("evidence") ? (t.raw("evidence") as string[]) : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <form className="flex flex-col gap-5" onSubmit={(e) => e.preventDefault()}>
          <Field label={t("zipLabel")}>
            <Input
              inputMode="numeric"
              maxLength={5}
              value={zip}
              onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
              placeholder={t("zipPlaceholder")}
              aria-label={t("zipLabel")}
            />
          </Field>
        </form>

        <div className="flex flex-col gap-4">
          {showOk && result ? (
            <div className="rounded-2xl border border-border bg-surface p-6">
              <p className="eyebrow text-brand">{t("zoneLabel")}</p>
              <p className="numeric display-lg mt-1 text-foreground">{result.zone}</p>
              {result.tempLowF !== null && result.tempHighF !== null ? (
                <p className="mt-1 text-base text-muted-foreground">
                  {t("tempRange", { low: result.tempLowF, high: result.tempHighF })}
                </p>
              ) : null}
              <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">{result.source}</p>
              <p className="mt-1 text-xs text-warn">{t("verify")}</p>
              <Link
                href="/toolbox/plantFinder"
                className="mt-3 inline-flex text-sm font-semibold text-brand hover:text-brand-strong"
              >
                {t("usePlantFinder")} →
              </Link>
            </div>
          ) : showLoading ? (
            <div className="flex min-h-48 items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface-muted/40 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {t("loading")}
            </div>
          ) : showError ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-2xl border border-warn/30 bg-warn/5 p-6 text-center">
              <MapPin className="size-6 text-warn" aria-hidden />
              <p className="text-sm text-foreground">{t(errorKey)}</p>
              <a
                href="https://planthardiness.ars.usda.gov/"
                target="_blank"
                rel="noreferrer"
                className="text-sm font-semibold text-brand hover:underline"
              >
                planthardiness.ars.usda.gov
              </a>
            </div>
          ) : (
            <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface-muted/40 p-6 text-center">
              <MapPin className="size-7 text-muted-foreground" aria-hidden />
              <p className="mt-2 text-base font-medium text-foreground">{t("emptyTitle")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("emptyBody")}</p>
            </div>
          )}
        </div>
      </div>

      <ToolExplainer formula={t("formula")} how={t("how")} evidence={evidence} />
    </div>
  );
}
