// ============================================================
// KHUÔN SỔ BẢN 2 — định nghĩa: CHOT/HOP-DONG-KET-NOI mục 7.1
// (Mr. Đại chốt 26/09/2026)
//
// ⛔ TỆP NÀY CHÉP NGUYÊN VĂN Ở 5 AGENT — sửa ở đâu thì chép lại cả 5, đổi
//    `KHUON_SO`. Agent quan sát so khuôn mà `suc_khoe` khai; lệch là một thẻ
//    trong Sổ phát hiện vấn đề. Không import gì của repo.
//      4 app Next : src/lib/nhat-ky/khuon-so.ts
//      Pháp lý    : lib/mcp/khuon-so.ts
//
// VÌ SAO CÓ (đo 26/09): hàm ghi sổ là 4 bản chép tay mắc CÙNG một lỗi — ghi
// "ok" khi bên kia trả KHONG_CO_DU_LIEU (2.675 dòng sai); pháp lý ghi kiểu
// khác hẳn; sổ không có mã chuỗi / dấu vân / nội dung trả lời. Mọi luật "điền
// trường nào, điền gì" nằm Ở ĐÂY để chỗ gọi không phải tự quyết.
//
// Server-only (node:crypto). Không đụng đĩa, không mạng.
// ============================================================

import { createHash, randomBytes } from "node:crypto";

// Sửa 26/09 khuya (lần 4): so_gac (sổ gác của Main) là hạ tầng + quansat được đọc
// Sửa 26/09 tối (lần 3): trần Base.vn 500 ký tự · luật giữ sổ 10/35 ngày (cachGiuDong, rutGonDong)
// Sửa 26/09 tối: chuanHoaTraVe · lỗi lồng · tu_dien_ngu_canh · "khóa" · boQuaGhiNhan theo quyền quansat · cắt không đôi emoji · xuống dòng LF

/** Phiên bản khuôn — `suc_khoe` khai trường `khuon_so` bằng đúng chuỗi này */
export const KHUON_SO = "2.0";
export const PHIEN_BAN_SO = 2;

export const HEADER_MA_LUOT = "x-sci-ma-luot";
export const HEADER_MA_CHUOI = "x-sci-ma-chuoi";
export const HEADER_KIEM_DINH = "x-sci-kiem-dinh";

/** Trần nội dung trả lời ghi vào sổ */
export const TRAN_TRA_LOI = 2000;
/**
 * Trần riêng cho lượt gọi thẳng máy chủ Base.vn (Mr. Đại chốt 26/09): dữ liệu thô bên
 * ngoài, giám khảo không cần đọc hết. Đo 26/09: một lần làm mới khối "Chỗ hai agent
 * nói khác nhau" sinh 105 dòng Base.vn nặng 256 KB ở sổ Base.
 */
export const TRAN_TRA_LOI_BASEVN = 500;

/** Trần nội dung trả lời theo bên trả lời */
export function tranTraLoi(agentTraLoi: string): number {
  return agentTraLoi === "basevn" ? TRAN_TRA_LOI_BASEVN : TRAN_TRA_LOI;
}

// ------------------------------------------------------------
// Giữ sổ theo tuổi (Mr. Đại chốt 26/09): ĐẦY ĐỦ ≤ 10 ngày (tra ngược báo cáo tuần) ·
// GỌN ≤ 35 ngày (tra ngược báo cáo tháng — bỏ nội dung dài) · cũ hơn thì XOÁ.
// Hai mốc chỉnh ở Cài đặt; đây là mặc định. Sổ hỏi–đáp KHÔNG được agent nào dùng
// lại để làm việc (đo 26/09) — xoá chỉ mất khả năng tra ngược bằng tay.
// ------------------------------------------------------------
export const MOC_GIU_DAY_DU_NGAY = 10;
export const MOC_GIU_GON_NGAY = 35;
export type CachGiuDong = "day-du" | "gon" | "xoa";

/** Dòng sổ này giữ thế nào — tính theo NGÀY giờ Việt Nam (UTC+7), hôm nay = tuổi 0 */
export function cachGiuDong(
  thoiDiem: string,
  bayGio: number = Date.now(),
  moc: { dayDu: number; gon: number } = { dayDu: MOC_GIU_DAY_DU_NGAY, gon: MOC_GIU_GON_NGAY },
): CachGiuDong {
  const t = Date.parse(thoiDiem);
  if (!Number.isFinite(t)) return "day-du"; // không đọc được giờ thì không đụng
  const NGAY = 86_400_000;
  const VN = 7 * 3_600_000;
  const tuoi = Math.floor((bayGio + VN) / NGAY) - Math.floor((t + VN) / NGAY);
  if (tuoi > moc.gon) return "xoa";
  if (tuoi > moc.dayDu) return "gon";
  return "day-du";
}

