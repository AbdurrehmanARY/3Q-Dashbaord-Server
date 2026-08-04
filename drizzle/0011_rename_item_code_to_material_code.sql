-- Naming standardization: purchase_records.item_code is the material's code, so it is
-- named material_code like every other reference to it. RENAME preserves the data and the
-- FK; an add/drop pair would not.
ALTER TABLE "purchase_records" RENAME COLUMN "item_code" TO "material_code";
--> statement-breakpoint
ALTER INDEX "purchase_records_item_code_idx" RENAME TO "purchase_records_material_code_idx";
--> statement-breakpoint
ALTER TABLE "purchase_records" RENAME CONSTRAINT "purchase_records_item_code_materials_code_fk" TO "purchase_records_material_code_materials_code_fk";
