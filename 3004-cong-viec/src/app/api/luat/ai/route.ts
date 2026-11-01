// /api/luat/ai — KẾT QUẢ LUẬT AI của một phiên bản tài liệu (chạy nền, gộp với góp ý AI trong một lượt).
// GET ?tai_lieu_id=&phien_ban=[&thu_lai=1] → { trang_thai: "khong_co" | "dang_kiem" | "xong" | "loi",
//   ket_qua: [{ luat_id, ten, muc, khi_ai_loi, dat: true|false|null, thong_diep, vi_tri? }], loi?, model? }
//   Lần hỏi đầu khởi động kiểm; hỏi lại tới khi hết "dang_kiem". Thiếu phien_ban = bản hiện tại.
import { layQ } from "@/lib/db";
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { layTaiLieu } from "@/lib/gui/chung";
import { duocXemNoiDung } from "@/lib/thu-muc/truy-van";
import { ketQuaKiemAi } from "@/lib/luat/kiem-ai";
import { docPhienBanDu } from "@/lib/thu-muc/dich-vu";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const u = new URL(req.url).searchParams;
    const id = u.get("tai_lieu_id");
    if (!id) throw new LoiHttp(400, "Thiếu tai_lieu_id");
    const pbV = u.get("phien_ban");
    const pbSo = pbV ? Number(pbV) : null;
    if (pbV && (!Number.isInteger(pbSo) || (pbSo as number) < 1)) throw new LoiHttp(400, "phien_ban không hợp lệ");
    const q = await layQ();
    const tl = await layTaiLieu(q, id);
    if (!(await duocXemNoiDung(q, nd, id))) throw new LoiHttp(403, "Không có quyền xem nội dung tài liệu này");
    const phienBan = pbSo ?? Number((tl as unknown as { phien_ban_hien_tai?: number }).phien_ban_hien_tai ?? 0);
    if (!phienBan) throw new LoiHttp(404, "Tài liệu chưa có phiên bản nào");
    // Kết quả luật AI có thể trích chữ chương mật → người chỉ được xem bản cắt thì chặn
    await docPhienBanDu(q, id, phienBan, nd);
    return ketQuaKiemAi(q, id, phienBan, { thu_lai: u.get("thu_lai") === "1" });
  });
}