/** Bản gọn của một dòng: bỏ nội dung trả lời dài, giữ mọi cột nhận dạng + câu trả lời gọn */
export function rutGonDong<T extends Record<string, unknown>>(d: T): T {
  const { traLoi: _t, biCat: _b, ...con } = d as Record<string, unknown>;
  void _t;
  void _b;
  return (Object.keys(con).length === Object.keys(d).length ? d : { ...con, daRutGon: true }) as T;
}
/** Trần chuỗi nguồn dẫn */
export const TRAN_NGUON = 300;

export type VaiSo = "goi" | "nhan";
export type LoaiLuot = "goc" | "nghiep-vu" | "ha-tang" | "kiem-dinh";
export type KetQuaSo = "ok" | "loi" | "khong-co-du-lieu";

/** Mã chuẩn các agent của hệ (A04) */
export const MA_AGENT_HE = ["tiendo", "hopdong", "base", "phaply", "main", "quansat"] as const;
/** Bên ngoài hệ — không có sổ riêng, nên bên gọi ghi nội dung trả lời */
export const BEN_NGOAI = ["llm", "basevn", "drive"] as const;

/**
 * Đuôi công cụ HẠ TẦNG — không mang số liệu nghiệp vụ, không xét luật nguồn,
 * không đưa LLM soi. Lượt `quansat` gọi các công cụ này thì bên bị gọi KHÔNG ghi.
 */
export const DUOI_HA_TANG: readonly string[] = [
  "suc_khoe",
  "nang_luc",
  "tim_theo_ma",
  "danh_ba",
  "ma_tran_goi",
  "du_lieu_dung_chung",
  "cau_hinh_chung",
  "nhat_ky_tong_hop",
  "nhat_ky_gan_day",
  "hoi_thoai_gan_day",
  "tu_dien_ngu_canh",
  "so_gac",
  "ngat_mach",
  "mo_lai_mach",
];

/** Kênh của dòng gốc chuỗi (`loaiLuot: goc`) */
export const KENH_GOC = {
  chat: "troly.chat",
  telegram: "telegram.chat",
  baoCaoSang: "bao_cao_sang",
  viecDem: "viec_dem",
} as const;
/** Kênh mở trang: `trang:<đường dẫn>` */
export function kenhTrang(duongDan: string): string {
  return `trang:${duongDan}`;
}

/** Công cụ ghi lúc mạch mở / đóng lại (mục 6.1 luật 2) */
export const CONG_CU_NGAT_MACH = "ngat_mach";
export const CONG_CU_MO_LAI_MACH = "mo_lai_mach";

/** Một dòng sổ bản 2 — PHẦN THÊM so với 8 cột cũ (mục 7.1) */
export interface TruongSoV2 {
  phienBanSo: 2;
  maLuot: string;
  vai: VaiSo;
  maChuoi: string;
  loaiLuot: LoaiLuot;
  /** Khi ketQua ≠ ok */
  maLoi?: string;
  /** Mọi lượt ok (trừ dòng gốc) */
  bam?: string;
  /** Lượt nghiệp vụ/gốc — xem `coGhiTraLoi` */
  traLoi?: string;
  biCat?: boolean;
  traGon?: boolean;
}

// ------------------------------------------------------------
// Mã lượt · mã chuỗi
// ------------------------------------------------------------

/** `<mã agent>-<ms base36>-<4 ký tự ngẫu nhiên>` — dùng cho cả mã lượt và mã chuỗi */
export function sinhMa(maAgent: string, bayGio: number = Date.now()): string {
  const ma = (maAgent || "x").trim().toLowerCase().replace(/[^a-z0-9]/g, "") || "x";
  return `${ma}-${bayGio.toString(36)}-${randomBytes(2).toString("hex")}`;
}

/** Mã lượt / mã chuỗi nhận qua header có hợp lệ không (chặn rác, chặn chuỗi dài) */
export function maHopLe(v: unknown): v is string {
  return typeof v === "string" && /^[a-z0-9]{1,16}-[a-z0-9]{4,12}-[a-f0-9]{4}$/.test(v);
}

