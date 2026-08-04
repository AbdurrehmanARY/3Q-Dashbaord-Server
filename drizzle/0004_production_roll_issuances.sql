CREATE TABLE "production_roll_issuances" (
	"id" serial PRIMARY KEY NOT NULL,
	"production_order_line_id" integer NOT NULL,
	"material_code" varchar(100) NOT NULL,
	"rolls" numeric(10, 2) NOT NULL,
	"note" text,
	"actor_user_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "production_roll_issuances" ADD CONSTRAINT "production_roll_issuances_production_order_line_id_production_order_lines_id_fk" FOREIGN KEY ("production_order_line_id") REFERENCES "public"."production_order_lines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_roll_issuances" ADD CONSTRAINT "production_roll_issuances_material_code_materials_code_fk" FOREIGN KEY ("material_code") REFERENCES "public"."materials"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_roll_issuances" ADD CONSTRAINT "production_roll_issuances_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "production_roll_issuances_line_idx" ON "production_roll_issuances" USING btree ("production_order_line_id");--> statement-breakpoint
CREATE INDEX "production_roll_issuances_material_code_idx" ON "production_roll_issuances" USING btree ("material_code");