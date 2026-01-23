import {
  pgTable,
  text,
  timestamp,
  boolean,
  pgEnum,
  uniqueIndex,
  index,
  integer,
  vector,
  check,
  foreignKey,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

// ============ Enums ============
export const planEnum = pgEnum("plan", ["FREE", "STARTER", "GROWTH", "SCALE"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "ACTIVE",
  "CANCELED",
  "PAST_DUE",
  "TRIALING",
]);
export const billingTypeEnum = pgEnum("billing_type", [
  "recurring",
  "one_time",
  "none",
]);
export const roleEnum = pgEnum("role", ["user", "admin"]);

// ============ Auth Tables (Better Auth) ============
// Note: Better Auth expects specific table names. We use pluralized names
// for convention and configure `usePlural: true` in the Drizzle adapter (Step 3).

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false),
  name: text("name"),
  image: text("image"),
  role: roleEnum("role").default("user").notNull(),
  marketingUnsubscribed: boolean("marketing_unsubscribed")
    .default(false)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const sessions = pgTable(
  "sessions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)]
);

export const accounts = pgTable(
  "accounts",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    idToken: text("id_token"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("accounts_provider_account_idx").on(
      table.providerId,
      table.accountId
    ),
    index("accounts_user_id_idx").on(table.userId),
  ]
);

export const verifications = pgTable(
  "verifications",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("verifications_identifier_value_idx").on(
      table.identifier,
      table.value
    ),
  ]
);

// ============ App Tables ============
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),

    // Polar IDs
    polarCustomerId: text("polar_customer_id"),
    polarSubscriptionId: text("polar_subscription_id"), // For recurring subscriptions
    polarOrderId: text("polar_order_id"), // For one-time purchases (LTD)
    polarProductId: text("polar_product_id"), // The actual Polar product purchased

    // Billing info
    billingType: billingTypeEnum("billing_type").default("recurring").notNull(),
    plan: planEnum("plan").default("FREE").notNull(),
    status: subscriptionStatusEnum("status").default("ACTIVE").notNull(),

    // Period (NULL for lifetime purchases)
    currentPeriodEnd: timestamp("current_period_end"),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),

    // Sync tracking (for API fallback when webhooks fail)
    lastSyncedAt: timestamp("last_synced_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("subscriptions_status_idx").on(table.status),
    index("subscriptions_billing_type_idx").on(table.billingType),
    index("subscriptions_polar_customer_id_idx").on(table.polarCustomerId),
  ]
);

// ============ AI Usage Table ============
export const aiUsage = pgTable(
  "ai_usage",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Request metadata
    model: text("model").notNull(),
    feature: text("feature").notNull(), // "chat" | "summarize" | "generate"

    // Token usage
    promptTokens: integer("prompt_tokens").notNull(),
    completionTokens: integer("completion_tokens").notNull(),
    totalTokens: integer("total_tokens").notNull(),

    // Response metadata
    finishReason: text("finish_reason"),
    durationMs: integer("duration_ms"),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("ai_usage_user_id_idx").on(table.userId),
    index("ai_usage_created_at_idx").on(table.createdAt),
    index("ai_usage_user_created_idx").on(table.userId, table.createdAt),
  ]
);

// ============ Onboarding Flows Table ============
export const onboardingFlows = pgTable(
  "onboarding_flows",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    flowId: text("flow_id").notNull(), // "dashboard", "settings", etc.
    completedAt: timestamp("completed_at"),
    skippedAt: timestamp("skipped_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("onboarding_flows_user_flow_idx").on(
      table.userId,
      table.flowId
    ),
    index("onboarding_flows_user_id_idx").on(table.userId),
  ]
);

// ============ Email Tracking Table ============
export const emailsSent = pgTable(
  "emails_sent",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    emailKey: text("email_key").notNull(), // "welcome_instant", "welcome_day3", etc.
    sentAt: timestamp("sent_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("emails_sent_user_email_idx").on(table.userId, table.emailKey),
    index("emails_sent_user_id_idx").on(table.userId),
  ]
);

