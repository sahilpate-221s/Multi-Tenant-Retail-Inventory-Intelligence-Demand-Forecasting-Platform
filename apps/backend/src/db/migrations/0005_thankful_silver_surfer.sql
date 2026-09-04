CREATE TABLE "reorder_recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"current_stock" integer NOT NULL,
	"incoming_stock" integer NOT NULL,
	"average_daily_demand" numeric(10, 3) NOT NULL,
	"lead_time_days" integer,
	"safety_stock" integer NOT NULL,
	"reorder_point" integer,
	"recommended_quantity" integer NOT NULL,
	"days_until_stockout" numeric(10, 1),
	"reason_codes" text NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "reorder_recommendations" ADD CONSTRAINT "reorder_recommendations_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reorder_recommendations" ADD CONSTRAINT "reorder_recommendations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;