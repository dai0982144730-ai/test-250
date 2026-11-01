// ============================================================
// luat/loai/muc.ts — dạng luật trên MỤC theo tiêu đề: muc_co_noi_dung
// ============================================================
import { chuanHoaTieuDe, giaTri } from "@/lib/kiem-tra/chuan-hoa";
import { type LoaiDayDu, type TS, cacDong, chuTs, soThamSo, taoBoNhan } from "./chung";

const soKyTu = (ts: TS) => soThamSo(ts.so_ky_tu) ?? 1;

/** Số ký tự "thật": chỉ đếm chữ và số — bỏ khoảng trắng, dấu câu, chuỗi giữ chỗ như "......", "…", "___". */
export function demKyTuThat(s: string, chuaDien: string[]): number {
  let x = s;
  for (const c of chuaDien) if (c.trim()) x = x.split(c.trim()).join(" ");
  return (x.match(/[\p{L}\p{N}]/gu) ?? []).length;
}

const khopTieuDe = (a: string, b: string) => {
  const ka = chuanHoaTieuDe(a);
  const kb = chuanHoaTieuDe(b);
  return !!ka && !!kb && (ka === kb || ka.includes(kb));
};

export const MUC_CO_NOI_DUNG: LoaiDayDu = {
  ma: "muc_co_noi_dung",
  ten: "Mục phải có nội dung",
  mo_ta: 'Mục (tìm theo tiêu đề) phải được viết nội dung thật, ít nhất số ký tự này — không để trống hay chỉ có "......".',
  vi_du: "Mục Nhân sự phải có nội dung, ít nhất 20 ký tự",
  tham_so: [
    { khoa: "muc", nhan: "Mục (tiêu đề)", kieu: "muc", bat_buoc: true },
    { khoa: "so_ky_tu", nhan: "Số ký tự tối thiểu", kieu: "so", bat_buoc: false, goi_y: "mặc định 1", mac_dinh: 1 },
  ],
  kiemThem(ts) {
    const n = soKyTu(ts);
    return Number.isInteger(n) && n >= 1 ? [] : [`Số ký tự tối thiểu phải là số nguyên từ 1 trở lên (đang là ${String(ts.so_ky_tu)})`];
  },
  kiem(bc, ts, ctx) {
    const ten = chuTs(ts, "muc");
    if (!ten) return [];
    const n = taoBoNhan(ctx.dinh_nghia_mau);
    const nhan = n.muc(ten);
    const vt = { tag: `muc:${nhan}` };
    const can = soKyTu(ts);
    const muc = (bc.muc ?? []).find((m) => khopTieuDe(m.tieu_de, ten));
    if (!muc) {
      // Không có dữ liệu mục (bộ đọc cũ) mà tiêu đề vẫn còn: không kết luận được
      if (!bc.muc && bc.tieu_de.some((t) => khopTieuDe(t, ten))) return [];
      return [{ thong_diep: `Không thấy mục "${nhan}" trong báo cáo`, vi_tri: vt }];
    }
    let dem = demKyTuThat(muc.van_ban, ctx.gia_tri_chua_dien);
    // Mục chỉ gồm bảng gắn mã (vd "Vấn đề nổi bật", "Công việc"): nội dung nằm trong bảng có nhãn trùng tiêu đề
    for (const b of ctx.dinh_nghia_mau?.bang ?? []) {
      if (!khopTieuDe(muc.tieu_de, b.nhan)) continue;
      for (const { dong } of cacDong(bc, b.tag, ctx)) {
        for (const [k, v] of Object.entries(dong)) if (k !== "stt") dem += demKyTuThat(giaTri(v, ctx.gia_tri_chua_dien), ctx.gia_tri_chua_dien);
      }
    }
    if (dem >= can) return [];
    return [{ thong_diep: dem === 0 ? `Mục "${muc.tieu_de}" chưa có nội dung` : `Mục "${muc.tieu_de}" mới có ${dem} ký tự nội dung, cần ít nhất ${can}`, vi_tri: vt }];
  },
  doc: (ts, n) => {
    const can = soKyTu(ts);
    return `Mục "${n.muc(chuTs(ts, "muc"))}" phải có nội dung thật${can > 1 ? ` (ít nhất ${can} ký tự)` : ""}, không để trống hay chỉ có "......"`;
  },
};
