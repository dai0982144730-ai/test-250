// /api/luat/dich — AI DỊCH câu luật tiếng Việt → đề xuất luật (chưa lưu; người dùng xác nhận rồi lưu qua /api/luat).
// POST { cau: string, ap_dung: string[] | "tat_ca" } → DeXuatLuat (src/lib/luat/types.ts). Không bao giờ lỗi vì AI:
//   AI tắt / lỗi / quá giờ → đề xuất luật AI thô kèm canh_bao. Quyền: người sửa được luật (duocSuaLuat).
import { layQ, type Q } from "@/lib/db";
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { duocSuaNhom } from "@/lib/cau-hinh/quyen";
import { duocSuaLuat } from "@/lib/luat/kho-luat";
import { dichCauLuat } from "@/lib/luat/kiem-ai";
import type { NguoiDungPhien } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function duocSua(q: Q, nd: NguoiDungPhien): Promise<boolean> {
  try {
    return await duocSuaLuat(q, nd);
  } catch {
    // kho luật chưa sẵn sàng: như nhóm cài đặt luat_kiem_tra (quản trị / cau_hinh.sua / phân quyền cài đặt)
    return duocSuaNhom(nd, "luat_kiem_tra", await layCauHinh(q, "phan_quyen_cau_hinh"));
  }
}

export async function POST(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const q = await layQ();
    if (!(await duocSua(q, nd))) throw new LoiHttp(403, "Không có quyền sửa bộ luật kiểm tra");
    let v: { cau?: unknown; ap_dung?: unknown };
    try {
      v = (await req.json()) as typeof v;
    } catch {
      throw new LoiHttp(400, "Dữ liệu gửi lên không phải JSON hợp lệ");
    }
    const cau = typeof v?.cau === "string" ? v.cau.trim() : "";
    if (!cau) throw new LoiHttp(400, "Chưa nhập câu luật");
    if (cau.length > 1000) throw new LoiHttp(400, "Câu luật quá dài (tối đa 1000 ký tự)");
    const ad = v.ap_dung;
    const apDung: string[] | "tat_ca" =
      Array.isArray(ad) && ad.length ? ad.filter((x): x is string => typeof x === "string" && !!x.trim()) : "tat_ca";
    return dichCauLuat(q, cau, Array.isArray(apDung) && !apDung.length ? "tat_ca" : apDung);
  });
}
