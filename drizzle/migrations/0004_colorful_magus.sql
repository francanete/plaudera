CREATE TABLE "feature_rate_limits" (
	"id" text PRIMARY KEY NOT NULL,
	"plan" "plan" NOT NULL,
	"feature" text NOT NULL,
	"requests_per_hour" integer,
	"requests_per_day" integer,
	"tokens_per_day" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tier_configs" (
	"plan" "plan" PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feature_rate_limits" ALTER COLUMN "plan" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "plan" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "plan" SET DEFAULT 'FREE'::text;--> statement-breakpoint
ALTER TABLE "tier_configs" ALTER COLUMN "plan" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."plan";--> statement-breakpoint
CREATE TYPE "public"."plan" AS ENUM('FREE', 'STARTER', 'GROWTH', 'SCALE');--> statement-breakpoint
ALTER TABLE "feature_rate_limits" ALTER COLUMN "plan" SET DATA TYPE "public"."plan" USING "plan"::"public"."plan";--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "plan" SET DEFAULT 'FREE'::"public"."plan";--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "plan" SET DATA TYPE "public"."plan" USING "plan"::"public"."plan";--> statement-breakpoint
ALTER TABLE "tier_configs" ALTER COLUMN "plan" SET DATA TYPE "public"."plan" USING "plan"::"public"."plan";--> statement-breakpoint
CREATE UNIQUE INDEX "feature_rate_limits_plan_feature_idx" ON "feature_rate_limits" USING btree ("plan","feature");--> statement-breakpoint
CREATE INDEX "feature_rate_limits_plan_feature_active_idx" ON "feature_rate_limits" USING btree ("plan","feature","is_active");