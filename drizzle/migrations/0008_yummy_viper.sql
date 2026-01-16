CREATE TABLE "onboarding_flows" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"flow_id" text NOT NULL,
	"completed_at" timestamp,
	"skipped_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "onboarding_flows" ADD CONSTRAINT "onboarding_flows_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "onboarding_flows_user_flow_idx" ON "onboarding_flows" USING btree ("user_id","flow_id");--> statement-breakpoint
CREATE INDEX "onboarding_flows_user_id_idx" ON "onboarding_flows" USING btree ("user_id");