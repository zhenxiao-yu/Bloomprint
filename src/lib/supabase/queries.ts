/**
 * Browser-safe Supabase query helpers for the free-tier power-ups (RLS-protected, no service role).
 * All gracefully return empty when Supabase isn't configured — the app never depends on them.
 */
"use client";

import { getSupabaseBrowserClient } from "./client";
import type { SourceRegistryRow } from "@/types/supabase";

/** Trigram fuzzy search over the public source registry (RPC `search_sources`). */
export async function searchSources(q: string, maxResults = 20): Promise<SourceRegistryRow[]> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("search_sources", { q, max_results: maxResults });
  if (error || !data) return [];
  return data as SourceRegistryRow[];
}

/** Nearest plants by embedding cosine similarity (RPC `match_plants`). Embeddings populated later. */
export async function matchPlants(
  queryEmbedding: number[],
  matchCount = 5,
): Promise<{ plantId: string; similarity: number }[]> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("match_plants", {
    query_embedding: queryEmbedding as unknown as string,
    match_count: matchCount,
  });
  if (error || !data) return [];
  return (data as { plant_id: string; similarity: number }[]).map((r) => ({
    plantId: r.plant_id,
    similarity: r.similarity,
  }));
}
