-- ============================================================
-- 80-gan-wbs.sql — GẮN VIỆC VÀO CÂY WBS CỦA AGENT TIẾN ĐỘ (Mr. Đại chốt 03/10/2026 — agent Công việc thay vai agent Base)
-- Mỗi việc thuộc dự án có cây tiến độ (Cài đặt › Sơ đồ tổ chức dự án › "Mã bên Tiến độ") được gắn MỘT mã WBS hoặc
-- "không thuộc đầu việc nào" (ma_wbs NULL). Nguồn gắn:
--   ('ten_viec' — bỏ 03/10: mã ghi trong tên chỉ là gợi ý cho AI, báo cáo đánh số riêng; dòng cũ bị xoá ngay dưới)
--   'ai'       — 🤖 AI đề xuất kèm lý do + độ chắc; Cài đặt › Gắn WBS quyết chờ người duyệt hay AI tự duyệt
--   'nguoi'    — người sửa / duyệt → người thắng, AI không gắn đè
-- ============================================================
CREATE TABLE IF NOT EXISTS docflow.wbs_viec (
  cong_viec_id  text PRIMARY KEY REFERENCES docflow.cong_viec(id),
  du_an_id      text NOT NULL,          -- mã dự án trong Cài đặt (da-hv…)
  ma_wbs        text,                   -- NULL = không thuộc đầu việc nào của cây
  ten_wbs       text,                   -- tên đầu việc lúc gắn (để hiện "mã + tên" khi agent Tiến độ tắt)
  ly_do         text,                   -- 🤖 lý do AI nêu / ghi chú của người
  do_chac       numeric,                -- 0–1, chỉ AI; NULL = chưa đo (không mặc định 1)
  nguon         text NOT NULL,          -- 'ten_viec' | 'ai' | 'nguoi'
  trang_thai    text NOT NULL,          -- 'cho_duyet' | 'da_duyet'
  nguoi_duyet   text,                   -- NULL khi máy duyệt (mã trong tên / AI tự duyệt)
  luc_duyet     timestamptz,
  luc           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wbs_viec_du_an ON docflow.wbs_viec (du_an_id, trang_thai);
CREATE INDEX IF NOT EXISTS wbs_viec_ma ON docflow.wbs_viec (du_an_id, ma_wbs);
-- 03/10: bỏ luật "máy gắn theo mã ghi trong tên" (đo: CV-2026-0074 ghi 7.2.3 = Họp dân đền bù, cây Tiến độ 7.2.3 = Thi công
-- san nền). Dòng máy gắn theo luật cũ (chưa người duyệt) xoá đi để AI xét lại — chạy mỗi lần khởi động nhưng chỉ khớp dòng cũ.
DELETE FROM docflow.wbs_viec WHERE nguon = 'ten_viec' AND nguoi_duyet IS NULL;
