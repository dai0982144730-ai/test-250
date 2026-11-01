// ============================================================
// ai/tai-khoan-claude.ts — HAI TÀI KHOẢN CLAUDE CÔNG TY + TÀI KHOẢN CLAUDE CÁ NHÂN (Quản lý token AI, Mr. Đại chốt 04/10/2026).
// Nhân bản từ agent Công việc (cùng tên tệp) — Đợt 2. CHỈ SERVER.
//
// Mỗi tài khoản một THƯ MỤC ĐĂNG NHẬP riêng (biến CLAUDE_CONFIG_DIR của Claude CLI — thư mục mới thì CLI báo "chưa đăng nhập",
// tách hẳn khỏi tài khoản đang đăng nhập trên máy). Gốc thư mục: moi-truong-ai.ts (mỗi agent một gốc — tài khoản khai tại từng agent).
//   • Tài khoản 1: <gốc>/tk1 — chưa đăng nhập ở đó thì dùng tài khoản Claude MẶC ĐỊNH của máy chủ (như trước 04/10).
//   • Tài khoản 2: <gốc>/tk2 — chỉ dùng khi bật "Dùng 2 tài khoản Claude" và đã đăng nhập.
//   • Tài khoản cá nhân: <gốc>/ca-nhan/<băm email> — mỗi người tự nối (menu tên → "Tài khoản Claude cá nhân").
// Mỗi tài khoản một HÀNG CHỜ riêng (CLI khoá thư mục đăng nhập nên một tài khoản chạy lần lượt) → hai tài khoản chạy song song.
// Đăng nhập: MỘT cách cho cả ba — link + dán mã (lib/ai/dang-nhap-link.ts). Đã đăng nhập = có tệp .credentials.json trong thư mục.
// (Agent Công việc còn giữ đường "mã dài hạn dán tay" cũ — Đợt 2 không chép vì cửa đó đã đóng trên giao diện.)
//
// Chọn tài khoản cho một lượt (chonTaiKhoan):
//   ① tài khoản CHÍNH = 1; bật "Đảo vai chính/phụ mỗi 24 giờ" thì đổi theo ngày (giờ Việt Nam).
//   ② chính đang bận mà phụ đang rảnh → phụ đỡ.
//   ③ HẾT HẠN MỨC (chu kỳ 5 giờ / hạn mức tuần) → đánh dấu hết tới giờ CLI báo (không báo thì ĐOÁN 15 phút), lượt đó chạy lại
//      ngay trên tài khoản kia. MẤT ĐĂNG NHẬP (401…) → tạm bỏ qua 60 phút rồi thử lại.
//   ④ Hết cả tài khoản công ty → tài khoản cá nhân của CHÍNH người đang hỏi. Việc nền máy tự chạy KHÔNG BAO GIỜ dùng tài khoản
//      cá nhân. Hết sạch tài khoản công ty → ghi khoảng NGỪNG (so-dung-ai.ts) cho Thống kê dùng AI.
// Mồi phiên (tuỳ chọn): tới giờ khai thì gửi một câu ngắn vào tài khoản chính để chu kỳ làm việc bắt đầu từ giờ đó.
// Sự kiện (hết hạn mức, mất đăng nhập, mồi phiên) ghi sổ data/ai-tai-khoan.jsonl — agent Quan sát gom (Đợt 3). Agent Công việc
// báo chuông quản trị; agent này chưa có chuông — thẻ tài khoản ở Cài đặt hiện đúng tình trạng.
// Bốn ô cấu hình: data/ai-tai-khoan-cau-hinh.json (khai tại từng agent; model + chế độ AI vẫn theo Kết nối AI).
// ============================================================
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { gocTaiKhoanClaude, tepAi } from "@/lib/ai/moi-truong-ai";
import { giaiGioMoLai } from "@/lib/ai/thong-ke-ai";
import { ghiNgung } from "@/lib/ai/so-dung-ai";

export type SoTk = 1 | 2;

