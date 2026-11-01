// ============================================================
// lich-su/doc.ts — ĐỌC LỊCH SỬ. Chủ module: thu-muc/lich-su (giai đoạn 2). Chữ ký là hợp đồng.
// Lọc theo quyền lich_su.xem:
//   cua_minh            = dòng mình làm (hoặc được nhập thay mình) + dòng về đối tượng của mình
//                         (tài liệu mình tạo/tải lên, việc mình giao/phụ trách, chính tài khoản mình)
//   don_vi              = thêm dòng của đơn vị mình + đối tượng thuộc đơn vị mình
//   don_vi_va_cap_duoi  = như trên, gồm cả đơn vị cấp dưới
//   toan_bo             = tất cả
// ============================================================
import type { Q } from "@/lib/db";
import type { DongLichSu, LoaiDoiTuong, NguoiDungPhien } from "@/lib/types";
import { coQuyen } from "@sci/identity";
import { layCayDonVi } from "@sci/identity/don-vi";

type Hang = Omit<DongLichSu, "id" | "luc"> & { id: number | string; luc: string | Date };

function chuanDong(r: Hang): DongLichSu {
  return {
    ...r,
    id: Number(r.id),
    luc: r.luc instanceof Date ? r.luc.toISOString() : new Date(r.luc).toISOString(),
    chi_tiet: typeof r.chi_tiet === "string" ? JSON.parse(r.chi_tiet) : (r.chi_tiet ?? {}),
  };
}

/** Dòng thời gian đầy đủ của một đối tượng (cũ → mới). Gồm cả dòng của đối tượng khác nhắc tới nó (chi_tiet.<loai>_id). */
export async function lichSuDoiTuong(q: Q, loai: LoaiDoiTuong, id: string): Promise<DongLichSu[]> {
  const { rows } = await q.query<Hang>(
    `SELECT * FROM docflow.lich_su
     WHERE (doi_tuong_loai = $1 AND doi_tuong_id = $2) OR chi_tiet ->> ($1 || '_id') = $2
     ORDER BY id`,
    [loai, id],
  );
  return rows.map(chuanDong);
}

/** Điều kiện SQL cho phạm vi xem. Trả null = không giới hạn. Thêm tham số vào `ts`. */
function dieuKienPhamVi(nd: NguoiDungPhien, pv: string, dvs: string[], ts: unknown[]): string | null {
  if (nd.la_quan_tri || pv === "toan_bo") return null;
  ts.push(nd.id);
  const me = `$${ts.length}`;
  const cuaMinh = `(
    l.nguoi = ${me} OR l.thay_cho = ${me}
    OR (l.doi_tuong_loai = 'nguoi_dung' AND l.doi_tuong_id = ${me})
    OR (l.doi_tuong_loai = 'tai_lieu' AND (
         EXISTS (SELECT 1 FROM docflow.tai_lieu t WHERE t.id = l.doi_tuong_id AND t.nguoi_tao = ${me})
      OR EXISTS (SELECT 1 FROM docflow.phien_ban_tep p WHERE p.tai_lieu_id = l.doi_tuong_id AND p.tai_len_boi = ${me})))
    OR (l.doi_tuong_loai = 'cong_viec' AND (
         EXISTS (SELECT 1 FROM docflow.cong_viec c WHERE c.id = l.doi_tuong_id AND c.giao_boi = ${me})
      OR EXISTS (SELECT 1 FROM docflow.phan_viec p WHERE p.cong_viec_id = l.doi_tuong_id AND p.phu_trach_loai = 'nguoi' AND p.phu_trach_id = ${me})))
  )`;
  if (pv === "cua_minh" || dvs.length === 0) return cuaMinh;
  ts.push(dvs);
  const d = `$${ts.length}::text[]`;
  const cuaDonVi = `(
    l.don_vi_id = ANY(${d})
    OR (l.doi_tuong_loai = 'tai_lieu' AND (
         EXISTS (SELECT 1 FROM docflow.tai_lieu t WHERE t.id = l.doi_tuong_id AND t.don_vi_lap = ANY(${d}))
      OR EXISTS (SELECT 1 FROM docflow.vi_tri v JOIN docflow.thu_muc tm ON tm.id = v.thu_muc_id
                 WHERE v.tai_lieu_id = l.doi_tuong_id AND tm.don_vi_id = ANY(${d}))))
    OR (l.doi_tuong_loai = 'cong_viec' AND (
         EXISTS (SELECT 1 FROM docflow.cong_viec c WHERE c.id = l.doi_tuong_id AND c.don_vi_giao = ANY(${d}))
      OR EXISTS (SELECT 1 FROM docflow.phan_viec p WHERE p.cong_viec_id = l.doi_tuong_id AND p.phu_trach_loai = 'don_vi' AND p.phu_trach_id = ANY(${d}))))
    OR (l.doi_tuong_loai = 'thu_muc' AND EXISTS (SELECT 1 FROM docflow.thu_muc tm WHERE tm.id = l.doi_tuong_id AND tm.don_vi_id = ANY(${d})))
    OR (l.doi_tuong_loai = 'don_vi' AND l.doi_tuong_id = ANY(${d}))
    OR (l.doi_tuong_loai = 'nguoi_dung' AND EXISTS (SELECT 1 FROM identity.nguoi_dung n WHERE n.id = l.doi_tuong_id AND n.don_vi_id = ANY(${d})))
  )`;
  return `(${cuaMinh} OR ${cuaDonVi})`;
}

