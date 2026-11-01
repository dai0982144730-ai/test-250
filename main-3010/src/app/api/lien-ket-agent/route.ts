// GET /api/lien-ket-agent — dãy link các agent cho menu tên người + cột trái (Mr. Đại chốt 04/10/2026).
// Địa chỉ đọc từ DANH BẠ AGENT (Cài đặt → Danh bạ agent), không gắn cứng. Đọc tệp tại chỗ, không gọi
// agent khác → không có lượt nào phải ghi sổ (luật 29).

import { NextResponse } from "next/server";
import { docDanhBaAgent } from "@/lib/cai-dat-base";
import { timAgent, type KhaiAgent } from "@/lib/danh-ba-agent";
import { dungDayAgent } from "@/lib/lien-ket-agent";
import { layPhienCucBo } from "@/lib/route-auth";
import { danhSachNguoiDungDayDu, normalizeEmail } from "@/lib/users";
import { danhSachDuAnDungChung } from "@/lib/projects";
import { nguoiKemLoai } from "@/lib/he-thong-dung-chung";
import { duocVaoAgentMat, ganKhoaAgentMat, nguoiXetHopDong } from "@/lib/loai-du-an";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Người đang mở có vào được agent mật không — tính bằng bảng loại theo dự án Main giao cho agent.
 * ⭐ 12/10/2026: ở agent HỢP ĐỒNG loại PM không còn mở mọi dự án (chỉ dự án mình làm Giám đốc dự án).
 * ⭐ 12/10/2026 tối: agent PHÁP LÝ mở thư viện luật cho mọi người đã đăng nhập → link Pháp lý KHÔNG khoá nữa; chỉ còn xét Hợp đồng.
 */
async function duocVaoHopDongCuaToi(): Promise<boolean> {
  const phien = await layPhienCucBo();
  if (!phien) return true;
  try {
    const email = normalizeEmail(phien.email);
    const duAn = danhSachDuAnDungChung();
    const u = nguoiKemLoai(danhSachNguoiDungDayDu().filter((x) => x.email === email), duAn)[0];
    const goc = { role: phien.role as string, loaiTheoDuAn: u?.loaiTheoDuAn };
    return duocVaoAgentMat(nguoiXetHopDong(goc, email, duAn));
  } catch {
    return true; // tính hỏng → không khoá link (agent kia tự chặn ở cửa vào)
  }
}

export async function GET(req: Request): Promise<NextResponse> {
  let danhBa: KhaiAgent[] = [];
  try {
    danhBa = docDanhBaAgent();
  } catch {
    // đọc không được → cả dãy hiện "chưa đưa lên hoạt động", không làm sập menu
  }
  const day = dungDayAgent((ma) => timAgent(danhBa, ma), req.headers.get("host"));
  return NextResponse.json({ ok: true, day: ganKhoaAgentMat(day, await duocVaoHopDongCuaToi()) });
}
