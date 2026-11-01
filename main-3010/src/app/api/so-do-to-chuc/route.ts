// GET / POST /api/so-do-to-chuc — bộ kéo sơ đồ tổ chức từ agent Công việc (Mr. Đại chốt 12/10/2026 — câu 9).
//
// - GET: trạng thái lượt kéo gần nhất + mấy dòng nhật ký "đổi gì" gần đây. Cửa "caidat" (PM · Quản trị).
// - POST { viec: "keo" }            : «Kéo sơ đồ ngay» — làm đúng việc vòng 30 phút vẫn tự làm. Cửa "caidat".
// - POST { viec: "van-ghi" }        : ghi dù chốt an toàn chặn (mất nhiều đơn vị / khoá nhiều người). Cửa "quanlynguoidung".
// - POST { viec: "tao-tai-khoan" }  : tạo tài khoản cho những người lượt kéo gần nhất báo chưa có. Cửa "quanlynguoidung".
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/route-auth";
import { docNhatKyKeo, docTrangThaiKeo, keoSoDo, taoTaiKhoanChuaCo } from "@/lib/so-do-keo";
import { NHIP_KEO_PHUT } from "@/lib/so-do-keo-thuan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const goi = () => ({ trangThai: docTrangThaiKeo(), nhatKy: docNhatKyKeo(5), nhipPhut: NHIP_KEO_PHUT });

export async function GET(): Promise<NextResponse> {
  const auth = await requireRole("caidat");
  if (!auth.ok) return auth.response;
  return NextResponse.json({ ok: true, ...goi() });
}

export async function POST(req: Request): Promise<NextResponse> {
  const body = (await req.json().catch(() => null)) as { viec?: unknown } | null;
  const viec = typeof body?.viec === "string" ? body.viec : "";
  if (!["keo", "van-ghi", "tao-tai-khoan"].includes(viec)) {
    return NextResponse.json({ ok: false, message: "Thiếu hoặc sai `viec` — chỉ nhận: keo · van-ghi · tao-tai-khoan." }, { status: 400 });
  }
  const auth = await requireRole(viec === "keo" ? "caidat" : "quanlynguoidung");
  if (!auth.ok) return auth.response;
  const boi = auth.session.email;

  if (viec === "tao-tai-khoan") {
    const kq = await taoTaiKhoanChuaCo(boi);
    const message =
      kq.tao.length === 0 && kq.boQua.length === 0
        ? "Không có ai trong danh sách chưa có tài khoản."
        : `Đã tạo ${kq.tao.length} tài khoản (mật khẩu lần đầu = email)` +
          (kq.boQua.length ? ` · bỏ qua ${kq.boQua.length}: ${kq.boQua.map((b) => `${b.email} — ${b.lyDo}`).join("; ")}` : "") +
          ".";
    // Tạo xong kéo lại một lượt để danh sách "chưa có tài khoản" và phần tổ chức khớp ngay
    if (kq.tao.length) await keoSoDo({ boi });
    return NextResponse.json({ ok: true, message, tao: kq.tao, boQua: kq.boQua, dayChoAgent: kq.dayChoAgent, ...goi() });
  }

  const kq = await keoSoDo({ boi, vanGhi: viec === "van-ghi" });
  const t = kq.trangThai;
  return NextResponse.json({ ok: t.ketQua === "da-ghi" || t.ketQua === "khong-doi", message: t.thongDiep, dayChoAgent: kq.dayChoAgent, ...goi() });
}
