import { describe, expect, it } from "vite-plus/test";

import { isSameDay } from "./date";

describe(isSameDay, () => {
  it("splits days at Tehran midnight, not UTC midnight", () => {
    // 20:00Z is 23:30 in Tehran; 21:00Z is 00:30 the next day.
    expect(isSameDay(new Date("2026-03-01T20:00:00Z"), new Date("2026-03-01T21:00:00Z"))).toBe(false);
  });

  it("matches two instants on the same Tehran day", () => {
    expect(isSameDay(new Date("2026-03-01T10:00:00Z"), new Date("2026-03-01T12:00:00Z"))).toBe(true);
  });
});
