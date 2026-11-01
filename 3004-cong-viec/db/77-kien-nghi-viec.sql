-- 77 — Dòng kiến nghị ↔ việc đã giao từ tab "Cần ra quyết định" của Báo cáo tuần (Mr. Đại chốt 02/10/2026).
-- Lãnh đạo bấm Giao việc trên một dòng kiến nghị (chưa có việc trên sổ cái) → ghi lại việc vừa giao để các tuần sau dòng
-- kiến nghị đó (cùng nội dung) hiện "đã có việc" thay vì nút Giao việc. khoa = nội dung kiến nghị đã chuẩn hoá (chuanHoa).
CREATE TABLE IF NOT EXISTS docflow.kien_nghi_viec (
  khoa text PRIMARY KEY,
  cong_viec_id text NOT NULL,
  nguoi text NOT NULL,
  luc timestamptz NOT NULL DEFAULT now()
);
