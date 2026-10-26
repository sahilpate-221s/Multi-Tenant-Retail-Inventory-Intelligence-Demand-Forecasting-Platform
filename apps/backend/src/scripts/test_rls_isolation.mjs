import postgres from "postgres";
import dotenv from "dotenv";
dotenv.config();

const sql = postgres(process.env.DATABASE_URL);

async function runRlsTest() {
  console.log("=== Testing 2.4 PostgreSQL Row Level Security (RLS) Multi-Tenant Isolation ===\n");

  // 1. Verify policies exist in pg_policies
  const policies = await sql`
    SELECT tablename, policyname, permissive, cmd 
    FROM pg_policies 
    WHERE policyname LIKE 'rls_store_%'
    ORDER BY tablename;
  `;
  console.log(`Found ${policies.length} active Row Level Security policies:`);
  policies.forEach((p) => console.log(` - Table [${p.tablename}] -> Policy [${p.policyname}] (${p.cmd})`));

  // Check current role attributes
  const [currentUser] = await sql`
    SELECT current_user, r.rolsuper, r.rolbypassrls 
    FROM pg_roles r 
    WHERE r.rolname = current_user;
  `;
  console.log("Database user:", currentUser);

  // 2. Fetch two distinct store IDs
  const stores = await sql`SELECT id, name FROM stores LIMIT 2;`;
  if (stores.length < 2) {
    console.log("Only 1 store found in DB. Creating temporary store to test cross-tenant isolation...");
    const [tempStore] = await sql`
      INSERT INTO stores (name, address, city, state, pincode)
      VALUES ('Store B (Isolation Test)', 'Cross-tenant road', 'Ahmedabad', 'Gujarat', '380015')
      RETURNING id, name;
    `;
    stores.push(tempStore);
  }

  const storeA = stores[0];
  const storeB = stores[1];
  console.log(`\nStore A: ${storeA.name} (${storeA.id})`);
  console.log(`Store B: ${storeB.name} (${storeB.id})`);

  // Ensure Store A has at least 1 product
  const [prodA] = await sql`
    SELECT id, name, store_id FROM products WHERE store_id = ${storeA.id} LIMIT 1;
  `;

  if (!prodA) {
    throw new Error("Store A has no products to test.");
  }

  // Test 1: Query as Store B without any WHERE store_id clause
  console.log(`\nSimulating a buggy/leaky query: SELECT * FROM products WITHOUT WHERE store_id clause...`);
  console.log(`Setting application role and session tenant context to Store B: ${storeB.id}`);
  const resultsAsStoreB = await sql.begin(async (tx) => {
    // Switch to application role (NOSUPERUSER) and set tenant context
    await tx`SET ROLE stockpilot_app`;
    await tx`SELECT set_config('app.current_store_id', ${storeB.id}, true)`;
    // Intentionally query WITHOUT filtering by store_id
    return tx`SELECT id, name, store_id FROM products;`;
  });

  const leakedStoreAProduct = resultsAsStoreB.find((p) => p.store_id === storeA.id);
  if (leakedStoreAProduct) {
    throw new Error(`CRITICAL RLS LEAK: Store B was able to see Store A's product "${leakedStoreAProduct.name}"!`);
  }

  console.log(`✅ RLS BLOCKED LEAK! Store B queried all products and received ${resultsAsStoreB.length} products, exactly 0 belonging to Store A.`);

  // Test 2: Query as Store A
  console.log(`\nSetting application role and session tenant context to Store A: ${storeA.id}`);
  const resultsAsStoreA = await sql.begin(async (tx) => {
    await tx`SET ROLE stockpilot_app`;
    await tx`SELECT set_config('app.current_store_id', ${storeA.id}, true)`;
    return tx`SELECT id, name, store_id FROM products;`;
  });
  const sawOwnProduct = resultsAsStoreA.some((p) => p.id === prodA.id);
  if (!sawOwnProduct) {
    throw new Error("Store A could not see its own product under RLS!");
  }
  console.log(`✅ RLS Allowed Store A to see its own ${resultsAsStoreA.length} products.`);

  console.log("\n=======================================================");
  console.log("🎉 2.4 ROW LEVEL SECURITY (RLS) MULTI-TENANT ISOLATION VERIFIED!");
  console.log("=======================================================\n");
  await sql.end();
}

runRlsTest().catch((err) => {
  console.error("RLS test error:", err);
  process.exit(1);
});
