// /api/bao-cao-sang/luat — LUẬT ĐỘNG của báo cáo sáng (PLAN-MAIN-AGENT 6.2)
//
// GET    : mọi user đã đăng nhập → luật còn hiệu lực + luật đã hết hạn
// POST   : pm|engineer → { cau, nguon? }
//          Câu nhắn được ĐỌC BẰNG CODE (docCauNhan), không tốn lượt LLM nào.
//          Ba ngả trả về: thêm luật · liệt kê luật · không hiểu.
// DELETE : pm|engineer → ?ma=<mã luật>
//          Mục 6.2: "mọi luật đều xem và XOÁ ĐƯỢC trên màn hình."

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/route-auth";
import { gioVn } from "@/lib/gio-vn";
import { docLuat, docLuatConHieuLuc, docLuatHetHan, themLuat, xoaLuat } from "@/lib/bao-cao-sang/kho";
import { docCauNhan, GHI_CHU_LUAT, moTaHieuLuc, type LuatBaoCao } from "@/lib/bao-cao-sang/luat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function keo(ds: LuatBaoCao[]) {
  return ds.map((l) => ({ ...l, moTa: moTaHieuLuc(l) }));
}

export async function GET(): Promise<NextResponse> {
  const auth = await requireRole("xem");
  if (!auth.ok) return auth.response;
  const ngay = gioVn(new Date()).ngay;
  return NextResponse.json({
    ok: true,
    ngay,
    conHieuLuc: keo(docLuatConHieuLuc(ngay)),
    hetHan: keo(docLuatHetHan(ngay)),
    soTatCa: docLuat().length,
    ghiChu: GHI_CHU_LUAT,
  });
}

export async function POST(req: Request): Promise<NextResponse> {
  const auth = await requireRole("ghi");
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, message: "Body không phải JSON." }, { status: 400 });
  }

  const cau = typeof body.cau === "string" ? body.cau : "";
  const nguon = typeof body.nguon === "string" && body.nguon.trim() !== "" ? body.nguon : "khung chat";
  const ngay = gioVn(new Date()).ngay;

  const doc = docCauNhan(cau, { nguoiDat: auth.session.email, nguon });

  if (doc.loai === "hoi-luat") {
    const ds = docLuatConHieuLuc(ngay);
    return NextResponse.json({
      ok: true,
      loai: "hoi-luat",
      conHieuLuc: keo(ds),
      message:
        ds.length === 0
          ? "Đang không có luật động nào — báo cáo sáng chạy theo khung mặc định."
          : `Đang bật ${ds.length} luật.`,
    });
  }

  if (doc.loai === "xoa-luat") {
    return NextResponse.json({ ok: true, loai: "xoa-luat", message: doc.goiY });
  }

  if (doc.loai === "khong-hieu") {
    return NextResponse.json({ ok: false, loai: "khong-hieu", message: doc.lyDo }, { status: 400 });
  }

  const { them, ds } = themLuat(doc.luat);
  return NextResponse.json({
    ok: true,
    loai: "them-luat",
    them,
    luat: { ...doc.luat, moTa: moTaHieuLuc(doc.luat) },
    message: them
      ? `Đã thêm luật — ${moTaHieuLuc(doc.luat)}.`
      : "Luật y hệt đã có sẵn và còn hiệu lực, không thêm bản thứ hai.",
    conHieuLuc: keo(ds.filter((l) => (l.hieuLucDen === null ? true : ngay <= l.hieuLucDen))),
  });
}

export async function DELETE(req: Request): Promise<NextResponse> {
  const auth = await requireRole("ghi");
  if (!auth.ok) return auth.response;
  const ma = new URL(req.url).searchParams.get("ma") ?? "";
  if (ma === "") {
    return NextResponse.json({ ok: false, message: "Thiếu mã luật cần xoá." }, { status: 400 });
  }
  const { xoa, ds } = xoaLuat(ma);
  const ngay = gioVn(new Date()).ngay;
  return NextResponse.json({
    ok: xoa,
    message: xoa ? "Đã xoá luật." : `Không tìm thấy luật "${ma}" — có thể đã xoá rồi.`,
    conHieuLuc: keo(ds.filter((l) => ngay >= l.hieuLucTu && (l.hieuLucDen === null || ngay <= l.hieuLucDen))),
  });
}
