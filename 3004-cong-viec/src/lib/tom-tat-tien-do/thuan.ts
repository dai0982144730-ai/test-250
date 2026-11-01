// ============================================================
// TÓM TẮT TIẾN ĐỘ DỰ ÁN — phần THUẦN (luật 10: không đụng node:fs, trang client import thẳng được).
// Mr. Đại giao 13/10/2026: bảng tiến độ RÚT GỌN của một dự án, nạp bằng tệp Excel, vẽ thành Gantt ngay ở menu Dự án.
// Đây là BẢN NHÁP để xem bằng mắt trước khi nạp tệp cuối cùng lên agent Tiến độ — KHÔNG nối với sổ cái, cây việc, đường găng,
// không agent nào đọc nó. Tệp nạp: trang tính đầu tiên, sáu cột WBS · Công việc · Đơn vị · Khối lượng · Bắt đầu · Kết thúc.
// ============================================================
import { docSoNguoiGo } from "@/lib/chung/doc-so";
import { cachNgay, congNgay, khoangNgay, ngayVN } from "@/lib/phong/tuan";

export interface DongTomTat {
  wbs: string;
  ten: string;
  don_vi: string | null;
  khoi_luong: number | null;
  /** yyyy-mm-dd */
  bat_dau: string | null;
  ket_thuc: string | null;
  /** Bảng lấy từ agent Tiến độ: mã WBS bên Tiến độ để HIỆN (wbs ở trên là mã trong bảng này — có thêm «0.» đầu, vì cấp 1 là tên dự án) */
  ma?: string;
  /** Bảng lấy từ agent Tiến độ: đủ số của dòng Gantt (cổng tiendo.bang_gantt) — màn chỉ VẼ */
  td?: DongGanttTD;
}

export interface BanTomTat {
  du_an: string;
  ten_tep: string;
  /** ISO có giờ */
  nap_luc: string;
  nap_boi: string;
  nap_boi_ten: string;
  dong: DongTomTat[];
  /** Có = bảng lấy từ agent Tiến độ (không phải nạp tay) */
  tien_do?: TienDoBang;
}

// ---------- Bảng lấy từ agent Tiến độ (Mr. Đại duyệt 26/10/2026, DE-XUAT-TOM-TAT-TIEN-DO-DONG-BO-26-10.md) ----------
// Dự án có Baseline ĐÃ DUYỆT bên agent Tiến độ → bảng = Gantt cấp 1–3 bên đó (giống bấm nút «C3»), thêm MỘT dòng tên dự án làm
// cấp 1 (3004: cấp 1 = tên dự án; Tiến độ: cấp 1 = giai đoạn). Nút «Nạp tiến độ» khoá. Màu, nét theo đúng Gantt agent Tiến độ.

type KhoangTD = { bd: string; kt: string };
/**
 * Hộp chi tiết khi rê chuột — DO AGENT TIẾN ĐỘ DỰNG SẴN (lib/hop-chi-tiet-gantt, 29/10/2026): chữ, màu (mã CSS), thứ tự dòng đều
 * nằm bên đó; ở đây chỉ VẼ lại. Muốn đổi nội dung hộp thì sửa bên agent Tiến độ, cả ba màn đổi theo.
 */
