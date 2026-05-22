/**
 * Care-reminder calendar — turn a plan into a downloadable `.ics` the user adds to their own
 * calendar (Google/Apple/Outlook), which then does the reminding. No backend, no push, no account.
 *
 * Dates are anchored to a user-chosen start date — honest (user-provided), not invented. Events
 * are deterministic from the plan + start date.
 */
import type { DeterministicPlan } from "@/domain/models";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function fmtDateTime(d: Date): string {
  return `${fmtDate(d)}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}

function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

interface CareEvent {
  uid: string;
  summary: string;
  description: string;
  start: Date;
  allDay: boolean;
  alarm?: boolean;
}

export function buildCareEvents(plan: DeterministicPlan, start: Date): CareEvent[] {
  const style = plan.styleLabel;
  const at9 = (d: Date) => {
    const x = new Date(d);
    x.setHours(9, 0, 0, 0);
    return x;
  };
  return [
    {
      uid: "plant-day",
      summary: `Plant your Bloomprint yard (${style})`,
      description: `Plant back-to-front per your plan. Best window: ${plan.bestWeatherWindow}.`,
      start,
      allDay: true,
    },
    {
      uid: "water",
      summary: "Water new plantings deeply",
      description: "New plants need deep, regular watering to establish — every few days for the first weeks.",
      start: at9(addDays(start, 1)),
      allDay: false,
      alarm: true,
    },
    {
      uid: "establish-check",
      summary: "Check plant establishment",
      description: "Look for new growth and firm rooting; adjust watering as needed.",
      start: at9(addDays(start, 42)),
      allDay: false,
      alarm: true,
    },
    {
      uid: "spring-tidy",
      summary: "Spring tidy & mulch top-up",
      description: "Refresh mulch, cut back grasses/perennials, and shape shrubs as needed.",
      start: at9(addDays(start, 240)),
      allDay: false,
      alarm: true,
    },
  ];
}

export function buildCareCalendar(plan: DeterministicPlan, start: Date): string {
  const stamp = fmtDateTime(new Date());
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Bloomprint//Care Reminders//EN",
    "CALSCALE:GREGORIAN",
  ];

  for (const ev of buildCareEvents(plan, start)) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${ev.uid}-${fmtDate(start)}@bloomprint`);
    lines.push(`DTSTAMP:${stamp}`);
    if (ev.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${fmtDate(ev.start)}`);
    } else {
      lines.push(`DTSTART:${fmtDateTime(ev.start)}`);
    }
    lines.push(`SUMMARY:${esc(ev.summary)}`);
    lines.push(`DESCRIPTION:${esc(ev.description)}`);
    if (ev.summary.toLowerCase().includes("water")) {
      // Repeat the watering reminder every 3 days for the first ~3 weeks.
      lines.push("RRULE:FREQ=DAILY;INTERVAL=3;COUNT=7");
    }
    if (ev.alarm) {
      lines.push("BEGIN:VALARM", "TRIGGER:-PT1H", "ACTION:DISPLAY", `DESCRIPTION:${esc(ev.summary)}`, "END:VALARM");
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
