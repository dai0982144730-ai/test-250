// GET /api/kiem-tra/danh-dau?tai_lieu_id=&phien_ban= — tải BẢN ĐÁNH DẤU LỖI (Word hoặc Excel — đợt 2, 22/10/2026) của một phiên bản đã tải lên:
// ô sai tô đỏ (chặn gửi) / vàng (cảnh báo) + ghi chú Word nói cần sửa gì. Dùng đúng kết quả kiểm tra đã lưu của phiên bản.
// File Word gốc (chưa có ô nhập) thì đánh dấu lên bản đã tự gắn ô nhập — sửa trên bản đó rồi tải lên lại.
import { layQ } from "@/lib/db";
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { docPhienBanDu } from "@/lib/thu-muc/dich-vu";
import { duocXemNoiDung } from "@/lib/thu-muc/truy-van";
import { docWord } from "@/lib/kiem-tra/doc-word";
import { thuNhanMauGoc } from "@/lib/kiem-tra/nhan-mau-goc";
import { danhDauLoi } from "@/lib/kiem-tra/danh-dau-loi";
import { danhDauLoiExcel } from "@/lib/mau-excel/danh-dau-excel";
import { kiemTraDayDu, layMau } from "@/lib/kiem-tra/kiem-tra";
import { layTaiLieu } from "@/lib/gui/chung";

export const dynamic = "force-dynamic";

function tenAscii(ten: string): string {
  return ten.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
}

export async function GET(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const u = new URL(req.url).searchParams;
    const id = u.get("tai_lieu_id") ?? "";
    const pb = u.get("phien_ban") ? Number(u.get("phien_ban")) : undefined;
    if (!id) throw new LoiHttp(400, "Thiếu tài liệu");
    const q = await layQ();
    if (!(await duocXemNoiDung(q, nd, id))) throw new LoiHttp(403, "Bạn không có quyền mở nội dung tài liệu này");
    const { thong_tin, noi_dung } = await docPhienBanDu(q, id, pb, nd);
    const laExcel = /\.xlsx$/i.test(thong_tin.ten_tep);
    if (!laExcel && !/\.docx$/i.test(thong_tin.ten_tep)) throw new LoiHttp(400, "Chỉ đánh dấu được tệp Excel .xlsx hoặc Word .docx");
    if (laExcel) {
      const loiX = (thong_tin.ket_qua_kiem_tra?.loi ?? []) as Parameters<typeof danhDauLoiExcel>[1];
      if (!loiX.some((l) => l.muc === "chan" || l.muc === "canh_bao")) throw new LoiHttp(404, "Bản này không có lỗi hay cảnh báo cần đánh dấu");
      const mauX = thong_tin.ket_qua_kiem_tra?.mau_ma ? await layMau(q, thong_tin.ket_qua_kiem_tra.mau_ma) : null;
      let bufX: Buffer;
      try {
        bufX = (await danhDauLoiExcel(noi_dung, loiX, mauX)).buf;
      } catch (e) {
        throw new LoiHttp(400, `Không đánh dấu được tệp Excel: ${e instanceof Error ? e.message : String(e)}`);
      }
      const tenX = thong_tin.ten_tep.replace(/\.xlsx$/i, "") + " - đánh dấu lỗi.xlsx";
      return new Response(new Uint8Array(bufX), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${tenAscii(tenX)}"; filename*=UTF-8''${encodeURIComponent(tenX)}`,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    const goc = await thuNhanMauGoc(noi_dung, thong_tin.ten_tep, await docWord(noi_dung));
    let kq = thong_tin.ket_qua_kiem_tra;
    // Bản tải lên trước khi hệ thống nhận được file Word gốc: kết quả lưu còn "không nhận ra mẫu" → kiểm tra lại
    if (goc && !kq?.mau_ma) {
      const tl = await layTaiLieu(q, id);
      kq = await kiemTraDayDu(q, nd, noi_dung, thong_tin.ten_tep, { don_vi_lap: tl.don_vi_lap, nguoi_gui_that: tl.nguoi_gui_that, bo_qua_so_cai: true, ngay_nop: thong_tin.tai_len_luc });
    }
    const loi = kq?.loi ?? [];
    if (!loi.some((l) => l.muc === "chan" || l.muc === "canh_bao")) throw new LoiHttp(404, "Bản này không có lỗi hay cảnh báo cần đánh dấu");
    const mau = kq?.mau_ma ? await layMau(q, kq.mau_ma) : null;
    const { buf } = await danhDauLoi(goc?.buf ?? noi_dung, loi, mau);
    const ten = thong_tin.ten_tep.replace(/\.docx$/i, "") + " - đánh dấu lỗi.docx"; // tên tiếng Việt (soát 29/09)
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${tenAscii(ten)}"; filename*=UTF-8''${encodeURIComponent(ten)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });
}
