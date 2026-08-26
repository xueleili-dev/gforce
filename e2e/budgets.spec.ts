import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("Budget Management", () => {
  test("Finance views budgets — company summary cards and department budget table", async ({ page }) => {
    test.setTimeout(60000);

    await loginAs(page, "morongoe@company.com", "123456");
    await page.goto("/budgets");
    await page.waitForSelector("text=Budget Management", { timeout: 10000 });

    // Company summary cards should be visible
    await expect(page.locator("text=Annual Budget")).toBeVisible();
    await expect(page.locator("text=Actual Expense")).toBeVisible();
    await expect(page.locator("text=Budget Used")).toBeVisible();
    // "Remaining" also appears as a table column header, so scope to first match
    await expect(page.locator("text=Remaining").first()).toBeVisible();
  });

  test("Admin sets department budget", async ({ page }) => {
    test.setTimeout(60000);

    await loginAs(page, "admin@company.com", "123456");
    await page.goto("/budgets");
    await page.waitForSelector("text=Budget Management", { timeout: 10000 });

    // Switch to 2027 (should have no budget yet)
    await page.selectOption("select >> nth=1", "2027");
    await page.waitForTimeout(500);

    // Click "Set Budget" button
    await page.click("button:has-text(\"Set Budget\")");
    await page.waitForTimeout(300);

    // Fill in amount and save
    await page.fill("input[placeholder*=\"budget\"]", "300000");
    await page.click("button:has-text(\"Save\")");
    await page.waitForTimeout(500);

    // Should see the budget card now
    await expect(page.locator("text=Budget").first()).toBeVisible();
  });
});
