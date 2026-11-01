// Công tắc «hiện danh sách tài khoản ở màn đăng nhập» — CHỈ phía server. Mr. Đại chốt 25/10/2026: giai đoạn test bật,
// hết giai đoạn test vào Cài đặt › Người dùng của Main tắt (một công tắc cho cả hệ). Mặc định BẬT (đang test).
import fs from "node:fs";
import path from "node:path";
import { gocDuLieu } from "@/lib/goc-du-lieu";

const TEP = () => path.join(gocDuLieu(), "dang-nhap-hien.json");

export function docHienDanhSach(): boolean {
  try {
    const j = JSON.parse(fs.readFileSync(TEP(), "utf8")) as { hien?: unknown };
    return j.hien !== false;
  } catch (e) {
    // Chưa có tệp = giai đoạn test chưa từng tắt → BẬT. Tệp có mà hỏng / không đọc được → TẮT (đóng khi lỗi)
    return (e as NodeJS.ErrnoException)?.code === "ENOENT";
  }
}

export function ghiHienDanhSach(hien: boolean): void {
  fs.mkdirSync(gocDuLieu(), { recursive: true });
  fs.writeFileSync(TEP(), JSON.stringify({ hien, cap_nhat: new Date().toISOString() }, null, 2) + "\n", "utf8");
}

export async function hienDanhSachDangNhap(): Promise<boolean> {
  return docHienDanhSach();
}
