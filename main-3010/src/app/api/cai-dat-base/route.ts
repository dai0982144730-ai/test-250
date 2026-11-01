// ============================================================
// /api/cai-dat-base — đọc/ghi Cài đặt Agent Base
// GET  → cài đặt hiện tại (khoaBase luôn rỗng — 04/10 tối Mr. Đại duyệt dọn vết Base: Base.vn hết hợp đồng, thôi gọi
//        máy chủ Base.vn để "kiểm khoá" mỗi lần mở Cài đặt; đo 04/10: 240 lượt/7 giờ, không màn nào hiện kết quả)
// PUT  → ghi cài đặt mới, tự sinh vết sửa
//
// Khoá Base KHÔNG BAO GIỜ trả về nguyên văn — chỉ `••••` + 4 ký tự cuối
// (PLAN mục 10c tab 1).
// ============================================================

import { NextResponse } from "next/server";
import { docCaiDat, ghiCaiDat, type CaiDatBase } from "@/lib/cai-dat-base";
import { requireRole } from "@/lib/route-auth";
import { kiemMocGiuSo } from "@/lib/nhat-ky/moc-giu-so";
import { dayChoCacAgent } from "@/lib/day-sang-agent";
import { tuDienDayDu } from "@/lib/tu-dien-ngu-canh";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const cauHinh = docCaiDat();
  return NextResponse.json({
    ok: true,
    cauHinh,
    // Bản đầy đủ các agent đọc (A + B + C + D) — màn Cài đặt hiện để người xem trước
    tuDienGhep: tuDienDayDu(),
    khoaBase: [],
  });
}

export async function PUT(req: Request) {
  // Cửa "caidat" (PM, Admin) mới sửa được cấu hình — mọi lần sửa đều ghi vết kèm tên người
  const auth = await requireRole("caidat");
  if (!auth.ok) return auth.response;
  const nguoi = auth.session.email;

  let body: Partial<CaiDatBase>;
  try {
    body = (await req.json()) as Partial<CaiDatBase>;
  } catch {
    return NextResponse.json({ ok: false, message: "Body phải là JSON." }, { status: 400 });
  }

  // 04/10/2026 (CHOT 6g.7 mục 5): từ điển Main TỰ GHÉP — không nhận cả khối gõ tay cũ nữa (thay chốt BF 08/09
  // "chỉ sửa ở Agent Base" — agent Base cũ đã đóng). Chỉ nhận hai ô gõ tay A và D.
  if (body.tuDienNguCanh !== undefined) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Từ điển ngữ cảnh nay do Main tự ghép từ danh mục dự án và sơ đồ tổ chức — chỉ sửa hai ô «Tập đoàn và các công ty thành viên» và «Chỗ bổ sung».",
      },
      { status: 400 }
    );
  }
  for (const k of ["tuDienCongTy", "tuDienBoSung"] as const) {
    if (body[k] !== undefined && (typeof body[k] !== "string" || (body[k] as string).length > 40_000)) {
      return NextResponse.json({ ok: false, message: "Ô từ điển phải là chữ, tối đa 40.000 ký tự." }, { status: 400 });
    }
  }
  const doiTuDien = body.tuDienCongTy !== undefined || body.tuDienBoSung !== undefined;

  // 24/09: bỏ ngưỡng "nằm im" · trường khai mã WBS · quy đổi dự án ↔ không gian ·
  // ngưỡng "việc quá hạn" — không code nào của Main dùng (lib/cai-dat-base.ts
  // TRUONG_DA_BO); gửi lên thì bị lờ đi.

  // 26/09 — hai mốc giữ sổ hỏi–đáp (HOP-DONG-KET-NOI 7.1): số nguyên, 1 ≤ đầy đủ < gọn ≤ 365
  let doiMocGiuSo = false;
  if (body.giuSo !== undefined) {
    const k = kiemMocGiuSo(body.giuSo);
    if (!k.ok) return NextResponse.json({ ok: false, message: k.loi }, { status: 400 });
    doiMocGiuSo = JSON.stringify(k.moc) !== JSON.stringify(docCaiDat().giuSo);
    body = { ...body, giuSo: k.moc };
  }

  const ra = ghiCaiDat(body, nguoi);
  // Từ điển là dữ liệu chung — đẩy ngay sang các agent (chạy nền), như khi đổi dự án/người dùng
  if (doiTuDien) void dayChoCacAgent("Main sửa từ điển ngữ cảnh").catch(() => {});
  // Mốc giữ sổ là cài đặt chung — đẩy ngay sang 4 agent (chạy nền, như khi đổi dự án/người dùng)
  if (doiMocGiuSo) void dayChoCacAgent("Main đổi mốc giữ sổ hỏi–đáp").catch(() => {});
  return NextResponse.json({ ok: true, cauHinh: ra });
}
