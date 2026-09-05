CREATE TABLE "dead_stock_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"days_since_last_sale" integer,
	"current_stock" integer NOT NULL,
	"inventory_value" numeric(12, 2) NOT NULL,
	"average_daily_demand" numeric(10, 3) NOT NULL,
	"reason_codes" text NOT NULL,
	"calculated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dead_stock_scores" ADD CONSTRAINT "dead_stock_scores_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dead_stock_scores" ADD CONSTRAINT "dead_stock_scores_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;