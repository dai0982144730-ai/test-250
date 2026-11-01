// ============================================================
// ai/thong-ke-ai.ts — THỐNG KÊ DÙNG AI (Mr. Đại chốt 04/10/2026). File THUẦN — không đĩa, không mạng: màn hình, route và
// bài kiểm cùng gọi được.
//
//   • LuotAi        — một lượt gọi AI (sổ data/ai-so-dung.jsonl, ghi ở lib/ai/so-dung-ai.ts): tài khoản nào, token, AI làm bao
//                     lâu, ai gọi, tính năng nào, kết quả (được · lỗi · hết hạn mức · đầy hàng chờ).
//   • KhoangNgung   — khoảng KHÔNG CÒN tài khoản Claude công ty nào dùng được (mọi tài khoản đều hết hạn mức) = "thời gian ngừng".
//   • tinhThongKe   — gom theo MÚI: Ngày = 24 múi giờ · Tuần = 7 múi ngày (Thứ Hai → Chủ Nhật) · Tháng = múi theo ngày. Giờ Việt Nam.
//   • giaiGioMoLai  — đọc giờ mở lại từ câu báo hết hạn mức của Claude CLI (sửa lỗi 04/10: nhánh is_error mất giờ, luôn đoán 15 phút).
// ============================================================

export type KetQuaLuot = "ok" | "loi" | "het_han_muc" | "day_hang";
/** tk1 / tk2 = tài khoản Claude công ty · ca_nhan = tài khoản riêng của người gọi · api = khoá API */
export type TaiKhoanLuot = "tk1" | "tk2" | "ca_nhan" | "api";

export interface LuotAi {
  /** ISO lúc gửi lượt */
  luc: string;
  tai_khoan: TaiKhoanLuot;
  /** mã tính năng = đường file gọi AI ("lib/bao-cao-tuan/do-kho"); "" = không rõ */
  tinh_nang: string;
  /** id người đang thao tác; null = việc nền máy tự chạy; "?" = sổ cũ không ghi */
  nguoi: string | null;
  /** token vào KHÔNG kể cache */
  token_vao: number;
  token_cache_doc: number;
  token_cache_ghi: number;
  token_ra: number;
  /** AI làm bao lâu (không tính lúc xếp hàng) */
  chay_ms: number;
  cho_ms: number;
  ket_qua: KetQuaLuot;
  model?: string | null;
}

export interface KhoangNgung {
  tu: string;
  den: string;
  ly_do?: string;
}

export type CheDo = "ngay" | "tuan" | "thang";

export interface MuiThongKe {
  /** nhãn dưới cột: "8h" · "T2 29/09" · "4" */
  nhan: string;
  /** nhãn đầy đủ trong bảng: "08:00 – 08:59" · "Thứ Hai 29/09" · "04/10" */
  nhanDay: string;
  /** ngày (YYYY-MM-DD) — bấm cột ở Tuần/Tháng thì mở Ngày này */
  ngay: string;
  tuMs: number;
  denMs: number;
  /** múi còn ở tương lai (chưa tới) */
  tuongLai: boolean;
  luot: number;
  loi: number;
  hetHanMuc: number;
  dayHang: number;
  /** token vào gồm cả cache đọc / cache ghi */
  tokenVao: number;
  tokenRa: number;
  /** tổng token (vào + ra) theo tài khoản */
  theoTk: Record<TaiKhoanLuot, number>;
  phutChay: number;
  phutNgung: number;
}

export interface DongXepHang {
  ma: string;
  luot: number;
  token: number;
}

export interface KetQuaThongKe {
  cheDo: CheDo;
  ngay: string;
  /** "Ngày 04/10/2026" · "Tuần 7 ngày · 29/09/2026 – 05/10/2026" · "Tháng 10/2026 · 31 ngày" */
  tieuDe: string;
  mui: MuiThongKe[];
  tong: Omit<MuiThongKe, "nhan" | "nhanDay" | "ngay" | "tuMs" | "denMs" | "tuongLai">;
  /** 5 dòng tốn token nhất — KHÔNG gồm lượt sổ cũ (chưa ghi người / tính năng, xếp hạng vô nghĩa — Mr. Đại 04/10) */
  topNguoi: DongXepHang[];
  topTinhNang: DongXepHang[];
  /** có lượt lấy từ sổ cũ (trước 04/10 — không ghi người / tính năng / lượt lỗi) */
  coSoCu: boolean;
  /** lượt sổ cũ trong kỳ — hiện thành ghi chú xám dưới hai bảng xếp hạng */
  soCu: { luot: number; token: number };
  /**
   * VỆT THỜI GIAN (Mr. Đại chốt 04/10): một vệt dài suốt kỳ — xanh lúc AI đang chạy, vàng lúc ngừng vì hết hạn mức, xám lúc rảnh.
   * Khoảng (ms) đã gộp chồng nhau và cắt trong kỳ; phần sau `bayGio` là tương lai.
   */
  vet: { tuMs: number; denMs: number; bayGio: number; chay: [number, number][]; ngung: [number, number][] };
}

