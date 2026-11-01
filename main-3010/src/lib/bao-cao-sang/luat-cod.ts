// ============================================================
// LUẬT BÁO CÁO SÁNG 25/09 — CHỈ BÁO VIỆC LÀM CHẬM COD  (file THUẦN — luật 10)
// MD: PLAN-MAIN-AGENT mục 6.3 (sửa 25/09) · Mr. Đại chốt 25/09 (A a · B a)
//
// Đo bản 25/09 trước khi sửa: 72 dòng, vượt 4.096 ký tự → Telegram CẮT tin;
// 5 dòng trùng; đơn giá + thành tiền cùng hạng mục thành 2 dòng; dòng nguồn là
// đường dẫn file; `duAn` null 72/72; `soNgayAnhHuong` null 72/72; chữ "dong", "d/m2".
//
// ⭐ LUẬT MỚI — một issue vào báo cáo sáng khi đạt ≥ 1 điều kiện, xét theo ẢNH
//    HƯỞNG chứ không theo agent nào báo:
//    (1) trên đường găng tới mốc COD      — cờ `tren_duong_gang` agent chủ trả
//    (2) làm COD dự báo lùi ≥ 1 ngày      — `so_ngay_anh_huong` > 0
//    (3) COD dự báo vượt một mốc bắt buộc — cờ `vuot_moc_bat_buoc` (mục tiêu COD,
//        hạn chủ trương; issue loại này của tiến độ/pháp lý)
//    Mọi thứ khác KHÔNG vào (nhân viên xử lý trên màn Cảnh báo).
//
// ⛔ Main CHỈ ÁNH XẠ: không tự tính găng, không tự tính ngày lùi. Cờ và số đều do
//    agent chủ trả; thiếu cờ thì coi là "không đạt", KHÔNG đoán hộ.
// ============================================================

import { ganTenChoMa, taoTuDien } from "@/lib/chung/ma-kem-ten";
import { fmtSo } from "@/lib/format"; // chuẩn số Việt Nam (chốt 130): số ngày từ 1.000 trở lên có dấu chấm ngăn nhóm
import { cauChamHe, CHU_THIEU_HE, TEN_DANG_LAP, TEN_HE } from "@/lib/chung/luat-nhanh-cham";

// ─────────────────────────────────────────────────────────────
// 1. Kiểu dữ liệu
// ─────────────────────────────────────────────────────────────

/** Một thẻ issue đúng khuôn `<agent>.danh_sach_issue` — mọi trường đều có thể thiếu */
export interface TheIssueTho {
  id?: unknown;
  tieu_de?: unknown;
  mucDo?: unknown;
  wbs?: unknown;
  tren_duong_gang?: unknown;
  so_ngay_anh_huong?: unknown;
  vuot_moc_bat_buoc?: unknown;
  so_ngay_qua_han?: unknown;
  tien_anh_huong_vnd?: unknown;
  doLlmSinh?: unknown;
  ngay_mo?: unknown;
}

export type LyDoVao = "gang" | "lui-cod" | "vuot-moc";

export const NHAN_LY_DO: Record<LyDoVao, string> = {
  gang: "trên đường găng tới COD",
  "lui-cod": "làm COD dự báo lùi",
  "vuot-moc": "COD dự báo vượt mốc bắt buộc",
};

