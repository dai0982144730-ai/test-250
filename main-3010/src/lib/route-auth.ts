// Kiểm quyền cho API route + server component của Main — CHỈ dùng phía máy
// chủ (next/headers). Bảng quyền ở src/lib/quyen.ts; file này chỉ:
//   ① đọc cookie phiên sci_session,
//   ② tra lại loại tài khoản trong sổ CỤC BỘ (SSO P1 — cookie chung chỉ mang
//      danh tính; quyền do từng app cấp),
//   ③ so với CỬA mà lời gọi khai: "xem" | "ghi" | "caidat" | "quanlynguoidung" | "pheduyet".
//
// CHÉP SANG AGENT KHÁC: chép nguyên file (cần quyen.ts + users.ts getUserByEmail).

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession, type SessionPayload } from "@/lib/auth";
import { getUserByEmail } from "@/lib/users";
import { CAU_CHAN_NHA_THAU, chuanHoaLoai, cuaTuDanhSachCu, duocQuaCua, duocVaoAgent, LY_DO_CHAN, type Cua } from "@/lib/quyen";

type KetQuaPhien =
  | { ok: true; session: SessionPayload }
  | { ok: false; status: 401 | 403; message: string };

/**
 * Phiên của người đang gọi, với loại + tên LẤY TỪ SỔ CỤC BỘ (không tin loại
 * ghi trong cookie — cookie có thể do app khác trong hệ ký).
 */
export async function docPhienCucBo(): Promise<KetQuaPhien> {
  const session = await verifySession(cookies().get(SESSION_COOKIE)?.value);
  if (!session) {
    return { ok: false, status: 401, message: "Chưa đăng nhập hoặc phiên đã hết hạn." };
  }
  const nguoiCucBo = getUserByEmail(session.email);
  const loai = chuanHoaLoai(nguoiCucBo?.role);
  if (!nguoiCucBo || !nguoiCucBo.active || loai === null) {
    return {
      ok: false,
      status: 403,
      message: `Tài khoản ${session.email} chưa được cấp (hoặc đã khoá) ở app này — đăng nhập chung chỉ mang danh tính, quyền do từng app cấp.`,
    };
  }
  // 18/10/2026: tài khoản Nhà thầu không dùng Main (middleware đã chặn theo cookie — đây chặn theo sổ, phòng cookie cũ)
  if (!duocVaoAgent(loai, "main")) return { ok: false, status: 403, message: CAU_CHAN_NHA_THAU };
  return { ok: true, session: { ...session, role: loai, name: nguoiCucBo.name } };
}

/** Bản gọn cho server component: phiên hợp lệ hoặc null */
export async function layPhienCucBo(): Promise<SessionPayload | null> {
  const p = await docPhienCucBo();
  return p.ok ? p.session : null;
}

/**
 * Chặn API theo cửa quyền. Khai theo cửa:
 *   requireRole("ghi")                      — câu báo mặc định LY_DO_CHAN.ghi
 *   requireRole("caidat", "Câu báo riêng")  — ghi đè câu báo 403
 * Mảng mã loại kiểu cũ vẫn nhận (đổi sang cửa bằng `cuaTuDanhSachCu`) để bộ code
 * chép sang agent khác chạy đúng ngay; lời gọi mới dùng tên cửa.
 */
export async function requireRole(
  cuaHoacDanhSach: Cua | readonly string[],
  forbiddenMessage?: string,
): Promise<{ ok: true; session: SessionPayload } | { ok: false; response: NextResponse }> {
  const p = await docPhienCucBo();
  if (!p.ok) {
    return { ok: false, response: NextResponse.json({ ok: false, message: p.message }, { status: p.status }) };
  }
  const cua: Cua = typeof cuaHoacDanhSach === "string" ? cuaHoacDanhSach : cuaTuDanhSachCu(cuaHoacDanhSach);
  if (!duocQuaCua(p.session.role, cua)) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, message: forbiddenMessage && forbiddenMessage !== "" ? forbiddenMessage : LY_DO_CHAN[cua] },
        { status: 403 },
      ),
    };
  }
  return { ok: true, session: p.session };
}
