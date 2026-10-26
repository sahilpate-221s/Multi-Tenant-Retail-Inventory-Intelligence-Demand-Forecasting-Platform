-- 0017_row_level_security.sql
-- Enables PostgreSQL native Row Level Security (RLS) across tenant-scoped tables
-- Enforces store isolation using current_setting('app.current_store_id')

DO $$
BEGIN
  -- Enable and FORCE RLS on core tenant tables (applies to owner/superuser connections as well)
  ALTER TABLE IF EXISTS products ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS products FORCE ROW LEVEL SECURITY;

  ALTER TABLE IF EXISTS inventory ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS inventory FORCE ROW LEVEL SECURITY;

  ALTER TABLE IF EXISTS inventory_movements ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS inventory_movements FORCE ROW LEVEL SECURITY;

  ALTER TABLE IF EXISTS sales ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS sales FORCE ROW LEVEL SECURITY;

  ALTER TABLE IF EXISTS suppliers ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS suppliers FORCE ROW LEVEL SECURITY;

  ALTER TABLE IF EXISTS categories ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS categories FORCE ROW LEVEL SECURITY;

  ALTER TABLE IF EXISTS purchase_orders ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS purchase_orders FORCE ROW LEVEL SECURITY;

  ALTER TABLE IF EXISTS returns ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS returns FORCE ROW LEVEL SECURITY;

  ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS notifications FORCE ROW LEVEL SECURITY;

  ALTER TABLE IF EXISTS dead_stock_scores ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS dead_stock_scores FORCE ROW LEVEL SECURITY;

  ALTER TABLE IF EXISTS stockout_predictions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS stockout_predictions FORCE ROW LEVEL SECURITY;

  ALTER TABLE IF EXISTS reorder_recommendations ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS reorder_recommendations FORCE ROW LEVEL SECURITY;

  ALTER TABLE IF EXISTS anomalies ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS anomalies FORCE ROW LEVEL SECURITY;

  ALTER TABLE IF EXISTS simulations ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS simulations FORCE ROW LEVEL SECURITY;

  ALTER TABLE IF EXISTS audit_logs ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS audit_logs FORCE ROW LEVEL SECURITY;

  ALTER TABLE IF EXISTS sale_items ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS sale_items FORCE ROW LEVEL SECURITY;

  -- Create non-superuser application role so RLS is genuinely enforced by Postgres engine
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'stockpilot_app') THEN
    CREATE ROLE stockpilot_app WITH LOGIN PASSWORD 'stockpilot_dev_password' NOSUPERUSER NOBYPASSRLS INHERIT;
  END IF;
  GRANT ALL PRIVILEGES ON SCHEMA public TO stockpilot_app;
  GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO stockpilot_app;
  GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO stockpilot_app;
  GRANT stockpilot_app TO stockpilot;
END $$;

-- Drop existing policies if any
DROP POLICY IF EXISTS rls_store_isolation_products ON products;
DROP POLICY IF EXISTS rls_store_isolation_inventory ON inventory;
DROP POLICY IF EXISTS rls_store_isolation_inventory_movements ON inventory_movements;
DROP POLICY IF EXISTS rls_store_isolation_sales ON sales;
DROP POLICY IF EXISTS rls_store_isolation_suppliers ON suppliers;
DROP POLICY IF EXISTS rls_store_isolation_categories ON categories;
DROP POLICY IF EXISTS rls_store_isolation_purchase_orders ON purchase_orders;
DROP POLICY IF EXISTS rls_store_isolation_returns ON returns;
DROP POLICY IF EXISTS rls_store_isolation_notifications ON notifications;
DROP POLICY IF EXISTS rls_store_isolation_dead_stock ON dead_stock_scores;
DROP POLICY IF EXISTS rls_store_isolation_stockout ON stockout_predictions;
DROP POLICY IF EXISTS rls_store_isolation_recommendations ON reorder_recommendations;
DROP POLICY IF EXISTS rls_store_isolation_anomalies ON anomalies;
DROP POLICY IF EXISTS rls_store_isolation_simulations ON simulations;
DROP POLICY IF EXISTS rls_store_isolation_audit_logs ON audit_logs;
DROP POLICY IF EXISTS rls_store_isolation_sale_items ON sale_items;

-- Helper macro condition:
-- If app.current_store_id is NOT set or set to 'BYPASS', allows administrative / background operations.
-- When app.current_store_id is set to a UUID, strictly limits access to matching store_id.

