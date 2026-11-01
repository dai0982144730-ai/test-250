// /api/ai/tai-khoan — HAI TÀI KHOẢN CLAUDE CỦA CÔNG TY (Quản lý token AI, Mr. Đại chốt 04/10/2026 — Đợt 2 nhân bản từ agent
// Công việc; lõi ở lib/ai/tai-khoan-claude.ts).
//   GET  — tình hình 2 tài khoản + 4 ô cấu hình: đã đăng nhập chưa, email + gói (chỉ người sửa được Cài đặt), chính/phụ, hết
//          hạn mức tới mấy giờ, mất đăng nhập, đang chạy mấy lượt, lượt hôm nay. TK1 chưa đăng nhập riêng = tài khoản mặc định máy.
//   POST — cửa Cài đặt (PM + Admin):
//     { action: "cau_hinh", hai_tai_khoan?, dao_vai_24h?, moi_phien_bat?, moi_phien_gio? } → lưu 4 ô (khai tại agent này)
//     { so, action: "mo_link" }  → link đăng nhập Claude (lib/ai/dang-nhap-link.ts) — người bấm mở trên máy / điện thoại mình
//     { so, action: "nhap_ma", ma } → chuyển mã trang Claude hiện ra cho CLI → đăng nhập xong thì bỏ mốc hết / mất đăng nhập cũ;
//                                    TK2 đăng nhập xong thì TỰ BẬT "Dùng 2 tài khoản" (Mr. Đại chốt 18/10/2026 — bớt cú bấm)
//     { so, action: "huy_link" } · "logout" (xoá đăng nhập RIÊNG của tài khoản đó; TK2 đăng xuất thì TỰ TẮT "Dùng 2 tài khoản")
//     · "thu" (hỏi 1 câu ngắn, tốn vài nghìn token)
//     · "kiem_tra" (`claude auth status` — không tốn token)
//   Không chuỗi nào từ trình duyệt vào dòng lệnh (mã đi qua stdin).
//   ⛔ 18/10/2026: KHÔNG có cửa đổi tài khoản mặc định của máy chủ (Main từng có "mac_dinh" — đã gỡ). Mỗi agent hai tài khoản
//   riêng, con nào chết thì tự chết; TK1 chưa đăng nhập riêng thì tạm mượn tài khoản chung của máy (thẻ ghi rõ "đang mượn").
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/route-auth";
import { checkCliStatus, khoiDongMoiPhien, resetClaudeBinaryCache, thuTaiKhoan } from "@/lib/ai/providers";
import { chuanHoaMaLink, guiMaDangNhap, huyDangNhapLink, moDangNhapLink } from "@/lib/ai/dang-nhap-link";
import {
  boDauHong,
  cauHinhTk,
  daDangNhapLinkCongTy,
  dangXuatCongTy,
  luuCauHinhTk,
  quenCauHinhTk,
  taiKhoanDangDung,
  thuMucChay,
  thuMucTk,
  tinhHinhTk,
  type SoTk,
} from "@/lib/ai/tai-khoan-claude";
import { duocCaiDat } from "@/lib/quyen";
import { fmtSo } from "@/lib/format"; // chuẩn số Việt Nam (chốt 130): «3,2 giây»

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LY_DO = "Chỉ PM và Admin đăng nhập / đăng xuất / cấu hình tài khoản Claude của công ty.";

export async function GET(): Promise<NextResponse> {
  const auth = await requireRole("xem");
  if (!auth.ok) return auth.response;
  const coTheSua = duocCaiDat(auth.session.role);
  khoiDongMoiPhien();
  quenCauHinhTk();
  const th = await tinhHinhTk();
  resetClaudeBinaryCache();
  const tk = [];
  for (const t of th.tai_khoan) {
    let st: Awaited<ReturnType<typeof checkCliStatus>> = { installed: false, loggedIn: false };
    if (t.so === 1 || t.dang_nhap_rieng) {
      try {
        st = await checkCliStatus(thuMucChay(t.so as SoTk));
      } catch {
        /* giữ chưa đăng nhập */
      }
    }
    tk.push({
      ...t,
      dung_mac_dinh_may: t.so === 1 && !t.dang_nhap_rieng,
      dang_nhap: st.loggedIn,
      // Gói + email chỉ cho người sửa được Cài đặt
      ...(coTheSua && st.tenGoi ? { goi: st.tenGoi } : {}),
      ...(coTheSua && st.email ? { email: st.email } : {}),
    });
  }
  return NextResponse.json({ ok: true, coTheSua, ...th, dang_dung: await taiKhoanDangDung(), tai_khoan: tk });
}

