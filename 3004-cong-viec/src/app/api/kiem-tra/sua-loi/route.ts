// /api/kiem-tra/sua-loi — BƯỚC "SỬA LỖI" KHI NỘP BÁO CÁO (Mr. Đại chốt 28/09/2026, Đợt A).
// GET ?tai_lieu_id= → mọi lỗi chặn / cảnh báo của bản hiện tại + 🤖 giải thích vì sao + đề xuất "Cũ → Mới" (lib/kiem-tra/sua-loi-ai.ts).
// POST { tai_lieu_id, sua: [{ vi_tri, moi }], buoc3? } → máy ghi chữ mới vào đúng ô của file (sua-vao-file.ts) → lưu thành
//   PHIÊN BẢN MỚI (bản cũ giữ trong lịch sử) → kiểm tra lại từ đầu. Trả cùng dạng POST /api/kiem-tra.
//   buoc3 = { gop_y: [thông điệp], luat: [mã luật] } — ghi các đề xuất ĐÃ DUYỆT ở bước 3 (Soát nội dung): kết quả soát của bản cũ
//   chép sang bản mới (dòng đã ghi đánh dấu da_sua), AI không soát lại bản này (chốt 29/09).
import { layQ, tx } from "@/lib/db";
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { layTaiLieu } from "@/lib/gui/chung";
import { taiLenVaKiemTra, boNoiDung } from "@/lib/gui/tai-len";
import { duocXemNoiDung } from "@/lib/thu-muc/truy-van";
import { docPhienBanDu } from "@/lib/thu-muc/dich-vu";
import { kiemTraDayDu } from "@/lib/kiem-tra/kiem-tra";
import { napDanhBa } from "@/lib/kiem-tra/phan-giai";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { CHO_HAN, suaLoiBangAi } from "@/lib/kiem-tra/sua-loi-ai";
import { ghiSuaVaoFile, type SuaMotCho } from "@/lib/kiem-tra/sua-vao-file";
import { ghiSuaVaoExcel } from "@/lib/mau-excel/sua-vao-excel";
import { docBaoCao } from "@/lib/kiem-tra/doc-bao-cao";
import { ketThuaSoat, type DaSuaBuoc3 } from "@/lib/kiem-tra/ket-thua-soat";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

export async function GET(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const id = new URL(req.url).searchParams.get("tai_lieu_id");
    if (!id) throw new LoiHttp(400, "Thiếu tai_lieu_id");
    const q = await layQ();
    const tl = await layTaiLieu(q, id);
    if (!(await duocXemNoiDung(q, nd, id))) throw new LoiHttp(403, "Không có quyền xem nội dung tài liệu này");
    const { thong_tin, noi_dung } = await docPhienBanDu(q, id, undefined, nd);
    if (!/\.(docx|docm|xlsx)$/i.test(thong_tin.ten_tep)) return { tai_lieu_id: id, phien_ban: thong_tin.phien_ban, trang_thai: "khong_ai", ly_do: "Không phải file Word", muc: [] };
    const kq = await kiemTraDayDu(q, nd, noi_dung, thong_tin.ten_tep, {
      don_vi_lap: tl.don_vi_lap,
      tai_lieu_id: id,
      phien_ban: thong_tin.phien_ban,
      nguoi_gui_that: tl.nguoi_gui_that,
      ngay_nop: thong_tin.tai_len_luc,
    });
    const sl = await suaLoiBangAi(noi_dung, kq.loi, await docBaoCao(noi_dung), kq.mau, {
      danhBa: await napDanhBa(q),
      model: (await layCauHinh(q, "ai")).model_mac_dinh || undefined,
    });
    return { tai_lieu_id: id, phien_ban: thong_tin.phien_ban, ...sl };
  });
}

export async function POST(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const v = (await req.json().catch(() => null)) as { tai_lieu_id?: string; sua?: SuaMotCho[]; buoc3?: DaSuaBuoc3 } | null;
    if (!v?.tai_lieu_id) throw new LoiHttp(400, "Thiếu tai_lieu_id");
    const sua = (v.sua ?? []).filter((s) => s && typeof s.moi === "string" && s.vi_tri);
    if (!sua.length) throw new LoiHttp(400, "Chưa có chỗ nào để sửa");
    if (sua.some((s) => s.moi.includes(CHO_HAN))) throw new LoiHttp(400, "Chưa chọn ngày hạn cho chỗ sửa có “hạn …”");
    if (sua.some((s) => !s.moi.trim())) throw new LoiHttp(400, "Chữ mới đang để trống");
    const q = await layQ();
    // Toàn văn bắt buộc: sửa trên bản đã cắt rồi lưu bản mới là mất chương mật vĩnh viễn
    const { thong_tin, noi_dung } = await docPhienBanDu(q, v.tai_lieu_id, undefined, nd);
    let moi: Buffer;
    try {
      // Báo cáo Excel (từ 22/10/2026): ghi thẳng vào ô; Word cũ: ghi vào ô gắn mã như trước
      moi = /\.xlsx$/i.test(thong_tin.ten_tep) ? await ghiSuaVaoExcel(noi_dung, sua) : await ghiSuaVaoFile(noi_dung, sua);
    } catch (e) {
      throw new LoiHttp(400, e instanceof Error ? e.message : String(e));
    }
    const kq = await tx(async (t) => {
      const r = await taiLenVaKiemTra(t, nd, { tep: { ten_tep: thong_tin.ten_tep, mime: thong_tin.mime, noi_dung: moi }, tai_lieu_id: v.tai_lieu_id });
      if (v.buoc3 && r.tai_lieu_id && r.phien_ban)
        await ketThuaSoat(t, r.tai_lieu_id, thong_tin.phien_ban, r.phien_ban, { gop_y: v.buoc3.gop_y ?? [], luat: v.buoc3.luat ?? [] });
      return r;
    });
    return { tai_lieu_id: kq.tai_lieu_id, phien_ban: kq.phien_ban, ten_tep: thong_tin.ten_tep, ket_qua: boNoiDung(kq.ket_qua), chua_gan_don_vi: null };
  });
}
