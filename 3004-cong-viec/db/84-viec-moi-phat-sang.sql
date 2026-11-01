-- ============================================================
-- 84-viec-moi-phat-sang.sql — NÚT "VIỆC CỦA TÔI" PHÁT SÁNG KHI CÓ VIỆC MỚI GIAO ĐÍCH DANH (Mr. Đại chốt 08/10/2026)
--   · phan_viec.tao_luc: lúc phần việc được giao (trước đây không có cột này). Dòng cũ lấy theo cong_viec.tao_luc.
--   · moc_xem_viec: lần cuối người này mở màn Việc của tôi — việc mình CHỦ TRÌ đích danh giao SAU mốc = "việc mới" → nút sáng.
--     Mở màn Việc của tôi (ở agent Công việc hay ở agent khác) thì dời mốc → hết sáng. Code: src/lib/viec-moi.ts.
-- ============================================================
ALTER TABLE docflow.phan_viec ADD COLUMN IF NOT EXISTS tao_luc timestamptz;
UPDATE docflow.phan_viec p SET tao_luc = c.tao_luc FROM docflow.cong_viec c WHERE p.cong_viec_id = c.id AND p.tao_luc IS NULL;
ALTER TABLE docflow.phan_viec ALTER COLUMN tao_luc SET DEFAULT now();

CREATE TABLE IF NOT EXISTS docflow.moc_xem_viec (
  nguoi_dung_id text PRIMARY KEY,
  luc           timestamptz NOT NULL DEFAULT now()
);
-- Mốc đặt sai ngày 08/10 (bản đầu: lần đầu = lúc đăng nhập, bỏ sót việc giao trước đó) → xoá, lần đọc sau đặt lại = 7 ngày trước.
-- Chỉ chạm mốc cũ hơn 08/10 16:30 giờ VN mà người đó chưa mở lại Việc của tôi — mở rồi thì mốc mới hơn, không bị xoá.
DELETE FROM docflow.moc_xem_viec WHERE luc < '2026-10-08T09:30:00Z' AND luc > '2026-10-08T00:00:00Z';
