-- ============================================================
-- 76-tat-tin-xong-nhan-vien.sql — NÚT "Không nhận thông báo xong việc của Nhân viên" ở chuông (Mr. Đại duyệt K4 02/10/2026)
--   Bật: không nhận tin "cấp dưới đã xong việc" của các việc LỌC RA TỪ BÁO CÁO (Ban lãnh đạo nhận tin này với tư cách cấp trên,
--   đo 02/10: 7 lãnh đạo × 14–18 tin, một nửa từ việc lọc ra từ báo cáo). Việc mình giao / mình phân công vẫn nhận đủ.
--   Nhớ theo tài khoản (đổi máy vẫn giữ). Mặc định tắt = nhận như cũ.
-- ============================================================
ALTER TABLE docflow.tuy_chon_giao_dien ADD COLUMN IF NOT EXISTS tat_tin_xong_nhan_vien boolean NOT NULL DEFAULT false;
