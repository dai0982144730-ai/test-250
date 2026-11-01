// phong/nho-trang-thai.ts — NHỚ TRẠNG THÁI màn Sơ đồ / Dự án khi chuyển menu rồi quay lại (Mr. Đại chốt 28/09):
// tuần báo cáo đang xem, ô đang chọn, bộ lọc Issue / Việc của tôi / Việc thuộc hệ thống, việc đang mở.
// Nhớ theo PHIÊN của thẻ trình duyệt (sessionStorage): đóng thẻ mở lại thì về mặc định (tuần mới nhất) — tránh tuần sau mở app
// vẫn kẹt ở tuần cũ. Lỗi bộ nhớ (chế độ riêng tư…) thì bỏ qua, màn vẫn chạy như mặc định.
import { useEffect, useRef, useState } from "react";

export function docNho<T>(khoa: string): Partial<T> | null {
  try {
    const s = sessionStorage.getItem(`phong-nho-${khoa}`);
    return s ? (JSON.parse(s) as Partial<T>) : null;
  } catch {
    return null;
  }
}

export function ghiNho(khoa: string, v: unknown): void {
  try {
    sessionStorage.setItem(`phong-nho-${khoa}`, JSON.stringify(v));
  } catch {
    /* bỏ qua */
  }
}

/**
 * Quên mọi trạng thái đã nhớ — gọi khi đăng xuất / mở trang đăng nhập. Đo 30/09: đổi tài khoản trên cùng thẻ thì người sau
 * thừa hưởng bộ lọc "Việc tôi giao", tuần 39 và việc đang mở của người trước → sơ đồ toàn "0 việc".
 */
export function quenHet(): void {
  try {
    for (const k of Object.keys(sessionStorage)) if (k.startsWith("phong-nho-")) sessionStorage.removeItem(k);
  } catch {
    /* bỏ qua */
  }
}

/** Tuần đang xem trên Sơ đồ tổ chức ('' = tuần mới nhất) — thanh trên dùng để mở lại đúng tuần. */
export const KHOA_TUAN = "so-do-ngay";

/**
 * Khôi phục trạng thái một lần khi màn mở (`datLai` nhận giá trị đã nhớ), rồi ghi lại mỗi lần `hienTai` đổi.
 * Chưa khôi phục xong thì không ghi — tránh đè trạng thái cũ bằng giá trị mặc định.
 */
export function useNhoTrangThai<T extends object>(khoa: string, hienTai: T, datLai: (v: Partial<T>) => void): boolean {
  const [xong, setXong] = useState(false);
  const datLaiRef = useRef(datLai);
  datLaiRef.current = datLai;
  useEffect(() => {
    const v = docNho<T>(khoa);
    if (v) datLaiRef.current(v);
    setXong(true);
  }, [khoa]);
  const chuoi = JSON.stringify(hienTai);
  useEffect(() => {
    if (xong) ghiNho(khoa, JSON.parse(chuoi));
  }, [xong, khoa, chuoi]);
  return xong;
}
