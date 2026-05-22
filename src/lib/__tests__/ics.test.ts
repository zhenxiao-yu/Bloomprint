import { describe, expect, it } from "vitest";
import { generateDeterministicPlan } from "@/domain/plan";
import { FIXTURES } from "@/domain";
import { buildCareCalendar, buildCareEvents } from "@/lib/ics";

describe("ics care calendar", () => {
  const plan = generateDeterministicPlan(FIXTURES["oakville-front-yard"]);
  const start = new Date(2026, 4, 16); // May 16, 2026 (local)
  const ics = buildCareCalendar(plan, start);

  it("is a valid VCALENDAR with events", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR")).toBe(true);
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    const eventCount = (ics.match(/BEGIN:VEVENT/g) ?? []).length;
    expect(eventCount).toBe(buildCareEvents(plan, start).length);
    expect(eventCount).toBeGreaterThanOrEqual(4);
  });

  it("anchors the planting day to the chosen start date", () => {
    expect(ics).toContain("DTSTART;VALUE=DATE:20260516");
  });

  it("includes a recurring watering reminder and an alarm", () => {
    expect(ics).toContain("RRULE:FREQ=DAILY;INTERVAL=3;COUNT=7");
    expect(ics).toContain("BEGIN:VALARM");
  });

  it("escapes commas in descriptions per the ICS spec", () => {
    expect(ics).toContain("\\,"); // e.g. "deep\, regular watering"
  });
});