/** Một vấn đề đã qua luật lọc — đúng MỘT dòng trong tin nhắn */
export interface VanDeSang {
  /** Slug dự án (mã nội bộ, KHÔNG in ra tin nhắn) */
  maDuAn: string;
  agent: string;
  /** Tên ngắn in cuối dòng: "Tiến độ" · "Pháp lý" · "Hợp đồng" · "Base" */
  tenAgent: string;
  idIssue: string;
  /** Mã WBS thật; null khi thẻ không gắn mã (khoá gom "người:@x" cũng là null) */
  wbs: string | null;
  /**
   * ⭐ 26/09 luật "mã kèm tên": tên việc của `wbs` (Agent Tiến độ trả, dung.ts điền).
   * Không có (tiến độ không trả được / thẻ không gắn mã) → null, mã in trơn như cũ.
   */
  tenWbs?: string | null;
  /** Tiêu đề đã chuẩn chữ ("đồng", "đ/m²") */
  tieuDe: string;
  lyDo: LyDoVao[];
  /** Số ngày COD lùi do agent chủ trả; null = agent chưa quy ra ngày (KHÔNG phải 0) */
  soNgayLuiCod: number | null;
  /**
   * Luật 36: COD lùi SO VỚI HỆ NÀO. Mọi agent quy «ảnh hưởng COD» từ `tiendo.duong_gang` (so_ngay_tre = so với Baseline
   * ĐÃ DUYỆT; dự án chưa duyệt thì tạm so với tiến độ đang lập) — dung.ts điền theo dự án. Thiếu = không in tên hệ.
   */
  heLuiCod?: string | null;
  tienVnd: number | null;
  mucDo: "do" | "vang" | "xanh";
  doLlmSinh: boolean;
  /** 🤖 câu hỏi quyết định do LLM viết; null = không có (LLM lỗi/hết hạn mức/câu bị loại) */
  cauHoi: string | null;
  /** Dòng agent khác cùng mã WBS — in ngay dưới dòng gốc, không thành dòng riêng */
  kem: VanDeSang[];
}

/** Dòng đầu của một dự án — số lấy nguyên từ `tiendo.tom_tat_du_an` */
export interface DauDuAn {
  maDuAn: string;
  /** Tên thật trong sổ dự án — không in slug */
  ten: string;
  coTienDo: boolean;
  codDuBao: string | null;
  codMucTieu: string | null;
  /** `cham_ngay_so_muc_tieu` của tiến độ: dương = muộn hơn mục tiêu */
  chamNgay: number | null;
  /**
   * `cham_ngay_so_baseline` của tiến độ (luật 36, 14/10/2026): COD dự báo − COD Baseline ĐÃ DUYỆT, dương = chậm.
   * null = chưa có Baseline đã duyệt — in «chưa có Baseline đã duyệt». Thiếu (undefined) = bản báo cáo lưu từ trước khi có
   * trường này — không in vế Baseline (không đoán).
   */
  chamBaselineNgay?: number | null;
  /** ⭐ 17/10/2026 — ngày COD Baseline ĐÃ DUYỆT (`cod_baseline` của tom_tat_du_an); null = chưa duyệt; thiếu = bản cũ */
  codBaseline?: string | null;
  /** COD dự báo hôm nay − điểm gần nhất trước hôm nay trong `tiendo.lich_su_du_bao` (ngày) */
  soHomQua: number | null;
  /** Vì sao chưa so được với hôm qua — hiện trên web */
  lyDoKhongSo: string | null;
  /** Hỏi tiến độ hỏng vì lý do khác "chưa có tiến độ" */
  loi: string | null;
}

// ─────────────────────────────────────────────────────────────
// 2. Luật lọc
// ─────────────────────────────────────────────────────────────

