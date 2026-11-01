// ============================================================
// so-cai/moc-viec.ts — đọc ô ngày viết bằng chữ "theo việc khác" (hàm THUẦN, không đụng CSDL):
//   "Sau khi xong ván khuôn và cốt pha"            → bắt đầu = ngày 2 việc đó xong
//   "Sau CV-2026-0012, CV-2026-0013"                 → theo mã việc
//   "Sau 2 ngày tính từ khi làm việc với đối tác MAC" → ngày mốc xong + 2
//   "CV-2026-0012 + 3 ngày"
// Không có từ khóa "sau / kể từ / tính từ / +" thì trả null (ô vẫn bị báo sai dạng ngày như cũ).
// ============================================================
import type { MocViec, ViecMoc } from "@/lib/types";
import { chuanHoa, doGiongChuoi } from "./tien-ich";

/** Bỏ dấu từng ký tự, giữ nguyên độ dài để cắt lại chuỗi gốc theo vị trí. */
function boDauGiuDoDai(s: string): string {
  let kq = "";
  for (const c of s) {
    const b = c === "đ" ? "d" : c === "Đ" ? "D" : c.normalize("NFD").replace(/[̀-ͯ]/g, "");
    const t = (b || c).toLowerCase();
    // Ký tự đổi độ dài (hiếm) thì giữ nguyên để không lệch vị trí
    kq += t.length === c.length ? t : c;
  }
  return kq;
}

/** Mã việc trong chữ: nhóm chữ/số nối bằng "-", kết thúc bằng số ≥ 2 chữ số (CV-2026-0412, BQLDA-QT-2026-0012). */
const MA_VIEC = /\b[A-Za-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)*-\d{2,}\b/g;

const TU_KHOA = /\b(?:ke tu khi|ke tu|tinh tu khi|tinh tu|tu khi|sau khi|sau)\b/g;
const SO_NGAY = /(\d+)\s*ngay(?:\s*lam viec)?/;
// Chữ đệm đầu tên việc: "xong", "làm xong", "hoàn thành", "2 việc", "các công việc", "khi" (giữ "làm việc với…")
const DEM_DAU = /^(?:(?:lam\s+)?(?:xong|hoan thanh|ket thuc)\s+|(?:\d+|hai|ba|bon|cac)\s+(?:cong\s+)?viec\s+|khi\s+)+/;
// Từ phổ thông không tính khi so khớp tên mốc với tên việc
const TU_PHO_THONG = new Set(["lam", "viec", "cong", "cac", "xong", "cua"]);
// Chữ nối đứng quanh mã việc ("Sau CV-2026-0012", "khi xong CV-… và CV-…") — không làm cụm thành tên việc
const TU_NOI = new Set(["sau", "khi", "xong", "ke", "tu", "tinh", "va", "lam", "hoan", "thanh", "ket", "thuc", "viec", "cac", "cong"]);
const TACH = /\s*(?:,|;|&|\bva\b|\+(?!\s*\d))\s*/g;

function catTen(goc: string, chuan: string): ViecMoc[] {
  const kq: ViecMoc[] = [];
  let dau = 0;
  const them = (tu: number, den: number) => {
    let a = tu;
    let b = den;
    while (a < b && /\s/.test(chuan[a])) a++;
    while (b > a && /[\s.]/.test(chuan[b - 1])) b--;
    const m = DEM_DAU.exec(chuan.slice(a, b));
    if (m) a += m[0].length;
    const ten = goc.slice(a, b).trim();
    if (!ten) return;
    // Chỉ là MÃ khi cả cụm chỉ gồm mã: "Kiểm tra chuyên sâu inverter tuabin HL-07" là TÊN việc có tên thiết bị HL-07,
    // không phải mã việc HL-07 (Mr. Đại test 29/09 — trước đây máy cảnh báo sai "mã việc mốc HL-07 không có trong sổ cái").
    const ma = ten.match(MA_VIEC);
    MA_VIEC.lastIndex = 0;
    const conLai = boDauGiuDoDai(ten.replace(MA_VIEC, " ")).split(/[^a-z0-9]+/).filter((w) => w && !TU_NOI.has(w));
    if (ma && !conLai.length) for (const x of ma) kq.push({ ma: x.toUpperCase(), ten: x.toUpperCase() });
    else kq.push({ ten });
  };
  TACH.lastIndex = 0;
  for (let m = TACH.exec(chuan); m; m = TACH.exec(chuan)) {
    them(dau, m.index);
    dau = m.index + m[0].length;
  }
  them(dau, chuan.length);
  return kq;
}

