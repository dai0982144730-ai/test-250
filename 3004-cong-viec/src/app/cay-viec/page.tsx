// /cay-viec?du_an=da-hv — menu "Cây việc & đường găng" (Mr. Đại chốt 03/10/2026: chép màn cùng tên của agent Base, nguồn việc =
// sổ cái agent Công việc). Không có ?du_an thì lấy dự án đầu tiên có cây WBS ("Mã bên Tiến độ" trong Cài đặt — mọi nhóm dự án).
// Bố cục hai cột cố định như các màn căn phòng (trái = nội dung chép từ Base · phải = vùng làm việc, luôn hiện), gam màu sáng.
// Trang KHÔNG gọi agent khác lúc dựng (HOP-DONG-KET-NOI 6.2): client gọi /api/cay-viec nạp sau.
import { redirect } from "next/navigation";
import { layNguoiDung } from "@/lib/phien";
import { CayViecView } from "@/components/cay-viec/CayViecView";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";
import "./cay-viec.css";

export const dynamic = "force-dynamic";

export default async function TrangCayViec({ searchParams }: { searchParams: { du_an?: string } }) {
  if (!(await layNguoiDung())) redirect("/login");
  const duAn = typeof searchParams.du_an === "string" && searchParams.du_an.trim() ? searchParams.du_an.trim() : null;
  return (
    <>
      <KhaiHuongDan ma="cay-viec" />
      <CayViecView key={duAn ?? ""} duAnId={duAn} />
    </>
  );
}