export interface TrangThaiTk {
  /** số lượt đang chờ + đang chạy */
  dang: number;
  /** trong đó: lượt ưu tiên (chat) đang chờ + chạy — lib/ai/uu-tien.ts */
  dang_uu_tien?: number;
  /** danh sách chờ: lượt ưu tiên đứng trước mọi lượt nền */
  cho?: { uu_tien: boolean; chay: () => void }[];
  /** đang có một lượt chạy trên tài khoản này */
  dang_chay?: boolean;
  /** hết hạn mức tới lúc (ms) — 0 = dùng được */
  het_den: number;
  het_ly_do: string;
  /** mốc het_den chỉ là ĐOÁN 15 phút (CLI không báo giờ mở lại) */
  het_doan?: boolean;
  /** MẤT ĐĂNG NHẬP (401 hết hạn / bị thu hồi, chưa đăng nhập, tổ chức chặn) — tạm bỏ qua tới lúc này rồi thử lại */
  hong_den?: number;
  hong_ly_do?: string;
  luot: { ngay: string; n: number };
}
type G = typeof globalThis & {
  __taiKhoanClaude?: Record<SoTk, TrangThaiTk>;
  __taiKhoanCaNhan?: Map<string, TrangThaiTk>;
  __taiKhoanCauHinh?: { luc: number; ch: CauHinhTk };
  /** kiem = nhịp kiểm của BẢN MÃ MỚI NHẤT (gán lại mỗi lần batMoiPhien được gọi) — setInterval chỉ gọi qua đây (G4, 18/10/2026) */
  __moiPhien?: { timer?: ReturnType<typeof setInterval>; ngay?: string; kiem?: () => Promise<void> };
};

export interface CauHinhTk {
  hai_tai_khoan: boolean;
  dao_vai_24h: boolean;
  moi_phien_bat: boolean;
  moi_phien_gio: string;
}
export const CAU_HINH_TK_MAC_DINH: CauHinhTk = { hai_tai_khoan: false, dao_vai_24h: false, moi_phien_bat: false, moi_phien_gio: "07:00" };

const ngayVN = (ms = Date.now()) => new Date(ms + 7 * 3600_000).toISOString().slice(0, 10);
const TEP_DANG_NHAP = ".credentials.json";

function taoThuMuc(d: string): string {
  try {
    fs.mkdirSync(d, { recursive: true });
  } catch {
    /* không tạo được thì CLI tự báo lỗi */
  }
  return d;
}

export function thuMucTk(so: SoTk): string {
  return taoThuMuc(path.join(gocTaiKhoanClaude(), `tk${so}`));
}

/** Tài khoản công ty đã đăng nhập riêng (link + dán mã) — trạng thái đầy đủ lấy bằng `claude auth status` */
export function coDangNhap(so: SoTk): boolean {
  return fs.existsSync(path.join(thuMucTk(so), TEP_DANG_NHAP));
}

/** Vừa đăng nhập xong bằng LINK — có thể là tài khoản khác → bỏ mốc hết hạn mức / mất đăng nhập cũ */
export function daDangNhapLinkCongTy(so: SoTk): void {
  const st = trangThai(so);
  st.het_den = 0;
  st.het_ly_do = "";
  st.het_doan = false;
  st.hong_den = 0;
  st.hong_ly_do = "";
  ghiHet();
}

/**
 * Đăng xuất tài khoản công ty: xoá tệp đăng nhập trong thư mục RIÊNG của tài khoản đó. Không bao giờ đụng tài khoản mặc định
 * của máy (Claude Code của người cài máy) — TK1 chưa đăng nhập riêng thì không có gì để xoá.
 */
export function dangXuatCongTy(so: SoTk): boolean {
  try {
    fs.unlinkSync(path.join(thuMucTk(so), TEP_DANG_NHAP));
    boDauHong(so);
    return true;
  } catch {
    return false;
  }
}

/** CLAUDE_CONFIG_DIR cho tài khoản: tk1 chưa đăng nhập riêng → undefined (dùng tài khoản mặc định của máy) */
export function thuMucChay(so: SoTk): string | undefined {
  if (so === 2) return thuMucTk(2);
  return coDangNhap(1) ? thuMucTk(1) : undefined;
}

// ----- TÀI KHOẢN CÁ NHÂN -----

/** Khoá người = email viết thường (đăng nhập chung 5 agent theo email) */
export const khoaNguoi = (nguoi: string): string => String(nguoi ?? "").trim().toLowerCase();

