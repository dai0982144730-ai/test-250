// ============================================================
// ai/tai-khoan-claude.ts — HAI TÀI KHOẢN CLAUDE cho trợ lý (Mr. Đại chốt 02/10/2026). CHỈ SERVER.
//
// Mỗi tài khoản một THƯ MỤC ĐĂNG NHẬP riêng (biến CLAUDE_CONFIG_DIR của Claude CLI — đo 02/10: thư mục mới thì CLI báo
// "chưa đăng nhập", tách hẳn khỏi tài khoản đang đăng nhập trên máy):
//   • Tài khoản 1: ~/.sci-cong-viec/claude-tk/tk1 — chưa đăng nhập ở đó thì dùng tài khoản mặc định của máy (như trước 02/10).
//   • Tài khoản 2: ~/.sci-cong-viec/claude-tk/tk2 — chỉ dùng khi bật "Dùng 2 tài khoản Claude" (Cài đặt → AI) và đã đăng nhập.
// Mỗi tài khoản một HÀNG CHỜ riêng (CLI khoá thư mục đăng nhập nên một tài khoản chạy lần lượt) → hai tài khoản chạy song song.
//
// Chọn tài khoản cho một lượt (chonTaiKhoan):
//   ① tài khoản CHÍNH = 1; bật "Đảo vai chính/phụ mỗi 24 giờ" thì đổi theo ngày (giờ Việt Nam).
//   ② chính đang bận mà phụ đang rảnh → phụ đỡ (tình huống "nhiều người cùng làm việc").
//   ③ tài khoản báo HẾT HẠN MỨC (chu kỳ 5 giờ hoặc hạn mức tuần) → đánh dấu hết tới giờ CLI báo (không báo thì 15 phút rồi thử
//      lại), lượt đó chạy lại ngay trên tài khoản kia, báo chuông quản trị.
// Mồi phiên (moiPhien): tới giờ khai ở Cài đặt thì gửi một câu ngắn vào tài khoản chính để chu kỳ làm việc bắt đầu từ giờ đó.
//
// Sửa 04/10 (Quản lý token AI): mốc "hết tới lúc" GHI ĐĨA (data/ai-tai-khoan-het.json) — khởi động lại app không còn quên mà gọi
// lại tài khoản đang hết; giờ mở lại đọc bằng giaiGioMoLai (cả dạng "resets 3pm"); hết sạch tài khoản → ghi khoảng NGỪNG
// (lib/ai/so-dung-ai.ts) cho mục Thống kê dùng AI.
//
// Thêm 04/10 (Quản lý token AI, Mr. Đại duyệt):
//   • DÁN MÃ: ngoài cửa sổ đăng nhập, tài khoản công ty đăng nhập được bằng MÃ DÀI HẠN (`claude setup-token` chạy ở máy khác,
//     dán vào) — chạy được cả trên hosting Linux không có màn hình. Mã nằm trong thư mục của tài khoản (file sci-ma-dang-nhap.json),
//     CLI nhận qua biến CLAUDE_CODE_OAUTH_TOKEN. Mã KHÔNG BAO GIỜ trả về trình duyệt — chỉ trả 4 ký tự cuối.
//   • ĐĂNG NHẬP BẰNG LINK (04/10 trưa, Mr. Đại chọn): MỘT cách cho TK1, TK2 và tài khoản cá nhân — lib/ai/dang-nhap-link.ts.
//     Cửa sổ trên máy chủ và mã dài hạn dán tay không còn trên giao diện; mã đã dán (nếu có) vẫn chạy cho tới khi đăng xuất.
//   • TÀI KHOẢN CÁ NHÂN: mỗi người tự nối tài khoản Claude của mình (menu tên → "Tài khoản Claude cá nhân"). Thứ tự dùng:
//     TK1 → TK2 → tài khoản cá nhân của CHÍNH người đang hỏi. Việc nền máy tự chạy (không có người trong ngữ cảnh) KHÔNG BAO
//     GIỜ dùng tài khoản cá nhân. Mỗi tài khoản cá nhân một thư mục + một hàng chờ + một mốc hết hạn mức riêng.
// ============================================================
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { thuMucDuLieu } from "@/lib/ai/duong-dan";
import { giaiGioMoLai } from "@/lib/ai/thong-ke-ai";
import { ghiNgung } from "@/lib/ai/so-dung-ai";

