// ============================================================
// LÝ DO CỦA VIỆC CHA — truyền xuống mọi lượt con (QS-085, Mr. Đại duyệt 27/09/2026)
//
// Lỗi đã đo (sổ phát hiện QS-085): Main hỏi `base.co_viec_cho_ma_khong` cho khối
// "Chỗ hai agent nói khác nhau" (B11) của bảng điều hành, thế mà lượt Base gọi
// Base.vn `wework/project/get.full` lại ghi lý do mẫu cố định
//   "Lập tiến độ: lấy cấu trúc dự án 111663 từ Base để dựng cây WBS"
// — câu viết cho màn Lập tiến độ, bị MỌI đường đọc việc dùng lại. Sổ kể sai
// việc đang làm, điều tra sau này đi lệch hướng.
//
// Cách chữa: cổng MCP (và các việc gốc khác) mở một NGỮ CẢNH "vì sao đang chạy"
// bằng AsyncLocalStorage; chỗ gọi Base.vn / Agent tiến độ ghép lý do con vào sau:
//   "Trả lời Main (co_viec_cho_ma_khong — Hệ mã này đã có ai được giao chưa ·
//    Bảng điều hành khối B11…): lấy hồ sơ dự án 111663"
//
// ⚠ KHÔNG dùng lại kho của `chuoi.ts` — tệp đó giống hệt ở 4 app, sửa là lệch.
// Server-only (node:async_hooks). Màn hình client KHÔNG import tệp này.
// ============================================================

import { AsyncLocalStorage } from "node:async_hooks";

const g = globalThis as unknown as { __sciLyDoViecCongViec?: AsyncLocalStorage<string> };
const kho: AsyncLocalStorage<string> = (g.__sciLyDoViecCongViec ??= new AsyncLocalStorage<string>());

/** Chạy `fn` trong ngữ cảnh "việc cha" — mọi lượt con bên trong đọc được lý do này */
export function chayVoiLyDoViec<T>(lyDoCha: string, fn: () => T): T {
  const sach = lyDoCha.trim();
  if (sach === "") return fn();
  return kho.run(sach, fn);
}

/** Lý do việc cha đang chạy (undefined = không ở trong việc nào đã khai) */
export function lyDoViecHienTai(): string | undefined {
  return kho.getStore();
}

/**
 * Lý do cho một lượt con: "<việc cha>: <việc con>".
 * Việc cha lấy theo thứ tự: ngữ cảnh đang chạy → `macDinh` chỗ gọi đưa.
 */
export function lyDoTheoViec(viecCon: string, macDinh: string): string {
  const cha = kho.getStore() ?? macDinh;
  return `${cha}: ${viecCon}`;
}

// ─────────────────────────────────────────────────────────────
// Câu việc cha cho cổng MCP (phần thuần — bài kiểm gọi thẳng)
// ─────────────────────────────────────────────────────────────

const TEN_AGENT: Record<string, string> = {
  main: "Main",
  tiendo: "Agent Tiến độ",
  phaply: "Agent Pháp lý",
  hopdong: "Agent Hợp đồng",
  quansat: "Agent quan sát",
  // Agent Công việc thế chỗ Agent Base trong danh bạ (mã "base") — 03/10/2026
  base: "Agent Công việc",
};

/** Rút gọn một chuỗi về ≤ n ký tự, cắt ở ranh giới chữ, thêm "…" */
function rutGon(s: string, n: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= n) return t;
  const cat = t.slice(0, n);
  const cach = cat.lastIndexOf(" ");
  return `${(cach > n * 0.6 ? cat.slice(0, cach) : cat).trim()}…`;
}

/**
 * "Trả lời Main (co_viec_cho_ma_khong — Hệ mã này đã có ai được giao chưa · <lý do bên hỏi>)".
 * `moTaCongCu` = mô tả trong DANH_MUC (bỏ ⭐, lấy phần trước " — " đầu tiên).
 */
export function lyDoChaMcp(agentGoi: string, congCu: string, moTaCongCu: string | undefined, lyDoGoi: string): string {
  const ma = agentGoi.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  const ai = TEN_AGENT[ma] ?? agentGoi.trim();
  const tenNgan = congCu.replace(/^base\./, "");
  const moTa = (moTaCongCu ?? "").replace(/⭐/g, "").split(" — ")[0]?.trim() ?? "";
  const congCuChu = moTa !== "" ? `${tenNgan} — ${rutGon(moTa, 60)}` : tenNgan;
  const vi = lyDoGoi.trim() !== "" ? ` · ${rutGon(lyDoGoi, 140)}` : "";
  return `Trả lời ${ai} (${congCuChu}${vi})`;
}
