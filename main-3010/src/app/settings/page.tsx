// ============================================================
// CÀI ĐẶT MAIN AGENT — năm tab chuẩn (tab 🧩 ẩn khi trống)
//
// ⭐ 26/09 (Mr. Đại chốt 1a): nhận ?tab= để đường cũ chuyển về đúng tab —
// /ma-tran-goi và /cau-hinh-chung → ?tab=ket-noi. Nhịp định kỳ + luật động
// của báo cáo sáng không đọc ở đây nữa: chỉ bày ở Báo cáo → tab Sáng.
// ============================================================

import { Header } from "@/components/layout/Header";
import { CaiDatMainView } from "@/components/tabs/cai-dat-main/CaiDatMainView";

export const metadata = { title: "Cài đặt — Main Agent" };
export const dynamic = "force-dynamic";

export default function TrangCaiDatMain({ searchParams }: { searchParams: { tab?: string; drive?: string } }) {
  return (
    <>
      <Header title="Cài đặt Main Agent" coGhim />
      <div className="p-5">
        {/* Quay về từ Google (?drive=…) thì mở luôn tab 🔌 — thẻ Drive nằm ở đó */}
        <CaiDatMainView tabBanDau={searchParams.drive !== undefined ? "ket-noi" : searchParams.tab} />
      </div>
    </>
  );
}
