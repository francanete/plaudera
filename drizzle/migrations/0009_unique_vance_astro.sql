CREATE TYPE "public"."roadmap_status" AS ENUM('NONE', 'PLANNED', 'IN_PROGRESS', 'RELEASED');--> statement-breakpoint
CREATE TABLE "roadmap_status_changes" (
	"id" text PRIMARY KEY NOT NULL,
	"idea_id" text NOT NULL,
	"from_status" "roadmap_status" NOT NULL,
	"to_status" "roadmap_status" NOT NULL,
	"changed_by" text,
	"changed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ideas" ADD COLUMN "roadmap_status" "roadmap_status" DEFAULT 'NONE' NOT NULL;--> statement-breakpoint
ALTER TABLE "ideas" ADD COLUMN "internal_note" text;--> statement-breakpoint
ALTER TABLE "ideas" ADD COLUMN "public_update" text;--> statement-breakpoint
ALTER TABLE "roadmap_status_changes" ADD CONSTRAINT "roadmap_status_changes_idea_id_ideas_id_fk" FOREIGN KEY ("idea_id") REFERENCES "public"."ideas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmap_status_changes" ADD CONSTRAINT "roadmap_status_changes_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "roadmap_changes_idea_idx" ON "roadmap_status_changes" USING btree ("idea_id");--> statement-breakpoint
CREATE INDEX "ideas_workspace_roadmap_status_idx" ON "ideas" USING btree ("workspace_id","roadmap_status");