/** Thư mục tài khoản cá nhân của một người: tên thư mục = băm email (email có ký tự lạ) */
export function thuMucCaNhan(nguoi: string): string {
  const bam = crypto.createHash("sha256").update(khoaNguoi(nguoi)).digest("hex").slice(0, 16);
  return path.join(gocTaiKhoanClaude(), "ca-nhan", bam);
}

/** Người này đã nối tài khoản Claude cá nhân */
export function coDangNhapCaNhan(nguoi: string): boolean {
  return !!khoaNguoi(nguoi) && fs.existsSync(path.join(thuMucCaNhan(nguoi), TEP_DANG_NHAP));
}

/** Vừa đăng nhập bằng LINK xong → bỏ mốc hết hạn mức / mất đăng nhập cũ */
export function daDangNhapLinkCaNhan(nguoi: string): void {
  boMocCaNhan(nguoi);
}

function boMocCaNhan(nguoi: string): void {
  const st = trangThaiCaNhan(nguoi);
  st.het_den = 0;
  st.hong_den = 0;
  st.hong_ly_do = "";
  ghiHetCaNhan(nguoi, 0, 0);
}

/** Đăng xuất tài khoản cá nhân: xoá tệp đăng nhập + mốc hết hạn mức */
export function xoaDangNhapCaNhan(nguoi: string): boolean {
  const dir = thuMucCaNhan(nguoi);
  let ok = false;
  for (const f of [TEP_DANG_NHAP, TEP_HET_CA_NHAN]) {
    try {
      fs.unlinkSync(path.join(dir, f));
      if (f === TEP_DANG_NHAP) ok = true;
    } catch {
      /* không có */
    }
  }
  (globalThis as G).__taiKhoanCaNhan?.delete(khoaNguoi(nguoi));
  return ok;
}

/** Mốc hết hạn mức + dấu mất đăng nhập của tài khoản cá nhân ghi đĩa riêng — khởi động lại không quên */
const TEP_HET_CA_NHAN = "sci-het-han-muc.json";

function ghiHetCaNhan(nguoi: string, hetDen: number, hongDen = 0): void {
  const dir = thuMucCaNhan(nguoi);
  try {
    if (hetDen > 0 || hongDen > 0) fs.writeFileSync(path.join(taoThuMuc(dir), TEP_HET_CA_NHAN), JSON.stringify({ het_den: hetDen, hong_den: hongDen }));
    else fs.unlinkSync(path.join(dir, TEP_HET_CA_NHAN));
  } catch {
    /* chỉ mất mốc khi khởi động lại */
  }
}

function docHetCaNhan(nguoi: string): { het: number; hong: number } {
  try {
    const d = JSON.parse(fs.readFileSync(path.join(thuMucCaNhan(nguoi), TEP_HET_CA_NHAN), "utf8")) as { het_den?: unknown; hong_den?: unknown };
    return { het: typeof d.het_den === "number" ? d.het_den : 0, hong: typeof d.hong_den === "number" ? d.hong_den : 0 };
  } catch {
    return { het: 0, hong: 0 };
  }
}

/** Hàng chờ + mốc hết hạn mức + dấu mất đăng nhập của tài khoản cá nhân (giống tài khoản công ty, mỗi người một bộ) */
export function trangThaiCaNhan(nguoi: string): TrangThaiTk {
  const g = globalThis as G;
  g.__taiKhoanCaNhan ??= new Map();
  const k = khoaNguoi(nguoi);
  let st = g.__taiKhoanCaNhan.get(k);
  if (!st) {
    const { het, hong } = docHetCaNhan(k);
    const nay = Date.now();
    st = { dang: 0, het_den: het > nay ? het : 0, het_ly_do: "", hong_den: hong > nay ? hong : 0, hong_ly_do: "", luot: { ngay: "", n: 0 } };
    g.__taiKhoanCaNhan.set(k, st);
  }
  return st;
}

