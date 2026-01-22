-- Step 1: Convert status column to text to allow value manipulation
ALTER TABLE "ideas" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint

-- Step 2: Set temporary default as text
ALTER TABLE "ideas" ALTER COLUMN "status" SET DEFAULT 'UNDER_REVIEW'::text;--> statement-breakpoint

-- Step 3: Migrate existing data - map old statuses to new ones
UPDATE "ideas" SET "status" = CASE
  WHEN "status" = 'PENDING' THEN 'UNDER_REVIEW'
  WHEN "status" = 'NEW' THEN 'PUBLISHED'
  WHEN "status" = 'PLANNED' THEN 'PUBLISHED'
  WHEN "status" = 'IN_PROGRESS' THEN 'PUBLISHED'
  WHEN "status" = 'DONE' THEN 'PUBLISHED'
  WHEN "status" = 'UNDER_REVIEW' THEN 'UNDER_REVIEW'
  WHEN "status" = 'DECLINED' THEN 'DECLINED'
  WHEN "status" = 'MERGED' THEN 'MERGED'
  ELSE 'UNDER_REVIEW'
END;--> statement-breakpoint

-- Step 4: Drop the old enum type
DROP TYPE "public"."idea_status";--> statement-breakpoint

-- Step 5: Create new simplified enum type
CREATE TYPE "public"."idea_status" AS ENUM('UNDER_REVIEW', 'PUBLISHED', 'DECLINED', 'MERGED');--> statement-breakpoint

-- Step 6: Set the proper default with new enum type
ALTER TABLE "ideas" ALTER COLUMN "status" SET DEFAULT 'UNDER_REVIEW'::"public"."idea_status";--> statement-breakpoint

-- Step 7: Convert column back to enum type (now all values are valid)
ALTER TABLE "ideas" ALTER COLUMN "status" SET DATA TYPE "public"."idea_status" USING "status"::"public"."idea_status";