export interface HopChiTietTD {
  ma: string;
  ten: string;
  dong: { nhan: string; chu: string; mau: string }[];
  ghiChu: { chu: string; mau: string }[];
  cham: { chu: string; mau: string }[];
}
/** Một dòng của cổng tiendo.bang_gantt (5-Agent-tien-do/src/lib/mcp/bang-gantt.ts) */
export interface DongGanttTD {
  wbs: string;
  ten: string;
  cap: number;
  nhom: boolean;
  moc: boolean;
  ke_hoach: KhoangTD;
  baseline_duyet: KhoangTD | null;
  muc_tieu: KhoangTD | null;
  thanh_nhom: KhoangTD | null;
  thuc_te: { bd: string; kt: string; xong: boolean; ket_thuc_that: string | null } | null;
  /** 26/10/2026: báo cáo cuối đã cũ — đoạn chưa có báo cáo (nét xám); bản cổng cũ không có trường này */
  cho_bao_cao?: KhoangTD | null;
  du_bao: KhoangTD | null;
  gang: boolean;
  gang_du_bao: boolean;
  /** null = dòng tên dự án (không có số % chung) */
  pct: number | null;
  /** % THẬT khi vượt khối lượng thiết kế hoặc vượt BOQ (cổng từ 29/10/2026) — null / vắng = không vượt; cột «% TH» tô vàng */
  vuot_pct?: number | null;
  kl: { th: number | null; tk: number; don_vi: string; theo: string } | null;
  theo_tien_boq: boolean;
  du_bao_xong: string | null;
  du_bao_bat_dau: string | null;
  ly_do_du_bao: string | null;
  nha_thau_hua: string | null;
  cham_so_muc_tieu: { ngay: number | null; cau: string } | null;
  cham_so_baseline: { ngay: number | null; cau: string } | null;
  /** Hộp chi tiết dựng sẵn; bản cổng cũ không có trường này */
  hop?: HopChiTietTD;
}
export interface TienDoBang {
  ma_tien_do: string;
  /** Lúc lấy số từ agent Tiến độ (ISO) — số cũ quá 5 phút thì màn ghi giờ lấy (luật 39: có số cũ thì dùng kèm giờ lấy số) */
  lay_luc?: string;
  phien_ban_baseline: number | null;
  baseline_duyet_luc: string | null;
  co_muc_tieu: boolean;
  ngay_bao_cao: string | null;
  cod_muc_tieu: string | null;
  cod_baseline: string | null;
  cod_du_bao: string | null;
}
export interface TraBangGantt extends Omit<TienDoBang, "ma_tien_do"> {
  co_baseline_duyet: boolean;
  dong: DongGanttTD[];
}

const minNgay = (ds: (string | null | undefined)[]) => ds.filter((x): x is string => !!x).reduce<string | null>((a, b) => (a === null || b < a ? b : a), null);
const maxNgay = (ds: (string | null | undefined)[]) => ds.filter((x): x is string => !!x).reduce<string | null>((a, b) => (a === null || b > a ? b : a), null);
const gop = (ds: (KhoangTD | null)[]): KhoangTD | null => {
  const bd = minNgay(ds.map((k) => k?.bd));
  const kt = maxNgay(ds.map((k) => k?.kt));
  return bd && kt ? { bd, kt } : null;
};

