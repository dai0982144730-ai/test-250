// GET /api/auth/danh-sach — danh sách tài khoản cho màn đăng nhập «bấm chọn» (không cần đăng nhập).
// Công tắc ở Main (Cài đặt › Người dùng). Tắt → { hien:false } và KHÔNG trả tên nào. Không bao giờ trả mật khẩu / mã băm.
import { NextResponse } from "next/server";
import { listUsers } from "@/lib/users";
import { hienDanhSachDangNhap } from "@/lib/dang-nhap-bam-chon";
import { chuanHoaLoai, laNhaThau } from "@/lib/quyen";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NHOM: { ma: string; ten: string }[] = [
  { ma: "admin", ten: "Quản trị" },
  { ma: "pm", ten: "Quản lý dự án (PM)" },
  { ma: "engineer", ten: "Người dùng" },
  { ma: "viewer", ten: "Người xem" },
];

export async function GET() {
  try {
    if (!(await hienDanhSachDangNhap())) return NextResponse.json({ hien: false, nhom: [] });
    const ds = listUsers().filter((u) => u.active !== false && !laNhaThau(u.role));
    const nhom = NHOM.map((g) => ({
      don_vi: g.ten,
      tai_khoan: ds
        .filter((x) => chuanHoaLoai(x.role) === g.ma)
        .map((u) => ({ email: u.email, ten: u.name || u.email, chuc_vu: (u as { chucVu?: string | null }).chucVu ?? null }))
        .sort((a, b) => a.ten.localeCompare(b.ten, "vi")),
    })).filter((g) => g.tai_khoan.length);
    return NextResponse.json({ hien: true, nhom });
  } catch {
    return NextResponse.json({ hien: false, nhom: [] });
  }
}
