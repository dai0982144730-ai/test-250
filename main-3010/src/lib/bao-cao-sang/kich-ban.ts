// ============================================================
// KỊCH BẢN BÁO CÁO SÁNG THEO NGƯỜI NHẬN  (file THUẦN — luật 10, màn hình import được)
// MD: PLAN-MAIN-AGENT mục 6.6 · Mr. Đại chốt 04/10/2026
//
// Bốn chốt:
//   1. Kịch bản = BỘ THAM SỐ do code dựng — KHÔNG phải lời dặn để AI viết cả bản.
//      Vì sao: không bịa số; sáng nào cũng đoán được; hỏi các agent MỘT lần rồi
//      dựng N bản, không thêm lượt AI theo số người nhận.
//   2. Góp ý của ai chỉ sửa bản của người đó (kho: kich-ban-kho.ts, khoá = mã người).
//   3. Công dụng: Chủ tịch — biết dự án nào xấu đi · TGĐ — biết việc nào cần mình
//      quyết · PM — danh sách việc phải xử lý hôm nay.
//   4. Ba mẫu xuất phát: Tổng quát · Điều hành · Dự án. Dự án "dữ liệu test" KHÔNG
//      loại ("loại đi làm gì có dự án nào có thông tin để test").
//   5. (04/10 tối) Tổng quát · Điều hành = TOÀN CÔNG TY. Dự án = những dự án CHỌN TAY
//      cho từng người (1 hoặc nhiều, trong danh sách dự án công ty) — "1 PM lại quản lý
//      các dự án khác nhau thuộc nhiều BQL dự án" nên KHÔNG suy từ sơ đồ tổ chức.
//      Danh sách chọn nằm ở kho (`duAnChon`), không phải tham số — một định nghĩa một chỗ.
//
// Đo trước khi làm (bản 04/10): 2 dự án có tiến độ = ~2.500 ký tự; 6 dự án như HV
// ≈ 5.600 → vượt trần 4.000, code cũ CẮT việc cuối. Mẫu nay chia được thành nhiều
// tin (`soTinToiDa`) thay vì cắt.
// ============================================================

import { apDungLuat } from "./luat";
import {
  dongDauDuAn,
  maDuAnImLang,
  motVanDe,
  soAnhHuong,
  soSanhViecKhac,
  soSanhVanDe,
  tenNganAgent,
  type DauDuAn,
  type VanDeSang,
  type ViecKhac,
} from "./luat-cod";
import type { BaoCaoSang, DongThieu } from "./model";
import { ganTenChoMa, rutGonTen, taoTuDien } from "@/lib/chung/ma-kem-ten";
import { fmtSo } from "@/lib/format";

// ─────────────────────────────────────────────────────────────
// 1. Mẫu + tham số
// ─────────────────────────────────────────────────────────────

export type MaMau = "tong-quat" | "dieu-hanh" | "du-an";
export const CAC_MAU: readonly MaMau[] = ["tong-quat", "dieu-hanh", "du-an"];

export const NHAN_MAU: Record<MaMau, string> = {
  "tong-quat": "Tổng quát",
  "dieu-hanh": "Điều hành",
  "du-an": "Dự án",
};

/** Công dụng — câu Mr. Đại chốt 04/10, hiện ngay cạnh ô chọn mẫu */
export const CONG_DUNG_MAU: Record<MaMau, string> = {
  "tong-quat": "Mỗi dự án một dòng COD — biết dự án nào xấu đi (Chủ tịch)",
  "dieu-hanh": "Việc làm chậm COD của mọi dự án + câu hỏi cần quyết (Tổng giám đốc)",
  "du-an": "Chỉ các dự án chọn riêng cho người này: việc làm chậm COD + việc đỏ phải xử lý hôm nay (PM)",
};

