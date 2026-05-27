"use client";

import { useTranslations } from "next-intl";
import { ShieldCheck } from "lucide-react";
import type { PlanEvidence } from "@/domain/models";
import { SOURCE_LEVELS } from "@/domain/evidence/sourceQuality";
import type { ViewMode } from "@/components/PlanResult";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Honest helper: a small badge that, on hover/focus, explains a trust term. */
function TermTip({ term, explanation }: { term: string; explanation: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        className="cursor-help rounded text-xs font-semibold uppercase tracking-wide text-muted underline decoration-dotted decoration-muted/50 underline-offset-2 transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        {term}
      </TooltipTrigger>
      <TooltipContent className="max-w-[16rem] leading-relaxed">{explanation}</TooltipContent>
    </Tooltip>
  );
}

/**
 * "Why should I trust this?" — inputs, assumptions, confidence by dimension, and ranked sources.
 * Static chrome is localized; engine-produced strings (dimension names, source names, assumption
 * text) stay in their source language by the same convention that keeps plant names untranslated.
 */
export function EvidenceDrawer({ evidence, view }: { evidence: PlanEvidence; view: ViewMode }) {
  const t = useTranslations("Evidence");
  const expert = view !== "simple";
  const simpleSources = evidence.sources.slice(0, 3);
  return (
    <Accordion type="single" collapsible className="card p-5">
      <AccordionItem value="evidence" className="border-b-0">
        <AccordionTrigger className="py-0 text-base font-semibold text-foreground hover:no-underline">
          <span className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-trust" aria-hidden />
            {expert ? t("titleExpert") : t("titleSimple")}
          </span>
        </AccordionTrigger>
        <AccordionContent className="pt-3">
          {!expert ? (
            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-lg bg-brand-soft p-3">
                <p className="font-semibold text-brand-strong">{t("trustHead")}</p>
                <p className="mt-1 text-foreground/80">{t("trustBody")}</p>
              </div>
              <div className="rounded-lg bg-[var(--warn)]/10 p-3">
                <p className="font-semibold text-[var(--warn)]">{t("checkHead")}</p>
                <p className="mt-1 text-foreground/80">{evidence.assumptions[0] ?? t("checkFallback")}</p>
              </div>
              <div className="rounded-lg bg-border/50 p-3">
                <p className="font-semibold text-foreground">{t("verifyHead")}</p>
                <p className="mt-1 text-muted">{evidence.needsLocalVerification[0] ?? t("verifyFallback")}</p>
              </div>
            </div>
          ) : null}

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("basedOn")}</p>
              <ul className="mt-1 space-y-0.5 text-sm text-foreground">
                {evidence.inputs.map((i) => (
                  <li key={i}>✓ {i}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <TermTip term={t("confidence")} explanation={t("tipConfidenceDimension")} />
              </div>
              <ul className="mt-1 space-y-0.5 text-sm text-foreground">
                {evidence.confidenceByDimension.map((c) => (
                  <li key={c.dimension} className="flex justify-between gap-2">
                    <span className="text-muted">{c.dimension}</span>
                    <span className="font-medium">{c.level}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {evidence.assumptions.length > 0 ? (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                {expert ? t("assumed") : t("checkHead")}
              </p>
              <ul className="mt-1 space-y-0.5 text-sm text-muted">
                {evidence.assumptions.map((a) => (
                  <li key={a}>⚠ {a}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-4">
            <div className="flex items-center gap-1.5">
              <TermTip
                term={expert ? t("sources") : t("sourcesSimple")}
                explanation={t("tipSourceLadder")}
              />
            </div>
            <ul className="mt-1 space-y-1 text-sm">
              {(expert ? evidence.sources : simpleSources).map((s) => {
                const lvl = SOURCE_LEVELS.find((l) => l.level === s.level);
                const supports = s.supports.length > 0 ? s.supports.join(", ") : lvl?.description;
                return (
                  <li key={s.name} className="flex flex-wrap items-center gap-2">
                    {s.url ? (
                      <a href={s.url} target="_blank" rel="noreferrer" className="font-medium text-brand hover:underline">
                        {s.sourceName ?? s.name}
                      </a>
                    ) : (
                      <span className="font-medium text-foreground">{s.sourceName ?? s.name}</span>
                    )}
                    {expert ? (
                      <Tooltip>
                        <TooltipTrigger
                          type="button"
                          className="cursor-help rounded bg-border px-1.5 py-0.5 text-xs text-muted transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                        >
                          L{s.level} · {s.sourceQuality ?? lvl?.name}
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[16rem] leading-relaxed">
                          {lvl?.description ?? t("tipSourceLadder")}
                        </TooltipContent>
                      </Tooltip>
                    ) : null}
                    {expert && s.confidence ? (
                      <span className="rounded bg-brand-soft px-1.5 py-0.5 text-xs text-brand-strong">
                        {t("confidenceTag", { level: s.confidence })}
                      </span>
                    ) : null}
                    {expert && s.cacheStatus ? (
                      <span className="rounded bg-border px-1.5 py-0.5 text-xs text-muted">
                        {t("cacheTag", { status: s.cacheStatus })}
                      </span>
                    ) : null}
                    {expert && supports ? (
                      <span className="basis-full text-xs text-muted">{t("supports", { items: supports })}</span>
                    ) : null}
                    {expert && s.retrievedAt ? (
                      <span className="basis-full text-xs text-muted">
                        {t("retrieved", { when: new Date(s.retrievedAt).toLocaleString() })}
                      </span>
                    ) : null}
                    {expert && s.verifiedAt ? (
                      <span className="rounded bg-brand-soft px-1.5 py-0.5 text-xs text-brand-strong">
                        {t("verified", { when: new Date(s.verifiedAt).toLocaleDateString() })}
                      </span>
                    ) : null}
                    {expert && s.notes ? <span className="basis-full text-xs text-muted">{s.notes}</span> : null}
                  </li>
                );
              })}
            </ul>
            {expert && evidence.needsLocalVerification.length > 0 ? (
              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("verifyHead")}</p>
                <ul className="mt-1 space-y-0.5 text-sm text-muted">
                  {evidence.needsLocalVerification.map((item) => (
                    <li key={item}>→ {item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {expert && evidence.fallbackNotes.length > 0 ? (
              <p className="mt-3 rounded bg-border/50 p-2 text-xs text-muted">
                {evidence.fallbackNotes.join(" ")}
              </p>
            ) : null}
            <p className="mt-3 flex flex-wrap items-center gap-1.5 rounded-lg bg-trust/5 p-2 text-xs text-muted">
              <ShieldCheck className="size-3.5 text-trust" aria-hidden />
              <span className="font-semibold text-foreground">{t("openDataTitle")}</span>
              <a href="https://www.gbif.org/" target="_blank" rel="noreferrer" className="text-brand hover:underline">GBIF</a>
              <span aria-hidden>·</span>
              <a href="https://phzmapi.org/" target="_blank" rel="noreferrer" className="text-brand hover:underline">USDA</a>
              <span aria-hidden>·</span>
              <span>{t("openDataCore")}</span>
              <span className="basis-full text-[11px] text-muted/80">{t("openDataNote")}</span>
            </p>
            <p className="mt-2 text-xs text-muted">{t("footerNote")}</p>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
