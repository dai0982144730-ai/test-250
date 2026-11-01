-- 81 — CHỨC NĂNG NHIỆM VỤ CỦA ĐƠN VỊ (Mr. Đại chốt 03/10/2026): một ô chữ cho mỗi đơn vị (kể cả ô chức danh lãnh đạo),
-- sửa ở Cài đặt › Tổ chức & người dùng. 🤖 AI soạn giao việc ở màn Cây việc đọc ô này để đề xuất đơn vị chủ trì,
-- đơn vị phối hợp và lãnh đạo phụ trách. Nội dung gốc: NQ 06/2026/NQ-SCI-HĐQT (29/05/2026) Phụ lục 02 · NQ thành lập
-- Phòng Cơ điện (14/09/2026) · phân công Ban lãnh đạo Mr. Đại nhắn 03/10/2026 — nạp một lần ở lib/to-chuc/chuc-nang-mac-dinh.ts.
ALTER TABLE identity.don_vi ADD COLUMN IF NOT EXISTS chuc_nang text;
