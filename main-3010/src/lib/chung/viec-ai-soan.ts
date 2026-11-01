// ============================================================
// viec-ai-soan.ts — VIỆC AI SOẠN SẴN, NGƯỜI BẤM MỚI GIAO
// (VIEC-CUA-TOI-v2.0 · LOI-DUNG-CHUNG 6b: "Việc AI soạn sẵn → NGƯỜI BẤM mới
//  giao" · PLAN-AGENT-TIEN-DO mục 10: issue nguồn 5 → gợi ý giao việc)
//
// Luồng: trên thẻ cảnh báo bấm "AI soạn việc giao" → LLM soạn TÊN + MÔ TẢ
// (kèm trích issue) → lưu NHÁP vào file này → màn Việc của tôi hiện nháp ở
// khối "Việc AI soạn chờ duyệt" (04/10/2026, 6g.7 mục 3): người chọn người/đơn vị
// nhận rồi bấm "Gửi" → thành việc ở agent Công việc; nút "Bỏ" xoá nháp.
// AI KHÔNG bao giờ tự gửi lên Base. Server-only.
//
// LUẬT 33 (Mr. Đại chốt 04/10/2026): trước khi LLM soạn → GIỮ CHỖ (nháp "đang hỏi") → hỏi 4 agent kia có trùng không
// (người đang chờ: 1 lần 15 giây, 2 lần còn lại hỏi ngầm — trùng muộn thì GẮN CỜ lên nháp). Trùng ngay → không soạn,
// nháp thành BẢN GHI TRÙNG mang câu "Việc này đã được agent X soạn…"; người bấm "Vẫn soạn việc riêng" thì soạn bình thường.
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { gocDuLieu } from "@/lib/goc-du-lieu";
import { runAI } from "@/lib/ai/providers";
import { goiCoGhi } from "@/lib/nhat-ky/so";
import type { TheCanhBao } from "@/lib/canh-bao/model";
import { LUAT_MA_KEM_TEN, rutGonTen, taoTuDien } from "@/lib/chung/ma-kem-ten";
import { LUAT_NHANH_CHAM_THEO_NGAY } from "@/lib/chung/luat-nhanh-cham";
import { ganTenLlm } from "@/lib/chung/tu-dien-ma-du-an";
import { listProjects } from "@/lib/projects";
import { banGhiHoiTrung, chuanHanHoiTrung, rutGonHoiTrung, type BanGhiHoiTrung, type CauHoiTrung, type KetQuaHoiTrung } from "@/lib/chung/hoi-trung-kieu";
import { hoiTrungTruocKhiSoan } from "@/lib/chung/hoi-trung-hoi";
import type { DuongGoi } from "@/lib/nhat-ky/model";

export interface NhapViecAi {
  id: string;
  /** ISO lúc soạn */
  luc: string;
  /** Người (app, phần trước @ email) đã bấm nút soạn — nháp là của người này */
  nguoi: string;
  /** Mã issue nguồn (ISS-… / DX-…) */
  tuIssue: string;
  ten: string;
  moTa: string;
  /** dd/mm/yyyy — LLM chỉ gợi ý khi issue có mốc rõ */
  han?: string;
  projectId?: string;
  /** Username Base sẽ giao (05/09 — nháp soạn từ câu nói đã chọn sẵn người) */
  giaoCho?: string;
  /** 04/10/2026 (Mr. Đại chốt): ĐÃ GIAO sang agent Công việc — nháp giữ lại làm vết (thẻ cảnh báo hiện "✓ Đã giao",
   *  máy khỏi soạn lại), KHÔNG hiện ở Việc của tôi nữa */
  daGiao?: { maViec: string | null; luc: string };
  /** LUẬT 33 (Mr. Đại chốt 04/10/2026): nháp đang GIỮ CHỖ chờ hỏi các agent khác — chưa hiện cho người duyệt */
  dangHoi?: boolean;
  /** LUẬT 33: kết quả hỏi trùng. `trung` có (không `muon`) → nháp KHÔNG hiện như việc chờ duyệt, thay bằng câu
   *  "Việc này đã được agent X soạn giao việc có nội dung là …" (tomTat) + nút "Vẫn soạn việc riêng".
   *  `muon` = trùng thấy ở lượt hỏi ngầm sau khi đã soạn → nháp vẫn hiện, kèm cờ */
  hoiTrung?: BanGhiHoiTrung;
  /** Người bấm "Vẫn soạn việc riêng" — gạt kết quả trùng khi 🤖 AI phán nhầm (anh chốt 04/10 23:00) */
  vanSoan?: { nguoi: string; luc: string };
  /** Đợt ③ (Tiến độ · Hợp đồng): nháp CHUNG máy soạn từ issue — Main chỉ nhận qua bảng tổng (đợt ④), không tự soạn loại này */
  chung?: boolean;
  /** `may` = máy soạn (0 token) · `ai` = 🤖 AI soạn/viết lại */
  nguonSoan?: "may" | "ai";
}

