ALTER TABLE "appointments" ADD COLUMN "duration_minutes" integer DEFAULT 60 NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_duration_check" CHECK ("appointments"."duration_minutes" between 5 and 600);--> statement-breakpoint

-- Existing bookings take their service's length.
UPDATE "appointments" a SET "duration_minutes" = s."duration_minutes"
  FROM "services" s
 WHERE s."id" = a."service_id";--> statement-breakpoint

-- No double-booking (lib/salon/booking.ts). A specialist can't have two active appointments whose times
-- overlap, even when two customers book the same slot at the same moment. Cancelled, rejected and completed
-- appointments don't hold their slot. btree_gist lets the GiST index compare the specialist id with "=".
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;--> statement-breakpoint

ALTER TABLE "appointments" ADD CONSTRAINT "appointments_no_double_booking" EXCLUDE USING gist (
  "specialist_id" WITH =,
  tsrange(
    "date" + "time",
    "date" + "time" + make_interval(mins => "duration_minutes")
  ) WITH &&
) WHERE ("status" IN ('pending', 'confirmed', 'rescheduled'));
