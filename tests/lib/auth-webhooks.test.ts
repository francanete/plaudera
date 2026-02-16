import { vi, describe, it, expect, beforeEach } from "vitest";

const {
  mockDbQuery,
  mockDbInsert,
  mockPolarClient,
  mockUpsertSubscription,
  mockUpdateSubscriptionStatus,
  mockMapPolarStatus,
  mockInngestSend,
} = vi.hoisted(() => {
  const mockOnConflictDoNothing = vi.fn().mockResolvedValue(undefined);
  const mockReturning = vi.fn().mockResolvedValue([{ id: "new-user-1" }]);
  const mockValues = vi.fn().mockReturnValue({
    returning: mockReturning,
    onConflictDoNothing: mockOnConflictDoNothing,
  });

  return {
    mockDbQuery: { users: { findFirst: vi.fn() } },
    mockDbInsert: {
      insert: vi.fn().mockReturnValue({ values: mockValues }),
      values: mockValues,
      returning: mockReturning,
      onConflictDoNothing: mockOnConflictDoNothing,
    },
    mockPolarClient: { customers: { update: vi.fn().mockResolvedValue({}) } },
    mockUpsertSubscription: vi.fn().mockResolvedValue(undefined),
    mockUpdateSubscriptionStatus: vi.fn().mockResolvedValue(undefined),
    mockMapPolarStatus: vi.fn().mockReturnValue("ACTIVE"),
    mockInngestSend: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("@/lib/db", () => ({
  db: {
    query: mockDbQuery,
    insert: mockDbInsert.insert,
  },
  users: { email: "email", id: "id" },
  subscriptions: {},
}));
vi.mock("@/lib/polar-client", () => ({
  polarClient: mockPolarClient,
}));
vi.mock("@/lib/subscription", () => ({
  upsertSubscription: mockUpsertSubscription,
  updateSubscriptionStatus: mockUpdateSubscriptionStatus,
  mapPolarStatus: mockMapPolarStatus,
}));
vi.mock("@/lib/inngest/client", () => ({
  inngest: { send: mockInngestSend },
}));
vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
}));

import {
  resolveOrCreateUser,
  onOrderPaid,
  onSubscriptionCreated,
  onSubscriptionUpdated,
  onSubscriptionCanceled,
} from "@/lib/auth-webhooks";
import type { WebhookOrderPaidPayload } from "@polar-sh/sdk/models/components/webhookorderpaidpayload";
import type { WebhookSubscriptionCreatedPayload } from "@polar-sh/sdk/models/components/webhooksubscriptioncreatedpayload";
import type { WebhookSubscriptionUpdatedPayload } from "@polar-sh/sdk/models/components/webhooksubscriptionupdatedpayload";
import type { WebhookSubscriptionCanceledPayload } from "@polar-sh/sdk/models/components/webhooksubscriptioncanceledpayload";

describe("resolveOrCreateUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset insert chain defaults
    mockDbInsert.insert.mockReturnValue({ values: mockDbInsert.values });
    mockDbInsert.values.mockReturnValue({
      returning: mockDbInsert.returning,
      onConflictDoNothing: mockDbInsert.onConflictDoNothing,
    });
    mockDbInsert.returning.mockResolvedValue([{ id: "new-user-1" }]);
  });

  it("returns externalId immediately when set", async () => {
    const result = await resolveOrCreateUser({
      id: "polar-1",
      externalId: "existing-user-1",
      email: "test@example.com",
    });

    expect(result).toBe("existing-user-1");
    expect(mockDbQuery.users.findFirst).not.toHaveBeenCalled();
  });

  it("finds existing user by email and updates Polar customer", async () => {
    mockDbQuery.users.findFirst.mockResolvedValue({ id: "found-user-1" });

    const result = await resolveOrCreateUser({
      id: "polar-1",
      email: "test@example.com",
    });

    expect(result).toBe("found-user-1");
    expect(mockPolarClient.customers.update).toHaveBeenCalledWith({
      id: "polar-1",
      customerUpdate: { externalId: "found-user-1" },
    });
  });

  it("creates new user when not found by email", async () => {
    mockDbQuery.users.findFirst.mockResolvedValue(null);

    const result = await resolveOrCreateUser({
      id: "polar-1",
      email: "new@example.com",
      name: "New User",
    });

    expect(result).toBe("new-user-1");
    // Should create user, subscription, update Polar, send inngest event
    expect(mockDbInsert.insert).toHaveBeenCalledTimes(2); // user + subscription
    expect(mockPolarClient.customers.update).toHaveBeenCalled();
    expect(mockInngestSend).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "user/paid-signup",
        data: expect.objectContaining({ userId: "new-user-1" }),
      })
    );
  });

  it("silently catches Polar update failure", async () => {
    mockDbQuery.users.findFirst.mockResolvedValue({ id: "found-user-1" });
    mockPolarClient.customers.update.mockRejectedValue(
      new Error("Polar API down")
    );

    // Should not throw
    const result = await resolveOrCreateUser({
      id: "polar-1",
      email: "test@example.com",
    });

    expect(result).toBe("found-user-1");
  });
});

