// ============================================================
// BỘ VẼ ẢNH BIỂU ĐỒ CỦA BÁO CÁO SÁNG  (server-only — @napi-rs/canvas + node:fs; phần thuần ở anh-kieu.ts, luật 10)
// KE-HOACH/23 (Mr. Đại chốt 17/10/2026): khối biểu đồ gửi kèm ảnh qua Telegram, bản web hiện CÙNG ảnh — một chỗ vẽ.
//
// Bộ vẽ KHÔNG tính số nào: chỉ đặt số của đặc tả lên giấy. Phép cộng duy nhất là nhãn cuối thanh (= cộng các đoạn đã cho).
// Ngày in dd/mm/yyyy (luật E32), số theo chuẩn Việt Nam qua `fmtSo` (12/10), màu nào cũng có chú giải (luật 18).
//
// ⛔ KHÔNG BAO GIỜ NÉM LỖI: bộ hẹn giờ báo cáo sáng gọi hàm này không có người trực. Đặc tả rỗng / hỏng → ảnh có câu
//    «Chưa có số liệu để vẽ». Hỏng tới mức không dựng nổi ảnh nào (gần như không thể) → Buffer rỗng; `guiAnhToi` từ chối
//    gửi Buffer rỗng bằng câu tiếng Việt.
//
// Phông: chữ tiếng Việt có dấu phải hiện đúng → đăng ký phông hệ thống có dấu (Windows: Arial / Segoe UI; Linux khi lên
// hosting: DejaVu Sans / Liberation Sans). Không có tệp nào → phông mặc định + một dòng cảnh báo máy chủ.
// ============================================================

import { existsSync } from "node:fs";
import { createCanvas, GlobalFonts, type SKRSContext2D } from "@napi-rs/canvas";
import {
  CO_ANH,
  MAU_DUONG,
  type AnhDuongNgay,
  type AnhDuongSo,
  type AnhSCurve,
  type AnhThanhHaiChieu,
  type AnhThanhNgang,
  type DacTaAnh,
  type MaMauDuong,
} from "./anh-kieu";
import { fmtDate, fmtSo } from "@/lib/format";

// ---------- Phông ----------

const HO_PHONG = "SCI Chu Viet";

/** Từng họ phông: [thường, đậm]. Thử lần lượt, lấy họ đầu tiên có tệp thường */
const CAP_PHONG: [string, string][] = [
  ["C:\\Windows\\Fonts\\arial.ttf", "C:\\Windows\\Fonts\\arialbd.ttf"],
  ["C:\\Windows\\Fonts\\segoeui.ttf", "C:\\Windows\\Fonts\\segoeuib.ttf"],
  ["/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"],
  [
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
  ],
];

/**
 * Phông DỰ PHÒNG cho ký hiệu phông chữ chính không có (đo 17/10/2026: Arial thiếu «↳» «⚠» «🤖» → hiện ô vuông).
 * Mỗi tệp một tên riêng, xếp sau phông chính trong chuỗi `font` — thiếu chữ nào thì lấy ở phông sau.
 */
const PHONG_KY_HIEU = [
  "C:\\Windows\\Fonts\\seguisym.ttf",
  "C:\\Windows\\Fonts\\seguiemj.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  "/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf",
];

let phongDaNap: { thuong: string | null; dam: string | null; kyHieu: string[] } | null = null;
let chuoiHoPhong = `"${HO_PHONG}", sans-serif`;

function napTep(duong: string, ten: string): boolean {
  try {
    return existsSync(duong) && GlobalFonts.registerFromPath(duong, ten);
  } catch {
    return false;
  }
}

/** Đăng ký phông có dấu MỘT lần cho cả tiến trình; trả tệp đang dùng (null = phông mặc định) */
export function phongVeAnh(): { thuong: string | null; dam: string | null; kyHieu: string[] } {
  if (phongDaNap) return phongDaNap;
  const ra: { thuong: string | null; dam: string | null; kyHieu: string[] } = { thuong: null, dam: null, kyHieu: [] };
  for (const [thuong, dam] of CAP_PHONG) {
    if (napTep(thuong, HO_PHONG)) {
      ra.thuong = thuong;
      ra.dam = napTep(dam, HO_PHONG) ? dam : null;
      break;
    }
  }
  const ho = [`"${HO_PHONG}"`];
  for (const tep of PHONG_KY_HIEU) {
    const ten = `SCI Ky Hieu ${ra.kyHieu.length + 1}`;
    if (tep !== ra.thuong && napTep(tep, ten)) {
      ra.kyHieu.push(tep);
      ho.push(`"${ten}"`);
    }
  }
  chuoiHoPhong = [...ho, "sans-serif"].join(", ");
  if (!ra.thuong) {
    console.warn(
      "[ve-anh] Không tìm thấy phông có dấu tiếng Việt (Arial, Segoe UI, DejaVu Sans, Liberation Sans) — " +
        "ảnh biểu đồ dùng phông mặc định, chữ có dấu có thể hiện sai."
    );
  }
  phongDaNap = ra;
  return ra;
}

// ---------- Bảng màu & cỡ ----------

const CHU = "#1c1917";
const CHU_PHU = "#57534e";
const LUOI = "#e7e5e4";
const TRUC = "#a8a29e";
const NEN = "#ffffff";
const LE = 20;
/** Cỡ chữ chuẩn trong ảnh 720×480: thu về ~360 điểm trên điện thoại vẫn ≥ 11 điểm (Mr. Đại chốt 25/10/2026) */
const CO_CHU = 22;
const NGAY_MS = 86_400_000;

const CHUA_CO_SO_LIEU = "Chưa có số liệu để vẽ";

function mau(m: unknown): string {
  return typeof m === "string" && m in MAU_DUONG ? MAU_DUONG[m as MaMauDuong] : MAU_DUONG.phu;
}

function phong(ctx: SKRSContext2D, co: number, dam = false): void {
  ctx.font = `${dam ? "bold " : ""}${co}px ${chuoiHoPhong}`;
}

