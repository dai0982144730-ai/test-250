// ma.ts — sinh mã. CHỈ SERVER.
import { randomBytes } from "node:crypto";
import type { Q } from "@/lib/db";

/** Mã ngẫu nhiên ngắn có tiền tố, vd taoMa('tl') → 'tl-mtk2uo1c-dup3' */
export function taoMa(tienTo: string): string {
  return `${tienTo}-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`;
}

/** Tăng bộ đếm có tên (trong giao dịch) và trả về giá trị mới. */
export async function demTiep(q: Q, ten: string): Promise<number> {
  const { rows } = await q.query<{ gia_tri: number }>(
    `INSERT INTO docflow.bo_dem (ten, gia_tri) VALUES ($1, 1)
     ON CONFLICT (ten) DO UPDATE SET gia_tri = docflow.bo_dem.gia_tri + 1
     RETURNING gia_tri`,
    [ten],
  );
  return Number(rows[0].gia_tri);
}
