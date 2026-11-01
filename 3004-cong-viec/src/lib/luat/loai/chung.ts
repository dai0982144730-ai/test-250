// ============================================================
// luat/loai/chung.ts — tiện ích THUẦN dùng chung cho các dạng luật code: đọc số, đọc giá trị theo tham chiếu,
// nhãn thật của ô/bảng/cột, đánh giá điều kiện, kiểm tham số theo kiểu. Không CSDL, không node:fs.
// ============================================================
import type { LoiKiemTra } from "@/lib/types";
import { docSoChu } from "@/lib/chung/doc-so";
import { chuanHoaTieuDe, docNgay, giaTri, khongDau, ngayVN } from "@/lib/kiem-tra/chuan-hoa";
import type { DieuKien, DinhNghiaLoaiLuat, DuLieuBaoCao, NguCanhKiem, PhepSo, ThamChieu, ThamSoDinhNghia } from "../types";
import type { DinhNghiaMauRutGon } from "../types-them";

export type Loi = Omit<LoiKiemTra, "luat" | "muc">;
export type ViTri = NonNullable<LoiKiemTra["vi_tri"]>;
export type TS = Record<string, unknown>;

/** Tham số kèm ràng buộc riêng (không thuộc hợp đồng): tham chiếu có được trỏ kỳ báo cáo không. */
export type ThamSoDayDu = ThamSoDinhNghia & { cho_ky?: boolean; mac_dinh?: unknown };

/** Dạng luật đầy đủ: thêm kiểm tham số riêng và đọc thành lời (dùng trong loai-luat.ts). */
export interface LoaiDayDu extends DinhNghiaLoaiLuat {
  tham_so: ThamSoDayDu[];
  /** Kiểm thêm ngoài kiểu từng tham số (vd phải có từ hoặc đến). Chỉ gọi khi các tham số bắt buộc đã đủ. */
  kiemThem?: (ts: TS, mau: DinhNghiaMauRutGon | null) => string[];
  /** Đọc tham số thành câu tiếng Việt. */
  doc: (ts: TS, n: BoNhan) => string;
}

export const PHEP_SO: PhepSo[] = ["=", "!=", "<", "<=", ">", ">="];
export const PHEP_DIEU_KIEN: DieuKien["phep"][] = ["co_gia_tri", "trong", "bang", "khac", "chua", "khong_chua", ...PHEP_SO];

// ---------------- Đọc số ----------------

/**
 * Đọc số kiểu Việt Nam trong ô: "41,5%" → 41.5 · "1.240" → 1240 · "1.421,5" → 1421.5 · "−0,12" → -0.12 ·
 * "12,5 tỷ" → 12.5 (giữ số như đã viết, bỏ đơn vị) · "(2,7)" → -2.7 · "~80 triệu" → 80. Không phải số → null.
 */
export function docSo(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  let s = v.replace(/ /g, " ").trim();
  if (!s) return null;
  let am = false;
  const ngoac = /^\((.*)\)$/.exec(s);
  if (ngoac) {
    am = true;
    s = ngoac[1].trim();
  }
  s = s.replace(/^[~≈]\s*/, "");
  const m = /^([+\-−–]?)\s*(\d{1,3}(?:[ .,]\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)?)\s*([^\d]{0,24})$/u.exec(s);
  if (!m) return null;
  // phần đuôi chỉ được là đơn vị (%, tỷ, triệu đồng, MW, m²...), không chứa dấu phép tính/ngăn
  if (m[3] && /[/:=<>+\-–]/.test(m[3].trim().charAt(0))) return null;
  if (m[1] && m[1] !== "+") am = !am;
  // ⭐ PHẦN DẤU — chuẩn số Việt Nam (Mr. Đại chốt 12/10/2026, chốt 130): MỘT bộ đọc lib/chung/doc-so, cùng luật với mọi agent.
  //   «1.240» = 1240 · «1,240» = 1,24 · «1.421,5» = 1421,5 · gõ kiểu Anh chỉ MỘT cách hiểu vẫn đọc: «3.5» = 3,5 · «1,234.5» = 1234,5.
  // Khác bản cũ (tự đoán dấu): «0.500» nay là 0,5 (bản cũ 500 — số 0 đứng đầu không thể là nhóm nghìn) · «1234.567» nay là
  // 1234,567 (bản cũ 1234567 — bốn chữ số trước dấu chấm không thể là nhóm nghìn) · «1.234.5», «1,234,5» không phải số (bản cũ 12345).
  const n = docSoChu(m[2])?.so ?? null;
  if (n === null) return null;
  return am ? -n : n;
}

