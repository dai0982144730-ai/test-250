// Máy chủ riêng cho test e2e: CSDL trong RAM (gieo mới mỗi lần chạy), thư mục file/AI/email tạm,
// AI tắt, bộ hẹn giờ tắt. KHÔNG đụng data/pgdata, data/files hay cấu hình AI thật.
// Playwright gọi file này (xem playwright.config.ts). Chạy tay: node tests/e2e/may-chu.mjs
//
// E2E_PORT=3104          cổng máy chủ (mặc định 3104)
// E2E_PORTS=3104,3105    dựng NHIỀU máy chủ, mỗi cổng một CSDL RAM riêng, dùng chung MỘT bản build
//                        (kịch bản vận hành chạy trên CSDL sạch của riêng nó)
// E2E_CHE_DO=dev         chạy next dev thay vì build production
// E2E_DUNG_BAN_BUILD=1   dùng lại bản build có sẵn, không build lại
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CONG_DS = (process.env.E2E_PORTS || process.env.E2E_PORT || "3104")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
// Mặc định chạy bản build production (ổn định kể cả khi đang sửa code); E2E_CHE_DO=dev để chạy next dev
const CHE_DO = process.env.E2E_CHE_DO === "dev" ? "dev" : "prod";
const next = path.join(GOC, "node_modules", "next", "dist", "bin", "next");

/** Biến môi trường cho máy chủ ở một cổng: thư mục tạm riêng (dọn sạch mỗi lần chạy). */
function moiTruong(cong) {
  const tam = path.join(GOC, "tests", "e2e", ".tam", cong);
  fs.rmSync(tam, { recursive: true, force: true });
  for (const d of ["files", "xem-truoc", "ai", "email-thu"]) fs.mkdirSync(path.join(tam, d), { recursive: true });
  const env = {
    ...process.env,
    // Máy có thể đặt sẵn NODE_ENV=production trong shell — next dev sẽ hỏng nếu giữ nguyên
    NODE_ENV: CHE_DO === "prod" ? "production" : "development",
    // prod: một bản build dùng chung cho mọi cổng (next start chỉ đọc); dev: mỗi cổng một thư mục
    DIST_DIR: CHE_DO === "prod" ? ".next-e2e-build" : ".next-e2e" + (cong === "3104" ? "" : `-${cong}`),
    // Chuỗi rỗng: .env.local có khai DATABASE_URL cũng không được dùng (Next không đè biến đã có)
    DATABASE_URL: "",
    DOCFLOW_DB: "memory",
    DOCFLOW_FILES_DIR: path.join(tam, "files"),
    DOCFLOW_PREVIEW_DIR: path.join(tam, "xem-truoc"),
    DOCFLOW_AI_DATA: path.join(tam, "ai"),
    DOCFLOW_EMAIL_THU: "1",
    DOCFLOW_EMAIL_THU_THU_MUC: path.join(tam, "email-thu"),
    DOCFLOW_TAT_HEN_GIO: "1",
    DOCFLOW_URL: `http://localhost:${cong}`,
    AI_MODE: "off",
    AUTH_SECRET: "e2e-chi-dung-cho-kiem-thu-khong-dung-that-0123456789",
    NEXT_TELEMETRY_DISABLED: "1",
  };
  delete env.DOCFLOW_KHONG_GIEO_NGUOI_MAU;
  return { env, tam };
}

const chay = (args, env) => spawn(process.execPath, [next, ...args], { cwd: GOC, env, stdio: "inherit" });

const dsMoiTruong = CONG_DS.map((c) => ({ cong: c, ...moiTruong(c) }));

if (CHE_DO === "prod") {
  const env = dsMoiTruong[0].env;
  const coSan = fs.existsSync(path.join(GOC, env.DIST_DIR, "BUILD_ID"));
  if (!(process.env.E2E_DUNG_BAN_BUILD === "1" && coSan)) {
    const build = chay(["build"], env);
    const ma = await new Promise((r) => build.on("exit", r));
    if (ma !== 0) {
      console.error("[e2e] next build thất bại");
      process.exit(ma ?? 1);
    }
  }
}

const con = dsMoiTruong.map(({ cong, env, tam }) => {
  console.log(`[e2e] Máy chủ test (${CHE_DO}) tại http://localhost:${cong} — CSDL RAM, dữ liệu tạm ở ${tam}`);
  const p = chay(CHE_DO === "prod" ? ["start", "-p", cong] : ["dev", "-p", cong], env);
  // Một máy chủ chết thì dừng cả nhóm (Playwright sẽ báo lỗi thay vì treo)
  p.on("exit", (ma) => {
    dung();
    process.exit(ma ?? 0);
  });
  return p;
});

function dung() {
  for (const p of con) if (!p.killed) p.kill();
}
process.on("SIGINT", dung);
process.on("SIGTERM", dung);
process.on("exit", dung);
