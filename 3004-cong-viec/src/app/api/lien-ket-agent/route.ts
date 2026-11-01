// GET /api/lien-ket-agent — dãy link các agent cho menu tên người (Mr. Đại chốt 04/10/2026).
// Agent Công việc CHƯA có danh bạ agent (xem lib/chung/dia-chi-agent.ts) nên địa chỉ đọc biến môi trường
// URL_AGENT_<TÊN>, không đặt thì dùng cổng mặc định trên máy này. Lên hosting: đặt biến môi trường, không sửa code.

import { NextResponse } from "next/server";
import { DIA_CHI_MAIN_MAC_DINH, DIA_CHI_TIEN_DO_MAC_DINH } from "@/lib/chung/dia-chi-agent";
import { dungDayAgent } from "@/lib/chung/lien-ket-agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NGUON: Record<string, { bien: string; macDinh: string }> = {
  quansat: { bien: "URL_AGENT_QUAN_SAT", macDinh: "http://127.0.0.1:3014" },
  main: { bien: "URL_AGENT_MAIN", macDinh: DIA_CHI_MAIN_MAC_DINH },
  tiendo: { bien: "URL_AGENT_TIEN_DO", macDinh: DIA_CHI_TIEN_DO_MAC_DINH },
  hopdong: { bien: "URL_AGENT_HOP_DONG", macDinh: "http://127.0.0.1:3012" },
  phaply: { bien: "URL_AGENT_PHAP_LY", macDinh: "http://127.0.0.1:3013" },
  // Mr. Đại cho dựng lại 19/10/2026: menu tên người hiện link agent Nghiệm thu (4 agent kia đã có)
  nghiemthu: { bien: "URL_AGENT_NGHIEM_THU", macDinh: "http://127.0.0.1:3015" },
};

export function GET(req: Request): NextResponse {
  const day = dungDayAgent((ma) => {
    const n = NGUON[ma];
    if (!n) return undefined; // "base" = chính agent này (hiện "đang ở đây")
    return { diaChi: (process.env[n.bien] ?? "").trim() || n.macDinh, dangBat: true };
  }, req.headers.get("host"));
  return NextResponse.json({ ok: true, day });
}