function so(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/**
 * Thẻ này vào báo cáo sáng vì những lý do nào. Mảng rỗng = KHÔNG vào.
 * Cờ phải là `true` thật — `null`/thiếu (agent chưa biết) không tính là đạt.
 */
export function lyDoVaoBaoCao(t: TheIssueTho): LyDoVao[] {
  const ra: LyDoVao[] = [];
  if (t.tren_duong_gang === true) ra.push("gang");
  const lui = so(t.so_ngay_anh_huong);
  if (lui !== null && lui > 0) ra.push("lui-cod");
  if (t.vuot_moc_bat_buoc === true) ra.push("vuot-moc");
  return ra;
}

/** Mã WBS thật — "người:@x", "ISS-PG-548.01-003" không phải mã */
export function maWbsThat(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return /^\d+(\.\d+)*$/.test(s) ? s : null;
}

/** "dong" → "đồng", "d/m2" → "đ/m²", "d/m3" → "đ/m³" — chữ người đọc, không phải chữ máy */
export function chuanChu(s: string): string {
  return s
    .replace(/(\d)\s*d\/m2\b/g, "$1 đ/m²")
    .replace(/(\d)\s*d\/m3\b/g, "$1 đ/m³")
    .replace(/\bd\/m2\b/g, "đ/m²")
    .replace(/\bd\/m3\b/g, "đ/m³")
    .replace(/(\d)\s+dong\b/g, "$1 đồng")
    .replace(/\s+/g, " ")
    .trim();
}

function mucDo(v: unknown): "do" | "vang" | "xanh" {
  const s = typeof v === "string" ? v.toLowerCase() : "";
  if (s === "do" || s === "red" || s === "đỏ" || s === "cao") return "do";
  if (s === "xanh" || s === "green" || s === "thap") return "xanh";
  return "vang";
}

/** Tên ngắn in cuối dòng — bỏ chữ "Agent " cho gọn màn điện thoại */
export function tenNganAgent(ten: string): string {
  return ten.replace(/^Agent\s+/i, "").replace(/\.vn$/i, "").trim() || ten;
}

/** Lọc một mẻ thẻ của MỘT agent, MỘT dự án → các vấn đề đạt luật (chưa gộp) */
export function locTheVao(ds: readonly TheIssueTho[], maDuAn: string, agent: string, tenAgent: string): VanDeSang[] {
  const ra: VanDeSang[] = [];
  for (const t of ds) {
    const lyDo = lyDoVaoBaoCao(t);
    if (lyDo.length === 0) continue;
    const tieuDe = chuanChu(typeof t.tieu_de === "string" ? t.tieu_de : "");
    if (tieuDe === "") continue;
    ra.push({
      maDuAn,
      agent,
      tenAgent: tenNganAgent(tenAgent),
      idIssue: typeof t.id === "string" ? t.id : "",
      wbs: maWbsThat(t.wbs),
      tieuDe,
      lyDo,
      soNgayLuiCod: so(t.so_ngay_anh_huong),
      tienVnd: so(t.tien_anh_huong_vnd),
      mucDo: mucDo(t.mucDo),
      doLlmSinh: t.doLlmSinh === true,
      cauHoi: null,
      kem: [],
    });
  }
  return ra;
}

// ─────────────────────────────────────────────────────────────
// 3. Gộp trùng + xếp
// ─────────────────────────────────────────────────────────────

/** Thứ tự ưu tiên: ngày lùi COD giảm dần (chưa có số xuống cuối) → vượt mốc → đỏ */
export function soSanhVanDe(a: VanDeSang, b: VanDeSang): number {
  return soSanh(a, b);
}

function soSanh(a: VanDeSang, b: VanDeSang): number {
  const la = a.soNgayLuiCod ?? -1;
  const lb = b.soNgayLuiCod ?? -1;
  if (la !== lb) return lb - la;
  const va = a.lyDo.includes("vuot-moc") ? 1 : 0;
  const vb = b.lyDo.includes("vuot-moc") ? 1 : 0;
  if (va !== vb) return vb - va;
  const da = a.mucDo === "do" ? 1 : 0;
  const db = b.mucDo === "do" ? 1 : 0;
  return db - da;
}

/** Giữ bản nào khi trùng trong CÙNG agent: có số ngày hơn → không do LLM sinh → mới hơn */
function hon(a: VanDeSang, b: VanDeSang): VanDeSang {
  const c = soSanh(a, b);
  if (c !== 0) return c < 0 ? a : b;
  if (a.doLlmSinh !== b.doLlmSinh) return a.doLlmSinh ? b : a;
  return a;
}

export interface KetQuaGop {
  vanDe: VanDeSang[];
  /** Số dòng bị gộp vì trùng (cùng agent cùng mã WBS, hoặc cùng tiêu đề) */
  soGop: number;
}

/**
 * Gộp trùng trong MỘT dự án rồi xếp.
 *  · Cùng agent + cùng mã WBS, hoặc cùng agent + cùng tiêu đề → giữ 1 dòng
 *    (đo 25/09: Base có 2 thẻ cho 6.1.4 — thẻ luật 3 và đề xuất AI "Luật 3 — …").
 *  · Khác agent + cùng mã WBS → dòng agent kia đi KÈM dưới dòng gốc (vd tiến độ
 *    báo 6.1.4 lùi COD 30 ngày, Base báo 6.1.4 chưa ai nhận) — chuỗi găng chỉ một
 *    dòng ở gốc, tiến độ đã gộp chuỗi sẵn.
 */
export function gopVaXep(ds: readonly VanDeSang[]): KetQuaGop {
  let soGop = 0;
  const theoKhoa = new Map<string, VanDeSang>();
  for (const v of ds) {
    const khoa = v.wbs ? `${v.agent}|wbs|${v.wbs}` : `${v.agent}|td|${v.tieuDe}`;
    const cu = theoKhoa.get(khoa);
    if (cu) {
      soGop += 1;
      theoKhoa.set(khoa, hon(cu, v));
    } else theoKhoa.set(khoa, v);
  }
  // Cùng tiêu đề trong cùng agent dù khác mã → cũng trùng
  const daThay = new Set<string>();
  const motAgent: VanDeSang[] = [];
  for (const v of Array.from(theoKhoa.values())) {
    const k = `${v.agent}|${v.tieuDe}`;
    if (daThay.has(k)) {
      soGop += 1;
      continue;
    }
    daThay.add(k);
    motAgent.push({ ...v, kem: [] });
  }

  // Gom khác agent cùng mã WBS dưới một dòng gốc
  const nhom = new Map<string, VanDeSang[]>();
  const ra: VanDeSang[] = [];
  for (const v of motAgent) {
    if (!v.wbs) {
      ra.push(v);
      continue;
    }
    const n = nhom.get(v.wbs) ?? [];
    n.push(v);
    nhom.set(v.wbs, n);
  }
  for (const n of Array.from(nhom.values())) {
    const xep = n.slice().sort((a, b) => {
      const c = soSanh(a, b);
      if (c !== 0) return c;
      // Cùng hạng: dòng của Agent tiến độ làm gốc (nó giữ đường găng)
      return (b.agent === "tiendo" ? 1 : 0) - (a.agent === "tiendo" ? 1 : 0);
    });
    ra.push({ ...xep[0], kem: xep.slice(1) });
  }
  ra.sort(soSanh);
  return { vanDe: ra, soGop };
}

// ─────────────────────────────────────────────────────────────
// 4. "So hôm qua" — đọc sổ mốc COD của Agent tiến độ
// ─────────────────────────────────────────────────────────────

export interface MocCod {
  thoi_diem?: unknown;
  cod_du_bao?: unknown;
  cach_tinh?: unknown;
}

function ngayDenSo(ngay: string): number {
  return Date.parse(`${ngay.slice(0, 10)}T00:00:00Z`) / 86_400_000;
}

/**
 * COD dự báo hôm nay − điểm gần nhất TRƯỚC ngày báo cáo trong sổ mốc COD.
 * `ngayVnCua` đổi ISO → ngày giờ VN (bên gọi đưa `gioVn`, file này giữ thuần).
 * Hai điểm khác cách tính (sổ ghi "cách cũ trước 24/09") thì KHÔNG so — trả lý do.
 */
export function soVoiHomQua(
  codNay: string | null,
  moc: readonly MocCod[],
  ngayBaoCao: string,
  ngayVnCua: (iso: string) => string,
): { so: number | null; lyDo: string | null } {
  if (!codNay) return { so: null, lyDo: "chưa có COD dự báo hôm nay" };
  const truoc = moc
    .filter((m) => typeof m.thoi_diem === "string" && typeof m.cod_du_bao === "string")
    .filter((m) => ngayVnCua(m.thoi_diem as string) < ngayBaoCao)
    .sort((a, b) => String(a.thoi_diem).localeCompare(String(b.thoi_diem)));
  const cuoi = truoc[truoc.length - 1];
  if (!cuoi) return { so: null, lyDo: "sổ mốc COD chưa có điểm nào trước hôm nay" };
  if (/^cách cũ/i.test(String(cuoi.cach_tinh ?? ""))) {
    return { so: null, lyDo: `điểm trước (${String(cuoi.thoi_diem).slice(0, 10)}) tính theo cách cũ — không so thẳng được` };
  }
  return { so: Math.round(ngayDenSo(codNay) - ngayDenSo(String(cuoi.cod_du_bao))), lyDo: null };
}

// ─────────────────────────────────────────────────────────────
// 5. Kết xuất tin nhắn — một màn điện thoại, LUÔN < 4.096 ký tự
// ─────────────────────────────────────────────────────────────

/** Trần cứng của Telegram là 4.096; chừa 96 ký tự cho chắc (emoji tính 2 đơn vị) */
export const TRAN_TIN_NHAN = 4000;

function ngayVn(iso: string | null): string {
  if (!iso) return "—";
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

function soTien(n: number): string {
  return `${Math.round(n).toLocaleString("vi-VN")} đồng`;
}

/**
 * Dự án "IM LẶNG": chưa có tiến độ, hỏi KHÔNG lỗi, và không có việc nào để báo.
 * Mr. Đại chốt 13/10/2026: dòng "🏗 … — chưa có tiến độ" lặp lại mỗi sáng là rác thông tin —
 * "hãy bỏ nó đi. khi nào có tiến độ thì tự hiện lên là được rồi". MỘT định nghĩa cho cả bản
 * Telegram (kich-ban.ts), bản cũ (ketXuatTinNhan) và màn web (XemBaoCao).
 * Hỏi tiến độ HỎNG (`loi`) không tính là im lặng — đó là sự cố, vẫn phải in.
 */
export function maDuAnImLang(duAn: readonly DauDuAn[], coViec: (maDuAn: string) => boolean): Set<string> {
  return new Set(duAn.filter((d) => !d.coTienDo && !d.loi && !coViec(d.maDuAn)).map((d) => d.maDuAn));
}

export function dongDauDuAn(d: DauDuAn): string {
  if (!d.coTienDo) return `🏗 ${d.ten} — ${d.loi ?? "chưa có tiến độ"}`;
  // Luật 35 + 36 (14/10/2026): số NGÀY, ghi rõ hệ — cả Tiến độ mục tiêu lẫn Baseline (hàm chung chung/luat-nhanh-cham)
  const p: string[] = [`COD dự báo ${ngayVn(d.codDuBao)}`];
  if (!d.codMucTieu) p.push(CHU_THIEU_HE["muc-tieu"]);
  else if (d.chamNgay === null) p.push(`${TEN_HE["muc-tieu"]} ${ngayVn(d.codMucTieu)} (chưa tính được số ngày)`);
  else p.push(`${cauChamHe(d.chamNgay, "muc-tieu")} (${ngayVn(d.codMucTieu)})`);
  // undefined = bản báo cáo dựng trước 15/10 chưa lưu trường này → bỏ vế (không nói oan «chưa có Baseline đã duyệt»);
  // null = cổng nói chưa có Baseline đã duyệt → nói thẳng
  if (d.chamBaselineNgay !== undefined) p.push(cauChamHe(d.chamBaselineNgay, "baseline"));
  p.push(
    d.soHomQua === null
      ? "so hôm qua: chưa có số"
      : d.soHomQua === 0
        ? "so hôm qua ±0"
        : d.soHomQua > 0
          ? `so hôm qua +${fmtSo(d.soHomQua)} ngày`
          : `so hôm qua −${fmtSo(-d.soHomQua)} ngày`,
  );
  return `🏗 ${d.ten}\n${p.join(" · ")}`;
}

/** Tên hệ của «COD lùi» theo tình trạng Baseline của dự án (luật 36) — dung.ts gọi khi gom */
export function heLuiCodCua(d: DauDuAn): string | null {
  if (!d.coTienDo) return null;
  return typeof d.chamBaselineNgay === "number" ? TEN_HE.baseline : TEN_DANG_LAP;
}

/** Phần "số ảnh hưởng" cuối dòng — chỉ in số agent đã trả, không ước */
export function soAnhHuong(v: VanDeSang): string {
  const p: string[] = [];
  if (v.soNgayLuiCod !== null && v.soNgayLuiCod > 0) {
    p.push(`COD lùi ${fmtSo(v.soNgayLuiCod)} ngày${v.heLuiCod ? ` so với ${v.heLuiCod}` : ""}`);
  }
  else if (v.lyDo.includes("gang")) p.push(v.soNgayLuiCod === 0 ? "trên găng, COD chưa lùi" : "trên găng");
  if (v.lyDo.includes("vuot-moc")) p.push("vượt mốc bắt buộc");
  if (v.tienVnd !== null && v.tienVnd > 0) p.push(soTien(v.tienVnd));
  return p.join(" · ");
}

/**
 * Dòng kèm (agent khác, cùng mã WBS) thường chép lại nguyên tên đầu việc đã in ở
 * dòng gốc — đo 25/09: 150 ký tự "Cung cấp Hub, Nacelle…" lặp hai lần. Đoạn chung
 * dài ≥ 30 ký tự thay bằng "…" cho vừa màn điện thoại; phần còn lại giữ nguyên chữ.
 */
export function rutPhanTrung(kem: string, goc: string): string {
  let tot = { i: 0, dai: 0 };
  for (let i = 0; i < kem.length; i++) {
    let dai = tot.dai + 1;
    while (i + dai <= kem.length && goc.includes(kem.slice(i, i + dai))) {
      tot = { i, dai };
      dai += 1;
    }
  }
  if (tot.dai < 30) return kem;
  return `${kem.slice(0, tot.i).trimEnd()} … ${kem.slice(tot.i + tot.dai).trimStart()}`.replace(/\s+/g, " ").trim();
}

/**
 * In MỘT vấn đề. ⭐ 04/10 (kịch bản theo người nhận): mẫu nào cũng dùng hàm này,
 * chỉ bật/tắt dòng kèm agent khác và câu hỏi 🤖 theo tham số của mẫu.
 */
export function motVanDe(v: VanDeSang, stt: number, tuy: { kem?: boolean; cauHoi?: boolean } = {}): string {
  const ma = v.wbs && !v.tieuDe.includes(v.wbs) ? `${v.wbs} · ` : "";
  const bot = v.doLlmSinh ? "🤖 " : "";
  // ⭐ 26/09 luật "mã kèm tên": dòng kèm bị rút phần trùng ("WBS 6.1.4 … — trên găng")
  // mất luôn tên việc → lưới chèn lại tên ngắn; dòng đã có tên thì để yên.
  const td = taoTuDien([[v.wbs, v.tenWbs]]);
  const d: string[] = [ganTenChoMa(`${stt}. ${bot}${ma}${v.tieuDe} — ${soAnhHuong(v)} (${v.tenAgent})`, td)];
  if (tuy.kem !== false) {
    for (const k of v.kem) {
      d.push(ganTenChoMa(`   + ${k.tenAgent}: ${k.doLlmSinh ? "🤖 " : ""}${rutPhanTrung(k.tieuDe, v.tieuDe)}`, td));
    }
  }
  if (v.cauHoi && tuy.cauHoi !== false) d.push(`   🤖 → ${ganTenCauHoi(v.cauHoi, v.wbs, v.tenWbs)}`);
  return d.join("\n");
}

/** Lớp chữ cái Latin + tiếng Việt (không gồm số) — ES5, không dùng \p{L} */
const CHU_CAI = "A-Za-zÀ-ɏḀ-ỿ";

/**
 * Lưới "mã kèm tên" cho câu hỏi 🤖. AI đã tự viết tên NGAY SAU mã (dù ngắn, khác chữ tên
 * trong sổ — "7.2.3 San nền: …") thì để nguyên; mã trơn mới gắn tên.
 * Vì sao không dùng thẳng `ganTenChoMa`: hàm chung so 2 chữ đầu tên sổ ("Thi công") với chữ
 * AI viết ("San nền") → không khớp → gắn thêm → "7.2.3 Thi công san nền San nền: …"
 * (kiểm độc lập 04/10 ⚪6: 19 câu 🤖 lặp tên trong 3 mẫu đo). Hàm chung giữ nguyên.
 */
export function ganTenCauHoi(cau: string, wbs: string | null | undefined, tenWbs: string | null | undefined): string {
  if (wbs) {
    const ma = wbs.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`(^|[^0-9.])${ma}\\s+[${CHU_CAI}]`).test(cau)) return cau;
  }
  return ganTenChoMa(cau, taoTuDien([[wbs, tenWbs]]));
}

