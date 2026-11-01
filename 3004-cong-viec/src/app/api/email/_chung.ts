// Dùng chung cho /api/email/* (không phải route): quản trị = quản trị viên hoặc có quyền cau_hinh.sua.
import { coQuyen } from "@sci/identity";
import { LoiHttp, batBuocDangNhap } from "@/lib/phien";
import type { NguoiDungPhien } from "@/lib/types";

export async function batBuocQuanTriEmail(): Promise<NguoiDungPhien> {
  const nd = await batBuocDangNhap();
  if (!nd.la_quan_tri && !coQuyen(nd, "cau_hinh.sua")) throw new LoiHttp(403, "Chỉ quản trị viên (quyền sửa cài đặt) mới xem được phần gửi email");
  return nd;
}
