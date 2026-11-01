// ============================================================
// cay-viec/issue/quyen.ts — AI ĐƯỢC LÀM GÌ trên màn Issue của agent Công việc (chép ý lib/canh-bao/quyen-issue.ts của Base).
// File THUẦN — server (chặn ở tầng dữ liệu / API) và màn hình (ẨN nút — luật riêng 3004, khác Base làm mờ) dùng chung.
//
// Không thêm quyền mới — dùng quyền có sẵn ở ma trận Cài đặt › Vai trò và quyền, chọn theo nghĩa:
//   · xem màn                         = "so_cai.xem"   (như màn Cây việc)
//   · ghi nhận xử lý · + thêm issue
//     · 🙈 ẩn · đóng issue người thêm  = "cong_viec.sua" (Base: cửa "ghi" — Người xem không ghi được)
//   · duyệt / bác bỏ đề xuất 🤖 ·
//     🗑 xoá issue sai · sửa ngưỡng N/M/K · 🤖 chạy AI đề xuất = "wbs.duyet" (việc PHÁN XÉT máy đúng/sai — người duyệt gắn WBS)
//   · ✎ soạn / giao việc từ issue     = "cong_viec.giao" (như nút Giao việc ở Cây việc)
// Quản trị luôn được hết.
// ============================================================
import type { NguoiDungPhien } from "@/lib/types";
import { AGENT_NAY, TEN_AGENT, laNguonMay, type TheCanhBao } from "./model";

export interface QuyenIssue {
  ghi: boolean;
  duyet: boolean;
  giao: boolean;
}

export function quyenIssue(nd: Pick<NguoiDungPhien, "la_quan_tri" | "quyen">): QuyenIssue {
  const co = (k: "cong_viec.sua" | "wbs.duyet" | "cong_viec.giao") => nd.la_quan_tri || !!nd.quyen[k];
  return { ghi: co("cong_viec.sua"), duyet: co("wbs.duyet"), giao: co("cong_viec.giao") };
}

/** Vì sao KHÔNG GHI được vào thẻ (null = ghi được) — chốt BC: chỉ sửa issue do chính agent này sinh, thẻ đã đóng chỉ đọc */
export function lyDoChanGhi(t: Pick<TheCanhBao, "agent" | "dieuKien">): string | null {
  const chu = t.agent ?? AGENT_NAY;
  if (chu !== AGENT_NAY) return `Issue này do ${TEN_AGENT[chu]} sinh ra — ${TEN_AGENT[AGENT_NAY]} nhìn thấy nhưng không sửa được.`;
  if (t.dieuKien === "da-dong") return "Issue đã đóng — không ghi thêm được nữa.";
  return null;
}

/** Vì sao KHÔNG ĐÓNG được (null = đóng được): issue máy sinh thì CHỈ MÁY đóng (8.2c) */
export function lyDoChanDong(t: Pick<TheCanhBao, "agent" | "dieuKien" | "nguon">): string | null {
  const c = lyDoChanGhi(t);
  if (c) return c;
  if (laNguonMay(t.nguon)) return "Issue do máy sinh thì CHỈ MÁY đóng được — hết vi phạm là máy tự hạ qua các bậc.";
  return null;
}
