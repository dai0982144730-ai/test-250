// ============================================================
// VÒNG NỀN GÕ CỬA (server-only) — chỉ lặp: gọi route nội bộ nhận tin, chờ,
// gọi lại. KHÔNG chứa logic Telegram (xem nhan.ts — vì sao).
//
// Khởi động LƯỜI + chống chạy đôi: globalThis giữ id vòng đang sống và nhịp
// cuối. Gọi khoiDongVongNhan() bao nhiêu lần cũng chỉ có MỘT vòng; vòng im
// quá 3 phút (bị kẹt) thì vòng mới thay, vòng cũ tự thoát vì id đã đổi.
// Ai gọi khởi động: route /api/noi-bo/telegram-tro-ly/danh-thuc (middleware
// gõ tối đa 1 lần/phút — script gác GAC-5-AGENT ping "/" mỗi 60 giây nên
// máy chủ bật lại là vòng tự lên trong ~1 phút) và các route Telegram.
// ============================================================

import crypto from "node:crypto";
import { khoaNoiBo } from "@/lib/day-sang-agent";

declare global {
  // eslint-disable-next-line no-var
  var __tgVongNhan: { id: string; nhipCuoi: number; cong: string } | undefined;
}

const VONG_KET_MS = 180_000;

export function vongDangSong(bay = Date.now()): boolean {
  const g = globalThis.__tgVongNhan;
  return !!g && bay - g.nhipCuoi < VONG_KET_MS;
}

/** Trả true nếu vừa bật một vòng mới */
export function khoiDongVongNhan(cong?: string): boolean {
  if (process.env.VITEST) return false; // bộ test không mở vòng mạng thật
  if (vongDangSong()) return false;
  const id = crypto.randomBytes(4).toString("hex");
  const c = (cong ?? process.env.PORT ?? "3010").replace(/\D/g, "") || "3010";
  globalThis.__tgVongNhan = { id, nhipCuoi: Date.now(), cong: c };
  void (async () => {
    while (globalThis.__tgVongNhan?.id === id) {
      globalThis.__tgVongNhan.nhipCuoi = Date.now();
      let cho = 5_000;
      try {
        const r = await fetch(`http://127.0.0.1:${c}/api/noi-bo/telegram-tro-ly/nhip`, {
          method: "POST",
          headers: { "x-sci-noi-bo": khoaNoiBo() },
          signal: AbortSignal.timeout(90_000),
          cache: "no-store",
        });
        const j = (await r.json().catch(() => null)) as { choMs?: unknown } | null;
        if (j && typeof j.choMs === "number" && j.choMs >= 0) cho = Math.min(j.choMs, 120_000);
      } catch {
        cho = 5_000; // máy chủ đang dịch lại / bận — gõ lại sau
      }
      await new Promise((ok) => setTimeout(ok, cho));
    }
  })();
  return true;
}
