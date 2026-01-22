-- Enable pgvector extension for embedding similarity search
CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TYPE "public"."duplicate_suggestion_status" AS ENUM('PENDING', 'MERGED', 'DISMISSED');--> statement-breakpoint
ALTER TYPE "public"."idea_status" ADD VALUE 'MERGED';--> statement-breakpoint
CREATE TABLE "duplicate_suggestions" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"source_idea_id" text NOT NULL,
	"duplicate_idea_id" text NOT NULL,
	"similarity" integer NOT NULL,
	"status" "duplicate_suggestion_status" DEFAULT 'PENDING' NOT NULL,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idea_embeddings" (
	"id" text PRIMARY KEY NOT NULL,
	"idea_id" text NOT NULL,
	"embedding" vector(768) NOT NULL,
	"model_version" text DEFAULT 'text-embedding-004' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "idea_embeddings_idea_id_unique" UNIQUE("idea_id")
);
--> statement-breakpoint
ALTER TABLE "ideas" ADD COLUMN "merged_into_id" text;--> statement-breakpoint
ALTER TABLE "duplicate_suggestions" ADD CONSTRAINT "duplicate_suggestions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duplicate_suggestions" ADD CONSTRAINT "duplicate_suggestions_source_idea_id_ideas_id_fk" FOREIGN KEY ("source_idea_id") REFERENCES "public"."ideas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duplicate_suggestions" ADD CONSTRAINT "duplicate_suggestions_duplicate_idea_id_ideas_id_fk" FOREIGN KEY ("duplicate_idea_id") REFERENCES "public"."ideas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idea_embeddings" ADD CONSTRAINT "idea_embeddings_idea_id_ideas_id_fk" FOREIGN KEY ("idea_id") REFERENCES "public"."ideas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "duplicate_suggestions_workspace_status_idx" ON "duplicate_suggestions" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "duplicate_suggestions_pair_idx" ON "duplicate_suggestions" USING btree ("source_idea_id","duplicate_idea_id");--> statement-breakpoint
CREATE INDEX "idea_embeddings_idea_id_idx" ON "idea_embeddings" USING btree ("idea_id");--> statement-breakpoint
CREATE INDEX "idea_embeddings_vector_idx" ON "idea_embeddings" USING hnsw ("embedding" vector_cosine_ops);