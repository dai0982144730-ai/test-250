// Nhóm C — Cài đặt Main: sáu tab (tab 🧩 ẩn khi trống). Thuần (luật 10).
import type { HuongDanTab } from "../kieu";
import { HD as CANH_BAO } from "../tab/cd-canh-bao";
import { HD as DU_AN } from "../tab/cd-du-an";
import { HD as KET_NOI } from "../tab/cd-ket-noi";
import { HD as NGUOI_DUNG } from "../tab/cd-nguoi-dung";
import { HD as THONG_KE_AI } from "../tab/cd-thong-ke-ai";

export const NHOM_C: Record<string, HuongDanTab> = {
  "cd-canh-bao": CANH_BAO,
  "cd-du-an": DU_AN,
  "cd-ket-noi": KET_NOI,
  "cd-nguoi-dung": NGUOI_DUNG,
  "cd-thong-ke-ai": THONG_KE_AI,
};
