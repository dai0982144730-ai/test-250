// ============================================================
// duong-dan.ts — THƯ MỤC DỮ LIỆU CHẠY của module AI (phiên chat, kỹ năng, file xuất, sandbox CLI).
// Mặc định `data/` như bản gốc; test đặt DOCFLOW_AI_DATA để không ghi vào data thật.
// Server-only.
// ============================================================

import path from "node:path";

export function thuMucDuLieu(...con: string[]): string {
  const goc = process.env.DOCFLOW_AI_DATA?.trim() || path.join(process.cwd(), "data");
  return path.join(goc, ...con);
}
