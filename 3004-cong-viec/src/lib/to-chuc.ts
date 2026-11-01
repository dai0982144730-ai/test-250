// ============================================================
// to-chuc.ts — CHỨC DANH LÃNH ĐẠO CHỈ KHAI MỘT NƠI (Mr. Đại chốt 28/09/2026, menu "Tổ chức & người dùng").
// Đơn vị chức danh (loai 'chuc_danh') khai CHỨC DANH (identity.don_vi.chuc_danh / chuc_danh_ngan, db/69).
// Người đang giữ = người dùng có don_vi_id là đơn vị đó. Máy tự ghép:
//   · tên đơn vị   = "<chức danh> · <tên người>"  (không ai giữ → chỉ chức danh)
//   · chức vụ người = chức danh
// Kiêm nhiệm KHÔNG ghép vào tên nữa — khai ở kiêm nhiệm của người, màn Tổ chức tự hiện "kiêm …".
// Gọi sau mọi lần sửa đơn vị / người dùng ở trang quản trị; chạy lại bao nhiêu lần cũng ra cùng kết quả.
// ============================================================
import type { Q } from "@/lib/db";
import { truongTaiSql } from "@/lib/truong-tai";

export async function dongBoChucDanh(q: Q): Promise<number> {
  const { rows } = await q.query<{ id: string; ten: string; ten_ngan: string; chuc_danh: string | null; chuc_danh_ngan: string | null }>(
    "SELECT id, ten, ten_ngan, chuc_danh, chuc_danh_ngan FROM identity.don_vi WHERE loai = 'chuc_danh'",
  );
  let doi = 0;
  for (const d of rows) {
    const cd = (d.chuc_danh ?? d.ten.split(" · ")[0]).trim();
    const cdNgan = (d.chuc_danh_ngan ?? d.ten_ngan.split(" · ")[0]).trim() || cd;
    const nguoi = await q.query<{ id: string; ten: string; chuc_vu: string | null }>(
      "SELECT id, ten, chuc_vu FROM identity.nguoi_dung WHERE active AND don_vi_id = $1 ORDER BY tao_luc, id LIMIT 1",
      [d.id],
    );
    // Không ai giữ làm đơn vị chính → người giữ KIÊM NHIỆM (vd anh Thanh: chính P.ĐT&PC, kiêm Trợ lý CT) — chức danh vẫn kèm tên
    // (Mr. Đại chốt 28/09: Ban lãnh đạo phải đích danh). Người kiêm nhiệm giữ nguyên chức vụ của đơn vị chính.
    const kiem = nguoi.rows[0]
      ? null
      : (
          await q.query<{ ten: string }>(
            `SELECT n.ten FROM identity.kiem_nhiem k JOIN identity.nguoi_dung n ON n.id = k.nguoi_dung_id AND n.active
              WHERE k.don_vi_id = $1 ORDER BY n.tao_luc, n.id LIMIT 1`,
            [d.id],
          )
        ).rows[0];
    const n = nguoi.rows[0];
    const tenNguoi = n?.ten ?? kiem?.ten;
    const ten = tenNguoi ? `${cd} · ${tenNguoi}` : cd;
    const tenNgan = tenNguoi ? `${cdNgan} · ${tenNguoi}` : cdNgan;
    if (ten !== d.ten || tenNgan !== d.ten_ngan || d.chuc_danh !== cd || d.chuc_danh_ngan !== cdNgan) {
      await q.query("UPDATE identity.don_vi SET ten = $2, ten_ngan = $3, chuc_danh = $4, chuc_danh_ngan = $5 WHERE id = $1", [d.id, ten, tenNgan, cd, cdNgan]);
      doi++;
    }
    if (n && n.chuc_vu !== cd) {
      await q.query("UPDATE identity.nguoi_dung SET chuc_vu = $2 WHERE id = $1", [n.id, cd]);
      doi++;
    }
  }
  return doi;
}

/** Thuộc tính thêm của đơn vị cho màn Tổ chức: chức danh (db/69) + trưởng chính (cột uy_quyen_truong, db/70 — chốt lại 03/10/2026). */
export async function thuocTinhThemDonVi(
  q: Q,
): Promise<Record<string, { chuc_danh: string | null; chuc_danh_ngan: string | null; uy_quyen_truong: string | null; chuc_nang: string | null; ngoai_sci: boolean }>> {
  const { rows } = await q.query<{ id: string; chuc_danh: string | null; chuc_danh_ngan: string | null; uy_quyen_truong: string | null; chuc_nang: string | null; ngoai_sci: boolean | null }>(
    "SELECT id, chuc_danh, chuc_danh_ngan, uy_quyen_truong, chuc_nang, ngoai_sci FROM identity.don_vi",
  );
  return Object.fromEntries(
    rows.map((r) => [r.id, { chuc_danh: r.chuc_danh, chuc_danh_ngan: r.chuc_danh_ngan, uy_quyen_truong: r.uy_quyen_truong, chuc_nang: r.chuc_nang, ngoai_sci: !!r.ngoai_sci }]),
  );
}

/**
 * TRƯỞNG CHÍNH (Mr. Đại chốt 03/10/2026 — cột uy_quyen_truong, trước là "ủy quyền trưởng" chỉ cho lãnh đạo kiêm nhiệm):
 * đơn vị có từ 2 người mang vai Trưởng thì chọn MỘT người trong số họ làm trưởng chính. Bỏ chọn (null) lúc nào cũng được.
 */
export async function kiemUyQuyen(q: Q, donViId: string, nguoiId: string | null): Promise<string | null> {
  if (nguoiId === null) return null;
  const la = await q.query(
    `SELECT 1 FROM identity.nguoi_dung n
      WHERE n.id = $1 AND n.active
        AND (n.don_vi_id = $2 OR n.id IN (SELECT nguoi_dung_id FROM identity.kiem_nhiem WHERE don_vi_id = $2))
        AND EXISTS (SELECT 1 FROM identity.gan_vai_tro g WHERE g.nguoi_dung_id = n.id AND g.vai_tro_id = 'truong-don-vi') AND ${truongTaiSql("$2")}`,
    [nguoiId, donViId],
  );
  if (!la.rows.length) return "Trưởng chính phải là người thuộc đơn vị này (biên chế hoặc kiêm nhiệm), đang hoạt động và mang vai trò Trưởng phòng / GĐ đơn vị";
  return null;
}