export interface ThamSoKichBan {
  /** Dự án chưa có tiến độ: mỗi dự án một dòng · gộp một dòng đếm · không in */
  duAnChuaCoTienDo: "liet-ke" | "dem" | "an";
  /** Số việc làm chậm COD in cho mỗi dự án; null = tất cả; 0 = không in */
  viecCodMoiDuAn: number | null;
  /** Số việc nặng nhất toàn công ty in ở cuối (0 = không in) */
  viecNangNhat: number;
  /** In dòng agent khác cùng mã WBS ("+ Công việc: …") */
  kemAgentKhac: boolean;
  /** In câu hỏi quyết định 🤖 */
  cauHoiAi: boolean;
  /** Việc ĐỎ ngoài luật COD: số việc in mỗi agent mỗi dự án (0 = không có khối này) */
  viecDoMoiAgent: number;
  /** Chỗ chưa hỏi được: gộp một dòng · từng dòng kèm lý do */
  chuaHoiDuoc: "mot-dong" | "chi-tiet";
  /** Bỏ dòng nhắc tới các chủ đề này (so không dấu) */
  boChuDe: string[];
  /** Đẩy lên đầu dòng nhắc tới các chủ đề này */
  tapTrungChuDe: string[];
  /** Tối đa bao nhiêu tin nhắn mỗi sáng — quá thì phần cuối thành "… còn N mục — xem ở Main" */
  soTinToiDa: number;
}

/**
 * Giá trị gốc của ba mẫu. Kho chỉ lưu phần GHI ĐÈ — sửa mẫu ở đây là mọi người theo.
 * 13/10/2026 Mr. Đại: dòng "🏗 … — chưa có tiến độ" lặp mỗi sáng là rác thông tin → cả ba mẫu
 * mặc định "an" (trước: đếm · đếm · liệt kê). Dự án có tiến độ hoặc có việc thì tự hiện.
 */
export const THAM_SO_MAU: Record<MaMau, ThamSoKichBan> = {
  "tong-quat": {
    duAnChuaCoTienDo: "an",
    viecCodMoiDuAn: 0,
    viecNangNhat: 1,
    kemAgentKhac: false,
    cauHoiAi: false,
    viecDoMoiAgent: 0,
    chuaHoiDuoc: "mot-dong",
    boChuDe: [],
    tapTrungChuDe: [],
    soTinToiDa: 1,
  },
  "dieu-hanh": {
    duAnChuaCoTienDo: "an",
    viecCodMoiDuAn: 5,
    viecNangNhat: 0,
    kemAgentKhac: true,
    cauHoiAi: true,
    viecDoMoiAgent: 0,
    chuaHoiDuoc: "mot-dong",
    boChuDe: [],
    tapTrungChuDe: [],
    soTinToiDa: 2,
  },
  "du-an": {
    duAnChuaCoTienDo: "an",
    viecCodMoiDuAn: null,
    viecNangNhat: 0,
    kemAgentKhac: true,
    cauHoiAi: true,
    viecDoMoiAgent: 3,
    chuaHoiDuoc: "chi-tiet",
    boChuDe: [],
    tapTrungChuDe: [],
    soTinToiDa: 3,
  },
};

/** Tả từng tham số bằng lời thường — màn hình hiện, và (Đợt 2) đưa AI đọc góp ý */
export const MO_TA_THAM_SO: Record<keyof ThamSoKichBan, string> = {
  duAnChuaCoTienDo: "Dự án chưa có tiến độ và chưa có việc nào: không in / gộp một dòng đếm / mỗi dự án một dòng",
  viecCodMoiDuAn: "Số việc làm chậm COD in cho mỗi dự án (trống = tất cả, 0 = không in)",
  viecNangNhat: "Số việc nặng nhất toàn công ty in ở cuối",
  kemAgentKhac: "In dòng agent khác cùng mã WBS",
  cauHoiAi: "In câu hỏi quyết định 🤖",
  viecDoMoiAgent: "Số việc đỏ ngoài luật COD in cho mỗi agent mỗi dự án (0 = không in)",
  chuaHoiDuoc: "Chỗ chưa hỏi được: gộp một dòng / từng dòng kèm lý do",
  boChuDe: "Bỏ dòng nhắc tới các chủ đề",
  tapTrungChuDe: "Đẩy lên đầu dòng nhắc tới các chủ đề",
  soTinToiDa: "Tối đa bao nhiêu tin nhắn mỗi sáng",
};

