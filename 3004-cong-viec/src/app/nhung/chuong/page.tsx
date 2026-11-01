// Chuông NHÚNG — thanh trên Main · Tiến độ · Hợp đồng dùng chung chuông agent Công việc (Mr. Đại chốt 07/10/2026).
// Trang này không bị lớp chặn chuyển /login (middleware) — chưa đăng nhập thì chuông mờ, bấm mở đăng nhập ở thẻ mới.
import { ChuongNhung } from "@/components/phong/ChuongNhung";

export const dynamic = "force-dynamic";

export default function TrangChuongNhung() {
  return <ChuongNhung />;
}
