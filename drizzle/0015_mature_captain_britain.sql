CREATE TYPE "public"."production_run_reason" AS ENUM('initial', 'shortfall', 'additional_order', 'recut', 'rework', 'retry', 'other');--> statement-breakpoint
CREATE TYPE "public"."thread_dyeing_send_status" AS ENUM('sent', 'partially_received', 'received');--> statement-breakpoint
CREATE TABLE "production_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sale_order_id" integer NOT NULL,
	"product_id" varchar(150),
	"machine_id" integer,
	"operator_id" integer,
	"quantity_produced" numeric(12, 2) NOT NULL,
	"run_reason" "production_run_reason" DEFAULT 'initial' NOT NULL,
	"notes" text,
	"produced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer,
	"idempotency_key" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sticker_materials" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_date" date NOT NULL,
	"sticker_size" varchar(100) NOT NULL,
	"material_code" varchar(100) NOT NULL,
	"roll_quantity" numeric(12, 2) NOT NULL,
	"weight_per_roll" numeric(12, 3) NOT NULL,
	"total_weight" numeric(14, 3) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "local_sheets" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"material_code" varchar(100) NOT NULL,
	"packet_quantity" numeric(12, 2) NOT NULL,
	"packet_weight" numeric(12, 3) NOT NULL,
	"total_weight" numeric(14, 3) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "label_sheets" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"material_code" varchar(100) NOT NULL,
	"sheet_quantity" numeric(12, 2) NOT NULL,
	"weight_per_sheet" numeric(12, 3) NOT NULL,
	"total_weight" numeric(14, 3) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "thread_service_providers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"contact" varchar(100),
	"address" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "thread_dyeing_allocations" (
	"id" serial PRIMARY KEY NOT NULL,
	"thread_dyeing_send_id" integer NOT NULL,
	"color_name" varchar(100) NOT NULL,
	"pantone" varchar(50),
	"color_code" varchar(50),
	"allocated_weight" numeric(14, 3) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "thread_dyeing_receives" (
	"id" serial PRIMARY KEY NOT NULL,
	"thread_dyeing_send_id" integer NOT NULL,
	"receiving_date" date NOT NULL,
	"receiver_tracking_number" varchar(100),
	"invoice_number" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "thread_dyeing_sends" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_provider_id" integer NOT NULL,
	"sending_date" date NOT NULL,
	"sender_tracking_number" varchar(100),
	"denier" "thread_denier" NOT NULL,
	"base_thread_color" "thread_base_color" NOT NULL,
	"total_weight_sent" numeric(14, 3) NOT NULL,
	"status" "thread_dyeing_send_status" DEFAULT 'sent' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "machines" ADD COLUMN IF NOT EXISTS "product_type" "operator_type" DEFAULT 'both' NOT NULL;--> statement-breakpoint
ALTER TABLE "woven_work_order_details" ADD COLUMN IF NOT EXISTS "size_labels" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "woven_thread_plan_items" ADD COLUMN IF NOT EXISTS "remaining_weight_kg" numeric(14, 3) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "woven_thread_plan_items" ADD COLUMN IF NOT EXISTS "actual_consumed_weight_kg" numeric(14, 3);--> statement-breakpoint
ALTER TABLE "production_runs" ADD CONSTRAINT "production_runs_sale_order_id_work_orders_id_fk" FOREIGN KEY ("sale_order_id") REFERENCES "public"."work_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_runs" ADD CONSTRAINT "production_runs_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_runs" ADD CONSTRAINT "production_runs_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_runs" ADD CONSTRAINT "production_runs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thread_dyeing_allocations" ADD CONSTRAINT "thread_dyeing_allocations_thread_dyeing_send_id_thread_dyeing_sends_id_fk" FOREIGN KEY ("thread_dyeing_send_id") REFERENCES "public"."thread_dyeing_sends"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thread_dyeing_receives" ADD CONSTRAINT "thread_dyeing_receives_thread_dyeing_send_id_thread_dyeing_sends_id_fk" FOREIGN KEY ("thread_dyeing_send_id") REFERENCES "public"."thread_dyeing_sends"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thread_dyeing_sends" ADD CONSTRAINT "thread_dyeing_sends_service_provider_id_thread_service_providers_id_fk" FOREIGN KEY ("service_provider_id") REFERENCES "public"."thread_service_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "production_runs_sale_order_idx" ON "production_runs" USING btree ("sale_order_id");--> statement-breakpoint
CREATE INDEX "production_runs_produced_at_idx" ON "production_runs" USING btree ("produced_at");--> statement-breakpoint
CREATE INDEX "production_runs_idempotency_idx" ON "production_runs" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "sticker_materials_material_code_idx" ON "sticker_materials" USING btree ("material_code");--> statement-breakpoint
CREATE INDEX "sticker_materials_date_idx" ON "sticker_materials" USING btree ("invoice_date");--> statement-breakpoint
CREATE INDEX "local_sheets_material_code_idx" ON "local_sheets" USING btree ("material_code");--> statement-breakpoint
CREATE INDEX "local_sheets_date_idx" ON "local_sheets" USING btree ("date");--> statement-breakpoint
CREATE INDEX "label_sheets_material_code_idx" ON "label_sheets" USING btree ("material_code");--> statement-breakpoint
CREATE INDEX "label_sheets_date_idx" ON "label_sheets" USING btree ("date");--> statement-breakpoint
CREATE INDEX "thread_service_providers_name_idx" ON "thread_service_providers" USING btree ("name");--> statement-breakpoint
CREATE INDEX "thread_dyeing_allocations_send_idx" ON "thread_dyeing_allocations" USING btree ("thread_dyeing_send_id");--> statement-breakpoint
CREATE INDEX "thread_dyeing_receives_send_idx" ON "thread_dyeing_receives" USING btree ("thread_dyeing_send_id");--> statement-breakpoint
CREATE INDEX "thread_dyeing_sends_provider_idx" ON "thread_dyeing_sends" USING btree ("service_provider_id");--> statement-breakpoint
CREATE INDEX "thread_dyeing_sends_date_idx" ON "thread_dyeing_sends" USING btree ("sending_date");