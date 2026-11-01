// Nạp người dùng đã tính quyền (NguoiDungPhien) từ CSDL (CHỈ SERVER).
// Cùng cách tính với src/lib/phien.ts của SCI công việc: quyền = phạm vi RỘNG nhất trong các vai trò;
// cấp = cấp chức vụ nếu có, không thì cấp đơn vị, không có đơn vị thì cấp thấp nhất.
import type { Q } from "@/lib/db";
import type { NguoiDungPhien, PhamVi, Quyen } from "@/lib/types";
import { phamViRongHon } from "./quyen";
import { chuanHoaEmail } from "./chu";

export async function napNguoiDungPhien(q: Q, id: string, tuyChon: { cap_thap_nhat?: number } = {}): Promise<NguoiDungPhien | null> {
  const { rows } = await q.query<{
    id: string;
    email: string;
    ten: string;
    don_vi_id: string | null;
    chuc_vu: string | null;
    cap_chuc_vu: number | null;
    la_quan_tri: boolean;
    active: boolean;
    cap_don_vi: number | null;
  }>(
    `SELECT n.id, n.email, n.ten, n.don_vi_id, n.chuc_vu, n.cap_chuc_vu, n.la_quan_tri, n.active, d.cap AS cap_don_vi
     FROM identity.nguoi_dung n LEFT JOIN identity.don_vi d ON d.id = n.don_vi_id WHERE n.id = $1`,
    [chuanHoaEmail(id)],
  );
  const u = rows[0];
  if (!u || !u.active) return null;
  const kn = await q.query<{ don_vi_id: string }>("SELECT don_vi_id FROM identity.kiem_nhiem WHERE nguoi_dung_id = $1", [u.id]);
  const vt = await q.query<{ vai_tro_id: string; quyen: Quyen | null; pham_vi: PhamVi | null }>(
    `SELECT g.vai_tro_id, qv.quyen, qv.pham_vi FROM identity.gan_vai_tro g
     LEFT JOIN identity.quyen_vai_tro qv ON qv.vai_tro_id = g.vai_tro_id WHERE g.nguoi_dung_id = $1`,
    [u.id],
  );
  const quyen: NguoiDungPhien["quyen"] = {};
  for (const r of vt.rows) if (r.quyen && r.pham_vi) quyen[r.quyen] = phamViRongHon(quyen[r.quyen], r.pham_vi);
  return {
    id: u.id,
    email: u.email,
    ten: u.ten,
    don_vi_id: u.don_vi_id,
    don_vi_ids: [...(u.don_vi_id ? [u.don_vi_id] : []), ...kn.rows.map((r) => r.don_vi_id)],
    chuc_vu: u.chuc_vu,
    cap: u.cap_chuc_vu ?? u.cap_don_vi ?? tuyChon.cap_thap_nhat ?? 3,
    la_quan_tri: u.la_quan_tri,
    vai_tro: Array.from(new Set(vt.rows.map((r) => r.vai_tro_id))),
    quyen,
  };
}
