-- 86 — "LÀM TRƯỞNG Ở" (Mr. Đại chốt 10/10/2026 sau kiểm độc lập giao chuyển tiếp): vai Trưởng gán cho CẢ NGƯỜI nên trước đây
-- người kiêm nhiệm mang quyền trưởng sang mọi đơn vị mình thuộc (anh Sơn — Trưởng phòng KT&VH — kiêm "Nhóm chuẩn bị sản xuất"
-- ở BQLDA QT mà giao việc được cho cả Ban). Chữ chức vụ không dùng được để phân biệt: anh Thanh và chị Hằng cùng "Chuyên viên"
-- P.ĐT&PC, cùng vai Nhân viên + Trưởng, nhưng chị Hằng là trưởng phụ P.ĐT&PC còn anh Thanh chỉ là trưởng ở ô Trợ lý CT.
--   · Người KHÔNG có dòng nào ở đây → như cũ: vai Trưởng áp ở mọi đơn vị của mình.
--   · Người CÓ dòng → vai Trưởng chỉ áp ở đúng các đơn vị đã khai (sửa ở Cài đặt › Tổ chức & người dùng → Sửa người dùng).
-- Đọc ở lib/phien.ts (quyền) và lib/truong-tai.ts (dò "trưởng của đơn vị" cho chuông, người giao, Thư mục).
CREATE TABLE IF NOT EXISTS identity.truong_tai (
  nguoi_dung_id text NOT NULL,
  don_vi_id     text NOT NULL,
  PRIMARY KEY (nguoi_dung_id, don_vi_id)
);
CREATE TABLE IF NOT EXISTS identity.truong_tai_da_gieo (luc timestamptz NOT NULL DEFAULT now());
-- Gieo MỘT LẦN theo số đo 10/10 (chạy khi dữ liệu thật đã có anh Thanh): Thanh → Trợ lý CT · Hương → P.ĐT&PC · Sơn → P.KT&VH.
-- Đã gieo thì không gieo lại — quản trị sửa ở màn nào giữ nguyên ở đó.
INSERT INTO identity.truong_tai (nguoi_dung_id, don_vi_id)
SELECT v.ng, v.dv FROM (VALUES ('troly.ct@scigroup.vn', 'bld-troly-ct'), ('truong.dtpc@scigroup.vn', 'p-dtpc'), ('truong.ktvh@scigroup.vn', 'p-ktvh')) v(ng, dv)
  JOIN identity.nguoi_dung u ON u.id = v.ng
 WHERE NOT EXISTS (SELECT 1 FROM identity.truong_tai_da_gieo)
   AND EXISTS (SELECT 1 FROM identity.nguoi_dung WHERE id = 'troly.ct@scigroup.vn')
ON CONFLICT DO NOTHING;
INSERT INTO identity.truong_tai_da_gieo (luc)
SELECT now() WHERE NOT EXISTS (SELECT 1 FROM identity.truong_tai_da_gieo)
   AND EXISTS (SELECT 1 FROM identity.nguoi_dung WHERE id = 'troly.ct@scigroup.vn');
