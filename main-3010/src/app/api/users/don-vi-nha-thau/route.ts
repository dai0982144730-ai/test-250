// GET /api/users/don-vi-nha-thau — danh sách đơn vị cho tài khoản loại «Nhà thầu» (Mr. Đại chốt 18/10/2026).
// Nguồn DUY NHẤT: sổ nhà thầu của agent Tiến độ (`tiendo.nha_thau`) — nhà thầu chính mã NT- + thầu phụ mã TP- nối tới.
// Main không tự giữ sổ nhà thầu (luật 7). Agent Tiến độ tắt → trả câu báo, màn Người dùng hiện câu đó.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/route-auth";
import { hoiAgent } from "@/lib/nguon/hoi-agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ThauPhuTra {
  ma_du_an?: string;
  ten_du_an?: string;
  ma: string;
  ten: string;
}
interface NhaThauTra {
  ma: string;
  ten: string;
  thau_phu?: ThauPhuTra[];
}

export interface DonViChon {
  ma: string;
  ten: string;
  /** Thầu phụ: «thầu phụ của <mã nhà thầu> · <dự án>»; nhà thầu chính: «nhà thầu chính» */
  ghiChu: string;
}

export async function GET(): Promise<NextResponse> {
  const auth = await requireRole("caidat");
  if (!auth.ok) return auth.response;
  const kq = await hoiAgent("tiendo", "tiendo.nha_thau", "Main → Cài đặt → Người dùng: chọn đơn vị cho tài khoản loại Nhà thầu");
  if (!kq.ok) {
    return NextResponse.json({ ok: false, message: `Không lấy được sổ nhà thầu từ agent Tiến độ: ${kq.thong_diep}` }, { status: 502 });
  }
  const ds = ((kq.du_lieu as { nha_thau?: NhaThauTra[] }).nha_thau ?? []).filter((n) => n && n.ma && n.ten);
  const donVi: DonViChon[] = [];
  for (const n of ds) {
    donVi.push({ ma: n.ma, ten: n.ten, ghiChu: "nhà thầu chính" });
    for (const t of n.thau_phu ?? []) {
      if (!t.ma || donVi.some((x) => x.ma === t.ma)) continue;
      donVi.push({ ma: t.ma, ten: t.ten, ghiChu: `thầu phụ của ${n.ma} ${n.ten}${t.ten_du_an ? ` · ${t.ten_du_an}` : ""}` });
    }
  }
  return NextResponse.json({ ok: true, donVi });
}
