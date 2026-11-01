// ============================================================
// xem-tep-chung.ts — PHẦN THUẦN của bộ xem file (client import được).
// TÁCH khỏi xem-tep.ts vì bên đó kéo adm-zip/xlsx (cần fs của Node) —
// client import giá trị từ đó là vỡ build "Can't resolve fs"
// (bài học đã ghi sổ: mẫu cau-hinh.ts / cau-hinh-luu.ts, lần thứ BA gặp).
// ============================================================

export interface SheetBang {
  ten: string;
  /** Tối đa 300 hàng × 30 cột — đủ soi nguồn, không nghẽn trình duyệt */
  hang: string[][];
  biCat: boolean;
}

export interface KetQuaXem {
  loai: "pdf" | "bang" | "html" | "chu" | "anh" | "khong-ho-tro";
  ten: string;
  sheet?: SheetBang[];
  /** Tên sheet cần mở sẵn */
  sheetMo?: string;
  html?: string;
  chu?: string;
  ghiChu?: string;
}

export function duoiTep(ten: string): string {
  const i = ten.lastIndexOf(".");
  return i >= 0 ? ten.slice(i).toLowerCase() : "";
}

export const DUOI_XEM_DUOC = new Set([
  ".pdf", ".xlsx", ".xls", ".docx", ".txt", ".md", ".pptx", ".csv", ".json",
  // Ảnh (Mr. Đại chốt 06/09) — bấm ảnh trong khung nạp là mở luôn trong app
  ".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".heif",
]);

/** Ảnh xem bằng thẻ <img>, không bóc chữ như các định dạng kia */
export const DUOI_ANH = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".heif"]);
