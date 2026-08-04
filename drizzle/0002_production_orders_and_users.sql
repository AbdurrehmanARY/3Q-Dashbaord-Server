CREATE TYPE "public"."user_role" AS ENUM('office_staff', 'production_manager', 'production_operator');--> statement-breakpoint
CREATE TYPE "public"."production_order_status" AS ENUM('pending_planning', 'planned', 'in_production', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."production_event_type" AS ENUM('printing_progress', 'transfer_to_cutting', 'cutting_progress', 'transfer_to_packaging', 'packaging_progress', 'assignment');--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"employee_code" varchar(100),
	"email" varchar(255),
	"role" "user_role" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "production_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"production_number" varchar(100) NOT NULL,
	"work_order_id" integer NOT NULL,
	"total_qty" integer NOT NULL,
	"status" "production_order_status" DEFAULT 'pending_planning' NOT NULL,
	"notes" text,
	"created_by_user_id" integer,
	"planned_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "production_orders_production_number_unique" UNIQUE("production_number"),
	CONSTRAINT "production_orders_work_order_id_unique" UNIQUE("work_order_id")
);
--> statement-breakpoint
CREATE TABLE "production_order_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"production_order_id" integer NOT NULL,
	"label_type" varchar(255) NOT NULL,
	"quantity" numeric(12, 2) NOT NULL,
	"label_size" numeric(10, 2) NOT NULL,
	"roll_length" numeric(10, 2) NOT NULL,
	"required_rolls" numeric(10, 2) NOT NULL,
	"extra_rolls" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total_rolls" numeric(10, 2) NOT NULL,
	"printed_rolls" numeric(10, 2) DEFAULT '0' NOT NULL,
	"sent_to_cutting_rolls" numeric(10, 2) DEFAULT '0' NOT NULL,
	"cut_rolls" numeric(10, 2) DEFAULT '0' NOT NULL,
	"sent_to_packaging_rolls" numeric(10, 2) DEFAULT '0' NOT NULL,
	"packaged_rolls" numeric(10, 2) DEFAULT '0' NOT NULL,
	"packaged_qty" numeric(12, 2) DEFAULT '0' NOT NULL,
	"printing_machine_id" integer,
	"printing_operator_id" integer,
	"cutting_machine_id" integer,
	"cutting_operator_id" integer,
	"packaging_operator_id" integer,
	"status" "production_status" DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "production_stage_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"production_order_line_id" integer NOT NULL,
	"event_type" "production_event_type" NOT NULL,
	"previous_value" numeric(12, 2),
	"new_value" numeric(12, 2),
	"delta" numeric(12, 2),
	"actor_user_id" integer,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "operators" ADD COLUMN "user_id" integer;--> statement-breakpoint
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_order_lines" ADD CONSTRAINT "production_order_lines_production_order_id_production_orders_id_fk" FOREIGN KEY ("production_order_id") REFERENCES "public"."production_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_order_lines" ADD CONSTRAINT "production_order_lines_printing_machine_id_machines_id_fk" FOREIGN KEY ("printing_machine_id") REFERENCES "public"."machines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_order_lines" ADD CONSTRAINT "production_order_lines_printing_operator_id_operators_id_fk" FOREIGN KEY ("printing_operator_id") REFERENCES "public"."operators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_order_lines" ADD CONSTRAINT "production_order_lines_cutting_machine_id_machines_id_fk" FOREIGN KEY ("cutting_machine_id") REFERENCES "public"."machines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_order_lines" ADD CONSTRAINT "production_order_lines_cutting_operator_id_operators_id_fk" FOREIGN KEY ("cutting_operator_id") REFERENCES "public"."operators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_order_lines" ADD CONSTRAINT "production_order_lines_packaging_operator_id_operators_id_fk" FOREIGN KEY ("packaging_operator_id") REFERENCES "public"."operators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_stage_events" ADD CONSTRAINT "production_stage_events_production_order_line_id_production_order_lines_id_fk" FOREIGN KEY ("production_order_line_id") REFERENCES "public"."production_order_lines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_stage_events" ADD CONSTRAINT "production_stage_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "production_orders_work_order_idx" ON "production_orders" USING btree ("work_order_id");--> statement-breakpoint
CREATE INDEX "production_orders_status_idx" ON "production_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "production_order_lines_order_idx" ON "production_order_lines" USING btree ("production_order_id");--> statement-breakpoint
CREATE INDEX "production_order_lines_status_idx" ON "production_order_lines" USING btree ("status");--> statement-breakpoint
CREATE INDEX "production_order_lines_printing_machine_idx" ON "production_order_lines" USING btree ("printing_machine_id");--> statement-breakpoint
CREATE INDEX "production_order_lines_printing_operator_idx" ON "production_order_lines" USING btree ("printing_operator_id");--> statement-breakpoint
CREATE INDEX "production_order_lines_cutting_machine_idx" ON "production_order_lines" USING btree ("cutting_machine_id");--> statement-breakpoint
CREATE INDEX "production_order_lines_cutting_operator_idx" ON "production_order_lines" USING btree ("cutting_operator_id");--> statement-breakpoint
CREATE INDEX "production_order_lines_packaging_operator_idx" ON "production_order_lines" USING btree ("packaging_operator_id");--> statement-breakpoint
CREATE INDEX "production_stage_events_line_idx" ON "production_stage_events" USING btree ("production_order_line_id");--> statement-breakpoint
CREATE INDEX "production_stage_events_actor_idx" ON "production_stage_events" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "production_stage_events_created_at_idx" ON "production_stage_events" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "operators" ADD CONSTRAINT "operators_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;