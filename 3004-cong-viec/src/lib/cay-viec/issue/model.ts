// ============================================================
// cay-viec/issue/model.ts — MÀN ISSUE của agent Công việc: MÔ HÌNH DỮ LIỆU (chép lib/canh-bao/model.ts của agent Base,
// Mr. Đại chốt 03/10/2026: Y HỆT tab, khối, nhãn, công thức, luật sinh — chỉ khác NGUỒN VIỆC: sổ cái của chính agent này).
// File THUẦN (luật 10) — client import được, test được không cần CSDL.
//
// ⚠ KHUÔN THẺ (TheCanhBao) GIỮ NGUYÊN của Base: sau này cổng MCP `base.danh_sach_issue` trả đúng khuôn này cho Main gom
// (agent Công việc giữ mã "base" trên đường dây — Mr. Đại chốt). Đổi tên trường ở đây là Main đọc sai.
//
// SÁU NGUỒN = SÁU TAB (như Base từ 23/09):
//   ⭕ gang       găng chưa ai nhận     — MÁY sinh, CHỈ MÁY đóng
//   ⏰ nang-suat  quá hạn ≥ N ngày      — MÁY sinh, CHỈ MÁY đóng
//   🧱 su-kien    đề xuất tắc ≥ M ngày  — agent Công việc KHÔNG có luồng đề xuất → chưa có nguồn, 0 thẻ (không bịa)
//   📄 xong-giay  xong trên giấy        — MÁY sinh, CHỈ MÁY đóng
//   👤 nguoi      người thêm            — vào sổ NGAY, người đóng
//   🤖 ai         đề xuất chờ duyệt     — CHƯA VÀO SỔ, chờ người Duyệt / Bác bỏ
// HAI TRỤC TRẠNG THÁI hiện cùng lúc: Điều kiện (máy giữ nguồn máy, người giữ nguồn người) · Xử lý (LUÔN người ghi).
// LUẬT CHẶN 10.0: thẻ thiếu "Ảnh hưởng COD" hoặc "🤖 Đề xuất" thì KHÔNG hiện.
// ============================================================

export type MucDo = "red" | "yellow" | "green";

export type NguonIssue = "gang" | "nang-suat" | "su-kien" | "xong-giay" | "nguoi" | "ai";

export type TrangThaiDieuKien = "dang-vi-pham" | "het-vi-pham" | "cho-on-dinh" | "da-dong";
export type TrangThaiXuLy = "chua-ai-dong" | "da-tiep-nhan" | "da-giao-viec" | "dang-xu-ly";

export const NHAN_DIEU_KIEN: Record<TrangThaiDieuKien, string> = {
  "dang-vi-pham": "Đang vi phạm",
  "het-vi-pham": "Hết vi phạm",
  "cho-on-dinh": "Chờ ổn định 2 tuần",
  "da-dong": "Đã đóng",
};

export const NHAN_XU_LY: Record<TrangThaiXuLy, string> = {
  "chua-ai-dong": "Chưa ai động",
  "da-tiep-nhan": "Đã tiếp nhận",
  "da-giao-viec": "Đã giao việc",
  "dang-xu-ly": "Đang xử lý",
};

/** Nhãn tab — chữ y Base; N/M/K đọc từ ngưỡng đang áp (Base ghi cứng 7 và 5 trên nhãn — ở đây sửa được nên ghi theo số thật) */
export function nhanTab(n: NguonIssue, ng: { N: number; M: number } = { N: 7, M: 5 }): string {
  switch (n) {
    case "gang":
      return "⭕ Găng chưa ai nhận";
    case "nang-suat":
      return `⏰ Quá hạn ≥ ${ng.N} ngày`;
    case "su-kien":
      return `🧱 Đề xuất tắc ≥ ${ng.M} ngày`;
    case "xong-giay":
      return "📄 Xong trên giấy";
    case "nguoi":
      return "👤 Issue do người thêm";
    case "ai":
      return "🤖 Đề xuất chờ duyệt";
  }
}

export const CAC_TAB: NguonIssue[] = ["gang", "nang-suat", "su-kien", "xong-giay", "nguoi", "ai"];
/** Tab HIỆN trên màn Issue — Mr. Đại chốt 06/10: bỏ tab "⭕ Găng chưa ai nhận" (trùng dòng "CHƯA AI ĐƯỢC GIAO" ở Cây việc & đường găng;
 *  thẻ găng vẫn sinh trong sổ để Việc của tôi + bảng tổng Main thấy, nhưng chỉ HIỆN ở Cây việc). */
