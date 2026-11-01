// /api/cong-viec/[id]
//   GET  — chi tiết việc + mọi nguồn + quyền người xem (?dang=agent → đúng dạng JSON cho agent)
//   POST — thao tác: { hanh_dong: 'ket_thuc' | 'gia_han' | 'doi_nguoi' | 'them_phan_viec' | 'bot_phan_viec' | 'dong_viec' | 'mo_lai' | 'sua_viec' | 'phan_cong', ... }
import { layQ, tx } from "@/lib/db";
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { coQuyen } from "@sci/identity";
import { botPhanViec, doiNguoi, dongViec, giaHan, ketThucPhanViec, moLaiViec, phanCong, suaViec, themPhanViec } from "@/lib/so-cai/dich-vu";
import { dongChoAgent } from "@/lib/so-cai/dinh-dang-agent";
import { chiTietCoQuyen } from "@/lib/so-cai/doc-them";
import type { PhuTrach } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    if (!coQuyen(nd, "so_cai.xem")) throw new LoiHttp(403, "Bạn không có quyền xem sổ cái");
    const id = decodeURIComponent(params.id);
    const q = await layQ();
    if (new URL(req.url).searchParams.get("dang") === "agent") {
      const a = await dongChoAgent(q, id);
      if (!a) throw new LoiHttp(404, `Không có công việc ${id}`);
      return a;
    }
    const kq = await chiTietCoQuyen(q, nd, id);
    if (!kq) throw new LoiHttp(404, `Không có công việc ${id}`);
    return kq;
  });
}

interface ThaoTac {
  hanh_dong: string;
  phan_viec_id?: string;
  ghi_chu?: string | null;
  tep_ket_qua?: { tai_lieu_id: string }[];
  dinh_kem?: string[]; // file kẹp khi báo xong (đã tải lên /api/dinh-kem)
  ket_thuc?: string | null;
  bat_dau?: string | null;
  ly_do?: string;
  // Sửa việc (cây bút ✏)
  ten?: string;
  ket_qua_can_co?: string | null;
  chu_tri?: PhuTrach | null;
  phoi_hop?: PhuTrach[];
  phu_trach?: PhuTrach;
  nguoi_id?: string; // phân công
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const id = decodeURIComponent(params.id);
    const b = (await req.json().catch(() => null)) as ThaoTac | null;
    if (!b?.hanh_dong) throw new LoiHttp(400, "Thiếu thao tác");
    return tx(async (q) => {
      switch (b.hanh_dong) {
        case "ket_thuc": {
          if (!b.phan_viec_id) throw new LoiHttp(400, "Thiếu phần việc");
          const r = await q.query<{ cong_viec_id: string }>("SELECT cong_viec_id FROM docflow.phan_viec WHERE id = $1", [b.phan_viec_id]);
          if (r.rows[0]?.cong_viec_id !== id) throw new LoiHttp(404, "Phần việc không thuộc việc này");
          return ketThucPhanViec(q, nd, b.phan_viec_id, { ghi_chu: b.ghi_chu, tep_ket_qua: b.tep_ket_qua, dinh_kem: b.dinh_kem });
        }
        case "gia_han":
          await giaHan(q, nd, { cong_viec_id: id, phan_viec_id: b.phan_viec_id || undefined, ket_thuc: b.ket_thuc ?? null, ly_do: b.ly_do });
          return { ok: true };
        case "doi_nguoi":
          if (!b.phan_viec_id || !b.phu_trach) throw new LoiHttp(400, "Thiếu phần việc hoặc người mới");
          await doiNguoi(q, nd, { phan_viec_id: b.phan_viec_id, phu_trach: b.phu_trach, ly_do: b.ly_do });
          return { ok: true };
        case "phan_cong": {
          // Trưởng đơn vị chuyển phần việc giao cho CẢ đơn vị sang một nhân viên của đơn vị (chốt 30/09)
          if (!b.phan_viec_id || !b.nguoi_id) throw new LoiHttp(400, "Thiếu phần việc hoặc nhân viên");
          await phanCong(q, nd, { phan_viec_id: b.phan_viec_id, nguoi_id: b.nguoi_id });
          return { ok: true };
        }
        case "them_phan_viec":
          if (!b.phu_trach) throw new LoiHttp(400, "Chưa chọn người phụ trách");
          return { phan_viec_id: await themPhanViec(q, nd, { cong_viec_id: id, phu_trach: b.phu_trach, bat_dau: b.bat_dau, ket_thuc: b.ket_thuc }) };
        case "bot_phan_viec":
          if (!b.phan_viec_id) throw new LoiHttp(400, "Thiếu phần việc");
          await botPhanViec(q, nd, { phan_viec_id: b.phan_viec_id, ly_do: b.ly_do ?? "" });
          return { ok: true };
        case "sua_viec":
          return suaViec(q, nd, {
            cong_viec_id: id,
            ten: b.ten ?? "",
            ket_qua_can_co: b.ket_qua_can_co,
            bat_dau: b.bat_dau,
            ket_thuc: b.ket_thuc,
            chu_tri: b.chu_tri,
            phoi_hop: b.phoi_hop,
          });
        case "dong_viec":
          await dongViec(q, nd, { cong_viec_id: id, ly_do: b.ly_do ?? "" });
          return { ok: true };
        case "mo_lai":
          await moLaiViec(q, nd, { cong_viec_id: id, ly_do: b.ly_do ?? "", ket_thuc: b.ket_thuc ?? null });
          return { ok: true };
        default:
          throw new LoiHttp(400, `Thao tác không hợp lệ: ${b.hanh_dong}`);
      }
    });
  });
}
