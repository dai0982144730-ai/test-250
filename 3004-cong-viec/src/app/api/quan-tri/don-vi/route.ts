// GET /api/quan-tri/don-vi — cây đơn vị (cả đơn vị đã ngừng) + số người mỗi đơn vị.
// POST — thêm đơn vị { id?, ten, ten_ngan, cap, cha_id, loai, mau_ma, thu_tu }.
import type { NextRequest } from "next/server";
import { tx } from "@/lib/db";
import { thuocTinhThemDonVi, dongBoChucDanh } from "@/lib/to-chuc";
import { LoiHttp } from "@/lib/phien";
import { themDonVi, duocQuanLyNguoi, laQuanTriToanBo, LOAI_DON_VI, type DauVaoDonVi } from "@sci/identity/server";
import { xuLyIdentity } from "@/lib/cau-hinh/cau-noi-identity";
import { batBuocQuanTri, kiemQuanLyDonVi, kiemToanBo } from "../_chung";

export const dynamic = "force-dynamic";

export async function GET() {
  return xuLyIdentity(async () => {
    const p = await batBuocQuanTri();
    const { rows } = await p.q.query<{ don_vi_id: string; n: number }>(
      "SELECT don_vi_id, count(*)::int AS n FROM identity.nguoi_dung WHERE active AND don_vi_id IS NOT NULL GROUP BY don_vi_id",
    );
    const chuaGan = await p.q.query<{ n: number }>("SELECT count(*)::int AS n FROM identity.nguoi_dung WHERE active AND don_vi_id IS NULL");
    const mau = await p.q.query<{ ma: string; ten: string }>("SELECT ma, ten FROM docflow.mau_word WHERE active ORDER BY ma");
    const cd = await thuocTinhThemDonVi(p.q);
    return {
      don_vi: p.cay.map((d) => ({
        ...d,
        so_nguoi: rows.find((r) => r.don_vi_id === d.id)?.n ?? 0,
        chuc_danh: cd[d.id]?.chuc_danh ?? null,
        chuc_danh_ngan: cd[d.id]?.chuc_danh_ngan ?? null,
        uy_quyen_truong: cd[d.id]?.uy_quyen_truong ?? null,
        chuc_nang: cd[d.id]?.chuc_nang ?? null,
        ngoai_sci: cd[d.id]?.ngoai_sci ?? false,
        sua_duoc: duocQuanLyNguoi(p.nd, { don_vi_id: d.id }, p.cay),
      })),
      chua_gan: chuaGan.rows[0].n,
      loai: LOAI_DON_VI,
      mau: mau.rows,
      them_goc_duoc: duocQuanLyNguoi(p.nd, { don_vi_id: null }, p.cay),
    };
  });
}

export async function POST(req: NextRequest) {
  return xuLyIdentity(async () => {
    const p = await batBuocQuanTri();
    const v = (await req.json().catch(() => null)) as DauVaoDonVi | null;
    if (!v) throw new LoiHttp(400, "Thiếu dữ liệu đơn vị");
    if (!v.cha_id) kiemToanBo(p, "thêm đơn vị gốc");
    else {
      kiemQuanLyDonVi(p, v.cha_id, "thêm đơn vị con ở đây");
      // Cấp ảnh hưởng quy tắc đè toàn công ty: người quản lý một phần không tạo được đơn vị con cấp cao hơn đơn vị cha
      const cha = p.cay.find((d) => d.id === v.cha_id);
      if (cha && v.cap !== undefined && Number(v.cap) < cha.cap && !laQuanTriToanBo(p.nd))
        throw new LoiHttp(403, `Đơn vị con không được có cấp cao hơn đơn vị cha (${cha.ten_ngan} cấp ${cha.cap}) — chỉ người quản lý toàn bộ mới đặt được`);
    }
    const { chuc_danh, chuc_danh_ngan, ...dv } = v as DauVaoDonVi & { chuc_danh?: string; chuc_danh_ngan?: string };
    return {
      don_vi: await tx(async (q) => {
        const d = await themDonVi(q, p.ng, dv);
        if (d.loai === "chuc_danh") {
          await q.query("UPDATE identity.don_vi SET chuc_danh = $2, chuc_danh_ngan = $3 WHERE id = $1", [d.id, chuc_danh?.trim() || d.ten, chuc_danh_ngan?.trim() || d.ten_ngan]);
          await dongBoChucDanh(q);
        }
        return d;
      }),
    };
  });
}
