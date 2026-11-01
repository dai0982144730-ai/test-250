-- Chạy MỘT LẦN bằng tài khoản quản trị PostgreSQL trên máy chủ:
--   sudo -u postgres psql -f deploy/tao-csdl.sql
-- Tạo CSDL riêng "scidocflow" + tài khoản riêng. Không đụng CSDL của web khác (hptbim...).
-- Đổi mật khẩu dưới đây trước khi chạy, rồi ghi vào .env.local:
--   DATABASE_URL=postgresql://scidocflow:<mật khẩu>@localhost:5432/scidocflow
CREATE ROLE scidocflow LOGIN PASSWORD 'DOI_MAT_KHAU_NAY';
CREATE DATABASE scidocflow OWNER scidocflow ENCODING 'UTF8' TEMPLATE template0;
-- Lược đồ (db/*.sql) và dữ liệu gieo được app tự chạy lúc khởi động lần đầu.
