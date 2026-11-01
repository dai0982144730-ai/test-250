// GET /api/auth/danh-sach — danh sách tài khoản cho màn đăng nhập "bấm chọn" (không cần đăng nhập).
// Bật/tắt ở Cài đặt → Người dùng & phân quyền → Tài khoản người dùng (danh_sach_dang_nhap; tắt khi dùng thật).
// Trả { hien, bam_la_dang_nhap, nhom: [{ don_vi, tai_khoan: [{ email, ten, chuc_vu }] }] }. Không trả mật khẩu nào (02/10): bấm tên
// thì trang đăng nhập thử mật khẩu lần đầu = chính email (chốt K13); ai đã đổi mật khẩu thì gõ mật khẩu.
import { NextResponse } from "next/server";
import { layQ } from "@/lib/db";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { bamLaDangNhapHieuLuc } from "@/lib/cau-hinh/dang-nhap";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const q = await layQ();
    const tk = await layCauHinh(q, "tai_khoan");
    if (!tk.danh_sach_dang_nhap) return NextResponse.json({ hien: false, nhom: [] });
    const { rows } = await q.query<{ email: string; ten: string; chuc_vu: string | null; don_vi: string | null; loai: string | null; la_quan_tri: boolean }>(
      `SELECT n.email, n.ten, n.chuc_vu, d.ten_ngan AS don_vi, d.loai, n.la_quan_tri
         FROM identity.nguoi_dung n LEFT JOIN identity.don_vi d ON d.id = n.don_vi_id
        WHERE n.active ORDER BY n.la_quan_tri DESC, COALESCE(d.cap, 9), COALESCE(d.thu_tu, 99), n.cap_chuc_vu NULLS LAST, n.ten`,
    );
    const nhom: { don_vi: string; tai_khoan: { email: string; ten: string; chuc_vu: string | null }[] }[] = [];
    for (const r of rows) {
      // Ban TGĐ + các chức danh lãnh đạo (TGĐ, PTGĐ, CT HĐQT…) gom một nhóm "Ban lãnh đạo"
      const ten = r.la_quan_tri ? "Quản trị" : r.loai === "ban_tgd" || r.loai === "chuc_danh" ? "Ban lãnh đạo" : (r.don_vi ?? "Chưa gán đơn vị");
      let g = nhom.find((x) => x.don_vi === ten);
      if (!g) nhom.push((g = { don_vi: ten, tai_khoan: [] }));
      g.tai_khoan.push({ email: r.email, ten: r.ten, chuc_vu: r.loai === "chuc_danh" ? (r.don_vi ?? r.chuc_vu) : r.chuc_vu });
    }
    return NextResponse.json({ hien: true, bam_la_dang_nhap: bamLaDangNhapHieuLuc(tk), nhom });
  } catch {
    return NextResponse.json({ hien: false, nhom: [] });
  }
}
