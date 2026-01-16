import { generateSlug, parseSlug } from "@/lib/pricing";

describe("generateSlug", () => {
  it("generates slug for monthly billing", () => {
    expect(generateSlug("STARTER", "monthly")).toBe("starter-monthly");
  });

  it("generates slug for annual billing", () => {
    expect(generateSlug("GROWTH", "annual")).toBe("growth-annual");
  });

  it("generates slug for LTD billing", () => {
    expect(generateSlug("SCALE", "ltd")).toBe("scale-ltd");
  });
});

describe("parseSlug", () => {
  it("parses valid slug", () => {
    expect(parseSlug("starter-monthly")).toEqual({
      tier: "STARTER",
      billing: "monthly",
    });
  });

  it("parses annual billing", () => {
    expect(parseSlug("growth-annual")).toEqual({
      tier: "GROWTH",
      billing: "annual",
    });
  });

  it("parses LTD billing", () => {
    expect(parseSlug("scale-ltd")).toEqual({
      tier: "SCALE",
      billing: "ltd",
    });
  });

  // Legacy slug support
  it("maps legacy 'pro-monthly' to STARTER", () => {
    expect(parseSlug("pro-monthly")).toEqual({
      tier: "STARTER",
      billing: "monthly",
    });
  });

  it("maps legacy 'pro-annual' to STARTER", () => {
    expect(parseSlug("pro-annual")).toEqual({
      tier: "STARTER",
      billing: "annual",
    });
  });

  it("maps legacy 'pro-ltd' to STARTER", () => {
    expect(parseSlug("pro-ltd")).toEqual({
      tier: "STARTER",
      billing: "ltd",
    });
  });

  it("returns null for invalid slug", () => {
    expect(parseSlug("invalid")).toBeNull();
    expect(parseSlug("")).toBeNull();
    expect(parseSlug("free-monthly")).toBeNull();
  });
});
