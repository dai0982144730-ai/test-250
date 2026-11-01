-- ============================================================
-- 37-luat-ai.sql — KẾT QUẢ LUẬT AI của bộ luật kiểm tra động (module luat, agent luat-ai). IDEMPOTENT.
-- Luật AI chạy SAU khi tải lên (bất đồng bộ, một lượt AI cho mọi luật AI áp dụng, gộp với góp ý AI nếu được).
-- Một dòng cho mỗi (tài liệu, phiên bản); dùng lại kết quả khi cùng sha256 file + cùng dấu bộ luật AI
-- (dau_luat = băm id + nội dung các luật AI áp dụng — sửa / thêm / bớt luật thì dấu đổi, kiểm lại).
-- ============================================================
CREATE TABLE IF NOT EXISTS docflow.luat_ai_ket_qua (
  tai_lieu_id  text NOT NULL,
  phien_ban    integer NOT NULL,
  sha256       text NOT NULL,
  dau_luat     text NOT NULL,
  trang_thai   text NOT NULL CHECK (trang_thai IN ('dang_kiem', 'xong', 'loi')),
  ket_qua      jsonb NOT NULL DEFAULT '[]'::jsonb,   -- KetQuaLuatAi[] (src/lib/luat/types.ts)
  loi          text,                                  -- lý do khi trang_thai = 'loi'
  model        text,
  bat_dau_luc  timestamptz NOT NULL DEFAULT now(),
  xong_luc     timestamptz,
  PRIMARY KEY (tai_lieu_id, phien_ban),
  FOREIGN KEY (tai_lieu_id, phien_ban) REFERENCES docflow.phien_ban_tep(tai_lieu_id, phien_ban)
);
CREATE INDEX IF NOT EXISTS luat_ai_ket_qua_sha ON docflow.luat_ai_ket_qua(sha256, dau_luat, trang_thai);
