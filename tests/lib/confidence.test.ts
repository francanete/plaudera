import { describe, it, expect } from "vitest";
import {
  computeConfidence,
  deriveRichness,
  isFreemailDomain,
  mapFrequency,
  mapImpact,
  normalizeLog2,
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

describe("computeConfidence", () => {
  describe("label assignment", () => {
    it("returns strong when all thresholds met", () => {
      const result = computeConfidence(
        makeSignals({
          organicVotes: 6,
          uniqueContributors: 4,
          recencyRatio: 0.4,
        })
      );
      expect(result.label).toBe("strong");
    });

    it("returns emerging when votes>=3 and contributors>=2", () => {
      const result = computeConfidence(
        makeSignals({
          organicVotes: 3,
          uniqueContributors: 2,
          recencyRatio: 0.1,
        })
      );
      expect(result.label).toBe("emerging");
    });

    it("returns emerging when votes>=3 and recency>=0.20", () => {
      const result = computeConfidence(
        makeSignals({
          organicVotes: 3,
          uniqueContributors: 1,
          recencyRatio: 0.25,
        })
      );
      expect(result.label).toBe("emerging");
    });

    it("returns anecdotal when below all thresholds", () => {
      const result = computeConfidence(makeSignals({ organicVotes: 1 }));
      expect(result.label).toBe("anecdotal");
    });

    it("downgrades strong to emerging when concentration blocks strong", () => {
      const result = computeConfidence(
        makeSignals({
          organicVotes: 6,
          uniqueContributors: 4,
          recencyRatio: 0.4,
          topDomainShare: 0.8,
          topDomain: "acme.com",
          isFreemailDominant: false,
        })
      );
      // Blocked from strong, but still meets emerging criteria
      expect(result.label).toBe("emerging");
      expect(result.concentrationWarning?.blocksStrong).toBe(true);
    });

    it("allows strong with high freemail concentration", () => {
      const result = computeConfidence(
        makeSignals({
          organicVotes: 6,
          uniqueContributors: 4,
          recencyRatio: 0.4,
          topDomainShare: 0.9,
          topDomain: "gmail.com",
          isFreemailDominant: true,
        })
      );
      expect(result.label).toBe("strong");
      expect(result.concentrationWarning).toBeNull();
    });

    it("counts inherited votes toward total for label thresholds", () => {
      const result = computeConfidence(
        makeSignals({
          organicVotes: 3,
          inheritedVotes: 2,
          uniqueContributors: 3,
          recencyRatio: 0.35,
        })
      );
      expect(result.label).toBe("strong");
    });
  });

  describe("concentration warning", () => {
    it("returns null when topDomainShare <= 0.60", () => {
      const result = computeConfidence(
        makeSignals({ topDomainShare: 0.5, topDomain: "acme.com" })
      );
      expect(result.concentrationWarning).toBeNull();
    });

    it("returns warning when topDomainShare > 0.60", () => {
      const result = computeConfidence(
        makeSignals({ topDomainShare: 0.65, topDomain: "acme.com" })
      );
      expect(result.concentrationWarning).not.toBeNull();
      expect(result.concentrationWarning?.share).toBe(65);
      expect(result.concentrationWarning?.domain).toBe("acme.com");
    });

    it("sets blocksStrong=false when share between 0.60 and 0.75", () => {
      const result = computeConfidence(
        makeSignals({ topDomainShare: 0.7, topDomain: "acme.com" })
      );
      expect(result.concentrationWarning?.blocksStrong).toBe(false);
    });

    it("sets blocksStrong=true when share > 0.75", () => {
      const result = computeConfidence(
        makeSignals({ topDomainShare: 0.8, topDomain: "acme.com" })
      );
      expect(result.concentrationWarning?.blocksStrong).toBe(true);
    });

    it("skips warning for freemail domains", () => {
      const result = computeConfidence(
        makeSignals({
          topDomainShare: 0.9,
          topDomain: "gmail.com",
          isFreemailDominant: true,
        })
      );
      expect(result.concentrationWarning).toBeNull();
    });
  });

  describe("intraScore", () => {
    it("returns 0 for zero-signal idea", () => {
      const result = computeConfidence(makeSignals());
      expect(result.intraScore).toBe(0);
    });

    it("returns higher score for idea with more signals", () => {
      const low = computeConfidence(makeSignals({ organicVotes: 1 }));
      const high = computeConfidence(
        makeSignals({
          organicVotes: 10,
          uniqueContributors: 5,
          recencyRatio: 0.5,
          ageVelocity: 3,
          richness: "rich",
          frequency: 4,
          impact: 4,
        })
      );
      expect(high.intraScore).toBeGreaterThan(low.intraScore);
    });

    it("does not exceed 100", () => {
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
      expect(result.intraScore).toBeLessThanOrEqual(100);
    });

    it("is deterministic for same inputs", () => {
      const signals = makeSignals({
        organicVotes: 5,
        uniqueContributors: 3,
        recencyRatio: 0.4,
      });
      const a = computeConfidence(signals);
      const b = computeConfidence(signals);
      expect(a.intraScore).toBe(b.intraScore);
      expect(a.label).toBe(b.label);
    });
  });
});

describe("deriveRichness", () => {
  it("returns sparse for empty content", () => {
    expect(deriveRichness(null, null)).toBe("sparse");
    expect(deriveRichness("", "")).toBe("sparse");
  });

  it("returns medium for moderate content", () => {
    expect(deriveRichness("a".repeat(60), null)).toBe("medium");
    expect(deriveRichness(null, "a".repeat(50))).toBe("medium");
  });

  it("returns rich for long content", () => {
    expect(deriveRichness("a".repeat(200), null)).toBe("rich");
    expect(deriveRichness("a".repeat(100), "a".repeat(100))).toBe("rich");
  });
});

describe("normalizeLog2", () => {
  it("returns 0 for value=0", () => {
    expect(normalizeLog2(0, 50)).toBe(0);
  });

  it("returns 1 when value >= max", () => {
    expect(normalizeLog2(50, 50)).toBe(1);
    expect(normalizeLog2(100, 50)).toBe(1);
  });

  it("returns 0 when max is 0", () => {
    expect(normalizeLog2(5, 0)).toBe(0);
  });

  it("dampens large values", () => {
    const v10 = normalizeLog2(10, 50);
    const v40 = normalizeLog2(40, 50);
    // 4x the input should not yield 4x the output
    expect(v40 / v10).toBeLessThan(2);
  });
});

describe("isFreemailDomain", () => {
  it("detects common freemail domains", () => {
    expect(isFreemailDomain("gmail.com")).toBe(true);
    expect(isFreemailDomain("Gmail.COM")).toBe(true);
    expect(isFreemailDomain("outlook.com")).toBe(true);
    expect(isFreemailDomain("yahoo.com")).toBe(true);
  });

  it("rejects non-freemail domains", () => {
    expect(isFreemailDomain("acme.com")).toBe(false);
    expect(isFreemailDomain("company.io")).toBe(false);
  });
});

describe("mapFrequency", () => {
  it("maps enum values correctly", () => {
    expect(mapFrequency("daily")).toBe(4);
    expect(mapFrequency("weekly")).toBe(3);
    expect(mapFrequency("monthly")).toBe(2);
    expect(mapFrequency("rarely")).toBe(1);
  });

  it("returns 0 for null", () => {
    expect(mapFrequency(null)).toBe(0);
    expect(mapFrequency(undefined)).toBe(0);
  });
});

describe("mapImpact", () => {
  it("maps enum values correctly", () => {
    expect(mapImpact("blocker")).toBe(4);
    expect(mapImpact("major")).toBe(3);
    expect(mapImpact("minor")).toBe(2);
    expect(mapImpact("nice_to_have")).toBe(1);
  });

  it("returns 0 for null", () => {
    expect(mapImpact(null)).toBe(0);
  });
});
