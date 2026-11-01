// ============================================================
// ai/so-dung-ai.ts — SỔ DÙNG AI (Mr. Đại chốt 04/10/2026). CHỈ SERVER (node:fs). Phần tính số ở lib/ai/thong-ke-ai.ts (thuần).
//
//   data/ai-so-dung.jsonl — MỖI LƯỢT gọi AI một dòng (LuotAi), kể cả lượt LỖI, HẾT HẠN MỨC, ĐẦY HÀNG CHỜ: tài khoản, token
//                           (vào / cache đọc / cache ghi / ra), AI làm bao lâu, ai gọi, tính năng nào.
//   data/ai-ngung.jsonl   — mỗi lần KHÔNG CÒN tài khoản Claude công ty nào dùng được: từ lúc nào tới lúc nào (= "thời gian ngừng").
//   data/ai-do-thoi-gian.jsonl (sổ CŨ, có từ 01/10, chỉ lượt thành công) — đọc kèm cho ngày trước khi sổ mới bắt đầu.
//
// Ai gọi: người trong ngữ cảnh yêu cầu (lib/ngu-canh.ts); ngoài yêu cầu = việc nền.
// Tính năng: đọc NGĂN XẾP lời gọi lúc vào runAI → file đầu tiên trong src/ không thuộc lớp gọi AI (vd lib/bao-cao-tuan/do-kho).
//   ⚠ Chỉ đọc được khi chạy `next dev` (ngăn xếp còn đường file). Bản build sản phẩm gộp file → ghi "" (không rõ). Trước khi lên
//   hosting phải truyền nhãn tính năng tường minh ở chỗ gọi — xem kế hoạch Quản lý token AI, đợt nhân bản.
// Ghi sổ hỏng KHÔNG BAO GIỜ làm hỏng lượt AI. Giữ 13 tháng: mỗi sổ mỗi ngày dọn một lần lúc ghi dòng đầu ngày (donSoMoiNgay).
// ============================================================
import fs from "node:fs";
import { AsyncLocalStorage } from "node:async_hooks";
import { thuMucDuLieu } from "@/lib/ai/duong-dan";
import { layNguCanh } from "@/lib/ngu-canh";
import type { KhoangNgung, LuotAi } from "@/lib/ai/thong-ke-ai";

const TEP_LUOT = "ai-so-dung.jsonl";
const TEP_NGUNG = "ai-ngung.jsonl";
const TEP_CU = "ai-do-thoi-gian.jsonl";

export interface MetaLuot {
  tinh_nang: string;
  nguoi: string | null;
}

/** File lớp gọi AI — bỏ qua khi tìm "ai gọi" trong ngăn xếp */
const BO_QUA = /lib[\\/]ai[\\/](providers|so-dung-ai|tai-khoan-claude|uu-tien|thong-ke-ai)\b/;

/** Mã tính năng từ ngăn xếp lời gọi: "lib/bao-cao-tuan/do-kho" · "app/api/gui/route"; không rõ → "" */
export function maTinhNangTuNganXep(stack: string | undefined): string {
  for (const dong of String(stack ?? "").split("\n")) {
    const m = /src[\\/]((?:lib|app)[\\/][^\s:()?]+?)\.(?:ts|tsx|js)\b/.exec(dong);
    if (!m) continue;
    if (BO_QUA.test(m[1])) continue;
    return m[1].replace(/\\/g, "/");
  }
  return "";
}

// Nhãn tính năng TƯỜNG MINH (chỗ gọi bọc runAIGan / voiTinhNang) — đúng cả ở bản build sản phẩm. Không có nhãn thì đọc ngăn xếp.
type G = typeof globalThis & { __aiNhanTinhNang?: AsyncLocalStorage<string> };
const khoNhan: AsyncLocalStorage<string> = ((globalThis as G).__aiNhanTinhNang ??= new AsyncLocalStorage<string>());

/** Chạy fn với nhãn tính năng (mã = đường file, vd "lib/bao-cao-tuan/do-kho" — tên tiếng Việt ở thong-ke-ai.ts) */
export function voiTinhNang<T>(ma: string, fn: () => T): T {
  return khoNhan.run(ma, fn);
}

/** Ai gọi + tính năng nào — gọi NGAY lúc vào runAI (sau khi xếp hàng thì ngăn xếp không còn người gọi) */
export function metaLuotHienTai(): MetaLuot {
  let tinh_nang = khoNhan.getStore() ?? "";
  if (!tinh_nang) {
    try {
      tinh_nang = maTinhNangTuNganXep(new Error().stack);
    } catch {
      /* không đọc được ngăn xếp */
    }
  }
  return { tinh_nang, nguoi: layNguCanh()?.nguoi ?? null };
}

/** Mốc giữ sổ: 13 tháng lịch trước `nay` (Mr. Đại duyệt 04/10 — đủ so cùng kỳ năm trước) */
export function mocGiuSo(nay = Date.now()): number {
  const d = new Date(nay);
  d.setUTCMonth(d.getUTCMonth() - 13);
  return d.getTime();
}

