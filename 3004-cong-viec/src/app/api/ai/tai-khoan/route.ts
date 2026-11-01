// /api/ai/tai-khoan — HAI TÀI KHOẢN CLAUDE (Mr. Đại chốt 02/10/2026, lib/ai/tai-khoan-claude.ts).
//   GET  — tình hình 2 tài khoản: đã đăng nhập chưa, email + gói (chỉ người sửa được cài đặt), đang chính/phụ, hết hạn mức tới mấy
//          giờ, đang chạy mấy lượt, lượt hôm nay. Tài khoản 1 chưa đăng nhập riêng = đang dùng tài khoản mặc định của máy.
//   POST { so, action } — quyền cau_hinh.sua (04/10 trưa: một khuôn thẻ + một cách đăng nhập cho TK1, TK2, tài khoản cá nhân):
//     "mo_link"            → link đăng nhập Claude (lib/ai/dang-nhap-link.ts) — người bấm mở trên máy / điện thoại của mình
//     "nhap_ma", ma        → chuyển mã trang Claude hiện ra cho CLI → đăng nhập xong thì bỏ mã dán tay + mốc hết / mất đăng nhập cũ;
//                            TK2 đăng nhập xong thì TỰ BẬT "Dùng 2 tài khoản" ở Cài đặt → AI (Mr. Đại chốt 18/10/2026 — bớt cú bấm)
//     "huy_link"           → tắt lượt đăng nhập đang chờ
//     "logout"             → xoá đăng nhập của tài khoản (cả file đăng nhập lẫn mã dán tay); TK2 đăng xuất thì TỰ TẮT "Dùng 2 tài khoản"
//     "thu"                → hỏi một câu rất ngắn bằng đúng tài khoản đó (tốn vài nghìn token haiku)
//     "kiem_tra"           → `claude auth status` — không tốn token
//     "dan_ma" (cũ)        → ĐÃ ĐÓNG 04/10 (kiểm độc lập lần 2 #3) — trả 410 câu chỉ đường; mã dài hạn không còn cửa nào ghi.
//   Không chuỗi nào từ client vào dòng lệnh (mã đi qua stdin / biến môi trường).
import { coQuyen } from "@sci/identity";
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { checkCliStatus, resetClaudeBinaryCache, thuTaiKhoan } from "@/lib/ai/providers";
import { logoutCli } from "@/lib/ai/cli-setup";
import { CAU_CUA_DANG_NHAP_CU, chuanHoaMaLink, guiMaDangNhap, huyDangNhapLink, moDangNhapLink } from "@/lib/ai/dang-nhap-link";
import { batBuocQuyen, docJson, ghiDoiKetNoi } from "@/lib/ai/route-chung";
import { fmtSo } from "@/lib/format";
import { tx } from "@/lib/db";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { ghiCauHinhHeThong } from "@/lib/cau-hinh/ghi";
import {
  boDauHong,
  daDangNhapLinkCongTy,
  maChay,
  quenCauHinhTk,
  taiKhoanDangDung,
  thuMucChay,
  thuMucTk,
  tinhHinhTk,
  xoaMaCongTy,
  type SoTk,
} from "@/lib/ai/tai-khoan-claude";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const coTheSua = coQuyen(nd, "cau_hinh.sua");
    quenCauHinhTk();
    const th = await tinhHinhTk();
    resetClaudeBinaryCache();
    const tk = [];
    for (const t of th.tai_khoan) {
      const dir = thuMucChay(t.so as SoTk);
      let st: Awaited<ReturnType<typeof checkCliStatus>> = { installed: false, loggedIn: false };
      if (t.so === 1 || t.dang_nhap_rieng) {
        try {
          st = await checkCliStatus(dir, maChay(t.so as SoTk));
        } catch {
          /* giữ chưa đăng nhập */
        }
      }
      tk.push({
        ...t,
        ...(coTheSua ? {} : { duoi_ma: undefined }),
        dung_mac_dinh_may: t.so === 1 && !t.dang_nhap_rieng,
        dang_nhap: st.loggedIn,
        // Gói + email chỉ cho người sửa được cài đặt (kiểm độc lập 04/10 #5)
        ...(coTheSua && st.tenGoi ? { goi: st.tenGoi } : {}),
        ...(coTheSua && st.email ? { email: st.email } : {}),
      });
    }
    return { ok: true, coTheSua, ...th, dang_dung: await taiKhoanDangDung(), tai_khoan: tk };
  });
}

/**
 * TK2 đăng nhập → tự BẬT "Dùng 2 tài khoản Claude" (Cài đặt → AI, CSDL); TK2 đăng xuất → tự TẮT (Mr. Đại chốt 18/10/2026: mỗi
 * agent 2 tài khoản thay phiên, không bắt bấm thêm). Máy ghi ("Hệ thống" trong nhật ký phiên bản cấu hình) — người bấm đã qua quyền
 * cau_hinh.sua lúc đăng nhập / đăng xuất. Trả câu nối vào thông báo — "" khi ô đã đúng sẵn.
 */
