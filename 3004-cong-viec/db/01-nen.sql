-- ============================================================
-- SCI công việc — LƯỢC ĐỒ NỀN (kế hoạch v2, 24/09/2026)
-- Ba lớp dữ liệu: THƯ MỤC (đang có) · SỔ CÁI (việc đang chạy) · LỊCH SỬ (mọi thứ đã xảy ra)
-- Chạy được trên cả PostgreSQL 17 thật lẫn PGlite (Postgres nhúng khi chưa khai DATABASE_URL).
-- Mọi câu lệnh phải IDEMPOTENT (chạy lại nhiều lần không lỗi): app tự chạy file này lúc khởi động.
-- Module muốn thêm bảng: tạo file db/<số>-<module>.sql riêng, KHÔNG sửa file này.
-- ============================================================

CREATE SCHEMA IF NOT EXISTS identity;
CREATE SCHEMA IF NOT EXISTS docflow;

-- ---------------- IDENTITY (packages/sci-identity) ----------------

-- Cây đơn vị có cấp. cap: 0 = trên Ban TGĐ (vd HĐQT), 1 = Ban TGĐ, 2 = phòng, 3 = đơn vị, 4 = Ban điều hành tổng thầu,
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

-- ---------------- CẤU HÌNH (có phiên bản + nhật ký) ----------------

