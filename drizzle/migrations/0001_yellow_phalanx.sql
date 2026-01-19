CREATE TYPE "public"."widget_position" AS ENUM('bottom-right', 'bottom-left');--> statement-breakpoint
CREATE TABLE "widget_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"position" "widget_position" DEFAULT 'bottom-right' NOT NULL,
	"allowed_origins" text[] DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "widget_settings_workspace_id_unique" UNIQUE("workspace_id")
);
--> statement-breakpoint
ALTER TABLE "widget_settings" ADD CONSTRAINT "widget_settings_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "widget_settings_workspace_id_idx" ON "widget_settings" USING btree ("workspace_id");