/** Nháp giữ chỗ quá 10 phút vẫn "đang hỏi" = lượt soạn chết giữa chừng (máy tắt, lỗi) — không còn giữ chỗ */
export const GIU_CHO_TOI_DA_MS = 10 * 60_000;

/** Giữ chỗ còn sống (chưa quá 10 phút) */
export function giuChoConSong(n: Pick<NhapViecAi, "dangHoi" | "luc">, bayGio = Date.now()): boolean {
  return !!n.dangHoi && bayGio - Date.parse(n.luc) < GIU_CHO_TOI_DA_MS;
}

/** BẢN GHI TRÙNG (Luật 33): lúc soạn hỏi thấy agent khác đã soạn → không soạn, chỉ giữ câu trùng chờ người quyết */
export function laBanGhiTrung(n: Pick<NhapViecAi, "hoiTrung" | "vanSoan">): boolean {
  return !!n.hoiTrung?.trung && !n.hoiTrung.muon && !n.vanSoan;
}

const THU_MUC = path.join(gocDuLieu(), "viec");
const FILE = path.join(THU_MUC, "viec-ai-soan.json");

function docTatCa(): NhapViecAi[] {
  try {
    const raw = JSON.parse(fs.readFileSync(FILE, "utf8")) as unknown;
    return Array.isArray(raw) ? (raw as NhapViecAi[]) : [];
  } catch {
    return [];
  }
}

function ghiTatCa(ds: NhapViecAi[]): void {
  fs.mkdirSync(THU_MUC, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(ds, null, 2) + "\n", "utf8");
}

/** MỌI nháp (mọi người) — Luật 33: so trùng với câu hỏi của agent khác */
export function docTatCaNhap(): NhapViecAi[] {
  return docTatCa();
}

/** Đọc-sửa-ghi MỘT nháp theo mã (đọc lại tệp mỗi lần — lượt hỏi ngầm có thể ghi xen giữa) */
function capNhatNhap(id: string, sua: (n: NhapViecAi) => void): NhapViecAi | null {
  const ds = docTatCa();
  const n = ds.find((x) => x.id === id);
  if (!n) return null;
  sua(n);
  ghiTatCa(ds);
  return n;
}

/** Nháp chờ duyệt của một người, mới soạn trước — bỏ nháp đang giữ chỗ và bản ghi trùng (Luật 33) */
export function docNhapCua(nguoi: string): NhapViecAi[] {
  return docTatCa()
    .filter((n) => n.nguoi === nguoi && !n.daGiao && !n.dangHoi && !laBanGhiTrung(n))
    .sort((a, b) => b.luc.localeCompare(a.luc));
}

/**
 * GHI THẲNG một nháp việc (05/09 — lệnh Mr. Đại: giao việc bằng câu nói, không
 * cần thẻ cảnh báo nào). Trợ lý đã có sẵn tên/mô tả/người nhận thì gọi hàm này;
 * nháp hiện ở màn Việc của tôi (khối "Việc AI soạn chờ duyệt") chờ người bấm Gửi.
 */
export interface NhapTuDoVao {
  nguoi: string;
  ten: string;
  moTa: string;
  han?: string;
  giaoCho?: string;
  projectId?: string;
  /** Khoá nguồn khi MÁY soạn (C05: "IMLANG-<wbs>-<ngày>") — để không soạn trùng; người nói thì rỗng */
  tuIssue?: string;
}

export function ghiNhapTuDo(n: NhapTuDoVao): NhapViecAi {
  const nhap = taoNhapTuDo(n);
  const ds = docTatCa();
  ds.push(nhap);
  ghiTatCa(ds);
  return nhap;
}

