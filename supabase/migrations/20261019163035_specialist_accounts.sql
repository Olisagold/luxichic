CREATE TABLE "specialist_accounts" (
	"specialist_id" uuid PRIMARY KEY NOT NULL,
	"admin_id" uuid,
	"telegram_chat_id" text,
	"telegram_name" text,
	"telegram_connected_at" timestamp with time zone,
	"telegram_token" text,
	"telegram_token_created_at" timestamp with time zone,
	CONSTRAINT "specialist_accounts_admin_id_unique" UNIQUE("admin_id"),
	CONSTRAINT "specialist_accounts_telegram_token_unique" UNIQUE("telegram_token")
);
--> statement-breakpoint
ALTER TABLE "specialist_accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "notification_reads" (
	"notification_id" uuid NOT NULL,
	"admin_id" uuid NOT NULL,
	"read_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_reads_notification_id_admin_id_pk" PRIMARY KEY("notification_id","admin_id")
);
--> statement-breakpoint
ALTER TABLE "notification_reads" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "specialist_id" uuid;--> statement-breakpoint
ALTER TABLE "specialist_accounts" ADD CONSTRAINT "specialist_accounts_specialist_id_specialists_id_fk" FOREIGN KEY ("specialist_id") REFERENCES "public"."specialists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "specialist_accounts" ADD CONSTRAINT "specialist_accounts_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_reads" ADD CONSTRAINT "notification_reads_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_reads" ADD CONSTRAINT "notification_reads_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notification_reads_admin_idx" ON "notification_reads" USING btree ("admin_id");--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_specialist_id_specialists_id_fk" FOREIGN KEY ("specialist_id") REFERENCES "public"."specialists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

-- Built-in "Specialist" role (also in apps/web/data/adminSeed.ts rolePresets): a stylist or technician who sees,
-- confirms and reschedules their own bookings once their admin login is linked to their specialist profile.
INSERT INTO "roles" ("name", "description", "is_system")
VALUES ('Specialist', 'Sees, confirms and reschedules their own bookings.', true)
ON CONFLICT ("name") DO UPDATE SET "is_system" = true;--> statement-breakpoint
INSERT INTO "role_permissions" ("role_id", "permission_key")
SELECT r.id, p.key
  FROM "roles" r
  JOIN "permissions" p ON p.key IN ('appointments.view', 'appointments.confirm', 'appointments.reschedule')
 WHERE r.name = 'Specialist'
ON CONFLICT DO NOTHING;
--> statement-breakpoint

-- Reading becomes per admin: notifications already marked read stay read for everyone who could see them then.
INSERT INTO "notification_reads" ("notification_id", "admin_id", "read_at")
SELECT n.id, a.id, n.read_at
  FROM "notifications" n
 CROSS JOIN "admins" a
 WHERE n.read_at IS NOT NULL
ON CONFLICT DO NOTHING;
