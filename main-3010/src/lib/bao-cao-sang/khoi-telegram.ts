// ============================================================
// IN BÁO CÁO SÁNG THEO BỘ KHỐI CỦA MỘT NGƯỜI NHẬN  (file THUẦN — luật 10, màn hình import được)
// MD: KE-HOACH/23 (Mr. Đại chốt 17/10/2026) — mỗi khối mục «Telegram» · mục 6 phần cố định.
//
// Đầu vào: bản báo cáo sáng (dòng đầu dự án + vấn đề RQ-1 + việc đỏ DA-1) + số các khối (gom-khoi.ts) + bộ khối người nhận.
// Đầu ra: tiêu đề + từng khối (chữ + đặc tả ảnh) + phần cuối → Telegram (≤ soTinToiDa tin, ≤ 2 ảnh) hoặc web (đủ dòng).
//
// Luật áp ở đây: 30 (mã kèm tên) · 31 (khoảng ngày kèm số ngày) · 34 (hàng tổng đầu khối) · 35 + 36 (nhanh / chậm bằng ngày,
// ghi rõ so với hệ nào) · chốt 8 (tiền tỷ đồng) · agent mật 05/10 (dòng Hợp đồng / Pháp lý chỉ tới người được xem).
// Không tính số mới: mọi số in ra lấy nguyên từ agent chủ (khoi-du-lieu.ts), Main chỉ đếm dòng.
// ============================================================

import type { BaoCaoSang, DongThieu } from "./model";
import type { DauDuAn, VanDeSang, ViecKhac } from "./luat-cod";
import { dongDauDuAn, heLuiCodCua, tenNganAgent, maDuAnImLang, motVanDe, soAnhHuong, soSanhViecKhac, soSanhVanDe } from "./luat-cod";
import { apChuDe, dongChuaHoiDuoc, dongGoiTin, ngayDayDu, rut, tenNganVanDe, TRAN_MOT_TIN, xepDuAn, type ThamSoKichBan } from "./kich-ban";
import { fmtTy, KHOI_THEO_MA, soDongCua, type ChonKhoi, type MaKhoi } from "./khoi";
import { khoaKeoVe, type DuLieuKhoi, type DuLieuKhoiDuAn, type KetKhoi } from "./khoi-du-lieu";
import type { AnhDuongSo, AnhSCurve, AnhThanhNgang, DacTaAnh } from "./anh-kieu";
import type { BoLocMat } from "@/lib/agent-mat-loc";
import { cauChamHaiHe, cauChamHe, chuNgay, TEN_DANG_LAP, TEN_HE } from "@/lib/chung/luat-nhanh-cham";
import { ganTenChoMa, rutGonTen, taoTuDien } from "@/lib/chung/ma-kem-ten";
import { gioVn } from "@/lib/gio-vn";
import { daysBetween, fmtDate, fmtSo, khoangNgay } from "@/lib/format";
import { ai, cap2, cauKetLuan, chuGiai, dauChuThuan, duAn, manhHtml, phanChuThuan, sach, the, thieu, xepPhan, type Doan, type KhoiIn, type PhanIn } from "./khoi-in";
import { thoatHtml } from "./telegram-html";

export interface DauVaoBoKhoi {
  /** Bản đã lọc agent mật theo người nhận (locBaoCaoSang) */
  bc: BaoCaoSang;
  /** Số các khối của ngày (null = chưa gom — khối in «chưa có số») */
  khoi: DuLieuKhoi | null;
  boKhoi: readonly ChonKhoi[];
  thamSo: ThamSoKichBan;
  /** Dự án chọn tay của người này; null = xem trên web không gắn người → coi như chọn mọi dự án */
  duAnChon: readonly string[] | null;
  /** Bộ lọc agent mật của người nhận (khối tiền, pháp lý). Không truyền = thấy hết (PM · Admin) */
  loc?: BoLocMat;
  /** Web: in đủ dòng (bỏ trần Telegram) */
  dayDu?: boolean;
  tran?: number;
}

export interface KhoiDaDung {
  ma: MaKhoi;
  ten: string;
  /** Chữ của khối (đã có dòng tên khối ở đầu) */
  chu: string;
  /** Bản Telegram HTML (đậm, bảng <pre>) — chỉ khối dựng bằng KhoiIn; khối khác để trống, khi gửi dùng chu đã thoát */
  html?: string;
  /** Các mảnh HTML (dòng tên khối + từng phần) — bộ đóng gói tin chia khối dài ở ranh giới mảnh */
  manh?: string[];
  /** Cấu trúc để web dựng bảng thật */
  kin?: KhoiIn;
  anh: { dacTa: DacTaAnh; chuThich: string }[];
}

export interface BanBoKhoi {
  dau: string;
  khoi: KhoiDaDung[];
  cuoi: string;
}

const AN_MAT = "ẩn — tài liệu mật, chỉ thành viên dự án xem được";

/**
 * T10 — KHÔNG CẮT DANH SÁCH (Mr. Đại chốt 27/10/2026, KE-HOACH/31-DOT-2 N7: «Giữ nguyên danh sách dài. Không bảo mở Main hoặc
 * hỏi thêm mới thấy. Việc lớn quan trọng để đầu danh sách»). Telegram và web in đủ dòng; chỉ cắt khi CHÍNH người nhận đặt «N dòng».
 */
function soDongIn(k: ChonKhoi): number | null {
  return k.soDong ?? null;
}

const cat = <T,>(ds: readonly T[], n: number | null): T[] => (n === null ? ds.slice() : ds.slice(0, n));
/** Người nhận tự đặt «N dòng» mà danh sách dài hơn — nói rõ đã giấu bao nhiêu và vì sao, KHÔNG bảo «xem ở Main» */
const conLai = (tong: number, n: number | null, cau: string): PhanIn[] =>
  n !== null && tong > n ? [chuGiai(`còn ${fmtSo(tong - n)} ${cau} nhẹ hơn không in — bản này đặt tối đa ${fmtSo(n)} dòng (đổi ở ô số dòng của khối)`)] : [];
const pct = (x: number | null): string => (x === null ? "—" : `${fmtSo(x, 1)}%`);

/** «lùi 7 ngày» · «sớm 3 ngày» · «đứng yên» — đổi của COD dự báo giữa hai ngày ghi sổ */
function chuDoiCod(n: number): string {
  return n > 0 ? `lùi ${fmtSo(n)} ngày` : n < 0 ? `sớm ${fmtSo(-n)} ngày` : "đứng yên";
}

/** Tên hệ của ngày xong theo tình trạng Baseline dự án (luật 36) */
function heCua(d: DauDuAn): string {
  return heLuiCodCua(d) ?? TEN_DANG_LAP;
}

/** Dự án của một khối: phạm vi + bỏ dự án im lặng (chốt 13/10: chưa có tiến độ, không việc → không in) */
function duAnCuaKhoi(bc: BaoCaoSang, k: ChonKhoi, duAnChon: readonly string[] | null): DauDuAn[] {
  const tat = bc.duAn ?? [];
  const pv = k.phamVi === "du-an-chon" && duAnChon !== null ? tat.filter((d) => duAnChon.includes(d.maDuAn)) : tat;
  const coViec = (ma: string) => (bc.vanDe ?? []).some((v) => v.maDuAn === ma) || (bc.viecDoKhac ?? []).some((v) => v.maDuAn === ma);
  const im = maDuAnImLang(pv, coViec);
  return xepDuAn(pv.filter((d) => !im.has(d.maDuAn)));
}

/** Số khối của một dự án: chưa gom / lỗi → câu ngắn */
function soCua<T>(dl: DuLieuKhoi | null, ma: string, lay: (x: DuLieuKhoiDuAn) => KetKhoi<T> | undefined): { so: T } | { loi: string } {
  const x = dl?.theoDuAn[ma];
  const k = x ? lay(x) : undefined;
  // Màn web tự lấy số khối thiếu của hôm nay (KhoiNguoiNhan); bản Telegram luôn gom trước khi gửi nên không gặp câu này
  if (!k) return { loi: "chưa có số — bản hôm nay thì màn tự lấy trong vài giây; ngày đã qua không lấy lại được" };
  // Ô bị ẩn vì agent mật in nguyên câu «ẩn — …» (không phải «chưa có số» — người đọc không tưởng là lỗi)
  return k.ok ? { so: k.so } : { loi: /^ẩn — /.test(k.loi) ? k.loi : `chưa có số — ${rut(lamSachLoi(k.loi), 140)}` };
}

const tenDa = (d: DauDuAn): string => d.ten;
/** G7 (28/10): chữ lỗi của agent chủ viết cho máy → câu người đọc hiểu (không «tầng A», không mã dự án, không «cổng», không «lượt») */
export function lamSachLoi(s: string): string {
  return s
    .replace(/Kho không có hợp đồng tầng A nào của dự án \S+/i, "Chưa có hợp đồng nào của dự án này trong kho hồ sơ")
    .replace(/\btầng [ABC]\b/gi, "")
    .replace(/\bcổng\b/gi, "hệ thống")
    .replace(/\s{2,}/g, " ")
    .trim();
}
/** Tên dự án đặt trong ngoặc của câu khác: bỏ phần ngoặc của chính tên («(HV — dữ liệu test)») cho khỏi lồng hai lớp */
const tenTrongNgoac = (d: DauDuAn): string => d.ten.replace(/\s*\([^)]*\)\s*$/, "");
/** Tên việc của agent Công việc hay mang tiền tố «[tên dự án]» — trong khối đã chia theo dự án thì bỏ */
export const boTienToDuAn = (s: string): string => s.replace(/^\[[^\]]*\]\s*/, "");

/** Luật 28/10 (Mr. Đại): KHÔNG ghi mã (mã công việc, mã hồ sơ, mã issue) — mã để máy đọc; người đọc cần nội dung */
export const boMa = (s: string): string =>
  s
    .replace(/\*\*/g, "")
    .replace(/(^|[\s(])\d+(?:\.\d+)+(?=\s+[A-ZĐÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴ][a-zàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ])/g, "$1")
    .replace(/(^|\s)(?=[A-Z0-9_-]*[A-Z])[A-Z0-9]{1,4}(?:[-_][A-Z0-9]{1,6}){1,6}(?=\s|$|[):.,;])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s\-–—·:]+/, "")
    .trim();
/** Tên việc / hồ sơ cho THẺ: bỏ mã, KHÔNG cắt cụt chữ — chỉ khi rất dài (> 130 ký tự) mới rút ở ranh chữ */
/**
 * Việc đã có KHỐI RIÊNG trong cùng bộ thì không in lại (rà soát 28/10, anh duyệt A): «COD vượt hạn theo chủ trương» đã nằm ở khối Bảng COD
 * (TQ-1); «<người> tồn N việc quá hạn» đã nằm ở khối Việc quá hạn theo người (RQ-6). Bộ không có khối kia thì vẫn in (khỏi mất tin).
 */
const LA_VUOT_HAN_CHU_TRUONG = /vượt hạn theo chủ trương/i;
const LA_TON_VIEC_QUA_HAN = /tồn \d+ việc quá hạn/i;
/**
 * Khối kia có thật sự in dòng này cho ĐÚNG dự án không (kiểm độc lập 27/10 BB-02): có trong bộ, phạm vi phủ dự án,
 * và số nguồn của nó có (TQ-1 cần hạn chủ trương, RQ-6 cần tải việc). Thiếu một điều kiện thì khối này vẫn in — khỏi mất tin.
 */
const coKhoi = (n: { d: DauVaoBoKhoi }, ma: MaKhoi, maDuAn: string): boolean => {
  const nguon = (o: DuLieuKhoiDuAn): KetKhoi<unknown> | undefined => (ma === "TQ-1" ? o.hanChuTruong : ma === "RQ-6" ? o.taiViec : undefined);
  const x = n.d.khoi?.theoDuAn[maDuAn];
  const k = x ? nguon(x) : undefined;
  if (!k || !k.ok) return false;
  return n.d.boKhoi.some((b) => b.ma === ma && duAnCuaKhoi(n.d.bc, b, n.d.duAnChon).some((d) => d.maDuAn === maDuAn));
};

const tenDai = (s: string): string => rut(boMa(s), 130);
/** Tên người / đơn vị gọn cho NHÃN ẢNH: «Phó Tổng Giám đốc · Nguyễn Chính Đại (chức danh)» → «Nguyễn Chính Đại (Phó TGĐ)» */
function tenNguoiAnh(ten: string): string {
  const goc = ten.replace(/\s*\(chức danh\)\s*$/i, "").trim();
  const viet = (c: string): string => c.replace(/Phó Tổng Giám đốc/gi, "Phó TGĐ").replace(/Tổng Giám đốc/gi, "TGĐ").replace(/Chủ tịch HĐQT/gi, "CT HĐQT").replace(/Phó Chủ tịch/gi, "Phó CT");
  const m = /^(.+?)\s*·\s*(.+)$/.exec(goc);
  return m ? `${m[2]!.trim()} (${viet(m[1]!.trim())})` : viet(goc);
}
const aiSach = (s: string): PhanIn => ai(boMa(s));
const tenKhongMa = (v: VanDeSang): string => (v.wbs && v.tenWbs ? tenDai(v.tenWbs) : boMa(tenNganVanDe(v)));

// ─────────────────────────────────────────────────────────────
// Từng khối
// ─────────────────────────────────────────────────────────────

interface NguCanh {
  d: DauVaoBoKhoi;
  vanDe: VanDeSang[];
  viecDo: ViecKhac[];
  dayDu: boolean;
}

/** TQ-1 Bảng COD các dự án — BẢNG ▲▼ · Dự án · COD · MT · BL; nặng nhất đứng đầu; luật 36: MT/BL kèm một dòng chú giải */
function tq1(n: NguCanh, k: ChonKhoi, ds: DauDuAn[]): KhoiIn {
  const co = ds.filter((x) => x.coTienDo);
  const coSo = co.filter((x) => x.chamNgay !== null);
  const nang = coSo.slice().sort((a, b) => (b.chamNgay ?? 0) - (a.chamNgay ?? 0))[0];
  const xau = co.filter((x) => (x.soHomQua ?? 0) > 0).length;
  const nIn = soDongIn(k);
  const dau = (v: number | null | undefined): string => (v === null || v === undefined || v === 0 ? "·" : v > 0 ? "▲" : "▼");
  const ngayLech = (v: number | null | undefined): string => (v === null || v === undefined ? "—" : v > 0 ? `+${fmtSo(v)}` : fmtSo(v));
  const xep = co.slice().sort((a, b) => (b.chamNgay ?? -99999) - (a.chamNgay ?? -99999));
  const phan: PhanIn[] = [];
  // T2 dòng kết luận
  if (nang) phan.push({ k: "chu", dong: ["Nặng nhất: ", { d: tenTrongNgoac(nang) }, ` — ${cauChamHe(nang.chamNgay, "muc-tieu")} · xấu đi so hôm qua: `, { d: String(xau) }, " dự án"] });
  else phan.push({ k: "chu", dong: [`Chưa dự án nào có số so với ${TEN_HE["muc-tieu"]} · xấu đi so hôm qua: ${xau} dự án`] });
  // G1+G3 (28/10): THẺ thay bảng ▲▼ MT BL — mỗi dự án MỘT thẻ gộp COD · chậm so với hệ nào · hạn chủ trương · vì sao chậm (nói đủ chữ, không viết tắt)
  const hct = new Map<string, string>();
  for (const x of xep) {
    const h = n.d.khoi?.theoDuAn[x.maDuAn]?.hanChuTruong;
    if (h?.ok && h.so.soNgayVuot !== null) hct.set(x.maDuAn, h.so.soNgayVuot > 0 ? `vượt ${fmtSo(h.so.soNgayVuot)} ngày ${h.so.soVoi ?? "so với hạn chủ trương"}` : "còn trong hạn chủ trương");
  }
  const vi = phanViSaoCham(n, ds);
  for (const x of cat(xep, nIn)) {
    const them = [hct.get(x.maDuAn), vi.cau.get(x.maDuAn)].filter(Boolean) as string[];
    phan.push(the(tenNgan(x, 30), [`COD dự báo ${fmtDate(x.codDuBao)} · ${cauChamHaiHe(x.chamNgay, x.chamBaselineNgay)}`, ...them].join("\n  "), x.soHomQua === null || x.soHomQua === undefined ? undefined : `So với hôm qua: ${x.soHomQua > 0 ? `xấu đi ${fmtSo(x.soHomQua)} ngày` : x.soHomQua < 0 ? `tốt lên ${fmtSo(-x.soHomQua)} ngày` : "không đổi"}`));
  }
  phan.push(...conLai(xep.length, nIn, "dự án"));
  phan.push(chuGiai("nặng nhất trên đầu · Tiến độ mục tiêu = ngày COD Chủ đầu tư đặt · Baseline = tiến độ đã duyệt ký với Tổng thầu"));
  phan.push(...vi.khac);
  for (const x of ds.filter((y) => !y.coTienDo && y.loi)) phan.push(thieu(tenNgan(x, 24), x.loi ?? ""));
  return { dauDong: [` — ${co.length} dự án có tiến độ`], phan };
}

