-- ============================================================
-- 74-moc-xem-chuong.sql — MỐC LẦN MỞ CHUÔNG GẦN NHẤT của từng người (Mr. Đại chốt 29/09/2026)
--   Chuông hiện "8+5": 8 = chưa đọc đã thấy ở lần mở trước · 5 = tin MỚI đến sau lần mở trước (hiện dấu ! đỏ khi mở).
--   Mốc là mã thông báo lớn nhất đã thấy (không dùng giờ máy). Tài khoản chưa có mốc → gieo bằng mã lớn nhất hiện có,
--   để lúc mới bật tính năng không ai bị báo "+40" oan.
-- ============================================================
CREATE TABLE IF NOT EXISTS docflow.moc_xem_chuong (
  nguoi_dung_id text PRIMARY KEY REFERENCES identity.nguoi_dung(id) ON DELETE CASCADE,
  id_cuoi       bigint NOT NULL DEFAULT 0,
  luc           timestamptz NOT NULL DEFAULT now()
);
INSERT INTO docflow.moc_xem_chuong (nguoi_dung_id, id_cuoi)
  SELECT n.id, COALESCE((SELECT max(id) FROM docflow.thong_bao), 0) FROM identity.nguoi_dung n
  ON CONFLICT (nguoi_dung_id) DO NOTHING;