// ─────────────────────────────────────────────────────────────
// 5b. ⭐ 04/10 — VIỆC ĐỎ NGOÀI LUẬT COD (cho bản "Dự án" của PM)
//
// Đo 04/10: HV 51 thẻ (20 đỏ) · N3A 49 thẻ (46 đỏ, 43 của Hợp đồng) — chỉ 10
// thẻ lọt luật COD. Phần đỏ còn lại là việc PM phải xử lý; Main CHỈ chép lại
// tiêu đề + số agent trả, không tự chấm mức.
// ─────────────────────────────────────────────────────────────

export interface ViecKhac {
  maDuAn: string;
  agent: string;
  tenAgent: string;
  idIssue: string;
  /** Mã WBS thật; null khi thẻ không gắn mã */
  wbs: string | null;
  tenWbs?: string | null;
  tieuDe: string;
  /** Số ngày quá hạn agent trả; null = không có số */
  soNgayQuaHan: number | null;
  /** Ngày ISO mở thẻ; null = không rõ */
  ngayMo: string | null;
  doLlmSinh: boolean;
}

/** Thẻ ĐỎ không đạt luật COD của MỘT agent, MỘT dự án */
export function locViecDoKhac(ds: readonly TheIssueTho[], maDuAn: string, agent: string, tenAgent: string): ViecKhac[] {
  const ra: ViecKhac[] = [];
  for (const t of ds) {
    if (lyDoVaoBaoCao(t).length > 0) continue;
    if (mucDo(t.mucDo) !== "do") continue;
    const tieuDe = chuanChu(typeof t.tieu_de === "string" ? t.tieu_de : "");
    if (tieuDe === "") continue;
    ra.push({
      maDuAn,
      agent,
      tenAgent: tenNganAgent(tenAgent),
      idIssue: typeof t.id === "string" ? t.id : "",
      wbs: maWbsThat(t.wbs),
      tieuDe,
      soNgayQuaHan: so(t.so_ngay_qua_han),
      ngayMo: typeof t.ngay_mo === "string" && t.ngay_mo.trim() !== "" ? t.ngay_mo.slice(0, 10) : null,
      doLlmSinh: t.doLlmSinh === true,
    });
  }
  return ra;
}

