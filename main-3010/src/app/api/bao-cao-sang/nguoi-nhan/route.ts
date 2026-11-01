// /api/bao-cao-sang/nguoi-nhan — NGƯỜI NHẬN báo cáo sáng + kịch bản từng người
// MD: PLAN-MAIN-AGENT mục 6.6 · Mr. Đại chốt 04/10/2026
//
// GET  : cửa Xem → bảng người nhận (người có quyền Cài đặt thấy cả bảng; người khác
//        chỉ thấy dòng của chính mình) + ba mẫu và tham số gốc.
// POST : { hanhDong: "dat-mau", ma, mau }  — cửa Cài đặt: chọn mẫu cho một người
//                                             (mau = tong-quat | dieu-hanh | du-an | khong-nhan)
//        { hanhDong: "chon-du-an", ma, duAn: string[] } — ⭐ 04/10 tối: dự án chọn tay cho mẫu
//                                             Dự án (CẢ danh sách sau mỗi lần bấm). Cửa Cài đặt sửa
//                                             được mọi người; người khác chỉ sửa dòng của CHÍNH MÌNH
//                                             ("bản của ai người đó sửa" — chốt 04/10)
//        { hanhDong: "dat-bo-khoi", ma, boKhoi: ChonKhoi[] } — ⭐ 17/10/2026 (KE-HOACH/23): bộ khối kéo thả (CẢ bộ sau
//                                             mỗi lần thả / đổi phạm vi / số dòng). Cùng quyền với chọn dự án: Cài đặt sửa
//                                             mọi người, người khác chỉ dòng của chính mình. [] = về bộ mặc định của mẫu
//        { hanhDong: "gui-thu", ma, ngay? } — cửa Ghi: gửi bản của người đó về Telegram
//                                             của CHÍNH người bấm (xem trước trên điện thoại)

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/route-auth";
import { duocCaiDat } from "@/lib/quyen";
import { bangNguoiNhan, chonDuAn, datBoKhoi, datMau, duAnDeChon, maCuaEmail, type LuaChonMau } from "@/lib/bao-cao-sang/kich-ban-kho";
import { CAC_MAU, CONG_DUNG_MAU, MO_TA_THAM_SO, NHAN_MAU, THAM_SO_MAU, laMaMau } from "@/lib/bao-cao-sang/kich-ban";
import { guiThu } from "@/lib/bao-cao-sang/dung";
import { DANH_MUC_KHOI, NHAN_KE, NHAN_PHAM_VI } from "@/lib/bao-cao-sang/khoi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const auth = await requireRole("xem");
  if (!auth.ok) return auth.response;
  const caiDat = duocCaiDat(auth.session.role);
  const bang = bangNguoiNhan();
  return NextResponse.json({
    ok: true,
    duocSua: caiDat,
    /** Mã người của người đang xem — dòng này tự chọn dự án được dù không có cửa Cài đặt */
    maCuaToi: maCuaEmail(auth.session.email),
    duAn: duAnDeChon(),
    nguoi: caiDat ? bang : bang.filter((d) => d.email === auth.session.email),
    mau: CAC_MAU.map((m) => ({ ma: m, nhan: NHAN_MAU[m], congDung: CONG_DUNG_MAU[m], thamSo: THAM_SO_MAU[m] })),
    moTaThamSo: MO_TA_THAM_SO,
    // ⭐ 17/10/2026 — thư viện 21 khối (3 kệ) cho màn kéo thả
    thuVien: DANH_MUC_KHOI,
    nhanKe: NHAN_KE,
    nhanPhamVi: NHAN_PHAM_VI,
  });
}

export async function POST(req: Request): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, message: "Dữ liệu gửi lên không đọc được." }, { status: 400 });
  }
  const hanhDong = typeof body.hanhDong === "string" ? body.hanhDong : "";
  const ma = typeof body.ma === "string" ? body.ma.trim() : "";
  if (ma === "") return NextResponse.json({ ok: false, message: "Thiếu mã người nhận." }, { status: 400 });

  if (hanhDong === "dat-mau") {
    const auth = await requireRole("caidat");
    if (!auth.ok) return auth.response;
    const mau = body.mau;
    if (!(laMaMau(mau) || mau === "khong-nhan")) {
      return NextResponse.json({ ok: false, message: "Mẫu phải là Tổng quát, Điều hành, Dự án hoặc Không nhận." }, { status: 400 });
    }
    try {
      datMau(ma, mau as LuaChonMau, auth.session.email);
    } catch (e) {
      return NextResponse.json({ ok: false, message: e instanceof Error ? e.message : "Không lưu được." }, { status: 400 });
    }
    return NextResponse.json({ ok: true, nguoi: bangNguoiNhan() });
  }

  if (hanhDong === "chon-du-an") {
    const auth = await requireRole("xem");
    if (!auth.ok) return auth.response;
    if (!duocCaiDat(auth.session.role) && maCuaEmail(auth.session.email) !== ma) {
      return NextResponse.json(
        { ok: false, message: "Chỉ chọn được dự án cho bản của chính mình — chọn cho người khác cần quyền Cài đặt." },
        { status: 403 },
      );
    }
    const duAn = Array.isArray(body.duAn) ? body.duAn.filter((x): x is string => typeof x === "string") : null;
    if (!duAn) return NextResponse.json({ ok: false, message: "Thiếu danh sách dự án." }, { status: 400 });
    try {
      chonDuAn(ma, duAn, auth.session.email);
    } catch (e) {
      return NextResponse.json({ ok: false, message: e instanceof Error ? e.message : "Không lưu được." }, { status: 400 });
    }
    const bang = bangNguoiNhan();
    return NextResponse.json({ ok: true, nguoi: duocCaiDat(auth.session.role) ? bang : bang.filter((d) => d.ma === ma) });
  }

  if (hanhDong === "dat-bo-khoi") {
    const auth = await requireRole("xem");
    if (!auth.ok) return auth.response;
    if (!duocCaiDat(auth.session.role) && maCuaEmail(auth.session.email) !== ma) {
      return NextResponse.json(
        { ok: false, message: "Chỉ sửa được bộ khối cho bản của chính mình — sửa cho người khác cần quyền Cài đặt." },
        { status: 403 },
      );
    }
    try {
      datBoKhoi(ma, body.boKhoi, auth.session.email);
    } catch (e) {
      return NextResponse.json({ ok: false, message: e instanceof Error ? e.message : "Không lưu được." }, { status: 400 });
    }
    const bang = bangNguoiNhan();
    // Khối mới kéo vào mà số hôm nay chưa gom: màn xem trước tự lấy từng khối thiếu qua GET /api/bao-cao-sang/khoi
    // (27/10/2026 — bỏ lượt gom ngầm ở đây: hai lượt cùng ghi tệp số của ngày thì lượt sau đè mất số lượt trước)
    return NextResponse.json({ ok: true, nguoi: duocCaiDat(auth.session.role) ? bang : bang.filter((d) => d.ma === ma) });
  }

  if (hanhDong === "gui-thu") {
    const auth = await requireRole("ghi");
    if (!auth.ok) return auth.response;
    const ngay = typeof body.ngay === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.ngay) ? body.ngay : undefined;
    const kq = await guiThu(ma, auth.session.email, ngay);
    return NextResponse.json({ ok: kq.ok, message: kq.thongDiep });
  }

  return NextResponse.json({ ok: false, message: 'hanhDong phải là "dat-mau", "chon-du-an", "dat-bo-khoi" hoặc "gui-thu".' }, { status: 400 });
}
