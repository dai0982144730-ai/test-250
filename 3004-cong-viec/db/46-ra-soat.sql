-- ============================================================
-- 46-ra-soat.sql — KẾT QUẢ RÀ SOÁT SỔ CÁI (idempotent, chạy sau 40-so-cai.sql).
-- Mỗi lần rà soát (tự động hằng ngày, quản trị bấm tay, hoặc bổ sung) lưu một dòng: đếm + danh sách dòng thiếu kèm lý do.
-- Trang Issue (tab "Thiếu trong sổ cái") và Tổng quan đọc dòng mới nhất — không phải đọc lại mọi báo cáo mỗi lần mở trang.
-- ============================================================
CREATE TABLE IF NOT EXISTS docflow.ra_soat_so_cai (
  id            bigserial PRIMARY KEY,
  luc           timestamptz NOT NULL DEFAULT now(),
  cach_chay     text NOT NULL,          -- tu_dong | bam_tay | bo_sung
  nguoi         text,                   -- người bấm (null khi tự động)
  so_tai_lieu   integer NOT NULL,
  so_viec       integer NOT NULL,
  so_thieu      integer NOT NULL,
  so_loi_ghi_so integer NOT NULL,       -- dòng lúc gửi ĐÃ đọc được mà sổ cái không ghi = lỗi hệ thống
  so_bo_sung    integer NOT NULL DEFAULT 0,
  ket_qua       jsonb NOT NULL          -- KetQuaRaSoat (so-cai/ra-soat.ts)
);
CREATE INDEX IF NOT EXISTS ra_soat_so_cai_luc ON docflow.ra_soat_so_cai(luc DESC);