function mauLike(s: string): string {
  return `%${s.trim().replace(/[\\%_]/g, (c) => "\\" + c)}%`;
}

type LocLichSu = { tu?: string; den?: string; nguoi?: string; don_vi_id?: string; doi_tuong_loai?: LoaiDoiTuong; hanh_dong?: string; tu_khoa?: string; gioi_han?: number };

/** Dựng mệnh đề WHERE theo bộ lọc + quyền lich_su.xem. null = không có quyền xem. */
async function dieuKienLoc(
  q: Q,
  nd: NguoiDungPhien,
  loc: LocLichSu,
): Promise<{ where: string; ts: unknown[] } | null> {
  const pv = nd.la_quan_tri ? "toan_bo" : nd.quyen["lich_su.xem"];
  if (!pv) return null;
  const ts: unknown[] = [];
  const dk: string[] = [];
  let dvs: string[] = [];
  // Đơn vị xem được tính TỪNG đơn vị qua coQuyen (soát vòng 2 · 03/10/2026): trưởng không giữ quyền trưởng ở đơn vị kiêm
  // (đơn vị đó đã có trưởng chính khác) chỉ còn phạm vi thành viên ở đó — trước đây phạm vi gộp áp lên mọi đơn vị của người đó.
  if (pv === "don_vi" || pv === "don_vi_va_cap_duoi") {
    const cay = await layCayDonVi(q, true);
    dvs = cay.filter((d) => coQuyen(nd, "lich_su.xem", { don_vi_id: d.id }, cay)).map((d) => d.id);
  }
  const pham = dieuKienPhamVi(nd, pv, dvs, ts);
  if (pham) dk.push(pham);

  if (loc.tu) {
    ts.push(loc.tu);
    dk.push(`l.luc >= $${ts.length}::timestamptz`);
  }
  if (loc.den) {
    // Chỉ có ngày (yyyy-mm-dd) → hết ngày đó
    const den = /^\d{4}-\d{2}-\d{2}$/.test(loc.den) ? `${loc.den}T23:59:59.999+07:00` : loc.den;
    ts.push(den);
    dk.push(`l.luc <= $${ts.length}::timestamptz`);
  }
  if (loc.nguoi?.trim()) {
    ts.push(loc.nguoi.trim());
    const a = ts.length;
    ts.push(mauLike(loc.nguoi));
    const b = ts.length;
    dk.push(`(l.nguoi = $${a} OR l.thay_cho = $${a} OR l.nguoi IN (SELECT id FROM identity.nguoi_dung WHERE ten ILIKE $${b} OR email ILIKE $${b}))`);
  }
  if (loc.don_vi_id) {
    ts.push(loc.don_vi_id);
    dk.push(`l.don_vi_id = $${ts.length}`);
  }
  if (loc.doi_tuong_loai) {
    ts.push(loc.doi_tuong_loai);
    dk.push(`l.doi_tuong_loai = $${ts.length}`);
  }
  if (loc.hanh_dong) {
    ts.push(loc.hanh_dong);
    dk.push(`l.hanh_dong = $${ts.length}`);
  }
  if (loc.tu_khoa?.trim()) {
    ts.push(mauLike(loc.tu_khoa));
    const k = `$${ts.length}`;
    dk.push(`(l.doi_tuong_id ILIKE ${k} OR l.chi_tiet::text ILIKE ${k} OR l.nguoi ILIKE ${k}
      OR (l.doi_tuong_loai = 'tai_lieu' AND EXISTS (SELECT 1 FROM docflow.tai_lieu t WHERE t.id = l.doi_tuong_id AND t.ten ILIKE ${k}))
      OR (l.doi_tuong_loai = 'cong_viec' AND EXISTS (SELECT 1 FROM docflow.cong_viec c WHERE c.id = l.doi_tuong_id AND c.ten ILIKE ${k}))
      OR l.nguoi IN (SELECT id FROM identity.nguoi_dung WHERE ten ILIKE ${k}))`);
  }
  return { where: dk.length ? "WHERE " + dk.join(" AND ") : "", ts };
}

