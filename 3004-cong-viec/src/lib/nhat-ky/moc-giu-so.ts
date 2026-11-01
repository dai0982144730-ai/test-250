// ============================================================
// HAI MỐC GIỮ SỔ HỎI–ĐÁP — kiểm hợp lệ (HOP-DONG-KET-NOI 7.1 "Giữ sổ theo tuổi",
// Mr. Đại chốt 26/09/2026)
//
//   ≤ đầy đủ (mặc định 10 ngày)  → giữ nguyên dòng — tra ngược báo cáo tuần
//   ≤ gọn    (mặc định 35 ngày)  → bỏ nội dung trả lời dài — tra ngược báo cáo tháng
//   cũ hơn                        → xoá
//
// Hai mốc là cài đặt CHUNG của hệ — khai ở Main (Cài đặt → 🔌 Kết nối), 4 agent kéo
// về qua `main.du_lieu_dung_chung` (trường `giu_so`). Kéo không được thì dùng mặc
// định trong `khuon-so.ts`.
//
// Tệp này CHÉP GIỐNG HỆT ở 5 agent (4 app Next: src/lib/nhat-ky/ · pháp lý: lib/mcp/).
// Không đụng đĩa (chỉ kiểm số).
// ============================================================

import { MOC_GIU_DAY_DU_NGAY, MOC_GIU_GON_NGAY } from "./khuon-so";

export interface MocGiuSo {
  /** Giữ ĐẦY ĐỦ tới N ngày tuổi */
  dayDu: number;
  /** Giữ bản GỌN tới N ngày tuổi; cũ hơn thì xoá */
  gon: number;
}

export const MOC_GIU_SO_MAC_DINH: MocGiuSo = { dayDu: MOC_GIU_DAY_DU_NGAY, gon: MOC_GIU_GON_NGAY };
/** Trần trên của mốc gọn — một năm */
export const MOC_GIU_SO_TOI_DA = 365;

function soNguyen(v: unknown): number | null {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v;
  return typeof n === "number" && Number.isInteger(n) ? n : null;
}

/**
 * Kiểm hai mốc: số nguyên, 1 ≤ đầy đủ < gọn ≤ 365. Nhận cả `{dayDu, gon}` (Main) lẫn
 * `{day_du, gon}` (khuôn MCP). Sai thì trả câu tiếng Việt để hiện ra màn hình.
 */
export function kiemMocGiuSo(x: unknown): { ok: true; moc: MocGiuSo } | { ok: false; loi: string } {
  if (!x || typeof x !== "object") return { ok: false, loi: "Thiếu hai mốc giữ sổ." };
  const o = x as Record<string, unknown>;
  const dayDu = soNguyen(o.dayDu ?? o.day_du);
  const gon = soNguyen(o.gon);
  if (dayDu === null || gon === null) return { ok: false, loi: "Hai mốc giữ sổ phải là số ngày nguyên." };
  if (dayDu < 1) return { ok: false, loi: "Mốc giữ đầy đủ phải từ 1 ngày trở lên." };
  if (gon > MOC_GIU_SO_TOI_DA) return { ok: false, loi: `Mốc giữ bản gọn tối đa ${MOC_GIU_SO_TOI_DA} ngày.` };
  if (dayDu >= gon) return { ok: false, loi: "Mốc giữ đầy đủ phải NHỎ HƠN mốc giữ bản gọn." };
  return { ok: true, moc: { dayDu, gon } };
}
