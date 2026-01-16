ALTER TABLE "subscriptions" ADD COLUMN "polar_product_id" text;--> statement-breakpoint
CREATE INDEX "subscriptions_polar_customer_id_idx" ON "subscriptions" USING btree ("polar_customer_id");