export type SoTk = 1 | 2;

interface TrangThaiTk {
  /** (cũ, không dùng nữa — hàng chờ nay là `cho`) */
  hang: Promise<unknown>;
  /** số lượt đang chờ + đang chạy */
  dang: number;
  /** trong đó: lượt ưu tiên (chat) đang chờ + chạy — lib/ai/uu-tien.ts */
  dang_uu_tien?: number;
  /** danh sách chờ: lượt ưu tiên đứng trước mọi lượt nền (chốt 02/10) */
  cho?: { uu_tien: boolean; chay: () => void }[];
  /** đang có một lượt chạy trên tài khoản này */
  dang_chay?: boolean;
  /** hết hạn mức tới lúc (ms) — 0 = dùng được */
  het_den: number;
  het_ly_do: string;
  /** mốc het_den chỉ là ĐOÁN 15 phút (CLI không báo giờ mở lại) — kiểm độc lập 04/10 #4 */
  het_doan?: boolean;
  /** MẤT ĐĂNG NHẬP (401 mã hết hạn / bị thu hồi, chưa đăng nhập, tổ chức chặn) — tạm bỏ qua tới lúc này rồi thử lại (Mr. Đại chốt 04/10) */
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
export type { TrangThaiTk };

export interface CauHinhTk {
  hai_tai_khoan: boolean;
  dao_vai_24h: boolean;
  moi_phien_bat: boolean;
  moi_phien_gio: string;
}

const ngayVN = (ms = Date.now()) => new Date(ms + 7 * 3600_000).toISOString().slice(0, 10);

/**
 * Thư mục đăng nhập: trong thư mục người dùng máy chủ (toàn chữ không dấu — cửa sổ cmd đăng nhập đọc sai đường dẫn có dấu
 * "SCI Tiến độ"), nằm NGOÀI data/ để thông tin đăng nhập không theo bản sao lưu / đóng gói đi nơi khác.
 * Test đặt DOCFLOW_AI_DATA thì dùng thư mục test.
 */
function gocTk(): string {
  return process.env.DOCFLOW_AI_DATA?.trim() ? thuMucDuLieu("claude-tk") : path.join(os.homedir(), ".sci-cong-viec", "claude-tk");
}

function taoThuMuc(d: string): string {
  try {
    fs.mkdirSync(d, { recursive: true });
  } catch {
    /* không tạo được thì CLI tự báo lỗi */
  }
  return d;
}

export function thuMucTk(so: SoTk): string {
  return taoThuMuc(path.join(gocTk(), `tk${so}`));
}

// ----- MÃ ĐĂNG NHẬP DÁN TAY (04/10) -----
const TEP_MA = "sci-ma-dang-nhap.json";

interface MaDaLuu {
  ma: string;
  luc_noi: string;
  /** chỉ tài khoản cá nhân: hết hạn mức tới lúc (ms) — ghi đĩa để khởi động lại không quên */
  het_den?: number;
}

/**
 * Chuẩn hoá mã người dùng dán vào: bỏ mọi khoảng trắng / xuống dòng (cửa sổ lệnh hay ngắt mã dài thành nhiều dòng).
 * Mã dài hạn của `claude setup-token` có dạng sk-ant-oat01-… — sai dạng → null.
 */
export function chuanHoaMa(tho: unknown): string | null {
  const s = String(tho ?? "").replace(/\s+/g, "");
  return /^sk-ant-oat\d{2}-[A-Za-z0-9_-]{20,}$/.test(s) ? s : null;
}

/** 4 ký tự cuối — thứ DUY NHẤT của mã được đưa ra trình duyệt */
export const duoiMa = (ma: string) => `…${ma.slice(-4)}`;

function docMa(thuMuc: string): MaDaLuu | null {
  try {
    const d = JSON.parse(fs.readFileSync(path.join(thuMuc, TEP_MA), "utf8")) as Partial<MaDaLuu>;
    return typeof d.ma === "string" && d.ma ? { ma: d.ma, luc_noi: String(d.luc_noi ?? ""), het_den: typeof d.het_den === "number" ? d.het_den : 0 } : null;
  } catch {
    return null;
  }
}

function ghiMa(thuMuc: string, d: MaDaLuu): void {
  // 0o600: trên Linux chỉ tài khoản chạy app đọc được (Windows bỏ qua cờ này)
  fs.writeFileSync(path.join(taoThuMuc(thuMuc), TEP_MA), JSON.stringify(d, null, 2), { mode: 0o600 });
}

function xoaMa(thuMuc: string): boolean {
  try {
    fs.unlinkSync(path.join(thuMuc, TEP_MA));
    return true;
  } catch {
    return false;
  }
}

/** Thư mục đã có thông tin đăng nhập: file của cửa sổ đăng nhập HOẶC mã dán tay (trạng thái đầy đủ lấy bằng `claude auth status`) */
export function coDangNhap(so: SoTk): boolean {
  return fs.existsSync(path.join(thuMucTk(so), ".credentials.json")) || !!docMa(thuMucTk(so));
}

/**
 * Cách tài khoản công ty đang đăng nhập: "cua_so" · "ma" · null. MỖI LÚC MỘT CÁCH: lưu mã xoá file cửa sổ, mở cửa sổ đăng nhập xoá
 * mã — vì đo 04/10: thư mục có CẢ file cửa sổ lẫn mã thì CLI dùng FILE CỬA SỔ (mã giả vẫn trả lời được), mã dán vào không ăn.
 * Lỡ có cả hai (bản cũ) thì báo theo cái CLI thật sự dùng: cửa sổ.
 */
export function kieuDangNhap(so: SoTk): "ma" | "cua_so" | null {
  if (fs.existsSync(path.join(thuMucTk(so), ".credentials.json"))) return "cua_so";
  return docMa(thuMucTk(so)) ? "ma" : null;
}

/** Mã dán tay của tài khoản công ty (CLAUDE_CODE_OAUTH_TOKEN) — không có → undefined */
export function maChay(so: SoTk): string | undefined {
  return docMa(thuMucTk(so))?.ma;
}

/** Thông tin mã để HIỆN (không có mã) */
export function thongTinMa(so: SoTk): { duoi_ma: string; luc_noi: string } | null {
  const m = docMa(thuMucTk(so));
  return m ? { duoi_ma: duoiMa(m.ma), luc_noi: m.luc_noi } : null;
}

/** Lưu mã dán tay cho tài khoản công ty (bên gọi đã thử mã bằng một câu thật) — THAY đăng nhập cửa sổ (xem kieuDangNhap) */
export function luuMaCongTy(so: SoTk, ma: string): void {
  ghiMa(thuMucTk(so), { ma, luc_noi: new Date().toISOString() });
  try {
    fs.unlinkSync(path.join(thuMucTk(so), ".credentials.json"));
  } catch {
    /* chưa đăng nhập cửa sổ */
  }
  const st = trangThai(so);
  st.het_den = 0; // mã mới = có thể là tài khoản khác → bỏ mốc hết hạn mức cũ
  st.het_ly_do = "";
  st.het_doan = false;
  st.hong_den = 0;
  st.hong_ly_do = "";
  ghiHet();
}

/** Bỏ mã dán tay của tài khoản công ty (đăng xuất xoá cả hai cách) */
export function xoaMaCongTy(so: SoTk): boolean {
  return xoaMa(thuMucTk(so));
}

/**
 * Vừa đăng nhập xong bằng LINK (lib/ai/dang-nhap-link.ts, 04/10 trưa) — CLI đã ghi .credentials.json vào thư mục tài khoản.
 * Mỗi lúc một cách: bỏ mã dán tay (nếu có); có thể là tài khoản khác → bỏ mốc hết hạn mức / mất đăng nhập cũ.
 */
export function daDangNhapLinkCongTy(so: SoTk): void {
  xoaMa(thuMucTk(so));
  const st = trangThai(so);
  st.het_den = 0;
  st.het_ly_do = "";
  st.het_doan = false;
  st.hong_den = 0;
  st.hong_ly_do = "";
  ghiHet();
}

/** CLAUDE_CONFIG_DIR cho tài khoản: tk1 chưa đăng nhập riêng → undefined (dùng tài khoản mặc định của máy) */
export function thuMucChay(so: SoTk): string | undefined {
  if (so === 2) return thuMucTk(2);
  return coDangNhap(1) ? thuMucTk(1) : undefined;
}

// ----- TÀI KHOẢN CÁ NHÂN (04/10) -----

/** Thư mục tài khoản cá nhân của một người: tên thư mục = băm mã người (mã người có thể chứa ký tự lạ / dấu) */
export function thuMucCaNhan(nguoi: string): string {
  const bam = crypto.createHash("sha256").update(nguoi).digest("hex").slice(0, 16);
  return path.join(gocTk(), "ca-nhan", bam);
}

/** Mã dán tay của tài khoản cá nhân — chưa dán → null (đăng nhập bằng link thì không có mã: xem coDangNhapCaNhan) */
export function maCaNhan(nguoi: string): { ma: string; luc_noi: string } | null {
  const m = docMa(thuMucCaNhan(nguoi));
  return m ? { ma: m.ma, luc_noi: m.luc_noi } : null;
}

/** Cách tài khoản cá nhân đang đăng nhập — như kieuDangNhap: file đăng nhập (link) thắng mã dán tay */
export function kieuCaNhan(nguoi: string): "ma" | "cua_so" | null {
  if (fs.existsSync(path.join(thuMucCaNhan(nguoi), ".credentials.json"))) return "cua_so";
  return docMa(thuMucCaNhan(nguoi)) ? "ma" : null;
}

/** Người này đã nối tài khoản Claude cá nhân (bằng link hoặc mã dán) */
export function coDangNhapCaNhan(nguoi: string): boolean {
  return kieuCaNhan(nguoi) !== null;
}

/** CLAUDE_CODE_OAUTH_TOKEN cho tài khoản cá nhân — chỉ khi đăng nhập bằng mã dán (đăng nhập bằng link thì CLI đọc file) */
export function maChayCaNhan(nguoi: string): string | undefined {
  return kieuCaNhan(nguoi) === "ma" ? docMa(thuMucCaNhan(nguoi))?.ma : undefined;
}

export function luuMaCaNhan(nguoi: string, ma: string): void {
  ghiMa(thuMucCaNhan(nguoi), { ma, luc_noi: new Date().toISOString(), het_den: 0 });
  try {
    fs.unlinkSync(path.join(thuMucCaNhan(nguoi), ".credentials.json")); // mỗi lúc một cách
  } catch {
    /* chưa đăng nhập bằng link */
  }
  boMocCaNhan(nguoi);
}

/** Vừa đăng nhập bằng LINK xong (CLI đã ghi file đăng nhập) → bỏ mã dán tay + mốc hết hạn mức / mất đăng nhập cũ */
export function daDangNhapLinkCaNhan(nguoi: string): void {
  xoaMa(thuMucCaNhan(nguoi));
  boMocCaNhan(nguoi);
}

/** Đăng nhập lại xong → bỏ cả mốc hết hạn mức lẫn dấu mất đăng nhập của tài khoản cá nhân */
function boMocCaNhan(nguoi: string): void {
  const st = trangThaiCaNhan(nguoi);
  st.het_den = 0;
  st.hong_den = 0;
  st.hong_ly_do = "";
  ghiHetCaNhan(nguoi, 0, 0);
}

/** Đăng xuất tài khoản cá nhân: xoá cả file đăng nhập lẫn mã dán tay */
export function xoaMaCaNhan(nguoi: string): boolean {
  const dir = thuMucCaNhan(nguoi);
  let ok = xoaMa(dir);
  for (const f of [".credentials.json", TEP_HET_CA_NHAN]) {
    try {
      fs.unlinkSync(path.join(dir, f));
      if (f === ".credentials.json") ok = true;
    } catch {
      /* không có */
    }
  }
  (globalThis as G).__taiKhoanCaNhan?.delete(nguoi);
  return ok;
}

/** Mốc hết hạn mức + dấu mất đăng nhập của tài khoản cá nhân ghi đĩa riêng (đăng nhập bằng link thì không có file mã để ghi kèm) */
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
  const dir = thuMucCaNhan(nguoi);
  let het = docMa(dir)?.het_den ?? 0; // bản sáng 04/10 ghi mốc kèm file mã
  let hong = 0;
  try {
    const d = JSON.parse(fs.readFileSync(path.join(dir, TEP_HET_CA_NHAN), "utf8")) as { het_den?: unknown; hong_den?: unknown };
    if (typeof d.het_den === "number") het = Math.max(het, d.het_den);
    if (typeof d.hong_den === "number") hong = d.hong_den;
  } catch {
    /* chưa có */
  }
  return { het, hong };
}

