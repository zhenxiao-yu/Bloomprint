/**
 * Free/Open Data Mode config resolver.
 *
 * Free Data Mode is simply "the safe default state when live data is OFF" — so it is derived from
 * the EXISTING flags (`NEXT_PUBLIC_ENABLE_LIVE_DATA`, `LIVE_DATA_PROVIDER`, provider keys) rather
 * than a new conflicting switch. With no env at all, a fresh checkout runs fully in free mode
 * (curated catalog, generated retailer search links, seasonal-rule weather) and needs no keys.
 *
 * Optional overrides (`RETAILER_SEARCH_PROVIDER`, `WEATHER_PROVIDER`, …) are read for documentation
 * parity with .env.example but default to the derived values, so they can never break a no-env run.
 */
import { liveDataEnabled, realProvidersConfigured } from "@/lib/live-data";
import type { FreeDataModeConfig } from "@/domain/models";

export function getFreeDataModeConfig(): FreeDataModeConfig {
  const live = liveDataEnabled();
  const realProviders = realProvidersConfigured();
  // Free mode is on whenever the live layer is off. An explicit FREE_DATA_MODE_ENABLED=false can
  // force it off (e.g. a fully-live deployment), but the default is on.
  const enabled = process.env.FREE_DATA_MODE_ENABLED !== "false" && !live;

  return {
    enabled,
    allowExternalFetches: live, // only the opt-in live layer fetches externally
    useGeneratedRetailerLinks: !live, // free mode = search links only, never live inventory
    useCuratedGuides: true,
    useManualPriceBands: !realProviders, // curated bands until a real pricing provider is wired
    weatherMode: realProviders ? "optional_provider" : "seasonal_rules",
    stockMode: live ? "cached_signals" : "search_links_only",
  };
}
