// ============================================================
// phong-hop/thuan.ts — PHÒNG HỌP (Mr. Đại chốt 25/10/2026; đề xuất DE-XUAT-PHONG-HOP-25-10.md, câu chốt A). File THUẦN (luật 10).
//   · Ba phòng trên ảnh mặt bằng (public/phong-hop/mat-bang.webp, 1295 × 1215): vị trí theo % để ảnh co giãn vẫn khớp.
//   · Giờ họp theo GIỜ LÀM VIỆC (Mr. Đại chốt 25/10/2026: bỏ 06:00–08:00, 12:00–13:30, 17:00–18:00): 08:00–12:00 và 13:30–17:00,
//     mỗi ô 30 phút (15 ô/phòng). Giờ luôn là giờ Việt Nam (luật 44).
//   · Màu ô (luật 18 — định nghĩa ở chú thích dưới thanh giờ): xanh lá = trống · vàng = đã có người đặt · đỏ = đang họp (giờ hiện
//     tại nằm trong cuộc họp; Mr. Đại chốt trực tiếp — ngoại lệ «đỏ dành cho Issue») · xám = giờ đã qua.
// ============================================================

export interface PhongHop {
  id: string;
  ten: string;
  so_ghe: number;
  /** khung phòng trên ảnh, % theo bề ngang / bề cao ảnh */
  khung: { x: number; y: number; w: number; h: number };
  /** biển trên cửa (% ảnh) */
  bien: { x: number; y: number };
  /** tâm các ghế (điểm ảnh trên ảnh gốc 1295 × 1215) — để vẽ người ngồi khi đang họp. Ghế ĐẦU TIÊN = ghế chủ toạ (đầu bàn) */
  ghe: [number, number][];
}

export const ANH_RONG = 1295;
export const ANH_CAO = 1215;

const hang = (x0: number, x1: number, n: number, y: number): [number, number][] =>
  Array.from({ length: n }, (_, i) => [n === 1 ? x0 : x0 + ((x1 - x0) * i) / (n - 1), y] as [number, number]);
const cot = (x: number, y0: number, y1: number, n: number): [number, number][] =>
  Array.from({ length: n }, (_, i) => [x, n === 1 ? y0 : y0 + ((y1 - y0) * i) / (n - 1)] as [number, number]);

// Số ghế đếm trên ảnh 25/10: P.01 8 · P.03 10 · P.09 20 quanh bàn + 4 ghế sát tường
export const PHONG_HOP: PhongHop[] = [
  {
    id: "p01",
    ten: "Phòng họp 01",
    so_ghe: 8,
    khung: { x: 34.0, y: 1.0, w: 20.1, h: 25.0 },
    bien: { x: 44.1, y: 22.5 },
    ghe: [[580, 82], ...cot(524, 110, 186, 3), ...cot(634, 110, 186, 3), [580, 222]],
  },
  {
    id: "p03",
    ten: "Phòng họp 03",
    so_ghe: 10,
    khung: { x: 55.1, y: 1.0, w: 19.4, h: 25.0 },
    bien: { x: 64.8, y: 22.5 },
    ghe: [[838, 82], ...cot(782, 110, 222, 4), ...cot(892, 110, 222, 4), [838, 258]],
  },
  {
    id: "p09",
    ten: "Phòng họp 09",
    so_ghe: 24,
    khung: { x: 38.6, y: 65.0, w: 48.0, h: 31.9 },
    bien: { x: 62.6, y: 69.5 },
    ghe: [[660, 966], [660, 930], [660, 1003], ...hang(707, 953, 7, 885), ...hang(707, 953, 7, 1045), ...cot(990, 930, 1003, 3), ...hang(800, 935, 4, 1110)],
  },
];
export const phongTheoId = (id: string): PhongHop | undefined => PHONG_HOP.find((p) => p.id === id);