/** Hàng chờ + mốc hết hạn mức + dấu mất đăng nhập của tài khoản cá nhân (giống tài khoản công ty, mỗi người một bộ) */
export function trangThaiCaNhan(nguoi: string): TrangThaiTk {
  const g = globalThis as G;
  g.__taiKhoanCaNhan ??= new Map();
  let st = g.__taiKhoanCaNhan.get(nguoi);
  if (!st) {
    const { het, hong } = docHetCaNhan(nguoi);
    const nay = Date.now();
    st = { hang: Promise.resolve(), dang: 0, het_den: het > nay ? het : 0, het_ly_do: "", hong_den: hong > nay ? hong : 0, hong_ly_do: "", luot: { ngay: "", n: 0 } };
    g.__taiKhoanCaNhan.set(nguoi, st);
  }
  return st;
}

/**
 * Tài khoản cá nhân MẤT ĐĂNG NHẬP (401 mã hết hạn / bị thu hồi…) — kiểm độc lập lần 4 (04/10) #3: đánh dấu để thẻ "Tài khoản Claude
 * cá nhân" hiện "Mất đăng nhập — Đăng nhập lại" ngay (CLI `auth status` không kiểm mã nên tự nó vẫn báo "đã đăng nhập"). KHÔNG đổi
 * đường chạy: lượt sau vẫn thử (401 trả về ngay, 0 token) và nói đúng câu "Đăng nhập lại"; không báo chuông quản trị (việc của
 * chính người đó). Trả lời được lần nào thì bỏ dấu (401 nhầm một lần).
 */
