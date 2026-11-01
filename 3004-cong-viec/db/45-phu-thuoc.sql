-- ============================================================
-- 45-phu-thuoc.sql — ngày tính theo việc khác (idempotent, chạy sau 40-so-cai.sql).
-- "Bắt đầu sau khi xong X" / "Kết thúc N ngày sau khi X": mỗi việc mốc một dòng.
-- Khi mọi việc mốc của một loại đã xong → ngày = ngày xong muộn nhất + so_ngay (ghi vào cong_viec/phan_viec).
-- ============================================================

-- Ngày bắt đầu lấy từ đâu: ngay (ghi cụ thể) | ngay_bao_cao (ô trống → ngày lập) | sau_viec
ALTER TABLE docflow.cong_viec ADD COLUMN IF NOT EXISTS bat_dau_kieu text;

CREATE TABLE IF NOT EXISTS docflow.phu_thuoc_viec (
  id            text PRIMARY KEY,
  cong_viec_id  text NOT NULL REFERENCES docflow.cong_viec(id),
  loai          text NOT NULL,                 -- bat_dau | ket_thuc
  viec_truoc_id text REFERENCES docflow.cong_viec(id), -- null = chưa xác định được việc mốc (chỉ có tên)
  ten           text NOT NULL,                 -- tên việc mốc như ghi trong báo cáo
  so_ngay       integer NOT NULL DEFAULT 0,
  goc           text,                          -- chữ gốc trong ô ngày
  da_tinh       date,                          -- ngày đã tính ra (khi mọi việc mốc đã xong)
  luc           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS phu_thuoc_cv ON docflow.phu_thuoc_viec(cong_viec_id);
CREATE INDEX IF NOT EXISTS phu_thuoc_truoc ON docflow.phu_thuoc_viec(viec_truoc_id);