async function tuDoiHaiTaiKhoan(bat: boolean): Promise<string> {
  try {
    const daDoi = await tx(async (q) => {
      const ai = await layCauHinh(q, "ai");
      if (!!ai.hai_tai_khoan === bat) return false;
      await ghiCauHinhHeThong(q, "ai", { ...ai, hai_tai_khoan: bat });
      return true;
    });
    quenCauHinhTk();
    if (!daDoi) return "";
    return bat ? " Đã tự bật «Dùng 2 tài khoản Claude»." : " Đã tự tắt «Dùng 2 tài khoản Claude».";
  } catch {
    return ` Chưa ${bat ? "bật" : "tắt"} được «Dùng 2 tài khoản Claude» — bấm ô đó ở Cài đặt → AI.`;
  }
}

/** "email · gói" sau khi đăng nhập — không đọc được thì để trống */
async function tenDangNhap(so: SoTk): Promise<string> {
  try {
    const st = await checkCliStatus(thuMucChay(so), maChay(so));
    return [st.email, st.tenGoi].filter(Boolean).join(" · ");
  } catch {
    return "";
  }
}

export async function POST(req: Request): Promise<Response> {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    batBuocQuyen(nd, "cau_hinh.sua", "Chỉ người có quyền sửa cài đặt mới đăng nhập / đăng xuất tài khoản Claude của công ty.");
    const b = await docJson(req);
    const so = b.so === 1 || b.so === 2 ? (b.so as SoTk) : null;
    if (!so) throw new LoiHttp(400, "Chọn tài khoản 1 hoặc 2");
    const dir = thuMucTk(so);
    const khoa = `tk${so}`;

    if (b.action === "mo_link") {
      const r = await moDangNhapLink(khoa, dir);
      if (r.ok) await ghiDoiKetNoi(nd, { thao_tac: "mo_dang_nhap_link_claude_tai_khoan", tai_khoan: so });
      return r;
    }

    if (b.action === "nhap_ma") {
      const ma = chuanHoaMaLink(b.ma);
      if (!ma) throw new LoiHttp(400, "Mã không đúng dạng — trên trang Claude bấm nút chép mã (Copy Code) rồi dán nguyên mã vào đây.");
      const r = await guiMaDangNhap(khoa, ma);
      if (!r.ok) return r;
      daDangNhapLinkCongTy(so);
      boDauHong(so);
      resetClaudeBinaryCache();
      await ghiDoiKetNoi(nd, { thao_tac: "dang_nhap_link_claude_tai_khoan", tai_khoan: so });
      const ten = await tenDangNhap(so);
      const doiHai = so === 2 ? await tuDoiHaiTaiKhoan(true) : "";
      return { ok: true, message: `Đã đăng nhập tài khoản Claude ${so}${ten ? `: ${ten}` : ""}.${doiHai}` };
    }

    if (b.action === "huy_link") {
      huyDangNhapLink(khoa);
      return { ok: true, message: "Đã huỷ lượt đăng nhập." };
    }

    if (b.action === "thu") {
      const r = await thuTaiKhoan(so, nd.id);
      return { ...r, message: r.ok ? `Tài khoản Claude ${so} trả lời được (${fmtSo(r.giay, 1)} giây).` : r.loi };
    }

    if (b.action === "kiem_tra") {
      const st = await checkCliStatus(thuMucChay(so), maChay(so));
      if (!st.installed) return { ok: false, message: "Máy chủ chưa có Claude CLI." };
      if (!st.loggedIn) return { ok: false, message: `Tài khoản Claude ${so} chưa đăng nhập.` };
      const ten = [st.email, st.tenGoi].filter(Boolean).join(" · ");
      return { ok: true, message: `Tài khoản Claude ${so} đang đăng nhập${ten ? `: ${ten}` : ""} — kiểm nhanh không tốn token; muốn chắc trả lời được thì bấm Thử trợ lý AI.` };
    }

    if (b.action === "dan_ma") throw new LoiHttp(410, CAU_CUA_DANG_NHAP_CU);

    if (b.action === "logout") {
      huyDangNhapLink(khoa);
      const coMa = xoaMaCongTy(so);
      const r = logoutCli(dir);
      boDauHong(so);
      const ok = r.ok || coMa;
      if (ok) await ghiDoiKetNoi(nd, { thao_tac: "dang_xuat_claude_tai_khoan", tai_khoan: so });
      const doiHai = ok && so === 2 ? await tuDoiHaiTaiKhoan(false) : "";
      return { ok, message: ok ? `Đã đăng xuất tài khoản Claude ${so}.${doiHai}` : r.message };
    }

    throw new LoiHttp(400, "Thao tác không hợp lệ");
  });
}
