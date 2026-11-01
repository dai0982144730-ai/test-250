-- ============================================================
-- 47-gop-y.sql — GÓP Ý, PHẢN ÁNH (Mr. Đại chốt 01/10/2026; mẫu từ "Vấn đề phát sinh" của agent Tiến độ 3003).
-- Người dùng thật góp ý bất cập / đề xuất để anh nâng cấp, sửa app. AI CŨNG XEM được mọi góp ý (Mr. Đại chọn).
-- Quản trị đặt trạng thái Đã tiếp nhận / Đã sửa / Không làm + một câu trả lời → người góp ý nhận chuông.
-- ============================================================
CREATE TABLE IF NOT EXISTS docflow.gop_y (
  id           text PRIMARY KEY,                 -- GY-0001
  tieu_de      text NOT NULL,
  noi_dung     text NOT NULL DEFAULT '',
  trang        text,                             -- màn đang mở lúc góp ý, vd /so-do
  anh          jsonb NOT NULL DEFAULT '[]',       -- [{khoa, ten, loai, kich_thuoc}] — file trong kho (luu-tru/kho)
  nguoi        text NOT NULL,
  don_vi_id    text,
  trang_thai   text NOT NULL DEFAULT 'moi',       -- moi | da_tiep_nhan | da_sua | khong_lam
  tra_loi      text,
  tra_loi_boi  text,
  tra_loi_luc  timestamptz,
  tao_luc      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gop_y_tao_luc ON docflow.gop_y(tao_luc DESC);