// ------------------------------------------------------------
// Phân loại lượt
// ------------------------------------------------------------

export function duoiCongCu(congCu: string): string {
  const s = (congCu ?? "").trim();
  const i = s.indexOf(".");
  return i >= 0 ? s.slice(i + 1) : s;
}

/** Lượt kiểm khoá Base.vn ở Cài đặt ("Cài đặt: kiểm tra khoá ứng dụng …") cũng là hạ tầng */
export function laHaTang(congCu: string, lyDoGoi = ""): boolean {
  if (DUOI_HA_TANG.includes(duoiCongCu(congCu))) return true;
  // Hai lối bỏ dấu: "khoá" (dấu trên a) và "khóa" (dấu trên o)
  return /kiểm tra kh(oá|óa)/i.test(lyDoGoi);
}

export function laAgentHe(ma: string): boolean {
  return (MA_AGENT_HE as readonly string[]).includes(ma);
}

export function laBenNgoai(ma: string): boolean {
  return (BEN_NGOAI as readonly string[]).includes(ma);
}

export function phanLoaiLuot(o: {
  agentHoi: string;
  congCu: string;
  lyDoGoi?: string;
  /** Header `x-sci-kiem-dinh: 1` */
  kiemDinh?: boolean;
  /** Dòng gốc chuỗi */
  goc?: boolean;
}): LoaiLuot {
  if (o.goc) return "goc";
  if (o.kiemDinh || !laAgentHe(o.agentHoi)) return "kiem-dinh";
  if (laHaTang(o.congCu, o.lyDoGoi)) return "ha-tang";
  return "nghiep-vu";
}

/**
 * Đuôi công cụ Agent quan sát ĐƯỢC PHÉP gọi (HOP-DONG-KET-NOI 4.1 luật 1) — chỉ
 * những lượt này mới được bỏ không ghi. Quansat gọi thứ khác (bị chặn quyền)
 * thì VẪN GHI, để thấy được nó gọi sai.
 */
export const DUOI_QUAN_SAT_DUOC_GOI: readonly string[] = [
  "nhat_ky_tong_hop",
  "nhat_ky_gan_day",
  "hoi_thoai_gan_day",
  "thong_ke_ai", // 04/10 Quản lý token AI Đợt 3 — cửa đọc sổ dùng AI
  "suc_khoe",
  "nang_luc",
  "danh_ba",
  "ma_tran_goi",
  "du_lieu_dung_chung",
  "so_gac",
];

/** Cổng MCP có bỏ qua không ghi lượt này không (ngoại lệ luật 29 — 26/09) */
export function boQuaGhiNhan(agentGoi: string, congCu: string): boolean {
  return agentGoi === "quansat" && DUOI_QUAN_SAT_DUOC_GOI.includes(duoiCongCu(congCu));
}

// ------------------------------------------------------------
// Luật ketQua — hàm bọc tự quyết
// ------------------------------------------------------------

interface KhuonTraLoose {
  ok: boolean;
  du_lieu?: unknown;
  nguon?: unknown;
  ma_loi?: unknown;
  thong_diep?: unknown;
}

/** Giá trị có phải khuôn trả lời MCP (mục 3) không */
export function laKhuonMcp(v: unknown): v is KhuonTraLoose {
  return !!v && typeof v === "object" && !Array.isArray(v) && typeof (v as { ok?: unknown }).ok === "boolean";
}

/**
 * Quy mọi kiểu trả về có `ok: boolean` về khuôn MCP trước khi ghi (sửa 26/09 tối):
 *   · khuôn thật (`du_lieu` / `ma_loi`) → giữ nguyên
 *   · lỗi lồng `{ok:false, loi:{ma_loi, thong_diep}}` → dàn phẳng
 *   · kiểu riêng `{ok:true, data|text|tomTat…}` (Base.vn, LLM…) → `du_lieu` = phần còn lại,
 *     để dấu vân và nội dung trả lời là DỮ LIỆU THẬT (trước đây mọi câu cùng một dấu vân)
 *   · kiểu riêng `{ok:false, message|loi|lyDo…}` → `LOI_NOI_BO` + giữ thông điệp
 * Giá trị không có `ok` (chuỗi LLM, mảng…) giữ nguyên.
 */