CREATE TABLE IF NOT EXISTS docflow.cau_hinh (
  khoa       text PRIMARY KEY,                -- vd 'quy_tac_de', 'luat_kiem_tra', 'thu_muc'
  gia_tri    jsonb NOT NULL,
  phien_ban  integer NOT NULL DEFAULT 1,
  sua_boi    text,
  sua_luc    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS docflow.cau_hinh_nhat_ky (
  id          bigserial PRIMARY KEY,
  khoa        text NOT NULL,
  phien_ban   integer NOT NULL,
  gia_tri_cu  jsonb,
  gia_tri_moi jsonb NOT NULL,
  boi         text,
  luc         timestamptz NOT NULL DEFAULT now()
);

-- ---------------- MẪU WORD ----------------

CREATE TABLE IF NOT EXISTS docflow.mau_word (
  ma                text PRIMARY KEY,         -- 'form-0'..'form-8', thêm 'form-9'... sau
  ten               text NOT NULL,            -- 'Báo cáo hợp nhất'
  don_vi_lap        text,                     -- đơn vị lập mẫu này (identity.don_vi.id), NULL = mẫu chung
  gui_den_mac_dinh  text,                     -- đơn vị nhận mặc định
  loai_ky           text NOT NULL DEFAULT 'tuan',  -- tuan | thang | quy | tu_do
  dinh_nghia        jsonb NOT NULL,           -- danh sách ô nhập gắn mã, ô bắt buộc, bảng sinh việc (xem types.ts DinhNghiaMau)
  phien_ban         integer NOT NULL DEFAULT 1,
  khoa_luu          text,                     -- file .docx mẫu trong kho file
  active            boolean NOT NULL DEFAULT true,
  sua_luc           timestamptz NOT NULL DEFAULT now()
);

-- ---------------- LỚP 1: THƯ MỤC ----------------

CREATE TABLE IF NOT EXISTS docflow.thu_muc (
  id         text PRIMARY KEY,
  don_vi_id  text NOT NULL REFERENCES identity.don_vi(id),
  cha_id     text REFERENCES docflow.thu_muc(id),
  ten        text NOT NULL,
  loai       text NOT NULL DEFAULT 'khac',    -- goc | den | di | du_an | thung_rac | khac
  tao_luc    timestamptz NOT NULL DEFAULT now()
);

-- Tài liệu = một "hồ sơ" có nhiều phiên bản file. Nội dung file KHÔNG BAO GIỜ xóa (lịch sử).
CREATE TABLE IF NOT EXISTS docflow.tai_lieu (
  id                 text PRIMARY KEY,
  ten                text NOT NULL,
  mau_ma             text REFERENCES docflow.mau_word(ma),   -- NULL = file thường, không theo mẫu
  don_vi_lap         text REFERENCES identity.don_vi(id),
  nguoi_tao          text NOT NULL,
  nguoi_gui_that     text,                    -- người ngoài công ty khi văn thư nhập thay
  phien_ban_hien_tai integer NOT NULL DEFAULT 1,
  ky_bao_cao         jsonb,                   -- {loai:'tuan', so:29, nam:2026, tu:'2026-07-14', den:'2026-07-20'}
  trang_thai         text NOT NULL DEFAULT 'nhap', -- nhap | da_gui | bi_tra_lai | hoan_thanh
  lien_quan_den      text REFERENCES docflow.tai_lieu(id),
  tao_luc            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS docflow.phien_ban_tep (
  tai_lieu_id  text NOT NULL REFERENCES docflow.tai_lieu(id),
  phien_ban    integer NOT NULL,
  ten_tep      text NOT NULL,
  mime         text NOT NULL,
  kich_thuoc   bigint NOT NULL,
  sha256       text NOT NULL,                 -- mã băm chứng minh không bị sửa
  khoa_luu     text NOT NULL,                 -- khóa trong kho file (Garage S3 / đĩa)
  tai_len_boi  text NOT NULL,
  tai_len_luc  timestamptz NOT NULL DEFAULT now(),
  ket_qua_kiem_tra jsonb,                     -- KetQuaKiemTra (types.ts) lúc tải lên
  PRIMARY KEY (tai_lieu_id, phien_ban)
);

-- Vị trí: tài liệu nằm ở thư mục nào (một tài liệu gửi nhiều nơi thì có nhiều vị trí).
-- XÓA = đánh dấu da_xoa (vào thùng rác), KHÔNG xóa dòng. Khôi phục = bỏ đánh dấu.
CREATE TABLE IF NOT EXISTS docflow.vi_tri (
  id           text PRIMARY KEY,
  tai_lieu_id  text NOT NULL REFERENCES docflow.tai_lieu(id),
  thu_muc_id   text NOT NULL REFERENCES docflow.thu_muc(id),
  vai          text NOT NULL DEFAULT 'goc',   -- goc | den | di
  nhan         text,                          -- 'bi_tra_lai' ...
  them_boi     text NOT NULL,
  them_luc     timestamptz NOT NULL DEFAULT now(),
  da_xoa       boolean NOT NULL DEFAULT false,
  xoa_boi      text,
  xoa_luc      timestamptz
);
CREATE INDEX IF NOT EXISTS vi_tri_thu_muc ON docflow.vi_tri(thu_muc_id);
CREATE INDEX IF NOT EXISTS vi_tri_tai_lieu ON docflow.vi_tri(tai_lieu_id);

-- ---------------- GỬI · HÀNH TRÌNH ----------------

CREATE TABLE IF NOT EXISTS docflow.hanh_trinh (
  id              text PRIMARY KEY,
  tai_lieu_goc_id text NOT NULL REFERENCES docflow.tai_lieu(id),
  lien_quan_den   text REFERENCES docflow.hanh_trinh(id),
  tao_luc         timestamptz NOT NULL DEFAULT now()
);

-- Mỗi thao tác là một bước trên cây hành trình. Gửi nhiều nơi = nhiều bước anh em, mỗi bước một trạng thái.
CREATE TABLE IF NOT EXISTS docflow.buoc_hanh_trinh (
  id            text PRIMARY KEY,
  hanh_trinh_id text NOT NULL REFERENCES docflow.hanh_trinh(id),
  cha_id        text REFERENCES docflow.buoc_hanh_trinh(id),
  loai          text NOT NULL,   -- gui | chuyen_tiep | chuyen_tiep_kem | tra_lai | gui_lai | gui_moi | hoan_thanh
  tai_lieu_id   text NOT NULL REFERENCES docflow.tai_lieu(id),
  phien_ban     integer NOT NULL,
  tep_kem       jsonb NOT NULL DEFAULT '[]',  -- [{tai_lieu_id, phien_ban}]
  tu_don_vi     text REFERENCES identity.don_vi(id),
  tu_nguoi      text NOT NULL,
  den_don_vi    text REFERENCES identity.don_vi(id),   -- NULL với hoan_thanh
  ly_do         text,                                   -- bắt buộc với tra_lai
  trang_thai    text NOT NULL DEFAULT 'cho_nhan',       -- cho_nhan | da_nhan | bi_tra_lai | da_xu_ly | hoan_thanh
  nhan_boi      text,
  nhan_luc      timestamptz,
  luc           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS buoc_ht ON docflow.buoc_hanh_trinh(hanh_trinh_id);

-- Sổ văn bản đến: văn thư HCTH nhập thay người ngoài công ty
CREATE TABLE IF NOT EXISTS docflow.so_van_ban_den (
  id            text PRIMARY KEY,
  so_den        integer NOT NULL,
  noi_gui       text NOT NULL,                -- tên cơ quan/đối tác bên ngoài
  so_ky_hieu    text,
  ngay_van_ban  date,
  hinh_thuc     text NOT NULL DEFAULT 'giay', -- giay | email
  tai_lieu_id   text NOT NULL REFERENCES docflow.tai_lieu(id),
  nhap_boi      text NOT NULL,
  nhap_luc      timestamptz NOT NULL DEFAULT now()
);

-- ---------------- LỚP 2: CÔNG VIỆC · SỔ CÁI ----------------

CREATE TABLE IF NOT EXISTS docflow.cong_viec (
  id              text PRIMARY KEY,           -- mã việc theo cấu hình, vd 'CV-2026-0412'
  ten             text NOT NULL,
  du_an           text,
  hang_muc        text,
  ket_qua_can_co  text,
  luon_mo         boolean NOT NULL DEFAULT false,
  bat_dau         date,
  ket_thuc        date,
  trang_thai      text NOT NULL DEFAULT 'dang_mo',   -- dang_mo | hoan_thanh | da_dong
  cho_sua         boolean NOT NULL DEFAULT false,    -- tài liệu nguồn bị trả lại, đang chờ sửa
  giao_boi        text,                               -- người giao (quyết định TGĐ / người gửi)
  don_vi_giao     text REFERENCES identity.don_vi(id),
  nguon_hien_hanh_id text,                            -- -> nguon_cong_viec.id
  tao_luc         timestamptz NOT NULL DEFAULT now(),
  dong_luc        timestamptz,
  ly_do_dong      text
);

CREATE TABLE IF NOT EXISTS docflow.phan_viec (
  id              text PRIMARY KEY,
  cong_viec_id    text NOT NULL REFERENCES docflow.cong_viec(id),
  phu_trach_loai  text NOT NULL,              -- nguoi | don_vi
  phu_trach_id    text NOT NULL,              -- nguoi_dung.id hoặc don_vi.id
  noi_dung        text NOT NULL,
  luon_mo         boolean NOT NULL DEFAULT false,
  bat_dau         date,
  ket_thuc        date,
  trang_thai      text NOT NULL DEFAULT 'dang_lam',   -- dang_lam | da_ket_thuc
  ket_thuc_boi    text,
  ket_thuc_luc    timestamptz,
  ghi_chu         text,
  tep_ket_qua     jsonb NOT NULL DEFAULT '[]',
  thu_tu          integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS phan_viec_cv ON docflow.phan_viec(cong_viec_id);

-- Mọi "bản" của một việc lấy từ báo cáo: bản hiện hành + các bản đã bị đè (không mất).
CREATE TABLE IF NOT EXISTS docflow.nguon_cong_viec (
  id            text PRIMARY KEY,
  cong_viec_id  text NOT NULL REFERENCES docflow.cong_viec(id),
  tai_lieu_id   text REFERENCES docflow.tai_lieu(id),
  phien_ban     integer,
  mau_ma        text,
  nhan          text NOT NULL,                -- 'BQLDA Quảng Trị · Form 7 · tuần 29'
  don_vi_id     text REFERENCES identity.don_vi(id),
  cap           smallint NOT NULL,
  ky_bao_cao    date,                         -- ngày cuối kỳ báo cáo
  ngay_gui      timestamptz NOT NULL,
  du_lieu       jsonb NOT NULL,               -- DongCongViec (types.ts) đúng như trong báo cáo
  trang_thai    text NOT NULL,                -- hien_hanh | bi_de | khong_dung
  ly_do         text,                         -- vì sao bị đè / không dùng (thua cấp, thua ngày)
  luc           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS nguon_cv ON docflow.nguon_cong_viec(cong_viec_id);

-- SỔ CÁI = chỉ việc đang mở. Việc hoàn thành/đóng tự rời sổ cái (vẫn còn đủ trong lịch sử).
CREATE OR REPLACE VIEW docflow.so_cai AS
  SELECT * FROM docflow.cong_viec WHERE trang_thai = 'dang_mo';

-- ---------------- LỚP 3: LỊCH SỬ (chỉ ghi thêm) ----------------

CREATE TABLE IF NOT EXISTS docflow.lich_su (
  id              bigserial PRIMARY KEY,
  luc             timestamptz NOT NULL DEFAULT now(),
  nguoi           text NOT NULL,              -- ai làm (người thật; 'he-thong' nếu tự động)
  thay_cho        text,                       -- văn thư nhập thay người ngoài: ghi người gửi thật
  don_vi_id       text,
  thiet_bi        text,                       -- user-agent / IP
  doi_tuong_loai  text NOT NULL,              -- tai_lieu | cong_viec | thu_muc | cau_hinh | nguoi_dung | mau | ky_nang | agent
  doi_tuong_id    text NOT NULL,
  hanh_dong       text NOT NULL,              -- xem HanhDongLichSu trong types.ts
  chi_tiet        jsonb NOT NULL DEFAULT '{}',
  hash_truoc      text,
  hash            text NOT NULL               -- sha256(hash_truoc + nội dung dòng): chuỗi chống sửa
);
CREATE INDEX IF NOT EXISTS lich_su_dt ON docflow.lich_su(doi_tuong_loai, doi_tuong_id);

-- Không ai sửa/xóa được lịch sử, kể cả quản trị viên
CREATE OR REPLACE FUNCTION docflow.chan_sua_lich_su() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Lịch sử chỉ được ghi thêm, không sửa hay xóa được';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS lich_su_chi_ghi_them ON docflow.lich_su;
CREATE TRIGGER lich_su_chi_ghi_them BEFORE UPDATE OR DELETE ON docflow.lich_su
  FOR EACH ROW EXECUTE FUNCTION docflow.chan_sua_lich_su();

-- ---------------- THÔNG BÁO · KHÓA AGENT · ĐẾM MÃ ----------------

CREATE TABLE IF NOT EXISTS docflow.thong_bao (
  id          bigserial PRIMARY KEY,
  nguoi_nhan  text NOT NULL,                  -- nguoi_dung.id, hoặc 'quan-tri' cho mọi quản trị viên
  loai        text NOT NULL,
  noi_dung    text NOT NULL,
  lien_ket    text,
  da_doc      boolean NOT NULL DEFAULT false,
  luc         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS docflow.khoa_agent (
  id        text PRIMARY KEY,
  ten       text NOT NULL,                    -- 'Agent tiến độ'
  khoa_hash text NOT NULL,                    -- sha256 của khóa, khóa gốc chỉ hiện 1 lần
  cong_cu   jsonb NOT NULL DEFAULT '["socai.*","lichsu.*"]',
  tao_boi   text NOT NULL,
  tao_luc   timestamptz NOT NULL DEFAULT now(),
  thu_hoi   boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS docflow.bo_dem (
  ten   text PRIMARY KEY,                     -- vd 'cong_viec:2026', 'so_den:2026'
  gia_tri integer NOT NULL DEFAULT 0
);