/** Bảng cổng → bản tóm tắt để màn vẽ: dòng «0» = tên dự án, dòng «0.<mã>» = từng dòng bên Tiến độ (giữ thứ tự bên đó) */
export function banTuBangGantt(duAn: { id: string; ten: string }, ma_tien_do: string, b: TraBangGantt, luc: string): BanTomTat {
  const cap1 = b.dong.filter((d) => d.cap === 1);
  const goc: DongGanttTD = {
    wbs: "",
    ten: duAn.ten,
    cap: 0,
    nhom: true,
    moc: false,
    ke_hoach: gop(cap1.map((d) => d.ke_hoach)) ?? { bd: "", kt: "" },
    baseline_duyet: gop(cap1.map((d) => d.baseline_duyet)),
    muc_tieu: gop(cap1.map((d) => d.muc_tieu)),
    thanh_nhom: gop(cap1.map((d) => d.thanh_nhom ?? d.ke_hoach)),
    thuc_te: null,
    du_bao: null,
    gang: false,
    gang_du_bao: false,
    pct: null,
    kl: null,
    theo_tien_boq: false,
    du_bao_xong: null,
    du_bao_bat_dau: null,
    ly_do_du_bao: null,
    nha_thau_hua: null,
    cham_so_muc_tieu: null,
    cham_so_baseline: null,
  };
  const ngayCua = (d: DongGanttTD) => d.baseline_duyet ?? d.ke_hoach;
  const dong: DongTomTat[] = [
    { wbs: "0", ma: "", ten: duAn.ten, don_vi: null, khoi_luong: null, bat_dau: ngayCua(goc)?.bd || null, ket_thuc: ngayCua(goc)?.kt || null, td: goc },
    ...b.dong.map((d) => ({
      wbs: `0.${d.wbs}`,
      ma: d.wbs,
      ten: d.ten,
      don_vi: d.kl?.don_vi || null,
      khoi_luong: d.kl?.tk ?? null,
      bat_dau: ngayCua(d).bd,
      ket_thuc: ngayCua(d).kt,
      td: d,
    })),
  ];
  return {
    du_an: duAn.id,
    ten_tep: "",
    nap_luc: luc,
    nap_boi: "agent-tien-do",
    nap_boi_ten: "agent Tiến độ",
    dong,
    tien_do: {
      ma_tien_do,
      lay_luc: luc,
      phien_ban_baseline: b.phien_ban_baseline,
      baseline_duyet_luc: b.baseline_duyet_luc,
      co_muc_tieu: b.co_muc_tieu,
      ngay_bao_cao: b.ngay_bao_cao,
      cod_muc_tieu: b.cod_muc_tieu,
      cod_baseline: b.cod_baseline,
      cod_du_bao: b.cod_du_bao,
    },
  };
}

/** Mọi ngày cần nằm trong trục đồ hoạ của bảng lấy từ Tiến độ (thanh mục tiêu, thanh nhóm, dự báo, ba vạch COD) */
export function ngayTrucTienDo(ban: BanTomTat): string[] {
  const ra: string[] = [];
  for (const d of ban.dong) {
    const t = d.td;
    if (!t) continue;
    for (const k of [t.ke_hoach, t.muc_tieu, t.thanh_nhom, t.du_bao, t.thuc_te, t.cho_bao_cao]) if (k?.bd) ra.push(k.bd, k.kt);
  }
  const td = ban.tien_do;
  if (td) for (const x of [td.cod_muc_tieu, td.cod_baseline, td.cod_du_bao]) if (x) ra.push(x);
  return ra;
}

export type MauPct = "trang" | "xanh" | "vang";

/**
 * Ô «% TH» (Mr. Đại 29/10/2026 — thay «KL TH / TK = %»), cùng nguyên tắc màu với Gantt bên agent Tiến độ:
 * chưa làm (0%) → «—» TRẮNG · đang làm / đã xong → «42,8%» XANH · vượt BOQ / vượt khối lượng thiết kế → VÀNG.
 * Dòng tên dự án (không có % chung) để trống.
 */
export function cotPctTH(t: DongGanttTD | undefined, fmt: (n: number, le: number) => string): { chu: string; mau: MauPct } {
  if (!t || t.pct === null) return { chu: "", mau: "trang" };
  const p = t.vuot_pct ?? t.pct;
  if (p <= 0) return { chu: "—", mau: "trang" };
  return { chu: `${fmt(p, 1)}%`, mau: t.vuot_pct != null ? "vang" : "xanh" };
}

export const SO_DONG_TOI_DA = 3000;
/** Cấp của một dòng = số đoạn của WBS: «1» cấp 1 · «1.4» cấp 2 · «1.4.7.2» cấp 4 */
export const capWbs = (wbs: string) => wbs.split(".").length;

const boDau = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const COT: { khoa: keyof DongTomTat; ten: string[] }[] = [
  { khoa: "wbs", ten: ["wbs", "ma wbs", "ma", "stt"] },
  { khoa: "ten", ten: ["cong viec", "ten cong viec", "noi dung", "noi dung cong viec", "ten viec", "hang muc"] },
  { khoa: "don_vi", ten: ["don vi", "dvt", "don vi tinh"] },
  { khoa: "khoi_luong", ten: ["khoi luong", "kl", "khoi luong thiet ke"] },
  { khoa: "bat_dau", ten: ["bat dau", "ngay bat dau"] },
  { khoa: "ket_thuc", ten: ["ket thuc", "ngay ket thuc", "hoan thanh"] },
];

