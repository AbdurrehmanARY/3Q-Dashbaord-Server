CREATE TABLE "ink_purchases" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_date" date NOT NULL,
	"material_code" varchar(100) NOT NULL,
	"vendor" varchar(200) NOT NULL,
	"invoice_number" varchar(100),
	"quantity" numeric(12, 2) NOT NULL,
	"weight_per_qty" numeric(12, 3) NOT NULL,
	"total_weight" numeric(14, 3) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ink_consumptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"material_code" varchar(100) NOT NULL,
	"qty_assigned" numeric(12, 2) NOT NULL,
	"operator_id" integer,
	"operator_name" varchar(200),
	"weight" numeric(14, 3) NOT NULL,
	"note" text,
	"consumed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "work_orders" ADD COLUMN "priority" varchar(20) DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE "work_orders" ADD COLUMN "order_type" varchar(30) DEFAULT 'normal order' NOT NULL;--> statement-breakpoint
ALTER TABLE "ink_consumptions" ADD CONSTRAINT "ink_consumptions_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ink_purchases_material_code_idx" ON "ink_purchases" USING btree ("material_code");--> statement-breakpoint
CREATE INDEX "ink_consumptions_material_code_idx" ON "ink_consumptions" USING btree ("material_code");--> statement-breakpoint
CREATE INDEX "ink_consumptions_operator_idx" ON "ink_consumptions" USING btree ("operator_id");