CREATE POLICY rls_store_isolation_products ON products FOR ALL
USING (
  NULLIF(current_setting('app.current_store_id', true), '') IS NULL
  OR current_setting('app.current_store_id', true) = 'BYPASS'
  OR store_id = NULLIF(current_setting('app.current_store_id', true), '')::uuid
)
WITH CHECK (
  NULLIF(current_setting('app.current_store_id', true), '') IS NULL
  OR current_setting('app.current_store_id', true) = 'BYPASS'
  OR store_id = NULLIF(current_setting('app.current_store_id', true), '')::uuid
);

CREATE POLICY rls_store_isolation_inventory ON inventory FOR ALL
USING (
  NULLIF(current_setting('app.current_store_id', true), '') IS NULL
  OR current_setting('app.current_store_id', true) = 'BYPASS'
  OR store_id = NULLIF(current_setting('app.current_store_id', true), '')::uuid
)
WITH CHECK (
  NULLIF(current_setting('app.current_store_id', true), '') IS NULL
  OR current_setting('app.current_store_id', true) = 'BYPASS'
  OR store_id = NULLIF(current_setting('app.current_store_id', true), '')::uuid
);

CREATE POLICY rls_store_isolation_inventory_movements ON inventory_movements FOR ALL
USING (
  NULLIF(current_setting('app.current_store_id', true), '') IS NULL
  OR current_setting('app.current_store_id', true) = 'BYPASS'
  OR store_id = NULLIF(current_setting('app.current_store_id', true), '')::uuid
)
WITH CHECK (
  NULLIF(current_setting('app.current_store_id', true), '') IS NULL
  OR current_setting('app.current_store_id', true) = 'BYPASS'
  OR store_id = NULLIF(current_setting('app.current_store_id', true), '')::uuid
);

CREATE POLICY rls_store_isolation_sales ON sales FOR ALL
USING (
  NULLIF(current_setting('app.current_store_id', true), '') IS NULL
  OR current_setting('app.current_store_id', true) = 'BYPASS'
  OR store_id = NULLIF(current_setting('app.current_store_id', true), '')::uuid
)
WITH CHECK (
  NULLIF(current_setting('app.current_store_id', true), '') IS NULL
  OR current_setting('app.current_store_id', true) = 'BYPASS'
  OR store_id = NULLIF(current_setting('app.current_store_id', true), '')::uuid
);

CREATE POLICY rls_store_isolation_suppliers ON suppliers FOR ALL
USING (
  NULLIF(current_setting('app.current_store_id', true), '') IS NULL
  OR current_setting('app.current_store_id', true) = 'BYPASS'
  OR store_id = NULLIF(current_setting('app.current_store_id', true), '')::uuid
)
WITH CHECK (
  NULLIF(current_setting('app.current_store_id', true), '') IS NULL
  OR current_setting('app.current_store_id', true) = 'BYPASS'
  OR store_id = NULLIF(current_setting('app.current_store_id', true), '')::uuid
);

CREATE POLICY rls_store_isolation_categories ON categories FOR ALL
USING (
  NULLIF(current_setting('app.current_store_id', true), '') IS NULL
  OR current_setting('app.current_store_id', true) = 'BYPASS'
  OR store_id = NULLIF(current_setting('app.current_store_id', true), '')::uuid
)
WITH CHECK (
  NULLIF(current_setting('app.current_store_id', true), '') IS NULL
  OR current_setting('app.current_store_id', true) = 'BYPASS'
  OR store_id = NULLIF(current_setting('app.current_store_id', true), '')::uuid
);

CREATE POLICY rls_store_isolation_purchase_orders ON purchase_orders FOR ALL
USING (
  NULLIF(current_setting('app.current_store_id', true), '') IS NULL
  OR current_setting('app.current_store_id', true) = 'BYPASS'
  OR store_id = NULLIF(current_setting('app.current_store_id', true), '')::uuid
)
WITH CHECK (
  NULLIF(current_setting('app.current_store_id', true), '') IS NULL
  OR current_setting('app.current_store_id', true) = 'BYPASS'
  OR store_id = NULLIF(current_setting('app.current_store_id', true), '')::uuid
);

CREATE POLICY rls_store_isolation_returns ON returns FOR ALL
USING (
  NULLIF(current_setting('app.current_store_id', true), '') IS NULL
  OR current_setting('app.current_store_id', true) = 'BYPASS'
  OR store_id = NULLIF(current_setting('app.current_store_id', true), '')::uuid
)
WITH CHECK (
  NULLIF(current_setting('app.current_store_id', true), '') IS NULL
  OR current_setting('app.current_store_id', true) = 'BYPASS'
  OR store_id = NULLIF(current_setting('app.current_store_id', true), '')::uuid
);

