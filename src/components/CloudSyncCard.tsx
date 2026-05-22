"use client";

/**
 * Optional cloud-sync card. Renders nothing unless Supabase is configured, so the device-account
 * flow is unchanged when there's no backend (docs/DECISIONS.md D12). When configured it offers a
 * lightweight email + password sign in / sign up and shows the current sync status.
 */
import { useState } from "react";
import { useSupabaseSession } from "@/lib/supabase/useSession";

export function CloudSyncCard() {
  const { configured, status, user, signInWithPassword, signUpWithPassword, signOut } =
    useSupabaseSession();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!configured) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    const fn = mode === "signin" ? signInWithPassword : signUpWithPassword;
    const { error: err } = await fn(email.trim(), password);
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    if (mode === "signup") setMessage("Account created. Check your email if confirmation is required.");
    setPassword("");
  }

  if (status === "loading") {
    return <div className="card p-5 text-sm text-muted">Checking cloud sync…</div>;
  }

  if (user) {
    return (
      <div className="card p-5">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-2 w-2 rounded-full bg-brand" aria-hidden />
          <p className="text-sm font-semibold text-foreground">Synced to cloud</p>
        </div>
        <p className="mt-1 text-sm text-muted">
          Signed in as {user.email}. Plans and profile sync across your devices.
        </p>
        <button
          onClick={() => void signOut()}
          className="mt-3 rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground transition hover:border-brand"
        >
          Sign out of cloud
        </button>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <p className="text-sm font-semibold text-foreground">
        {mode === "signin" ? "Sign in to sync across devices" : "Create a cloud account"}
      </p>
      <p className="mt-1 text-xs text-muted">
        Optional. Your plans already save on this device — signing in syncs them to the cloud.
      </p>
      <form onSubmit={submit} className="mt-3 space-y-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-brand px-4 py-2 text-sm font-semibold text-on-strong transition hover:bg-brand-strong disabled:opacity-50"
        >
          {busy ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>
      {error ? <p className="mt-2 text-xs text-[var(--danger)]">{error}</p> : null}
      {message ? <p className="mt-2 text-xs text-brand-strong">{message}</p> : null}
      <button
        onClick={() => {
          setMode((m) => (m === "signin" ? "signup" : "signin"));
          setError(null);
          setMessage(null);
        }}
        className="mt-3 text-xs text-muted underline hover:text-foreground"
      >
        {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
      </button>
    </div>
  );
}
