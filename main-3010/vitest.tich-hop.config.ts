// Cấu hình riêng cho bộ NGHIỆM THU KẾT NỐI (tests/tich-hop).
// Tách khỏi vitest.config.ts vì bộ này gọi agent tiến độ THẬT và chạy lâu
// (bài 7 mất ~20 giây), không nên nằm chung với `npm test` chạy mỗi lần sửa code.
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    include: ["tests/tich-hop/**/*.test.ts"],
    testTimeout: 90_000,
    hookTimeout: 30_000,
    fileParallelism: false, // ngắt mạch là trạng thái cấp module — chạy tuần tự
  },
});
