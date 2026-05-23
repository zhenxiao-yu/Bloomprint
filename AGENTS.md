# AGENTS.md — orientation for AI agents

Read this first; it saves you from re-exploring. Rules of engagement live in
[CLAUDE.md](./CLAUDE.md) and locked decisions in [docs/DECISIONS.md](./docs/DECISIONS.md).
The AI-native direction is in [docs/AI_NATIVE_ROADMAP.md](./docs/AI_NATIVE_ROADMAP.md).

## Stack
Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind v4 (CSS-first)
· next-intl (en/zh) · next-themes · Zod · react-hook-form · Vitest. Mock-first: works
with no AI key, no photo, no Supabase, no Stripe.

## Commands (validation gate — all must pass before "done")
```
npm run dev         # local dev
npm run lint        # eslint (flat config)
npm run typecheck   # next typegen && tsc --noEmit
npm test            # vitest (node + jsdom-per-file)
npm run build       # prod build
npm run format      # prettier
```

## Repo map
```
src/app/[locale]/        # all pages (locale-routed); api/ stays outside [locale]
src/app/{robots,sitemap,manifest}.ts, global-error.tsx
src/components/          # UI; ui/ = shadcn-style primitives
src/components/yard-map/ # react-konva canvases (Yard Map builder, preview overlay)
src/domain/              # deterministic engine = source of truth (plants, scoring, layout)
src/lib/                 # uiOptions, command/ (NL parser), yard-map/ (zoneModel, measurement),
                         #   vision/, accountForm, siteConfig, storage, billing, live-data
src/i18n/                # routing, navigation, request, glossary
messages/{en,zh}.json    # all UI strings — keep KEY PARITY (script below)
```

## Conventions (match these)
- **i18n:** import `{ Link, usePathname, useRouter }` from `@/i18n/navigation` (NOT next/*).
  Add UI strings to BOTH `messages/en.json` and `messages/zh.json`; read with `useTranslations(ns)`.
  Chinese must be natural, not literal. Engine-produced facts (plant names/prices) stay untranslated.
- **Theme:** use CSS-var Tailwind utilities (`bg-surface`, `text-foreground`, `text-muted`, `bg-brand`,
  `text-on-strong`, `text-danger`, …) so light+dark work. Tokens in `src/app/globals.css`. Headings use `font-display`.
- **Guardrails:** deterministic engine decides; AI/NL only extracts/explains; no chatbot; Zod-validate AI output.
- **konva** components must be `"use client"` and dynamically imported with `ssr: false`.
- **Tests:** component tests use `// @vitest-environment jsdom` + `renderWithIntl` (`src/test/render.tsx`).

## Parity check (run after editing messages)
```
node -e "const en=require('./messages/en.json'),zh=require('./messages/zh.json');function k(o,p=''){return Object.entries(o).flatMap(([a,v])=>v&&typeof v=='object'?k(v,p+a+'.'):[p+a])};const e=k(en).sort(),z=k(zh).sort();console.log('en',e.length,'zh',z.length,'onlyEn',e.filter(x=>!z.includes(x)),'onlyZh',z.filter(x=>!e.includes(x)))"
```
