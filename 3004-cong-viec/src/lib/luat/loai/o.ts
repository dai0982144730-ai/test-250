// ============================================================
// luat/loai/o.ts — dạng luật trên GIÁ TRỊ của ô (hoặc từng dòng của một cột):
// o_co_gia_tri · o_khop_mau · khoang_so · thuoc_danh_sach
// ============================================================
import { docNgay, laChuaDien } from "@/lib/kiem-tra/chuan-hoa";
import type { ThamChieu } from "../types";
import {
  type BoNhan,
  type LoaiDayDu,
  type Loi,
  type TS,
  cacDong,
  chuTs,
  chuanChu,
  docSo,
  hoaDau,
  layGiaTri,
  laCot,
  soThamSo,
  soVN,
  taoBoNhan,
  tenViTri,
  viTriCua,
} from "./chung";
import type { DuLieuBaoCao, NguCanhKiem } from "../types";

/** Chạy một hàm kiểm trên mọi giá trị có thật của tham chiếu: một ô, hoặc từng dòng có nội dung của một cột. */
function moiGiaTri(
  bc: DuLieuBaoCao,
  tc: ThamChieu,
  ctx: NguCanhKiem,
  kiem: (v: string, soDong?: number) => string | null,
): Loi[] {
  const loi: Loi[] = [];
  const di = (v: string, soDong?: number) => {
    if (!v) return; // trống: không xét (luật "phải có giá trị" lo phần này)
    const tl = kiem(v, soDong);
    if (tl) loi.push({ thong_diep: tl, vi_tri: viTriCua(tc, soDong) });
  };
  if (laCot(tc)) for (const { so, dong } of cacDong(bc, tc.bang, ctx)) di(layGiaTri(bc, tc, ctx, dong), so);
  else di(layGiaTri(bc, tc, ctx));
  return loi;
}

// ---------------- Định dạng có sẵn ----------------

export interface DinhDangCoSan {
  ma: string;
  nhan: string;
  vi_du: string;
  khop: (v: string) => boolean;
}

export const DINH_DANG_CO_SAN: DinhDangCoSan[] = [
  {
    ma: "so_dien_thoai",
    nhan: "số điện thoại",
    vi_du: "0912 345 678",
    khop: (v) => /^(?:\+84|84|0)(?:3|5|7|8|9|2\d)\d{7,8}$/.test(v.replace(/[\s.\-()]/g, "")),
  },
  { ma: "ma_viec", nhan: "mã việc", vi_du: "CV-2026-0412", khop: (v) => /^CV-\d{4}-\d{3,6}$/i.test(v.trim()) },
  {
    ma: "ngay",
    nhan: "ngày dd/mm/yyyy",
    vi_du: "21/07/2026",
    khop: (v) => /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(v.trim()) && !!docNgay(v).iso,
  },
  { ma: "email", nhan: "địa chỉ email", vi_du: "ten@scigroup.vn", khop: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) },
  { ma: "so", nhan: "số", vi_du: "1.240,5", khop: (v) => docSo(v) !== null },
  { ma: "phan_tram", nhan: "phần trăm", vi_du: "41,5%", khop: (v) => /%\s*$/.test(v) && docSo(v) !== null },
];

const dinhDang = (ma: string) => DINH_DANG_CO_SAN.find((d) => d.ma === ma);

/** Dựng regex người dùng viết (bỏ /.../cờ nếu có). Sai cú pháp → null. */
export function taoRegex(s: string): RegExp | null {
  const m = /^\/(.*)\/([gimsuy]*)$/s.exec(s);
  try {
    return m ? new RegExp(m[1], m[2].replace("g", "") || "u") : new RegExp(s, "u");
  } catch {
    try {
      return m ? new RegExp(m[1], m[2].replace(/[gu]/g, "")) : new RegExp(s);
    } catch {
      return null;
    }
  }
}

function docMau(ts: TS): string {
  const dd = dinhDang(chuTs(ts, "dinh_dang"));
  if (dd) return `đúng định dạng ${dd.nhan} (vd ${dd.vi_du})`;
  return `khớp biểu thức ${chuTs(ts, "regex")}`;
}

const tcTs = (ts: TS) => ts.tham_chieu as ThamChieu;

const docThamChieuDauCau = (n: BoNhan, tc: ThamChieu) => hoaDau(n.tc(tc));

// ---------------- Các dạng ----------------

