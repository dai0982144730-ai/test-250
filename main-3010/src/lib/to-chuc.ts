// ============================================================
// to-chuc.ts — ĐỌC / GHI data/to-chuc.json (LOI-DUNG-CHUNG 6g.6 A9, Đợt 2 — 03/10/2026). CHỈ SERVER (node:fs).
//   Khuôn + hàm kiểm thuần ở to-chuc-kieu.ts (luật 10: client chỉ import file thuần).
//   Lần đầu do bộ chuyển người (Đợt 2) ghi từ agent Công việc; từ Đợt 3 sửa ở Main rồi đẩy đi.
// ============================================================
import fs from "node:fs";
import path from "node:path";
import { gocDuLieu } from "@/lib/goc-du-lieu";
import { chuanHoaToChuc, TO_CHUC_RONG, type ToChuc } from "@/lib/to-chuc-kieu";

const tep = () => path.join(gocDuLieu(), "to-chuc.json");

/**
 * `chua_co` = chưa chuyển tổ chức lên Main · `hong` = file hỏng (không đọc được JSON) · `ok`.
 * Agent kéo về (Đợt 3) KHÔNG được coi `chua_co` / `hong` là "tổ chức rỗng" mà xoá bản chép của mình.
 */
export type TinhTrangToChuc = "chua_co" | "hong" | "ok";

export function docToChuc(): { toChuc: ToChuc; tinhTrang: TinhTrangToChuc; loi: string[] } {
  let raw: string;
  try {
    raw = fs.readFileSync(tep(), "utf8");
  } catch {
    return { toChuc: { ...TO_CHUC_RONG }, tinhTrang: "chua_co", loi: [] };
  }
  try {
    const { toChuc, loi } = chuanHoaToChuc(JSON.parse(raw));
    if (loi.length) console.error(`[to-chuc] ${loi.length} chỗ sai khuôn trong to-chuc.json: ${loi.slice(0, 5).join(" · ")}`);
    return { toChuc, tinhTrang: "ok", loi };
  } catch (e) {
    console.error(`[to-chuc] to-chuc.json hỏng (${e instanceof Error ? e.message : e}) — giao "hỏng", không giao tổ chức rỗng`);
    return { toChuc: { ...TO_CHUC_RONG }, tinhTrang: "hong", loi: ["to-chuc.json không đọc được"] };
  }
}

/** Ghi đè to-chuc.json (đã qua hàm kiểm). Trả số chỗ sai khuôn bị bỏ. */
export function ghiToChuc(v: unknown): { soLoi: number; loi: string[] } {
  const { toChuc, loi } = chuanHoaToChuc(v);
  fs.mkdirSync(gocDuLieu(), { recursive: true });
  fs.writeFileSync(tep(), JSON.stringify({ ...toChuc, cap_nhat: new Date().toISOString() }, null, 2) + "\n", "utf8");
  return { soLoi: loi.length, loi };
}