export function chuanHoaTraVe(v: unknown): unknown {
  if (!laKhuonMcp(v)) return v;
  const o = v as unknown as Record<string, unknown>;
  if (o.ok === true) {
    if ("du_lieu" in o) return v;
    const con: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(o)) if (k !== "ok" && k !== "nguon") con[k] = x;
    return o.nguon !== undefined ? { ok: true, du_lieu: con, nguon: o.nguon } : { ok: true, du_lieu: con };
  }
  const loi = o.loi && typeof o.loi === "object" ? (o.loi as Record<string, unknown>) : undefined;
  const maLoi = [o.ma_loi, loi?.ma_loi].find((x) => typeof x === "string" && x.trim() !== "") as string | undefined;
  const thongDiep = [o.thong_diep, loi?.thong_diep, o.message, o.loi, o.thongDiep, o.lyDo, o.tomTat].find(
    (x) => typeof x === "string" && x.trim() !== "",
  ) as string | undefined;
  return { ok: false, ma_loi: maLoi ?? "LOI_NOI_BO", thong_diep: thongDiep };
}

export function ketQuaTuTraVe(v: unknown): { ketQua: KetQuaSo; maLoi?: string; loi?: string } {
  v = chuanHoaTraVe(v);
  if (!laKhuonMcp(v) || v.ok) return { ketQua: "ok" };
  const maLoi = typeof v.ma_loi === "string" && v.ma_loi.trim() ? v.ma_loi.trim() : "LOI_NOI_BO";
  const thongDiep = typeof v.thong_diep === "string" ? v.thong_diep : undefined;
  if (maLoi === "KHONG_CO_DU_LIEU") return { ketQua: "khong-co-du-lieu", maLoi, loi: thongDiep };
  return { ketQua: "loi", maLoi, loi: thongDiep ?? maLoi };
}

export function ketQuaTuNgoaiLe(err: unknown): { ketQua: "loi"; maLoi: string; loi: string } {
  return { ketQua: "loi", maLoi: "LOI_NOI_BO", loi: err instanceof Error ? err.message : "lỗi không rõ" };
}

// ------------------------------------------------------------
// Nguồn dẫn
// ------------------------------------------------------------

/** Rút nguồn từ `nguon[]` của khuôn trả lời. Không có → undefined (KHÔNG bịa) */
export function nguonTuTraVe(v: unknown, tran: number = TRAN_NGUON): string | undefined {
  if (!laKhuonMcp(v) || !Array.isArray(v.nguon)) return undefined;
  const phan: string[] = [];
  for (const n of v.nguon as unknown[]) {
    if (!n || typeof n !== "object") continue;
    const o = n as Record<string, unknown>;
    const t = [o.file_goc, o.ma].find((x) => typeof x === "string" && x.trim() !== "") as string | undefined;
    if (t && !phan.includes(t.trim())) phan.push(t.trim());
  }
  if (phan.length === 0) return undefined;
  const s = phan.join(" · ");
  return s.length > tran ? s.slice(0, tran - 1) + "…" : s;
}

/** Nguồn cho lượt gọi thẳng API Base.vn */
export function nguonBaseVn(duongGoi: string): string {
  return `Base.vn/${(duongGoi ?? "").replace(/^base\./, "").replace(/^\/+/, "")}`;
}

/** Luật "ok mà không nguồn là vi phạm" chỉ xét lượt nghiệp vụ tới MỘT AGENT */
export function phaiCoNguon(loaiLuot: LoaiLuot, agentTraLoi: string): boolean {
  return loaiLuot === "nghiep-vu" && laAgentHe(agentTraLoi);
}

// ------------------------------------------------------------
// Dấu vân · nội dung trả lời
// ------------------------------------------------------------

/** Xếp khoá, bỏ mọi khoá bắt đầu bằng `thoi_diem` (đệ quy) — để hai lần hỏi cùng dữ liệu cho cùng dấu vân */
export function chuanHoaDeBam(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(chuanHoaDeBam);
  if (v && typeof v === "object") {
    const ra: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>).sort()) {
      if (k.startsWith("thoi_diem")) continue;
      ra[k] = chuanHoaDeBam((v as Record<string, unknown>)[k]);
    }
    return ra;
  }
  return v;
}

