// ============================================================
// vai-tro.ts — VAI TRÒ và QUYỀN có phạm vi (CHỈ SERVER).
// Mỗi vai trò bật/tắt từng quyền với phạm vi: của mình / đơn vị / đơn vị và cấp dưới / toàn bộ.
// Vai trò hệ thống (cài sẵn) sửa quyền được nhưng không xóa được.
// ============================================================
import type { Q } from "@/lib/db";
import { DANH_MUC_QUYEN, type PhamVi, type Quyen } from "@/lib/types";
import { THU_TU_PHAM_VI } from "./quyen";
import { ghi, LoiIdentity, type NguCanh } from "./moi-truong";
import { taoMaTuTen } from "./chu";

export interface VaiTroDayDu {
  id: string;
  ten: string;
  mo_ta: string | null;
  he_thong: boolean;
  quyen: Partial<Record<Quyen, PhamVi>>;
  so_nguoi: number;
}

export async function danhSachVaiTro(q: Q): Promise<VaiTroDayDu[]> {
  const { rows } = await q.query<{ id: string; ten: string; mo_ta: string | null; he_thong: boolean; so_nguoi: number }>(
    `SELECT v.id, v.ten, v.mo_ta, v.he_thong,
            (SELECT count(*)::int FROM identity.gan_vai_tro g WHERE g.vai_tro_id = v.id) AS so_nguoi
     FROM identity.vai_tro v ORDER BY v.he_thong DESC, v.ten`,
  );
  const qv = await q.query<{ vai_tro_id: string; quyen: Quyen; pham_vi: PhamVi }>(
    "SELECT vai_tro_id, quyen, pham_vi FROM identity.quyen_vai_tro",
  );
  return rows.map((r) => ({
    ...r,
    quyen: Object.fromEntries(qv.rows.filter((x) => x.vai_tro_id === r.id).map((x) => [x.quyen, x.pham_vi])),
  }));
}

export async function layVaiTro(q: Q, id: string): Promise<VaiTroDayDu | null> {
  return (await danhSachVaiTro(q)).find((v) => v.id === id) ?? null;
}

function kiemQuyen(quyen: Partial<Record<string, PhamVi | null>>): void {
  for (const [k, pv] of Object.entries(quyen)) {
    if (!(k in DANH_MUC_QUYEN)) throw new LoiIdentity(400, `Không có quyền "${k}" trong danh mục`);
    if (pv !== null && pv !== undefined && !THU_TU_PHAM_VI.includes(pv)) throw new LoiIdentity(400, `Phạm vi không hợp lệ: ${pv}`);
  }
}

export async function taoVaiTro(
  q: Q,
  ng: NguCanh,
  v: { id?: string; ten: string; mo_ta?: string | null; quyen?: Partial<Record<Quyen, PhamVi>>; he_thong?: boolean },
): Promise<VaiTroDayDu> {
  if (!v.ten?.trim()) throw new LoiIdentity(400, "Tên vai trò không được trống");
  const id = (v.id?.trim() || taoMaTuTen(v.ten)) || "vai-tro";
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) throw new LoiIdentity(400, "Mã vai trò chỉ gồm chữ thường không dấu, số và dấu gạch ngang");
  const { rows: co } = await q.query("SELECT 1 FROM identity.vai_tro WHERE id = $1", [id]);
  if (co.length > 0) throw new LoiIdentity(409, `Mã vai trò ${id} đã có`);
  kiemQuyen(v.quyen ?? {});
  await q.query("INSERT INTO identity.vai_tro (id, ten, mo_ta, he_thong) VALUES ($1,$2,$3,$4)", [id, v.ten.trim(), v.mo_ta ?? null, !!v.he_thong]);
  for (const [k, pv] of Object.entries(v.quyen ?? {})) {
    if (pv) await q.query("INSERT INTO identity.quyen_vai_tro (vai_tro_id, quyen, pham_vi) VALUES ($1,$2,$3)", [id, k, pv]);
  }
  await ghi(q, ng, { loai: "vai_tro", id, thao_tac: "them", chi_tiet: { ten: v.ten.trim(), quyen: v.quyen ?? {} } });
  return (await layVaiTro(q, id))!;
}

