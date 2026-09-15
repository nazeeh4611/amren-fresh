import { describe, it, expect } from "vitest";
import { computeDateRange } from "../utils/dateRange";

describe("computeDateRange", () => {
  it("day range is just the anchor date", () => {
    expect(computeDateRange("day", "2026-09-09")).toEqual({ start: "2026-09-09", end: "2026-09-09" });
  });

  it("week range runs Sunday to Saturday and contains the anchor date", () => {
    // 2026-09-09 is a Wednesday
    const { start, end } = computeDateRange("week", "2026-09-09");
    expect(start).toBe("2026-09-06"); // Sunday
    expect(end).toBe("2026-09-12"); // Saturday
  });

  it("week range anchored on a Sunday starts on that same day", () => {
    const { start, end } = computeDateRange("week", "2026-09-06");
    expect(start).toBe("2026-09-06");
    expect(end).toBe("2026-09-12");
  });

  it("month range covers the full calendar month including a 31-day month", () => {
    expect(computeDateRange("month", "2026-09-15")).toEqual({ start: "2026-09-01", end: "2026-09-30" });
    expect(computeDateRange("month", "2026-01-15")).toEqual({ start: "2026-01-01", end: "2026-01-31" });
  });

  it("month range handles February in a non-leap year correctly", () => {
    expect(computeDateRange("month", "2026-02-10")).toEqual({ start: "2026-02-01", end: "2026-02-28" });
  });

  it("month range handles a year boundary (December)", () => {
    expect(computeDateRange("month", "2026-12-25")).toEqual({ start: "2026-12-01", end: "2026-12-31" });
  });

  it("year range covers Jan 1 to Dec 31", () => {
    expect(computeDateRange("year", "2026-06-15")).toEqual({ start: "2026-01-01", end: "2026-12-31" });
  });
});
