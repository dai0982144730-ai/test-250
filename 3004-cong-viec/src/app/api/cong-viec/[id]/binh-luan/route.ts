// /api/cong-viec/[id]/binh-luan
//   GET  — bình luận của việc + ai SẼ được báo nếu tôi viết (trước khi gõ @) + danh sách người để gợi ý @
//   POST { noi_dung, nhac: id[] } — viết bình luận; báo chuông người làm + người giao + người đã bình luận + người được @
// Ai xem được sổ cái (so_cai.xem) đều xem và viết được.
import { layQ, tx } from "@/lib/db";
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { coQuyen } from "@sci/identity";
import { coTheBinhLuan, danhSachBinhLuan, danhSachNguoiGoiY, nguoiNhanCoBan, nguoiTagDuoc, vietBinhLuan } from "@/lib/phong/binh-luan";
import { dinhKemCuaViec } from "@/lib/dinh-kem/kho";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { docChuongCuaViec } from "@/lib/thong-bao";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    if (!coQuyen(nd, "so_cai.xem")) throw new LoiHttp(403, "Bạn không có quyền xem việc này");
    const id = decodeURIComponent(params.id);
    const q = await layQ();
    // 3c (Mr. Đại duyệt 08/10): thẻ việc mở ra (?da_xem=1) → chuông về việc này của CHÍNH người mở thành đã đọc
    if (new URL(req.url).searchParams.get("da_xem") === "1") await tx((t) => docChuongCuaViec(t, nd.id, id));
    const ten = Object.fromEntries((await danhSachNguoiGoiY(q)).map((n) => [n.id, n.ten]));
    // Gõ "@" = người liên quan việc; gõ "@@" = mở rộng theo quyền "Tag tên" (Mr. Đại chốt 29/09)
    const nguoi = await nguoiTagDuoc(q, nd, id);
    const nguoiRong = await nguoiTagDuoc(q, nd, id, true);
    const seBao = [...(await nguoiNhanCoBan(q, id, nd.id))].map(([nid, ly]) => ({ id: nid, ten: ten[nid] ?? nid, ly }));
    // File kẹp khi giao việc / báo xong (file ở bình luận nằm trong từng bình luận) + bật tắt kẹp file theo Cài đặt
    const dinhKem = (await dinhKemCuaViec(q, id)).filter((t) => t.noi !== "binh_luan");
    const ch = await layCauHinh(q, "dinh_kem");
    return {
      binh_luan: await danhSachBinhLuan(q, id),
      se_bao: seBao,
      nguoi,
      nguoi_rong: nguoiRong,
      // Không được bình luận → giao diện ẩn ô viết + 📎, chỉ đọc (quyền "Giao việc" + người liên quan)
      co_the_binh_luan: await coTheBinhLuan(q, nd, id),
      toi: nd.id,
      dinh_kem: dinhKem,
      cai_dat_dinh_kem: ch,
    };
  });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    if (!coQuyen(nd, "so_cai.xem")) throw new LoiHttp(403, "Bạn không có quyền xem việc này");
    const b = (await req.json().catch(() => null)) as { noi_dung?: string; nhac?: string[]; dinh_kem?: string[] } | null;
    if (!b) throw new LoiHttp(400, "Thiếu nội dung");
    return tx((q) => vietBinhLuan(q, nd, decodeURIComponent(params.id), b));
  });
}
