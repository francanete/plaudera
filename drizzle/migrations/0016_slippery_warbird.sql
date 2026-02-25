CREATE TYPE "public"."decision_type" AS ENUM('prioritized', 'deprioritized', 'declined', 'status_progression', 'status_reversal');--> statement-breakpoint
CREATE TABLE "idea_status_changes" (
	"id" text PRIMARY KEY NOT NULL,
	"idea_id" text NOT NULL,
	"user_id" text,
	"from_status" "idea_status" NOT NULL,
	"to_status" "idea_status" NOT NULL,
	"rationale" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"decision_type" "decision_type",
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ideas" ADD COLUMN "wont_build_reason" text;--> statement-breakpoint
ALTER TABLE "roadmap_status_changes" ADD COLUMN "rationale" text;--> statement-breakpoint
ALTER TABLE "roadmap_status_changes" ADD COLUMN "is_public" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "roadmap_status_changes" ADD COLUMN "decision_type" "decision_type";--> statement-breakpoint
ALTER TABLE "idea_status_changes" ADD CONSTRAINT "idea_status_changes_idea_id_ideas_id_fk" FOREIGN KEY ("idea_id") REFERENCES "public"."ideas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idea_status_changes" ADD CONSTRAINT "idea_status_changes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idea_status_changes_idea_idx" ON "idea_status_changes" USING btree ("idea_id");