/** Dấu vân câu trả lời: 16 ký tự đầu SHA-1. Khuôn MCP thì băm `du_lieu`, còn lại băm cả giá trị */
export function bamTraLoi(v: unknown): string {
  const goc = laKhuonMcp(v) ? v.du_lieu : v;
  // Trả về rỗng vẫn là MỘT câu trả lời — hai lần rỗng liền nhau là y hệt nhau
  const s = goc === undefined ? "null" : typeof goc === "string" ? goc : JSON.stringify(chuanHoaDeBam(goc)) ?? "null";
  return createHash("sha1").update(s, "utf8").digest("hex").slice(0, 16);
}

/** Nội dung trả lời để ghi sổ: chữ giữ nguyên, còn lại JSON của `du_lieu`; cắt ≤ trần */
export function catTraLoi(v: unknown, tran: number = TRAN_TRA_LOI): { traLoi: string; biCat: boolean } | undefined {
  const goc = laKhuonMcp(v) ? (v.ok ? v.du_lieu : v.thong_diep) : v;
  if (goc === undefined || goc === null) return undefined;
  const s = typeof goc === "string" ? goc : JSON.stringify(goc);
  if (s === undefined) return undefined;
  if (s.length <= tran) return { traLoi: s, biCat: false };
  // Không cắt đôi một ký tự ngoài mặt phẳng cơ bản (emoji…): lùi một nếu chỗ cắt là nửa đầu cặp
  const ma = s.charCodeAt(tran - 1);
  const cuoi = ma >= 0xd800 && ma <= 0xdbff ? tran - 1 : tran;
  return { traLoi: s.slice(0, cuoi), biCat: true };
}

/**
 * Sổ nào ghi nội dung trả lời: dòng gốc luôn ghi; lượt nghiệp vụ thì sổ BÊN
 * TRẢ LỜI ghi (vai "nhan"), riêng bên ngoài hệ (llm · basevn · drive) không có
 * sổ nên bên gọi ghi. Hạ tầng / kiểm định không ghi.
 */
export function coGhiTraLoi(loaiLuot: LoaiLuot, vai: VaiSo, agentTraLoi: string): boolean {
  if (loaiLuot === "goc") return true;
  if (loaiLuot !== "nghiep-vu") return false;
  return vai === "nhan" || laBenNgoai(agentTraLoi);
}

/** Lượt hỏi gọn: bên trả lời báo "không đổi" */
export function laTraGon(v: unknown): boolean {
  const d = laKhuonMcp(v) ? v.du_lieu : undefined;
  return !!d && typeof d === "object" && (d as Record<string, unknown>).khong_doi === true;
}

// ------------------------------------------------------------
// Dựng phần v2 của một dòng — hàm bọc gọi một lần, không tự ráp tay
// ------------------------------------------------------------

export function dungTruongV2(o: {
  maLuot: string;
  vai: VaiSo;
  maChuoi: string;
  loaiLuot: LoaiLuot;
  agentTraLoi: string;
  /** Giá trị trả về (khi không ném) */
  traVe?: unknown;
  /** Ngoại lệ (khi ném) */
  loiNem?: unknown;
}): TruongSoV2 & { ketQua: KetQuaSo; loi?: string; nguonTuDong?: string } {
  const traVe = chuanHoaTraVe(o.traVe);
  const kq = o.loiNem !== undefined ? ketQuaTuNgoaiLe(o.loiNem) : ketQuaTuTraVe(traVe);
  const ra: TruongSoV2 & { ketQua: KetQuaSo; loi?: string; nguonTuDong?: string } = {
    phienBanSo: PHIEN_BAN_SO,
    maLuot: o.maLuot,
    vai: o.vai,
    maChuoi: o.maChuoi,
    loaiLuot: o.loaiLuot,
    ketQua: kq.ketQua,
  };
  if (kq.maLoi) ra.maLoi = kq.maLoi;
  if (kq.loi) ra.loi = kq.loi;
  if (o.loiNem === undefined) {
    if (kq.ketQua === "ok" && o.loaiLuot !== "goc") {
      ra.bam = bamTraLoi(traVe);
      if (laTraGon(traVe)) ra.traGon = true;
    }
    const n = nguonTuTraVe(traVe);
    if (n) ra.nguonTuDong = n;
    if (coGhiTraLoi(o.loaiLuot, o.vai, o.agentTraLoi)) {
      const t = catTraLoi(traVe, tranTraLoi(o.agentTraLoi));
      if (t) {
        ra.traLoi = t.traLoi;
        ra.biCat = t.biCat;
      }
    }
  }
  return ra;
}

