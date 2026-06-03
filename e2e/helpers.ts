import { expect } from "@playwright/test";

export async function loginAs(page: any, email: string, password: string) {
  await page.goto("/login");
  await page.waitForSelector('input[placeholder="Enter your email"]', { timeout: 15000 });
  await page.fill('input[placeholder="Enter your email"]', email);
  await page.fill('input[placeholder="Enter your password"]', password);
  await page.click("button[type=submit]");
  await page.waitForURL("**/expenses", { timeout: 20000 });
  await expect(page).not.toHaveURL(/\/login/);
}
