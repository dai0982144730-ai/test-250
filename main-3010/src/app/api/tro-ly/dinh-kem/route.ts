// POST /api/tro-ly/dinh-kem — nhận 1 file kẹp vào ô chat, bóc CHỮ trả về.
// KHÔNG ghi gì lên đĩa/Drive: chữ chỉ sống trong lượt hỏi (người muốn lưu thì
// bấm gợi ý nộp Lớp 0). Trả kèm gợi ý Lớp 0 nếu nhận ra loại hồ sơ.

import { NextResponse } from "next/server";
import { canAccessProjectByEmail, getProject, resolveProjectId } from "@/lib/projects";
import { requireRole } from "@/lib/route-auth";
import { chuanBiTep } from "@/lib/tro-ly/dinh-kem";
import { TRAN_BYTE_TEP, doDuocDuoi } from "@/lib/tro-ly/dinh-kem-chung";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<NextResponse> {
  // Kẹp/nạp file = cửa GHI (ma trận LOI-DUNG-CHUNG 6g.5, 26/09): Người xem chỉ xem
  // và chat bằng chữ — 403 kèm câu LY_DO_CHAN.ghi tiếng Việt.
  const auth = await requireRole("ghi");
  if (!auth.ok) return auth.response;

  const projectId = resolveProjectId(new URL(req.url).searchParams.get("project"));
  if (!canAccessProjectByEmail(auth.session.email, auth.session.role, projectId)) {
    return NextResponse.json({ ok: false, message: "Bạn không có quyền truy cập dự án này." }, { status: 403 });
  }

  let fd: FormData;
  try {
    fd = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, message: "Body phải là FormData kèm file." }, { status: 400 });
  }
  const file = fd.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, message: "Thiếu file." }, { status: 400 });
  }
  if (file.size > TRAN_BYTE_TEP) {
    return NextResponse.json(
      { ok: false, message: `File quá ${Math.round(TRAN_BYTE_TEP / 1024 / 1024)} MB.` },
      { status: 400 }
    );
  }
  if (!doDuocDuoi(file.name)) {
    return NextResponse.json(
      {
        ok: false,
        message: "Trợ lý chưa đọc được loại file này — dùng pdf, xlsx, xls, csv, docx, txt, md, json hoặc pptx.",
      },
      { status: 400 }
    );
  }

  const tenDuAn = getProject(projectId)?.name ?? projectId;
  const buffer = Buffer.from(await file.arrayBuffer());
  const tep = await chuanBiTep(file.name, buffer, tenDuAn);

  if (tep.chu.trim() === "") {
    return NextResponse.json(
      { ok: false, message: tep.ghiChu ?? "Không bóc được chữ nào trong file." },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true, tep });
}
