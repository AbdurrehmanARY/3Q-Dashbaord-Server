CREATE TYPE "public"."product_type" AS ENUM('printed', 'woven');--> statement-breakpoint
CREATE TYPE "public"."thread_base_color" AS ENUM('White', 'Black');--> statement-breakpoint
CREATE TYPE "public"."thread_denier" AS ENUM('45', '75', '100', '150');--> statement-breakpoint
CREATE TYPE "public"."thread_movement_type" AS ENUM('purchase_receipt', 'dye_consume', 'dye_produce', 'production_issue', 'production_release', 'adjustment');--> statement-breakpoint
CREATE TYPE "public"."thread_stock_type" AS ENUM('primary', 'secondary');--> statement-breakpoint
CREATE TABLE "woven_work_order_details" (
	"id" serial PRIMARY KEY NOT NULL,
	"work_order_id" integer NOT NULL,
	"design_code" varchar(100) NOT NULL,
	"pick" integer NOT NULL,
	"repeat" numeric(12, 2) NOT NULL,
	"density" integer NOT NULL,
	"extra" numeric(12, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "woven_work_order_details_work_order_id_unique" UNIQUE("work_order_id"),
	CONSTRAINT "woven_work_order_details_design_code_unique" UNIQUE("design_code")
);
--> statement-breakpoint
CREATE TABLE "woven_production_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"production_order_id" integer NOT NULL,
	"quantity" numeric(14, 2) NOT NULL,
	"total_thread_weight_kg" numeric(14, 3) DEFAULT '0' NOT NULL,
	"planning_completed_at" timestamp,
	"weaving_machine_id" integer,
	"weaving_operator_id" integer,
	"woven_qty" numeric(14, 2) DEFAULT '0' NOT NULL,
	"weaving_status" "production_status" DEFAULT 'pending' NOT NULL,
	"weaving_started_at" timestamp,
	"weaving_ended_at" timestamp,
	"cutting_operator_id" integer,
	"cut_qty" numeric(14, 2) DEFAULT '0' NOT NULL,
	"cutting_date" date,
	"packaging_operator_id" integer,
	"packaged_qty" numeric(14, 2) DEFAULT '0' NOT NULL,
	"packaged_weight_kg" numeric(14, 3) DEFAULT '0' NOT NULL,
	"packaging_date" date,
	"status" "production_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "woven_thread_plan_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"woven_production_line_id" integer NOT NULL,
	"sort_order" integer NOT NULL,
	"color_name" varchar(100) NOT NULL,
	"denier" "thread_denier" NOT NULL,
	"color_code" varchar(100) NOT NULL,
	"weight_kg" numeric(14, 3) NOT NULL,
	"thread_stock_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "woven_thread_plan_items_slot_idx" UNIQUE("woven_production_line_id","sort_order")
);
--> statement-breakpoint
CREATE TABLE "thread_stocks" (
	"id" serial PRIMARY KEY NOT NULL,
	"stock_type" "thread_stock_type" NOT NULL,
	"denier" "thread_denier" NOT NULL,
	"color_name" varchar(100) NOT NULL,
	"color_code" varchar(100),
	"balance_kg" numeric(14, 3) DEFAULT '0' NOT NULL,
	"received_kg" numeric(14, 3) DEFAULT '0' NOT NULL,
	"consumed_kg" numeric(14, 3) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "thread_stocks_identity_idx" UNIQUE("stock_type","denier","color_name","color_code")
);
--> statement-breakpoint
CREATE TABLE "thread_purchases" (
	"id" serial PRIMARY KEY NOT NULL,
	"received_date" date NOT NULL,
	"item_name" varchar(100) DEFAULT 'Thread' NOT NULL,
	"denier" "thread_denier" NOT NULL,
	"thread_color" "thread_base_color" NOT NULL,
	"vendor" varchar(255) NOT NULL,
	"invoice_number" varchar(100) NOT NULL,
	"total_ctns" integer NOT NULL,
	"weight_per_ctn_kg" numeric(12, 3) NOT NULL,
	"total_weight_kg" numeric(14, 3) NOT NULL,
	"notes" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "thread_dye_batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"batch_number" varchar(100) NOT NULL,
	"from_stock_id" integer NOT NULL,
	"to_stock_id" integer NOT NULL,
	"denier" "thread_denier" NOT NULL,
	"color_name" varchar(100) NOT NULL,
	"color_code" varchar(100) NOT NULL,
	"input_weight_kg" numeric(14, 3) NOT NULL,
	"output_weight_kg" numeric(14, 3) NOT NULL,
	"notes" varchar(500),
	"actor_user_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "thread_dye_batches_batch_number_unique" UNIQUE("batch_number")
);
--> statement-breakpoint
CREATE TABLE "thread_stock_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"thread_stock_id" integer NOT NULL,
	"movement_type" "thread_movement_type" NOT NULL,
	"weight_kg" numeric(14, 3) NOT NULL,
	"balance_after_kg" numeric(14, 3) NOT NULL,
	"reference_type" varchar(50),
	"reference_id" integer,
	"note" varchar(500),
	"actor_user_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "work_orders" ADD COLUMN "product_type" "product_type" DEFAULT 'printed' NOT NULL;--> statement-breakpoint
