// ============================================================
// so-cai/doc-them.ts — đọc thêm cho trang/API của module so-cai (CHỈ SERVER):
// quyền bấm trên từng dòng, danh mục bộ lọc, việc sinh từ một tài liệu, dòng quyết định Form 0.
// ============================================================
import type { Q } from "@/lib/db";
import type { DongCongViec, NguoiDungPhien } from "@/lib/types";
import { chiTietViec, coTheKetThuc, coThePhanCong, coTheSua, coTheSuaViec, coTheThemPhoiHop, doGiongVoiViecMo, hamDuAnId, nguoiNhanChuyenTiep, phamViGiao, phanDonViMinhTruong, type DongSoCai } from "./dich-vu";
import { hamDuAnYeu } from "./tien-ich";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { layCayDonVi } from "@sci/identity/don-vi";

export type DongCoQuyen = DongSoCai & { co_the_ket_thuc: string[] };

export function themQuyenKetThuc(nd: NguoiDungPhien, ds: DongSoCai[]): DongCoQuyen[] {
  return ds.map((d) => ({
    ...d,
    co_the_ket_thuc: d.trang_thai === "dang_mo" ? d.phan_viec.filter((p) => coTheKetThuc(nd, p)).map((p) => p.id) : [],
  }));
}

/** Thêm quyền sửa (gia hạn, phối hợp, hủy) từng dòng — giao diện căn phòng làm mờ nút không đủ quyền (luật 17). */
export async function themQuyenSua(
  q: Q,
  nd: NguoiDungPhien,
  ds: DongCoQuyen[],
): Promise<(DongCoQuyen & { co_the_sua: boolean; co_the_sua_viec: boolean; co_the_phoi_hop: boolean; co_the_phan_cong: string[]; co_the_dieu_chinh: string[] })[]> {
  const kq: (DongCoQuyen & { co_the_sua: boolean; co_the_sua_viec: boolean; co_the_phoi_hop: boolean; co_the_phan_cong: string[]; co_the_dieu_chinh: string[] })[] = [];
  const cay = await layCayDonVi(q, true);
  const pv = await phamViGiao(q, nd);
  const nhan = await nguoiNhanChuyenTiep(q, nd);
  for (const d of ds) {
    const mo = d.trang_thai === "dang_mo";
    // co_the_phan_cong: phần việc người xem đang nhận (đích danh / đơn vị mình) và có người để giao chuyển tiếp → ô "Giao cho…" (chốt 30/09, 09/10)
    const pc: string[] = [];
    if (mo) for (const p of d.phan_viec) if (await coThePhanCong(q, nd, p, nhan)) pc.push(p.id);
    // co_the_sua_viec: cây bút ✏ (quyền "Sửa việc") — không có quyền thì không hiện bút
    const sua = mo && (await coTheSua(q, nd, d, d.phan_viec));
    // co_the_phoi_hop (K5 02/10): trưởng đơn vị cấp trên của bên chủ trì mời phối hợp được dù không sửa được việc
    const ph = sua || (mo && (await coTheThemPhoiHop(q, nd, d, d.phan_viec, pv, true)));
    // co_the_dieu_chinh: phần việc của đơn vị mình làm trưởng — gia hạn được dù việc do người khác giao (phương án A, 29/10/2026)
    const dc = mo && !sua ? await phanDonViMinhTruong(q, nd, d, d.phan_viec) : [];
    kq.push({ ...d, co_the_sua: sua, co_the_sua_viec: mo && (await coTheSuaViec(q, nd, d, d.phan_viec)), co_the_phoi_hop: ph, co_the_phan_cong: pc, co_the_dieu_chinh: dc });
  }
  return kq;
}

export async function danhMuc(q: Q) {
  const { rows: donVi } = await q.query<{ id: string; ten: string; ten_ngan: string; cap: number; loai: string; cha_id: string | null }>(
    "SELECT id, ten, ten_ngan, cap, loai, cha_id FROM identity.don_vi WHERE active ORDER BY thu_tu, ten",
  );
  const { rows: nguoiDung } = await q.query<{ id: string; ten: string; don_vi_id: string | null }>(
    "SELECT id, ten, don_vi_id FROM identity.nguoi_dung WHERE active ORDER BY ten",
  );
  const { rows: duAn } = await q.query<{ du_an: string }>(
    "SELECT DISTINCT du_an FROM docflow.cong_viec WHERE du_an IS NOT NULL AND du_an <> '' ORDER BY du_an",
  );
  return { don_vi: donVi, nguoi_dung: nguoiDung, du_an: duAn.map((r) => r.du_an) };
}

