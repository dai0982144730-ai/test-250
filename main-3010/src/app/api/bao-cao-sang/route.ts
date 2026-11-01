// /api/bao-cao-sang — báo cáo sáng 07:00 (PLAN-MAIN-AGENT mục 6 · 7)
//
// GET  : mọi user đã đăng nhập → bản báo cáo của ngày, chữ gửi Telegram,
//        luật đang áp, lịch sử, trạng thái Telegram và các nhịp định kỳ.
// POST : pm|engineer → { hanhDong: "dung" | "gui" | "chay-nhip", ma? }
//        "dung"  dựng lại bản của hôm nay (đi hỏi các agent đang bật)
//        "gui"   gửi ngay qua Telegram — chưa cấu hình token thì trả về câu
//                "chưa cấu hình", KHÔNG lỗi 500
//
// Vòng hẹn giờ được bật LƯỜI ở đây (khoiDongNhipBaoCaoSang) vì layout.tsx là
// file dùng chung, phần này không đụng vào.

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/route-auth";
import { boLocMatCuaNguoi } from "@/lib/agent-mat-tren-main";
import { locBaoCaoSang, locDuLieuKhoi } from "@/lib/agent-mat-loc";
import { gioVn } from "@/lib/gio-vn";
import { docBaoCaoNgay, docKhoi, docLichSu, docLuat, docLuatConHieuLuc, docLuatHetHan } from "@/lib/bao-cao-sang/kho";
import { ketXuatTelegram, NHIP_DINH_KY, type MaNhip } from "@/lib/bao-cao-sang/model";
import { GHI_CHU_LUAT, moTaHieuLuc } from "@/lib/bao-cao-sang/luat";
import {
  agentCanHoi,
  chayNhip,
  docKetQuaNhip,
  docTrangThaiNhip,
  dungBaoCao,
  guiBaoCaoSang,
  khoiDongNhipBaoCaoSang,
} from "@/lib/bao-cao-sang/dung";
import { trangThaiTelegram } from "@/lib/bao-cao-sang/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function ngayHopLe(v: string | null): string {
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : gioVn(new Date()).ngay;
}

export async function GET(req: Request): Promise<NextResponse> {
  const auth = await requireRole("xem");
  if (!auth.ok) return auth.response;
  khoiDongNhipBaoCaoSang();

  const ngay = ngayHopLe(new URL(req.url).searchParams.get("ngay"));
  // ⭐ 05/10 luật agent mật: dòng Agent Hợp đồng chỉ cho người được thấy hợp đồng dự án đó
  const goc = docBaoCaoNgay(ngay);
  const loc = boLocMatCuaNguoi(auth.session.email, auth.session.role);
  const baoCao = goc ? locBaoCaoSang(goc, loc) : null;
  // ⭐ 17/10/2026 (KE-HOACH/23) — số các khối của ngày (đã lọc agent mật theo người xem) cho màn kéo thả + xem trước
  const khoi = docKhoi(ngay);

  return NextResponse.json({
    ok: true,
    ngay,
    baoCao,
    // Chữ đúng như sẽ gửi đi — người dùng xem trước được, không có gì ẩn
    chu: baoCao ? ketXuatTelegram(baoCao) : null,
    khoi: khoi ? locDuLieuKhoi(khoi, loc) : null,
    luatConHieuLuc: docLuatConHieuLuc(ngay).map((l) => ({ ...l, moTa: moTaHieuLuc(l) })),
    luatHetHan: docLuatHetHan(ngay).map((l) => ({ ...l, moTa: moTaHieuLuc(l) })),
    soLuatTatCa: docLuat().length,
    lichSu: docLichSu(400).map((b) => ({ ngay: b.ngay, dungLuc: b.dungLuc, daGuiLuc: b.daGuiLuc, soDong: b.dong.length })),
    telegram: trangThaiTelegram(),
    nhip: NHIP_DINH_KY,
    trangThaiNhip: docTrangThaiNhip(),
    // ⭐ kiểm độc lập 04/10 🟡4 — lần chạy gần nhất của từng nhịp, có lỗi thì hiện
    ketQuaNhip: docKetQuaNhip(),
    // Nói rõ báo cáo sẽ đi hỏi những con nào — số agent do người dùng khai
    agentSeHoi: agentCanHoi().map((a) => ({ ma: a.ma, ten: a.ten })),
    ghiChuHieuLuc: GHI_CHU_LUAT,
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

  const hanhDong = typeof body.hanhDong === "string" ? body.hanhDong : "";
  const ngay = ngayHopLe(typeof body.ngay === "string" ? body.ngay : null);
  const loc = boLocMatCuaNguoi(auth.session.email, auth.session.role);

  if (hanhDong === "dung") {
    const bc = locBaoCaoSang(await dungBaoCao({ ngay }), loc);
    const khoi = docKhoi(ngay);
    return NextResponse.json({ ok: true, baoCao: bc, chu: ketXuatTelegram(bc), khoi: khoi ? locDuLieuKhoi(khoi, loc) : null });
  }

  if (hanhDong === "gui" || hanhDong === "gui-lai") {
    // "gui" bỏ qua người đã nhận bản ngày này; "gui-lai" gửi cả họ (Mr. Đại chốt 04/10 tối)
    const kq = await guiBaoCaoSang(ngay, "tay", { guiLai: hanhDong === "gui-lai" });
    // Chưa cấu hình Telegram KHÔNG phải lỗi máy chủ — trả 200 kèm câu giải thích
    return NextResponse.json({
      ok: kq.gui.ok,
      chuaCauHinh: kq.gui.chuaCauHinh,
      message: kq.gui.thongDiep,
      baoCao: locBaoCaoSang(kq.baoCao, loc),
      chu: kq.chu,
      // ⭐ 04/10 — kết quả từng người nhận
      nguoiNhan: kq.nguoiNhan ?? null,
    });
  }

  if (hanhDong === "chay-nhip") {
    const ma = typeof body.ma === "string" ? body.ma : "";
    if (!NHIP_DINH_KY.some((n) => n.ma === ma)) {
      return NextResponse.json({ ok: false, message: `Không có nhịp "${ma}".` }, { status: 400 });
    }
    // Chạy tay KHÔNG tính là lần tự động trong ngày (giống bộ hẹn giờ lõi)
    const tomTat = await chayNhip(ma as MaNhip, auth.session.email);
    return NextResponse.json({ ok: true, tomTat });
  }

  return NextResponse.json(
    { ok: false, message: 'hanhDong phải là "dung", "gui", "gui-lai" hoặc "chay-nhip".' },
    { status: 400 },
  );
}
