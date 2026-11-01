// Trang nhúng MỘT thẻ việc — popup "Việc của tôi" ở Main · Tiến độ · Hợp đồng mở trang này trong khung (Mr. Đại chốt 04/10/2026).
// Đăng nhập: cookie phiên agent Công việc của chính trình duyệt (chưa đăng nhập → lớp chặn chuyển /login?tiep=… ngay trong khung).
import { TheViecNhung } from "@/components/phong/TheViecNhung";

export const dynamic = "force-dynamic";

// ?tai_cho=1 (Mr. Đại chốt 07/10): khung bung NGAY TẠI CHỖ trong danh sách Việc của tôi ở agent khác — cao vừa nội dung, báo chiều cao
// ?mau=xanh (07/10): agent khác nhúng — nhấn cam đổi xanh dương cho khớp màu bên đó
export default function TrangNhungViec({ params, searchParams }: { params: { ma: string }; searchParams?: { tai_cho?: string; mau?: string } }) {
  return <TheViecNhung ma={decodeURIComponent(params.ma)} taiCho={searchParams?.tai_cho === "1"} xanh={searchParams?.mau === "xanh"} />;
}
