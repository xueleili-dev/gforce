import { test, expect } from "@playwright/test";

async function login(page: any, email: string, password: string) {
  await page.goto("/login");
  await page.waitForSelector('input[placeholder="Enter your email"]', { timeout: 15000 });
  await page.fill('input[placeholder="Enter your email"]', email);
  await page.fill('input[placeholder="Enter your password"]', password);
  await page.click("button[type=submit]");
  await page.waitForURL("**/expenses", { timeout: 20000 });
  await expect(page).not.toHaveURL(/\/login/);
}

test.describe("Expense Approval Flow", () => {
  test("Login → Submit → Approve → Pay", async ({ page }) => {
    test.setTimeout(120000);

    // employee login & submit
    await login(page, "user@company.com", "123456");

    await page.goto("/expenses/new");
    await page.waitForSelector("input[placeholder*=\"Beijing\"]", { timeout: 10000 });
    await page.fill("input[placeholder*=\"Beijing\"]", "E2E Test Travel");
    await page.fill("input[type=number]", "5000");
    await page.fill("textarea", "E2E test expense description");
    await page.click("button:has-text(\"Submit for Approval\")");
    await page.waitForFunction(() => !window.location.href.includes("/new"), { timeout: 15000 });
    await page.waitForTimeout(300);

    // manager login & approve
    await login(page, "lichaba@company.com", "123456");
    await page.goto("/approvals");
    await page.waitForTimeout(500);
    await page.waitForSelector("button:has-text(\"Approve\")", { timeout: 15000 });
    await page.click("button:has-text(\"Approve\")");

    // dept head login & approve
    await login(page, "lee@company.com", "123456");
    await page.goto("/approvals");
    await page.waitForTimeout(500);
    await page.waitForSelector("button:has-text(\"Approve\")", { timeout: 15000 });
    await page.click("button:has-text(\"Approve\")");

    // finance login & approve
    await login(page, "morongoe@company.com", "123456");
    await page.goto("/approvals");
    await page.waitForTimeout(500);
    await page.waitForSelector("button:has-text(\"Approve\")", { timeout: 15000 });
    await page.click("button:has-text(\"Approve\")");
    await page.waitForTimeout(500);
  });

  test("Login → Submit → Manager Reject", async ({ page }) => {
    test.setTimeout(120000);

    // employee login & submit
    await login(page, "user@company.com", "123456");

    await page.goto("/expenses/new");
    await page.waitForSelector("input[placeholder*=\"Beijing\"]", { timeout: 10000 });
    await page.fill("input[placeholder*=\"Beijing\"]", "Test Reject");
    await page.fill("input[type=number]", "3000");
    await page.fill("textarea", "Test reject");
    await page.click("button:has-text(\"Submit for Approval\")");
    await page.waitForFunction(() => !window.location.href.includes("/new"), { timeout: 15000 });
    await page.waitForTimeout(300);

    // manager login & reject
    await login(page, "lichaba@company.com", "123456");
    await page.goto("/approvals");
    await page.waitForTimeout(500);
    await page.waitForSelector("button:has-text(\"Reject\")", { timeout: 15000 });

    page.on("dialog", (dialog) => dialog.accept("Not appropriate"));
    await page.click("button:has-text(\"Reject\")");
    await page.waitForTimeout(500);
  });
});
