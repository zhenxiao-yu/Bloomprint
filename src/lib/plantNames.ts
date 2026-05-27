import zhNameData from "@/domain/data/plant-names-zh.generated.json";

/**
 * Locale-aware plant *display* names. The English `commonName` and Latin
 * botanical name remain the authoritative keys used for scoring, lookups, and
 * sourced facts — this only swaps the label shown to zh-CN users, and only when
 * an established Chinese name was sourced (see plant-names-zh.generated.json).
 */
const ZH_NAMES = (zhNameData as { names: Record<string, string | null> }).names;

export function localizePlantName(
  plantId: string | undefined,
  fallback: string,
  locale: string,
): string {
  if (locale !== "zh" || !plantId) return fallback;
  return ZH_NAMES[plantId] ?? fallback;
}
