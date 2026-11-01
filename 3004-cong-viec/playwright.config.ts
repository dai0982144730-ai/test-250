// Bộ test e2e (Playwright) — xem tests/e2e/README.md.
// Chạy: npm run e2e   (tự dựng máy chủ test, CSDL RAM, không đụng dữ liệu thật)
//
// Hai nhóm test, mỗi nhóm một máy chủ + CSDL riêng (dùng chung một bản build):
//   - "chung":   file 01–14, cổng E2E_PORT (mặc định 3104)
//   - "kich-ban": kịch bản vận hành 15-…, cổng E2E_PORT + 1 — chạy trên CSDL sạch, không lẫn dữ liệu của nhóm chung
// E2E_DUNG_MAY_CHU=1: không dựng máy chủ, chạy mọi nhóm trên máy chủ đang chạy sẵn ở E2E_PORT (vd máy chủ demo).
import { defineConfig, devices } from "@playwright/test";

const CONG = process.env.E2E_PORT || "3104";
const DUNG_MAY_CHU = process.env.E2E_DUNG_MAY_CHU === "1";
const CONG_KB = DUNG_MAY_CHU ? CONG : String(Number(CONG) + 1);
const url = (c: string) => `http://localhost:${c}`;

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: /.*\.spec\.ts$/,
  // Mọi test trong một nhóm dùng chung một CSDL RAM → chạy tuần tự theo thứ tự tên file
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  globalSetup: "./tests/e2e/chuan-bi-chung.ts",
  outputDir: "test-results/e2e",
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    locale: "vi-VN",
    timezoneId: "Asia/Ho_Chi_Minh",
    viewport: { width: 1440, height: 900 },
    navigationTimeout: 90_000,
    actionTimeout: 20_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chung",
      testIgnore: /15-kich-ban-van-hanh/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, baseURL: url(CONG) },
    },
    {
      name: "kich-ban",
      testMatch: /15-kich-ban-van-hanh\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, baseURL: url(CONG_KB) },
    },
  ],
  webServer: DUNG_MAY_CHU
    ? { command: "node -e \"setInterval(()=>{},1<<30)\"", url: `${url(CONG)}/login`, reuseExistingServer: true }
    : [
        {
          // Một tiến trình dựng cả hai máy chủ (build một lần), chờ cổng nhóm chung
          command: "node tests/e2e/may-chu.mjs",
          env: { E2E_PORTS: `${CONG},${CONG_KB}` },
          url: `${url(CONG)}/login`,
          reuseExistingServer: false,
          // Gồm cả next build (~2–3 phút, lâu hơn khi máy đang bận)
          timeout: 600_000,
          stdout: "ignore",
          stderr: "pipe",
        },
        {
          // Máy chủ kịch bản do lệnh trên dựng; mục này chỉ chờ cổng sẵn sàng
          command: "node -e \"setInterval(()=>{},1<<30)\"",
          url: `${url(CONG_KB)}/login`,
          // Cổng thường đã lên (do lệnh trên) → dùng luôn, không coi là "cổng bận"
          reuseExistingServer: true,
          timeout: 600_000,
        },
      ],
});
