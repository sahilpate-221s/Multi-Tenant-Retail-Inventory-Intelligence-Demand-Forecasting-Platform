CREATE TABLE "stockout_predictions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"current_stock" integer NOT NULL,
	"incoming_stock" integer NOT NULL,
	"forecasted_daily_demand" numeric(10, 3) NOT NULL,
	"demand_source" varchar(30) NOT NULL,
	"lead_time_days" integer,
	"days_until_stockout" numeric(10, 1),
	"risk_level" varchar(20) NOT NULL,
	"calculated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stockout_predictions" ADD CONSTRAINT "stockout_predictions_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stockout_predictions" ADD CONSTRAINT "stockout_predictions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;