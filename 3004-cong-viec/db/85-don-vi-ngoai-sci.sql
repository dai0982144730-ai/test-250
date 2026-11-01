-- 85 — ĐƠN VỊ NGOÀI SCI (Mr. Đại chốt 09/10/2026): SCI PMC, SCI E&C là công ty SCI CÓ CỔ PHẦN, không phải đơn vị trực thuộc;
-- ban điều hành tổng thầu cũng không phải. Đơn vị trực thuộc chỉ có các BQL và các nhà máy. Không ai GIAO CHUYỂN TIẾP xuống
-- nhân sự đơn vị ngoài SCI (lib/so-cai/dich-vu.ts nguoiNhanChuyenTiep) — người thuộc chính công ty đó vẫn giao trong công ty mình.
-- NULL = chưa khai (coi như trực thuộc): gieo dữ liệu (lib/khoi-tao.ts) điền true/false cho đơn vị mặc định; quản trị toàn bộ sửa ở
-- Cài đặt › Tổ chức & người dùng → chọn đơn vị → ô "Ngoài SCI" (thêm 10/10 sau kiểm độc lập; không bị gieo đè).
ALTER TABLE identity.don_vi ADD COLUMN IF NOT EXISTS ngoai_sci boolean;
