ALTER TYPE "public"."work_order_status" ADD VALUE 'dispatched';--> statement-breakpoint
ALTER TABLE "work_orders" ADD COLUMN "fbr_invoice_number" varchar(100);--> statement-breakpoint
CREATE INDEX "work_orders_fbr_invoice_idx" ON "work_orders" USING btree ("fbr_invoice_number");