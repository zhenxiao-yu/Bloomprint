/**
 * Optional Supabase auth session hook. When Supabase isn't configured it reports
 * `configured: false` and a null user, and the app stays fully local — auth is never a gate
 * (docs/DECISIONS.md D5/D12). Email + password is used for reliability (no redirect handling).
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "./client";

export interface SupabaseSessionState {
  configured: boolean;
  status: "loading" | "ready";
  session: Session | null;
  user: User | null;
  userId: string | null;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

export function useSupabaseSession(): SupabaseSessionState {
  const configured = isSupabaseConfigured();
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<"loading" | "ready">(configured ? "loading" : "ready");

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    // Not configured → status already initialized to "ready"; nothing to subscribe to.
    if (!supabase) return;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setStatus("ready");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setStatus("ready");
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return { error: "Cloud sync isn't configured." };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signUpWithPassword = useCallback(async (email: string, password: string) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return { error: "Cloud sync isn't configured." };
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) await supabase.auth.signOut();
  }, []);

  return {
    configured,
    status,
    session,
    user: session?.user ?? null,
    userId: session?.user?.id ?? null,
    signInWithPassword,
    signUpWithPassword,
    signOut,
  };
}
