// /api/tro-ly/model — nút chọn MODEL của trợ lý (S8 tầng 2, lệnh Mr. Đại 05/09)
// GET  : mọi user → { ok, mode, hienTai, danhSach: [{id, nhan}] }
// POST : pm|engineer { model } → ghi settings.json (aiModel) — áp dụng NGAY câu
//        chat sau (mọi hàm đọc getAIConfig mỗi lần gọi, không cache)

import { NextResponse } from "next/server";
import { writeConfig } from "@/lib/appconfig";
import { effectiveModel, getAIConfig } from "@/lib/ai/providers";
import { requireRole } from "@/lib/route-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface MotModel {
  id: string;
  nhan: string;
}

/** Danh sách model chọn được theo cấu hình hiện tại — KHÔNG bịa: CLI dùng 3
 *  bí danh chính CLI hỗ trợ (--model); mode api hỏi thẳng provider /models. */
async function danhSachModel(): Promise<{ danhSach: MotModel[]; ghiChu: string }> {
  const cfg = getAIConfig();
  if (cfg.mode === "claude-cli") {
    return {
      danhSach: [
        { id: "", nhan: "Mặc định CLI" },
        { id: "opus", nhan: "Opus — mạnh nhất, chậm/đắt" },
        { id: "sonnet", nhan: "Sonnet — cân bằng" },
        { id: "haiku", nhan: "Haiku — nhanh/rẻ" },
      ],
      ghiChu: "Đang chạy Claude CLI — chọn bí danh model CLI hỗ trợ.",
    };
  }
  // mode api — hỏi provider
  try {
    let url: string;
    let headers: Record<string, string>;
    if (cfg.provider === "anthropic") {
      url = "https://api.anthropic.com/v1/models";
      headers = { "x-api-key": cfg.apiKey, "anthropic-version": "2023-06-01" };
    } else {
      const goc =
        cfg.provider === "custom"
          ? cfg.baseUrl
          : {
              openai: "https://api.openai.com/v1",
              gemini: "https://generativelanguage.googleapis.com/v1beta/openai",
              grok: "https://api.x.ai/v1",
              deepseek: "https://api.deepseek.com/v1",
            }[cfg.provider];
      url = `${goc}/models`;
      headers = { authorization: `Bearer ${cfg.apiKey}` };
    }
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const j = (await res.json()) as { data?: { id?: string }[] };
    const ds = (j.data ?? [])
      .map((m) => m.id ?? "")
      .filter((id) => id !== "")
      .slice(0, 25)
      .map((id) => ({ id, nhan: id }));
    return {
      danhSach: [{ id: "", nhan: "Mặc định provider" }, ...ds],
      ghiChu: `Danh sách lấy thật từ ${cfg.provider}.`,
    };
  } catch (e) {
    return {
      danhSach: [{ id: "", nhan: "Mặc định provider" }],
      ghiChu: `Không lấy được danh sách model (${e instanceof Error ? e.message : "?"}) — vẫn đổi được bằng ô Cài đặt → Kết nối AI.`,
    };
  }
}

export async function GET(): Promise<NextResponse> {
  const auth = await requireRole("xem");
  if (!auth.ok) return auth.response;
  const cfg = getAIConfig();
  const { danhSach, ghiChu } = await danhSachModel();
  return NextResponse.json({
    ok: true,
    mode: cfg.mode,
    daCauHinh: cfg.mode !== "off",
    dangChon: cfg.model,
    hienTai: cfg.mode === "claude-cli" ? cfg.model || "Mặc định CLI" : effectiveModel(cfg),
    danhSach,
    ghiChu,
  });
}

export async function POST(req: Request): Promise<NextResponse> {
  const auth = await requireRole("ghi", "Người xem không đổi được model trợ lý (ảnh hưởng chi phí) — cần loại Người dùng trở lên.");
  if (!auth.ok) return auth.response;
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, message: "Body không phải JSON." }, { status: 400 });
  }
  const model = typeof body.model === "string" ? body.model.trim() : null;
  // "" = về mặc định; có giá trị thì chỉ nhận ký tự tên model thông thường
  if (model === null || (model !== "" && !/^[\w.\-:/]{1,100}$/.test(model))) {
    return NextResponse.json({ ok: false, message: "Tên model không hợp lệ." }, { status: 400 });
  }
  writeConfig({ aiModel: model });
  const cfg = getAIConfig();
  return NextResponse.json({
    ok: true,
    hienTai: cfg.mode === "claude-cli" ? cfg.model || "Mặc định CLI" : effectiveModel(cfg),
    dangChon: cfg.model,
  });
}
