CREATE TABLE "emails_sent" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"email_key" text NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "marketing_unsubscribed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "emails_sent" ADD CONSTRAINT "emails_sent_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "emails_sent_user_email_idx" ON "emails_sent" USING btree ("user_id","email_key");--> statement-breakpoint
CREATE INDEX "emails_sent_user_id_idx" ON "emails_sent" USING btree ("user_id");