// ------------------------------------------------------------
// Kiểm một dòng có ĐẠT KHUÔN không — bài kiểm "đạt khuôn" của 5 agent và
// Agent quan sát dùng CÙNG hàm này
// ------------------------------------------------------------

export function thieuTruongV2(d: Record<string, unknown>): string[] {
  const thieu: string[] = [];
  if (d.phienBanSo !== PHIEN_BAN_SO) thieu.push("phienBanSo");
  for (const k of ["thoiDiem", "agentHoi", "agentTraLoi", "congCu", "lyDoGoi", "maLuot", "maChuoi"]) {
    if (typeof d[k] !== "string" || (d[k] as string).trim() === "") thieu.push(k);
  }
  if (d.vai !== "goi" && d.vai !== "nhan") thieu.push("vai");
  const loai = d.loaiLuot as LoaiLuot;
  if (!["goc", "nghiep-vu", "ha-tang", "kiem-dinh"].includes(loai)) thieu.push("loaiLuot");
  const kq = d.ketQua as KetQuaSo;
  if (!["ok", "loi", "khong-co-du-lieu"].includes(kq)) thieu.push("ketQua");
  if (typeof d.miliGiay !== "number") thieu.push("miliGiay");
  if (kq && kq !== "ok" && (typeof d.maLoi !== "string" || d.maLoi === "")) thieu.push("maLoi");
  const congCuMach = [CONG_CU_NGAT_MACH, CONG_CU_MO_LAI_MACH].includes(duoiCongCu(String(d.congCu ?? "")));
  if (kq === "ok" && loai !== "goc" && !congCuMach && typeof d.bam !== "string") thieu.push("bam");
  if (
    kq === "ok" &&
    ["goc", "nghiep-vu", "ha-tang", "kiem-dinh"].includes(loai) &&
    (d.vai === "goi" || d.vai === "nhan") &&
    coGhiTraLoi(loai, d.vai as VaiSo, String(d.agentTraLoi ?? "")) &&
    d.daRutGon !== true && // dòng quá mốc đầy đủ đã được rút gọn có chủ ý
    typeof d.traLoi !== "string"
  ) {
    thieu.push("traLoi");
  }
  return thieu;
}

/**
 * Tự kiểm chính tệp khuôn — bài kiểm "đạt khuôn" của MỖI agent gọi hàm này
 * và đòi mảng rỗng. Trả về danh sách câu hỏng (tiếng Việt).
 */
