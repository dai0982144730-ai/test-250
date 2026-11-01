// Thư mục dữ liệu RIÊNG cho bài test tạo người (ghi users.json) — import ĐẦU TIÊN, trước users.ts.
// Có sẵn một người mã ≠ email (như 21 người chuyển từ agent Công việc ở Đợt 2).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { bamMatKhauMoi } from "@/lib/mat-khau-bam";

export const THU_MUC_NGUOI_TEST = path.join(os.tmpdir(), "sci-nguoi-test", `${process.pid}-${Date.now()}`);
fs.mkdirSync(THU_MUC_NGUOI_TEST, { recursive: true });
const luc = new Date().toISOString();
fs.writeFileSync(
  path.join(THU_MUC_NGUOI_TEST, "users.json"),
  JSON.stringify([
    { id: "quantri@scigroup.vn", email: "quantri@scigroup.vn", name: "Quản trị", role: "admin", ...bamMatKhauMoi("Thu@2026"), active: true, createdAt: luc },
    { id: "ptgd.dai@scigroup.vn", email: "dainc@scigroup.vn", name: "Nguyễn Chính Đại", role: "pm", ...bamMatKhauMoi("Thu@2026"), active: true, createdAt: luc },
  ]),
  "utf8",
);
process.env.THU_MUC_DU_LIEU = THU_MUC_NGUOI_TEST;