/** Xếp việc đỏ: quá hạn nhiều trước → mở gần đây trước (việc mới cần biết sớm) */
export function soSanhViecKhac(a: ViecKhac, b: ViecKhac): number {
  const qa = a.soNgayQuaHan ?? 0;
  const qb = b.soNgayQuaHan ?? 0;
  if (qa !== qb) return qb - qa;
  return (b.ngayMo ?? "").localeCompare(a.ngayMo ?? "");
}

export interface DauVaoTinNhan {
  ngay: string;
  duAn: readonly DauDuAn[];
  vanDe: readonly VanDeSang[];
  /** Agent không hỏi được — một dòng mỗi con. Có `maDuAn` thì chỗ thiếu của dự án im lặng không in (13/10) */
  chuaHoiDuoc: readonly { ten: string; lyDo: string; maDuAn?: string }[];
  /** Luật động còn hiệu lực — in một dòng */
  luat: readonly { noiDung: string; moTaHieuLuc: string }[];
  /** Địa chỉ màn Cảnh báo của Main (từ DIA_CHI_MAIN) */
  lienKetIssue: string;
}

/**
 * Dựng chữ gửi Telegram. Dài quá trần thì BỎ NGUYÊN DÒNG VẤN ĐỀ từ cuối lên (dòng
 * đầu dự án luôn giữ), thay bằng "… còn N việc — xem ở Main" — không cắt giữa câu.
 */