const GIO_VN = 7 * 3_600_000;
const NGAY_MS = 86_400_000;
const THU = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
const THU_NGAN = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

const hai = (n: number) => String(n).padStart(2, "0");
/** 00:00 giờ VN của ngày "YYYY-MM-DD" (ms UTC) */
export function dauNgayVN(ngay: string): number {
  const [y, m, d] = ngay.split("-").map(Number);
  return Date.UTC(y, m - 1, d) - GIO_VN;
}
/** "YYYY-MM-DD" theo giờ VN của một thời điểm */
export function ngayVN(ms: number): string {
  return new Date(ms + GIO_VN).toISOString().slice(0, 10);
}
const ddmm = (ms: number) => {
  const d = new Date(ms + GIO_VN);
  return `${hai(d.getUTCDate())}/${hai(d.getUTCMonth() + 1)}`;
};
const ddmmyyyy = (ms: number) => `${ddmm(ms)}/${new Date(ms + GIO_VN).getUTCFullYear()}`;

/** Ngày hợp lệ "YYYY-MM-DD"? */
export function ngayHopLe(s: unknown): s is string {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return ngayVN(dauNgayVN(s)) === s;
}

/** Các múi của một chế độ xem. Tuần bắt đầu Thứ Hai. */
export function cacMui(cheDo: CheDo, ngay: string): { nhan: string; nhanDay: string; ngay: string; tuMs: number; denMs: number }[] {
  const dau = dauNgayVN(ngay);
  if (cheDo === "ngay") {
    return Array.from({ length: 24 }, (_, h) => ({
      nhan: `${h}h`,
      nhanDay: `${hai(h)}:00 – ${hai(h)}:59`,
      ngay,
      tuMs: dau + h * 3_600_000,
      denMs: dau + (h + 1) * 3_600_000,
    }));
  }
  if (cheDo === "tuan") {
    const thu = new Date(dau + GIO_VN).getUTCDay(); // 0 = CN
    const thuHai = dau - ((thu + 6) % 7) * NGAY_MS;
    return Array.from({ length: 7 }, (_, i) => {
      const t = thuHai + i * NGAY_MS;
      const w = new Date(t + GIO_VN).getUTCDay();
      return { nhan: `${THU_NGAN[w]} ${ddmm(t)}`, nhanDay: `${THU[w]} ${ddmm(t)}`, ngay: ngayVN(t), tuMs: t, denMs: t + NGAY_MS };
    });
  }
  const d = new Date(dau + GIO_VN);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const soNgay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return Array.from({ length: soNgay }, (_, i) => {
    const t = Date.UTC(y, m, i + 1) - GIO_VN;
    const w = new Date(t + GIO_VN).getUTCDay();
    return { nhan: String(i + 1), nhanDay: `${THU[w]} ${ddmm(t)}`, ngay: ngayVN(t), tuMs: t, denMs: t + NGAY_MS };
  });
}

function tieuDe(cheDo: CheDo, ngay: string, mui: { tuMs: number; denMs: number }[]): string {
  if (cheDo === "ngay") return `Ngày ${ddmmyyyy(dauNgayVN(ngay))}`;
  const dau = mui[0].tuMs;
  const cuoi = mui[mui.length - 1].tuMs;
  if (cheDo === "tuan") return `Tuần · ${mui.length} ngày · ${ddmmyyyy(dau)} – ${ddmmyyyy(cuoi)}`;
  const d = new Date(dau + GIO_VN);
  return `Tháng ${hai(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} · ${mui.length} ngày · ${ddmmyyyy(dau)} – ${ddmmyyyy(cuoi)}`;
}

/** Gộp các khoảng chồng nhau (ms) */
export function gopKhoang(ds: [number, number][]): [number, number][] {
  const s = ds.filter(([a, b]) => b > a).sort((x, y) => x[0] - y[0]);
  const ra: [number, number][] = [];
  for (const [a, b] of s) {
    const cuoi = ra[ra.length - 1];
    if (cuoi && a <= cuoi[1]) cuoi[1] = Math.max(cuoi[1], b);
    else ra.push([a, b]);
  }
  return ra;
}

