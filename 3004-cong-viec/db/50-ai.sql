-- ============================================================
-- SCI công việc — MODULE AI (50-59): số lượt agent khác đọc sổ cái qua khóa riêng.
-- Idempotent. Bảng khóa (docflow.khoa_agent) nằm ở 01-nen.sql — file này KHÔNG sửa bảng đó.
-- ============================================================

-- Mỗi khóa mỗi ngày một dòng: đếm số lượt và từng công cụ đã gọi.
-- Lịch sử 'agent_doc' chỉ ghi ở lượt ĐẦU TIÊN trong ngày của mỗi khóa (gộp, không ghi dày),
-- số lượt còn lại đếm ở đây để màn "Khóa cho agent" hiện được.
CREATE TABLE IF NOT EXISTS docflow.khoa_agent_dung (
  khoa_id   text NOT NULL REFERENCES docflow.khoa_agent(id),
  ngay      date NOT NULL,
  so_lan    integer NOT NULL DEFAULT 0,
  cong_cu   jsonb NOT NULL DEFAULT '{}',      -- {"socai.danh_sach_viec": 12, ...}
  lan_cuoi  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (khoa_id, ngay)
);
CREATE INDEX IF NOT EXISTS khoa_agent_hash ON docflow.khoa_agent(khoa_hash);
