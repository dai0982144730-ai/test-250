-- ============================================================
-- 20-thu-muc.sql — chỉ mục cho module thư mục + lịch sử (idempotent, không đổi bảng nền).
-- ============================================================

-- Mỗi đơn vị đúng MỘT thư mục gốc và một thư mục mỗi loại đặc biệt (Đến, Đi, Dự án, Thùng rác):
-- gieo nhiều lần / hai người mở cùng lúc cũng không sinh trùng.
CREATE UNIQUE INDEX IF NOT EXISTS thu_muc_dac_biet_dv
  ON docflow.thu_muc(don_vi_id, loai) WHERE loai IN ('goc', 'den', 'di', 'du_an', 'thung_rac');
CREATE INDEX IF NOT EXISTS thu_muc_cha ON docflow.thu_muc(cha_id);

CREATE INDEX IF NOT EXISTS vi_tri_xoa ON docflow.vi_tri(da_xoa, xoa_luc);
CREATE INDEX IF NOT EXISTS phien_ban_nguoi ON docflow.phien_ban_tep(tai_len_boi);

-- Tìm lịch sử theo thời gian, người, đơn vị
CREATE INDEX IF NOT EXISTS lich_su_luc ON docflow.lich_su(luc);
CREATE INDEX IF NOT EXISTS lich_su_nguoi ON docflow.lich_su(nguoi);
CREATE INDEX IF NOT EXISTS lich_su_don_vi ON docflow.lich_su(don_vi_id);