// ============ Tier System Tables ============
export const tierConfigs = pgTable("tier_configs", {
  plan: planEnum("plan").primaryKey(),
  displayName: text("display_name").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const featureRateLimits = pgTable(
  "feature_rate_limits",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    plan: planEnum("plan").notNull(),
    feature: text("feature").notNull(), // e.g., "chat", "generation"
    requestsPerHour: integer("requests_per_hour"),
    requestsPerDay: integer("requests_per_day"),
    tokensPerDay: integer("tokens_per_day"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("feature_rate_limits_plan_feature_idx").on(
      table.plan,
      table.feature
    ),
    index("feature_rate_limits_plan_feature_active_idx").on(
      table.plan,
      table.feature,
      table.isActive
    ),
  ]
);

// ============ Relations ============
export const usersRelations = relations(users, ({ many, one }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  subscription: one(subscriptions, {
    fields: [users.id],
    references: [subscriptions.userId],
  }),
  aiUsage: many(aiUsage),
  onboardingFlows: many(onboardingFlows),
  emailsSent: many(emailsSent),
  workspaces: many(workspaces),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
}));

export const aiUsageRelations = relations(aiUsage, ({ one }) => ({
  user: one(users, {
    fields: [aiUsage.userId],
    references: [users.id],
  }),
}));

export const onboardingFlowsRelations = relations(
  onboardingFlows,
  ({ one }) => ({
    user: one(users, {
      fields: [onboardingFlows.userId],
      references: [users.id],
    }),
  })
);

export const emailsSentRelations = relations(emailsSent, ({ one }) => ({
  user: one(users, {
    fields: [emailsSent.userId],
    references: [users.id],
  }),
}));

export const tierConfigsRelations = relations(tierConfigs, ({ many }) => ({
  rateLimits: many(featureRateLimits),
}));

export const featureRateLimitsRelations = relations(
  featureRateLimits,
  ({ one }) => ({
    tier: one(tierConfigs, {
      fields: [featureRateLimits.plan],
      references: [tierConfigs.plan],
    }),
  })
);

// ============ Idea Status Enum ============
export const ideaStatusEnum = pgEnum("idea_status", [
  "UNDER_REVIEW",
  "PUBLISHED",
  "DECLINED",
  "MERGED",
]);

/**
 * Statuses that are visible on the public feedback board.
 * Only PUBLISHED ideas are visible to everyone.
 * UNDER_REVIEW = awaiting owner approval (hidden, except to submitter)
 * DECLINED = rejected (hidden, soft-delete)
 * MERGED = duplicate merged into another (hidden)
 */
export const PUBLIC_VISIBLE_STATUSES: IdeaStatus[] = ["PUBLISHED"] as const;

// ============ Contributors (workspace owners' customers) ============
export const contributors = pgTable(
  "contributors",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    email: text("email").notNull().unique(),
    name: text("name"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("contributors_email_idx").on(table.email)]
);

// ============ Contributor Verification Tokens ============
export const contributorTokens = pgTable(
  "contributor_tokens",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    email: text("email").notNull(),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("contributor_tokens_token_idx").on(table.token),
    index("contributor_tokens_email_idx").on(table.email),
  ]
);

// ============ Widget Position Enum ============
export const widgetPositionEnum = pgEnum("widget_position", [
  "bottom-right",
  "bottom-left",
]);

// ============ Workspaces Table ============
export const workspaces = pgTable(
  "workspaces",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("workspaces_slug_idx").on(table.slug),
    uniqueIndex("workspaces_owner_id_idx").on(table.ownerId),
  ]
);

// ============ Widget Settings Table ============
export const widgetSettings = pgTable(
  "widget_settings",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    workspaceId: text("workspace_id")
      .notNull()
      .unique()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    // Position
    position: widgetPositionEnum("position").default("bottom-right").notNull(),
    // CORS allowlist for widget embed
    allowedOrigins: text("allowed_origins").array().default([]),
    // Page targeting: glob patterns for which pages show the widget (empty = all pages)
    pageRules: text("page_rules").array().default([]),
    // Whether to show the "Feedback" label text (expands on hover)
    showLabel: boolean("show_label").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("widget_settings_workspace_id_idx").on(table.workspaceId),
  ]
);

