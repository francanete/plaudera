import { slugSchema, isReservedSlug } from "@/lib/slug-validation";

describe("slugSchema", () => {
  describe("valid slugs", () => {
    const validSlugs = [
      "abc",
      "my-brand",
      "hello-world-123",
      "a1b",
      "test-slug-here",
      "x".repeat(40),
      "a-b",
      "123",
      "a1",
      "ab",
      "a",
    ];

    it.each(validSlugs)('accepts "%s"', (slug) => {
      // Single char slugs fail min length, skip those under 3
      if (slug.length >= 3) {
        const result = slugSchema.safeParse(slug);
        expect(result.success).toBe(true);
      }
    });
  });

  describe("minimum length", () => {
    it("rejects slugs shorter than 3 characters", () => {
      const result = slugSchema.safeParse("ab");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("at least 3");
      }
    });

    it("accepts slugs with exactly 3 characters", () => {
      const result = slugSchema.safeParse("abc");
      expect(result.success).toBe(true);
    });
  });

  describe("maximum length", () => {
    it("rejects slugs longer than 40 characters", () => {
      const result = slugSchema.safeParse("a".repeat(41));
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("at most 40");
      }
    });

    it("accepts slugs with exactly 40 characters", () => {
      const result = slugSchema.safeParse("a".repeat(40));
      expect(result.success).toBe(true);
    });
  });

  describe("character restrictions", () => {
    it("rejects uppercase letters", () => {
      const result = slugSchema.safeParse("MyBrand");
      expect(result.success).toBe(false);
    });

    it("rejects spaces", () => {
      const result = slugSchema.safeParse("my brand");
      expect(result.success).toBe(false);
    });

    it("rejects underscores", () => {
      const result = slugSchema.safeParse("my_brand");
      expect(result.success).toBe(false);
    });

    it("rejects special characters", () => {
      const result = slugSchema.safeParse("my@brand");
      expect(result.success).toBe(false);
    });

    it("rejects unicode characters", () => {
      const result = slugSchema.safeParse("my-brând");
      expect(result.success).toBe(false);
    });

    it("rejects dots", () => {
      const result = slugSchema.safeParse("my.brand");
      expect(result.success).toBe(false);
    });
  });

  describe("hyphen rules", () => {
    it("rejects leading hyphens", () => {
      const result = slugSchema.safeParse("-my-brand");
      expect(result.success).toBe(false);
    });

    it("rejects trailing hyphens", () => {
      const result = slugSchema.safeParse("my-brand-");
      expect(result.success).toBe(false);
    });

    it("rejects consecutive hyphens", () => {
      const result = slugSchema.safeParse("my--brand");
      expect(result.success).toBe(false);
    });

    it("allows single hyphens between characters", () => {
      const result = slugSchema.safeParse("my-brand");
      expect(result.success).toBe(true);
    });

    it("allows multiple single hyphens", () => {
      const result = slugSchema.safeParse("my-cool-brand");
      expect(result.success).toBe(true);
    });
  });

  describe("reserved slugs", () => {
    const reservedSlugs = [
      "api",
      "dashboard",
      "login",
      "admin",
      "settings",
      "plaudera",
      "pricing",
      "blog",
      "embed",
    ];

    it.each(reservedSlugs)('rejects reserved slug "%s"', (slug) => {
      const result = slugSchema.safeParse(slug);
      expect(result.success).toBe(false);
    });

    it("accepts non-reserved slugs", () => {
      const result = slugSchema.safeParse("my-custom-brand");
      expect(result.success).toBe(true);
    });
  });
});

describe("isReservedSlug", () => {
  it("returns true for reserved slugs", () => {
    expect(isReservedSlug("api")).toBe(true);
    expect(isReservedSlug("dashboard")).toBe(true);
    expect(isReservedSlug("plaudera")).toBe(true);
  });

  it("returns false for non-reserved slugs", () => {
    expect(isReservedSlug("my-brand")).toBe(false);
    expect(isReservedSlug("cool-product")).toBe(false);
  });
});
