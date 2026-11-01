// Khói giao diện kiem-tra-gui (JSX cần cấu hình riêng vì tsconfig để jsx: preserve).
// Chạy: npx vitest run --config tests/fixtures/giao-dien/vitest.config.mts
import { defineConfig } from "vitest/config";
import path from "path";
const R = "D:/Congty/CodeSCICongViec";
export default defineConfig({
  root: R,
  oxc: { jsx: { runtime: "automatic" } } as never,
  resolve: { alias: [
    { find: /^@sci\/identity$/, replacement: path.resolve(R, "packages/sci-identity/src/index.ts") },
    { find: /^@sci\/identity\/(.*)$/, replacement: path.resolve(R, "packages/sci-identity/src/$1") },
    { find: /^@\/(.*)$/, replacement: path.resolve(R, "src/$1") },
  ]},
  test: { include: ["tests/fixtures/giao-dien/**/*.test.ts"], testTimeout: 60000, hookTimeout: 60000, pool: "forks" },
});