export function ketXuatTinNhan(d: DauVaoTinNhan, tran = TRAN_TIN_NHAN): string {
  const theoDuAn = new Map<string, VanDeSang[]>();
  for (const v of d.vanDe) {
    const ds = theoDuAn.get(v.maDuAn) ?? [];
    ds.push(v);
    theoDuAn.set(v.maDuAn, ds);
  }
  const tongVanDe = d.vanDe.length;
  // 13/10: dự án chưa có tiến độ và không có việc thì không in — có tiến độ sẽ tự hiện
  const imLang = maDuAnImLang(d.duAn, (ma) => (theoDuAn.get(ma)?.length ?? 0) > 0);
  const chuaHoiDuoc = d.chuaHoiDuoc.filter((t) => !t.maDuAn || !imLang.has(t.maDuAn));

  const dung = (giu: number): string => {
    const p: string[] = [`📋 Báo cáo sáng ${d.ngay.slice(8, 10)}/${d.ngay.slice(5, 7)} — việc làm chậm COD (${tongVanDe})`];
    let daIn = 0;
    for (const da of d.duAn) {
      if (imLang.has(da.maDuAn)) continue;
      p.push("");
      p.push(dongDauDuAn(da));
      const ds = theoDuAn.get(da.maDuAn) ?? [];
      if (ds.length === 0 && da.coTienDo) p.push("✓ Không có việc nào làm chậm COD");
      ds.forEach((v, i) => {
        if (daIn < giu) p.push(motVanDe(v, i + 1));
        daIn += 1;
      });
    }
    // Vấn đề của dự án không có trong danh sách đầu (hiếm — sổ dự án đổi giữa chừng)
    const maDa = new Set(d.duAn.map((x) => x.maDuAn));
    const lac = d.vanDe.filter((v) => !maDa.has(v.maDuAn));
    if (lac.length > 0) {
      p.push("");
      lac.forEach((v, i) => {
        if (daIn < giu) p.push(motVanDe(v, i + 1));
        daIn += 1;
      });
    }
    const con = tongVanDe - Math.min(giu, tongVanDe);
    p.push("");
    if (con > 0) p.push(`… còn ${con} việc — xem ở Main: ${d.lienKetIssue}`);
    if (chuaHoiDuoc.length > 0) {
      p.push(`⚠️ Chưa hỏi được: ${chuaHoiDuoc.map((t) => `${t.ten} — ${t.lyDo}`).join(" · ")}`);
    }
    if (d.luat.length > 0) {
      p.push(`📌 Luật đang áp: ${d.luat.map((l) => `«${l.noiDung}» (${l.moTaHieuLuc})`).join(" · ")}`);
    }
    if (con === 0) p.push(`Xem và xử lý: ${d.lienKetIssue}`);
    return p.join("\n");
  };

  for (let giu = tongVanDe; giu >= 0; giu--) {
    const chu = dung(giu);
    if (chu.length <= tran) return chu;
  }
  // Chỉ riêng dòng đầu dự án đã quá trần (không xảy ra với vài chục dự án) —
  // bỏ nguyên dòng từ cuối, vẫn không cắt giữa câu.
  const dong = dung(0).split("\n");
  while (dong.join("\n").length > tran - 60 && dong.length > 1) dong.pop();
  dong.push(`… xem đủ ở Main: ${d.lienKetIssue}`);
  return dong.join("\n");
}

