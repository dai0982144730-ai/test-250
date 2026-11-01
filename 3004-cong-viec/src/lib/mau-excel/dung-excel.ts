// ============================================================
// mau-excel/dung-excel.ts — VẼ TỆP MẪU BÁO CÁO .xlsx (Mr. Đại chốt 22/10/2026). Server-only (exceljs).
// Một tệp ba tờ, trình bày ĐỒNG BỘ biểu mẫu agent Tiến độ (localhost:3003/bieu-mau — luật màu, lời nhắc ô, ô gộp: kieu-o.ts):
//   ① «Mẫu trắng» — tờ ĐẦU, tờ duy nhất máy đọc. Các chương xếp từ trên xuống đúng thứ tự mẫu Word (Mr. Đại chọn "một tờ xếp dọc").
//      Đầu tờ: tên mẫu · dòng «Mã mẫu» · ba hàng chú giải màu (ô chú giải tô đúng màu nó nói) · THÔNG TIN CHUNG.
//   ② «Hướng dẫn» — ba điều cần nhớ · ý nghĩa màu · bảng Ô/cột · ghi gì · máy dùng làm gì · ví dụ · ghi sai thì sao · cách nộp.
//   ③ «Ví dụ đã điền» — cùng bố cục, số liệu minh hoạ, chú thích cam «← …» bên phải dòng ví dụ. Máy không đọc.
// Thêm một tờ ẩn hẳn «_may» (veryHidden — người dùng không thấy để xoá): mã mẫu, nhãn ô nhập, tên cột từng bảng, dấu số liệu ví dụ.
// Bộ đọc (doc-excel.ts) dùng tờ này trước; mất tờ (chép sang tệp khác) thì đọc theo định nghĩa mẫu.
// Lưới chung 12 cột (bảng nhiều cột hơn thì lưới rộng theo): mỗi cột bảng / ô nhập GỘP một số cột lưới theo độ dài nội dung —
// một nội dung một vùng, không bị bó trong một ô hẹp (Mr. Đại 22/10). Máy đọc ô chính của vùng gộp.
// ============================================================
import ExcelJS from "exceljs";
import type { MauWord } from "@/lib/types";
import type { BoCuc, CotBang, DinhNghiaCoBang, DongBang, Khoi, OLuoi } from "./bo-cuc";
import { COT_NGAY, COT_NGAY_10, dsChon, hdCot, hdO, kyTuanHienTai, laCotSo, loaiCot, loiNhac, MAU_O, type HuongDanO, type LoaiO } from "./kieu-o";

export const TO_GHI = "Mẫu trắng";
export const TO_HUONG_DAN = "Hướng dẫn";
export const TO_VI_DU = "Ví dụ đã điền";
export const TO_MAY = "_may";
/** Tờ máy thêm vào bản đánh dấu lỗi (danh-dau-excel.ts) — máy không đọc */
export const TO_LOI = "Lỗi cần sửa";

/** Số dòng trống có khung in sẵn ở bảng việc / bảng chưa có dòng nào (thiếu thì chèn thêm dòng ngay trong bảng — máy đọc hết). */
const DONG_TRONG_BANG_VIEC = 30;
const DONG_TRONG_BANG_KHAC = 8;
/** Lưới tối thiểu, và tổng bề rộng (đơn vị ký tự Excel) chia đều cho lưới — vừa bề ngang A4 dọc (ngang nếu Word gốc ngang) */
const LUOI = 18;
const BE_RONG = { doc: 104, ngang: 150 };
/** Trình bày theo bản Word gốc (Mr. Đại 22/10 tối: «xem bằng mắt bản docx rồi so lại»): chữ Calibri 10, hàng tên cột nền xanh đậm
 *  chữ trắng, tên chương chữ đỏ đậm, đầu báo cáo một khung hai ô gạch dưới xanh đậm, tắt lưới Excel. Luật màu Ô vẫn theo kieu-o.ts. */
const CHU = { name: "Calibri", size: 10 } as const;
const XANH_DAM = "FF1F3864";

/** Khổ in A4 vừa một trang bề ngang, lề hẹp, chân trang «tên mẫu · Trang x/y»; tắt lưới Excel cho giống trang Word */
function datKhoIn(ws: ExcelJS.Worksheet, ten: string, ngang: boolean, cot?: number, hang?: number): void {
  ws.pageSetup = {
    ...ws.pageSetup,
    paperSize: 9,
    orientation: ngang ? "landscape" : "portrait",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalCentered: true,
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.25, footer: 0.25 },
    ...(cot && hang ? { printArea: `A1:${ws.getColumn(cot).letter}${hang}` } : {}),
  };
  ws.headerFooter.oddFooter = `&L&8${ten.replace(/&/g, "&&")}&R&8Trang &P/&N`;
  ws.views = [{ showGridLines: false }];
}

const KHUNG: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: MAU_O.khung } },
  left: { style: "thin", color: { argb: MAU_O.khung } },
  bottom: { style: "thin", color: { argb: MAU_O.khung } },
  right: { style: "thin", color: { argb: MAU_O.khung } },
};
const nen = (argb: string): ExcelJS.Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb } });
/** Hàng tên cột / tiêu đề lưới như bản Word: nền xanh đậm, chữ trắng đậm, giữa */
const KIEU_TIEU_DE = {
  font: { bold: true, color: { argb: "FFFFFFFF" } },
  nen: "FF1F3864",
  khung: true,
  can: { horizontal: "center", vertical: "middle" },
} as const;
const NEN_LOAI: Record<LoaiO, string | undefined> = { do: MAU_O.nenDo, xanh: MAU_O.nenXanh, trang: undefined };
const CHU_LOAI: Record<LoaiO, string> = { do: MAU_O.chuDo, xanh: MAU_O.chuXanh, trang: MAU_O.chuInSan };
const laInHoa = (s: string) => /\p{L}/u.test(s) && s === s.toLocaleUpperCase("vi-VN");
const coCham = (s: string) => /\.{3,}|…/.test(s);

export interface MauCanVe {
  mau: Pick<MauWord, "ma" | "ten" | "phien_ban"> & { dinh_nghia: DinhNghiaCoBang };
  trang: BoCuc;
  vi_du: BoCuc | null;
}

// ---------------- ví dụ cho bảng việc (bản Word ví dụ của 12 mẫu để trống bảng này — đo 22/10/2026) ----------------

