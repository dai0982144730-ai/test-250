// ============================================================
// lich-su/ghi.ts — GHI LỊCH SỬ (chỉ ghi thêm). Mọi module gọi ghiLichSu() trong CÙNG giao dịch với thao tác.
// Mỗi dòng có hash = sha256(hash dòng trước + nội dung dòng) → sửa lén một dòng là gãy chuỗi (kiemTraChuoi).
// CSDL có trigger chặn UPDATE/DELETE bảng docflow.lich_su (db/01-nen.sql).
// ============================================================

import { createHash } from "node:crypto";
import type { Q } from "@/lib/db";
import type { HanhDongLichSu, LoaiDoiTuong } from "@/lib/types";
import { layNguCanh } from "@/lib/ngu-canh";

export interface SuKienLichSu {
  nguoi: string; // id người làm; 'he-thong' nếu tự động; 'agent:<id>' nếu agent
  doi_tuong_loai: LoaiDoiTuong;
  doi_tuong_id: string;
  hanh_dong: HanhDongLichSu;
  chi_tiet?: Record<string, unknown>;
  don_vi_id?: string | null;
  thay_cho?: string | null; // người gửi thật (văn thư nhập thay người ngoài)
  thiet_bi?: string | null; // không truyền → lấy từ ngữ cảnh yêu cầu (ngu-canh.ts); ngoài yêu cầu → null
}

function bam(truoc: string | null, luc: string, s: SuKienLichSu): string {
  const noiDung = JSON.stringify([
    truoc ?? "",
    luc,
    s.nguoi,
    s.thay_cho ?? null,
    s.don_vi_id ?? null,
    s.thiet_bi ?? null,
    s.doi_tuong_loai,
    s.doi_tuong_id,
    s.hanh_dong,
    chuanHoa(s.chi_tiet ?? {}),
  ]);
  return createHash("sha256").update(noiDung).digest("hex");
}

/**
 * Chuẩn hóa trước khi băm: đi qua JSON (bỏ undefined, Date → chuỗi) rồi xếp khóa mọi object con theo
 * thứ tự cố định. Cần vì jsonb tự sắp lại khóa khi lưu — không chuẩn hóa thì băm lúc kiểm lệch băm lúc ghi.
 */
export function chuanHoa(v: unknown): unknown {
  const xep = (x: unknown): unknown => {
    if (Array.isArray(x)) return x.map(xep);
    if (x && typeof x === "object") {
      const o = x as Record<string, unknown>;
      const ra: Record<string, unknown> = {};
      for (const k of Object.keys(o).sort()) ra[k] = xep(o[k]);
      return ra;
    }
    return x;
  };
  return v === undefined ? null : xep(JSON.parse(JSON.stringify(v)));
}

/** Ghi một dòng lịch sử. Trả về id dòng. */
export async function ghiLichSu(q: Q, suKien: SuKienLichSu): Promise<number> {
  // Thiết bị: sự kiện không truyền thì lấy của yêu cầu hiện tại (xuLy bọc sẵn). Băm và lưu cùng một giá trị.
  const s: SuKienLichSu = { ...suKien, thiet_bi: suKien.thiet_bi || layNguCanh()?.thiet_bi || null };
  // Khóa theo giao dịch để chuỗi băm không bị rẽ nhánh khi nhiều người ghi cùng lúc
  await q.query("SELECT pg_advisory_xact_lock(424242)");
  const { rows } = await q.query<{ hash: string }>("SELECT hash FROM docflow.lich_su ORDER BY id DESC LIMIT 1");
  const truoc = rows[0]?.hash ?? null;
  const luc = new Date().toISOString();
  const hash = bam(truoc, luc, s);
  const r = await q.query<{ id: string }>(
    `INSERT INTO docflow.lich_su (luc, nguoi, thay_cho, don_vi_id, thiet_bi, doi_tuong_loai, doi_tuong_id, hanh_dong, chi_tiet, hash_truoc, hash)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
    [
      luc,
      s.nguoi,
      s.thay_cho ?? null,
      s.don_vi_id ?? null,
      s.thiet_bi ?? null,
      s.doi_tuong_loai,
      s.doi_tuong_id,
      s.hanh_dong,
      JSON.stringify(s.chi_tiet ?? {}),
      truoc,
      hash,
    ],
  );
  return Number(r.rows[0].id);
}

/** Kiểm lại toàn bộ chuỗi băm. Trả về id dòng đầu tiên bị gãy, hoặc null nếu nguyên vẹn. */
export async function kiemTraChuoi(q: Q): Promise<number | null> {
  const { rows } = await q.query<{
    id: string;
    luc: string | Date;
    nguoi: string;
    thay_cho: string | null;
    don_vi_id: string | null;
    thiet_bi: string | null;
    doi_tuong_loai: LoaiDoiTuong;
    doi_tuong_id: string;
    hanh_dong: HanhDongLichSu;
    chi_tiet: Record<string, unknown>;
    hash_truoc: string | null;
    hash: string;
  }>("SELECT * FROM docflow.lich_su ORDER BY id");
  let truoc: string | null = null;
  for (const d of rows) {
    const luc = d.luc instanceof Date ? d.luc.toISOString() : new Date(d.luc).toISOString();
    const h = bam(truoc, luc, d);
    if (d.hash_truoc !== truoc || d.hash !== h) return Number(d.id);
    truoc = d.hash;
  }
  return null;
}
