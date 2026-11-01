-- ============================================================
-- 40-so-cai.sql — bổ sung cho module so-cai (idempotent, chạy sau 01-nen.sql).
-- Không sửa bảng nền, chỉ THÊM cột / bảng phụ.
-- ============================================================

-- Phần việc bị bớt: không xóa dòng, chỉ đánh dấu (lịch sử vẫn có đủ)
ALTER TABLE docflow.phan_viec ADD COLUMN IF NOT EXISTS da_bo boolean NOT NULL DEFAULT false;
ALTER TABLE docflow.phan_viec ADD COLUMN IF NOT EXISTS bo_ly_do text;

-- Nguồn: có phải quyết định TGĐ (Form 0) không, ai gửi, dòng thứ mấy trong bảng
ALTER TABLE docflow.nguon_cong_viec ADD COLUMN IF NOT EXISTS la_quyet_dinh boolean NOT NULL DEFAULT false;
ALTER TABLE docflow.nguon_cong_viec ADD COLUMN IF NOT EXISTS nguoi_gui text;
ALTER TABLE docflow.nguon_cong_viec ADD COLUMN IF NOT EXISTS dong_so integer;
CREATE INDEX IF NOT EXISTS nguon_cv_tai_lieu ON docflow.nguon_cong_viec(tai_lieu_id);

-- Đã nhắc hạn: mỗi phần việc một lần mỗi ngày (quá hạn) / một lần mỗi mốc hạn (sắp đến hạn)
CREATE TABLE IF NOT EXISTS docflow.nhac_han (
  phan_viec_id text NOT NULL,
  loai         text NOT NULL,                -- qua_han | sap_den_han
  ngay         text NOT NULL,                -- qua_han: ngày quét; sap_den_han: hạn đang nhắc
  luc          timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (phan_viec_id, loai, ngay)
);
