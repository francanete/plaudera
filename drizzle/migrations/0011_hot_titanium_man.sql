DROP INDEX "workspaces_owner_id_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "workspaces_owner_id_idx" ON "workspaces" USING btree ("owner_id");