CREATE POLICY rls_store_isolation_notifications ON notifications FOR ALL
USING (
  NULLIF(current_setting('app.current_store_id', true), '') IS NULL
  OR current_setting('app.current_store_id', true) = 'BYPASS'
  OR store_id = NULLIF(current_setting('app.current_store_id', true), '')::uuid
)
WITH CHECK (
  NULLIF(current_setting('app.current_store_id', true), '') IS NULL
  OR current_setting('app.current_store_id', true) = 'BYPASS'
  OR store_id = NULLIF(current_setting('app.current_store_id', true), '')::uuid
);

CREATE POLICY rls_store_isolation_dead_stock ON dead_stock_scores FOR ALL
USING (
  NULLIF(current_setting('app.current_store_id', true), '') IS NULL
  OR current_setting('app.current_store_id', true) = 'BYPASS'
  OR store_id = NULLIF(current_setting('app.current_store_id', true), '')::uuid
)
WITH CHECK (
  NULLIF(current_setting('app.current_store_id', true), '') IS NULL
  OR current_setting('app.current_store_id', true) = 'BYPASS'
  OR store_id = NULLIF(current_setting('app.current_store_id', true), '')::uuid
);

CREATE POLICY rls_store_isolation_stockout ON stockout_predictions FOR ALL
USING (
  NULLIF(current_setting('app.current_store_id', true), '') IS NULL
  OR current_setting('app.current_store_id', true) = 'BYPASS'
  OR store_id = NULLIF(current_setting('app.current_store_id', true), '')::uuid
)
WITH CHECK (
  NULLIF(current_setting('app.current_store_id', true), '') IS NULL
  OR current_setting('app.current_store_id', true) = 'BYPASS'
  OR store_id = NULLIF(current_setting('app.current_store_id', true), '')::uuid
);

CREATE POLICY rls_store_isolation_recommendations ON reorder_recommendations FOR ALL
USING (
  NULLIF(current_setting('app.current_store_id', true), '') IS NULL
  OR current_setting('app.current_store_id', true) = 'BYPASS'
  OR store_id = NULLIF(current_setting('app.current_store_id', true), '')::uuid
)
WITH CHECK (
  NULLIF(current_setting('app.current_store_id', true), '') IS NULL
  OR current_setting('app.current_store_id', true) = 'BYPASS'
  OR store_id = NULLIF(current_setting('app.current_store_id', true), '')::uuid
);

CREATE POLICY rls_store_isolation_anomalies ON anomalies FOR ALL
USING (
  NULLIF(current_setting('app.current_store_id', true), '') IS NULL
  OR current_setting('app.current_store_id', true) = 'BYPASS'
  OR store_id = NULLIF(current_setting('app.current_store_id', true), '')::uuid
)
WITH CHECK (
  NULLIF(current_setting('app.current_store_id', true), '') IS NULL
  OR current_setting('app.current_store_id', true) = 'BYPASS'
  OR store_id = NULLIF(current_setting('app.current_store_id', true), '')::uuid
);

CREATE POLICY rls_store_isolation_simulations ON simulations FOR ALL
USING (
  NULLIF(current_setting('app.current_store_id', true), '') IS NULL
  OR current_setting('app.current_store_id', true) = 'BYPASS'
  OR store_id = NULLIF(current_setting('app.current_store_id', true), '')::uuid
)
WITH CHECK (
  NULLIF(current_setting('app.current_store_id', true), '') IS NULL
  OR current_setting('app.current_store_id', true) = 'BYPASS'
  OR store_id = NULLIF(current_setting('app.current_store_id', true), '')::uuid
);

CREATE POLICY rls_store_isolation_sale_items ON sale_items FOR ALL
USING (
  NULLIF(current_setting('app.current_store_id', true), '') IS NULL
  OR current_setting('app.current_store_id', true) = 'BYPASS'
  OR EXISTS (
    SELECT 1 FROM sales WHERE sales.id = sale_items.sale_id
    AND sales.store_id = NULLIF(current_setting('app.current_store_id', true), '')::uuid
  )
)
WITH CHECK (
  NULLIF(current_setting('app.current_store_id', true), '') IS NULL
  OR current_setting('app.current_store_id', true) = 'BYPASS'
  OR EXISTS (
    SELECT 1 FROM sales WHERE sales.id = sale_items.sale_id
    AND sales.store_id = NULLIF(current_setting('app.current_store_id', true), '')::uuid
  )
);
