import { describe, it, expect } from "vitest";
import {
  normalizeLog2,
  isFreemailDomain,
  deriveRichness,
  mapFrequency,
  mapImpact,
  computeConfidence,
  type ConfidenceSignals,
} from "@/lib/confidence";

function makeSignals(
  overrides: Partial<ConfidenceSignals> = {}
): ConfidenceSignals {
  return {
    organicVotes: 0,
    inheritedVotes: 0,
    uniqueContributors: 0,
    recencyRatio: 0,
    ageVelocity: 0,
    dupeStrength: 0,
    richness: "sparse",
    frequency: 0,
    impact: 0,
    topDomainShare: 0,
    topDomain: null,
    isFreemailDominant: false,
    ...overrides,
  };
}

describe("normalizeLog2", () => {
  it("returns 0 when value is 0", () => {
    expect(normalizeLog2(0, 50)).toBe(0);
  });

  it("returns 0 when max is 0", () => {
    expect(normalizeLog2(10, 0)).toBe(0);
  });

  it("returns 0 when max is negative", () => {
    expect(normalizeLog2(10, -5)).toBe(0);
  });

  it("returns 1 when value equals max", () => {
    expect(normalizeLog2(50, 50)).toBe(1);
  });

  it("caps at 1 when value exceeds max", () => {
    expect(normalizeLog2(100, 50)).toBe(1);
  });

  it("returns value between 0 and 1 for normal input", () => {
    const result = normalizeLog2(10, 50);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(1);
  });
});

describe("isFreemailDomain", () => {
  it("recognizes gmail.com", () => {
    expect(isFreemailDomain("gmail.com")).toBe(true);
  });

  it("is case insensitive", () => {
    expect(isFreemailDomain("Gmail.COM")).toBe(true);
  });

  it("rejects custom domains", () => {
    expect(isFreemailDomain("acme.com")).toBe(false);
  });
});

describe("deriveRichness", () => {
  it("returns sparse for short content", () => {
    expect(deriveRichness("hi", null)).toBe("sparse");
  });

  it("returns medium for 50+ chars", () => {
    expect(deriveRichness("a".repeat(50), null)).toBe("medium");
  });

  it("returns rich for 200+ chars", () => {
    expect(deriveRichness("a".repeat(200), null)).toBe("rich");
  });

  it("sums description and problemStatement", () => {
    expect(deriveRichness("a".repeat(100), "b".repeat(100))).toBe("rich");
  });

  it("handles null inputs", () => {
    expect(deriveRichness(null, null)).toBe("sparse");
  });

  it("handles undefined inputs", () => {
    expect(deriveRichness(undefined, undefined)).toBe("sparse");
  });
});

describe("mapFrequency", () => {
  it.each([
    ["daily", 4],
    ["weekly", 3],
    ["monthly", 2],
    ["rarely", 1],
  ] as const)("maps %s to %d", (tag, expected) => {
    expect(mapFrequency(tag)).toBe(expected);
  });

  it("returns 0 for null", () => {
    expect(mapFrequency(null)).toBe(0);
  });

  it("returns 0 for undefined", () => {
    expect(mapFrequency(undefined)).toBe(0);
  });
});

describe("mapImpact", () => {
  it.each([
    ["blocker", 4],
    ["major", 3],
    ["minor", 2],
    ["nice_to_have", 1],
  ] as const)("maps %s to %d", (tag, expected) => {
    expect(mapImpact(tag)).toBe(expected);
  });

  it("returns 0 for null", () => {
    expect(mapImpact(null)).toBe(0);
  });

  it("returns 0 for undefined", () => {
    expect(mapImpact(undefined)).toBe(0);
  });
});

describe("computeConfidence — label assignment", () => {
  it("returns strong when votes>=5, contributors>=3, recency>=0.3", () => {
    const result = computeConfidence(
      makeSignals({
        organicVotes: 5,
        uniqueContributors: 3,
        recencyRatio: 0.3,
      })
    );
    expect(result.label).toBe("strong");
  });

  it("returns emerging when votes>=3, contributors>=2", () => {
    const result = computeConfidence(
      makeSignals({ organicVotes: 3, uniqueContributors: 2 })
    );
    expect(result.label).toBe("emerging");
  });

  it("returns emerging when votes>=3 and recency>=0.2", () => {
    const result = computeConfidence(
      makeSignals({
        organicVotes: 3,
        uniqueContributors: 1,
        recencyRatio: 0.2,
      })
    );
    expect(result.label).toBe("emerging");
  });

  it("returns anecdotal below thresholds", () => {
    const result = computeConfidence(
      makeSignals({ organicVotes: 1, uniqueContributors: 1 })
    );
    expect(result.label).toBe("anecdotal");
  });

  it("blocks strong when concentration blocksStrong is true", () => {
    const result = computeConfidence(
      makeSignals({
        organicVotes: 10,
        uniqueContributors: 5,
        recencyRatio: 0.5,
        topDomainShare: 0.8,
        topDomain: "acme.com",
        isFreemailDominant: false,
      })
    );
    expect(result.label).not.toBe("strong");
    expect(result.concentrationWarning?.blocksStrong).toBe(true);
  });
});

describe("computeConfidence — concentration detection", () => {
  it("no warning when topDomainShare<=0.6", () => {
    const result = computeConfidence(
      makeSignals({ topDomainShare: 0.6, topDomain: "acme.com" })
    );
    expect(result.concentrationWarning).toBeNull();
  });

  it("no warning when freemail dominant", () => {
    const result = computeConfidence(
      makeSignals({
        topDomainShare: 0.8,
        topDomain: "gmail.com",
        isFreemailDominant: true,
      })
    );
    expect(result.concentrationWarning).toBeNull();
  });

  it("warns when topDomainShare>0.6 and non-freemail", () => {
    const result = computeConfidence(
      makeSignals({
        topDomainShare: 0.65,
        topDomain: "acme.com",
        isFreemailDominant: false,
      })
    );
    expect(result.concentrationWarning).toEqual({
      type: "loud_minority",
      domain: "acme.com",
      share: 65,
      blocksStrong: false,
    });
  });

  it("blocksStrong when share>0.75", () => {
    const result = computeConfidence(
      makeSignals({
        topDomainShare: 0.8,
        topDomain: "acme.com",
        isFreemailDominant: false,
      })
    );
    expect(result.concentrationWarning?.blocksStrong).toBe(true);
  });
});

describe("computeConfidence — intraScore range", () => {
  it("is 0 when all signals are zero", () => {
    const result = computeConfidence(makeSignals());
    expect(result.intraScore).toBe(0);
  });

  it("is between 0 and 100 for maxed-out signals", () => {
    const result = computeConfidence(
      makeSignals({
        organicVotes: 100,
        inheritedVotes: 100,
        uniqueContributors: 50,
        recencyRatio: 1,
        ageVelocity: 20,
        dupeStrength: 10,
        richness: "rich",
        frequency: 4,
        impact: 4,
      })
    );
    expect(result.intraScore).toBeGreaterThanOrEqual(0);
    expect(result.intraScore).toBeLessThanOrEqual(100);
  });
});
