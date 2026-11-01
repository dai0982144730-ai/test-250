// POST /api/cai-dat/nhap — nhập file JSON cấu hình (nội dung file làm body). Có lỗi thì không ghi nhóm nào.
import { NextResponse, type NextRequest } from "next/server";
import { layQ, tx } from "@/lib/db";
import { LoiHttp, batBuocDangNhap, xuLy } from "@/lib/phien";
import { nhapCauHinh, type KetQuaGhiThem } from "@/lib/cau-hinh/ghi";
import { nhomDuocSua } from "@/lib/cau-hinh/quyen";
import { layCauHinh } from "@/lib/cau-hinh/doc";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    // Không sửa được nhóm nào thì chặn ngay (như Xuất), khỏi đọc file
    if (nhomDuocSua(nd, await layCauHinh(await layQ(), "phan_quyen_cau_hinh")).length === 0) throw new LoiHttp(403, "Bạn không có quyền nhập cấu hình");
    const duLieu = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!duLieu) throw new LoiHttp(400, "File không phải JSON hợp lệ");
    const ra: KetQuaGhiThem = {};
    const loi = await tx((q) => nhapCauHinh(q, nd, duLieu, ra));
    if (loi.length > 0) return NextResponse.json({ loi: "Không nhập được: cấu hình có lỗi", danh_sach_loi: loi }, { status: 400 });
    return { ok: true, so_viec_ap_dung_lai: ra.so_viec_ap_dung_lai ?? 0 };
  });
}
