// ============================================================
// kiem-tra/hat-giong.ts — GIEO CÁC MẪU Form 0–10 vào docflow.mau_word (idempotent).
// Mẫu là 9 file Word THẬT của anh Đại đã chuyển sang dạng có ô nhập gắn mã (scripts/chuyen-mau-that.mjs):
// định nghĩa lấy từ mau-word/dinh-nghia.json, file .docx lưu vào kho file.
// Mỗi mẫu gieo HAI bản file:
//   · bản TRẮNG mau-word/trang/form-N.docx (scripts/tao-mau-trang.mjs) — bản chính (mau_word.khoa_luu), người dùng tải về điền;
//   · bản CÓ VÍ DỤ mau-word/form-N.docx (số liệu tuần 29) — để tham khảo, lưu ở mau_word_phien_ban với phien_ban = 0.
// Nâng cấp: mẫu gieo có `phien_ban`; CSDL còn bản gieo cũ hơn mà quản trị CHƯA sửa (không có lịch sử 'mau',
// không có file do người tải lên) thì thay bằng bản mới. Quản trị đã sửa thì giữ nguyên định nghĩa.
// File chính đang là đúng bản ví dụ gieo sẵn (CSDL trước khi có bản trắng) thì đổi sang bản trắng.
// Gửi đến mặc định: Form 5,6,7 → P.ĐT&PC; Form 8 → P.KT&VH; Form 1–4 → Ban TGĐ (Phó TGĐ phụ trách); Form 0 → Ban TGĐ (TGĐ).
// ============================================================
import fs from "node:fs";
import path from "node:path";
import type { Q } from "@/lib/db";
import { ghiTep } from "@/lib/luu-tru/kho";
import MAU_MAC_DINH from "../../../mau-word/dinh-nghia.json";
import { hatGiongLuat } from "@/lib/luat/hat-giong";

interface MauGieo {
  ma: string;
  ten: string;
  don_vi_lap: string | null;
  gui_den_mac_dinh: string | null;
  loai_ky: string;
  tep: string;
  phien_ban?: number;
  dinh_nghia: unknown;
}

export const DANH_SACH_MAU_MAC_DINH = MAU_MAC_DINH as MauGieo[];

/** Dòng mau_word_phien_ban giữ bản CÓ VÍ DỤ của mẫu (không phải một phiên bản của bản chính). */
export const PHIEN_BAN_VI_DU = 0;

/** Thư mục chứa file mẫu (.docx) và báo cáo ví dụ. */
export function thuMucMauWord(): string {
  return process.env.DOCFLOW_MAU_WORD_DIR || path.join(process.cwd(), "mau-word");
}

/** Hai file của một mẫu gieo: bản trắng (chính) và bản có ví dụ. */
export function tepMauGieo(tep: string): { trang: string; vi_du: string } {
  const goc = thuMucMauWord();
  return { trang: path.join(goc, "trang", tep), vi_du: path.join(goc, tep) };
}

async function vaoKho(p: string) {
  return fs.existsSync(p) ? ghiTep(fs.readFileSync(p)) : null;
}

/**
 * Lưu hai bản file của mẫu gieo vào kho. Bản chính = bản trắng (chưa sinh thì dùng bản ví dụ như trước);
 * chỉ ghi đè bản chính khi `ghiDe` (nâng cấp), khi chưa có, hoặc khi bản chính đang là đúng bản ví dụ gieo sẵn.
 */
