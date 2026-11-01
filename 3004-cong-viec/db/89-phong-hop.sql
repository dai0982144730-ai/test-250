-- 89 — Phòng họp (Mr. Đại chốt 25/10/2026, đề xuất SCI-AI-AGENT/6-Agent-cong-viec/DE-XUAT-PHONG-HOP-25-10.md, câu chốt A).
-- Không có lễ tân: ai cũng đặt được, phòng còn trống là nhận ngay. Giờ lưu theo giờ Việt Nam: ngày + 'HH:MM' (bước 30 phút, 08:00–12:00 · 13:30–17:00).
-- Mã phòng (p01 · p03 · p09) khai ở lib/phong-hop/thuan.ts — một chỗ (luật 7).
CREATE TABLE IF NOT EXISTS docflow.phong_hop_cuoc (
  id          bigserial PRIMARY KEY,
  phong       text NOT NULL,
  ngay        date NOT NULL,
  tu          text NOT NULL,                      -- 'HH:MM'
  den         text NOT NULL,                      -- 'HH:MM', > tu
  noi_dung    text NOT NULL,
  ghi_chu     text,
  khach_ngoai text,                               -- khách ngoài công ty (gõ tên)
  duong_dan   text,                               -- đường dẫn họp trực tuyến
  loai        text NOT NULL DEFAULT 'thuong',     -- thuong | giao_ban
  nguoi_dat   text NOT NULL,                      -- nguoi_dung.id
  huy_luc     timestamptz,                        -- huỷ = giữ dòng để còn vết, không hiện nữa
  tao_luc     timestamptz NOT NULL DEFAULT now(),
  sua_luc     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS phong_hop_cuoc_ngay ON docflow.phong_hop_cuoc (ngay, phong);

-- Người dự: danh sách CHỐT lúc đặt (thêm «cả phòng X» = lấy người của phòng lúc đó). xem_luc NULL = chưa bấm xem → dòng chữ đỏ nhấp nháy
CREATE TABLE IF NOT EXISTS docflow.phong_hop_moi (
  cuoc_id   bigint NOT NULL REFERENCES docflow.phong_hop_cuoc(id) ON DELETE CASCADE,
  nguoi_id  text NOT NULL,
  xem_luc   timestamptz,
  PRIMARY KEY (cuoc_id, nguoi_id)
);
CREATE INDEX IF NOT EXISTS phong_hop_moi_nguoi ON docflow.phong_hop_moi (nguoi_id);

-- Cấu hình họp giao ban hằng tuần — một dòng (id = 1). thanh_phan = [{loai:'nhom'|'don_vi'|'nguoi', id}]
CREATE TABLE IF NOT EXISTS docflow.phong_hop_giao_ban (
  id          smallint PRIMARY KEY DEFAULT 1,
  thu         smallint NOT NULL DEFAULT 1,        -- 1 = Thứ Hai … 7 = Chủ nhật
  tu          text NOT NULL DEFAULT '15:00',
  den         text NOT NULL DEFAULT '17:00',
  phong       text NOT NULL DEFAULT 'p09',
  thanh_phan  jsonb NOT NULL DEFAULT '[{"loai":"nhom","id":"bld"},{"loai":"nhom","id":"truong_phong"}]',
  noi_dung    text NOT NULL DEFAULT 'Họp giao ban tuần',
  sua_boi     text,
  sua_luc     timestamptz
);
INSERT INTO docflow.phong_hop_giao_ban (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
