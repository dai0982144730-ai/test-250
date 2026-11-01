// GET /api/ai/status — trạng thái kết nối AI hiện hành (pm | engineer).
// - cli: LUÔN dò (reset cache + hỏi CLI installed/loggedIn) bất kể mode đang lưu
//   là gì — người dùng cần thấy đèn trạng thái + nút Cài đặt/Đăng nhập NGAY khi
//   vừa tick chọn chế độ Claude Pro/Max, trước lúc bấm Lưu.
// - api: chỉ trả khi mode "api" (provider + model hiệu lực + key đã mask)
// Không bao giờ trả token/key đầy đủ về client.

import { NextResponse } from "next/server";
import {
  checkCliStatus,
  effectiveModel,
  getAIConfig,
  maskApiKey,
  resetClaudeBinaryCache,
} from "@/lib/ai/providers";
import { requireRole } from "@/lib/route-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const auth = await requireRole("xem");
  if (!auth.ok) return auth.response;

  const cfg = getAIConfig();

  let cli: {
    installed: boolean;
    loggedIn: boolean;
    version?: string;
    plan?: string;
  } | null = null;
  // Reset cache trước mỗi status-check — nhận diện CLI vừa cài/gỡ trong phiên
  resetClaudeBinaryCache();
  try {
    const status = await checkCliStatus();
    cli = {
      installed: status.installed,
      loggedIn: status.loggedIn,
      ...(status.version ? { version: status.version } : {}),
      ...(status.plan ? { plan: status.plan } : {}),
    };
  } catch {
    cli = { installed: false, loggedIn: false };
  }

  const api =
    cfg.mode === "api"
      ? {
          provider: cfg.provider,
          model: effectiveModel(cfg),
          keyMasked: maskApiKey(cfg.apiKey),
        }
      : null;

  return NextResponse.json({ ok: true, mode: cfg.mode, cli, api });
}
