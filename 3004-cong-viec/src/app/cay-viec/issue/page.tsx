// /cay-viec/issue?du_an=da-hv — màn ISSUE của agent Công việc (Mr. Đại chốt 03/10/2026: chép màn Issue của agent Base — y hệt tab,
// khối, nhãn, công thức, nút, luật sinh; chỉ khác NGUỒN VIỆC = sổ cái của chính agent này). Lối vào: icon "!" cạnh ô dự án trên màn
// Dự án (phiên khác làm). KHÔNG dùng /issue — địa chỉ đó cố ý chỉ chuyển hướng (luật đã chốt).
// Hai cột cố định như Cây việc (trái = màn Issue · phải = chi tiết, luôn hiện), gam màu sáng (.cay-viec-sang).
// Trang KHÔNG gọi agent khác lúc dựng (HOP-DONG-KET-NOI 6.2): client đọc sổ rồi gọi bộ sinh qua /api/cay-viec/issue.
import { redirect } from "next/navigation";
import { layNguoiDung } from "@/lib/phien";
import { IssueView } from "@/components/cay-viec/issue/IssueView";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";
import "../cay-viec.css";

export const dynamic = "force-dynamic";

export default async function TrangIssue({ searchParams }: { searchParams: { du_an?: string } }) {
  if (!(await layNguoiDung())) redirect("/login");
  const duAn = typeof searchParams.du_an === "string" && searchParams.du_an.trim() ? searchParams.du_an.trim() : null;
  return (
    <>
      <KhaiHuongDan ma="issue" />
      <IssueView key={duAn ?? ""} duAnId={duAn} />
    </>
  );
}
