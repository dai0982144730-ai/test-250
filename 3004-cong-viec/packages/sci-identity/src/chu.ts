// Tiện ích chữ (thuần, dùng được client lẫn server): bỏ dấu, so khớp tên, tạo mã.

/** Bỏ dấu tiếng Việt, chữ thường, gộp khoảng trắng. "Phòng Đầu tư" → "phong dau tu" */
export function boDau(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Mã dạng kebab từ một tên: "P.ĐT&PC" → "p-dt-pc" */
export function taoMaTuTen(s: string): string {
  return boDau(s)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function chuanHoaEmail(e: string): string {
  return e.trim().toLowerCase();
}

export function laEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}