// 07/10 (đợt 2, Mr. Đại chốt): bỏ luôn tab "🧱 Đề xuất tắc" — agent Công việc không có luồng đề xuất, tab luôn 0 (luật 22)
export const CAC_TAB_MAN_ISSUE: NguonIssue[] = CAC_TAB.filter((k) => k !== "gang" && k !== "su-kien");

/** "Hiện lại bỏ qua" xem lại được bao nhiêu ngày (khuôn Issue hai loại, chốt 06/10) */
export const SO_NGAY_HIEN_LAI_BO_QUA = 30;
export const hienLaiBoQuaDuoc = (t: Pick<TheCanhBao, "khongCanGiao">, bayGio = Date.now()) =>
  !!t.khongCanGiao && bayGio - Date.parse(t.khongCanGiao.luc) <= SO_NGAY_HIEN_LAI_BO_QUA * 86_400_000;
/**
 * Thẻ đang BỎ QUA? Q4 (chốt 06/10): Bỏ qua quá 30 ngày thì QUÊN HẲN — vấn đề còn thì thẻ hiện lại như thường. Riêng thẻ găng: bỏ qua
 * = đánh dấu "không cần giao" ở Cây việc (sổ riêng, không hết hạn) → giữ.
 */
export const dangBoQua = (t: Pick<TheCanhBao, "khongCanGiao" | "nguon">, bayGio = Date.now()) =>
  !!t.khongCanGiao && (t.nguon === "gang" || hienLaiBoQuaDuoc(t, bayGio));

/** Nguồn máy sinh — CHỈ MÁY đóng được (8.2c) */
export function laNguonMay(n: NguonIssue): boolean {
  return n === "gang" || n === "nang-suat" || n === "su-kien" || n === "xong-giay";
}

export interface GhiNhanXuLy {
  luc: string;
  nguoi: string;
  viecDaLam: string;
  chuyenSang: TrangThaiXuLy;
}

/** Mã agent trên đường dây — agent Công việc giữ mã "base" (Mr. Đại chốt), tên hiện "Agent Công việc" */
export type MaAgent = "tien-do" | "phap-ly" | "hop-dong" | "base" | "main";
export const AGENT_NAY: MaAgent = "base";
export const TEN_AGENT: Record<MaAgent, string> = {
  "tien-do": "Agent tiến độ",
  "phap-ly": "Agent pháp lý",
  "hop-dong": "Agent hợp đồng",
  base: "Agent Công việc",
  main: "Main Agent",
};

export type PhamViIssue = "agent-nay" | "da-dong";
export const NHAN_PHAM_VI: Record<PhamViIssue, string> = {
  "agent-nay": `Chỉ issue của ${TEN_AGENT[AGENT_NAY]}`,
  "da-dong": "Đã đóng — xem lại",
};
export const CAC_PHAM_VI: PhamViIssue[] = ["agent-nay", "da-dong"];

/** MỘT THẺ — đủ 9 phần (Base PLAN-AGENT-TIEN-DO 10.0). Khuôn giữ nguyên Base. */
export interface TheCanhBao {
  id: string;
  nguon: NguonIssue;
  mucDo: MucDo;
  tieuDe: string;
  phanTich: string;
  /** Đối tượng — mã WBS; thẻ GOM THEO NGƯỜI dùng làm KHOÁ GOM ("người:<mã>" · "xong-giấy:<mã>" · "chưa-đóng:<mã>") */
  wbs?: string;
  /** Thẻ gom theo người: các mã WBS THẬT của mọi việc trong thẻ */
  wbsLienQuan?: string[];
  chuoiLanTruyen?: string[];
  anhHuongCod: number;
  trungChuoiVoi?: string;
  nguonDuLieu: string;
  deXuat: string;
  thieuDuLieu?: string;
  dieuKien: TrangThaiDieuKien;
  xuLy: TrangThaiXuLy;
  ghiNhan: GhiNhanXuLy[];
  an?: boolean;
  /** Bỏ qua ở khối giao việc dưới thẻ = "không cần giao việc", NHỚ LUÔN tới khi bỏ đánh dấu (Mr. Đại chốt 04/10/2026 tối) */
  khongCanGiao?: { nguoi: string; luc: string };
  agent?: MaAgent;
  soNgayTre?: number;
  trenDuongGang?: boolean;
  ngayMo: string;
  soTuanMo?: number;
  trichNguyenVan?: string;
  chuaVaoSo?: boolean;
  lyDoBacBo?: string;
  nguoiMo?: string;
  nguoiTheoDoi?: string;
  hanXuLy?: string;
}

