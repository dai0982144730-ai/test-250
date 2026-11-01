// ============================================================
// HƯỚNG DẪN QUY TRÌNH — khuôn chung (Mr. Đại 19/10/2026: «nó giải thích cho người dùng sử dụng một hệ công việc, một quy trình …
// tổng quát trước rồi hướng dẫn chi tiết thực hành sau … cần logic chung một kiểu trình bày»).
// Khác ô 💡 Giải thích (lib/giai-thich — giải thích MỘT chữ / nút khi rê chuột): đây là cả một việc, bấm nút đỏ «Hướng dẫn» mới mở.
//
// BẢN 2 — TAB (Mr. Đại 20/10: «đọc mà chả hiểu gì … trình bày các bước thành các tab, cuộn trang thì ghim các tab … mỗi bước quá sơ
// sài … mục việc này để làm gì viết quá vắn tắt … kể cả viết dài thêm ra, tập trung trình bày dễ hiểu nhất có thể»):
//   tab đầu «Tổng quan» (việc này là gì · vì sao phải làm · nằm ở đâu trong cả quy trình · màn có những khối nào) → mỗi bước một tab
//   → tab cuối «Hay vướng». Mỗi tab là dãy KHỐI: đoạn văn · danh sách · bảng so sánh · các bước bấm · ví dụ thật · lưu ý.
//   Viết cho người KHÔNG biết phần mềm: nói vì sao trước, bấm gì sau; mỗi khái niệm lần đầu xuất hiện phải giải nghĩa; có ví dụ số thật.
// Agent Công việc 3004 chỉ dùng bản tab (chép khung từ agent Nghiệm thu 3015, 20/10/2026).
// Thuần (luật 10).
// ============================================================

// ───────── bản 2 — tab ─────────
/** Một khối nội dung trong tab — mỗi khối chỉ dùng MỘT kiểu chính, có thể kèm tiêu đề */
export interface KhoiHD {
  tieuDe?: string;
  /** đoạn văn thường */
  doan?: string[];
  /** danh sách gạch đầu dòng */
  ds?: string[];
  /** các bước bấm, đánh số 1, 2, 3 */
  bam?: string[];
  /** bảng so sánh — hàng đầu là tên cột */
  bang?: string[][];
  /** khung «Ví dụ» — số liệu thật của một dự án */
  viDu?: string[];
  /** khung «Lưu ý» — chỗ hay sai, hậu quả */
  luuY?: string[];
  /** khung «Kết quả» — bấm xong thì máy làm gì, màn hiện gì */
  ketQua?: string[];
  /** khung «🤖 AI làm gì ở bước này» — chữ cam: AI làm gì, khi nào, người kiểm thế nào */
  ai?: string[];
}
// LUẬT CHỮ AI (Mr. Đại 20/10): việc do AI làm phải tách khỏi việc người làm — dòng nào là việc AI làm thì BẮT ĐẦU bằng «🤖»,
// khung tự tô CHỮ CAM (cả trong đoạn, danh sách, bước, ô bảng, ví dụ). Viết «AI», KHÔNG viết «LLM» (người dùng không quen từ này).
// Phân biệt ba bên: NGƯỜI (bấm, chọn, duyệt) · MÁY (tính theo luật cố định, không đoán) · 🤖 AI (đọc chữ, đề xuất — có thể sai, người duyệt).
export interface TabHD {
  /** chữ trên tab — ngắn, đánh số bước: «① Lấy đầu vào» */
  ten: string;
  khoi: KhoiHD[];
}
export interface HuongDanTab {
  tieuDe: string;
  /** ai được làm việc này — hiện ở đầu popup */
  ai: string;
  /** tab đầu luôn «Tổng quan», tab cuối «Hay vướng» */
  tab: TabHD[];
  canCu?: string;
}
