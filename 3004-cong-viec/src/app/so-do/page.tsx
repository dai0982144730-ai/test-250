// /so-do — Sơ đồ tổ chức (giao diện căn phòng, Đợt 1 — 28/09/2026). Thước: demo-agent-cong-viec-pa2-cay.html.
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { layNguoiDung } from "@/lib/phien";
import { SoDoPhong } from "@/components/phong/SoDoPhong";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";

export const dynamic = "force-dynamic";

export default async function TrangSoDo() {
  if (!(await layNguoiDung())) redirect("/login");
  return (
    <>
      <KhaiHuongDan ma="so-do" />
      <Suspense fallback={null}>
      <SoDoPhong />
      </Suspense>
    </>
  );
}
