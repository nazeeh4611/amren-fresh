import { describe, it, expect } from "vitest";
import { getUaeBusinessDate } from "../utils/timezone";

describe("UAE business date", () => {
  it("groups 23:59 Dubai time into that day", () => {
    // 2026-09-08 23:59 in Asia/Dubai (UTC+4) = 2026-09-08 19:59 UTC
    const date = new Date("2026-09-08T19:59:00.000Z");
    expect(getUaeBusinessDate(date)).toBe("2026-09-08");
  });

  it("groups 00:01 Dubai time into the next day, even though UTC date is still the previous day", () => {
    // 2026-09-09 00:01 in Asia/Dubai (UTC+4) = 2026-09-08 20:01 UTC
    const date = new Date("2026-09-08T20:01:00.000Z");
    expect(getUaeBusinessDate(date)).toBe("2026-09-09");
  });

  it("does not group UTC midnight the same as Dubai midnight", () => {
    // UTC midnight is 4am in Dubai - still the same UTC calendar date but this
    // proves we are not accidentally using UTC's date.
    const date = new Date("2026-09-08T00:00:00.000Z"); // 2026-09-08 04:00 Dubai
    expect(getUaeBusinessDate(date)).toBe("2026-09-08");
  });
});