const hopLe = (y: number, m: number, d: number) => {
  const t = new Date(Date.UTC(y, m - 1, d));
  return y >= 1990 && y <= 2100 && t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
};
const isoTu = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/**
 * Một ô ngày của Excel → yyyy-mm-dd. Nhận: ô ngày thật (số thứ tự ngày của Excel, hoặc Date), chữ «22/05/2027», «22-5-27»,
 * «2027-05-22». Chữ viết kiểu ngày/tháng/năm (E32 — không đọc kiểu tháng/ngày). Không đọc được → null.
 */
export function docNgayO(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : new Date(v.getTime() + 12 * 3600e3).toISOString().slice(0, 10);
  if (typeof v === "number") {
    if (!Number.isFinite(v) || v < 32874 || v > 73415) return null; // 01/01/1990 … 31/12/2100
    return new Date(Date.UTC(1899, 11, 30) + Math.floor(v) * 864e5).toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (m) return hopLe(+m[1], +m[2], +m[3]) ? isoTu(+m[1], +m[2], +m[3]) : null;
  m = /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2}|\d{4})$/.exec(s);
  if (!m) return null;
  const nam = m[3].length === 2 ? 2000 + +m[3] : +m[3];
  return hopLe(nam, +m[2], +m[1]) ? isoTu(nam, +m[2], +m[1]) : null;
}

/**
 * Các hàng của trang tính đầu (mỗi ô là giá trị thô: số, chữ, Date, null) → danh sách dòng + lời nhắc cho người nạp.
 * Tìm hàng tiêu đề (có ô «WBS») trong 15 hàng đầu để biết cột nào là cột nào; không thấy thì coi sáu cột đầu theo đúng thứ tự.
 */
