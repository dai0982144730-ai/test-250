// lich-su/ten.ts — bổ sung TÊN dễ đọc cho các dòng lịch sử (người, đơn vị, đối tượng). CHỈ SERVER.
import type { Q } from "@/lib/db";
import type { DongLichSu } from "@/lib/types";

export interface TenLichSu {
  nguoi: Record<string, string>;
  don_vi: Record<string, string>;
  /** khóa "loai:id" → tên đối tượng */
  doi_tuong: Record<string, string>;
}

async function banDo(q: Q, sql: string, ids: string[]): Promise<Record<string, string>> {
  if (!ids.length) return {};
  const { rows } = await q.query<{ id: string; ten: string }>(sql, [ids]);
  const kq: Record<string, string> = {};
  for (const r of rows) kq[r.id] = r.ten;
  return kq;
}

export async function tenChoLichSu(q: Q, dong: DongLichSu[]): Promise<TenLichSu> {
  const nguoi = new Set<string>();
  const donVi = new Set<string>();
  const theoLoai: Record<string, Set<string>> = {};
  for (const d of dong) {
    nguoi.add(d.nguoi);
    if (d.thay_cho) nguoi.add(d.thay_cho);
    if (d.don_vi_id) donVi.add(d.don_vi_id);
    (theoLoai[d.doi_tuong_loai] ??= new Set()).add(d.doi_tuong_id);
    const ct = d.chi_tiet ?? {};
    if (typeof ct.thu_muc_don_vi === "string") donVi.add(ct.thu_muc_don_vi);
    if (typeof ct.tai_lieu_id === "string") (theoLoai.tai_lieu ??= new Set()).add(ct.tai_lieu_id);
    if (typeof ct.cong_viec_id === "string") (theoLoai.cong_viec ??= new Set()).add(ct.cong_viec_id);
  }
  const ds = (s?: Set<string>) => Array.from(s ?? []);
  const [n, dv, tl, cv, tm, dv2, nd, mau] = await Promise.all([
    banDo(q, "SELECT id, ten FROM identity.nguoi_dung WHERE id = ANY($1::text[])", ds(nguoi)),
    banDo(q, "SELECT id, ten_ngan AS ten FROM identity.don_vi WHERE id = ANY($1::text[])", ds(donVi)),
    banDo(q, "SELECT id, ten FROM docflow.tai_lieu WHERE id = ANY($1::text[])", ds(theoLoai.tai_lieu)),
    banDo(q, "SELECT id, ten FROM docflow.cong_viec WHERE id = ANY($1::text[])", ds(theoLoai.cong_viec)),
    banDo(q, "SELECT id, ten FROM docflow.thu_muc WHERE id = ANY($1::text[])", ds(theoLoai.thu_muc)),
    banDo(q, "SELECT id, ten FROM identity.don_vi WHERE id = ANY($1::text[])", ds(theoLoai.don_vi)),
    banDo(q, "SELECT id, ten FROM identity.nguoi_dung WHERE id = ANY($1::text[])", ds(theoLoai.nguoi_dung)),
    banDo(q, "SELECT ma AS id, ten FROM docflow.mau_word WHERE ma = ANY($1::text[])", ds(theoLoai.mau)),
  ]);
  const doiTuong: Record<string, string> = {};
  const gan = (loai: string, m: Record<string, string>) => {
    for (const [k, v] of Object.entries(m)) doiTuong[`${loai}:${k}`] = v;
  };
  gan("tai_lieu", tl);
  gan("cong_viec", cv);
  gan("thu_muc", tm);
  gan("don_vi", dv2);
  gan("nguoi_dung", nd);
  gan("mau", mau);
  n["he-thong"] ??= "Hệ thống";
  return { nguoi: n, don_vi: dv, doi_tuong: doiTuong };
}