/** Bỏ dòng cũ hơn mốc — `lucDong` lấy mốc thời gian của một dòng (lượt: luc · khoảng ngừng: den). Dòng hỏng giữ nguyên. */
export function locDongCu(noiDung: string, moc: number, lucDong: (o: Record<string, unknown>) => unknown): { con: string; bo: number } {
  const giu: string[] = [];
  let bo = 0;
  for (const dong of noiDung.split("\n")) {
    if (!dong.trim()) continue;
    let t = NaN;
    try {
      const v = lucDong(JSON.parse(dong) as Record<string, unknown>);
      t = typeof v === "string" ? Date.parse(v) : NaN;
    } catch {
      /* dòng hỏng: giữ */
    }
    if (Number.isFinite(t) && t < moc) bo++;
    else giu.push(dong);
  }
  return { con: giu.length ? giu.join("\n") + "\n" : "", bo };
}

type GD = typeof globalThis & { __aiDonSo?: Record<string, string> };

/** Mỗi sổ mỗi ngày (giờ VN) dọn một lần, lúc ghi dòng đầu tiên trong ngày. Ghi file tạm rồi đổi tên — hỏng giữa chừng không mất sổ. */
function donSoMoiNgay(tep: string): void {
  const g = globalThis as GD;
  g.__aiDonSo ??= {};
  const ngay = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
  if (g.__aiDonSo[tep] === ngay) return;
  g.__aiDonSo[tep] = ngay;
  try {
    const p = thuMucDuLieu(tep);
    if (!fs.existsSync(p)) return;
    const { con, bo } = locDongCu(fs.readFileSync(p, "utf8"), mocGiuSo(), (o) => (tep === TEP_NGUNG ? o.den : o.luc));
    if (!bo) return;
    fs.writeFileSync(p + ".tam", con);
    fs.renameSync(p + ".tam", p);
  } catch {
    /* dọn hỏng thì để mai dọn lại — không làm hỏng lượt AI */
  }
}

function ghiDong(tep: string, d: unknown): void {
  donSoMoiNgay(tep);
  try {
    fs.appendFileSync(thuMucDuLieu(tep), JSON.stringify(d) + "\n");
  } catch {
    /* sổ hỏng không làm hỏng lượt AI */
  }
}

export function ghiLuotAi(l: LuotAi): void {
  ghiDong(TEP_LUOT, l);
}

export function ghiNgung(k: KhoangNgung): void {
  ghiDong(TEP_NGUNG, k);
}

function docJsonl(tep: string): Record<string, unknown>[] {
  let s = "";
  try {
    s = fs.readFileSync(thuMucDuLieu(tep), "utf8");
  } catch {
    return [];
  }
  const ra: Record<string, unknown>[] = [];
  for (const dong of s.split("\n")) {
    if (!dong.trim()) continue;
    try {
      const o = JSON.parse(dong) as unknown;
      if (o && typeof o === "object") ra.push(o as Record<string, unknown>);
    } catch {
      /* dòng hỏng bỏ qua */
    }
  }
  return ra;
}

const so = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/** Lượt AI trong [tu, den) — sổ mới + sổ cũ cho phần TRƯỚC dòng đầu của sổ mới */
export function docLuot(tuMs: number, denMs: number): { luot: LuotAi[]; coSoCu: boolean } {
  const moi = docJsonl(TEP_LUOT) as unknown as LuotAi[];
  const mocMoi = moi.length ? Date.parse(moi[0].luc) : Infinity;
  const trong = (luc: string) => {
    const t = Date.parse(luc);
    return t >= tuMs && t < denMs;
  };
  const luot = moi.filter((l) => typeof l.luc === "string" && trong(l.luc));
  let coSoCu = false;
  if (tuMs < mocMoi) {
    for (const o of docJsonl(TEP_CU)) {
      const luc = typeof o.luc === "string" ? o.luc : "";
      if (!luc || !trong(luc) || Date.parse(luc) >= mocMoi) continue;
      coSoCu = true;
      luot.push({
        luc,
        tai_khoan: so(o.tai_khoan) === 2 ? "tk2" : "tk1",
        tinh_nang: "cu",
        nguoi: "?",
        token_vao: so(o.token_vao), // sổ cũ gộp sẵn input + cache
        token_cache_doc: 0,
        token_cache_ghi: 0,
        token_ra: so(o.token_ra),
        chay_ms: so(o.chay_ms),
        cho_ms: so(o.cho_ms),
        ket_qua: "ok",
        model: typeof o.model === "string" ? o.model : null,
      });
    }
  }
  return { luot, coSoCu };
}

/** Khoảng ngừng chạm [tu, den) */
export function docNgung(tuMs: number, denMs: number): KhoangNgung[] {
  return (docJsonl(TEP_NGUNG) as unknown as KhoangNgung[]).filter((k) => typeof k.tu === "string" && typeof k.den === "string" && Date.parse(k.den) > tuMs && Date.parse(k.tu) < denMs);
}
