// Nhóm B — Báo cáo: tab Sáng (người nhận, bộ khối, luật động) và tab Tháng. Thuần (luật 10).
import type { HuongDanTab } from "../kieu";
import { HD as BCS } from "../tab/bcs";
import { HD as BCS_NGUOI_NHAN } from "../tab/bcs-nguoi-nhan";
import { HD as BCS_BO_KHOI } from "../tab/bcs-bo-khoi";
import { HD as BCS_LUAT } from "../tab/bcs-luat";
import { HD as BCT } from "../tab/bct";

export const NHOM_B: Record<string, HuongDanTab> = {
  bcs: BCS,
  "bcs-nguoi-nhan": BCS_NGUOI_NHAN,
  "bcs-bo-khoi": BCS_BO_KHOI,
  "bcs-luat": BCS_LUAT,
  bct: BCT,
};