/** TQ-2 Xu thế COD dự báo — mỗi dự án: tên + khoảng ngày (kèm số ngày), dòng «a → b, lùi N ngày so với dự báo ngày …»; ảnh đường bậc thang gửi kèm */
function tq2(n: NguCanh, ds: DauDuAn[], anh: KhoiDaDung["anh"]): KhoiIn {
  const phan: PhanIn[] = [];
  const duongSo: AnhDuongSo["duong"] = [];
  const hangCod: string[][] = [];
  let manhNhat = { ten: "", doi: 0, tu: "", den: "" };
  for (const x of ds.filter((y) => y.coTienDo)) {
    const s = soCua(n.d.khoi, x.maDuAn, (o) => o.xuThe);
    if ("loi" in s) {
      phan.push(thieu(tenNgan(x, 24), s.loi));
      continue;
    }
    const { diem } = s.so;
    if (diem.length === 0) {
      phan.push(thieu(tenNgan(x, 24), "sổ mốc COD chưa có điểm nào theo cách tính hiện nay"));
      continue;
    }
    const dau = diem[0]!;
    const cuoi = diem[diem.length - 1]!;
    const khoang = khoangNgay(dau.ngay, cuoi.ngay);
    const doi = daysBetween(dau.cod, cuoi.cod);
    hangCod.push([tenNgan(x, 11), fmtDate(cuoi.cod), doi > 0 ? `+${fmtSo(doi)}` : doi < 0 ? `−${fmtSo(-doi)}` : "0", fmtDate(dau.cod), khoang]);
    // Mỗi dự án một đường bậc thang bắt đầu từ 0: «COD dự báo đã đổi bao nhiêu ngày so với ngày đầu kỳ» (KE-HOACH/33 mục 3)
    duongSo.push({
      nhan: tenNgan(x, 16),
      mau: diem.some((q) => q.cod !== dau.cod) ? "du-bao" : "phu",
      diem: diem.map((q) => ({ ngay: q.ngay, giaTri: daysBetween(dau.cod, q.cod) })),
    });
    if (Math.abs(doi) >= Math.abs(manhNhat.doi)) manhNhat = { ten: tenNgan(x, 16), doi, tu: dau.ngay, den: cuoi.ngay };
  }
  // 27/10 (KE-HOACH/33 mục 4): BẢNG «Dự án · COD hôm nay · Đổi»; COD đầu kỳ + khoảng ngày kèm số ngày (luật 31) chỉ ở web
  if (hangCod.length > 0) {
    phan.unshift({
      k: "bang",
      bang: {
        cot: [
          { ten: "Dự án", rong: 11 },
          { ten: "COD nay", rong: 10 },
          { ten: "Đổi", rong: 4, phai: true },
          { ten: "COD đầu kỳ", rong: 10, chiWeb: true },
          { ten: "Khoảng ghi sổ", rong: 30, chiWeb: true },
        ],
        hang: hangCod,
      },
    });
    phan.push(chuGiai("Đổi = ngày, COD dự báo hôm nay − COD dự báo ngày đầu kỳ của chính dự án đó (+ lùi · − sớm)"));
  }
  // Luật C1: toàn đường phẳng thì KHÔNG vẽ — chữ đã nói đủ. Có ít nhất một dự án đổi thì vẽ MỘT ảnh cho cả công ty (C2)
  if (duongSo.some((q) => q.mau === "du-bao")) {
    const cau = manhNhat.doi > 0 ? `lùi ${fmtSo(manhNhat.doi)} ngày` : manhNhat.doi < 0 ? `sớm ${fmtSo(-manhNhat.doi)} ngày` : "đổi rồi quay về chỗ cũ";
    anh.push({
      dacTa: {
        kieu: "duong-so",
        tieuDe: `${manhNhat.ten}: COD dự báo ${cau} trong ${khoangNgay(manhNhat.tu, manhNhat.den)}`,
        donVi: "ngày",
        duong: duongSo,
        chuGiai: [
          { nhan: "COD đã đổi (lùi: dương · sớm: âm)", mau: "du-bao" },
          { nhan: "đứng yên", mau: "phu" },
        ],
        chuThich: "Mỗi đường bắt đầu từ 0 ở ngày đầu kỳ; độ cao = số ngày COD dự báo đã đổi so với dự báo ngày đầu kỳ của chính dự án đó.",
      },
      chuThich: "Xu thế COD dự báo — các dự án",
    });
  }
  return { phan };
}

/** Phần «Vì sao chậm» gộp vào TQ-1 (27/10, KE-HOACH/33 mục 4; trước là khối TQ-3) — BẢNG Chậm · Ký muộn · Làm chậm (ngày so với Tiến độ mục tiêu), một dòng mỗi dự án */
function phanViSaoCham(n: NguCanh, ds: DauDuAn[]): { cau: Map<string, string>; khac: PhanIn[] } {
  const cau = new Map<string, string>();
  const khac: PhanIn[] = [];
  for (const x of ds.filter((y) => y.coTienDo)) {
    const s = soCua(n.d.khoi, x.maDuAn, (o) => o.gang);
    if ("loi" in s) {
      khac.push(thieu(tenNgan(x, 24), s.loi));
      continue;
    }
    const t = s.so.tachSo;
    if (t && t.baselineSoMucTieu >= 0 && t.thucHien >= 0) {
      if (t.tong > 0) cau.set(x.maDuAn, `vì sao chậm ${fmtSo(t.tong)} ngày so với ${TEN_HE["muc-tieu"]}: ${fmtSo(t.baselineSoMucTieu)} ngày do ${TEN_HE.baseline} ký muộn hơn mục tiêu + ${fmtSo(t.thucHien)} ngày do thực hiện chậm hơn ${TEN_HE.baseline}`);
    }
  }
  return { cau, khac };
}

/** Tên dự án rút cho bảng Telegram: bỏ ngoặc cuối + tiền tố loại hình, cắt ≤ n ký tự có «…» (KE-HOACH/31 P5) */
function tenNgan(d: DauDuAn, n = 10): string {
  const t = boTienToDuAn(tenTrongNgoac(d))
    .replace(/^(Điện gió|Thủy điện|Thuỷ điện|Mỏ đá|Điện mặt trời)\s*[·\-–]?\s*/i, "")
    .trim();
  if (t.length <= n) return t;
  // Đuôi số ngắn («Nam Khian 1/2/3») giữ lại để các dự án cùng tên đầu không thành dòng giống hệt; đầu cắt ở ranh chữ khi được
  const m = /^(.*\S)\s+(\S{1,3})$/.exec(t);
  const duoi = m ? ` ${m[2]}` : "";
  const dau = m ? m[1]! : t;
  let phan = dau.slice(0, Math.max(n - 1 - duoi.length, 3));
  const cat = phan.lastIndexOf(" ");
  if (dau[phan.length] !== " " && cat >= 4) phan = phan.slice(0, cat);
  return `${phan.trimEnd()}…${duoi}`;
}

/** «192,0 tỷ» → «192,0»; null → «—». Đơn vị tỷ đồng ghi ở dòng đầu khối */
const soTy = (x: number | null): string => (x === null ? "—" : fmtTy(x).replace(/\s*tỷ$/, ""));

/** TQ-4 Tiền các dự án — BẢNG Ký · Làm · Đòi · Trả, hàng Cộng đứng đầu (luật 34); không tô màu (chưa có ngưỡng cho tiền) */
function tq4(n: NguCanh, k: ChonKhoi, ds: DauDuAn[], anh: KhoiDaDung["anh"]): KhoiIn {
  const loc = n.d.loc;
  const thay = (ma: string) => !loc || loc.thayHet || loc.thay("hopdong", ma);
  const an = ds.filter((x) => !thay(x.maDuAn));
  const dong = ds
    .filter((x) => thay(x.maDuAn))
    .map((x) => ({ x, s: soCua(n.d.khoi, x.maDuAn, (o) => o.tien) }))
    .filter((r) => !("loi" in r.s) || r.x.coTienDo);
  const coSo = dong.flatMap((r) => ("so" in r.s ? [{ x: r.x, t: r.s.so }] : []));
  // «chỉ cộng khi MỌI dự án đều có số» (gom.ts tienMotDuAn) — null = chưa cộng được
  const cong = (lay: (t: (typeof coSo)[number]["t"]) => number | null): number | null => {
    if (coSo.length === 0) return null;
    if (coSo.some((r) => lay(r.t) === null) || coSo.length < dong.length) return null;
    return coSo.reduce((s, r) => s + (lay(r.t) ?? 0), 0);
  };
  const tong = [cong((t) => t.giaTriHd), cong((t) => t.sanLuong), cong((t) => t.daLenPhieu), cong((t) => t.daThanhToan)];
  // Dự án KHÔNG có số tiền nào (cả 4 ô trống hoặc không đọc được) — để người đọc biết ai làm cột Cộng chưa cộng được
  const thieuTen = [...coSo.filter((r) => [r.t.giaTriHd, r.t.sanLuong, r.t.daLenPhieu, r.t.daThanhToan].every((v) => v === null)).map((r) => r.x.ten), ...dong.filter((r) => "loi" in r.s).map((r) => r.x.ten)];
  // Ngày chốt sản lượng: ghi cạnh số — «Đòi > Làm» là bình thường khi hai số chốt ngày khác nhau
  const ngayChot = Array.from(new Set(coSo.flatMap((r) => (r.t.sanLuongToi ? [r.t.sanLuongToi] : []))));
  const xep = coSo.slice().sort((a, b) => (b.t.giaTriHd ?? -1) - (a.t.giaTriHd ?? -1));
  const nIn = soDongIn(k);
  const hang = cat(xep, nIn).map((r) => [tenNgan(r.x), soTy(r.t.giaTriHd), soTy(r.t.sanLuong), soTy(r.t.daLenPhieu), soTy(r.t.daThanhToan)]);
  const phan: PhanIn[] = [
    { k: "chu", dong: ["Bốn cột tiền: Ký = giá trị hợp đồng · Làm = sản lượng đã làm lũy kế · Đòi = đã lên phiếu giá · Trả = đã thanh toán"] },
    {
      k: "bang",
      bang: {
        cot: [
          { ten: "Dự án", rong: 10 },
          { ten: "Ký", rong: 5, phai: true },
          { ten: "Làm", rong: 5, phai: true },
          { ten: "Đòi", rong: 5, phai: true },
          { ten: "Trả", rong: 5, phai: true },
        ],
        tong: tong.every((v) => v === null) ? undefined : ["Cộng", ...tong.map(soTy)],
        hang,
      },
    },
  ];
  phan.push(...conLai(xep.length, nIn, "dự án"));
  phan.push(chuGiai("dấu — = chưa có số · «Đòi» có thể lớn hơn «Làm» khi hai số chốt ngày khác nhau · hợp đồng lớn nhất trên đầu"));
  if (coSo.length === 0) phan.push({ k: "chu", dong: ["Chưa có số tiền nào — các dự án chưa có hợp đồng, hoặc chưa hỏi được agent Hợp đồng."] });
  else if (tong.some((t) => t === null)) {
    phan.push(chuGiai(`Chưa cộng được tổng: chỉ cộng khi mọi dự án đều có số${thieuTen.length > 0 ? ` — chưa có số nào: ${thieuTen.join(", ")}` : ""}.`));
  }
  // Ảnh (27/10, KE-HOACH/33 mục 4): bốn thanh Ký · Làm · Đòi · Trả mỗi dự án — chỉ vẽ khi có khoảng hở «làm rồi chưa đòi» / «đòi rồi chưa trả» (luật C1).
  // Cả bốn thanh cùng màu xám, phân biệt bằng nhãn (không có màu nào được định nghĩa cho tiền — luật 18)
  const ty = (v: number | null): number => (v === null ? 0 : v / 1e9);
  const hoAnh = cat(xep, nIn).filter((r) => [r.t.sanLuong, r.t.daLenPhieu, r.t.daThanhToan].filter((v) => v !== null).length >= 2);
  let hoMax: { ten: string; cau: string; v: number } | null = null;
  for (const r of hoAnh) {
    const t = r.t;
    if (t.sanLuong !== null && t.daLenPhieu !== null && t.sanLuong - t.daLenPhieu > (hoMax?.v ?? 0)) hoMax = { ten: tenTrongNgoac(r.x), cau: `đã làm ${soTy(t.sanLuong)} mà mới đòi ${soTy(t.daLenPhieu)}`, v: t.sanLuong - t.daLenPhieu };
    if (t.daLenPhieu !== null && t.daThanhToan !== null && t.daLenPhieu - t.daThanhToan > (hoMax?.v ?? 0)) hoMax = { ten: tenTrongNgoac(r.x), cau: `đã đòi ${soTy(t.daLenPhieu)} mà mới trả ${soTy(t.daThanhToan)}`, v: t.daLenPhieu - t.daThanhToan };
  }
  if (hoMax) {
    anh.push({
      dacTa: {
        kieu: "thanh-ngang",
        tieuDe: `${hoMax.ten}: ${hoMax.cau} tỷ — treo ${soTy(hoMax.v)} tỷ`,
        donVi: "tỷ đồng",
        thanh: hoAnh.flatMap((r) =>
          ([["Ký", r.t.giaTriHd], ["Làm", r.t.sanLuong], ["Đòi", r.t.daLenPhieu], ["Trả", r.t.daThanhToan]] as const)
            .filter(([, v]) => v !== null)
            .map(([nhan, v]) => ({ nhan: `${tenNgan(r.x, 12)} · ${nhan}`, doan: [{ nhan: "Số tiền (tỷ đồng)", giaTri: Math.round(ty(v) * 100) / 100, mau: "phu" as const }] })),
        ),
        chuThich: "Ký = giá trị hợp đồng · Làm = sản lượng lũy kế · Đòi = đã lên phiếu giá · Trả = đã thanh toán. Khoảng hở giữa các thanh là tiền làm rồi chưa đòi, đòi rồi chưa trả.",
      },
      chuThich: "Tiền các dự án — Ký · Làm · Đòi · Trả",
    });
  }
  if (an.length > 0) phan.push({ k: "chu", dong: [`${an.length} dự án ${AN_MAT}`] });
  for (const r of dong) if ("loi" in r.s) phan.push(thieu(tenNgan(r.x, 24), r.s.loi));
  const dauDong: Doan[] = [" (tỷ đồng)"];
  if (ngayChot.length === 1) dauDong.push(` — Làm: sản lượng tới ${fmtDate(ngayChot[0]!)}`);
  else if (ngayChot.length > 1) dauDong.push(" — Làm: mỗi dự án chốt ngày khác nhau");
  return { dauDong, phan };
}

