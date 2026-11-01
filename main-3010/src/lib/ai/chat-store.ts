// ============================================================
// LƯU TRỮ PHIÊN CHAT TRỢ LÝ AI — mỗi phiên 1 file JSON:
//   projectDataDir(projectId)/chat/<sessionId>.json
// (dự án gốc "default" → data/chat/, dự án khác → data/projects/<id>/chat/)
//
// Nguyên tắc (nhất quán với users.ts):
// - KHÔNG cache module-level: đọc file mỗi lần gọi → "lưu là thấy ngay".
// - File thiếu/hỏng → BỎ QUA (không throw) để 1 phiên hỏng không giết cả
//   danh sách.
// - Sanitize toàn bộ dữ liệu đọc từ đĩa (file có thể do người dùng sửa tay).
// - LỊCH SỬ THEO TÀI KHOẢN (Mr. Đại chốt 04/10/2026): mỗi người chỉ thấy, mở,
//   hỏi tiếp, đổi tên, xoá phiên CHÍNH MÌNH tạo (createdBy = email đăng nhập) —
//   kể cả PM/Admin cũng không xem phiên người khác. Phiên người khác trả về như
//   KHÔNG CÓ (404), không lộ là có tồn tại. Route chỉ dùng các hàm nhận email;
//   getSession() trần chỉ cho nội bộ (Telegram, kho chờ duyệt) khi đã biết phiên của ai.
// - Giới hạn chống phình dữ liệu: 200 tin/phiên (cắt tin CŨ NHẤT).
//   Số phiên KHÔNG giới hạn, máy KHÔNG tự xoá phiên (Mr. Đại chốt 18/10/2026 — người tự xoá, chốt 08/10):
//   quá 100 phiên thì danh sách phiên hiện dòng nhắc (lib/ai/nhac-xoa-phien.ts).
// CHỈ chạy phía server (node:fs) — không import vào Client Component.
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { projectDataDir } from "@/lib/projects";
import { titleFromMessage } from "@/lib/ai/chat-types";
import type {
  ChatMessage,
  ChatSession,
  ChatSessionMeta,
  ExecutedAction,
} from "@/lib/ai/chat-types";

/** Tối đa tin nhắn giữ lại trong 1 phiên (cắt từ cũ nhất) */
export const MAX_MESSAGES_PER_SESSION = 200;

/** id phiên: "s-<base36 thời gian>-<random 4>" — chặn luôn path traversal */
const SESSION_ID_RE = /^s-[a-z0-9]{1,16}-[a-z0-9]{1,8}$/;

function chatDir(projectId: string): string {
  return path.join(projectDataDir(projectId), "chat");
}

function sessionFilePath(projectId: string, id: string): string {
  return path.join(chatDir(projectId), `${id}.json`);
}

/** Sinh id phiên mới */
export function newSessionId(): string {
  const rand = Math.random().toString(36).slice(2, 6).padEnd(4, "0");
  return `s-${Date.now().toString(36)}-${rand}`;
}

