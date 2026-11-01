// GET /api/ai/status — trạng thái kết nối AI hiện hành. MỌI người đã đăng nhập xem được (như HptStart:
// "Đang dùng: …"); chỉ người có quyền cau_hinh.sua mới thấy email tài khoản Claude và khóa (dạng che).
// CLI LUÔN dò (installed/loggedIn/gói) bất kể mode. Không bao giờ trả khóa đầy đủ về client.
import { coQuyen } from "@sci/identity";
import { batBuocDangNhap, xuLy } from "@/lib/phien";
import { checkCliStatus, effectiveModel, getAIConfig, maskApiKey, resetClaudeBinaryCache, type CliStatus } from "@/lib/ai/providers";
import { maChay, taiKhoanDangDung, thuMucChay } from "@/lib/ai/tai-khoan-claude";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const coTheSua = coQuyen(nd, "cau_hinh.sua");
    const cfg = getAIConfig();
    resetClaudeBinaryCache();
    let st: CliStatus;
    try {
      // Tài khoản ĐANG PHỤC VỤ (chính, hết / mất đăng nhập thì phụ) — kiểm độc lập lần 2 #2; TK1 chưa đăng nhập riêng = tài khoản mặc định của máy
      const so = await taiKhoanDangDung();
      st = await checkCliStatus(thuMucChay(so), maChay(so));
    } catch {
      st = { installed: false, loggedIn: false };
    }
    const cli = {
      installed: st.installed,
      loggedIn: st.loggedIn,
      ...(st.version ? { version: st.version } : {}),
      ...(st.plan ? { plan: st.plan } : {}),
      ...(st.tenGoi ? { tenGoi: st.tenGoi } : {}),
      ...(coTheSua && st.email ? { email: st.email } : {}),
    };
    const api =
      cfg.mode === "api"
        ? { provider: cfg.provider, model: effectiveModel(cfg), ...(coTheSua ? { keyMasked: maskApiKey(cfg.apiKey) } : {}), coKhoa: cfg.apiKey !== "" }
        : null;
    return { ok: true, coTheSua, mode: cfg.mode, cli, api };
  });
}
