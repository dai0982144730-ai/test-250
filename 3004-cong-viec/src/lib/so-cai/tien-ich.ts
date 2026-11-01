// ============================================================
// so-cai/tien-ich.ts — hàm THUẦN dùng chung (server + client): chuẩn hóa tiếng Việt, độ giống tên việc,
// ngày theo giờ Việt Nam, định dạng ngày, tiến độ, cảnh báo hạn. Không đụng CSDL.
// ============================================================

/** Bỏ dấu tiếng Việt, đ→d, chữ thường, bỏ ký tự lạ, gộp khoảng trắng. */
export function chuanHoa(s: string | null | undefined): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tapTu(s: string): Set<string> {
  return new Set(s.split(" ").filter(Boolean));
}

function capChu(s: string): Map<string, number> {
  const t = s.replace(/ /g, "");
  const m = new Map<string, number>();
  for (let i = 0; i < t.length - 1; i++) {
    const k = t.slice(i, i + 2);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

/** Độ giống hai chuỗi 0..1: trung bình Dice theo từ và Dice theo cặp chữ (đã chuẩn hóa). */
export function doGiongChuoi(a: string | null | undefined, b: string | null | undefined): number {
  const x = chuanHoa(a);
  const y = chuanHoa(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  const ta = tapTu(x);
  const tb = tapTu(y);
  let chung = 0;
  ta.forEach((w) => {
    if (tb.has(w)) chung++;
  });
  const diceTu = (2 * chung) / (ta.size + tb.size);
  const ca = capChu(x);
  const cb = capChu(y);
  let chungCap = 0;
  let tong = 0;
  ca.forEach((n, k) => {
    tong += n;
    chungCap += Math.min(n, cb.get(k) ?? 0);
  });
  cb.forEach((n) => (tong += n));
  const diceCap = tong ? (2 * chungCap) / tong : 0;
  return (diceTu + diceCap) / 2;
}

// ---------------- So TỪ CÓ NGHĨA (giữ dấu: "Nậm" ≠ "năm" ≠ "Nam") ----------------

const HU_TU = new Set(
  "và của cho các với để trong thể có là được đã đang chưa không về từ tại theo sau trước này một những sẽ cần hoặc nếu thì bị do đến khi như trên dưới ra vào lại còn cũng rất hơn ít nhiều mọi tất cả đề nghị kiến phòng ban".split(" "),
);

/** Chữ thường giữ dấu, bỏ ký tự lạ. Mã dạng "WTG-05", "HL-07" gộp thành một từ (wtg05). */
export function tachTuCoDau(s: string | null | undefined): string[] {
  return (s ?? "")
    .normalize("NFC")
    .replace(/(\p{L}{1,5})-(\d{1,4})(?!\d)/gu, "$1$2")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(" ")
    .filter(Boolean);
}

/** Từ có nghĩa: bỏ hư từ, số đứng riêng, chữ cái lẻ. */
export function tuCoNghia(s: string | null | undefined): string[] {
  return tachTuCoDau(s).filter((w) => w.length > 1 && !/^\d+$/.test(w) && !HU_TU.has(w));
}

/** Mã nhận diện (vừa chữ vừa số): T11, R21, TM2, 110kv, nm1. */
const laMa = (w: string) => /\p{L}/u.test(w) && /\d/.test(w);

/** Chữ đứng trước số hiệu: "đợt 4", "Điều 14", "tổ máy 2", "gói 3"… */
const TRUOC_SO_HIEU = new Set(["đợt", "điều", "số", "gói", "lần", "đoạn", "khoản", "mục", "phần", "máy", "giai"]);

/**
 * Số hiệu trong tên: số sau "đợt / điều / tổ máy…" hoặc số đứng cuối tên riêng (Nậm Khiên 1, Nam Khiên 2&3).
 * Không tính: ngày tháng, năm, số tiền / phần trăm / công suất, và SỐ LƯỢNG đứng trước danh từ ("01 HSDT", "03 vận hành viên").
 */
function soHieu(s: string): Set<string> {
  const t = (s ?? "")
    .replace(/\d{1,2}\s*[/.-]\s*\d{1,2}(?:\s*[/.-]\s*\d{2,4})?/g, " ")
    .replace(/\d+(?:[.,]\d+)+/g, " ")
    .replace(/\b(?:19|20)\d\d\b/g, " ")
    .replace(/\d+\s*(?:%|(?:tỷ|triệu|tr|mw|kw|kv|mva|kva|m²|m2|ha|ngày|tháng|tuần|hộ|người|bộ)(?!\p{L}))/giu, " ");
  const tu = tachTuCoDau(t);
  const kq = new Set<string>();
  tu.forEach((w, i) => {
    if (!/^\d+$/.test(w)) return;
    const sau = tu[i + 1];
    if (TRUOC_SO_HIEU.has(tu[i - 1] ?? "") || sau === undefined || /^\d+$/.test(sau)) kq.add(String(Number(w)));
  });
  return kq;
}

/** Hai tên có chung mã nhận diện (T11, R21, NK1…). */
export function chungMa(a: string, b: string): boolean {
  const maB = new Set(tachTuCoDau(b).filter(laMa));
  return tachTuCoDau(a).some((w) => laMa(w) && maB.has(w));
}

/** Hai tên chắc chắn KHÁC việc: mã nhận diện khác hẳn (T11 ≠ T12–T18) hoặc số hiệu khác nhau (đợt 4 ≠ đợt 5, NK1 ≠ NK2&3). */
export function khacSoHieu(a: string, b: string): boolean {
  const maA = new Set(tachTuCoDau(a).filter(laMa));
  const maB = new Set(tachTuCoDau(b).filter(laMa));
  if (maA.size && maB.size && !Array.from(maA).some((v) => maB.has(v))) return true;
  const sa = soHieu(a);
  const sb = soHieu(b);
  return sa.size > 0 && sb.size > 0 && (sa.size !== sb.size || Array.from(sa).some((v) => !sb.has(v)));
}

/** Phần từ có nghĩa của `ngan` có mặt trong `dai` (0..1). */
export function tyLeChuaTu(ngan: string, dai: string): number {
  const tu = tuCoNghia(ngan);
  if (!tu.length) return 0;
  const co = new Set(tachTuCoDau(dai));
  return tu.filter((w) => co.has(w)).length / tu.length;
}

/** Độ giống hai tên việc: giống chuỗi, hoặc tên ngắn nằm trọn trong tên dài (chung mã T11/R21 thì dễ khớp hơn);
 *  số hiệu / mã khác hẳn thì coi như khác. */
export function doGiongTen(a: string, b: string): number {
  if (khacSoHieu(a, b)) return Math.min(doGiongChuoi(a, b), 0.3);
  const [ngan, dai] = tuCoNghia(a).length <= tuCoNghia(b).length ? [a, b] : [b, a];
  const r = tyLeChuaTu(ngan, dai);
  // Tên ngắn chỉ còn MỘT chữ có nghĩa ("test", "Hợp đồng") thì chung một chữ không nói lên gì: tối đa 0,5 — dưới ngưỡng gợi ý
  // (test 02/10: việc tên vỡ dấu "test c?y b?t…" bị gợi ý trùng 75% với mọi việc có chữ TEST)
  const ngan1 = tuCoNghia(ngan).length < 2;
  const theoTu = r === 1 && !ngan1 ? 0.85 : chungMa(a, b) && r >= 0.5 ? 0.4 + 0.5 * r : r * (ngan1 ? 0.5 : 0.75);
  return Math.max(doGiongChuoi(a, b), theoTu);
}

// ---------------- ĐỘNG TỪ ĐẦU TÊN VIỆC (Mr. Đại bắt lỗi 02/10/2026) ----------------
// "Thi công móng trụ T5–T8" và "Nghiệm thu móng trụ T5–T8" chung đối tượng nhưng là HAI việc — máy từng chấm giống 83% (ngưỡng
// gợi ý 60%), báo "Thi công … đã xong" đóng nhầm việc Nghiệm thu. Cùng nhóm = cùng hành động (duyệt ≈ phê duyệt, rà ≈ rà soát).
const NHOM_DONG_TU: string[][] = [
  ["thi công", "xây dựng", "đổ bê tông", "đổ"],
  ["nghiệm thu"],
  ["bàn giao"],
  ["lập", "soạn", "soạn thảo"],
  ["trình", "đệ trình"],
  ["duyệt", "phê duyệt", "phê"],
  ["thẩm định", "thẩm tra"],
  ["rà", "rà soát", "soát", "soát xét"],
  ["kiểm tra", "giám sát"],
  ["thiết kế"],
  ["khảo sát", "đo đạc"],
  ["ký", "ký kết"],
  ["thanh toán", "chi trả", "giải ngân", "tạm ứng"],
  ["quyết toán"],
  ["nộp", "gửi"],
  ["họp", "tổ chức họp", "làm việc với"],
  ["mua", "mua sắm", "đặt hàng"],
  ["đấu thầu", "lựa chọn nhà thầu", "mời thầu"],
  ["đàm phán", "thương thảo"],
  ["chuẩn bị"],
  ["hoàn thiện", "bổ sung", "cập nhật", "điều chỉnh", "sửa đổi"],
  ["báo cáo"],
  ["xin", "đề nghị cấp"],
  ["cấp", "ban hành", "phát hành"],
  ["triển khai", "thực hiện"],
  ["theo dõi", "giám sát tiến độ"],
  ["xử lý", "khắc phục", "giải quyết"],
  ["sửa chữa", "đại tu", "bảo dưỡng", "bảo trì"],
  ["thay", "thay thế"],
  ["lắp đặt", "lắp"],
  ["vận chuyển"],
  ["thí nghiệm", "chạy thử", "thử nghiệm"],
  ["đóng điện", "hòa lưới", "hoà lưới"],
  ["vận hành"],
  ["đào tạo", "huấn luyện"],
  ["tuyển dụng"],
  ["đánh giá"],
  ["nghiên cứu"],
  ["đền bù", "bồi thường"],
];
const DONG_TU = new Map<string, number>();
NHOM_DONG_TU.forEach((nhom, i) => nhom.forEach((t) => DONG_TU.set(t, i)));

/** Nhóm động từ đứng đầu tên việc (thử cụm 3 → 2 → 1 chữ), null = tên không bắt đầu bằng động từ đã biết. */
export function dongTuDau(ten: string): number | null {
  const tu = (ten ?? "").normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().split(" ");
  for (let n = 3; n >= 1; n--) {
    const k = DONG_TU.get(tu.slice(0, n).join(" "));
    if (k !== undefined) return k;
  }
  return null;
}

/** Hai tên việc bắt đầu bằng HAI hành động khác nhau (thi công ≠ nghiệm thu) → không phải cùng một việc. */
export function khacDongTu(a: string, b: string): boolean {
  const x = dongTuDau(a);
  const y = dongTuDau(b);
  return x !== null && y !== null && x !== y;
}

/** Độ giống một dòng việc với một việc đang mở: tên là chính, dự án + hạng mục cộng/trừ điểm.
 *  `duAnYeu`: giá trị "dự án" chỉ là tên đơn vị / "Công ty" (tự điền, không phải dự án thật) → không xét dự án. */
export function doGiongViec(
  a: { ten: string; du_an?: string | null; hang_muc?: string | null },
  b: { ten: string; du_an?: string | null; hang_muc?: string | null },
  duAnYeu?: (duAn: string) => boolean,
  /** Mã dự án trong danh mục (Cài đặt → Danh mục dự án, khớp cả tên gọi khác) — null khi không khớp dự án nào */
  duAnId?: (duAn: string) => string | null,
): number {
  let d = doGiongTen(a.ten, b.ten);
  // Khác hành động (thi công ≠ nghiệm thu): dưới ngưỡng gợi ý — chung đối tượng không đủ là cùng việc
  if (khacDongTu(a.ten, b.ten)) d = Math.min(d, 0.45);
  if (a.du_an && b.du_an && !(duAnYeu && (duAnYeu(a.du_an) || duAnYeu(b.du_an)))) {
    // Mr. Đại chốt K10 02/10: chỉ gợi ý trùng khi CÙNG dự án (hoặc một bên không ghi dự án) — test đêm 01/10: "Rà soát HĐ EPC"
    // bị gợi ý trùng việc HĐ EPC của dự án khác chỉ vì chung chữ. Cùng dự án = cùng mã trong danh mục; không tra được mã thì so
    // chữ ("TĐ Nam Khiên 1" ≠ "TĐ Nam Khiên 2": số hiệu khác là dự án khác)
    const ia = duAnId?.(a.du_an) ?? null;
    const ib = duAnId?.(b.du_an) ?? null;
    const cung = ia && ib ? ia === ib : !khacSoHieu(a.du_an, b.du_an) && doGiongChuoi(a.du_an, b.du_an) >= 0.8;
    if (!cung) return 0;
    d += 0.1;
  }
  if (a.hang_muc && b.hang_muc) {
    const g = doGiongChuoi(a.hang_muc, b.hang_muc);
    d = g >= 0.8 ? d + 0.05 : g < 0.4 ? d * 0.8 : d;
  }
  return Math.max(0, Math.min(1, Math.round(d * 100) / 100));
}

/** "Dự án" chỉ là tên đơn vị / "Công ty" (hệ thống tự điền cho việc lấy từ bảng Kiến nghị…): không dùng để phân biệt việc. */
export function hamDuAnYeu(donVi: { ten: string; ten_ngan: string | null }[]): (duAn: string) => boolean {
  const ten = new Set(["công ty", ...donVi.flatMap((d) => [d.ten, d.ten_ngan ?? ""]).filter(Boolean).map((x) => x.normalize("NFC").trim().toLowerCase())]);
  return (duAn: string) => ten.has(duAn.normalize("NFC").trim().toLowerCase());
}

/** Ngày hôm nay theo giờ Việt Nam (UTC+7), dạng yyyy-mm-dd. */
export function homNayVN(luc: Date = new Date()): string {
  return new Date(luc.getTime() + 7 * 3600_000).toISOString().slice(0, 10);
}

/** 'yyyy-mm-dd HH:mm' theo giờ Việt Nam. */
export function lucVN(v: string | Date | null | undefined): string {
  if (!v) return "";
  const t = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(t.getTime())) return String(v);
  return new Date(t.getTime() + 7 * 3600_000).toISOString().slice(0, 16).replace("T", " ");
}

/** Cộng n ngày vào yyyy-mm-dd. */
export function congNgay(ngay: string, n: number): string {
  const t = Date.parse(ngay.slice(0, 10) + "T00:00:00Z");
  return new Date(t + n * 86400_000).toISOString().slice(0, 10);
}

/** yyyy-mm-dd → dd/mm (hoặc dd/mm/yyyy). */
export function ngayNgan(v: string | null | undefined, coNam = false): string {
  if (!v) return "";
  const s = String(v).slice(0, 10);
  const [y, m, d] = s.split("-");
  if (!d) return s;
  return coNam ? `${d}/${m}/${y}` : `${d}/${m}`;
}

export type CanhBao = "qua_han" | "sap_den_han" | null;

/** Cảnh báo một việc đang mở theo các phần việc còn làm. Việc luôn mở không bao giờ cảnh báo. */
export function tinhCanhBao(
  viec: { trang_thai: string; luon_mo: boolean },
  phan: { trang_thai: string; ket_thuc: string | null; luon_mo?: boolean }[],
  homNay: string,
  sapDenHanNgay: number,
): CanhBao {
  if (viec.trang_thai !== "dang_mo" || viec.luon_mo) return null;
  const moc = congNgay(homNay, sapDenHanNgay);
  let kq: CanhBao = null;
  for (const p of phan) {
    if (p.trang_thai !== "dang_lam" || !p.ket_thuc || p.luon_mo) continue;
    const h = p.ket_thuc.slice(0, 10);
    if (h < homNay) return "qua_han";
    if (h <= moc) kq = "sap_den_han";
  }
  return kq;
}

/** Phần việc đã quá hạn chưa (có hạn, đang làm, hạn trước hôm nay). */
export function phanQuaHan(p: { trang_thai: string; ket_thuc: string | null; luon_mo?: boolean; vai?: string }, homNay: string): boolean {
  return p.vai !== "phoi_hop" && p.trang_thai === "dang_lam" && !p.luon_mo && !!p.ket_thuc && p.ket_thuc.slice(0, 10) < homNay;
}

/** Tiến độ = phần CHỦ TRÌ đã xong / tổng phần chủ trì (phối hợp không tính — db/68). */
export function tienDo(phan: { trang_thai: string; vai?: string }[]): string {
  const ct = phan.filter((p) => p.vai !== "phoi_hop");
  return `${ct.filter((p) => p.trang_thai === "da_ket_thuc").length}/${ct.length}`;
}

/** Mã ngắn của dự án: chữ đầu mỗi từ ('Điện gió Hướng Việt' → 'DGHV'); một từ → 4 chữ đầu; trống → 'CHUNG'. */
export function maDuAn(ten: string | null | undefined): string {
  const tu = chuanHoa(ten).split(" ").filter(Boolean);
  if (!tu.length) return "CHUNG";
  const ma = tu.length === 1 ? tu[0].slice(0, 4) : tu.map((w) => w[0]).join("").slice(0, 6);
  return ma.toUpperCase();
}

/** Mã đơn vị trong mã việc: mã đơn vị viết hoa ('bqlda-qt' → 'BQLDA-QT'); không có → 'CT'. */
export function maDonVi(id: string | null | undefined): string {
  return (id ?? "").trim().toUpperCase().replace(/[^A-Z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "CT";
}

/**
 * Mã việc theo mẫu cấu hình, vd 'CV-{nam}-{so:4}' → 'CV-2026-0412'.
 * Thêm: {thang} = tháng 2 chữ số, {don_vi} = mã đơn vị lập/giao, {du_an} = mã ngắn dự án.
 */
export function dinhDangMaViec(mau: string, nam: number, so: number, them: { thang?: number; don_vi?: string | null; du_an?: string | null } = {}): string {
  return dienTruocSo(mau, nam, them)
    .replace(/\{so:(\d+)\}/g, (_m, n: string) => String(so).padStart(Number(n), "0"))
    .replace(/\{so\}/g, String(so));
}

/** Điền mọi chỗ trừ {so} — dùng làm khóa bộ đếm (mỗi tiền tố một dãy số riêng). */
export function dienTruocSo(mau: string, nam: number, them: { thang?: number; don_vi?: string | null; du_an?: string | null } = {}): string {
  return mau
    .replace(/\{nam\}/g, String(nam))
    .replace(/\{thang\}/g, String(them.thang ?? 1).padStart(2, "0"))
    .replace(/\{don_vi\}/g, maDonVi(them.don_vi))
    .replace(/\{du_an\}/g, maDuAn(them.du_an));
}

/** Các nguyên tắc sinh mã việc cho chọn trong Cài đặt ('tu_chon' = dùng ô Dạng mã việc). */
export const NGUYEN_TAC_MA_VIEC: { gia_tri: string; nhan: string }[] = [
  { gia_tri: "CV-{nam}-{so:4}", nhan: "Theo năm — CV-2026-0412" },
  { gia_tri: "CV-{nam}{thang}-{so:3}", nhan: "Theo tháng — CV-202609-012" },
  { gia_tri: "{don_vi}-{nam}-{so:4}", nhan: "Theo đơn vị lập — BQLDA-QT-2026-0012" },
  { gia_tri: "{du_an}-{so:4}", nhan: "Theo dự án — DGHV-0012 (Điện gió Hướng Việt)" },
  { gia_tri: "{du_an}-{don_vi}-{so:3}", nhan: "Theo dự án + đơn vị — DGHV-BQLDA-QT-012" },
  { gia_tri: "tu_chon", nhan: "Tự đặt theo ô \"Dạng mã việc\" bên dưới" },
];

/** Mẫu mã việc đang dùng theo cài đặt. */
export function mauMaViec(ch: { nguyen_tac_ma_viec?: string; dang_ma_viec: string }): string {
  return !ch.nguyen_tac_ma_viec || ch.nguyen_tac_ma_viec === "tu_chon" ? ch.dang_ma_viec : ch.nguyen_tac_ma_viec;
}