export function danhDauHongCaNhan(nguoi: string, msg: string): void {
  const st = trangThaiCaNhan(nguoi);
  st.hong_den = Date.now() + THU_LAI_HONG_MS;
  st.hong_ly_do = msg.slice(0, 200);
  ghiHetCaNhan(nguoi, st.het_den, st.hong_den);
  ghiSo({ su_kien: "mat_dang_nhap_ca_nhan", nguoi, thu_lai_luc: new Date(st.hong_den).toISOString() });
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
  ghiSo({ su_kien: "het_han_muc_ca_nhan", nguoi, mo_lai_luc: new Date(st.het_den).toISOString(), doan_15_phut: !doc });
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

/** Mốc hết hạn mức đã ghi đĩa — chỉ lấy mốc còn ở tương lai */
type HetLuu = { het_den: number; het_ly_do: string; het_doan: boolean; hong_den: number; hong_ly_do: string };

function docHetDaLuu(): Partial<Record<SoTk, HetLuu>> {
  try {
    const d = JSON.parse(fs.readFileSync(thuMucDuLieu(TEP_HET), "utf8")) as Record<string, Partial<Record<keyof HetLuu, unknown>>>;
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
    fs.writeFileSync(thuMucDuLieu(TEP_HET), JSON.stringify(d, null, 2));
  } catch {
    /* ghi hỏng thì chỉ mất khi khởi động lại — không làm hỏng lượt AI */
  }
}

export function trangThai(so: SoTk): TrangThaiTk {
  const g = globalThis as G;
  if (!g.__taiKhoanClaude) {
    const luu = docHetDaLuu();
    const moi = (s: SoTk): TrangThaiTk => ({ hang: Promise.resolve(), dang: 0, het_den: luu[s]?.het_den ?? 0, het_ly_do: luu[s]?.het_ly_do ?? "", het_doan: luu[s]?.het_doan ?? false, hong_den: luu[s]?.hong_den ?? 0, hong_ly_do: luu[s]?.hong_ly_do ?? "", luot: { ngay: "", n: 0 } });
    g.__taiKhoanClaude = { 1: moi(1), 2: moi(2) };
  }
  return g.__taiKhoanClaude[so];
}

/** Cấu hình (Cài đặt → AI), nhớ 30 giây — lượt AI không phải đọc CSDL mỗi lần */
export async function cauHinhTk(): Promise<CauHinhTk> {
  const g = globalThis as G;
  if (g.__taiKhoanCauHinh && Date.now() - g.__taiKhoanCauHinh.luc < 30_000) return g.__taiKhoanCauHinh.ch;
  let ch: CauHinhTk = { hai_tai_khoan: false, dao_vai_24h: false, moi_phien_bat: false, moi_phien_gio: "07:00" };
  try {
    const { layQ } = await import("@/lib/db");
    const { layCauHinh } = await import("@/lib/cau-hinh/doc");
    const ai = (await layCauHinh(await layQ(), "ai")) as Partial<CauHinhTk>;
    ch = {
      hai_tai_khoan: !!ai.hai_tai_khoan,
      dao_vai_24h: !!ai.dao_vai_24h,
      moi_phien_bat: !!ai.moi_phien_bat,
      moi_phien_gio: ai.moi_phien_gio || "07:00",
    };
  } catch {
    /* CSDL chưa mở (test) → một tài khoản như cũ */
  }
  g.__taiKhoanCauHinh = { luc: Date.now(), ch };
  return ch;
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

/** Lỗi MẤT ĐĂNG NHẬP của tài khoản (401 mã hết hạn / bị thu hồi, chưa đăng nhập, tổ chức chặn) — câu tiếng Việt của dichLoiCli hoặc câu gốc CLI */
export function laLoiDangNhap(msg: string): boolean {
  return /đăng nhập Claude đã hết hạn|chưa đăng nhập tài khoản Claude|đã TẮT quyền dùng gói thuê bao|failed to authenticate|not logged in|oauth.*(expired|revoked|invalid)/i.test(msg);
}

/** Bao lâu thì thử lại tài khoản mất đăng nhập (phòng 401 nhầm một lần); thử lại mà vẫn 401 thì 0 token, không tốn */
const THU_LAI_HONG_MS = 60 * 60_000;

/**
 * Tài khoản công ty MẤT ĐĂNG NHẬP (Mr. Đại chốt 04/10 qua phiên kiểm độc lập): đánh dấu "không dùng được", lượt đó chuyển sang tài
 * khoản còn lại rồi tài khoản cá nhân của người hỏi; báo chuông quản trị MỘT lần cho tới khi đăng nhập lại (thử lại sau 60 phút
 * vẫn hỏng thì không báo lại). Hết sạch tài khoản công ty → ghi khoảng ngừng như hết hạn mức.
 */
export async function danhDauHongDangNhap(so: SoTk, msg: string): Promise<void> {
  const st = trangThai(so);
  const nay = Date.now();
  const daBao = !!st.hong_ly_do;
  st.hong_den = nay + THU_LAI_HONG_MS;
  st.hong_ly_do = msg.slice(0, 200);
  ghiHet();
  ghiSo({ su_kien: "mat_dang_nhap", tai_khoan: so, thu_lai_luc: new Date(st.hong_den).toISOString(), ly_do: st.hong_ly_do });
  try {
    const ch = await cauHinhTk();
    const khac: SoTk = so === 1 ? 2 : 1;
    const coKhac = dungDuoc(khac, ch);
    if (!coKhac) ghiNgung({ tu: new Date(nay).toISOString(), den: new Date(st.hong_den).toISOString(), ly_do: `Tài khoản Claude ${so} mất đăng nhập, không còn tài khoản công ty khác` });
    if (daBao) return;
    const { layQ } = await import("@/lib/db");
    const { baoQuanTri } = await import("@/lib/thong-bao");
    await baoQuanTri(await layQ(), {
      loai: "ai_tai_khoan",
      noi_dung: `Tài khoản Claude ${so} mất đăng nhập (mã hết hạn hoặc bị thu hồi)${coKhac ? ` — trợ lý chuyển sang tài khoản ${khac}` : " — không còn tài khoản công ty nào: người đã nối tài khoản Claude cá nhân vẫn hỏi được"}. Vào Cài đặt → AI → thẻ Tài khoản ${so} → Đăng nhập lại.`,
      lien_ket: "/cai-dat?tab=ket-noi&muc=ai",
    });
  } catch {
    /* báo chuông hỏng không được làm hỏng lượt AI */
  }
}

/** Quản trị đăng nhập lại / dán mã / đăng xuất → bỏ dấu mất đăng nhập, lượt sau thử ngay */
export function boDauHong(so: SoTk): void {
  const st = trangThai(so);
  st.hong_den = 0;
  st.hong_ly_do = "";
  ghiHet();
}

/** Chọn tài khoản cho một lượt (xem đầu file). Cả hai đều hết hạn mức → vẫn trả tài khoản chính (CLI tự báo lỗi tiếng Việt). */
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
 * Tài khoản ĐANG PHỤC VỤ (thanh "Đang dùng" + nhãn trên thẻ — kiểm độc lập lần 2 #2): chính nếu dùng được, không thì phụ.
 * Khác chonTaiKhoan: KHÔNG tính "phụ đỡ khi chính bận" (đổi theo từng giây — nhãn trên màn sẽ nhảy qua lại). Cả hai hết → chính.
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
 * Đánh dấu tài khoản hết hạn mức. Giờ mở lại: `hetDen` bên gọi đọc sẵn (nhánh is_error — câu gốc đã bị dịch sang tiếng Việt),
 * không có thì đọc từ câu báo (giaiGioMoLai: "…|1759380000", "resets 3pm"…), vẫn không có thì thử lại sau 15 phút.
 */
export async function danhDauHet(so: SoTk, msg: string, hetDen?: number | null): Promise<void> {
  const st = trangThai(so);
  const nay = Date.now();
  const doc = hetDen && hetDen > nay ? hetDen : giaiGioMoLai(msg, nay);
  st.het_den = doc && doc > nay ? doc : nay + 15 * 60_000;
  st.het_ly_do = msg.slice(0, 200);
  st.het_doan = !(doc && doc > nay);
  ghiHet();
  const gio = new Date(st.het_den + 7 * 3600_000).toISOString().slice(11, 16);
  ghiSo({ su_kien: "het_han_muc", tai_khoan: so, mo_lai_luc: new Date(st.het_den).toISOString(), ly_do: st.het_ly_do, doan_15_phut: !doc });
  try {
    const ch = await cauHinhTk();
    const khac: SoTk = so === 1 ? 2 : 1;
    const coKhac = dungDuoc(khac, ch);
    if (!coKhac) {
      // Không còn tài khoản công ty nào → NGỪNG tới lúc tài khoản sớm nhất mở lại (tk2 chỉ tính khi đang bật + đã đăng nhập)
      const mo = [trangThai(1).het_den, ...(ch.hai_tai_khoan && coDangNhap(2) ? [trangThai(2).het_den] : [])].filter((t) => t > nay);
      ghiNgung({ tu: new Date(nay).toISOString(), den: new Date(mo.length ? Math.min(...mo) : st.het_den).toISOString(), ly_do: `Tài khoản Claude ${so} hết hạn mức, không còn tài khoản công ty khác` });
    }
    const { layQ } = await import("@/lib/db");
    const { baoQuanTri } = await import("@/lib/thong-bao");
    await baoQuanTri(await layQ(), {
      loai: "ai_tai_khoan",
      noi_dung: `Tài khoản Claude ${so} hết hạn mức (dự kiến dùng lại lúc ${gio})${coKhac ? ` — trợ lý chuyển sang tài khoản ${khac}` : " — không còn tài khoản công ty nào: việc nền tạm dừng, người đã nối tài khoản Claude cá nhân vẫn hỏi được bằng tài khoản của mình"}`,
      lien_ket: "/cai-dat?tab=ket-noi&muc=ai",
    });
  } catch {
    /* báo chuông hỏng không được làm hỏng lượt AI */
  }
}

/** Đếm lượt theo ngày (hiện ở Cài đặt → AI) */
export function demLuot(so: SoTk): void {
  const st = trangThai(so);
  const n = ngayVN();
  if (st.luot.ngay !== n) st.luot = { ngay: n, n: 0 };
  st.luot.n++;
}

function ghiSo(d: Record<string, unknown>): void {
  try {
    fs.appendFileSync(thuMucDuLieu("ai-tai-khoan.jsonl"), JSON.stringify({ luc: new Date().toISOString(), ...d }) + "\n");
  } catch {
    /* sổ hỏng không làm hỏng lượt AI */
  }
}

/** Tình hình hai tài khoản cho màn Cài đặt → AI */
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
        kieu: kieuDangNhap(so),
        ...(thongTinMa(so) ?? {}),
        dang_chay: st.dang,
        het_den: st.het_den > Date.now() ? new Date(st.het_den).toISOString() : null,
        /** mất đăng nhập — tạm bỏ qua tới lúc này (Mr. Đại chốt 04/10) */
        mat_dang_nhap: dangMatDangNhap(so),
        luot_hom_nay: st.luot.ngay === n ? st.luot.n : 0,
      };
    }),
  };
}

