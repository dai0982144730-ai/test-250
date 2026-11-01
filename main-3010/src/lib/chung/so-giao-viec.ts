// ============================================================
// so-giao-viec.ts — SỔ GIAO VIỆC CỤC BỘ (VIEC-CUA-TOI-v2.0 mục 3.3)
//
// VÁ LỖ ĐO ĐƯỢC 05/09: khoá API wework đứng tên @thinhhp nên mọi việc tạo
// qua app bị Base ghi "Tạo bởi @thinhhp" — bảng "TÔI GIAO" trên Base mất vết
// người giao thật. Sổ này ghi lại AI giao gì qua app (append-only JSONL,
// giống sổ nhật ký) — bảng TÔI GIAO = (creator==tôi trên Base) ∪ (sổ này).
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { gocDuLieu } from "@/lib/goc-du-lieu";

export interface DongGiaoViec {
  /** ISO thời điểm giao */
  luc: string;
  /** username Base của người giao THẬT (không phải chủ khoá API) */
  nguoiGiao: string;
  /** username Base người nhận */
  giaoCho: string;
  /** id việc Base vừa tạo */
  idViec: string;
  ten: string;
  duAnId: string;
}

const THU_MUC = path.join(gocDuLieu(), "viec");
const FILE = path.join(THU_MUC, "so-giao-viec.jsonl");

export function ghiSoGiaoViec(dong: DongGiaoViec): void {
  fs.mkdirSync(THU_MUC, { recursive: true });
  fs.appendFileSync(FILE, JSON.stringify(dong) + "\n", "utf8");
}

/** Các dòng do 1 người giao, mới nhất trước */
export function docSoGiaoViec(nguoiGiao: string): DongGiaoViec[] {
  const u = nguoiGiao.replace(/^@/, "").trim();
  if (u === "") return [];
  let raw = "";
  try {
    raw = fs.readFileSync(FILE, "utf8");
  } catch {
    return [];
  }
  const ra: DongGiaoViec[] = [];
  for (const line of raw.split("\n")) {
    if (line.trim() === "") continue;
    try {
      const d = JSON.parse(line) as DongGiaoViec;
      if (d && d.nguoiGiao === u && typeof d.idViec === "string") ra.push(d);
    } catch {
      // dòng hỏng — bỏ qua, không làm vỡ sổ
    }
  }
  return ra.reverse();
}
