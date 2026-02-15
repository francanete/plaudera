import { vi } from "vitest";

// Mock database and external dependencies before importing subscription
vi.mock("@/lib/db", () => ({
  db: {},
  subscriptions: {},
}));

vi.mock("@/lib/polar-client", () => ({
  polarClient: {},
}));

vi.mock("@/lib/config", () => ({
  appConfig: { plans: { hierarchy: {} } },
  getPlanFromPolarProduct: vi.fn(),
}));

import { mapPolarStatus, isCustomerOwnedByUser } from "@/lib/subscription";

describe("mapPolarStatus", () => {
  it("maps 'active' to ACTIVE", () => {
    expect(mapPolarStatus("active")).toBe("ACTIVE");
  });

  it("maps 'canceled' to CANCELED", () => {
    expect(mapPolarStatus("canceled")).toBe("CANCELED");
  });

  it("maps 'cancelled' (UK spelling) to CANCELED", () => {
    expect(mapPolarStatus("cancelled")).toBe("CANCELED");
  });

  it("maps 'past_due' to PAST_DUE", () => {
    expect(mapPolarStatus("past_due")).toBe("PAST_DUE");
  });

  it("maps 'trialing' to TRIALING", () => {
    expect(mapPolarStatus("trialing")).toBe("TRIALING");
  });

  it("maps unknown status to CANCELED (safety default)", () => {
    expect(mapPolarStatus("unknown")).toBe("CANCELED");
  });

  it("is case insensitive", () => {
    expect(mapPolarStatus("ACTIVE")).toBe("ACTIVE");
    expect(mapPolarStatus("Active")).toBe("ACTIVE");
  });
});

describe("isCustomerOwnedByUser", () => {
  it("returns true when externalId matches userId", () => {
    const result = isCustomerOwnedByUser(
      {
        id: "cus_1",
        externalId: "user_123",
        email: "other@example.com",
      },
      "user_123",
      "user@example.com"
    );

    expect(result).toBe(true);
  });

  it("returns false when externalId does not match userId", () => {
    const result = isCustomerOwnedByUser(
      {
        id: "cus_1",
        externalId: "user_other",
        email: "user@example.com",
      },
      "user_123",
      "user@example.com"
    );

    expect(result).toBe(false);
  });

  it("falls back to case-insensitive email match when externalId missing", () => {
    const result = isCustomerOwnedByUser(
      {
        id: "cus_1",
        externalId: null,
        email: " User@Example.com ",
      },
      "user_123",
      "user@example.com"
    );

    expect(result).toBe(true);
  });

  it("returns false when externalId missing and email does not match", () => {
    const result = isCustomerOwnedByUser(
      {
        id: "cus_1",
        externalId: null,
        email: "another@example.com",
      },
      "user_123",
      "user@example.com"
    );

    expect(result).toBe(false);
  });

  it("returns false when neither externalId nor email can verify ownership", () => {
    const result = isCustomerOwnedByUser(
      {
        id: "cus_1",
        externalId: null,
        email: null,
      },
      "user_123",
      null
    );

    expect(result).toBe(false);
  });
});