/**
 * MỒI PHIÊN (tuỳ chọn, mặc định tắt): mỗi ngày tới giờ khai (vd 07:00) gửi một câu ngắn vào tài khoản chính để chu kỳ làm việc
 * của hãng bắt đầu từ giờ đó. Kiểm mỗi phút; mỗi ngày một lần.
 */
export function batMoiPhien(gui: (cauHoi: string) => Promise<unknown>): void {
  const g = globalThis as G;
  g.__moiPhien ??= {};
  // Con trỏ `kiem` (G4 — Mr. Đại gật 18/10/2026, cách agent Tiến độ 17a9ac3): setInterval giữ hàm của LẦN BẬT ĐẦU; mỗi lần gọi lại
  // batMoiPhien thì con trỏ trỏ sang mã + hàm gửi mới nhất, bộ hẹn giờ vẫn chỉ một.
  const kiem = async () => {
    const ch = await cauHinhTk();
    if (!ch.moi_phien_bat) return;
    const nay = new Date(Date.now() + 7 * 3600_000);
    const hhmm = nay.toISOString().slice(11, 16);
    const ngay = nay.toISOString().slice(0, 10);
    if (hhmm < ch.moi_phien_gio || g.__moiPhien!.ngay === ngay) return;
    // Quá giờ hơn 1 tiếng (máy chủ mới bật lúc trưa) thì thôi — mồi muộn không còn tác dụng
    const [h, m] = ch.moi_phien_gio.split(":").map(Number);
    if (nay.getUTCHours() * 60 + nay.getUTCMinutes() - (h * 60 + m) > 60) {
      g.__moiPhien!.ngay = ngay;
      return;
    }
    g.__moiPhien!.ngay = ngay;
    try {
      await gui("Chỉ trả lời đúng một từ: OK");
      ghiSo({ su_kien: "moi_phien", tai_khoan: taiKhoanChinh(ch), gio: hhmm });
      console.log(`[ai] đã mồi phiên làm việc lúc ${hhmm}`);
    } catch (e) {
      ghiSo({ su_kien: "moi_phien_loi", loi: e instanceof Error ? e.message : String(e) });
    }
  };
  g.__moiPhien.kiem = kiem;
  if (g.__moiPhien.timer) return;
  g.__moiPhien.timer = setInterval(() => void (g.__moiPhien?.kiem ?? kiem)(), 60_000);
  if (typeof g.__moiPhien.timer === "object" && "unref" in g.__moiPhien.timer) g.__moiPhien.timer.unref();
}
