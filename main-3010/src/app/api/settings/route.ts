// GET/POST /api/settings — đọc/ghi cấu hình kết nối lưu tại data/settings.json.
// Cửa "caidat" (PM, Admin — src/lib/quyen.ts).
//
// - GET: trả cấu hình đã MASK (token/key chỉ hiện 4 ký tự cuối "••••abcd") +
//   cờ hasValue từng trường. KHÔNG BAO GIỜ trả token đầy đủ về client.
// - POST {key, value}: value đã trim; rỗng = xóa key; ghi xong hiệu lực NGAY
//   (các tầng integrations đọc data/settings.json mỗi lần gọi, không cần restart).

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/route-auth";
import {
  APP_CONFIG_KEYS,
  type AppConfigKey,
  getSetting,
  writeConfig,
} from "@/lib/appconfig";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Tên biến môi trường fallback tương ứng từng key cấu hình */
const ENV_NAMES: Record<AppConfigKey, string> = {
  scheduleSource: "SCHEDULE_SOURCE",
  aiMode: "AI_MODE",
  aiProvider: "AI_PROVIDER",
  aiApiKey: "AI_API_KEY",
  aiModel: "AI_MODEL",
  aiBaseUrl: "AI_BASE_URL",
  baseTokenWework: "BASE_TOKEN_WEWORK",
  baseTokenWorkflow: "BASE_TOKEN_WORKFLOW",
  baseTokenRequest: "BASE_TOKEN_REQUEST",
  baseTokenHrm: "BASE_TOKEN_HRM",
  baseTokenAccount: "BASE_TOKEN_ACCOUNT",
  braveSearchKey: "BRAVE_SEARCH_API_KEY",
};

/** Các trường bí mật — GET chỉ trả dạng mask "••••abcd" */
const SECRET_KEYS: ReadonlySet<AppConfigKey> = new Set<AppConfigKey>([
  "aiApiKey",
  // 5 khoá Base.vn — chỉ hiện ••••abcd, không bao giờ trả token đầy đủ
  "baseTokenWework",
  "baseTokenWorkflow",
  "baseTokenRequest",
  "baseTokenHrm",
  "baseTokenAccount",
]);

export interface SettingsField {
  /** Trường bí mật: "••••abcd" (4 ký tự cuối); trường thường: giá trị đầy đủ; rỗng: "" */
  value: string;
  hasValue: boolean;
}

export interface SettingsGetResponse {
  ok: true;
  fields: Record<AppConfigKey, SettingsField>;
}

function maskSecret(value: string): string {
  const clean = value.replace(/\s+/g, "");
  if (clean.length <= 4) return "••••";
  return `••••${clean.slice(-4)}`;
}

export async function GET(): Promise<NextResponse> {
  const auth = await requireRole("caidat");
  if (!auth.ok) return auth.response;

  const fields = {} as Record<AppConfigKey, SettingsField>;
  for (const key of APP_CONFIG_KEYS) {
    // Giá trị hiệu lực = settings.json ưu tiên, fallback env — để UI biết
    // trường nào đã cấu hình (kể cả khi cấu hình nằm trong .env.local).
    const effective = getSetting(key, ENV_NAMES[key]);
    if (!effective) {
      fields[key] = { value: "", hasValue: false };
    } else {
      fields[key] = {
        value: SECRET_KEYS.has(key) ? maskSecret(effective) : effective,
        hasValue: true,
      };
    }
  }
  const body: SettingsGetResponse = { ok: true, fields };
  return NextResponse.json(body);
}

export async function POST(req: Request): Promise<NextResponse> {
  const auth = await requireRole("caidat");
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Body không phải JSON hợp lệ." },
      { status: 400 },
    );
  }

  const { key, value } = (body ?? {}) as { key?: unknown; value?: unknown };
  if (
    typeof key !== "string" ||
    !(APP_CONFIG_KEYS as readonly string[]).includes(key)
  ) {
    return NextResponse.json(
      { ok: false, message: `Key cấu hình không hợp lệ: "${String(key)}".` },
      { status: 400 },
    );
  }
  if (typeof value !== "string") {
    return NextResponse.json(
      { ok: false, message: "Giá trị phải là chuỗi (value: string)." },
      { status: 400 },
    );
  }

  // value.trim() rỗng = xóa key đó khỏi settings.json (quay về fallback env)
  writeConfig({ [key as AppConfigKey]: value.trim() });
  return NextResponse.json({ ok: true });
}
