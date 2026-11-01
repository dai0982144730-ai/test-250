// ============================================================
// DỰNG BÁO CÁO SÁNG BẰNG CÁCH ĐI HỎI CÁC AGENT (server-only)
// MD: PLAN-MAIN-AGENT mục 6.1 (nguồn nội dung) · 6.3 (khung) · 7 (nhịp)
//     KE-HOACH/05 A.4 (sáu luật cứng)
//
// ⛔ Main KHÔNG GIỮ DỮ LIỆU NGHIỆP VỤ. Mọi con số trong báo cáo này đều đi
//    qua `hoiAgent()` — cửa duy nhất. Không có bảng số liệu riêng ở đây.
//
// ⛔ SỐ AGENT KHÔNG GẮN CỨNG. Chạy qua đúng những con ĐANG BẬT trong Danh bạ
//    agent: hôm nay 2 con, mai 6 con — file này không sửa dòng nào.
//
// ⛔ Agent tắt/chết thì mục đó ghi "chưa hỏi được vì …" và BÁO CÁO VẪN GỬI
//    (luật cứng 5). Không con nào hỏng được cả bản báo cáo.
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { gocDuLieu } from "@/lib/goc-du-lieu";
import { cacAgentDangBat, type KhaiAgent } from "@/lib/danh-ba-agent";
import { docDanhBaAgent } from "@/lib/cai-dat-base";
import { hoiAgent, TEN_AGENT_NAY } from "@/lib/nguon/hoi-agent";
import { lienKetManIssue } from "@/lib/issue-main/gom";
import { demTheConThieu, GIOI_HAN_XIN_ISSUE, laSoKhongCoTheMo } from "@/lib/issue-main/model";
import type { KhuonTra, NguonMcp } from "@/lib/mcp/khuon";
import { gioVn } from "@/lib/gio-vn";
import type { DuongGoi } from "@/lib/nhat-ky/model";
import { listProjects, maNganDuAn, type ProjectInfo } from "@/lib/projects";
import { diaChiMain } from "@/lib/keo-cau-hinh";
import { apDungLuat, moTaHieuLuc } from "./luat";
import {
  gopVaXep,
  heLuiCodCua,
  locTheVao,
  locViecDoKhac,
  soVoiHomQua,
  type DauDuAn,
  type MocCod,
  type TheIssueTho,
  type VanDeSang,
  type ViecKhac,
} from "./luat-cod";
import { NHAN_MAU } from "./kich-ban";
import { canCuaNguoiNhan, ketXuatBoKhoi } from "./khoi-telegram";
import { gomKhoi } from "./gom-khoi";
import { gopDuLieuKhoi, phanThieu, type DuLieuKhoi } from "./khoi-du-lieu";
import { laMaKhoi } from "./khoi";
import { veAnh } from "./ve-anh";
import { danhSachNguoiNhan, bangNguoiNhan, docDaGui, ghiDaGui, khoCoBanGhi, type NguoiNhan } from "./kich-ban-kho";
import { ngayGioVN } from "@/lib/ngay-hien";
import { danhSachNguoiDungDayDu } from "@/lib/users";
import { ganCauHoi } from "./cau-hoi-ai";
import {
  denGioChayNhip,
  dungKhung,
  ketXuatTelegram,
  taoDong,
  NHIP_DINH_KY,
  type BaoCaoSang,
  type DongBaoCao,
  type DongThieu,
  type MaNhip,
  type MucBaoCao,
  type ThamSoDong,
} from "./model";
import { danhDauDaGui, docBaoCaoNgay, docKhoi, docLuatConHieuLuc, luuBaoCao, luuKhoi } from "./kho";
import { ganNhanHeThong, guiAlbumToi, guiTelegram, guiTelegramToi, type KetQuaGui } from "./telegram";
import { layTuDienWbs } from "@/lib/chung/tu-dien-ma-du-an";
import { laAgentNghiepVu } from "@/lib/chung/ma-agent";
import { chayGocChuoi } from "@/lib/nhat-ky/so";
import { KENH_GOC } from "@/lib/nhat-ky/khuon-so";
import { boLocMatCuaNguoi } from "@/lib/agent-mat-tren-main";
import { AN_HET_MAT, locBaoCaoSang, locDuLieuKhoi } from "@/lib/agent-mat-loc";

// ─────────────────────────────────────────────────────────────
// 1. Công cụ đi hỏi
// ─────────────────────────────────────────────────────────────

/**
 * Công cụ DUY NHẤT Main gọi để lấy nội dung báo cáo sáng: `<mã agent>.danh_sach_issue`.
 *
 * ⛔ ĐÃ VẤP (B04, đo 22/09/2026): bản cũ thử lần lượt ba đuôi
 *    danh_sach_issue → bao_cao_sang → issue_dang_mo. Hai đuôi sau KHÔNG cổng nào có
 *    (nang_luc: pháp lý 7 · hợp đồng 9 · Base 9 · tiến độ 15 công cụ — không con nào
 *    mở bao_cao_sang / issue_dang_mo), nên mỗi sáng sổ nhận thêm hàng chục dòng lỗi
 *    KHONG_HIEU_YEU_CAU vô nghĩa (34+34 ở hợp đồng, 26+26 ở pháp lý, 20+20 ở Base).
 *    Nay: muốn biết agent mở gì thì HỎI `nang_luc` một lần rồi nhớ trong ngày —
 *    không mở danh_sach_issue thì ghi "chưa hỏi được vì …", KHÔNG gọi mù.
 */
export const CONG_CU_SANG = "danh_sach_issue";

/** Kết quả hỏi nang_luc của một agent, nhớ theo NGÀY (giờ VN) */
interface NangLucNho {
  ngay: string;
  /** null = hỏi nang_luc không được (agent tắt / lỗi) — kèm lý do ở `loi` */
  congCu: string[] | null;
  loi: string;
  luc: string;
}

const nangLucTrongNgay = new Map<string, NangLucNho>();

/** Dùng trong test — quên hết kết quả nang_luc đã nhớ */
export function xoaNhoNangLuc(): void {
  nangLucTrongNgay.clear();
}

/** Bóc danh sách tên công cụ từ câu trả lời nang_luc — chịu được vài khuôn */
function bocTenCongCu(ket: KhuonTra): string[] {
  if (!ket.ok) return [];
  const d = ket.du_lieu as Record<string, unknown> | unknown[] | null;
  let ds: unknown[] = [];
  if (Array.isArray(d)) ds = d;
  else if (d && typeof d === "object") {
    for (const k of ["cong_cu", "danh_sach", "tools"]) {
      const v = (d as Record<string, unknown>)[k];
      if (Array.isArray(v)) {
        ds = v;
        break;
      }
    }
  }
  return ds
    .map((c) => (typeof c === "string" ? c : typeof c === "object" && c !== null ? String((c as { ten?: unknown }).ten ?? "") : ""))
    .filter((t) => t !== "");
}

/**
 * Agent này hôm nay mở những công cụ gì. Hỏi `nang_luc` MỘT lần mỗi ngày cho mỗi
 * agent; agent tắt thì cũng chỉ ghi nhớ trong lượt dựng này (không nhớ qua ngày,
 * để sáng mai nó bật lại là hỏi được ngay).
 */
