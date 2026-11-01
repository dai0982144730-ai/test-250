// ============================================================
// HƯỚNG DẪN QUY TRÌNH — khuôn chung (Mr. Đại 19/10 và 20/10/2026), chép từ agent Nghiệm thu cho agent Main.
// Khác ô 💡 Giải thích (giải thích MỘT chữ / nút khi rê chuột): đây là cả một việc, bấm nút «? Hướng dẫn» ở thanh trên cùng
// (cạnh «💡 Giải thích») mới mở — luôn hiện, sáng cam khi màn / tab / khung đang hiện có hướng dẫn, mờ khi không có.
// Mỗi hướng dẫn là dãy TAB: «Tổng quan» → mỗi bước một tab → «Hay vướng». Thuần (luật 10) — không node:fs.
// ============================================================

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
  /** khung «Ví dụ» — số liệu thật của một dự án (không lấy được số thì viết tình huống bằng chữ, không bịa số) */
  viDu?: string[];
  /** khung «Lưu ý» — chỗ hay sai, hậu quả */
  luuY?: string[];
  /** khung «Kết quả» — bấm xong thì máy làm gì, màn hiện gì */
  ketQua?: string[];
  /** hình minh họa vẽ sẵn (components/huong-dan/HinhMinhHoa.tsx) — `kieu` là tên hình, `chuThich` ghi dưới hình */
  hinh?: { kieu: string; chuThich: string };
  /** khung «🤖 AI làm gì ở bước này» — chữ cam: AI làm gì, khi nào, người kiểm thế nào */
  ai?: string[];
}
// LUẬT CHỮ AI (Mr. Đại 20/10): việc do AI làm phải tách khỏi việc người làm — dòng nào là việc AI làm thì BẮT ĐẦU bằng «🤖»,
// khung tự tô CHỮ CAM (cả trong đoạn, danh sách, bước, ô bảng, ví dụ). Viết «AI», KHÔNG viết «LLM».
// Ba bên: NGƯỜI (bấm, chọn, duyệt) · MÁY (tính theo luật cố định, không đoán) · 🤖 AI (đọc chữ, đề xuất — có thể sai, người duyệt).
export interface TabHD {
  /** chữ trên tab — ngắn, đánh số bước: «① Lấy đầu vào» */
  ten: string;
  khoi: KhoiHD[];
}
export interface HuongDanTab {
  tieuDe: string;
  /** ai được làm việc này — hiện ở đầu khung */
  ai: string;
  /** tab đầu luôn «Tổng quan», tab cuối «Hay vướng» */
  tab: TabHD[];
  canCu?: string;
}
