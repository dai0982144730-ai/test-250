import { QUY_TAC_DE_TEST } from "../helpers/csdl";
// Chuẩn bị chung cho test kiem-tra-gui: kho file tạm, đọc file ví dụ, dựng biến thể báo cáo, sửa cấu hình.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Q } from "@/lib/db";

export function khoTam(): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "docflow-kiem-gui-"));
  process.env.DOCFLOW_FILES_DIR = d;
  return d;
}

export const THU_MUC_VI_DU = path.join(process.cwd(), "mau-word", "vi-du");

export function viDu(ten: string): Buffer {
  return fs.readFileSync(path.join(THU_MUC_VI_DU, ten));
}

export const tep = (ten: string, noi_dung?: Buffer) => ({
  ten_tep: ten,
  mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  noi_dung: noi_dung ?? viDu(ten),
});

/** Bộ sinh mẫu (scripts/tao-mau-word.mjs) để dựng biến thể: ngày ngược, ngày trống... */
export async function boSinh() {
  return import("../../scripts/tao-mau-word.mjs");
}

/** Ghi thẳng một nhóm cấu hình (test không phụ thuộc module identity-cau-hinh). */
export async function datCauHinh(q: Q, khoa: string, gia_tri: unknown): Promise<void> {
  await q.query(
    `INSERT INTO docflow.cau_hinh (khoa, gia_tri) VALUES ($1, $2)
     ON CONFLICT (khoa) DO UPDATE SET gia_tri = EXCLUDED.gia_tri, phien_ban = docflow.cau_hinh.phien_ban + 1`,
    [khoa, JSON.stringify(gia_tri)],
  );
}

export async function xoaCauHinh(q: Q, khoa: string): Promise<void> {
  await q.query("DELETE FROM docflow.cau_hinh WHERE khoa = $1", [khoa]);
  // quy_tac_de: về nền của test cũ (việc không ngày luôn mở), không phải mặc định mới (chặn) — xem helpers/csdl.ts
  if (khoa === "quy_tac_de")
    await q.query("INSERT INTO docflow.cau_hinh (khoa, gia_tri, phien_ban) VALUES ('quy_tac_de', $1, 0)", [JSON.stringify(QUY_TAC_DE_TEST)]);
}
