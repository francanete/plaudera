CREATE TABLE "board_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"roadmap_default_list_view" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "board_settings_workspace_id_unique" UNIQUE("workspace_id")
);
--> statement-breakpoint
ALTER TABLE "board_settings" ADD CONSTRAINT "board_settings_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "board_settings_workspace_idx" ON "board_settings" USING btree ("workspace_id");