/** Rút gọn có «…» cho vừa `rongToiDa` điểm ảnh */
function rutGon(ctx: SKRSContext2D, chu: string, rongToiDa: number): string {
  if (rongToiDa <= 0) return "";
  if (ctx.measureText(chu).width <= rongToiDa) return chu;
  const kyTu = Array.from(chu);
  let thap = 0;
  let cao = kyTu.length;
  while (thap < cao) {
    const giua = Math.ceil((thap + cao) / 2);
    if (ctx.measureText(kyTu.slice(0, giua).join("").trimEnd() + "…").width <= rongToiDa) thap = giua;
    else cao = giua - 1;
  }
  return thap === 0 ? "…" : kyTu.slice(0, thap).join("").trimEnd() + "…";
}

/** Xuống dòng theo chữ, tối đa `toiDaDong` dòng — dòng cuối thừa thì rút gọn «…» */
function xuongDong(ctx: SKRSContext2D, chu: string, rong: number, toiDaDong: number): string[] {
  const tu = chu.split(/\s+/).filter(Boolean);
  const dong: string[] = [];
  let hienTai = "";
  let i = 0;
  for (; i < tu.length; i++) {
    const thu = hienTai ? `${hienTai} ${tu[i]}` : tu[i];
    if (ctx.measureText(thu).width <= rong || !hienTai) {
      hienTai = thu;
      continue;
    }
    dong.push(hienTai);
    hienTai = tu[i];
    if (dong.length === toiDaDong - 1) {
      hienTai = tu.slice(i).join(" ");
      i = tu.length;
      break;
    }
  }
  if (hienTai) dong.push(hienTai);
  return dong.slice(0, toiDaDong).map((d) => rutGon(ctx, d, rong));
}

/** Ngắt dòng theo chữ, KHÔNG rút gọn — trả mọi dòng (một từ dài hơn `rong` vẫn nằm trọn một dòng) */
function ngatDong(ctx: SKRSContext2D, chu: string, rong: number): string[] {
  const tu = chu.split(/\s+/).filter(Boolean);
  const dong: string[] = [];
  let hienTai = "";
  for (const t of tu) {
    const thu = hienTai ? `${hienTai} ${t}` : t;
    if (!hienTai || ctx.measureText(thu).width <= rong) hienTai = thu;
    else {
      dong.push(hienTai);
      hienTai = t;
    }
  }
  if (hienTai) dong.push(hienTai);
  return dong;
}

/**
 * Nhãn của một thanh (27/10, anh chê tên bị cắt «…» trong ảnh): vừa một dòng thì cỡ chữ thường; không vừa thì xuống tối đa 2 dòng
 * với chữ nhỏ hơn; chỉ khi 2 dòng vẫn không đủ mới rút gọn «…». Căn phải tại `xPhai`, giữa theo `giua`.
 */
function veNhanThanh(ctx: SKRSContext2D, chu: string, xPhai: number, giua: number, rong: number): void {
  const goc = chu.replace(/\s+/g, " ").trim() || "Không tên";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  phong(ctx, CO_CHU);
  if (ctx.measureText(goc).width <= rong) {
    ctx.fillText(goc, xPhai, giua);
    return;
  }
  phong(ctx, 20);
  let dong = ngatDong(ctx, goc, rong);
  if (dong.length > 2) dong = xuongDong(ctx, goc, rong, 2);
  const cao = 22;
  dong.forEach((d, i) => ctx.fillText(d, xPhai, giua - ((dong.length - 1) * cao) / 2 + i * cao));
}

/** Chữ có viền trắng — đọc được cả khi nằm đè lên đường */
function chuCoVien(ctx: SKRSContext2D, chu: string, x: number, y: number, mauChu: string): void {
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineWidth = 4;
  ctx.strokeStyle = NEN;
  ctx.strokeText(chu, x, y);
  ctx.fillStyle = mauChu;
  ctx.fillText(chu, x, y);
  ctx.restore();
}

// ---------- Ngày ----------

function msTuIso(s: unknown): number | null {
  if (typeof s !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s.trim());
  if (!m) return null;
  const nam = Number(m[1]);
  const thang = Number(m[2]);
  const ngay = Number(m[3]);
  if (thang < 1 || thang > 12 || ngay < 1 || ngay > 31) return null;
  const t = Date.UTC(nam, thang - 1, ngay);
  return new Date(t).getUTCDate() === ngay ? t : null;
}

function chuNgay(t: number): string {
  return fmtDate(new Date(t).toISOString().slice(0, 10));
}

/** Mốc ngày trên trục: bước 1–14 ngày nếu khoảng ngắn, không thì đầu tháng cách 1/2/3/4/6/12… tháng */
function vachNgay(tu: number, den: number, toiDa: number): number[] {
  const n = Math.max(2, toiDa);
  const soNgay = (den - tu) / NGAY_MS;
  const dau = Math.ceil(tu / NGAY_MS) * NGAY_MS;
  for (const b of [1, 2, 3, 5, 7, 10, 14]) {
    if (Math.floor(soNgay / b) + 1 <= n) {
      const ra: number[] = [];
      for (let t = dau; t <= den; t += b * NGAY_MS) ra.push(t);
      return ra;
    }
  }
  for (const m of [1, 2, 3, 4, 6, 12, 24, 60, 120]) {
    const d = new Date(tu);
    let chiSo = d.getUTCFullYear() * 12 + d.getUTCMonth() + (d.getUTCDate() === 1 && d.getUTCHours() === 0 ? 0 : 1);
    chiSo = Math.ceil(chiSo / m) * m;
    const ra: number[] = [];
    for (;;) {
      const t = Date.UTC(Math.floor(chiSo / 12), chiSo % 12, 1);
      if (t > den) break;
      ra.push(t);
      chiSo += m;
    }
    if (ra.length <= n) return ra;
  }
  return [tu, den];
}

// ---------- Khung chung: nền · tiêu đề · chú giải · chú thích ----------

interface MucChuGiai {
  nhan: string;
  mau: string;
  kieu: "duong" | "net-dut" | "o";
}

interface Khung {
  ctx: SKRSContext2D;
  /** Vùng còn lại cho biểu đồ (chưa trừ nhãn trục) */
  tren: number;
  duoi: number;
}

