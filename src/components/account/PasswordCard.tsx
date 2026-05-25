"use client";

/**
 * Password management card for /account/settings. Renders nothing unless Supabase is configured,
 * so the app never blocks on a backend (docs/DECISIONS.md D12). When signed in it offers a
 * "change password" form; when configured but signed out it offers a password-reset email.
 */
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSupabaseSession } from "@/lib/supabase/useSession";

const MIN_LENGTH = 8;

function strengthHint(t: ReturnType<typeof useTranslations>, value: string): string | null {
  if (!value) return null;
  if (value.length < MIN_LENGTH) return t("strengthWeak");
  const hasMix = /[a-z]/.test(value) && /[A-Z]/.test(value);
  const hasNumberOrSymbol = /[0-9]/.test(value) || /[^A-Za-z0-9]/.test(value);
  if (value.length >= 12 && hasMix && hasNumberOrSymbol) return t("strengthStrong");
  return t("strengthOkay");
}

export function PasswordCard() {
  const t = useTranslations("Account");
  const { configured, user, updatePassword, requestPasswordReset } = useSupabaseSession();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The app never blocks without Supabase.
  if (!configured) return null;

  const inputClass =
    "w-full rounded-lg border border-border bg-background p-2 text-sm text-foreground";
  const primaryBtn =
    "rounded-full bg-brand px-4 py-2 text-sm font-semibold text-on-strong transition hover:bg-brand-strong disabled:opacity-50";
  const labelClass = "mb-1 block text-xs font-semibold uppercase tracking-wide text-muted";

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (password.length < MIN_LENGTH) {
      setError(t("pwTooShort", { min: MIN_LENGTH }));
      return;
    }
    if (password !== confirm) {
      setError(t("pwMismatch"));
      return;
    }
    setBusy(true);
    const { error: err } = await updatePassword(password);
    setBusy(false);
    if (err) {
      setError(t("pwUpdateError"));
      return;
    }
    setMessage(t("pwUpdated"));
    setPassword("");
    setConfirm("");
  }

  async function handleResetRequest(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setBusy(true);
    const { error: err } = await requestPasswordReset(resetEmail.trim());
    setBusy(false);
    if (err) {
      setError(t("resetError"));
      return;
    }
    setMessage(t("resetSent"));
    setResetEmail("");
  }

  const hint = strengthHint(t, password);

  return (
    <div className="card p-5">
      {user ? (
        <>
          <p className="text-sm font-semibold text-foreground">{t("changePasswordTitle")}</p>
          <p className="mt-1 text-xs text-muted">{t("changePasswordSubtitle")}</p>
          <form onSubmit={handleChangePassword} className="mt-3 space-y-3">
            <div>
              <label htmlFor="pw-new">
                <span className={labelClass}>{t("newPasswordLabel")}</span>
              </label>
              <input
                id="pw-new"
                type="password"
                required
                minLength={MIN_LENGTH}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
              {hint ? (
                <p className="mt-1 text-xs text-muted" aria-live="polite">
                  {hint}
                </p>
              ) : null}
            </div>
            <div>
              <label htmlFor="pw-confirm">
                <span className={labelClass}>{t("confirmPasswordLabel")}</span>
              </label>
              <input
                id="pw-confirm"
                type="password"
                required
                minLength={MIN_LENGTH}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={inputClass}
              />
            </div>
            <button type="submit" disabled={busy} className={primaryBtn}>
              {busy ? t("pwWorking") : t("updatePasswordButton")}
            </button>
          </form>
        </>
      ) : (
        <>
          <p className="text-sm font-semibold text-foreground">{t("forgotPasswordTitle")}</p>
          <p className="mt-1 text-xs text-muted">{t("forgotPasswordSubtitle")}</p>
          <form onSubmit={handleResetRequest} className="mt-3 space-y-3">
            <div>
              <label htmlFor="pw-reset-email">
                <span className={labelClass}>{t("emailLabel")}</span>
              </label>
              <input
                id="pw-reset-email"
                type="email"
                required
                autoComplete="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className={inputClass}
              />
            </div>
            <button type="submit" disabled={busy} className={primaryBtn}>
              {busy ? t("pwWorking") : t("sendResetButton")}
            </button>
          </form>
        </>
      )}

      <div aria-live="polite">
        {error ? <p className="mt-3 text-xs text-danger">{error}</p> : null}
        {message ? <p className="mt-3 text-xs text-brand-strong">{message}</p> : null}
      </div>
    </div>
  );
}
