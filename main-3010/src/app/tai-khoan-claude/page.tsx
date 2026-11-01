// TÀI KHOẢN CLAUDE CÁ NHÂN (Quản lý token AI, Mr. Đại duyệt 04/10/2026 — Đợt 2 nhân bản từ agent Công việc) — mở từ menu tên
// người, ngay dưới "Skill AI của tôi". Ai đăng nhập cũng nối được tài khoản Claude của mình làm dự phòng khi tài khoản công ty
// hết hạn mức.
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { TaiKhoanClaudeCuaToi } from "@/components/ai/TaiKhoanClaudeCuaToi";
import { layPhienCucBo } from "@/lib/route-auth";

export const metadata = { title: "Tài khoản Claude cá nhân — Main Agent" };
export const dynamic = "force-dynamic";

export default async function TaiKhoanClaudePage() {
  if (!(await layPhienCucBo())) redirect("/login");
  return (
    <>
      <Header title="Tài khoản Claude cá nhân" />
      <div className="space-y-3 p-5 text-text">
        <p className="max-w-[760px] text-[12px] text-text-secondary">
          Dự phòng khi tài khoản Claude của công ty hết hạn mức: trợ lý chuyển sang tài khoản của anh/chị để anh/chị làm tiếp, không
          phải chờ.
        </p>
        <TaiKhoanClaudeCuaToi />
      </div>
    </>
  );
}
