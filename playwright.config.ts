import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 45000,
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  use: { baseURL: "http://127.0.0.1:3000", viewport: { width: 1440, height: 900 }, screenshot: "only-on-failure", launchOptions: { args: ["--no-sandbox"] } },
});
