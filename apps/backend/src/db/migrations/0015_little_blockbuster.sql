ALTER TABLE "products" ADD COLUMN "hsn_code" varchar(20);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "gst_rate" numeric(5, 2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "returns" ADD COLUMN "refund_amount" numeric(12, 2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "returns" ADD COLUMN "refund_mode" varchar(50) DEFAULT 'cash';--> statement-breakpoint
ALTER TABLE "sale_items" ADD COLUMN "hsn_code" varchar(20);--> statement-breakpoint
ALTER TABLE "sale_items" ADD COLUMN "gst_rate" numeric(5, 2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "sale_items" ADD COLUMN "tax_amount" numeric(12, 2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "cgst_amount" numeric(12, 2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "sgst_amount" numeric(12, 2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "total_tax" numeric(12, 2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "gstin" varchar(20);