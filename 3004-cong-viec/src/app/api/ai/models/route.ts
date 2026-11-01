// POST /api/ai/models { provider, apiKey? } — danh sách model của một nhà cung cấp (quyền cau_hinh.sua).
// Như HptStart "/models": có khóa (vừa dán, hoặc đã lưu) thì hỏi thẳng hãng; không được → danh sách dự phòng.
// Khóa vừa dán đi trong BODY (không nằm trên URL/nhật ký truy cập), chỉ dùng cho lần hỏi này, không lưu.
import { batBuocDangNhap, LoiHttp, xuLy } from "@/lib/phien";
import { PROVIDERS, cauHinhCho, lietKeModel, type AIProvider } from "@/lib/ai/providers";
import { batBuocQuyen, docJson } from "@/lib/ai/route-chung";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    batBuocQuyen(nd, "cau_hinh.sua", "Chỉ người có quyền sửa cài đặt mới xem danh sách model.");
    const b = await docJson(req);
    const provider = String(b.provider ?? "");
    if (!(PROVIDERS as string[]).includes(provider)) throw new LoiHttp(400, "Nhà cung cấp không hợp lệ.");
    const cfg = cauHinhCho("api", provider as AIProvider);
    const khoaMoi = typeof b.apiKey === "string" ? b.apiKey.trim() : "";
    const kq = await lietKeModel(khoaMoi !== "" ? { ...cfg, apiKey: khoaMoi } : cfg);
    return { ok: true, models: kq.models, tuHang: kq.tuHang };
  });
}
