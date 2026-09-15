/**
 * All invoice/business-date logic must key off Asia/Dubai local time, never UTC.
 * Asia/Dubai is a fixed UTC+4 offset with no daylight saving, but we still go
 * through Intl so this stays correct even if that ever changes.
 */

const UAE_TIMEZONE = "Asia/Dubai";

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: UAE_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * Returns the UAE calendar date (YYYY-MM-DD) for a given instant.
 * Defaults to "now".
 */
export function getUaeBusinessDate(date: Date = new Date()): string {
  // en-CA locale formats as YYYY-MM-DD
  return dateFormatter.format(date);
}

/**
 * Returns the display-friendly UAE date, e.g. "08 Sep 2026".
 */
export function formatUaeDateDisplay(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: UAE_TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatUaeDateTimeDisplay(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const datePart = formatUaeDateDisplay(d);
  const timePart = new Intl.DateTimeFormat("en-GB", {
    timeZone: UAE_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);
  return `${datePart} ${timePart}`;
}

export { UAE_TIMEZONE };
