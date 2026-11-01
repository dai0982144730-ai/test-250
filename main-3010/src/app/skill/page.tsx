// TRANG SKILL AI CỦA TÔI — demo view `v-skill`
// MD: LOI-DUNG-CHUNG mục 5 (một cấu trúc, hai phạm vi) · loi-skill
// Port từ bản chạy thật `SCIPhaply-github/phaply` (lệnh Mr. Đại 03/09).

import { Header } from "@/components/layout/Header";
import { SkillView } from "@/components/tabs/skill/SkillView";
import { layPhienCucBo } from "@/lib/route-auth";
import { duocGhi } from "@/lib/quyen";

export const metadata = { title: "Skill AI của tôi — Main Agent" };
export const dynamic = "force-dynamic";

export default async function SkillPage() {
  // Nạp/xoá skill = cửa "ghi" (quyen.ts) — Người xem thấy khối nạp MỜ kèm lý do
  const choPhepGhi = duocGhi((await layPhienCucBo())?.role);

  return (
    <>
      <Header
        title="Skill AI của tôi"
        helpKey="skill"
      />
      <div className="space-y-4 p-5">
        <SkillView choPhepGhi={choPhepGhi} />
      </div>
    </>
  );
}
