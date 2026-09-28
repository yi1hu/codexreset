import { describe, expect, it } from "vitest";

import { classifyCollectorHealth } from "./collector-repository";

const now = new Date("2026-09-28T12:00:00Z");

describe("classifyCollectorHealth", () => {
  it("distinguishes never-run, healthy, stale, and failed sources", () => {
    expect(
      classifyCollectorHealth(
        { lastSuccessAt: null, lastErrorAt: null, pollIntervalSeconds: 300 },
        now,
      ),
    ).toBe("never-run");

    expect(
      classifyCollectorHealth(
        {
          lastSuccessAt: new Date("2026-09-28T11:56:00Z"),
          lastErrorAt: null,
          pollIntervalSeconds: 300,
        },
        now,
      ),
    ).toBe("ok");

    expect(
      classifyCollectorHealth(
        {
          lastSuccessAt: new Date("2026-09-28T11:00:00Z"),
          lastErrorAt: null,
          pollIntervalSeconds: 300,
        },
        now,
      ),
    ).toBe("stale");

    expect(
      classifyCollectorHealth(
        {
          lastSuccessAt: new Date("2026-09-28T11:50:00Z"),
          lastErrorAt: new Date("2026-09-28T11:55:00Z"),
          pollIntervalSeconds: 300,
        },
        now,
      ),
    ).toBe("down");
  });
});
