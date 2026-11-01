// GET /api/cai-dat — mọi nhóm cài đặt: giá trị hiện hành, phiên bản, ai sửa lần cuối, tôi có sửa được không.
// Ai đăng nhập cũng xem được (để biết quy tắc đang chạy); sửa theo phân quyền từng nhóm.
import { layQ } from "@/lib/db";
import { batBuocDangNhap, xuLy } from "@/lib/phien";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { MAC_DINH, NHOM_CAU_HINH } from "@/lib/cau-hinh/mac-dinh";
import { duocSuaNhom, suaDuocMoiNhom } from "@/lib/cau-hinh/quyen";

export const dynamic = "force-dynamic";

export async function GET() {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const q = await layQ();
    const { rows } = await q.query<{ khoa: string; phien_ban: number; sua_boi: string | null; sua_boi_ten: string | null; sua_luc: string }>(
      `SELECT c.khoa, c.phien_ban, c.sua_boi, n.ten AS sua_boi_ten, to_char(c.sua_luc AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS sua_luc
       FROM docflow.cau_hinh c LEFT JOIN identity.nguoi_dung n ON n.id = c.sua_boi`,
    );
    const pq = await layCauHinh(q, "phan_quyen_cau_hinh");
    const nhom = [];
    for (const n of NHOM_CAU_HINH) {
      const r = rows.find((x) => x.khoa === n.khoa);
      nhom.push({
        ...n,
        gia_tri: await layCauHinh(q, n.khoa),
        mac_dinh: MAC_DINH[n.khoa],
        phien_ban: r?.phien_ban ?? 0,
        sua_boi: r?.sua_boi_ten ?? r?.sua_boi ?? null,
        sua_luc: r?.sua_luc ?? null,
        sua_duoc: duocSuaNhom(nd, n.khoa, pq),
      });
    }
    return { nhom, sua_moi_nhom: suaDuocMoiNhom(nd) };
  });
}
