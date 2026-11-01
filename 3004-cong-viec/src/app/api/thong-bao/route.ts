// GET /api/thong-bao?gioi_han=50&truoc_id=&mo=1  — thông báo CHƯA ĐỌC của tôi + số chưa đọc + số đã đọc còn xem lại được.
//   xem=da_doc: tin đã đọc trong 7 ngày (dòng "Xem tin đã đọc (N)" — Mr. Đại chốt 10/10/2026, db/87: đọc rồi thì rời chuông).
//   mo=1 (bấm mở chuông): trả moc_cu = mốc lần mở trước (tin chưa đọc có id > moc_cu hiện dấu ! đỏ) rồi dời mốc;
//   kèm tat_tin_xong_nhan_vien + hien_nut_tat (nút "Không nhận thông báo xong việc của Nhân viên", chốt K4 02/10).
// POST /api/thong-bao { ids: number[] } hoặc { tat_ca: true } — đánh dấu đã đọc.
// PUT  /api/thong-bao { tat_tin_xong_nhan_vien: boolean } — bật/tắt nút trên (nhớ theo tài khoản).
import type { NextRequest } from "next/server";
import { layQ, tx, type Q } from "@/lib/db";
import { LoiHttp, batBuocDangNhap, xuLy } from "@/lib/phien";
import { danhDauDaDoc, danhSachThongBao, demChuaDoc, demDaDocGanDay, moChuong } from "@/lib/thong-bao";

export const dynamic = "force-dynamic";

/**
 * Trạng thái nút tắt tin xong việc: đang bật không · có hiện nút không. Mr. Đại 02/10: nhân viên KHÔNG thấy nút; hiện chỉ cho
 * Ban lãnh đạo (vai trò lanh-dao). Trưởng bộ phận: ⏸ đang bàn. Người đã bật thì luôn thấy để còn tắt được.
 */
async function nutTatTin(q: Q, nd: { id: string; vai_tro: string[] }) {
  const bat = !!(await q.query<{ v: boolean }>("SELECT tat_tin_xong_nhan_vien AS v FROM docflow.tuy_chon_giao_dien WHERE nguoi_dung_id = $1", [nd.id])).rows[0]?.v;
  return { tat_tin_xong_nhan_vien: bat, hien_nut_tat: bat || nd.vai_tro.includes("lanh-dao") };
}

export async function GET(req: NextRequest) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const q = await layQ();
    const sp = req.nextUrl.searchParams;
    const mo = sp.get("mo") === "1";
    const mocCu = mo ? await moChuong(q, nd) : undefined;
    const xemDaDoc = sp.get("xem") === "da_doc";
    const ds = await danhSachThongBao(q, nd, {
      chua_doc: !xemDaDoc,
      da_doc_gan_day: xemDaDoc,
      gioi_han: Number(sp.get("gioi_han")) || 50,
      truoc_id: Number(sp.get("truoc_id")) || undefined,
    });
    return { thong_bao: ds, chua_doc: await demChuaDoc(q, nd), da_doc_gan_day: await demDaDocGanDay(q, nd), ...(mocCu !== undefined ? { moc_cu: mocCu } : {}), ...(mo ? await nutTatTin(q, nd) : {}) };
  });
}

export async function POST(req: NextRequest) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const body = (await req.json().catch(() => null)) as { ids?: number[]; tat_ca?: boolean } | null;
    if (!body || (!body.tat_ca && !Array.isArray(body.ids))) throw new LoiHttp(400, "Thiếu danh sách thông báo cần đánh dấu");
    const q = await layQ();
    const so = await danhDauDaDoc(q, nd, body.tat_ca ? "tat_ca" : body.ids!);
    return { ok: true, da_danh_dau: so, chua_doc: await demChuaDoc(q, nd) };
  });
}

export async function PUT(req: NextRequest) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const body = (await req.json().catch(() => null)) as { tat_tin_xong_nhan_vien?: unknown } | null;
    if (typeof body?.tat_tin_xong_nhan_vien !== "boolean") throw new LoiHttp(400, "Thiếu lựa chọn bật / tắt");
    const bat = body.tat_tin_xong_nhan_vien;
    await tx((q) =>
      q.query(
        `INSERT INTO docflow.tuy_chon_giao_dien (nguoi_dung_id, giao_dien, tat_tin_xong_nhan_vien) VALUES ($1, 'can_phong', $2)
         ON CONFLICT (nguoi_dung_id) DO UPDATE SET tat_tin_xong_nhan_vien = EXCLUDED.tat_tin_xong_nhan_vien, cap_nhat_luc = now()`,
        [nd.id, bat],
      ),
    );
    return { tat_tin_xong_nhan_vien: bat };
  });
}
