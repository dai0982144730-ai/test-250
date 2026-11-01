// /du-an — menu Dự án (giao diện căn phòng, Đợt 3 — 28/09/2026). Thước: demo-agent-cong-viec-pa2-cay.html, khung 'du-an'.
import { redirect } from "next/navigation";
import { layNguoiDung } from "@/lib/phien";
import { DuAnPhong } from "@/components/phong/DuAnPhong";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";

export const dynamic = "force-dynamic";

export default async function TrangDuAn() {
  if (!(await layNguoiDung())) redirect("/login");
  // Màn này chỉ vẽ trong khung căn phòng — người dùng giao diện cổ điển vào thẳng (link cũ, đăng nhập nối tiếp) thì về Tổng quan
  return (
    <>
      <KhaiHuongDan ma="du-an" />
      <DuAnPhong />
    </>
  );
}