/** DA-2 Việc găng đang trễ — dòng tổng «21/21 trễ, 40–50 ngày so với <hệ>» rồi BẢNG Trễ · Việc; dự án không trễ gộp một dòng (luật 32) */
function da2(n: NguCanh, k: ChonKhoi, ds: DauDuAn[]): KhoiIn {
  const nIn = soDongIn(k);
  const phan: PhanIn[] = [];
  const khongTre: string[] = [];
  for (const x of ds.filter((y) => y.coTienDo)) {
    const s = soCua(n.d.khoi, x.maDuAn, (o) => o.gang);
    if ("loi" in s) {
      phan.push(thieu(tenNgan(x, 24), s.loi));
      continue;
    }
    const tre = s.so.gangTre;
    if (tre.length === 0 && (s.so.soGangDangTre ?? 0) === 0) {
      khongTre.push(tenNgan(x, 14));
      continue;
    }
    const he = heCua(x);
    const ngay = tre.flatMap((v) => (v.soNgayTre === null ? [] : [v.soNgayTre]));
    const thap = ngay.length > 0 ? Math.min(...ngay) : null;
    const cao = ngay.length > 0 ? Math.max(...ngay) : null;
    const kg = thap === null || cao === null ? "" : thap === cao ? ` — ${fmtSo(cao)} ngày` : ` — từ ${fmtSo(thap)} đến ${fmtSo(cao)} ngày`;
    phan.push(duAn(tenNgan(x, 24), " · ", { d: `${s.so.soGangDangTre ?? "—"}/${s.so.soGangToiCod ?? "—"}` }, ` việc găng trễ${kg} so với ${he}`));
    // G6 (28/10): gom việc găng theo HẠNG MỤC cha — một thẻ hạng mục («7 việc trễ 59–65 ngày») rồi mỗi việc một dòng ngắn; không cắt việc nào
    const cha = s.so.hangMuc.filter((h) => h.wbs);
    const nhomCua = (w: string) => cha.filter((h) => w.startsWith(`${h.wbs}.`)).sort((a, b) => b.wbs.length - a.wbs.length)[0];
    const nhom = new Map<string, { ten: string | null; viec: typeof tre }>();
    for (const v of cat(tre, nIn)) {
      const c = nhomCua(v.wbs);
      const khoa = c?.wbs ?? `rieng:${v.wbs}`;
      const g = nhom.get(khoa) ?? { ten: c ? tenDai(c.ten) : null, viec: [] };
      g.viec.push(v);
      nhom.set(khoa, g);
    }
    const kyTre = (vs: typeof tre): string => {
      const ng = vs.flatMap((v) => (v.soNgayTre === null ? [] : [v.soNgayTre]));
      return ng.length === 0 ? "" : Math.min(...ng) === Math.max(...ng) ? `${fmtSo(Math.max(...ng))} ngày` : `${fmtSo(Math.min(...ng))}–${fmtSo(Math.max(...ng))} ngày`;
    };
    const xepNhom = Array.from(nhom.values()).sort((a, b) => Math.max(...b.viec.map((v) => v.soNgayTre ?? 0)) - Math.max(...a.viec.map((v) => v.soNgayTre ?? 0)));
    for (const g of xepNhom) {
      if (g.ten === null || g.viec.length === 1) {
        for (const v of g.viec) phan.push(the(`${g.ten ? `${g.ten} — ` : ""}${tenDai(v.ten)}`, `trễ ${v.soNgayTre === null ? "chưa rõ" : fmtSo(v.soNgayTre)} ngày so với ${he} (dự báo xong ${fmtDate(v.duBaoXong)}${v.heXong ? `, theo ${he} là ${fmtDate(v.heXong)}` : ""})`));
        continue;
      }
      phan.push(the(g.ten, `${g.viec.length} việc găng trễ ${kyTre(g.viec)} so với ${he}`));
      for (const v of g.viec) phan.push(cap2(`${tenDai(v.ten)} — trễ ${v.soNgayTre === null ? "chưa rõ" : fmtSo(v.soNgayTre)} ngày`));
    }
    phan.push(...conLai(tre.length, nIn, "việc"));
  }
  if (khongTre.length > 0) phan.push(sach(khongTre, "không có việc găng nào trễ"));
  if (phan.some((p) => p.k === "the")) phan.push(chuGiai("Trễ = số ngày dự báo xong muộn hơn ngày xong của hệ ghi ở dòng dự án · nhóm trễ nhiều nhất trên đầu"));
  return { phan };
}

/** NT-1 Nhà thầu mời nghiệm thu — mỗi dự án × ngày: dòng đầu, rồi một dòng mỗi lượt (giờ · nhà thầu · biên bản); ngày/dự án không có lượt gộp một dòng */
function nt1(n: NguCanh, k: ChonKhoi, ds: DauDuAn[]): KhoiIn {
  const phan: PhanIn[] = [];
  const toiDa = soDongIn(k);
  const trong = new Map<string, string[]>();
  for (const x of ds) {
    const s = soCua(n.d.khoi, x.maDuAn, (o) => o.lichNt);
    if ("loi" in s) {
      phan.push(thieu(tenNgan(x, 24), s.loi));
      continue;
    }
    for (const ng of s.so.lich) {
      const nhan = `${ng.nhan.charAt(0).toUpperCase()}${ng.nhan.slice(1)}${ng.ngay ? ` ${fmtDate(ng.ngay)}` : ""}`;
      if (ng.moi.length === 0) {
        trong.set(nhan.toLowerCase(), [...(trong.get(nhan.toLowerCase()) ?? []), tenNgan(x, 14)]);
        continue;
      }
      const choKy = ng.moi.filter((m) => /chờ/i.test(m.trangThai)).length;
      const daKy = ng.moi.length - choKy;
      phan.push(duAn(tenNgan(x, 14), ` · ${nhan} · `, { d: `${ng.moi.length} lượt` }, ` · ${daKy} đã ký · `, { d: `${choKy} chờ ký` }));
      // 27/10 (KE-HOACH/33 mục 4): BẢNG «Giờ · Nhà thầu · Biên bản · Trạng thái». Tên nhà thầu nói MỘT lần (ba tiêu chí 26/10):
      // các lượt cùng nhà thầu nằm liền nhau, dòng sau ghi «〃»
      const theoNt = new Map<string, typeof ng.moi>();
      for (const m of cat(ng.moi, toiDa)) theoNt.set(m.nhaThau ?? "nhà thầu chưa rõ", [...(theoNt.get(m.nhaThau ?? "nhà thầu chưa rõ") ?? []), m]);
      const hang: string[][] = [];
      for (const [nt, ls] of Array.from(theoNt)) {
        ls.forEach((m, i) => {
          const viTri = m.viTri && m.viTri !== m.tenBb ? ` · ${rutGonTen(m.viTri)}` : "";
          hang.push([m.gioBd ?? "—", m.gioKt ?? "—", i === 0 ? nt.replace(/^(công ty|cty)\s+(cổ phần|cp|tnhh(\s+mtv)?|tư vấn|xây dựng)?\s*/i, "") : "〃", `${rutGonTen(m.tenBb)}${viTri}`, /chờ/i.test(m.trangThai) ? "⏳" : "✅"]);
        });
      }
      phan.push({
        k: "bang",
        bang: {
          cot: [
            { ten: "Giờ", rong: 5 },
            { ten: "Đến", rong: 5, chiWeb: true },
            { ten: "Nhà thầu", rong: 9 },
            { ten: "Biên bản", rong: 14 },
            { ten: "Ký", rong: 2 },
          ],
          hang,
        },
      });
      phan.push(...conLai(ng.moi.length, toiDa, "lượt"));
    }
  }
  if (trong.size > 0) phan.push({ k: "chu", dong: [`Không có lượt nào: ${Array.from(trong).map(([nhan, ten]) => `${nhan} (${ten.join(", ")})`).join(" · ")}`] });
  if (phan.some((p) => p.k === "bang")) phan.push(chuGiai("✅ đã ký · ⏳ chờ ký · lịch lấy từ phiếu yêu cầu nghiệm thu nhà thầu đã gửi"));
  return { phan };
}

/** TQ-5 Câu 🤖 của Bảng điều hành — tên dự án đậm, câu AI trong khung trích; chưa có câu thì ghi vào phần thiếu */
function tq5(n: NguCanh, ds: DauDuAn[]): KhoiIn {
  const phan: PhanIn[] = [];
  for (const x of ds.filter((y) => y.coTienDo)) {
    const c = n.d.khoi?.theoDuAn[x.maDuAn]?.cauAi;
    if (c?.cau) {
      phan.push(duAn(tenTrongNgoac(x)));
      phan.push(aiSach(c.cau));
    } else if (c && /^ẩn — /.test(c.loi ?? "")) {
      phan.push(duAn(tenTrongNgoac(x), ` — ${c.loi}`));
    } else {
      phan.push(thieu(tenTrongNgoac(x), c?.loi && /luật 36/.test(c.loi) ? "chưa có câu tóm tắt của AI hôm nay (câu AI viết chưa nói rõ chậm so với hệ nào nên không dùng)" : "chưa có câu tóm tắt của AI hôm nay"));
    }
  }
  return { phan };
}

/** Cột chốt 2: «riêng việc này về đúng Baseline thì COD …» — số Tiến độ tính */
function chuKeoVe(n: NguCanh, v: VanDeSang): string {
  if (!v.wbs) return "";
  const kv = n.d.khoi?.keoVe[khoaKeoVe(v.maDuAn, v.wbs)];
  if (!kv || kv.loi || kv.soNgay === null) return "";
  if (kv.soNgay > 0) {
    // Bản web in thêm câu Tiến độ viết khi găng chuyển sang việc khác («thử kéo cả hạng mục …») — Telegram giữ ngắn
    return ` · riêng việc này về đúng Baseline: COD sớm ${fmtSo(kv.soNgay)} ngày so với COD dự báo hôm nay${n.dayDu && kv.lyDo ? ` — ${rut(kv.lyDo, 200)}` : ""}`;
  }
  // Không đổi: in lý do Tiến độ viết (việc không găng / có dự trữ / găng chuyển sang việc khác…) — không tự đoán lý do
  if (kv.soNgay === 0) {
    // Tiến độ ghi mỗi việc một câu, ngăn «; » — Telegram lấy câu đầu, web in đủ
    const ly = kv.lyDo ? (n.dayDu ? rut(kv.lyDo, 400) : kv.lyDo.split("; ")[0] ?? kv.lyDo) : "";
    return ` · riêng việc này về đúng Baseline: COD không đổi${ly ? ` — ${ly}` : ""}`;
  }
  return "";
}

function mot(n: NguCanh, v: VanDeSang, stt: number): string {
  const s = motVanDe(v, stt, { kem: n.d.thamSo.kemAgentKhac, cauHoi: n.d.thamSo.cauHoiAi });
  const kv = chuKeoVe(n, v);
  if (!kv) return s;
  const [dau, ...sau] = s.split("\n");
  return [`${dau}${kv}`, ...sau].join("\n");
}

/** Mốc màu «quá hạn bao nhiêu ngày» (RQ-5, RQ-6) — Mr. Đại đồng ý 25/10/2026: 🟡 từ 7 đến 29 ngày · 🔴 từ 30 ngày */
const emojiQuaHan = (ngay: number | null | undefined): string => (ngay === null || ngay === undefined || ngay < 7 ? "🟢" : ngay < 30 ? "🟡" : "🔴");
const emojiMuc = (m: VanDeSang["mucDo"]): string => (m === "do" ? "🔴" : m === "vang" ? "🟡" : "🟢");

/** Số ngày «riêng việc này về đúng Baseline» + lý do (Tiến độ tính) — null khi chưa có số */
function keoVeCua(n: NguCanh, v: VanDeSang): { soNgay: number; lyDo: string } | null {
  if (!v.wbs) return null;
  const kv = n.d.khoi?.keoVe[khoaKeoVe(v.maDuAn, v.wbs)];
  if (!kv || kv.loi || kv.soNgay === null) return null;
  return { soNgay: kv.soNgay, lyDo: kv.lyDo ?? "" };
}

/**
 * RQ-1 Việc làm chậm COD — BẢNG «Việc · Lùi COD · Kéo về được» (27/10, KE-HOACH/33 mục 4); lùi ghi kèm ký hiệu hệ (BL / MT, luật 36)
 * và ký hiệu giải ở chú giải. Nguồn · lý do kéo về · agent kèm chỉ ở web; câu hỏi 🤖 trong khung trích dưới bảng.
 */
function rq1(n: NguCanh, k: ChonKhoi, ds: DauDuAn[]): KhoiIn {
  const ma = new Set(ds.map((x) => x.maDuAn));
  const tatCaVd = n.vanDe.filter((v) => ma.has(v.maDuAn));
  const trungTq1 = tatCaVd.filter((v) => LA_VUOT_HAN_CHU_TRUONG.test(v.tieuDe) && coKhoi(n, "TQ-1", v.maDuAn));
  const trungRq6 = tatCaVd.filter((v) => LA_TON_VIEC_QUA_HAN.test(v.tieuDe) && coKhoi(n, "RQ-6", v.maDuAn));
  const cua = tatCaVd.filter((v) => !trungTq1.includes(v) && !trungRq6.includes(v));
  const nIn = soDongIn(k);
  const phan: PhanIn[] = [];
  const nang = cua.slice().sort(soSanhVanDe)[0];
  if (cua.length === 0) phan.push({ k: "chu", dong: ["Không có việc nào làm chậm COD"] });
  else
    phan.push({
      k: "chu",
      dong: [{ d: `${cua.length} việc` }, ` làm chậm COD ở ${new Set(cua.map((v) => v.maDuAn)).size} dự án`, ...(nang && soAnhHuong(nang) ? [` · nặng nhất: ${soAnhHuong(nang)} — không cộng dồn`] : [])],
    });
  const tenDaNgan = (m: string) => { const d = ds.find((x) => x.maDuAn === m); return d ? tenNgan(d, 12) : m; };
  // G1+G3 (28/10): THẺ VIỆC, không bảng — tên việc không cắt, số bằng lời có «so với hệ nào» (luật 36), không viết tắt MT/BL
  const heDung = new Set<string>();
  const luiCua = (v: VanDeSang): string => {
    if (v.soNgayLuiCod === null || v.soNgayLuiCod <= 0) return v.lyDo.includes("gang") ? "việc găng, chưa quy ra số ngày lùi COD" : "chưa quy ra số ngày lùi COD";
    heDung.add(v.heLuiCod ?? "");
    // Số agent trả là COD của DỰ ÁN đang lùi (việc trên đường găng); riêng việc này kéo về được ít hơn thì nói rõ, kẻo hiểu «việc này gây 59 ngày»
    const kv = keoVeCua(n, v);
    const rieng = kv !== null && kv.soNgay < v.soNgayLuiCod;
    return `${rieng ? "COD dự án đang lùi" : "làm COD lùi"} ${fmtSo(v.soNgayLuiCod)} ngày${v.heLuiCod ? ` so với ${v.heLuiCod}` : ""}`;
  };
  const keoVeChu = (v: VanDeSang): string => {
    const kv = keoVeCua(n, v);
    if (kv === null) return "";
    return kv.soNgay > 0
      ? ` · riêng việc này làm đúng ${TEN_HE.baseline} thì COD sớm ${fmtSo(kv.soNgay)} ngày`
      : kv.soNgay === 0
        ? ` · riêng việc này làm đúng ${TEN_HE.baseline} cũng không làm COD sớm hơn`
        : ` · riêng việc này làm đúng ${TEN_HE.baseline} thì COD muộn thêm ${fmtSo(-kv.soNgay)} ngày`;
  };
  const theCua = (dsv: VanDeSang[], coTenDuAn: boolean): { the: PhanIn[]; cauHoi: string[] } => {
    const cacThe: PhanIn[] = [];
    const cauHoi: string[] = [];
    for (const v of dsv) {
      const kv = keoVeCua(n, v);
      const kem = n.d.thamSo.kemAgentKhac ? v.kem.map((x) => `+ ${x.tenAgent}: ${x.doLlmSinh ? "🤖 " : ""}${rut(x.tieuDe, 200)}`).join(" ; ") : "";
      const ly = kv?.lyDo ? (n.dayDu ? rut(kv.lyDo, 400) : kv.lyDo.split("; ")[0] ?? kv.lyDo) : "";
      cacThe.push(
        the(
          `${emojiMuc(v.mucDo)} ${v.doLlmSinh ? "🤖 " : ""}${tenKhongMa(v)}${coTenDuAn ? ` — ${tenDaNgan(v.maDuAn)}` : ""}`,
          `${luiCua(v)}${keoVeChu(v)}`,
          [`Nguồn: ${v.tenAgent}`, ly ? `Vì sao: ${ly}` : "", kem ? `Việc kèm: ${kem}` : ""].filter(Boolean).join(" · "),
        ),
      );
      if (n.d.thamSo.cauHoiAi && v.cauHoi) cacThe.push(aiSach(v.cauHoi));
    }
    return { the: cacThe, cauHoi };
  };
  // cauHoi luôn rỗng: câu 🤖 đã nằm ngay dưới thẻ việc của nó (rà soát 28/10 — trước đây dồn xuống cuối nhóm nên không biết câu nào của việc nào)
  if (k.gopCongTy) {
    const xep = cua.slice().sort(soSanhVanDe);
    const { the: cacThe, cauHoi } = theCua(cat(xep, nIn), true);
    phan.push(...cacThe);
    cauHoi.forEach((c) => phan.push(aiSach(c)));
    phan.push(...conLai(xep.length, nIn, "việc"));
  } else {
    const sachTen: string[] = [];
    for (const x of ds) {
      const cuaDa = cua.filter((v) => v.maDuAn === x.maDuAn);
      if (cuaDa.length === 0) {
        if (x.coTienDo) sachTen.push(tenNgan(x, 24));
        continue;
      }
      phan.push(duAn(tenNgan(x, 24), ` · ${cuaDa.length} việc`));
      const { the: cacThe, cauHoi } = theCua(cat(cuaDa, nIn), false);
      phan.push(...cacThe);
      cauHoi.forEach((c) => phan.push(aiSach(c)));
      phan.push(...conLai(cuaDa.length, nIn, "việc"));
    }
    if (sachTen.length > 0) phan.push(sach(sachTen, "không có việc nào làm chậm COD"));
  }
  const khongLap = [trungTq1.length > 0 ? `${trungTq1.length} việc «COD vượt hạn theo chủ trương» (đã có ở khối Bảng COD các dự án)` : "", trungRq6.length > 0 ? `${trungRq6.length} việc «người tồn việc quá hạn» (đã có ở khối Việc quá hạn theo người)` : ""].filter(Boolean);
  if (khongLap.length > 0) phan.push(chuGiai(`không in lại ở đây: ${khongLap.join(" · ")}`));
  if (cua.length > 0) phan.push(chuGiai("🔴 🟡 = mức của issue · việc làm COD lùi nhiều nhất trên đầu · «riêng việc này làm đúng Baseline» = Tiến độ tính thử: chỉ sửa việc đó thì COD dự báo sớm bao nhiêu ngày"));
  return { phan };
}