function soNguyen(v: unknown, min: number, max: number): number | undefined {
  return typeof v === "number" && Number.isInteger(v) && v >= min && v <= max ? v : undefined;
}

function dsChu(v: unknown, toiDa = 10, daiToiDa = 60): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const ra = v
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim())
    .filter((x) => x !== "" && x.length <= daiToiDa);
  return ra.filter((x, i) => ra.indexOf(x) === i).slice(0, toiDa);
}

/**
 * Lọc một bộ ghi đè thô (từ đĩa, từ màn hình, hoặc Đợt 2 từ AI đọc góp ý): chỉ giữ
 * khoá biết + giá trị đúng kiểu, đúng khoảng. Sai thì BỎ khoá đó, không đoán.
 */
export function chuanHoaGhiDe(v: unknown): Partial<ThamSoKichBan> {
  if (typeof v !== "object" || v === null) return {};
  const o = v as Record<string, unknown>;
  const ra: Partial<ThamSoKichBan> = {};
  if (o.duAnChuaCoTienDo === "liet-ke" || o.duAnChuaCoTienDo === "dem" || o.duAnChuaCoTienDo === "an") {
    ra.duAnChuaCoTienDo = o.duAnChuaCoTienDo;
  }
  if (o.viecCodMoiDuAn === null) ra.viecCodMoiDuAn = null;
  else {
    const n = soNguyen(o.viecCodMoiDuAn, 0, 50);
    if (n !== undefined) ra.viecCodMoiDuAn = n;
  }
  const nang = soNguyen(o.viecNangNhat, 0, 10);
  if (nang !== undefined) ra.viecNangNhat = nang;
  if (typeof o.kemAgentKhac === "boolean") ra.kemAgentKhac = o.kemAgentKhac;
  if (typeof o.cauHoiAi === "boolean") ra.cauHoiAi = o.cauHoiAi;
  const vd = soNguyen(o.viecDoMoiAgent, 0, 20);
  if (vd !== undefined) ra.viecDoMoiAgent = vd;
  if (o.chuaHoiDuoc === "mot-dong" || o.chuaHoiDuoc === "chi-tiet") ra.chuaHoiDuoc = o.chuaHoiDuoc;
  const bo = dsChu(o.boChuDe);
  if (bo) ra.boChuDe = bo;
  const ky = dsChu(o.tapTrungChuDe);
  if (ky) ra.tapTrungChuDe = ky;
  const tin = soNguyen(o.soTinToiDa, 1, 5);
  if (tin !== undefined) ra.soTinToiDa = tin;
  return ra;
}

/** Tham số hiệu lực = mẫu gốc + phần ghi đè của người đó */
export function thamSoHieuLuc(mau: MaMau, ghiDe: Partial<ThamSoKichBan> = {}): ThamSoKichBan {
  return { ...THAM_SO_MAU[mau], ...chuanHoaGhiDe(ghiDe) };
}

export function laMaMau(v: unknown): v is MaMau {
  return v === "tong-quat" || v === "dieu-hanh" || v === "du-an";
}

// ─────────────────────────────────────────────────────────────
// 2. Kết xuất một bản theo kịch bản
// ─────────────────────────────────────────────────────────────

/** Trần một tin Telegram (4.096) chừa 96 ký tự — emoji tính 2 đơn vị */
export const TRAN_MOT_TIN = 4000;

export interface DauVaoKichBan {
  bc: BaoCaoSang;
  mau: MaMau;
  thamSo: ThamSoKichBan;
  /**
   * Mẫu Dự án: các dự án CHỌN TAY cho người này (slug). null = chưa có người cụ thể
   * (xem mẫu trên web) → coi như chọn mọi dự án. Tổng quát · Điều hành bỏ qua trường này.
   */
  duAnChon: readonly string[] | null;
  /** Trần mỗi tin — test truyền nhỏ để thử chia tin */
  tran?: number;
}

export function ngayDayDu(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

/** Cắt chữ dài, không cắt giữa từ */
export function rut(s: string, toiDa: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= toiDa) return t;
  const cat = t.slice(0, toiDa);
  const i = cat.lastIndexOf(" ");
  return `${(i > toiDa * 0.6 ? cat.slice(0, i) : cat).replace(/[\s,;:.\-–—·]+$/, "")}…`;
}