/** Chi tiết + quyền của người đang xem + thư mục để tải file kết quả. */
export async function chiTietCoQuyen(q: Q, nd: NguoiDungPhien, id: string) {
  const ct = await chiTietViec(q, id);
  if (!ct) return null;
  const { rows: tm } = await q.query<{ id: string }>(
    `SELECT id FROM docflow.thu_muc WHERE don_vi_id = $1 AND loai IN ('di','goc') ORDER BY CASE loai WHEN 'di' THEN 0 ELSE 1 END LIMIT 1`,
    [nd.don_vi_id ?? ""],
  );
  const { rows: ten } = await q.query<{ id: string; ten: string }>(
    "SELECT id, ten FROM identity.nguoi_dung WHERE id = ANY($1::text[])",
    [[ct.giao_boi, ...ct.phan_viec.map((p) => p.ket_thuc_boi)].filter(Boolean)],
  );
  return {
    viec: { ...ct, co_the_ket_thuc: ct.trang_thai === "dang_mo" ? ct.phan_viec.filter((p) => coTheKetThuc(nd, p)).map((p) => p.id) : [] },
    co_the_sua: ct.trang_thai === "dang_mo" && (await coTheSua(q, nd, ct, ct.phan_viec)),
    co_the_dieu_chinh: ct.trang_thai === "dang_mo" && !(await coTheSua(q, nd, ct, ct.phan_viec)) ? await phanDonViMinhTruong(q, nd, ct, ct.phan_viec) : [],
    ten_nguoi: Object.fromEntries(ten.map((r) => [r.id, r.ten])),
    thu_muc_ket_qua: tm[0]?.id ?? null,
  };
}

/** Các việc có nguồn là một tài liệu (mọi phiên bản), kèm trạng thái bản của tài liệu này. */
export async function viecCuaTaiLieu(q: Q, nd: NguoiDungPhien, taiLieuId: string) {
  const { rows } = await q.query<{ cong_viec_id: string; phien_ban: number | null; trang_thai: string; ly_do: string | null; dong_so: number | null }>(
    `SELECT cong_viec_id, phien_ban, trang_thai, ly_do, dong_so FROM docflow.nguon_cong_viec
      WHERE tai_lieu_id = $1 ORDER BY phien_ban DESC NULLS LAST, luc DESC`,
    [taiLieuId],
  );
  const theoViec = new Map<string, (typeof rows)[number]>();
  for (const r of rows) if (!theoViec.has(r.cong_viec_id)) theoViec.set(r.cong_viec_id, r);
  const kq: (DongCoQuyen & { ban_nay: { phien_ban: number | null; trang_thai: string; ly_do: string | null; dong_so: number | null } })[] = [];
  for (const [id, ban] of Array.from(theoViec.entries())) {
    const ct = await chiTietViec(q, id);
    if (!ct) continue;
    const { cac_nguon: _n, ...dong } = ct;
    kq.push({ ...themQuyenKetThuc(nd, [dong])[0], ban_nay: ban });
  }
  return kq.sort((a, b) => (a.ban_nay.dong_so ?? 0) - (b.ban_nay.dong_so ?? 0) || a.id.localeCompare(b.id));
}

export interface DongQuyetDinh {
  dong: DongCongViec;
  da_giao: string | null; // mã việc nếu dòng này đã được giao
  goi_y: { cong_viec_id: string; ten: string; do_giong: number }[];
}

