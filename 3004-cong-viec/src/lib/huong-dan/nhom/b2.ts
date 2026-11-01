// Hướng dẫn nhóm b2 — mỗi mã một tệp trong ../tab/. Thuần (luật 10).
// Màn cấu hình / quản trị: tab «👥 Người dùng & phân quyền» của Cài đặt (mã cd-<khoa mục> do TrangCaiDat.tsx khai) + các hộp mở từ nút.
import type { HuongDanTab } from "../kieu";
import { HD as HD_TO_CHUC } from "../tab/cd-to-chuc";
import { HD as HD_TO_CHUC_NGUOI } from "../tab/cd-to-chuc-nguoi";
import { HD as HD_TO_CHUC_DON_VI } from "../tab/cd-to-chuc-don-vi";
import { HD as HD_VAI_TRO } from "../tab/cd-vai-tro";
import { HD as HD_VAI_TRO_MOI } from "../tab/cd-vai-tro-moi";
import { HD as HD_NHAP_EXCEL } from "../tab/cd-nhap-excel";
import { HD as HD_TAI_KHOAN } from "../tab/cd-tai_khoan";
import { HD as HD_NGUOI_NGOAI } from "../tab/cd-nguoi_ngoai";
import { HD as HD_PHAN_QUYEN } from "../tab/cd-phan_quyen_cau_hinh";

export const HD_NHOM = {
  "cd-to-chuc": HD_TO_CHUC,
  "cd-to-chuc-nguoi": HD_TO_CHUC_NGUOI,
  "cd-to-chuc-don-vi": HD_TO_CHUC_DON_VI,
  "cd-vai-tro": HD_VAI_TRO,
  "cd-vai-tro-moi": HD_VAI_TRO_MOI,
  "cd-nhap-excel": HD_NHAP_EXCEL,
  "cd-tai_khoan": HD_TAI_KHOAN,
  "cd-nguoi_ngoai": HD_NGUOI_NGOAI,
  "cd-phan_quyen_cau_hinh": HD_PHAN_QUYEN,
} satisfies Record<string, HuongDanTab>;
