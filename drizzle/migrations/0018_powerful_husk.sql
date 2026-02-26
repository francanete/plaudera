CREATE TYPE "public"."dedupe_event_type" AS ENUM('shown', 'accepted', 'dismissed', 'dashboard_merged', 'dashboard_dismissed');--> statement-breakpoint
CREATE TABLE "dedupe_events" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"idea_id" text,
	"related_idea_id" text,
	"event_type" "dedupe_event_type" NOT NULL,
	"similarity" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "idea_embeddings" ADD COLUMN "problem_embedding" vector(768);--> statement-breakpoint
ALTER TABLE "idea_embeddings" ALTER COLUMN "model_version" SET DEFAULT 'gemini-embedding-001';--> statement-breakpoint
ALTER TABLE "dedupe_events" ADD CONSTRAINT "dedupe_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dedupe_events" ADD CONSTRAINT "dedupe_events_idea_id_ideas_id_fk" FOREIGN KEY ("idea_id") REFERENCES "public"."ideas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dedupe_events" ADD CONSTRAINT "dedupe_events_related_idea_id_ideas_id_fk" FOREIGN KEY ("related_idea_id") REFERENCES "public"."ideas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dedupe_events_workspace_event_idx" ON "dedupe_events" USING btree ("workspace_id","event_type");--> statement-breakpoint
CREATE INDEX "dedupe_events_idea_id_idx" ON "dedupe_events" USING btree ("idea_id");--> statement-breakpoint
CREATE INDEX "idea_embeddings_problem_vector_idx" ON "idea_embeddings" USING hnsw ("problem_embedding" vector_cosine_ops);
