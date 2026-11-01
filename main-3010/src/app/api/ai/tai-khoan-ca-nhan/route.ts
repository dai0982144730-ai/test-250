// /api/ai/tai-khoan-ca-nhan — TÀI KHOẢN CLAUDE CÁ NHÂN (Quản lý token AI, Mr. Đại duyệt 04/10/2026 — Đợt 2 nhân bản từ agent
// Công việc; lõi ở lib/ai/tai-khoan-claude.ts).
// Mỗi người tự nối tài khoản Claude của mình để làm tiếp khi CẢ tài khoản công ty hết hạn mức. Chỉ dùng cho câu hỏi của chính
// người đó — việc nền máy tự chạy không bao giờ dùng. Ai đăng nhập cũng nối được; chỉ đọc / sửa được tài khoản CỦA MÌNH.
//   GET  — đã đăng nhập chưa, email + gói, hết hạn mức tới mấy giờ, mất đăng nhập, 7 ngày qua đã dùng bao nhiêu lượt / token.
//   POST { action } — CÙNG bộ thao tác với thẻ Tài khoản 1 / 2: "mo_link" · "nhap_ma" (ma) · "huy_link" · "go" (đăng xuất) ·
//        "thu" · "kiem_tra".
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/route-auth";
import { LY_DO_TRO_LY } from "@/lib/quyen";
import { fmtSo } from "@/lib/format"; // chuẩn số Việt Nam (chốt 130): «3,2 giây»
import { checkCliStatus, thuTaiKhoan } from "@/lib/ai/providers";
import { chuanHoaMaLink, guiMaDangNhap, huyDangNhapLink, moDangNhapLink } from "@/lib/ai/dang-nhap-link";
import { docLuot } from "@/lib/ai/so-dung-ai";
import {
  caNhanMatDangNhap,
  coDangNhapCaNhan,
  conTaiKhoanCongTy,
  daDangNhapLinkCaNhan,
  khoaNguoi,
  thuMucCaNhan,
  trangThaiCaNhan,
  xoaDangNhapCaNhan,
} from "@/lib/ai/tai-khoan-claude";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function tinhHinh(nguoi: string) {
  const daNoi = coDangNhapCaNhan(nguoi);
  const nay = Date.now();
  const luot = docLuot(nay - 7 * 86_400_000, nay).luot.filter((l) => l.tai_khoan === "ca_nhan" && l.nguoi === nguoi);
  const het = daNoi ? trangThaiCaNhan(nguoi).het_den : 0;
  let st: Awaited<ReturnType<typeof checkCliStatus>> = { installed: false, loggedIn: false };
  if (daNoi) {
    try {
      st = await checkCliStatus(thuMucCaNhan(nguoi));
    } catch {
      /* giữ chưa đăng nhập */
    }
  }
  return {
    da_noi: daNoi,
    dang_nhap: daNoi && st.loggedIn,
    ...(st.email ? { email: st.email } : {}),
    ...(st.tenGoi ? { goi: st.tenGoi } : {}),
    het_den: het > nay ? new Date(het).toISOString() : null,
    // 401 ở lượt thật / nút Thử → thẻ hiện "Mất đăng nhập — Đăng nhập lại"
    mat_dang_nhap: daNoi && caNhanMatDangNhap(nguoi),
    luot_7_ngay: luot.filter((l) => l.ket_qua === "ok").length,
    token_7_ngay: luot.reduce((s, l) => s + l.token_vao + l.token_cache_doc + l.token_cache_ghi + l.token_ra, 0),
    cong_ty_con: await conTaiKhoanCongTy(),
  };
}

// Cửa "ghi" (kiểm độc lập lần 5 🟡1, 04/10): Người xem không dùng trợ lý AI trong mọi tình huống — nối tài khoản cá nhân cũng
// vô nghĩa với họ (đo: Người xem GET 200, mo_link chạy được `claude auth login` trên máy chủ).
export async function GET(): Promise<NextResponse> {
  const auth = await requireRole("ghi", LY_DO_TRO_LY);
  if (!auth.ok) return auth.response;
  return NextResponse.json({ ok: true, ...(await tinhHinh(khoaNguoi(auth.session.email))) });
}

export async function POST(req: Request): Promise<NextResponse> {
  const auth = await requireRole("ghi", LY_DO_TRO_LY);
  if (!auth.ok) return auth.response;
  const nguoi = khoaNguoi(auth.session.email);
  let b: Record<string, unknown> = {};
  try {
    const j: unknown = await req.json();
    if (j && typeof j === "object" && !Array.isArray(j)) b = j as Record<string, unknown>;
  } catch {
    /* body hỏng → thao tác không hợp lệ */
  }
  const tra = (d: Record<string, unknown>, status = 200) => NextResponse.json(d, { status });
  const khoa = `ca_nhan:${nguoi}`;

  if (b.action === "mo_link") return tra(await moDangNhapLink(khoa, thuMucCaNhan(nguoi)));

  if (b.action === "nhap_ma") {
    const ma = chuanHoaMaLink(b.ma);
    if (!ma) return tra({ ok: false, message: "Mã không đúng dạng — trên trang Claude bấm nút chép mã (Copy Code) rồi dán nguyên mã vào đây." }, 400);
    const r = await guiMaDangNhap(khoa, ma);
    if (!r.ok) return tra({ ...r, ...(await tinhHinh(nguoi)) });
    daDangNhapLinkCaNhan(nguoi);
    const th = await tinhHinh(nguoi);
    const ten = [th.email, th.goi].filter(Boolean).join(" · ");
    return tra({ ok: true, message: `Đã đăng nhập tài khoản Claude cá nhân${ten ? `: ${ten}` : ""}.`, ...th });
  }

  if (b.action === "huy_link") {
    huyDangNhapLink(khoa);
    return tra({ ok: true, message: "Đã huỷ lượt đăng nhập." });
  }

  if (b.action === "go" || b.action === "logout") {
    huyDangNhapLink(khoa);
    xoaDangNhapCaNhan(nguoi);
    return tra({ ok: true, message: "Đã đăng xuất tài khoản Claude cá nhân của anh/chị.", ...(await tinhHinh(nguoi)) });
  }

  if (b.action === "thu") {
    if (!coDangNhapCaNhan(nguoi)) return tra({ ok: false, message: "Anh/chị chưa đăng nhập tài khoản Claude cá nhân." });
    const r = await thuTaiKhoan({ nguoi }, nguoi);
    return tra({ ...r, message: r.ok ? `Tài khoản Claude cá nhân trả lời được (${fmtSo(r.giay, 1)} giây).` : r.loi });
  }

  if (b.action === "kiem_tra") {
    const th = await tinhHinh(nguoi);
    if (!th.dang_nhap) return tra({ ok: false, message: "Anh/chị chưa đăng nhập tài khoản Claude cá nhân.", ...th });
    const ten = [th.email, th.goi].filter(Boolean).join(" · ");
    return tra({ ok: true, message: `Tài khoản Claude cá nhân đang đăng nhập${ten ? `: ${ten}` : ""} — kiểm nhanh không tốn token; muốn chắc trả lời được thì bấm Thử trợ lý AI.`, ...th });
  }

  return tra({ ok: false, message: "Thao tác không hợp lệ." }, 400);
}
