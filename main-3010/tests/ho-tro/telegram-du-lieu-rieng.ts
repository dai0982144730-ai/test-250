// ============================================================
// Thư mục dữ liệu RIÊNG cho bài test cầu nối Telegram — import ĐẦU TIÊN trong
// file test (trước users.ts / projects.ts, vì hai file đó chốt thư mục lúc nạp).
// Bài này ghi users.json (nối/gỡ Telegram) — không được ghi lên bản sao dùng
// chung của các file test khác đang chạy song song.
// users.json: TỰ GHI 4 tài khoản thử (PM · Admin · Người dùng · Người xem) — users.ts KHÔNG tự sinh tài khoản nữa
// (LOI-DUNG-CHUNG 6g.6 A4, Đợt 1b 03/10/2026).
// ============================================================

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { bamMatKhauMoi } from "@/lib/mat-khau-bam";

const goc = process.env.THU_MUC_DU_LIEU ?? "";
export const THU_MUC_TELEGRAM_TEST = path.join(os.tmpdir(), "sci-telegram-test", `${process.pid}-${Date.now()}`);
fs.mkdirSync(THU_MUC_TELEGRAM_TEST, { recursive: true });
for (const ten of ["projects.json"]) {
  const nguon = path.join(goc, ten);
  if (goc !== "" && fs.existsSync(nguon)) fs.copyFileSync(nguon, path.join(THU_MUC_TELEGRAM_TEST, ten));
}
process.env.THU_MUC_DU_LIEU = THU_MUC_TELEGRAM_TEST;

const luc = new Date().toISOString();
const nguoiThu = [
  { email: "dai@sci.vn", name: "Mr. Đại", role: "pm" },
  { email: "admin@sci.vn", name: "Quản trị", role: "admin" },
  { email: "nguoidung@sci.vn", name: "Người dùng thử", role: "engineer" },
  { email: "xem@sci.vn", name: "Người xem thử", role: "viewer" },
].map((u) => ({ id: u.email, ...u, ...bamMatKhauMoi("Thu@2026"), active: true, createdAt: luc }));
fs.writeFileSync(path.join(THU_MUC_TELEGRAM_TEST, "users.json"), JSON.stringify(nguoiThu, null, 2), "utf8");