// ─────────────────────────────────────────────────────────────
// 6. Kiểm câu hỏi 🤖 — cấm số ngoài khung
// ─────────────────────────────────────────────────────────────

/** Các "số" trong một đoạn chữ: 30 · 294 · 21/10/2027 · 6.1.4 · 1315/QĐ … tách thành từng cụm chữ số */
export function cacSo(s: string): string[] {
  return (s.match(/\d+/g) ?? []).map((x) => x.replace(/^0+(?=\d)/, ""));
}

/**
 * Câu hỏi LLM viết có được dùng không: phải là câu hỏi, không quá dài, và MỌI
 * con số trong câu đều có trong số code đưa vào (luật "cấm bịa số ngoài khung").
 */
export function cauHoiHopLe(cau: string, khung: string): boolean {
  const c = cau.trim();
  if (c.length < 8 || c.length > 160) return false;
  if (!c.endsWith("?")) return false;
  const choPhep = new Set(cacSo(khung));
  return cacSo(c).every((x) => choPhep.has(x));
}

/** Chữ "khung số" của một vấn đề — đúng thứ đưa cho LLM, dùng lại để soát câu trả lời */
export function khungSoCua(v: VanDeSang, dau: DauDuAn | undefined): string {
  const p = [v.tieuDe, soAnhHuong(v), ...v.kem.map((k) => k.tieuDe)];
  if (v.wbs) p.push(v.wbs);
  if (dau && dau.coTienDo) p.push(dongDauDuAn(dau));
  return p.join(" | ");
}
