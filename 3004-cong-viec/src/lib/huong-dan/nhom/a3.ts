// Hướng dẫn nhóm a3 — mỗi mã một tệp trong ../tab/. Thuần (luật 10).
// Nhóm A3: Cây việc & đường găng (khung con) · Issue (từng tab, khung con) · Trợ lý chat (khung con). 10 hướng dẫn cũ
// (cay-viec, issue, gop-y, thong-bao, tro-ly-chat) đã đăng ký ở noi-dung.ts nên chỉ sửa tệp tab của chúng.
import type { HuongDanTab } from "../kieu";
import { HD as HD_CAY_VIEC_NUT } from "../tab/cay-viec-nut";
import { HD as HD_CAY_VIEC_VIEC } from "../tab/cay-viec-viec";
import { HD as HD_CAY_VIEC_NGUON } from "../tab/cay-viec-nguon";
import { HD as HD_CAY_VIEC_HANG_LOAT } from "../tab/cay-viec-hang-loat";
import { HD as HD_CAY_VIEC_GAN_MA } from "../tab/cay-viec-gan-ma";
import { HD as HD_CAY_VIEC_O_GIAO_SUA } from "../tab/cay-viec-o-giao-sua";
import { HD as HD_ISSUE_QUA_HAN } from "../tab/issue-qua-han";
import { HD as HD_ISSUE_XONG_GIAY } from "../tab/issue-xong-giay";
import { HD as HD_ISSUE_NGUOI_THEM } from "../tab/issue-nguoi-them";
import { HD as HD_ISSUE_DE_XUAT_AI } from "../tab/issue-de-xuat-ai";
import { HD as HD_ISSUE_THEM } from "../tab/issue-them";
import { HD as HD_ISSUE_NGUONG } from "../tab/issue-nguong";
import { HD as HD_TRO_LY_CHAT_KY_NANG } from "../tab/tro-ly-chat-ky-nang";
import { HD as HD_TRO_LY_CHAT_BAN_AI } from "../tab/tro-ly-chat-ban-ai";
import { HD as HD_TRO_LY_CHAT_XUAT } from "../tab/tro-ly-chat-xuat";

export const HD_NHOM = {
  "cay-viec-nut": HD_CAY_VIEC_NUT,
  "cay-viec-viec": HD_CAY_VIEC_VIEC,
  "cay-viec-nguon": HD_CAY_VIEC_NGUON,
  "cay-viec-hang-loat": HD_CAY_VIEC_HANG_LOAT,
  "cay-viec-gan-ma": HD_CAY_VIEC_GAN_MA,
  "cay-viec-o-giao-sua": HD_CAY_VIEC_O_GIAO_SUA,
  "issue-qua-han": HD_ISSUE_QUA_HAN,
  "issue-xong-giay": HD_ISSUE_XONG_GIAY,
  "issue-nguoi-them": HD_ISSUE_NGUOI_THEM,
  "issue-de-xuat-ai": HD_ISSUE_DE_XUAT_AI,
  "issue-them": HD_ISSUE_THEM,
  "issue-nguong": HD_ISSUE_NGUONG,
  "tro-ly-chat-ky-nang": HD_TRO_LY_CHAT_KY_NANG,
  "tro-ly-chat-ban-ai": HD_TRO_LY_CHAT_BAN_AI,
  "tro-ly-chat-xuat": HD_TRO_LY_CHAT_XUAT,
} satisfies Record<string, HuongDanTab>;
