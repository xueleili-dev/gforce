import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  retries: 1,
  workers: 1,
  webServer: {
    command: "npm run start",
    port: 3000,
    reuseExistingServer: true,
  },
  use: {
    baseURL: "http://localhost:3000",
    // Use the full Chromium build ("new headless") instead of the stripped
    // chromium-headless-shell, which crashes the renderer on the login redirect
    // in CI ("page.waitForURL: Navigation failed because page crashed!").
    channel: "chromium",
    launchOptions: {
      args: ["--disable-dev-shm-usage", "--no-sandbox", "--disable-gpu"],
    },
  },
});
