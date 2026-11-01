// Hướng dẫn nhóm b3 — mỗi mã một tệp trong ../tab/. Thuần (luật 10).
import type { HuongDanTab } from "../kieu";
import { HD as HD_CD_LUAT } from "../tab/cd-luat";
import { HD as HD_CD_LUAT_KIEM_TRA } from "../tab/cd-luat_kiem_tra";
import { HD as HD_CD_LUONG_BAO_CAO } from "../tab/cd-luong_bao_cao";
import { HD as HD_CD_TEN_GOI_KHAC } from "../tab/cd-ten_goi_khac_don_vi";
import { HD as HD_CD_CONG_TY } from "../tab/cd-cong_ty_don_vi";
import { HD as HD_CD_DU_AN } from "../tab/cd-du_an";
import { HD as HD_CD_GAN_WBS } from "../tab/cd-gan_wbs";
import { HD as HD_CD_THU_MUC } from "../tab/cd-thu_muc";
import { HD as HD_CD_DINH_KEM } from "../tab/cd-dinh_kem";
import { HD as HD_CD_BAO_CAO_TUAN } from "../tab/cd-bao_cao_tuan";
import { HD as HD_LUAT_TRINH_SUA } from "../tab/luat-trinh-sua";
import { HD as HD_LUAT_HE_THONG } from "../tab/luat-he-thong";
import { HD as HD_LUAT_THAM_SO } from "../tab/luat-tham-so";
import { HD as HD_LUAT_CHAY_THU } from "../tab/luat-chay-thu";
import { HD as HD_LUAT_LICH_SU } from "../tab/luat-lich-su";

export const HD_NHOM = {
  "cd-luat": HD_CD_LUAT,
  "cd-luat_kiem_tra": HD_CD_LUAT_KIEM_TRA,
  "cd-luong_bao_cao": HD_CD_LUONG_BAO_CAO,
  "cd-ten_goi_khac_don_vi": HD_CD_TEN_GOI_KHAC,
  "cd-cong_ty_don_vi": HD_CD_CONG_TY,
  "cd-du_an": HD_CD_DU_AN,
  "cd-gan_wbs": HD_CD_GAN_WBS,
  "cd-thu_muc": HD_CD_THU_MUC,
  "cd-dinh_kem": HD_CD_DINH_KEM,
  "cd-bao_cao_tuan": HD_CD_BAO_CAO_TUAN,
  "luat-trinh-sua": HD_LUAT_TRINH_SUA,
  "luat-he-thong": HD_LUAT_HE_THONG,
  "luat-tham-so": HD_LUAT_THAM_SO,
  "luat-chay-thu": HD_LUAT_CHAY_THU,
  "luat-lich-su": HD_LUAT_LICH_SU,
} satisfies Record<string, HuongDanTab>;