/**
 * Tài khoản cá nhân MẤT ĐĂNG NHẬP (401 hết hạn / bị thu hồi…): đánh dấu để thẻ "Tài khoản Claude cá nhân" hiện "Mất đăng nhập —
 * Đăng nhập lại" ngay (CLI `auth status` không kiểm phiên nên tự nó vẫn báo "đã đăng nhập"). KHÔNG đổi đường chạy: lượt sau vẫn
 * thử (401 trả về ngay, 0 token). Trả lời được lần nào thì bỏ dấu.
 */
export function danhDauHongCaNhan(nguoi: string, msg: string): void {
  const st = trangThaiCaNhan(nguoi);
  st.hong_den = Date.now() + THU_LAI_HONG_MS;
  st.hong_ly_do = msg.slice(0, 200);
  ghiHetCaNhan(nguoi, st.het_den, st.hong_den);
  ghiSo({ su_kien: "mat_dang_nhap_ca_nhan", nguoi: khoaNguoi(nguoi), thu_lai_luc: new Date(st.hong_den).toISOString() });
}

/** Tài khoản cá nhân đang mang dấu mất đăng nhập */
export function caNhanMatDangNhap(nguoi: string): boolean {
  return (trangThaiCaNhan(nguoi).hong_den ?? 0) > Date.now();
}

/** Tài khoản cá nhân vừa trả lời được → bỏ dấu mất đăng nhập (nếu có) */
export function boDauHongCaNhan(nguoi: string): void {
  const st = trangThaiCaNhan(nguoi);
  if (!st.hong_den) return;
  st.hong_den = 0;
  st.hong_ly_do = "";
  ghiHetCaNhan(nguoi, st.het_den, 0);
}

/** Người này có tài khoản cá nhân đang DÙNG ĐƯỢC (đã nối, chưa hết hạn mức) */
export function caNhanDungDuoc(nguoi: string | null | undefined): boolean {
  if (!nguoi || !coDangNhapCaNhan(nguoi)) return false;
  return trangThaiCaNhan(nguoi).het_den <= Date.now();
}

/** Tài khoản cá nhân báo hết hạn mức → đánh dấu tới giờ mở lại (giống danhDauHet), ghi đĩa */
export function danhDauHetCaNhan(nguoi: string, msg: string, hetDen?: number | null): number {
  const st = trangThaiCaNhan(nguoi);
  const nay = Date.now();
  const doc = hetDen && hetDen > nay ? hetDen : giaiGioMoLai(msg, nay);
  st.het_den = doc && doc > nay ? doc : nay + 15 * 60_000;
  st.het_ly_do = msg.slice(0, 200);
  ghiHetCaNhan(nguoi, st.het_den, st.hong_den ?? 0);
  ghiSo({ su_kien: "het_han_muc_ca_nhan", nguoi: khoaNguoi(nguoi), mo_lai_luc: new Date(st.het_den).toISOString(), doan_15_phut: !doc });
  return st.het_den;
}

/** Còn ít nhất một tài khoản CÔNG TY dùng được */
export async function conTaiKhoanCongTy(): Promise<boolean> {
  const ch = await cauHinhTk();
  return dungDuoc(1, ch) || dungDuoc(2, ch);
}

/** Giờ sớm nhất một tài khoản công ty mở lại (ms) — 0 nếu không có mốc nào ở tương lai */
export async function gioMoLaiCongTy(): Promise<number> {
  const ch = await cauHinhTk();
  const nay = Date.now();
  const moLuc = (so: SoTk) => Math.max(trangThai(so).het_den, trangThai(so).hong_den ?? 0);
  const mo = [moLuc(1), ...(ch.hai_tai_khoan && coDangNhap(2) ? [moLuc(2)] : [])].filter((t) => t > nay);
  return mo.length ? Math.min(...mo) : 0;
}

/** Tài khoản công ty đang MẤT ĐĂNG NHẬP (để câu báo nói đúng lý do, không gọi chung là "hết hạn mức") */
export function dangMatDangNhap(so: SoTk): boolean {
  return (trangThai(so).hong_den ?? 0) > Date.now();
}

/** "15:00" (hôm nay, giờ VN) hoặc "15:00 ngày 06/10" */
export function gioVN(ms: number): string {
  const d = new Date(ms + 7 * 3600_000).toISOString();
  const gio = d.slice(11, 16);
  return d.slice(0, 10) === ngayVN() ? gio : `${gio} ngày ${d.slice(8, 10)}/${d.slice(5, 7)}`;
}

