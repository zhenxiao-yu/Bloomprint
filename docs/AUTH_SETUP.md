# Auth setup — step by step (free)

Get Google + email sign-in working for **$0**. Phone/SMS is the only paid piece — skip it.

Your project: **Bloomprint** · ref `qojtvpkzwufqxzpnatha` · dashboard
<https://supabase.com/dashboard/project/qojtvpkzwufqxzpnatha>

Two exact values you'll reuse below:

- **Supabase callback** (give this to Google):
  `https://qojtvpkzwufqxzpnatha.supabase.co/auth/v1/callback`
- **App origin** (local dev): `http://localhost:3000`

---

## 0. Already done for you ✅

The schema, RLS, storage bucket, auth code, and `.env.local` (URL + keys) are set. You only need to
turn on the **providers** (Google + email) and tell them which URLs are allowed. ~10 minutes.

---

## 1. Email sign-in (free, built-in) — 1 min

Email magic-link/OTP works on Supabase's built-in mailer with no extra setup (rate-limited to a few
per hour — fine for testing).

1. Open **Authentication → Sign In / Providers**:
   <https://supabase.com/dashboard/project/qojtvpkzwufqxzpnatha/auth/providers>
2. Find **Email** → make sure it's **Enabled**. Leave "Confirm email" on. Done.

> Sending lots of real emails later? Add a free SMTP provider (Resend free tier
> <https://resend.com> or Brevo <https://www.brevo.com>) under **Project Settings → Auth → SMTP**.
> Not needed to test.

---

## 2. Google sign-in (free) — ~7 min

### 2a. Create a Google OAuth client

1. Go to Google Cloud Console: <https://console.cloud.google.com/>
2. Top bar → **project picker → New Project** → name it `Bloomprint` → **Create**, then select it.
3. Left menu → **APIs & Services → OAuth consent screen**
   (<https://console.cloud.google.com/auth/overview>):
   - User type: **External** → Create.
   - App name: `Bloomprint`. User support email: **your email**. Developer contact: **your email**.
   - Save through the steps (you can skip Scopes). **Publishing status can stay "Testing"** — add your
     own Google account under **Test users** so you can sign in. (Free; no verification needed for testing.)
4. Left menu → **APIs & Services → Credentials**
   (<https://console.cloud.google.com/apis/credentials>) → **+ Create credentials → OAuth client ID**:
   - Application type: **Web application**.
   - Name: `Bloomprint Web`.
   - **Authorized JavaScript origins** → Add:
     - `http://localhost:3000`
     - (later, your prod origin, e.g. `https://bloomprint.vercel.app`)
   - **Authorized redirect URIs** → Add (paste exactly):
     - `https://qojtvpkzwufqxzpnatha.supabase.co/auth/v1/callback`
   - **Create.** A dialog shows **Client ID** and **Client secret** — keep it open.

### 2b. Paste them into Supabase

1. Open **Authentication → Sign In / Providers → Google**:
   <https://supabase.com/dashboard/project/qojtvpkzwufqxzpnatha/auth/providers>
2. Toggle **Enable Sign in with Google = ON**.
3. Paste:
   - **Client ID (for OAuth)** ← Google's Client ID
   - **Client Secret (for OAuth)** ← Google's Client secret
4. **Save.**

---

## 3. Allowed redirect URLs (so sign-in can come back) — 1 min

Open **Authentication → URL Configuration**:
<https://supabase.com/dashboard/project/qojtvpkzwufqxzpnatha/auth/url-configuration>

- **Site URL:** `http://localhost:3000`
- **Redirect URLs** → Add URL (one per line):
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/auth/confirm`
  - (later, prod) `https://bloomprint.vercel.app/auth/callback`
  - (later, prod) `https://bloomprint.vercel.app/auth/confirm`

**Save.** When you deploy, change Site URL to your prod URL (keep localhost in the list for dev).

---

## 4. Test it locally — 2 min

```bash
npm run dev
```

1. Visit <http://localhost:3000/signup>.
2. **Continue with Google** → pick your account (must be a Test user from step 2a) → you land back
   signed in on `/account`, badge reads "Synced to cloud".
3. Or **email**: enter your address → "Email me a code" → paste the 6-digit code → signed in.
4. Save a plan while signed in → a row appears under **Table Editor → projects / plan_versions**
   (<https://supabase.com/dashboard/project/qojtvpkzwufqxzpnatha/editor>).

If Google says **redirect_uri_mismatch**: the URI in step 2a must be *exactly*
`https://qojtvpkzwufqxzpnatha.supabase.co/auth/v1/callback` (no trailing slash).

---

## 5. Phone / SMS (optional, NOT free) — skip for now

Phone OTP is wired but off. To enable later: add a paid SMS provider (Twilio
<https://www.twilio.com>) under **Authentication → Sign In / Providers → Phone**, then set
`NEXT_PUBLIC_ENABLE_PHONE_AUTH=true` in `.env.local`.

---

## Where the secrets live

`.env.local` (gitignored — never committed) already has your Supabase URL + keys. Google's client
id/secret go in the **Supabase dashboard** (step 2b), not in the repo. Nothing here needs committing.