// ============ Ideas Table ============
export const ideas = pgTable(
  "ideas",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    contributorId: text("contributor_id").references(() => contributors.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    description: text("description"),
    status: ideaStatusEnum("status").default("UNDER_REVIEW").notNull(),
    voteCount: integer("vote_count").default(0).notNull(),
    mergedIntoId: text("merged_into_id"),
    authorEmail: text("author_email"),
    authorName: text("author_name"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("ideas_workspace_id_idx").on(table.workspaceId),
    index("ideas_workspace_status_idx").on(table.workspaceId, table.status),
    index("ideas_workspace_votes_idx").on(table.workspaceId, table.voteCount),
    index("ideas_contributor_id_idx").on(table.contributorId),
    foreignKey({
      columns: [table.mergedIntoId],
      foreignColumns: [table.id],
    }).onDelete("restrict"),
    check(
      "merged_status_requires_parent",
      sql`(${table.status} = 'MERGED' AND ${table.mergedIntoId} IS NOT NULL) OR (${table.status} != 'MERGED' AND ${table.mergedIntoId} IS NULL)`
    ),
  ]
);

// ============ Votes Table ============
export const votes = pgTable(
  "votes",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    ideaId: text("idea_id")
      .notNull()
      .references(() => ideas.id, { onDelete: "cascade" }),
    contributorId: text("contributor_id")
      .notNull()
      .references(() => contributors.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("votes_idea_contributor_idx").on(
      table.ideaId,
      table.contributorId
    ),
    index("votes_idea_id_idx").on(table.ideaId),
    index("votes_contributor_id_idx").on(table.contributorId),
  ]
);

// ============ Duplicate Suggestion Status Enum ============
export const duplicateSuggestionStatusEnum = pgEnum(
  "duplicate_suggestion_status",
  ["PENDING", "MERGED", "DISMISSED"]
);

// ============ Idea Embeddings Table ============
export const ideaEmbeddings = pgTable(
  "idea_embeddings",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    ideaId: text("idea_id")
      .notNull()
      .unique()
      .references(() => ideas.id, { onDelete: "cascade" }),
    embedding: vector("embedding", { dimensions: 768 }).notNull(),
    modelVersion: text("model_version").notNull().default("text-embedding-004"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idea_embeddings_idea_id_idx").on(table.ideaId),
    index("idea_embeddings_vector_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops")
    ),
  ]
);

// ============ Duplicate Suggestions Table ============
export const duplicateSuggestions = pgTable(
  "duplicate_suggestions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    sourceIdeaId: text("source_idea_id")
      .notNull()
      .references(() => ideas.id, { onDelete: "cascade" }),
    duplicateIdeaId: text("duplicate_idea_id")
      .notNull()
      .references(() => ideas.id, { onDelete: "cascade" }),
    similarity: integer("similarity").notNull(), // 0-100 percentage
    status: duplicateSuggestionStatusEnum("status")
      .default("PENDING")
      .notNull(),
    reviewedAt: timestamp("reviewed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("duplicate_suggestions_workspace_status_idx").on(
      table.workspaceId,
      table.status
    ),
    uniqueIndex("duplicate_suggestions_pair_idx").on(
      table.sourceIdeaId,
      table.duplicateIdeaId
    ),
  ]
);

// ============ Workspaces Relations ============
export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  owner: one(users, {
    fields: [workspaces.ownerId],
    references: [users.id],
  }),
  ideas: many(ideas),
  widgetSettings: one(widgetSettings),
  duplicateSuggestions: many(duplicateSuggestions),
}));

// ============ Widget Settings Relations ============
export const widgetSettingsRelations = relations(widgetSettings, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [widgetSettings.workspaceId],
    references: [workspaces.id],
  }),
}));