/** Tìm trong lịch sử theo bộ lọc, lọc theo quyền lich_su.xem của người hỏi. */
export async function timLichSu(q: Q, nd: NguoiDungPhien, loc: LocLichSu): Promise<DongLichSu[]> {
  const dl = await dieuKienLoc(q, nd, loc);
  if (!dl) return [];
  const { where, ts } = dl;
  const gioiHan = Math.min(Math.max(Math.floor(loc.gioi_han ?? 200), 1), 2000);
  ts.push(gioiHan);
  const { rows } = await q.query<Hang>(
    `SELECT l.* FROM docflow.lich_su l ${where} ORDER BY l.id DESC LIMIT $${ts.length}`,
    ts,
  );
  return rows.map(chuanDong);
}

/** Một TRANG lịch sử (mới nhất trước) + tổng số dòng khớp lọc — màn Lịch sử chia trang 30 dòng
 *  (E40 — Mr. Đại 04/10/2026). Trước 04/10 màn chỉ lấy 300 dòng mới nhất, dòng cũ hơn không xem được. */
export async function timLichSuTheoTrang(
  q: Q,
  nd: NguoiDungPhien,
  loc: LocLichSu,
  trang: { bo: number; lay: number },
): Promise<{ dong: DongLichSu[]; tong: number }> {
  const dl = await dieuKienLoc(q, nd, loc);
  if (!dl) return { dong: [], tong: 0 };
  const { where, ts } = dl;
  const dem = await q.query<{ n: string }>(`SELECT count(*)::text AS n FROM docflow.lich_su l ${where}`, ts);
  const lay = Math.min(Math.max(Math.floor(trang.lay), 1), 200);
  const bo = Math.max(Math.floor(trang.bo), 0);
  const { rows } = await q.query<Hang>(
    `SELECT l.* FROM docflow.lich_su l ${where} ORDER BY l.id DESC LIMIT $${ts.length + 1} OFFSET $${ts.length + 2}`,
    [...ts, lay, bo],
  );
  return { dong: rows.map(chuanDong), tong: Number(dem.rows[0]?.n ?? 0) };
}
