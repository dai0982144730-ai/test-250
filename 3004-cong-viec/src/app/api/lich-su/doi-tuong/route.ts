// /api/lich-su/doi-tuong?loai=&id= — dòng thời gian ĐẦY ĐỦ của một tài liệu / công việc / ...
// Tài liệu: ai mở xem được nội dung thì xem được cả dòng thời gian. Công việc: lich_su.xem hoặc so_cai.xem.
// Đối tượng khác: lich_su.xem đủ phạm vi (thư mục/đơn vị/người dùng theo đơn vị; cài đặt, mẫu, agent cần toàn bộ).
import { layQ, type Q } from "@/lib/db";
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { coQuyen } from "@sci/identity";
import { layCayDonVi } from "@sci/identity/don-vi";
import { lichSuDoiTuong } from "@/lib/lich-su/doc";
import { tenChoLichSu } from "@/lib/lich-su/ten";
import { duocXemNoiDung } from "@/lib/thu-muc/truy-van";
import type { LoaiDoiTuong, NguoiDungPhien } from "@/lib/types";

export const dynamic = "force-dynamic";

const LOAI: LoaiDoiTuong[] = ["tai_lieu", "cong_viec", "thu_muc", "cau_hinh", "nguoi_dung", "don_vi", "mau", "ky_nang", "agent"];

async function duocXem(q: Q, nd: NguoiDungPhien, loai: LoaiDoiTuong, id: string): Promise<boolean> {
  if (loai === "tai_lieu") return duocXemNoiDung(q, nd, id);
  if (loai === "cong_viec") return coQuyen(nd, "lich_su.xem") || coQuyen(nd, "so_cai.xem");
  if (loai === "nguoi_dung" && id === nd.id) return true;
  let donVi: string | null = null;
  if (loai === "don_vi") donVi = id;
  if (loai === "thu_muc") donVi = (await q.query<{ d: string }>("SELECT don_vi_id AS d FROM docflow.thu_muc WHERE id = $1", [id])).rows[0]?.d ?? null;
  if (loai === "nguoi_dung") donVi = (await q.query<{ d: string | null }>("SELECT don_vi_id AS d FROM identity.nguoi_dung WHERE id = $1", [id])).rows[0]?.d ?? null;
  return coQuyen(nd, "lich_su.xem", { don_vi_id: donVi }, await layCayDonVi(q, true));
}

export async function GET(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const u = new URL(req.url).searchParams;
    const loai = u.get("loai") as LoaiDoiTuong | null;
    const id = u.get("id");
    if (!loai || !LOAI.includes(loai) || !id) throw new LoiHttp(400, "Thiếu loại hoặc mã đối tượng");
    const q = await layQ();
    if (!(await duocXem(q, nd, loai, id))) throw new LoiHttp(403, "Bạn không có quyền xem lịch sử của đối tượng này");
    const dong = await lichSuDoiTuong(q, loai, id);
    return { dong, ten: await tenChoLichSu(q, dong) };
  });
}
