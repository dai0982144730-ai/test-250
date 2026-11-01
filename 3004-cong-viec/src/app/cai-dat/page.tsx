// Trang Cài đặt — ai đăng nhập cũng xem được quy tắc đang chạy; sửa theo phân quyền từng nhóm.
import { redirect } from "next/navigation";
import { layNguoiDung } from "@/lib/phien";
import { TrangCaiDat } from "@/components/cai-dat/TrangCaiDat";

export const dynamic = "force-dynamic";

export default async function CaiDat() {
  const nd = await layNguoiDung();
  if (!nd) redirect("/login");
  // .thang-chu: chữ +2px như 4 agent (kế hoạch 09 Phiên 5); "contents" = khung bọc không chiếm chỗ, không đổi bố cục
  return (
    <div className="thang-chu contents">
      <TrangCaiDat />
    </div>
  );
}
