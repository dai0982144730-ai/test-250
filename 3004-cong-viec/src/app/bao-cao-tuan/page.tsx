// /bao-cao-tuan — menu Báo cáo tuần do AI viết (Mr. Đại duyệt demo 30/09/2026). Thước: 0 Tài liệu thiết kế/demo-bao-cao-tuan-3004.html.
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { layNguoiDung } from "@/lib/phien";
import { BaoCaoTuanPhong } from "@/components/phong/BaoCaoTuanPhong";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";

export const dynamic = "force-dynamic";

export default async function TrangBaoCaoTuan() {
  if (!(await layNguoiDung())) redirect("/login");
  return (
    <>
      <KhaiHuongDan ma="bao-cao-tuan" />
      <Suspense fallback={null}>
      <BaoCaoTuanPhong />
      </Suspense>
    </>
  );
}
