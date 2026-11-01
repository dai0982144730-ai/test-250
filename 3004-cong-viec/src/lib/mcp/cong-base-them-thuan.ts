// ============================================================
// CỔNG /api/mcp/base — phần THUẦN của 6 công cụ đọc «Đợt 3a Main» (KE-HOACH/31, 27/10/2026)
//   base.bao_cao_da_nop · base.kien_nghi_can_quyet · base.bao_cao_tuan · base.lich_phong · base.viec_da_xong · base.thong_bao_cua_toi
// Đọc tham số tuần / đơn vị / phòng họp · tính khoảng trống phòng · chữ giờ Việt Nam. Không node:fs, không mạng (luật 10).
// ============================================================
import { thatBai, type KhuonTra } from "@/lib/mcp/khuon";
import { congNgay, khoangNgay, ngayVN, tuanCua, type TuanBaoCao } from "@/lib/phong/tuan";
import { BUOI, PHONG_HOP, gio, khoangGio, phut, tenThu, thuCua, type PhongHop } from "@/lib/phong-hop/thuan";
import { chuoi, gonMa } from "@/lib/mcp/cong-base-thuan";

type Loi = { ok: false; loi: KhuonTra };
const sai = (cau: string): Loi => ({ ok: false, loi: thatBai("KHONG_HIEU_YEU_CAU", cau) });

// ─────────────────────────────────────────────────────────────
// Tuần báo cáo (thứ Hai → Chủ nhật, số tuần ISO — cùng tuanCua của màn Sơ đồ / Báo cáo tuần)
// ─────────────────────────────────────────────────────────────

/** Thứ Hai của tuần ISO số `so` năm `nam`; null khi năm đó không có tuần số này */
export function thuHaiCuaTuan(so: number, nam: number): string | null {
  if (!Number.isInteger(so) || so < 1 || so > 53) return null;
  const tu = congNgay(tuanCua(`${nam}-01-04`).tu, (so - 1) * 7);
  const t = tuanCua(tu);
  return t.so === so && t.nam === nam ? tu : null;
}

/**
 * Tuần được hỏi: `tuan` (số tuần, vd 43 — năm theo `nam`, mặc định năm của hôm nay) hoặc `ngay` (yyyy-mm-dd, tuần chứa ngày đó);
 * không gửi gì = tuần chứa hôm nay (giờ VN). `coChi` = bên hỏi có chỉ rõ tuần không (để biết có được lùi tuần trước hay không).
 */
export function docTuanHoi(ts: Record<string, unknown>, homNay: string): { ok: true; tuan: TuanBaoCao; coChi: boolean } | Loi {
  const ngay = chuoi(ts.ngay);
  const soTho = chuoi(ts.tuan).replace(/^tuần\s*/i, "").replace(/^\d{4}-W/i, "");
  if (ngay !== "") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ngay) || Number.isNaN(Date.parse(`${ngay}T00:00:00Z`))) return sai(`\`ngay\` = "${ngay}" không phải ngày dạng yyyy-mm-dd (ví dụ 2026-10-26).`);
    return { ok: true, tuan: tuanCua(ngay), coChi: true };
  }
  if (soTho !== "") {
    const so = Number(soTho);
    const nam = chuoi(ts.nam) !== "" ? Number(chuoi(ts.nam)) : Number(homNay.slice(0, 4));
    const tu = Number.isInteger(nam) ? thuHaiCuaTuan(so, nam) : null;
    if (!tu) return sai(`Không hiểu tuần "${chuoi(ts.tuan)}" năm ${chuoi(ts.nam) || homNay.slice(0, 4)} — gửi số tuần 1–53 (ví dụ tuan 43) hoặc ngay dạng yyyy-mm-dd.`);
    return { ok: true, tuan: tuanCua(tu), coChi: true };
  }
  return { ok: true, tuan: tuanCua(homNay), coChi: false };
}

/** «Tuần 44 · 7 ngày · 26/10/2026 – 01/11/2026» (luật 31) */
export const nhanTuan = (t: TuanBaoCao): string => `Tuần ${t.so} · ${khoangNgay(t.tu, t.den)}`;

/** "2026-10-27T09:05" (giờ VN) → "09:05 Thứ Ba 27/10/2026" */
export function chuGioVn(s: string | null | undefined): string {
  if (!s) return "";
  const ngay = s.slice(0, 10);
  const g = s.length >= 16 ? s.slice(11, 16) : "";
  return `${g ? `${g} ` : ""}${tenThu(thuCua(ngay))} ${ngayVN(ngay)}`;
}

