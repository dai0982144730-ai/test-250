// /viec-cua-toi — màn "Việc của tôi" của agent Công việc (đợt ⑤, Mr. Đại chốt 06/10/2026 "Ca": menu riêng, hai nửa như Main).
// Trái = issue chờ tôi giao việc · Phải = Việc tôi giao / nhận / cần phối hợp. Gam sáng như màn Issue (cay-viec.css).
import { redirect } from "next/navigation";
import { layNguoiDung } from "@/lib/phien";
import { ViecCuaToiView } from "@/components/viec-cua-toi/ViecCuaToiView";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";
import "../cay-viec/cay-viec.css";

export const dynamic = "force-dynamic";

export default async function TrangViecCuaToi() {
  if (!(await layNguoiDung())) redirect("/login");
  return (
    <>
      <KhaiHuongDan ma="viec-cua-toi" />
      <ViecCuaToiView />
    </>
  );
}
