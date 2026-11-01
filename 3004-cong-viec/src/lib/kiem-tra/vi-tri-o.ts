// kiem-tra/vi-tri-o.ts — FILE THUẦN (không node:fs, dùng được ở client): vị trí có chỉ đúng MỘT ô ghi được không.
import type { LoiKiemTra } from "@/lib/types";

/** Ô nhập gắn mã (không phải mục, không phải dấu nhận mẫu), hoặc bảng · dòng · cột — máy ghi chữ mới vào được (sua-vao-file.ts). */
export function laMotO(v: LoiKiemTra["vi_tri"] | undefined): boolean {
  if (!v) return false;
  if (v.tag) return !v.tag.startsWith("muc:") && v.tag !== "mau_ma";
  return !!(v.bang && v.dong && v.cot);
}
