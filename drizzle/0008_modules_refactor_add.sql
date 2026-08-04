CREATE TYPE "public"."work_order_status" AS ENUM('initiate_production', 'complete');--> statement-breakpoint
ALTER TABLE "production_orders" ALTER COLUMN "status" SET DEFAULT 'planned';--> statement-breakpoint
ALTER TABLE "production_order_lines" ALTER COLUMN "roll_length" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "production_order_lines" ALTER COLUMN "required_rolls" SET DATA TYPE numeric(12, 4);--> statement-breakpoint
ALTER TABLE "work_orders" ADD COLUMN "status" "work_order_status" DEFAULT 'initiate_production' NOT NULL;--> statement-breakpoint
ALTER TABLE "work_orders" ADD COLUMN "dc_number" varchar(100);--> statement-breakpoint
ALTER TABLE "work_orders" ADD COLUMN "dispatched_date" date;--> statement-breakpoint
ALTER TABLE "production_order_lines" ADD COLUMN "total_weight" numeric(14, 4);--> statement-breakpoint
ALTER TABLE "inventory_rolls" ADD COLUMN "roll_per_kg" numeric(12, 4) DEFAULT '0' NOT NULL;--> statement-breakpoint
CREATE INDEX "work_orders_status_idx" ON "work_orders" USING btree ("status");--> statement-breakpoint
ALTER TABLE "purchase_records" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "public"."production_orders" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "public"."production_orders" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
UPDATE "public"."production_orders" SET "status" = 'production' WHERE "status" = 'in_production';--> statement-breakpoint
UPDATE "public"."production_orders" SET "status" = 'complete' WHERE "status" = 'completed';--> statement-breakpoint
UPDATE "public"."production_orders" SET "status" = 'planned' WHERE "status" IN ('pending_planning', 'cancelled');--> statement-breakpoint
DROP TYPE "public"."production_order_status";--> statement-breakpoint
CREATE TYPE "public"."production_order_status" AS ENUM('planned', 'production', 'complete');--> statement-breakpoint
ALTER TABLE "public"."production_orders" ALTER COLUMN "status" SET DATA TYPE "public"."production_order_status" USING "status"::"public"."production_order_status";--> statement-breakpoint
ALTER TABLE "public"."production_orders" ALTER COLUMN "status" SET DEFAULT 'planned';