describe("onOrderPaid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbQuery.users.findFirst.mockResolvedValue(null);
    mockDbInsert.insert.mockReturnValue({ values: mockDbInsert.values });
    mockDbInsert.values.mockReturnValue({
      returning: mockDbInsert.returning,
      onConflictDoNothing: mockDbInsert.onConflictDoNothing,
    });
    mockDbInsert.returning.mockResolvedValue([{ id: "new-user-1" }]);
  });

  it("skips orders with subscriptionId", async () => {
    await onOrderPaid({
      data: {
        id: "order-1",
        subscriptionId: "sub-1",
        customer: { id: "c-1", email: "a@b.com" },
        product: { id: "prod-1" },
      },
    } as unknown as WebhookOrderPaidPayload);

    expect(mockUpsertSubscription).not.toHaveBeenCalled();
  });

  it("throws when product is missing", async () => {
    await expect(
      onOrderPaid({
        data: {
          id: "order-1",
          customer: { id: "c-1", email: "a@b.com" },
          product: null,
        },
      } as unknown as WebhookOrderPaidPayload)
    ).rejects.toThrow("No product on order");
  });

  it("resolves user and upserts subscription for valid order", async () => {
    await onOrderPaid({
      data: {
        id: "order-1",
        customer: { id: "c-1", externalId: "user-1", email: "a@b.com" },
        product: { id: "prod-1" },
      },
    } as unknown as WebhookOrderPaidPayload);

    expect(mockUpsertSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        polarOrderId: "order-1",
        billingType: "one_time",
        status: "ACTIVE",
      })
    );
  });
});

describe("onSubscriptionCreated", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMapPolarStatus.mockReturnValue("ACTIVE");
  });

  it("throws when product is missing", async () => {
    await expect(
      onSubscriptionCreated({
        data: {
          id: "sub-1",
          status: "active",
          cancelAtPeriodEnd: false,
          customer: { id: "c-1", email: "a@b.com" },
          product: null,
        },
      } as unknown as WebhookSubscriptionCreatedPayload)
    ).rejects.toThrow("No product on subscription");
  });

  it("upserts with mapped status and period end", async () => {
    mockMapPolarStatus.mockReturnValue("TRIALING");

    await onSubscriptionCreated({
      data: {
        id: "sub-1",
        status: "trialing",
        currentPeriodEnd: "2026-03-01T00:00:00Z",
        cancelAtPeriodEnd: false,
        customer: { id: "c-1", externalId: "user-1", email: "a@b.com" },
        product: { id: "prod-1" },
      },
    } as unknown as WebhookSubscriptionCreatedPayload);

    expect(mockUpsertSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        billingType: "recurring",
        status: "TRIALING",
        cancelAtPeriodEnd: false,
      })
    );
  });
});

describe("onSubscriptionUpdated", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMapPolarStatus.mockReturnValue("ACTIVE");
  });

  it("updates status and cancelAtPeriodEnd", async () => {
    await onSubscriptionUpdated({
      data: {
        id: "sub-1",
        status: "active",
        cancelAtPeriodEnd: true,
        customer: { id: "c-1", email: "a@b.com" },
      },
    } as unknown as WebhookSubscriptionUpdatedPayload);

    expect(mockUpdateSubscriptionStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        polarSubscriptionId: "sub-1",
        cancelAtPeriodEnd: true,
      })
    );
  });
});

describe("onSubscriptionCanceled", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sets status to CANCELED", async () => {
    await onSubscriptionCanceled({
      data: {
        id: "sub-1",
        status: "canceled",
        cancelAtPeriodEnd: false,
        customer: { id: "c-1", email: "a@b.com" },
      },
    } as unknown as WebhookSubscriptionCanceledPayload);

    expect(mockUpdateSubscriptionStatus).toHaveBeenCalledWith({
      polarSubscriptionId: "sub-1",
      status: "CANCELED",
    });
  });
});