export function laCuaAgentNay(t: Pick<TheCanhBao, "agent">): boolean {
  return (t.agent ?? AGENT_NAY) === AGENT_NAY;
}

/** Phép lọc DUY NHẤT của màn (chốt 25/09): chỉ thẻ của chính agent này, tách đang mở / đã đóng */
export function locIssueManHinh(ds: TheCanhBao[], phamVi: PhamViIssue): TheCanhBao[] {
  const cuaMinh = ds.filter(laCuaAgentNay);
  return phamVi === "da-dong" ? cuaMinh.filter((t) => t.dieuKien === "da-dong") : cuaMinh.filter((t) => t.dieuKien !== "da-dong");
}

const MAU_MA_WBS = /^\d+(?:\.\d+)*$/;

/** So mã WBS theo từng đoạn số (1.1.9 trước 1.1.10) */
export function sanhMa(a: string, b: string): number {
  const x = a.split(".").map(Number);
  const y = b.split(".").map(Number);
  for (let k = 0; k < Math.max(x.length, y.length); k++) {
    const d = (x[k] ?? -1) - (y[k] ?? -1);
    if (d !== 0) return d;
  }
  return 0;
}

/** Rút các mã WBS thật (không trùng, xếp theo đoạn số) từ các việc đã gom vào một thẻ */
export function maWbsLienQuan(ds: { wbs?: string | null }[]): string[] {
  const tap = new Set<string>();
  for (const d of ds) {
    const m = typeof d.wbs === "string" ? d.wbs.trim() : "";
    if (MAU_MA_WBS.test(m)) tap.add(m);
  }
  return Array.from(tap).sort(sanhMa);
}

/** LUẬT CHẶN 10.0 */
export function theHopLe(t: TheCanhBao): boolean {
  if (typeof t.anhHuongCod !== "number" || Number.isNaN(t.anhHuongCod)) return false;
  if (!t.deXuat || t.deXuat.trim() === "") return false;
  if (t.nguon === "ai" && (!t.trichNguyenVan || t.trichNguyenVan.trim() === "")) return false;
  return true;
}

/** Đỏ trước, rồi ảnh hưởng COD nhiều hơn lên trước */
export function sapXep(a: TheCanhBao, b: TheCanhBao): number {
  const m = (x: MucDo): number => (x === "red" ? 0 : x === "yellow" ? 1 : 2);
  if (m(a.mucDo) !== m(b.mucDo)) return m(a.mucDo) - m(b.mucDo);
  return b.anhHuongCod - a.anhHuongCod;
}

/** BỨC TRANH CHUNG — KHÔNG cộng dồn ảnh hưởng COD: con số đưa ra là ẢNH HƯỞNG NẶNG NHẤT */
export interface TongCanhBao {
  soDangMo: number;
  soDo: number;
  soVang: number;
  codNangNhat: number;
  theNangNhat: TheCanhBao | null;
  soChuaAiDong: number;
  soDeLau: number;
}

export function dangMo(t: TheCanhBao): boolean {
  return t.dieuKien !== "da-dong";
}

export function tongCanhBao(ds: TheCanhBao[]): TongCanhBao {
  const mo = ds.filter(dangMo);
  let codNangNhat = 0;
  let theNangNhat: TheCanhBao | null = null;
  for (const t of mo) {
    if (t.trungChuoiVoi) continue;
    if (t.anhHuongCod > codNangNhat) {
      codNangNhat = t.anhHuongCod;
      theNangNhat = t;
    }
  }
  return {
    soDangMo: mo.length,
    soDo: mo.filter((t) => t.mucDo === "red").length,
    soVang: mo.filter((t) => t.mucDo === "yellow").length,
    codNangNhat,
    theNangNhat,
    soChuaAiDong: mo.filter((t) => t.xuLy === "chua-ai-dong").length,
    soDeLau: mo.filter((t) => (t.soTuanMo ?? 0) >= 3).length,
  };
}

export function soTuanGiua(tu: string, den: string): number {
  const a = new Date(tu + "T00:00:00Z").getTime();
  const b = new Date(den + "T00:00:00Z").getTime();
  return Math.max(0, Math.floor((b - a) / (7 * 86400000)));
}

