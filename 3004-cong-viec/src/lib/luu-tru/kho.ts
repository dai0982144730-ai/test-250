// ============================================================
// luu-tru/kho.ts — KHO FILE. CHỈ SERVER.
// Hiện lưu trên đĩa tại data/files/<khóa> (hoặc DOCFLOW_FILES_DIR). Trên máy chủ sẽ thay bằng
// Garage S3 (cùng giao diện ghiTep/docTep) — code module khác không phải đổi.
// File đã ghi KHÔNG BAO GIỜ bị xóa: xóa tài liệu chỉ là đánh dấu trong thư mục, lịch sử vẫn mở được.
// Ngoại lệ duy nhất: bản nộp đã bị nộp đè quá 90 ngày (Mr. Đại chốt 08/10/2026) — xem xoaTepNeuMoCoi.
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import type { Q } from "@/lib/db";

function goc(): string {
  return process.env.DOCFLOW_FILES_DIR || path.join(process.cwd(), "data", "files");
}

function duongDan(khoa: string): string {
  if (!/^[a-zA-Z0-9/_.-]+$/.test(khoa) || khoa.includes("..")) throw new Error("Khóa file không hợp lệ");
  return path.join(goc(), khoa);
}

export function bamSha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

/** Ghi file, trả về khóa lưu + mã băm. Khóa theo mã băm nên cùng nội dung chỉ lưu một lần. */
export async function ghiTep(buf: Buffer): Promise<{ khoa: string; sha256: string; kich_thuoc: number }> {
  const sha256 = bamSha256(buf);
  const khoa = `${sha256.slice(0, 2)}/${sha256}`;
  const p = duongDan(khoa);
  if (!fs.existsSync(p)) {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, buf);
  }
  return { khoa, sha256, kich_thuoc: buf.length };
}

export async function docTep(khoa: string): Promise<Buffer> {
  return fs.readFileSync(duongDan(khoa));
}

/**
 * Ngoại lệ duy nhất của luật "không bao giờ xoá" (Mr. Đại chốt 08/10/2026 — bản nộp cũ quá 90 ngày, thu-muc/ban-nop-cu.ts):
 * xoá file trên đĩa CHỈ KHI không còn chỗ nào trỏ tới mã này — bản tài liệu chưa xoá, mẫu Word (mọi bản), ảnh góp ý.
 */
export async function xoaTepNeuMoCoi(q: Q, khoa: string): Promise<boolean> {
  const { rows } = await q.query<{ con: boolean }>(
    `SELECT EXISTS (SELECT 1 FROM docflow.phien_ban_tep WHERE khoa_luu = $1 AND xoa_luc IS NULL)
         OR EXISTS (SELECT 1 FROM docflow.mau_word WHERE khoa_luu = $1)
         OR EXISTS (SELECT 1 FROM docflow.mau_word_phien_ban WHERE khoa_luu = $1)
         OR EXISTS (SELECT 1 FROM docflow.gop_y g WHERE g::text LIKE '%' || $1 || '%') AS con`,
    [khoa],
  );
  if (rows[0]?.con) return false;
  fs.rmSync(duongDan(khoa), { force: true });
  return true;
}
