// Cài đặt khuôn danh sách — đọc/ghi data/khuon-danh-sach.json (server-only, node:fs; phần thuần ở khuon-danh-sach-thuan.ts).
// Đọc MỖI LƯỢT gọi công cụ (tệp nhỏ) để quản trị đổi ở Cài đặt có hiệu lực ngay, không dựng lại, không đẩy lại hosting.
import fs from "node:fs";
import path from "node:path";
import { gocDuLieu } from "@/lib/goc-du-lieu";
import { CAI_DAT_MAC_DINH, chuanHoaCaiDat, type CaiDatKhuon } from "@/lib/ai/khuon-danh-sach-thuan";

const tep = () => path.join(gocDuLieu(), "khuon-danh-sach.json");

export function docCaiDatKhuon(): CaiDatKhuon {
  try {
    return chuanHoaCaiDat(JSON.parse(fs.readFileSync(tep(), "utf8").replace(/^﻿/, "")));
  } catch {
    return CAI_DAT_MAC_DINH;
  }
}

export function ghiCaiDatKhuon(raw: unknown): CaiDatKhuon {
  const v = chuanHoaCaiDat(raw);
  fs.mkdirSync(path.dirname(tep()), { recursive: true });
  const tam = `${tep()}.${process.pid}.tam`;
  fs.writeFileSync(tam, JSON.stringify(v, null, 2) + "\n", "utf8");
  fs.renameSync(tam, tep());
  return v;
}
