// /api/so-cai/ra-soat — KIỂM SOÁT SỔ CÁI: mọi báo cáo đã gửi đã vào sổ cái đủ việc chưa, thiếu thì vì sao.
// Quyền: quản trị hoặc cau_hinh.sua.
// GET ?moi_nhat=1 = kết quả lần rà soát gần nhất (tự động hằng ngày / bấm tay) — không đọc lại báo cáo; null nếu chưa chạy.
// GET              = rà soát ngay, lưu kết quả; thấy thiếu mà bật so_cai.tu_bo_sung_thieu thì tự bổ sung luôn.
// POST             = bổ sung các dòng thiếu vào sổ cái (theo ngày gửi gốc, quy tắc đè hiện hành), lưu kết quả.
import { layQ, tx } from "@/lib/db";
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { suaDuocMoiNhom } from "@/lib/cau-hinh/quyen";
import { luuRaSoat, raSoatMoiNhat, raSoatSoCai } from "@/lib/so-cai/ra-soat";
import type { NguoiDungPhien } from "@/lib/types";
import { layCauHinh } from "@/lib/cau-hinh/doc";

export const dynamic = "force-dynamic";

function batBuocQuyen(nd: NguoiDungPhien) {
  if (!suaDuocMoiNhom(nd)) throw new LoiHttp(403, "Chỉ quản trị viên hoặc người có quyền sửa cài đặt mới rà soát sổ cái");
}

export async function GET(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    batBuocQuyen(nd);
    if (new URL(req.url).searchParams.get("moi_nhat")) return { ket_qua: await raSoatMoiNhat(await layQ()) };
    return tx(async (q) => {
      const kq = await raSoatSoCai(q);
      if (kq.so_thieu > 0 && (await layCauHinh(q, "so_cai")).tu_bo_sung_thieu !== false) {
        return luuRaSoat(q, await raSoatSoCai(q, { ghi: true }), "bo_sung", nd.id);
      }
      return luuRaSoat(q, kq, "bam_tay", nd.id);
    });
  });
}

export async function POST() {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    batBuocQuyen(nd);
    return tx(async (q) => luuRaSoat(q, await raSoatSoCai(q, { ghi: true }), "bo_sung", nd.id));
  });
}
