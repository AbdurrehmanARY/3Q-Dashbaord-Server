-- SNAPSHOT ALIGNMENT ONLY — already applied, do not re-run against an existing database.
--
-- The batch tables were created outside the migration folder, so the drizzle-kit snapshot
-- had drifted from schema.ts. This regenerates the full CREATE so `drizzle-kit generate`
-- has an accurate baseline; every object below already exists (see 0018_batch_material_flow),
-- and the migration is recorded as applied in drizzle.__drizzle_migrations.
--
-- On a FRESH database this file is the correct DDL and runs as normal.

CREATE TYPE "public"."production_batch_stage" AS ENUM('printing', 'cutting', 'packaging');--> statement-breakpoint
CREATE TYPE "public"."production_batch_status" AS ENUM('PLANNED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."production_stage_tx_type" AS ENUM('print_credit', 'cut_consume_print', 'cut_credit', 'package_consume_cut', 'package_credit');--> statement-breakpoint
CREATE TABLE "production_batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"production_order_line_id" integer NOT NULL,
	"stage" "production_batch_stage" NOT NULL,
	"batch_number" integer NOT NULL,
	"batch_code" varchar(32) NOT NULL,
	"machine_id" integer,
	"operator_id" integer,
	"assigned_rolls" numeric(12, 2) DEFAULT '0' NOT NULL,
	"produced_rolls" numeric(12, 2) DEFAULT '0' NOT NULL,
	"wasted_rolls" numeric(12, 2) DEFAULT '0' NOT NULL,
	"consumed_rolls" numeric(12, 2) DEFAULT '0' NOT NULL,
	"available_rolls" numeric(12, 2) GENERATED ALWAYS AS (produced_rolls - consumed_rolls) STORED,
	"packaged_qty" numeric(12, 2) DEFAULT '0' NOT NULL,
	"status" "production_batch_status" DEFAULT 'PLANNED' NOT NULL,
	"notes" text,
	"created_by_user_id" integer,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "production_batches_line_stage_no_uq" UNIQUE("production_order_line_id","stage","batch_number"),
	CONSTRAINT "production_batches_id_line_stage_uq" UNIQUE("id","production_order_line_id","stage"),
	CONSTRAINT "production_batches_non_negative" CHECK (assigned_rolls >= 0 AND produced_rolls >= 0 AND wasted_rolls >= 0 AND consumed_rolls >= 0),
	CONSTRAINT "production_batches_output_within_input" CHECK (produced_rolls + wasted_rolls <= assigned_rolls),
	CONSTRAINT "production_batches_consumed_within_produced" CHECK (consumed_rolls <= produced_rolls),
	CONSTRAINT "production_batches_waste_printing_only" CHECK (stage = 'printing' OR wasted_rolls = 0),
	CONSTRAINT "production_batches_packaging_no_machine" CHECK (stage <> 'packaging' OR machine_id IS NULL)
);
--> statement-breakpoint
CREATE TABLE "production_stage_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"production_order_line_id" integer NOT NULL,
	"batch_id" integer,
	"stage" varchar(50) NOT NULL,
	"transaction_type" "production_stage_tx_type" NOT NULL,
	"quantity" numeric(12, 2) NOT NULL,
	"printed_available_after" numeric(12, 2) NOT NULL,
	"cutted_available_after" numeric(12, 2) NOT NULL,
	"packaged_total_after" numeric(12, 2) NOT NULL,
	"created_by_user_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "batch_consumptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"destination_batch_id" integer NOT NULL,
	"source_batch_id" integer NOT NULL,
	"production_order_line_id" integer NOT NULL,
	"source_stage" "production_batch_stage" NOT NULL,
	"destination_stage" "production_batch_stage" NOT NULL,
	"rolls" numeric(12, 2) NOT NULL,
	"created_by_user_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "batch_consumptions_pair_uq" UNIQUE("destination_batch_id","source_batch_id"),
	CONSTRAINT "batch_consumptions_positive" CHECK (rolls > 0),
	CONSTRAINT "batch_consumptions_not_self" CHECK (source_batch_id <> destination_batch_id),
	CONSTRAINT "batch_consumptions_valid_adjacency" CHECK ((source_stage = 'printing' AND destination_stage = 'cutting')
       OR (source_stage = 'cutting'  AND destination_stage = 'packaging'))
);
--> statement-breakpoint
ALTER TABLE "production_order_lines" ADD COLUMN "used_rolls" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "production_order_lines" ADD COLUMN "used_weight" numeric(14, 4) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "production_order_lines" ADD COLUMN "extra_rolls_returned" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "production_order_lines" ADD COLUMN "extra_weight" numeric(14, 4) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "production_order_lines" ADD COLUMN "reconciled_at" timestamp;--> statement-breakpoint
ALTER TABLE "woven_work_order_details" ADD COLUMN "speed" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_production_order_line_id_production_order_lines_id_fk" FOREIGN KEY ("production_order_line_id") REFERENCES "public"."production_order_lines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_stage_transactions" ADD CONSTRAINT "production_stage_transactions_production_order_line_id_production_order_lines_id_fk" FOREIGN KEY ("production_order_line_id") REFERENCES "public"."production_order_lines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_stage_transactions" ADD CONSTRAINT "production_stage_transactions_batch_id_production_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."production_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_stage_transactions" ADD CONSTRAINT "production_stage_transactions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_consumptions" ADD CONSTRAINT "batch_consumptions_production_order_line_id_production_order_lines_id_fk" FOREIGN KEY ("production_order_line_id") REFERENCES "public"."production_order_lines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_consumptions" ADD CONSTRAINT "batch_consumptions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_consumptions" ADD CONSTRAINT "batch_consumptions_source_fk" FOREIGN KEY ("source_batch_id","production_order_line_id","source_stage") REFERENCES "public"."production_batches"("id","production_order_line_id","stage") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_consumptions" ADD CONSTRAINT "batch_consumptions_destination_fk" FOREIGN KEY ("destination_batch_id","production_order_line_id","destination_stage") REFERENCES "public"."production_batches"("id","production_order_line_id","stage") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "production_batches_line_idx" ON "production_batches" USING btree ("production_order_line_id");--> statement-breakpoint
CREATE INDEX "production_batches_line_stage_idx" ON "production_batches" USING btree ("production_order_line_id","stage");--> statement-breakpoint
CREATE INDEX "production_batches_stage_idx" ON "production_batches" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "production_batches_machine_idx" ON "production_batches" USING btree ("machine_id");--> statement-breakpoint
CREATE INDEX "production_batches_operator_idx" ON "production_batches" USING btree ("operator_id");--> statement-breakpoint
CREATE INDEX "production_batches_status_idx" ON "production_batches" USING btree ("status");--> statement-breakpoint
CREATE INDEX "production_batches_created_at_idx" ON "production_batches" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "production_stage_tx_line_idx" ON "production_stage_transactions" USING btree ("production_order_line_id");--> statement-breakpoint
CREATE INDEX "production_stage_tx_batch_idx" ON "production_stage_transactions" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "production_stage_tx_type_idx" ON "production_stage_transactions" USING btree ("transaction_type");--> statement-breakpoint
CREATE INDEX "production_stage_tx_created_at_idx" ON "production_stage_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "batch_consumptions_destination_idx" ON "batch_consumptions" USING btree ("destination_batch_id");--> statement-breakpoint
CREATE INDEX "batch_consumptions_source_idx" ON "batch_consumptions" USING btree ("source_batch_id");--> statement-breakpoint
CREATE INDEX "batch_consumptions_line_idx" ON "batch_consumptions" USING btree ("production_order_line_id");