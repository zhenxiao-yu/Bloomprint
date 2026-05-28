"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Sparkles, WifiOff } from "lucide-react";

import type { GardenAnswer, GardenTopic } from "@/ai/gardenQa";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, ToolExplainer } from "@/components/toolbox/_shared";

const TOPICS: GardenTopic[] = ["general", "planting", "watering", "pruning", "pests", "soil", "lawn"];
const MAX_Q = 300;

/**
 * Bounded, single-turn gardening Q&A (D15) — DeepSeek when configured, honest offline guidance
 * otherwise. Not a chatbot: one capped question, one answer, a standing disclaimer.
 */
export function GardenAiCalculator() {
  const t = useTranslations("Tools.gardenAi");
  const locale = useLocale();

  const [topic, setTopic] = useState<GardenTopic>("general");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<GardenAnswer | null>(null);
  const [errored, setErrored] = useState(false);

  const prompts = t.has("prompts") ? (t.raw("prompts") as string[]) : [];
  const evidence = t.has("evidence") ? (t.raw("evidence") as string[]) : [];

  async function ask(q: string) {
    const text = q.trim();
    if (text.length < 3 || loading) return;
    setLoading(true);
    setErrored(false);
    setAnswer(null);
    try {
      const res = await fetch("/api/toolbox/ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: text.slice(0, MAX_Q), topic, locale }),
      });
      if (!res.ok) {
        setErrored(true);
      } else {
        setAnswer((await res.json()) as GardenAnswer);
      }
    } catch {
      setErrored(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-[12rem_1fr] sm:items-end">
          <Field label={t("topic")}>
            <Select value={topic} onValueChange={(v) => setTopic(v as GardenTopic)}>
              <SelectTrigger aria-label={t("topic")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TOPICS.map((x) => (
                  <SelectItem key={x} value={x}>
                    {t(`topic_${x}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <form
            className="flex flex-col gap-2 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              void ask(question);
            }}
          >
            <div className="flex-1">
              <label className="mb-1.5 block text-sm font-medium text-foreground" htmlFor="garden-q">
                {t("title")}
              </label>
              <textarea
                id="garden-q"
                value={question}
                onChange={(e) => setQuestion(e.target.value.slice(0, MAX_Q))}
                placeholder={t("placeholder")}
                rows={2}
                className="w-full resize-none rounded-xl border border-border bg-surface p-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              />
            </div>
            <Button
              type="submit"
              disabled={loading || question.trim().length < 3}
              className="shrink-0 rounded-full bg-brand text-on-strong hover:bg-brand-strong"
            >
              {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
              {loading ? t("loading") : t("ask")}
            </Button>
          </form>
        </div>

        {/* Suggested prompts — a constrained entry point, not freeform chat. */}
        {!answer && !loading ? (
          <div className="flex flex-col gap-2">
            <p className="eyebrow text-muted-foreground">{t("tryAsking")}</p>
            <div className="flex flex-wrap gap-2">
              {prompts.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setQuestion(p);
                    void ask(p);
                  }}
                  className="rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground transition hover:border-brand hover:text-foreground"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {answer ? (
          <div className="rounded-2xl border border-border bg-surface p-5">
            <Badge
              variant="outline"
              className={answer.source === "ai" ? "border-brand/40 text-brand-strong" : "text-muted-foreground"}
            >
              {answer.source === "ai" ? (
                <Sparkles className="size-3" aria-hidden />
              ) : (
                <WifiOff className="size-3" aria-hidden />
              )}
              {answer.source === "ai" ? t("aiBadge") : t("offlineBadge")}
            </Badge>
            <p className="mt-3 text-base leading-relaxed text-foreground">{answer.answer}</p>
            {answer.tips.length > 0 ? (
              <div className="mt-3">
                <p className="eyebrow text-muted-foreground">{t("tipsTitle")}</p>
                <ul className="mt-1 flex flex-col gap-1 text-sm text-muted-foreground">
                  {answer.tips.map((tip, i) => (
                    <li key={i} className="flex gap-2">
                      <span aria-hidden className="text-brand">
                        •
                      </span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">{answer.disclaimer}</p>
          </div>
        ) : errored ? (
          <p className="rounded-2xl border border-warn/30 bg-warn/5 p-4 text-sm text-foreground">{t("error")}</p>
        ) : !loading ? (
          <div className="flex min-h-32 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface-muted/40 p-6 text-center">
            <Sparkles className="size-7 text-muted-foreground" aria-hidden />
            <p className="mt-2 text-base font-medium text-foreground">{t("emptyTitle")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("emptyBody")}</p>
          </div>
        ) : null}
      </div>

      <ToolExplainer formula={t("formula")} how={t("how")} evidence={evidence} />
    </div>
  );
}
