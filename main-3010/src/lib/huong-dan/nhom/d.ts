// Nhóm D — trợ lý chat, Skill, tài khoản Claude cá nhân, menu tên người (+ Đổi mật khẩu, Nối Telegram), Góp ý, Kịch bản test. Thuần (luật 10).
import type { HuongDanTab } from "../kieu";
import { HD as CHAT } from "../tab/chat";
import { HD as SKILL_AI } from "../tab/skill-ai";
import { HD as TK_CA_NHAN } from "../tab/tk-ca-nhan";
import { HD as MENU_TEN_NGUOI } from "../tab/menu-ten-nguoi";
import { HD as DOI_MAT_KHAU } from "../tab/doi-mat-khau";
import { HD as NOI_TELEGRAM } from "../tab/noi-telegram";
import { HD as GOP_Y } from "../tab/gop-y";
import { HD as KICH_BAN_TEST } from "../tab/kich-ban-test";

export const NHOM_D: Record<string, HuongDanTab> = {
  chat: CHAT,
  "skill-ai": SKILL_AI,
  "tai-khoan-claude-ca-nhan": TK_CA_NHAN,
  "menu-ten-nguoi": MENU_TEN_NGUOI,
  "doi-mat-khau": DOI_MAT_KHAU,
  "noi-telegram": NOI_TELEGRAM,
  "gop-y": GOP_Y,
  "kich-ban-test": KICH_BAN_TEST,
};
