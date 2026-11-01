-- ============================================================
-- 60-email.sql — gửi email thông báo, nhắc việc (idempotent, chạy sau 01-nen.sql).
-- Hàng đợi thư (bộ gửi chạy định kỳ trong tiến trình, thử lại có giới hạn) + tùy chọn nhận email từng người.
-- ============================================================

CREATE TABLE IF NOT EXISTS docflow.hang_doi_email (
  id            bigserial PRIMARY KEY,
  nguoi_nhan    text,                          -- nguoi_dung.id (NULL = thư thử / địa chỉ ngoài)
  den           text NOT NULL,                 -- địa chỉ email nhận
  loai          text NOT NULL,                 -- loại thông báo (nhan_tai_lieu, qua_han...) hoặc 'thu'
  tieu_de       text NOT NULL,
  van_ban       text NOT NULL,                 -- nội dung dạng chữ thường
  html          text,                          -- nội dung HTML (tùy chọn)
  thong_bao_id  bigint,                        -- thông báo trong app sinh ra thư này (nếu có)
  trang_thai    text NOT NULL DEFAULT 'cho',   -- cho | dang_gui | da_gui | loi (hết lượt thử)
  so_lan_thu    integer NOT NULL DEFAULT 0,
  loi_cuoi      text,
  thu_lai_luc   timestamptz NOT NULL DEFAULT now(),  -- lần thử kế tiếp không sớm hơn lúc này
  nhan_luc      timestamptz,                   -- bộ gửi nhận thư lúc (chống kẹt 'dang_gui')
  tao_luc       timestamptz NOT NULL DEFAULT now(),
  da_gui_luc    timestamptz
);
CREATE INDEX IF NOT EXISTS hang_doi_email_cho ON docflow.hang_doi_email(trang_thai, thu_lai_luc);

-- Tùy chọn cá nhân: không có dòng = nhận email (theo cấu hình chung)
CREATE TABLE IF NOT EXISTS docflow.tuy_chon_email (
  nguoi_dung_id text PRIMARY KEY REFERENCES identity.nguoi_dung(id) ON DELETE CASCADE,
  nhan_email    boolean NOT NULL DEFAULT true,
  cap_nhat_luc  timestamptz NOT NULL DEFAULT now()
);
