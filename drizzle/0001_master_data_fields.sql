ALTER TABLE "companies" ADD COLUMN "contact_person" varchar(255);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "phone" varchar(50);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "min_stock_level" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "reorder_qty" integer DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "machines" ADD COLUMN "capacity_per_hour" integer;--> statement-breakpoint
ALTER TABLE "machines" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "operators" ADD COLUMN "employee_code" varchar(100);--> statement-breakpoint
ALTER TABLE "operators" ADD COLUMN "shift" varchar(50);--> statement-breakpoint
ALTER TABLE "operators" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;