/** Đọc ô ngày dạng chữ "theo việc khác". Không nhận ra → null. */
export function docMocViec(s: string): MocViec | null {
  const goc0 = (s ?? "").normalize("NFC").replace(/\s+/g, " ").trim();
  if (!goc0) return null;
  let chuan = boDauGiuDoDai(goc0);
  let goc = goc0;

  // Số ngày cộng thêm: "2 ngày" (lấy ra rồi xóa bằng khoảng trắng cùng độ dài)
  let soNgay = 0;
  const sn = SO_NGAY.exec(chuan);
  if (sn) {
    soNgay = Number(sn[1]);
    const trang = " ".repeat(sn[0].length);
    chuan = chuan.slice(0, sn.index) + trang + chuan.slice(sn.index + sn[0].length);
    goc = goc.slice(0, sn.index) + trang + goc.slice(sn.index + sn[0].length);
  }

  // Dạng "X + 3 ngày": phần trước dấu +
  const cong = /\+\s*$/.exec(chuan.trimEnd());
  if (sn && cong) {
    const den = chuan.trimEnd().length - cong[0].length;
    const viec = catTen(goc.slice(0, den), chuan.slice(0, den));
    return viec.length ? { goc: goc0, so_ngay: soNgay, viec } : null;
  }

  // Từ khóa mốc ĐẦU TIÊN (+ các từ khóa liền sau: "sau … tính từ khi"): phần sau là (các) việc mốc.
  // Không lấy từ khóa cuối — tên việc bỏ dấu có thể chứa "sau" (vd "móng sâu").
  TU_KHOA.lastIndex = 0;
  const dau = TU_KHOA.exec(chuan);
  if (!dau) return null;
  let tu = dau.index + dau[0].length;
  for (;;) {
    const tiep = new RegExp(`^\\s*${TU_KHOA.source}`).exec(chuan.slice(tu));
    if (!tiep) break;
    tu += tiep[0].length;
  }
  const viec = catTen(goc.slice(tu), chuan.slice(tu));
  return viec.length ? { goc: goc0, so_ngay: soNgay, viec } : null;
}

/** Điểm khớp tên việc mốc với một tên việc: giống chuỗi, hoặc mọi từ của tên mốc đều có trong tên việc. */
export function diemKhopTen(tenMoc: string, tenViec: string): number {
  const tuMoc = chuanHoa(tenMoc).split(" ").filter(Boolean);
  const a = tuMoc.filter((w) => !TU_PHO_THONG.has(w)).length ? tuMoc.filter((w) => !TU_PHO_THONG.has(w)) : tuMoc;
  const b = new Set(chuanHoa(tenViec).split(" ").filter(Boolean));
  if (!a.length || !b.size) return 0;
  const chua = a.filter((w) => b.has(w)).length / a.length;
  return Math.max(doGiongChuoi(tenMoc, tenViec), chua === 1 ? 0.9 : chua * 0.7);
}

export const NGUONG_KHOP_MOC = 0.6;

/** Mô tả ngắn: "sau CV-2026-0012, Làm cốt pha + 2 ngày". */
export function moTaMoc(m: MocViec): string {
  return `sau ${m.viec.map((v) => v.ma ?? v.ten).join(", ")}${m.so_ngay ? ` + ${m.so_ngay} ngày` : ""}`;
}