// ---------------- giờ ----------------
export const BUOC_PHUT = 30;
/** Hai buổi làm việc [bắt đầu, kết thúc) — thanh giờ, lịch các phòng và giờ chọn được đều theo đây */
export const BUOI: [string, string][] = [
  ["08:00", "12:00"],
  ["13:30", "17:00"],
];
export const GIO_DAU = BUOI[0][0];
export const GIO_CUOI = BUOI[BUOI.length - 1][1];
export const CHU_BUOI = BUOI.map(([a, b]) => `${a} – ${b}`).join(" và ");
export const phut = (hhmm: string): number => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
};
export const gio = (p: number): string => `${String(Math.floor(p / 60)).padStart(2, "0")}:${String(p % 60).padStart(2, "0")}`;
/** 15 ô: "08:00" … "11:30", "13:30" … "16:30" */
export const CAC_O: string[] = BUOI.flatMap(([a, b]) => Array.from({ length: (phut(b) - phut(a)) / BUOC_PHUT }, (_, i) => gio(phut(a) + i * BUOC_PHUT)));
/** Ô đầu buổi chiều (để vẽ khoảng nghỉ trưa) */
export const DAU_BUOI = new Set(BUOI.slice(1).map((b) => b[0]));
/** Mốc giờ chọn được ở ô «Bắt đầu» / «Kết thúc» (một cuộc họp có thể kéo qua trưa, vd 11:00 – 14:00) */
export const MOC_BAT_DAU = CAC_O;
export const MOC_KET_THUC = CAC_O.map((o) => gio(phut(o) + BUOC_PHUT));

/** Bây giờ theo giờ Việt Nam: { ngay: 'YYYY-MM-DD', phut } (luật 44) */
export function bayGioVN(ms: number = Date.now()): { ngay: string; phut: number; gio: string } {
  const iso = new Date(ms + 7 * 3600_000).toISOString();
  const p = Number(iso.slice(11, 13)) * 60 + Number(iso.slice(14, 16));
  return { ngay: iso.slice(0, 10), phut: p, gio: iso.slice(11, 16) };
}

