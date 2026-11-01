import { defineConfig } from "vitest/config";
import path from "path";
import { THU_MUC_DU_LIEU_TEST } from "./tests/ho-tro/thu-muc-du-lieu";

// Bộ test chạy trên BẢN SAO của `data/` trong thư mục tạm, không phải bản thật.
// globalSetup dựng bản sao; THU_MUC_DU_LIEU đưa đường dẫn đó vào mọi worker để
// gocDuLieu() (src/lib/goc-du-lieu.ts) trỏ sang. Đặt luôn vào process.env của
// tiến trình chính để globalSetup lấy cùng một đường dẫn.
process.env.THU_MUC_DU_LIEU = THU_MUC_DU_LIEU_TEST;

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    globalSetup: ["tests/ho-tro/ban-sao-du-lieu.ts"],
    // CAM_CLI_THAT: test KHÔNG BAO GIỜ gọi Claude CLI thật (providers.ts spawnClaude chặn) — Quản lý token AI 04/10
    env: { THU_MUC_DU_LIEU: THU_MUC_DU_LIEU_TEST, CAM_CLI_THAT: "1" },
  },
});
