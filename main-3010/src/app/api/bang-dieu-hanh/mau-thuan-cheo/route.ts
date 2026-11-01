// ============================================================
// GET /api/bang-dieu-hanh/mau-thuan-cheo?du_an=<mã>[&lam_moi=1]
// Khối "Chỗ hai agent nói khác nhau" (B11, 22/09/2026) — tách khỏi lượt tải
// trang vì hỏi tới ~60 lượt ba cổng; thẻ trên Bảng điều hành tự gọi khi mở.
// ============================================================

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/route-auth";
import { gomMauThuanCheo } from "@/lib/bang-dieu-hanh/mau-thuan-cheo";
import { nhanDinhDaCo, uocChiPhiNhanDinh } from "@/lib/bang-dieu-hanh/nhan-dinh-mau-thuan";
import { bocRouteTrang } from "@/lib/nhat-ky/so";
import { boLocMatCuaToi } from "@/lib/agent-mat-tren-main";
import { locMauThuan, locNhanDinhMauThuan } from "@/lib/agent-mat-loc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function xuLyGET(req: Request) {
  const auth = await requireRole("xem");
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const duAn = (url.searchParams.get("du_an") ?? "").trim();
  if (duAn === "") {
    return NextResponse.json({ ok: false, thong_diep: "Thiếu mã dự án (du_an)." });
  }
  const ket = await gomMauThuanCheo(duAn, url.searchParams.get("lam_moi") === "1");
  // ⭐ 05/10 luật agent mật: bên Hợp đồng chỉ hiện cho người được thấy hợp đồng của dự án này
  const loc = await boLocMatCuaToi();
  // J12: ước chi phí nút 🤖 (hiện TRƯỚC khi bấm) + nhận định đã viết (mở lại không tốn lượt)
  return NextResponse.json({
    ok: true,
    ket: locMauThuan(ket, loc),
    uoc: uocChiPhiNhanDinh(),
    nhanDinh: locNhanDinhMauThuan(nhanDinhDaCo(duAn), duAn, loc),
  });
}

// ⭐ Khuôn sổ bản 2 (7.1): một lần gọi = MỘT chuỗi — mọi lượt hỏi agent khác chung mã chuỗi
export const GET = bocRouteTrang("/api/bang-dieu-hanh/mau-thuan-cheo", xuLyGET);
