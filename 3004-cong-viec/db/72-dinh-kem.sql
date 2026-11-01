-- ============================================================
-- 72-dinh-kem.sql — TỆP ĐÍNH KÈM VIỆC (Mr. Đại chốt 29/09/2026)
-- Kẹp file khi giao việc / báo xong việc / bình luận. Nội dung file lưu KHO RIÊNG data/dinh-kem/<id> (không phải kho
-- tài liệu data/files) → trợ lý AI không có công cụ đọc, không tốn token. Hết hạn lưu (Cài đặt, mặc định 6 tháng) máy
-- xóa nội dung, giữ dòng này (xoa_luc) để người xem biết file từng có.
-- Tải lên trước, gắn vào việc sau: dòng chưa gắn (cong_viec_id NULL) quá 1 ngày thì dọn.
-- ============================================================
CREATE TABLE IF NOT EXISTS docflow.tep_dinh_kem (
  id            text PRIMARY KEY,                 -- 'DK-<ngẫu nhiên>'
  cong_viec_id  text REFERENCES docflow.cong_viec(id),
  noi           text NOT NULL,                    -- 'giao_viec' | 'bao_xong' | 'binh_luan'
  phan_viec_id  text,                             -- báo xong: phần việc nào
  binh_luan_id  bigint,                           -- bình luận nào
  ten_tep       text NOT NULL,
  mime          text NOT NULL DEFAULT 'application/octet-stream',
  kich_thuoc    bigint NOT NULL,
  tai_len_boi   text NOT NULL,
  luc           timestamptz NOT NULL DEFAULT now(),
  xoa_luc       timestamptz                       -- đã xóa nội dung (hết hạn lưu)
);
CREATE INDEX IF NOT EXISTS tep_dinh_kem_cv ON docflow.tep_dinh_kem(cong_viec_id);

-- Thông báo kèm file: [{ "id": "DK-…", "ten": "bien-ban.pdf" }] — chuông hiện nút Xem / Tải về cho từng file
ALTER TABLE docflow.thong_bao ADD COLUMN IF NOT EXISTS tep jsonb NOT NULL DEFAULT '[]';
