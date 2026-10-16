import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests", workers: 1, timeout: 60000,
  use: { baseURL: process.env.COAST_URL || "http://localhost:3001", channel: "chrome", viewport:{width:1585,height:992}, deviceScaleFactor:1 },
  reporter: "list",
});
