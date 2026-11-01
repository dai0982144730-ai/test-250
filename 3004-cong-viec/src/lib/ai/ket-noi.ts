// ============================================================
// ket-noi.ts — CẤU HÌNH KẾT NỐI AI (thay appconfig.getSetting của bản gốc).
// Lưu ở data/ai-ket-noi.json (khóa API là bí mật → không để trong bảng cấu hình chung,
// không xuất theo "Xuất cấu hình"), fallback biến môi trường. Đọc file mỗi lần gọi —
// "lưu là chạy ngay" như bản gốc. Model mặc định của chat KHÔNG ở đây: lấy cấu hình `ai.model_mac_dinh`.
//
// Như HptStart: MỖI nhà cung cấp giữ khóa + model RIÊNG (mục `nccRieng`) — đổi qua lại giữa
// Anthropic/OpenAI… không làm khóa của hãng này bị gửi nhầm sang hãng kia. Model của gói
// thuê bao (Claude CLI) để riêng ở `aiModelCli`.
// Bản cũ chỉ có một `aiApiKey` + `aiModel` chung: vẫn đọc được, lần ghi đầu tiên tự chuyển
// sang chỗ mới (xem chuyenBanCu). Server-only.
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { thuMucDuLieu } from "./duong-dan";

export const KHOA_KET_NOI = ["aiMode", "aiProvider", "aiApiKey", "aiModel", "aiModelCli", "aiBaseUrl", "braveSearchKey"] as const;
export type KhoaKetNoi = (typeof KHOA_KET_NOI)[number];

/** Khóa + model riêng của một nhà cung cấp API */
export interface RiengNcc {
  khoa?: string;
  model?: string;
}

interface TepKetNoi extends Partial<Record<KhoaKetNoi, string>> {
  nccRieng?: Record<string, RiengNcc>;
}

const BIEN_MOI_TRUONG: Record<KhoaKetNoi, string> = {
  aiMode: "AI_MODE",
  aiProvider: "AI_PROVIDER",
  aiApiKey: "AI_API_KEY",
  aiModel: "AI_MODEL",
  aiModelCli: "AI_MODEL_CLI",
  aiBaseUrl: "AI_BASE_URL",
  braveSearchKey: "BRAVE_SEARCH_API_KEY",
};

function tep(): string {
  return thuMucDuLieu("ai-ket-noi.json");
}

function docTep(): TepKetNoi {
  try {
    const j = JSON.parse(fs.readFileSync(tep(), "utf8")) as Record<string, unknown>;
    const ra: TepKetNoi = {};
    for (const k of KHOA_KET_NOI) {
      const v = j[k];
      if (typeof v === "string" && v.trim() !== "") ra[k] = v.trim();
    }
    const nr = j.nccRieng;
    if (nr && typeof nr === "object" && !Array.isArray(nr)) {
      ra.nccRieng = {};
      for (const [p, v] of Object.entries(nr as Record<string, unknown>)) {
        if (!v || typeof v !== "object") continue;
        const o = v as Record<string, unknown>;
        const r: RiengNcc = {};
        if (typeof o.khoa === "string" && o.khoa.trim() !== "") r.khoa = o.khoa.trim();
        if (typeof o.model === "string" && o.model.trim() !== "") r.model = o.model.trim();
        ra.nccRieng[p] = r;
      }
    }
    return ra;
  } catch {
    return {};
  }
}

/** Các khóa phẳng trong file (không gồm nccRieng) */
export function docKetNoi(): Partial<Record<KhoaKetNoi, string>> {
  const { nccRieng: _bo, ...phang } = docTep();
  return phang;
}

function tuMoiTruong(khoa: KhoaKetNoi): string | undefined {
  const e = process.env[BIEN_MOI_TRUONG[khoa]]?.trim();
  return e ? e : undefined;
}

/** Giá trị hiệu lực: file → biến môi trường → undefined */
export function layKetNoi(khoa: KhoaKetNoi): string | undefined {
  return docKetNoi()[khoa] ?? tuMoiTruong(khoa);
}

/**
 * Khóa API của MỘT nhà cung cấp: nccRieng → khóa cũ của file (thuộc aiProvider đã lưu) →
 * AI_API_KEY (thuộc AI_PROVIDER, mặc định anthropic). Không có → undefined.
 */
export function layKhoaNcc(ncc: string): string | undefined {
  const f = docTep();
  const rieng = f.nccRieng?.[ncc]?.khoa;
  if (rieng) return rieng;
  if (f.aiApiKey && ncc === (f.aiProvider ?? tuMoiTruong("aiProvider") ?? "anthropic")) return f.aiApiKey;
  const e = tuMoiTruong("aiApiKey");
  if (e && ncc === (tuMoiTruong("aiProvider") ?? "anthropic")) return e;
  return undefined;
}

/** Model đã chọn cho MỘT nhà cung cấp API (rỗng → mặc định của hãng) */
export function layModelNcc(ncc: string): string | undefined {
  const f = docTep();
  return f.nccRieng?.[ncc]?.model ?? f.aiModel ?? tuMoiTruong("aiModel");
}

/** Model của gói thuê bao Claude CLI (rỗng → theo lượt/cấu hình) */
export function layModelCli(): string | undefined {
  const f = docTep();
  return f.aiModelCli ?? f.aiModel ?? tuMoiTruong("aiModelCli") ?? tuMoiTruong("aiModel");
}

/** Bản cũ (một khóa + một model chung) → chuyển sang chỗ riêng của nhà cung cấp đang lưu. */
function chuyenBanCu(f: TepKetNoi): void {
  const nccCu = f.aiProvider ?? "anthropic";
  if (f.aiApiKey) {
    f.nccRieng = f.nccRieng ?? {};
    const r = (f.nccRieng[nccCu] = f.nccRieng[nccCu] ?? {});
    if (!r.khoa) r.khoa = f.aiApiKey;
    delete f.aiApiKey;
  }
  if (f.aiModel) {
    if (f.aiMode === "api") {
      f.nccRieng = f.nccRieng ?? {};
      const r = (f.nccRieng[nccCu] = f.nccRieng[nccCu] ?? {});
      if (!r.model) r.model = f.aiModel;
    } else if (!f.aiModelCli) {
      f.aiModelCli = f.aiModel;
    }
    delete f.aiModel;
  }
}

/**
 * Ghi đè từng khóa; chuỗi rỗng = xóa khóa đó (về biến môi trường / mặc định).
 * `rieng`: khóa/model riêng theo nhà cung cấp — `khoa: ""` = xóa khóa của hãng đó.
 */
export function ghiKetNoi(phan: Partial<Record<KhoaKetNoi, string>>, rieng?: Record<string, RiengNcc>): void {
  const cu = docTep();
  chuyenBanCu(cu);
  for (const k of KHOA_KET_NOI) {
    if (!(k in phan)) continue;
    const v = (phan[k] ?? "").trim();
    if (v === "") delete cu[k];
    else cu[k] = v;
  }
  if (rieng) {
    cu.nccRieng = cu.nccRieng ?? {};
    for (const [p, r] of Object.entries(rieng)) {
      const dich = (cu.nccRieng[p] = cu.nccRieng[p] ?? {});
      for (const t of ["khoa", "model"] as const) {
        if (r[t] === undefined) continue;
        const v = r[t]!.trim();
        if (v === "") delete dich[t];
        else dich[t] = v;
      }
      if (!dich.khoa && !dich.model) delete cu.nccRieng[p];
    }
  }
  fs.mkdirSync(path.dirname(tep()), { recursive: true });
  fs.writeFileSync(tep(), JSON.stringify(cu, null, 2), "utf8");
}