/** RQ-2 Hạng mục tự làm COD chậm — mỗi dự án: dòng tổng «không cộng dồn», BẢNG Chậm · Hạng mục (+ cột thời tiết ở web); ảnh thanh ngang gửi kèm */
function rq2(n: NguCanh, ds: DauDuAn[], anh: KhoiDaDung["anh"]): KhoiIn {
  const phan: PhanIn[] = [];
  const thanhAnh: AnhThanhNgang["thanh"] = [];
  const khongCham: string[] = [];
  for (const x of ds.filter((y) => y.coTienDo)) {
    const s = soCua(n.d.khoi, x.maDuAn, (o) => o.gang);
    if ("loi" in s) {
      phan.push(thieu(tenNgan(x, 24), s.loi));
      continue;
    }
    const hm = s.so.hangMuc;
    if (hm.length > 0 && hm.every((h) => h.tuLamCodCham === null)) {
      phan.push(thieu(tenNgan(x, 24), `chưa có ${TEN_HE.baseline} đã duyệt — chưa tính được hạng mục nào tự làm COD chậm`));
      continue;
    }
    const chamTho = hm.filter((h) => (h.tuLamCodCham ?? 0) > 0);
    // Cha–con cùng số ngày là MỘT gốc: chỉ giữ cấp thấp nhất (7.6 và 7.6.2 cùng 20 ngày → giữ 7.6.2)
    const cham = chamTho
      .filter((h) => !chamTho.some((k) => k !== h && k.wbs.startsWith(`${h.wbs}.`) && k.tuLamCodCham === h.tuLamCodCham))
      .sort((a, b) => (b.tuLamCodCham ?? 0) - (a.tuLamCodCham ?? 0));
    if (cham.length === 0) {
      khongCham.push(tenNgan(x, 14));
      continue;
    }
    phan.push(duAn(tenNgan(x, 24), ` · ${cham.length} hạng mục tự làm COD chậm so với ${TEN_HE.baseline}`));
    // G1 + không mã (28/10): THẺ hạng mục — tên đầy đủ, dòng dưới «tự làm COD chậm N ngày so với Baseline»
    for (const h of cham) {
      const tt = h.trongDoThoiTiet ?? 0;
      phan.push(the(tenDai(h.ten), `tự làm COD chậm ${fmtSo(h.tuLamCodCham ?? 0)} ngày so với ${TEN_HE.baseline}${tt > 0 ? ` · trong đó ${fmtSo(tt)} ngày do thời tiết` : ""}`));
    }
    // Một ảnh cho cả công ty (C2): nhãn «dự án · hạng mục», không vẽ thanh 0 ngày (C5)
    for (const h of cham.slice(0, 8)) {
      const tong = h.tuLamCodCham ?? 0;
      const tt = Math.min(Math.max(h.trongDoThoiTiet ?? 0, 0), tong);
      thanhAnh.push({
        nhan: `${tenNgan(x, 24)} · ${boMa(h.ten)}`,
        doan: [
          ...(tong - tt > 0 ? [{ nhan: "Không do thời tiết", giaTri: tong - tt, mau: "du-bao" as const }] : []),
          ...(tt > 0 ? [{ nhan: "Do thời tiết", giaTri: tt, mau: "phu" as const }] : []),
        ],
      });
    }
  }
  if (thanhAnh.length > 0) {
    thanhAnh.sort((a, b) => b.doan.reduce((s, d) => s + d.giaTri, 0) - a.doan.reduce((s, d) => s + d.giaTri, 0));
    const dau = thanhAnh[0]!;
    anh.push({
      dacTa: {
        kieu: "thanh-ngang",
        tieuDe: `Nặng nhất ${fmtSo(dau.doan.reduce((s, d) => s + d.giaTri, 0))} ngày so với Baseline — ${dau.nhan}`,
        donVi: "ngày",
        thanh: thanhAnh.slice(0, 12),
        chuThich: "Mỗi thanh = COD dự báo hôm nay − COD dự báo nếu RIÊNG hạng mục đó làm đúng Baseline (agent Tiến độ tính). Không cộng dồn giữa các hạng mục.",
      },
      chuThich: "Hạng mục tự làm COD chậm — các dự án",
    });
  }
  if (thanhAnh.length > 0) {
    const nh = thanhAnh[0]!;
    phan.unshift({ k: "chu", dong: [{ d: `${phan.filter((p) => p.k === "the").length} hạng mục tự làm COD chậm` }, ` so với ${TEN_HE.baseline} · nặng nhất ${fmtSo(nh.doan.reduce((s, d) => s + d.giaTri, 0))} ngày: ${nh.nhan.split(" · ").slice(1).join(" · ")} — không cộng dồn`] });
  }
  if (khongCham.length > 0) phan.push(sach(khongCham, `không hạng mục găng nào tự làm COD chậm so với ${TEN_HE.baseline}`));
  if (phan.length > 0) phan.push(chuGiai(`Chậm = ngày, COD dự báo hôm nay − COD nếu RIÊNG hạng mục đó làm đúng ${TEN_HE.baseline} · không cộng dồn · nặng nhất trên đầu`));
  return { phan };
}

/**
 * RQ-3 Thử: xử lý xong thì COD về đâu — G1+G2+G5 (28/10, KE-HOACH/35): câu mở đầu nói rõ GIẢ ĐỊNH; mỗi giả định là một THẺ
 * (tên đầy đủ không cắt, dòng dưới «COD sớm N ngày → ngày · còn chậm M ngày so với Tiến độ mục tiêu»); giả định không làm COD sớm hơn
 * gom một dòng; dự án không có gì để thử gom một dòng.
 */
function rq3(n: NguCanh, ds: DauDuAn[]): KhoiIn {
  const phan: PhanIn[] = [];
  const khongCo: string[] = [];
  let coThe = false;
  const ten = (nhan: string): string =>
    boMa(nhan).replace(/ về đúng Baseline$/, "").replace(/^Cả hạng mục /, "cả hạng mục ").replace(" làm chậm COD", "").replace(/^Riêng /, "riêng việc ");
  for (const x of ds.filter((y) => y.coTienDo)) {
    const s = soCua(n.d.khoi, x.maDuAn, (o) => o.thuCod);
    if ("loi" in s) {
      phan.push(thieu(tenNgan(x, 24), s.loi));
      continue;
    }
    if (s.so.dong.length === 0) {
      khongCo.push(tenNgan(x, 14));
      continue;
    }
    phan.push(duAn(tenNgan(x, 24), ` · hôm nay COD ${fmtDate(s.so.codNay)} (${cauChamHe(s.so.chamMucTieuNay, "muc-tieu")})`));
    const khongDoi: string[] = [];
    for (const g of s.so.dong) {
      coThe = true;
      if (g.loi || g.codSau === null) {
        phan.push(the(`Nếu ${ten(g.nhan)} làm đúng ${TEN_HE.baseline}`, `chưa tính được — ${g.loi ?? "Tiến độ không trả COD sau giả định"}`));
        continue;
      }
      if (g.keoVe === 0) {
        khongDoi.push(`${ten(g.nhan)}${g.lyDoKhongDoi ? ` (${n.dayDu ? g.lyDoKhongDoi : g.lyDoKhongDoi.split("; ")[0] ?? g.lyDoKhongDoi})` : ""}`);
        continue;
      }
      const som = g.keoVe === null ? "COD chưa rõ sớm bao nhiêu" : g.keoVe > 0 ? `COD sớm ${fmtSo(g.keoVe)} ngày` : `COD muộn thêm ${fmtSo(-g.keoVe)} ngày`;
      phan.push(the(`Nếu ${ten(g.nhan)} làm đúng ${TEN_HE.baseline}`, `${som} → ${fmtDate(g.codSau)} · ${cauChamHe(g.chamMucTieuSau, "muc-tieu")}`));
    }
    if (khongDoi.length > 0) phan.push(cap2(`Làm đúng ${TEN_HE.baseline} cũng không làm COD sớm hơn: ${khongDoi.join(" ; ")}`));
  }
  if (khongCo.length > 0) phan.push(sach(khongCo, "không có việc / hạng mục nào để thử"));
  if (coThe) {
    phan.unshift({ k: "chu", dong: [`Thử: nếu việc / hạng mục nặng nhất dưới đây làm đúng ${TEN_HE.baseline}, COD dự báo của dự án về đâu`] });
    phan.push(chuGiai(`Máy tự chọn việc nặng nhất ở «Việc làm chậm COD» và hạng mục nặng nhất ở «Hạng mục tự làm COD chậm»; đây là phép thử, không đổi dữ liệu thật`));
  }
  return { phan };
}

