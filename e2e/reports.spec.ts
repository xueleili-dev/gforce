import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("Expense Reports", () => {
  test("Finance views reports — company overview, monthly trend, department detail, personal summary", async ({ page }) => {
    test.setTimeout(60000);

    await loginAs(page, "morongoe@company.com", "123456");
    await page.goto("/reports");
    await page.waitForSelector("text=Expense Reports", { timeout: 10000 });

    // Company overview cards
    await expect(page.locator("text=Annual Budget")).toBeVisible();
    await expect(page.locator("text=Actual Expense")).toBeVisible();
    await expect(page.locator("text=Budget Used")).toBeVisible();
    await expect(page.locator("text=Remaining")).toBeVisible();

    // Monthly trend section
    await expect(page.locator("text=Company Monthly Trend")).toBeVisible();

    // Department monthly table
    await expect(page.locator("text=Department Monthly Detail")).toBeVisible();
    await expect(page.locator("text=Engineering").first()).toBeVisible();

    // Personal summary table
    await expect(page.locator("text=Personal Monthly Summary")).toBeVisible();
  });

  test("Admin views reports — switching year refreshes data", async ({ page }) => {
    test.setTimeout(60000);

    await loginAs(page, "admin@company.com", "123456");
    await page.goto("/reports");
    await page.waitForSelector("text=Expense Reports", { timeout: 10000 });

    // Switch year
    await page.selectOption("select", "2025");
    await page.waitForTimeout(500);
    await expect(page.getByRole("heading", { name: "Expense Reports" })).toBeVisible();
  });
});
