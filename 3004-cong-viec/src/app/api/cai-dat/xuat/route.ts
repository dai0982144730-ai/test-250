// GET /api/cai-dat/xuat — tải toàn bộ cấu hình ra file JSON (chuyển máy thử nghiệm → máy chạy thật).
import { layQ } from "@/lib/db";
import { LoiHttp, batBuocDangNhap, xuLy } from "@/lib/phien";
import { xuatCauHinh } from "@/lib/cau-hinh/ghi";
import { nhomDuocSua } from "@/lib/cau-hinh/quyen";
import { layCauHinh } from "@/lib/cau-hinh/doc";

export const dynamic = "force-dynamic";

export async function GET() {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const q = await layQ();
    if (nhomDuocSua(nd, await layCauHinh(q, "phan_quyen_cau_hinh")).length === 0) throw new LoiHttp(403, "Bạn không có quyền xuất cấu hình");
    const duLieu = await xuatCauHinh(q);
    // Ngày theo giờ Việt Nam (toISOString là giờ UTC — trước 7 giờ sáng sẽ ra ngày hôm trước)
    const ngay = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
    return new Response(JSON.stringify(duLieu, null, 2), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        // Tên tiếng Việt (filename* UTF-8), bản không dấu cho trình duyệt cũ
        "content-disposition": `attachment; filename="cau-hinh-agent-cong-viec-${ngay}.json"; filename*=UTF-8''${encodeURIComponent(`Cấu hình agent Công việc ${ngay.split("-").reverse().join("-")}.json`)}`,
      },
    });
  });
}