/**
 * Số chữ số thập phân ĐÃ VIẾT của một con số (chữ đã bỏ khoảng trắng), theo đúng cách `docSo` hiểu dấu: «98,4» → 1 · «1.240» → 0 ·
 * «0,823» → 3 · «3.5» → 1 (gõ kiểu Anh) · «1,234.5» → 1. Không phải số → 0.
 */
export function soLeDaViet(so: string): number {
  const d = docSoChu(so);
  if (!d) return 0;
  // gõ kiểu Anh (sai chuẩn, chỉ một cách hiểu): thập phân đứng sau dấu CHẤM; còn lại theo chuẩn: sau dấu PHẨY
  const thapPhan = d.lech === "sai-chuan" ? "." : ",";
  return so.includes(thapPhan) ? so.length - so.lastIndexOf(thapPhan) - 1 : 0;
}

/** Số trong tham số (số hoặc chuỗi số). */
export function soThamSo(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && v.trim()) return docSo(v);
  return null;
}

/** Số hiển thị kiểu Việt Nam: 0.5 → "0,5". */
export const soVN = (n: number) => String(n).replace(".", ",");

// ---------------- Chuẩn hóa chữ ----------------

export function chuanChu(s: string, boDau = false): string {
  const x = s.replace(/ /g, " ").replace(/\s+/g, " ").trim().toLowerCase();
  return boDau ? khongDau(x) : x;
}

// ---------------- Tham chiếu ----------------

export function laThamChieu(v: unknown): v is ThamChieu {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const x = v as Record<string, unknown>;
  if (typeof x.o === "string") return !!x.o.trim();
  if (typeof x.bang === "string" || typeof x.cot === "string") return typeof x.bang === "string" && !!x.bang.trim() && typeof x.cot === "string" && !!x.cot.trim();
  if ("ky" in x) return x.ky === "tu" || x.ky === "den" || x.ky === "nop";
  return false;
}

export const laCot = (tc: ThamChieu): tc is { bang: string; cot: string } => "bang" in tc;
export const laO = (tc: ThamChieu): tc is { o: string } => "o" in tc;
export const laKy = (tc: ThamChieu): tc is { ky: "tu" | "den" | "nop" } => "ky" in tc;

/** Bảng mà các tham chiếu trỏ tới (luật chạy theo từng dòng của bảng này). Nhiều bảng khác nhau → "nhieu". */
export function bangChung(ds: ThamChieu[]): string | null | "nhieu" {
  const bang = Array.from(new Set(ds.filter(laCot).map((t) => t.bang)));
  if (bang.length > 1) return "nhieu";
  return bang[0] ?? null;
}

/** Giá trị chữ của một tham chiếu (đã bỏ "chưa điền" → ""). Cột thì cần dòng; kỳ → ISO. */
export function layGiaTri(bc: DuLieuBaoCao, tc: ThamChieu, ctx: NguCanhKiem, dong?: Record<string, string>): string {
  if (laO(tc)) return giaTri(bc.o_nhap[tc.o], ctx.gia_tri_chua_dien);
  if (laCot(tc)) return dong ? giaTri(dong[tc.cot], ctx.gia_tri_chua_dien) : "";
  return ctx.ky_bao_cao?.[tc.ky] ?? "";
}

/** Chữ thô của ô (chưa bỏ "chưa điền"), để báo "còn để ......". */
export function layChuTho(bc: DuLieuBaoCao, tc: ThamChieu, dong?: Record<string, string>): string {
  if (laO(tc)) return (bc.o_nhap[tc.o] ?? "").trim();
  if (laCot(tc)) return (dong?.[tc.cot] ?? "").trim();
  return "";
}

/** Dòng có nội dung: có ít nhất một cột (trừ số thứ tự) có giá trị thật. Dòng toàn "......"/trống không tính. */
export function dongCoNoiDung(dong: Record<string, string>, chuaDien: string[]): boolean {
  return Object.entries(dong).some(([k, v]) => k !== "stt" && k !== "nhom" && giaTri(v, chuaDien) !== "");
}

/** Các dòng có nội dung của một bảng, kèm số dòng 1-based (tính cả dòng trống, khớp vị trí trong file). */
export function cacDong(bc: DuLieuBaoCao, bang: string, ctx: NguCanhKiem): { so: number; dong: Record<string, string> }[] {
  return (bc.bang[bang] ?? []).map((dong, i) => ({ so: i + 1, dong })).filter((x) => dongCoNoiDung(x.dong, ctx.gia_tri_chua_dien));
}

export function viTriCua(tc: ThamChieu, soDong?: number): ViTri {
  if (laO(tc)) return { tag: tc.o };
  if (laCot(tc)) return { bang: tc.bang, ...(soDong ? { dong: soDong } : {}), cot: tc.cot };
  return { tag: "ky_bao_cao" };
}

