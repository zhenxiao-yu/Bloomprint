import type { LiveDataGateway } from "@/lib/live-data/types";
import { getGbifContext } from "@/lib/live-data/gbif";
import { getGeocode } from "@/lib/live-data/geocode";
import { getStoreSearchTemplates } from "@/lib/live-data/storeSearch";
import { getWeatherContext } from "@/lib/live-data/weather";

export type { LiveDataGateway } from "@/lib/live-data/types";
export { getLiveEnrichment, realProvidersConfigured } from "@/lib/live-data/enrich";

export function liveDataEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_LIVE_DATA === "true";
}

export function getLiveDataGateway(): LiveDataGateway {
  if (!liveDataEnabled()) return disabledGateway;
  return {
    weather: getWeatherContext,
    geocode: getGeocode,
    gbif: getGbifContext,
    storeSearch: getStoreSearchTemplates,
  };
}

const disabledGateway: LiveDataGateway = {
  weather: async () => null,
  geocode: async () => null,
  gbif: async () => null,
  storeSearch: async (query) => getStoreSearchTemplates(query),
};
