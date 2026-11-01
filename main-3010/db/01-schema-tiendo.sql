-- ============================================================
-- SCHEMA `tiendo` + KHUNG NHÌN DÙNG CHUNG `chung.wbs`
--
-- Nguồn đặc tả: 0 Tài liệu thiết kế/CHOT/PLAN-AGENT-TIEN-DO-v1.0.md mục 5b
--               (nghĩa vụ BẮT BUỘC của Agent tiến độ với 4 agent kia)
--               CHOT/LOI-DUNG-CHUNG-v1.0.md mục 6e.4 (mốc kích hoạt)
--
-- Chạy:  psql -U postgres -f db/01-schema-tiendo.sql
--
-- Bốn bảng cốt lõi (phạm vi bước 1, Mr. Đại chốt 06/09):
--   dau_viec        — danh mục đầu việc WBS
--   moc_baseline    — mốc theo bản baseline đã duyệt (nhiều phiên bản)
--   ket_qua_tinh    — kết quả engine CPM (nhiều lần chạy)
--   khoi_luong_tuan — khối lượng theo tuần báo cáo
--
-- ⚠ HAI CHỮ "CHỈ" ở mục 5b là chỗ dễ sai nhất: view phải lọc
--   "CHỈ baseline đang hiệu lực" và "CHỈ lần tính mới nhất". Quên lọc thì một
--   mã WBS trả về nhiều dòng, mọi agent khác đọc ra số nhân đôi.
-- ============================================================

CREATE SCHEMA IF NOT EXISTS tiendo;
CREATE SCHEMA IF NOT EXISTS chung;

-- ---------- 1. Danh mục đầu việc ----------
CREATE TABLE IF NOT EXISTS tiendo.dau_viec (
  ma_du_an              text    NOT NULL,
  ma_wbs                text    NOT NULL,
  ten                   text    NOT NULL,
  cap                   smallint NOT NULL CHECK (cap BETWEEN 1 AND 4),
  viec_cha              text,
  don_vi                text,
  khoi_luong_thiet_ke   numeric,
  nha_thau              text,
  thau_phu              text,
  la_moc                boolean NOT NULL DEFAULT false,
  -- Đường MỤC TIÊU (cam kết CĐT) — không có thì không vẽ
  ngay_bat_dau_muc_tieu date,
  ngay_ket_thuc_muc_tieu date,
  PRIMARY KEY (ma_du_an, ma_wbs)
);
COMMENT ON COLUMN tiendo.dau_viec.khoi_luong_thiet_ke IS
  'Nguồn gốc: cột Khối lượng trong file tiến độ nạp vào (PLAN-AGENT-TIEN-DO 3.1b). Agent Hợp đồng đọc cột này để chặn nghiệm thu vượt thiết kế.';

-- ---------- 2. Mốc baseline (nhiều phiên bản, chỉ MỘT bản hiệu lực) ----------
CREATE TABLE IF NOT EXISTS tiendo.moc_baseline (
  ma_du_an        text    NOT NULL,
  ma_wbs          text    NOT NULL,
  phien_ban       integer NOT NULL,
  ngay_bat_dau    date    NOT NULL,
  ngay_ket_thuc   date    NOT NULL,
  hieu_luc        boolean NOT NULL DEFAULT false,
  ngay_duyet      timestamptz,
  nguoi_duyet     text,
  PRIMARY KEY (ma_du_an, ma_wbs, phien_ban)
);
-- Mỗi dự án CHỈ MỘT phiên bản hiệu lực — chặn ngay ở tầng CSDL, không nhờ code tự giác
CREATE UNIQUE INDEX IF NOT EXISTS moc_baseline_mot_ban_hieu_luc
  ON tiendo.moc_baseline (ma_du_an, ma_wbs) WHERE hieu_luc;

-- ---------- 3. Kết quả engine CPM (nhiều lần chạy, đọc lần MỚI NHẤT) ----------
CREATE TABLE IF NOT EXISTS tiendo.ket_qua_tinh (
  ma_du_an                text        NOT NULL,
  ma_wbs                  text        NOT NULL,
  thoi_diem_tinh          timestamptz NOT NULL,
  phan_tram_hoan_thanh    numeric     NOT NULL DEFAULT 0,
  ngay_bat_dau_du_bao     date,
  ngay_ket_thuc_du_bao    date,
  ngay_bat_dau_thuc_te    date,
  ngay_ket_thuc_thuc_te   date,
  so_ngay_tre             integer,
  tren_duong_gang         boolean     NOT NULL DEFAULT false,
  trang_thai              text,
  PRIMARY KEY (ma_du_an, ma_wbs, thoi_diem_tinh)
);
COMMENT ON TABLE tiendo.ket_qua_tinh IS
  'Mục 5b: "chạy tính xong là NGHĨA VỤ" — không chạy thì 4 agent kia đọc số cũ mà không biết.';

