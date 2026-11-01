// GET /api/tro-ly/phien — thông tin khung chat cần: người đang đăng nhập + câu gợi ý (cấu hình ai.cau_goi_y).
// Thay useSessionUser() của bản gốc (SCI công việc đăng nhập qua lib/phien.ts). Chưa đăng nhập → 401 (khung chat tự ẩn).
import { batBuocDangNhap, xuLy } from "@/lib/phien";
import { coQuyen } from "@sci/identity";
import { layQ } from "@/lib/db";
import { layCauHinh } from "@/lib/cau-hinh/doc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const ai = await layCauHinh(await layQ(), "ai");
    return {
      ok: true,
      nguoi: { id: nd.id, ten: nd.ten, email: nd.email, don_vi_id: nd.don_vi_id },
      cauGoiY: Array.isArray(ai.cau_goi_y) ? ai.cau_goi_y.filter((c) => typeof c === "string").slice(0, 8) : [],
      quyen: {
        cauHinh: coQuyen(nd, "cau_hinh.sua"),
        kyNangChung: coQuyen(nd, "ky_nang.them_chung"),
        capKhoa: coQuyen(nd, "agent.cap_khoa"),
      },
    };
  });
}
