// ============================================================
// NỘI DUNG HƯỚNG DẪN QUY TRÌNH agent Main — MỘT chỗ duy nhất (luật 7), khuôn lib/huong-dan/kieu.ts,
// nút components/huong-dan/NutHuongDan.tsx. Mỗi nhóm một tệp trong nhom/ (nhiều người viết song song), mỗi hướng dẫn một tệp trong tab/.
// Tên nút / ô viết ĐÚNG như trên màn (luật 26). Mã luôn kèm tên (luật 30). Thuần (luật 10).
// ============================================================
import type { HuongDanTab } from "./kieu";
import { NHOM_A } from "./nhom/a";
import { NHOM_B } from "./nhom/b";
import { NHOM_C } from "./nhom/c";
import { NHOM_D } from "./nhom/d";

export const HUONG_DAN = { ...NHOM_A, ...NHOM_B, ...NHOM_C, ...NHOM_D } as Record<string, HuongDanTab>;
export type MaHuongDan = string;
