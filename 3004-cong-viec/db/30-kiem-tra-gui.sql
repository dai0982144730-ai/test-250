-- ============================================================
-- 30-kiem-tra-gui.sql — bổ sung cho module kiem-tra-gui (mẫu Word, gửi, hành trình, sổ văn bản đến).
-- IDEMPOTENT. Chỉ THÊM cột/bảng, không đổi cột của lược đồ nền.
-- ============================================================

-- Gửi thẳng cho một người (vd "Phó TGĐ phụ trách" trong Ban TGĐ): bước vẫn có den_don_vi, thêm người nhận cụ thể
ALTER TABLE docflow.buoc_hanh_trinh ADD COLUMN IF NOT EXISTS den_nguoi text;

-- "Gửi tài liệu mới" từ một bước của hành trình khác: gắn vào đúng nút trên cây hành trình gốc
ALTER TABLE docflow.hanh_trinh ADD COLUMN IF NOT EXISTS tu_buoc_id text;
CREATE INDEX IF NOT EXISTS hanh_trinh_lien_quan ON docflow.hanh_trinh(lien_quan_den);
CREATE INDEX IF NOT EXISTS hanh_trinh_goc ON docflow.hanh_trinh(tai_lieu_goc_id);
CREATE INDEX IF NOT EXISTS buoc_tai_lieu ON docflow.buoc_hanh_trinh(tai_lieu_id);
CREATE INDEX IF NOT EXISTS buoc_den ON docflow.buoc_hanh_trinh(den_don_vi, trang_thai);

-- Sổ văn bản đến: năm (số đến tự tăng theo năm), trích yếu, đơn vị được chuyển xử lý
ALTER TABLE docflow.so_van_ban_den ADD COLUMN IF NOT EXISTS nam integer;
ALTER TABLE docflow.so_van_ban_den ADD COLUMN IF NOT EXISTS trich_yeu text;
ALTER TABLE docflow.so_van_ban_den ADD COLUMN IF NOT EXISTS email_gui text;
ALTER TABLE docflow.so_van_ban_den ADD COLUMN IF NOT EXISTS don_vi_xu_ly text;
ALTER TABLE docflow.so_van_ban_den ADD COLUMN IF NOT EXISTS buoc_id text;
CREATE UNIQUE INDEX IF NOT EXISTS so_van_ban_den_so ON docflow.so_van_ban_den(nam, so_den);

-- Các phiên bản file mẫu Word (mau_word chỉ giữ bản hiện hành; bản cũ ở đây + lịch sử đối tượng 'mau')
CREATE TABLE IF NOT EXISTS docflow.mau_word_phien_ban (
  ma          text NOT NULL REFERENCES docflow.mau_word(ma),
  phien_ban   integer NOT NULL,
  ten_tep     text NOT NULL,
  khoa_luu    text NOT NULL,
  sha256      text NOT NULL,
  kich_thuoc  bigint NOT NULL,
  dinh_nghia  jsonb NOT NULL,
  tai_len_boi text NOT NULL,
  tai_len_luc timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ma, phien_ban)
);