-- ---------- 4. Khối lượng theo tuần ----------
CREATE TABLE IF NOT EXISTS tiendo.khoi_luong_tuan (
  ma_du_an        text    NOT NULL,
  ma_wbs          text    NOT NULL,
  tuan_bao_cao    text    NOT NULL,          -- 2026-W35
  khoi_luong_tuan numeric,
  khoi_luong_luy_ke numeric,
  da_duyet        boolean NOT NULL DEFAULT false,
  PRIMARY KEY (ma_du_an, ma_wbs, tuan_bao_cao)
);

-- ============================================================
-- KHUNG NHÌN DÙNG CHUNG — 4 agent kia CHỈ ĐỌC
-- JOIN bốn bảng (cảnh báo ở mục 5b: sơ đồ vẽ gọn là dau_viec → chung.wbs,
-- thực tế các trường nằm rải rác nên phải JOIN đủ bốn).
-- ============================================================
CREATE OR REPLACE VIEW chung.wbs AS
WITH tinh_moi_nhat AS (
  -- CHỈ lần chạy mới nhất của mỗi đầu việc
  SELECT DISTINCT ON (ma_du_an, ma_wbs) *
  FROM tiendo.ket_qua_tinh
  ORDER BY ma_du_an, ma_wbs, thoi_diem_tinh DESC
),
luy_ke_moi_nhat AS (
  -- Cộng dồn đến tuần ĐÃ DUYỆT mới nhất
  SELECT DISTINCT ON (ma_du_an, ma_wbs) ma_du_an, ma_wbs, khoi_luong_luy_ke, tuan_bao_cao
  FROM tiendo.khoi_luong_tuan
  WHERE da_duyet
  ORDER BY ma_du_an, ma_wbs, tuan_bao_cao DESC
)
SELECT
  dv.ma_du_an,
  dv.ma_wbs,
  dv.ten,
  dv.cap,
  dv.viec_cha,
  dv.don_vi,
  dv.khoi_luong_thiet_ke,
  lk.khoi_luong_luy_ke,
  bl.ngay_bat_dau         AS ngay_bat_dau_baseline,
  bl.ngay_ket_thuc        AS ngay_ket_thuc_baseline,
  kq.phan_tram_hoan_thanh,
  kq.ngay_bat_dau_du_bao,
  kq.ngay_ket_thuc_du_bao,
  kq.so_ngay_tre,
  kq.tren_duong_gang,
  kq.trang_thai,
  -- Mục 8.5: mọi con số kèm THỜI ĐIỂM TÍNH, không có cột này thì agent khác
  -- không biết số mình đọc là cũ hay mới
  kq.thoi_diem_tinh
FROM tiendo.dau_viec dv
LEFT JOIN tiendo.moc_baseline bl
  ON bl.ma_du_an = dv.ma_du_an AND bl.ma_wbs = dv.ma_wbs AND bl.hieu_luc  -- CHỈ bản hiệu lực
LEFT JOIN tinh_moi_nhat kq
  ON kq.ma_du_an = dv.ma_du_an AND kq.ma_wbs = dv.ma_wbs
LEFT JOIN luy_ke_moi_nhat lk
  ON lk.ma_du_an = dv.ma_du_an AND lk.ma_wbs = dv.ma_wbs;

COMMENT ON VIEW chung.wbs IS
  'Nghĩa vụ công bố của Agent tiến độ (PLAN-AGENT-TIEN-DO 5b). 4 agent kia GRANT SELECT, KHÔNG có INSERT/UPDATE/DELETE — PostgreSQL chặn ở tầng quyền, không nhờ ai tự giác. Dòng gốc mỗi dự án (cap=1, viec_cha rỗng) mang số tổng thể.';

-- ============================================================
-- QUYỀN — 4 agent kia chỉ đọc
-- Chạy sau khi đã tạo vai: CREATE ROLE agent_hopdong LOGIN PASSWORD '...';
-- (mật khẩu KHÔNG viết trong file này)
-- ============================================================
-- GRANT USAGE ON SCHEMA chung TO agent_hopdong, agent_phaply, agent_base, agent_main;
-- GRANT SELECT ON chung.wbs   TO agent_hopdong, agent_phaply, agent_base, agent_main;