async function nangLucCua(a: KhaiAgent, ngay: string): Promise<NangLucNho> {
  const nho = nangLucTrongNgay.get(a.ma);
  if (nho && nho.ngay === ngay && nho.congCu !== null) return nho;
  const ket = await hoiAgent(a.ma, "nang_luc", `dựng báo cáo sáng ${ngay}: xem ${a.ten} có mở ${CONG_CU_SANG} không (hỏi một lần/ngày)`, {
    boQuaMaTran: true,
  });
  const moi: NangLucNho = ket.ok
    ? { ngay, congCu: bocTenCongCu(ket), loi: "", luc: new Date().toISOString() }
    : { ngay, congCu: null, loi: ket.thong_diep, luc: new Date().toISOString() };
  nangLucTrongNgay.set(a.ma, moi);
  return moi;
}

/** Lý do gọi — BẮT BUỘC theo mục 7 hợp đồng; câu này vào thẳng sổ nhật ký */
function lyDoGoi(ngay: string): string {
  return `dựng báo cáo sáng ${ngay} gửi 07:00 qua Telegram (PLAN-MAIN-AGENT mục 6)`;
}

/** Gộp mảng `nguon` của khuôn MCP thành một chuỗi dẫn nguồn đọc được */
function chuoiNguon(ds: readonly NguonMcp[]): string {
  return ds
    .slice(0, 3)
    .map((n) => `${n.loai}:${n.ma}${n.file_goc ? ` (${n.file_goc})` : ""}`)
    .join(" · ");
}

/** Đổi nhãn mức của agent về ba mục của khung — nhận cả cách gọi màu */
function docMuc(v: unknown): MucBaoCao {
  const s = typeof v === "string" ? v.trim().toLowerCase() : "";
  if (s === "can-quyet" || s === "do" || s === "red" || s === "đỏ") return "can-quyet";
  if (s === "da-lam" || s === "da_lam" || s === "done") return "da-lam";
  // Không nói rõ thì rơi vào "đáng chú ý" — cố ý KHÔNG mặc định vào "cần anh
  // quyết": đẩy nhầm lên mục đỏ vài lần là Giám đốc ngừng đọc mục đỏ.
  return "dang-chu-y";
}

