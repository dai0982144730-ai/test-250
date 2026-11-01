// POST /api/tro-ly/dinh-kem — nhận 1 file kẹp vào ô chat, bóc CHỮ trả về (FormData "file").
// KHÔNG ghi gì lên đĩa: chữ chỉ sống trong lượt hỏi. Muốn lưu chính thức thì tải lên Thư mục.
// Word theo mẫu: kèm ô nhập gắn mã + kết quả kiểm tra theo mẫu (module kiem-tra).
import { batBuocDangNhap, LoiHttp, xuLy } from "@/lib/phien";
import { layQ } from "@/lib/db";
import { chuanBiTep } from "@/lib/tro-ly/dinh-kem";
import { TRAN_BYTE_TEP, doDuocDuoi } from "@/lib/tro-ly/dinh-kem-chung";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    let fd: FormData;
    try {
      fd = await req.formData();
    } catch {
      throw new LoiHttp(400, "Nội dung gửi lên phải là FormData kèm file.");
    }
    const file = fd.get("file");
    if (!(file instanceof File)) throw new LoiHttp(400, "Thiếu file.");
    if (file.size > TRAN_BYTE_TEP) throw new LoiHttp(400, `File quá ${Math.round(TRAN_BYTE_TEP / 1024 / 1024)} MB.`);
    if (!doDuocDuoi(file.name)) {
      throw new LoiHttp(400, "Trợ lý chưa đọc được loại file này — dùng docx, xlsx, xls, csv, txt, md, json hoặc pptx.");
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const tep = await chuanBiTep(file.name, buffer, await layQ(), nd);
    if (tep.chu.trim() === "") throw new LoiHttp(400, tep.ghiChu ?? "Không bóc được chữ nào trong file.");
    return { ok: true, tep };
  });
}
