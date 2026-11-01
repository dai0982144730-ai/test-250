// ============================================================
// doi-email.ts — ĐỔI EMAIL TÀI KHOẢN ở Main (gốc người dùng). CHỈ SERVER.
// Mr. Đại chốt 04/10/2026: "cần sửa tài khoản hung@scigroup.vn … thành hungnc@scigroup.vn pass hungnc@scigroup.vn …
// nếu không có tính năng này thì cần thêm tính năng này" — chọn "làm tính năng rồi dùng nó đổi".
//
// Một lần đổi làm 4 việc, theo thứ tự:
//   ① users.json: đổi email, GIỮ mã người (id), mật khẩu = email mới (users.ts doiEmail)
//   ② bí danh "email cũ → email mới" (data/bi-danh-tai-khoan.json) — Main giao kèm main.du_lieu_dung_chung,
//      agent con tự chuyển thứ đứng tên (Pháp lý: văn bản · Tiến độ/Hợp đồng: phiên chat)
//   ③ thứ đứng tên email cũ TẠI Main: phiên trợ lý chat · Giám đốc dự án · phiên Telegram · việc chờ ✅ Làm
//   ④ đẩy sang các agent ngay (không chờ 10 phút tự kéo)
// Agent Công việc (3004) giữ danh sách người RIÊNG tới Đợt 3 → đổi ở màn Quản trị người dùng của nó.
// ============================================================

import { doiEmail, normalizeEmail, type SafeUser } from "@/lib/users";
import { themBiDanh } from "@/lib/bi-danh-tai-khoan";
import { doiChuPhienChat } from "@/lib/ai/chat-store";
import { doiEmailTrongDuAn } from "@/lib/projects";
import { doiEmailPhienTelegram } from "@/lib/telegram-tro-ly/kho";
import { doiEmailViecCho } from "@/lib/ai/cho-duyet-kho";
import { dayChoCacAgent } from "@/lib/day-sang-agent";

export interface KetQuaDoiEmail {
  user: SafeUser;
  emailCu: string;
  emailMoi: string;
  /** số thứ đứng tên đã chuyển theo tại Main */
  daChuyen: { phienChat: number; duAn: number; telegram: boolean; viecCho: number };
  dayChoAgent: Awaited<ReturnType<typeof dayChoCacAgent>>;
}

export async function doiEmailNguoiDung(emailCu: string, emailMoi: string, nguoiLam: string): Promise<KetQuaDoiEmail> {
  const cu = normalizeEmail(emailCu);
  const moi = normalizeEmail(emailMoi);
  const user = doiEmail(cu, moi); // ném lỗi tiếng Việt nếu sai dạng / trùng / không có
  const ngay = new Date().toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  themBiDanh(cu, moi, `Đổi email ở Cài đặt → Người dùng ${ngay} (${nguoiLam})`);
  const daChuyen = {
    phienChat: doiChuPhienChat({ [cu]: moi }),
    duAn: doiEmailTrongDuAn(cu, moi),
    telegram: doiEmailPhienTelegram(cu, moi),
    viecCho: doiEmailViecCho(cu, moi),
  };
  const dayChoAgent = await dayChoCacAgent(`Main ghi người dùng — đổi email ${cu} → ${moi}`);
  return { user, emailCu: cu, emailMoi: moi, daChuyen, dayChoAgent };
}