function docSo(v: unknown): number | null {
  // ⛔ Luật cứng 3: không ước. Không phải số thì là null, KHÔNG phải 0.
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function docChuoi(o: Record<string, unknown>, ...ten: string[]): string {
  for (const t of ten) {
    const v = o[t];
    if (typeof v === "string" && v.trim() !== "") return v.trim();
  }
  return "";
}

/**
 * Bóc `du_lieu` của một câu trả lời MCP thành các dòng báo cáo.
 * Chịu được nhiều khuôn: mảng thẳng, hoặc `{ dong: [...] }`, hoặc `{ muc: [...] }`.
 * Item nào không có nội dung thì bỏ; nguồn thiếu thì lấy nguồn cấp câu trả lời
 * (khuôn MCP đã bảo đảm `nguon` không rỗng khi `ok = true`).
 */
export function bocDongTuKhuon(ket: KhuonTra, tenAgent: string): ThamSoDong[] {
  if (!ket.ok) return [];
  const nguonChung = chuoiNguon(ket.nguon);
  const tho = ket.du_lieu;
  let ds: unknown[] = [];
  if (Array.isArray(tho)) ds = tho;
  else if (typeof tho === "object" && tho !== null) {
    const o = tho as Record<string, unknown>;
    // "issue" là khoá mà công cụ CÓ THẬT `<agent>.danh_sach_issue` dùng —
    // thiếu nó thì lời gọi thành công mà báo cáo vẫn trống, và trống ở đây bị
    // hiểu nhầm là "tin tốt". Đã vấp đúng lỗi này 05/09.
    for (const k of ["issue", "dong", "muc", "items", "danh_sach"]) {
      if (Array.isArray(o[k])) {
        ds = o[k] as unknown[];
        break;
      }
    }
  }

  const ra: ThamSoDong[] = [];
  for (const it of ds) {
    if (typeof it !== "object" || it === null) continue;
    const o = it as Record<string, unknown>;
    const noiDung = docChuoi(o, "noi_dung", "noiDung", "tieu_de", "mo_ta");
    if (noiDung === "") continue;
    const nguonRieng = docChuoi(o, "nguon", "nguon_dan", "nguonDan");
    ra.push({
      muc: docMuc(o.muc ?? o.mucDo ?? o.muc_do),
      duAn: docChuoi(o, "du_an", "duAn", "ma_du_an") || null,
      noiDung,
      nguon: nguonRieng !== "" ? `${tenAgent} · ${nguonRieng}` : `${tenAgent} · ${nguonChung}`,
      soNgayAnhHuong: docSo(o.so_ngay_anh_huong ?? o.soNgayAnhHuong ?? o.so_ngay),
      doLlmSinh: o.do_llm_sinh === true || o.doLlmSinh === true,
    });
  }
  return ra;
}

// ─────────────────────────────────────────────────────────────
// 2. Dòng đầu từng dự án — hỏi Agent tiến độ, KHÔNG tự tính
// ─────────────────────────────────────────────────────────────

/** Ngày giờ VN của một mốc ISO — tái dùng gioVn, không tự đổi múi */
function ngayVnCua(iso: string): string {
  const t = new Date(iso);
  return Number.isNaN(t.getTime()) ? iso.slice(0, 10) : gioVn(t).ngay;
}

function chuoiHoacNull(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

/**
 * COD dự báo · mục tiêu · chậm N ngày lấy nguyên từ `tiendo.tom_tat_du_an`;
 * "so hôm qua" từ sổ mốc COD `tiendo.lich_su_du_bao`. Dự án chưa có tiến độ
 * vẫn có dòng ("chưa có tiến độ") — im lặng dễ nhầm với "không có vấn đề".
 */
async function hoiDauDuAn(p: ProjectInfo, ngay: string, tienDo: KhaiAgent | undefined): Promise<DauDuAn> {
  const nen: DauDuAn = {
    maDuAn: p.id,
    ten: p.name,
    coTienDo: false,
    codDuBao: null,
    codMucTieu: null,
    chamNgay: null,
    chamBaselineNgay: null,
    soHomQua: null,
    lyDoKhongSo: null,
    loi: null,
  };
  if (!tienDo) return { ...nen, loi: "chưa hỏi được tiến độ (Agent tiến độ đang tắt trong Danh bạ)" };
  const ket = await hoiAgent(tienDo.ma, `${tienDo.ma}.tom_tat_du_an`, `${lyDoGoi(ngay)} — dòng đầu dự án: COD dự báo, mục tiêu, chậm`, {
    tham_so: { ma_du_an: p.id },
  });
  if (!ket.ok) {
    // "chưa có tiến độ" là tình trạng thật của dự án, không phải lỗi
    return /chưa có tiến độ/i.test(ket.thong_diep) ? nen : { ...nen, loi: `chưa hỏi được tiến độ (${ket.thong_diep})` };
  }
  const d = (ket.du_lieu ?? {}) as Record<string, unknown>;
  const codDuBao = chuoiHoacNull(d.cod_du_bao ?? d.cod);
  const dau: DauDuAn = {
    ...nen,
    ten: chuoiHoacNull(d.projectName) ?? p.name,
    coTienDo: true,
    codDuBao,
    codMucTieu: chuoiHoacNull(d.cod_muc_tieu ?? d.codMucTieu),
    chamNgay: docSo(d.cham_ngay_so_muc_tieu ?? d.chamNgaySoMucTieu),
    // Luật 36 (14/10/2026): vế Baseline ĐÃ DUYỆT — null = chưa duyệt
    chamBaselineNgay: docSo(d.cham_ngay_so_baseline),
    codBaseline: chuoiHoacNull(d.cod_baseline),
  };
  const ls = await hoiAgent(tienDo.ma, `${tienDo.ma}.lich_su_du_bao`, `${lyDoGoi(ngay)} — so COD dự báo với hôm qua`, {
    tham_so: { ma_du_an: p.id, so_thang: 1 },
  });
  if (!ls.ok) return { ...dau, lyDoKhongSo: `chưa đọc được sổ mốc COD (${ls.thong_diep})` };
  const moc = ((ls.du_lieu ?? {}) as { moc?: MocCod[] }).moc ?? [];
  const ss = soVoiHomQua(codDuBao, Array.isArray(moc) ? moc : [], ngay, ngayVnCua);
  return { ...dau, soHomQua: ss.so, lyDoKhongSo: ss.lyDo };
}

// ─────────────────────────────────────────────────────────────
// 3. Dựng báo cáo — LUẬT 25/09: chỉ việc làm chậm COD
// ─────────────────────────────────────────────────────────────

export interface TuyChonDung {
  /** Ngày ISO giờ VN; mặc định hôm nay */
  ngay?: string;
  /** Ghi vào sổ lịch sử hay không (xem thử thì không ghi) */
  luu?: boolean;
  /** "B" = nhịp hẹn giờ tự chạy · "tay" = người bấm Dựng lại (ghi vào sổ nhật ký) */
  duong?: DuongGoi;
}

/** Bóc mảng thẻ thô từ câu trả lời `<agent>.danh_sach_issue` */
function mangThe(ket: KhuonTra): TheIssueTho[] {
  if (!ket.ok) return [];
  const d = ket.du_lieu;
  if (Array.isArray(d)) return d as TheIssueTho[];
  if (d && typeof d === "object" && Array.isArray((d as Record<string, unknown>).issue)) {
    return (d as Record<string, unknown>).issue as TheIssueTho[];
  }
  return [];
}

/**
 * DỰNG MỘT BẢN BÁO CÁO SÁNG theo luật 25/09.
 * Không bao giờ ném lỗi và không bao giờ trả về bản rỗng: dự án không có vấn
 * đề vẫn có dòng đầu (COD dự báo …), agent tắt thì ghi "chưa hỏi được".
 */
declare global {
  // eslint-disable-next-line no-var
  var __dangDungBaoCao: Map<string, Promise<BaoCaoSang>> | undefined;
}

export async function dungBaoCao(tuyChon: TuyChonDung = {}): Promise<BaoCaoSang> {
  // ⭐ 04/10 — đang dựng bản của ngày này thì CHỜ lượt đang chạy, không dựng lượt thứ hai
  // (đo 04/10: một lượt dựng mất > 1 phút vì AI chờ tới 120 giây → nhịp 07:00 chạy 3 lần).
  const ngay = tuyChon.ngay ?? gioVn(new Date()).ngay;
  const dang = (globalThis.__dangDungBaoCao ??= new Map());
  if (tuyChon.luu !== false) {
    const cho = dang.get(ngay);
    if (cho) return cho;
  }
  const viec = dungBaoCaoMotLuot({ ...tuyChon, ngay });
  if (tuyChon.luu === false) return viec;
  dang.set(ngay, viec);
  try {
    return await viec;
  } finally {
    if (dang.get(ngay) === viec) dang.delete(ngay);
  }
}

function dungBaoCaoMotLuot(tuyChon: TuyChonDung): Promise<BaoCaoSang> {
  // ⭐ Khuôn sổ bản 2 (7.1): một bản báo cáo sáng là MỘT chuỗi — mọi lượt hỏi 4 agent
  // mang cùng mã chuỗi; xong ghi dòng gốc `bao_cao_sang` với đúng chữ sẽ gửi Telegram.
  // Lồng trong nhịp/gửi (đã có dòng gốc) thì không ghi dòng thứ hai.
  return chayGocChuoi(
    {
      kenh: KENH_GOC.baoCaoSang,
      lyDoGoi: `dựng báo cáo sáng ${tuyChon.ngay ?? gioVn(new Date()).ngay}`,
      duong: tuyChon.duong ?? "tay",
    },
    () => dungBaoCaoTho(tuyChon),
    (bc) => ketXuatTelegram(bc),
  );
}

/** Kết quả gom thẻ issue của mọi agent theo từng dự án — đã lọc luật "làm chậm COD", gộp trùng và xếp nặng trước */
export interface KetQuaGomVanDe {
  duAn: DauDuAn[];
  vanDe: VanDeSang[];
  viecDoKhac: ViecKhac[];
  thieuSot: DongThieu[];
  soTheXet: number;
  soVao: number;
  soGop: number;
  /** Số thẻ issue ĐANG MỞ của từng dự án (cộng mọi agent) — báo cáo tháng dùng để đếm "còn N vấn đề khác" */
  soTheMo: Record<string, number>;
}

/**
 * GOM VẤN ĐỀ THEO DỰ ÁN — phần ĐI HỎI của báo cáo sáng, tách riêng 13/10/2026 để BÁO CÁO THÁNG (bảng 10) dùng
 * đúng MỘT luật "làm chậm COD" với báo cáo sáng (Mr. Đại chốt 13/10). Không LLM, không lưu, không áp luật động.
 */
async function gomTheoDuAn(cacDuAn: ProjectInfo[], ngay: string): Promise<KetQuaGomVanDe> {
  // ── Hỏi nang_luc từng con MỘT lần trước, rồi mới chạy song song theo dự án
  const agents = agentCanHoi();
  await Promise.all(agents.map((a) => nangLucCua(a, ngay)));
  const tienDo = agents.find((a) => a.ma === "tiendo");

  const ketQua = await Promise.all(
    cacDuAn.map(async (p) => {
      const [dau, ...cacCon] = await Promise.all([
        hoiDauDuAn(p, ngay, tienDo),
        ...agents.map((a) => hoiMotAgent(a, ngay, p.id)),
      ]);
      return { p, dau: dau as DauDuAn, cacCon: cacCon as KetQuaHoiMot[] };
    }),
  );

  const duAn: DauDuAn[] = [];
  const thieuSot: DongThieu[] = [];
  const daBaoThieu = new Set<string>();
  const soTheMo: Record<string, number> = {};
  let soTheXet = 0;
  let soVao = 0;
  let soGop = 0;
  const vanDe: VanDeSang[] = [];
  const viecDoKhac: ViecKhac[] = [];
  for (const { p, dau, cacCon } of ketQua) {
    duAn.push(dau);
    const cuaDuAn: VanDeSang[] = [];
    cacCon.forEach((r, i) => {
      const a = agents[i];
      soTheXet += r.the.length;
      soTheMo[p.id] = (soTheMo[p.id] ?? 0) + r.the.length;
      cuaDuAn.push(...locTheVao(r.the, p.id, a.ma, a.ten));
      viecDoKhac.push(...locViecDoKhac(r.the, p.id, a.ma, a.ten));
      if (r.cat) thieuSot.push({ ...r.cat, maDuAn: p.id, tenDuAn: dau.ten });
      if (!r.thieu) return;
      // ⭐ 04/10: thiếu ở MỘT dự án (cổng trả lỗi cho dự án này) ghi theo dự án; con nào
      // tắt / không mở công cụ thì lý do giống nhau ở mọi dự án — ghi một lần, không gắn dự án.
      if (r.theoDuAn) thieuSot.push({ ...r.thieu, maDuAn: p.id, tenDuAn: dau.ten });
      else if (!daBaoThieu.has(a.ma)) {
        daBaoThieu.add(a.ma);
        thieuSot.push(r.thieu);
      }
    });
    // Luật 36: «COD lùi N ngày» phải nói so với hệ nào — cùng một hệ cho mọi agent của dự án (xem heLuiCodCua)
    const he = heLuiCodCua(dau);
    for (const v of cuaDuAn) v.heLuiCod = he;
    soVao += cuaDuAn.length;
    const g = gopVaXep(cuaDuAn);
    soGop += g.soGop;
    vanDe.push(...g.vanDe);
  }
  return { duAn, vanDe, viecDoKhac, thieuSot, soTheXet, soVao, soGop, soTheMo };
}

/**
 * Cửa cho BÁO CÁO THÁNG: gom vấn đề của các dự án đang mở theo đúng luật báo cáo sáng, kèm tên việc cho mã WBS
 * (luật 30). Mỗi lượt hỏi agent vẫn đi qua `hoiAgent` nên có vết trong sổ (luật 29).
 */
export async function gomVanDeChoBaoCaoThang(): Promise<KetQuaGomVanDe> {
  const ngay = gioVn(new Date()).ngay;
  const gom = await gomTheoDuAn(duAnCanBao(), ngay);
  await dienTenWbs(gom.vanDe, gom.viecDoKhac, ngay);
  return gom;
}

async function dungBaoCaoTho(tuyChon: TuyChonDung): Promise<BaoCaoSang> {
  const ngay = tuyChon.ngay ?? gioVn(new Date()).ngay;
  const duong: DuongGoi = tuyChon.duong ?? "tay";
  const cacDuAn = duAnCanBao();
  const bc = dungKhung({ ngay, soDuAn: cacDuAn.length });

  const luat = docLuatConHieuLuc(ngay);
  bc.luatApDung = luat.map((l) => ({
    ma: l.ma,
    noiDung: l.noiDung,
    moTaHieuLuc: moTaHieuLuc(l),
  }));

  const gom = await gomTheoDuAn(cacDuAn, ngay);
  const { duAn, viecDoKhac, soTheXet, soVao, soGop } = gom;
  let vanDe = gom.vanDe;
  bc.thieuSot.push(...gom.thieuSot);

  // ── Luật động: "bỏ X" loại, "tập trung X" đẩy lên đầu (mục 6.2) — xét trên tiêu đề
  // 25/10/2026: «báo kỹ về Hướng Việt» phải khớp cả theo TÊN DỰ ÁN (tên, mã ngắn, tên gọi khác) — chỉ cho luật «tập trung»; luật «bỏ» vẫn chỉ xét tiêu đề việc
  const tenDuAnCua = new Map(cacDuAn.map((p) => [p.id, [p.name, p.ma, ...(p.tenKhac ?? [])].filter(Boolean).join(" ")]));
  const sauLuat = apDungLuat(
    vanDe.map((v) => {
      const noiDung = `${v.tieuDe} ${v.kem.map((k) => k.tieuDe).join(" ")}`;
      return { noiDung, noiDungKy: `${noiDung} ${tenDuAnCua.get(v.maDuAn) ?? ""}`, v };
    }),
    luat,
  );
  vanDe = sauLuat.dong.map((x) => x.v);

  // ── ⭐ 26/09 luật "mã kèm tên": điền tên việc cho mọi mã WBS (dòng gốc + dòng kèm
  //    + ⭐ 04/10 việc đỏ khác) — hỏi tiendo.tim_dau_viec MỘT lượt mỗi dự án có mã (đệm 10 phút, luật 29)
  await dienTenWbs(vanDe, viecDoKhac, ngay);

  // ── 🤖 câu hỏi quyết định — MỘT lượt LLM; lỗi thì bỏ câu hỏi, vẫn gửi phần số
  const ai = await ganCauHoi(vanDe, duAn, duong, ngay);

  bc.duAn = duAn;
  bc.vanDe = vanDe;
  bc.viecDoKhac = viecDoKhac;
  bc.diaChiMain = diaChiMain();
  bc.lienKetIssue = `${diaChiMain()}/alerts`;
  bc.thongKe = {
    soTheXet,
    soVao,
    soGop,
    soLuatBo: sauLuat.soBiLuatBo,
    cauHoiAi: ai.loi ? `không có câu hỏi — ${ai.loi}` : `${ai.soCau} câu${ai.soBiLoai > 0 ? `, bỏ ${ai.soBiLoai} câu có số ngoài khung` : ""}`,
  };
  // `dong` giữ cho màn lịch sử + đường cũ: mỗi vấn đề một dòng, nguồn = agent · mã issue
  bc.dong = vanDe
    .map((v) =>
      taoDong({
        muc: "can-quyet",
        duAn: duAn.find((d) => d.maDuAn === v.maDuAn)?.ten ?? v.maDuAn,
        noiDung: v.tieuDe,
        nguon: `${v.tenAgent}${v.idIssue ? ` · ${v.idIssue}` : ""}`,
        soNgayAnhHuong: v.soNgayLuiCod,
        doLlmSinh: v.doLlmSinh,
      }),
    )
    .filter((d): d is DongBaoCao => d !== null);
  if (sauLuat.soBiLuatBo > 0) {
    bc.thieuSot.push({
      ten: "Luật động",
      lyDo: `${sauLuat.soBiLuatBo} dòng bị luật "bỏ …" giấu đi — xem và xoá luật ở Báo cáo → tab Sáng`,
    });
  }

  if (tuyChon.luu !== false) {
    luuBaoCao(bc);
    // ⭐ 17/10/2026 (KE-HOACH/23): số các khối người nhận đang dùng — gom MỘT lần cho cả bản, lưu riêng theo ngày
    await damBaoKhoi(bc, danhSachNguoiNhan(), true);
  }
  return bc;
}

/**
 * Số các khối mà những người nhận `ds` cần cho bản `bc`. Đã có trong tệp của ngày thì dùng lại; thiếu cặp khối–dự án nào
 * (người kéo thêm khối sau 06:30, dựng lại bản…) thì gom bổ sung đúng phần thiếu rồi lưu. `lamMoi` = gom lại hết (lượt dựng).
 * Không ném lỗi — hỏng thì trả số đang có (khối in «chưa có số»).
 */
export async function damBaoKhoi(
  bc: BaoCaoSang,
  ds: readonly { boKhoi: NguoiNhan["boKhoi"]; duAnChon: readonly string[] | null }[],
  lamMoi = false,
  duocGoiAi = true,
): Promise<DuLieuKhoi | null> {
  if (!bc.duAn || !bc.vanDe) return null;
  const cu = docKhoi(bc.ngay);
  const co = lamMoi ? null : cu;
  try {
    // 27/10/2026: lượt dựng lại gom lại CẢ các khối đã gom trong ngày (màn xem trước, bấm thư viện) — trước đây chỉ gom
    // khối của người có nối Telegram rồi ghi đè tệp, nên khối khác mất số và hiện «chưa có số» dù vừa bấm Dựng lại.
    const daCo = lamMoi && cu ? Object.keys(cu.daGom).filter(laMaKhoi) : [];
    const dsDu = daCo.length > 0 ? [...ds, { boKhoi: daCo.map((ma) => ({ ma, phamVi: "cong-ty" as const })), duAnChon: null }] : ds;
    const { can, soKeoVe } = canCuaNguoiNhan(bc, dsDu);
    const thieu = phanThieu(co, can);
    if (thieu.size === 0) return co;
    const moi = await gomKhoi({ ngay: bc.ngay, duAn: bc.duAn, vanDe: bc.vanDe, can: thieu, soKeoVe, duocGoiAi });
    // Lượt không được gọi AI (Người xem mở màn) thì KHÔNG đánh dấu TQ-5 đã gom — lượt gửi sau còn viết câu mới
    if (!duocGoiAi) delete moi.daGom["TQ-5"];
    const gop = gopDuLieuKhoi(co, moi);
    luuKhoi(bc.ngay, gop);
    return gop;
  } catch (e) {
    console.error("[bao-cao-sang] gom số khối hỏng:", e);
    return co;
  }
}

/**
 * Điền `tenWbs` cho vấn đề có mã WBS — tên lấy từ Agent Tiến độ (Main không giữ
 * cây WBS). Tiến độ không trả được → để null, dòng in mã như cũ, không bịa tên.
 */
async function dienTenWbs(vanDe: VanDeSang[], viecDo: ViecKhac[], ngay: string): Promise<void> {
  const duAnCoMa = Array.from(
    new Set([
      ...vanDe.filter((v) => v.wbs || v.kem.some((k) => k.wbs)).map((v) => v.maDuAn),
      ...viecDo.filter((v) => v.wbs).map((v) => v.maDuAn),
    ]),
  );
  await Promise.all(
    duAnCoMa.map(async (ma) => {
      const { ten } = await layTuDienWbs(ma, `Báo cáo sáng ${ngay}: tên việc cho mã WBS (luật mã kèm tên 26/09)`);
      for (const v of vanDe.filter((x) => x.maDuAn === ma)) {
        for (const x of [v, ...v.kem]) if (x.wbs) x.tenWbs = ten[x.wbs] ?? null;
      }
      for (const v of viecDo.filter((x) => x.maDuAn === ma && x.wbs)) v.tenWbs = ten[v.wbs as string] ?? null;
    }),
  );
}

/** Dự án thật đang mở (sổ dự án của Main đã ẩn "Dự án demo") */
function duAnCanBao(): ProjectInfo[] {
  try {
    return listProjects();
  } catch {
    return [];
  }
}

/**
 * Những agent Main cần hỏi = đang bật trong Danh bạ, TRỪ chính nó.
 * Danh bạ hỏng thì trả mảng rỗng — báo cáo vẫn dựng, chỉ ghi "chưa hỏi được".
 */
export function agentCanHoi(): KhaiAgent[] {
  try {
    // 26/09: bỏ agent chỉ quan sát (quansat) — không có số liệu nghiệp vụ để báo
    return cacAgentDangBat(docDanhBaAgent()).filter((a) => a.ma !== TEN_AGENT_NAY && laAgentNghiepVu(a.ma));
  } catch {
    return [];
  }
}

/**
 * Cổng vẫn cắt ở trần (quá 100 thẻ mở) → một dòng thiếu sót nói rõ còn bao
 * nhiêu và xem đủ ở đâu. Không cắt → `null`.
 */
function dongCatTran(ket: KhuonTra, a: KhaiAgent, maDuAn?: string): DongThieu | null {
  const con = demTheConThieu(ket, mangThe(ket).length, GIOI_HAN_XIN_ISSUE);
  if (con === 0) return null;
  const link = lienKetManIssue(a);
  const duAn = maDuAn ? `dự án ${maNganDuAn(maDuAn) ?? maDuAn}: ` : "";
  return {
    ten: a.ten,
    lyDo:
      (con === null
        ? `${duAn}có thể còn thẻ chưa lấy về (đã nhận đủ ${GIOI_HAN_XIN_ISSUE} thẻ — trần của cổng)`
        : `${duAn}còn ${con} thẻ đang mở chưa lấy về`) + (link ? ` — xem ở ${link}` : ""),
  };
}

interface KetQuaHoiMot {
  the: TheIssueTho[];
  thieu: DongThieu | null;
  /** ⭐ 04/10 — `thieu` là của RIÊNG dự án này (agent vẫn sống, chỉ dự án này chưa có số) */
  theoDuAn?: boolean;
  cat?: DongThieu | null;
}

/**
 * Hỏi một agent bằng `<mã>.danh_sach_issue` — SAU KHI đã biết (qua nang_luc) nó mở
 * công cụ đó. Không mở, hoặc tắt, thì trả `thieu` — luật cứng 5: ghi rõ "chưa hỏi
 * được vì …", KHÔNG im lặng, KHÔNG bịa thay, và KHÔNG gọi mù để sổ đầy dòng lỗi.
 */
async function hoiMotAgent(a: KhaiAgent, ngay: string, maDuAn?: string): Promise<KetQuaHoiMot> {
  const tenCongCu = `${a.ma}.${CONG_CU_SANG}`;
  const nl = await nangLucCua(a, ngay);
  if (nl.congCu === null) {
    return { the: [], thieu: { ten: a.ten, lyDo: `chưa hỏi được vì ${nl.loi}` } };
  }
  if (!nl.congCu.includes(tenCongCu)) {
    return {
      the: [],
      thieu: { ten: a.ten, lyDo: `agent này chưa mở công cụ ${tenCongCu}` },
    };
  }
  // gioi_han: xin đủ trần — thiếu nó thì cổng trả mặc định 20 thẻ (lỗi đo 25/09)
  const ket = await hoiAgent(a.ma, tenCongCu, lyDoGoi(ngay), {
    tham_so: maDuAn ? { ma_du_an: maDuAn, gioi_han: GIOI_HAN_XIN_ISSUE } : { gioi_han: GIOI_HAN_XIN_ISSUE },
  });
  if (ket.ok) return { the: mangThe(ket), thieu: null, cat: dongCatTran(ket, a, maDuAn) };
  // "Sổ KHÔNG có thẻ nào đang mở" là TIN TỐT (issue-main/model.ts phân biệt một chỗ)
  if (laSoKhongCoTheMo(ket)) return { the: [], thieu: null };
  return { the: [], thieu: { ten: a.ten, lyDo: `chưa hỏi được vì ${ket.thong_diep}` }, theoDuAn: maDuAn !== undefined };
}

// ─────────────────────────────────────────────────────────────
// 4. Gửi
// ─────────────────────────────────────────────────────────────

export interface KetQuaGuiSang {
  baoCao: BaoCaoSang;
  chu: string;
  gui: KetQuaGui;
  /** ⭐ 04/10 — kết quả từng người nhận (không có = đường cũ một chat) */
  nguoiNhan?: KetQuaGuiMotNguoi[];
}

/**
 * Gửi báo cáo sáng của một ngày. Chưa dựng thì DỰNG NGAY rồi gửi — 07:00 mà
 * không có bản nào thì im lặng là lựa chọn tệ nhất (6.3).
 */
declare global {
  // eslint-disable-next-line no-var
  var __dangGuiBaoCao: Map<string, Promise<KetQuaGuiSang>> | undefined;
}

/**
 * `guiLai` = nút "Gửi lại" (Mr. Đại chốt 04/10 tối): gửi cả người ĐÃ nhận bản ngày này — dùng khi
 * dựng lại bản sau khi sửa số liệu. Mặc định (nhịp 07:00, nút "Gửi ngay") bỏ qua người đã nhận.
 */
export async function guiBaoCaoSang(ngay?: string, duong: DuongGoi = "tay", tuy: { guiLai?: boolean } = {}): Promise<KetQuaGuiSang> {
  const n = ngay ?? gioVn(new Date()).ngay;
  // Kiểm độc lập 04/10 🟡1: bấm "Gửi ngay" đúng lúc nhịp 07:00 đang gửi → CHỜ lượt đang chạy, không gửi lần hai
  const dang = (globalThis.__dangGuiBaoCao ??= new Map());
  const cho = dang.get(n);
  if (cho) return cho;
  const viec = chayGocChuoi(
    { kenh: KENH_GOC.baoCaoSang, lyDoGoi: `gửi báo cáo sáng ${n} qua Telegram`, duong },
    () => guiBaoCaoSangTho(n, duong, tuy.guiLai === true),
    (kq) => (kq.gui.ok ? kq.chu : { ok: false, ma_loi: "LOI_NOI_BO", thong_diep: kq.gui.thongDiep }),
  );
  dang.set(n, viec);
  try {
    return await viec;
  } finally {
    if (dang.get(n) === viec) dang.delete(n);
  }
}

/** Kết quả gửi cho MỘT người nhận */
export interface KetQuaGuiMotNguoi {
  ten: string;
  mau: string;
  soTin: number;
  ok: boolean;
  thongDiep: string;
}

/**
 * Gửi bản của một người (các tin nối tiếp). Tin nào hỏng thì dừng, ghi rõ lỗi.
 * ⭐ 05/10 luật agent mật: bản báo cáo lọc theo NGƯỜI CẦM ĐIỆN THOẠI nhận tin (`emailNhan`) — dòng Agent
 * Hợp đồng chỉ đi tới người được thấy hợp đồng dự án đó. Gửi thử thì người nhận là người bấm, không phải chủ bản.
 */
async function guiChoMotNguoi(
  bc: BaoCaoSang,
  ng: NguoiNhan,
  chatDich: string,
  duong: string,
  emailNhan: string = ng.email,
): Promise<KetQuaGuiMotNguoi> {
  const boLoc = boLocMatCuaNguoi(emailNhan);
  const bcLoc = locBaoCaoSang(bc, boLoc);
  // ⭐ 17/10/2026 (KE-HOACH/23): in theo BỘ KHỐI của người nhận (ba mẫu cũ = ba bộ mặc định); số khối gom bổ sung nếu thiếu
  const khoi = await damBaoKhoi(bc, [{ boKhoi: ng.boKhoi, duAnChon: ng.duAnChon }]);
  const { tinHtml, anh } = ketXuatBoKhoi({
    bc: bcLoc,
    khoi: khoi ? locDuLieuKhoi(khoi, boLoc) : null,
    boKhoi: ng.boKhoi,
    thamSo: ng.thamSo,
    duAnChon: ng.duAnChon,
    loc: boLoc,
  });
  const ids: number[] = [];
  let loi: string | null = null;
  for (const t of tinHtml) {
    // 25/10/2026: gửi HTML (đậm, bảng <pre>); Telegram không đọc được thì guiTelegramToi tự gửi lại bản chữ thuần
    const g = await guiTelegramToi(chatDich, t, { html: true });
    if (!g.ok) {
      loi = g.thongDiep;
      break;
    }
    if (g.messageId !== null) ids.push(g.messageId);
  }
  // Ảnh biểu đồ (tối đa 2, theo thứ tự khối — chốt 7). Ảnh hỏng không làm hỏng bản chữ đã gửi: ghi lỗi, đi tiếp
  const loiAnh: string[] = [];
  if (loi === null) {
    // 27/10/2026: hết trần 2 ảnh — mọi ảnh có nội dung gửi thành MỘT album (tối đa 10 ảnh một lượt)
    const daVe: { png: Buffer; chuThich: string }[] = [];
    for (const a of anh) {
      try {
        // Chú thích dài không còn vẽ trong ảnh (chữ 22 điểm) — gửi làm lời kèm ảnh, tối đa 1.000 ký tự (trần Telegram 1.024)
        const dai = typeof (a.dacTa as { chuThich?: unknown }).chuThich === "string" ? String((a.dacTa as { chuThich?: string }).chuThich) : "";
        const loiKem = (dai ? `${a.chuThich}\n${dai}` : a.chuThich).slice(0, 1000);
        daVe.push({ png: veAnh(a.dacTa), chuThich: loiKem });
      } catch (e) {
        loiAnh.push(`ảnh «${a.chuThich}»: không vẽ được (${e instanceof Error ? e.message : "lỗi không rõ"})`);
      }
    }
    const gAlbum = await guiAlbumToi(chatDich, daVe);
    ids.push(...gAlbum.messageIds);
    loiAnh.push(...gAlbum.loi.map((l) => `album ảnh: ${l}`));
  }
  ghiDaGui({
    ngay: bc.ngay,
    ma: ng.ma,
    email: ng.email,
    chatId: chatDich,
    mau: ng.mau,
    messageIds: ids,
    luc: new Date().toISOString(),
    ok: loi === null,
    loi,
    soKyTu: tinHtml.reduce((s, t) => s + t.length, 0),
    duong,
  });
  return {
    ten: ng.ten,
    mau: NHAN_MAU[ng.mau],
    soTin: ids.length,
    ok: loi === null,
    thongDiep: loi ?? `${tinHtml.length} tin chữ${anh.length > 0 ? ` + ${anh.length - loiAnh.length}/${anh.length} ảnh` : ""}${loiAnh.length > 0 ? ` (${loiAnh.join("; ")})` : ""}`,
  };
}

async function guiBaoCaoSangTho(n: string, duong: DuongGoi, guiLai = false): Promise<KetQuaGuiSang> {
  const bc = docBaoCaoNgay(n) ?? (await dungBaoCao({ ngay: n, duong }));
  const nhan = danhSachNguoiNhan();

  // Đường cũ (một bản → chat TELEGRAM_CHAT_ID) CHỈ khi chưa ai từng được chọn mẫu.
  // Đã có người chọn (kể cả "Không nhận") thì tôn trọng — kiểm độc lập 04/10 🟡3.
  if (nhan.length === 0) {
    if (!khoCoBanGhi()) {
      // Chat chung TELEGRAM_CHAT_ID không gắn một người → không mang dòng agent mật (05/10)
      const chu = ketXuatTelegram(locBaoCaoSang(bc, AN_HET_MAT));
      const gui = await guiTelegram(chu);
      return { baoCao: gui.ok && gui.luc ? danhDauDaGui(bc, gui.luc) : bc, chu, gui };
    }
    const cau = "Không ai nhận báo cáo sáng — chưa ai vừa có mẫu vừa nối Telegram.";
    return { baoCao: bc, chu: cau, gui: { ok: false, chuaCauHinh: false, thongDiep: cau, luc: null }, nguoiNhan: [] };
  }

  // Số khối còn thiếu của CẢ danh sách gom một lượt trước vòng gửi (người kéo thêm khối sau 06:30)
  await damBaoKhoi(bc, nhan);
  // Người đã nhận bản của ngày này (không tính gửi thử) thì KHÔNG gửi lại — chống gửi trùng lên lãnh đạo
  const daGui = docDaGui(400).filter((g) => g.ngay === n && g.ok && g.duong !== "thu");
  const kq: KetQuaGuiMotNguoi[] = [];
  for (const ng of nhan) {
    const truoc = daGui.find((g) => g.ma === ng.ma);
    if (truoc && !guiLai) {
      kq.push({ ten: ng.ten, mau: NHAN_MAU[ng.mau], soTin: 0, ok: true, thongDiep: `đã nhận lúc ${ngayGioVN(new Date(truoc.luc))}, không gửi lại` });
      continue;
    }
    kq.push(await guiChoMotNguoi(bc, ng, ng.chatId, duong));
  }
  const ok = kq.every((x) => x.ok);
  const chu = `Gửi ${kq.length} người: ${kq.map((x) => `${x.ten} (${x.mau}, ${x.thongDiep})`).join(" · ")}`;
  const luc = new Date().toISOString();
  return {
    baoCao: kq.some((x) => x.ok) ? danhDauDaGui(bc, luc) : bc,
    chu,
    gui: {
      ok,
      chuaCauHinh: false,
      thongDiep: ok ? `Đã gửi báo cáo sáng cho ${kq.length} người.` : `Có người chưa gửi được — ${chu}`,
      luc: ok ? luc : null,
    },
    nguoiNhan: kq,
  };
}

/**
 * ⭐ 04/10 — GỬI THỬ: bản của người `ma` gửi về chat Telegram của NGƯỜI BẤM (xem trên
 * điện thoại đúng như người kia sẽ nhận). Không tính là đã gửi cho người kia.
 */
export async function guiThu(ma: string, emailNguoiBam: string, ngay?: string): Promise<{ ok: boolean; thongDiep: string }> {
  const n = ngay ?? gioVn(new Date()).ngay;
  const toi = danhSachNguoiDungDayDu().find((u) => u.email === emailNguoiBam);
  if (!toi?.telegramChatId) {
    return { ok: false, thongDiep: "Tài khoản của bạn chưa nối Telegram — mở menu tên người (góc trên bên phải) → «Nối Telegram»." };
  }
  const dong = bangNguoiNhan().find((d) => d.ma === ma);
  if (!dong || !dong.mau || !dong.thamSo) return { ok: false, thongDiep: "Người này chưa có mẫu báo cáo — chọn mẫu trước." };
  const bc = docBaoCaoNgay(n);
  if (!bc) return { ok: false, thongDiep: "Chưa có bản báo cáo của ngày này — bấm Dựng lại trước." };
  const kq = await guiChoMotNguoi(
    bc,
    { ma, email: dong.email, ten: dong.ten, chatId: toi.telegramChatId, mau: dong.mau, thamSo: dong.thamSo, duAnChon: dong.duAnChon, boKhoi: dong.boKhoi },
    toi.telegramChatId,
    "thu",
    emailNguoiBam,
  );
  return kq.ok
    ? { ok: true, thongDiep: `Đã gửi thử bản của ${dong.ten} (${kq.mau}, ${kq.soTin} tin) về Telegram của bạn.` }
    : { ok: false, thongDiep: kq.thongDiep };
}

/**
 * Nhắn NGAY một issue mức đỏ, không chờ 07:00 (mục 7 dòng cuối).
 * Chưa cấu hình Telegram thì trả "chưa cấu hình" — vẫn không ném lỗi.
 */
export async function nhanNgay(noiDung: string, nguon: string): Promise<KetQuaGui> {
  const d = taoDong({ muc: "can-quyet", noiDung, nguon, soNgayAnhHuong: null });
  if (!d) {
    // Luật cứng 1 áp cả ở đây: không nguồn thì không nhắn, chứ không nhắn trống
    return {
      ok: false,
      chuaCauHinh: false,
      thongDiep: "Không nhắn — thiếu nội dung hoặc thiếu nguồn dẫn.",
      luc: null,
    };
  }
  return guiTelegram(
    ganNhanHeThong(`🔴 Issue đỏ — cần anh xem ngay\n   • ${d.noiDung}\n     ↳ nguồn: ${d.nguon}`),
  );
}

// ─────────────────────────────────────────────────────────────
// 5. Nhịp định kỳ (mục 7)
// ─────────────────────────────────────────────────────────────

const FILE_NHIP = () => path.join(gocDuLieu(), "bao-cao-sang-nhip.json");

export function docTrangThaiNhip(): Record<string, string> {
  try {
    return JSON.parse(fs.readFileSync(FILE_NHIP(), "utf8")) as Record<string, string>;
  } catch {
    return {};
  }
}

function ghiTrangThaiNhip(ma: MaNhip, ngay: string): void {
  try {
    const t = docTrangThaiNhip();
    t[ma] = ngay;
    fs.mkdirSync(path.dirname(FILE_NHIP()), { recursive: true });
    fs.writeFileSync(FILE_NHIP(), JSON.stringify(t, null, 2), "utf8");
  } catch {
    // Mất trạng thái thì mai chạy lại — KHÔNG chạy bù để khỏi dồn toa
  }
}

/**
 * Chạy một nhịp. Không ném lỗi: vòng hẹn giờ không được phép làm sập server.
 * ⭐ Khuôn sổ bản 2 (7.1): mỗi nhịp là MỘT chuỗi có dòng gốc — dựng/gửi báo cáo
 * sáng là kênh `bao_cao_sang`, hai nhịp nhắc còn lại là việc hẹn giờ `viec_dem`.
 */
export async function chayNhip(ma: MaNhip, boi: string): Promise<string> {
  const laBaoCaoSang = ma === "dung-bao-cao-dem" || ma === "gui-bao-cao-sang";
  return chayGocChuoi(
    {
      kenh: laBaoCaoSang ? KENH_GOC.baoCaoSang : KENH_GOC.viecDem,
      lyDoGoi: `nhịp "${ma}" — ${boi === "tu-dong" ? "tự chạy theo giờ" : `người bấm: ${boi}`}`,
      duong: boi === "tu-dong" ? "B" : "tay",
      thamSo: { nhip: ma },
    },
    () => chayNhipTho(ma, boi),
    (tomTat) => tomTat,
  );
}

// ⭐ Kiểm độc lập 04/10 🟡4 — nhịp hỏng giữa chừng không được IM LẶNG (6.3): ghi kết quả lần chạy
// gần nhất của từng nhịp (lỗi = câu tiếng Việt, null = ổn) để màn Báo cáo sáng hiện ra.
const FILE_KQ_NHIP = () => path.join(gocDuLieu(), "bao-cao-sang-nhip-ket-qua.json");

export interface KetQuaNhip {
  ngay: string;
  luc: string;
  /** null = chạy ổn; chuỗi = câu tiếng Việt vì sao hỏng */
  loi: string | null;
  tomTat: string;
}

export function docKetQuaNhip(): Record<string, KetQuaNhip> {
  try {
    return JSON.parse(fs.readFileSync(FILE_KQ_NHIP(), "utf8")) as Record<string, KetQuaNhip>;
  } catch {
    return {};
  }
}

function ghiKetQuaNhip(ma: MaNhip, kq: KetQuaNhip): void {
  try {
    const t = docKetQuaNhip();
    t[ma] = kq;
    fs.mkdirSync(path.dirname(FILE_KQ_NHIP()), { recursive: true });
    fs.writeFileSync(FILE_KQ_NHIP(), JSON.stringify(t, null, 2), "utf8");
  } catch {
    // mất vết kết quả thì thôi — không làm hỏng nhịp
  }
}

async function chayNhipTho(ma: MaNhip, boi: string): Promise<string> {
  const ngay = gioVn(new Date()).ngay;
  // ⭐ 04/10 — ghi "đã chạy hôm nay" NGAY TỪ ĐẦU, không đợi chạy xong. Đo 04/10: ghi ở
  // cuối + một lượt chạy > 60 giây → vòng kiểm phút sau thấy "chưa chạy" → gửi 3 lần
  // (07:02 · 07:03 · 07:04). Hỏng giữa chừng thì KHÔNG chạy bù, nhưng ghi lỗi để màn hiện ra.
  if (boi === "tu-dong") ghiTrangThaiNhip(ma, ngay);
  let tomTat: string;
  let loi: string | null = null;
  try {
    if (ma === "dung-bao-cao-dem") {
      const bc = await dungBaoCao({ ngay, duong: boi === "tu-dong" ? "B" : "tay" });
      tomTat = `Đã dựng báo cáo cho ${ngay}: ${bc.dong.length} dòng, ${bc.thieuSot.length} chỗ chưa hỏi được`;
    } else if (ma === "gui-bao-cao-sang") {
      const kq = await guiBaoCaoSang(ngay, boi === "tu-dong" ? "B" : "tay");
      tomTat = kq.gui.thongDiep;
      if (!kq.gui.ok) loi = kq.gui.thongDiep;
    } else if (ma === "nhac-bc-tuan") {
      const ket = await hoiAgent(
        "tiendo",
        "tiendo.bao_cao_tuan",
        "nhắc Agent tiến độ đã dựng nháp báo cáo tuần chưa (PLAN-MAIN-AGENT mục 7)",
      );
      const chu = ket.ok
        ? "🟡 Nhắc: Agent tiến độ đã có nháp báo cáo tuần."
        : `🟡 Nhắc: chưa lấy được nháp báo cáo tuần — ${ket.thong_diep}`;
      const g = await guiTelegram(ganNhanHeThong(chu));
      tomTat = g.ok ? "Đã nhắc báo cáo tuần" : g.thongDiep;
      if (!g.ok) loi = g.thongDiep;
    } else {
      // nhap-bc-thang
      const ket = await hoiAgent(
        "tiendo",
        "tiendo.bao_cao_thang",
        "dựng bản nháp báo cáo tháng theo mẫu mục 2 (PLAN-MAIN-AGENT mục 7)",
      );
      const chu = ket.ok
        ? "📄 Đã có dữ liệu dựng nháp báo cáo tháng — mở trên web để soát."
        : `📄 Chưa dựng được nháp báo cáo tháng — ${ket.thong_diep}`;
      const g = await guiTelegram(ganNhanHeThong(chu));
      tomTat = g.ok ? "Đã báo nháp báo cáo tháng" : g.thongDiep;
      if (!g.ok) loi = g.thongDiep;
    }
  } catch (e) {
    loi = `Nhịp "${ma}" lỗi: ${e instanceof Error ? e.message : "không rõ"}`;
    tomTat = loi;
  }
  ghiKetQuaNhip(ma, { ngay, luc: new Date().toISOString(), loi, tomTat });
  return tomTat;
}

declare global {
  // eslint-disable-next-line no-var
  var __nhipBaoCaoSangDaBat: boolean | undefined;
  // eslint-disable-next-line no-var
  var __nhipDangChay: Set<MaNhip> | undefined;
  /** Vòng kiểm của BẢN MÃ MỚI NHẤT — thân mô-đun gán lại mỗi lần dev biên dịch lại (G4, 18/10/2026) */
  // eslint-disable-next-line no-var
  var __nhipBaoCaoSangKiem: (() => void) | undefined;
}

/** Một nhịp kiểm: nhịp định kỳ nào tới giờ mà hôm nay chưa chạy thì chạy (không chạy chồng — cờ dùng chung mọi bản mô-đun) */
function kiemNhipBaoCaoSang(): void {
  try {
    const bay = gioVn(new Date());
    const trangThai = docTrangThaiNhip();
    const dangChay = (globalThis.__nhipDangChay ??= new Set());
    for (const nhip of NHIP_DINH_KY) {
      // Lớp chặn thứ hai: nhịp còn đang chạy (kể cả khi ghi trạng thái hỏng) thì không chạy chồng
      if (dangChay.has(nhip.ma)) continue;
      if (denGioChayNhip(nhip, bay, trangThai[nhip.ma] ?? null)) {
        dangChay.add(nhip.ma);
        void chayNhip(nhip.ma, "tu-dong").finally(() => dangChay.delete(nhip.ma));
      }
    }
  } catch {
    // vòng kiểm không được phép làm sập server
  }
}
// Vì sao có con trỏ toàn cục (G4 — Mr. Đại gật 18/10/2026, chép cách agent Tiến độ 17a9ac3): `setInterval` giữ hàm của LẦN NẠP
// ĐẦU — dev sửa mã báo cáo sáng mà không khởi động lại cổng thì 07:00 vẫn gửi bằng mã cũ (17/10 Tiến độ: «quét tối» chạy mã cũ
// 12 giờ, đè mất bản 🤖 34 bộ). Mỗi lần mô-đun nạp lại (có lượt mở trang / gọi cổng sau khi sửa) con trỏ trỏ sang mã mới;
// `setInterval` chỉ gọi qua con trỏ. Vẫn hở nếu sửa xong không ai mở trang nào trước giờ chạy — khởi động lại cổng vẫn là cách chắc.
globalThis.__nhipBaoCaoSangKiem = kiemNhipBaoCaoSang;

/**
 * Vòng kiểm mỗi phút — khởi động MỘT lần cho cả tiến trình.
 * Gọi lười từ route `/api/bao-cao-sang` thay vì từ layout: layout là file của
 * phần khác, không đụng vào (các agent đang viết song song).
 */
export function khoiDongNhipBaoCaoSang(): void {
  if (globalThis.__nhipBaoCaoSangDaBat) return;
  globalThis.__nhipBaoCaoSangDaBat = true;
  setInterval(() => {
    (globalThis.__nhipBaoCaoSangKiem ?? kiemNhipBaoCaoSang)();
  }, 60_000);
}
