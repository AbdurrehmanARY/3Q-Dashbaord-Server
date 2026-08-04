CREATE TYPE "public"."roll_movement_type" AS ENUM('opening_balance', 'purchase_receipt', 'purchase_reversal', 'production_issue', 'production_release', 'adjustment');--> statement-breakpoint
CREATE TYPE "public"."operator_type" AS ENUM('printed', 'woven', 'both');--> statement-breakpoint
CREATE TABLE "inventory_roll_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"inventory_roll_id" integer NOT NULL,
	"material_code" varchar(100) NOT NULL,
	"movement_type" "roll_movement_type" NOT NULL,
	"rolls" numeric(12, 2) NOT NULL,
	"balance_after" numeric(12, 2) NOT NULL,
	"reference_type" varchar(50),
	"reference_id" integer,
	"note" varchar(500),
	"actor_user_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "operators" ADD COLUMN "operator_type" "operator_type" DEFAULT 'both' NOT NULL;--> statement-breakpoint
ALTER TABLE "operators" ADD COLUMN "avatar_url" text;--> statement-breakpoint
ALTER TABLE "work_orders" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "production_order_lines" ADD COLUMN "printing_completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "production_order_lines" ADD COLUMN "cutting_completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "production_order_lines" ADD COLUMN "packaging_completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "inventory_roll_movements" ADD CONSTRAINT "inventory_roll_movements_inventory_roll_id_inventory_rolls_id_fk" FOREIGN KEY ("inventory_roll_id") REFERENCES "public"."inventory_rolls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_roll_movements" ADD CONSTRAINT "inventory_roll_movements_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inventory_roll_movements_roll_idx" ON "inventory_roll_movements" USING btree ("inventory_roll_id");--> statement-breakpoint
CREATE INDEX "inventory_roll_movements_material_idx" ON "inventory_roll_movements" USING btree ("material_code");--> statement-breakpoint
CREATE INDEX "inventory_roll_movements_created_idx" ON "inventory_roll_movements" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "operators_operator_type_idx" ON "operators" USING btree ("operator_type");--> statement-breakpoint
CREATE INDEX "operators_designation_idx" ON "operators" USING btree ("designation");