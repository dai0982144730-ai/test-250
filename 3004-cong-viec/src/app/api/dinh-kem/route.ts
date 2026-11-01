// POST /api/dinh-kem — tải MỘT file đính kèm lên (form: noi = giao_viec | bao_xong | binh_luan, tep = file).
// Màn gửi từng file một (file tới 50 MB, tối đa 20 file mỗi lần kẹp) rồi đưa danh sách mã khi bấm Giao / Báo xong / Gửi.
import { tx } from "@/lib/db";
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { taiLenDinhKem } from "@/lib/dinh-kem/kho";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const form = await req.formData().catch(() => null);
    if (!form) throw new LoiHttp(400, "Không đọc được file gửi lên");
    const f = form.get("tep");
    if (!f || typeof f !== "object" || !("arrayBuffer" in f)) throw new LoiHttp(400, "Chưa chọn file");
    const tep = f as File;
    const buf = Buffer.from(await tep.arrayBuffer());
    return { tep: await tx((q) => taiLenDinhKem(q, nd, String(form.get("noi") ?? ""), { ten: tep.name, mime: tep.type, buf })) };
  });
}
