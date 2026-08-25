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
    launchOptions: {
      args: ["--disable-dev-shm-usage", "--no-sandbox"],
    },
  },
});