/** «2 giờ · 15:00 – 17:00» · «30 phút · 09:00 – 09:30» (luật 31, khoảng tính bằng giờ) */
export function khoangGio(tu: string, den: string): string {
  const d = phut(den) - phut(tu);
  const h = Math.floor(d / 60);
  const m = d % 60;
  const dai = h && m ? `${h} giờ ${m} phút` : h ? `${h} giờ` : `${m} phút`;
  return `${dai} · ${tu} – ${den}`;
}
/** dd/mm/yyyy */
export const ngayVN = (iso: string): string => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
export const THU = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
/** 1 = Thứ Hai … 7 = Chủ nhật (khuôn cột phong_hop_giao_ban.thu) */
export const thuCua = (iso: string): number => {
  const d = new Date(`${iso}T00:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
};
export const tenThu = (thu: number): string => THU[thu % 7];
export function congNgay(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
/** Ngày có thật trên lịch (2026-02-31 → sai) — chặn trước khi tới cơ sở dữ liệu, không để lỗi tiếng Anh lọt ra */
export const laNgayThat = (iso: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(iso) && !Number.isNaN(Date.parse(`${iso}T00:00:00Z`)) && new Date(`${iso}T00:00:00Z`).toISOString().slice(0, 10) === iso;
/** Đường dẫn họp trực tuyến: chỉ nhận http:// hoặc https:// (chặn «javascript:…» thành link bấm được — kiểm độc lập lần 7, X1) */
export const laDuongDanHop = (s: string): boolean => /^https?:\/\/[^\s<>"]+$/i.test(s.trim());
/** Buổi giao ban kế tiếp: ngày «thu» gần nhất từ hôm nay; hôm nay đúng thứ đó mà giờ bắt đầu đã không còn đặt được
 *  (đã qua ô bắt đầu — cùng luật mocBatDauCho) thì sang tuần sau. Kiểm lần 7 X6: trước tính theo giờ kết thúc nên
 *  Thứ Hai 15:30–17:00 màn hiện «hôm nay» mà bấm gửi lại báo «Giờ họp đã qua». */
export function ngayGiaoBanKeTiep(thu: number, tu: string, bay = bayGioVN()): string {
  let n = (thu - thuCua(bay.ngay) + 7) % 7;
  if (n === 0 && phut(tu) + BUOC_PHUT <= bay.phut) n = 7;
  return congNgay(bay.ngay, n);
}

// ---------------- cuộc họp ----------------
export interface NguoiDu {
  id: string;
  ten: string;
}
export interface CuocHop {
  id: number;
  phong: string;
  ngay: string;
  tu: string;
  den: string;
  noi_dung: string;
  ghi_chu: string | null;
  khach_ngoai: string | null;
  duong_dan: string | null;
  loai: "thuong" | "giao_ban";
  nguoi_dat: string;
  nguoi_dat_ten: string;
  moi: NguoiDu[];
  /** true = người xem không phải người đặt / người được mời / quản trị → ghi chú, đường dẫn họp, khách ngoài đã được ẩn (Mr. Đại chốt 26/10/2026) */
  an_chi_tiet?: boolean;
}

/** Ghi chú · đường dẫn họp · khách ngoài: CHỈ người đặt, người được mời và quản trị xem được (Mr. Đại chốt 26/10/2026, Q2 kiểm lần 7).
 *  Người khác vẫn thấy phòng, giờ, nội dung, người tổ chức, người dự — đủ để biết phòng bận. Lọc ở máy chủ trước khi trả về. */
export function locChiTietCuoc(c: CuocHop, nd: { id: string; la_quan_tri?: boolean }): CuocHop {
  if (nd.la_quan_tri || c.nguoi_dat === nd.id || c.moi.some((m) => m.id === nd.id)) return c;
  return { ...c, ghi_chu: null, khach_ngoai: null, duong_dan: null, an_chi_tiet: true };
}
/** Hai khoảng giờ chồng nhau (chạm mép không tính: 09:00–10:00 và 10:00–11:00 không trùng) */
export const chong = (a: { tu: string; den: string }, b: { tu: string; den: string }): boolean => phut(a.tu) < phut(b.den) && phut(b.tu) < phut(a.den);

/** Buổi (0 sáng, 1 chiều) của một ô bắt đầu lúc o; -1 = ngoài giờ làm việc */
export const buoiCua = (o: string): number => BUOI.findIndex(([a, b]) => phut(a) <= phut(o) && phut(o) < phut(b));
/** Giờ kết thúc chọn được khi bắt đầu lúc tu: cùng buổi, sau tu (không họp xuyên nghỉ trưa — Mr. Đại 25/10/2026) */
export const mocKetThucCho = (tu: string): string[] => {
  const b = BUOI[buoiCua(tu)];
  return b ? MOC_KET_THUC.filter((o) => phut(o) > phut(tu) && phut(o) <= phut(b[1])) : [];
};
/** Ô bắt đầu chọn được trong ngày: hôm nay bỏ các ô đã hết (ô đang chạy vẫn chọn được — họp ngay bây giờ) */
export const mocBatDauCho = (ngay: string, bay = bayGioVN()): string[] =>
  ngay < bay.ngay ? [] : ngay > bay.ngay ? MOC_BAT_DAU : MOC_BAT_DAU.filter((o) => phut(o) + BUOC_PHUT > bay.phut);

/** Một cuộc họp: chưa diễn ra · đang diễn ra · đã xong */
export function trangThaiCuoc(c: { ngay: string; tu: string; den: string }, bay = bayGioVN()): "sap" | "dang" | "xong" {
  if (c.ngay > bay.ngay || (c.ngay === bay.ngay && phut(c.tu) > bay.phut)) return "sap";
  if (c.ngay === bay.ngay && bay.phut < phut(c.den)) return "dang";
  return "xong";
}
/** Kết thúc sớm: cuộc đang họp trả phòng từ mốc 30 phút kế tiếp (vd đang 15:40 → kết thúc 16:00) */
export const denKetThucSom = (bay = bayGioVN()): string => gio(Math.ceil((bay.phut + 1) / BUOC_PHUT) * BUOC_PHUT);

export type MauO = "trong" | "dat" | "dang" | "qua";
/** Màu một ô 30 phút: cuộc họp đã xong → xám (như giờ đã qua), đang diễn ra → đỏ, chưa tới → vàng; không có cuộc → trống / đã qua */
export function mauO(ds: CuocHop[], phong: string, ngay: string, o: string, bay = bayGioVN()): { mau: MauO; cuoc?: CuocHop } {
  const khung = { tu: o, den: gio(phut(o) + BUOC_PHUT) };
  const cuoc = ds.find((c) => c.phong === phong && c.ngay === ngay && chong(c, khung));
  if (cuoc) {
    const tt = trangThaiCuoc(cuoc, bay);
    return { mau: tt === "dang" ? "dang" : tt === "sap" ? "dat" : "qua", cuoc };
  }
  const qua = ngay < bay.ngay || (ngay === bay.ngay && phut(khung.den) <= bay.phut);
  return { mau: qua ? "qua" : "trong" };
}

/** Trạng thái phòng trên ảnh: đang họp (đỏ, vẽ người) · có lịch sắp tới hôm nay (vàng) · tắt (xám — không còn cuộc nào tới 17:00) */
export function trangThaiPhong(ds: CuocHop[], phong: string, bay = bayGioVN()): { tt: "dang" | "sap" | "tat"; cuoc?: CuocHop } {
  const homNay = ds.filter((c) => c.phong === phong && c.ngay === bay.ngay).sort((a, b) => phut(a.tu) - phut(b.tu));
  const dang = homNay.find((c) => phut(c.tu) <= bay.phut && bay.phut < phut(c.den));
  if (dang) return { tt: "dang", cuoc: dang };
  const sap = homNay.find((c) => phut(c.tu) > bay.phut);
  return sap ? { tt: "sap", cuoc: sap } : { tt: "tat" };
}

export interface DatHopVao {
  phong: string;
  ngay: string;
  tu: string;
  den: string;
  noi_dung: string;
  duong_dan?: string | null;
}
/** Kiểm đầu vào đặt phòng — trả câu lỗi tiếng Việt, hoặc null nếu hợp lệ. Trùng phòng kiểm riêng (cần dữ liệu) */
export function loiDatHop(v: DatHopVao, bay = bayGioVN()): string | null {
  if (!phongTheoId(v.phong)) return "Chưa chọn phòng họp";
  if (!v.ngay) return "Chưa chọn ngày họp";
  if (!laNgayThat(v.ngay)) return `Ngày họp ${v.ngay} không có trên lịch`;
  if (v.duong_dan && !laDuongDanHop(v.duong_dan)) return "Đường dẫn họp trực tuyến phải bắt đầu bằng http:// hoặc https://";
  if (!MOC_BAT_DAU.includes(v.tu)) return `Giờ họp trong giờ làm việc ${CHU_BUOI}, bước 30 phút — giờ bắt đầu ${v.tu || "trống"} không hợp lệ`;
  if (!MOC_KET_THUC.includes(v.den)) return `Giờ họp trong giờ làm việc ${CHU_BUOI}, bước 30 phút — giờ kết thúc ${v.den || "trống"} không hợp lệ`;
  if (phut(v.den) <= phut(v.tu)) return "Giờ kết thúc phải sau giờ bắt đầu";
  if (!mocKetThucCho(v.tu).includes(v.den)) return "Một cuộc họp nằm trong một buổi — không họp xuyên giờ nghỉ trưa 12:00 – 13:30";
  if (!mocBatDauCho(v.ngay, bay).includes(v.tu)) return "Giờ họp đã qua — chọn giờ khác";
  if (!v.noi_dung.trim()) return "Chưa ghi nội dung họp";
  return null;
}
/** Cuộc họp đang giữ phòng đó trùng giờ (bỏ qua chính nó khi sửa) */
export const cuocTrung = (ds: CuocHop[], v: DatHopVao, boQua?: number): CuocHop | undefined =>
  ds.find((c) => c.id !== boQua && c.phong === v.phong && c.ngay === v.ngay && chong(c, v));
export const cauTrung = (c: CuocHop): string =>
  `${phongTheoId(c.phong)?.ten ?? c.phong} đã có ${c.nguoi_dat_ten} đặt ${khoangGio(c.tu, c.den)} ngày ${ngayVN(c.ngay)} («${c.noi_dung}») — chọn giờ hoặc phòng khác, hoặc nhờ người đặt nhường`;

// ---------------- dòng chữ đỏ ở thanh trên ----------------
export interface HopCuaToi extends CuocHop {
  /** đã bấm xem chưa */
  da_xem: boolean;
}
/** Nhấp nháy khi: chưa bấm xem · hoặc còn ≤ 15 phút tới giờ họp. Đang họp / ngoài hai lúc đó: chữ đỏ đứng yên */
export const PHUT_NHAC_TRUOC = 15;
export function nhapNhay(c: HopCuaToi, bay = bayGioVN()): boolean {
  if (!c.da_xem) return true;
  const con = phut(c.tu) - bay.phut;
  return c.ngay === bay.ngay && con > 0 && con <= PHUT_NHAC_TRUOC;
}
/** «15:00 họp giao ban tuần · P.09» — hôm khác thì kèm ngày */
export function chuDongHop(c: CuocHop, bay = bayGioVN()): string {
  const ngay = c.ngay === bay.ngay ? "" : c.ngay === congNgay(bay.ngay, 1) ? "mai " : `${tenThu(thuCua(c.ngay))} ${ngayVN(c.ngay).slice(0, 5)} `;
  const dang = c.ngay === bay.ngay && phut(c.tu) <= bay.phut ? "đang họp: " : "";
  return `${dang}${ngay}${c.tu} họp ${c.noi_dung} · ${phongTheoId(c.phong)?.ten ?? c.phong}`;
}
/** Cuộc họp còn hiện ở thanh trên: chưa kết thúc */
export const conHien = (c: CuocHop, bay = bayGioVN()): boolean => c.ngay > bay.ngay || (c.ngay === bay.ngay && phut(c.den) > bay.phut);

// ---------------- thành phần mời ----------------
/** Nhóm đặc biệt: Ban lãnh đạo (các chức danh lãnh đạo) · Trưởng các phòng (đầu các đơn vị loại «phòng») */
export const NHOM_MOI = [
  { id: "bld", ten: "Ban lãnh đạo" },
  { id: "truong_phong", ten: "Trưởng các phòng" },
] as const;
export type MucMoi = { loai: "nhom" | "don_vi" | "nguoi"; id: string };
export const laMucMoi = (x: unknown): x is MucMoi =>
  !!x && typeof x === "object" && ["nhom", "don_vi", "nguoi"].includes((x as MucMoi).loai) && typeof (x as MucMoi).id === "string" && !!(x as MucMoi).id;

// ---------------- người ngồi trong phòng đang họp (Mr. Đại chốt 25/10/2026) ----------------
//   · Tên ngắn trên đầu: hai chữ cuối của họ tên («Nguyễn Chính Đại» → «Chính Đại»); rê chuột mới hiện đủ tên.
//   · Chủ tịch HĐQT: vòng ĐỎ nhấp nháy trên đầu, không ghi tên · Tổng giám đốc: vòng XANH LÁ, không ghi tên.
//   · Ghế chủ toạ: người cấp cao nhất trong số người dự; không ai cao hơn người tạo thì là người tạo.
//     Hai người đồng cấp cao nhất (vd hai Phó tổng): người tạo nếu là một trong hai; không phân được thì để trống ghế chủ toạ.
export interface NguoiDanhMuc {
  id: string;
  ten: string;
  don_vi: string | null;
  chuc_vu?: string | null;
  /** đơn vị chức danh lãnh đạo người này giữ (bld-…), nếu có */
  bld?: string | null;
}
export const tenNganNguoi = (ten: string): string => {
  const chu = ten.trim().split(/\s+/);
  return chu.slice(-2).join(" ");
};
const CAP_BLD: Record<string, number> = { "bld-ct-hdqt": 1, "bld-pct-hdqt": 2, "bld-tgd": 3, "bld-troly-ct": 5 };
/** Cấp bậc để xếp chủ toạ — số NHỎ là cấp CAO */
export function capBac(n: Pick<NguoiDanhMuc, "bld" | "chuc_vu"> | undefined): number {
  if (!n) return 9;
  if (n.bld) return CAP_BLD[n.bld] ?? (n.bld.startsWith("bld-ptgd") ? 4 : 5);
  const cv = (n.chuc_vu ?? "").trim().toLowerCase();
  if (/^phó/.test(cv)) return 7;
  if (/^(trưởng|giám đốc)/.test(cv)) return 6;
  return 8;
}
/** Vòng trên đầu: đỏ nhấp nháy = Chủ tịch HĐQT · xanh dương = Phó chủ tịch HĐQT (Mr. Đại 26/10/2026) · xanh lá = Tổng giám đốc ·
 *  không có = ghi tên ngắn */
export type VongDau = "do" | "xanh-duong" | "xanh";
export const vongDau = (n: Pick<NguoiDanhMuc, "bld"> | undefined): VongDau | null =>
  n?.bld === "bld-ct-hdqt" ? "do" : n?.bld === "bld-pct-hdqt" ? "xanh-duong" : n?.bld === "bld-tgd" ? "xanh" : null;

export interface ChoNgoi {
  nguoi: NguoiDu;
  x: number;
  y: number;
  chu_toa: boolean;
  vong: VongDau | null;
}
/** Xếp người dự vào ghế (tối đa bằng số ghế): chủ toạ ở ghế đầu bàn, người còn lại theo cấp bậc rồi theo tên */
export function xepGhe(c: CuocHop, danhMuc: Map<string, NguoiDanhMuc>): ChoNgoi[] {
  const p = phongTheoId(c.phong);
  if (!p) return [];
  const cap = (id: string) => capBac(danhMuc.get(id));
  const ds = [...c.moi].sort((a, b) => cap(a.id) - cap(b.id) || a.ten.localeCompare(b.ten, "vi"));
  if (!ds.length) return [];
  const caoNhat = cap(ds[0].id);
  const dongCap = ds.filter((n) => cap(n.id) === caoNhat);
  // Đồng cấp cao nhất mà không phân được (người tạo không nằm trong số đó) → ĐỂ TRỐNG ghế chủ toạ (Mr. Đại chốt 25/10/2026)
  const chuToa = dongCap.length === 1 ? dongCap[0] : dongCap.find((n) => n.id === c.nguoi_dat);
  const khac = ds.filter((n) => n.id !== chuToa?.id);
  const ra: ChoNgoi[] = [];
  if (chuToa) ra.push({ nguoi: chuToa, x: p.ghe[0][0], y: p.ghe[0][1], chu_toa: true, vong: vongDau(danhMuc.get(chuToa.id)) });
  khac.slice(0, p.ghe.length - 1).forEach((n, i) => ra.push({ nguoi: n, x: p.ghe[i + 1][0], y: p.ghe[i + 1][1], chu_toa: false, vong: vongDau(danhMuc.get(n.id)) }));
  return ra;
}

/** Đơn vị KHÔNG ngồi ở văn phòng công ty (Mr. Đại chốt 25/10/2026): nhà máy đang vận hành · Ban điều hành tổng thầu — nhận theo tên */
export const laDonViNgoaiVP = (d: { ten: string; ten_ngan: string }): boolean =>
  /^(nhà máy|nm|ban điều hành|bđh)(\s|$)/i.test(d.ten_ngan.normalize("NFC").trim()) || /^(nhà máy|ban điều hành)(\s|$)/i.test(d.ten.normalize("NFC").trim());
