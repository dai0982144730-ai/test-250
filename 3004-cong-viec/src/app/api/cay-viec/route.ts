// GET /api/cay-viec?du_an=da-hv — dữ liệu màn "Cây việc & đường găng" (chép route cùng tên của agent Base).
// Cây WBS + đường găng hỏi agent Tiến độ qua lớp ghi sổ (luật 29); việc đọc từ sổ cái của chính agent này.
// Route riêng chứ không gọi trong lúc dựng trang: agent kia chậm thì trang vẫn hiện, phần đi hỏi nạp sau (HOP-DONG-KET-NOI 6.2).
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { coQuyen } from "@sci/identity";
import { duongGang } from "@/lib/nguon-tien-do";
import { layHetDauViec } from "@/lib/tien-do-dau-viec";
import { dungManCayViec } from "@/lib/cay-viec/dung-man";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    if (!coQuyen(nd, "so_cai.xem")) throw new LoiHttp(403, "Bạn không có quyền xem sổ cái");
    const duAn = new URL(req.url).searchParams.get("du_an");
    return dungManCayViec(nd, duAn, { hoiGang: duongGang, hoiCay: layHetDauViec });
  });
}
