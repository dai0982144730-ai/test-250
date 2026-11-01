// Cấu hình ứng dụng nhập từ tab Cài đặt — lưu server-side tại data/settings.json.
// CHỈ chạy phía server (dùng node:fs). Không import file này vào Client Component.
//
// Nguyên tắc:
// - getSetting(key, envName): ưu tiên giá trị trong data/settings.json (đã trim,
//   bỏ chuỗi rỗng) → fallback process.env[envName]. Nhờ vậy PM dán token trong
//   app là chạy NGAY, còn .env.local vẫn dùng được làm fallback.
// - KHÔNG cache giá trị ở module-level: đọc file mỗi lần gọi (file vài trăm byte,
//   rẻ) — đảm bảo "lưu là chạy ngay" không cần restart server.
// - File hỏng/thiếu → coi như cấu hình rỗng, không throw.

import fs from "node:fs";
import path from "node:path";
import { gocDuLieu } from "@/lib/goc-du-lieu";

/** Danh sách key cấu hình được phép lưu — nguồn sự thật cho cả API /api/settings */
export const APP_CONFIG_KEYS = [
  // 26/09: bỏ 3 khoá Supabase — thẻ Supabase ở Cài đặt không nơi nào dùng
  // Nguồn tiến độ: "native" (tiến độ nội bộ — mặc định khi thiếu) | "smartsheet"
  "scheduleSource",
  // Kết nối AI: "claude-cli" | "api" | "off" (mặc định "off")
  "aiMode",
  // Nhà cung cấp khi aiMode = "api": anthropic | openai | gemini | grok | deepseek | custom
  "aiProvider",
  "aiApiKey",
  // Model — rỗng → dùng mặc định theo provider
  "aiModel",
  // Base URL — CHỈ dùng khi aiProvider = "custom"
  "aiBaseUrl",
  // Kết nối Base.vn — MỖI ỨNG DỤNG MỘT KHOÁ RIÊNG (khoá chỉ mở đúng 1 app).
  // Tên trường gửi lên Base luôn là access_token_v2. Xem src/lib/integrations/base/types.ts
  "baseTokenWework",
  "baseTokenWorkflow",
  "baseTokenRequest",
  "baseTokenHrm",
  "baseTokenAccount",
  // Tìm trên internet (06/09) — KHÔNG bắt buộc: thiếu khoá thì rơi về
  // SearXNG và DuckDuckGo, hai nhà này không cần đăng ký.
  "braveSearchKey",
] as const;

export type AppConfigKey = (typeof APP_CONFIG_KEYS)[number];

export type AppConfig = Partial<Record<AppConfigKey, string>>;

const DATA_DIR = gocDuLieu();
const CONFIG_FILE = path.join(DATA_DIR, "settings.json");

function isConfigKey(key: string): key is AppConfigKey {
  return (APP_CONFIG_KEYS as readonly string[]).includes(key);
}

/**
 * Đọc data/settings.json → AppConfig. Chỉ giữ các key hợp lệ có giá trị string
 * khác rỗng. File thiếu/hỏng (JSON lỗi, không phải object) → trả {}.
 */
export function readConfig(): AppConfig {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const config: AppConfig = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (isConfigKey(key) && typeof value === "string" && value.trim() !== "") {
        config[key] = value.trim();
      }
    }
    return config;
  } catch {
    return {};
  }
}

/**
 * Merge `partial` vào cấu hình hiện tại rồi ghi ra data/settings.json
 * (tự tạo thư mục data/ nếu chưa có). Giá trị rỗng/chỉ khoảng trắng = XÓA key đó.
 */
export function writeConfig(partial: AppConfig): void {
  const merged: AppConfig = { ...readConfig() };
  for (const key of APP_CONFIG_KEYS) {
    const value = partial[key];
    if (value === undefined) continue; // không đụng tới key này
    const trimmed = value.trim();
    if (trimmed === "") {
      delete merged[key];
    } else {
      merged[key] = trimmed;
    }
  }
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2) + "\n", "utf8");
}

/**
 * Lấy giá trị hiệu lực của 1 cấu hình: ưu tiên data/settings.json → fallback
 * process.env[envName]. Trả undefined nếu cả hai đều trống.
 */
export function getSetting(key: AppConfigKey, envName: string): string | undefined {
  const fromFile = readConfig()[key];
  if (fromFile) return fromFile; // readConfig đã trim + bỏ rỗng
  const fromEnv = process.env[envName]?.trim();
  return fromEnv ? fromEnv : undefined;
}
