-- Fix orphaned data: ideas with MERGED status but no parent
UPDATE "ideas" SET "status" = 'DECLINED' WHERE "status" = 'MERGED' AND "merged_into_id" IS NULL;--> statement-breakpoint
-- Fix orphaned data: non-MERGED ideas with a stale mergedIntoId
UPDATE "ideas" SET "merged_into_id" = NULL WHERE "status" != 'MERGED' AND "merged_into_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_merged_into_id_ideas_id_fk" FOREIGN KEY ("merged_into_id") REFERENCES "public"."ideas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ideas" ADD CONSTRAINT "merged_status_requires_parent" CHECK (("ideas"."status" = 'MERGED' AND "ideas"."merged_into_id" IS NOT NULL) OR ("ideas"."status" != 'MERGED' AND "ideas"."merged_into_id" IS NULL));
