// /api/cong-viec/quyet-dinh — Form 0: "Nội dung cần TGĐ quyết định"
//   GET  ?tai_lieu_id=&phien_ban= — các dòng quyết định + đã giao chưa + gợi ý việc đang mở trùng
//   POST { tai_lieu_id, phien_ban, dong_so, ten, du_an?, hang_muc?, ket_qua_can_co?, bat_dau?, ket_thuc?, phan_viec[], cong_viec_id? }
//        → giaoViec với la_quyet_dinh (cấp 1, đè mọi bản khác). Trả { ma_viec }.
import { layQ, tx } from "@/lib/db";
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { coQuyen } from "@sci/identity";
import { giaoViec, type DauVaoGiaoViec } from "@/lib/so-cai/dich-vu";
import { dongQuyetDinh } from "@/lib/so-cai/doc-them";

export const dynamic = "force-dynamic";

type ThanGiao = Omit<DauVaoGiaoViec, "tu_tai_lieu" | "la_quyet_dinh"> & { tai_lieu_id: string; phien_ban: number; dong_so: number };

export async function GET(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const u = new URL(req.url).searchParams;
    const tl = u.get("tai_lieu_id");
    const pb = Number(u.get("phien_ban"));
    if (!tl || !pb) throw new LoiHttp(400, "Thiếu tài liệu hoặc phiên bản");
    const kq = await dongQuyetDinh(await layQ(), tl, pb);
    if (!kq) throw new LoiHttp(404, "Không tìm thấy phiên bản tài liệu");
    const coTheGiao = nd.la_quan_tri || nd.quyen["cong_viec.giao"] === "toan_bo" || (nd.cap <= 1 && coQuyen(nd, "cong_viec.giao"));
    return { ...kq, co_the_giao: coTheGiao };
  });
}

export async function POST(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const b = (await req.json().catch(() => null)) as ThanGiao | null;
    if (!b?.tai_lieu_id || !b.phien_ban) throw new LoiHttp(400, "Thiếu tài liệu hoặc phiên bản");
    const kq = await dongQuyetDinh(await layQ(), b.tai_lieu_id, b.phien_ban);
    if (!kq) throw new LoiHttp(404, "Không tìm thấy phiên bản tài liệu");
    if (!kq.dong.some((d) => d.dong.dong_so === b.dong_so)) throw new LoiHttp(400, `Tài liệu không có dòng quyết định số ${b.dong_so}`);
    const { tai_lieu_id, phien_ban, dong_so, ...v } = b;
    const ma = await tx((q) => giaoViec(q, nd, { ...v, la_quyet_dinh: true, tu_tai_lieu: { tai_lieu_id, phien_ban, dong_so, nhan: kq.nhan } }));
    return { ma_viec: ma };
  });
}
