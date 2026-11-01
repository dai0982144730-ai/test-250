// TRANG KHÓA CHO AGENT — cấp khóa riêng để agent khác (tiến độ, main…) đọc sổ cái qua cổng MCP /api/mcp/socai
// và API chỉ đọc /api/v1/so-cai. Quyền agent.cap_khoa. Khóa gốc chỉ hiện MỘT lần lúc cấp.
import { redirect } from "next/navigation";
import { coQuyen } from "@sci/identity";
import { layNguoiDung } from "@/lib/phien";
import { TieuDeTrang } from "@/components/layout/TieuDeTrang";
import { KhoaAgentView } from "./KhoaAgentView";

export const metadata = { title: "Khóa cho agent — SCI công việc" };
export const dynamic = "force-dynamic";

export default async function KhoaAgentPage() {
  const nd = await layNguoiDung();
  if (!nd) redirect("/login");
  if (!coQuyen(nd, "agent.cap_khoa")) {
    return (
      <>
        <TieuDeTrang tieuDe="Khóa cho agent" />
        <div className="p-5 text-[12.5px] text-text-secondary">Bạn chưa có quyền «Cấp khóa cho agent đọc sổ cái».</div>
      </>
    );
  }
  return (
    <>
      <TieuDeTrang tieuDe="Khóa cho agent" moTa="Agent khác đọc sổ cái SCI công việc bằng khóa riêng — chỉ đọc, chỉ gọi đúng công cụ được chọn. Thu hồi là chặn ngay." />
      <div className="space-y-4 p-5 text-text">
        <KhoaAgentView />
      </div>
    </>
  );
}