const TEP_HET = "ai-tai-khoan-het.json";

type HetLuu = { het_den: number; het_ly_do: string; het_doan: boolean; hong_den: number; hong_ly_do: string };

/** Mốc hết hạn mức đã ghi đĩa — chỉ lấy mốc còn ở tương lai */
function docHetDaLuu(): Partial<Record<SoTk, HetLuu>> {
  try {
    const d = JSON.parse(fs.readFileSync(tepAi(TEP_HET), "utf8")) as Record<string, Partial<Record<keyof HetLuu, unknown>>>;
    const ra: Partial<Record<SoTk, HetLuu>> = {};
    const nay = Date.now();
    for (const so of [1, 2] as SoTk[]) {
      const x = d[String(so)];
      const t = typeof x?.het_den === "number" && x.het_den > nay ? x.het_den : 0;
      const h = typeof x?.hong_den === "number" && x.hong_den > nay ? x.hong_den : 0;
      if (t || h)
        ra[so] = {
          het_den: t,
          het_ly_do: t && typeof x?.het_ly_do === "string" ? x.het_ly_do : "",
          het_doan: !!t && x?.het_doan === true,
          hong_den: h,
          hong_ly_do: h && typeof x?.hong_ly_do === "string" ? x.hong_ly_do : "",
        };
    }
    return ra;
  } catch {
    return {};
  }
}

function ghiHet(): void {
  try {
    const d: Record<string, HetLuu> = {};
    for (const so of [1, 2] as SoTk[]) {
      const st = trangThai(so);
      d[String(so)] = { het_den: st.het_den, het_ly_do: st.het_ly_do, het_doan: !!st.het_doan, hong_den: st.hong_den ?? 0, hong_ly_do: st.hong_ly_do ?? "" };
    }
    fs.writeFileSync(tepAi(TEP_HET), JSON.stringify(d, null, 2));
  } catch {
    /* ghi hỏng thì chỉ mất khi khởi động lại — không làm hỏng lượt AI */
  }
}

export function trangThai(so: SoTk): TrangThaiTk {
  const g = globalThis as G;
  if (!g.__taiKhoanClaude) {
    const luu = docHetDaLuu();
    const moi = (s: SoTk): TrangThaiTk => ({
      dang: 0,
      het_den: luu[s]?.het_den ?? 0,
      het_ly_do: luu[s]?.het_ly_do ?? "",
      het_doan: luu[s]?.het_doan ?? false,
      hong_den: luu[s]?.hong_den ?? 0,
      hong_ly_do: luu[s]?.hong_ly_do ?? "",
      luot: { ngay: "", n: 0 },
    });
    g.__taiKhoanClaude = { 1: moi(1), 2: moi(2) };
  }
  return g.__taiKhoanClaude[so];
}

// ----- BỐN Ô CẤU HÌNH (khai tại từng agent) -----
const TEP_CAU_HINH = "ai-tai-khoan-cau-hinh.json";

const gioHopLe = (s: unknown): s is string => typeof s === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

/** Cấu hình hai tài khoản, nhớ 30 giây — lượt AI không phải đọc đĩa mỗi lần */
export async function cauHinhTk(): Promise<CauHinhTk> {
  const g = globalThis as G;
  if (g.__taiKhoanCauHinh && Date.now() - g.__taiKhoanCauHinh.luc < 30_000) return g.__taiKhoanCauHinh.ch;
  let ch: CauHinhTk = { ...CAU_HINH_TK_MAC_DINH };
  try {
    const d = JSON.parse(fs.readFileSync(tepAi(TEP_CAU_HINH), "utf8")) as Partial<CauHinhTk>;
    ch = {
      hai_tai_khoan: d.hai_tai_khoan === true,
      dao_vai_24h: d.dao_vai_24h === true,
      moi_phien_bat: d.moi_phien_bat === true,
      moi_phien_gio: gioHopLe(d.moi_phien_gio) ? d.moi_phien_gio : "07:00",
    };
  } catch {
    /* chưa khai → một tài khoản như cũ */
  }
  g.__taiKhoanCauHinh = { luc: Date.now(), ch };
  return ch;
}

