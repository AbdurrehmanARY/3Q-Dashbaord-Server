ALTER TABLE "production_progress" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "production_info" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "roll_allocations" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "production_progress" CASCADE;--> statement-breakpoint
DROP TABLE "production_info" CASCADE;--> statement-breakpoint
DROP TABLE "roll_allocations" CASCADE;--> statement-breakpoint
ALTER TABLE "production_order_lines" ADD COLUMN "material_code" varchar(100);--> statement-breakpoint
ALTER TABLE "production_order_lines" ADD COLUMN "issued_rolls" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "production_order_lines" ADD CONSTRAINT "production_order_lines_material_code_materials_code_fk" FOREIGN KEY ("material_code") REFERENCES "public"."materials"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "production_order_lines_material_code_idx" ON "production_order_lines" USING btree ("material_code");