// /api/mau-word/khai-bao/luu — POST multipart {tep, ma, ten, moi, cau_truc}: lưu file đã gắn nhãn + định nghĩa thành phiên bản mới
// (kiểm lại từ đầu; tự tắt luật trỏ vào bảng/cột đã bỏ). MD Khai báo mẫu mục 4.1 bước 6.
import { tx } from "@/lib/db";
import { batBuocDangNhap, xuLy } from "@/lib/phien";
import { luuPhienBanMau } from "@/lib/kiem-tra/khai-bao-mau";
import { docFormKhaiBao } from "../doc-form";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const v = await docFormKhaiBao(req);
    return tx((q) => luuPhienBanMau(q, nd, v));
  });
}