/** Lý do chưa hỏi được, rút gọn cho Telegram: bỏ phần sau ":" / " — " (thường là đường dẫn file, danh sách kho) */
export function lyDoGon(lyDo: string): string {
  const bo = lyDo.replace(/^chưa hỏi được vì\s*/i, "");
  const ve = bo.split(/:\s| — |\. /)[0] ?? bo;
  return rut(ve, 120);
}

/** "Mã + tên ngắn" của một vấn đề (luật 30) — dùng cho dòng "Nặng nhất" */
export function tenNganVanDe(v: VanDeSang): string {
  if (v.wbs && v.tenWbs) return `${v.wbs} ${rutGonTen(v.tenWbs)}`;
  const td = v.tieuDe.replace(/^⛓\s*/, "");
  return rut(v.wbs && !td.includes(v.wbs) ? `${v.wbs} ${td}` : td, 90);
}

/** Dự án nằm trong bản: Tổng quát · Điều hành = toàn công ty; Dự án = đúng các dự án chọn tay */
export function duAnTrongBan(bc: BaoCaoSang, mau: MaMau, duAnChon: readonly string[] | null): DauDuAn[] {
  const tat = bc.duAn ?? [];
  if (mau !== "du-an" || duAnChon === null) return tat;
  return tat.filter((d) => duAnChon.includes(d.maDuAn));
}

/**
 * Xếp dự án: có tiến độ trước → COD lùi so hôm qua nhiều nhất (dự án XẤU ĐI) →
 * chậm so mục tiêu nhiều nhất. Công dụng bản Tổng quát: nhìn dòng đầu là thấy.
 */
export function xepDuAn(ds: readonly DauDuAn[]): DauDuAn[] {
  return ds
    .map((d, i) => ({ d, i }))
    .sort((a, b) => {
      if (a.d.coTienDo !== b.d.coTienDo) return a.d.coTienDo ? -1 : 1;
      const ha = a.d.soHomQua ?? -1e9;
      const hb = b.d.soHomQua ?? -1e9;
      if (ha !== hb) return hb - ha;
      const ca = a.d.chamNgay ?? -1e9;
      const cb = b.d.chamNgay ?? -1e9;
      if (ca !== cb) return cb - ca;
      return a.i - b.i;
    })
    .map((x) => x.d);
}

/** Áp "bỏ / tập trung chủ đề" của RIÊNG người này lên các vấn đề (cùng phép với luật động 6.2) */
export function apChuDe<T extends { tieuDe: string }>(ds: readonly T[], t: ThamSoKichBan): { ds: T[]; soBo: number } {
  if (t.boChuDe.length === 0 && t.tapTrungChuDe.length === 0) return { ds: ds.slice(), soBo: 0 };
  const luat = [
    ...t.boChuDe.map((c) => ({ noiDung: `bỏ mục ${c}` })),
    ...t.tapTrungChuDe.map((c) => ({ noiDung: `tập trung ${c}` })),
  ];
  const kq = apDungLuat(
    ds.map((v) => ({ noiDung: v.tieuDe, v })),
    luat,
  );
  return { ds: kq.dong.map((x) => x.v), soBo: kq.soBiLuatBo };
}

