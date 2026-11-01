-- ============================================================
-- 67-giai-doan-viec.sql — GIAI ĐOẠN PMP CỦA VIỆC (giao diện căn phòng Đợt 3, 28/09/2026)
-- 🤖 AI tự xếp mỗi việc đang mở vào 1 trong 5 giai đoạn (kèm lý do); người bấm chọn giai đoạn khác là sửa ngay,
-- máy ghi lại người sửa. Menu Dự án nhóm việc theo giai đoạn này.
-- ============================================================
CREATE TABLE IF NOT EXISTS docflow.giai_doan_viec (
  cong_viec_id  text PRIMARY KEY REFERENCES docflow.cong_viec(id),
  giai_doan     text NOT NULL,          -- khoi-tao | thiet-ke | ke-hoach | thuc-thi | giam-sat | ket-thuc
  ly_do         text,                   -- lý do AI nêu (người sửa thì null)
  nguon         text NOT NULL,          -- 'ai' | 'nguoi'
  nguoi_sua     text,
  luc           timestamptz NOT NULL DEFAULT now()
);
