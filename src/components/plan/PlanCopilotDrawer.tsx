"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Lightbulb, Send, Sparkles } from "lucide-react";

import type { RefinementAdjustment } from "@/domain/models";
import { SectionAnswer, type SectionType } from "@/ai/sectionCopilot";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface CopilotSection {
  type: SectionType;
  title: string;
  /** Localized suggested questions for this section (constrained, helpful). */
  prompts: string[];
}

/**
 * Bounded section copilot UI (docs/DECISIONS.md D15). Explains ONE section and routes any
 * change-intent through the deterministic refinement flow — it never mutates plan facts.
 * Talks to POST /api/plan/ask (mock-first; works with no AI key).
 */
export function PlanCopilotDrawer({
  section,
  open,
  onOpenChange,
  onRefine,
  region,
}: {
  section: CopilotSection | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefine: (adjustment: RefinementAdjustment) => void;
  region?: string;
}) {
  const t = useTranslations("Copilot");
  const tr = useTranslations("Refinements");
  const locale = useLocale();
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<SectionAnswer | null>(null);
  const [errored, setErrored] = useState(false);

  async function ask(q: string) {
    const text = q.trim();
    if (!text || !section) return;
    setBusy(true);
    setErrored(false);
    try {
      const res = await fetch("/api/plan/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sectionType: section.type,
          sectionTitle: section.title,
          question: text,
          region,
          locale: locale === "zh" ? "zh" : "en",
        }),
      });
      if (!res.ok) throw new Error("ask failed");
      const parsed = SectionAnswer.safeParse(await res.json());
      if (!parsed.success) throw new Error("invalid answer");
      setAnswer(parsed.data);
    } catch {
      setErrored(true);
      setAnswer(null);
    } finally {
      setBusy(false);
    }
  }

  function applyRefinement(adjustment: RefinementAdjustment) {
    onRefine(adjustment);
    onOpenChange(false);
    toast.success(t("applied", { label: tr(adjustment) }));
  }

  // Reset the transient Q&A when the drawer closes so it reopens clean per section.
  function handleOpenChange(next: boolean) {
    if (!next) {
      setQuestion("");
      setAnswer(null);
      setErrored(false);
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-brand" aria-hidden />
            {section ? t("title", { section: section.title }) : t("titleGeneric")}
          </DialogTitle>
          <DialogDescription>{t("disclaimer")}</DialogDescription>
        </DialogHeader>

        {/* Suggested, constrained questions for this section. */}
        {section && section.prompts.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="eyebrow text-muted-foreground">{t("tryAsking")}</p>
            <div className="flex flex-wrap gap-2">
              {section.prompts.map((p) => (
                <button
                  key={p}
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setQuestion(p);
                    void ask(p);
                  }}
                  className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-foreground transition hover:border-brand hover:bg-brand-soft/40 disabled:opacity-50"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <form
          className="mt-1 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void ask(question);
          }}
        >
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t("placeholder")}
            maxLength={400}
            aria-label={t("placeholder")}
          />
          <Button type="submit" size="icon" disabled={busy || !question.trim()} aria-label={t("ask")}>
            <Send className="size-4" aria-hidden />
          </Button>
        </form>

        {busy ? <p className="text-sm text-muted-foreground">{t("thinking")}</p> : null}
        {errored ? <p className="text-sm text-[var(--danger)]">{t("error")}</p> : null}

        {answer ? (
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-muted/30 p-4">
            <p className="text-base leading-relaxed text-foreground">{answer.answer}</p>
            {answer.suggestedRefinements.length > 0 ? (
              <div className="flex flex-col gap-2 border-t border-border pt-3">
                <p className="flex items-center gap-1.5 eyebrow text-muted-foreground">
                  <Lightbulb className="size-3.5" aria-hidden />
                  {t("turnIntoChange")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {answer.suggestedRefinements.map((adj) => (
                    <Button
                      key={adj}
                      size="sm"
                      variant="secondary"
                      className="rounded-full"
                      onClick={() => applyRefinement(adj)}
                    >
                      {tr(adj)}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}
            <p className="text-xs text-muted-foreground">{answer.disclaimer}</p>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
