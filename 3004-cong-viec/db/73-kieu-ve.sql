-- ============================================================
-- 73-kieu-ve.sql — GIAO DIỆN 3D / 2D của từng người (Mr. Đại chốt 29/09/2026)
--   · 3d: khối cam sắc cạnh trên nền phòng tối (giao diện đang dùng)
--   · 2d: phẳng, nền trắng, tông xanh dương (học theo ảnh sơ đồ tổ chức anh gửi)
--   Chọn ở menu tên người góc phải thanh trên — nhớ theo tài khoản (đổi máy / điện thoại vẫn giữ).
-- ============================================================
ALTER TABLE docflow.tuy_chon_giao_dien ADD COLUMN IF NOT EXISTS kieu_ve text NOT NULL DEFAULT '3d';
