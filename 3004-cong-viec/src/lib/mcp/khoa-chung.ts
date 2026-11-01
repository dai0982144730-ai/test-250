// ============================================================
// KHOÁ CHUNG CỦA 5 BỘ — chỉ dùng ở cổng /api/mcp/base và cửa danh bạ (04/10/2026)
//
// Agent Công việc ký phiên của chính nó bằng AUTH_SECRET RIÊNG (cookie sci_congviec_session). Từ 04/10 nó nhận vai
// agent Base (giữ mã "base" và đường /api/mcp/base) nên phải hiểu hai thứ ký bằng KHOÁ CHUNG của Main · Tiến độ ·
// Hợp đồng · Pháp lý · Quan sát:
//   · đầu thư `x-sci-noi-bo` = sha256 hex("noi-bo:" + khoá chung) — Agent quan sát, Main, bài đo nội bộ gửi kèm;
//   · cookie `sci_session` (SSO P1) = base64url(JSON {email, role, name, exp}) + "." + base64url(HMAC-SHA256) — agent
//     Tiến độ chuyển tiếp cookie của người đang dùng khi kéo danh bạ (GET /api/viec/danh-ba).
// Khoá đọc từ biến AUTH_SECRET_CHUNG (.env.local, git chặn). Thiếu biến → coi như KHÔNG có khoá: đầu thư nội bộ và
// cookie chung đều bị từ chối, cổng vẫn chạy (luật ma trận vẫn cho các agent hệ gọi).
// 17/10/2026: thêm chiều GỬI — mọi lượt máy–máy agent Công việc gửi sang agent khác kèm `dauThuNoiBo()` (cổng Tiến độ bỏ
// phần tiền của lượt máy–máy thiếu khoá — kiểm độc lập lần 7 🔴3). Bên nhận và bên gửi dùng CHUNG `giaTriKhoaNoiBo()`.
// CHỈ SERVER (node:crypto).
// ============================================================
import crypto from "node:crypto";

/** Khoá chung, null = chưa khai AUTH_SECRET_CHUNG */
export function khoaChung(): string | null {
  const k = (process.env.AUTH_SECRET_CHUNG ?? "").trim();
  return k.length >= 16 ? k : null;
}

/** Tên đầu thư khoá nội bộ */
export const DAU_THU_NOI_BO = "x-sci-noi-bo";

/**
 * Giá trị đầu thư `x-sci-noi-bo` = sha256 hex("noi-bo:" + khoá chung) — MỘT công thức cho cả bên nhận (`coKhoaNoiBo`)
 * lẫn bên gửi (`dauThuNoiBo`); cùng công thức Main · Tiến độ · Hợp đồng · Pháp lý. null = chưa khai khoá chung.
 */
export function giaTriKhoaNoiBo(): string | null {
  const k = khoaChung();
  return k ? crypto.createHash("sha256").update("noi-bo:" + k).digest("hex") : null;
}

/**
 * Đầu thư gắn vào MỌI lượt máy–máy gửi sang agent khác (hỏi Tiến độ · hỏi trùng · kéo ma trận · kéo dự án từ Main).
 * Chưa khai khoá chung → {} — lượt vẫn đi, bên kia coi như lượt không có khoá.
 */
export function dauThuNoiBo(): Record<string, string> {
  const v = giaTriKhoaNoiBo();
  return v ? { [DAU_THU_NOI_BO]: v } : {};
}

function bangNhau(a: string, b: string): boolean {
  return a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/** Đầu thư `x-sci-noi-bo` hợp lệ không */
export function coKhoaNoiBo(req: { headers: Headers }): boolean {
  const gui = req.headers.get(DAU_THU_NOI_BO);
  const dung = giaTriKhoaNoiBo();
  if (!gui || !dung) return false;
  try {
    return bangNhau(gui, dung);
  } catch {
    return false;
  }
}

export interface PhienChung {
  email: string;
  name: string;
  role: string;
}

/** Đọc cookie `sci_session` của 5 bộ. Sai chữ ký / hỏng / hết hạn / chưa có khoá → null */
export function kiemPhienChung(token: string | undefined | null): PhienChung | null {
  const k = khoaChung();
  if (!token || !k) return null;
  const [p, s] = token.split(".");
  if (!p || !s || token.split(".").length !== 2) return null;
  try {
    const tai = Buffer.from(p, "base64url");
    const dung = crypto.createHmac("sha256", k).update(tai).digest("base64url");
    if (!bangNhau(s, dung)) return null;
    const j = JSON.parse(tai.toString("utf8")) as { email?: unknown; name?: unknown; role?: unknown; exp?: unknown };
    if (typeof j.email !== "string" || typeof j.exp !== "number" || j.exp < Date.now()) return null;
    return { email: j.email.toLowerCase(), name: typeof j.name === "string" ? j.name : j.email, role: typeof j.role === "string" ? j.role : "" };
  } catch {
    return null;
  }
}
