// ============================================================
// POST /api/bang-dieu-hanh/mau-thuan-cheo/nhan-dinh
//   body: { du_an, loai: "ho-so" | "nghiem-thu", wbs }
// 🤖 J12 (22/09) — LLM nhận định MỘT dòng mâu thuẫn: tin bên nào, vì sao, ai
// làm gì. Người bấm mới chạy (vai ③ của LLM). Trả kèm chi phí thật.
// ============================================================

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/route-auth";
import { chayVoiNguoiGoiAi } from "@/lib/ai/moi-truong-ai";
import { nhanDinhMotDong } from "@/lib/bang-dieu-hanh/nhan-dinh-mau-thuan";
import { bocRouteTrang } from "@/lib/nhat-ky/so";
import { boLocMatCuaNguoi } from "@/lib/agent-mat-tren-main";
import { agentMatCuaLoaiMauThuan, cauAnMat } from "@/lib/agent-mat-loc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function xuLyPOST(req: Request) {
  // Gọi LLM tốn tiền = cửa "ghi" (quyen.ts) — Người xem không chạy được
  const auth = await requireRole("ghi");
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, thong_diep: "Yêu cầu không phải JSON." });
  }
  const duAn = String(body.du_an ?? "").trim();
  const wbs = String(body.wbs ?? "").trim();
  const loai = body.loai === "ho-so" || body.loai === "nghiem-thu" ? body.loai : null;
  if (duAn === "" || wbs === "" || loai === null) {
    return NextResponse.json({ ok: false, thong_diep: "Thiếu du_an, wbs hoặc loai (ho-so | nghiem-thu)." });
  }
  // ⭐ 05/10 luật agent mật: loại "nghiệm thu" đọc chứng cứ Agent Hợp đồng — người không được thấy hợp đồng
  // của dự án này thì không cho LLM đọc hộ
  const agentMat = agentMatCuaLoaiMauThuan(loai);
  if (agentMat && !boLocMatCuaNguoi(auth.session.email, auth.session.role).thay(agentMat, duAn)) {
    return NextResponse.json({ ok: false, thong_diep: cauAnMat(agentMat) }, { status: 403 });
  }
  const kq = await chayVoiNguoiGoiAi(auth.session.email, () => nhanDinhMotDong(duAn, loai, wbs, auth.session.email));
  if (!kq.ok) return NextResponse.json({ ok: false, thong_diep: kq.loi ?? "Chưa giải thích được." });
  return NextResponse.json({ ok: true, nhanDinh: kq.nhanDinh });
}

// ⭐ Khuôn sổ bản 2 (7.1): một lần gọi = MỘT chuỗi — mọi lượt hỏi agent khác chung mã chuỗi
export const POST = bocRouteTrang("/api/bang-dieu-hanh/mau-thuan-cheo/nhan-dinh", xuLyPOST);
