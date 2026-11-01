-- ============================================================
-- 36-luat.sql — BỘ LUẬT KIỂM TRA ĐỘNG (module luat, agent luat-loi). IDEMPOTENT.
-- Luật là dữ liệu: người dùng thêm/sửa/xóa (xóa mềm); luật hệ thống (9 luật gốc) chỉ tắt/đổi mức.
-- Mỗi lần lưu một bản đầy đủ vào luat_kiem_tra_phien_ban (quay lại được). Kiểu dữ liệu: src/lib/luat/types.ts.
-- ============================================================
CREATE TABLE IF NOT EXISTS docflow.luat_kiem_tra (
  id           text PRIMARY KEY,
  ma           text NOT NULL,
  ten          text NOT NULL,
  cau_luat     text NOT NULL DEFAULT '',
  mo_ta        text,
  he_thong     boolean NOT NULL DEFAULT false,
  cach_kiem    text NOT NULL DEFAULT 'code' CHECK (cach_kiem IN ('code', 'ai', 'ca_hai')),
  loai         text,                                   -- mã dạng luật code; 'he_thong' cho 9 luật gốc; NULL = AI thuần
  tham_so      jsonb,
  huong_dan_ai text,
  ap_dung      jsonb NOT NULL DEFAULT '"tat_ca"'::jsonb, -- "tat_ca" hoặc ["form-7", ...]
  muc          text NOT NULL DEFAULT 'canh_bao' CHECK (muc IN ('chan', 'canh_bao', 'goi_y')),
  khi_ai_loi   text NOT NULL DEFAULT 'cho_gui' CHECK (khi_ai_loi IN ('cho_gui', 'chan')),
  bat          boolean NOT NULL DEFAULT true,
  nhom         text,
  thu_tu       integer NOT NULL DEFAULT 0,
  phien_ban    integer NOT NULL DEFAULT 1,
  tao_boi      text,
  tao_luc      timestamptz NOT NULL DEFAULT now(),
  sua_boi      text,
  sua_luc      timestamptz NOT NULL DEFAULT now(),
  da_xoa       boolean NOT NULL DEFAULT false
);
-- Mã duy nhất trong các luật chưa xóa (xóa rồi thì dùng lại mã được)
CREATE UNIQUE INDEX IF NOT EXISTS luat_kiem_tra_ma ON docflow.luat_kiem_tra(ma) WHERE NOT da_xoa;

-- Mỗi lần lưu: một bản đầy đủ (gia_tri = LuatKiemTra lúc đó)
CREATE TABLE IF NOT EXISTS docflow.luat_kiem_tra_phien_ban (
  luat_id    text NOT NULL REFERENCES docflow.luat_kiem_tra(id),
  phien_ban  integer NOT NULL,
  gia_tri    jsonb NOT NULL,
  boi        text,
  luc        timestamptz NOT NULL DEFAULT now(),
  ghi_chu    text,                                     -- vd 'quay lại bản 2', 'đồng bộ từ Cài đặt'
  PRIMARY KEY (luat_id, phien_ban)
);

-- Dấu của bộ luật: luật mẫu đã gieo (quản trị xóa rồi không gieo lại), mốc đồng bộ với cấu hình luat_kiem_tra
CREATE TABLE IF NOT EXISTS docflow.luat_danh_dau (
  khoa     text PRIMARY KEY,
  gia_tri  jsonb NOT NULL,
  luc      timestamptz NOT NULL DEFAULT now()
);
