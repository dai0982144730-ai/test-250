-- 87 — TIN ĐÃ ĐỌC RỜI CHUÔNG, XEM LẠI 7 NGÀY RỒI XOÁ HẲN (Mr. Đại chốt 10/10/2026). Đo 10/10: anh Đại 182 tin — cả 182 đã đọc mà vẫn
-- nằm trong chuông (110 tin của việc còn mở); cả hệ thống 1.333 tin, 478 đã đọc, tin cũ nhất 25/09 → rác thông báo.
--   · Đã đọc (bấm tin, "Đánh dấu đã đọc hết", máy tắt chuông khi việc xong…) → rời danh sách chuông ngay.
--   · Dòng "Xem tin đã đọc (N)" cuối chuông xem lại được trong 7 ngày kể từ lúc đọc; quá 7 ngày lưới hằng ngày xoá hẳn
--     (lib/thong-bao.ts xoaTinDaDocCu — gọi ở so-cai/hen-gio.ts). Sổ lịch sử không đụng.
-- doc_luc = lúc chuyển sang đã đọc; trigger tự ghi ở MỌI đường đánh dấu (không phải sửa từng câu UPDATE).
ALTER TABLE docflow.thong_bao ADD COLUMN IF NOT EXISTS doc_luc timestamptz;
-- Tin đã đọc từ trước (chưa có giờ đọc): tính từ lần chạy đầu — người dùng còn đủ 7 ngày xem lại
UPDATE docflow.thong_bao SET doc_luc = now() WHERE da_doc AND doc_luc IS NULL;

CREATE OR REPLACE FUNCTION docflow.thong_bao_ghi_doc_luc() RETURNS trigger AS $$
BEGIN
  IF NEW.da_doc AND NEW.doc_luc IS NULL THEN
    NEW.doc_luc := now();
  ELSIF NOT NEW.da_doc THEN
    NEW.doc_luc := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS thong_bao_ghi_doc_luc ON docflow.thong_bao;
CREATE TRIGGER thong_bao_ghi_doc_luc BEFORE INSERT OR UPDATE ON docflow.thong_bao
  FOR EACH ROW EXECUTE FUNCTION docflow.thong_bao_ghi_doc_luc();

CREATE INDEX IF NOT EXISTS thong_bao_doc_luc_idx ON docflow.thong_bao (doc_luc) WHERE da_doc;
