// /api/ai/tai-khoan-ca-nhan — TÀI KHOẢN CLAUDE CÁ NHÂN (Quản lý token AI, Mr. Đại duyệt 04/10/2026; lib/ai/tai-khoan-claude.ts).
// Mỗi người tự nối tài khoản Claude của mình để làm tiếp khi CẢ HAI tài khoản công ty hết hạn mức. Chỉ dùng cho câu hỏi của chính
// người đó — việc nền máy tự chạy không bao giờ dùng. Ai đăng nhập cũng nối được; chỉ đọc / sửa được tài khoản CỦA MÌNH.
//   GET  — đã đăng nhập chưa, email + gói, đang hết hạn mức tới mấy giờ, 7 ngày qua đã dùng bao nhiêu lượt / token.
//   POST { action } — CÙNG bộ thao tác với thẻ Tài khoản 1 / 2 (/api/ai/tai-khoan, Mr. Đại chốt 04/10 trưa "không trình bầy 1 vấn
//        đề theo 2 cách khác nhau"): "mo_link" · "nhap_ma" (ma) · "huy_link" · "go" (đăng xuất) · "thu" · "kiem_tra".
//        "luu" (cũ) ĐÃ ĐÓNG 04/10 (kiểm độc lập lần 2 #3) — trả 410 câu chỉ đường. Mã không bao giờ trả về trình duyệt.
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { checkCliStatus, thuTaiKhoan } from "@/lib/ai/providers";
import { CAU_CUA_DANG_NHAP_CU, chuanHoaMaLink, guiMaDangNhap, huyDangNhapLink, moDangNhapLink } from "@/lib/ai/dang-nhap-link";
import { docJson } from "@/lib/ai/route-chung";
import { docLuot } from "@/lib/ai/so-dung-ai";
import { fmtSo } from "@/lib/format";
import {
  caNhanMatDangNhap,
  conTaiKhoanCongTy,
  daDangNhapLinkCaNhan,
  duoiMa,
  kieuCaNhan,
  maCaNhan,
  maChayCaNhan,
  thuMucCaNhan,
  trangThaiCaNhan,
  xoaMaCaNhan,
} from "@/lib/ai/tai-khoan-claude";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function tinhHinh(nguoi: string) {
  const kieu = kieuCaNhan(nguoi);
  const cn = maCaNhan(nguoi);
  const nay = Date.now();
  const luot = docLuot(nay - 7 * 86_400_000, nay).luot.filter((l) => l.tai_khoan === "ca_nhan" && l.nguoi === nguoi);
  const het = kieu ? trangThaiCaNhan(nguoi).het_den : 0;
  let st: Awaited<ReturnType<typeof checkCliStatus>> = { installed: false, loggedIn: false };
  if (kieu) {
    try {
      st = await checkCliStatus(thuMucCaNhan(nguoi), maChayCaNhan(nguoi));
    } catch {
      /* giữ chưa đăng nhập */
    }
  }
  return {
    da_noi: !!kieu,
    dang_nhap: !!kieu && st.loggedIn,
    kieu,
    ...(st.email ? { email: st.email } : {}),
    ...(st.tenGoi ? { goi: st.tenGoi } : {}),
    ...(kieu === "ma" && cn ? { duoi_ma: duoiMa(cn.ma), luc_noi: cn.luc_noi } : {}),
    het_den: het > nay ? new Date(het).toISOString() : null,
    // 401 ở lượt thật / nút Thử → thẻ hiện "Mất đăng nhập — Đăng nhập lại" (kiểm độc lập lần 4 #3)
    mat_dang_nhap: !!kieu && caNhanMatDangNhap(nguoi),
    luot_7_ngay: luot.filter((l) => l.ket_qua === "ok").length,
    token_7_ngay: luot.reduce((s, l) => s + l.token_vao + l.token_cache_doc + l.token_cache_ghi + l.token_ra, 0),
    cong_ty_con: await conTaiKhoanCongTy(),
  };
}

export async function GET(): Promise<Response> {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    return { ok: true, ...(await tinhHinh(nd.id)) };
  });
}

export async function POST(req: Request): Promise<Response> {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const b = await docJson(req);
    const khoa = `ca_nhan:${nd.id}`;

    if (b.action === "mo_link") return moDangNhapLink(khoa, thuMucCaNhan(nd.id));

    if (b.action === "nhap_ma") {
      const ma = chuanHoaMaLink(b.ma);
      if (!ma) throw new LoiHttp(400, "Mã không đúng dạng — trên trang Claude bấm nút chép mã (Copy Code) rồi dán nguyên mã vào đây.");
      const r = await guiMaDangNhap(khoa, ma);
      if (!r.ok) return { ...r, ...(await tinhHinh(nd.id)) };
      daDangNhapLinkCaNhan(nd.id);
      const th = await tinhHinh(nd.id);
      const ten = [th.email, th.goi].filter(Boolean).join(" · ");
      return { ok: true, message: `Đã đăng nhập tài khoản Claude cá nhân${ten ? `: ${ten}` : ""}.`, ...th };
    }

    if (b.action === "huy_link") {
      huyDangNhapLink(khoa);
      return { ok: true, message: "Đã huỷ lượt đăng nhập." };
    }

    if (b.action === "go" || b.action === "logout") {
      huyDangNhapLink(khoa);
      xoaMaCaNhan(nd.id);
      return { ok: true, message: "Đã đăng xuất tài khoản Claude cá nhân của anh/chị.", ...(await tinhHinh(nd.id)) };
    }

    if (b.action === "thu") {
      if (!kieuCaNhan(nd.id)) return { ok: false, message: "Anh/chị chưa đăng nhập tài khoản Claude cá nhân." };
      const r = await thuTaiKhoan({ nguoi: nd.id }, nd.id);
      return { ...r, message: r.ok ? `Tài khoản Claude cá nhân trả lời được (${fmtSo(r.giay, 1)} giây).` : r.loi };
    }

    if (b.action === "kiem_tra") {
      const th = await tinhHinh(nd.id);
      if (!th.dang_nhap) return { ok: false, message: "Anh/chị chưa đăng nhập tài khoản Claude cá nhân.", ...th };
      const ten = [th.email, th.goi].filter(Boolean).join(" · ");
      return { ok: true, message: `Tài khoản Claude cá nhân đang đăng nhập${ten ? `: ${ten}` : ""} — kiểm nhanh không tốn token; muốn chắc trả lời được thì bấm Thử trợ lý AI.`, ...th };
    }

    if (b.action === "luu") throw new LoiHttp(410, CAU_CUA_DANG_NHAP_CU);
    throw new LoiHttp(400, "Thao tác không hợp lệ");
  });
}
