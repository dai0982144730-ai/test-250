// PATCH /api/quan-tri/don-vi/:id — sửa tên, cấp, đơn vị cha, loại, mẫu, thứ tự; { active: false } = ngừng hoạt động;
// { chuc_nang } = chức năng nhiệm vụ (db/81), có vết trong nhật ký.
import type { NextRequest } from "next/server";
import { tx } from "@/lib/db";
import { dongBoChucDanh, kiemUyQuyen } from "@/lib/to-chuc";
import { LoiHttp } from "@/lib/phien";
import { suaDonVi, type DauVaoDonVi } from "@sci/identity/server";
import { xuLyIdentity } from "@/lib/cau-hinh/cau-noi-identity";
import { batBuocQuanTri, kiemQuanLyDonVi, kiemToanBo } from "../../_chung";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return xuLyIdentity(async () => {
    const p = await batBuocQuanTri();
    const id = decodeURIComponent(params.id);
    const v = (await req.json().catch(() => null)) as (Partial<DauVaoDonVi> & { active?: boolean }) | null;
    if (!v) throw new LoiHttp(400, "Thiếu dữ liệu");
    const cu = p.cay.find((d) => d.id === id);
    if (!cu) throw new LoiHttp(404, "Không có đơn vị này");
    kiemQuanLyDonVi(p, id, "sửa đơn vị này");
    if (v.cha_id !== undefined && v.cha_id !== cu.cha_id) {
      if (v.cha_id) kiemQuanLyDonVi(p, v.cha_id, "chuyển đơn vị vào đây");
      else kiemToanBo(p, "đưa đơn vị lên làm đơn vị gốc");
    }
    // Đổi cấp ảnh hưởng quy tắc đè toàn công ty → chỉ người quản lý toàn bộ
    if (v.cap !== undefined && v.cap !== cu.cap) kiemToanBo(p, "đổi cấp đơn vị (cấp ảnh hưởng quy tắc đè toàn công ty)");
    // Đơn vị chức danh: người dùng sửa CHỨC DANH, tên đơn vị máy tự ghép "<chức danh> · <người giữ>" (lib/to-chuc.ts)
    const { chuc_danh, chuc_danh_ngan, uy_quyen_truong, chuc_nang, ngoai_sci, ...sua } = { ...v } as typeof v & {
      chuc_danh?: string;
      chuc_danh_ngan?: string;
      uy_quyen_truong?: string | null;
      chuc_nang?: string | null;
      ngoai_sci?: boolean;
    };
    delete sua.id;
    // Ngoài SCI (db/85, Mr. Đại chốt 09–10/10): công ty SCI có cổ phần / ban điều hành tổng thầu — không ai giao chủ trì xuống.
    // Ảnh hưởng quyền giao toàn công ty → chỉ người quản lý toàn bộ. Đổi riêng, không đụng các trường khác
    if (ngoai_sci !== undefined) {
      kiemToanBo(p, "đổi đơn vị trực thuộc / ngoài SCI");
      return {
        don_vi: await tx(async (q) => {
          const truoc = !!(await q.query<{ x: boolean | null }>("SELECT ngoai_sci AS x FROM identity.don_vi WHERE id = $1", [id])).rows[0]?.x;
          await q.query("UPDATE identity.don_vi SET ngoai_sci = $2 WHERE id = $1", [id, !!ngoai_sci]);
          if (truoc !== !!ngoai_sci) await p.ng.ghiNhatKy?.(q, { loai: "don_vi", id, thao_tac: "ngoai_sci", chi_tiet: { truoc: { ngoai_sci: truoc }, sau: { ngoai_sci: !!ngoai_sci } } });
          return { ...cu, ngoai_sci: !!ngoai_sci };
        }),
      };
    }
    // Chức năng nhiệm vụ (db/81): đổi riêng, không đụng các trường khác
    if (chuc_nang !== undefined) {
      const moi = (chuc_nang ?? "").trim() || null;
      if (moi && moi.length > 8000) throw new LoiHttp(400, "Chức năng nhiệm vụ dài quá 8.000 ký tự — rút gọn lại");
      return {
        don_vi: await tx(async (q) => {
          const truoc = (await q.query<{ c: string | null }>("SELECT chuc_nang AS c FROM identity.don_vi WHERE id = $1", [id])).rows[0]?.c ?? null;
          await q.query("UPDATE identity.don_vi SET chuc_nang = $2 WHERE id = $1", [id, moi]);
          if (truoc !== moi) await p.ng.ghiNhatKy?.(q, { loai: "don_vi", id, thao_tac: "chuc_nang", chi_tiet: { truoc: { chuc_nang: truoc }, sau: { chuc_nang: moi } } });
          return { ...cu, chuc_nang: moi };
        }),
      };
    }
    // Ủy quyền trưởng (db/70): đổi riêng, không đụng các trường khác
    if (uy_quyen_truong !== undefined) {
      const moi = uy_quyen_truong || null;
      return {
        don_vi: await tx(async (q) => {
          const loi = await kiemUyQuyen(q, id, moi);
          if (loi) throw new LoiHttp(400, loi);
          const truoc = (await q.query<{ u: string | null }>("SELECT uy_quyen_truong AS u FROM identity.don_vi WHERE id = $1", [id])).rows[0]?.u ?? null;
          await q.query("UPDATE identity.don_vi SET uy_quyen_truong = $2 WHERE id = $1", [id, moi]);
          if (truoc !== moi) await p.ng.ghiNhatKy?.(q, { loai: "don_vi", id, thao_tac: "uy_quyen", chi_tiet: { truoc: { uy_quyen_truong: truoc }, sau: { uy_quyen_truong: moi } } });
          return { ...cu, uy_quyen_truong: moi };
        }),
      };
    }
    const laCd = (sua.loai ?? cu.loai) === "chuc_danh";
    if (laCd && chuc_danh !== undefined) {
      if (!chuc_danh.trim()) throw new LoiHttp(400, "Chức danh không được để trống");
      sua.ten = chuc_danh.trim();
      sua.ten_ngan = chuc_danh_ngan?.trim() || chuc_danh.trim();
    }
    return {
      don_vi: await tx(async (q) => {
        const d = await suaDonVi(q, p.ng, id, sua);
        if (laCd && chuc_danh !== undefined)
          await q.query("UPDATE identity.don_vi SET chuc_danh = $2, chuc_danh_ngan = $3 WHERE id = $1", [id, sua.ten, sua.ten_ngan]);
        await dongBoChucDanh(q);
        return d;
      }),
    };
  });
}
