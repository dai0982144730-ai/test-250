// ============================================================
// ai/so-dung-ai.ts — SỔ DÙNG AI (Mr. Đại chốt 04/10/2026, nhân bản từ agent Công việc — Đợt 2). CHỈ SERVER (node:fs).
// Phần tính số ở lib/ai/thong-ke-ai.ts (thuần).
//
//   data/ai-so-dung.jsonl — MỖI LƯỢT gọi AI một dòng (LuotAi), kể cả lượt LỖI, HẾT HẠN MỨC, ĐẦY HÀNG CHỜ: tài khoản, token
//                           (vào / cache đọc / cache ghi / ra), AI làm bao lâu, ai gọi, tính năng nào.
//   data/ai-ngung.jsonl   — mỗi lần KHÔNG CÒN tài khoản Claude công ty nào dùng được: từ lúc nào tới lúc nào (= "thời gian ngừng").
//
// Ai gọi: người trong chayVoiNguoiGoiAi (moi-truong-ai.ts); ngoài đó = việc nền.
// Tính năng: nhãn tường minh (voiTinhNang) hoặc đọc NGĂN XẾP lời gọi lúc vào runAI → tệp đầu tiên trong src/ không thuộc lớp gọi AI.
//   ⚠ Ngăn xếp chỉ đọc được khi chạy `next dev`; bản build sản phẩm gộp tệp → ghi "" (không rõ). Trước khi lên hosting phải gắn
//   nhãn tường minh ở chỗ gọi.
// Ghi sổ hỏng KHÔNG BAO GIỜ làm hỏng lượt AI. Giữ 13 tháng: mỗi sổ mỗi ngày dọn một lần lúc ghi dòng đầu ngày.
// Agent Quan sát đọc hai sổ này để gom màn tổng 6 agent (Đợt 3).
// ============================================================
import fs from "node:fs";
import { AsyncLocalStorage } from "node:async_hooks";
import { nguoiGoiAi, tepAi } from "@/lib/ai/moi-truong-ai";
import type { KhoangNgung, LuotAi } from "@/lib/ai/thong-ke-ai";

const TEP_LUOT = "ai-so-dung.jsonl";
const TEP_NGUNG = "ai-ngung.jsonl";

export interface MetaLuot {
  tinh_nang: string;
  nguoi: string | null;
}

/** Tệp lớp gọi AI — bỏ qua khi tìm "ai gọi" trong ngăn xếp */
const BO_QUA = /lib[\\/]ai[\\/](providers|so-dung-ai|tai-khoan-claude|uu-tien|thong-ke-ai|moi-truong-ai)\b/;

/** Mã tính năng từ ngăn xếp lời gọi: "lib/bao-cao-thang/nhan-xet" · "app/api/skill/route"; không rõ → "" */
export function maTinhNangTuNganXep(stack: string | undefined): string {
  for (const dong of String(stack ?? "").split("\n")) {
    const m = /src[\\/]((?:lib|app)[\\/][^\s:()?]+?)\.(?:ts|tsx|js)\b/.exec(dong);
    if (!m) continue;
    if (BO_QUA.test(m[1])) continue;
    return m[1].replace(/\\/g, "/");
  }
  return "";
}

// Nhãn tính năng TƯỜNG MINH — đúng cả ở bản build sản phẩm. Không có nhãn thì đọc ngăn xếp.
type G = typeof globalThis & { __aiNhanTinhNang?: AsyncLocalStorage<string> };
const khoNhan: AsyncLocalStorage<string> = ((globalThis as G).__aiNhanTinhNang ??= new AsyncLocalStorage<string>());

/** Chạy fn với nhãn tính năng (mã = đường tệp, vd "lib/bao-cao-thang/nhan-xet" — tên tiếng Việt ở ten-tinh-nang-ai.ts) */
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
  return { tinh_nang, nguoi: nguoiGoiAi() };
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

/** Mỗi sổ mỗi ngày (giờ VN) dọn một lần, lúc ghi dòng đầu tiên trong ngày. Ghi tệp tạm rồi đổi tên — hỏng giữa chừng không mất sổ. */
function donSoMoiNgay(tep: string): void {
  const g = globalThis as GD;
  g.__aiDonSo ??= {};
  const ngay = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
  const khoa = tepAi(tep);
  if (g.__aiDonSo[khoa] === ngay) return;
  g.__aiDonSo[khoa] = ngay;
  try {
    if (!fs.existsSync(khoa)) return;
    const { con, bo } = locDongCu(fs.readFileSync(khoa, "utf8"), mocGiuSo(), (o) => (tep === TEP_NGUNG ? o.den : o.luc));
    if (!bo) return;
    fs.writeFileSync(khoa + ".tam", con);
    fs.renameSync(khoa + ".tam", khoa);
  } catch {
    /* dọn hỏng thì để mai dọn lại — không làm hỏng lượt AI */
  }
}

function ghiDong(tep: string, d: unknown): void {
  donSoMoiNgay(tep);
  try {
    fs.appendFileSync(tepAi(tep), JSON.stringify(d) + "\n");
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
    s = fs.readFileSync(tepAi(tep), "utf8");
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

/** Lượt AI trong [tu, den). (Agent Công việc còn đọc kèm sổ cũ trước 04/10 — Main không có sổ cũ: coSoCu luôn false.) */
export function docLuot(tuMs: number, denMs: number): { luot: LuotAi[]; coSoCu: boolean } {
  const luot = (docJsonl(TEP_LUOT) as unknown as LuotAi[]).filter((l) => {
    if (typeof l.luc !== "string") return false;
    const t = Date.parse(l.luc);
    return t >= tuMs && t < denMs;
  });
  return { luot, coSoCu: false };
}

/** Khoảng ngừng chạm [tu, den) */
export function docNgung(tuMs: number, denMs: number): KhoangNgung[] {
  return (docJsonl(TEP_NGUNG) as unknown as KhoangNgung[]).filter((k) => typeof k.tu === "string" && typeof k.den === "string" && Date.parse(k.den) > tuMs && Date.parse(k.tu) < denMs);
}
