const path = require("node:path");
const fs = require("node:fs");
const root = __dirname;
for (const directory of [".runtime/tmp", ".runtime/cache", ".runtime/config"]) fs.mkdirSync(path.join(root, directory), { recursive: true });
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(root, ".tooling/browsers");
process.env.TMPDIR = path.join(root, ".runtime/tmp");
process.env.XDG_CACHE_HOME = path.join(root, ".runtime/cache");
process.env.XDG_CONFIG_HOME = path.join(root, ".runtime/config");
const { defineConfig } = require("@playwright/test");
module.exports = defineConfig({
  testDir: "tests/browser", workers: 1, timeout: 30000,
  reporter: [["list"], ["json", { outputFile: "evidence/browser-results.json" }]],
  outputDir: ".runtime/browser-artifacts",
  use: { baseURL: "http://127.0.0.1:8057", browserName: "chromium", viewport: { width: 1440, height: 1100 }, locale: "ru-RU", timezoneId: "America/New_York", trace: "retain-on-failure" },
  webServer: { command: "PYTHONDONTWRITEBYTECODE=1 python3 server.py --port 8057 --no-watch", url: "http://127.0.0.1:8057/api/health", reuseExistingServer: false, timeout: 15000 },
});
