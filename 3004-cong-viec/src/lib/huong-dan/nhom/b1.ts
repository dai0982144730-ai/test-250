// Hướng dẫn nhóm B1 — màn Cài đặt (tổng) + tab Cảnh báo & ngưỡng + tab Kết nối (trừ Khóa cho agent). Mã mục: cd-<khóa mục>. Thuần (luật 10).
import type { HuongDanTab } from "../kieu";
import { HD as HD_CAI_DAT } from "../tab/cai-dat";
import { HD as HD_SO_CAI } from "../tab/cd-so_cai";
import { HD as HD_KY_BAO_CAO } from "../tab/cd-ky_bao_cao";
import { HD as HD_QUY_TAC_DE } from "../tab/cd-quy_tac_de";
import { HD as HD_AP_DUNG_LAI } from "../tab/cd-ap-dung-lai-ngay";
import { HD as HD_AI } from "../tab/cd-ai";
import { HD as HD_THONG_KE_AI } from "../tab/cd-thong-ke-ai";
import { HD as HD_THONG_BAO } from "../tab/cd-thong_bao";
import { HD as HD_GIAO_DIEN } from "../tab/cd-giao_dien";

export const HD_NHOM = {
  "cai-dat": HD_CAI_DAT,
  "cd-so_cai": HD_SO_CAI,
  "cd-ky_bao_cao": HD_KY_BAO_CAO,
  "cd-quy_tac_de": HD_QUY_TAC_DE,
  "cd-ap-dung-lai-ngay": HD_AP_DUNG_LAI,
  "cd-ai": HD_AI,
  "cd-thong-ke-ai": HD_THONG_KE_AI,
  "cd-thong_bao": HD_THONG_BAO,
  "cd-giao_dien": HD_GIAO_DIEN,
} satisfies Record<string, HuongDanTab>;
