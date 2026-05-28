"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Sparkles, ArrowRight, Mic } from "lucide-react";
import type { RefinementAdjustment } from "@/domain/models";
import { parseCommand } from "@/lib/command/parseCommand";
import { useVoiceInput } from "@/lib/useVoiceInput";

/**
 * Constrained natural-language command bar. Plain text is parsed (deterministically)
 * into the app's existing refinement vocabulary and applied through the SAME onRefine
 * path as the chips. It is NOT a chatbot: it produces structured plan changes, never
 * freeform conversation (CLAUDE.md guardrail).
 */
export function CommandBar({
  adjustments,
  busy,
  onRefine,
}: {
  adjustments: RefinementAdjustment[];
  busy: boolean;
  onRefine: (adjustment: RefinementAdjustment) => void;
}) {
  const t = useTranslations("Command");
  const tr = useTranslations("Refinements");
  const locale = useLocale();
  const [text, setText] = useState("");
  const [applied, setApplied] = useState<RefinementAdjustment[] | null>(null);
  const [noMatch, setNoMatch] = useState(false);
  const voice = useVoiceInput(locale === "zh" ? "zh-CN" : "en-US");

  function toggleVoice() {
    if (voice.listening) {
      voice.stop();
      return;
    }
    const base = text.trim() ? `${text.trim()} ` : "";
    voice.start((spoken) => {
      setText(base + spoken);
      setNoMatch(false);
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const { matched, unmatched } = parseCommand(text);
    if (unmatched || matched.length === 0) {
      setNoMatch(text.trim().length > 0);
      setApplied(null);
      return;
    }
    // Additive only — never toggle an already-active refinement off.
    const toApply = matched.filter((m) => !adjustments.includes(m));
    toApply.forEach((m) => onRefine(m));
    setApplied(matched);
    setNoMatch(false);
    setText("");
  }

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-accent" aria-hidden />
        <h3 className="text-sm font-semibold text-foreground">{t("title")}</h3>
      </div>

      <form onSubmit={submit} className="mt-3 flex gap-2">
        <div className="relative w-full">
          <input
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setNoMatch(false);
            }}
            placeholder={voice.listening ? t("voiceListening") : t("placeholder")}
            aria-label={t("title")}
            disabled={busy}
            className={`card min-h-11 w-full p-2.5 text-sm ${voice.supported ? "pr-12" : ""}`}
          />
          {voice.supported ? (
            <button
              type="button"
              onClick={toggleVoice}
              disabled={busy}
              aria-pressed={voice.listening}
              aria-label={voice.listening ? t("voiceStop") : t("voiceStart")}
              className={`absolute inset-y-0 right-1.5 my-auto flex size-8 items-center justify-center rounded-full transition disabled:opacity-50 ${
                voice.listening
                  ? "animate-pulse bg-danger/15 text-danger"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <Mic className="size-4" aria-hidden />
            </button>
          ) : null}
        </div>
        <button
          type="submit"
          disabled={busy || text.trim().length === 0}
          className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full bg-brand px-4 text-sm font-semibold text-on-strong transition hover:bg-brand-strong disabled:opacity-50"
        >
          {t("apply")} <ArrowRight className="size-4" aria-hidden />
        </button>
      </form>

      {applied && applied.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-sm">
          <span className="text-muted">{t("willApply")}</span>
          {applied.map((a) => (
            <span
              key={a}
              className="inline-flex items-center rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-brand-strong"
            >
              {tr(a)}
            </span>
          ))}
        </div>
      ) : null}

      {noMatch ? <p className="mt-3 text-sm text-muted">{t("noMatch")}</p> : <p className="mt-2 text-xs text-muted">{t("hint")}</p>}
    </div>
  );
}
