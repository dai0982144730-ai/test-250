-- ============================================================
-- 83-ban-nop-cu.sql — BẢN NỘP CŨ QUÁ 90 NGÀY XOÁ FILE (Mr. Đại chốt 08/10/2026, bảng B mục 2 — "chỉ bản nộp cũ")
--   Bản đã bị nộp đè (không phải bản hiện tại của tài liệu) mà bản đè nó đã có quá 90 ngày → xoá nội dung file, GIỮ dòng
--   (tên, kích thước, mã băm, kết quả kiểm tra) + ghi xoa_luc. Bản cuối mỗi kỳ giữ mãi: 📒 trên sơ đồ luôn mở / tải được.
--   Đo 07/10: 19 bản cũ / 177 bản, 0,38 MB / 8 MB. Code: src/lib/thu-muc/ban-nop-cu.ts.
-- ============================================================
ALTER TABLE docflow.phien_ban_tep ADD COLUMN IF NOT EXISTS xoa_luc timestamptz;