export function docBangTomTat(hang: unknown[][]): { dong: DongTomTat[]; canh_bao: string[] } {
  const canhBao: string[] = [];
  const viTri: Partial<Record<keyof DongTomTat, number>> = {};
  let tu = 0;
  for (let i = 0; i < Math.min(15, hang.length); i++) {
    const o = (hang[i] ?? []).map((x) => (typeof x === "string" ? boDau(x) : ""));
    if (!o.includes("wbs")) continue;
    for (const c of COT) {
      const j = o.findIndex((x) => c.ten.includes(x));
      if (j >= 0) viTri[c.khoa] = j;
    }
    tu = i + 1;
    break;
  }
  if (viTri.wbs === undefined || viTri.ten === undefined) {
    COT.forEach((c, j) => (viTri[c.khoa] = j));
    canhBao.push("Không thấy hàng tiêu đề có ô «WBS» và «Công việc» — máy coi sáu cột đầu là WBS · Công việc · Đơn vị · Khối lượng · Bắt đầu · Kết thúc.");
    tu = 0;
  } else {
    const thieu = COT.filter((c) => viTri[c.khoa] === undefined).map((c) => (c.khoa === "don_vi" ? "Đơn vị" : c.khoa === "khoi_luong" ? "Khối lượng" : c.khoa === "bat_dau" ? "Bắt đầu" : "Kết thúc"));
    if (thieu.length) canhBao.push(`Tệp không có cột: ${thieu.join(", ")}.`);
  }
  const o = (h: unknown[], k: keyof DongTomTat) => (viTri[k] === undefined ? null : (h[viTri[k]!] ?? null));
  const chu = (v: unknown) => (v === null || v === undefined ? "" : String(v).replace(/\s+/g, " ").trim());

  const dong: DongTomTat[] = [];
  const daCo = new Set<string>();
  const saiWbs: number[] = [];
  const trung: string[] = [];
  const saiNgay: string[] = [];
  const nguoc: string[] = [];
  for (let i = tu; i < hang.length; i++) {
    const h = hang[i] ?? [];
    const wbs = chu(o(h, "wbs")).replace(/\.+$/, "");
    const ten = chu(o(h, "ten"));
    if (!wbs && !ten) continue;
    if (!/^\d+(\.\d+)*$/.test(wbs) || !ten) {
      // Dòng đầu chưa phải dữ liệu khi tệp không có tiêu đề nhận ra được (vd tiêu đề viết khác): bỏ qua không nhắc
      if (!(tu === 0 && i === 0)) saiWbs.push(i + 1);
      continue;
    }
    if (daCo.has(wbs)) trung.push(wbs);
    daCo.add(wbs);
    const tBd = o(h, "bat_dau");
    const tKt = o(h, "ket_thuc");
    const batDau = docNgayO(tBd);
    const ketThuc = docNgayO(tKt);
    if ((chu(tBd) && !batDau) || (chu(tKt) && !ketThuc)) saiNgay.push(wbs);
    if (batDau && ketThuc && ketThuc < batDau) nguoc.push(wbs);
    dong.push({ wbs, ten, don_vi: chu(o(h, "don_vi")) || null, khoi_luong: docSoNguoiGo(o(h, "khoi_luong")), bat_dau: batDau, ket_thuc: ketThuc });
    if (dong.length > SO_DONG_TOI_DA) break;
  }
  const rut = (ds: (string | number)[]) => (ds.length > 8 ? `${ds.slice(0, 8).join(", ")}… (${ds.length} dòng)` : ds.join(", "));
  if (saiWbs.length) canhBao.push(`Bỏ qua ${saiWbs.length} hàng vì ô WBS không phải dạng 1.2.3 hoặc thiếu tên công việc — hàng số ${rut(saiWbs)} của tệp.`);
  if (trung.length) canhBao.push(`WBS bị trùng: ${rut(trung)}. Ô WBS nên để kiểu Chữ, nếu không Excel đổi «1.10» thành «1.1».`);
  if (saiNgay.length) canhBao.push(`Ngày không đọc được (gõ theo ngày/tháng/năm, ví dụ 22/05/2027) ở WBS: ${rut(saiNgay)}.`);
  if (nguoc.length) canhBao.push(`Ngày kết thúc nằm trước ngày bắt đầu ở WBS: ${rut(nguoc)}.`);
  if (dong.length > SO_DONG_TOI_DA) {
    dong.length = SO_DONG_TOI_DA;
    canhBao.push(`Tệp dài quá — chỉ nhận ${SO_DONG_TOI_DA} dòng đầu.`);
  }
  return { dong, canh_bao: canhBao };
}

/** WBS có dòng con ngay trong bảng (dòng nhóm) */
export function wbsCoCon(dong: DongTomTat[]): Set<string> {
  const co = new Set<string>();
  const tatCa = new Set(dong.map((d) => d.wbs));
  for (const d of dong) {
    const i = d.wbs.lastIndexOf(".");
    if (i > 0 && tatCa.has(d.wbs.slice(0, i))) co.add(d.wbs.slice(0, i));
  }
  return co;
}

// ---------- trục thời gian (tháng ở trên «T4/26», tuần ở dưới «W18·27/4») ----------
const msNgay = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));

/** Thứ Hai của tuần chứa ngày này */
export function thuHai(isoNgay: string): string {
  const thu = new Date(msNgay(isoNgay)).getUTCDay(); // 0 = Chủ nhật
  return congNgay(isoNgay, -((thu + 6) % 7));
}

/** Số tuần ISO của một ngày (tuần bắt đầu thứ Hai; tuần 1 là tuần có thứ Năm đầu tiên của năm) */
export function soTuanIso(isoNgay: string): number {
  const nam5 = congNgay(thuHai(isoNgay), 3); // thứ Năm của tuần
  const dauNam = `${nam5.slice(0, 4)}-01-01`;
  return Math.floor(cachNgay(dauNam, nam5) / 7) + 1;
}