/** Lưu bốn ô cấu hình (bên gọi đã kiểm quyền). Giờ mồi phiên sai dạng → lỗi tiếng Việt. */
export async function luuCauHinhTk(p: Partial<Record<keyof CauHinhTk, unknown>>): Promise<CauHinhTk> {
  quenCauHinhTk();
  const cu = await cauHinhTk();
  if (p.moi_phien_gio !== undefined && !gioHopLe(p.moi_phien_gio)) throw new Error("Giờ mồi phiên ghi dạng giờ:phút, ví dụ 07:00.");
  const moi: CauHinhTk = {
    hai_tai_khoan: typeof p.hai_tai_khoan === "boolean" ? p.hai_tai_khoan : cu.hai_tai_khoan,
    dao_vai_24h: typeof p.dao_vai_24h === "boolean" ? p.dao_vai_24h : cu.dao_vai_24h,
    moi_phien_bat: typeof p.moi_phien_bat === "boolean" ? p.moi_phien_bat : cu.moi_phien_bat,
    moi_phien_gio: gioHopLe(p.moi_phien_gio) ? p.moi_phien_gio : cu.moi_phien_gio,
  };
  fs.writeFileSync(tepAi(TEP_CAU_HINH), JSON.stringify(moi, null, 2));
  quenCauHinhTk();
  return moi;
}

/** Đổi cài đặt xong thì đọc lại ngay */
export function quenCauHinhTk(): void {
  delete (globalThis as G).__taiKhoanCauHinh;
}

/** Tài khoản CHÍNH lúc này: 1, hoặc đảo theo ngày khi bật "Đảo vai chính/phụ mỗi 24 giờ" */
export function taiKhoanChinh(ch: CauHinhTk, ms = Date.now()): SoTk {
  if (!ch.hai_tai_khoan || !ch.dao_vai_24h) return 1;
  return Math.floor((ms + 7 * 3600_000) / 86_400_000) % 2 === 0 ? 1 : 2;
}

function dungDuoc(so: SoTk, ch: CauHinhTk): boolean {
  if (so === 2 && (!ch.hai_tai_khoan || !coDangNhap(2))) return false;
  const st = trangThai(so);
  const nay = Date.now();
  return st.het_den <= nay && (st.hong_den ?? 0) <= nay;
}

/** Lỗi MẤT ĐĂNG NHẬP của tài khoản (401 hết hạn / bị thu hồi, chưa đăng nhập, tổ chức chặn) — câu tiếng Việt của dichLoiCli hoặc câu gốc CLI */
export function laLoiDangNhap(msg: string): boolean {
  return /đăng nhập Claude đã hết hạn|chưa đăng nhập tài khoản Claude|đã TẮT quyền dùng gói thuê bao|failed to authenticate|not logged in|oauth.*(expired|revoked|invalid)/i.test(msg);
}

/** Bao lâu thì thử lại tài khoản mất đăng nhập (phòng 401 nhầm một lần); thử lại mà vẫn 401 thì 0 token, không tốn */
const THU_LAI_HONG_MS = 60 * 60_000;

/**
 * Tài khoản công ty MẤT ĐĂNG NHẬP: đánh dấu "không dùng được", lượt đó chuyển sang tài khoản còn lại rồi tài khoản cá nhân của
 * người hỏi. Hết sạch tài khoản công ty → ghi khoảng ngừng như hết hạn mức.
 */
export async function danhDauHongDangNhap(so: SoTk, msg: string): Promise<void> {
  const st = trangThai(so);
  const nay = Date.now();
  st.hong_den = nay + THU_LAI_HONG_MS;
  st.hong_ly_do = msg.slice(0, 200);
  ghiHet();
  ghiSo({ su_kien: "mat_dang_nhap", tai_khoan: so, thu_lai_luc: new Date(st.hong_den).toISOString(), ly_do: st.hong_ly_do });
  try {
    const khac: SoTk = so === 1 ? 2 : 1;
    if (!dungDuoc(khac, await cauHinhTk())) {
      ghiNgung({ tu: new Date(nay).toISOString(), den: new Date(st.hong_den).toISOString(), ly_do: `Tài khoản Claude ${so} mất đăng nhập, không còn tài khoản công ty khác` });
    }
  } catch {
    /* ghi sổ hỏng không làm hỏng lượt AI */
  }
}

