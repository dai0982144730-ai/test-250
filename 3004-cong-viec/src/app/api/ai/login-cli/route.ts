// POST /api/ai/login-cli — ĐÃ ĐÓNG 04/10/2026 (kiểm độc lập lần 2 #3). Trước: mở cửa sổ đăng nhập Claude trên MÁY CHỦ / đăng xuất
// tài khoản mặc định của máy. Mr. Đại chốt 04/10: mọi tài khoản Claude đăng nhập MỘT cách — link + dán mã (lib/ai/dang-nhap-link.ts,
// thẻ TheTaiKhoanClaude). Giữ đường dẫn để lời gọi cũ nhận câu tiếng Việt chỉ đường mới thay vì 404.
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { batBuocQuyen } from "@/lib/ai/route-chung";
import { CAU_CUA_DANG_NHAP_CU } from "@/lib/ai/dang-nhap-link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(): Promise<Response> {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    batBuocQuyen(nd, "cau_hinh.sua", "Chỉ người có quyền sửa cài đặt mới đăng nhập/đăng xuất Claude CLI.");
    throw new LoiHttp(410, CAU_CUA_DANG_NHAP_CU);
  });
}
