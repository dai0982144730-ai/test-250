// Hướng dẫn nhóm a1 — Việc của tôi, Sơ đồ tổ chức, Dự án và các khung dùng chung (thẻ việc, báo xong, sửa việc, bình luận...). Mỗi mã một tệp trong ../tab/. Thuần (luật 10).
import type { HuongDanTab } from "../kieu";
import { HD as HD_VCT_KHUNG_SUA } from "../tab/vct-khung-sua";
import { HD as HD_SO_DO_GIAO_VIEC } from "../tab/so-do-giao-viec";
import { HD as HD_SO_DO_BAO_CAO_O } from "../tab/so-do-bao-cao-o";
import { HD as HD_SO_DO_SOAT_BAO_CAO } from "../tab/so-do-soat-bao-cao";
import { HD as HD_DU_AN_GIAO_VIEC } from "../tab/du-an-giao-viec";
import { HD as HD_DU_AN_TOM_TAT_TIEN_DO } from "../tab/du-an-tom-tat-tien-do";
import { HD as HD_VIEC_THE_VIEC } from "../tab/viec-the-viec";
import { HD as HD_VIEC_BAO_XONG } from "../tab/viec-bao-xong";
import { HD as HD_VIEC_SUA_VIEC } from "../tab/viec-sua-viec";
import { HD as HD_VIEC_THAO_TAC_NHO } from "../tab/viec-thao-tac-nho";
import { HD as HD_VIEC_BINH_LUAN } from "../tab/viec-binh-luan";
import { HD as HD_VIEC_BAO_CAO_GOC } from "../tab/viec-bao-cao-goc";
import { HD as HD_VIEC_XEM_DA_XONG } from "../tab/viec-xem-da-xong";

export const HD_NHOM = {
  "vct-khung-sua": HD_VCT_KHUNG_SUA,
  "so-do-giao-viec": HD_SO_DO_GIAO_VIEC,
  "so-do-bao-cao-o": HD_SO_DO_BAO_CAO_O,
  "so-do-soat-bao-cao": HD_SO_DO_SOAT_BAO_CAO,
  "du-an-giao-viec": HD_DU_AN_GIAO_VIEC,
  "du-an-tom-tat-tien-do": HD_DU_AN_TOM_TAT_TIEN_DO,
  "viec-the-viec": HD_VIEC_THE_VIEC,
  "viec-bao-xong": HD_VIEC_BAO_XONG,
  "viec-sua-viec": HD_VIEC_SUA_VIEC,
  "viec-thao-tac-nho": HD_VIEC_THAO_TAC_NHO,
  "viec-binh-luan": HD_VIEC_BINH_LUAN,
  "viec-bao-cao-goc": HD_VIEC_BAO_CAO_GOC,
  "viec-xem-da-xong": HD_VIEC_XEM_DA_XONG,
} satisfies Record<string, HuongDanTab>;
