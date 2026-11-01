// ============================================================
// BỘ LỌC MÀN CẢNH BÁO MAIN — file THUẦN (client import được — luật 10)
//
// Mr. Đại chốt 01/11/2026 (demo bản 3, KE-HOACH/40 mục 6), khuôn «Việc của tôi»:
//   tầng 1 (ngoài cùng) = CHỦ ĐỀ — chip, chỉ đếm NHÓM CHÍNH nên các chip cộng lại đúng «Tất cả»
//   tầng 2 = ô xổ AGENT + ô xổ MỨC ĐỘ QUAN TRỌNG (gộp lọc + xếp — «bản chất là một»)
// Thứ tự 5 lựa chọn mức độ quan trọng do anh chốt; «kéo lùi COD» KHÔNG thành lựa chọn
// (đo 01/11: 1/60 issue có số > 0) — chỉ dùng để xếp.
// ============================================================

import { locIssue, nhomChinhCuaIssue, type IssueMain, type NhomChuDe } from "./model";

export type MaQuanTrong = "nang" | "do" | "gang" | "qua-han" | "can-xem";

/** Số ngày quá hạn — cổng các agent CHƯA trả trường riêng, nên đọc từ chữ trong tên issue (KE-HOACH/40 mục 6) */
export function soNgayQuaHan(i: IssueMain): number {
  const m = /(?:quá hạn|lâu nhất|chờ|im lặng)\s+(\d+)\s*ngày/i.exec(i.tieuDe ?? "");
  return m ? Number(m[1]) : 0;
}

/** Trên đường găng: nhóm chính/phụ là đường găng, hoặc tên mang dấu chuỗi găng ⛓ */
export function trenGang(i: IssueMain): boolean {
  return i.nhomChinh === "duong-gang" || i.nhomPhu.includes("duong-gang") || i.tieuDe.includes("⛓");
}

/** Nặng nhất trước: nghiêm trọng → trên găng → số ngày kéo lùi COD → số ngày quá hạn */
export function diemNang(i: IssueMain): number {
  return (i.mucDo === "do" ? 1e9 : 0) + (trenGang(i) ? 1e7 : 0) + (i.soNgayAnhHuong ?? 0) * 1e4 + soNgayQuaHan(i);
}

export const QUAN_TRONG: readonly { ma: MaQuanTrong; nhan: string; loc: (i: IssueMain) => boolean }[] = [
  { ma: "nang", nhan: "Tất cả — nặng nhất trước", loc: () => true },
  { ma: "do", nhan: "Chỉ nghiêm trọng", loc: (i) => i.mucDo === "do" },
  { ma: "gang", nhan: "Trên đường găng", loc: trenGang },
  { ma: "qua-han", nhan: "Có quá hạn — lâu nhất trước", loc: (i) => soNgayQuaHan(i) > 0 },
  { ma: "can-xem", nhan: "AI chọn: cần anh xem", loc: (i) => (i.lyDoChon ?? "").trim() !== "" },
];

export interface BoLoc {
  /** "" = mọi chủ đề */
  chuDe: NhomChuDe | "";
  /** "" = mọi agent; còn lại là `agentChu` */
  agent: string;
  quanTrong: MaQuanTrong;
}

export const BO_LOC_DAU: BoLoc = { chuDe: "", agent: "", quanTrong: "nang" };

const quanTrongCua = (ma: MaQuanTrong) => QUAN_TRONG.find((q) => q.ma === ma) ?? QUAN_TRONG[0]!;

/**
 * Issue qua cả ba tầng lọc, trừ tầng `boQua` — dùng để đếm số cho chính tầng đó
 * (chip chủ đề đếm trên kết quả của hai ô kia, v.v.).
 * Đầu vào là danh sách đã qua `locIssue` (đủ nguồn + điều kiện đóng — luật A.4.1, A.4.5).
 */
export function quaLoc(ds: IssueMain[], b: BoLoc, boQua?: keyof BoLoc): IssueMain[] {
  return ds.filter(
    (i) =>
      (boQua === "chuDe" || b.chuDe === "" || nhomChinhCuaIssue(i) === b.chuDe) &&
      (boQua === "agent" || b.agent === "" || i.agentChu === b.agent) &&
      (boQua === "quanTrong" || quanTrongCua(b.quanTrong).loc(i))
  );
}

/** Danh sách cuối để vẽ: lọc rồi xếp theo lựa chọn mức độ quan trọng */
export function dsHien(ds: IssueMain[], b: BoLoc): IssueMain[] {
  const ra = quaLoc(ds, b);
  return b.quanTrong === "qua-han"
    ? ra.sort((x, y) => soNgayQuaHan(y) - soNgayQuaHan(x) || diemNang(y) - diemNang(x))
    : ra.sort((x, y) => diemNang(y) - diemNang(x));
}

/** Các agent có issue (mã + tên), theo thứ tự xuất hiện — không gắn cứng danh sách agent */
export function cacAgent(ds: IssueMain[]): { ma: string; ten: string }[] {
  const ra = new Map<string, string>();
  for (const i of ds) if (!ra.has(i.agentChu)) ra.set(i.agentChu, i.tenAgentChu);
  return Array.from(ra, ([ma, ten]) => ({ ma, ten }));
}

/** Issue đang mở hợp lệ (hoặc đã đóng khi xem lại) — nền của cả ba tầng lọc */
export function nenLoc(ds: IssueMain[], xemDaDong: boolean, hienAn: boolean): IssueMain[] {
  return locIssue(ds).nhan.filter((i) => i.daDong === xemDaDong && (hienAn || !i.an));
}
