// Nhóm A — Điều hành: Bảng điều hành, Issue, Việc của tôi, thanh trên. Thuần (luật 10).
import type { HuongDanTab } from "../kieu";
import { HD as BDH } from "../tab/bdh";
import { HD as VIEC } from "../tab/viec";
import { HD as GIAO_VIEC } from "../tab/giao-viec";
import { HD as ISSUE_CANH_BAO } from "../tab/issue-canh-bao";
import { HD as ISSUE_WBS } from "../tab/issue-wbs";
import { HD as CHUONG_BAO } from "../tab/chuong-bao";
import { HD as TAO_DU_AN } from "../tab/tao-du-an";

export const NHOM_A: Record<string, HuongDanTab> = {
  bdh: BDH,
  "viec-cua-toi": VIEC,
  "giao-viec": GIAO_VIEC,
  "issue-canh-bao": ISSUE_CANH_BAO,
  "issue-wbs": ISSUE_WBS,
  "chuong-bao": CHUONG_BAO,
  "tao-du-an": TAO_DU_AN,
};