export const O_CO_GIA_TRI: LoaiDayDu = {
  ma: "o_co_gia_tri",
  ten: "Ô phải được điền",
  mo_ta: 'Ô này không được để trống hay để nguyên chữ mẫu như "......".',
  vi_du: "Ô người kiểm soát phải được điền",
  tham_so: [{ khoa: "o", nhan: "Ô cần điền", kieu: "o", bat_buoc: true }],
  kiem(bc, ts, ctx) {
    const tag = chuTs(ts, "o");
    if (!tag) return [];
    const n = taoBoNhan(ctx.dinh_nghia_mau);
    if (!(tag in bc.o_nhap)) return [{ thong_diep: `Không thấy ô "${n.o(tag)}" trong báo cáo (ô gắn mã của mẫu đã bị xóa?)`, vi_tri: { tag } }];
    const v = bc.o_nhap[tag] ?? "";
    if (!laChuaDien(v, ctx.gia_tri_chua_dien)) return [];
    const tho = v.trim();
    return [{ thong_diep: tho ? `Ô "${n.o(tag)}" còn để "${tho}", cần điền` : `Ô "${n.o(tag)}" chưa điền`, vi_tri: { tag } }];
  },
  doc: (ts, n) => `Ô "${n.o(chuTs(ts, "o"))}" phải được điền (không để trống hay "......")`,
};

export const O_KHOP_MAU: LoaiDayDu = {
  ma: "o_khop_mau",
  ten: "Đúng định dạng",
  mo_ta: "Giá trị của ô (hoặc của cột ở mỗi dòng) phải đúng một định dạng: số điện thoại, mã việc, ngày dd/mm/yyyy... hoặc một biểu thức tự viết; ô trống thì bỏ qua.",
  vi_du: "Mã việc trong bảng Công việc phải có dạng CV-2026-0412",
  tham_so: [
    { khoa: "tham_chieu", nhan: "Ô hoặc cột cần kiểm", kieu: "tham_chieu", bat_buoc: true },
    {
      khoa: "dinh_dang",
      nhan: "Định dạng có sẵn",
      kieu: "chu",
      bat_buoc: false,
      goi_y: DINH_DANG_CO_SAN.map((d) => `${d.ma} (${d.nhan})`).join(" · "),
    },
    { khoa: "regex", nhan: "Hoặc biểu thức tự viết (regex)", kieu: "chu", bat_buoc: false, goi_y: "vd ^CV-\\d{4}-\\d{4}$ — dùng khi không có định dạng sẵn" },
  ],
  kiemThem(ts) {
    const dd = chuTs(ts, "dinh_dang");
    const re = chuTs(ts, "regex");
    if (!dd && !re) return ["Cần chọn định dạng có sẵn hoặc viết biểu thức (regex)"];
    const loi: string[] = [];
    if (dd && !dinhDang(dd)) loi.push(`Định dạng "${dd}" không có sẵn (chọn: ${DINH_DANG_CO_SAN.map((d) => d.ma).join(", ")})`);
    if (re && !taoRegex(re)) loi.push(`Biểu thức "${re}" sai cú pháp`);
    return loi;
  },
  kiem(bc, ts, ctx) {
    const n = taoBoNhan(ctx.dinh_nghia_mau);
    const dd = dinhDang(chuTs(ts, "dinh_dang"));
    const re = chuTs(ts, "regex") ? taoRegex(chuTs(ts, "regex")) : null;
    if (!dd && !re) return [];
    const khop = (v: string) => (dd ? dd.khop(v) : re!.test(v.trim()));
    return moiGiaTri(bc, tcTs(ts), ctx, (v, soDong) => (khop(v) ? null : `${tenViTri(n, tcTs(ts), soDong)} = "${v}", phải ${docMau(ts)}`));
  },
  doc: (ts, n) => `${docThamChieuDauCau(n, tcTs(ts))} phải ${docMau(ts)}`,
};

function docKhoang(ts: TS): string {
  const tu = soThamSo(ts.tu);
  const den = soThamSo(ts.den);
  if (tu !== null && den !== null) return `từ ${soVN(tu)} đến ${soVN(den)}`;
  if (tu !== null) return `từ ${soVN(tu)} trở lên`;
  if (den !== null) return `không quá ${soVN(den)}`;
  return "là số";
}

