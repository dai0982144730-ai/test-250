// GET /api/so-cai/da-xong?tu=YYYY-MM-DD — việc ĐÃ HOÀN THÀNH (không gồm việc bị hủy) còn trong thời hạn lưu (Cài đặt → Tệp đính kèm
// việc → số tháng lưu), lùi thêm tới ngày tu nếu tu sớm hơn. Cho hai nút "Xong tuần …" / "Xong 30 ngày", ô tìm phạm vi, và link từ chuông
// (Mr. Đại chốt 30/09). Chỉ đọc, trừ quyền "Mở lại" (K1 02/10).
import { layQ } from "@/lib/db";
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { coQuyen } from "@sci/identity";
import { coTheSua, viecDaXong } from "@/lib/so-cai/dich-vu";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { congNgay, homNayVN } from "@/lib/so-cai/tien-ich";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    if (!coQuyen(nd, "so_cai.xem")) throw new LoiHttp(403, "Bạn không có quyền xem sổ cái");
    const tu = new URL(req.url).searchParams.get("tu") ?? "";
    if (tu && !/^\d{4}-\d{2}-\d{2}$/.test(tu)) throw new LoiHttp(400, "Ngày bắt đầu không hợp lệ (cần dạng năm-tháng-ngày)");
    const q = await layQ();
    const luu = congNgay(homNayVN(), -Math.round(((await layCauHinh(q, "dinh_kem")).luu_thang ?? 6) * 31));
    const ds = (await viecDaXong(q, { tu: tu && tu < luu ? tu : luu })).filter((v) => v.trang_thai === "hoan_thanh");
    // co_the_mo_lai (K1, Mr. Đại duyệt 02/10): người giao + lãnh đạo thấy nút "Mở lại" — không quyền thì ẩn (luật riêng 3004)
    const viec = [];
    for (const v of ds) viec.push({ ...v, co_the_mo_lai: await coTheSua(q, nd, v, v.phan_viec) });
    return { viec };
  });
}
