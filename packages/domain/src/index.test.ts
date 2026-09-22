import { describe, expect, it } from "vitest";

import { resetModes, signalClassifications, trustTiers } from "./index";

describe("domain vocabulary", () => {
  it("keeps the five evidence classifications stable", () => {
    expect(signalClassifications).toEqual([
      "USER_RUMOR",
      "STAFF_HINT",
      "STAFF_SCHEDULE",
      "STAFF_COMPLETION",
      "OFFICIAL_STATUS",
    ]);
  });

  it("includes explicit unknown and no-reset states", () => {
    expect(resetModes).toContain("NONE");
    expect(resetModes).toContain("UNKNOWN");
  });

  it("orders first-party trust tiers before lower-trust evidence", () => {
    expect(trustTiers.slice(0, 2)).toEqual(["A1", "A2"]);
  });
});
