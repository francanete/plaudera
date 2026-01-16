-- Custom SQL migration file, put your code below! --
-- Note: Using static IDs (seed-frl-*) for reference data instead of CUID2
-- to ensure consistency across environments and support ON CONFLICT upserts

-- Seed tier_configs
INSERT INTO "tier_configs" ("plan", "display_name", "description", "sort_order", "is_active", "created_at", "updated_at")
VALUES
  ('FREE', 'Free', 'Basic access with limited usage', 0, true, NOW(), NOW()),
  ('STARTER', 'Starter', 'For individuals getting started', 1, true, NOW(), NOW()),
  ('GROWTH', 'Growth', 'For growing teams', 2, true, NOW(), NOW()),
  ('SCALE', 'Scale', 'For high-volume usage', 3, true, NOW(), NOW())
ON CONFLICT ("plan") DO UPDATE SET
  "display_name" = EXCLUDED."display_name",
  "description" = EXCLUDED."description",
  "sort_order" = EXCLUDED."sort_order",
  "updated_at" = NOW();

-- Seed feature_rate_limits (AI requests per day per plan)
INSERT INTO "feature_rate_limits" ("id", "plan", "feature", "requests_per_day", "is_active", "created_at", "updated_at")
VALUES
  ('seed-frl-free-ai', 'FREE', 'ai', 50, true, NOW(), NOW()),
  ('seed-frl-starter-ai', 'STARTER', 'ai', 250, true, NOW(), NOW()),
  ('seed-frl-growth-ai', 'GROWTH', 'ai', 1000, true, NOW(), NOW()),
  ('seed-frl-scale-ai', 'SCALE', 'ai', NULL, true, NOW(), NOW())
ON CONFLICT ("plan", "feature") DO UPDATE SET
  "requests_per_day" = EXCLUDED."requests_per_day",
  "updated_at" = NOW();