/** LUẬT 8.4 ② — vàng mở 3 tuần chưa ai động thì TỰ LÊN ĐỎ */
export function tuNangMuc(t: TheCanhBao, homNay: string): TheCanhBao {
  const tuan = soTuanGiua(t.ngayMo, homNay);
  if (t.mucDo === "yellow" && t.xuLy === "chua-ai-dong" && tuan >= 3) {
    return { ...t, soTuanMo: tuan, mucDo: "red", phanTich: t.phanTich + ` — mở tuần thứ ${tuan + 1} mà chưa ai động, tự nâng 🟡 → 🔴 (luật 8.4②).` };
  }
  return { ...t, soTuanMo: tuan };
}

export const khoaThe = (t: Pick<TheCanhBao, "nguon" | "wbs">): string => `${t.nguon}|${t.wbs ?? ""}`;

/** LUẬT 8.4 ① — KHÔNG MỞ TRÙNG: cùng nguồn + đối tượng đang mở → cập nhật số liệu, GIỮ mã, ngày mở, lịch sử xử lý */
export function bo_trung(cu: TheCanhBao[], moi: TheCanhBao[]): TheCanhBao[] {
  const dangCo = new Map<string, TheCanhBao>();
  for (const t of cu) if (dangMo(t)) dangCo.set(khoaThe(t), t);
  const ra: TheCanhBao[] = [...cu];
  for (const t of moi) {
    const k = khoaThe(t);
    const co = dangCo.get(k);
    if (co) {
      const i = ra.indexOf(co);
      ra[i] = { ...t, id: co.id, ngayMo: co.ngayMo, ghiNhan: co.ghiNhan, xuLy: co.xuLy, nguoiTheoDoi: co.nguoiTheoDoi, an: co.an, ...(dangBoQua(co) ? { khongCanGiao: co.khongCanGiao } : {}) };
    } else {
      ra.push(t);
      dangCo.set(k, t);
    }
  }
  return ra;
}

/** ISS-<năm>-<tuần ISO>-<số> — lấy SỐ LỚN NHẤT đã dùng +1 (bài học sổ có lỗ của Base 02/09) */
export function maIssueMoi(daCo: Pick<TheCanhBao, "id">[], ngay: string): string {
  const d = new Date(ngay + "T00:00:00Z");
  const t = new Date(d);
  t.setUTCDate(t.getUTCDate() + 3 - ((t.getUTCDay() + 6) % 7));
  const dauNam = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  const tuan = 1 + Math.round(((t.getTime() - dauNam.getTime()) / 86400000 - 3 + ((dauNam.getUTCDay() + 6) % 7)) / 7);
  const tienTo = `ISS-${t.getUTCFullYear()}-${String(tuan).padStart(2, "0")}-`;
  let max = 0;
  for (const x of daCo) {
    if (!x.id.startsWith(tienTo)) continue;
    const n = Number(x.id.slice(tienTo.length));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${tienTo}${String(max + 1).padStart(3, "0")}`;
}

/** Đếm thẻ đang mở theo tab (chỉ thẻ của agent này) */
export function demTheoTab(ds: TheCanhBao[]): Record<NguonIssue, number> {
  const d: Record<NguonIssue, number> = { gang: 0, "nang-suat": 0, "su-kien": 0, "xong-giay": 0, nguoi: 0, ai: 0 };
  for (const t of ds) if (laCuaAgentNay(t) && t.dieuKien !== "da-dong") d[t.nguon]++;
  return d;
}

/** Thông tin tối thiểu một đầu việc WBS mà thẻ nhắc tới — để màn hiện "mã + tên" (luật 30) và soạn việc giao */
export interface DauViecNho {
  ten: string;
  end?: string;
  gang?: boolean;
}

/** Sổ issue một dự án (file data/cay-viec/issue/<dự án>.json) */
export interface SoIssue {
  lanChayCuoi: string;
  the: TheCanhBao[];
  /** Ghi chú lượt sinh gần nhất — vì sao thiếu nguồn / trống (màn nói thẳng thay vì tab trống câm) */
  ghiChu?: string[];
  /** Số đo lượt sinh gần nhất */
  doDuoc?: Record<string, number>;
  /** Mã → tên các đầu việc thẻ nhắc tới (lấy từ cây lần sinh gần nhất) */
  dauViec?: Record<string, DauViecNho>;
}