export async function suaVaiTro(q: Q, ng: NguCanh, id: string, v: { ten?: string; mo_ta?: string | null }): Promise<VaiTroDayDu> {
  const cu = await layVaiTro(q, id);
  if (!cu) throw new LoiIdentity(404, `Không có vai trò ${id}`);
  if (v.ten !== undefined && !v.ten.trim()) throw new LoiIdentity(400, "Tên vai trò không được trống");
  const ten = v.ten?.trim() ?? cu.ten;
  const moTa = v.mo_ta !== undefined ? v.mo_ta : cu.mo_ta;
  if (ten === cu.ten && moTa === cu.mo_ta) return cu;
  await q.query("UPDATE identity.vai_tro SET ten=$2, mo_ta=$3 WHERE id=$1", [id, ten, moTa]);
  await ghi(q, ng, { loai: "vai_tro", id, thao_tac: "sua", chi_tiet: { truoc: { ten: cu.ten, mo_ta: cu.mo_ta }, sau: { ten, mo_ta: moTa } } });
  return { ...cu, ten, mo_ta: moTa };
}

/** Đặt phạm vi cho nhiều quyền cùng lúc; null = bỏ quyền đó khỏi vai trò. */
export async function datQuyenVaiTro(
  q: Q,
  ng: NguCanh,
  id: string,
  quyen: Partial<Record<Quyen, PhamVi | null>>,
): Promise<VaiTroDayDu> {
  const cu = await layVaiTro(q, id);
  if (!cu) throw new LoiIdentity(404, `Không có vai trò ${id}`);
  kiemQuyen(quyen);
  const doi: { quyen: string; tu: PhamVi | null; sang: PhamVi | null }[] = [];
  for (const [k, pv] of Object.entries(quyen) as [Quyen, PhamVi | null][]) {
    const truoc = cu.quyen[k] ?? null;
    const sau = pv ?? null;
    if (truoc === sau) continue;
    if (sau === null) await q.query("DELETE FROM identity.quyen_vai_tro WHERE vai_tro_id=$1 AND quyen=$2", [id, k]);
    else
      await q.query(
        `INSERT INTO identity.quyen_vai_tro (vai_tro_id, quyen, pham_vi) VALUES ($1,$2,$3)
         ON CONFLICT (vai_tro_id, quyen) DO UPDATE SET pham_vi = EXCLUDED.pham_vi`,
        [id, k, sau],
      );
    doi.push({ quyen: k, tu: truoc, sang: sau });
  }
  if (doi.length > 0) await ghi(q, ng, { loai: "vai_tro", id, thao_tac: "dat_quyen", chi_tiet: { thay_doi: doi } });
  return (await layVaiTro(q, id))!;
}

/** Xóa vai trò tự tạo. Vai trò hệ thống, hoặc đang gán cho người, thì không xóa được. */
export async function xoaVaiTro(q: Q, ng: NguCanh, id: string): Promise<void> {
  const cu = await layVaiTro(q, id);
  if (!cu) throw new LoiIdentity(404, `Không có vai trò ${id}`);
  if (cu.he_thong) throw new LoiIdentity(409, `"${cu.ten}" là vai trò hệ thống, không xóa được`);
  if (cu.so_nguoi > 0) throw new LoiIdentity(409, `Vai trò đang gán cho ${cu.so_nguoi} người — gỡ khỏi họ trước khi xóa`);
  await q.query("DELETE FROM identity.vai_tro WHERE id = $1", [id]);
  await ghi(q, ng, { loai: "vai_tro", id, thao_tac: "xoa", chi_tiet: { ten: cu.ten, quyen: cu.quyen } });
}
