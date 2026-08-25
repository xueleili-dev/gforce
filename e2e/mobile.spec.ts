import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("Mobile Responsive", () => {
  test.use({ viewport: { width: 375, height: 812 } }); // iPhone X

  test("Hamburger menu open and close", async ({ page }) => {
    test.setTimeout(60000);

    await loginAs(page, "user@company.com", "123456");

    // Hamburger button visible on mobile
    const hamburger = page.locator("button[aria-label=\"Menu\"]");
    await expect(hamburger).toBeVisible();

    // Overlay backdrop NOT visible before tapping hamburger
    await expect(page.locator(".bg-black\\/50")).not.toBeVisible();

    // Tap hamburger → overlay opens
    await hamburger.click();
    await page.waitForTimeout(400);

    // Backdrop visible
    await expect(page.locator(".bg-black\\/50")).toBeVisible();

    // "Logout" link visible in overlay
    await expect(page.locator("nav button", { hasText: "Logout" }).last()).toBeVisible();

    // Tap backdrop to the right of sidebar → overlay closes
    await page.locator(".bg-black\\/50").click({ position: { x: 300, y: 400 } });
    await page.waitForTimeout(300);
    await expect(page.locator(".bg-black\\/50")).not.toBeVisible();
  });

  test("Mobile expense list supports search and filter", async ({ page }) => {
    test.setTimeout(60000);

    await loginAs(page, "user@company.com", "123456");
    await page.goto("/expenses");
    await page.waitForTimeout(500);

    // Search input visible
    await expect(page.locator("input[placeholder*=\"Search\"]")).toBeVisible();

    // Filter button visible and clickable
    await page.click("button:has-text(\"Filter\")");
    await page.waitForTimeout(300);
    await expect(page.locator("text=Start Date")).toBeVisible();
    await expect(page.locator("text=Min Amount")).toBeVisible();
  });

  test("Mobile notification bell visible", async ({ page }) => {
    test.setTimeout(60000);

    await loginAs(page, "user@company.com", "123456");
    await page.goto("/");
    await page.waitForTimeout(500);

    // Bell icon links to /notifications
    const bell = page.locator("header a[href=\"/notifications\"]");
    await expect(bell).toBeVisible();
  });

  test("Mobile new expense form is complete", async ({ page }) => {
    test.setTimeout(60000);

    await loginAs(page, "user@company.com", "123456");
    await page.goto("/expenses/new");
    await page.waitForTimeout(500);

    await expect(page.getByText("New Expense Request")).toBeVisible();
    await expect(page.locator("input[placeholder*=\"Beijing\"]")).toBeVisible();
    await expect(page.locator("input[type=number]")).toBeVisible();
    await expect(page.locator("textarea")).toBeVisible();
  });

  test("Mobile sidebar links navigate correctly", async ({ page }) => {
    test.setTimeout(60000);

    await loginAs(page, "user@company.com", "123456");
    await page.goto("/");
    await page.waitForTimeout(300);

    // Open sidebar
    await page.locator("button[aria-label=\"Menu\"]").click();
    await page.waitForTimeout(400);

    // Click "Notifications" in overlay → navigates to /notifications
    const notifLink = page.locator("nav a:has-text(\"Notifications\")");
    await notifLink.last().click();
    await page.waitForURL("**/notifications", { timeout: 10000 });

    // Should be on notifications page
    await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible();
  });
});
