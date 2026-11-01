// TRANG VIỆC CỦA TÔI — demo view `v-vieccuatoi`
// MD: LOI-DUNG-CHUNG mục 6b (màn của LÕI, có ở cả 5 agent)
// 04/10/2026: đọc và giao qua agent Công việc (lib/chung/viec-cong-viec.ts) — bỏ Base.vn (CHOT 6g.7 mục 3).

import { Header } from "@/components/layout/Header";
import { ViecView } from "@/components/tabs/viec/ViecView";
import { layPhienCucBo } from "@/lib/route-auth";
import { duocGhi } from "@/lib/quyen";

export const metadata = { title: "Việc của tôi — Main Agent" };
export const dynamic = "force-dynamic";

export default async function ViecCuaToiPage() {
  const session = await layPhienCucBo();
  return (
    <>
      {/* 04/10 chiều (Mr. Đại chốt): hai nửa cao bằng màn hình, không cuộn trang — bỏ thanh ghim, ViecView tự dàn khung */}
      <Header title="Việc của tôi" helpKey="viec-cua-toi" />
      <ViecView duocGhi={duocGhi(session?.role)} />
    </>
  );
}
