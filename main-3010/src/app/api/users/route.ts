// GET/POST/PUT/DELETE /api/users — quản lý người dùng (store data/users.json).
// Quyền (src/lib/quyen.ts, Mr. Đại chốt 25/09): GET = cửa "caidat" (PM thấy
// danh sách, nút mờ); POST/PUT/DELETE = cửa "quanlynguoidung" (CHỈ Admin, sửa
// được mọi loại kể cả PM). Admin không tự khoá/tự hạ loại/tự xoá chính mình.
//
// - GET: danh sách user (không kèm hash/salt).
// - POST {email, name, role, password}: tạo user mới (active mặc định).
// - PUT {email, name?, role?, active?, newPassword?, emailMoi?}: sửa thông tin/khóa mở/
//   reset mật khẩu; emailMoi = ĐỔI EMAIL (04/10 — lib/doi-email.ts: giữ mã người, mật khẩu = email mới,
//   chuyển thứ đứng tên + bí danh cho agent con).
// - DELETE ?email=: xóa user — chặn tự xóa chính mình + chặn xóa PM/Admin hoạt động cuối.

import { docToChuc } from "@/lib/to-chuc";
import { NextResponse } from "next/server";
import { dayChoCacAgent } from "@/lib/day-sang-agent";
import { doiEmailNguoiDung } from "@/lib/doi-email";
import { requireRole } from "@/lib/route-auth";
import {
  createUser,
  deleteUser,
  isValidRole,
  listUsers,
  normalizeEmail,
  resetPassword,
  updateUser,
} from "@/lib/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Thao tác thất bại.";
}

export async function GET(): Promise<NextResponse> {
  const auth = await requireRole("caidat");
  if (!auth.ok) return auth.response;
  // 04/10: bỏ cột "username Base" (E15) — Base.vn hết hợp đồng, Mr. Đại hỏi "hệ thống vẫn lưu giữ base??"
  const users = listUsers();
  // 6g.6.13: đã có tổ chức → loại (trừ PM/Admin) + dự án được vào đi theo sơ đồ, màn này thôi khai tay
  return NextResponse.json({ ok: true, users, theoSoDo: docToChuc().tinhTrang === "ok" });
}

export async function POST(req: Request): Promise<NextResponse> {
  const auth = await requireRole("quanlynguoidung");
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => null)) as {
    email?: unknown;
    name?: unknown;
    role?: unknown;
    password?: unknown;
    projectIds?: unknown;
    nhaThau?: unknown;
  } | null;

  if (
    !body ||
    typeof body.email !== "string" ||
    typeof body.name !== "string" ||
    typeof body.password !== "string" ||
    !isValidRole(body.role)
  ) {
    return NextResponse.json(
      {
        ok: false,
        message: "Thiếu hoặc sai dữ liệu: cần email, tên, loại tài khoản (pm/admin/engineer/viewer/nhathau), mật khẩu (để trống = email).",
      },
      { status: 400 },
    );
  }
  if (body.projectIds !== undefined && !Array.isArray(body.projectIds)) {
    return NextResponse.json(
      { ok: false, message: "Danh sách dự án (projectIds) phải là mảng chuỗi." },
      { status: 400 },
    );
  }

  try {
    const user = createUser({
      email: body.email,
      name: body.name,
      role: body.role,
      password: body.password,
      projectIds:
        body.projectIds === undefined
          ? undefined
          : (body.projectIds as unknown[]).filter((x): x is string => typeof x === "string"),
      nhaThau: body.nhaThau,
    });
    const dayChoAgent = await dayChoCacAgent("Main ghi người dùng");
  return NextResponse.json({ ok: true, user , dayChoAgent });
  } catch (err) {
    return NextResponse.json({ ok: false, message: errorMessage(err) }, { status: 400 });
  }
}

