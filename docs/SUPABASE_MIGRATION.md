# Supabase Migration — Optional Cloud Sync

Bloomprint is local-first. This document describes the **optional** cloud layer that adds accounts
and cross-device sync *behind* the existing on-device stores. The deterministic plan, `mock` AI
provider, no-photo planning, sharing, and saved-plan history all keep working with **no Supabase
env vars at all** — see [DECISIONS.md](DECISIONS.md) D10/D12/D15.

## Project

- **Project ref:** `xbbmllchylhfwfmcwnle`
- Storage bucket: `project-photos` (private)
- Tables: `profiles`, `properties`, `projects`, `plan_versions`, `project_photos`,
  `source_registry`, `live_data_cache`, `ai_prompt_cache`

## Environment variables

| Var | Scope | Required for | Notes |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | client | cloud sync | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | client | cloud sync | Browser-safe; RLS protects every row. Falls back to `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | AI prompt cache | Bypasses RLS — never expose to the browser |

When the two public vars are absent, `isSupabaseConfigured()` returns `false` and the app uses
local storage everywhere. When the service-role key is absent, the AI prompt cache is simply
skipped.

## Architecture

```text
UI  ──useStores()──▶  Hybrid store  ──▶  Supabase adapter   (signed in + configured)
                                   └─▶  Local adapter      (fallback / signed out / error)
```

- **Interfaces** — `src/lib/storage/types.ts`: `ProjectStore`, `ProfileStore`, `PhotoStore`.
- **Local adapters** — wrap the existing on-device stores (`plansStore`, `profileStore`) so the
  signed-out path is byte-for-byte unchanged and `useSavedPlans` keeps working.
  - `localProjectStore.ts`, `localProfileStore.ts`, `localPhotoStore.ts`
- **Supabase adapters** — factories taking the auth `userId`.
  - `supabaseProjectStore.ts`, `supabaseProfileStore.ts`, `supabasePhotoStore.ts`
- **Hybrid adapters** — choose cloud only when configured + signed in; every cloud op falls back to
  local on error via `withFallback` (`fallback.ts`).
  - `hybridProjectStore.ts`, `hybridProfileStore.ts`, `hybridPhotoStore.ts`
- **Entry point** — `src/lib/storage/index.ts` exposes `useStores()` → `{ mode, configured,
  signedIn, syncWarning, projects, profiles, photos }`.
- **Supabase clients** — `src/lib/supabase/client.ts` (browser, publishable key),
  `server.ts` (service-role, server-only, throws if called in the browser),
  `storage.ts` (private photo bucket), `cache.ts` (server-only live-data + AI prompt caches),
  `useSession.ts` (optional auth session hook).

## Save flow (signed in)

When a plan is saved and the user is signed into cloud sync, `PlanExperience.handleSave`:

1. Saves on-device first (never blocks on the cloud).
2. `projects.saveProjectWithVersion(...)` — reuses a same-named project or creates one, inserts a
   `plan_versions` row (intake, adjustments, deterministic plan, AI enhancement, scores, evidence,
   version label), then updates `projects.current_version_id`.
3. If a photo is present, `photos.saveProjectPhoto(projectId, dataUrl)` uploads it to
   `project-photos` under `userId/projectId/photoId.ext` and records the path in `project_photos`.

## RLS expectations

- `profiles`, `properties`, `projects`, `plan_versions`, `project_photos` — users may read/write
  **only their own** rows (policies keyed on `auth.uid()` / `user_id`).
- `source_registry`, `live_data_cache` — public read.
- `ai_prompt_cache` — **no public policies**; service-role only (entries may contain plan wording).
- `project-photos` bucket — private; storage path must start with the user id.

## Privacy note (photos)

Signed out, photos still "stay in your browser — never uploaded." Signed into cloud sync, the photo
panel says it will be **uploaded privately to your account when you save**, and the upload only
happens at save time. This keeps the on-screen promise truthful in both modes.

## Regenerating types

`src/types/supabase.ts` is currently a **hand-written placeholder** that mirrors the applied schema.
Replace it with the canonical generated output once you have the CLI/env:

```bash
npx supabase gen types typescript --project-id xbbmllchylhfwfmcwnle > src/types/supabase.ts
# or, logged in to the CLI:
supabase gen types typescript --linked > src/types/supabase.ts
```

The adapters cast jsonb columns to domain shapes (`intake`, `DeterministicPlan`, etc.) at the edge,
so regenerated types should drop in without adapter changes — verify column names match
(`user_data`, `data`, `current_version_id`, `storage_path`, `expires_at`).

## Testing both flows

- **Signed out / no env:** `npm run dev` with no Supabase vars → "Saved on this device" badge,
  saves land in localStorage, demo + Start My Yard Plan + share all work.
- **Signed in:** set the public env vars, create an account on `/account`, save a plan → a row
  appears in `projects` + `plan_versions`; the badge reads "Synced to cloud".

## Not yet wired (next steps)

- The Saved (`/plans`) page still reads on-device plans via `useSavedPlans`. Listing **cloud**
  projects there means swapping it to `useStores().projects.listProjects()` with async load state.
  The hybrid store + `StoredProject` already carry everything that page needs (intake + adjustments
  for regeneration); this was left out to avoid an untested async rewrite of a working page.
- `live_data_cache` / `source_registry` read-through is available (`cache.ts`) but not yet called
  from the live-data layer.
