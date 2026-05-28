"use client";

/**
 * Browser speech-to-text via the Web Speech API (SpeechRecognition). On-device, free, no key
 * — Doubao-style "tap mic, speak, it types". Degrades gracefully: `supported` is false where
 * the API is missing, so callers can hide the mic. No audio ever leaves the device.
 */
import { useCallback, useEffect, useRef, useState } from "react";

interface SpeechAlternative {
  transcript: string;
}
interface SpeechResult {
  isFinal: boolean;
  0: SpeechAlternative;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: { length: number; [index: number]: SpeechResult };
}
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}
type RecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface VoiceInput {
  supported: boolean;
  listening: boolean;
  /** Start dictation. `onText` fires with the running transcript (interim + final). */
  start: (onText: (text: string) => void) => void;
  stop: () => void;
}

export function useVoiceInput(lang: string): VoiceInput {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  // Feature-detect on the client only (avoids SSR/hydration mismatch).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(getRecognitionCtor() !== null);
  }, []);

  const stop = useCallback(() => {
    recRef.current?.stop();
  }, []);

  const start = useCallback(
    (onText: (text: string) => void) => {
      const Ctor = getRecognitionCtor();
      if (!Ctor) return;
      recRef.current?.abort();

      const rec = new Ctor();
      rec.lang = lang;
      rec.interimResults = true;
      rec.continuous = false;
      let finalText = "";
      rec.onresult = (event) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          if (result.isFinal) finalText += result[0].transcript;
          else interim += result[0].transcript;
        }
        onText((finalText + interim).trim());
      };
      rec.onend = () => {
        setListening(false);
        recRef.current = null;
      };
      rec.onerror = () => {
        setListening(false);
      };

      recRef.current = rec;
      setListening(true);
      rec.start();
    },
    [lang],
  );

  // Stop any in-flight recognition when the consumer unmounts.
  useEffect(() => () => recRef.current?.abort(), []);

  return { supported, listening, start, stop };
}
