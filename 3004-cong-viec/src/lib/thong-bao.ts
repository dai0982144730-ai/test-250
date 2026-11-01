// thong-bao.ts — tạo thông báo (CHỈ SERVER): trong app + email theo cấu hình thong_bao.theo_loai
// (nhắc quá hạn / sắp đến hạn theo so_cai.kenh_nhac). Thư xếp vào hàng đợi trong cùng giao dịch — xem src/lib/email/.
import type { Q } from "@/lib/db";
import { kenhChoLoai, xepThuThongBao } from "@/lib/email/hang-doi";
import { LOAI_CHUONG_GOP, LOAI_CHUONG_TAT_KHI_VIEC_XONG, laLoaiGop, lienKetViec } from "@/lib/thong-bao-gon";
import { dauTheoVaiSql } from "@/lib/truong-tai";

/** File kèm một thông báo: mã tệp đính kèm + tên để hiện (chuông có nút Xem / Tải về) */
export type TepTB = { id: string; ten: string };

export async function taoThongBao(
  q: Q,
  tb: { nguoi_nhan: string; loai: string; noi_dung: string; lien_ket?: string | null; tep?: TepTB[] },
): Promise<void> {
  const kenh = await kenhChoLoai(q, tb.loai);
  let id: number | null = null;
  if (kenh.trong_app) {
    // 3a (Mr. Đại duyệt 08/10): chuông nhắc của máy còn CHƯA ĐỌC cùng người + loại + liên kết → bỏ dòng cũ, chèn dòng mới (lên đầu,
    // tính là tin mới ở chuông "8+5"). Chuông cũ đã đọc thì giữ — lần nhắc này là tin mới thật.
    if (tb.lien_ket && laLoaiGop(tb.loai))
      await q.query("DELETE FROM docflow.thong_bao WHERE nguoi_nhan = $1 AND loai = $2 AND lien_ket = $3 AND NOT da_doc", [
        tb.nguoi_nhan,
        tb.loai,
        tb.lien_ket,
      ]);
    const { rows } = await q.query<{ id: string }>(
      "INSERT INTO docflow.thong_bao (nguoi_nhan, loai, noi_dung, lien_ket, tep) VALUES ($1,$2,$3,$4,$5::jsonb) RETURNING id",
      [tb.nguoi_nhan, tb.loai, tb.noi_dung, tb.lien_ket ?? null, JSON.stringify(tb.tep ?? [])],
    );
    id = Number(rows[0].id);
  }
  if (kenh.email) {
    // 'quan-tri' = mọi quản trị viên: trong app một dòng chung, email gửi từng người
    const nguoiNhan = tb.nguoi_nhan === "quan-tri" ? await danhSachQuanTri(q) : [tb.nguoi_nhan];
    await xepThuThongBao(q, nguoiNhan, { loai: tb.loai, noi_dung: tb.noi_dung, lien_ket: tb.lien_ket, thong_bao_id: id }, kenh);
  }
}

/**
 * Đơn vị chức danh lãnh đạo nằm dưới đơn vị $1 (Mr. Đại chốt 28/09): tin gửi "Ban TGĐ" tập thể phải tới cả 8 lãnh đạo —
 * mỗi lãnh đạo nằm ở đơn vị chức danh riêng (bld-…), không phải thành viên trực tiếp của Ban TGĐ. Đơn vị khác: không có con chức danh.
 */
export const SQL_CHUC_DANH_CON = "SELECT id FROM identity.don_vi WHERE cha_id = $1 AND loai = 'chuc_danh' AND active";

