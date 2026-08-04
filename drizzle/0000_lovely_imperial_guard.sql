CREATE TYPE "public"."production_status" AS ENUM('pending', 'active', 'paused', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"location" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "companies_name_unique" UNIQUE("name"),
	CONSTRAINT "companies_name_idx" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "brands" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "brands_company_name_idx" UNIQUE("company_id","name")
);
--> statement-breakpoint
CREATE TABLE "materials" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(100) NOT NULL,
	"type" varchar(100) NOT NULL,
	"description" text,
	"weight_per_roll" numeric(10, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "materials_code_unique" UNIQUE("code"),
	CONSTRAINT "materials_code_idx" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "machines" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"machine_code" varchar(100) NOT NULL,
	"machine_operator_id" integer,
	"machine_type" varchar(50) DEFAULT 'Other' NOT NULL,
	"machine_name" varchar(255) NOT NULL,
	"status" varchar(50) DEFAULT 'Active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "machines_name_unique" UNIQUE("name"),
	CONSTRAINT "machines_machine_code_unique" UNIQUE("machine_code")
);
--> statement-breakpoint
CREATE TABLE "operators" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"designation" varchar(50) DEFAULT 'Printing' NOT NULL,
	"status" varchar(50) DEFAULT 'Active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "operators_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "work_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"so_number" varchar(100) NOT NULL,
	"po_number" varchar(100),
	"order_date" date NOT NULL,
	"due_date" date,
	"total_qty" integer NOT NULL,
	"brand_id" integer,
	"comment" text,
	"is_submitted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "work_orders_so_number_unique" UNIQUE("so_number"),
	CONSTRAINT "work_orders_so_number_idx" UNIQUE("so_number")
);
--> statement-breakpoint
CREATE TABLE "production_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"work_order_id" integer NOT NULL,
	"date" date,
	"material_code" varchar(100),
	"material_id" integer,
	"material_type" varchar(100),
	"item_name" varchar(255),
	"label_type" varchar(255) NOT NULL,
	"quantity" numeric(12, 2) NOT NULL,
	"label_size" numeric(10, 2),
	"required_roll" numeric(10, 2),
	"extra_roll" numeric(10, 2),
	"roll_length" numeric(10, 2),
	"assigned_roll" numeric(10, 2) DEFAULT '0' NOT NULL,
	"printing" numeric(12, 2) DEFAULT '0' NOT NULL,
	"printed" numeric(12, 2) DEFAULT '0' NOT NULL,
	"cutting" numeric(12, 2) DEFAULT '0' NOT NULL,
	"cutted" numeric(12, 2) DEFAULT '0' NOT NULL,
	"packaging" numeric(12, 2) DEFAULT '0' NOT NULL,
	"packaged" numeric(12, 2) DEFAULT '0' NOT NULL,
	"status" "production_status" DEFAULT 'pending' NOT NULL,
	"cutting_machine_id" integer,
	"cutting_operator_id" integer,
	"printing_machine_id" integer,
	"printing_operator_id" integer,
	"packaging_operator_id" integer,
	"remarks" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_date" date NOT NULL,
	"item_code" varchar(100) NOT NULL,
	"material_type" varchar(100),
	"item_name" varchar(255),
	"invoice_number" varchar(255),
	"vendor" varchar(255) NOT NULL,
	"carton_qty" integer NOT NULL,
	"rolls_per_carton" integer NOT NULL,
	"total_roll" numeric(12, 2),
	"roll_length" numeric(10, 2) NOT NULL,
	"net_weight" numeric(10, 2) NOT NULL,
	"efs" varchar(100),
	"invoice_weight" numeric(10, 2),
	"local_weight" numeric(10, 2),
	"gd_number" varchar(100),
	"status" varchar(50) DEFAULT 'Pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_rolls" (
	"id" serial PRIMARY KEY NOT NULL,
	"material_code" varchar(100) NOT NULL,
	"opening_stock" numeric(12, 2) DEFAULT '0' NOT NULL,
	"received_rolls" numeric(12, 2) DEFAULT '0' NOT NULL,
	"issued_rolls" numeric(12, 2) DEFAULT '0' NOT NULL,
	"balance_rolls" numeric(12, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_rolls_material_code_unique" UNIQUE("material_code"),
	CONSTRAINT "inventory_rolls_material_code_idx" UNIQUE("material_code")
);
--> statement-breakpoint
CREATE TABLE "production_info" (
	"id" serial PRIMARY KEY NOT NULL,
	"sale_order_id" integer,
	"job_number" text,
	"production_progress_id" integer,
	"date" date NOT NULL,
	"company_id" integer NOT NULL,
	"brand_id" integer NOT NULL,
	"label_item" text[] NOT NULL,
	"quantity" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roll_allocations" (
	"id" serial PRIMARY KEY NOT NULL,
	"production_progress_id" integer NOT NULL,
	"material_code" varchar(100) NOT NULL,
	"allocated_roll" numeric(10, 2) NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "brands" ADD CONSTRAINT "brands_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machines" ADD CONSTRAINT "machines_machine_operator_id_operators_id_fk" FOREIGN KEY ("machine_operator_id") REFERENCES "public"."operators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_progress" ADD CONSTRAINT "production_progress_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_progress" ADD CONSTRAINT "production_progress_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_progress" ADD CONSTRAINT "production_progress_cutting_machine_id_machines_id_fk" FOREIGN KEY ("cutting_machine_id") REFERENCES "public"."machines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_progress" ADD CONSTRAINT "production_progress_cutting_operator_id_operators_id_fk" FOREIGN KEY ("cutting_operator_id") REFERENCES "public"."operators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_progress" ADD CONSTRAINT "production_progress_printing_machine_id_machines_id_fk" FOREIGN KEY ("printing_machine_id") REFERENCES "public"."machines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_progress" ADD CONSTRAINT "production_progress_printing_operator_id_operators_id_fk" FOREIGN KEY ("printing_operator_id") REFERENCES "public"."operators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_progress" ADD CONSTRAINT "production_progress_packaging_operator_id_operators_id_fk" FOREIGN KEY ("packaging_operator_id") REFERENCES "public"."operators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_records" ADD CONSTRAINT "purchase_records_item_code_materials_code_fk" FOREIGN KEY ("item_code") REFERENCES "public"."materials"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_rolls" ADD CONSTRAINT "inventory_rolls_material_code_materials_code_fk" FOREIGN KEY ("material_code") REFERENCES "public"."materials"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_info" ADD CONSTRAINT "production_info_production_progress_id_production_progress_id_fk" FOREIGN KEY ("production_progress_id") REFERENCES "public"."production_progress"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_info" ADD CONSTRAINT "production_info_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_info" ADD CONSTRAINT "production_info_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roll_allocations" ADD CONSTRAINT "roll_allocations_production_progress_id_production_progress_id_fk" FOREIGN KEY ("production_progress_id") REFERENCES "public"."production_progress"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roll_allocations" ADD CONSTRAINT "roll_allocations_material_code_materials_code_fk" FOREIGN KEY ("material_code") REFERENCES "public"."materials"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "brands_company_idx" ON "brands" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "work_orders_brand_idx" ON "work_orders" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "production_progress_work_order_idx" ON "production_progress" USING btree ("work_order_id");--> statement-breakpoint
CREATE INDEX "production_progress_material_code_idx" ON "production_progress" USING btree ("material_code");--> statement-breakpoint
CREATE INDEX "production_progress_material_idx" ON "production_progress" USING btree ("material_id");--> statement-breakpoint
CREATE INDEX "production_progress_date_idx" ON "production_progress" USING btree ("date");--> statement-breakpoint
CREATE INDEX "production_progress_cutting_machine_idx" ON "production_progress" USING btree ("cutting_machine_id");--> statement-breakpoint
CREATE INDEX "production_progress_cutting_operator_idx" ON "production_progress" USING btree ("cutting_operator_id");--> statement-breakpoint
CREATE INDEX "production_progress_printing_machine_idx" ON "production_progress" USING btree ("printing_machine_id");--> statement-breakpoint
CREATE INDEX "production_progress_printing_operator_idx" ON "production_progress" USING btree ("printing_operator_id");--> statement-breakpoint
CREATE INDEX "production_progress_packaging_operator_idx" ON "production_progress" USING btree ("packaging_operator_id");--> statement-breakpoint
CREATE INDEX "purchase_records_item_code_idx" ON "purchase_records" USING btree ("item_code");--> statement-breakpoint
CREATE INDEX "production_info_production_progress_idx" ON "production_info" USING btree ("production_progress_id");--> statement-breakpoint
CREATE INDEX "production_info_company_idx" ON "production_info" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "production_info_brand_idx" ON "production_info" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "production_info_date_idx" ON "production_info" USING btree ("date");--> statement-breakpoint
CREATE INDEX "roll_allocations_production_progress_idx" ON "roll_allocations" USING btree ("production_progress_id");--> statement-breakpoint
CREATE INDEX "roll_allocations_material_code_idx" ON "roll_allocations" USING btree ("material_code");