const VI_DU_VIEC: (Record<string, string> & { _chu: string })[] = [
  {
    ten: "Trình hồ sơ xin cấp giấy phép xây dựng trạm biến áp 110 kV\nBổ sung bản vẽ mặt bằng theo ý kiến Sở Xây dựng",
    du_an: "Hướng Việt",
    phu_trach: "P. Đầu tư và Pháp chế",
    bat_dau: "03/08/2026",
    ket_thuc: "14/08/2026",
    ket_qua_can_co: "Hồ sơ nộp Sở Xây dựng, có giấy biên nhận",
    tinh_trang: "Đang làm",
    han_quyet_dinh: "07/08/2026",
    _chu: "← Một ô hai dòng: dòng đầu là tên việc, dòng sau là mô tả (Alt + Enter)",
  },
  {
    ten: "Họp nghiệm thu móng trụ T12",
    du_an: "Hướng Việt",
    phu_trach: "BQLDA Quảng Trị",
    bat_dau: "",
    ket_thuc: "5 ngày sau khi xong Trình hồ sơ xin cấp giấy phép xây dựng trạm biến áp 110 kV",
    ket_qua_can_co: "Biên bản nghiệm thu có đủ chữ ký",
    tinh_trang: "Chưa làm",
    han_quyet_dinh: "10/08/2026",
    _chu: "← Chưa biết ngày: «N ngày sau khi xong <tên việc>». Bắt đầu để trống → máy lấy ngày nộp",
  },
  {
    ten: "Gửi báo cáo quyết toán quý II cho ngân hàng",
    du_an: "Nậm Xe",
    phu_trach: "P. Tài chính Kế toán",
    bat_dau: "20/07/2026",
    ket_thuc: "31/07/2026",
    ket_qua_can_co: "Ngân hàng xác nhận đã nhận",
    tinh_trang: "Đã xong",
    han_quyet_dinh: "31/07/2026",
    _chu: "← Đã xong: việc được đóng, kỳ sau không phải ghi lại",
  },
];

/** Bảng việc (bảng mẫu khai sinh việc) — tag nằm trong dinh_nghia.bang_cong_viec, hoặc có cột "ten". */
function laBangViec(dn: DinhNghiaCoBang, k: Extract<Khoi, { loai: "bang" }>): boolean {
  return (dn.bang_cong_viec ?? []).some((b) => b.tag === k.tag) || k.cot[0]?.tag === "ten";
}

function boCucViDu(dn: DinhNghiaCoBang, bc: BoCuc): BoCuc {
  return {
    ...bc,
    khoi: bc.khoi.map((k) => {
      if (k.loai !== "bang" || !laBangViec(dn, k)) return k;
      const coDuLieu = k.dong.some((d) => "gt" in d && Object.values(d.gt).some(Boolean));
      if (coDuLieu) return k;
      return { ...k, dong: VI_DU_VIEC.map((v) => ({ gt: Object.fromEntries(k.cot.map((c) => [c.tag, v[c.tag] ?? ""])) })) };
    }),
  };
}

// ---------------- lưới, ô gộp ----------------

/** Tối thiểu của mỗi phần: cột chữ, cột số 2 ô lưới; STT, đơn vị 1 ô */
const toiThieu = (w: number[]) => w.map((x) => (x > 1 ? 2 : 1));

/** Chia `G` cột lưới cho các phần theo trọng số; mỗi phần được tối thiểu của nó khi đủ chỗ (không thì 1); tổng đúng bằng G. */
function chiaCot(w: number[], G: number): number[] {
  const n = w.length;
  if (!n) return [];
  if (n >= G) return w.map(() => 1);
  const cong = (a: number[]) => a.reduce((x, y) => x + y, 0);
  const kq = cong(toiThieu(w)) <= G ? toiThieu(w) : w.map(() => 1);
  const con = G - cong(kq);
  const tong = cong(w) || n;
  const ly = w.map((x) => (x * con) / tong);
  ly.forEach((x, i) => (kq[i] += Math.floor(x)));
  let du = G - cong(kq);
  const thu = ly.map((x, i) => ({ i, r: x - Math.floor(x) })).sort((a, b) => b.r - a.r);
  for (let k = 0; du > 0; k = (k + 1) % n, du--) kq[thu[k].i]++;
  return kq;
}

const COT_DAI = new Set(["ten", "noi_dung", "ket_qua_can_co", "kien_nghi", "vuong_mac", "anh_huong", "tai_lieu", "hanh_dong", "ho_so", "mo_ta", "bien_phap", "cong_viec", "hang_muc", "chi_tieu", "kpi", "khoan_muc"]);