function veKhung(
  ctx: SKRSContext2D,
  tieuDe: string,
  chuGiai: MucChuGiai[],
  chuThich: string | undefined
): Khung {
  const W = CO_ANH.rong;
  const H = CO_ANH.cao;
  ctx.fillStyle = NEN;
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = "top";
  ctx.textAlign = "left";

  // Tiêu đề không bị cắt «…»: cỡ 25 tối đa 2 dòng; dài hơn thì hạ 22 rồi 20, cho phép 3 dòng; hết cách mới rút gọn
  ctx.fillStyle = CHU;
  let coTd = 25;
  let dongTieuDe: string[] = [];
  for (const [co, toiDa] of [[25, 2], [22, 3], [20, 3]] as [number, number][]) {
    phong(ctx, co, true);
    coTd = co;
    const du = ngatDong(ctx, tieuDe, W - 2 * LE);
    dongTieuDe = du.length <= toiDa ? du : xuongDong(ctx, tieuDe, W - 2 * LE, toiDa);
    if (du.length <= toiDa) break;
  }
  const caoTd = coTd + 4;
  dongTieuDe.forEach((d, i) => ctx.fillText(d, LE, 10 + i * caoTd));
  let y = 14 + dongTieuDe.length * caoTd;

  // Chú giải: mỗi màu một mục có tên (luật 18); quá dòng thì xuống, tối đa 3 dòng
  if (chuGiai.length > 0) {
    phong(ctx, CO_CHU);
    const caoDong = 30;
    let x = LE;
    let soDong = 1;
    for (const muc of chuGiai) {
      const chu = rutGon(ctx, muc.nhan, W - 2 * LE - 34);
      const rong = 34 + ctx.measureText(chu).width;
      if (x > LE && x + rong > W - LE) {
        if (soDong === 5) break;
        soDong++;
        x = LE;
        y += caoDong;
      }
      const giua = y + 12;
      ctx.save();
      if (muc.kieu === "o") {
        ctx.fillStyle = muc.mau;
        ctx.fillRect(x, giua - 8, 22, 16);
      } else {
        ctx.strokeStyle = muc.mau;
        ctx.lineWidth = 4;
        ctx.setLineDash(muc.kieu === "net-dut" ? [6, 4] : []);
        ctx.beginPath();
        ctx.moveTo(x, giua);
        ctx.lineTo(x + 26, giua);
        ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = CHU;
      ctx.fillText(chu, x + 34, y);
      x += rong + 20;
    }
    y += caoDong;
  }

  // Chú thích dưới cùng: tối đa 2 dòng
  // Chú thích dài KHÔNG vẽ trong ảnh: chữ cỡ đọc được trên điện thoại không đủ chỗ; Telegram gửi nó làm lời kèm ảnh
  void chuThich;
  void xuongDong;
  return { ctx, tren: y + 8, duoi: H - 8 };
}

function veChuaCoSoLieu(ctx: SKRSContext2D, tieuDe: string): void {
  const k = veKhung(ctx, tieuDe, [], undefined);
  phong(ctx, 26);
  ctx.fillStyle = CHU_PHU;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(CHUA_CO_SO_LIEU, CO_ANH.rong / 2, (k.tren + k.duoi) / 2);
}

// ---------- Chống chữ đè ----------

interface O {
  x: number;
  y: number;
  r: number;
  c: number;
}

/** Hai ô chữ đè nhau — tính cả khe hở `KHE` để hai nhãn không dính liền */
const KHE = 8;
function de(a: O, b: O): boolean {
  return a.x < b.x + b.r + KHE && b.x < a.x + a.r + KHE && a.y < b.y + b.c + 2 && b.y < a.y + a.c + 2;
}

/** Thử lần lượt các chỗ đặt; chỗ đầu tiên không đè ô đã đặt và nằm trong vùng thì nhận. Không chỗ nào → null */
function chonCho(daDat: O[], ungVien: O[], vung: O): O | null {
  for (const o of ungVien) {
    const trongVung = o.x >= vung.x && o.y >= vung.y && o.x + o.r <= vung.x + vung.r && o.y + o.c <= vung.y + vung.c;
    if (trongVung && !daDat.some((d) => de(d, o))) {
      daDat.push(o);
      return o;
    }
  }
  return null;
}

// ---------- Kiểu 1: đường bậc thang, trục đứng là NGÀY (TQ-2) ----------

/** Trường tuỳ chọn ngoài khuôn anh-kieu.ts — chưa khai thì mặc định «COD dự báo», màu Dự báo */
type DuongNgayMoRong = AnhDuongNgay & { nhanDuong?: string; mauDuong?: MaMauDuong };

function veDuongNgay(ctx: SKRSContext2D, d: DuongNgayMoRong): void {
  const tieuDe = chuoi(d.tieuDe);
  const diem = (Array.isArray(d.diem) ? d.diem : [])
    .map((p) => ({ x: msTuIso(p?.ngay), y: msTuIso(p?.giaTri) }))
    .filter((p): p is { x: number; y: number } => p.x !== null && p.y !== null)
    .sort((a, b) => a.x - b.x);
  if (diem.length === 0) return veChuaCoSoLieu(ctx, tieuDe);
  const vach = (Array.isArray(d.vachNgang) ? d.vachNgang : [])
    .map((v) => ({ nhan: chuoi(v?.nhan), y: msTuIso(v?.ngay), mau: mau(v?.mau) }))
    .filter((v): v is { nhan: string; y: number; mau: string } => v.y !== null);

  const mauDuong = mau(d.mauDuong ?? "du-bao");
  const nhanDuong = chuoi(d.nhanDuong) || "COD dự báo";
  const chuGiai: MucChuGiai[] = [
    { nhan: nhanDuong, mau: mauDuong, kieu: "duong" },
    ...vach.map((v) => ({ nhan: v.nhan || chuNgay(v.y), mau: v.mau, kieu: "net-dut" as const })),
  ];
  const k = veKhung(ctx, tieuDe, chuGiai, d.chuThich);

  // Trục đứng (ngày COD) — gồm mọi điểm và mọi vạch, thêm lề trên dưới
  const tatCaY = [...diem.map((p) => p.y), ...vach.map((v) => v.y)];
  let yMin = Math.min(...tatCaY);
  let yMax = Math.max(...tatCaY);
  const leY = Math.max(3 * NGAY_MS, (yMax - yMin) * 0.1);
  yMin = Math.floor((yMin - leY) / NGAY_MS) * NGAY_MS;
  yMax = Math.ceil((yMax + leY) / NGAY_MS) * NGAY_MS;

  let xMin = diem[0].x;
  let xMax = diem[diem.length - 1].x;
  const leX = Math.max(NGAY_MS / 2, (xMax - xMin) * 0.03);
  xMin -= leX;
  xMax += leX;

  phong(ctx, CO_CHU);
  const rongNhanNgay = ctx.measureText("00/00/0000").width;
  const trai = LE + rongNhanNgay + 12;
  const phai = CO_ANH.rong - LE;
  const tren = k.tren + 6;
  const duoi = k.duoi - 36;
  const xPx = (t: number) => trai + ((t - xMin) / (xMax - xMin)) * (phai - trai);
  const yPx = (t: number) => duoi - ((t - yMin) / (yMax - yMin)) * (duoi - tren);

  // Lưới + nhãn trục đứng
  ctx.textBaseline = "middle";
  ctx.textAlign = "right";
  for (const t of vachNgay(yMin, yMax, Math.floor((duoi - tren) / 46))) {
    const y = Math.round(yPx(t)) + 0.5;
    ctx.strokeStyle = LUOI;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(trai, y);
    ctx.lineTo(phai, y);
    ctx.stroke();
    ctx.fillStyle = CHU_PHU;
    ctx.fillText(chuNgay(t), trai - 8, y);
  }
  veTrucNgang(ctx, trai, phai, duoi, xMin, xMax, xPx);

  const daDat: O[] = [];
  const vung: O = { x: trai, y: tren - 4, r: phai - trai, c: duoi - tren + 4 };

  // Vạch ngang các hệ: nét đứt + «nhãn ngày» đặt sát mép trái, trên vạch
  phong(ctx, CO_CHU, true);
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  const nhanVach: { chu: string; o: O | null; mau: string }[] = [];
  for (const v of vach) {
    const y = yPx(v.y);
    ctx.save();
    ctx.strokeStyle = v.mau;
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(trai, y);
    ctx.lineTo(phai, y);
    ctx.stroke();
    ctx.restore();
    const chu = rutGon(ctx, `${v.nhan ? v.nhan + " " : ""}${chuNgay(v.y)}`, phai - trai - 16);
    const r = ctx.measureText(chu).width;
    const o = chonCho(
      daDat,
      [
        { x: trai + 8, y: y - 30, r, c: 28 },
        { x: trai + 8, y: y + 4, r, c: 28 },
        { x: phai - 8 - r, y: y - 30, r, c: 28 },
        { x: phai - 8 - r, y: y + 4, r, c: 28 },
      ],
      vung
    );
    nhanVach.push({ chu, o, mau: v.mau });
  }

  // Đường bậc thang: giữ giá trị tới ngày sau rồi mới đổi
  ctx.save();
  ctx.strokeStyle = mauDuong;
  ctx.lineWidth = 4;
  ctx.lineJoin = "round";
  ctx.beginPath();
  diem.forEach((p, i) => {
    const x = xPx(p.x);
    const y = yPx(p.y);
    if (i === 0) ctx.moveTo(x, y);
    else {
      ctx.lineTo(x, yPx(diem[i - 1].y));
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();
  ctx.fillStyle = mauDuong;
  for (const p of diem) {
    ctx.beginPath();
    ctx.arc(xPx(p.x), yPx(p.y), 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  for (const n of nhanVach) if (n.o) chuCoVien(ctx, n.chu, n.o.x, n.o.y, n.mau);

  // Nhãn điểm cuối (và điểm đầu nếu còn chỗ): ngày COD tại đó
  phong(ctx, CO_CHU, true);
  const nhanDiem = (p: { x: number; y: number }, cuoi: boolean) => {
    const chu = chuNgay(p.y);
    const r = ctx.measureText(chu).width;
    const x = xPx(p.x);
    const y = yPx(p.y);
    const xTren = cuoi ? x - r : x;
    const o = chonCho(
      daDat,
      [
        { x: xTren, y: y - 36, r, c: 28 },
        { x: xTren, y: y + 8, r, c: 28 },
      ],
      vung
    );
    if (o) chuCoVien(ctx, chu, o.x, o.y, mauDuong);
  };
  nhanDiem(diem[diem.length - 1], true);
  if (diem.length > 1) nhanDiem(diem[0], false);
}

/** Trục ngang là ngày: đường trục + mốc + nhãn dd/mm/yyyy không đè nhau */
function veTrucNgang(
  ctx: SKRSContext2D,
  trai: number,
  phai: number,
  duoi: number,
  xMin: number,
  xMax: number,
  xPx: (t: number) => number
): void {
  ctx.strokeStyle = TRUC;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(trai, duoi + 0.5);
  ctx.lineTo(phai, duoi + 0.5);
  ctx.stroke();
  phong(ctx, CO_CHU);
  const rong = ctx.measureText("00/00/0000").width;
  ctx.fillStyle = CHU_PHU;
  ctx.textBaseline = "top";
  ctx.textAlign = "center";
  let phaiCu = -Infinity;
  for (const t of vachNgay(xMin, xMax, Math.floor((phai - trai) / (rong + 20)))) {
    const x = xPx(t);
    if (x < trai - 1 || x > phai + 1) continue;
    ctx.beginPath();
    ctx.moveTo(Math.round(x) + 0.5, duoi);
    ctx.lineTo(Math.round(x) + 0.5, duoi + 5);
    ctx.stroke();
    // giữ nhãn trong ảnh và không đè nhãn trước
    const giua = Math.min(Math.max(x, rong / 2 + 4), CO_ANH.rong - rong / 2 - 4);
    if (giua - rong / 2 < phaiCu + 10) continue;
    ctx.fillText(chuNgay(t), giua, duoi + 7);
    phaiCu = giua + rong / 2;
  }
}

// ---------- Kiểu 2: S-Curve tới 4 đường % (DA-3) ----------

function veSCurve(ctx: SKRSContext2D, d: AnhSCurve): void {
  const tieuDe = chuoi(d.tieuDe);
  const duong = (Array.isArray(d.duong) ? d.duong : [])
    .slice(0, 4)
    .map((l) => ({
      nhan: chuoi(l?.nhan),
      ma: l?.mau,
      mau: mau(l?.mau),
      diem: (Array.isArray(l?.diem) ? l.diem : [])
        .map((p) => ({ x: msTuIso(p?.ngay), pct: typeof p?.pct === "number" && Number.isFinite(p.pct) ? p.pct : null }))
        .filter((p): p is { x: number; pct: number } => p.x !== null && p.pct !== null)
        .sort((a, b) => a.x - b.x),
    }))
    .filter((l) => l.diem.length > 0);
  if (duong.length === 0) return veChuaCoSoLieu(ctx, tieuDe);
  const ngayCat = msTuIso(d.ngayCat);

  // Chú giải mang luôn điểm cuối mỗi đường (đọc từ đặc tả, không tính): tới 100% thì «đạt 100% ngày …» — đúng câu
  // DA-3 «ngày từng đường đạt 100%»; chưa tới thì «x% tại ngày …». Để ở chú giải thay vì cạnh điểm cuối: các điểm
  // 100% nằm sát nhau ở mép trên, nhãn đặt tại chỗ dễ đè nhau (đo ảnh mẫu 17/10/2026).
  const chuGiai: MucChuGiai[] = duong.map((l) => {
    const p = l.diem[l.diem.length - 1];
    const cuoi = p.pct >= 99.95 ? `đạt 100% ngày ${chuNgay(p.x)}` : `${fmtSo(p.pct, 1)}% tại ${chuNgay(p.x)}`;
    return {
      nhan: `${l.nhan || "Đường không tên"} · ${cuoi}`,
      mau: l.mau,
      kieu: l.ma === "du-bao" ? ("net-dut" as const) : ("duong" as const),
    };
  });
  if (ngayCat !== null) chuGiai.push({ nhan: "Ngày cắt dữ liệu", mau: MAU_DUONG.phu, kieu: "net-dut" });
  const k = veKhung(ctx, tieuDe, chuGiai, d.chuThich);

  const tatCaX = [...duong.flatMap((l) => l.diem.map((p) => p.x)), ...(ngayCat !== null ? [ngayCat] : [])];
  let xMin = Math.min(...tatCaX);
  let xMax = Math.max(...tatCaX);
  if (xMax === xMin) {
    xMin -= NGAY_MS;
    xMax += NGAY_MS;
  }

  phong(ctx, CO_CHU);
  const trai = LE + ctx.measureText("100%").width + 12;
  const phai = CO_ANH.rong - LE - 10;
  const tren = k.tren + 36; // chừa chỗ nhãn «Ngày cắt …» phía trên vạch 100%
  const duoi = k.duoi - 36;
  const xPx = (t: number) => trai + ((t - xMin) / (xMax - xMin)) * (phai - trai);
  const yPx = (pct: number) => duoi - (Math.min(100, Math.max(0, pct)) / 100) * (duoi - tren);

  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let v = 0; v <= 100; v += 20) {
    const y = Math.round(yPx(v)) + 0.5;
    ctx.strokeStyle = LUOI;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(trai, y);
    ctx.lineTo(phai, y);
    ctx.stroke();
    ctx.fillStyle = CHU_PHU;
    ctx.fillText(`${fmtSo(v)}%`, trai - 8, y);
  }
  veTrucNgang(ctx, trai, phai, duoi, xMin, xMax, xPx);

  const daDat: O[] = [];
  const vung: O = { x: trai - 4, y: k.tren, r: phai - trai + 8 + LE, c: duoi - k.tren };

  // Vạch đứng ngày cắt dữ liệu
  if (ngayCat !== null) {
    const x = Math.round(xPx(ngayCat)) + 0.5;
    ctx.save();
    ctx.strokeStyle = MAU_DUONG.phu;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(x, k.tren + 4);
    ctx.lineTo(x, duoi);
    ctx.stroke();
    ctx.restore();
  }

  for (const l of duong) {
    ctx.save();
    ctx.strokeStyle = l.mau;
    ctx.fillStyle = l.mau;
    ctx.lineWidth = 4;
    ctx.lineJoin = "round";
    ctx.setLineDash(l.ma === "du-bao" ? [10, 6] : []);
    if (l.diem.length > 1) {
      ctx.beginPath();
      l.diem.forEach((p, i) => (i === 0 ? ctx.moveTo(xPx(p.x), yPx(p.pct)) : ctx.lineTo(xPx(p.x), yPx(p.pct))));
      ctx.stroke();
    }
    // Chấm điểm cuối — chỗ chú giải nói tới («đạt 100% ngày …» / «x% tại …»)
    const cuoi = l.diem[l.diem.length - 1];
    ctx.beginPath();
    ctx.arc(xPx(cuoi.x), yPx(cuoi.pct), 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Nhãn ngày cắt ở đỉnh vạch
  phong(ctx, CO_CHU, true);
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  if (ngayCat !== null) {
    const chu = `Ngày cắt ${chuNgay(ngayCat)}`;
    const r = ctx.measureText(chu).width;
    const x = xPx(ngayCat);
    const o = chonCho(
      daDat,
      [
        { x: x + 6, y: k.tren + 2, r, c: 28 },
        { x: x - 6 - r, y: k.tren + 2, r, c: 28 },
      ],
      vung
    );
    if (o) chuCoVien(ctx, chu, o.x, o.y, CHU_PHU);
  }
}

// ---------- Kiểu 3: thanh ngang chồng đoạn (RQ-2 · TQ-3) ----------

function buocDep(toiDa: number, soVach: number): number {
  const tho = toiDa / Math.max(1, soVach);
  const mu = 10 ** Math.floor(Math.log10(tho));
  const n = tho / mu;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mu;
}

function veThanhNgang(ctx: SKRSContext2D, d: AnhThanhNgang): void {
  const tieuDe = chuoi(d.tieuDe);
  const donVi = chuoi(d.donVi);
  const thanh = (Array.isArray(d.thanh) ? d.thanh : [])
    .filter((t) => t && typeof t === "object")
    .map((t) => {
      const doan = (Array.isArray(t.doan) ? t.doan : [])
        .filter((x) => x && typeof x.giaTri === "number" && Number.isFinite(x.giaTri))
        .map((x) => ({ nhan: chuoi(x.nhan), giaTri: Math.max(0, x.giaTri), mau: mau(x.mau) }));
      return { nhan: chuoi(t.nhan), doan, tong: doan.reduce((s, x) => s + x.giaTri, 0) };
    });
  if (thanh.length === 0) return veChuaCoSoLieu(ctx, tieuDe);

  const daCo = new Set<string>();
  const chuGiai: MucChuGiai[] = [];
  for (const t of thanh)
    for (const x of t.doan) {
      const khoa = `${x.nhan}|${x.mau}`;
      if (daCo.has(khoa)) continue;
      daCo.add(khoa);
      chuGiai.push({ nhan: x.nhan || "Không tên", mau: x.mau, kieu: "o" });
    }
  const k = veKhung(ctx, tieuDe, chuGiai, d.chuThich);

  const trenVung = k.tren + 4;
  const duoiVung = k.duoi - 34;
  // Quá nhiều thanh thì giữ cho mỗi thanh ≥ 26 điểm ảnh, phần thừa ghi một dòng
  const toiDaThanh = Math.max(1, Math.floor((duoiVung - trenVung) / 46));
  const conLai = thanh.length > toiDaThanh ? thanh.length - (toiDaThanh - 1) : 0;
  const ve = conLai > 0 ? thanh.slice(0, toiDaThanh - 1) : thanh;
  const soDong = ve.length + (conLai > 0 ? 1 : 0);

  // Khối thanh gọn theo số thanh, đặt giữa vùng trống — ít thanh thì trục không nằm tít dưới đáy
  const caoDong = Math.min(72, (duoiVung - trenVung) / soDong);
  const tren = trenVung + Math.max(0, (duoiVung - trenVung - caoDong * soDong) / 2);
  const duoi = tren + caoDong * soDong;
  const caoThanh = Math.max(14, Math.min(40, caoDong * 0.62));
  const coChu = CO_CHU;

  phong(ctx, coChu);
  const rongNhan = Math.min(CO_ANH.rong * 0.44, Math.max(...ve.map((t) => ctx.measureText(t.nhan).width), 40));
  const tongLon = Math.max(...ve.map((t) => t.tong), 0);
  const buoc = buocDep(tongLon > 0 ? tongLon : 1, 5);
  const truMax = Math.max(buoc, Math.ceil((tongLon > 0 ? tongLon : 1) / buoc) * buoc);
  phong(ctx, coChu, true);
  const rongGiaTri = ctx.measureText(`${fmtSo(truMax)} ${donVi}`).width + 14;

  const trai = LE + rongNhan + 14;
  const phai = CO_ANH.rong - LE - rongGiaTri;
  const xPx = (v: number) => trai + (v / truMax) * (phai - trai);

  // Lưới dọc + nhãn trục giá trị
  phong(ctx, CO_CHU);
  ctx.textBaseline = "top";
  ctx.textAlign = "center";
  for (let v = 0; v <= truMax + 1e-9; v += buoc) {
    const x = Math.round(xPx(v)) + 0.5;
    ctx.strokeStyle = v === 0 ? TRUC : LUOI;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, tren);
    ctx.lineTo(x, duoi);
    ctx.stroke();
    ctx.fillStyle = CHU_PHU;
    ctx.fillText(fmtSo(v), x, duoi + 8);
  }
  if (donVi) {
    const xDonVi = xPx(truMax) + ctx.measureText(fmtSo(truMax)).width / 2 + 8;
    ctx.textAlign = "left";
    ctx.fillText(rutGon(ctx, donVi, CO_ANH.rong - 6 - xDonVi), xDonVi, duoi + 8);
  }

  ve.forEach((t, i) => {
    const giua = tren + caoDong * i + caoDong / 2;
    // Nhãn thanh bên trái, rút gọn «…»
    ctx.fillStyle = CHU;
    veNhanThanh(ctx, t.nhan, trai - 12, giua, rongNhan);

    let x = trai;
    const coNhieuDoan = t.doan.filter((x0) => x0.giaTri > 0).length >= 2;
    for (const doan of t.doan) {
      if (doan.giaTri <= 0) continue;
      const r = xPx(doan.giaTri) - trai;
      ctx.fillStyle = doan.mau;
      ctx.fillRect(x, giua - caoThanh / 2, r, caoThanh);
      if (coNhieuDoan) {
        phong(ctx, 20, true);
        const chu = fmtSo(doan.giaTri);
        if (ctx.measureText(chu).width + 10 <= r && caoThanh >= 22) {
          ctx.fillStyle = NEN;
          ctx.textAlign = "center";
          ctx.fillText(chu, x + r / 2, giua);
        }
      }
      x += r;
      // vạch trắng mảnh ngăn hai đoạn
      ctx.fillStyle = NEN;
      ctx.fillRect(x - 0.5, giua - caoThanh / 2, 1, caoThanh);
    }
    // Giá trị cuối thanh — thanh 0 vẫn ghi «0 ngày»
    phong(ctx, coChu, true);
    ctx.fillStyle = CHU;
    ctx.textAlign = "left";
    ctx.fillText(`${fmtSo(t.tong)}${donVi ? " " + donVi : ""}`, x + 8, giua);
  });

  if (conLai > 0) {
    phong(ctx, coChu);
    ctx.fillStyle = CHU_PHU;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(`… và ${fmtSo(conLai)} mục khác không đủ chỗ vẽ`, trai, tren + caoDong * ve.length + caoDong / 2);
  }
}

// ---------- Kiểu 5: thanh hai chiều quanh vạch 0 (DA-4, 27/10) ----------

function veThanhHaiChieu(ctx: SKRSContext2D, d: AnhThanhHaiChieu): void {
  const tieuDe = chuoi(d.tieuDe);
  const donVi = chuoi(d.donVi);
  const thanh = (Array.isArray(d.thanh) ? d.thanh : [])
    .filter((t) => t && typeof t === "object" && typeof t.giaTri === "number" && Number.isFinite(t.giaTri))
    .map((t) => ({ nhan: chuoi(t.nhan), giaTri: t.giaTri }));
  if (thanh.length === 0) return veChuaCoSoLieu(ctx, tieuDe);

  const chuGiai: MucChuGiai[] = [
    { nhan: chuoi(d.nhanDuong) || "Chậm", mau: mau("du-bao"), kieu: "o" },
    { nhan: chuoi(d.nhanAm) || "Sớm", mau: mau("phu"), kieu: "o" },
  ];
  const k = veKhung(ctx, tieuDe, chuGiai, d.chuThich);

  const trenVung = k.tren + 4;
  const duoiVung = k.duoi - 34;
  const toiDaThanh = Math.max(1, Math.floor((duoiVung - trenVung) / 46));
  const conLai = thanh.length > toiDaThanh ? thanh.length - (toiDaThanh - 1) : 0;
  const ve = conLai > 0 ? thanh.slice(0, toiDaThanh - 1) : thanh;
  const soDong = ve.length + (conLai > 0 ? 1 : 0);
  const caoDong = Math.min(72, (duoiVung - trenVung) / soDong);
  const tren = trenVung + Math.max(0, (duoiVung - trenVung - caoDong * soDong) / 2);
  const duoi = tren + caoDong * soDong;
  const caoThanh = Math.max(14, Math.min(40, caoDong * 0.62));

  phong(ctx, CO_CHU);
  const rongNhan = Math.min(CO_ANH.rong * 0.4, Math.max(...ve.map((t) => ctx.measureText(t.nhan).width), 40));
  const lonDuong = Math.max(...ve.map((t) => t.giaTri), 0);
  const lonAm = Math.max(...ve.map((t) => -t.giaTri), 0);
  const buoc = buocDep(Math.max(lonDuong + lonAm, 1), 5);
  const truMax = lonDuong > 0 ? Math.ceil(lonDuong / buoc) * buoc : 0;
  const truMin = lonAm > 0 ? Math.ceil(lonAm / buoc) * buoc : 0;
  const tongTru = Math.max(truMax + truMin, buoc);
  phong(ctx, CO_CHU, true);
  const rongGiaTri = ctx.measureText(`▲ ${fmtSo(truMax || buoc)} ${donVi}`).width + 14;

  const trai = LE + rongNhan + 14;
  const phai = CO_ANH.rong - LE - rongGiaTri;
  const xPx = (v: number) => trai + ((v + truMin) / tongTru) * (phai - trai);
  const x0 = xPx(0);

  phong(ctx, CO_CHU);
  ctx.textBaseline = "top";
  ctx.textAlign = "center";
  for (let v = -truMin; v <= truMax + 1e-9; v += buoc) {
    const x = Math.round(xPx(v)) + 0.5;
    ctx.strokeStyle = Math.abs(v) < 1e-9 ? TRUC : LUOI;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, tren);
    ctx.lineTo(x, duoi);
    ctx.stroke();
    ctx.fillStyle = CHU_PHU;
    ctx.fillText(v < -1e-9 ? `−${fmtSo(-v)}` : fmtSo(v), x, duoi + 8);
  }

  ve.forEach((t, i) => {
    const giua = tren + caoDong * i + caoDong / 2;
    ctx.fillStyle = CHU;
    veNhanThanh(ctx, t.nhan, trai - 12, giua, rongNhan);

    const x1 = xPx(t.giaTri);
    ctx.fillStyle = t.giaTri < 0 ? mau("phu") : mau("du-bao");
    if (t.giaTri !== 0) ctx.fillRect(Math.min(x0, x1), giua - caoThanh / 2, Math.abs(x1 - x0), caoThanh);
    phong(ctx, CO_CHU, true);
    ctx.fillStyle = CHU;
    ctx.textBaseline = "middle";
    const chu = `${t.giaTri > 0 ? "▲ " : t.giaTri < 0 ? "▼ " : ""}${fmtSo(Math.abs(t.giaTri))}${donVi ? " " + donVi : ""}`;
    // Thanh sớm kéo sang trái — chữ giá trị đặt bên PHẢI vạch 0 để không đè nhãn thanh ở bên trái
    ctx.textAlign = "left";
    ctx.fillText(chu, (t.giaTri < 0 ? x0 : x1) + 8, giua);
  });

  if (conLai > 0) {
    phong(ctx, CO_CHU);
    ctx.fillStyle = CHU_PHU;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(`… và ${fmtSo(conLai)} mục khác không đủ chỗ vẽ`, trai, tren + caoDong * ve.length + caoDong / 2);
  }
}

// ---------- Kiểu 4: nhiều đường bậc thang, trục đứng là SỐ NGÀY đổi (TQ-2 bản 27/10) ----------

function veDuongSo(ctx: SKRSContext2D, d: AnhDuongSo): void {
  const tieuDe = chuoi(d.tieuDe);
  const donVi = chuoi(d.donVi);
  const duong = (Array.isArray(d.duong) ? d.duong : [])
    .map((l) => ({
      nhan: chuoi(l?.nhan),
      mau: mau(l?.mau),
      diem: (Array.isArray(l?.diem) ? l.diem : [])
        .map((p) => ({ x: msTuIso(p?.ngay), y: typeof p?.giaTri === "number" && Number.isFinite(p.giaTri) ? p.giaTri : null }))
        .filter((p): p is { x: number; y: number } => p.x !== null && p.y !== null)
        .sort((a, b) => a.x - b.x),
    }))
    .filter((l) => l.diem.length > 0);
  if (duong.length === 0) return veChuaCoSoLieu(ctx, tieuDe);

  const chuGiai: MucChuGiai[] = (Array.isArray(d.chuGiai) ? d.chuGiai : []).map((c) => ({ nhan: chuoi(c?.nhan), mau: mau(c?.mau), kieu: "duong" as const }));
  const k = veKhung(ctx, tieuDe, chuGiai, d.chuThich);

  const tatCa = duong.flatMap((l) => l.diem);
  let xMin = Math.min(...tatCa.map((p) => p.x));
  let xMax = Math.max(...tatCa.map((p) => p.x));
  const leX = Math.max(NGAY_MS / 2, (xMax - xMin) * 0.03);
  xMin -= leX;
  xMax += leX;
  // Trục đứng luôn gồm 0; bước «đẹp»
  const yThap = Math.min(0, ...tatCa.map((p) => p.y));
  const yCao = Math.max(0, ...tatCa.map((p) => p.y));
  const buoc = buocDep(Math.max(yCao - yThap, 1), 5);
  const yMin = Math.floor(yThap / buoc) * buoc;
  const yMax = Math.max(Math.ceil(yCao / buoc) * buoc, yMin + buoc);

  phong(ctx, CO_CHU, true);
  // Chỗ cho nhãn cuối đường («Hướng Việt +22»)
  const nhanCuoi = duong.map((l) => {
    const v = l.diem[l.diem.length - 1].y;
    return `${l.nhan} ${v > 0 ? "+" : ""}${fmtSo(v)}`;
  });
  // Nhãn cuối đường nằm trọn một dòng (tên dự án do bên gọi rút ngắn) — chừa tới 46 % bề ngang, không cắt «…»
  const rongNhanCuoi = Math.min(CO_ANH.rong * 0.46, Math.max(...nhanCuoi.map((c) => ctx.measureText(c).width)));
  phong(ctx, CO_CHU);
  const rongTrucDung = Math.max(ctx.measureText(fmtSo(yMax)).width, ctx.measureText(fmtSo(yMin)).width);
  const trai = LE + rongTrucDung + 12;
  const phai = CO_ANH.rong - LE - rongNhanCuoi - 12;
  // Chừa một dòng trên vùng vẽ cho đơn vị trục đứng (không đè số trên cùng, không đè chú giải)
  const tren = k.tren + (donVi ? 40 : 14);
  const duoi = k.duoi - 36;
  const xPx = (t: number) => trai + ((t - xMin) / (xMax - xMin)) * (phai - trai);
  const yPx = (v: number) => duoi - ((v - yMin) / (yMax - yMin)) * (duoi - tren);

  // Lưới + nhãn trục đứng; vạch 0 đậm hơn. Vạch đáy âm không ghi số (đè nhãn ngày của trục ngang)
  ctx.textBaseline = "middle";
  ctx.textAlign = "right";
  for (let v = yMin; v <= yMax + 1e-9; v += buoc) {
    if (v === yMin && v < 0) {
      ctx.strokeStyle = LUOI;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(trai, Math.round(yPx(v)) + 0.5);
      ctx.lineTo(phai, Math.round(yPx(v)) + 0.5);
      ctx.stroke();
      continue;
    }
    const y = Math.round(yPx(v)) + 0.5;
    ctx.strokeStyle = v === 0 ? TRUC : LUOI;
    ctx.lineWidth = v === 0 ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(trai, y);
    ctx.lineTo(phai, y);
    ctx.stroke();
    ctx.fillStyle = CHU_PHU;
    ctx.fillText(fmtSo(v), trai - 8, y);
  }
  if (donVi) {
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillText(donVi, LE, tren - 16);
  }
  veTrucNgang(ctx, trai, phai, duoi, xMin, xMax, xPx);

  // Đường xám vẽ trước, cam vẽ sau (nằm trên)
  const thuTu = duong.map((l, i) => ({ l, i })).sort((a, b) => (a.l.mau === mau("phu") ? 0 : 1) - (b.l.mau === mau("phu") ? 0 : 1));
  for (const { l } of thuTu) {
    ctx.save();
    ctx.strokeStyle = l.mau;
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.beginPath();
    l.diem.forEach((p, i) => {
      if (i === 0) ctx.moveTo(xPx(p.x), yPx(p.y));
      else {
        ctx.lineTo(xPx(p.x), yPx(l.diem[i - 1].y));
        ctx.lineTo(xPx(p.x), yPx(p.y));
      }
    });
    ctx.stroke();
    const cuoi = l.diem[l.diem.length - 1];
    ctx.fillStyle = l.mau;
    ctx.beginPath();
    ctx.arc(xPx(cuoi.x), yPx(cuoi.y), 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Nhãn cuối đường: tên + số, chữ màu mực (không mang màu đường), dãn để không đè nhau
  phong(ctx, CO_CHU, true);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const nhan = duong
    .map((l, i) => ({ chu: nhanCuoi[i], y: yPx(l.diem[l.diem.length - 1].y), mau: l.mau }))
    .sort((a, b) => a.y - b.y);
  const caoNhan = 28;
  for (let i = 1; i < nhan.length; i++) if (nhan[i].y - nhan[i - 1].y < caoNhan) nhan[i].y = nhan[i - 1].y + caoNhan;
  const tran = duoi - caoNhan / 2;
  if (nhan.length > 0 && nhan[nhan.length - 1].y > tran) {
    const day = nhan[nhan.length - 1].y - tran;
    for (const n of nhan) n.y -= day;
  }
  for (const n of nhan) {
    ctx.fillStyle = n.mau;
    ctx.fillRect(phai + 6, n.y - 2, 10, 4);
    ctx.fillStyle = CHU;
    ctx.fillText(rutGon(ctx, n.chu, rongNhanCuoi), phai + 20, n.y);
  }
}

// ---------- Cửa vào ----------

function chuoi(s: unknown): string {
  return typeof s === "string" ? s.replace(/\s+/g, " ").trim() : "";
}

function dungAnh(ve: (ctx: SKRSContext2D) => void): Buffer {
  phongVeAnh();
  const canvas = createCanvas(CO_ANH.rong, CO_ANH.cao);
  const ctx = canvas.getContext("2d");
  ve(ctx);
  return canvas.toBuffer("image/png");
}

/**
 * Vẽ một đặc tả thành ảnh PNG cỡ `CO_ANH` (720×480). KHÔNG BAO GIỜ NÉM LỖI.
 * Kiểu lạ / đặc tả rỗng / hỏng → ảnh có câu «Chưa có số liệu để vẽ».
 */
export function veAnh(d: DacTaAnh): Buffer {
  const tieuDe = d && typeof d === "object" ? chuoi((d as { tieuDe?: unknown }).tieuDe) : "";
  try {
    return dungAnh((ctx) => {
      if (!d || typeof d !== "object") return veChuaCoSoLieu(ctx, tieuDe);
      switch (d.kieu) {
        case "duong-ngay":
          return veDuongNgay(ctx, d);
        case "s-curve":
          return veSCurve(ctx, d);
        case "thanh-ngang":
          return veThanhNgang(ctx, d);
        case "duong-so":
          return veDuongSo(ctx, d);
        case "thanh-hai-chieu":
          return veThanhHaiChieu(ctx, d);
        default:
          return veChuaCoSoLieu(ctx, tieuDe);
      }
    });
  } catch (e) {
    console.warn(
      "[ve-anh] Vẽ ảnh biểu đồ hỏng, thay bằng ảnh «Chưa có số liệu để vẽ»:",
      e instanceof Error ? e.message : String(e)
    );
  }
  try {
    return dungAnh((ctx) => veChuaCoSoLieu(ctx, tieuDe));
  } catch {
    return Buffer.alloc(0);
  }
}