export function tuKiemKhuonSo(): string[] {
  const hong: string[] = [];
  const phai = (dk: boolean, cau: string) => {
    if (!dk) hong.push(cau);
  };
  const ma = sinhMa("main", 1_700_000_000_000);
  phai(maHopLe(ma), `sinhMa ra mã không hợp lệ: ${ma}`);
  phai(!maHopLe("x".repeat(80)), "maHopLe nhận chuỗi rác");

  phai(ketQuaTuTraVe({ ok: true, du_lieu: {}, nguon: [] }).ketQua === "ok", "khuôn ok phải ra ok");
  const kcd = ketQuaTuTraVe({ ok: false, ma_loi: "KHONG_CO_DU_LIEU", thong_diep: "chưa có" });
  phai(kcd.ketQua === "khong-co-du-lieu" && kcd.maLoi === "KHONG_CO_DU_LIEU", "KHONG_CO_DU_LIEU phải ra khong-co-du-lieu (lỗi 2.675 dòng 26/09)");
  phai(ketQuaTuTraVe({ ok: false, ma_loi: "HET_HAN_CHO" }).ketQua === "loi", "mã lỗi khác phải ra loi");
  phai(ketQuaTuTraVe({ ok: false }).maLoi === "LOI_NOI_BO", "thiếu ma_loi phải quy LOI_NOI_BO");
  phai(ketQuaTuTraVe("chữ LLM").ketQua === "ok", "giá trị không phải khuôn MCP là ok");

  phai(
    nguonTuTraVe({ ok: true, nguon: [{ file_goc: "a.json" }, { ma: "HD-548" }, { file_goc: "a.json" }] }) === "a.json · HD-548",
    "rút nguồn: nối file_goc/ma, bỏ trùng",
  );
  phai(nguonTuTraVe({ ok: true, nguon: [] }) === undefined, "nguồn rỗng phải là undefined, không bịa");
  phai(nguonBaseVn("base.wework/task/get") === "Base.vn/wework/task/get", "nguồn Base.vn");

  const b1 = bamTraLoi({ ok: true, du_lieu: { a: 1, b: [1, 2], thoi_diem_tra_loi: "x" } });
  const b2 = bamTraLoi({ ok: true, du_lieu: { b: [1, 2], a: 1, thoi_diem_tra_loi: "y" } });
  const b3 = bamTraLoi({ ok: true, du_lieu: { a: 2, b: [1, 2] } });
  phai(b1 === b2, "dấu vân phải bỏ qua thứ tự khoá và thoi_diem*");
  phai(b1 !== b3, "dữ liệu khác phải ra dấu vân khác");
  phai(b1.length === 16, "dấu vân dài 16 ký tự");
  phai(bamTraLoi(undefined) === bamTraLoi(undefined), "trả về rỗng vẫn có dấu vân");

  const dai = catTraLoi({ ok: true, du_lieu: "x".repeat(TRAN_TRA_LOI + 5) });
  phai(!!dai && dai.biCat && dai.traLoi.length === TRAN_TRA_LOI, "cắt nội dung trả lời đúng trần");

  phai(phanLoaiLuot({ agentHoi: "main", congCu: "tiendo.tom_tat_du_an" }) === "nghiep-vu", "lượt nghiệp vụ");
  phai(phanLoaiLuot({ agentHoi: "main", congCu: "main.danh_ba" }) === "ha-tang", "danh bạ là hạ tầng");
  phai(
    phanLoaiLuot({ agentHoi: "main", congCu: "base.hrm/employee/list", lyDoGoi: "Cài đặt: kiểm tra khoá ứng dụng Base HRM" }) === "ha-tang",
    "kiểm khoá Base.vn là hạ tầng",
  );
  phai(phanLoaiLuot({ agentHoi: "do-kiem", congCu: "tiendo.so_tuan" }) === "kiem-dinh", "bên gọi không phải agent là kiểm định");
  phai(phanLoaiLuot({ agentHoi: "main", congCu: "x", kiemDinh: true }) === "kiem-dinh", "header kiểm định");

  phai(boQuaGhiNhan("quansat", "tiendo.nhat_ky_gan_day"), "quansat đọc sổ: bên bị đọc không ghi");
  phai(!boQuaGhiNhan("main", "tiendo.nhat_ky_gan_day"), "agent khác đọc sổ vẫn ghi");
  phai(!boQuaGhiNhan("quansat", "tiendo.tom_tat_du_an"), "quansat gọi nghiệp vụ (bị chặn quyền) vẫn ghi");

  phai(coGhiTraLoi("nghiep-vu", "nhan", "tiendo"), "sổ bên trả lời ghi nội dung");
  phai(!coGhiTraLoi("nghiep-vu", "goi", "tiendo"), "sổ bên gọi không ghi nội dung khi bên kia là agent");
  phai(coGhiTraLoi("nghiep-vu", "goi", "llm"), "gọi LLM thì bên gọi ghi nội dung");
  phai(!coGhiTraLoi("ha-tang", "nhan", "main"), "hạ tầng không ghi nội dung");

  const v2 = dungTruongV2({
    maLuot: ma,
    vai: "goi",
    maChuoi: ma,
    loaiLuot: "nghiep-vu",
    agentTraLoi: "tiendo",
    traVe: { ok: false, ma_loi: "KHONG_CO_DU_LIEU", thong_diep: "chưa có BC tuần" },
  });
  phai(v2.ketQua === "khong-co-du-lieu" && v2.maLoi === "KHONG_CO_DU_LIEU" && !v2.bam, "dungTruongV2 với KHONG_CO_DU_LIEU");
  const dong = {
    thoiDiem: "2026-09-26T10:05:41.280Z",
    agentHoi: "main",
    agentTraLoi: "tiendo",
    congCu: "tiendo.tom_tat_du_an",
    lyDoGoi: "tự kiểm",
    miliGiay: 12,
    ...dungTruongV2({ maLuot: ma, vai: "nhan", maChuoi: ma, loaiLuot: "nghiep-vu", agentTraLoi: "tiendo", traVe: { ok: true, du_lieu: { w: "W38" }, nguon: [{ file_goc: "s.json" }] } }),
  };
  phai(thieuTruongV2(dong).length === 0, `dòng đủ khuôn bị báo thiếu: ${thieuTruongV2(dong).join(", ")}`);
  phai(thieuTruongV2({ ...dong, traLoi: undefined }).includes("traLoi"), "thiếu traLoi ở sổ bên trả lời phải bị bắt");
  phai(thieuTruongV2({ ...dong, ketQua: "loi", maLoi: undefined }).includes("maLoi"), "lỗi thiếu maLoi phải bị bắt");
  // Sửa 26/09 tối (hai nhóm code báo)
  const bv1 = bamTraLoi(chuanHoaTraVe({ ok: true, data: { id: 1 } }));
  const bv2 = bamTraLoi(chuanHoaTraVe({ ok: true, data: { id: 2 } }));
  phai(bv1 !== bv2, "kiểu riêng {ok, data} phải băm theo dữ liệu thật, không cùng một dấu vân");
  const bvl = ketQuaTuTraVe({ ok: false, message: "Base.vn từ chối" });
  phai(bvl.ketQua === "loi" && bvl.maLoi === "LOI_NOI_BO" && bvl.loi === "Base.vn từ chối", "kiểu riêng ok:false giữ thông điệp");
  const long = ketQuaTuTraVe({ ok: false, loi: { ma_loi: "KHONG_CO_DU_LIEU", thong_diep: "chưa có" } });
  phai(long.ketQua === "khong-co-du-lieu", "lỗi lồng {loi:{ma_loi}} phải dàn phẳng");
  const llm = dungTruongV2({ maLuot: ma, vai: "goi", maChuoi: ma, loaiLuot: "nghiep-vu", agentTraLoi: "llm", traVe: { ok: true, text: "Tóm tắt" } });
  phai(typeof llm.traLoi === "string" && llm.traLoi.includes("Tóm tắt"), "gọi LLM kiểu {ok, text} vẫn ghi nội dung");
  phai(laHaTang("x", "Cài đặt: kiểm tra khóa ứng dụng Base HRM"), "chữ 'khóa' dấu trên o vẫn là hạ tầng");
  phai(laHaTang("main.tu_dien_ngu_canh"), "từ điển ngữ cảnh là hạ tầng");
  phai(!boQuaGhiNhan("quansat", "tiendo.tim_theo_ma"), "quansat gọi công cụ không được phép vẫn ghi");
  phai(boQuaGhiNhan("quansat", "main.so_gac") && laHaTang("main.so_gac"), "quansat đọc sổ gác: hạ tầng, bên Main không ghi");
  const bv500 = dungTruongV2({ maLuot: ma, vai: "goi", maChuoi: ma, loaiLuot: "nghiep-vu", agentTraLoi: "basevn", traVe: { ok: true, data: "x".repeat(3000) } });
  phai((bv500.traLoi ?? "").length === TRAN_TRA_LOI_BASEVN && bv500.biCat === true, "lượt Base.vn cắt ở 500 ký tự");
  const hn = Date.parse("2026-09-26T16:30:00Z"); // 23:30 giờ VN ngày 26/09
  phai(cachGiuDong("2026-09-26T17:30:00Z", Date.parse("2026-09-27T01:00:00Z")) === "day-du", "cùng ngày VN là đầy đủ");
  phai(cachGiuDong("2026-09-16T00:00:00Z", hn) === "day-du", "10 ngày tuổi vẫn đầy đủ");
  phai(cachGiuDong("2026-09-15T00:00:00Z", hn) === "gon", "11 ngày tuổi thành gọn");
  phai(cachGiuDong("2026-08-22T00:00:00Z", hn) === "gon", "35 ngày tuổi vẫn gọn");
  phai(cachGiuDong("2026-08-21T00:00:00Z", hn) === "xoa", "36 ngày tuổi thì xoá");
  phai(cachGiuDong("rác", hn) === "day-du", "giờ hỏng thì không đụng");
  const gon: Record<string, unknown> = rutGonDong({ maLuot: "a", traLoi: "dài", biCat: false, traLoiGon: "gọn" });
  phai(gon.traLoi === undefined && gon.traLoiGon === "gọn" && gon.daRutGon === true, "rút gọn bỏ nội dung, giữ câu gọn");
  phai(thieuTruongV2({ ...dong, traLoi: undefined, daRutGon: true }).length === 0, "dòng đã rút gọn không bị báo thiếu nội dung");
  const emoji = catTraLoi("a".repeat(TRAN_TRA_LOI - 1) + "😀");
  phai(!!emoji && emoji.traLoi.length === TRAN_TRA_LOI - 1, "không cắt đôi emoji");
  return hong;
}
