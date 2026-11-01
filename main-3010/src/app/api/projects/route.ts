// /api/projects — quản lý registry dự án (data/projects.json).
// HỢP ĐỒNG: xem comment đầu src/lib/projects.ts.
//
// - GET    : mọi user ĐÃ ĐĂNG NHẬP → { projects, current } — projects đã lọc
//            theo quyền canAccessProjectByEmail; pm kèm cả archived khi ?all=1.
// - POST   : chỉ pm, body { name, projectStart? } → createProject → { ok, project }.
// - PATCH  : chỉ pm, body { id, name?, archived? } → updateProject → { ok, project }.
// - DELETE : chỉ pm, ?id= → deleteProject (dữ liệu CHUYỂN vào data/projects/_trash).
// Lỗi nghiệp vụ từ lib → 400 { ok: false, message } (message tiếng Việt của lib).

import { NextResponse } from "next/server";
import { dayChoCacAgent } from "@/lib/day-sang-agent";
import { requireRole } from "@/lib/route-auth";
import { duocCaiDat } from "@/lib/quyen";
import { docToChuc } from "@/lib/to-chuc";
import {
  canAccessProjectByEmail,
  createProject,
  deleteProject,
  listProjects,
  resolveProjectId,
  sanitizeProjectId,
  updateProject,
} from "@/lib/projects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<NextResponse> {
  const auth = await requireRole("xem");
  if (!auth.ok) return auth.response;

  const all = new URL(req.url).searchParams.get("all") === "1";
  const includeArchived = all && duocCaiDat(auth.session.role);
  const projects = listProjects(includeArchived).filter((p) =>
    canAccessProjectByEmail(auth.session.email, auth.session.role, p.id)
  );
  // 6g.6 Đợt 2 bước E: màn Quản lý dự án cần cây đơn vị ở Main để chọn Ban QLDA / đơn vị làm / Ban điều hành
  const donViLuaChon = includeArchived
    ? (() => {
        const tc = docToChuc();
        return { tinhTrang: tc.tinhTrang, ds: tc.toChuc.don_vi.filter((d) => d.active).map((d) => ({ id: d.id, ten: d.ten, tenNgan: d.ten_ngan, cap: d.cap, loai: d.loai })) };
      })()
    : undefined;
  return NextResponse.json({ projects, current: resolveProjectId(), ...(donViLuaChon ? { donViLuaChon } : {}) });
}

export async function POST(req: Request): Promise<NextResponse> {
  const auth = await requireRole("caidat");
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => null)) as {
    name?: unknown;
    projectStart?: unknown;
    ma?: unknown;
    giamDoc?: unknown;
    /** ⭐ 03/10 (6g.6): tên gọi khác + nhóm */
    tenKhac?: unknown;
    nhom?: unknown;
  } | null;

  if (!body || typeof body.name !== "string") {
    return NextResponse.json(
      { ok: false, message: "Thiếu hoặc sai dữ liệu: cần name (tên dự án)." },
      { status: 400 }
    );
  }
  if (body.projectStart !== undefined && typeof body.projectStart !== "string") {
    return NextResponse.json(
      { ok: false, message: "Ngày khởi công (projectStart) phải là chuỗi yyyy-mm-dd." },
      { status: 400 }
    );
  }

  const result = createProject({
    name: body.name,
    projectStart: body.projectStart === undefined || body.projectStart === "" ? undefined : body.projectStart,
    createdBy: auth.session.email,
    ma: typeof body.ma === "string" ? body.ma : undefined,
    giamDoc: typeof body.giamDoc === "string" ? body.giamDoc : undefined,
    tenKhac: body.tenKhac,
    nhom: body.nhom,
  });
  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.error }, { status: 400 });
  }
  const dayChoAgent = await dayChoCacAgent("Main ghi dự án");
  return NextResponse.json({ ok: true, project: result.project , dayChoAgent });
}

