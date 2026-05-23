"use client";

/**
 * Optional cloud-sync card. Renders nothing unless Supabase is configured, so the device-account
 * flow is unchanged when there's no backend (docs/DECISIONS.md D12). When configured it offers real
 * Supabase auth: Google, passwordless email (6-digit code / magic link), email+password, and phone
 * SMS OTP (gated behind NEXT_PUBLIC_ENABLE_PHONE_AUTH until an SMS provider is set up).
 */
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSupabaseSession } from "@/lib/supabase/useSession";

const PHONE_ENABLED = process.env.NEXT_PUBLIC_ENABLE_PHONE_AUTH === "true";

type Method = "otp" | "password" | "phone";

export function CloudSyncCard() {
  const t = useTranslations("Auth");
  const {
    configured,
    status,
    user,
    signInWithEmailOtp,
    verifyEmailOtp,
    signInWithPassword,
    signUpWithPassword,
    signInWithGoogle,
    signInWithPhoneOtp,
    verifyPhoneOtp,
    signOut,
  } = useSupabaseSession();

  const [method, setMethod] = useState<Method>("otp");
  const [pwMode, setPwMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!configured) return null;

  if (status === "loading") {
    return <div className="card p-5 text-sm text-muted">{t("checking")}</div>;
  }

  if (user) {
    return (
      <div className="card p-5">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-2 w-2 rounded-full bg-brand" aria-hidden />
          <p className="text-sm font-semibold text-foreground">{t("syncedTitle")}</p>
        </div>
        <p className="mt-1 text-sm text-muted">{t("syncedAs", { who: user.email ?? user.phone ?? "" })}</p>
        <button
          onClick={() => void signOut()}
          className="mt-3 rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground transition hover:border-brand"
        >
          {t("signOut")}
        </button>
      </div>
    );
  }

  function reset(next: Method) {
    setMethod(next);
    setError(null);
    setMessage(null);
    setCode("");
    setCodeSent(false);
  }

  async function run(fn: () => Promise<{ error: string | null }>, okMessage?: string) {
    setBusy(true);
    setError(null);
    setMessage(null);
    const { error: err } = await fn();
    setBusy(false);
    if (err) {
      setError(err);
      return false;
    }
    if (okMessage) setMessage(okMessage);
    return true;
  }

  const inputClass = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm";
  const primaryBtn =
    "w-full rounded-full bg-brand px-4 py-2 text-sm font-semibold text-on-strong transition hover:bg-brand-strong disabled:opacity-50";

  return (
    <div className="card p-5">
      <p className="text-sm font-semibold text-foreground">{t("title")}</p>
      <p className="mt-1 text-xs text-muted">{t("subtitle")}</p>

      {/* Google */}
      <button
        onClick={() => void run(signInWithGoogle)}
        disabled={busy}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground transition hover:border-brand disabled:opacity-50"
      >
        {t("google")}
      </button>

      <div className="my-3 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-border" />
        {t("or")}
        <span className="h-px flex-1 bg-border" />
      </div>

      {/* Email — passwordless OTP */}
      {method === "otp" ? (
        <div className="space-y-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("emailPlaceholder")}
            aria-label={t("emailLabel")}
            className={inputClass}
          />
          {codeSent ? (
            <>
              <input
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={t("codePlaceholder")}
                aria-label={t("codeLabel")}
                className={inputClass}
              />
              <button
                onClick={() => void run(() => verifyEmailOtp(email.trim(), code.trim()))}
                disabled={busy || !code.trim()}
                className={primaryBtn}
              >
                {busy ? t("working") : t("verify")}
              </button>
            </>
          ) : (
            <button
              onClick={async () => {
                if (await run(() => signInWithEmailOtp(email.trim()), t("codeSent"))) setCodeSent(true);
              }}
              disabled={busy || !email.trim()}
              className={primaryBtn}
            >
              {busy ? t("working") : t("sendCode")}
            </button>
          )}
        </div>
      ) : null}

      {/* Email — password */}
      {method === "password" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fn = pwMode === "signin" ? signInWithPassword : signUpWithPassword;
            void run(
              () => fn(email.trim(), password),
              pwMode === "signup" ? t("signupCheckEmail") : undefined,
            );
          }}
          className="space-y-2"
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("emailPlaceholder")}
            aria-label={t("emailLabel")}
            className={inputClass}
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("passwordLabel")}
            aria-label={t("passwordLabel")}
            className={inputClass}
          />
          <button type="submit" disabled={busy} className={primaryBtn}>
            {busy ? t("working") : pwMode === "signin" ? t("signIn") : t("createAccount")}
          </button>
          <button
            type="button"
            onClick={() => setPwMode((m) => (m === "signin" ? "signup" : "signin"))}
            className="text-xs text-muted underline hover:text-foreground"
          >
            {pwMode === "signin" ? t("needAccount") : t("haveAccount")}
          </button>
        </form>
      ) : null}

      {/* Phone — SMS OTP (only when enabled) */}
      {method === "phone" && PHONE_ENABLED ? (
        <div className="space-y-2">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t("phonePlaceholder")}
            aria-label={t("phoneLabel")}
            className={inputClass}
          />
          {codeSent ? (
            <>
              <input
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={t("codePlaceholder")}
                aria-label={t("codeLabel")}
                className={inputClass}
              />
              <button
                onClick={() => void run(() => verifyPhoneOtp(phone.trim(), code.trim()))}
                disabled={busy || !code.trim()}
                className={primaryBtn}
              >
                {busy ? t("working") : t("verify")}
              </button>
            </>
          ) : (
            <button
              onClick={async () => {
                if (await run(() => signInWithPhoneOtp(phone.trim()), t("codeSent"))) setCodeSent(true);
              }}
              disabled={busy || !phone.trim()}
              className={primaryBtn}
            >
              {busy ? t("working") : t("sendSms")}
            </button>
          )}
        </div>
      ) : null}

      {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}
      {message ? <p className="mt-2 text-xs text-brand-strong">{message}</p> : null}

      {/* Method switches */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {method !== "otp" ? (
          <button onClick={() => reset("otp")} className="underline hover:text-foreground">
            {t("useCode")}
          </button>
        ) : null}
        {method !== "password" ? (
          <button onClick={() => reset("password")} className="underline hover:text-foreground">
            {t("usePassword")}
          </button>
        ) : null}
        {PHONE_ENABLED && method !== "phone" ? (
          <button onClick={() => reset("phone")} className="underline hover:text-foreground">
            {t("usePhone")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