/** Sinh id tin nhắn (không cần chống traversal — chỉ nằm trong file) */
function newMessageId(): string {
  return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/** id hợp lệ? (dùng trước khi ghép đường dẫn file) */
export function isValidSessionId(v: unknown): v is string {
  return typeof v === "string" && SESSION_ID_RE.test(v);
}

// ===== Sanitize dữ liệu đọc từ đĩa =====

function sanitizeActions(v: unknown): ExecutedAction[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: ExecutedAction[] = [];
  v.forEach((item) => {
    if (item === null || typeof item !== "object") return;
    const r = item as Record<string, unknown>;
    if (typeof r.name !== "string" || r.name.trim() === "") return;
    out.push({
      name: r.name,
      args:
        r.args !== null && typeof r.args === "object" && !Array.isArray(r.args)
          ? (r.args as Record<string, unknown>)
          : {},
      ok: r.ok === true,
      summary: typeof r.summary === "string" ? r.summary : "",
    });
  });
  return out.length > 0 ? out : undefined;
}

function sanitizeMessage(v: unknown): ChatMessage | null {
  if (v === null || typeof v !== "object") return null;
  const r = v as Record<string, unknown>;
  if (r.role !== "user" && r.role !== "assistant") return null;
  if (typeof r.content !== "string") return null;
  const actions = sanitizeActions(r.actions);
  return {
    id: typeof r.id === "string" && r.id.trim() !== "" ? r.id : newMessageId(),
    role: r.role,
    content: r.content,
    at: typeof r.at === "string" && r.at.trim() !== "" ? r.at : new Date(0).toISOString(),
    ...(r.role === "assistant" && actions ? { actions } : {}),
  };
}

/** unknown → ChatSession hợp lệ, hoặc null nếu hỏng/thiếu trường bắt buộc */
function sanitizeSession(v: unknown, projectId: string, fallbackId: string): ChatSession | null {
  if (v === null || typeof v !== "object") return null;
  const r = v as Record<string, unknown>;
  const id = isValidSessionId(r.id) ? r.id : fallbackId;
  if (!isValidSessionId(id)) return null;
  const messages: ChatMessage[] = [];
  if (Array.isArray(r.messages)) {
    r.messages.forEach((m) => {
      const msg = sanitizeMessage(m);
      if (msg) messages.push(msg);
    });
  }
  const createdAt =
    typeof r.createdAt === "string" && r.createdAt.trim() !== ""
      ? r.createdAt
      : new Date(0).toISOString();
  return {
    id,
    title:
      typeof r.title === "string" && r.title.trim() !== "" ? r.title.trim() : "Phiên mới",
    // projectId trong file có thể sai (copy file) → luôn dùng thư mục thật
    projectId,
    createdBy: typeof r.createdBy === "string" ? r.createdBy : "",
    createdAt,
    updatedAt:
      typeof r.updatedAt === "string" && r.updatedAt.trim() !== "" ? r.updatedAt : createdAt,
    messages: messages.slice(-MAX_MESSAGES_PER_SESSION),
  };
}

/** ChatSession → bản rút gọn cho danh sách */
export function toMeta(s: ChatSession): ChatSessionMeta {
  return {
    id: s.id,
    title: s.title,
    projectId: s.projectId,
    createdBy: s.createdBy,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    messageCount: s.messages.length,
  };
}

// ===== Đọc =====

function readSessionFile(projectId: string, id: string): ChatSession | null {
  if (!isValidSessionId(id)) return null;
  try {
    const raw = fs.readFileSync(sessionFilePath(projectId, id), "utf8");
    return sanitizeSession(JSON.parse(raw) as unknown, projectId, id);
  } catch {
    // file chưa có / JSON hỏng → coi như không tồn tại
    return null;
  }
}

/** Cùng một tài khoản? Email không phân biệt hoa thường; email rỗng không khớp ai. */
function cungNguoi(createdBy: string, email: string): boolean {
  const e = email.trim().toLowerCase();
  return e !== "" && createdBy.trim().toLowerCase() === e;
}

/** Mọi phiên trong thư mục dự án (mới cập nhật trước). File hỏng bị bỏ qua. */
function listTatCa(projectId: string): ChatSessionMeta[] {
  const dir = chatDir(projectId);
  let files: string[] = [];
  try {
    if (!fs.existsSync(dir)) return [];
    files = fs.readdirSync(dir).filter((f) => /\.json$/i.test(f));
  } catch {
    return [];
  }
  const out: ChatSessionMeta[] = [];
  files.forEach((f) => {
    const id = f.replace(/\.json$/i, "");
    const s = readSessionFile(projectId, id);
    if (s) out.push(toMeta(s));
  });
  out.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0));
  return out;
}

/** Phiên của MỘT người trong dự án (mới cập nhật trước) — người khác không thấy, kể cả PM/Admin. */
export function listSessions(projectId: string, email: string): ChatSessionMeta[] {
  return listTatCa(projectId).filter((m) => cungNguoi(m.createdBy, email));
}

/**
 * 1 phiên đầy đủ, KHÔNG xét chủ — chỉ dùng nội bộ (Telegram, kho chờ duyệt) khi
 * đã biết chắc phiên của ai. Route phải dùng getSessionCuaNguoi.
 */
export function getSession(projectId: string, id: string): ChatSession | null {
  return readSessionFile(projectId, id);
}

/** 1 phiên của CHÍNH người hỏi; phiên người khác → null như không có (route trả 404) */
export function getSessionCuaNguoi(
  projectId: string,
  id: string,
  email: string
): ChatSession | null {
  const s = readSessionFile(projectId, id);
  return s && cungNguoi(s.createdBy, email) ? s : null;
}

// ===== Ghi =====

/**
 * Ghi phiên xuống đĩa (tự cắt còn MAX_MESSAGES_PER_SESSION tin gần nhất và
 * cập nhật updatedAt). Lỗi ghi file → throw (caller trả 500).
 */
