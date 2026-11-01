// ============================================================
// NỘI DUNG HƯỚNG DẪN — MỘT chỗ duy nhất (luật 7), khuôn lib/huong-dan/kieu.ts, nút components/huong-dan/NutHuongDan.tsx,
// tra theo màn ở components/huong-dan/kho-huong-dan.ts. Tên nút / ô viết ĐÚNG như trên màn. Mã luôn kèm tên (luật 30). Thuần.
// ============================================================
import type { HuongDanTab } from "./kieu";
import { HD as HD_VIEC_CUA_TOI } from "./tab/viec-cua-toi";
import { HD as HD_SO_DO } from "./tab/so-do";
import { HD as HD_BAO_CAO_TUAN } from "./tab/bao-cao-tuan";
import { HD as HD_GUI_BAO_CAO } from "./tab/gui-bao-cao";
import { HD as HD_DU_AN } from "./tab/du-an";
import { HD as HD_ISSUE } from "./tab/issue";
import { HD as HD_CAY_VIEC } from "./tab/cay-viec";
import { HD as HD_TRO_LY_CHAT } from "./tab/tro-ly-chat";
import { HD as HD_GOP_Y } from "./tab/gop-y";
import { HD as HD_THONG_BAO } from "./tab/thong-bao";
import { HD as HD_PHONG_HOP } from "./tab/phong-hop";
import { HD_NHOM as N_A1 } from "./nhom/a1";
import { HD_NHOM as N_A2 } from "./nhom/a2";
import { HD_NHOM as N_A3 } from "./nhom/a3";
import { HD_NHOM as N_B1 } from "./nhom/b1";
import { HD_NHOM as N_B2 } from "./nhom/b2";
import { HD_NHOM as N_B3 } from "./nhom/b3";
import { HD_NHOM as N_B4 } from "./nhom/b4";

export const HUONG_DAN = {
  "viec-cua-toi": HD_VIEC_CUA_TOI,
  "so-do": HD_SO_DO,
  "bao-cao-tuan": HD_BAO_CAO_TUAN,
  "gui-bao-cao": HD_GUI_BAO_CAO,
  "du-an": HD_DU_AN,
  issue: HD_ISSUE,
  "cay-viec": HD_CAY_VIEC,
  "tro-ly-chat": HD_TRO_LY_CHAT,
  "gop-y": HD_GOP_Y,
  "thong-bao": HD_THONG_BAO,
  "phong-hop": HD_PHONG_HOP,
  // các nhóm hướng dẫn thêm 20/10 (tab, khung mở từ nút, Cài đặt / quản trị) — mỗi nhóm một tệp ở ./nhom
  ...N_A1,
  ...N_A2,
  ...N_A3,
  ...N_B1,
  ...N_B2,
  ...N_B3,
  ...N_B4,
} satisfies Record<string, HuongDanTab>;

export type MaHuongDan = keyof typeof HUONG_DAN;
