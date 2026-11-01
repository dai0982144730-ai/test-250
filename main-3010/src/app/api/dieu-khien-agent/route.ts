// ============================================================
// /api/dieu-khien-agent — bật / tắt agent ngay từ Main
//
// Thay `BAT-5-AGENT.bat` bằng một cái nút, theo yêu cầu 06/09/2026 của
// Mr. Thịnh: *"chạy 1 giao diện chính rồi bật các agent … đỡ mất công phải
// chạy từng agent"*.
//
//   GET            → trạng thái từng con: đang chạy chưa, Main có bật hộ được
//                    không, nếu không thì VÌ SAO.
//   POST {ma, viec} → viec = "bat" | "tat".
//
// ⛔ Route này CHẠY LỆNH HỆ ĐIỀU HÀNH nên khoá chặt hơn mọi route khác:
//   · Chỉ vai PM — cùng mức với nút "Chạy test tất cả" bên con quan sát.
//   · Chỉ bật được con khai trong danh bạ. Không nhận đường dẫn tuỳ ý từ
//     trình duyệt — mọi thứ tra ngược từ `docDanhBaAgent()`.
//   · Chỉ bật được con có địa chỉ trỏ về máy này (xem `lyDoKhongBatDuoc`).
//
// Luôn HTTP 200 kèm lý do tiếng Việt, kể cả khi từ chối — luật
// HOP-DONG-KET-NOI §5, để màn hình không bao giờ phải đoán.
// ============================================================

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/route-auth";
import { docDanhBaAgent } from "@/lib/cai-dat-base";
import { batAgent, tatAgent, trangThaiCacAgent } from "@/lib/dieu-khien-agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHI_PM = "Chỉ vai PM được bật/tắt agent, vì việc này cho máy chủ chạy lệnh.";

export async function GET() {
  const auth = await requireRole("xem");
  if (!auth.ok) return auth.response;

  try {
    const danhBa = docDanhBaAgent();
    return NextResponse.json({
      ok: true,
      mayNay: true,
      trangThai: await trangThaiCacAgent(danhBa),
    });
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    return NextResponse.json({
      ok: false,
      loi: `Không đọc được trạng thái các agent: ${m}`,
      trangThai: [],
    });
  }
}

export async function POST(req: Request) {
  const auth = await requireRole("caidat", CHI_PM);
  if (!auth.ok) return auth.response;

  let body: { ma?: string; viec?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, noi: "Body phải là JSON." });
  }

  const ma = (body.ma ?? "").trim();
  const viec = (body.viec ?? "").trim();

  if (ma === "") return NextResponse.json({ ok: false, noi: "Thiếu mã agent." });
  if (viec !== "bat" && viec !== "tat") {
    return NextResponse.json({ ok: false, noi: 'Trường "viec" phải là "bat" hoặc "tat".' });
  }

  try {
    if (viec === "tat") return NextResponse.json(tatAgent(ma));

    // Tra ngược từ danh bạ — KHÔNG tin đường dẫn nào gửi từ trình duyệt.
    const khai = docDanhBaAgent().find((a) => a.ma === ma);
    if (!khai) {
      return NextResponse.json({
        ok: false,
        noi: `Không có con nào mã "${ma}" trong danh bạ. Vào Cài đặt → Danh bạ agent khai trước.`,
      });
    }
    return NextResponse.json(batAgent(khai));
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, noi: `Lỗi khi ${viec === "bat" ? "bật" : "tắt"} ${ma}: ${m}` });
  }
}
