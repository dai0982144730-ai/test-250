// POST /api/ai/test — thử kết nối AI (quyền cau_hinh.sua).
//   body {}                               → KHÔNG tốn token (claude-cli → auth status; api → GET /models)
//   body { thuThat: true, mode?, provider? } → "Thử trợ lý AI" như HptStart: hỏi MỘT câu ngắn thật,
//        trả { ok, tra_loi, giay } | { ok:false, loi, giay }. mode/provider = thử đúng panel đang xem
//        (nhà cung cấp đã có khóa mà chưa bật) — chỉ chọn trong danh sách cố định, không chuỗi nào đi vào lệnh.
import { batBuocDangNhap, LoiHttp, xuLy } from "@/lib/phien";
import { PROVIDERS, cauHinhCho, testConnection, thuTroLy, type AIProvider } from "@/lib/ai/providers";
import { batBuocQuyen, docJson } from "@/lib/ai/route-chung";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    batBuocQuyen(nd, "cau_hinh.sua", "Chỉ người có quyền sửa cài đặt mới kiểm tra kết nối AI.");
    const b = await docJson(req, false);
    let mode: "claude-cli" | "api" | undefined;
    if (b.mode !== undefined) {
      if (b.mode !== "claude-cli" && b.mode !== "api") throw new LoiHttp(400, "Chế độ thử phải là claude-cli hoặc api.");
      mode = b.mode;
    }
    let provider: AIProvider | undefined;
    if (b.provider !== undefined) {
      if (!(PROVIDERS as string[]).includes(String(b.provider))) throw new LoiHttp(400, "Nhà cung cấp không hợp lệ.");
      provider = b.provider as AIProvider;
    }
    const cfg = cauHinhCho(mode, provider);
    if (b.thuThat === true) return thuTroLy(cfg);
    try {
      return await testConnection(cfg);
    } catch (e) {
      return { ok: false, message: `Thử kết nối thất bại: ${e instanceof Error ? e.message : String(e)}` };
    }
  });
}
