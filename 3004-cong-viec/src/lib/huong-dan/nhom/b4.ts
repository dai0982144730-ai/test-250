// Hướng dẫn nhóm b4 — mỗi mã một tệp trong ../tab/. Thuần (luật 10).
// Gồm: Cài đặt › Lịch sử, Rà soát sổ cái; trang Mẫu Word (+ khung khai báo, khung sửa); trang Skill AI của tôi (+ khối thêm kỹ năng, khối kết nối AI);
// trang Tài khoản Claude cá nhân; trang Khóa cho agent (đăng ký cả mã cd-khoa-agent của mục trong Cài đặt).
import type { HuongDanTab } from "../kieu";
import { HD as HD_LICH_SU } from "../tab/cd-lich-su";
import { HD as HD_LS_DONG_THOI_GIAN } from "../tab/ls-dong-thoi-gian";
import { HD as HD_RA_SOAT } from "../tab/cd-ra-soat";
import { HD as HD_MAU_WORD } from "../tab/mau-word";
import { HD as HD_MAU_WORD_KHAI_BAO } from "../tab/mau-word-khai-bao";
import { HD as HD_MAU_WORD_SUA } from "../tab/mau-word-sua";
import { HD as HD_KY_NANG } from "../tab/ky-nang";
import { HD as HD_KY_NANG_THEM } from "../tab/ky-nang-them";
import { HD as HD_KY_NANG_KET_NOI_AI } from "../tab/ky-nang-ket-noi-ai";
import { HD as HD_TAI_KHOAN_CLAUDE } from "../tab/tai-khoan-claude";
import { HD as HD_KHOA_AGENT } from "../tab/khoa-agent";

export const HD_NHOM = {
  "cd-lich-su": HD_LICH_SU,
  "ls-dong-thoi-gian": HD_LS_DONG_THOI_GIAN,
  "cd-ra-soat": HD_RA_SOAT,
  "mau-word": HD_MAU_WORD,
  "mau-word-khai-bao": HD_MAU_WORD_KHAI_BAO,
  "mau-word-sua": HD_MAU_WORD_SUA,
  "ky-nang": HD_KY_NANG,
  "ky-nang-them": HD_KY_NANG_THEM,
  "ky-nang-ket-noi-ai": HD_KY_NANG_KET_NOI_AI,
  "tai-khoan-claude": HD_TAI_KHOAN_CLAUDE,
  "khoa-agent": HD_KHOA_AGENT,
  "cd-khoa-agent": HD_KHOA_AGENT,
} satisfies Record<string, HuongDanTab>;
