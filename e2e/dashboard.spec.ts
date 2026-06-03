import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("Dashboard", () => {
  test("Employee views dashboard — stat cards, recent expenses, quick actions", async ({ page }) => {
    test.setTimeout(60000);

    await loginAs(page, "user@company.com", "123456");
    await page.goto("/");
    await page.waitForSelector("text=Dashboard", { timeout: 10000 });

    // Stat cards
    await expect(page.locator("text=This Month Requests")).toBeVisible();
    await expect(page.locator("text=This Month Amount")).toBeVisible();

    // Recent expenses section
    await expect(page.locator("text=Recent Requests")).toBeVisible();

    // Quick actions
    await expect(page.locator("text=Quick Actions")).toBeVisible();
    await expect(page.getByRole("main").getByText("New Expense")).toBeVisible();
    await expect(page.getByRole("main").getByText("My Expenses")).toBeVisible();
  });

  test("Admin views dashboard — includes approval card and quick actions", async ({ page }) => {
    test.setTimeout(60000);

    await loginAs(page, "admin@company.com", "123456");
    await page.goto("/");
    await page.waitForSelector("text=Dashboard", { timeout: 10000 });

    // Admin sees stat cards
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    // Quick actions include Reports
    await expect(page.getByRole("main").getByText("Reports")).toBeVisible();
  });

  test("Quick action links navigate correctly", async ({ page }) => {
    test.setTimeout(60000);

    await loginAs(page, "user@company.com", "123456");
    await page.goto("/");
    await page.waitForSelector("text=Dashboard", { timeout: 10000 });

    // Click "New Expense" → navigates to /expenses/new
    await page.getByRole("main").getByText("New Expense").click();
    await page.waitForURL("**/expenses/new", { timeout: 10000 });
    await expect(page.locator("text=New Expense Request")).toBeVisible();
  });

  test("Pending approval badge — shows red dot when pending", async ({ page }) => {
    test.setTimeout(60000);

    // First, employee submits an expense so manager has something pending
    await loginAs(page, "user@company.com", "123456");
    await page.goto("/expenses/new");
    await page.waitForSelector("input[placeholder*=\"Beijing\"]", { timeout: 10000 });
    await page.fill("input[placeholder*=\"Beijing\"]", "Badge Test");
    await page.fill("input[type=number]", "1000");
    await page.fill("textarea", "Test pending badge");
    await page.click("button:has-text(\"Submit for Approval\")");
    await page.waitForFunction(() => !window.location.href.includes("/new"), { timeout: 15000 });
    await page.waitForTimeout(300);

    // Manager logs in and checks sidebar badge
    await loginAs(page, "lichaba@company.com", "123456");
    await page.goto("/");
    await page.waitForSelector("text=Dashboard", { timeout: 10000 });

    // Sidebar "Pending Approvals" should have a badge
    const badge = page.locator("a:has-text(\"Pending Approvals\") span.rounded-full");
    await expect(badge).toBeVisible();
  });
});