async function luuTepMau(q: Q, m: MauGieo, ghiDe: boolean): Promise<void> {
  const p = tepMauGieo(m.tep);
  const viDu = await vaoKho(p.vi_du);
  const chinh = (await vaoKho(p.trang)) ?? viDu;
  if (!chinh) return; // chưa sinh file mẫu (node scripts/chuyen-mau-that.mjs && node scripts/tao-mau-trang.mjs)
  await q.query(`UPDATE docflow.mau_word SET khoa_luu = $2 WHERE ma = $1 AND (khoa_luu IS NULL OR $3::boolean OR khoa_luu = $4)`, [
    m.ma,
    chinh.khoa,
    ghiDe,
    viDu?.khoa ?? null,
  ]);
  // Phiên bản hiện hành của bản chính (chỉ khi bản chính đúng là file gieo này)
  await q.query(
    `INSERT INTO docflow.mau_word_phien_ban (ma, phien_ban, ten_tep, khoa_luu, sha256, kich_thuoc, dinh_nghia, tai_len_boi)
     SELECT ma, phien_ban, $2, $3, $4, $5, dinh_nghia, 'he-thong' FROM docflow.mau_word WHERE ma = $1 AND khoa_luu = $3
     ON CONFLICT (ma, phien_ban) DO UPDATE SET ten_tep = EXCLUDED.ten_tep, khoa_luu = EXCLUDED.khoa_luu,
       sha256 = EXCLUDED.sha256, kich_thuoc = EXCLUDED.kich_thuoc
     WHERE docflow.mau_word_phien_ban.khoa_luu <> EXCLUDED.khoa_luu
       AND (docflow.mau_word_phien_ban.tai_len_boi = 'he-thong' OR docflow.mau_word_phien_ban.khoa_luu = $6)`,
    [m.ma, m.tep, chinh.khoa, chinh.sha256, chinh.kich_thuoc, viDu?.khoa ?? null],
  );
  if (!viDu) return;
  await q.query(
    `INSERT INTO docflow.mau_word_phien_ban (ma, phien_ban, ten_tep, khoa_luu, sha256, kich_thuoc, dinh_nghia, tai_len_boi)
     SELECT ma, $2, $3, $4, $5, $6, dinh_nghia, 'he-thong' FROM docflow.mau_word WHERE ma = $1
     ON CONFLICT (ma, phien_ban) DO UPDATE SET ten_tep = EXCLUDED.ten_tep, khoa_luu = EXCLUDED.khoa_luu,
       sha256 = EXCLUDED.sha256, kich_thuoc = EXCLUDED.kich_thuoc, dinh_nghia = EXCLUDED.dinh_nghia
     WHERE docflow.mau_word_phien_ban.khoa_luu <> EXCLUDED.khoa_luu`,
    [m.ma, PHIEN_BAN_VI_DU, `${m.ma}-co-vi-du.docx`, viDu.khoa, viDu.sha256, viDu.kich_thuoc],
  );
}

/** Quản trị đã động vào mẫu chưa (sửa định nghĩa, tải file). */
async function daBiSua(q: Q, ma: string): Promise<boolean> {
  const { rows } = await q.query(
    `SELECT 1 FROM docflow.lich_su WHERE doi_tuong_loai = 'mau' AND doi_tuong_id = $1
     UNION ALL SELECT 1 FROM docflow.mau_word_phien_ban WHERE ma = $1 AND tai_len_boi <> 'he-thong' LIMIT 1`,
    [ma],
  );
  return rows.length > 0;
}

export async function hatGiong(q: Q): Promise<void> {
  const { rows } = await q.query<{ ma: string; khoa_luu: string | null; phien_ban: number }>("SELECT ma, khoa_luu, phien_ban FROM docflow.mau_word");
  const co = new Map(rows.map((r) => [r.ma, r]));
  for (const m of DANH_SACH_MAU_MAC_DINH) {
    const pb = m.phien_ban ?? 1;
    const cu = co.get(m.ma);
    try {
      if (!cu) {
        await q.query(
          `INSERT INTO docflow.mau_word (ma, ten, don_vi_lap, gui_den_mac_dinh, loai_ky, dinh_nghia, phien_ban)
           VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (ma) DO NOTHING`,
          [m.ma, m.ten, m.don_vi_lap, m.gui_den_mac_dinh, m.loai_ky, JSON.stringify(m.dinh_nghia), pb],
        );
        await luuTepMau(q, m, false);
      } else if (Number(cu.phien_ban) < pb && !(await daBiSua(q, m.ma))) {
        // Nâng cấp file + định nghĩa; GIỮ đơn vị lập / nơi nhận đang có trong CSDL (cấu hình tổ chức, vd Form 0 → Trợ lý CT
        // đổi 28/09 bằng tay) — chỉ điền theo code khi CSDL còn trống
        await q.query(
          `UPDATE docflow.mau_word SET ten=$2, don_vi_lap=COALESCE(don_vi_lap, $3), gui_den_mac_dinh=COALESCE(gui_den_mac_dinh, $4),
                  loai_ky=$5, dinh_nghia=$6, phien_ban=$7, sua_luc=now()
           WHERE ma = $1`,
          [m.ma, m.ten, m.don_vi_lap, m.gui_den_mac_dinh, m.loai_ky, JSON.stringify(m.dinh_nghia), pb],
        );
        await luuTepMau(q, m, true);
      } else {
        // Idempotent: bổ sung file còn thiếu (bản chính, bản ví dụ), đổi bản chính ví dụ → bản trắng
        await luuTepMau(q, m, false);
      }
    } catch {
      // Kho file chưa ghi được (vd máy chỉ đọc): mẫu vẫn dùng được để kiểm tra, chỉ thiếu file tải về
    }
  }
  await hatGiongLuat(q); // bộ luật kiểm tra động: 9 luật hệ thống + luật mẫu (module luat)
}