/** Năm mặc định khi ngày thiếu năm ("21/07"): năm của kỳ báo cáo. */
export function namKy(ctx: NguCanhKiem): number | undefined {
  const s = ctx.ky_bao_cao?.den ?? ctx.ky_bao_cao?.tu;
  return s && /^\d{4}/.test(s) ? Number(s.slice(0, 4)) : undefined;
}

// ---------------- Nhãn thật ----------------

export interface BoNhan {
  o(tag: string): string;
  bang(tag: string): string;
  cot(bang: string, cot: string): string;
  muc(ten: string): string;
  /** Tên một tham chiếu; trongDong = đang nói trong một dòng của chính bảng đó (chỉ cần tên cột). */
  tc(tc: ThamChieu, trongDong?: boolean): string;
}

export function taoBoNhan(mau: DinhNghiaMauRutGon | null | undefined): BoNhan {
  const o = (tag: string) => mau?.o_nhap.find((x) => x.tag === tag)?.nhan ?? tag;
  const bang = (tag: string) => mau?.bang.find((x) => x.tag === tag)?.nhan ?? tag;
  const cot = (b: string, c: string) => mau?.bang.find((x) => x.tag === b)?.cot.find((x) => x.tag === c)?.nhan ?? c;
  const muc = (ten: string) => {
    const k = chuanHoaTieuDe(ten);
    return mau?.muc_bat_buoc.find((m) => chuanHoaTieuDe(m) === k) ?? ten;
  };
  return {
    o,
    bang,
    cot,
    muc,
    tc(tc, trongDong) {
      if (laO(tc)) return `ô "${o(tc.o)}"`;
      if (laCot(tc)) return trongDong ? `cột "${cot(tc.bang, tc.cot)}"` : `cột "${cot(tc.bang, tc.cot)}" của bảng "${bang(tc.bang)}"`;
      return tc.ky === "tu" ? "ngày đầu kỳ báo cáo" : tc.ky === "den" ? "ngày cuối kỳ báo cáo" : "ngày nộp báo cáo";
    },
  };
}

export const hoaDau = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** Tiền tố lỗi theo vị trí: 'Dòng 3 bảng "Công việc": cột "% HT"' hoặc 'Ô "Ngày lập"'. */
export function tenViTri(n: BoNhan, tc: ThamChieu, soDong?: number): string {
  if (laCot(tc) && soDong) return `Dòng ${soDong} bảng "${n.bang(tc.bang)}": cột "${n.cot(tc.bang, tc.cot)}"`;
  return hoaDau(n.tc(tc));
}

// ---------------- Điều kiện ----------------

const TU_PHEP: Record<PhepSo, string> = { "=": "bằng", "!=": "khác", "<": "nhỏ hơn", "<=": "không quá", ">": "lớn hơn", ">=": "từ" };
const TU_PHEP_NGAY: Record<PhepSo, string> = {
  "=": "trùng",
  "!=": "khác",
  "<": "trước",
  "<=": "trước hoặc bằng",
  ">": "sau",
  ">=": "sau hoặc bằng",
};
export const tuPhepNgay = (p: PhepSo) => TU_PHEP_NGAY[p];

export function soSanh(a: number | string, p: PhepSo, b: number | string): boolean {
  switch (p) {
    case "=":
      return a === b;
    case "!=":
      return a !== b;
    case "<":
      return a < b;
    case "<=":
      return a <= b;
    case ">":
      return a > b;
    case ">=":
      return a >= b;
  }
}

/** ISO của một chuỗi ngày (dd/mm/yyyy, yyyy-mm-dd, dd/mm + năm mặc định) hoặc null. */
export function isoNgay(s: string, nam?: number): string | null {
  return s ? (docNgay(s, nam).iso ?? null) : null;
}

/** Hai giá trị bằng nhau: cùng ngày, cùng số, hoặc cùng chữ (không phân biệt hoa thường). */
function bangNhau(a: string, b: string, nam?: number): boolean {
  const da = isoNgay(a, nam);
  const db = isoNgay(b, nam);
  if (da && db) return da === db;
  const sa = docSo(a);
  const sb = docSo(b);
  if (sa !== null && sb !== null) return sa === sb;
  return chuanChu(a) === chuanChu(b);
}

/** Đánh giá một điều kiện trên giá trị đã đọc (v = "" khi chưa điền). */
export function datDieuKien(dk: DieuKien, v: string, nam?: number): boolean {
  const g = dk.gia_tri === undefined || dk.gia_tri === null ? "" : String(dk.gia_tri);
  switch (dk.phep) {
    case "co_gia_tri":
      return v !== "";
    case "trong":
      return v === "";
    case "bang":
      return v !== "" && bangNhau(v, g, nam);
    case "khac":
      return v === "" || !bangNhau(v, g, nam);
    case "chua":
      return v !== "" && chuanChu(v).includes(chuanChu(g));
    case "khong_chua":
      return !chuanChu(v).includes(chuanChu(g));
    default: {
      if (v === "") return false;
      const p = dk.phep as PhepSo;
      const dv = isoNgay(v, nam);
      const dg = typeof dk.gia_tri === "string" ? isoNgay(g, nam) : null;
      if (dv && dg) return soSanh(dv, p, dg);
      const sv = docSo(v);
      const sg = soThamSo(dk.gia_tri);
      if (sv === null || sg === null) return false;
      return soSanh(sv, p, sg);
    }
  }
}

