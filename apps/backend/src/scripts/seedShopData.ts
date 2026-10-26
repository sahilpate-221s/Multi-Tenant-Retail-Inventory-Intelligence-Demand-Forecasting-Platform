import { db } from "../db/client";
import {
  stores,
  users,
  categories,
  products,
  inventory,
  inventoryMovements,
  suppliers,
  supplierProducts,
  sales,
  saleItems,
  purchaseOrders,
  notifications,
  deadStockScores,
  stockoutPredictions,
  reorderRecommendations,
} from "../db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "../modules/auth/password";

async function seed() {
  console.log("🌱 Starting complete fresh shop data setup...");

  // 1. Get or create primary store
  let [store] = await db.select().from(stores).limit(1);
  if (!store) {
    [store] = await db
      .insert(stores)
      .values({
        name: "Patel Super Market & Kirana",
        timezone: "Asia/Kolkata",
        currency: "INR",
        gstin: "24AAAAA0000A1Z5",
      })
      .returning();
    console.log("Created Store:", store.name, store.id);
  } else {
    await db
      .update(stores)
      .set({
        name: "Patel Super Market & Kirana",
        currency: "INR",
        timezone: "Asia/Kolkata",
        gstin: "24AAAAA0000A1Z5",
      })
      .where(eq(stores.id, store.id));
    console.log("Using Store:", store.name, store.id);
  }

  const storeId = store.id;

  // 1.1 Ensure Owner and Cashier accounts exist
  const ownerHash = await hashPassword("password123");
  const cashierHash = await hashPassword("cashier123");

  const [existingOwner] = await db.select().from(users).where(eq(users.email, "owner@stockpilot.io")).limit(1);
  if (!existingOwner) {
    await db.insert(users).values({
      storeId,
      email: "owner@stockpilot.io",
      passwordHash: ownerHash,
      role: "owner",
    });
    console.log("✓ Created default Owner: owner@stockpilot.io (password: password123)");
  } else {
    await db.update(users).set({ storeId, role: "owner", passwordHash: ownerHash }).where(eq(users.id, existingOwner.id));
    console.log("✓ Owner account ready: owner@stockpilot.io");
  }

  const [existingCashier] = await db.select().from(users).where(eq(users.email, "cashier@stockpilot.io")).limit(1);
  if (!existingCashier) {
    await db.insert(users).values({
      storeId,
      email: "cashier@stockpilot.io",
      passwordHash: cashierHash,
      role: "cashier",
    });
    console.log("✓ Created default Cashier: cashier@stockpilot.io (password: cashier123)");
  } else {
    await db.update(users).set({ storeId, role: "cashier", passwordHash: cashierHash }).where(eq(users.id, existingCashier.id));
    console.log("✓ Cashier account ready: cashier@stockpilot.io");
  }

  // 2. Clear old data for this store in correct FK dependency order
  console.log("🧹 Clearing old mock data...");
  try {
    await db.delete(notifications).where(eq(notifications.storeId, storeId));
    await db.delete(reorderRecommendations).where(eq(reorderRecommendations.storeId, storeId));
    await db.delete(deadStockScores).where(eq(deadStockScores.storeId, storeId));
    await db.delete(stockoutPredictions).where(eq(stockoutPredictions.storeId, storeId));
    await db.delete(purchaseOrders).where(eq(purchaseOrders.storeId, storeId));
    await db.delete(saleItems);
    await db.delete(sales).where(eq(sales.storeId, storeId));
    await db.delete(inventoryMovements).where(eq(inventoryMovements.storeId, storeId));
    await db.delete(inventory).where(eq(inventory.storeId, storeId));
    await db.delete(supplierProducts);
    await db.delete(products).where(eq(products.storeId, storeId));
    await db.delete(suppliers).where(eq(suppliers.storeId, storeId));
    await db.delete(categories).where(eq(categories.storeId, storeId));
    console.log("✓ Old store data cleared cleanly.");
  } catch (err: any) {
    console.error("Warning during clear:", err.message);
  }

  // 3. Seed Realistic Categories
  console.log("📂 Creating categories...");
  const catNames = [
    "Groceries & Staples",
    "Snacks & Biscuits",
    "Beverages & Tea",
    "Dairy & Breakfast",
    "Personal Care",
    "Household & Cleaning",
  ];

  const catMap = new Map<string, string>();
  for (const name of catNames) {
    const [c] = await db.insert(categories).values({ storeId, name }).returning();
    catMap.set(name, c.id);
  }
  console.log(`✓ ${catMap.size} categories created.`);

  // 4. Seed Real Distributors / Suppliers
  console.log("🚛 Creating suppliers...");
  const supplierData = [
    {
      name: "Hindustan Unilever Depot (Ahmedabad)",
      contactEmail: "hul.orders@huldistributors.in",
      contactPhone: "+91 98250 11223",
      reliabilityNotes: "Direct FMCG delivery every Tuesday and Friday morning.",
    },
    {
      name: "Nestle & Britannia Regional Agency",
      contactEmail: "orders@nestlebritannia-supply.com",
      contactPhone: "+91 98240 33445",
      reliabilityNotes: "Instant noodles, biscuits, and confectionery depot.",
    },
    {
      name: "Amul Federation Dairy Cooperative",
      contactEmail: "milk.supply@amul.coop",
      contactPhone: "+91 98245 77889",
      reliabilityNotes: "Daily morning cold chain delivery at 6:30 AM.",
    },
    {
      name: "Adani Wilmar & Tata Staples Wholesaler",
      contactEmail: "staples@adaniwilmarwholesalers.in",
      contactPhone: "+91 98255 99001",
      reliabilityNotes: "Edible oils, dals, flours, and sugar bulk distributor.",
    },
  ];

  const supMap = new Map<string, string>();
  for (const s of supplierData) {
    const [created] = await db.insert(suppliers).values({ storeId, ...s }).returning();
    supMap.set(s.name, created.id);
  }
  console.log(`✓ ${supMap.size} suppliers created.`);

  // 5. Seed Real Indian Retail Products with Actual Barcodes
  console.log("📦 Creating genuine retail products with real barcodes...");
  const productsList = [
    // Groceries & Staples (0% Nil GST on unbranded/basic essentials, 5% on sugar & refined oil)
    {
      name: "Aashirvaad Shudh Chakki Atta 5kg",
      sku: "ATTA-AASH-5K",
      barcode: "8901030383703",
      category: "Groceries & Staples",
      supplier: "Adani Wilmar & Tata Staples Wholesaler",
      costPrice: "210.00",
      sellingPrice: "245.00",
      stock: 28,
      minStock: 6,
      hsnCode: "1101",
      gstRate: "0",
    },
    {
      name: "Fortune Sunlite Refined Sunflower Oil 1L",
      sku: "OIL-FORT-1L",
      barcode: "8906007281017",
      category: "Groceries & Staples",
      supplier: "Adani Wilmar & Tata Staples Wholesaler",
      costPrice: "125.00",
      sellingPrice: "145.00",
      stock: 45,
      minStock: 10,
      hsnCode: "1507",
      gstRate: "5",
    },
    {
      name: "Tata Salt Vacuum Evaporated 1kg",
      sku: "SALT-TATA-1K",
      barcode: "8901058852892",
      category: "Groceries & Staples",
      supplier: "Adani Wilmar & Tata Staples Wholesaler",
      costPrice: "22.00",
      sellingPrice: "28.00",
      stock: 75,
      minStock: 15,
      hsnCode: "2501",
      gstRate: "0",
    },
    {
      name: "Madhur Pure & Hygienic Sugar 1kg",
      sku: "SUG-MADH-1K",
      barcode: "8906014430033",
      category: "Groceries & Staples",
      supplier: "Adani Wilmar & Tata Staples Wholesaler",
      costPrice: "44.00",
      sellingPrice: "52.00",
      stock: 50,
      minStock: 12,
      hsnCode: "1701",
      gstRate: "5",
    },
    {
      name: "Tata Sampann High Protein Toor Dal 1kg",
      sku: "DAL-TATA-1K",
      barcode: "8901058852304",
      category: "Groceries & Staples",
      supplier: "Adani Wilmar & Tata Staples Wholesaler",
      costPrice: "148.00",
      sellingPrice: "175.00",
      stock: 20,
      minStock: 5,
      hsnCode: "0713",
      gstRate: "0",
    },
    {
      name: "India Gate Basmati Rice Rozzana 1kg",
      sku: "RICE-INGT-1K",
      barcode: "8906001020025",
      category: "Groceries & Staples",
      supplier: "Adani Wilmar & Tata Staples Wholesaler",
      costPrice: "92.00",
      sellingPrice: "115.00",
      stock: 32,
      minStock: 8,
      hsnCode: "1006",
      gstRate: "0",
    },

    // Snacks & Biscuits (12% namkeen/chips, 18% biscuits/chocolates/noodles)
    {
      name: "Maggi 2-Minute Masala Instant Noodles 70g",
      sku: "NOOD-MAGG-70",
      barcode: "8901058859099",
      category: "Snacks & Biscuits",
      supplier: "Nestle & Britannia Regional Agency",
      costPrice: "11.50",
      sellingPrice: "14.00",
      stock: 140,
      minStock: 25,
      hsnCode: "1902",
      gstRate: "18",
    },
    {
      name: "Parle-G Original Glucose Biscuits 800g",
      sku: "BISC-PARL-800",
      barcode: "8901719101038",
      category: "Snacks & Biscuits",
      supplier: "Nestle & Britannia Regional Agency",
      costPrice: "68.00",
      sellingPrice: "80.00",
      stock: 35,
      minStock: 10,
      hsnCode: "1905",
      gstRate: "18",
    },
    {
      name: "Britannia Good Day Butter Cookies 200g",
      sku: "BISC-GOOD-200",
      barcode: "8901063012014",
      category: "Snacks & Biscuits",
      supplier: "Nestle & Britannia Regional Agency",
      costPrice: "38.00",
      sellingPrice: "45.00",
      stock: 48,
      minStock: 10,
      hsnCode: "1905",
      gstRate: "18",
    },
    {
      name: "Lay's India's Magic Masala Potato Chips 50g",
      sku: "CHIP-LAYS-50",
      barcode: "8901491101838",
      category: "Snacks & Biscuits",
      supplier: "Nestle & Britannia Regional Agency",
      costPrice: "16.00",
      sellingPrice: "20.00",
      stock: 60,
      minStock: 15,
      hsnCode: "2005",
      gstRate: "12",
    },
    {
      name: "Kurkure Masala Munch Namkeen 85g",
      sku: "NAMK-KURK-85",
      barcode: "8901491501027",
      category: "Snacks & Biscuits",
      supplier: "Nestle & Britannia Regional Agency",
      costPrice: "16.00",
      sellingPrice: "20.00",
      stock: 55,
      minStock: 15,
      hsnCode: "2106",
      gstRate: "12",
    },
    {
      name: "Cadbury Dairy Milk Silk Chocolate 60g",
      sku: "CHOC-CDMS-60",
      barcode: "7622201741021",
      category: "Snacks & Biscuits",
      supplier: "Nestle & Britannia Regional Agency",
      costPrice: "68.00",
      sellingPrice: "80.00",
      stock: 40,
      minStock: 10,
      hsnCode: "1806",
      gstRate: "18",
    },
    {
      name: "KitKat 4 Finger Crispy Wafer Bar 38.5g",
      sku: "CHOC-KITK-38",
      barcode: "8901058847898",
      category: "Snacks & Biscuits",
      supplier: "Nestle & Britannia Regional Agency",
      costPrice: "22.00",
      sellingPrice: "25.00",
      stock: 50,
      minStock: 10,
      hsnCode: "1905",
      gstRate: "18",
    },

    // Beverages & Tea (5% tea, 18% coffee, 28% carbonated drinks)
    {
      name: "Tata Tea Gold Leaf & Dust Blend 500g",
      sku: "TEA-TATA-500",
      barcode: "8901052002019",
      category: "Beverages & Tea",
      supplier: "Hindustan Unilever Depot (Ahmedabad)",
      costPrice: "260.00",
      sellingPrice: "310.00",
      stock: 22,
      minStock: 5,
      hsnCode: "0902",
      gstRate: "5",
    },
    {
      name: "Brooke Bond Red Label Tea 500g",
      sku: "TEA-REDL-500",
      barcode: "8901030382348",
      category: "Beverages & Tea",
      supplier: "Hindustan Unilever Depot (Ahmedabad)",
      costPrice: "240.00",
      sellingPrice: "285.00",
      stock: 26,
      minStock: 6,
      hsnCode: "0902",
      gstRate: "5",
    },
    {
      name: "Nescafe Classic 100% Pure Instant Coffee 50g",
      sku: "COFF-NESC-50",
      barcode: "8901058852991",
      category: "Beverages & Tea",
      supplier: "Nestle & Britannia Regional Agency",
      costPrice: "148.00",
      sellingPrice: "175.00",
      stock: 18,
      minStock: 4,
      hsnCode: "0901",
      gstRate: "18",
    },
    {
      name: "Coca-Cola Original Refreshing Soft Drink 750ml",
      sku: "SODA-COKE-750",
      barcode: "5449000000996",
      category: "Beverages & Tea",
      supplier: "Nestle & Britannia Regional Agency",
      costPrice: "32.00",
      sellingPrice: "40.00",
      stock: 42,
      minStock: 10,
      hsnCode: "2202",
      gstRate: "28",
    },
    {
      name: "Thums Up Toofan Carbonated Beverage 750ml",
      sku: "SODA-THUM-750",
      barcode: "8901764012224",
      category: "Beverages & Tea",
      supplier: "Nestle & Britannia Regional Agency",
      costPrice: "32.00",
      sellingPrice: "40.00",
      stock: 36,
      minStock: 10,
      hsnCode: "2202",
      gstRate: "28",
    },

    // Dairy & Breakfast (0% milk & bread, 12% butter & cheese)
    {
      name: "Amul Butter Pasteurized Salted 500g",
      sku: "BUTT-AMUL-500",
      barcode: "8901262010057",
      category: "Dairy & Breakfast",
      supplier: "Amul Federation Dairy Cooperative",
      costPrice: "245.00",
      sellingPrice: "275.00",
      stock: 15,
      minStock: 4,
      hsnCode: "0405",
      gstRate: "12",
    },
    {
      name: "Amul Taaza Homogenised Toned Milk 1L",
      sku: "MILK-AMUL-1L",
      barcode: "8901262151019",
      category: "Dairy & Breakfast",
      supplier: "Amul Federation Dairy Cooperative",
      costPrice: "68.00",
      sellingPrice: "74.00",
      stock: 24,
      minStock: 6,
      hsnCode: "0401",
      gstRate: "0",
    },
    {
      name: "Britannia 100% Whole Wheat Brown Bread 400g",
      sku: "BRED-BRIT-400",
      barcode: "8901063142018",
      category: "Dairy & Breakfast",
      supplier: "Nestle & Britannia Regional Agency",
      costPrice: "40.00",
      sellingPrice: "50.00",
      stock: 10,
      minStock: 3,
      hsnCode: "1905",
      gstRate: "0",
    },
    {
      name: "Amul Processed Cheese Blocks 200g",
      sku: "CHEE-AMUL-200",
      barcode: "8901262020018",
      category: "Dairy & Breakfast",
      supplier: "Amul Federation Dairy Cooperative",
      costPrice: "115.00",
      sellingPrice: "135.00",
      stock: 14,
      minStock: 3,
      hsnCode: "0406",
      gstRate: "12",
    },

    // Personal Care (18% soaps, shampoos, toothpastes)
    {
      name: "Dettol Original Germ Protection Bathing Soap 125g",
      sku: "SOAP-DETT-125",
      barcode: "8901396387023",
      category: "Personal Care",
      supplier: "Hindustan Unilever Depot (Ahmedabad)",
      costPrice: "46.00",
      sellingPrice: "56.00",
      stock: 45,
      minStock: 10,
      hsnCode: "3401",
      gstRate: "18",
    },
    {
      name: "Lifebuoy Total Germ Protection Soap 125g",
      sku: "SOAP-LIFE-125",
      barcode: "8901030823018",
      category: "Personal Care",
      supplier: "Hindustan Unilever Depot (Ahmedabad)",
      costPrice: "32.00",
      sellingPrice: "40.00",
      stock: 40,
      minStock: 10,
      hsnCode: "3401",
      gstRate: "18",
    },
    {
      name: "Colgate Strong Teeth Calcium Dental Cream 200g",
      sku: "PAST-COLG-200",
      barcode: "8901314010521",
      category: "Personal Care",
      supplier: "Hindustan Unilever Depot (Ahmedabad)",
      costPrice: "105.00",
      sellingPrice: "125.00",
      stock: 35,
      minStock: 8,
      hsnCode: "3306",
      gstRate: "18",
    },
    {
      name: "Head & Shoulders Smooth & Silky Shampoo 180ml",
      sku: "SHAM-HEAD-180",
      barcode: "4902430733816",
      category: "Personal Care",
      supplier: "Hindustan Unilever Depot (Ahmedabad)",
      costPrice: "155.00",
      sellingPrice: "185.00",
      stock: 16,
      minStock: 4,
      hsnCode: "3305",
      gstRate: "18",
    },

    // Household & Cleaning (18% detergent, cleaners)
    {
      name: "Surf Excel Easy Wash Detergent Powder 1kg",
      sku: "DETR-SURF-1K",
      barcode: "8901030015550",
      category: "Household & Cleaning",
      supplier: "Hindustan Unilever Depot (Ahmedabad)",
      costPrice: "122.00",
      sellingPrice: "145.00",
      stock: 32,
      minStock: 8,
      hsnCode: "3402",
      gstRate: "18",
    },
    {
      name: "Vim Lemon Dishwash Concentrate Gel 500ml",
      sku: "DISH-VIM-500",
      barcode: "8901030612018",
      category: "Household & Cleaning",
      supplier: "Hindustan Unilever Depot (Ahmedabad)",
      costPrice: "95.00",
      sellingPrice: "115.00",
      stock: 24,
      minStock: 6,
      hsnCode: "3402",
      gstRate: "18",
    },
    {
      name: "Harpic Power Plus 10X Toilet Cleaner 1L",
      sku: "CLEN-HARP-1L",
      barcode: "8901396101018",
      category: "Household & Cleaning",
      supplier: "Hindustan Unilever Depot (Ahmedabad)",
      costPrice: "165.00",
      sellingPrice: "195.00",
      stock: 18,
      minStock: 5,
      hsnCode: "3808",
      gstRate: "18",
    },
  ];

  const createdProducts: Array<{
    id: string;
    name: string;
    sellingPrice: string;
    costPrice: string;
    hsnCode: string;
    gstRate: string;
  }> = [];

  for (const item of productsList) {
    const categoryId = catMap.get(item.category) || null;
    const supplierId = supMap.get(item.supplier) || null;

    // Create product
    const [p] = await db
      .insert(products)
      .values({
        storeId,
        name: item.name,
        sku: item.sku,
        barcode: item.barcode,
        categoryId,
        costPrice: item.costPrice,
        sellingPrice: item.sellingPrice,
        hsnCode: item.hsnCode,
        gstRate: item.gstRate,
        isActive: true,
      })
      .returning();

    createdProducts.push({
      id: p.id,
      name: p.name,
      sellingPrice: item.sellingPrice,
      costPrice: item.costPrice,
      hsnCode: item.hsnCode,
      gstRate: item.gstRate,
    });

    // Create inventory record
    await db.insert(inventory).values({
      storeId,
      productId: p.id,
      currentStock: item.stock,
      minStock: item.minStock,
      safetyStock: Math.ceil(item.minStock * 0.8),
    });

    // Link product to supplier
    if (supplierId) {
      await db.insert(supplierProducts).values({
        supplierId,
        productId: p.id,
        leadTimeDays: 2,
        moq: 6,
        cost: item.costPrice,
      });
    }
  }
  console.log(`✓ ${createdProducts.length} authentic retail products and inventory records created.`);

  // 6. Seed Recent Realistic Counter Sales (Last 3 days for Dashboard and Analytics)
  console.log("💰 Creating recent counter sales history...");
  const today = new Date();
  const salesTimestamps = [
    new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000), // yesterday
    new Date(today.getTime() - 3 * 60 * 60 * 1000), // 3 hours ago
    new Date(today.getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
  ];

  for (let sIdx = 0; sIdx < salesTimestamps.length; sIdx++) {
    const saleDateStr = salesTimestamps[sIdx].toISOString().slice(0, 10);
    // Pick 3 items for each sale
    const sampleItems = [
      createdProducts[sIdx % createdProducts.length],
      createdProducts[(sIdx + 3) % createdProducts.length],
      createdProducts[(sIdx + 7) % createdProducts.length],
    ];

    let total = 0;
    let totalTax = 0;

    const itemsToInsert = sampleItems.map((prod) => {
      const qty = (sIdx % 2) + 1;
      const price = parseFloat(prod.sellingPrice);
      const lineTot = Math.round(qty * price * 100) / 100;
      const rate = Number(prod.gstRate || 0);

      // MRP inclusive tax
      let itemTax = 0;
      if (rate > 0) {
        const taxable = lineTot / (1 + rate / 100);
        itemTax = Math.round((lineTot - taxable) * 100) / 100;
      }

      total += lineTot;
      totalTax += itemTax;

      return {
        productId: prod.id,
        quantity: qty,
        unitPrice: prod.sellingPrice,
        lineTotal: lineTot.toFixed(2),
        hsnCode: prod.hsnCode,
        gstRate: prod.gstRate,
        taxAmount: itemTax.toFixed(2),
      };
    });

    total = Math.round(total * 100) / 100;
    totalTax = Math.round(totalTax * 100) / 100;
    const cgst = Math.round((totalTax / 2) * 100) / 100;
    const sgst = Math.round((totalTax - cgst) * 100) / 100;

    const [sale] = await db
      .insert(sales)
      .values({
        storeId,
        saleDate: saleDateStr,
        totalAmount: total.toFixed(2),
        cgstAmount: cgst.toFixed(2),
        sgstAmount: sgst.toFixed(2),
        totalTax: totalTax.toFixed(2),
        createdAt: salesTimestamps[sIdx],
      })
      .returning();

    for (const item of itemsToInsert) {
      await db.insert(saleItems).values({
        saleId: sale.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
        hsnCode: item.hsnCode,
        gstRate: item.gstRate,
        taxAmount: item.taxAmount,
        createdAt: salesTimestamps[sIdx],
      });
    }
  }
  console.log("✓ Sample sales history with GST & HSN seeded.");

  // 7. Seed Sample Notifications
  console.log("🔔 Creating store notifications...");
  await db.insert(notifications).values([
    {
      storeId,
      type: "LOW_STOCK",
      title: "Low Stock Alert: Whole Wheat Brown Bread",
      message: "Only 10 loaves remaining. Reorder recommended within 24 hours.",
      isRead: false,
    },
    {
      storeId,
      type: "EXPIRY_ALERT",
      title: "Perishable Expiry Notice: Amul Butter",
      message: "Batch batch-2401 expires in 8 days. Move to priority front rack.",
      isRead: false,
    },
    {
      storeId,
      type: "REORDER_RECOMMENDATION",
      title: "Fast-Moving Stock: Maggi Noodles 70g",
      message: "High demand velocity detected (18 units/day). Recommended reorder: 48 units.",
      isRead: true,
    },
  ]);
  console.log("✓ Notifications seeded.");

  console.log("\n==================================================");
  console.log("🎉 FRESH STORE DATA SETUP COMPLETE!");
  console.log("🏪 Store Name: Patel Super Market & Kirana");
  console.log(`📦 Total Products: ${productsList.length}`);
  console.log(`📂 Categories: ${catNames.length}`);
  console.log(`🚛 Suppliers: ${supplierData.length}`);
  console.log("⚡ All products are ready with genuine Indian EAN-13 barcodes!");
  console.log("==================================================\n");

  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
