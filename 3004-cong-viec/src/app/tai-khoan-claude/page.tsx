// TÀI KHOẢN CLAUDE CỦA TÔI (Quản lý token AI, Mr. Đại duyệt 04/10/2026) — mở từ menu tên người, ngay dưới "Skill AI của tôi".
// Ai đăng nhập cũng nối được tài khoản Claude của mình làm dự phòng khi tài khoản công ty hết hạn mức.
import { redirect } from "next/navigation";
import { layNguoiDung } from "@/lib/phien";
import { TieuDeTrang } from "@/components/layout/TieuDeTrang";
import { TaiKhoanClaudeCuaToi } from "@/components/ai/TaiKhoanClaudeCuaToi";

export const metadata = { title: "Tài khoản Claude cá nhân — SCI công việc" };
export const dynamic = "force-dynamic";

export default async function TaiKhoanClaudePage() {
  const nd = await layNguoiDung();
  if (!nd) redirect("/login");
  return (
    <>
      <TieuDeTrang
        tieuDe="Tài khoản Claude cá nhân"
        moTa="Dự phòng khi cả hai tài khoản Claude của công ty hết hạn mức: trợ lý chuyển sang tài khoản của anh/chị để anh/chị làm tiếp, không phải chờ."
      />
      <div className="p-5 text-text">
        <TaiKhoanClaudeCuaToi />
      </div>
    </>
  );
}