/**
 * TK2 đăng nhập → tự BẬT "Dùng 2 tài khoản Claude"; TK2 đăng xuất → tự TẮT (Mr. Đại chốt 18/10/2026: mỗi agent 2 tài khoản
 * thay phiên, không bắt bấm thêm). Trả câu nối vào thông báo — "" khi ô đã đúng sẵn.
 */
async function tuDoiHaiTaiKhoan(bat: boolean): Promise<string> {
  quenCauHinhTk();
  if ((await cauHinhTk()).hai_tai_khoan === bat) return "";
  try {
    await luuCauHinhTk({ hai_tai_khoan: bat });
    return bat ? " Đã tự bật «Dùng 2 tài khoản Claude»." : " Đã tự tắt «Dùng 2 tài khoản Claude».";
  } catch {
    return ` Chưa ${bat ? "bật" : "tắt"} được «Dùng 2 tài khoản Claude» — bấm ô đó ở khối Tài khoản Claude của công ty.`;
  }
}

/** "email · gói" sau khi đăng nhập — không đọc được thì để trống */
async function tenDangNhap(so: SoTk): Promise<string> {
  try {
    const st = await checkCliStatus(thuMucChay(so));
    return [st.email, st.tenGoi].filter(Boolean).join(" · ");
  } catch {
    return "";
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  const auth = await requireRole("caidat", LY_DO);
  if (!auth.ok) return auth.response;
  let b: Record<string, unknown> = {};
  try {
    const j: unknown = await req.json();
    if (j && typeof j === "object" && !Array.isArray(j)) b = j as Record<string, unknown>;
  } catch {
    /* body hỏng → thao tác không hợp lệ */
  }
  const tra = (d: Record<string, unknown>, status = 200) => NextResponse.json(d, { status });

  if (b.action === "cau_hinh") {
    try {
      const ch = await luuCauHinhTk(b);
      khoiDongMoiPhien();
      return tra({ ok: true, message: "Đã lưu cấu hình tài khoản Claude.", ...ch });
    } catch (e) {
      return tra({ ok: false, message: e instanceof Error ? e.message : "Lưu không được." }, 400);
    }
  }

  const so = b.so === 1 || b.so === 2 ? (b.so as SoTk) : null;
  if (!so) return tra({ ok: false, message: "Chọn tài khoản 1 hoặc 2." }, 400);
  const khoa = `tk${so}`;

  if (b.action === "mo_link") return tra(await moDangNhapLink(khoa, thuMucTk(so)));

  if (b.action === "nhap_ma") {
    const ma = chuanHoaMaLink(b.ma);
    if (!ma) return tra({ ok: false, message: "Mã không đúng dạng — trên trang Claude bấm nút chép mã (Copy Code) rồi dán nguyên mã vào đây." }, 400);
    const r = await guiMaDangNhap(khoa, ma);
    if (!r.ok) return tra(r);
    daDangNhapLinkCongTy(so);
    resetClaudeBinaryCache();
    const ten = await tenDangNhap(so);
    const doiHai = so === 2 ? await tuDoiHaiTaiKhoan(true) : "";
    return tra({ ok: true, message: `Đã đăng nhập tài khoản Claude ${so}${ten ? `: ${ten}` : ""}.${doiHai}` });
  }

  if (b.action === "huy_link") {
    huyDangNhapLink(khoa);
    return tra({ ok: true, message: "Đã huỷ lượt đăng nhập." });
  }

  if (b.action === "thu") {
    const r = await thuTaiKhoan(so, auth.session.email);
    return tra({ ...r, message: r.ok ? `Tài khoản Claude ${so} trả lời được (${fmtSo(r.giay, 1)} giây).` : r.loi });
  }

  if (b.action === "kiem_tra") {
    const st = await checkCliStatus(thuMucChay(so));
    if (!st.installed) return tra({ ok: false, message: "Máy chủ chưa có Claude CLI." });
    if (!st.loggedIn) return tra({ ok: false, message: `Tài khoản Claude ${so} chưa đăng nhập.` });
    const ten = [st.email, st.tenGoi].filter(Boolean).join(" · ");
    return tra({ ok: true, message: `Tài khoản Claude ${so} đang đăng nhập${ten ? `: ${ten}` : ""} — kiểm nhanh không tốn token; muốn chắc trả lời được thì bấm Thử trợ lý AI.` });
  }

  if (b.action === "logout") {
    huyDangNhapLink(khoa);
    const ok = dangXuatCongTy(so);
    boDauHong(so);
    const doiHai = ok && so === 2 ? await tuDoiHaiTaiKhoan(false) : "";
    return tra({ ok, message: ok ? `Đã đăng xuất tài khoản Claude ${so}.${doiHai}` : `Tài khoản Claude ${so} chưa đăng nhập riêng — không có gì để đăng xuất.` });
  }

  return tra({ ok: false, message: "Thao tác không hợp lệ." }, 400);
}