function taoNhapTuDo(n: NhapTuDoVao): NhapViecAi {
  return {
    id: `nhap-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    luc: new Date().toISOString(),
    nguoi: n.nguoi,
    tuIssue: n.tuIssue ?? "", // rỗng = soạn từ câu nói, không từ thẻ cảnh báo
    ten: n.ten.trim(),
    moTa: n.moTa.trim(),
    han: n.han,
    giaoCho: n.giaoCho,
    projectId: n.projectId,
  };
}

/** Mã ngắn dự án (HV, N3A…) từ projectId — null khi không thuộc dự án */
function maNganDuAn(projectId: string | undefined): string | null {
  return projectId ? (listProjects().find((p) => p.id === projectId)?.ma ?? null) : null;
}

/**
 * LUẬT 33 cho việc soạn từ CÂU NÓI (trợ lý chat: soạn nháp / giao thẳng) — người đang chờ nên hỏi 1 lần chờ 15 giây.
 * `sauKhiHoiNot` nhận kết quả đủ 3 lần (agent im ở lần 1 được hỏi ngầm tiếp).
 */
export function hoiTrungCauNoi(
  v: { ten: string; moTa?: string; han?: string | null; maDuAn?: string | null; projectId?: string; lyDo?: string; lucGiuCho?: string },
  nc: { duong: DuongGoi; nguoi: string; sauKhiHoiNot?: (kq: KetQuaHoiTrung) => void },
): Promise<KetQuaHoiTrung> {
  const cau: CauHoiTrung = {
    noi_dung: rutGonHoiTrung(v.moTa ? `${v.ten} — ${v.moTa}` : v.ten, 400),
    ly_do: rutGonHoiTrung(v.lyDo || "người dùng yêu cầu trong trợ lý chat Main", 300),
    ma_du_an: v.maDuAn ?? maNganDuAn(v.projectId),
    han: chuanHanHoiTrung(v.han) ?? null, // kiểm lần 5 🔴: nháp chat giữ dd/mm/yyyy — khuôn hỏi là yyyy-mm-dd
    luc_giu_cho: v.lucGiuCho ?? null,
  };
  return hoiTrungTruocKhiSoan(cau, { cho: "nguoi", duong: nc.duong, duAn: v.projectId, nguoi: nc.nguoi, sauKhiHoiNot: nc.sauKhiHoiNot });
}

/**
 * Ghi nháp từ câu nói KÈM hỏi trùng (Luật 33): giữ chỗ → hỏi → trùng thì nháp thành BẢN GHI TRÙNG (không hiện ở Việc của
 * tôi) và trả `trung`; không trùng thì nháp hiện bình thường. `vanSoan` = người xác nhận vẫn soạn việc riêng — bỏ bước hỏi,
 * dùng lại bản ghi trùng cùng tên nếu có.
 */
export async function ghiNhapCoHoiTrung(
  n: NhapTuDoVao,
  tuyChon: { duong: DuongGoi; vanSoan?: boolean; lyDo?: string },
): Promise<{ nhap: NhapViecAi; trung?: BanGhiHoiTrung }> {
  const luc = new Date().toISOString();
  if (tuyChon.vanSoan) {
    const ds = docTatCa();
    const ten = chuanTenNhap(n.ten);
    const cu = ds.find(
      (x) => x.nguoi === n.nguoi && !x.daGiao && laBanGhiTrung(x) && (n.tuIssue ? x.tuIssue === n.tuIssue : !x.tuIssue && chuanTenNhap(x.ten) === ten),
    );
    const moi = { ...taoNhapTuDo(n), ...(cu ? { id: cu.id, hoiTrung: cu.hoiTrung } : {}), vanSoan: { nguoi: n.nguoi, luc } };
    ghiTatCa(cu ? ds.map((x) => (x.id === cu.id ? moi : x)) : [...ds, moi]);
    return { nhap: moi };
  }
  const giu: NhapViecAi = { ...taoNhapTuDo(n), dangHoi: true };
  const ds = docTatCa();
  ds.push(giu);
  ghiTatCa(ds);
  const kq = await hoiTrungCauNoi(
    { ten: n.ten, moTa: n.moTa, han: n.han ?? null, projectId: n.projectId, lyDo: tuyChon.lyDo, lucGiuCho: giu.luc },
    {
      duong: tuyChon.duong,
      nguoi: n.nguoi,
      sauKhiHoiNot: (kq2) =>
        void capNhatNhap(giu.id, (x) => {
          if (!x.daGiao) x.hoiTrung = banGhiHoiTrung(kq2, new Date().toISOString(), true);
        }),
    },
  );
  const ban = banGhiHoiTrung(kq);
  const sau =
    capNhatNhap(giu.id, (x) => {
      delete x.dangHoi;
      x.hoiTrung = ban;
    }) ?? giu;
  return kq.trung ? { nhap: sau, trung: ban } : { nhap: sau };
}

/** Tên nháp chuẩn hoá để so trùng: thường hoá, gộp khoảng trắng */
export function chuanTenNhap(ten: string): string {
  return ten.normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Đánh dấu ĐÃ GIAO một nháp + mọi nháp TRÙNG của cùng người — nháp từ thẻ: mọi nháp của cùng thẻ; nháp từ câu nói: cùng tên.
 * 04/10/2026: AI từng soạn 2 bản cho một issue, giao xong một bản thì bản kia nằm lại như "giao chưa ăn" (Mr. Đại bắt). Trả số nháp đánh dấu.
 */
export function danhDauDaGiao(id: string, nguoi: string, maViec: string | null): number {
  const ds = docTatCa();
  const goc = ds.find((n) => n.id === id && n.nguoi === nguoi);
  if (!goc) return 0;
  const ten = chuanTenNhap(goc.ten);
  const vet = { maViec, luc: new Date().toISOString() };
  let dem = 0;
  for (const n of ds) {
    if (n.daGiao || n.nguoi !== nguoi) continue;
    if (n.id === id || (goc.tuIssue ? n.tuIssue === goc.tuIssue : !n.tuIssue && chuanTenNhap(n.ten) === ten)) {
      n.daGiao = vet;
      dem++;
    }
  }
  ghiTatCa(ds);
  return dem;
}

export interface NhapCuaThe {
  coNhap: boolean;
  /** Có khoá = đã giao (null = giao rồi nhưng không rõ mã việc) */
  maViec?: string | null;
  /** Luật 33: người này bấm soạn, hỏi thấy agent khác đã soạn — câu "Việc này đã được agent X soạn…" */
  trung?: string;
}

/** Thẻ cảnh báo → đã có nháp chờ duyệt của người này / đã giao (của bất kỳ ai) / bản ghi trùng — để thay nút "AI soạn việc giao" */
export function nhapTheoThe(khoaNguoi: string[]): Record<string, NhapCuaThe> {
  const kq: Record<string, NhapCuaThe> = {};
  for (const n of docTatCa()) {
    if (!n.tuIssue) continue;
    const o = (kq[n.tuIssue] ??= { coNhap: false });
    if (n.daGiao) o.maViec = n.daGiao.maViec ?? o.maViec ?? null;
    else if (khoaNguoi.includes(n.nguoi) && !n.dangHoi) {
      if (laBanGhiTrung(n)) o.trung = n.hoiTrung!.tomTat;
      else o.coNhap = true;
    }
  }
  return kq;
}

function xoaNhapTheoMa(id: string): void {
  const ds = docTatCa();
  const sau = ds.filter((n) => n.id !== id);
  if (sau.length !== ds.length) ghiTatCa(sau);
}

export function xoaNhap(id: string, nguoi: string): boolean {
  const ds = docTatCa();
  const sau = ds.filter((n) => !(n.id === id && n.nguoi === nguoi));
  if (sau.length === ds.length) return false;
  ghiTatCa(sau);
  return true;
}

const HE_THONG = `Bạn là trợ lý của Ban QLDA điện gió Việt Nam. Từ MỘT thẻ cảnh báo tiến độ, soạn sẵn MỘT công việc để giao ở agent Công việc (hệ thống giao việc nội bộ của công ty).

Luật:
- "ten": mệnh lệnh ngắn gọn, hành động được, CÓ SỐ khi thẻ có số (vd "Bổ sung 1 trạm trộn + 3 xe bồn cho móng TB04 trước 05/09").
- "moTa": 2–4 câu — vì sao phải làm (dẫn số của thẻ), làm gì, xong trước khi nào.
- "han": dd/mm/yyyy CHỈ khi thẻ nêu mốc rõ ràng; không rõ thì bỏ trống, ĐỪNG bịa.
- Chỉ dùng thông tin trong thẻ, không thêm số liệu ngoài.
- ${LUAT_MA_KEM_TEN}
- ${LUAT_NHANH_CHAM_THEO_NGAY}

Trả về DUY NHẤT một object JSON, không lời dẫn, không rào \`\`\`:
{"ten":"...","moTa":"...","han":"dd/mm/yyyy hoặc bỏ"}`;

/** Bóc object JSON — thiếu ten/moTa thì trả null (không đoán) */
export function docNhapTuTraLoi(raw: string): { ten: string; moTa: string; han?: string } | null {
  const s = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const dau = s.indexOf("{");
  const cuoi = s.lastIndexOf("}");
  if (dau < 0 || cuoi <= dau) return null;
  try {
    const o = JSON.parse(s.slice(dau, cuoi + 1)) as Record<string, unknown>;
    const ten = typeof o.ten === "string" ? o.ten.trim() : "";
    const moTa = typeof o.moTa === "string" ? o.moTa.trim() : "";
    if (ten === "" || moTa === "") return null;
    const han = typeof o.han === "string" && /^\d{2}\/\d{2}\/\d{4}$/.test(o.han.trim())
      ? o.han.trim()
      : undefined;
    return { ten, moTa, ...(han ? { han } : {}) };
  } catch {
    return null;
  }
}

/** Câu hỏi trùng từ một thẻ cảnh báo — "tôi định giao việc <tiêu đề + đề xuất> vì <phân tích>" */
export function cauHoiTuThe(the: TheCanhBao, projectId: string | undefined, lucGiuCho: string): CauHoiTrung {
  const wbs = the.wbs?.trim() ?? "";
  return {
    noi_dung: rutGonHoiTrung(`${the.tieuDe} — đề xuất: ${the.deXuat}`, 400),
    ly_do: rutGonHoiTrung(`Thẻ cảnh báo ${the.id}: ${the.phanTich}`, 300),
    ma_du_an: projectId ? (listProjects().find((p) => p.id === projectId)?.ma ?? null) : null,
    ma_wbs: /^\d+(?:\.\d+)*$/.test(wbs) ? wbs : null,
    luc_giu_cho: lucGiuCho,
  };
}

/**
 * Soạn nháp việc từ 1 thẻ cảnh báo, lưu vào kho nháp của người bấm.
 * Luật 33: giữ chỗ → hỏi trùng → trùng thì trả `trung` (không gọi LLM soạn) · không trùng thì LLM soạn.
 * `vanSoan` = người bấm "Vẫn soạn việc riêng" — bỏ qua bước hỏi.
 */
export async function soanViecTuIssue(
  the: TheCanhBao,
  nguoi: string,
  projectId?: string,
  tuyChon: { vanSoan?: boolean } = {}
): Promise<{ ok: boolean; nhap?: NhapViecAi; trung?: BanGhiHoiTrung; message?: string }> {
  // ① GIỮ CHỖ — dọn giữ chỗ chết; bản ghi trùng cũ của thẻ + người thì dùng lại chính nó
  const luc = new Date().toISOString();
  const bayGio = Date.now();
  const ds0 = docTatCa().filter((n) => !n.dangHoi || giuChoConSong(n, bayGio));
  if (ds0.some((n) => n.tuIssue === the.id && n.nguoi === nguoi && giuChoConSong(n, bayGio))) {
    return { ok: false, message: "Đang soạn việc cho thẻ này rồi — chờ vài giây rồi tải lại trang." };
  }
  const cu = ds0.find((n) => n.tuIssue === the.id && n.nguoi === nguoi && !n.daGiao && laBanGhiTrung(n));
  const vanSoan = tuyChon.vanSoan ? { nguoi, luc } : undefined;
  let id: string;
  if (cu) {
    id = cu.id;
    cu.dangHoi = true;
    cu.luc = luc;
    if (vanSoan) cu.vanSoan = vanSoan;
    else delete cu.hoiTrung;
  } else {
    id = `NH-${bayGio}`;
    ds0.push({ id, luc, nguoi, tuIssue: the.id, ten: the.tieuDe, moTa: "", dangHoi: true, ...(projectId ? { projectId } : {}), ...(vanSoan ? { vanSoan } : {}) });
  }
  ghiTatCa(ds0);
  const traGiuCho = () => {
    if (cu) capNhatNhap(id, (n) => delete n.dangHoi);
    else xoaNhapTheoMa(id);
  };

  // ② HỎI TRÙNG — người đang chờ: lần 1 chờ tối đa 15 giây, agent chưa thưa thì hỏi ngầm 2 lần còn lại
  if (!vanSoan) {
    const kq = await hoiTrungTruocKhiSoan(cauHoiTuThe(the, projectId, luc), {
      cho: "nguoi",
      duong: "tay",
      duAn: projectId,
      nguoi,
      // Trùng thấy muộn → GẮN CỜ lên nháp đã soạn (Q3 anh chốt 04/10)
      sauKhiHoiNot: (kq2) =>
        void capNhatNhap(id, (n) => {
          // Đã giao trước khi lượt hỏi ngầm xong → không gắn cờ lên vết đã giao (kiểm lần 5 ⚪2)
          if (!n.daGiao) n.hoiTrung = banGhiHoiTrung(kq2, new Date().toISOString(), true);
        }),
    });
    const ban = banGhiHoiTrung(kq);
    if (kq.trung) {
      const n = capNhatNhap(id, (x) => {
        delete x.dangHoi;
        x.hoiTrung = ban;
      });
      return { ok: true, trung: ban, ...(n ? { nhap: n } : {}) };
    }
    capNhatNhap(id, (x) => (x.hoiTrung = ban));
  }

  // ③ SOẠN
  const prompt =
    `THẺ CẢNH BÁO:\n` +
    `- Mã: ${the.id} · Mức: ${the.mucDo === "red" ? "nghiêm trọng" : "cảnh báo"}\n` +
    `- Tiêu đề: ${the.tieuDe}\n` +
    `- Phân tích: ${the.phanTich}\n` +
    // 26/09: đưa cả TÊN việc (tra cây WBS dự án) để LLM khỏi viết mã trơn
    (the.wbs ? `- Đối tượng: ${await ganTenLlm(`WBS ${the.wbs}`, projectId)}\n` : "") +
    `- Ảnh hưởng COD: ${the.anhHuongCod > 0 ? `+${the.anhHuongCod} ngày` : "0 ngày"}\n` +
    `- Đề xuất xử lý của hệ thống: ${the.deXuat}\n` +
    (the.trichNguyenVan ? `- Trích nguồn: ${the.trichNguyenVan}\n` : "");

  let boc: { ten: string; moTa: string; han?: string } | null;
  try {
    const raw = await goiCoGhi(
      {
        agentTraLoi: "llm",
        congCu: "viec.soan_tu_issue",
        thamSo: { issue: the.id, wbs: the.wbs },
        lyDoGoi: `Việc của tôi: soạn sẵn việc giao từ thẻ ${the.id} (người bấm: ${nguoi})`,
        duong: "tay",
        duAn: projectId,
        nguoi,
      },
      () => runAI(prompt, HE_THONG)
    );
    const boc0 = docNhapTuTraLoi(String(raw));
    // Lưới an toàn "mã kèm tên" (26/09): mã thẻ → tiêu đề thẻ, mã WBS → tên việc
    const tdThe = taoTuDien([[the.id, the.tieuDe]]);
    boc = boc0
      ? { ...boc0, ten: await ganTenLlm(boc0.ten, projectId, tdThe), moTa: await ganTenLlm(boc0.moTa, projectId, tdThe) }
      : null;
  } catch (e) {
    traGiuCho();
    throw e;
  }
  if (!boc) {
    traGiuCho();
    return { ok: false, message: "AI trả lời không đúng khuôn (thiếu tên hoặc mô tả) — thử lại." };
  }

  const b = boc;
  const nhap = capNhatNhap(id, (n) => {
    delete n.dangHoi;
    n.ten = b.ten;
    n.moTa = `${b.moTa}\n\n(Nguồn: thẻ cảnh báo ${the.id} ${rutGonTen(the.tieuDe)}${the.trichNguyenVan ? ` — trích: ${the.trichNguyenVan}` : ""})`;
    if (b.han) n.han = b.han;
  });
  if (!nhap) return { ok: false, message: "Nháp giữ chỗ đã bị xoá trong lúc AI soạn — bấm soạn lại." };
  return { ok: true, nhap };
}
