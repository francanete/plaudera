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

import { mapPolarStatus } from "@/lib/subscription";

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