/** Trọng số bề rộng: tên việc 6 · chữ dài 4 · ngày 2 · số 1,5 · STT / đơn vị 1 · còn lại 2,5 */
function trongSo(c: CotBang, coSo: boolean): number {
  if (/^(stt|uu_tien|dvt|don_vi)$/.test(c.tag) || /^(stt|tt|#|đvt)$/i.test(c.nhan.trim())) return 1;
  if (c.tag === "ten") return 6;
  if (COT_DAI.has(c.tag)) return 4;
  if (COT_NGAY.has(c.tag) || c.tag === "ngay") return 2;
  if (coSo) return 1.5;
  return 2.5;
}

/** Số dòng chữ khi gói trong vùng rộng `rong` ký tự — Excel không tự giãn hàng có ô gộp nên máy tự đặt chiều cao. */
const soDong = (chu: string, rong: number) => chu.split("\n").reduce((a, d) => a + Math.max(1, Math.ceil((d.length * 1.0) / Math.max(4, rong - 1))), 0);

interface KieuVung {
  font?: Partial<ExcelJS.Font>;
  nen?: string;
  khung?: boolean;
  can?: Partial<ExcelJS.Alignment>;
  numFmt?: string;
}

class Ve {
  r = 1;
  private cao = new Map<number, number>();
  constructor(
    readonly ws: ExcelJS.Worksheet,
    readonly G: number,
    readonly rongCot: number,
  ) {}

  /** Ghi một vùng gộp ngang [c1, c1+rong) ở hàng r; trả ô chính. Gộp TRƯỚC rồi mới đặt kiểu — ô phụ dùng chung kiểu ô chính. */
  vung(r: number, c1: number, rong: number, gt: ExcelJS.CellValue, k: KieuVung = {}): ExcelJS.Cell {
    if (rong > 1) this.ws.mergeCells(r, c1, r, c1 + rong - 1);
    const m = this.ws.getCell(r, c1);
    m.value = gt;
    m.alignment = { wrapText: true, vertical: "top", ...k.can };
    m.font = { ...CHU, ...k.font };
    if (k.nen) m.fill = nen(k.nen);
    if (k.khung) {
      for (let c = c1; c < c1 + rong; c++) this.ws.getCell(r, c).border = KHUNG;
    }
    if (k.numFmt) m.numFmt = k.numFmt;
    const chu = typeof gt === "string" ? gt : gt && typeof gt === "object" && "richText" in gt ? gt.richText.map((x) => x.text).join("") : "";
    if (chu) this.cao.set(r, Math.max(this.cao.get(r) ?? 1, soDong(chu, rong * this.rongCot)));
    return m;
  }

  /** Một hàng chỉ một vùng phủ cả lưới */
  ca(gt: ExcelJS.CellValue, k: KieuVung = {}): ExcelJS.Cell {
    const c = this.vung(this.r, 1, this.G, gt, k);
    this.r++;
    return c;
  }

  datCao(): void {
    for (const [r, n] of this.cao) if (n > 1) this.ws.getRow(r).height = Math.min(409, 13.5 * n + 3);
  }

  /** Viền riêng từng ô (kiểu mới cho mỗi ô — ô gộp dùng chung kiểu, gán thẳng là lan sang ô khác) */
  vien(r: number, c: number, b: Partial<ExcelJS.Borders>): void {
    const o = this.ws.getCell(r, c);
    o.style = { ...o.style, border: { ...o.style.border, ...b } };
  }
}

/** Lời nhắc rê chuột + (tuỳ) danh sách chọn / ép dạng ngày. Cảnh báo chứ không cấm: máy vẫn đọc chữ gõ tay. */
function datNhac(c: ExcelJS.Cell, tieuDe: string, h: HuongDanO, ds?: string[], ngay10 = false): void {
  const nhac = { ...loiNhac(tieuDe, h), showInputMessage: true, allowBlank: true };
  if (ds?.length) {
    c.dataValidation = { type: "list", formulae: [`"${ds.join(",")}"`], showErrorMessage: true, errorStyle: "warning", errorTitle: "Nên chọn trong danh sách", error: `Nên chọn: ${ds.join(" · ")}`, ...nhac };
    return;
  }
  if (ngay10) {
    c.dataValidation = { type: "textLength", operator: "equal", formulae: [10], showErrorMessage: true, errorStyle: "warning", errorTitle: "Ngày chưa đúng dạng", error: "Ghi đủ dd/mm/yyyy, vd 05/08/2026.", ...nhac };
    return;
  }
  c.dataValidation = { type: "textLength", operator: "lessThanOrEqual", formulae: [5000], showErrorMessage: false, ...nhac };
}

/** Kiểu của một ô nhập theo hậu quả ghi sai (kieu-o.ts) */
function kieuONhap(tag: string, giaTri: string, batBuocDn: boolean): { loai: LoaiO; batBuoc: boolean; inSan: boolean } {
  if (tag === "ky_bao_cao") return { loai: "xanh", batBuoc: true, inSan: false };
  if (tag === "don_vi_lap") return coCham(giaTri) ? { loai: "xanh", batBuoc: true, inSan: false } : { loai: "trang", batBuoc: false, inSan: true };
  return { loai: "trang", batBuoc: batBuocDn, inSan: false };
}

// ---------------- vẽ một tờ theo bố cục ----------------

interface VeTo {
  /** tag bảng → số hàng Excel của hàng tên cột (để tờ _may ghi lại) */
  hangTieuDe: Record<string, number>;
  nhanO: { tag: string; nhan: string }[];
  /** Kỳ máy ghi sẵn lúc tải mẫu (bộ đọc dùng để biết tờ còn trắng) */
  kySan?: string;
}

interface TuyChonVe {
  /** Bản trắng của mẫu — biết chữ nào in sẵn, ô nào mẫu dùng chung còn «......» */
  goc: BoCuc;
  /** Ghi sẵn tuần hiện tại vào ô Kỳ báo cáo còn «......» */
  ghiSanKy?: boolean;
}

/** Trọng số bề rộng + cột nào là cột số của một bảng — xét theo bản TRẮNG để tờ ghi và tờ ví dụ cùng một bố cục cột */
function trongSoBang(k: Extract<Khoi, { loai: "bang" }>, goc: BoCuc): { w: number[]; coSo: boolean[] } {
  const g = goc.khoi.find((x): x is Extract<Khoi, { loai: "bang" }> => x.loai === "bang" && x.tag === k.tag) ?? k;
  const coSo = k.cot.map((c) => laCotSo(c.nhan, g.dong.flatMap((d) => ("gt" in d ? [d.gt[c.tag] ?? ""] : []))));
  return { w: k.cot.map((c, j) => trongSo(c, coSo[j])), coSo };
}

/** Lưới đủ để mỗi cột bảng được tối thiểu của nó (cột chữ, cột số 2 ô; STT 1 ô) */
function soCotLuoi(bc: BoCuc, goc: BoCuc): number {
  return Math.max(
    LUOI,
    ...bc.khoi.map((k) =>
      // + 2 ô cho mỗi cột chữ dài, để bảng nhiều cột số không bó cột chữ trong 2 ô
      k.loai === "bang"
        ? toiThieu(trongSoBang(k, goc).w).reduce((a, b) => a + b, 0) + 2 * trongSoBang(k, goc).w.filter((x) => x >= 4).length
        : k.loai === "hang" ? k.o.reduce((a, o) => a + (o.rong ?? 1), 0) : 1,
    ),
  );
}

function veTo(ws: ExcelJS.Worksheet, mau: MauCanVe["mau"], bc: BoCuc, cheDo: "ghi" | "vi_du", tuy: TuyChonVe): VeTo {
  const dn = mau.dinh_nghia;
  const G = soCotLuoi(bc, tuy.goc);
  const ngang = !!tuy.goc.ngang;
  const rongCot = Math.round(((ngang ? BE_RONG.ngang : BE_RONG.doc) / G) * 100) / 100;
  ws.columns = [...Array.from({ length: G }, () => ({ width: rongCot })), ...(cheDo === "vi_du" ? [{ width: 3 }, { width: 58 }] : [])];
  ws.properties.defaultRowHeight = 15;
  const v = new Ve(ws, G, rongCot);
  const kq: VeTo = { hangTieuDe: {}, nhanO: [] };
  const banTrang = cheDo === "ghi" && bc === tuy.goc;
  const nhanRong = Math.round(G / 5);
  const ghiNhan = (tag: string, nhan: string) => {
    if (!kq.nhanO.some((x) => x.tag === tag)) kq.nhanO.push({ tag, nhan });
  };
  /** Chú thích cam bên phải (chỉ tờ ví dụ) */
  const chuThich = (r: number, chu: string) => {
    if (cheDo !== "vi_du") return;
    const c = ws.getCell(r, G + 2);
    c.value = chu;
    c.font = { italic: true, color: { argb: MAU_O.chuCam } };
    c.alignment = { wrapText: true, vertical: "top" };
  };
  const giaTriGoc = new Map<string, string>();
  for (const k of tuy.goc.khoi) {
    if (k.loai === "o") giaTriGoc.set(k.tag, k.gia_tri);
    if (k.loai === "hang") for (const o of k.o) if (o.o) giaTriGoc.set(o.o, o.chu);
  }
  const giaTriO = (tag: string, gt: string) => {
    if (tag === "ky_bao_cao" && tuy.ghiSanKy && cheDo === "ghi" && coCham(gt)) {
      kq.kySan = kyTuanHienTai();
      return kq.kySan;
    }
    return gt;
  };
  const kieuO = (tag: string, gt: string) => kieuONhap(tag, giaTriGoc.get(tag) ?? gt, !!dn.o_nhap.find((x) => x.tag === tag)?.bat_buoc);
  /** Vẽ ô GIÁ TRỊ của một ô nhập */
  const veGiaTri = (r: number, c1: number, rong: number, tag: string, gtVao: string, tieuDe: string, ds?: string[], font?: Partial<ExcelJS.Font>, ngangCan?: "right") => {
    const gt = giaTriO(tag, gtVao);
    const ko = kieuO(tag, gtVao);
    const c = v.vung(r, c1, rong, gt, {
      khung: true,
      nen: NEN_LOAI[ko.loai],
      font: ko.inSan ? { bold: true, color: { argb: MAU_O.chuDo }, ...font } : tag === "ky_bao_cao" ? { bold: true, color: { argb: XANH_DAM } } : ko.loai === "xanh" ? { bold: true } : font,
      numFmt: tag === "ky_bao_cao" ? "@" : undefined,
      can: { vertical: "middle", ...(ngangCan ? { horizontal: ngangCan } : {}) },
    });
    if (cheDo === "ghi" && !ko.inSan) datNhac(c, tieuDe, hdO(tag, tieuDe, ko.batBuoc), ds);
    if (tag === "ky_bao_cao") chuThich(r, "← Sửa mỗi kỳ: số tuần và khoảng ngày Thứ Hai – Chủ nhật");
    if (tag === "don_vi_lap" && ko.loai === "xanh") chuThich(r, "← Mẫu dùng chung: thay «......» bằng đúng tên đơn vị");
  };
  const nhanCua = (tag: string, nhan: string) => {
    const ko = kieuO(tag, giaTriGoc.get(tag) ?? "");
    // nhãn ô là chữ máy in sẵn: chữ xanh nếu ô ghi theo kỳ, còn lại chữ đỏ (như bản Word)
    return { chu: `${nhan}${ko.batBuoc ? " *" : ""}`, font: { bold: true, color: { argb: ko.loai === "xanh" ? MAU_O.chuXanh : MAU_O.chuDo } } };
  };

  if (cheDo === "vi_du")
    v.ca("VÍ DỤ ĐÃ ĐIỀN — chỉ để xem cách ghi. Máy KHÔNG đọc tờ này: báo cáo thật ghi ở tờ «Mẫu trắng».", {
      font: { bold: true, color: { argb: MAU_O.chuCam } },
      nen: MAU_O.nenViDu,
    });

  // 1. Khung đầu báo cáo như bản Word: trái «CÔNG TY…» + «Gửi», phải «BÁO CÁO TUẦN» + Đơn vị lập (+ lời nhắc), gạch dưới xanh đậm.
  // Lấy mọi dòng chữ trước chương đầu + hai ô Gửi / Đơn vị lập (máy đọc ô nhập theo nhãn, không theo thứ tự).
  const dauChuong = bc.khoi.findIndex((k) => k.loai === "chuong");
  const vung = dauChuong < 0 ? bc.khoi.length : dauChuong;
  const O_DAU = ["gui_den", "don_vi_lap"];
  const laDau = (k: Khoi, j: number) => j < vung && (k.loai === "chu" || (k.loai === "o" && O_DAU.includes(k.tag)));
  const chuDau = bc.khoi.filter((k, j): k is Extract<Khoi, { loai: "chu" }> => laDau(k, j) && k.loai === "chu");
  const trai: Extract<Khoi, { loai: "chu" }>[] = [];
  const phai: Extract<Khoi, { loai: "chu" }>[] = [];
  chuDau.forEach((k, j) => (j > 0 && (laInHoa(k.chu) || phai.length) ? phai : trai).push(k));
  const oDau = (tag: string) => bc.khoi.find((k, j): k is Extract<Khoi, { loai: "o" }> => laDau(k, j) && k.loai === "o" && k.tag === tag);
  const nua = Math.floor(G / 2);
  const dauKhung = v.r;
  const veChuDau = (r: number, c1: number, rong: number, k: Extract<Khoi, { loai: "chu" }> | undefined, ben: "trai" | "phai", thu: number) => {
    if (!k) return void v.vung(r, c1, rong, "");
    const hoa = laInHoa(k.chu);
    const font: Partial<ExcelJS.Font> = !hoa
      ? { italic: true, size: 9, color: { argb: MAU_O.chuNhac } }
      : ben === "trai"
        ? { bold: true, size: 13, color: { argb: XANH_DAM } }
        : { bold: true, size: thu === 0 ? 15 : 10, color: { argb: MAU_O.chuDo } };
    v.vung(r, c1, rong, k.chu, { font, can: { horizontal: ben === "phai" ? "right" : "left", vertical: "middle" } });
  };
  // hàng 1: công ty | tên báo cáo
  veChuDau(v.r, 1, nua, trai[0], "trai", 0);
  veChuDau(v.r, nua + 1, G - nua, phai[0], "phai", 0);
  v.r++;
  // hàng 2: Gửi | Đơn vị lập
  const nhanNho = (r: number, c: number, rong: number, chu: string) => v.vung(r, c, rong, chu, { font: { size: 9, color: { argb: MAU_O.chuNhac } }, can: { vertical: "middle" } });
  const gui = oDau("gui_den");
  const dvl = oDau("don_vi_lap");
  if (gui) {
    nhanNho(v.r, 1, 2, gui.nhan);
    veGiaTri(v.r, 3, nua - 2, gui.tag, gui.gia_tri, gui.nhan, gui.ds, { size: 9, color: { argb: MAU_O.chuNhac } });
    ghiNhan(gui.tag, gui.nhan);
  } else v.vung(v.r, 1, nua, "");
  if (dvl) {
    nhanNho(v.r, nua + 1, 3, `${dvl.nhan}${kieuO(dvl.tag, dvl.gia_tri).batBuoc ? " *" : ""}`);
    veGiaTri(v.r, nua + 4, G - nua - 3, dvl.tag, dvl.gia_tri, dvl.nhan, dvl.ds, { bold: true, color: { argb: MAU_O.chuDo } }, "right");
    ghiNhan(dvl.tag, dvl.nhan);
  } else v.vung(v.r, nua + 1, G - nua, "");
  v.r++;
  // các hàng còn lại: lời nhắc / dòng phụ hai bên
  for (let j = 1; j < Math.max(trai.length, phai.length); j++) {
    veChuDau(v.r, 1, nua, trai[j], "trai", j);
    veChuDau(v.r, nua + 1, G - nua, phai[j], "phai", j);
    v.r++;
  }
  // khung: viền ngoài mảnh, vạch giữa, gạch dưới xanh đậm
  const mong = { style: "thin" as const, color: { argb: MAU_O.khung } };
  for (let r = dauKhung; r < v.r; r++) {
    v.vien(r, 1, { left: mong });
    v.vien(r, G, { right: mong });
    v.vien(r, nua, { right: mong });
  }
  for (let c = 1; c <= G; c++) {
    v.vien(dauKhung, c, { top: mong });
    v.vien(v.r - 1, c, { bottom: { style: "thick", color: { argb: XANH_DAM } } });
  }
  v.r++;

  // 2. Thân mẫu; trước chương đầu chèn dòng «Mã mẫu» + chú giải màu (luật màu Tiến độ)
  let daChuGiai = false;
  const veChuGiai = () => {
    if (daChuGiai) return;
    daChuGiai = true;
    // Mã mẫu — máy nhận mẫu bằng ô này (tờ ẩn _may là nguồn thứ hai)
    v.vung(v.r, 1, nhanRong, `Mã mẫu: ${mau.ma}`, { font: { bold: true, size: 9, color: { argb: MAU_O.chuDo } } });
    v.vung(v.r, nhanRong + 1, G - nhanRong, "Máy nhận mẫu bằng dòng này — không sửa, không xoá.", { font: { italic: true, size: 9, color: { argb: MAU_O.chuNhac } } });
    v.r++;
    const chuGiai: [ExcelJS.CellValue, KieuVung, string][] = [
      ["Ô NỀN ĐỎ", { nen: MAU_O.nenDo, font: { bold: true, size: 9, color: { argb: MAU_O.chuDo } } }, "Ghi sai thì máy hiểu sai việc (hạn, tình trạng, dự án, người phụ trách)."],
      ["Ô NỀN XANH", { nen: MAU_O.nenXanh, font: { bold: true, size: 9, color: { argb: MAU_O.chuXanh } } }, "Ghi theo kỳ — ghi sai thì GHI ĐÈ báo cáo đã nộp hoặc vào nhầm đơn vị."],
      [
        { richText: [{ text: "Chữ đỏ", font: { ...CHU, size: 9, bold: true, color: { argb: MAU_O.chuDo } } }, { text: " · ", font: { ...CHU, size: 9, bold: true } }, { text: "chữ xanh", font: { ...CHU, size: 9, bold: true, color: { argb: MAU_O.chuXanh } } }] },
        {},
        "Máy in sẵn — KHÔNG sửa. Dấu * — phải ghi. Ô trắng có khung — ghi tự do. Rê chuột vào ô để xem hướng dẫn.",
      ],
    ];
    for (const [mau1, kieu, giai] of chuGiai) {
      v.vung(v.r, 1, nhanRong, mau1, { ...kieu, khung: true, can: { horizontal: "center", vertical: "middle" } });
      v.vung(v.r, nhanRong + 1, G - nhanRong, giai, { font: { size: 9, color: { argb: MAU_O.chuInSan } }, can: { vertical: "middle" } });
      v.r++;
    }
  };
  let truoc: Khoi["loai"] | "" = "";
  for (const k of bc.khoi.filter((x, j) => !laDau(x, j))) {
    if (k.loai === "chuong") veChuGiai();
    const loaiTruoc = truoc;
    truoc = k.loai;
    if (k.loai === "chu") {
      const hoa = laInHoa(k.chu);
      v.ca(k.chu, { font: hoa || k.dam ? { bold: true, italic: !hoa, color: { argb: XANH_DAM } } : { italic: true, size: 9, color: { argb: MAU_O.chuNhac } } });
      continue;
    }
    if (k.loai === "o") {
      const n = nhanCua(k.tag, k.nhan);
      v.vung(v.r, 1, nhanRong, n.chu, { font: n.font, khung: true });
      veGiaTri(v.r, nhanRong + 1, G - nhanRong, k.tag, k.gia_tri, k.nhan, k.ds);
      ghiNhan(k.tag, k.nhan);
      v.r++;
      continue;
    }
    if (k.loai === "hang") {
      veHangLuoi(k.o);
      continue;
    }
    if (k.loai === "chuong") {
      v.r++; // một hàng trống trước chương cho dễ nhìn
      v.ca(k.chu, { font: { bold: true, size: 12, color: { argb: MAU_O.chuDo } }, can: { vertical: "bottom" } });
      continue;
    }
    veBang(k, loaiTruoc === "chuong");
  }
  veChuGiai();
  v.datCao();
  datKhoIn(ws, mau.ten, ngang, G, v.r);
  return kq;

  /** Lưới in sẵn của mẫu Word (Kỳ báo cáo, THÔNG TIN DỰ ÁN, bảng tóm tắt Form 4…) */
  function veHangLuoi(o: OLuoi[]) {
    const rong = chiaCot(o.map((x) => x.rong ?? 1), G);
    // Một ô có chữ, không ô nhập → tên nhóm
    if (o.length === 1 && !o[0].o) {
      v.ca(o[0].chu, KIEU_TIEU_DE);
      return;
    }
    // Hàng toàn chữ IN HOA (tiêu đề hai khối tóm tắt Form 4) → tiêu đề nền xanh đậm, mỗi ô một tên
    if (o.length > 1 && o.every((x) => !x.o && laInHoa(x.chu.replace(/\([^)]*\)/g, "")))) {
      let c = 1;
      o.forEach((x, j) => {
        v.vung(v.r, c, rong[j], x.chu, KIEU_TIEU_DE);
        c += rong[j];
      });
      v.r++;
      return;
    }
    const laHangTen = o.length > 1 && o.every((x) => !x.o && x.chu.trim() && x.chu.length <= 40 && !/\d/.test(x.chu));
    let c = 1;
    o.forEach((x, j) => {
      const sau = o[j + 1];
      if (x.o) {
        const nhanTruoc = j > 0 && !o[j - 1].o ? o[j - 1].chu.replace(/\s*:\s*$/, "") : x.o;
        veGiaTri(v.r, c, rong[j], x.o, x.chu, nhanTruoc, x.ds);
        ghiNhan(x.o, nhanTruoc);
      } else if (laHangTen) {
        v.vung(v.r, c, rong[j], x.chu, KIEU_TIEU_DE);
      } else if (x.chu && sau?.o) {
        const n = nhanCua(sau.o, x.chu.replace(/\s*:\s*$/, ""));
        v.vung(v.r, c, rong[j], n.chu, { font: n.font, khung: true, can: { vertical: "middle" } });
      } else if (x.chu) {
        v.vung(v.r, c, rong[j], x.chu, { font: { bold: true, color: { argb: MAU_O.chuInSan } }, khung: true });
      } else {
        // ô trống của lưới in sẵn = chỗ ghi số, ghi tự do
        const cell = v.vung(v.r, c, rong[j], "", { khung: true });
        const nhanTrai = j > 0 ? o[j - 1].chu : "";
        if (cheDo === "ghi" && nhanTrai) datNhac(cell, nhanTrai, hdCot("", nhanTrai, false, true));
      }
      c += rong[j];
    });
    v.r++;
  }

  /** Bảng gắn mã — hàng tên cột tầng trên (nếu có), hàng tên cột máy đọc, các dòng */
  function veBang(k: Extract<Khoi, { loai: "bang" }>, ngaySauChuong: boolean) {
    const bangViec = laBangViec(dn, k);
    const { w, coSo } = trongSoBang(k, tuy.goc);
    const rong = chiaCot(w, G);
    const dauCot = rong.map((_, j) => 1 + rong.slice(0, j).reduce((a, b) => a + b, 0));
    const kieuCot = k.cot.map((c) => loaiCot(bangViec, c.tag));

    if (bangViec && cheDo === "ghi" && ngaySauChuong)
      v.ca("Mỗi dòng MỘT việc · ô nền đỏ ghi sai thì máy hiểu sai việc · thiếu dòng thì chèn thêm ngay trong bảng (máy đọc hết) · rê chuột vào ô để xem hướng dẫn.", {
        font: { italic: true, size: 9, color: { argb: MAU_O.chuNhac } },
      });

    if (k.tren?.length) {
      let j = 0;
      for (const o of k.tren) {
        const n = Math.max(1, o.rong ?? 1);
        const tu = dauCot[Math.min(j, k.cot.length - 1)];
        const den = j + n - 1 < k.cot.length ? dauCot[j + n - 1] + rong[j + n - 1] - 1 : G;
        v.vung(v.r, tu, den - tu + 1, o.chu, KIEU_TIEU_DE);
        j += n;
      }
      v.r++;
    }
    kq.hangTieuDe[k.tag] = v.r;
    k.cot.forEach((cot, j) => {
      const kc = kieuCot[j];
      v.vung(
        v.r,
        dauCot[j],
        rong[j],
        `${cot.nhan}${kc.batBuoc ? " *" : ""}`,
        kc.loai === "trang" ? KIEU_TIEU_DE : { ...KIEU_TIEU_DE, font: { bold: true, color: { argb: CHU_LOAI[kc.loai] } }, nen: NEN_LOAI[kc.loai] },
      );
    });
    v.r++;

    const dong: DongBang[] = [...k.dong];
    if (cheDo === "ghi") {
      // Bảng việc của mẫu Word in sẵn 3 dòng trống — Excel cho sẵn 30; bảng khác chưa có dòng in sẵn → 8 dòng trống
      const coIn = k.dong.some((d) => "nhom" in d || Object.values(d.gt).some(Boolean));
      const can = bangViec ? DONG_TRONG_BANG_VIEC : coIn ? 0 : DONG_TRONG_BANG_KHAC;
      const trong = dong.filter((d) => "gt" in d && !Object.values(d.gt).some(Boolean)).length;
      for (let n = trong; n < can; n++) dong.push({ gt: {} });
    }
    for (const d of dong) {
      if ("nhom" in d) {
        v.ca(d.nhom, { font: { bold: true, color: { argb: XANH_DAM } }, khung: true });
        continue;
      }
      k.cot.forEach((cot, j) => {
        const gt = d.gt[cot.tag] ?? "";
        const inSan = banTrang && !!gt.trim();
        const c = v.vung(v.r, dauCot[j], rong[j], gt, {
          khung: true,
          nen: NEN_LOAI[kieuCot[j].loai],
          numFmt: COT_NGAY.has(cot.tag) ? "@" : undefined,
          font: inSan ? { color: { argb: MAU_O.chuInSan } } : undefined,
          can: /^(stt|uu_tien)$/.test(cot.tag) ? { horizontal: "center" } : coSo[j] && !inSan ? { horizontal: "right" } : undefined,
        });
        if (cheDo === "ghi" && !inSan) datNhac(c, cot.nhan, hdCot(cot.tag, cot.nhan, bangViec, coSo[j]), dsChon(k.tag, cot.tag, cot.ds), COT_NGAY_10.has(cot.tag));
      });
      const vd = bangViec ? VI_DU_VIEC.find((x) => x.ten === d.gt.ten) : undefined;
      if (vd) chuThich(v.r, vd._chu);
      v.r++;
    }
  }
}

// ---------------- tờ Hướng dẫn ----------------

function veHuongDan(ws: ExcelJS.Worksheet, m: MauCanVe, viDu: BoCuc | null, ghiChuWord: string[]) {
  const dn = m.mau.dinh_nghia;
  const RONG = [18, 32, 30, 22, 32];
  ws.columns = RONG.map((width) => ({ width }));
  const v = new Ve(ws, RONG.length, 0);
  const caoHang = new Map<number, number>();
  /** Một hàng 5 ô — Ô / cột · Ghi gì · Máy dùng làm gì · Ví dụ · Ghi sai thì sao */
  const hang = (vals: string[], kieu: KieuVung[] = []) => {
    vals.forEach((s, j) => {
      const c = ws.getCell(v.r, j + 1);
      c.value = s;
      c.alignment = { wrapText: true, vertical: "top", ...kieu[j]?.can };
      c.border = KHUNG;
      c.font = { ...CHU, ...kieu[j]?.font };
      if (kieu[j]?.nen) c.fill = nen(kieu[j].nen!);
      caoHang.set(v.r, Math.max(caoHang.get(v.r) ?? 1, soDong(s, RONG[j])));
    });
    v.r++;
  };
  const tongRong = RONG.reduce((a, b) => a + b, 0);
  const ca = (s: ExcelJS.CellValue, k: KieuVung = {}) => {
    const c = v.ca(s, k);
    if (typeof s === "string") caoHang.set(c.row as unknown as number, soDong(s, tongRong));
    return c;
  };
  const muc = (s: string) => {
    v.r++;
    ca(s, { font: { bold: true, size: 12, color: { argb: MAU_O.chuInSan } }, nen: MAU_O.nenBe });
  };

  ca(`HƯỚNG DẪN ĐIỀN — ${m.mau.ten.toLocaleUpperCase("vi-VN")}`, { font: { bold: true, size: 14, color: { argb: MAU_O.chuInSan } } });
  ca("Tờ này chỉ để đọc. Báo cáo ghi ở tờ «Mẫu trắng» — rê chuột vào từng ô ở đó cũng hiện đúng lời hướng dẫn của ô ấy.", {
    font: { italic: true, color: { argb: MAU_O.chuNhac } },
  });

  muc("BA ĐIỀU CẦN NHỚ");
  for (const [j, s] of [
    "Chỉ ghi ở tờ «Mẫu trắng». Máy không đọc tờ «Hướng dẫn» và tờ «Ví dụ đã điền». Không đổi tên tờ, không chép bảng từ tệp khác đè vào.",
    "Chữ đỏ, chữ xanh in đậm (dòng «Mã mẫu», tên chương, nhãn ô) và hàng tên cột nền xanh đậm do máy in sẵn: KHÔNG sửa, không xoá — máy đọc báo cáo theo đúng chữ đó.",
    "Ô nền XANH ghi theo kỳ: máy ghi sẵn tuần lúc tải mẫu, soát lại trước khi nộp. Không cần ghi người lập, ngày lập, không cần ký — máy tự ghi người nộp và ngày nộp.",
  ].entries())
    ca(`${j + 1}. ${s}`);

  muc("Ý NGHĨA MÀU — giống biểu mẫu agent Tiến độ");
  const mauY: [ExcelJS.CellValue, KieuVung, string][] = [
    ["Ô NỀN ĐỎ", { nen: MAU_O.nenDo, font: { bold: true, color: { argb: MAU_O.chuDo } } }, "Nơi ghi mà ghi sai thì máy hiểu sai việc: hạn, tình trạng, dự án, người phụ trách. Ghi đúng dạng như lời nhắc hiện khi rê chuột."],
    ["Ô NỀN XANH", { nen: MAU_O.nenXanh, font: { bold: true, color: { argb: MAU_O.chuXanh } } }, "Ghi theo kỳ: Kỳ báo cáo; Đơn vị lập của mẫu dùng chung. Ghi sai thì GHI ĐÈ báo cáo đã nộp, hoặc báo cáo vào nhầm đơn vị."],
    [
      { richText: [{ text: "Chữ đỏ", font: { bold: true, color: { argb: MAU_O.chuDo } } }, { text: " · ", font: { bold: true } }, { text: "chữ xanh", font: { bold: true, color: { argb: MAU_O.chuXanh } } }] },
      {},
      "Máy in sẵn — không sửa, không xoá. Tên cột chữ đỏ = cột nền đỏ bên dưới.",
    ],
    ["Dấu *", { font: { bold: true, color: { argb: MAU_O.chuInSan } } }, "Phải ghi. Bỏ trống thì máy báo lỗi, không nộp được."],
    ["Ô trắng có khung", {}, "Ghi tự do — người nhận đọc. Bảng chỉ có ô trắng không sinh việc."],
    ["Hàng tên cột", { nen: XANH_DAM, font: { bold: true, color: { argb: "FFFFFFFF" } } }, "Nền xanh đậm chữ trắng như bản Word — máy in sẵn, máy nhận cột theo đúng chữ này. Tên chương chữ đỏ đậm cũng vậy."],
  ];
  for (const [mau1, kieu, giai] of mauY) {
    v.vung(v.r, 1, 1, mau1, { ...kieu, khung: true, can: { vertical: "middle" } });
    v.vung(v.r, 2, 4, giai, { font: { color: { argb: MAU_O.chuInSan } }, khung: true });
    caoHang.set(v.r, soDong(giai, tongRong - RONG[0]));
    v.r++;
  }

  muc("GHI TỪNG Ô, TỪNG CỘT");
  const kieuTen: KieuVung = { font: { bold: true, color: { argb: "FFFFFFFF" } }, nen: XANH_DAM };
  hang(["Ô / cột", "Ghi gì", "Máy dùng để làm gì", "Ví dụ", "Ghi sai thì sao"], Array(5).fill(kieuTen));
  const nhom = (s: string) => ca(s, { font: { bold: true, color: { argb: MAU_O.chuInSan } }, nen: MAU_O.nenBe, khung: true });
  /** Ô đầu dòng tô đúng màu của ô / cột nó nói */
  const kieuDau = (loai: LoaiO): KieuVung[] => [{ nen: NEN_LOAI[loai], font: { bold: true, color: { argb: CHU_LOAI[loai] } } }];

  const oVd = new Map<string, string>();
  const bangVd = new Map<string, Record<string, string>>();
  for (const k of viDu?.khoi ?? []) {
    if (k.loai === "o") oVd.set(k.tag, k.gia_tri);
    if (k.loai === "hang") for (const o of k.o) if (o.o) oVd.set(o.o, o.chu);
    if (k.loai === "bang") {
      const d = k.dong.find((x): x is { gt: Record<string, string> } => "gt" in x && Object.values(x.gt).some(Boolean));
      if (d) bangVd.set(k.tag, d.gt);
    }
  }
  const giaTriTrang = new Map<string, string>();
  for (const k of m.trang.khoi) {
    if (k.loai === "o") giaTriTrang.set(k.tag, k.gia_tri);
    if (k.loai === "hang")
      k.o.forEach((o, j) => {
        if (o.o) giaTriTrang.set(o.o, o.chu);
        if (o.o && j > 0 && !k.o[j - 1].o) giaTriTrang.set(`nhan:${o.o}`, k.o[j - 1].chu.replace(/\s*:\s*$/, ""));
      });
  }

  nhom("THÔNG TIN CHUNG");
  const oTrang = m.trang.khoi.flatMap((k) => (k.loai === "o" ? [k.tag] : k.loai === "hang" ? k.o.flatMap((o) => (o.o ? [o.o] : [])) : []));
  for (const tag of Array.from(new Set(oTrang))) {
    const o = dn.o_nhap.find((x) => x.tag === tag);
    const nhan = o?.nhan ?? giaTriTrang.get(`nhan:${tag}`) ?? tag;
    const ko = kieuONhap(tag, giaTriTrang.get(tag) ?? "", !!o?.bat_buoc);
    const h = ko.inSan
      ? { ghi: `Máy in sẵn «${giaTriTrang.get(tag)}» — không sửa.`, de: "Máy biết báo cáo của đơn vị nào.", sai: "Sửa tên → báo cáo vào nhầm đơn vị, hoặc không nộp được." }
      : hdO(tag, nhan, ko.batBuoc);
    hang([`${nhan}${ko.batBuoc ? " *" : ""}`, h.ghi, h.de, tag === "ky_bao_cao" ? "Tuần 43/2026 (19/10/2026 – 25/10/2026)" : (oVd.get(tag) ?? ""), h.sai], kieuDau(ko.inSan ? "do" : ko.loai).map((x) => (ko.inSan ? { font: { bold: true, color: { argb: MAU_O.chuDo } } } : x)));
  }

  const chuongCua = new Map<string, string>();
  let ch = "";
  for (const k of m.trang.khoi) {
    if (k.loai === "chuong") ch = k.chu;
    if (k.loai === "bang") chuongCua.set(k.tag, ch);
  }
  for (const k of m.trang.khoi) {
    if (k.loai !== "bang") continue;
    nhom(chuongCua.get(k.tag) || k.tag);
    const vd = bangVd.get(k.tag) ?? {};
    const sinhViec = (dn.bang_cong_viec ?? []).find((b) => b.tag === k.tag);
    const bangViec = !!sinhViec || laBangViec(dn, k);
    const coIn = k.dong.some((d) => "nhom" in d || Object.values(d.gt).some(Boolean));
    if (!bangViec)
      hang(
        [
          "Cả bảng",
          coIn
            ? "Dòng in sẵn (chỉ tiêu, hạng mục, tên nhóm) giữ nguyên, chỉ ghi vào ô trống. Thiếu dòng: chèn dòng ngay trong bảng."
            : "Mỗi dòng một nội dung, ghi theo các cột. Thiếu dòng: chèn dòng ngay trong bảng.",
          k.so_lieu ? "Người nhận đọc số liệu. Bảng này không sinh việc." : "Người nhận đọc. Bảng này không sinh việc — việc cần làm ghi ở bảng «Kết quả và kế hoạch việc».",
          "",
          "Sửa chữ ở hàng tên cột → máy không nhận ra cột đó, báo lỗi khi nộp.",
        ],
        [{ font: { bold: true, color: { argb: MAU_O.chuInSan } } }],
      );
    const so: string[] = [];
    k.cot.forEach((cot) => {
      const coSo = laCotSo(cot.nhan, k.dong.flatMap((d) => ("gt" in d ? [d.gt[cot.tag] ?? ""] : [])));
      if (coSo && !bangViec) {
        so.push(cot.nhan);
        return;
      }
      const kc = loaiCot(bangViec, cot.tag);
      const h = hdCot(cot.tag, cot.nhan, bangViec, coSo);
      const de = sinhViec?.la_quyet_dinh && cot.tag === "ten" ? "Mỗi dòng là một việc chờ Tổng giám đốc giao tay." : h.de;
      const vdCot = (vd[cot.tag] || (bangViec ? VI_DU_VIEC[0][cot.tag] : "") || "").split("\n")[0];
      hang([`${cot.nhan}${kc.batBuoc ? " *" : ""}`, h.ghi, de, vdCot, h.sai], kieuDau(kc.loai));
    });
    if (so.length) {
      const h = hdCot("", "Các cột số", false, true);
      const vdSo = k.cot.filter((c) => so.includes(c.nhan)).map((c) => vd[c.tag]).filter(Boolean).slice(0, 3).join(" · ");
      hang([`Cột số: ${so.join(" · ")}`, h.ghi, h.de, vdSo, h.sai], kieuDau("trang"));
    }
  }

  muc("CÁCH NỘP");
  for (const s of [
    "1. Điền xong thì lưu tệp, giữ đuôi .xlsx (không lưu thành .xls hay .csv).",
    "2. Vào màn «Báo cáo» → bấm hoặc kéo thả tệp vào khung → máy đọc và kiểm ngay.",
    "3. Máy báo lỗi thì tải «bản đánh dấu lỗi»: ô lỗi tô màu, rê chuột xem cần sửa gì. Sửa đúng ô đó, lưu, tải lên lần nữa. Hết lỗi chặn thì bấm Gửi.",
    "4. Nộp lại cùng kỳ: bản mới thay bản cũ của kỳ đó.",
    ...(ghiChuWord.some((s) => /không xóa ô|chèn dòng/i.test(s)) ? ["5. Cần thêm dòng thì chèn dòng ngay trong bảng (chuột phải → Insert). Không xoá hàng tên cột."] : []),
  ])
    ca(s);
  for (const [r, n] of caoHang) if (n > 1) ws.getRow(r).height = Math.min(409, 13.5 * n + 3);
  datKhoIn(ws, `${m.mau.ten} — hướng dẫn`, false);
}

// ---------------- tờ máy đọc ----------------

/** Giá trị ví dụ đủ dài để làm "dấu" — chép nguyên ví dụ sang tờ Mẫu trắng thì máy nhận ra. */
function dauViDu(viDu: BoCuc | null, trang: BoCuc): string[] {
  const giaTri = (bc: BoCuc | null) =>
    (bc?.khoi ?? []).flatMap((k) => (k.loai === "bang" ? k.dong.flatMap((d) => ("gt" in d ? Object.values(d.gt).map((v) => v.trim()) : [])) : []));
  // Chữ in sẵn ở cả tờ trắng (tên chỉ tiêu, hạng mục) không phải dấu ví dụ
  const inSan = new Set(giaTri(trang));
  const kq: string[] = [];
  for (const v of giaTri(viDu)) if (v.length >= 15 && !inSan.has(v) && !kq.includes(v)) kq.push(v);
  return kq.slice(0, 40);
}

/** Số ô bảng có chữ in sẵn ở bản trắng — bộ đọc so để biết tờ còn trắng */
function soOInSan(trang: BoCuc): number {
  return trang.khoi.reduce((a, k) => a + (k.loai === "bang" ? k.dong.reduce((b, d) => b + ("gt" in d ? Object.values(d.gt).filter((x) => x.trim()).length : 0), 0) : 0), 0);
}

function veToMay(ws: ExcelJS.Worksheet, m: MauCanVe, ve: VeTo, viDu: BoCuc | null) {
  ws.state = "veryHidden";
  const them = (...v: (string | number)[]) => ws.addRow(v);
  them("ma_mau", m.mau.ma);
  them("phien_ban", m.mau.phien_ban);
  them("to_ghi", TO_GHI);
  if (ve.kySan) them("ky_san", ve.kySan);
  them("o_in_san", soOInSan(m.trang));
  for (const o of ve.nhanO) them("o", o.tag, o.nhan);
  let ch = "";
  for (const k of m.trang.khoi) {
    if (k.loai === "chuong") {
      ch = k.chu;
      them("chuong", k.chu);
    }
    if (k.loai === "bang") {
      them("bang", k.tag, k.so_lieu ? 1 : 0, k.co_nhom ? 1 : 0, ch, ve.hangTieuDe[k.tag] ?? 0);
      for (const c of k.cot) them("cot", k.tag, c.tag, c.nhan);
    }
  }
  for (const v of dauViDu(viDu, m.trang)) them("vi_du", v);
}

/** Dựng tệp .xlsx ba tờ của một mẫu. */
export async function dungTepExcel(m: MauCanVe, daDien?: BoCuc): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "SCI Công việc";
  wb.title = m.mau.ten;
  const viDu = m.vi_du ? boCucViDu(m.mau.dinh_nghia, m.vi_du) : null;
  const ghi = wb.addWorksheet(TO_GHI);
  // Tờ để ghi vẽ bản đã điền (nếu có); tờ máy đọc + dấu ví dụ luôn tính theo bản TRẮNG (chữ in sẵn của mẫu)
  const ve = veTo(ghi, m.mau, daDien ? { ...daDien, ghi_chu: m.trang.ghi_chu } : m.trang, "ghi", { goc: m.trang, ghiSanKy: !daDien });
  veHuongDan(wb.addWorksheet(TO_HUONG_DAN), m, viDu, m.trang.ghi_chu);
  const toVd = wb.addWorksheet(TO_VI_DU);
  if (viDu) veTo(toVd, m.mau, viDu, "vi_du", { goc: m.trang });
  else toVd.getCell(1, 1).value = "Mẫu này chưa có bản ví dụ.";
  veToMay(wb.addWorksheet(TO_MAY), { ...m, vi_du: viDu }, ve, viDu);
  wb.views = [{ x: 0, y: 0, width: 20000, height: 12000, firstSheet: 0, activeTab: 0, visibility: "visible" }];
  return Buffer.from(await wb.xlsx.writeBuffer());
}

/**
 * Tệp .xlsx từ một báo cáo Word ĐÃ ĐIỀN (trợ lý «Làm báo cáo» vẫn điền mẫu Word rồi đổi sang Excel — Mr. Đại chốt đợt 1):
 * số liệu đã điền nằm ở tờ «Mẫu trắng», hai tờ còn lại như tệp mẫu.
 */
export async function dungTepExcelTuBaoCao(m: MauCanVe, daDien: BoCuc): Promise<Buffer> {
  return dungTepExcel(m, daDien);
}
