// ============================================================
// luat/loai/bang.ts — dạng luật trên BẢNG: bang_toi_thieu · cot_bat_buoc · khong_trung · phu_trach_hop_le
// ============================================================
import { tachTen } from "@/lib/kiem-tra/chuan-hoa";
import { type LoaiDayDu, type TS, cacDong, chuTs, chuanChu, layGiaTri, soThamSo, taoBoNhan } from "./chung";

const bangTs = (ts: TS) => chuTs(ts, "bang");
const soDongToiThieu = (ts: TS) => {
  const n = soThamSo(ts.so_dong);
  return n === null ? 1 : n;
};

export const BANG_TOI_THIEU: LoaiDayDu = {
  ma: "bang_toi_thieu",
  ten: "Bảng có đủ số dòng",
  mo_ta: 'Bảng phải có ít nhất số dòng có nội dung này; dòng để trống hay toàn "......" không được tính.',
  vi_du: "Bảng Công việc phải có ít nhất 1 dòng",
  tham_so: [
    { khoa: "bang", nhan: "Bảng", kieu: "bang", bat_buoc: true },
    { khoa: "so_dong", nhan: "Số dòng tối thiểu", kieu: "so", bat_buoc: false, goi_y: "mặc định 1", mac_dinh: 1 },
  ],
  kiemThem(ts) {
    const n = soDongToiThieu(ts);
    return Number.isInteger(n) && n >= 1 ? [] : [`Số dòng tối thiểu phải là số nguyên từ 1 trở lên (đang là ${String(ts.so_dong)})`];
  },
  kiem(bc, ts, ctx) {
    const bang = bangTs(ts);
    if (!bang) return [];
    const n = taoBoNhan(ctx.dinh_nghia_mau);
    const can = soDongToiThieu(ts);
    if (!(bang in bc.bang)) return [{ thong_diep: `Không thấy bảng "${n.bang(bang)}" trong báo cáo, cần ít nhất ${can} dòng`, vi_tri: { bang } }];
    const co = cacDong(bc, bang, ctx).length;
    if (co >= can) return [];
    return [{ thong_diep: co === 0 ? `Bảng "${n.bang(bang)}" chưa có dòng nào có nội dung, cần ít nhất ${can} dòng` : `Bảng "${n.bang(bang)}" mới có ${co} dòng có nội dung, cần ít nhất ${can} dòng`, vi_tri: { bang } }];
  },
  doc: (ts, n) => `Bảng "${n.bang(bangTs(ts))}" phải có ít nhất ${soDongToiThieu(ts)} dòng có nội dung`,
};

export const COT_BAT_BUOC: LoaiDayDu = {
  ma: "cot_bat_buoc",
  ten: "Cột bắt buộc điền",
  mo_ta: "Ở mỗi dòng có nội dung của bảng, cột này phải được điền.",
  vi_du: "Mỗi việc trong bảng Công việc phải có người phụ trách",
  tham_so: [
    { khoa: "bang", nhan: "Bảng", kieu: "bang", bat_buoc: true },
    { khoa: "cot", nhan: "Cột phải điền", kieu: "cot", bat_buoc: true, theo_bang: "bang" },
  ],
  kiem(bc, ts, ctx) {
    const bang = bangTs(ts);
    const cot = chuTs(ts, "cot");
    if (!bang || !cot) return [];
    const n = taoBoNhan(ctx.dinh_nghia_mau);
    const tc = { bang, cot };
    return cacDong(bc, bang, ctx)
      .filter(({ dong }) => layGiaTri(bc, tc, ctx, dong) === "")
      .map(({ so, dong }) => {
        const tho = (dong[cot] ?? "").trim();
        return {
          thong_diep: `Dòng ${so} bảng "${n.bang(bang)}": cột "${n.cot(bang, cot)}" ${tho ? `còn để "${tho}", cần điền` : "chưa điền"}`,
          vi_tri: { bang, dong: so, cot },
        };
      });
  },
  doc: (ts, n) => `Mỗi dòng có nội dung của bảng "${n.bang(bangTs(ts))}" phải điền cột "${n.cot(bangTs(ts), chuTs(ts, "cot"))}"`,
};