export function saveSession(session: ChatSession): ChatSession {
  const dir = chatDir(session.projectId);
  fs.mkdirSync(dir, { recursive: true });
  const clean: ChatSession = {
    ...session,
    messages: session.messages.slice(-MAX_MESSAGES_PER_SESSION),
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(
    sessionFilePath(clean.projectId, clean.id),
    JSON.stringify(clean, null, 2) + "\n",
    "utf8"
  );
  return clean;
}

/** Tạo phiên mới (rỗng) và ghi xuống đĩa ngay — KHÔNG xoá phiên cũ nào (chốt 18/10/2026, xem đầu tệp) */
export function createSession(
  projectId: string,
  email: string,
  title?: string
): ChatSession {
  const now = new Date().toISOString();
  const session: ChatSession = {
    id: newSessionId(),
    title:
      typeof title === "string" && title.trim() !== ""
        ? titleFromMessage(title)
        : "Phiên mới",
    projectId,
    createdBy: email,
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
  return saveSession(session);
}

/** Đổi tên phiên của CHÍNH người này; không có hoặc của người khác → null */
export function renameSession(
  projectId: string,
  id: string,
  title: string,
  email: string
): ChatSession | null {
  const s = getSessionCuaNguoi(projectId, id, email);
  if (!s) return null;
  return saveSession({ ...s, title: titleFromMessage(title) });
}

/**
 * Xóa phiên — chỉ CHÍNH CHỦ (chốt 04/10: PM/Admin cũng không xoá phiên người khác,
 * vì không nhìn thấy). Trả { ok:false, error } thay vì throw để route map thẳng sang HTTP.
 */
export function deleteSession(
  projectId: string,
  id: string,
  email: string
): { ok: true } | { ok: false; error: string; status: number } {
  const s = getSessionCuaNguoi(projectId, id, email);
  if (!s) return { ok: false, error: "Không tìm thấy phiên chat.", status: 404 };
  try {
    fs.unlinkSync(sessionFilePath(projectId, id));
  } catch {
    // đã bị xóa trước đó → coi như thành công
  }
  return { ok: true };
}

/**
 * Đổi chủ phiên theo bảng "email cũ → email mới" (đổi email tài khoản — Mr. Đại chốt 04/10/2026; bí danh Main giao).
 * Quét mọi thư mục chat (dự án gốc + từng dự án), chỉ ghi lại tệp có `createdBy` nằm trong bảng; giữ nguyên updatedAt.
 * Chạy lại nhiều lần không sao (đã đổi thì không còn khớp). Trả số phiên đã đổi chủ.
 */
export function doiChuPhienChat(bang: Record<string, string>): number {
  const map = new Map(Object.entries(bang).map(([cu, moi]) => [cu.trim().toLowerCase(), moi.trim().toLowerCase()]));
  if (map.size === 0) return 0;
  const goc = projectDataDir("default");
  const cacThuMuc = [path.join(goc, "chat")];
  try {
    for (const d of fs.readdirSync(path.join(goc, "projects"))) cacThuMuc.push(path.join(goc, "projects", d, "chat"));
  } catch {
    /* chưa có dự án */
  }
  let dem = 0;
  for (const dir of cacThuMuc) {
    let tep: string[] = [];
    try {
      tep = fs.readdirSync(dir).filter((f) => /^s-.*\.json$/i.test(f));
    } catch {
      continue;
    }
    for (const f of tep) {
      const p = path.join(dir, f);
      try {
        const s = JSON.parse(fs.readFileSync(p, "utf8")) as Record<string, unknown>;
        const moi = typeof s.createdBy === "string" ? map.get(s.createdBy.trim().toLowerCase()) : undefined;
        if (!moi) continue;
        fs.writeFileSync(p, JSON.stringify({ ...s, createdBy: moi }, null, 2) + "\n", "utf8");
        dem++;
      } catch {
        /* tệp hỏng — bỏ qua như listTatCa */
      }
    }
  }
  return dem;
}

/** Thêm 1 tin nhắn vào phiên (tự sinh id + thời điểm) rồi lưu */
export function appendMessage(
  session: ChatSession,
  role: ChatMessage["role"],
  content: string,
  actions?: ExecutedAction[]
): ChatSession {
  const msg: ChatMessage = {
    id: newMessageId(),
    role,
    content,
    at: new Date().toISOString(),
    ...(role === "assistant" && actions && actions.length > 0 ? { actions } : {}),
  };
  return { ...session, messages: [...session.messages, msg] };
}
