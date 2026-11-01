// ============================================================
// to-sang.ts — TÔ SÁNG CHỖ CẦN XEM sau khi trợ lý làm xong (chốt 06/09)
//
// Mô hình "Làm & Duyệt" Mr. Đại chốt: trợ lý gọi thẳng công cụ nội bộ (nhanh,
// không mô phỏng chuột) → tự mở đúng màn kết quả → TÔ SÁNG chỗ cần xem →
// người đọc rồi quyết.
//
// Luật 18 (màu phải truy về được một định nghĩa): đây KHÔNG phải màu trạng
// thái — nó là vệt chỉ đường tạm thời, dùng màu accent, tự tắt sau 6 giây.
// Không đụng vào màu ô/dòng do dữ liệu quy định.
//
// Client-only (đụng document).
// ============================================================

const ID_LOP = "sci-lop-to-sang";
const ID_NUT = "sci-nut-to-lai";
/** Tô rồi tự tắt sau ngần này — vệt chỉ đường, không phải màu trạng thái */
const ID_NUT_TAT = "sci-nut-tat-to-sang";
// ⭐ 13/09 (Mr. Đại): KHÔNG tự tắt sau 6 giây nữa — người đọc trên điện thoại chưa kịp
// nhìn đã mất. Vệt sáng ở tới khi bấm ✕ Tắt, hoặc tới lượt tô mới.
// ⭐ 13/09 (Mr. Đại): vệt sáng KHÔNG được đè lên khung chat trợ lý. Khung chat nằm ở
// z-index 70 (ChatWidget) → lớp tô để 60, nằm DƯỚI khung chat; phần tử nằm trong
// khung chat thì không tô.
const Z_LOP = 60;
const Z_NUT = 61;
const CHON_KHUNG_CHAT = "[data-chat-drag], [data-chat-noresize]";
/** Trần số chỗ tô một lượt — tô cả trăm dòng thì thành vô nghĩa */
export const TRAN_TO_SANG = 12;

/** Chỗ cần xem: dòng WBS, thẻ issue, mã TK-… — bất cứ thứ gì mang data-wbs */
export interface ChoCanXem {
  /** Giá trị data-wbs của phần tử cần tô */
  wbs: string;
  /** Một dòng nói vì sao chỗ này đáng xem — hiện cạnh vệt tô */
  vi?: string;
}

function donLop(): void {
  document.getElementById(ID_LOP)?.remove();
  document.getElementById(ID_NUT)?.remove();
  document.getElementById(ID_NUT_TAT)?.remove();
}

function timCho(wbs: string): HTMLElement | null {
  const an = wbs.replace(/["\\]/g, "\\$&");
  return document.querySelector<HTMLElement>(`[data-wbs="${an}"]`);
}

/** Vẽ một vệt sáng phủ lên phần tử (không sửa style của chính phần tử) */
function veVet(lop: HTMLElement, el: HTMLElement, vi: string | undefined, dau: boolean): boolean {
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return false;
  // Không tô thứ nằm trong khung chat trợ lý (thẻ/tin trong chat có thể mang data-wbs trùng)
  if (el.closest(CHON_KHUNG_CHAT) || el.closest("[data-chat-widget]")) return false;
  const v = document.createElement("div");
  v.style.cssText = [
    "position:absolute",
    `left:${r.left + window.scrollX - 3}px`,
    `top:${r.top + window.scrollY - 3}px`,
    `width:${r.width + 6}px`,
    `height:${r.height + 6}px`,
    "border:2px solid var(--accent)",
    "border-radius:7px",
    "background:color-mix(in srgb, var(--accent) 12%, transparent)",
    "box-shadow:0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent)",
    "pointer-events:none",
    "transition:opacity .5s",
  ].join(";");
  lop.appendChild(v);

  if (vi && vi.trim() !== "") {
    const nhan = document.createElement("div");
    nhan.textContent = vi;
    nhan.style.cssText = [
      "position:absolute",
      `left:${r.left + window.scrollX + 6}px`,
      `top:${r.top + window.scrollY - 22}px`,
      "max-width:min(520px, 70vw)",
      "overflow:hidden",
      "text-overflow:ellipsis",
      "white-space:nowrap",
      "padding:2px 8px",
      "border-radius:6px",
      "background:var(--accent)",
      "color:#fff",
      "font:600 11px 'Segoe UI',Arial,sans-serif",
      "box-shadow:0 2px 8px rgba(0,0,0,.45)",
      "pointer-events:none",
    ].join(";");
    lop.appendChild(nhan);
  }

  // Chỗ ĐẦU TIÊN thì cuộn tới cho người dùng thấy ngay, khỏi phải đi tìm
  if (dau) el.scrollIntoView({ behavior: "smooth", block: "center" });
  return true;
}

/**
 * Tô sáng các chỗ cần xem trên trang hiện tại.
 * Trả về số chỗ tô được — chỗ không tìm thấy thì bỏ qua, KHÔNG báo lỗi giả
 * (dòng có thể đang bị bộ lọc ẩn đi).
 */
export function toSang(ds: ChoCanXem[]): number {
  donLop();
  const cho = ds.slice(0, TRAN_TO_SANG);
  if (cho.length === 0) return 0;

  const lop = document.createElement("div");
  lop.id = ID_LOP;
  lop.setAttribute("aria-hidden", "true");
  lop.style.cssText =
    `position:absolute;left:0;top:0;width:0;height:0;z-index:${Z_LOP};pointer-events:none`;
  document.body.appendChild(lop);

  let dem = 0;
  cho.forEach((c) => {
    const el = timCho(c.wbs);
    if (el && veVet(lop, el, c.vi, dem === 0)) dem += 1;
  });

  if (dem === 0) {
    donLop();
    return 0;
  }

  // Nút "tô lại": cuộn đi một lúc là vệt lệch chỗ (trang co giãn) — bấm là vẽ
  // lại theo vị trí mới, khỏi phải hỏi trợ lý lần nữa.
  const nut = document.createElement("button");
  nut.id = ID_NUT;
  nut.type = "button";
  nut.textContent = `🔦 Tô lại ${dem} chỗ`;
  // Đặt bên TRÁI dưới — góc phải dưới là nút mở chat trợ lý
  nut.style.cssText = [
    "position:fixed",
    "left:18px",
    "bottom:18px",
    `z-index:${Z_NUT}`,
    "padding:7px 12px",
    "border-radius:9px",
    "border:1px solid var(--accent)",
    "background:var(--surface)",
    "color:var(--accent)",
    "font:600 11.5px 'Segoe UI',Arial,sans-serif",
    "cursor:pointer",
    "box-shadow:0 6px 20px rgba(0,0,0,.4)",
  ].join(";");
  nut.addEventListener("click", () => toSang(ds));
  document.body.appendChild(nut);

  // Nút ✕ Tắt — cách DUY NHẤT để vệt biến mất (ngoài lượt tô mới)
  const tat = document.createElement("button");
  tat.id = ID_NUT_TAT;
  tat.type = "button";
  tat.textContent = "✕ Tắt tô sáng";
  tat.title = "Tắt vệt tô sáng (vệt không tự tắt)";
  tat.style.cssText = nut.style.cssText.replace("left:18px", "left:150px");
  tat.addEventListener("click", donLop);
  document.body.appendChild(tat);

  return dem;
}

export function xoaToSang(): void {
  donLop();
}
