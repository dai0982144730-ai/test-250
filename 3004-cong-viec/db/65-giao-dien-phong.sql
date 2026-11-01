-- ============================================================
-- 65-giao-dien-phong.sql — GIAO DIỆN CĂN PHÒNG (28/09/2026, Mr. Đại chốt)
--   · lựa chọn giao diện của TỪNG NGƯỜI: 'co_dien' (thanh bên + Kho thư mục) | 'can_phong' (sơ đồ khối)
--   · sổ nhắc nộp báo cáo: ai nhắc đơn vị nào, kỳ nào, tin tới ai (ô vàng "đã nhắc" giữ tới khi nộp)
-- ============================================================

-- Không có dòng = giao diện cổ điển
CREATE TABLE IF NOT EXISTS docflow.tuy_chon_giao_dien (
  nguoi_dung_id text PRIMARY KEY REFERENCES identity.nguoi_dung(id) ON DELETE CASCADE,
  giao_dien     text NOT NULL DEFAULT 'co_dien',
  cap_nhat_luc  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS docflow.nhac_nop (
  id          bigserial PRIMARY KEY,
  don_vi_id   text NOT NULL REFERENCES identity.don_vi(id),
  ky_tu       date NOT NULL,                  -- thứ Hai của tuần báo cáo
  ky_den      date NOT NULL,                  -- Chủ nhật
  nguoi_nhac  text NOT NULL,
  nguoi_nhan  jsonb NOT NULL DEFAULT '[]',    -- id người nhận tin
  luc         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS nhac_nop_ky ON docflow.nhac_nop(ky_tu, don_vi_id);
