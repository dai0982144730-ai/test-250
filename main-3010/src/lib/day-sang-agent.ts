// ============================================================
// ĐẨY BẢN DÙNG CHUNG SANG 4 AGENT — Mr. Đại bắt lỗi 11/09/2026:
// "Đã tạo dự án Nậm săm 3A ở Main nhưng các agent khác đều không nhìn thấy."
// Trước đó agent chỉ kéo khi NGƯỜI bấm ↻. Nay Main ghi xong dự án / người dùng
// là gọi ngay POST /api/dong-bo-tu-main của từng agent (agent tự kéo về bằng
// công cụ main.du_lieu_dung_chung như khi bấm ↻). Xác thực bằng khoá nội bộ
// suy từ AUTH_SECRET chung 6 bộ — không cần cookie người dùng.
// Không chặn người dùng: chạy nền, lỗi chỉ ghi log + trả về để màn hình hiện.
// ============================================================
import crypto from "node:crypto";

import { layKhoaAuth } from "@/lib/khoa-auth";
import { goiCoGhi } from "@/lib/nhat-ky/so";
import type { BenDuocHoi } from "@/lib/nhat-ky/model";
import { headerChuoi } from "@/lib/nhat-ky/chuoi";

export const AGENT_DICH: { ma: string; ten: string; env: string; macDinh: string; benSo: BenDuocHoi }[] = [
  { ma: "tiendo", ten: "Agent tiến độ", env: "DIA_CHI_TIENDO", macDinh: "http://localhost:3003", benSo: "tiendo" },
  // 04/10/2026: mã "base" = agent Công việc (cổng 3004) — nhận /api/mcp/dong-bo-tu-main, kéo lại danh mục dự án
  { ma: "base", ten: "Agent Công việc", env: "DIA_CHI_BASE", macDinh: "http://127.0.0.1:3004", benSo: "base" },
  { ma: "hopdong", ten: "Agent hợp đồng", env: "DIA_CHI_HOPDONG", macDinh: "http://localhost:3012", benSo: "hopdong" },
  { ma: "phaply", ten: "Agent pháp lý", env: "DIA_CHI_PHAPLY", macDinh: "http://localhost:3013", benSo: "phaply" },
  // 19/10/2026: agent Nghiệm thu (cổng 3015) — tài khoản nhà thầu chỉ đi tới đây + Tiến độ (lọc ở cổng kéo, quyen.ts AGENT_CHO_NHA_THAU)
  { ma: "nghiemthu", ten: "Agent nghiệm thu", env: "DIA_CHI_NGHIEMTHU", macDinh: "http://localhost:3015", benSo: "nghiemthu" },
];

export function diaChiAgent(a: (typeof AGENT_DICH)[number]): string {
  const v = (process.env[a.env] ?? "").trim().replace(/\/+$/, "");
  return v !== "" ? v : a.macDinh;
}

/** Khoá nội bộ: cùng công thức ở phía agent (lib/dong-bo-tu-main / route) */
export function khoaNoiBo(): string {
  return crypto.createHash("sha256").update("noi-bo:" + layKhoaAuth()).digest("hex");
}

/**
 * Header khoá nội bộ cho MỌI lượt Main gửi sang agent khác (Mr. Đại chốt 17/10/2026 tối — cổng Tiến độ lọc phần tiền của lượt
 * máy–máy không kèm khoá). Thiếu AUTH_SECRET thì trả rỗng — không làm hỏng lượt hỏi; bên nhận coi như lượt không khoá.
 */
export function headerKhoaNoiBo(): Record<string, string> {
  try {
    return { "x-sci-noi-bo": khoaNoiBo() };
  } catch {
    return {};
  }
}

/** Lời gọi mang khoá nội bộ hợp lệ (header x-sci-noi-bo) — so khớp an toàn thời gian; thiếu khoá máy chủ thì false */
export function coKhoaNoiBo(req: Request): boolean {
  const gui = req.headers.get("x-sci-noi-bo") ?? "";
  if (!gui) return false;
  try {
    const dung = khoaNoiBo();
    return gui.length === dung.length && crypto.timingSafeEqual(Buffer.from(gui), Buffer.from(dung));
  } catch {
    return false;
  }
}

export interface KetQuaDay { ma: string; ten: string; ok: boolean; tomTat: string }

export async function dayChoCacAgent(lyDo: string): Promise<KetQuaDay[]> {
  const kq = await Promise.all(
    AGENT_DICH.map(async (a): Promise<KetQuaDay> =>
      // ⭐ LUẬT 29 (12/09): Main nói chuyện với agent khác cũng phải đi qua SỔ.
      goiCoGhi(
        {
          agentTraLoi: a.benSo,
          congCu: "dong_bo_tu_main",
          thamSo: { ly_do: lyDo },
          lyDoGoi: `Main vừa ghi dữ liệu dùng chung — đẩy sang ${a.ten} để 4 agent thấy ngay`,
          duong: "tay",
        },
        () => dayChoMotAgent(a, lyDo),
        (kq) => ({ traLoiGon: `${kq.ok ? "nhận được" : "KHÔNG nhận"} · ${kq.tomTat}`.slice(0, 200) }),
      ),
    ),
  );
  const hong = kq.filter((k) => !k.ok);
  if (hong.length) console.warn(`[day-sang-agent] ${lyDo}: ${hong.map((k) => `${k.ten}: ${k.tomTat}`).join(" · ")}`);
  return kq;
}

/** ⛔ Gọi thật ra ngoài — CẤM gọi thẳng, đi qua `dayChoCacAgent` để có vết sổ. */
async function dayChoMotAgent(a: (typeof AGENT_DICH)[number], lyDo: string): Promise<KetQuaDay> {
  // đi qua /api/mcp/… vì middleware của agent chừa cụm đó cho lời gọi máy-máy (không cookie)
  const dich = `${diaChiAgent(a)}/api/mcp/dong-bo-tu-main`;
  try {
    const r = await fetch(dich, {
      method: "POST",
      headers: { "content-type": "application/json", "x-sci-noi-bo": khoaNoiBo(), ...headerChuoi() },
      body: JSON.stringify({ ly_do: lyDo, tu: "main" }),
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    const j = (await r.json().catch(() => ({}))) as { ok?: boolean; vet?: { tomTat?: string; loi?: string | null }; loi?: string; message?: string };
    const ok = j.ok === true;
    return { ma: a.ma, ten: a.ten, ok, tomTat: ok ? (j.vet?.tomTat ?? "đã nhận") : (j.vet?.loi ?? j.loi ?? j.message ?? `HTTP ${r.status}`) };
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    return { ma: a.ma, ten: a.ten, ok: false, tomTat: /abort|timeout/i.test(m) ? "không thưa trong 15s (đang tắt?)" : `không nối được (${m})` };
  }
}