/** Dòng "⚠️ Chưa hỏi được" — chỉ những chỗ thiếu của dự án nằm trong bản (hoặc thiếu ở mọi dự án) */
export function dongChuaHoiDuoc(thieu: readonly DongThieu[], maDuAn: Set<string>, kieu: ThamSoKichBan["chuaHoiDuoc"]): string[] {
  // "Luật động" giấu dòng không phải chỗ chưa hỏi được — nó đã in ở dòng "📌 Luật đang áp"
  const lien = thieu.filter((x) => x.ten !== "Luật động" && (!x.maDuAn || maDuAn.has(x.maDuAn)));
  if (lien.length === 0) return [];
  if (kieu === "chi-tiet") {
    return lien.map((x) => `⚠️ Chưa hỏi được ${tenNganAgent(x.ten)}${x.tenDuAn ? ` ở ${x.tenDuAn}` : ""}: ${lyDoGon(x.lyDo)}`);
  }
  // Gộp theo agent: "Công việc (13 dự án) · Hợp đồng (Nam Khian 1)"
  const theoAgent = new Map<string, { moi: boolean; duAn: string[] }>();
  for (const x of lien) {
    const ten = tenNganAgent(x.ten);
    const g = theoAgent.get(ten) ?? { moi: false, duAn: [] };
    if (!x.maDuAn) g.moi = true;
    else g.duAn.push(x.tenDuAn ?? x.maDuAn);
    theoAgent.set(ten, g);
  }
  const phan = Array.from(theoAgent.entries()).map(([ten, g]) =>
    g.moi ? `${ten} (mọi dự án)` : g.duAn.length <= 2 ? `${ten} (${g.duAn.join(", ")})` : `${ten} (${g.duAn.length} dự án)`,
  );
  return [`⚠️ Chưa hỏi được: ${phan.join(" · ")} — lý do xem trên web`];
}

/** Một dự án theo mẫu Điều hành / Dự án */
function khoiDuAn(
  d: DauDuAn,
  vanDe: readonly VanDeSang[],
  viecDo: readonly ViecKhac[],
  t: ThamSoKichBan,
  mau: MaMau,
  lienKetIssue: string,
): string {
  const p: string[] = [dongDauDuAn(d)];
  if (d.coTienDo || vanDe.length > 0) {
    if (t.viecCodMoiDuAn !== 0) {
      if (vanDe.length === 0) {
        if (d.coTienDo) p.push("✓ Không có việc nào làm chậm COD");
      } else {
        if (mau === "du-an") p.push(`Làm chậm COD (${vanDe.length}):`);
        const giu = t.viecCodMoiDuAn === null ? vanDe.length : Math.min(t.viecCodMoiDuAn, vanDe.length);
        vanDe.slice(0, giu).forEach((v, i) => p.push(motVanDe(v, i + 1, { kem: t.kemAgentKhac, cauHoi: t.cauHoiAi })));
        if (vanDe.length > giu) p.push(`   … còn ${vanDe.length - giu} việc làm chậm COD — xem ở Main`);
      }
    } else if (vanDe.length > 0) {
      p.push(`${vanDe.length} việc làm chậm COD — xem ở Main`);
    }
  }
  if (t.viecDoMoiAgent > 0 && viecDo.length > 0) {
    p.push(`Việc đỏ khác (${viecDo.length}):`);
    const theoAgent = new Map<string, ViecKhac[]>();
    for (const v of viecDo) theoAgent.set(v.tenAgent, [...(theoAgent.get(v.tenAgent) ?? []), v]);
    for (const [tenAgent, ds] of Array.from(theoAgent.entries())) {
      const xep = ds.slice().sort(soSanhViecKhac);
      p.push(`• ${tenAgent} — ${xep.length} việc`);
      for (const v of xep.slice(0, t.viecDoMoiAgent)) {
        // Mã kèm tên (luật 30) đứng riêng, ngăn bằng " · " — để tên việc không dính vào câu vấn đề
        const coMa = v.wbs !== null && !v.tieuDe.includes(v.wbs);
        const ma = coMa ? (v.tenWbs ? `${v.wbs} ${rutGonTen(v.tenWbs)} · ` : `${v.wbs} · `) : "";
        const qh = v.soNgayQuaHan !== null && v.soNgayQuaHan > 0 && !/quá hạn/i.test(v.tieuDe) ? ` — quá hạn ${fmtSo(v.soNgayQuaHan)} ngày` : "";
        const dong = `   - ${v.doLlmSinh ? "🤖 " : ""}${ma}${rut(v.tieuDe, 110)}${qh}`;
        p.push(coMa ? dong : ganTenChoMa(dong, taoTuDien([[v.wbs, v.tenWbs]])));
      }
      if (xep.length > t.viecDoMoiAgent) p.push(`   … còn ${xep.length - t.viecDoMoiAgent} — xem ở ${lienKetIssue}`);
    }
  }
  return p.join("\n");
}

