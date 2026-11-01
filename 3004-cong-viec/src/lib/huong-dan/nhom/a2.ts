// Hướng dẫn nhóm a2 — Báo cáo tuần (3 tab + 3 khung cột phải) và Gửi báo cáo (5 bước). Mỗi mã một tệp trong ../tab/. Thuần (luật 10).
import type { HuongDanTab } from "../kieu";
import { HD as HD_BCT_TAB_AI } from "../tab/bct-tab-ai";
import { HD as HD_BCT_TAB_QUYET } from "../tab/bct-tab-quyet";
import { HD as HD_BCT_TAB_SO_LIEU } from "../tab/bct-tab-so-lieu";
import { HD as HD_BCT_GIAO_VIEC } from "../tab/bct-giao-viec";
import { HD as HD_BCT_DO_KHO } from "../tab/bct-do-kho";
import { HD as HD_BCT_BAO_CAO_DON_VI } from "../tab/bct-bao-cao-don-vi";
import { HD as HD_GB_BUOC_1 } from "../tab/gb-buoc-1";
import { HD as HD_GB_BUOC_2 } from "../tab/gb-buoc-2";
import { HD as HD_GB_BUOC_3 } from "../tab/gb-buoc-3";
import { HD as HD_GB_BUOC_4 } from "../tab/gb-buoc-4";
import { HD as HD_GB_BUOC_5 } from "../tab/gb-buoc-5";

export const HD_NHOM = {
  "bct-tab-ai": HD_BCT_TAB_AI,
  "bct-tab-quyet": HD_BCT_TAB_QUYET,
  "bct-tab-so-lieu": HD_BCT_TAB_SO_LIEU,
  "bct-giao-viec": HD_BCT_GIAO_VIEC,
  "bct-do-kho": HD_BCT_DO_KHO,
  "bct-bao-cao-don-vi": HD_BCT_BAO_CAO_DON_VI,
  "gb-buoc-1": HD_GB_BUOC_1,
  "gb-buoc-2": HD_GB_BUOC_2,
  "gb-buoc-3": HD_GB_BUOC_3,
  "gb-buoc-4": HD_GB_BUOC_4,
  "gb-buoc-5": HD_GB_BUOC_5,
} satisfies Record<string, HuongDanTab>;
