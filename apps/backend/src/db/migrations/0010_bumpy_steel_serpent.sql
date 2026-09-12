CREATE TABLE "simulations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"demand_change_percent" numeric(6, 2) DEFAULT '0' NOT NULL,
	"supplier_delay_days" integer DEFAULT 0 NOT NULL,
	"budget_limit" numeric(12, 2),
	"baseline_current_stock" integer NOT NULL,
	"baseline_average_daily_demand" numeric(10, 3) NOT NULL,
	"baseline_lead_time_days" integer,
	"simulated_average_daily_demand" numeric(10, 3) NOT NULL,
	"simulated_lead_time_days" integer,
	"simulated_safety_stock" integer NOT NULL,
	"simulated_reorder_point" integer,
	"simulated_recommended_quantity" integer NOT NULL,
	"simulated_days_until_stockout" numeric(10, 1),
	"estimated_cost" numeric(12, 2),
	"budget_exceeded" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "simulations" ADD CONSTRAINT "simulations_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulations" ADD CONSTRAINT "simulations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;