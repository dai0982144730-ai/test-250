// /api/tai-lieu/[id]/tep?phien_ban=&inline=1&ban=pdf — nội dung file của một phiên bản.
// Mặc định tải về (ghi lịch sử 'tai_ve'). inline=1 chỉ cho PDF/ảnh (khung xem trước — lượt xem đã ghi ở /xem-truoc).
// ban=pdf: bản PDF LibreOffice đã đổi sẵn khi xem trước.
import fs from "node:fs";
import { layQ, tx } from "@/lib/db";
import { batBuocDangNhap, thietBi, xuLy, LoiHttp } from "@/lib/phien";
import { docPhienBan } from "@/lib/thu-muc/dich-vu";
import { duocXemNoiDung, ghiXemTaiVe } from "@/lib/thu-muc/truy-van";
import { duongDanBanPdf, hienTrucTiepDuoc } from "@/lib/thu-muc/xem-truoc";

export const dynamic = "force-dynamic";

function tenAscii(ten: string): string {
  return ten.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const u = new URL(req.url).searchParams;
    const pbSo = u.get("phien_ban") ? Number(u.get("phien_ban")) : undefined;
    if (pbSo !== undefined && (!Number.isInteger(pbSo) || pbSo < 1)) throw new LoiHttp(400, "Phiên bản không hợp lệ");
    const q = await layQ();
    if (!(await duocXemNoiDung(q, nd, params.id))) throw new LoiHttp(403, "Bạn không có quyền mở nội dung tài liệu của đơn vị này");
    // Báo cáo mẫu mật: người không được xem đủ tải về BẢN ĐÃ CẮT (Q3 — cắt hỏng thì 403, không rơi về tệp gốc)
    const { thong_tin, noi_dung } = await docPhienBan(q, params.id, pbSo, nd);
    const inline = u.get("inline") === "1";
    const chung = {
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=0, must-revalidate",
      "X-Sha256": thong_tin.sha256,
    };
    if (u.get("ban") === "pdf") {
      const p = duongDanBanPdf(thong_tin.sha256);
      if (!fs.existsSync(p)) throw new LoiHttp(404, "Chưa có bản PDF xem trước");
      return new Response(new Uint8Array(fs.readFileSync(p)), {
        headers: { ...chung, "Content-Type": "application/pdf", "Content-Disposition": "inline", "Content-Security-Policy": "sandbox" },
      });
    }
    const ten = thong_tin.da_cat ? thong_tin.ten_tep.replace(/(\.docx|\.docm|\.xlsx)$/i, " - bản rút gọn$1") : thong_tin.ten_tep;
    const tenTai = `filename="${tenAscii(ten)}"; filename*=UTF-8''${encodeURIComponent(ten)}`;
    if (inline && hienTrucTiepDuoc(ten, thong_tin.mime)) {
      const mime = ten.toLowerCase().endsWith(".pdf") ? "application/pdf" : thong_tin.mime;
      return new Response(new Uint8Array(noi_dung), {
        headers: { ...chung, "Content-Type": mime, "Content-Disposition": `inline; ${tenTai}`, "Content-Security-Policy": "sandbox" },
      });
    }
    const tb = thietBi();
    await tx((t) => ghiXemTaiVe(t, nd, { tai_lieu_id: params.id, phien_ban: thong_tin.phien_ban, hanh_dong: "tai_ve", thiet_bi: tb, ten_tep: ten }));
    return new Response(new Uint8Array(noi_dung), {
      headers: {
        ...chung,
        "Content-Type": "application/octet-stream",
        "Content-Length": String(noi_dung.length),
        "Content-Disposition": `attachment; ${tenTai}`,
      },
    });
  });
}
