/**
 * Curated how-to catalog. To stay honest (KNOWN_LIMITATIONS: "do not invent fake authoritative
 * citations"), every entry is a GENERATED SEARCH link (`kind: "search"`) with a well-targeted
 * query — not a fabricated deep link. Real authoritative URLs can be swapped in later, per topic,
 * once verified; the schema (`kind: "authoritative"`) already supports that.
 */
import type { GuideLink, GuideTopic, TutorialLink } from "@/domain/models";

const search = (phrase: string) =>
  `https://www.google.com/search?q=${encodeURIComponent(phrase)}`;
const videoSearch = (phrase: string) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(phrase)}`;

const TITLES: Record<GuideTopic, string> = {
  remove_dead_shrub: "How to remove a dead shrub",
  install_no_dig_edging: "Install no-dig garden edging",
  plant_evergreen_shrub: "Plant an evergreen shrub correctly",
  lay_landscape_stone: "Lay decorative landscape stone",
  add_mulch: "How much mulch and how to spread it",
  amend_clay_soil: "Amend heavy clay soil for planting",
  water_new_shrubs: "Watering newly planted shrubs",
  measure_garden_bed: "Measure a garden bed for materials",
  choose_pet_safe_plants: "Choose pet-safe plants",
  improve_privacy_strip: "Plant a privacy screen / hedge",
};

/** Search phrases biased toward trustworthy gardening/extension guidance. */
const QUERIES: Record<GuideTopic, string> = {
  remove_dead_shrub: "how to remove dead shrub roots step by step",
  install_no_dig_edging: "how to install no-dig landscape edging",
  plant_evergreen_shrub: "how to plant evergreen shrub depth spacing extension",
  lay_landscape_stone: "how to lay decorative landscape stone over fabric",
  add_mulch: "how much mulch do I need calculator how to spread",
  amend_clay_soil: "how to amend clay soil with compost for planting extension",
  water_new_shrubs: "how often to water newly planted shrubs first year",
  measure_garden_bed: "how to measure a garden bed area for mulch and plants",
  choose_pet_safe_plants: "pet safe plants list ASPCA non toxic garden",
  improve_privacy_strip: "best privacy hedge shrubs spacing planting guide",
};

export const GUIDE_CATALOG: Record<GuideTopic, GuideLink> = Object.fromEntries(
  (Object.keys(TITLES) as GuideTopic[]).map((topic) => [
    topic,
    { topic, title: TITLES[topic], url: search(QUERIES[topic]), kind: "search" as const },
  ]),
) as Record<GuideTopic, GuideLink>;

export const TUTORIAL_CATALOG: Record<GuideTopic, TutorialLink> = Object.fromEntries(
  (Object.keys(TITLES) as GuideTopic[]).map((topic) => [
    topic,
    {
      topic,
      title: `${TITLES[topic]} (video)`,
      url: videoSearch(QUERIES[topic]),
      kind: "search" as const,
      medium: "video" as const,
    },
  ]),
) as Record<GuideTopic, TutorialLink>;

export function guideFor(topic: GuideTopic): GuideLink {
  return GUIDE_CATALOG[topic];
}

export function tutorialFor(topic: GuideTopic): TutorialLink {
  return TUTORIAL_CATALOG[topic];
}
