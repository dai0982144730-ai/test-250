// ============================================================
// ai/moi-truong-ai.ts — CHỖ RIÊNG CỦA TỪNG AGENT trong bộ "Quản lý token AI" (Mr. Đại chốt 04/10/2026, Đợt 2 nhân bản từ
// agent Công việc). CHỈ SERVER.
//
// Bộ tệp lib/ai/{tai-khoan-claude, so-dung-ai, thong-ke-ai, dang-nhap-link, uu-tien, loi-cli}.ts GIỐNG HỆT nhau ở Main ·
// Tiến độ · Hợp đồng — sửa một bản thì chép nguyên sang hai bản kia. Thứ khác nhau giữa các agent chỉ nằm ở tệp này
// (thư mục đăng nhập riêng, tên người) và ten-tinh-nang-ai.ts (tên tiếng Việt của tính năng gọi AI).
// ============================================================
import { AsyncLocalStorage } from "node:async_hooks";
import os from "node:os";
import path from "node:path";
import { thuMucDuLieu } from "@/lib/chung/thu-muc-du-lieu";
import { getUserByEmail } from "@/lib/users";

/**
 * Thư mục riêng của agent này trong thư mục người dùng máy chủ — mỗi agent đăng nhập Claude riêng (tài khoản khai tại từng
 * agent). Nằm NGOÀI data/ để thông tin đăng nhập không theo bản sao lưu / đóng gói đi nơi khác; toàn chữ không dấu (cửa sổ cmd
 * đọc sai đường dẫn có dấu "SCI Tiến độ").
 */
const THU_MUC_AGENT = ".sci-main";

/** Đường dẫn một tệp sổ AI trong thư mục dữ liệu (test tự trỏ sang bản sao) */
export function tepAi(ten: string): string {
  return path.join(thuMucDuLieu(), ten);
}

/** Gốc các thư mục đăng nhập Claude (tk1 · tk2 · ca-nhan/…). Test → nằm trong bản sao dữ liệu tạm. */
export function gocTaiKhoanClaude(): string {
  return process.env.VITEST ? path.join(thuMucDuLieu(), "claude-tk") : path.join(os.homedir(), THU_MUC_AGENT, "claude-tk");
}

/** Tên người cho bảng "ai dùng nhiều nhất" (luật 30: không để mã trần) — không có thì undefined */
export function tenNguoiAi(email: string): string | undefined {
  try {
    return getUserByEmail(email)?.name || undefined;
  } catch {
    return undefined;
  }
}

// ── NGƯỜI ĐANG HỎI ───────────────────────────────────────────────
// Lượt AI biết "ai đang chờ câu trả lời" để: ① ghi sổ dùng AI đúng người ② khi hết cả tài khoản công ty thì chạy bằng tài khoản
// Claude cá nhân của CHÍNH người đó. Route có người bấm bọc lời gọi bằng chayVoiNguoiGoiAi; ngoài đó = việc nền (không bao giờ
// dùng tài khoản cá nhân).
// Cờ `song`: bộ hẹn giờ nền khởi động lười từ trong một yêu cầu sẽ KẾ THỪA ngữ cảnh của yêu cầu đó — yêu cầu xong thì tắt cờ, để
// việc nền chạy sau không mượn tên (và tài khoản cá nhân) của người tình cờ bấm lúc bật bộ hẹn giờ.

interface NguoiGoi {
  email: string;
  song: boolean;
}
type G = typeof globalThis & { __sciNguoiGoiAi?: AsyncLocalStorage<NguoiGoi> };
const kho: AsyncLocalStorage<NguoiGoi> = ((globalThis as G).__sciNguoiGoiAi ??= new AsyncLocalStorage<NguoiGoi>());

/** Chạy fn với "người đang hỏi" = email — mọi lượt AI bên trong biết người đó (không phải truyền tham số qua từng hàm) */
export async function chayVoiNguoiGoiAi<T>(email: string, fn: () => Promise<T>): Promise<T> {
  const nc: NguoiGoi = { email: String(email ?? "").trim().toLowerCase(), song: true };
  try {
    return await kho.run(nc, fn);
  } finally {
    nc.song = false;
  }
}

/** Email người đang hỏi; null = việc nền máy tự chạy */
export function nguoiGoiAi(): string | null {
  const nc = kho.getStore();
  return nc && nc.song && nc.email ? nc.email : null;
}
