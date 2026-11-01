-- sci-identity — lược đồ schema identity (idempotent). Chép từ db/01-nen.sql của SCI công việc; web khác chạy file này lúc khởi động.
-- Không có bảng lịch sử/thông báo: web chủ tự ghi qua NguCanh (xem README.md).

CREATE SCHEMA IF NOT EXISTS identity;

-- ---------------- IDENTITY (packages/sci-identity) ----------------

-- Cây đơn vị có cấp. cap: 0 = trên Ban TGĐ (vd HĐQT), 1 = Ban TGĐ, 2 = 4 phòng, 3 = 4 đơn vị,
-- 9 = bên ngoài. Cấp là DỮ LIỆU, đổi trên trang quản trị.
CREATE TABLE IF NOT EXISTS identity.don_vi (
  id          text PRIMARY KEY,               -- vd 'ban-tgd', 'p-dtpc', 'bqlda-qt'
  ten         text NOT NULL,                  -- 'Phòng Đầu tư và Pháp chế'
  ten_ngan    text NOT NULL,                  -- 'P.ĐT&PC'
  cap         smallint NOT NULL DEFAULT 3,
  cha_id      text REFERENCES identity.don_vi(id),
  loai        text NOT NULL DEFAULT 'don_vi', -- ban_tgd | phong | don_vi | rieng | ca_nhan | ben_ngoai
  mau_ma      text,                           -- mẫu báo cáo riêng của đơn vị, vd 'form-7'
  thu_tu      integer NOT NULL DEFAULT 0,
  active      boolean NOT NULL DEFAULT true,
  tao_luc     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS identity.nguoi_dung (
  id            text PRIMARY KEY,             -- = email chuẩn hóa lowercase
  email         text NOT NULL UNIQUE,
  ten           text NOT NULL,
  mat_khau_hash text NOT NULL,
  salt          text NOT NULL,
  don_vi_id     text REFERENCES identity.don_vi(id),   -- NULL = người mới chưa gán đơn vị
  chuc_vu       text,                                  -- 'Trưởng phòng', 'Nhân viên', 'Chủ tịch HĐQT'...
  cap_chuc_vu   smallint,                              -- NULL = lấy cấp đơn vị; có giá trị thì ưu tiên
  la_quan_tri   boolean NOT NULL DEFAULT false,
  active        boolean NOT NULL DEFAULT true,
  tao_luc       timestamptz NOT NULL DEFAULT now()
);

-- Kiêm nhiệm: một người thuộc thêm đơn vị khác
CREATE TABLE IF NOT EXISTS identity.kiem_nhiem (
  nguoi_dung_id text NOT NULL REFERENCES identity.nguoi_dung(id) ON DELETE CASCADE,
  don_vi_id     text NOT NULL REFERENCES identity.don_vi(id),
  chuc_vu       text,
  PRIMARY KEY (nguoi_dung_id, don_vi_id)
);

CREATE TABLE IF NOT EXISTS identity.vai_tro (
  id        text PRIMARY KEY,                 -- 'quan-tri', 'truong-don-vi', 'nhan-vien', 'van-thu', 'lanh-dao'
  ten       text NOT NULL,
  mo_ta     text,
  he_thong  boolean NOT NULL DEFAULT false    -- vai trò cài sẵn, không xóa được
);

-- Quyền của vai trò kèm PHẠM VI: cua_minh | don_vi | don_vi_va_cap_duoi | toan_bo
CREATE TABLE IF NOT EXISTS identity.quyen_vai_tro (
  vai_tro_id text NOT NULL REFERENCES identity.vai_tro(id) ON DELETE CASCADE,
  quyen      text NOT NULL,
  pham_vi    text NOT NULL DEFAULT 'cua_minh',
  PRIMARY KEY (vai_tro_id, quyen)
);

CREATE TABLE IF NOT EXISTS identity.gan_vai_tro (
  nguoi_dung_id text NOT NULL REFERENCES identity.nguoi_dung(id) ON DELETE CASCADE,
  vai_tro_id    text NOT NULL REFERENCES identity.vai_tro(id) ON DELETE CASCADE,
  PRIMARY KEY (nguoi_dung_id, vai_tro_id)
);