const rong = (): Omit<MuiThongKe, "nhan" | "nhanDay" | "ngay" | "tuMs" | "denMs" | "tuongLai"> => ({
  luot: 0,
  loi: 0,
  hetHanMuc: 0,
  dayHang: 0,
  tokenVao: 0,
  tokenRa: 0,
  theoTk: { tk1: 0, tk2: 0, ca_nhan: 0, api: 0 },
  phutChay: 0,
  phutNgung: 0,
});

function cong(o: ReturnType<typeof rong>, l: LuotAi): void {
  o.luot += 1;
  if (l.ket_qua === "loi") o.loi += 1;
  if (l.ket_qua === "het_han_muc") o.hetHanMuc += 1;
  if (l.ket_qua === "day_hang") o.dayHang += 1;
  const vao = (l.token_vao || 0) + (l.token_cache_doc || 0) + (l.token_cache_ghi || 0);
  o.tokenVao += vao;
  o.tokenRa += l.token_ra || 0;
  o.theoTk[l.tai_khoan] = (o.theoTk[l.tai_khoan] ?? 0) + vao + (l.token_ra || 0);
  o.phutChay += (l.chay_ms || 0) / 60_000;
}

/** Gom sổ theo múi. Lượt tính vào múi chứa lúc GỬI; phút ngừng cắt theo múi, không tính phần tương lai. */
export function tinhThongKe(o: { luot: LuotAi[]; ngung: KhoangNgung[]; cheDo: CheDo; ngay: string; bayGio: number; coSoCu?: boolean }): KetQuaThongKe {
  const khung = cacMui(o.cheDo, o.ngay);
  const tuMs = khung[0].tuMs;
  const denMs = khung[khung.length - 1].denMs;
  const ngung = gopKhoang(o.ngung.map((k) => [Date.parse(k.tu), Math.min(Date.parse(k.den), o.bayGio)] as [number, number]));
  const mui: MuiThongKe[] = khung.map((k) => ({ ...k, tuongLai: k.tuMs > o.bayGio, ...rong() }));
  const tong = rong();
  const nguoi = new Map<string, DongXepHang>();
  const tinhNang = new Map<string, DongXepHang>();
  const xep = (m: Map<string, DongXepHang>, ma: string, l: LuotAi) => {
    const r = m.get(ma) ?? { ma, luot: 0, token: 0 };
    r.luot += 1;
    r.token += (l.token_vao || 0) + (l.token_cache_doc || 0) + (l.token_cache_ghi || 0) + (l.token_ra || 0);
    m.set(ma, r);
  };
  const soCu = { luot: 0, token: 0 };
  const chay: [number, number][] = [];
  for (const l of o.luot) {
    const t = Date.parse(l.luc);
    if (!(t >= tuMs && t < denMs)) continue;
    const i = mui.findIndex((m) => t >= m.tuMs && t < m.denMs);
    if (i < 0) continue;
    cong(mui[i], l);
    cong(tong, l);
    // AI chạy từ lúc ra khỏi hàng chờ tới lúc xong (luc = lúc gửi)
    if ((l.chay_ms || 0) > 0) chay.push([t + (l.cho_ms || 0), t + (l.cho_ms || 0) + l.chay_ms]);
    if (l.tinh_nang === "cu") {
      soCu.luot += 1;
      soCu.token += (l.token_vao || 0) + (l.token_cache_doc || 0) + (l.token_cache_ghi || 0) + (l.token_ra || 0);
      continue;
    }
    xep(nguoi, l.nguoi ?? "", l);
    xep(tinhNang, l.tinh_nang || "", l);
  }
  const cat = (ds: [number, number][]) => ds.map(([a, b]) => [Math.max(a, tuMs), Math.min(b, denMs)] as [number, number]).filter(([a, b]) => b > a);
  for (const m of mui) {
    let ms = 0;
    for (const [a, b] of ngung) ms += Math.max(0, Math.min(b, m.denMs) - Math.max(a, m.tuMs));
    m.phutNgung = ms / 60_000;
    tong.phutNgung += m.phutNgung;
  }
  const top = (m: Map<string, DongXepHang>) => [...m.values()].sort((a, b) => b.token - a.token || b.luot - a.luot).slice(0, 5);
  return {
    cheDo: o.cheDo,
    ngay: o.ngay,
    tieuDe: tieuDe(o.cheDo, o.ngay, khung),
    mui,
    tong,
    topNguoi: top(nguoi),
    topTinhNang: top(tinhNang),
    coSoCu: !!o.coSoCu,
    soCu,
    vet: { tuMs, denMs, bayGio: o.bayGio, chay: cat(gopKhoang(chay)), ngung: cat(ngung) },
  };
}

