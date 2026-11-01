// POST /api/ai/install-cli { bat_buoc? } — cài Claude CLI tự động · GET — xem tiến trình + log.
// Quyền cau_hinh.sua. Như HptStart: máy đã có CLI thì báo "đã có sẵn" (already), trừ khi bấm
// "Cài lại" (bat_buoc = true) — CLI hỏng, PATH sai vẫn có đường sửa.
// BẢO MẬT (giữ nguyên bản gốc): lệnh cài là HẰNG SỐ trong cli-setup.ts; body chỉ đọc MỘT cờ đúng/sai,
// không truyền chuỗi nào xuống tầng spawn.
import { batBuocDangNhap, xuLy } from "@/lib/phien";
import { daCoCli, getInstallState, startInstall } from "@/lib/ai/cli-setup";
import { batBuocQuyen, docJson, ghiDoiKetNoi } from "@/lib/ai/route-chung";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    batBuocQuyen(nd, "cau_hinh.sua", "Chỉ người có quyền sửa cài đặt mới cài Claude CLI.");
    const b = await docJson(req, false);
    const batBuoc = b.bat_buoc === true;
    if (!batBuoc && daCoCli()) {
      return { ok: true, already: true, started: false, message: "Máy chủ đã có sẵn Claude CLI." };
    }
    const res = startInstall();
    if (res.started) await ghiDoiKetNoi(nd, { thao_tac: batBuoc ? "cai_lai_claude_cli" : "cai_claude_cli" });
    return { ok: true, started: res.started, message: res.message ?? "Đang cài Claude CLI trên máy chủ (1–3 phút) — xong SCI công việc tự nhận." };
  });
}

export async function GET(): Promise<Response> {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    batBuocQuyen(nd, "cau_hinh.sua", "Chỉ người có quyền sửa cài đặt mới xem tiến trình cài Claude CLI.");
    const st = getInstallState();
    return { ok: true, running: st.running, done: st.done, success: st.ok, log: st.log };
  });
}
