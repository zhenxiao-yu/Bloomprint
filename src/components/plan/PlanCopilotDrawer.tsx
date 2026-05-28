"use client";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Lightbulb, Mic, Paperclip, Send, Sparkles, X } from "lucide-react";

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
import { useVoiceInput } from "@/lib/useVoiceInput";
import { fileToDataUrl, readImageRegions } from "@/lib/workspace/sceneRead";

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
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [observations, setObservations] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const voice = useVoiceInput(locale === "zh" ? "zh-CN" : "en-US");

  // On-device scene read of an attached photo → honest, localized "I can see…" chips.
  async function handleImage(file: File) {
    if (!file.type.startsWith("image/")) return;
    setAnalyzing(true);
    try {
      const url = await fileToDataUrl(file);
      setImagePreview(url);
      const region = await readImageRegions(url);
      const obs: string[] = [];
      if (region) {
        if (region.greenRatio > 0.18) obs.push(t("sceneGreenery"));
        if (region.hardscapeRatio > 0.18) obs.push(t("sceneHardscape"));
        if (region.skyRatio > 0.16) obs.push(t("sceneSky"));
        if (region.shadowRatio > 0.28) obs.push(t("sceneShade"));
      }
      setObservations(obs);
    } catch {
      setObservations([]);
    } finally {
      setAnalyzing(false);
    }
  }

  function clearImage() {
    setImagePreview(null);
    setObservations([]);
    setAnalyzing(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  // Doubao-style dictation: append the running transcript to whatever's already typed.
  function toggleVoice() {
    if (voice.listening) {
      voice.stop();
      return;
    }
    const base = question.trim() ? `${question.trim()} ` : "";
    voice.start((text) => setQuestion(base + text));
  }

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
          imageContext: observations.length > 0 ? observations : undefined,
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
      voice.stop();
      clearImage();
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="relative max-w-lg"
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) {
            e.preventDefault();
            setDragging(true);
          }
        }}
        onDragLeave={(e) => {
          if (e.currentTarget === e.target) setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void handleImage(file);
        }}
      >
        {dragging ? (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] border-2 border-dashed border-brand bg-brand-soft/85 backdrop-blur-sm">
            <p className="text-sm font-semibold text-brand-strong">{t("dropImage")}</p>
          </div>
        ) : null}
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

        {/* Attached-photo context: thumbnail + honest on-device "I can see…" chips. */}
        {imagePreview ? (
          <div className="flex items-start gap-3 rounded-xl border border-border bg-surface-muted/30 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePreview}
              alt=""
              className="size-14 shrink-0 rounded-lg object-cover"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="eyebrow text-muted-foreground">{t("imageContextLabel")}</p>
                <button
                  type="button"
                  onClick={clearImage}
                  aria-label={t("removeImage")}
                  className="-m-1 rounded-full p-1 text-muted transition hover:text-foreground"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </div>
              {analyzing ? (
                <p className="mt-1 text-xs text-muted-foreground">{t("imageAnalyzing")}</p>
              ) : observations.length > 0 ? (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {observations.map((o) => (
                    <span
                      key={o}
                      className="rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-medium text-brand-strong"
                    >
                      {o}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">{t("imageNoRead")}</p>
              )}
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
          <div className="relative flex-1">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={voice.listening ? t("voiceListening") : t("placeholder")}
              maxLength={400}
              aria-label={t("placeholder")}
              className="pr-19"
            />
            <div className="absolute inset-y-0 right-1.5 flex items-center gap-0.5">
              {voice.supported ? (
                <button
                  type="button"
                  onClick={toggleVoice}
                  aria-pressed={voice.listening}
                  aria-label={voice.listening ? t("voiceStop") : t("voiceStart")}
                  className={`flex size-8 items-center justify-center rounded-full transition ${
                    voice.listening
                      ? "animate-pulse bg-danger/15 text-danger"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  <Mic className="size-4" aria-hidden />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                aria-label={t("attachImage")}
                className="flex size-8 items-center justify-center rounded-full text-muted transition hover:text-foreground"
              >
                <Paperclip className="size-4" aria-hidden />
              </button>
            </div>
          </div>
          <Button type="submit" size="icon" disabled={busy || !question.trim()} aria-label={t("ask")}>
            <Send className="size-4" aria-hidden />
          </Button>
        </form>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleImage(file);
            e.target.value = "";
          }}
        />

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
