// /phong-hop — menu Phòng họp (Mr. Đại chốt 25/10/2026; đề xuất DE-XUAT-PHONG-HOP-25-10.md). Trái: ảnh mặt bằng + 3 nút · phải: nội dung.
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { layNguoiDung } from "@/lib/phien";
import { PhongHopPhong } from "@/components/phong-hop/PhongHop";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";

export const dynamic = "force-dynamic";

export default async function TrangPhongHop() {
  if (!(await layNguoiDung())) redirect("/login");
  return (
    <>
      <KhaiHuongDan ma="phong-hop" />
      <Suspense fallback={null}>
        <PhongHopPhong />
      </Suspense>
    </>
  );
}
