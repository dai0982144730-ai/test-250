// cau-hinh/doc.ts — ĐỌC cấu hình (CHỈ SERVER). Ghi/phiên bản/nhật ký/xuất nhập: xem cau-hinh/ghi.ts.
import type { Q } from "@/lib/db";
import { MAC_DINH, type CauHinh, type KhoaCauHinh } from "./mac-dinh";

/** Giá trị hiện hành của một nhóm cấu hình: bản trong CSDL trộn lên mặc định (thiếu trường thì lấy mặc định). */
export async function layCauHinh<K extends KhoaCauHinh>(q: Q, khoa: K): Promise<CauHinh[K]> {
  const { rows } = await q.query<{ gia_tri: CauHinh[K] }>("SELECT gia_tri FROM docflow.cau_hinh WHERE khoa = $1", [khoa]);
  const md = MAC_DINH[khoa];
  const v = rows[0]?.gia_tri;
  if (v === undefined || v === null) return structuredClone(md);
  if (Array.isArray(md) || Array.isArray(v) || typeof v !== "object") return v;
  return { ...structuredClone(md), ...(v as object) } as CauHinh[K];
}