/** Đọc điều kiện ra lời, vd 'cột "Mức độ" là "Cao"'; phai = câu yêu cầu ('cột "Kết thúc" phải có giá trị'). */
export function docDieuKien(dk: DieuKien, n: BoNhan, trongDong: boolean, phai = false): string {
  const ten = n.tc(dk.tham_chieu, trongDong);
  const P = phai ? " phải" : "";
  const g = dk.gia_tri === undefined || dk.gia_tri === null ? "" : String(dk.gia_tri);
  switch (dk.phep) {
    case "co_gia_tri":
      return `${ten}${P} có giá trị`;
    case "trong":
      return `${ten}${P} để trống`;
    case "bang":
      return `${ten}${P} là "${g}"`;
    case "khac":
      return `${ten}${P} khác "${g}"`;
    case "chua":
      return `${ten}${P} có chứa "${g}"`;
    case "khong_chua":
      return `${ten}${phai ? " không được chứa" : " không chứa"} "${g}"`;
    default: {
      const p = dk.phep as PhepSo;
      const ngay = typeof dk.gia_tri === "string" ? isoNgay(g) : null;
      if (ngay) return `${ten}${P} ${TU_PHEP_NGAY[p]} ${ngayVN(ngay)}`;
      const so = soThamSo(dk.gia_tri);
      const gHien = so === null ? g : soVN(so);
      if (p === ">=") return `${ten}${P} từ ${gHien} trở lên`;
      return `${ten}${P} ${TU_PHEP[p]} ${gHien}`;
    }
  }
}

export function laDieuKien(v: unknown): v is DieuKien {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const x = v as Record<string, unknown>;
  return laThamChieu(x.tham_chieu) && PHEP_DIEU_KIEN.includes(x.phep as DieuKien["phep"]);
}

// ---------------- Kiểm tham số theo mẫu ----------------

/** Lỗi khi tham chiếu trỏ ô/bảng/cột không có trong mẫu (mau null → chỉ kiểm cú pháp). */
export function kiemThamChieuMau(tc: ThamChieu, mau: DinhNghiaMauRutGon | null, nhanTs: string): string[] {
  if (!mau) return [];
  if (laO(tc)) return kiemOMau(tc.o, mau, nhanTs);
  if (laCot(tc)) return kiemCotMau(tc.bang, tc.cot, mau, nhanTs);
  return [];
}

export function kiemOMau(tag: string, mau: DinhNghiaMauRutGon | null, nhanTs: string): string[] {
  if (!mau || mau.o_nhap.some((o) => o.tag === tag)) return [];
  return [`${nhanTs}: ô "${tag}" không có trong mẫu ${mau.ten}`];
}

export function kiemBangMau(tag: string, mau: DinhNghiaMauRutGon | null, nhanTs: string): string[] {
  if (!mau || mau.bang.some((b) => b.tag === tag)) return [];
  return [`${nhanTs}: bảng "${tag}" không có trong mẫu ${mau.ten}`];
}

export function kiemCotMau(bang: string, cot: string, mau: DinhNghiaMauRutGon | null, nhanTs: string): string[] {
  if (!mau) return [];
  const b = mau.bang.find((x) => x.tag === bang);
  if (!b) return [`${nhanTs}: bảng "${bang}" không có trong mẫu ${mau.ten}`];
  if (!b.cot.some((c) => c.tag === cot)) return [`${nhanTs}: bảng "${b.nhan}" không có cột "${cot}"`];
  return [];
}

export function kiemMucMau(ten: string, mau: DinhNghiaMauRutGon | null, nhanTs: string): string[] {
  if (!mau) return [];
  const k = chuanHoaTieuDe(ten);
  if (!k) return [`${nhanTs}: tên mục rỗng`];
  if (mau.muc_bat_buoc.some((m) => chuanHoaTieuDe(m) === k || chuanHoaTieuDe(m).includes(k))) return [];
  return [`${nhanTs}: mục "${ten}" không có trong mẫu ${mau.ten}`];
}

/** Chuỗi tham số (đã trim) hoặc giá trị mặc định. */
export function chuTs(ts: TS, khoa: string, macDinh = ""): string {
  const v = ts[khoa];
  return typeof v === "string" && v.trim() ? v.trim() : macDinh;
}
