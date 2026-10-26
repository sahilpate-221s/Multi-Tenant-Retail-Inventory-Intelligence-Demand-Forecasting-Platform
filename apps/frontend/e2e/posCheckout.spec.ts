import { test, expect } from "@playwright/test";

test.describe("POS Billing & Checkout Flow", () => {
  test("authenticates, scans/searches product, adds to cart, and completes checkout", async ({ page }) => {
    // 1. Visit POS page
    await page.goto("/pos");

    // If redirected to auth, login with credentials
    if (page.url().includes("/login") || page.url().includes("/auth")) {
      const emailInput = page.locator('input[type="email"]');
      const passwordInput = page.locator('input[type="password"]');
      if (await emailInput.isVisible()) {
        await emailInput.fill("owner@stockpilot.io");
        await passwordInput.fill("password123");
        await page.locator('button[type="submit"]').click();
        await page.waitForURL("**/pos", { timeout: 15000 });
      }
    }

    // 2. Barcode & Product search bar is visible
    const searchInput = page.locator('input[placeholder*="Scan barcode gun or type product"]');
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    // 3. Enter product barcode or SKU (Amul Butter: 8901030000014)
    await searchInput.fill("8901030000014");
    await page.keyboard.press("Enter");

    // 4. Verify item was added to the bill cart
    const cartItem = page.locator("text=Amul Salted Butter").first();
    await expect(cartItem).toBeVisible({ timeout: 8000 });

    // 5. Click Complete & Bill
    const completeButton = page.locator('button:has-text("Complete & Bill")');
    await expect(completeButton).toBeEnabled({ timeout: 5000 });
    await completeButton.click();

    // 6. Verify receipt modal is displayed with tax details
    const receiptModal = page.locator("text=Tax Invoice").or(page.locator("text=Official Cash Memo")).first();
    await expect(receiptModal).toBeVisible({ timeout: 10000 });
  });
});