ALTER TABLE "work_orders" ADD COLUMN "lc_number" varchar(100);--> statement-breakpoint
ALTER TABLE "work_orders" ADD COLUMN "dispatched_qty" integer;--> statement-breakpoint
ALTER TABLE "woven_work_order_details" ADD CONSTRAINT "woven_work_order_details_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "woven_production_lines" ADD CONSTRAINT "woven_production_lines_production_order_id_production_orders_id_fk" FOREIGN KEY ("production_order_id") REFERENCES "public"."production_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "woven_production_lines" ADD CONSTRAINT "woven_production_lines_weaving_machine_id_machines_id_fk" FOREIGN KEY ("weaving_machine_id") REFERENCES "public"."machines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "woven_production_lines" ADD CONSTRAINT "woven_production_lines_weaving_operator_id_operators_id_fk" FOREIGN KEY ("weaving_operator_id") REFERENCES "public"."operators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "woven_production_lines" ADD CONSTRAINT "woven_production_lines_cutting_operator_id_operators_id_fk" FOREIGN KEY ("cutting_operator_id") REFERENCES "public"."operators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "woven_production_lines" ADD CONSTRAINT "woven_production_lines_packaging_operator_id_operators_id_fk" FOREIGN KEY ("packaging_operator_id") REFERENCES "public"."operators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "woven_thread_plan_items" ADD CONSTRAINT "woven_thread_plan_items_woven_production_line_id_woven_production_lines_id_fk" FOREIGN KEY ("woven_production_line_id") REFERENCES "public"."woven_production_lines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "woven_thread_plan_items" ADD CONSTRAINT "woven_thread_plan_items_thread_stock_id_thread_stocks_id_fk" FOREIGN KEY ("thread_stock_id") REFERENCES "public"."thread_stocks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thread_dye_batches" ADD CONSTRAINT "thread_dye_batches_from_stock_id_thread_stocks_id_fk" FOREIGN KEY ("from_stock_id") REFERENCES "public"."thread_stocks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thread_dye_batches" ADD CONSTRAINT "thread_dye_batches_to_stock_id_thread_stocks_id_fk" FOREIGN KEY ("to_stock_id") REFERENCES "public"."thread_stocks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thread_dye_batches" ADD CONSTRAINT "thread_dye_batches_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thread_stock_movements" ADD CONSTRAINT "thread_stock_movements_thread_stock_id_thread_stocks_id_fk" FOREIGN KEY ("thread_stock_id") REFERENCES "public"."thread_stocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thread_stock_movements" ADD CONSTRAINT "thread_stock_movements_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "woven_wo_details_work_order_idx" ON "woven_work_order_details" USING btree ("work_order_id");--> statement-breakpoint
CREATE INDEX "woven_wo_details_design_code_idx" ON "woven_work_order_details" USING btree ("design_code");--> statement-breakpoint
CREATE INDEX "woven_production_lines_order_idx" ON "woven_production_lines" USING btree ("production_order_id");--> statement-breakpoint
CREATE INDEX "woven_production_lines_status_idx" ON "woven_production_lines" USING btree ("status");--> statement-breakpoint
CREATE INDEX "woven_thread_plan_items_line_idx" ON "woven_thread_plan_items" USING btree ("woven_production_line_id");--> statement-breakpoint
CREATE INDEX "thread_stocks_type_idx" ON "thread_stocks" USING btree ("stock_type");--> statement-breakpoint
CREATE INDEX "thread_stocks_denier_idx" ON "thread_stocks" USING btree ("denier");--> statement-breakpoint
CREATE INDEX "thread_purchases_vendor_idx" ON "thread_purchases" USING btree ("vendor");--> statement-breakpoint
CREATE INDEX "thread_purchases_invoice_idx" ON "thread_purchases" USING btree ("invoice_number");--> statement-breakpoint
CREATE INDEX "thread_purchases_date_idx" ON "thread_purchases" USING btree ("received_date");--> statement-breakpoint
CREATE INDEX "thread_dye_batches_from_idx" ON "thread_dye_batches" USING btree ("from_stock_id");--> statement-breakpoint
CREATE INDEX "thread_dye_batches_to_idx" ON "thread_dye_batches" USING btree ("to_stock_id");--> statement-breakpoint
CREATE INDEX "thread_stock_movements_stock_idx" ON "thread_stock_movements" USING btree ("thread_stock_id");--> statement-breakpoint
CREATE INDEX "thread_stock_movements_type_idx" ON "thread_stock_movements" USING btree ("movement_type");--> statement-breakpoint
CREATE INDEX "thread_stock_movements_created_idx" ON "thread_stock_movements" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "work_orders_product_type_idx" ON "work_orders" USING btree ("product_type");--> statement-breakpoint
CREATE INDEX "work_orders_dc_number_idx" ON "work_orders" USING btree ("dc_number");--> statement-breakpoint
CREATE INDEX "work_orders_lc_number_idx" ON "work_orders" USING btree ("lc_number");