export const KHONG_TRUNG: LoaiDayDu = {
  ma: "khong_trung",
  ten: "Không trùng giữa các dòng",
  mo_ta: "Trong một bảng, cột này không được có hai dòng cùng giá trị (không phân biệt chữ hoa/thường); ô trống thì bỏ qua.",
  vi_du: "Mã việc trong bảng Công việc không được trùng nhau",
  tham_so: [
    { khoa: "bang", nhan: "Bảng", kieu: "bang", bat_buoc: true },
    { khoa: "cot", nhan: "Cột không được trùng", kieu: "cot", bat_buoc: true, theo_bang: "bang" },
    { khoa: "bo_dau", nhan: "Bỏ qua dấu tiếng Việt khi so", kieu: "bool", bat_buoc: false },
  ],
  kiem(bc, ts, ctx) {
    const bang = bangTs(ts);
    const cot = chuTs(ts, "cot");
    if (!bang || !cot) return [];
    const n = taoBoNhan(ctx.dinh_nghia_mau);
    const daGap = new Map<string, number>();
    const loi = [];
    for (const { so, dong } of cacDong(bc, bang, ctx)) {
      const v = layGiaTri(bc, { bang, cot }, ctx, dong);
      if (!v) continue;
      const k = chuanChu(v, ts.bo_dau === true);
      const truoc = daGap.get(k);
      if (truoc === undefined) daGap.set(k, so);
      else loi.push({ thong_diep: `Dòng ${so} bảng "${n.bang(bang)}": cột "${n.cot(bang, cot)}" = "${v}" trùng với dòng ${truoc}`, vi_tri: { bang, dong: so, cot } });
    }
    return loi;
  },
  doc: (ts, n) => `Cột "${n.cot(bangTs(ts), chuTs(ts, "cot"))}" của bảng "${n.bang(bangTs(ts))}" không được trùng giữa các dòng`,
};

/** Tách ô phụ trách thành từng tên: ; , + xuống dòng; tên trong ngoặc cũng là một tên ("BQLDA QT (P. ĐT&PC)"). */
export function tachTenPhuTrach(s: string): string[] {
  return tachTen(s).flatMap((t) => {
    const m = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(t);
    return m ? [m[1], ...tachTen(m[2].replace(/\s*\/\s*/g, ";"))].map((x) => x.trim()).filter(Boolean) : [t];
  });
}

const cotPhuTrach = (ts: TS) => chuTs(ts, "cot", "phu_trach");

export const PHU_TRACH_HOP_LE: LoaiDayDu = {
  ma: "phu_trach_hop_le",
  ten: "Người phụ trách có trong hệ thống",
  mo_ta: "Mỗi tên ghi ở cột người phụ trách phải nhận ra được là một đơn vị hoặc một người có trong hệ thống (tên cách nhau bằng ; , +).",
  vi_du: "Người phụ trách trong bảng Công việc phải là đơn vị hoặc người có trong hệ thống",
  tham_so: [
    { khoa: "bang", nhan: "Bảng", kieu: "bang", bat_buoc: true },
    { khoa: "cot", nhan: "Cột người phụ trách", kieu: "cot", bat_buoc: false, theo_bang: "bang", goi_y: "mặc định phu_trach", mac_dinh: "phu_trach" },
  ],
  kiem(bc, ts, ctx) {
    const bang = bangTs(ts);
    const cot = cotPhuTrach(ts);
    const phanGiai = ctx.phan_giai_ten;
    if (!bang || !phanGiai) return []; // không có danh bạ: bỏ qua luật này
    const n = taoBoNhan(ctx.dinh_nghia_mau);
    const loi = [];
    for (const { so, dong } of cacDong(bc, bang, ctx)) {
      const v = layGiaTri(bc, { bang, cot }, ctx, dong);
      if (!v) continue;
      const sai = tachTenPhuTrach(v).filter((t) => !phanGiai(t));
      if (sai.length) {
        loi.push({
          thong_diep: `Dòng ${so} bảng "${n.bang(bang)}": cột "${n.cot(bang, cot)}" có ${sai.map((t) => `"${t}"`).join(", ")} không nhận ra là đơn vị hay người trong hệ thống`,
          vi_tri: { bang, dong: so, cot },
        });
      }
    }
    return loi;
  },
  doc: (ts, n) => `Mỗi tên trong cột "${n.cot(bangTs(ts), cotPhuTrach(ts))}" của bảng "${n.bang(bangTs(ts))}" phải là đơn vị hoặc người có trong hệ thống`,
};