/** Quản trị đăng nhập lại / đăng xuất → bỏ dấu mất đăng nhập, lượt sau thử ngay */
export function boDauHong(so: SoTk): void {
  const st = trangThai(so);
  st.hong_den = 0;
  st.hong_ly_do = "";
  ghiHet();
}

/** Chọn tài khoản cho một lượt (xem đầu tệp). Cả hai đều hết → vẫn trả tài khoản chính (CLI tự báo lỗi tiếng Việt). */
export async function chonTaiKhoan(): Promise<SoTk> {
  const ch = await cauHinhTk();
  const chinh = taiKhoanChinh(ch);
  const phu: SoTk = chinh === 1 ? 2 : 1;
  const dc = dungDuoc(chinh, ch);
  const dp = dungDuoc(phu, ch);
  if (dc && dp) return trangThai(chinh).dang > 0 && trangThai(phu).dang === 0 ? phu : chinh;
  if (dc) return chinh;
  if (dp) return phu;
  return chinh;
}

/**
 * Tài khoản ĐANG PHỤC VỤ (nhãn "Đang dùng" trên thẻ): chính nếu dùng được, không thì phụ. Khác chonTaiKhoan: KHÔNG tính "phụ đỡ
 * khi chính bận" (đổi theo từng giây — nhãn trên màn sẽ nhảy qua lại). Cả hai hết → chính.
 */
export async function taiKhoanDangDung(): Promise<SoTk> {
  const ch = await cauHinhTk();
  const chinh = taiKhoanChinh(ch);
  const phu: SoTk = chinh === 1 ? 2 : 1;
  if (dungDuoc(chinh, ch)) return chinh;
  if (dungDuoc(phu, ch)) return phu;
  return chinh;
}

/** Lỗi do HẾT HẠN MỨC (chu kỳ 5 giờ / hạn mức tuần) — câu tiếng Việt của dichLoiCli hoặc câu gốc tiếng Anh của CLI */
export function laLoiHetLuot(msg: string): boolean {
  return /hết lượt|hết hạn mức của tháng|usage limit|weekly limit|hit your [a-z ]*limit|spend limit|rate limit|quota exceeded|limit reached/i.test(msg);
}

/**
 * Đánh dấu tài khoản hết hạn mức. Giờ mở lại: `hetDen` bên gọi đọc sẵn (câu gốc đã bị dịch sang tiếng Việt), không có thì đọc từ
 * câu báo (giaiGioMoLai: "…|1759380000", "resets 3pm"…), vẫn không có thì thử lại sau 15 phút (mốc ĐOÁN).
 */
export async function danhDauHet(so: SoTk, msg: string, hetDen?: number | null): Promise<void> {
  const st = trangThai(so);
  const nay = Date.now();
  const doc = hetDen && hetDen > nay ? hetDen : giaiGioMoLai(msg, nay);
  st.het_den = doc && doc > nay ? doc : nay + 15 * 60_000;
  st.het_ly_do = msg.slice(0, 200);
  st.het_doan = !(doc && doc > nay);
  ghiHet();
  ghiSo({ su_kien: "het_han_muc", tai_khoan: so, mo_lai_luc: new Date(st.het_den).toISOString(), ly_do: st.het_ly_do, doan_15_phut: !doc });
  try {
    const ch = await cauHinhTk();
    const khac: SoTk = so === 1 ? 2 : 1;
    if (!dungDuoc(khac, ch)) {
      // Không còn tài khoản công ty nào → NGỪNG tới lúc tài khoản sớm nhất mở lại (tk2 chỉ tính khi đang bật + đã đăng nhập)
      const mo = [trangThai(1).het_den, ...(ch.hai_tai_khoan && coDangNhap(2) ? [trangThai(2).het_den] : [])].filter((t) => t > nay);
      ghiNgung({ tu: new Date(nay).toISOString(), den: new Date(mo.length ? Math.min(...mo) : st.het_den).toISOString(), ly_do: `Tài khoản Claude ${so} hết hạn mức, không còn tài khoản công ty khác` });
    }
  } catch {
    /* ghi sổ hỏng không làm hỏng lượt AI */
  }
}

