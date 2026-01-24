CREATE TABLE "slug_change_history" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"old_slug" text NOT NULL,
	"new_slug" text NOT NULL,
	"changed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "slug_change_history" ADD CONSTRAINT "slug_change_history_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "slug_change_history_workspace_id_idx" ON "slug_change_history" USING btree ("workspace_id");