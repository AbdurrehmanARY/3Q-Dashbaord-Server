-- 0026_label_types.sql
--
-- Creates a master data table for label types, allowing the system to manage
-- which label types are available for production planning.
--
-- Label types are organized by workflow category:
--   - woven: follows the Woven workflow (Planning -> Weaving -> Cutting -> Packaging -> Dispatch)
--   - printed: follows the Printed workflow (Planning -> Printing -> Cutting -> Packaging -> Dispatch)
--
-- The category determines which production stages the label type can flow through.
-- Users select label types during production order planning based on the product type.
--

--> statement-breakpoint
CREATE TABLE "label_types" (
  "id" serial PRIMARY KEY,
  "name" varchar(255) NOT NULL,
  "category" varchar(20) NOT NULL,
  CONSTRAINT "label_types_valid_category" CHECK ("category" IN ('woven', 'printed')),
  "is_active" boolean DEFAULT TRUE NOT NULL,
  "created_at" timestamp DEFAULT NOW() NOT NULL,
  "updated_at" timestamp DEFAULT NOW() NOT NULL,
  CONSTRAINT "label_types_name_category_uq" UNIQUE ("name", "category")
);--> statement-breakpoint

/* Link production order lines to label types for better planning UX */
ALTER TABLE "production_order_lines" ADD COLUMN "label_type_id" integer;--> statement-breakpoint
ALTER TABLE "production_order_lines" ADD CONSTRAINT "production_order_lines_label_type_id_label_types_id_fk"
  FOREIGN KEY ("label_type_id") REFERENCES "public"."label_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "production_order_lines_label_type_idx"
  ON "production_order_lines" USING btree ("label_type_id");--> statement-breakpoint

/* Seed initial label types - match existing hardcoded usage patterns */

INSERT INTO "label_types" ("name", "category") VALUES
-- Woven workflow label types
('Size Label', 'woven'),
('Care Label', 'woven'),
('Main Label', 'woven'),
('Loop Label', 'woven'),
-- Printed workflow label types  
('Address Label', 'printed'),
('Warning Label', 'printed'),
('Composition Label', 'printed'),
('Import Label', 'printed'),
('Poly Import Label', 'printed');