/** Số phút giữa hai mốc "yyyy-mm-ddTHH:MM" (b − a) */
export function phutGiua(a: string, b: string): number {
  return Math.round((Date.parse(`${b}:00Z`) - Date.parse(`${a}:00Z`)) / 60_000);
}

/** 1590 phút → «1 ngày 2 giờ 30 phút» */
export function chuThoiLuong(p: number): string {
  const n = Math.floor(p / 1440);
  const h = Math.floor((p % 1440) / 60);
  const m = p % 60;
  const phan = [n ? `${n} ngày` : "", h ? `${h} giờ` : "", m ? `${m} phút` : ""].filter(Boolean);
  return phan.length ? phan.join(" ") : "0 phút";
}

// ─────────────────────────────────────────────────────────────
// Đơn vị theo tên — "phòng Kế hoạch", "P.KT&VH", "BQLDA Quảng Trị", mã đơn vị
// ─────────────────────────────────────────────────────────────

export interface DonViTra {
  id: string;
  ten: string;
  ten_ngan: string;
  loai: string;
}

/** Bỏ tiền tố «phòng / ban / đơn vị» người hỏi hay thêm vào */
export const boTienToDonVi = (s: string): string => s.replace(/^\s*(phòng|phong|ban|đơn vị|don vi|p\.)\s+/i, "").trim();

export function traDonVi(tho: string, ds: readonly DonViTra[]): { ok: true; dv: DonViTra } | Loi | { ok: false; loi: KhuonTra } {
  const ma = tho.trim();
  if (ma === "") return sai("Thiếu tên đơn vị.");
  const dung = ds.find((d) => d.id.toLowerCase() === ma.toLowerCase());
  if (dung) return { ok: true, dv: dung };
  const g = gonMa(ma);
  const gBo = gonMa(boTienToDonVi(ma));
  const ten = (d: DonViTra) => [gonMa(d.ten), gonMa(d.ten_ngan), gonMa(boTienToDonVi(d.ten))];
  const bang = ds.filter((d) => ten(d).some((t) => t === g || t === gBo));
  if (bang.length === 1) return { ok: true, dv: bang[0]! };
  const khop = bang.length > 1 ? bang : gBo.length >= 3 ? ds.filter((d) => ten(d).some((t) => t.includes(gBo))) : [];
  // Nhiều đơn vị trùng chữ: ưu tiên phòng khi người hỏi nói «phòng …»
  const phong = /^\s*(phòng|phong)\b/i.test(ma) ? khop.filter((d) => d.loai === "phong") : khop;
  const chon = phong.length ? phong : khop;
  if (chon.length === 1) return { ok: true, dv: chon[0]! };
  if (chon.length > 1) {
    return sai(`"${ma}" khớp ${chon.length} đơn vị (${chon.slice(0, 8).map((d) => d.ten).join(" · ")}) — ghi rõ tên đơn vị.`);
  }
  // 27/10 (Main đợt 3, CV-18): kèm danh sách đơn vị CÓ THẬT để người hỏi chọn ngay, AI khỏi đoán tên («Phòng Kế hoạch–Kỹ thuật» không có)
  const phongCoThat = ds.filter((d) => d.loai === "phong").map((d) => d.ten);
  const khac = ds.filter((d) => d.loai !== "phong").map((d) => d.ten);
  const kem = ds.length === 0 ? "" : ` Các phòng hiện có: ${phongCoThat.join(" · ") || "(không có)"}.${khac.length ? ` Đơn vị khác: ${khac.slice(0, 40).join(" · ")}.` : ""}`;
  return { ok: false, loi: thatBai("KHONG_CO_DU_LIEU", `Không có đơn vị nào tên "${ma}" trong sơ đồ tổ chức của agent Công việc.${kem}`) };
}

// ─────────────────────────────────────────────────────────────
// Phòng họp — "01", "1", "P.01", "Phòng họp 01", "p01"
// ─────────────────────────────────────────────────────────────

export function traPhongHop(tho: string): PhongHop | null {
  const s = tho.trim().toLowerCase();
  if (s === "") return null;
  const so = /(\d{1,2})\s*$/.exec(s)?.[1];
  if (so) return PHONG_HOP.find((p) => p.id === `p${so.padStart(2, "0")}`) ?? null;
  return PHONG_HOP.find((p) => p.id === s || gonMa(p.ten) === gonMa(s)) ?? null;
}

