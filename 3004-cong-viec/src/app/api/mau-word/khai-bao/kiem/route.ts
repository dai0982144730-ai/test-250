// /api/mau-word/khai-bao/kiem — POST multipart {tep, ma, ten, moi, cau_truc}: code gắn nhãn rồi đọc lại bằng bộ đọc thật;
// trả lỗi chặn + luật kiểm tra sẽ tự tắt (MD Khai báo mẫu mục 4.1 bước 5). Không ghi gì.
import { layQ } from "@/lib/db";
import { batBuocDangNhap, xuLy } from "@/lib/phien";
import { kiemThuMau } from "@/lib/kiem-tra/khai-bao-mau";
import { docFormKhaiBao } from "../doc-form";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    return kiemThuMau(await layQ(), nd, await docFormKhaiBao(req));
  });
}
