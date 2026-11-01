// ============================================================
// TRANG ISSUE CỦA MAIN AGENT — PLAN-MAIN-AGENT mục 8b
//
// Màn Cảnh báo là màn LÕI dùng chung cả 5 agent (LOI-DUNG-CHUNG 6e), nhưng Main
// có ba điểm riêng, và cả ba đều là lý do trang này không dùng lại `CanhBaoView`
// của bản fork từ Agent Base:
//   ① Main KHÔNG có tab máy sinh — nó không sở hữu dữ liệu nghiệp vụ nào để
//     sinh issue từ đó (mục 1 · 8b.1). Thay bằng tab 🔁 Phân loại lại.
//   ② Tám nhóm chủ đề + 📁 Khác (chốt BD); issue Main tự sinh nằm LẪN trong
//     đó, đánh dấu 🤖 (chốt BE) — không tách khu riêng.
//   ③ Tab ⭐ "Cần anh xem": 5 việc LLM chọn, không chấm điểm (8b.3b).
//
// KHÔNG chạy bộ sinh cảnh báo ở đây (bản Agent Base chạy `chaySinhCanhBao`
// mỗi lần mở trang). Main không có dữ liệu nghiệp vụ để máy sinh — chạy bộ
// sinh trên dữ liệu rỗng chỉ ra một sổ trống rồi làm người đọc tưởng "sạch
// issue". Issue trên màn này là thứ ĐI HỎI các agent khác mà có.
// ============================================================

import { Header } from "@/components/layout/Header";
import { IssueMainView } from "@/components/tabs/issue-main/IssueMainView";
import { duLieuManIssue } from "@/lib/issue-main/man-hinh";
import { lienKetCacManIssue } from "@/lib/issue-main/gom";
import { resolveProjectId } from "@/lib/projects";
import { layPhienCucBo } from "@/lib/route-auth";
import { duocGhi } from "@/lib/quyen";
import { boLocMatCuaNguoi } from "@/lib/agent-mat-tren-main";
import { locManIssue, lyDoChanChonCanXem } from "@/lib/agent-mat-loc";

export const metadata = { title: "Cảnh báo — Main Agent" };
export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  // Truyền dự án ĐANG XEM (đọc cookie chọn dự án trên thanh trên) xuống lớp
  // gom: Agent Tiến độ bắt buộc tham số ma_du_an, không có là nó trả
  // "Thiếu ma_du_an" và màn mất sạch issue của con đó — đo thật 05/09.
  const duAn = resolveProjectId();
  // Chạy LLM + duyệt tab 🤖 = cửa "ghi" (quyen.ts) — Người xem thấy nút MỜ kèm lý do
  const session = await layPhienCucBo();
  // ⭐ 05/10 luật agent mật: lọc NGAY TẠI TRANG — thẻ Agent Hợp đồng chỉ cho người được thấy hợp đồng dự án này
  const goc = await duLieuManIssue(duAn);
  const dat = locManIssue(goc, boLocMatCuaNguoi(session?.email, session?.role), duAn);
  // 18/10/2026: «⭐ Cần anh xem» chỉ người thấy HẾT thẻ của dự án mới bấm (nút MỜ kèm lý do — luật 17)
  const lyDoChanCanXem = lyDoChanChonCanXem(goc.issue.length - dat.issue.length);

  const choPhepChay = duocGhi(session?.role);

  return (
    <>
      <Header title="Cảnh báo" helpKey="alerts" />
      <div className="space-y-4 p-5">
        <IssueMainView
          issue={dat.issue}
          chuaGom={dat.chuaGom}
          thieuThe={dat.thieuThe}
          khongCoIssue={dat.khongCoIssue}
          lanPhanLoaiCuoi={dat.lanPhanLoaiCuoi}
          lanChonCuoi={dat.lanChonCuoi}
          choPhepChay={choPhepChay}
          lyDoChanCanXem={lyDoChanCanXem}
          tenWbs={dat.tenWbs}
          loiTenWbs={dat.loiTenWbs}
          lienKetAgent={lienKetCacManIssue()}
        />

        {/* 01/11/2026: khối «📐 Nguyên tắc» chuyển vào nút «? Hướng dẫn» (lib/huong-dan/tab) — thân màn chỉ giữ việc làm */}
      </div>
    </>
  );
}