export interface MocTruc {
  iso: string;
  /** số ngày tính từ đầu trục */
  ngay: number;
  nhan: string;
}
export interface TrucTomTat {
  dau: string;
  cuoi: string;
  soNgay: number;
  thang: MocTruc[];
  tuan: MocTruc[];
}

/**
 * Trục thời gian phủ mọi dòng có ngày: bắt đầu từ thứ Hai trước ngày sớm nhất một tuần, kết thúc sau ngày muộn nhất hai tuần.
 * «Hôm nay» nằm cách khoảng đó không quá 90 ngày thì trục nới ra cho thấy vạch hôm nay. Không dòng nào có ngày → null.
 */
export function trucTomTat(dong: DongTomTat[], homNay: string, them: string[] = []): TrucTomTat | null {
  const ngay = [...dong.flatMap((d) => [d.bat_dau, d.ket_thuc]), ...them].filter((x): x is string => !!x);
  if (!ngay.length) return null;
  let som = ngay.reduce((a, b) => (a < b ? a : b));
  let muon = ngay.reduce((a, b) => (a > b ? a : b));
  if (homNay < som && cachNgay(homNay, som) <= 90) som = homNay;
  if (homNay > muon && cachNgay(muon, homNay) <= 90) muon = homNay;
  const dau = congNgay(thuHai(som), -7);
  const cuoi = congNgay(muon, 14);
  const thang: MocTruc[] = [];
  for (let y = +dau.slice(0, 4), m = +dau.slice(5, 7); ; m === 12 ? ((m = 1), y++) : m++) {
    const iso = isoTu(y, m, 1);
    if (iso > cuoi) break;
    // tháng đầu trục thường bị cắt: nhãn đặt ở mép trái trục
    thang.push({ iso, ngay: Math.max(0, cachNgay(dau, iso)), nhan: `T${m}/${String(y).slice(2)}` });
  }
  const tuan: MocTruc[] = [];
  for (let w = dau; w <= cuoi; w = congNgay(w, 7)) tuan.push({ iso: w, ngay: cachNgay(dau, w), nhan: `W${soTuanIso(w)}·${+w.slice(8, 10)}/${+w.slice(5, 7)}` });
  return { dau, cuoi, soNgay: cachNgay(dau, cuoi) + 1, thang, tuan };
}

/** Câu «còn bao ngày là kết thúc» cho hộp rê chuột. Bản nháp không có số thực tế nên chỉ so lịch với hôm nay. */
export function conBaoNgay(d: Pick<DongTomTat, "bat_dau" | "ket_thuc">, homNay: string): string {
  if (!d.ket_thuc) return "Chưa có ngày kết thúc";
  const n = cachNgay(homNay, d.ket_thuc);
  if (n > 0 && d.bat_dau === d.ket_thuc) return `Còn ${n} ngày nữa tới mốc`;
  if (n > 0) return d.bat_dau && d.bat_dau > homNay ? `Còn ${cachNgay(homNay, d.bat_dau)} ngày nữa bắt đầu · còn ${n} ngày nữa kết thúc` : `Còn ${n} ngày nữa kết thúc`;
  if (n === 0) return "Kết thúc hôm nay";
  return `Đã qua ngày kết thúc ghi trong tệp nạp ${-n} ngày (chưa so với Tiến độ mục tiêu hay Baseline)`;
}

/** Dòng ngày của hộp rê chuột — luật 31: khoảng ngày luôn kèm số ngày; việc một ngày (mốc) ghi «Mốc · ngày» */
export function chuNgayDong(d: Pick<DongTomTat, "bat_dau" | "ket_thuc">): string {
  if (d.bat_dau && d.ket_thuc && d.bat_dau === d.ket_thuc) return `Mốc · ${ngayVN(d.bat_dau)}`;
  return khoangNgay(d.bat_dau, d.ket_thuc);
}
