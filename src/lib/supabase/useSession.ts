/**
 * Optional Supabase auth session hook. When Supabase isn't configured it reports
 * `configured: false` and a null user, and the app stays fully local — auth is never a gate
 * (docs/DECISIONS.md D5/D12).
 *
 * Methods: email magic-link/OTP (passwordless), email+password, Google OAuth, and phone SMS OTP
 * (dormant until an SMS provider is configured). Sessions are cookie-based via @supabase/ssr.
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "./client";

type Result = { error: string | null };
const NOT_CONFIGURED: Result = { error: "Cloud sync isn't configured." };

function origin(): string {
  return typeof window !== "undefined" ? window.location.origin : "";
}

export interface SupabaseSessionState {
  configured: boolean;
  status: "loading" | "ready";
  session: Session | null;
  user: User | null;
  userId: string | null;
  // Passwordless email (sends a 6-digit code + magic link)
  signInWithEmailOtp: (email: string) => Promise<Result>;
  verifyEmailOtp: (email: string, token: string) => Promise<Result>;
  // Password (kept for users who prefer it)
  signInWithPassword: (email: string, password: string) => Promise<Result>;
  signUpWithPassword: (email: string, password: string) => Promise<Result>;
  // Google OAuth (redirects to /auth/callback)
  signInWithGoogle: () => Promise<Result>;
  // Phone SMS OTP — dormant until an SMS provider is configured
  signInWithPhoneOtp: (phone: string) => Promise<Result>;
  verifyPhoneOtp: (phone: string, token: string) => Promise<Result>;
  // Password management (signed-in change + signed-out reset email)
  updatePassword: (newPassword: string) => Promise<Result>;
  requestPasswordReset: (email: string) => Promise<Result>;
  signOut: () => Promise<void>;
}

export function useSupabaseSession(): SupabaseSessionState {
  const configured = isSupabaseConfigured();
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<"loading" | "ready">(configured ? "loading" : "ready");

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
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

  const signInWithEmailOtp = useCallback(async (email: string): Promise<Result> => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return NOT_CONFIGURED;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${origin()}/auth/confirm`, shouldCreateUser: true },
    });
    return { error: error?.message ?? null };
  }, []);

  const verifyEmailOtp = useCallback(async (email: string, token: string): Promise<Result> => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return NOT_CONFIGURED;
    const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    return { error: error?.message ?? null };
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string): Promise<Result> => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return NOT_CONFIGURED;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signUpWithPassword = useCallback(async (email: string, password: string): Promise<Result> => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return NOT_CONFIGURED;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${origin()}/auth/confirm` },
    });
    return { error: error?.message ?? null };
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<Result> => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return NOT_CONFIGURED;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${origin()}/auth/callback` },
    });
    return { error: error?.message ?? null };
  }, []);

  const signInWithPhoneOtp = useCallback(async (phone: string): Promise<Result> => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return NOT_CONFIGURED;
    const { error } = await supabase.auth.signInWithOtp({ phone });
    return { error: error?.message ?? null };
  }, []);

  const verifyPhoneOtp = useCallback(async (phone: string, token: string): Promise<Result> => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return NOT_CONFIGURED;
    const { error } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });
    return { error: error?.message ?? null };
  }, []);

  const updatePassword = useCallback(async (newPassword: string): Promise<Result> => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return NOT_CONFIGURED;
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error: error?.message ?? null };
  }, []);

  const requestPasswordReset = useCallback(async (email: string): Promise<Result> => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return NOT_CONFIGURED;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin()}/auth/confirm`,
    });
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
    signInWithEmailOtp,
    verifyEmailOtp,
    signInWithPassword,
    signUpWithPassword,
    signInWithGoogle,
    signInWithPhoneOtp,
    verifyPhoneOtp,
    updatePassword,
    requestPasswordReset,
    signOut,
  };
}