/** Một dòng dự án của bản Tổng quát */
function dongTongQuat(d: DauDuAn, soViecCod: number): string {
  if (!d.coTienDo) {
    return `• ${d.ten} — ${d.loi ?? "chưa có tiến độ"}${soViecCod > 0 ? ` · ${soViecCod} việc làm chậm COD` : ""}`;
  }
  const so = dongDauDuAn(d).split("\n")[1] ?? "";
  return `• ${d.ten}: ${so.replace(/^COD dự báo /, "COD ")}${soViecCod > 0 ? ` · ${soViecCod} việc làm chậm COD` : ""}`;
}

/**
 * DỰNG BẢN CỦA MỘT NGƯỜI NHẬN → danh sách tin nhắn (mỗi tin ≤ trần).
 * Không bao giờ trả mảng rỗng: dự án nào cũng có dòng đầu, không có gì vẫn có tiêu đề
 * + link — im lặng dễ nhầm với hỏng (6.3).
 */
export function ketXuatKichBan(d: DauVaoKichBan): string[] {
  const { bc, mau, thamSo: t } = d;
  const tran = d.tran ?? TRAN_MOT_TIN;
  const lienKetIssue = bc.lienKetIssue ?? "/alerts";
  const diaChi = bc.diaChiMain ?? lienKetIssue.replace(/\/alerts$/, "");
  const duAn = xepDuAn(duAnTrongBan(bc, mau, d.duAnChon));
  const maTrongBan = new Set(duAn.map((x) => x.maDuAn));

  const loc = apChuDe((bc.vanDe ?? []).filter((v) => maTrongBan.has(v.maDuAn)), t);
  const vanDe = loc.ds;
  const viecDoLoc = apChuDe((bc.viecDoKhac ?? []).filter((v) => maTrongBan.has(v.maDuAn)), t);
  const viecDo = viecDoLoc.ds;

  const coTd = duAn.filter((x) => x.coTienDo);
  const chuaTd = duAn.filter((x) => !x.coTienDo && !vanDe.some((v) => v.maDuAn === x.maDuAn));
  // Chưa có tiến độ nhưng CÓ việc đỏ sẽ in ra → luôn in cả khối: không giấu việc chỉ vì thiếu tiến độ
  const coViecDoIn = (ma: string) => mau !== "tong-quat" && t.viecDoMoiAgent > 0 && viecDo.some((v) => v.maDuAn === ma);
  const chuaTdCoViec = chuaTd.filter((x) => coViecDoIn(x.maDuAn));
  // Hỏi tiến độ HỎNG (`loi`) là sự cố → luôn in một dòng. Còn lại là dự án IM LẶNG → theo tham số
  const maImLang = maDuAnImLang(chuaTd, coViecDoIn);
  const suCo = chuaTd.filter((x) => !!x.loi && !coViecDoIn(x.maDuAn));
  const imLang = chuaTd.filter((x) => maImLang.has(x.maDuAn));
  /** Dự án KHÔNG có mặt trong bản — tiêu đề và dòng "chưa hỏi được" bỏ chúng theo */
  const maAn = new Set(t.duAnChuaCoTienDo === "an" ? imLang.map((x) => x.maDuAn) : []);
  const soIn = duAn.length - maAn.size;

  // ── Tiêu đề
  const ngay = ngayDayDu(bc.ngay);
  let dau: string;
  if (mau === "tong-quat") dau = `📋 Báo cáo sáng ${ngay} — ${soIn} dự án`;
  else if (mau === "dieu-hanh") dau = `📋 Báo cáo sáng ${ngay} — việc làm chậm COD (${vanDe.length})`;
  else {
    // Tên trên tiêu đề = dự án có mặt trong bản; cả bản im lặng thì nêu các dự án đã chọn
    const ten = (soIn > 0 ? duAn.filter((x) => !maAn.has(x.maDuAn)) : duAn).map((x) => x.ten);
    dau =
      ten.length === 0
        ? `📋 Báo cáo sáng ${ngay} — chưa chọn dự án`
        : `📋 Báo cáo sáng ${ngay} — việc cần xử lý · ${ten.length <= 2 ? ten.join(" · ") : `${ten.length} dự án`}`;
  }

  // ── Thân: các khối, mỗi khối nguyên vẹn (không cắt giữa khối nếu tránh được)
  const than: string[] = [];
  if (duAn.length === 0) {
    than.push(
      mau === "du-an"
        ? "Chưa chọn dự án nào cho bản này — chọn ở Báo cáo → Sáng → Người nhận báo cáo sáng."
        : "Chưa có dự án nào trong sổ dự án.",
    );
  } else if (mau === "tong-quat") {
    const p: string[] = [];
    for (const x of duAn.filter((y) => !chuaTd.includes(y))) {
      p.push(dongTongQuat(x, vanDe.filter((v) => v.maDuAn === x.maDuAn).length));
    }
    for (const x of suCo) p.push(dongTongQuat(x, 0));
    if (t.duAnChuaCoTienDo === "liet-ke") for (const x of imLang) p.push(dongTongQuat(x, 0));
    else if (t.duAnChuaCoTienDo === "dem" && imLang.length > 0) p.push(`• ${imLang.length} dự án chưa có tiến độ`);
    if (p.length > 0) than.push(p.join("\n"));
  } else {
    for (const x of coTd) {
      than.push(
        khoiDuAn(
          x,
          vanDe.filter((v) => v.maDuAn === x.maDuAn),
          viecDo.filter((v) => v.maDuAn === x.maDuAn),
          t,
          mau,
          lienKetIssue,
        ),
      );
    }
    // Dự án chưa có tiến độ nhưng vẫn có việc (pháp lý, hợp đồng…) — in như dự án thường
    for (const x of duAn.filter((y) => !y.coTienDo && vanDe.some((v) => v.maDuAn === y.maDuAn))) {
      than.push(khoiDuAn(x, vanDe.filter((v) => v.maDuAn === x.maDuAn), viecDo.filter((v) => v.maDuAn === x.maDuAn), t, mau, lienKetIssue));
    }
    for (const x of chuaTdCoViec) than.push(khoiDuAn(x, [], viecDo.filter((v) => v.maDuAn === x.maDuAn), t, mau, lienKetIssue));
    for (const x of suCo) than.push(dongDauDuAn(x));
    if (t.duAnChuaCoTienDo === "liet-ke") for (const x of imLang) than.push(dongDauDuAn(x));
    else if (t.duAnChuaCoTienDo === "dem" && imLang.length > 0) than.push(`🏗 ${imLang.length} dự án chưa có tiến độ`);
  }
  // Cả bản im lặng → MỘT dòng nói rõ, không để tin trống (im lặng dễ nhầm với hỏng — 6.3)
  if (than.length === 0) than.push(`Chưa có việc nào cần báo — ${duAn.length} dự án trong bản này chưa có tiến độ.`);

  if (t.viecNangNhat > 0 && vanDe.length > 0) {
    const nang = vanDe.slice().sort(soSanhVanDe).slice(0, t.viecNangNhat);
    // Tên dự án trong ngoặc cuối dòng: bỏ phần ngoặc của chính tên ("(HV — dữ liệu test)") cho khỏi lồng hai lớp
    const tenDa = (ma: string) => (duAn.find((x) => x.maDuAn === ma)?.ten ?? ma).replace(/\s*\([^)]*\)\s*$/, "");
    than.push(
      nang.length === 1
        ? `Nặng nhất: ${tenNganVanDe(nang[0])} — ${soAnhHuong(nang[0])} (${tenDa(nang[0].maDuAn)})`
        : ["Nặng nhất:", ...nang.map((v, i) => `${i + 1}. ${tenNganVanDe(v)} — ${soAnhHuong(v)} (${tenDa(v.maDuAn)})`)].join("\n"),
    );
  }

  // ── Cuối: chưa hỏi được · luật đang áp · link
  // Chỗ "chưa hỏi được" của dự án không có mặt trong bản thì không in — cùng gốc "dự án chưa có dữ liệu"
  const maCoMat = new Set(Array.from(maTrongBan).filter((m) => !maAn.has(m)));
  const cuoi: string[] = [...dongChuaHoiDuoc(bc.thieuSot, maCoMat, t.chuaHoiDuoc)];
  const soBo = loc.soBo + viecDoLoc.soBo;
  if (t.boChuDe.length > 0 || t.tapTrungChuDe.length > 0) {
    const p: string[] = [];
    if (t.boChuDe.length > 0) p.push(`bỏ ${t.boChuDe.map((c) => `«${c}»`).join(", ")}${soBo > 0 ? ` (đã giấu ${soBo} dòng)` : ""}`);
    if (t.tapTrungChuDe.length > 0) p.push(`tập trung ${t.tapTrungChuDe.map((c) => `«${c}»`).join(", ")}`);
    cuoi.push(`📌 Kịch bản riêng: ${p.join(" · ")}`);
  }
  if (bc.luatApDung.length > 0) {
    cuoi.push(`📌 Luật đang áp: ${bc.luatApDung.map((l) => `«${l.noiDung}» (${l.moTaHieuLuc})`).join(" · ")}`);
  }
  cuoi.push(
    mau === "tong-quat"
      ? `Xem chi tiết: ${diaChi}/bao-cao?tab=sang`
      : mau === "du-an" && duAn.length === 0
        ? `Chọn dự án ở: ${diaChi}/bao-cao?tab=sang`
        : `Xem và xử lý: ${lienKetIssue}`,
  );

  return dongGoiTin(dau, than, cuoi.join("\n"), tran, t.soTinToiDa, lienKetIssue);
}

