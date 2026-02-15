CREATE TABLE "contributor_workspace_memberships" (
	"id" text PRIMARY KEY NOT NULL,
	"contributor_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "contributor_tokens_email_idx";--> statement-breakpoint
ALTER TABLE "contributor_tokens" ADD COLUMN "workspace_id" text;--> statement-breakpoint
DELETE FROM "contributor_tokens";--> statement-breakpoint
ALTER TABLE "contributor_tokens" ALTER COLUMN "workspace_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "contributor_workspace_memberships" ADD CONSTRAINT "contributor_workspace_memberships_contributor_id_contributors_id_fk" FOREIGN KEY ("contributor_id") REFERENCES "public"."contributors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contributor_workspace_memberships" ADD CONSTRAINT "contributor_workspace_memberships_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "contributor_workspace_memberships_unique_idx" ON "contributor_workspace_memberships" USING btree ("contributor_id","workspace_id");--> statement-breakpoint
CREATE INDEX "contributor_workspace_memberships_workspace_idx" ON "contributor_workspace_memberships" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "contributor_workspace_memberships_contributor_idx" ON "contributor_workspace_memberships" USING btree ("contributor_id");--> statement-breakpoint
ALTER TABLE "contributor_tokens" ADD CONSTRAINT "contributor_tokens_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contributor_tokens_workspace_email_idx" ON "contributor_tokens" USING btree ("workspace_id","email");