/** Đếm lượt theo ngày (hiện trên thẻ tài khoản) */
export function demLuot(so: SoTk): void {
  const st = trangThai(so);
  const n = ngayVN();
  if (st.luot.ngay !== n) st.luot = { ngay: n, n: 0 };
  st.luot.n++;
}

function ghiSo(d: Record<string, unknown>): void {
  try {
    fs.appendFileSync(tepAi("ai-tai-khoan.jsonl"), JSON.stringify({ luc: new Date().toISOString(), ...d }) + "\n");
  } catch {
    /* sổ hỏng không làm hỏng lượt AI */
  }
}

/** Tình hình hai tài khoản cho thẻ ở Cài đặt (không có mã / bí mật nào) */
export async function tinhHinhTk() {
  const ch = await cauHinhTk();
  const chinh = taiKhoanChinh(ch);
  const n = ngayVN();
  return {
    ...ch,
    chinh,
    tai_khoan: ([1, 2] as SoTk[]).map((so) => {
      const st = trangThai(so);
      return {
        so,
        dang_nhap_rieng: coDangNhap(so),
        dang_chay: st.dang,
        het_den: st.het_den > Date.now() ? new Date(st.het_den).toISOString() : null,
        mat_dang_nhap: dangMatDangNhap(so),
        luot_hom_nay: st.luot.ngay === n ? st.luot.n : 0,
      };
    }),
  };
}

/**
 * MỒI PHIÊN (tuỳ chọn, mặc định tắt): mỗi ngày tới giờ khai (vd 07:00) gửi một câu ngắn vào tài khoản chính để chu kỳ làm việc
 * của hãng bắt đầu từ giờ đó. Kiểm mỗi phút; mỗi ngày một lần. Bộ hẹn giờ bật lười ở lượt AI đầu tiên / lúc mở thẻ tài khoản.
 * Con trỏ `kiem` (G4 — Mr. Đại gật 18/10/2026, cách agent Tiến độ 17a9ac3): `setInterval` giữ hàm của LẦN BẬT ĐẦU — mỗi lượt AI /
 * mở thẻ gọi lại batMoiPhien thì con trỏ trỏ sang mã + hàm gửi mới nhất; bộ hẹn giờ vẫn chỉ một.
 */
export function batMoiPhien(gui: (cauHoi: string) => Promise<unknown>): void {
  const g = globalThis as G;
  g.__moiPhien ??= {};
  const kiem = async () => {
    const ch = await cauHinhTk();
    if (!ch.moi_phien_bat) return;
    const nay = new Date(Date.now() + 7 * 3600_000);
    const hhmm = nay.toISOString().slice(11, 16);
    const ngay = nay.toISOString().slice(0, 10);
    if (hhmm < ch.moi_phien_gio || g.__moiPhien!.ngay === ngay) return;
    // Quá giờ hơn 1 tiếng (máy chủ mới bật lúc trưa) thì thôi — mồi muộn không còn tác dụng
    const [h, m] = ch.moi_phien_gio.split(":").map(Number);
    g.__moiPhien!.ngay = ngay;
    if (nay.getUTCHours() * 60 + nay.getUTCMinutes() - (h * 60 + m) > 60) return;
    try {
      await gui("Chỉ trả lời đúng một từ: OK");
      ghiSo({ su_kien: "moi_phien", tai_khoan: taiKhoanChinh(ch), gio: hhmm });
    } catch (e) {
      ghiSo({ su_kien: "moi_phien_loi", loi: e instanceof Error ? e.message : String(e) });
    }
  };
  g.__moiPhien.kiem = kiem;
  if (g.__moiPhien.timer) return;
  g.__moiPhien.timer = setInterval(() => void (g.__moiPhien?.kiem ?? kiem)(), 60_000);
  if (typeof g.__moiPhien.timer === "object" && "unref" in g.__moiPhien.timer) g.__moiPhien.timer.unref();
}