export const KHOANG_SO: LoaiDayDu = {
  ma: "khoang_so",
  ten: "Số nằm trong khoảng",
  mo_ta: 'Giá trị phải là số và nằm trong khoảng cho phép; hiểu cả cách viết "41,5%", "1.240", "−0,12", "12,5 tỷ" (so theo số đã viết, bỏ đơn vị); ô trống thì bỏ qua.',
  vi_du: "% hoàn thành từ 0 đến 100",
  tham_so: [
    { khoa: "tham_chieu", nhan: "Ô hoặc cột chứa số", kieu: "tham_chieu", bat_buoc: true },
    { khoa: "tu", nhan: "Từ (nhỏ nhất)", kieu: "so", bat_buoc: false, goi_y: "bỏ trống nếu không giới hạn dưới" },
    { khoa: "den", nhan: "Đến (lớn nhất)", kieu: "so", bat_buoc: false, goi_y: "bỏ trống nếu không giới hạn trên" },
  ],
  kiemThem(ts) {
    const tu = soThamSo(ts.tu);
    const den = soThamSo(ts.den);
    if (tu === null && den === null) return ["Cần ít nhất một đầu khoảng: từ hoặc đến"];
    if (tu !== null && den !== null && tu > den) return [`Khoảng sai: từ ${soVN(tu)} lớn hơn đến ${soVN(den)}`];
    return [];
  },
  kiem(bc, ts, ctx) {
    const n = taoBoNhan(ctx.dinh_nghia_mau);
    const tu = soThamSo(ts.tu);
    const den = soThamSo(ts.den);
    const tc = tcTs(ts);
    return moiGiaTri(bc, tc, ctx, (v, soDong) => {
      // "—", "–", "-", "N/A", "không có" trong bảng số liệu nghĩa là không có số → bỏ qua như ô trống
      if (/^\s*([—–-]+|n\/?a|không có|kc)\s*$/i.test(v)) return null;
      const so = docSo(v);
      if (so === null) return `${tenViTri(n, tc, soDong)} = "${v}" không phải số, phải ${docKhoang(ts)}`;
      if ((tu !== null && so < tu) || (den !== null && so > den)) return `${tenViTri(n, tc, soDong)} = ${v}, phải ${docKhoang(ts)}`;
      return null;
    });
  },
  doc: (ts, n) => `${docThamChieuDauCau(n, tcTs(ts))} phải ${docKhoang(ts)}`,
};

function danhSach(ts: TS): string[] {
  return Array.isArray(ts.danh_sach) ? ts.danh_sach.filter((x): x is string | number => typeof x === "string" || typeof x === "number").map(String).map((x) => x.trim()).filter(Boolean) : [];
}

export const THUOC_DANH_SACH: LoaiDayDu = {
  ma: "thuoc_danh_sach",
  ten: "Chọn trong danh sách",
  mo_ta: "Giá trị phải là một trong các lựa chọn cho phép (không phân biệt chữ hoa/thường, có thể bỏ qua dấu); ô trống thì bỏ qua.",
  vi_du: "Mức độ trong bảng kiến nghị chỉ được là Cao, TB hoặc Thấp",
  tham_so: [
    { khoa: "tham_chieu", nhan: "Ô hoặc cột cần kiểm", kieu: "tham_chieu", bat_buoc: true },
    { khoa: "danh_sach", nhan: "Các giá trị cho phép", kieu: "danh_sach", bat_buoc: true, goi_y: "vd Cao; TB; Thấp" },
    { khoa: "bo_dau", nhan: "Bỏ qua dấu tiếng Việt khi so", kieu: "bool", bat_buoc: false },
  ],
  kiemThem(ts) {
    return danhSach(ts).length ? [] : ["Danh sách giá trị cho phép đang trống"];
  },
  kiem(bc, ts, ctx) {
    const n = taoBoNhan(ctx.dinh_nghia_mau);
    const ds = danhSach(ts);
    if (!ds.length) return [];
    const boDau = ts.bo_dau === true;
    const cho = new Set(ds.map((x) => chuanChu(x, boDau)));
    const tc = tcTs(ts);
    return moiGiaTri(bc, tc, ctx, (v, soDong) => (cho.has(chuanChu(v, boDau)) ? null : `${tenViTri(n, tc, soDong)} = "${v}", phải là một trong: ${ds.join(", ")}`));
  },
  doc: (ts, n) => `${docThamChieuDauCau(n, tcTs(ts))} phải là một trong: ${danhSach(ts).join(", ")} (không phân biệt hoa thường${ts.bo_dau === true ? ", bỏ qua dấu" : ""})`,
};