export async function PATCH(req: Request): Promise<NextResponse> {
  const auth = await requireRole("caidat");
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => null)) as {
    id?: unknown;
    name?: unknown;
    archived?: unknown;
    /** Toạ độ công trường — dùng cho dự báo thời tiết (Mr. Đại chốt 06/09) */
    viDo?: unknown;
    kinhDo?: unknown;
    ma?: unknown;
    giamDoc?: unknown;
    tenKhac?: unknown;
    nhom?: unknown;
    donVi?: unknown;
    banDieuHanh?: unknown;
    congSuat?: unknown;
    loaiHinh?: unknown;
    diaDiem?: unknown;
    giaiDoan?: unknown;
  } | null;

  const id = sanitizeProjectId(body?.id);
  if (!id) {
    return NextResponse.json(
      { ok: false, message: "Thiếu hoặc sai id dự án cần sửa." },
      { status: 400 }
    );
  }
  if (body?.name !== undefined && typeof body.name !== "string") {
    return NextResponse.json({ ok: false, message: "Tên dự án phải là chuỗi." }, { status: 400 });
  }
  if (body?.archived !== undefined && typeof body.archived !== "boolean") {
    return NextResponse.json(
      { ok: false, message: "Trạng thái lưu trữ (archived) phải là true/false." },
      { status: 400 }
    );
  }

  // Toạ độ công trường (dự báo thời tiết Open-Meteo). Nhận số hoặc null (xoá
  // khai báo); ngoài khoảng hợp lệ thì từ chối, thà thiếu còn hơn hỏi thời
  // tiết ở giữa biển.
  const doc = (v: unknown, ten: string, tran: number): number | null | undefined => {
    if (v === undefined) return undefined;
    if (v === null || v === "") return null;
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n) || Math.abs(n) > tran) {
      throw new Error(`${ten} phải là số trong khoảng −${tran}…${tran}.`);
    }
    return n;
  };
  let viDo: number | null | undefined;
  let kinhDo: number | null | undefined;
  try {
    viDo = doc(body?.viDo, "Vĩ độ", 90);
    kinhDo = doc(body?.kinhDo, "Kinh độ", 180);
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : "Toạ độ không hợp lệ." },
      { status: 400 },
    );
  }

  const result = updateProject(id, {
    name: body?.name as string | undefined,
    archived: body?.archived as boolean | undefined,
    viDo,
    kinhDo,
    ma: typeof body?.ma === "string" ? body.ma : undefined,
    giamDoc: typeof body?.giamDoc === "string" ? body.giamDoc : undefined,
    tenKhac: body?.tenKhac,
    nhom: body?.nhom,
    // 6g.6 Đợt 2 bước E: 3 trường gắn đơn vị (chọn là lưu ở màn Quản lý dự án)
    donVi: body?.donVi,
    banDieuHanh: body?.banDieuHanh,
    // 13/10: bốn ô Bảng 3 báo cáo tháng
    congSuat: body?.congSuat,
    loaiHinh: body?.loaiHinh,
    diaDiem: body?.diaDiem,
    giaiDoan: body?.giaiDoan,
  });
  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.error }, { status: 400 });
  }
  const dayChoAgent = await dayChoCacAgent("Main ghi dự án");
  return NextResponse.json({ ok: true, project: result.project , dayChoAgent });
}

export async function DELETE(req: Request): Promise<NextResponse> {
  const auth = await requireRole("caidat");
  if (!auth.ok) return auth.response;

  const id = sanitizeProjectId(new URL(req.url).searchParams.get("id"));
  if (!id) {
    return NextResponse.json(
      { ok: false, message: "Thiếu tham số ?id= của dự án cần xóa." },
      { status: 400 }
    );
  }

  const result = deleteProject(id);
  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.error }, { status: 400 });
  }
  const dayChoAgent = await dayChoCacAgent("Main ghi dự án");
  return NextResponse.json({ ok: true , dayChoAgent });
}
