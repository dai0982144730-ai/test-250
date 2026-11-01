// ============================================================
// cay-viec/issue/nguong.ts — BA NGƯỠNG N · M · K của màn Issue (chép lib/cai-dat-base.ts:57-117 của agent Base).
// Base khai ở Cài đặt → Ngưỡng; agent Công việc sửa NGAY TRÊN MÀN ISSUE (khung phải) — Mr. Đại chốt 03/10/2026: KHÔNG thêm gì
// vào trang Cài đặt. Sửa được thì phải GHI VẾT: ai sửa, lúc nào, từ → sang (vết do MÁY so bản cũ với bản mới, không tin chữ gửi lên).
// File THUẦN (luật 10) — đọc/ghi đĩa ở nguong-luu.ts.
// ============================================================

export interface NguongIssue {
  /** ⏰ Luật 1: việc quá hạn ≥ N ngày (Base: nguongQuaHanNgay, mặc định 7) */
  N: number;
  /** 🧱 Luật 2: đề xuất dừng ≥ M ngày (Base: nguongDeXuatTacNgay, mặc định 5) — agent Công việc chưa có nguồn đề xuất */
  M: number;
  /** 📄 Luật 4: ±K ngày quanh ngày xong không có BC ngày (Base: nguongXongTrenGiayNgay, mặc định 7) */
  K: number;
}

export interface VetNguong {
  luc: string;
  nguoi: string;
  truong: keyof NguongIssue;
  tu: number;
  sang: number;
}

export interface CauHinhNguong extends NguongIssue {
  vet: VetNguong[];
}

export const NGUONG_MAC_DINH: NguongIssue = { N: 7, M: 5, K: 7 };

export const NHAN_NGUONG: Record<keyof NguongIssue, string> = {
  N: "N — ⏰ quá hạn ≥ N ngày thì sinh issue",
  M: "M — 🧱 đề xuất dừng ≥ M ngày (chưa có nguồn)",
  K: "K — 📄 ±K ngày quanh ngày xong không có BC ngày",
};

/** Lỗi bằng tiếng Việt, null = hợp lệ */
export function soatNguong(n: Partial<NguongIssue>): string | null {
  for (const k of ["N", "M", "K"] as const) {
    const v = n[k];
    if (typeof v !== "number" || !Number.isInteger(v)) return `${k} phải là số ngày nguyên`;
    if (v < 1 || v > 365) return `${k} phải trong khoảng 1–365 ngày (đang là ${v})`;
  }
  return null;
}

/** Máy so bản cũ ↔ bản mới, trả các dòng đổi (để ghi vết) */
export function soSanhNguong(cu: NguongIssue, moi: NguongIssue): Omit<VetNguong, "luc" | "nguoi">[] {
  const ra: Omit<VetNguong, "luc" | "nguoi">[] = [];
  for (const k of ["N", "M", "K"] as const) if (cu[k] !== moi[k]) ra.push({ truong: k, tu: cu[k], sang: moi[k] });
  return ra;
}

/** Trộn bản đã lưu lên mặc định — thiếu / hỏng trường nào thì lấy mặc định trường đó */
export function tronNguong(luu: Partial<CauHinhNguong> | null): CauHinhNguong {
  const lay = (k: keyof NguongIssue) => {
    const v = luu?.[k];
    return typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 365 ? v : NGUONG_MAC_DINH[k];
  };
  return { N: lay("N"), M: lay("M"), K: lay("K"), vet: Array.isArray(luu?.vet) ? luu.vet : [] };
}
