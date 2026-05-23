# Technical Debt Register

Last updated: 2026-05-22
Total items: 13 open (+2 resolved on scan) · Estimated total effort: ~6×M, 3×S, 2×L

Tech debt is a tool — this register tracks **conscious** decisions. Every item says WHY it was
accepted. Scan ran 2026-05-22 on branch `feat/supabase-auth`; codebase has **zero**
TODO/FIXME/HACK/@deprecated markers, so all debt below is structural/deferred.

Priority = (impact × frequency) ÷ effort. Impact: Low 1 / Med 2 / High 3 / Critical 4.
Effort: S 1 / M 2 / L 3 / XL 4.

| ID | Category | Description | Files | Effort | Impact | Priority | Added | Sprint | Why accepted |
|----|----------|-------------|-------|--------|--------|----------|-------|--------|--------------|
| TD-001 | Test | konva canvases have no render tests; core draw/calibrate UX is unverified (manual browser pass needed) | `components/yard-map/YardZoneCanvas`, `YardMapBuilder`, `YardPreviewOverlayCanvas` | M | High | 3.0 | 2026-05-22 | Next | jsdom can't render canvas without node-canvas |
| TD-002 | Code Quality | 17 type escapes — verified **none are `as any`**; all are deliberate boundary casts (`as unknown as` for RPC args, FormData, JWT) + `@ts-expect-error`. Re-accepted; revisit if a typed RPC wrapper lands | `supabase/queries.ts`, `LanguageSwitch`, `billing/server`, `storage/supabase*`, `stripe/webhook`, +4 | M | Low | 1.0 | 2026-05-22 | Backlog | RPC + 3rd-party (FormData/JWT) typing gaps; casts are narrow + intentional |
| TD-003 | Test | global `vi.mock("@/i18n/navigation")` masks real navigation in all jsdom tests → can hide routing regressions | `src/test/setup.ts` | M | Med | 2.0 | 2026-05-22 | Next | next-intl nav unresolvable under vitest+Next 16 |
| TD-004 | Integration | `/plans` page still local-only; not wired to `useStores().projects.listProjects()` | `app/[locale]/plans/page.tsx`, `lib/storage/*` | M | Med | 2.0 | 2026-05-22 | Next | avoid untested async rewrite of a working page |
| TD-006 | Architecture | `feat/supabase-auth` is one mega-branch (polish+AI+vision+Supabase), not based on `main` — hard to review/revert granularly | git branch | M | High | 1.5 | 2026-05-22 | Backlog | rapid stacked iterative session |
| TD-007 | Architecture | God-object files >500 lines (complexity/coupling) | `domain/generators/index.ts` (708), `PlanResult.tsx` (639), `domain/models.ts` (621), `PlanExperience.tsx` (570), `yard-map/YardMapBuilder.tsx` (530) | L | Med | 1.3 | 2026-05-22 | Backlog | feature accretion; works + typed |
| TD-008 | Security | no Content-Security-Policy header | `next.config.ts` | M | Med | 1.0 | 2026-05-22 | Backlog | next-themes inline script + konva need careful CSP; needs browser verification |
| TD-009 | Test | auth round-trip (Google OAuth, email OTP) not automated — only HTTP surface verified | `lib/supabase/useSession`, `app/auth/*` | L | High | 1.0 | 2026-05-22 | Backlog | needs real provider creds + a browser |
| TD-010 | Performance | heavy in-browser ML (tfjs/deeplab/transformers) runtime cost on low-end mobile | `lib/vision/*` | M | Med | 1.0 | 2026-05-22 | Backlog | MITIGATED — all lazy-loaded (dynamic import / CDN); heuristic fallback exists. Watch mobile runtime only |
| TD-011 | Integration | pgvector `plant_embeddings` scaffolded but unpopulated → `match_plants` returns nothing | `supabase/migrations/0003`, `lib/supabase/queries.ts` | M | Med | 1.0 | 2026-05-22 | Backlog | needs an Edge Function (free gte-small) to embed |
| TD-012 | Integration | power-up UI unwired: source-search box, `/shared/[token]` route, realtime subscription | `lib/supabase/queries.ts`, `lib/billing/usage.ts` | M | Low | 1.0 | 2026-05-22 | Backlog | DB enabled first; UI is follow-on |
| TD-013 | Integration | `cache.ts` live-data/AI read-through available but not called from the live-data layer | `lib/supabase/cache.ts`, `lib/live-data/*` | S | Low | 1.0 | 2026-05-22 | Backlog | live-data feature itself is opt-in/disabled by default |
| TD-014 | Documentation | `REGION_OPTIONS` labels still English (only remaining i18n gap) | `lib/uiOptions.ts`, `domain/data/regions` | S | Low | 1.0 | 2026-05-22 | Backlog | labels live in REGIONS data, not message catalogs |
| TD-015 | Integration | phone SMS OTP wired but dormant | `useSession`, `CloudSyncCard` | S | Low | 1.0 | 2026-05-22 | Backlog | SMS provider (Twilio) is paid |

## Resolved on this scan

| ID | Description | Resolution |
|----|-------------|------------|
| TD-005 | `lucide-react@^1.16.0` pin looked suspicious | Verified genuine package (lucide.dev, exports resolve, build green) — not debt |
| TD-010 | (downgraded, not resolved) | Confirmed ML is lazy-loaded, not in initial bundle; impact reduced to mobile runtime |

## Recommended next sprint
TD-001, TD-002, TD-003, TD-004 — the highest priority and the ones that most reduce regression risk
on the freshly-landed auth/vision work.

## Notes
- Run `/tech-debt scan` each sprint to catch new debt; `/tech-debt report` to track the trend.
- Items in "Backlog" >3 sprints without action should be fixed or consciously re-accepted with a reason.