// ── Tổng trong một khoảng bất kỳ (Quản lý token AI Đợt 3, Mr. Đại chốt 04/10/2026) ──────────────
// Nhận định đêm của Agent quan sát cắt số lúc 07:45: "24 giờ qua" (07:45 hôm qua → 07:45 hôm nay), thứ Hai = 7 ngày qua —
// không trùng múi Ngày/Tuần lịch nên cần tổng theo khoảng giờ. Cùng cách cộng với tinhThongKe.

export interface TongKhoang {
  tong: Omit<MuiThongKe, "nhan" | "nhanDay" | "ngay" | "tuMs" | "denMs" | "tuongLai">;
  topNguoi: DongXepHang[];
  topTinhNang: DongXepHang[];
  soCu: { luot: number; token: number };
  vet: { tuMs: number; denMs: number; bayGio: number; chay: [number, number][]; ngung: [number, number][] };
}

export function tongTrongKhoang(o: { luot: LuotAi[]; ngung: KhoangNgung[]; tuMs: number; denMs: number; bayGio: number }): TongKhoang {
  const tong = rong();
  const nguoi = new Map<string, DongXepHang>();
  const tinhNang = new Map<string, DongXepHang>();
  const soCu = { luot: 0, token: 0 };
  const chay: [number, number][] = [];
  const tokenCua = (l: LuotAi) => (l.token_vao || 0) + (l.token_cache_doc || 0) + (l.token_cache_ghi || 0) + (l.token_ra || 0);
  const xep = (m: Map<string, DongXepHang>, ma: string, l: LuotAi) => {
    const r = m.get(ma) ?? { ma, luot: 0, token: 0 };
    r.luot += 1;
    r.token += tokenCua(l);
    m.set(ma, r);
  };
  for (const l of o.luot) {
    const t = Date.parse(l.luc);
    if (!(t >= o.tuMs && t < o.denMs)) continue;
    cong(tong, l);
    if ((l.chay_ms || 0) > 0) chay.push([t + (l.cho_ms || 0), t + (l.cho_ms || 0) + l.chay_ms]);
    if (l.tinh_nang === "cu") {
      soCu.luot += 1;
      soCu.token += tokenCua(l);
      continue;
    }
    xep(nguoi, l.nguoi ?? "", l);
    xep(tinhNang, l.tinh_nang || "", l);
  }
  const cat = (ds: [number, number][]) => ds.map(([a, b]) => [Math.max(a, o.tuMs), Math.min(b, o.denMs)] as [number, number]).filter(([a, b]) => b > a);
  const ngung = cat(gopKhoang(o.ngung.map((k) => [Date.parse(k.tu), Math.min(Date.parse(k.den), o.bayGio)] as [number, number])));
  tong.phutNgung = ngung.reduce((s, [a, b]) => s + (b - a), 0) / 60_000;
  const top = (m: Map<string, DongXepHang>) => Array.from(m.values()).sort((a, b) => b.token - a.token || b.luot - a.luot).slice(0, 5);
  return { tong, topNguoi: top(nguoi), topTinhNang: top(tinhNang), soCu, vet: { tuMs: o.tuMs, denMs: o.denMs, bayGio: o.bayGio, chay: cat(gopKhoang(chay)), ngung } };
}

// ── Giờ mở lại khi hết hạn mức ─────────────────────────────────────

const THANG: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

/** Lệch múi giờ (ms) theo tên CLI in trong ngoặc; không rõ → giờ Việt Nam (máy chủ đặt ở VN) */
function lechMuiGio(ten: string | undefined): number {
  const t = (ten ?? "").trim().toLowerCase();
  if (t === "utc" || t === "etc/utc" || t === "gmt") return 0;
  return GIO_VN;
}

/**
 * Giờ mở lại (ms) đọc từ câu báo hết hạn mức của Claude CLI; không đọc được → null (bên gọi tự đoán).
 * Các dạng đã gặp: "Claude AI usage limit reached|1759380000" (mốc giây) · "5-hour limit reached ∙ resets 3pm" ·
 * "You've hit your limit · resets 7:30pm (Asia/Saigon)" · "weekly limit reached ∙ resets Oct 6, 3pm".
 */
