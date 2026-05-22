import type { CacheStatus, SourceRef } from "@/domain/models";

export type LiveDataKind = "weather" | "geocode" | "gbif" | "store-search" | "source-snapshot";

export interface CachePolicy {
  ttlMs: number;
  staleTtlMs?: number;
}

export interface CachedLiveData<T> {
  key: string;
  value: T;
  retrievedAt: string;
  expiresAt: string;
  cacheStatus: CacheStatus;
  source: SourceRef;
}

export interface WeatherContext {
  locationLabel: string;
  summary: string;
  retrievedAt: string;
}

export interface GeocodeResult {
  query: string;
  label: string;
  lat: number;
  lon: number;
}

export interface GbifContext {
  scientificName: string;
  occurrenceCount: number;
  note: string;
}

export interface RetailerSearchTemplate {
  retailer: "home-depot" | "lowes" | "web";
  label: string;
  url: string;
}

export interface LiveDataGateway {
  weather(query: string): Promise<CachedLiveData<WeatherContext> | null>;
  geocode(query: string): Promise<CachedLiveData<GeocodeResult> | null>;
  gbif(scientificName: string): Promise<CachedLiveData<GbifContext> | null>;
  storeSearch(query: string): Promise<CachedLiveData<RetailerSearchTemplate[]> | null>;
}