/** Mọi người dùng thuộc một đơn vị (kể cả kiêm nhiệm; Ban TGĐ gồm cả các lãnh đạo chức danh). KHÔNG gồm đơn vị con thường. */
export async function nguoiCuaDonVi(q: Q, donViId: string): Promise<string[]> {
  const { rows } = await q.query<{ id: string }>(
    `SELECT id FROM identity.nguoi_dung WHERE active AND (don_vi_id = $1
       OR id IN (SELECT nguoi_dung_id FROM identity.kiem_nhiem WHERE don_vi_id = $1)
       OR don_vi_id IN (${SQL_CHUC_DANH_CON}))`,
    [donViId],
  );
  return rows.map((r) => r.id);
}

/**
 * "Đầu" đơn vị = trưởng / lãnh đạo thuộc đơn vị + người được ủy quyền trưởng — cùng cách hộp bình luận chọn người nhận
 * (lib/phong/binh-luan.ts). Đơn vị không có ai là "đầu" → mọi thành viên (để tin không rơi mất).
 * Mr. Đại chốt K2 02/10: việc giao cho CẢ đơn vị chỉ báo đầu đơn vị; nhân viên nhận tin khi được phân công đích danh.
 */
export async function dauDonVi(q: Q, donViId: string): Promise<string[]> {
  const { rows } = await q.query<{ id: string; dau: boolean }>(
    `SELECT n.id, (${dauTheoVaiSql("$1")}
              OR EXISTS (SELECT 1 FROM identity.don_vi d WHERE d.id = $1 AND d.uy_quyen_truong = n.id)) AS dau
       FROM identity.nguoi_dung n
      WHERE n.active AND (n.don_vi_id = $1 OR n.id IN (SELECT nguoi_dung_id FROM identity.kiem_nhiem WHERE don_vi_id = $1)
         OR n.don_vi_id IN (${SQL_CHUC_DANH_CON}))
     UNION
     SELECT n.id, true FROM identity.don_vi d JOIN identity.nguoi_dung n ON n.id = d.uy_quyen_truong AND n.active WHERE d.id = $1`,
    [donViId],
  );
  const dau = rows.filter((r) => r.dau);
  return [...new Set((dau.length ? dau : rows).map((r) => r.id))];
}

/** Thông báo cho đầu đơn vị (xem dauDonVi). */
export async function thongBaoDauDonVi(
  q: Q,
  donViId: string,
  tb: { loai: string; noi_dung: string; lien_ket?: string | null; tep?: TepTB[] },
): Promise<void> {
  for (const id of await dauDonVi(q, donViId)) await taoThongBao(q, { ...tb, nguoi_nhan: id });
}

/** Thông báo cho mọi người dùng thuộc một đơn vị (kể cả kiêm nhiệm; Ban TGĐ gồm cả các lãnh đạo chức danh). */
export async function thongBaoDonVi(
  q: Q,
  donViId: string,
  tb: { loai: string; noi_dung: string; lien_ket?: string | null; tep?: TepTB[] },
): Promise<void> {
  for (const id of await nguoiCuaDonVi(q, donViId)) await taoThongBao(q, { ...tb, nguoi_nhan: id });
}

// ---------------- Mở rộng (module identity-cau-hinh): mẫu nội dung, báo quản trị, đọc, đánh dấu ----------------

export interface ThongBao {
  id: number;
  nguoi_nhan: string;
  loai: string;
  noi_dung: string;
  lien_ket: string | null;
  /** File kèm (tệp đính kèm việc) */
  tep: TepTB[];
  da_doc: boolean;
  luc: string;
}

/** Điền biến vào mẫu: "Việc {ma_viec} quá hạn {han}" + {ma_viec:'CV-1'} → "Việc CV-1 quá hạn {han}" (biến thiếu giữ nguyên). */
export function dienMau(mau: string, bien: Record<string, string | number | null | undefined>): string {
  return mau.replace(/\{(\w+)\}/g, (m, k: string) => (bien[k] === undefined || bien[k] === null ? m : String(bien[k])));
}

