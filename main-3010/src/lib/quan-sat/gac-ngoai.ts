// ============================================================
// SỔ GÁC NGOÀI — đọc sổ script (server-only, node:fs) cho `main.so_gac`.
// Phần thuần ở gac-ngoai-thuan.ts (luật 10). J13 22/09 · 26/09 mở cho Agent quan sát.
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { gocDuLieu } from "@/lib/goc-du-lieu";
import { docDanhBaAgent } from "@/lib/cai-dat-base";
import {
  BIEN_SAU_MS,
  bocSo,
  congTuDiaChi,
  dungKhoangBaoTri,
  khoangCham,
  type KhoangBaoTri,
  type SuKienGac,
} from "./gac-ngoai-thuan";

/** Trần đọc — sổ chỉ ghi sự kiện (không ghi mỗi nhịp) nên nhỏ (26/09: 39 dòng) */
const TRAN_BYTE = 2 * 1024 * 1024;

export const TEP_SO_GAC = "data/gac-5-agent.jsonl";

function docSoTho(): { suKien: SuKienGac[]; coTep: boolean } {
  try {
    const p = path.join(gocDuLieu(), "gac-5-agent.jsonl");
    const kich = fs.statSync(p).size;
    const fd = fs.openSync(p, "r");
    try {
      const doc = Math.min(kich, TRAN_BYTE);
      const buf = Buffer.alloc(doc);
      fs.readSync(fd, buf, 0, doc, kich - doc);
      return { suKien: bocSo(buf.toString("utf8")), coTep: true };
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return { suKien: [], coTep: false }; // chưa có sổ = script chưa chạy lần nào
  }
}

export interface KetQuaSoGac {
  coTep: boolean;
  tongDong: number;
  dong: SuKienGac[];
  khoang: KhoangBaoTri[];
  bienSauMs: number;
  biCatDong: boolean;
  biCatKhoang: boolean;
}

/**
 * Đọc sổ gác trong [tuLuc, denLuc]. `dong` lọc theo lúc ghi; `khoang` dựng từ
 * TOÀN BỘ sổ rồi lấy khoảng CHẠM khung (khoảng bắt đầu trước `tuLuc` vẫn có).
 * Quá `gioiHan` thì giữ phần MỚI NHẤT, trả tăng dần theo thời gian.
 */
export function docSoGac(tuLuc: string | null, denLuc: string | null, gioiHan: number): KetQuaSoGac {
  const { suKien, coTep } = docSoTho();
  const theoCong = new Map<number, string>();
  for (const a of docDanhBaAgent()) {
    const c = congTuDiaChi(a.diaChi);
    if (c !== null && !theoCong.has(c)) theoCong.set(c, a.ma);
  }
  const tu = tuLuc !== null ? Date.parse(tuLuc) : null;
  const den = denLuc !== null ? Date.parse(denLuc) : null;
  const dongKhung = suKien
    .filter((s) => {
      const t = Date.parse(s.luc);
      return (tu === null || t >= tu) && (den === null || t <= den);
    })
    .sort((a, b) => a.luc.localeCompare(b.luc));
  const khoangKhung = dungKhoangBaoTri(suKien, (c) => theoCong.get(c) ?? null).filter((k) =>
    khoangCham(k, tuLuc, denLuc),
  );
  return {
    coTep,
    tongDong: suKien.length,
    dong: dongKhung.slice(-gioiHan),
    khoang: khoangKhung.slice(-gioiHan),
    bienSauMs: BIEN_SAU_MS,
    biCatDong: dongKhung.length > gioiHan,
    biCatKhoang: khoangKhung.length > gioiHan,
  };
}
