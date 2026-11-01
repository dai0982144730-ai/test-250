-- 78 — 🤖 AI đọc như người: dòng kiến nghị có phải cùng việc với một việc trên sổ cái không (Mr. Đại chốt 02/10/2026).
-- Chỉ hỏi AI những dòng luật code chưa chắc (lib/bao-cao-tuan/can-quyet.ts); kết luận lưu lại, không hỏi lại khi danh sách
-- ứng viên không đổi. cong_viec_id NULL = AI đọc ra KHÔNG phải việc nào trong các ứng viên.
CREATE TABLE IF NOT EXISTS docflow.kien_nghi_khop (
  khoa text NOT NULL,
  ung_vien text NOT NULL,          -- mã các việc ứng viên đã đưa AI, nối bằng dấu phẩy
  cong_viec_id text,
  ly_do text,
  luc timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (khoa, ung_vien)
);