/** Người nhận "quản trị": quản trị viên hoặc có nguoi_dung.quan_ly phạm vi toàn bộ, còn hoạt động. */
export async function danhSachQuanTri(q: Q): Promise<string[]> {
  const { rows } = await q.query<{ id: string }>(
    `SELECT n.id FROM identity.nguoi_dung n WHERE n.active AND (n.la_quan_tri OR EXISTS (
       SELECT 1 FROM identity.gan_vai_tro g JOIN identity.quyen_vai_tro qv ON qv.vai_tro_id = g.vai_tro_id
       WHERE g.nguoi_dung_id = n.id AND qv.quyen = 'nguoi_dung.quan_ly' AND qv.pham_vi = 'toan_bo'))
     ORDER BY n.id`,
  );
  return rows.map((r) => r.id);
}

/** Thông báo cho từng quản trị viên (mỗi người một dòng để tự đánh dấu đã đọc). */
export async function baoQuanTri(q: Q, tb: { loai: string; noi_dung: string; lien_ket?: string | null }): Promise<number> {
  const ds = await danhSachQuanTri(q);
  for (const id of ds) await taoThongBao(q, { ...tb, nguoi_nhan: id });
  return ds.length;
}

type NguoiNhanTB = { id: string; la_quan_tri: boolean; quyen: Partial<Record<string, string>> };

/** Điều kiện "thông báo của tôi": gửi thẳng cho tôi, hoặc gửi chung 'quan-tri' nếu tôi là quản trị. */
function dieuKienCuaToi(nd: NguoiNhanTB): { sql: string; ts: unknown[] } {
  const laQT = nd.la_quan_tri || nd.quyen["nguoi_dung.quan_ly"] === "toan_bo";
  return laQT ? { sql: "(nguoi_nhan = $1 OR nguoi_nhan = 'quan-tri')", ts: [nd.id] } : { sql: "nguoi_nhan = $1", ts: [nd.id] };
}

export async function danhSachThongBao(
  q: Q,
  nd: NguoiNhanTB,
  loc: { chua_doc?: boolean; da_doc_gan_day?: boolean; gioi_han?: number; truoc_id?: number } = {},
): Promise<ThongBao[]> {
  const dk = dieuKienCuaToi(nd);
  const ts = [...dk.ts];
  let sql = `SELECT id, nguoi_nhan, loai, noi_dung, lien_ket, tep, da_doc, to_char(luc AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS luc
             FROM docflow.thong_bao WHERE ${dk.sql}`;
  if (loc.chua_doc) sql += " AND NOT da_doc";
  // Dòng "Xem tin đã đọc (N)" cuối chuông — chỉ tin đọc trong NGAY_GIU_TIN_DA_DOC ngày (db/87)
  if (loc.da_doc_gan_day) sql += ` AND da_doc AND doc_luc > now() - interval '${NGAY_GIU_TIN_DA_DOC} days'`;
  if (loc.truoc_id) {
    ts.push(loc.truoc_id);
    sql += ` AND id < $${ts.length}`;
  }
  ts.push(Math.min(Math.max(loc.gioi_han ?? 50, 1), 200));
  sql += ` ORDER BY id DESC LIMIT $${ts.length}`;
  const { rows } = await q.query<ThongBao & { id: string }>(sql, ts);
  return rows.map((r) => ({ ...r, id: Number(r.id) }));
}

/**
 * TIN ĐÃ ĐỌC (Mr. Đại chốt 10/10/2026 — db/87): rời chuông ngay khi đọc, xem lại được NGAY_GIU_TIN_DA_DOC ngày kể từ lúc đọc
 * (dòng "Xem tin đã đọc (N)"), quá hạn thì lưới hằng ngày xoá hẳn.
 */
export const NGAY_GIU_TIN_DA_DOC = 7;

