// /gui-bao-cao — Gửi báo cáo của giao diện căn phòng: chỉ khung nạp file + tải mẫu Word + kết quả kiểm tra + gửi.
// Không có Kho thư mục (Mr. Đại chốt 28/09); /thu-muc, /soan-gui cổ điển chuyển về đây (02/10).
import { redirect } from "next/navigation";
import { layNguoiDung } from "@/lib/phien";
import { KhungSoanGui } from "@/components/gui/KhungSoanGui";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";

export const dynamic = "force-dynamic";

export default async function TrangGuiBaoCao() {
  if (!(await layNguoiDung())) redirect("/login");
  return (
    // Rộng vừa đủ (tối đa 1040px, căn giữa) + bộ màu cột phải Sơ đồ tổ chức (Mr. Đại chốt 29/09) — CSS: phong.css "TRANG GỬI BÁO CÁO"
    <div className="trang-trong thang-chu">
      <KhaiHuongDan ma="gui-bao-cao" />
      <KhungSoanGui moRong />
    </div>
  );
}