// ─────────────────────────────────────────────────────────────
// 3. Đóng gói thành tin nhắn
// ─────────────────────────────────────────────────────────────

/** Khối dài hơn trần (hiếm): bỏ NGUYÊN DÒNG từ cuối lên, không cắt giữa câu */
function catKhoi(khoi: string, tran: number): string {
  if (khoi.length <= tran) return khoi;
  const dong = khoi.split("\n");
  while (dong.length > 1 && dong.join("\n").length > tran - 40) dong.pop();
  return `${dong.join("\n")}\n   … (còn nữa — xem ở Main)`;
}

/**
 * Xếp tiêu đề + các khối thân + phần cuối vào ≤ `toiDa` tin, mỗi tin ≤ `tran`.
 *  · Khối không bị cắt đôi giữa hai tin.
 *  · Hết số tin cho phép → các khối còn lại thành MỘT dòng "… còn N mục — xem ở Main".
 *  · Phần cuối (chưa hỏi được, link) LUÔN có ở tin cuối.
 *  · Từ tin thứ hai có dòng "📋 (tiếp k/n)" để người đọc biết đây là phần sau.
 */
export function dongGoiTin(dau: string, than: readonly string[], cuoi: string, tran: number, toiDa: number, lienKet: string): string[] {
  const khoi = than.map((k) => catKhoi(k, tran - 200));
  const tin: string[][] = [[dau]];
  const ghep = (ds: string[]) => ds.join("\n\n");
  let i = 0;
  for (; i < khoi.length; i++) {
    const cur = tin[tin.length - 1];
    if (ghep([...cur, khoi[i]]).length <= tran - 30) {
      cur.push(khoi[i]);
      continue;
    }
    if (tin.length >= toiDa) break;
    tin.push([khoi[i]]);
  }
  let con = khoi.length - i;
  const cuoiCung = tin[tin.length - 1];
  const dongCon = () => (con > 0 ? `… còn ${con} mục chưa in — xem ở Main: ${lienKet}` : "");
  const lap = () => ghep([...cuoiCung, ...(con > 0 ? [dongCon()] : []), cuoi]);
  // Phần cuối không vừa → nhả bớt khối thân của tin cuối (không nhả tiêu đề ở tin đầu)
  const giuToiThieu = tin.length === 1 ? 1 : 0;
  while (lap().length > tran - 30 && cuoiCung.length > giuToiThieu) {
    cuoiCung.pop();
    con += 1;
  }
  tin[tin.length - 1] = [...cuoiCung, ...(con > 0 ? [dongCon()] : []), cuoi];
  const n = tin.length;
  return tin.map((ds, k) => (k === 0 ? ghep(ds) : ghep([`📋 (tiếp ${k + 1}/${n})`, ...ds])));
}
