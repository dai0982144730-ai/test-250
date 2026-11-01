// ============================================================
// LƯU TRỮ PHIÊN CHAT TRỢ LÝ DOCFLOW — mỗi phiên 1 file JSON:
//   data/chat/<người dùng>/<sessionId>.json
// (bản gốc chia theo DỰ ÁN; SCI công việc chia theo NGƯỜI: kết quả công cụ đã lọc
//  theo quyền người hỏi nên phiên không chia sẻ cho người khác)
//
// Nguyên tắc (nhất quán với schedule/store.ts, users.ts):
// - KHÔNG cache module-level: đọc file mỗi lần gọi → "lưu là thấy ngay".
// - File thiếu/hỏng → BỎ QUA (không throw) để 1 phiên hỏng không giết cả
//   danh sách.
// - Sanitize toàn bộ dữ liệu đọc từ đĩa (file có thể do người dùng sửa tay).
// - Giới hạn chống phình dữ liệu: 200 tin/phiên (cắt tin CŨ NHẤT).
//   Số phiên KHÔNG giới hạn, máy KHÔNG tự xoá phiên (Mr. Đại chốt 18/10/2026 — người tự xoá, chốt 08/10):
//   quá 100 phiên thì danh sách phiên hiện dòng nhắc (lib/ai/nhac-xoa-phien.ts).
// CHỈ chạy phía server (node:fs) — không import vào Client Component.
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { thuMucDuLieu } from "@/lib/ai/duong-dan";
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

/** Tên thư mục an toàn từ id người dùng (email) — chặn path traversal */
function thuMucNguoi(owner: string): string {
  const s = owner
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "_")
    .replace(/^\.+/, "")
    .slice(0, 80);
  return s === "" ? "_khach" : s;
}

function chatDir(owner: string): string {
  return thuMucDuLieu("chat", thuMucNguoi(owner));
}

function sessionFilePath(owner: string, id: string): string {
  return path.join(chatDir(owner), `${id}.json`);
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
function sanitizeSession(v: unknown, owner: string, fallbackId: string): ChatSession | null {
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
    // owner trong file có thể sai (copy file) → luôn dùng thư mục thật
    owner: owner,
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
    owner: s.owner,
    createdBy: s.createdBy,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    messageCount: s.messages.length,
  };
}

// ===== Đọc =====

function readSessionFile(owner: string, id: string): ChatSession | null {
  if (!isValidSessionId(id)) return null;
  try {
    const raw = fs.readFileSync(sessionFilePath(owner, id), "utf8");
    return sanitizeSession(JSON.parse(raw) as unknown, owner, id);
  } catch {
    // file chưa có / JSON hỏng → coi như không tồn tại
    return null;
  }
}

/** Toàn bộ phiên của dự án (mới cập nhật trước). File hỏng bị bỏ qua. */
export function listSessions(owner: string): ChatSessionMeta[] {
  const dir = chatDir(owner);
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
    const s = readSessionFile(owner, id);
    if (s) out.push(toMeta(s));
  });
  out.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0));
  return out;
}

/** 1 phiên đầy đủ (kèm tin nhắn); không có/hỏng → null */
export function getSession(owner: string, id: string): ChatSession | null {
  return readSessionFile(owner, id);
}

// ===== Ghi =====

/**
 * Ghi phiên xuống đĩa (tự cắt còn MAX_MESSAGES_PER_SESSION tin gần nhất và
 * cập nhật updatedAt). Lỗi ghi file → throw (caller trả 500).
 */
export function saveSession(session: ChatSession): ChatSession {
  const dir = chatDir(session.owner);
  fs.mkdirSync(dir, { recursive: true });
  const clean: ChatSession = {
    ...session,
    messages: session.messages.slice(-MAX_MESSAGES_PER_SESSION),
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(
    sessionFilePath(clean.owner, clean.id),
    JSON.stringify(clean, null, 2) + "\n",
    "utf8"
  );
  return clean;
}

/** Tạo phiên mới (rỗng) và ghi xuống đĩa ngay — KHÔNG xoá phiên cũ nào (chốt 18/10/2026, xem đầu tệp) */
export function createSession(
  owner: string,
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
    owner: owner,
    createdBy: email,
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
  return saveSession(session);
}

/** Đổi tên phiên; không tìm thấy → null */
export function renameSession(
  owner: string,
  id: string,
  title: string
): ChatSession | null {
  const s = getSession(owner, id);
  if (!s) return null;
  return saveSession({ ...s, title: titleFromMessage(title) });
}

/**
 * Xóa phiên — phiên nằm trong thư mục RIÊNG của người dùng nên chỉ chính chủ
 * thấy và xóa được (bản gốc: chính chủ hoặc PM).
 * Trả { ok:false, error } thay vì throw để route map thẳng sang HTTP.
 */
export function deleteSession(
  owner: string,
  id: string
): { ok: true } | { ok: false; error: string; status: number } {
  const s = getSession(owner, id);
  if (!s) return { ok: false, error: "Không tìm thấy phiên chat.", status: 404 };
  try {
    fs.unlinkSync(sessionFilePath(owner, id));
  } catch {
    // đã bị xóa trước đó → coi như thành công
  }
  return { ok: true };
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
