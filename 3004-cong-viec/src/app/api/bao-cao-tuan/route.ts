// GET /api/bao-cao-tuan?tuan=yyyy-mm-dd — bản báo cáo tuần đã lưu (mặc định: bản mới nhất) + danh sách tuần + thao tác đã bấm.
// Mọi người xem được (chốt 30/09). Độ khó từng việc CHỈ Ban lãnh đạo thấy: người khác nhận bản đã gỡ điểm từng việc.
import { layQ } from "@/lib/db";
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { coQuyen } from "@sci/identity";
import { cacBan, docBan } from "@/lib/bao-cao-tuan/viet";
import { docDoKho, laBanLanhDao } from "@/lib/bao-cao-tuan/do-kho";
import { tuanCua } from "@/lib/phong/tuan";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    if (!coQuyen(nd, "so_cai.xem")) throw new LoiHttp(403, "Bạn không có quyền xem sổ cái");
    const q = await layQ();
    const u = new URL(req.url).searchParams.get("tuan") ?? "";
    if (u && !/^\d{4}-\d{2}-\d{2}$/.test(u)) throw new LoiHttp(400, "Tuần không hợp lệ");
    const ds = await cacBan(q);
    const id = u ? tuanCua(u).tu : (ds.find((b) => b.trang_thai === "xong")?.id ?? ds[0]?.id ?? "");
    const ban = id ? await docBan(q, id) : null;
    const bld = await laBanLanhDao(q, nd);
    if (ban?.so_lieu && !bld) {
      // Gỡ điểm độ khó từng việc (biểu đồ độ khó chỉ Ban lãnh đạo xem — chốt 30/09)
      for (const v of Object.values(ban.so_lieu.viec)) (v as { diem?: number }).diem = 0;
      ban.so_lieu.nong = ban.so_lieu.nong.map((n) => ({ ...n, diem: 0, no: 0 }));
    }
    const { rows: thaoTac } = id
      ? await q.query<{ cong_viec_id: string; loai: string; ket_qua: string | null; luc: string }>(
          "SELECT cong_viec_id, loai, ket_qua, luc::text AS luc FROM docflow.bao_cao_tuan_thao_tac WHERE bao_cao_id = $1",
          [id],
        )
      : { rows: [] };
    const doKho = bld ? await docDoKho(q) : {};
    return { ban, cac_ban: ds, la_bld: bld, co_the_viet_lai: bld || !!nd.la_quan_tri, thao_tac: thaoTac, do_kho: doKho };
  });
}
