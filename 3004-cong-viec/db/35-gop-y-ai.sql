-- ============================================================
-- 35-gop-y-ai.sql — AI GÓP Ý NỘI DUNG báo cáo (module kiem-tra-gui). IDEMPOTENT.
-- Góp ý chạy SAU khi tải lên (bất đồng bộ), KHÔNG chặn gửi. Một dòng cho mỗi (tài liệu, phiên bản);
-- sha256 của file để dùng lại kết quả khi cùng một file được tải lên lần nữa (không gọi AI lại).
-- ============================================================
CREATE TABLE IF NOT EXISTS docflow.gop_y_ai (
  tai_lieu_id  text NOT NULL,
  phien_ban    integer NOT NULL,
  sha256       text NOT NULL,
  trang_thai   text NOT NULL CHECK (trang_thai IN ('dang_gop_y', 'xong', 'loi')),
  gop_y        jsonb NOT NULL DEFAULT '[]'::jsonb,   -- GopYAi[] (src/lib/kiem-tra/gop-y-ai.ts)
  loi          text,                                  -- lý do khi trang_thai = 'loi'
  model        text,
  bat_dau_luc  timestamptz NOT NULL DEFAULT now(),
  xong_luc     timestamptz,
  PRIMARY KEY (tai_lieu_id, phien_ban),
  FOREIGN KEY (tai_lieu_id, phien_ban) REFERENCES docflow.phien_ban_tep(tai_lieu_id, phien_ban)
);
CREATE INDEX IF NOT EXISTS gop_y_ai_sha256 ON docflow.gop_y_ai(sha256, trang_thai);