export const DS_PHONG_HOP = PHONG_HOP.map((p) => `${p.ten} (${p.so_ghe} ghế)`).join(" · ");

/** Buổi được hỏi: sang | chieu | (trống = cả ngày) */
export function docBuoi(v: unknown): { ok: true; buoi: number[] } | Loi {
  const s = gonMa(chuoi(v));
  if (s === "" || s === "cangay") return { ok: true, buoi: BUOI.map((_, i) => i) };
  if (s === "sang") return { ok: true, buoi: [0] };
  if (s === "chieu") return { ok: true, buoi: [1] };
  return sai(`\`buoi\` = "${chuoi(v)}" không hiểu — gửi sang, chieu hoặc bỏ trống (cả ngày).`);
}

export const tenBuoi = (i: number): string => (i === 0 ? "Buổi sáng" : "Buổi chiều");

/**
 * Khoảng TRỐNG của một phòng trong một buổi của một ngày: giờ làm việc của buổi trừ các cuộc họp đã đặt; hôm nay thì bỏ phần
 * đã qua (tính tới mốc 30 phút đang chạy — như ô «Bắt đầu» của màn đặt phòng). Ngày đã qua → không còn khoảng trống.
 */
export function khoangTrong(
  cuoc: readonly { tu: string; den: string }[],
  ngay: string,
  buoi: number,
  bay: { ngay: string; phut: number },
): { tu: string; den: string }[] {
  const [a, b] = BUOI[buoi]!;
  let dau = phut(a);
  const cuoi = phut(b);
  if (ngay < bay.ngay) return [];
  if (ngay === bay.ngay) dau = Math.max(dau, Math.floor(bay.phut / 30) * 30);
  if (dau >= cuoi) return [];
  const ban = cuoc
    .map((c) => [Math.max(phut(c.tu), dau), Math.min(phut(c.den), cuoi)] as [number, number])
    .filter(([x, y]) => x < y)
    .sort((x, y) => x[0] - y[0]);
  const ra: { tu: string; den: string }[] = [];
  let mo = dau;
  for (const [x, y] of ban) {
    if (x > mo) ra.push({ tu: gio(mo), den: gio(x) });
    mo = Math.max(mo, y);
  }
  if (mo < cuoi) ra.push({ tu: gio(mo), den: gio(cuoi) });
  return ra;
}

/** Câu trống/bận một buổi: «Buổi chiều: trống cả buổi (3 giờ 30 phút · 13:30 – 17:00)» */
export function cauBuoi(buoi: number, trong: { tu: string; den: string }[], soCuoc: number, daQua: boolean): string {
  const [a, b] = BUOI[buoi]!;
  if (daQua) return `${tenBuoi(buoi)}: đã qua`;
  if (trong.length === 0) return `${tenBuoi(buoi)}: kín lịch, không còn giờ trống`;
  if (soCuoc === 0 && trong.length === 1 && trong[0]!.tu === a && trong[0]!.den === b) return `${tenBuoi(buoi)}: trống cả buổi (${khoangGio(a, b)})`;
  return `${tenBuoi(buoi)}: còn trống ${trong.map((k) => khoangGio(k.tu, k.den)).join("; ")}`;
}

// ─────────────────────────────────────────────────────────────
// Chữ AI viết trong báo cáo tuần — bỏ cú pháp liên kết của màn: [[CV-…|chữ]] · [[dv:…|chữ]] · [[ds:…|chữ]] → chữ
// ─────────────────────────────────────────────────────────────

export function boLienKet(s: string): string {
  return String(s ?? "")
    .replace(/\[\[[^|\]]*\|([^\]]*)\]\]/g, "$1")
    .replace(/\[\[([^\]]*)\]\]/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/** Câu có nhắc dự án (mã hoặc tên, bỏ dấu) */
export function nhacDuAn(cau: string, duAn: { id: string; ten: string; ten_khac?: string[] }): boolean {
  const g = gonMa(cau);
  const ten = [duAn.ten, ...(duAn.ten_khac ?? [])].map(gonMa).filter((t) => t.length >= 4);
  if (ten.some((t) => g.includes(t))) return true;
  return new RegExp(`(^|[^\\p{L}\\p{N}])${duAn.id}([^\\p{L}\\p{N}]|$)`, "u").test(cau);
}
