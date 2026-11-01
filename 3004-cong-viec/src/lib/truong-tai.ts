// ============================================================
// truong-tai.ts — "LÀM TRƯỞNG Ở" (db/86, Mr. Đại chốt 10/10/2026). Vai Trưởng gán cho cả người; bảng identity.truong_tai khoanh
// lại đơn vị người đó thật sự làm trưởng. Không có dòng nào = như cũ (trưởng ở mọi đơn vị của mình).
// ============================================================

/**
 * Điều kiện SQL: người `n` (bí danh bảng nguoi_dung) giữ quyền trưởng ở đơn vị `dv` (biểu thức SQL: "$1", "n.don_vi_id"…).
 * Chỉ khoanh — vẫn phải kèm điều kiện có vai Trưởng như nơi gọi đang có.
 */
export const truongTaiSql = (dv: string, n = "n"): string =>
  `(NOT EXISTS (SELECT 1 FROM identity.truong_tai t WHERE t.nguoi_dung_id = ${n}.id)
    OR EXISTS (SELECT 1 FROM identity.truong_tai t WHERE t.nguoi_dung_id = ${n}.id AND t.don_vi_id = ${dv}))`;

/** Điều kiện SQL: người `n` là "đầu" theo vai — lãnh đạo, hoặc mang vai Trưởng VÀ làm trưởng ở `dv` */
export const dauTheoVaiSql = (dv: string, n = "n"): string =>
  `(EXISTS (SELECT 1 FROM identity.gan_vai_tro g WHERE g.nguoi_dung_id = ${n}.id AND g.vai_tro_id = 'lanh-dao')
    OR (EXISTS (SELECT 1 FROM identity.gan_vai_tro g WHERE g.nguoi_dung_id = ${n}.id AND g.vai_tro_id = 'truong-don-vi') AND ${truongTaiSql(dv, n)}))`;
