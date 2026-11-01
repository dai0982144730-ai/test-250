-- 70 — ỦY QUYỀN TRƯỞNG PHÒNG (Mr. Đại chốt 28/09/2026): trưởng phòng kiêm nhiệm Ban lãnh đạo thì việc của phòng
-- ủy quyền cho MỘT người trong phòng. Người được ủy quyền làm thay trưởng ở mọi chỗ máy cần "trưởng"
-- (người giao việc từ báo cáo, quyền của vai trò trưởng đơn vị, danh sách trưởng ở Thư mục);
-- tin nhắn gửi "trưởng" phòng tới CẢ trưởng thật lẫn người được ủy quyền. Bỏ ủy quyền = mất quyền, không phải sửa vai trò.
ALTER TABLE identity.don_vi ADD COLUMN IF NOT EXISTS uy_quyen_truong text REFERENCES identity.nguoi_dung(id);
