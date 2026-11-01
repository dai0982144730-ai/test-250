// /api/so-cai/ap-dung-lai — áp dụng lại quy tắc đè cho việc đang mở. Quyền: quản trị hoặc cau_hinh.sua.
// GET  = xem trước (không ghi). Tùy chọn xem theo giá trị định lưu: ?thu_tu=&ngay_sau_tinh_theo=&da_xong_luon_ghi_nhan=
// POST = chạy tay theo cấu hình hiện hành. Body { ly_do?: string }. Trả { so_viec, viec }.
import { layQ, tx } from "@/lib/db";
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { suaDuocMoiNhom } from "@/lib/cau-hinh/quyen";
import { apDungLaiQuyTac, xemTruocApDungLai, type QuyTacDe } from "@/lib/so-cai/ap-dung-lai";
import type { NguoiDungPhien } from "@/lib/types";

export const dynamic = "force-dynamic";

const THU_TU: QuyTacDe["thu_tu"][] = ["cap_truoc", "ngay_truoc", "chi_cap", "chi_ngay"];

function batBuocQuyen(nd: NguoiDungPhien) {
  if (!suaDuocMoiNhom(nd)) throw new LoiHttp(403, "Chỉ quản trị viên hoặc người có quyền sửa cài đặt mới áp dụng lại quy tắc đè");
}

function boolTs(v: string | null): boolean | undefined {
  if (v === null) return undefined;
  if (v === "1" || v === "true") return true;
  if (v === "0" || v === "false") return false;
  throw new LoiHttp(400, `Giá trị "${v}" không hợp lệ (dùng true/false)`);
}

export async function GET(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    batBuocQuyen(nd);
    const u = new URL(req.url).searchParams;
    const du: Partial<QuyTacDe> = {};
    const tt = u.get("thu_tu");
    if (tt !== null) {
      if (!THU_TU.includes(tt as QuyTacDe["thu_tu"])) throw new LoiHttp(400, `Thứ tự "${tt}" không hợp lệ`);
      du.thu_tu = tt as QuyTacDe["thu_tu"];
    }
    const ns = u.get("ngay_sau_tinh_theo");
    if (ns !== null) {
      if (ns !== "ky_bao_cao" && ns !== "ngay_gui") throw new LoiHttp(400, `"Ngày sau" tính theo "${ns}" không hợp lệ`);
      du.ngay_sau_tinh_theo = ns;
    }
    const dx = boolTs(u.get("da_xong_luon_ghi_nhan"));
    if (dx !== undefined) du.da_xong_luon_ghi_nhan = dx;
    return xemTruocApDungLai(await layQ(), du);
  });
}

export async function POST(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    batBuocQuyen(nd);
    const body = (await req.json().catch(() => ({}))) as { ly_do?: unknown };
    const lyDo = typeof body?.ly_do === "string" && body.ly_do.trim() ? body.ly_do.trim() : `chạy tay bởi ${nd.ten}`;
    return tx((q) => apDungLaiQuyTac(q, nd, lyDo));
  });
}
