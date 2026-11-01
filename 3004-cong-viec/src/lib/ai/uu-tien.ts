// ============================================================
// ai/uu-tien.ts — LƯỢT AI CỦA NGƯỜI ĐANG CHỜ (trợ lý chat) ĐI TRƯỚC VIỆC NỀN (CHỈ SERVER).
// Mr. Đại chốt 02/10/2026: chat và việc AI nền (báo cáo tuần, chấm độ khó, góp ý mẫu…) dùng chung hàng chờ của tài khoản
// Claude — trước đây đến trước làm trước, câu chat có thể phải chờ sau 3 lượt nền (mỗi lượt tới vài phút).
// Route chat bọc cả lượt trong chayUuTien(); mọi lời gọi AI bên trong (kể cả /lam-bao-cao, xuất file) tự mang dấu ưu tiên
// qua AsyncLocalStorage — không phải truyền tham số qua từng hàm. Hàng chờ đọc dấu ở providers.ts (runCliPromptTk).
// ============================================================
import { AsyncLocalStorage } from "node:async_hooks";

const kho = new AsyncLocalStorage<true>();

/** Chạy fn với dấu "người đang chờ trả lời" — lượt AI bên trong được chen trước việc nền đang chờ. */
export function chayUuTien<T>(fn: () => Promise<T>): Promise<T> {
  return kho.run(true, fn);
}

/** Lượt AI hiện tại có mang dấu ưu tiên không. */
export function laUuTien(): boolean {
  return kho.getStore() === true;
}
