-- 69 — Chức danh lãnh đạo chỉ khai MỘT nơi (Mr. Đại chốt 28/09/2026, gộp menu "Tổ chức & người dùng").
-- Đơn vị chức danh (loai 'chuc_danh') lưu riêng CHỨC DANH ("Phó Tổng Giám đốc" / "PTGĐ"); tên người đang giữ
-- máy tự ghép vào ten / ten_ngan (lib/to-chuc.ts → dongBoChucDanh), không gõ tay nữa.
ALTER TABLE identity.don_vi ADD COLUMN IF NOT EXISTS chuc_danh text;
ALTER TABLE identity.don_vi ADD COLUMN IF NOT EXISTS chuc_danh_ngan text;

-- Lấp một lần từ tên cũ "Phó Tổng Giám đốc · Nguyễn Chính Đại (kiêm …)" → phần trước dấu " · "
UPDATE identity.don_vi
   SET chuc_danh = trim(split_part(ten, ' · ', 1)),
       chuc_danh_ngan = trim(split_part(ten_ngan, ' · ', 1))
 WHERE loai = 'chuc_danh' AND chuc_danh IS NULL;