/** Dòng "Nội dung cần TGĐ quyết định" của tài liệu Form 0 (đọc từ kết quả kiểm tra của phiên bản). */
export async function dongQuyetDinh(q: Q, taiLieuId: string, phienBan: number) {
  const { rows } = await q.query<{ ket_qua_kiem_tra: { cong_viec?: DongCongViec[]; ky_bao_cao?: { so?: number; loai?: string } } | null; ten: string; mau_ma: string | null; ky_bao_cao: { so?: number; loai?: string } | null; don_vi_lap: string | null }>(
    `SELECT p.ket_qua_kiem_tra, t.ten, t.mau_ma, t.ky_bao_cao, t.don_vi_lap FROM docflow.phien_ban_tep p
       JOIN docflow.tai_lieu t ON t.id = p.tai_lieu_id WHERE p.tai_lieu_id = $1 AND p.phien_ban = $2`,
    [taiLieuId, phienBan],
  );
  const r = rows[0];
  if (!r) return null;
  const kq = typeof r.ket_qua_kiem_tra === "string" ? JSON.parse(r.ket_qua_kiem_tra) : r.ket_qua_kiem_tra;
  // Bảng quyết định: tag 'bang_quyet_dinh' hoặc bảng được mẫu đánh dấu la_quyet_dinh
  const tags = new Set(["bang_quyet_dinh"]);
  if (r.mau_ma) {
    const m = await q.query<{ dinh_nghia: { bang_cong_viec?: { tag: string; la_quyet_dinh?: boolean }[] } }>("SELECT dinh_nghia FROM docflow.mau_word WHERE ma = $1", [r.mau_ma]);
    for (const b of m.rows[0]?.dinh_nghia?.bang_cong_viec ?? []) if (b.la_quyet_dinh) tags.add(b.tag);
  }
  const dongs = ((kq?.cong_viec ?? []) as DongCongViec[]).filter((d) => tags.has(d.nguon_bang));
  const ky = r.ky_bao_cao ?? kq?.ky_bao_cao ?? null;
  const tenDv = r.don_vi_lap ? (await q.query<{ ten: string }>("SELECT ten FROM identity.don_vi WHERE id = $1", [r.don_vi_lap])).rows[0]?.ten : null;
  const mauSo = r.mau_ma?.replace(/^form-/i, "Form ") ?? "Form 0";
  const kyNhan = ky?.so ? ` · ${ky.loai === "thang" ? "tháng" : "tuần"} ${ky.so}` : "";
  const nhan = `${tenDv ?? "Ban Tổng giám đốc"} · ${mauSo}${kyNhan}`;
  const nguong = (await layCauHinh(q, "quy_tac_de")).nguong_goi_y_trung;
  const { rows: mo } = await q.query<{ id: string; ten: string; du_an: string | null; hang_muc: string | null; ten_cu: string[] | null }>(
    `SELECT s.id, s.ten, s.du_an, s.hang_muc,
            COALESCE((SELECT array_agg(DISTINCT n.du_lieu->>'ten') FROM docflow.nguon_cong_viec n WHERE n.cong_viec_id = s.id), '{}') AS ten_cu
       FROM docflow.so_cai s ORDER BY s.id`,
  );
  const duAnYeu = hamDuAnYeu((await q.query<{ ten: string; ten_ngan: string | null }>("SELECT ten, ten_ngan FROM identity.don_vi")).rows);
  const duAnId = await hamDuAnId(q);
  const ra: DongQuyetDinh[] = [];
  for (const d of dongs) {
    const g = await q.query<{ cong_viec_id: string }>(
      "SELECT cong_viec_id FROM docflow.nguon_cong_viec WHERE tai_lieu_id = $1 AND phien_ban = $2 AND dong_so = $3 AND la_quyet_dinh LIMIT 1",
      [taiLieuId, phienBan, d.dong_so],
    );
    const goiY = d.ma_viec
      ? mo.filter((v) => v.id === d.ma_viec).map((v) => ({ cong_viec_id: v.id, ten: v.ten, do_giong: 1 }))
      : mo
          .map((v) => ({ cong_viec_id: v.id, ten: v.ten, do_giong: doGiongVoiViecMo(d, v, duAnYeu, duAnId) }))
          .filter((x) => x.do_giong >= nguong)
          .sort((a, b) => b.do_giong - a.do_giong)
          .slice(0, 5);
    ra.push({ dong: d, da_giao: g.rows[0]?.cong_viec_id ?? null, goi_y: goiY });
  }
  return { ten_tai_lieu: r.ten, nhan, dong: ra };
}