/** RQ-4 Phiếu giá chờ ký so với sản lượng — mỗi dự án: dòng tổng, BẢNG Hợp đồng · Phiếu · SL · Chênh (tỷ), dòng ngày chốt; không tô màu (chưa có ngưỡng cho tiền) */
function rq4(n: NguCanh, ds: DauDuAn[]): KhoiIn {
  const loc = n.d.loc;
  const phan: PhanIn[] = [];
  const khongCho: string[] = [];
  const ngayChot = new Set<string>();
  const sg = (v: number | null): string => (v === null ? "—" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${soTy(Math.abs(v))}`);
  for (const x of ds) {
    if (loc && !loc.thayHet && !loc.thay("hopdong", x.maDuAn)) {
      phan.push(duAn(tenNgan(x, 24), `: ${AN_MAT}`));
      continue;
    }
    const s = soCua(n.d.khoi, x.maDuAn, (o) => o.phieuGia);
    if ("loi" in s) {
      if (!x.coTienDo) continue;
      if (/KHONG_CO_DU_LIEU|không có phiếu|chưa có hợp đồng/i.test(s.loi)) khongCho.push(tenNgan(x, 14));
      else phan.push(thieu(tenNgan(x, 24), s.loi));
      continue;
    }
    const t = s.so.tong;
    phan.push(duAn(tenNgan(x, 24), ` · ${t.soPhieuCho ?? "—"} phiếu chờ · ${t.soIssueMo ?? "—"} issue mở`));
    if (t.chenh === null) phan.push(cap2(`Phiếu ${soTy(t.phieuLuyKe)} tỷ · chưa có sản lượng nên chưa tính được chênh${t.viSaoChuaCo ? ` — ${boMa(t.viSaoChuaCo)}` : ""}`));
    else phan.push(cap2(t.chenh >= 0 ? "Phiếu cao hơn sản lượng " : "Phiếu thấp hơn sản lượng ", { d: `${soTy(Math.abs(t.chenh))} tỷ` }));
    const xep = s.so.hopDong.slice().sort((a, b) => Math.abs(b.chenh ?? 0) - Math.abs(a.chenh ?? 0));
    if (xep.length > 0) {
      phan.push({
        k: "bang",
        bang: {
          cot: [
            { ten: "Hợp đồng", rong: 14 },
            { ten: "Phiếu", rong: 6, phai: true },
            { ten: "Làm", rong: 5, phai: true },
            { ten: "Chênh", rong: 6, phai: true },
            { ten: "Nhà thầu", rong: 14, chiWeb: true },
            { ten: "Phiếu chờ", rong: 9, phai: true, chiWeb: true },
            { ten: "Issue", rong: 5, phai: true, chiWeb: true },
          ],
          hang: xep.map((h) => [n.dayDu ? `${h.ma} ${rutGonTen(h.ten)}` : rut(rutGonTen(h.ten), 14), soTy(h.phieuLuyKe), soTy(h.sanLuong), sg(h.chenh), h.nhaThau || "—", String(h.soPhieuCho ?? "—"), String(h.soIssueMo ?? "—")]),
        },
      });
    }
    if (t.sanLuongToi) ngayChot.add(t.sanLuongToi);
  }
  if (khongCho.length > 0) phan.push(sach(khongCho, "không có phiếu giá nào đang chờ"));
  if (phan.length === 0) phan.push({ k: "chu", dong: ["Không có phiếu giá nào đang chờ"] });
  if (phan.some((p) => p.k === "bang"))
    phan.push(chuGiai(`tỷ đồng · Phiếu = số tiền phiếu giá ghi đã làm · Làm = sản lượng Tiến độ ghi nhận${ngayChot.size === 1 ? ` tới ${fmtDate(Array.from(ngayChot)[0]!)}` : ""} · Chênh = Phiếu − Làm · chênh lớn nhất trên đầu`));
  return { phan };
}

/** RQ-5 Hồ sơ pháp lý quá hạn — hàng tổng đầu khối; mỗi dự án: dòng tổng riêng + hồ sơ quá hạn nhiều ngày nhất trước (🟡 7–29 · 🔴 ≥30); cổng cắt 20 dòng thì ghi «≥» */
function rq5(n: NguCanh, k: ChonKhoi, ds: DauDuAn[], anh: KhoiDaDung["anh"]): KhoiIn {
  const loc = n.d.loc;
  const nIn = soDongIn(k);
  const phan: PhanIn[] = [];
  const rieng: PhanIn[] = [];
  let thieuHs = 0;
  let tong = 0;
  let nDa = 0;
  let qhTong = 0;
  let catBot = false;
  let soVoiChung: string | null = null;
  const thanhHs: AnhThanhNgang["thanh"] = [];
  let nangHs: { ten: string; thieu: number; tong: number; qh: number } | null = null;
  for (const x of ds) {
    if (loc && !loc.thayHet && !loc.thay("phaply", x.maDuAn)) {
      rieng.push(duAn(tenNgan(x, 24), `: ${AN_MAT}`));
      continue;
    }
    const s = soCua(n.d.khoi, x.maDuAn, (o) => o.hoSo);
    if ("loi" in s) {
      rieng.push(thieu(tenNgan(x, 24), s.loi));
      continue;
    }
    const qh = s.so.dong.filter((h) => (h.quaHan ?? 0) > 0).sort((a, b) => (b.quaHan ?? 0) - (a.quaHan ?? 0));
    // «≥»: cổng Pháp lý trả tối đa 20 dòng; chỉ ghi «≥» khi còn hồ sơ thiếu nhiều hơn số dòng nhận được
    const cat20 = s.so.dong.length >= 20 && qh.length === s.so.dong.length && (s.so.soThieu === null || s.so.soThieu > s.so.dong.length);
    nDa++;
    thieuHs += s.so.soThieu ?? 0;
    tong += s.so.tongPhaiCo ?? 0;
    qhTong += qh.length;
    if (cat20) catBot = true;
    const soVoi = qh.find((h) => h.soVoi)?.soVoi;
    // Tên hạn của Pháp lý hay kèm ngày của MỘT hồ sơ («hạn phải có 10/04/2026») — dòng chung bỏ ngày đó
    if (soVoi && !soVoiChung) soVoiChung = (/^so với/i.test(soVoi) ? soVoi : `so với ${soVoi}`).replace(/\s*\d{2}\/\d{2}\/\d{4}\s*$/, "");
    if (s.so.soThieu !== null && s.so.soThieu > 0) {
      thanhHs.push({ nhan: `${tenNgan(x, 12)} · thiếu`, doan: [{ nhan: "Số hồ sơ", giaTri: s.so.soThieu, mau: "phu" }] }, { nhan: `${tenNgan(x, 12)} · quá hạn`, doan: [{ nhan: "Số hồ sơ", giaTri: qh.length, mau: "phu" }] });
      if (!nangHs || qh.length > nangHs.qh) nangHs = { ten: tenTrongNgoac(x), thieu: s.so.soThieu, tong: s.so.tongPhaiCo ?? 0, qh: qh.length };
    }
    rieng.push(duAn(tenNgan(x, 24), ` · thiếu ${s.so.soThieu ?? "—"} trên ${s.so.tongPhaiCo ?? "—"} hồ sơ · quá hạn ${cat20 ? "ít nhất " : ""}${qh.length}`));
    // 27/10 (KE-HOACH/33 mục 4): BẢNG «Quá hạn (ngày) · Hồ sơ», cột Hạn · Cơ quan chỉ ở web; quá hạn nhiều nhất trên đầu
    const dongQh = cat(qh, nIn);
    // G1 + luật «không ghi mã» (28/10): THẺ — tên hồ sơ không mã, dòng dưới «quá hạn N ngày (hạn …) · cơ quan»
    for (const h of dongQh)
      rieng.push(the(`${emojiQuaHan(h.quaHan)} ${tenDai(h.ten)}`, `quá hạn ${fmtSo(h.quaHan ?? 0)} ngày${h.han ? ` (hạn phải có ${fmtDate(h.han)})` : ""}${h.coQuan ? ` · ${h.coQuan}` : ""}`));
    rieng.push(...conLai(qh.length, nIn, "hồ sơ"));
    // Cổng Pháp lý chỉ trả 20 dòng — số «≥» nói thẳng là máy chưa nhận đủ, không phải bảo người đọc đi xem
    if (cat20) rieng.push(chuGiai(`${tenNgan(x, 24)}: còn hồ sơ quá hạn chưa liệt kê hết — hệ thống Pháp lý mỗi lần chỉ trả về 20 hồ sơ`));
  }
  // Ảnh (27/10, KE-HOACH/33 mục 4): thanh «thiếu» và «quá hạn» mỗi dự án có hồ sơ thiếu; không dự án nào thiếu thì không vẽ (luật C1)
  if (thanhHs.length > 0 && nangHs) {
    anh.push({
      dacTa: {
        kieu: "thanh-ngang",
        tieuDe: `${nangHs.ten}: thiếu ${nangHs.thieu}/${nangHs.tong} hồ sơ pháp lý, quá hạn ${catBot ? "≥ " : ""}${nangHs.qh}`,
        donVi: "hồ sơ",
        thanh: thanhHs,
        chuThich: "Thiếu = hồ sơ phải có mà chưa có · Quá hạn = trong số đó đã quá hạn phải có (Pháp lý tính).",
      },
      chuThich: "Hồ sơ pháp lý thiếu và quá hạn — các dự án",
    });
  }
  if (nDa > 0) phan.push({ k: "chu", dong: [`Tổng ${nDa} dự án: còn `, { d: `thiếu ${thieuHs} trên ${tong} hồ sơ pháp lý phải có` }, `, trong đó quá hạn ${catBot ? "ít nhất " : ""}${qhTong}${soVoiChung ? ` ${soVoiChung}` : ""}`] });
  phan.push(...rieng);
  if (phan.length === 0) phan.push({ k: "chu", dong: ["Không có hồ sơ pháp lý quá hạn"] });
  if (nDa > 0) phan.push(chuGiai("🟢 dưới 7 ngày · 🟡 quá hạn 7–29 ngày · 🔴 từ 30 ngày · quá hạn nhiều nhất trên đầu"));
  return { phan };
}

/** RQ-6 Việc quá hạn theo người — gộp một người qua các dự án (khoá = phần tên sau dấu «·»), người quá hạn nhiều nhất trước; 🟡 7–29 ngày · 🔴 ≥30 theo việc trễ nhất */
function rq6(n: NguCanh, k: ChonKhoi, ds: DauDuAn[], anh: KhoiDaDung["anh"]): KhoiIn {
  const nIn = soDongIn(k);
  const phan: PhanIn[] = [];
  interface Nguoi { ten: string; dangMo: number; quaHan: number; gang: number; tre: { ma: string; ten: string; han: string | null; quaHan: number } | null; duAn: Set<string> }
  const gop = new Map<string, Nguoi>();
  let chuaGiaoMo = 0;
  let chuaGiaoQh = 0;
  let du = true;
  let nDa = 0;
  const loi: PhanIn[] = [];
  for (const x of ds) {
    const s = soCua(n.d.khoi, x.maDuAn, (o) => o.taiViec);
    if ("loi" in s) {
      loi.push(thieu(tenNgan(x, 24), s.loi));
      continue;
    }
    nDa++;
    if (!s.so.du) du = false;
    chuaGiaoMo += s.so.chuaGiao?.dangMo ?? 0;
    chuaGiaoQh += s.so.chuaGiao?.quaHan ?? 0;
    for (const q of s.so.nguoi.filter((y) => y.dangMo > 0)) {
      // NFC: «Đại» gõ hai kiểu Unicode vẫn là một người (kiểm độc lập 26/10)
      const khoa = (q.ten.split("·").pop() ?? q.ten).normalize("NFC").trim().toLowerCase();
      // Đợt 2 (26/10, ba tiêu chí): phòng / đơn vị / chức danh ghi rõ, không lẫn với người
      const nhanLoai = q.loai === "phong" ? " (phòng)" : q.loai === "don_vi" ? " (đơn vị)" : q.loai === "chuc_danh_lanh_dao" ? " (chức danh)" : "";
      const g = gop.get(khoa) ?? { ten: q.ten + nhanLoai, dangMo: 0, quaHan: 0, gang: 0, tre: null, duAn: new Set<string>() };
      if (q.ten.length + nhanLoai.length > g.ten.length) g.ten = q.ten + nhanLoai;
      g.dangMo += q.dangMo;
      g.quaHan += q.quaHan;
      g.gang += q.viecGang ?? 0;
      g.duAn.add(tenNgan(x, 12));
      if (q.treNhat && (!g.tre || q.treNhat.quaHan > g.tre.quaHan)) g.tre = q.treNhat;
      gop.set(khoa, g);
    }
  }
  const xep = Array.from(gop.values()).sort((a, b) => b.quaHan - a.quaHan || (b.tre?.quaHan ?? 0) - (a.tre?.quaHan ?? 0));
  const mo = xep.reduce((a, q) => a + q.dangMo, 0) + chuaGiaoMo;
  const qh = xep.reduce((a, q) => a + q.quaHan, 0) + chuaGiaoQh;
  if (nDa > 0) phan.push({ k: "chu", dong: du ? [`Tổng ${nDa} dự án: ${mo} việc mở · `, { d: `${qh} quá hạn` }, " so với hạn giao việc"] : [`${nDa} dự án · chưa đủ người nên không cộng tổng (cổng cắt bớt)`] });
  // Ảnh (27/10): thanh số việc quá hạn mỗi người / đơn vị (nhiều nhất trước); không ai quá hạn thì không vẽ (luật C1)
  const quaHanNhieu = xep.filter((q) => q.quaHan > 0);
  if (quaHanNhieu.length >= 2) {
    const dau = quaHanNhieu[0]!;
    anh.push({
      dacTa: {
        kieu: "thanh-ngang",
        tieuDe: `${tenNguoiAnh(dau.ten)} quá hạn ${dau.quaHan}/${dau.dangMo} việc${dau.tre ? `, trễ nhất ${fmtSo(dau.tre.quaHan)} ngày` : ""} so với hạn giao việc`,
        donVi: "việc",
        thanh: quaHanNhieu.slice(0, 10).map((q) => ({ nhan: tenNguoiAnh(q.ten), doan: [{ nhan: "Việc quá hạn", giaTri: q.quaHan, mau: "phu" as const }] })),
        chuThich: "Mỗi thanh = số việc quá hạn của người / đơn vị đó so với hạn giao việc (số việc đang mở xem ở bảng chữ).",
      },
      chuThich: "Việc quá hạn theo người",
    });
  }
  // 27/10 (KE-HOACH/33 mục 4): BẢNG «Người · Quá hạn/Mở · Trễ nhất (ngày)»; việc trễ nhất + dự án chỉ ở web
  const dongNg = cat(xep, nIn);
  // G1 (28/10): THẺ — tên người / đơn vị đầy đủ (hai Phó Tổng Giám đốc không còn trùng chữ), số bằng lời, việc trễ nhất nói rõ là việc gì
  for (const q of dongNg)
    phan.push(
      the(
        q.ten,
        `quá hạn ${q.quaHan} trên ${q.dangMo} việc đang mở${q.tre ? ` · trễ nhất ${emojiQuaHan(q.tre.quaHan)} ${fmtSo(q.tre.quaHan)} ngày so với hạn giao việc — việc “${rut(boMa(boTienToDuAn(q.tre.ten)), 90)}”${q.tre.han ? `, hạn ${fmtDate(q.tre.han)}` : ""}` : ""}`,
        [q.gang ? `${q.gang} việc găng` : "", `Dự án: ${Array.from(q.duAn).join(", ")}`].filter(Boolean).join(" · "),
      ),
    );
  phan.push(...conLai(xep.length, nIn, "người / đơn vị"));
  if (chuaGiaoMo > 0) phan.push({ k: "chu", dong: [`Chưa giao cho ai: ${chuaGiaoMo} đang mở · ${chuaGiaoQh} quá hạn`] });
  phan.push(...loi);
  if (phan.length === 0) phan.push({ k: "chu", dong: ["Không có việc quá hạn nào"] });
  phan.push(chuGiai("🟢 trễ nhất dưới 7 ngày · 🟡 7–29 ngày · 🔴 từ 30 ngày · so với hạn giao việc · nhiều việc quá hạn nhất trên đầu"));
  return { phan };
}

/** DA-1 Việc đỏ hôm nay — mỗi dự án: dòng tên + bảng Nguồn · Việc · Mở lâu nhất (ngày), rồi từng việc (mở LÂU NHẤT trước) */
function da1(n: NguCanh, k: ChonKhoi, ds: DauDuAn[]): KhoiIn {
  const nIn = soDongIn(k);
  // «<người> tồn N việc quá hạn» đã có ở khối Việc quá hạn theo người (RQ-6) trong cùng bộ thì không in lại
  const laTrungRq6 = (v: ViecKhac): boolean => LA_TON_VIEC_QUA_HAN.test(v.tieuDe) && coKhoi(n, "RQ-6", v.maDuAn);
  const soTrung = ds.reduce((a, x) => a + n.viecDo.filter((v) => v.maDuAn === x.maDuAn && laTrungRq6(v)).length, 0);
  const homNay = n.d.bc.ngay;
  // Luật 44: ngày mở tính theo giờ VN (+7) — có giờ thì đổi múi, không cắt ngày UTC (kiểm độc lập 27/10 BB-07)
  const ngayMoVn = (iso: string): string => {
    const t = iso.length > 10 ? new Date(iso) : null;
    return t && !Number.isNaN(t.getTime()) ? gioVn(t).ngay : iso.slice(0, 10);
  };
  const moNgay = (v: ViecKhac): number | null => (v.ngayMo ? daysBetween(ngayMoVn(v.ngayMo), homNay) : null);
  const phan: PhanIn[] = [];
  for (const x of ds) {
    const cua = n.viecDo.filter((v) => v.maDuAn === x.maDuAn && !laTrungRq6(v));
    if (cua.length === 0) continue;
    phan.push(duAn(tenNgan(x, 24), " — 🔴 ", { d: String(cua.length) }, " việc đỏ"));
    // 27/10 (KE-HOACH/33 mục 4): MỘT bảng «Mở (ngày) · Nguồn · Việc», mở LÂU NHẤT trên đầu; quá hạn chỉ ở web
    const xep = cua.slice().sort((a, b) => (moNgay(b) ?? -1) - (moNgay(a) ?? -1));
    // G1 + «không ghi mã» (28/10): THẺ — việc nói bằng tên (hạng mục + nội dung), dòng dưới «mở N ngày · nguồn»
    for (const v of cat(xep, nIn)) {
      const hm = v.wbs !== null && v.tenWbs && !v.tieuDe.includes(v.tenWbs) ? `${tenDai(v.tenWbs)} — ` : "";
      const md = moNgay(v);
      const qh = v.soNgayQuaHan !== null && v.soNgayQuaHan > 0 && !/quá hạn/i.test(v.tieuDe) ? ` · quá hạn ${fmtSo(v.soNgayQuaHan)} ngày` : "";
      phan.push(the(`${v.doLlmSinh ? "🤖 " : ""}${hm}${boMa(rut(v.tieuDe, 160))}`, `${md === null ? "chưa rõ mở từ ngày nào" : `đã mở ${fmtSo(md)} ngày`}${qh} · do agent ${v.tenAgent} báo`));
    }
    phan.push(...conLai(xep.length, nIn, "việc"));
  }
  if (phan.length === 0) phan.push({ k: "chu", dong: ["Không có việc đỏ nào ngoài «Việc làm chậm COD»"] });
  else {
    // G2 (28/10): câu kết luận đầu khối do code ghép
    const tatCa = ds.flatMap((x) => n.viecDo.filter((v) => v.maDuAn === x.maDuAn && !laTrungRq6(v)));
    const lau = tatCa.slice().sort((a, b) => (moNgay(b) ?? -1) - (moNgay(a) ?? -1))[0];
    const ml = lau ? moNgay(lau) : null;
    phan.unshift({ k: "chu", dong: [{ d: `${tatCa.length} việc đỏ` }, ` ở ${new Set(tatCa.map((v) => v.maDuAn)).size} dự án${lau && ml !== null ? ` · mở lâu nhất ${fmtSo(ml)} ngày: ${boMa(rut(lau.tieuDe, 90))}` : ""}`] });
    phan.push(chuGiai(`Việc đỏ = việc các agent đánh dấu đỏ, không nằm trong «Việc làm chậm COD» · việc mở lâu nhất trên đầu${soTrung > 0 ? ` · không in lại ${soTrung} việc «người tồn việc quá hạn» (đã có ở khối Việc quá hạn theo người)` : ""}`));
  }
  return { phan };
}

const TEN_DUONG: Record<"muc-tieu" | "baseline" | "thuc-te" | "du-bao", string> = {
  "muc-tieu": TEN_HE["muc-tieu"],
  baseline: TEN_HE.baseline,
  "thuc-te": "Thực tế",
  "du-bao": "Dự báo",
};

/** DA-3 S-Curve — mỗi dự án: BẢNG Đường · % tại ngày cắt · Đạt 100% (bốn đường), dòng thực tế chậm/sớm N ngày so với Tiến độ mục tiêu; ảnh S-Curve gửi kèm */
function da3(n: NguCanh, ds: DauDuAn[], anh: KhoiDaDung["anh"]): KhoiIn {
  const phan: PhanIn[] = [];
  for (const x of ds.filter((y) => y.coTienDo)) {
    const s = soCua(n.d.khoi, x.maDuAn, (o) => o.sCurve);
    if ("loi" in s) {
      phan.push(thieu(tenNgan(x, 24), s.loi));
      continue;
    }
    const c = s.so;
    // Luật 35: nhanh / chậm đọc bằng NGÀY trên đường S (Tiến độ tính, âm = chậm), % chỉ nói khối lượng đã làm
    const cauLech =
      typeof c.lechThucTe === "number"
        ? `${c.lechThucTe < 0 ? `chậm ${fmtSo(-c.lechThucTe)} ngày` : c.lechThucTe > 0 ? `sớm ${fmtSo(c.lechThucTe)} ngày` : "đúng tiến độ"} so với ${TEN_HE["muc-tieu"]} (cùng mức khối lượng, đo trên đường S)`
        : null;
    const coThucTe = Boolean(c.ngayCat) && c.tai.thucTe !== null;
    if (!coThucTe) {
      // G5 (28/10): chưa có báo cáo ngày thì KHÔNG in bảng toàn dấu «—» — một dòng nói kế hoạch xong ngày nào
      const kh = [c.dat100.baseline ? `${TEN_HE.baseline} xong 100% ngày ${fmtDate(c.dat100.baseline)}` : "", c.dat100.mucTieu ? `${TEN_HE["muc-tieu"]} xong 100% ngày ${fmtDate(c.dat100.mucTieu)}` : ""].filter(Boolean);
      phan.push(duAn(tenNgan(x, 24), ` · chưa có khối lượng thực tế (chưa có báo cáo ngày)${kh.length > 0 ? ` — kế hoạch: ${kh.join(" · ")}` : ""}`));
      continue;
    }
    phan.push(duAn(tenNgan(x, 24), ` · khối lượng tại ${fmtDate(c.ngayCat)}`));
    const hang: string[][] = [];
    if (coThucTe) hang.push(["Thực tế", pct(c.tai.thucTe), "—"]);
    hang.push([TEN_HE.baseline, coThucTe ? pct(c.tai.baseline) : "—", c.dat100.baseline ? fmtDate(c.dat100.baseline) : "—"]);
    hang.push([TEN_HE["muc-tieu"], coThucTe ? pct(c.tai.mucTieu) : "—", c.dat100.mucTieu ? fmtDate(c.dat100.mucTieu) : "—"]);
    if (c.dat100.duBao) hang.push(["Dự báo", "—", fmtDate(c.dat100.duBao)]);
    phan.push({
      k: "bang",
      bang: {
        cot: [
          { ten: "Đường", rong: 16 },
          { ten: "Đã làm", rong: 7, phai: true },
          { ten: "Xong 100%", rong: 10, phai: true },
        ],
        hang,
      },
    });
    if (coThucTe && cauLech) phan.push(cap2("Thực tế ", { d: cauLech }));
    if (n.dayDu && c.cauTapViec) phan.push(chuGiai(`${tenNgan(x, 24)}: ${c.cauTapViec}`));
    const duong = c.duong.filter((q) => q.diem.length > 0);
    // Chỉ vẽ dự án CÓ đường Thực tế — chưa có báo cáo ngày thì chỉ toàn đường kế hoạch, không có gì để so (luật C1)
    if (coThucTe && duong.some((q) => q.muc === "thuc-te")) {
      const dau = duong.flatMap((q) => q.diem.map((z) => z.ngay)).sort();
      const dt: AnhSCurve = {
        kieu: "s-curve",
        tieuDe: `S-Curve khối lượng — ${tenTrongNgoac(x)} (${khoangNgay(dau[0], dau[dau.length - 1])})`,
        duong: duong.map((q) => ({ nhan: TEN_DUONG[q.muc], mau: q.muc, diem: q.diem })),
        ngayCat: c.ngayCat,
        ...(cauLech ? { chuThich: `Thực tế tại ${fmtDate(c.ngayCat)} ${cauLech}.` } : {}),
      };
      anh.push({ dacTa: dt, chuThich: `S-Curve — ${x.ten}` });
    }
  }
  if (phan.some((p) => p.k === "bang")) phan.push(chuGiai("«Đã làm» = phần trăm khối lượng đã làm tại ngày ghi ở dòng dự án · «Xong 100%» = ngày đường đó đạt 100% · chỉ tính việc nối tới mốc COD · nhanh / chậm đọc bằng ngày"));
  return { phan };
}

/** DA-4 Hạng mục đang thi công so với Baseline — bảng Lệch · Hạng mục (▲ chậm ▼ sớm); dự án không có hạng mục đang thi công gộp một dòng */
function da4(n: NguCanh, ds: DauDuAn[], anh: KhoiDaDung["anh"]): KhoiIn {
  const phan: PhanIn[] = [];
  const khongCo: string[] = [];
  const thanhLech: { nhan: string; giaTri: number }[] = [];
  for (const x of ds.filter((y) => y.coTienDo)) {
    const s = soCua(n.d.khoi, x.maDuAn, (o) => o.thiCong);
    if ("loi" in s) {
      // Tiến độ trả lỗi «không có đầu việc đã khởi công nào» = không có gì đang thi công, KHÔNG phải thiếu số (rà soát 27/10)
      if (/Không có đầu việc đã khởi công/i.test(s.loi)) khongCo.push(tenNgan(x, 14));
      else phan.push(thieu(tenNgan(x, 24), s.loi));
      continue;
    }
    const dong = s.so.dong;
    if (dong.length === 0) {
      khongCo.push(tenNgan(x, 14));
      continue;
    }
    const coSo = dong.filter((q) => q.treSoBaseline !== null);
    const cham = coSo.filter((q) => (q.treSoBaseline ?? 0) > 0);
    const som = coSo.filter((q) => (q.treSoBaseline ?? 0) < 0);
    phan.push(
      duAn(
        tenNgan(x, 24),
        " · ",
        { d: String(dong.length) },
        ` hạng mục đang thi công` +
          (coSo.length > 0 ? ` · ${cham.length} chậm · ${som.length} sớm so với ${TEN_HE.baseline}` : ` · chưa có số so với ${TEN_HE.baseline}`) +
          (s.so.ngayDanhGia ? ` (đánh giá ${fmtDate(s.so.ngayDanhGia)})` : ""),
      ),
    );
    for (const q of coSo) thanhLech.push({ nhan: `${tenNgan(x, 12)} · ${tenDai(q.ten)}`, giaTri: q.treSoBaseline ?? 0 });
    // Không cắt (T10): in mọi hạng mục đang thi công, chậm nhất trên đầu
    const hien = dong.slice().sort((a, b) => (b.treSoBaseline ?? -99999) - (a.treSoBaseline ?? -99999));
    // G1 + không mã (28/10): THẺ — «chậm 18 ngày so với Baseline», không ký hiệu ▲▼
    for (const q of hien) {
      const l = q.treSoBaseline;
      const cau = l === null ? `chưa có số so với ${TEN_HE.baseline}` : l > 0 ? `chậm ${fmtSo(l)} ngày so với ${TEN_HE.baseline}` : l < 0 ? `sớm ${fmtSo(-l)} ngày so với ${TEN_HE.baseline}` : `đúng ${TEN_HE.baseline}`;
      phan.push(the(tenDai(q.ten), `${cau} · dự báo xong ${fmtDate(q.duBaoXong)}`, `Thầu phụ: ${q.thauPhu ?? "—"} · năng suất 7 ngày gần nhất ${fmtSo(q.ns7)} ${q.donVi}/ngày (Baseline ${fmtSo(q.nsBaseline)})`));
    }
  }
  // Ảnh (27/10, KE-HOACH/33 mục 4): thanh HAI CHIỀU quanh vạch 0 — ▲ chậm sang phải, ▼ sớm sang trái; tối đa 5 chậm nhất + 5 sớm nhất.
  // Chỉ vẽ khi có ít nhất 2 hạng mục và có hạng mục lệch khác 0 (luật C1)
  if (thanhLech.length >= 2 && thanhLech.some((t) => t.giaTri !== 0)) {
    const xepL = thanhLech.slice().sort((a, b) => b.giaTri - a.giaTri);
    const chamL = xepL.filter((t) => t.giaTri > 0);
    const somL = xepL.filter((t) => t.giaTri < 0);
    const chon = [...chamL.slice(0, 5), ...xepL.filter((t) => t.giaTri === 0).slice(0, 2), ...somL.slice(-5)];
    const dau = xepL[0]!;
    anh.push({
      dacTa: {
        kieu: "thanh-hai-chieu",
        tieuDe: dau.giaTri > 0 ? `${dau.nhan} chậm ${fmtSo(dau.giaTri)} ngày so với ${TEN_HE.baseline} — ${chamL.length} hạng mục chậm, ${somL.length} sớm` : `Không hạng mục nào chậm so với ${TEN_HE.baseline} — ${somL.length} hạng mục sớm`,
        donVi: "ngày",
        thanh: chon,
        nhanDuong: `Chậm so với ${TEN_HE.baseline}`,
        nhanAm: `Sớm so với ${TEN_HE.baseline}`,
        chuThich: `Mỗi thanh = ngày dự báo xong − ngày xong theo ${TEN_HE.baseline} đã duyệt, của hạng mục đang thi công (Tiến độ tính). Tối đa 5 chậm nhất và 5 sớm nhất.`,
      },
      chuThich: "Hạng mục đang thi công — chậm / sớm so với Baseline",
    });
  }
  if (thanhLech.length > 0) {
    const nChamL = thanhLech.filter((q) => q.giaTri > 0).length;
    const nSomL = thanhLech.filter((q) => q.giaTri < 0).length;
    const chamNhat = thanhLech.slice().sort((a, b) => b.giaTri - a.giaTri)[0]!;
    phan.unshift({ k: "chu", dong: [{ d: `${nChamL} hạng mục đang thi công chậm` }, `, ${nSomL} sớm so với ${TEN_HE.baseline}${chamNhat.giaTri > 0 ? ` · chậm nhất ${fmtSo(chamNhat.giaTri)} ngày: ${chamNhat.nhan.split(" · ").slice(1).join(" · ")}` : ""}`] });
  }
  if (khongCo.length > 0) phan.push(sach(khongCo, "chưa có hạng mục nào đang thi công"));
  if (phan.some((p) => p.k === "the")) phan.push(chuGiai(`Chậm / sớm = số ngày dự báo xong so với ngày xong theo ${TEN_HE.baseline} · hạng mục chậm nhất trên đầu`));
  return { phan };
}

// ─────────────────────────────────────────────────────────────
// Bốn khối mới 28/10/2026 (Mr. Đại duyệt việc 2) — khuôn đọc mới: thẻ, không mã, câu kết luận đầu khối
// ─────────────────────────────────────────────────────────────

/** «27/10 09:39» — lúc agent chủ tính số (giờ Việt Nam) */
function lucVn(iso: string | null): string {
  const t = iso ? new Date(iso) : null;
  if (!t || Number.isNaN(t.getTime())) return "chưa rõ lúc nào";
  const g = gioVn(t);
  return `${fmtDate(g.ngay)} ${g.gio}`;
}

/** Tên việc nghiệm thu trong tiêu đề thẻ «Phiếu <mã> — Kiểm tra trạm trộn bê tông: chờ BQL ký quá hạn 24 giờ» → «Kiểm tra trạm trộn bê tông» */
const tenViecPhieu = (tieuDe: string): string =>
  boMa(tieuDe.replace(/^Phiếu\s+\S+\s+[—-]\s+/, "").replace(/:\s*chờ BQL ký.*$/i, "")) || boMa(tieuDe);

/** Số lớn nhất trước chữ «giờ» / «ngày» trong chữ mức của thẻ («quá 31 giờ», «lâu nhất 37 ngày») */
const soTrongMuc = (muc: string): number => Number(/(\d+)/.exec(muc)?.[1] ?? 0);

/** NT-2 Phiếu nghiệm thu chờ BQL ký quá hạn — thẻ mỗi phiếu; quá nhiều giờ nhất trên đầu */
function nt2(n: NguCanh, ds: DauDuAn[]): KhoiIn {
  const phan: PhanIn[] = [];
  const sachTen: string[] = [];
  const tatCa: { ten: string; gio: number; duAn: string }[] = [];
  let luc: string | null = null;
  let nguong: number | null = null;
  for (const x of ds) {
    const s = soCua(n.d.khoi, x.maDuAn, (o) => o.soLieuNt);
    if ("loi" in s) {
      phan.push(thieu(tenNgan(x, 24), s.loi));
      continue;
    }
    const p = s.so.phieuChoKy;
    luc = luc ?? s.so.tinhLuc;
    nguong = nguong ?? p.nguongGio;
    if (p.cac.length === 0) {
      sachTen.push(tenNgan(x, 24));
      continue;
    }
    const xep = p.cac.slice().sort((a, b) => soTrongMuc(b.muc) - soTrongMuc(a.muc));
    phan.push(duAn(tenNgan(x, 24), ` · ${p.soThe} phiếu chờ BQL ký quá ${p.nguongGio ?? "?"} giờ`));
    for (const c of xep) {
      tatCa.push({ ten: tenViecPhieu(c.tieuDe), gio: soTrongMuc(c.muc), duAn: tenNgan(x, 24) });
      phan.push(the(tenViecPhieu(c.tieuDe), `chờ Ban QLDA ký ${c.muc}${p.nguongGio ? ` (ngưỡng ${p.nguongGio} giờ)` : ""}`));
    }
  }
  if (tatCa.length > 0) {
    const lau = tatCa.slice().sort((a, b) => b.gio - a.gio)[0]!;
    phan.unshift({ k: "chu", dong: [{ d: `${tatCa.length} phiếu nghiệm thu` }, ` chờ Ban QLDA ký quá ${nguong ?? "?"} giờ · lâu nhất quá ${lau.gio} giờ: ${lau.ten}`] });
  }
  if (sachTen.length > 0) phan.push(sach(sachTen, `không có phiếu nghiệm thu nào chờ BQL ký quá ${nguong ?? "ngưỡng"} giờ`));
  if (luc) phan.push(chuGiai(`Phiếu nhà thầu đã gửi mà Ban QLDA chưa ký · số do agent Nghiệm thu tính lúc ${lucVn(luc)} · quá nhiều giờ nhất trên đầu`));
  return { phan };
}

/** VS-1 Việc sắp đến lúc làm (7 ngày tới) — «nhìn tới»: thẻ mỗi việc, việc găng trên đầu rồi việc chậm so với Baseline nhiều nhất */
function vs1(n: NguCanh, ds: DauDuAn[]): KhoiIn {
  const phan: PhanIn[] = [];
  const sachTen: string[] = [];
  let tong = 0;
  let gang = 0;
  let khoang = "";
  let danhGia: string | null = null;
  for (const x of ds.filter((y) => y.coTienDo)) {
    const s = soCua(n.d.khoi, x.maDuAn, (o) => o.viecSapToi);
    if ("loi" in s) {
      phan.push(thieu(tenNgan(x, 24), s.loi));
      continue;
    }
    khoang = khoang || khoangNgay(s.so.tuNgay, s.so.denNgay);
    danhGia = danhGia ?? s.so.ngayDanhGia;
    const viec = s.so.viec.slice().sort((a, b) => Number(b.gang) - Number(a.gang) || (b.chamBaseline ?? -99999) - (a.chamBaseline ?? -99999));
    if (viec.length === 0) {
      sachTen.push(tenNgan(x, 24));
      continue;
    }
    const nGang = viec.filter((v) => v.gang).length;
    tong += viec.length;
    gang += nGang;
    phan.push(duAn(tenNgan(x, 24), ` · ${viec.length} việc${nGang > 0 ? `, ${nGang} việc trên đường găng` : ""}`));
    for (const v of viec) {
      const nhom = v.nhom ? ` (${boMa(v.nhom)})` : "";
      const lich = [v.duBaoBatDau ? `dự báo khởi công ${fmtDate(v.duBaoBatDau)}` : "", v.duBaoXong ? `xong ${fmtDate(v.duBaoXong)}` : ""].filter(Boolean).join(" · ");
      phan.push(the(`${v.gang ? "⛓ " : ""}${tenDai(v.ten)}${nhom}`, [lich, v.cauBaseline ?? `chưa có số so với ${TEN_HE.baseline}`, v.nhaThau ? `thầu: ${v.nhaThau}` : ""].filter(Boolean).join(" · ")));
    }
  }
  if (tong > 0) phan.unshift({ k: "chu", dong: [{ d: `${tong} việc` }, ` sắp khởi công hoặc phải xong trong ${khoang}${gang > 0 ? ` · ${gang} việc nằm trên đường găng` : ""}`] });
  if (sachTen.length > 0) phan.push(sach(sachTen, "không có việc nào sắp khởi công hoặc phải xong trong 7 ngày tới"));
  if (tong > 0) {
    const cu = danhGia ? daysBetween(danhGia, n.d.bc.ngay) : 0;
    phan.push(chuGiai(`Việc chưa xong có ngày khởi công hoặc ngày xong (theo dự báo hay ${TEN_HE.baseline}) rơi vào kỳ này · ⛓ = việc găng · việc găng trên đầu rồi việc chậm nhiều nhất · số do agent Tiến độ tính${danhGia ? ` theo ngày ${fmtDate(danhGia)}${cu > 1 ? `, đã cũ ${cu} ngày` : ""}` : ""}`));
  }
  return { phan };
}

/** «30/10/2026» → số để so (0 = không đọc được) */
const ngayDmy = (s: string | null): number => {
  const m = /(\d{2})\/(\d{2})\/(\d{4})/.exec(s ?? "");
  return m ? Number(`${m[3]}${m[2]}${m[1]}`) : 0;
};

/** PL-2 Hồ sơ pháp lý sắp đến hạn (30 ngày tới) — «nhìn tới»: gần hạn nhất trên đầu, nói rõ hồ sơ gốc đang chặn */
function pl2(n: NguCanh, ds: DauDuAn[]): KhoiIn {
  const loc = n.d.loc;
  const phan: PhanIn[] = [];
  const sachTen: string[] = [];
  const goc = new Map<string, number>();
  let tong = 0;
  let khoang = "";
  let gan: { ten: string; han: number; cau: string } | null = null;
  for (const x of ds) {
    if (loc && !loc.thayHet && !loc.thay("phaply", x.maDuAn)) {
      phan.push(duAn(tenNgan(x, 24), `: ${AN_MAT}`));
      continue;
    }
    const s = soCua(n.d.khoi, x.maDuAn, (o) => o.lichHoSo);
    if ("loi" in s) {
      phan.push(thieu(tenNgan(x, 24), s.loi));
      continue;
    }
    khoang = khoang || s.so.khoang;
    const hs = s.so.hoSo.slice().sort((a, b) => (ngayDmy(a.han) || 99999999) - (ngayDmy(b.han) || 99999999));
    if (hs.length === 0) {
      sachTen.push(tenNgan(x, 24));
      continue;
    }
    tong += hs.length;
    phan.push(duAn(tenNgan(x, 24), ` · ${hs.length} hồ sơ sắp đến hạn`));
    for (const h of hs) {
      const cho = h.dangCho ? boMa(h.dangCho.replace(/^đang chờ hồ sơ gốc\s*/i, "")) : "";
      if (cho) goc.set(cho, (goc.get(cho) ?? 0) + 1);
      const han = ngayDmy(h.han);
      if (han > 0 && (!gan || han < gan.han)) gan = { ten: boMa(h.ten), han, cau: h.tinhHinh ?? "" };
      phan.push(
        the(
          tenDai(h.ten),
          [[h.tinhHinh ?? "chưa rõ hạn", h.coQuan, h.trangThai ? h.trangThai.toLowerCase() : null].filter(Boolean).join(" · "), cho ? `đang chờ hồ sơ gốc: ${cho}` : ""].filter(Boolean).join("\n  "),
        ),
      );
    }
  }
  if (tong > 0) {
    const chan = Array.from(goc).sort((a, b) => b[1] - a[1])[0];
    phan.unshift({
      k: "chu",
      dong: [{ d: `${tong} hồ sơ pháp lý` }, ` sắp đến hạn phải có trong ${khoang}${gan ? ` · gần nhất: ${gan.ten} — ${gan.cau}` : ""}${chan && chan[1] >= 2 ? ` · ${chan[1]} hồ sơ cùng đang chờ «${rut(chan[0], 90)}»` : ""}`],
    });
  }
  if (sachTen.length > 0) phan.push(sach(sachTen, "không có hồ sơ nào sắp đến hạn trong 30 ngày tới"));
  if (tong > 0) phan.push(chuGiai("Hồ sơ chưa xong, hạn phải có trong kỳ này · gần hạn nhất trên đầu · hồ sơ đã quá hạn nằm ở khối «Hồ sơ pháp lý quá hạn» · số do agent Pháp lý tính"));
  return { phan };
}

/** NT-3 Đã làm mà chưa nghiệm thu — thẻ mỗi hạng mục; lâu nhất trên đầu */
function nt3(n: NguCanh, ds: DauDuAn[]): KhoiIn {
  const phan: PhanIn[] = [];
  const sachTen: string[] = [];
  const tatCa: { hm: string; ngay: number }[] = [];
  let luc: string | null = null;
  let nguong: number | null = null;
  let denNgay: string | null = null;
  for (const x of ds) {
    const s = soCua(n.d.khoi, x.maDuAn, (o) => o.soLieuNt);
    if ("loi" in s) {
      phan.push(thieu(tenNgan(x, 24), s.loi));
      continue;
    }
    const p = s.so.noQuaHan;
    luc = luc ?? s.so.tinhLuc;
    nguong = nguong ?? p.nguongNgay;
    denNgay = denNgay ?? s.so.ngayThiCongMoiNhat;
    if (p.cac.length === 0) {
      sachTen.push(tenNgan(x, 24));
      continue;
    }
    phan.push(duAn(tenNgan(x, 24), ` · ${p.cac.length} hạng mục có việc đã thi công quá ${p.nguongNgay ?? "?"} ngày chưa nghiệm thu`));
    for (const c of p.cac.slice().sort((a, b) => soTrongMuc(b.muc) - soTrongMuc(a.muc))) {
      // Tiêu đề thẻ: «<hạng mục>: 3 dòng BOQ thi công rồi quá 7 ngày chưa nghiệm thu»
      const m = /^(.*?):\s*(\d+)\s+dòng BOQ/.exec(c.tieuDe);
      const hm = boMa(m?.[1] ?? c.tieuDe);
      const soDong = m ? Number(m[2]) : null;
      tatCa.push({ hm, ngay: soTrongMuc(c.muc) });
      phan.push(the(hm, `${soDong === null ? "có dòng BOQ" : `${soDong} dòng BOQ`} đã thi công mà quá ${p.nguongNgay ?? "?"} ngày vẫn chưa có biên bản nghiệm thu đã ký · ${c.muc}`));
    }
  }
  // Dòng đầu (KE-HOACH/36, 28/10): toàn dự án đã thi công bao nhiêu, nghiệm thu bao nhiêu — Nghiệm thu tính, Main chỉ in
  const toanDa: PhanIn[] = [];
  for (const x of ds) {
    const c = soCua(n.d.khoi, x.maDuAn, (o) => o.doiChieuKl);
    if ("so" in c && c.so.ptThiCong !== null && c.so.ptNghiemThu !== null) {
      toanDa.push({ k: "chu", dong: [`Toàn dự án ${tenNgan(x, 24)}: đã thi công `, { d: `${fmtSo(c.so.ptThiCong, 1)}%` }, ` giá trị, đã nghiệm thu `, { d: `${fmtSo(c.so.ptNghiemThu, 1)}%` }, `${c.so.ptConNo !== null ? `, còn nợ nghiệm thu ${fmtSo(c.so.ptConNo, 1)}%` : ""}${c.so.bienBanXong ? ` · ${c.so.bienBanXong} biên bản đã ký` : ""}`] });
    }
  }
  if (tatCa.length > 0) {
    const lau = tatCa.slice().sort((a, b) => b.ngay - a.ngay)[0]!;
    phan.unshift(...toanDa);
    phan.unshift({ k: "chu", dong: [{ d: `${tatCa.length} hạng mục` }, ` đã thi công quá ${nguong ?? "?"} ngày mà chưa nghiệm thu · lâu nhất ${lau.ngay} ngày: ${lau.hm}`] });
  }
  if (sachTen.length > 0) phan.push(sach(sachTen, `không có hạng mục nào thi công quá ${nguong ?? "ngưỡng"} ngày mà chưa nghiệm thu`));
  if (luc) phan.push(chuGiai(`Tính theo số thi công Tiến độ ghi nhận${denNgay ? ` tới ${fmtDate(denNgay)}` : ""} · số do agent Nghiệm thu tính lúc ${lucVn(luc)} · lâu nhất trên đầu`));
  return { phan };
}

/** CT-1 Nhân lực · máy ngoài công trường — thẻ mỗi thầu phụ; cam kết chỉ in cho người được xem hợp đồng */
function ct1(n: NguCanh, ds: DauDuAn[]): KhoiIn {
  const loc = n.d.loc;
  const thayHd = (ma: string) => !loc || loc.thayHet || loc.thay("hopdong", ma);
  const phan: PhanIn[] = [];
  let tongNc = 0;
  let tongMay = 0;
  let soThau = 0;
  let soDa = 0;
  for (const x of ds.filter((y) => y.coTienDo)) {
    const s = soCua(n.d.khoi, x.maDuAn, (o) => o.nguonLuc);
    if ("loi" in s) {
      phan.push(thieu(tenNgan(x, 24), s.loi));
      continue;
    }
    const k = s.so;
    soDa++;
    phan.push(duAn(tenNgan(x, 24), ` · kỳ ${khoangNgay(k.tuNgay, k.denNgay)}${k.cuNgay > 0 ? ` — báo cáo mới nhất đã cũ ${k.cuNgay} ngày so với hôm qua` : ""}`));
    for (const d of k.dong.slice().sort((a, b) => (b.nhanCongBinhQuan ?? 0) - (a.nhanCongBinhQuan ?? 0))) {
      soThau++;
      tongNc += d.nhanCongBinhQuan ?? 0;
      tongMay += d.mayChinhBinhQuan ?? 0;
      phan.push(the(d.thauPhu, `nhân công bình quân ${d.nhanCongBinhQuan === null ? "chưa rõ" : fmtSo(d.nhanCongBinhQuan, 1)} người · máy chính bình quân ${d.mayChinhBinhQuan === null ? "chưa rõ" : fmtSo(d.mayChinhBinhQuan, 1)} · có báo cáo ${d.soNgayCoBc ?? "?"} ngày trong kỳ`));
    }
    if (thayHd(x.maDuAn) && k.camKet) {
      const coSo = k.camKet.filter((c) => c.nhanCong !== null || c.may !== null);
      if (coSo.length > 0) for (const c of coSo) phan.push(cap2(`Hợp đồng ${c.hopDong}${c.nhaThau ? ` (${c.nhaThau})` : ""} cam kết ${c.nhanCong ?? "?"} người, ${c.may ?? "?"} máy`));
      else phan.push(cap2("Hợp đồng chỉ cam kết nhân lực / máy bằng lời, không ghi số — nên chưa so được với cam kết"));
    }
  }
  if (soThau > 0) phan.unshift({ k: "chu", dong: [{ d: `${soThau} thầu phụ` }, ` báo cáo huy động ở ${soDa} dự án · cộng nhân công bình quân ${fmtSo(tongNc, 1)} người, máy chính ${fmtSo(tongMay, 1)}`] });
  if (soThau > 0) phan.push(chuGiai("Bình quân trong kỳ 7 ngày theo ô «Chi tiết nguồn lực» của báo cáo ngày nhà thầu · thầu phụ nhiều người nhất trên đầu"));
  return { phan };
}

/** CT-2 Công trường báo cáo ngày gần nhất — thẻ mỗi nhà thầu + dòng việc làm, ngoài BOQ, vướng mắc kèm đề xuất */
function ct2(n: NguCanh, ds: DauDuAn[]): KhoiIn {
  const phan: PhanIn[] = [];
  let soBc = 0;
  let soVuong = 0;
  let ngayMoi = "";
  const kl = (v: { kl: number | null; donVi: string | null }): string => (v.kl === null ? "" : ` ${fmtSo(v.kl, 2)}${v.donVi ? ` ${v.donVi}` : ""}`);
  for (const x of ds.filter((y) => y.coTienDo)) {
    const s = soCua(n.d.khoi, x.maDuAn, (o) => o.nhatKy);
    if ("loi" in s) {
      phan.push(thieu(tenNgan(x, 24), s.loi));
      continue;
    }
    const k = s.so;
    if (k.ngay > ngayMoi) ngayMoi = k.ngay;
    phan.push(duAn(tenNgan(x, 24), ` · báo cáo ngày ${fmtDate(k.ngay)}${k.cuNgay > 0 ? ` — đã cũ ${k.cuNgay} ngày so với hôm qua` : ""} · ${k.bao.length} nhà thầu báo cáo`));
    for (const b of k.bao) {
      soBc++;
      const troi = b.thoiTiet ? `thời tiết ${b.thoiTiet.toLowerCase()}${b.anhHuongThoiTiet && !/không/i.test(b.anhHuongThoiTiet) ? ` — ${b.anhHuongThoiTiet.toLowerCase()}` : ""}` : "chưa ghi thời tiết";
      phan.push(the(b.nhaThau, `${b.soNhanCong + b.soMay === 0 ? "báo cáo chưa ghi nhân công, máy" : `${b.soNhanCong} nhân công, ${b.soMay} máy`} · ${troi}`));
      if (b.viec.length > 0) phan.push(cap2("Làm: ", b.viec.map((v) => `${boMa(v.ten)}${kl(v)}`).join(" ; ")));
      else phan.push(cap2("Không ghi việc nào thi công trong ngày"));
      if (b.ngoaiBoq.length > 0) phan.push(cap2("Ngoài BOQ: ", b.ngoaiBoq.map((v) => `${boMa(v.ten)}${kl(v)}`).join(" ; ")));
      for (const v of b.vuongMac) {
        soVuong++;
        phan.push(cap2({ d: "Vướng mắc" }, `: ${boMa(v.ten)} — ${v.vuongMac}${v.giaiPhap ? ` → đề xuất: ${v.giaiPhap}` : ""}`));
      }
    }
  }
  if (soBc > 0) phan.unshift({ k: "chu", dong: [{ d: `${soBc} nhà thầu` }, ` báo cáo ngày ${ngayMoi ? fmtDate(ngayMoi) : "gần nhất"} · `, { d: `${soVuong} vướng mắc` }, " cần Ban QLDA gỡ"] });
  if (soBc > 0) phan.push(chuGiai("Lấy từ báo cáo ngày nhà thầu nộp ở agent Tiến độ · ngày mới nhất có báo cáo trong 7 ngày qua"));
  return { phan };
}

// ─────────────────────────────────────────────────────────────
// Ráp cả bản
// ─────────────────────────────────────────────────────────────

/** Dựng tiêu đề + từng khối + phần cuối cho một người nhận — không bao giờ trả bản rỗng (im lặng dễ nhầm với hỏng, 6.3) */
/**
 * G8 (28/10): dòng «Chưa hỏi được» lấy từ lần dựng báo cáo lúc 07:00; số khối của hôm nay có thể đã lấy được từ chính agent đó.
 * Agent + dự án nào hôm nay ĐÃ có số khối thì bỏ khỏi dòng cảnh báo — khỏi mâu thuẫn «không có lượt nào» với «chưa hỏi được».
 */
function thieuConHieuLuc(thieu: readonly DongThieu[], khoi: DuLieuKhoi | null): DongThieu[] {
  if (!khoi) return thieu.slice();
  const truong: Record<string, readonly (keyof DuLieuKhoiDuAn)[]> = {
    "Nghiệm thu": ["lichNt"],
    "Hợp đồng": ["tien", "phieuGia"],
    "Pháp lý": ["hoSo", "hanChuTruong"],
    "Công việc": ["taiViec"],
  };
  return thieu.filter((x) => {
    const cac = truong[tenNganAgent(x.ten)];
    if (!cac || !x.maDuAn) return true;
    const o = khoi.theoDuAn[x.maDuAn];
    return !(o && cac.every((c) => (o[c] as { ok?: boolean } | undefined)?.ok === true));
  });
}

export function dungBoKhoi(d: DauVaoBoKhoi): BanBoKhoi {
  const { bc, thamSo: t } = d;
  const dayDu = d.dayDu === true;
  const loc = apChuDe(bc.vanDe ?? [], t);
  const locDo = apChuDe(bc.viecDoKhac ?? [], t);
  const n: NguCanh = { d, vanDe: loc.ds, viecDo: locDo.ds, dayDu };
  const lienKetIssue = bc.lienKetIssue ?? "/alerts";
  const diaChi = bc.diaChiMain ?? lienKetIssue.replace(/\/alerts$/, "");

  const khoi: KhoiDaDung[] = [];
  const coMat = new Set<string>();
  for (const k of d.boKhoi) {
    const mo = KHOI_THEO_MA.get(k.ma);
    if (!mo) continue;
    const anh: KhoiDaDung["anh"] = [];
    let than: string[] = [];
    let kin: KhoiIn | undefined;
    if (k.phamVi === "du-an-chon" && d.duAnChon !== null && d.duAnChon.length === 0) {
      than = [`Chưa chọn dự án nào cho khối này — chọn ở ${diaChi}/bao-cao?tab=sang`];
    } else {
      const ds = duAnCuaKhoi(bc, k, d.duAnChon);
      ds.forEach((x) => coMat.add(x.maDuAn));
      switch (k.ma) {
        case "TQ-1": kin = tq1(n, k, ds); break;
        case "TQ-2": kin = tq2(n, ds, anh); break;
        case "TQ-4": kin = tq4(n, k, ds, anh); break;
        case "TQ-5": kin = tq5(n, ds); break;
        case "RQ-1": kin = rq1(n, k, ds); break;
        case "RQ-2": kin = rq2(n, ds, anh); break;
        case "RQ-3": kin = rq3(n, ds); break;
        case "RQ-4": kin = rq4(n, ds); break;
        case "RQ-5": kin = rq5(n, k, ds, anh); break;
        case "RQ-6": kin = rq6(n, k, ds, anh); break;
        case "DA-1": kin = da1(n, k, ds); break;
        case "DA-2": kin = da2(n, k, ds); break;
        case "DA-3": kin = da3(n, ds, anh); break;
        case "DA-4": kin = da4(n, ds, anh); break;
        case "NT-1": kin = nt1(n, k, ds); break;
        case "NT-2": kin = nt2(n, ds); break;
        case "NT-3": kin = nt3(n, ds); break;
        case "CT-1": kin = ct1(n, ds); break;
        case "CT-2": kin = ct2(n, ds); break;
        case "VS-1": kin = vs1(n, ds); break;
        case "PL-2": kin = pl2(n, ds); break;
      }
      if (ds.length === 0) than = ["Chưa có dự án nào có tiến độ hoặc có việc trong phạm vi này"];
    }
    const pv = k.phamVi === "du-an-chon" ? " (dự án tôi chọn)" : "";
    // Khối dựng bằng KhoiIn (TQ-4, DA-2, NT-1): chữ thuần, HTML Telegram và bảng web cùng lấy từ MỘT cấu trúc
    if (kin) {
      const kx = xepPhan(kin);
      const manh = manhHtml(`${mo.ten}${pv}`, kx);
      khoi.push({ ma: k.ma, ten: mo.ten, chu: [dauChuThuan(`${mo.ten}${pv}`, kx), ...phanChuThuan(kx)].join("\n"), html: manh.join("\n"), manh, kin: kx, anh });
      continue;
    }
    khoi.push({ ma: k.ma, ten: mo.ten, chu: [`▍${mo.ten}${pv}`, ...than].join("\n"), anh });
  }

  let dau = `📋 Báo cáo sáng ${ngayDayDu(bc.ngay)}${coMat.size > 0 ? ` — ${coMat.size} dự án` : ""}`;
  // G9 (28/10): «SÁNG NAY CẦN BIẾT» — tối đa 5 câu kết luận của các khối nặng nhất trong bộ của người này; bản đầy đủ vẫn ở phía dưới, không cắt gì
  const UU_TIEN: readonly MaKhoi[] = ["TQ-1", "RQ-1", "DA-4", "RQ-2", "RQ-6", "RQ-5", "VS-1", "PL-2", "DA-1", "RQ-4", "TQ-4", "NT-3", "NT-2", "NT-1"];
  const tomTat: string[] = [];
  for (const ma of UU_TIEN) {
    const kd = khoi.find((x) => x.ma === ma && x.kin);
    const c = kd?.kin ? cauKetLuan(kd.kin) : null;
    if (kd && c && !/^(Không có|Chưa)/.test(c)) tomTat.push(`▸ ${kd.ten}: ${c}`);
    if (tomTat.length >= 5) break;
  }
  if (tomTat.length >= 2) dau = [dau, "", "SÁNG NAY CẦN BIẾT", ...tomTat].join("\n");
  const cuoi: string[] = [...dongChuaHoiDuoc(thieuConHieuLuc(bc.thieuSot, d.khoi), coMat, t.chuaHoiDuoc)];
  const soBo = loc.soBo + locDo.soBo;
  if (t.boChuDe.length > 0 || t.tapTrungChuDe.length > 0) {
    const p: string[] = [];
    if (t.boChuDe.length > 0) p.push(`bỏ ${t.boChuDe.map((c) => `«${c}»`).join(", ")}${soBo > 0 ? ` (đã giấu ${soBo} dòng)` : ""}`);
    if (t.tapTrungChuDe.length > 0) p.push(`tập trung ${t.tapTrungChuDe.map((c) => `«${c}»`).join(", ")}`);
    cuoi.push(`📌 Kịch bản riêng: ${p.join(" · ")}`);
  }
  if (bc.luatApDung.length > 0) cuoi.push(`📌 Luật đang áp: ${bc.luatApDung.map((l) => `«${l.noiDung}» (${l.moTaHieuLuc})`).join(" · ")}`);
  // T10: bản Telegram đã đủ dòng — liên kết chỉ để mở trang, không «xem đủ»
  cuoi.push(`Trang báo cáo: ${diaChi}/bao-cao?tab=sang`);
  if (khoi.length === 0) khoi.push({ ma: "TQ-1", ten: "", chu: `Chưa có khối nào trong báo cáo này — kéo khối vào ở ${diaChi}/bao-cao?tab=sang`, anh: [] });
  return { dau, khoi, cuoi: cuoi.join("\n") };
}

/**
 * Mảnh quá dài cho một tin (bảng rất nhiều dòng, câu rất dài): chia thành nhiều mảnh nhỏ hơn `tran`, không làm hở thẻ —
 * bảng <pre> chia theo dòng và mỗi phần tự bọc <pre>; mảnh khác chia theo dòng, dòng vẫn quá dài thì chia theo ký tự.
 */
function chiaManh(m: string, tran: number): string[] {
  if (m.length <= tran) return [m];
  const pre = /^<pre>([\s\S]*)<\/pre>$/.exec(m);
  const boc = pre ? (s: string) => `<pre>${s}</pre>` : (s: string) => s;
  const dong = (pre ? pre[1]! : m).split("\n");
  const ra: string[] = [];
  let cur: string[] = [];
  const day = () => {
    if (cur.length > 0) ra.push(boc(cur.join("\n")));
    cur = [];
  };
  for (const d of dong) {
    if (boc([...cur, d].join("\n")).length > tran) day();
    if (boc(d).length > tran && !pre) {
      for (let i = 0; i < d.length; i += tran) ra.push(d.slice(i, i + tran));
      continue;
    }
    cur.push(d);
  }
  day();
  return ra;
}

/**
 * Đóng gói tin Telegram theo MẢNH — T10 (Mr. Đại chốt 27/10): KHÔNG trần số tin, KHÔNG «… còn N mục — xem ở Main».
 * Khối vừa tin đang mở thì nối vào; không vừa thì sang tin mới; khối dài hơn một tin thì chia ở ranh giới mảnh, tin sau mở bằng
 * «<tên khối> (tiếp)». Mỗi mảnh đóng đủ thẻ nên không bao giờ hở <b>/<pre>/<blockquote>.
 */
export function dongGoiManh(dau: string, khoi: readonly (readonly string[])[], cuoi: string, tran: number, tiep: (dauKhoi: string) => string): string[] {
  const tranTin = tran - 60; // chừa chỗ cho «📋 (tiếp k/n)»
  const tin: string[][] = [[dau]];
  const ghep = (ds: readonly string[]) => ds.join("\n\n");
  for (const k of khoi) {
    if (k.length === 0) continue;
    const ca = k.join("\n");
    const cur = tin[tin.length - 1]!;
    if (ghep([...cur, ca]).length <= tranTin) {
      cur.push(ca);
      continue;
    }
    if (ca.length <= tranTin) {
      tin.push([ca]);
      continue;
    }
    // Khối dài hơn một tin: đi từng mảnh
    const manh = k.flatMap((m) => chiaManh(m, tranTin - 200));
    let dang: string[] = [];
    const dangLa = () => tin[tin.length - 1]!;
    const daBatDau = () => dang.length > 0;
    for (const m of manh) {
      const thu = [...dang, m].join("\n");
      if (ghep([...dangLa().slice(0, daBatDau() ? -1 : undefined), thu]).length <= tranTin) {
        if (daBatDau()) dangLa()[dangLa().length - 1] = thu;
        else dangLa().push(thu);
        dang = [...dang, m];
        continue;
      }
      // Sang tin mới: tiêu đề «(tiếp)» nếu khối đã in dở ở tin trước
      const mo = daBatDau() ? [tiep(k[0]!), m] : [m];
      tin.push([mo.join("\n")]);
      dang = mo;
    }
  }
  const cuoiTin = tin[tin.length - 1]!;
  if (ghep([...cuoiTin, cuoi]).length <= tranTin) cuoiTin.push(cuoi);
  else tin.push([cuoi]);
  const n = tin.length;
  return tin.map((ds, i) => (i === 0 ? ghep(ds) : ghep([`📋 (tiếp ${i + 1}/${n})`, ...ds])));
}

/** Bản Telegram: tin chữ (đủ dòng, bao nhiêu tin cũng được — T10) + tối đa 2 ảnh theo thứ tự khối (chốt 7) */
export function ketXuatBoKhoi(d: DauVaoBoKhoi): { tin: string[]; tinHtml: string[]; anh: { dacTa: DacTaAnh; chuThich: string }[] } {
  const b = dungBoKhoi({ ...d, dayDu: false });
  const tran = d.tran ?? TRAN_MOT_TIN;
  const tin = dongGoiManh(b.dau, b.khoi.map((k) => k.chu.split("\n")), b.cuoi, tran, (dk) => `${dk} (tiếp)`);
  const tinHtml = dongGoiManh(
    thoatHtml(b.dau),
    b.khoi.map((k) => k.manh ?? [thoatHtml(k.chu)]),
    thoatHtml(b.cuoi),
    tran,
    (dk) => dk.replace(/<\/b>/, " (tiếp)</b>"),
  );
  // 27/10 (Mr. Đại duyệt A): bỏ trần 2 ảnh — gửi hết ảnh có nội dung, theo thứ tự khối, thành một album (telegram.ts)
  const anh = b.khoi.flatMap((k) => k.anh);
  return { tin, tinHtml, anh };
}

/** Các khối của một bộ: khối → dự án cần số (để gom-khoi chỉ hỏi đúng chỗ cần) */
export function canCuaBo(bc: BaoCaoSang, boKhoi: readonly ChonKhoi[], duAnChon: readonly string[] | null): Map<MaKhoi, Set<string>> {
  const ra = new Map<MaKhoi, Set<string>>();
  for (const k of boKhoi) {
    if (k.ma === "DA-1") continue; // việc đỏ nằm sẵn trong bản
    const ds = duAnCuaKhoi(bc, k, duAnChon).map((x) => x.maDuAn);
    const s = ra.get(k.ma) ?? new Set<string>();
    ds.forEach((m) => s.add(m));
    ra.set(k.ma, s);
  }
  return ra;
}

/** RQ-1: mỗi dự án cần bao nhiêu việc có cột «kéo COD về» — số dòng lớn nhất trong các người nhận */
export function soKeoVeCuaBo(bc: BaoCaoSang, boKhoi: readonly ChonKhoi[], duAnChon: readonly string[] | null): Map<string, number> {
  const ra = new Map<string, number>();
  for (const k of boKhoi.filter((x) => x.ma === "RQ-1")) {
    const n = soDongCua(k) ?? Number.POSITIVE_INFINITY;
    for (const d of duAnCuaKhoi(bc, k, duAnChon)) ra.set(d.maDuAn, Math.max(ra.get(d.maDuAn) ?? 0, k.gopCongTy ? Math.min(n, 3) : n));
  }
  return ra;
}

/** Gộp nhu cầu của nhiều người nhận: khối → dự án cần số · RQ-1 số việc cần cột «kéo COD về» mỗi dự án */
export function canCuaNguoiNhan(
  bc: BaoCaoSang,
  ds: readonly { boKhoi: readonly ChonKhoi[]; duAnChon: readonly string[] | null }[],
): { can: Map<MaKhoi, Set<string>>; soKeoVe: Map<string, number> } {
  const can = new Map<MaKhoi, Set<string>>();
  const soKeoVe = new Map<string, number>();
  for (const n of ds) {
    canCuaBo(bc, n.boKhoi, n.duAnChon).forEach((s, ma) => {
      const g = can.get(ma) ?? new Set<string>();
      s.forEach((m) => g.add(m));
      can.set(ma, g);
    });
    soKeoVeCuaBo(bc, n.boKhoi, n.duAnChon).forEach((k, m) => soKeoVe.set(m, Math.max(soKeoVe.get(m) ?? 0, k)));
  }
  return { can, soKeoVe };
}