export async function demDaDocGanDay(q: Q, nd: NguoiNhanTB): Promise<number> {
  const dk = dieuKienCuaToi(nd);
  const { rows } = await q.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM docflow.thong_bao WHERE ${dk.sql} AND da_doc AND doc_luc > now() - interval '${NGAY_GIU_TIN_DA_DOC} days'`,
    dk.ts,
  );
  return rows[0].n;
}

/** Lưới hằng ngày: xoá hẳn tin đã đọc quá NGAY_GIU_TIN_DA_DOC ngày (sổ lịch sử không đụng). Trả số dòng xoá. */
export async function xoaTinDaDocCu(q: Q): Promise<number> {
  const { rows } = await q.query(
    `DELETE FROM docflow.thong_bao WHERE da_doc AND doc_luc IS NOT NULL AND doc_luc <= now() - interval '${NGAY_GIU_TIN_DA_DOC} days' RETURNING id`,
  );
  return rows.length;
}

export async function demChuaDoc(q: Q, nd: NguoiNhanTB): Promise<number> {
  const dk = dieuKienCuaToi(nd);
  const { rows } = await q.query<{ n: number }>(`SELECT count(*)::int AS n FROM docflow.thong_bao WHERE ${dk.sql} AND NOT da_doc`, dk.ts);
  return rows[0].n;
}

/**
 * Chuông "8+5" (Mr. Đại chốt 29/09): cu = chưa đọc đã thấy ở lần mở chuông trước · moi = chưa đọc đến SAU lần mở đó.
 * Mốc = mã thông báo lớn nhất đã thấy (docflow.moc_xem_chuong); chưa có mốc → coi như 0 (tài khoản mới: mọi tin là mới).
 */
export async function demChuaDocMoi(q: Q, nd: NguoiNhanTB): Promise<{ cu: number; moi: number }> {
  const dk = dieuKienCuaToi(nd);
  const { rows } = await q.query<{ cu: number; moi: number }>(
    `SELECT count(*) FILTER (WHERE id <= m.id_cuoi)::int AS cu, count(*) FILTER (WHERE id > m.id_cuoi)::int AS moi
       FROM docflow.thong_bao,
            (SELECT COALESCE((SELECT id_cuoi FROM docflow.moc_xem_chuong WHERE nguoi_dung_id = $1), 0) AS id_cuoi) m
      WHERE ${dk.sql} AND NOT da_doc`,
    dk.ts,
  );
  return rows[0] ?? { cu: 0, moi: 0 };
}

/** Mở chuông: trả mốc CŨ (để đánh dấu ! tin mới) rồi dời mốc tới tin mới nhất của người này. */
export async function moChuong(q: Q, nd: NguoiNhanTB): Promise<number> {
  const dk = dieuKienCuaToi(nd);
  const cu = Number(
    (await q.query<{ id_cuoi: string }>("SELECT id_cuoi FROM docflow.moc_xem_chuong WHERE nguoi_dung_id = $1", [nd.id])).rows[0]?.id_cuoi ?? 0,
  );
  const moiNhat = Number((await q.query<{ m: string | null }>(`SELECT max(id) AS m FROM docflow.thong_bao WHERE ${dk.sql}`, dk.ts)).rows[0]?.m ?? 0);
  if (moiNhat > cu)
    await q.query(
      `INSERT INTO docflow.moc_xem_chuong (nguoi_dung_id, id_cuoi, luc) VALUES ($1, $2, now())
       ON CONFLICT (nguoi_dung_id) DO UPDATE SET id_cuoi = GREATEST(docflow.moc_xem_chuong.id_cuoi, EXCLUDED.id_cuoi), luc = now()`,
      [nd.id, moiNhat],
    );
  return cu;
}

// ---------------- Chuông tự gọn theo logic (Mr. Đại duyệt 08/10/2026 — định nghĩa loại ở lib/thong-bao-gon.ts) ----------------

/** 3b — việc vừa xong / đóng: chuông vô nghĩa của việc thành đã đọc cho MỌI người nhận. Chuông báo kết quả giữ nguyên. */
export async function tatChuongViecXong(q: Q, cvId: string): Promise<number> {
  const { rows } = await q.query(
    "UPDATE docflow.thong_bao SET da_doc = true WHERE lien_ket = $1 AND loai = ANY($2::text[]) AND NOT da_doc RETURNING id",
    [lienKetViec(cvId), [...LOAI_CHUONG_TAT_KHI_VIEC_XONG]],
  );
  return rows.length;
}

/** 3c — người mở thẻ việc: chuông về việc đó của CHÍNH người này thành đã đọc (không đụng chuông người khác, không đụng chuông chung 'quan-tri') */
export async function docChuongCuaViec(q: Q, nguoiId: string, cvId: string): Promise<number> {
  const { rows } = await q.query("UPDATE docflow.thong_bao SET da_doc = true WHERE nguoi_nhan = $1 AND lien_ket = $2 AND NOT da_doc RETURNING id", [
    nguoiId,
    lienKetViec(cvId),
  ]);
  return rows.length;
}

/** 3d — việc hết hạn lưu bị xoá hẳn: xoá kèm mọi chuông trỏ về việc đó */
export async function xoaChuongCuaViec(q: Q, cvIds: string[]): Promise<number> {
  if (!cvIds.length) return 0;
  const { rows } = await q.query("DELETE FROM docflow.thong_bao WHERE lien_ket = ANY($1::text[]) RETURNING id", [cvIds.map(lienKetViec)]);
  return rows.length;
}

/**
 * Lưới hằng ngày (vòng nền, cùng giờ quét hạn) — gom phần các đường trên chưa phủ: chuông tồn từ trước 08/10, đường đóng việc
 * mới thêm sau này mà quên gọi tatChuongViecXong. ① gộp chuông nhắc trùng (giữ dòng mới nhất) ② tắt chuông vô nghĩa của việc đã xong.
 */
export async function donChuongTonDong(q: Q): Promise<{ gop: number; tat: number }> {
  const gop = await q.query(
    `DELETE FROM docflow.thong_bao t USING docflow.thong_bao m
      WHERE NOT t.da_doc AND NOT m.da_doc AND t.loai = ANY($1::text[]) AND t.lien_ket IS NOT NULL
        AND m.nguoi_nhan = t.nguoi_nhan AND m.loai = t.loai AND m.lien_ket = t.lien_ket AND m.id > t.id
      RETURNING t.id`,
    [[...LOAI_CHUONG_GOP]],
  );
  const tat = await q.query(
    `UPDATE docflow.thong_bao t SET da_doc = true
       FROM docflow.cong_viec c
      WHERE NOT t.da_doc AND t.loai = ANY($1::text[]) AND t.lien_ket = '/cong-viec/' || c.id AND c.trang_thai IN ('hoan_thanh', 'da_dong')
      RETURNING t.id`,
    [[...LOAI_CHUONG_TAT_KHI_VIEC_XONG]],
  );
  return { gop: gop.rows.length, tat: tat.rows.length };
}

/** Đánh dấu đã đọc: danh sách id, hoặc "tat_ca". Chỉ đụng thông báo của chính người đó. Trả số dòng đã đổi. */
export async function danhDauDaDoc(q: Q, nd: NguoiNhanTB, ids: number[] | "tat_ca"): Promise<number> {
  const dk = dieuKienCuaToi(nd);
  if (ids === "tat_ca") {
    const { rows } = await q.query(`UPDATE docflow.thong_bao SET da_doc = true WHERE ${dk.sql} AND NOT da_doc RETURNING id`, dk.ts);
    return rows.length;
  }
  const so = ids.map(Number).filter((n) => Number.isInteger(n));
  if (so.length === 0) return 0;
  const { rows } = await q.query(
    `UPDATE docflow.thong_bao SET da_doc = true WHERE ${dk.sql} AND NOT da_doc AND id = ANY($2::bigint[]) RETURNING id`,
    [...dk.ts, so],
  );
  return rows.length;
}