// ============ Ideas Relations ============
export const ideasRelations = relations(ideas, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [ideas.workspaceId],
    references: [workspaces.id],
  }),
  contributor: one(contributors, {
    fields: [ideas.contributorId],
    references: [contributors.id],
  }),
  votes: many(votes),
  mergedInto: one(ideas, {
    fields: [ideas.mergedIntoId],
    references: [ideas.id],
    relationName: "mergedIdeas",
  }),
  mergedFrom: many(ideas, { relationName: "mergedIdeas" }),
  embedding: one(ideaEmbeddings, {
    fields: [ideas.id],
    references: [ideaEmbeddings.ideaId],
  }),
}));

// ============ Votes Relations ============
export const votesRelations = relations(votes, ({ one }) => ({
  idea: one(ideas, {
    fields: [votes.ideaId],
    references: [ideas.id],
  }),
  contributor: one(contributors, {
    fields: [votes.contributorId],
    references: [contributors.id],
  }),
}));

// ============ Contributors Relations ============
export const contributorsRelations = relations(contributors, ({ many }) => ({
  ideas: many(ideas),
  votes: many(votes),
}));

// ============ Idea Embeddings Relations ============
export const ideaEmbeddingsRelations = relations(ideaEmbeddings, ({ one }) => ({
  idea: one(ideas, {
    fields: [ideaEmbeddings.ideaId],
    references: [ideas.id],
  }),
}));

// ============ Duplicate Suggestions Relations ============
export const duplicateSuggestionsRelations = relations(
  duplicateSuggestions,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [duplicateSuggestions.workspaceId],
      references: [workspaces.id],
    }),
    sourceIdea: one(ideas, {
      fields: [duplicateSuggestions.sourceIdeaId],
      references: [ideas.id],
      relationName: "sourceDuplicates",
    }),
    duplicateIdea: one(ideas, {
      fields: [duplicateSuggestions.duplicateIdeaId],
      references: [ideas.id],
      relationName: "targetDuplicates",
    }),
  })
);

// ============ Type Exports ============
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type AIUsage = typeof aiUsage.$inferSelect;
export type NewAIUsage = typeof aiUsage.$inferInsert;
export type TierConfig = typeof tierConfigs.$inferSelect;
export type NewTierConfig = typeof tierConfigs.$inferInsert;
export type FeatureRateLimit = typeof featureRateLimits.$inferSelect;
export type NewFeatureRateLimit = typeof featureRateLimits.$inferInsert;
export type OnboardingFlow = typeof onboardingFlows.$inferSelect;
export type NewOnboardingFlow = typeof onboardingFlows.$inferInsert;
export type EmailSent = typeof emailsSent.$inferSelect;
export type NewEmailSent = typeof emailsSent.$inferInsert;
export type Plan = "FREE" | "STARTER" | "GROWTH" | "SCALE";
export type BillingType = "recurring" | "one_time" | "none";
export type Role = "user" | "admin";
export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
export type Idea = typeof ideas.$inferSelect;
export type NewIdea = typeof ideas.$inferInsert;
export type Vote = typeof votes.$inferSelect;
export type NewVote = typeof votes.$inferInsert;
export type Contributor = typeof contributors.$inferSelect;
export type NewContributor = typeof contributors.$inferInsert;
export type ContributorToken = typeof contributorTokens.$inferSelect;
export type NewContributorToken = typeof contributorTokens.$inferInsert;
export type WidgetSettings = typeof widgetSettings.$inferSelect;
export type NewWidgetSettings = typeof widgetSettings.$inferInsert;
// Derive IdeaStatus type from the enum to keep them in sync
export type IdeaStatus = (typeof ideaStatusEnum.enumValues)[number];
export type WidgetPosition = (typeof widgetPositionEnum.enumValues)[number];
export type IdeaEmbedding = typeof ideaEmbeddings.$inferSelect;
export type NewIdeaEmbedding = typeof ideaEmbeddings.$inferInsert;
export type DuplicateSuggestion = typeof duplicateSuggestions.$inferSelect;
export type NewDuplicateSuggestion = typeof duplicateSuggestions.$inferInsert;
export type DuplicateSuggestionStatus =
  (typeof duplicateSuggestionStatusEnum.enumValues)[number];
