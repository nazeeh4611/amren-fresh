import { UAE_TIMEZONE } from "./timezone";

export type ExportRange = "day" | "week" | "month" | "year";

/**
 * Computes an inclusive [startDate, endDate] pair of UAE business dates
 * (YYYY-MM-DD strings) for an export range anchored on a given date.
 * "week" runs Sunday-Saturday, matching the common UAE business week.
 */
export function computeDateRange(range: ExportRange, anchorDate: string): { start: string; end: string } {
  const [year, month, day] = anchorDate.split("-").map(Number);
  // Noon UTC avoids any DST/offset edge cases when shifting by whole days.
  const anchor = new Date(Date.UTC(year, month - 1, day, 12));

  switch (range) {
    case "day":
      return { start: anchorDate, end: anchorDate };

    case "week": {
      const dayOfWeek = getUaeWeekday(anchor); // 0 = Sunday .. 6 = Saturday
      const start = addDays(anchor, -dayOfWeek);
      const end = addDays(anchor, 6 - dayOfWeek);
      return { start: toUaeDateString(start), end: toUaeDateString(end) };
    }

    case "month": {
      const start = new Date(Date.UTC(year, month - 1, 1, 12));
      const end = new Date(Date.UTC(year, month, 0, 12)); // day 0 of next month = last day of this month
      return { start: toUaeDateString(start), end: toUaeDateString(end) };
    }

    case "year": {
      const start = new Date(Date.UTC(year, 0, 1, 12));
      const end = new Date(Date.UTC(year, 11, 31, 12));
      return { start: toUaeDateString(start), end: toUaeDateString(end) };
    }
  }
}

export function formatRangeLabel(range: ExportRange, start: string, end: string): string {
  if (range === "day") return start;
  return `${start} to ${end}`;
}

function getUaeWeekday(date: Date): number {
  const formatter = new Intl.DateTimeFormat("en-US", { timeZone: UAE_TIMEZONE, weekday: "short" });
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[formatter.format(date)] ?? 0;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function toUaeDateString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: UAE_TIMEZONE }).format(date);
}
