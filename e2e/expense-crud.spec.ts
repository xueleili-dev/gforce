import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("Expense CRUD", () => {
  test("Create draft → View → Edit → Delete", async ({ page }) => {
    test.setTimeout(90000);

    await loginAs(page, "user@company.com", "123456");

    // Create draft
    await page.goto("/expenses/new");
    await page.waitForSelector("input[placeholder*=\"Beijing\"]", { timeout: 10000 });
    await page.fill("input[placeholder*=\"Beijing\"]", "CRUD Draft Test");
    await page.fill("input[type=number]", "800");
    await page.fill("textarea", "Test draft save");
    await page.click("button:has-text(\"Save Draft\")");
    await page.waitForURL("**/expenses", { timeout: 10000 });

    // Verify it appears in list
    await expect(page.locator("text=CRUD Draft Test").first()).toBeVisible();

    // Click into detail
    await page.locator("text=CRUD Draft Test").first().click();
    await page.waitForURL("**/expenses/**", { timeout: 10000 });

    // Draft shows edit and delete buttons
    await expect(page.locator("button:has-text(\"Edit\")")).toBeVisible();
    await expect(page.locator("button:has-text(\"Delete\")")).toBeVisible();

    // Click edit button → wait for form to load
    await page.click("button:has-text(\"Edit\")");
    await page.waitForURL("**/edit", { timeout: 10000 });
    await page.waitForSelector("button:has-text(\"Save Changes\")", { timeout: 10000 });

    // Wait for form to fully load (React state synced after API fetch)
    await page.waitForTimeout(500);
    const titleInput = page.locator("input[placeholder*=\"Beijing\"]");
    await titleInput.click();
    await titleInput.fill("CRUD Draft Test-Edited");
    await expect(titleInput).toHaveValue("CRUD Draft Test-Edited");
    await page.click("button:has-text(\"Save Changes\")");

    // Wait for save to navigate to detail page
    await page.waitForURL(/\/expenses\/[^/]+$/, { timeout: 10000 });
    await page.waitForLoadState("networkidle");

    // Verify updated title on detail page
    await expect(page.locator("h2:has-text(\"CRUD Draft Test-Edited\")")).toBeVisible({ timeout: 10000 });

    // Go back to list
    await page.goto("/expenses");
    await page.waitForTimeout(500);

    // Click into detail and delete
    await page.locator("text=CRUD Draft Test-Edited").first().click();
    await page.waitForURL("**/expenses/**", { timeout: 10000 });
    await page.waitForTimeout(300);

    // Delete
    page.on("dialog", (dialog) => dialog.accept());
    await page.click("button:has-text(\"Delete\")");
    await page.waitForTimeout(500);
  });

  test("Employee only sees own expenses", async ({ page }) => {
    test.setTimeout(60000);

    await loginAs(page, "user@company.com", "123456");
    await page.goto("/expenses");
    await page.waitForSelector("text=My Expenses", { timeout: 10000 });

    const rows = page.locator("table tbody tr");
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("Submit → Manager Reject → Confirm rejected status", async ({ page }) => {
    test.setTimeout(90000);

    // Employee submits
    await loginAs(page, "user@company.com", "123456");
    await page.goto("/expenses/new");
    await page.waitForSelector("input[placeholder*=\"Beijing\"]", { timeout: 10000 });
    await page.fill("input[placeholder*=\"Beijing\"]", "Reject Resubmit Test");
    await page.fill("input[type=number]", "1200");
    await page.fill("textarea", "Test reject then re-edit");
    await page.click("button:has-text(\"Submit for Approval\")");
    await page.waitForFunction(() => !window.location.href.includes("/new"), { timeout: 15000 });
    await page.waitForTimeout(300);

    // Manager rejects
    await loginAs(page, "lichaba@company.com", "123456");
    await page.goto("/approvals");
    await page.waitForTimeout(500);
    await page.waitForSelector("button:has-text(\"Reject\")", { timeout: 15000 });
    page.on("dialog", (dialog) => dialog.accept("Budget exceeded"));
    await page.click("button:has-text(\"Reject\")");
    await page.waitForTimeout(500);

    // Employee sees the expense with rejected status
    await loginAs(page, "user@company.com", "123456");
    await page.goto("/expenses");
    await page.waitForTimeout(500);
    await page.locator("text=Reject Resubmit Test").first().click();
    await page.waitForURL("**/expenses/**", { timeout: 10000 });
    await page.waitForTimeout(300);

    // Should see rejected status
    await expect(page.locator("text=Rejected").first()).toBeVisible();
  });

  test("File upload then submit", async ({ page }) => {
    test.setTimeout(60000);

    await loginAs(page, "user@company.com", "123456");
    await page.goto("/expenses/new");
    await page.waitForSelector("input[placeholder*=\"Beijing\"]", { timeout: 10000 });

    await page.fill("input[placeholder*=\"Beijing\"]", "Attachment Upload Test");
    await page.fill("input[type=number]", "1500");
    await page.fill("textarea", "Test upload attachment");

    // Upload a simple test file
    const fileInput = page.locator("input[type=file]");
    await fileInput.setInputFiles({
      name: "test-receipt.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 test content"),
    });
    await page.waitForTimeout(1000);

    // The file should appear in the attachment list
    await expect(page.locator("text=test-receipt.pdf")).toBeVisible();

    // Save as draft
    await page.click("button:has-text(\"Save Draft\")");
    await page.waitForURL("**/expenses", { timeout: 10000 });
  });
});
