-- ============================================================
-- Module identity-cau-hinh — bổ sung cho lược đồ nền (idempotent).
-- Phân quyền riêng từng nhóm cài đặt nằm trong cấu hình 'phan_quyen_cau_hinh' (có phiên bản, xuất nhập được),
-- nên không cần bảng riêng. File này chỉ thêm chỉ mục cho các truy vấn hay dùng.
-- ============================================================

-- Nhật ký phiên bản của một nhóm cài đặt (trang Cài đặt, quay lại bản cũ)
CREATE INDEX IF NOT EXISTS cau_hinh_nhat_ky_khoa ON docflow.cau_hinh_nhat_ky(khoa, phien_ban);

-- Chuông thông báo: đếm chưa đọc của một người
CREATE INDEX IF NOT EXISTS thong_bao_nguoi_nhan ON docflow.thong_bao(nguoi_nhan, da_doc, id DESC);

-- Hộp Đến của tôi (trang Tổng quan): bước đang chờ nhận theo đơn vị nhận
CREATE INDEX IF NOT EXISTS buoc_ht_cho_nhan ON docflow.buoc_hanh_trinh(den_don_vi, trang_thai);

-- Phần việc theo người/đơn vị phụ trách
CREATE INDEX IF NOT EXISTS phan_viec_phu_trach ON docflow.phan_viec(phu_trach_loai, phu_trach_id, trang_thai);

-- Người dùng theo đơn vị
CREATE INDEX IF NOT EXISTS nguoi_dung_don_vi ON identity.nguoi_dung(don_vi_id);