export async function PUT(req: Request): Promise<NextResponse> {
  const auth = await requireRole("quanlynguoidung");
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => null)) as {
    email?: unknown;
    name?: unknown;
    role?: unknown;
    active?: unknown;
    newPassword?: unknown;
    projectIds?: unknown;
    emailMoi?: unknown;
    nhaThau?: unknown;
  } | null;

  if (!body || typeof body.email !== "string" || body.email.trim() === "") {
    return NextResponse.json(
      { ok: false, message: "Thiếu email của người dùng cần sửa." },
      { status: 400 },
    );
  }
  if (body.name !== undefined && typeof body.name !== "string") {
    return NextResponse.json({ ok: false, message: "Tên phải là chuỗi." }, { status: 400 });
  }
  if (body.role !== undefined && !isValidRole(body.role)) {
    return NextResponse.json(
      { ok: false, message: "Loại tài khoản không hợp lệ (pm/admin/engineer/viewer/nhathau)." },
      { status: 400 },
    );
  }
  if (body.active !== undefined && typeof body.active !== "boolean") {
    return NextResponse.json(
      { ok: false, message: "Trạng thái active phải là true/false." },
      { status: 400 },
    );
  }
  if (body.newPassword !== undefined && typeof body.newPassword !== "string") {
    return NextResponse.json(
      { ok: false, message: "Mật khẩu mới phải là chuỗi." },
      { status: 400 },
    );
  }
  if (body.emailMoi !== undefined && typeof body.emailMoi !== "string") {
    return NextResponse.json({ ok: false, message: "Email mới phải là chuỗi." }, { status: 400 });
  }
  if (body.projectIds !== undefined && !Array.isArray(body.projectIds)) {
    return NextResponse.json(
      { ok: false, message: "Danh sách dự án (projectIds) phải là mảng chuỗi." },
      { status: 400 },
    );
  }

  const email = normalizeEmail(body.email);
  // Chặn Admin tự khóa/tự đổi loại chính mình (chống mất quản trị)
  if (email === auth.session.email && (body.active === false || (body.role !== undefined && body.role !== auth.session.role))) {
    return NextResponse.json(
      { ok: false, message: "Không thể tự khoá hoặc tự đổi loại tài khoản đang đăng nhập (chống mất quản trị)." },
      { status: 400 },
    );
  }

  try {
    const user = updateUser(email, {
      name: body.name,
      role: body.role,
      active: body.active,
      projectIds:
        body.projectIds === undefined
          ? undefined
          : (body.projectIds as unknown[]).filter((x): x is string => typeof x === "string"),
      nhaThau: body.nhaThau,
    });
    if (body.newPassword !== undefined && body.newPassword !== "") {
      resetPassword(email, body.newPassword);
    }
    // Đổi email SAU CÙNG (các sửa trên đi theo email cũ); hàm tự đẩy sang agent con
    if (typeof body.emailMoi === "string" && normalizeEmail(body.emailMoi) !== email) {
      const kq = await doiEmailNguoiDung(email, body.emailMoi, auth.session.email);
      return NextResponse.json({
        ok: true,
        user: kq.user,
        doiEmail: { cu: kq.emailCu, moi: kq.emailMoi, daChuyen: kq.daChuyen },
        message: `Đã đổi email ${kq.emailCu} → ${kq.emailMoi}. Mật khẩu đăng nhập nay là email mới.`,
        dayChoAgent: kq.dayChoAgent,
      });
    }
    const dayChoAgent = await dayChoCacAgent("Main ghi người dùng");
  return NextResponse.json({ ok: true, user , dayChoAgent });
  } catch (err) {
    return NextResponse.json({ ok: false, message: errorMessage(err) }, { status: 400 });
  }
}

export async function DELETE(req: Request): Promise<NextResponse> {
  const auth = await requireRole("quanlynguoidung");
  if (!auth.ok) return auth.response;

  const emailParam = new URL(req.url).searchParams.get("email");
  if (!emailParam || emailParam.trim() === "") {
    return NextResponse.json(
      { ok: false, message: "Thiếu tham số ?email= của người dùng cần xóa." },
      { status: 400 },
    );
  }
  const email = normalizeEmail(emailParam);
  if (email === auth.session.email) {
    return NextResponse.json(
      { ok: false, message: "Không thể tự xóa tài khoản đang đăng nhập." },
      { status: 400 },
    );
  }

  try {
    deleteUser(email);
    const dayChoAgent = await dayChoCacAgent("Main ghi người dùng");
  return NextResponse.json({ ok: true , dayChoAgent });
  } catch (err) {
    return NextResponse.json({ ok: false, message: errorMessage(err) }, { status: 400 });
  }
}