export function giaiGioMoLai(msg: string, bayGio: number): number | null {
  const s = String(msg ?? "");
  const moc = /\|(\d{10})\b/.exec(s);
  if (moc) return Number(moc[1]) * 1000;
  const m = /resets?\s+(?:at\s+)?(?:([a-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(?:at\s+)?)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)(?:\s*\(([^)]+)\))?/i.exec(s);
  if (!m) return null;
  let h = Number(m[3]) % 12;
  if (m[5].toLowerCase() === "pm") h += 12;
  const phut = m[4] ? Number(m[4]) : 0;
  const lech = lechMuiGio(m[6]);
  const nay = new Date(bayGio + lech);
  let y = nay.getUTCFullYear();
  let thang = nay.getUTCMonth();
  let ngay = nay.getUTCDate();
  const coNgay = m[1] && m[2] && THANG[m[1].toLowerCase()] !== undefined;
  if (coNgay) {
    thang = THANG[m[1].toLowerCase()];
    ngay = Number(m[2]);
  }
  let t = Date.UTC(y, thang, ngay, h, phut) - lech;
  if (coNgay) {
    if (t < bayGio - NGAY_MS) t = Date.UTC(++y, thang, ngay, h, phut) - lech;
  } else if (t <= bayGio) {
    t += NGAY_MS;
  }
  return t;
}

// ── Tên tính năng (luật 30: không để mã trần ra màn) ─────────────────

const TEN_TINH_NANG: Record<string, string> = {
  "lib/ai/chat-agent": "Trợ lý chat",
  "lib/tro-ly/xuat-theo-yeu-cau": "Trợ lý: xuất file theo yêu cầu",
  "lib/tro-ly/lam-bao-cao": "Trợ lý: làm báo cáo (/lam-bao-cao)",
  "app/api/skill/route": "Chạy kỹ năng AI",
  "lib/so-cai/lanh-dao-phoi-hop": "Sổ cái: chọn lãnh đạo phối hợp",
  "lib/so-cai/hen-gio": "Mồi phiên làm việc buổi sáng",
  "lib/phong/giai-doan": "Xếp việc vào 5 giai đoạn",
  // Mr. Đại chốt 04/10: việc CỦA NGƯỜI NỘP (chạy tiếp sau khi nộp), không phải việc nền máy tự chạy
  "lib/luat/ai/luot": "Góp ý + luật AI sau khi nộp",
  "lib/luat/ai/kiem": "Kiểm luật AI trên báo cáo",
  "lib/luat/ai/dich": "Dịch câu luật thành đề xuất luật",
  "lib/kiem-tra/sua-loi-ai": "Nộp báo cáo: bước sửa lỗi",
  "lib/kiem-tra/khai-bao-mau": "Khai báo mẫu báo cáo",
  "lib/kiem-tra/gop-y-ai": "AI góp ý nội dung báo cáo",
  "app/api/kiem-tra/ai-viec/route": "AI đọc báo cáo tìm việc",
  "app/api/gui/route": "Gửi báo cáo",
  "lib/gan-wbs/gan-wbs": "Gắn việc vào cây WBS",
  "lib/cay-viec/issue/nhom5": "Cây việc: issue nhóm 5 AI đề xuất",
  "app/api/cay-viec/soan-giao/route": "Cây việc: đề xuất người nhận việc",
  "lib/bao-cao-tuan/nen": "Báo cáo tuần: chạy nền",
  "lib/bao-cao-tuan/do-kho": "Báo cáo tuần: chấm độ khó",
  "lib/bao-cao-tuan/can-quyet-ai": "Báo cáo tuần: việc cần quyết",
  "app/api/ai/test/route": "Nút thử kết nối AI",
  "lib/ai/thu-ma": "Thử mã đăng nhập Claude",
  "lib/ai/thu-tai-khoan": "Nút Thử trợ lý AI (thẻ tài khoản Claude)",
  cu: "Chưa ghi tính năng (sổ cũ trước 04/10)",
};

export function tenTinhNang(ma: string): string {
  if (!ma) return "Không rõ tính năng";
  return TEN_TINH_NANG[ma] ?? `Tính năng khác (${ma})`;
}

/** Tên người: null = việc nền · "?" = sổ cũ */
export function tenNguoiLuot(ma: string, bang: Record<string, string>): string {
  if (ma === "") return "Việc nền (máy tự chạy)";
  if (ma === "?") return "Chưa ghi người (sổ cũ trước 04/10)";
  return bang[ma] ?? ma;
}
