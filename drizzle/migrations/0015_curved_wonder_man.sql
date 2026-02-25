CREATE TYPE "public"."frequency_tag" AS ENUM('daily', 'weekly', 'monthly', 'rarely');--> statement-breakpoint
CREATE TYPE "public"."workflow_impact" AS ENUM('blocker', 'major', 'minor', 'nice_to_have');--> statement-breakpoint
CREATE TYPE "public"."workflow_stage" AS ENUM('onboarding', 'setup', 'daily_workflow', 'billing', 'reporting', 'integrations', 'other');--> statement-breakpoint
CREATE TABLE "idea_strategic_tags" (
	"idea_id" text NOT NULL,
	"tag_id" text NOT NULL,
	CONSTRAINT "idea_strategic_tags_idea_id_tag_id_pk" PRIMARY KEY("idea_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "strategic_tags" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#6B7280' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ideas" ADD COLUMN "problem_statement" text;--> statement-breakpoint
ALTER TABLE "ideas" ADD COLUMN "frequency_tag" "frequency_tag";--> statement-breakpoint
ALTER TABLE "ideas" ADD COLUMN "workflow_impact" "workflow_impact";--> statement-breakpoint
ALTER TABLE "ideas" ADD COLUMN "workflow_stage" "workflow_stage";--> statement-breakpoint
ALTER TABLE "votes" ADD COLUMN "is_inherited" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "feature_flags" jsonb DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "idea_strategic_tags" ADD CONSTRAINT "idea_strategic_tags_idea_id_ideas_id_fk" FOREIGN KEY ("idea_id") REFERENCES "public"."ideas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idea_strategic_tags" ADD CONSTRAINT "idea_strategic_tags_tag_id_strategic_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."strategic_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strategic_tags" ADD CONSTRAINT "strategic_tags_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idea_strategic_tags_idea_id_idx" ON "idea_strategic_tags" USING btree ("idea_id");--> statement-breakpoint
CREATE INDEX "idea_strategic_tags_tag_id_idx" ON "idea_strategic_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "strategic_tags_workspace_name_idx" ON "strategic_tags" USING btree ("workspace_id","name");--> statement-breakpoint
CREATE INDEX "strategic_tags_workspace_id_idx" ON "strategic_tags" USING btree ("workspace_id");