-- ============================================================
-- 68-vai-phan-viec.sql — CHỦ TRÌ / PHỐI HỢP (Mr. Đại chốt 28/09/2026)
-- Một việc chỉ có MỘT đơn vị/người chủ trì; các bên khác là phối hợp (quan tâm được biết):
--   · phối hợp không có hạn riêng, không bị tính trễ, không chặn đóng việc; việc xong khi phần chủ trì kết thúc,
--     phần phối hợp tự đóng theo và được báo.
--   · việc cũ nhiều bên: bên đứng đầu (thu_tu nhỏ nhất, còn hiệu lực) = chủ trì, còn lại = phối hợp.
-- Code giữ bất biến qua hàm chuanHoaVai (so-cai/dich-vu.ts) sau mỗi lần thêm/bỏ phần việc.
-- ============================================================
ALTER TABLE docflow.phan_viec ADD COLUMN IF NOT EXISTS vai text;

-- Gán vai cho dòng chưa có (chạy mỗi lần khởi động, chỉ đụng dòng vai IS NULL)
UPDATE docflow.phan_viec p
   SET vai = CASE WHEN p.id = (SELECT x.id FROM docflow.phan_viec x
                                WHERE x.cong_viec_id = p.cong_viec_id AND NOT x.da_bo
                                  AND NOT EXISTS (SELECT 1 FROM docflow.phan_viec y WHERE y.cong_viec_id = p.cong_viec_id AND NOT y.da_bo AND y.vai = 'chu_tri')
                                ORDER BY x.thu_tu, x.id LIMIT 1)
                  THEN 'chu_tri' ELSE 'phoi_hop' END
 WHERE p.vai IS NULL;

-- Phối hợp không có hạn riêng (ngày của việc là ngày của chủ trì)
UPDATE docflow.phan_viec SET ket_thuc = NULL, luon_mo = true
 WHERE vai = 'phoi_hop' AND NOT da_bo AND trang_thai = 'dang_lam' AND (ket_thuc IS NOT NULL OR NOT luon_mo);
