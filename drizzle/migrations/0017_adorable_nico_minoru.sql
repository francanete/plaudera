CREATE TYPE "public"."poll_status" AS ENUM('draft', 'active', 'closed');--> statement-breakpoint
CREATE TYPE "public"."poll_template_type" AS ENUM('cant_do', 'most_annoying', 'custom');--> statement-breakpoint
CREATE TABLE "poll_responses" (
	"id" text PRIMARY KEY NOT NULL,
	"poll_id" text NOT NULL,
	"contributor_id" text NOT NULL,
	"response" text NOT NULL,
	"linked_idea_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "polls" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"question" text NOT NULL,
	"template_type" "poll_template_type",
	"status" "poll_status" DEFAULT 'draft' NOT NULL,
	"max_responses" integer,
	"closes_at" timestamp,
	"closed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "poll_responses" ADD CONSTRAINT "poll_responses_poll_id_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_responses" ADD CONSTRAINT "poll_responses_contributor_id_contributors_id_fk" FOREIGN KEY ("contributor_id") REFERENCES "public"."contributors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_responses" ADD CONSTRAINT "poll_responses_linked_idea_id_ideas_id_fk" FOREIGN KEY ("linked_idea_id") REFERENCES "public"."ideas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "polls" ADD CONSTRAINT "polls_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "poll_responses_poll_contributor_idx" ON "poll_responses" USING btree ("poll_id","contributor_id");--> statement-breakpoint
CREATE INDEX "poll_responses_poll_id_idx" ON "poll_responses" USING btree ("poll_id");--> statement-breakpoint
CREATE INDEX "polls_workspace_id_idx" ON "polls" USING btree ("workspace_id");