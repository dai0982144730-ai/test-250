import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@sci\/identity$/, replacement: path.resolve(__dirname, "packages/sci-identity/src/index.ts") },
      { find: /^@sci\/identity\/(.*)$/, replacement: path.resolve(__dirname, "packages/sci-identity/src/$1") },
      { find: /^@\/(.*)$/, replacement: path.resolve(__dirname, "src/$1") },
    ],
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    testTimeout: 60000,
    hookTimeout: 60000,
    // Mỗi file test một tiến trình riêng: CSDL RAM (PGlite) không đụng nhau
    pool: "forks",
    // Bộ file mẫu thử có kỳ rải từ tháng 7 đến tháng 9/2026: "ngày nộp" máy ghi (mẫu bản 6) lấy NGÀY ĐẦU KỲ của từng file,
    // không theo đồng hồ thật (test riêng về ngày nộp truyền ngay_nop cụ thể).
    // Luật "thiếu việc kỳ trước → chặn" (02/10) tắt cho các kịch bản cũ; tests/unit/chuoi-ky-truoc.test.ts tự bật lại
    // DOCFLOW_DB=memory: KHÔNG bài test nào được mở data/pgdata thật — 02/10 một bài test (danhDauHet → baoQuanTri → layQ) mở
    // database thật trong lúc app 3004 đang chạy → hai tiến trình cùng ghi → hỏng WAL, phải khôi phục bản sao lưu
    // CAM_CLI_THAT=1: không bài test nào được gọi Claude CLI thật (04/10: giả lập thiếu runAIGan → 6 lượt gọi thật) — providers.ts spawnClaude
    // DOCFLOW_CHO_NOP_WORD=1: bộ kịch bản cũ nộp báo cáo Word (mau-word/vi-du). Từ 22/10/2026 app chỉ nhận .xlsx khi nộp mới;
    // tests/unit/mau-excel*.test.ts kiểm đường Excel và tự tắt cờ để kiểm lời chặn Word
    env: { NGAY_NOP_THU: "dau-ky", TAT_CHUOI_KY_TRUOC: "1", DOCFLOW_DB: "memory", CAM_CLI_THAT: "1", DOCFLOW_CHO_NOP_WORD: "1" },
  },
});
