import {
  ALL_ROADMAP_STATUSES,
  VISIBLE_ROADMAP_STATUSES,
  ROADMAP_STATUS_CONFIG,
  isOnRoadmap,
} from "@/lib/roadmap-status-config";
describe("ALL_ROADMAP_STATUSES", () => {
  it("contains all four roadmap statuses", () => {
    expect(ALL_ROADMAP_STATUSES).toHaveLength(4);
    expect(ALL_ROADMAP_STATUSES).toContain("NONE");
    expect(ALL_ROADMAP_STATUSES).toContain("PLANNED");
    expect(ALL_ROADMAP_STATUSES).toContain("IN_PROGRESS");
    expect(ALL_ROADMAP_STATUSES).toContain("RELEASED");
  });

  it("maintains progression order", () => {
    expect(ALL_ROADMAP_STATUSES).toEqual([
      "NONE",
      "PLANNED",
      "IN_PROGRESS",
      "RELEASED",
    ]);
  });
});

describe("VISIBLE_ROADMAP_STATUSES", () => {
  it("contains only visible statuses (excludes NONE)", () => {
    expect(VISIBLE_ROADMAP_STATUSES).toHaveLength(3);
    expect(VISIBLE_ROADMAP_STATUSES).not.toContain("NONE");
  });

  it("contains all roadmap-visible statuses", () => {
    expect(VISIBLE_ROADMAP_STATUSES).toContain("PLANNED");
    expect(VISIBLE_ROADMAP_STATUSES).toContain("IN_PROGRESS");
    expect(VISIBLE_ROADMAP_STATUSES).toContain("RELEASED");
  });

  it("maintains progression order", () => {
    expect(VISIBLE_ROADMAP_STATUSES).toEqual([
      "PLANNED",
      "IN_PROGRESS",
      "RELEASED",
    ]);
  });
});

describe("ROADMAP_STATUS_CONFIG", () => {
  it("has config for all roadmap statuses", () => {
    for (const status of ALL_ROADMAP_STATUSES) {
      expect(ROADMAP_STATUS_CONFIG[status]).toBeDefined();
    }
  });

  describe("each config entry", () => {
    it.each(ALL_ROADMAP_STATUSES)("has required fields for %s", (status) => {
      const config = ROADMAP_STATUS_CONFIG[status];

      expect(config).toHaveProperty("label");
      expect(config).toHaveProperty("shortLabel");
      expect(config).toHaveProperty("variant");
      expect(config).toHaveProperty("icon");
      expect(config).toHaveProperty("badgeClassName");

      expect(typeof config.label).toBe("string");
      expect(typeof config.shortLabel).toBe("string");
      expect(typeof config.badgeClassName).toBe("string");
      expect(config.label.length).toBeGreaterThan(0);
      expect(config.shortLabel.length).toBeGreaterThan(0);
    });

    it.each(ALL_ROADMAP_STATUSES)("has valid variant for %s", (status) => {
      const config = ROADMAP_STATUS_CONFIG[status];
      const validVariants = ["default", "secondary", "outline", "destructive"];
      expect(validVariants).toContain(config.variant);
    });

    it.each(ALL_ROADMAP_STATUSES)("has an icon component for %s", (status) => {
      const config = ROADMAP_STATUS_CONFIG[status];
      // Lucide icons are React forwardRef components (objects), not plain functions
      expect(config.icon).toBeDefined();
      expect(
        typeof config.icon === "function" || typeof config.icon === "object"
      ).toBe(true);
    });
  });

  describe("specific status configs", () => {
    it("NONE config indicates not on roadmap", () => {
      expect(ROADMAP_STATUS_CONFIG.NONE.label).toBe("Not on roadmap");
      expect(ROADMAP_STATUS_CONFIG.NONE.variant).toBe("outline");
    });

    it("PLANNED config is appropriate", () => {
      expect(ROADMAP_STATUS_CONFIG.PLANNED.label).toBe("Planned");
      expect(ROADMAP_STATUS_CONFIG.PLANNED.badgeClassName).toContain("blue");
    });

    it("IN_PROGRESS config is appropriate", () => {
      expect(ROADMAP_STATUS_CONFIG.IN_PROGRESS.label).toBe("In Progress");
      expect(ROADMAP_STATUS_CONFIG.IN_PROGRESS.badgeClassName).toContain(
        "amber"
      );
    });

    it("RELEASED config is appropriate", () => {
      expect(ROADMAP_STATUS_CONFIG.RELEASED.label).toBe("Released");
      expect(ROADMAP_STATUS_CONFIG.RELEASED.badgeClassName).toContain("green");
    });
  });
});

describe("isOnRoadmap", () => {
  it("returns false for NONE", () => {
    expect(isOnRoadmap("NONE")).toBe(false);
  });

  it("returns true for PLANNED", () => {
    expect(isOnRoadmap("PLANNED")).toBe(true);
  });

  it("returns true for IN_PROGRESS", () => {
    expect(isOnRoadmap("IN_PROGRESS")).toBe(true);
  });

  it("returns true for RELEASED", () => {
    expect(isOnRoadmap("RELEASED")).toBe(true);
  });

  it("returns true for all visible statuses", () => {
    for (const status of VISIBLE_ROADMAP_STATUSES) {
      expect(isOnRoadmap(status)).toBe(true);
    }
  });

  it("only returns false for NONE among all statuses", () => {
    const falseResults = ALL_ROADMAP_STATUSES.filter(
      (status) => !isOnRoadmap(status)
    );
    expect(falseResults).toEqual(["NONE"]);
  });
});
