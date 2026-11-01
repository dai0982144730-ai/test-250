-- ============================================================
-- 47-ai-doc-bao-cao.sql — KẾT QUẢ "AI ĐỌC BÁO CÁO" theo từng bản tài liệu (idempotent).
-- AI tự chạy sau khi tải lên: việc viết ngoài bảng, tên việc gợi ý, việc trùng theo nghĩa (so-cai/ai-ra-viec.ts).
-- Lưu lại để mở lại tài liệu không tốn lượt AI; "AI đọc lại" ghi đè.
-- ============================================================
CREATE TABLE IF NOT EXISTS docflow.ai_doc_bao_cao (
  tai_lieu_id  text NOT NULL REFERENCES docflow.tai_lieu(id),
  phien_ban    integer NOT NULL,
  luc          timestamptz NOT NULL DEFAULT now(),
  ket_qua      jsonb,          -- KetQuaAiDocBaoCao
  loi          text,           -- AI lỗi / chưa kết nối (không chặn gửi)
  PRIMARY KEY (tai_lieu_id, phien_ban)
);

-- Việc AI tìm thấy mà người xem đã quyết "không phải việc" (người gửi không tích lúc gửi, quản trị bấm Bỏ qua): câu gốc
ALTER TABLE docflow.ai_doc_bao_cao ADD COLUMN IF NOT EXISTS bo_qua jsonb NOT NULL DEFAULT '[]';
