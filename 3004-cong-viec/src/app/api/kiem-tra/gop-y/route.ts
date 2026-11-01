// /api/kiem-tra/gop-y — AI GÓP Ý NỘI DUNG (không chặn gửi), chạy nền sau khi tải lên.
// GET ?tai_lieu_id=&phien_ban=[&thu_lai=1] → { trang_thai: "dang_gop_y" | "xong" | "loi" | "tat", gop_y: [...], loi?, ly_do? }
//   Lần hỏi đầu khởi động góp ý; màn Soạn và gửi hỏi lại tới khi xong. Cùng file (sha256) đã góp ý → dùng lại.
import { layQ } from "@/lib/db";
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { layTaiLieu } from "@/lib/gui/chung";
import { duocXemNoiDung } from "@/lib/thu-muc/truy-van";
import { layGopY } from "@/lib/kiem-tra/gop-y-luu";
import { docPhienBanDu } from "@/lib/thu-muc/dich-vu";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const u = new URL(req.url).searchParams;
    const id = u.get("tai_lieu_id");
    if (!id) throw new LoiHttp(400, "Thiếu tai_lieu_id");
    const pbV = u.get("phien_ban");
    const phienBan = pbV ? Number(pbV) : null;
    if (pbV && (!Number.isInteger(phienBan) || (phienBan as number) < 1)) throw new LoiHttp(400, "phien_ban không hợp lệ");
    const q = await layQ();
    await layTaiLieu(q, id);
    if (!(await duocXemNoiDung(q, nd, id))) throw new LoiHttp(403, "Không có quyền xem nội dung tài liệu này");
    // Góp ý AI có thể trích chữ chương mật (bản góp ý trước 07/10 đọc toàn văn) → người chỉ được xem bản cắt thì chặn
    await docPhienBanDu(q, id, phienBan ?? undefined, nd);
    return layGopY(q, id, phienBan, { thu_lai: u.get("thu_lai") === "1" });
  });
}
