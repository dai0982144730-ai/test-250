// Dùng chung hai cột của màn Issue (agent Công việc): cột phải đang hiện gì + vài hàm định dạng. File thuần, client.
// Mr. Đại chốt 03/10/2026: MỌI chỗ bấm ở cột trái mở nội dung ở cột phải — không chuyển trang, tab mới, modal, prompt/confirm/alert.
import type { NguonIssue, SoIssue, TheCanhBao } from "@/lib/cay-viec/issue/model";
import type { CauHinhNguong } from "@/lib/cay-viec/issue/nguong";
import type { QuyenIssue } from "@/lib/cay-viec/issue/quyen";

export type ChonIssue =
  | { loai: "tong" }
  | { loai: "the"; id: string }
  /** Sửa việc soạn sẵn ở khối dưới thẻ — ô giống dấu + ở khu phải (chốt 04/10 tối) */
  | { loai: "sua-giao"; id: string }
  | { loai: "them" }
  | { loai: "nguong"; tab: NguonIssue }
  | { loai: "ket-qua"; tieuDe: string; tin: string; loi?: boolean; ghiChu?: string[] };

export interface DuLieuIssue {
  duAn: { id: string; ten: string; co_cay: boolean };
  so: SoIssue;
  nguong: CauHinhNguong;
  quyen: QuyenIssue;
  homNay: string;
}

/** Gọi POST /api/cay-viec/issue — trả JSON, ném lỗi tiếng Việt (goiApi) */
export type GoiIssue = (payload: Record<string, unknown>) => Promise<{ ok: boolean; thong_diep?: string; so?: SoIssue; id?: string; ma_viec?: string; trung?: string } | null>;

export const ngayVN = (iso?: string | null): string => {
  if (!iso) return "—";
  const [n, t, ng] = iso.slice(0, 10).split("-");
  return ng && t && n ? `${ng}/${t}/${n}` : iso;
};

export const gioPhut = (iso?: string): string => (iso ? new Date(Date.parse(iso) + 7 * 3600e3).toISOString().slice(0, 16).replace("T", " ").split(" ").map((x, i) => (i === 0 ? ngayVN(x) : x)).join(" ") : "—");

/** Đề xuất do LLM viết (nhóm 5, mã DX-n) — luật 19: 🤖 đứng trước. Đề xuất máy (DX-BASE-…) do code dựng. */
export const laChuLlm = (t: Pick<TheCanhBao, "id" | "nguon">): boolean => t.nguon === "ai" && /^DX-\d+$/.test(t.id);

export const nhanMuc = (m: TheCanhBao["mucDo"]) => (m === "red" ? "Nghiêm trọng" : m === "yellow" ? "Cần xem" : "Bình thường");
export const mauMuc = (m: TheCanhBao["mucDo"]) => (m === "red" ? "text-red" : m === "yellow" ? "text-yellow" : "text-green");

/** Lớp nút dùng chung — chữ đọc được trên nền sáng */
export const NUT_VIEN = "rounded-sm border border-border bg-surface px-2.5 py-1 text-[11px] font-semibold text-text-secondary transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50";
export const NUT_NHAN = "rounded-sm border border-accent px-2.5 py-1 text-[11px] font-semibold text-accent transition hover:bg-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-50";
export const NUT_CHINH = "rounded-sm border border-accent bg-accent px-2.5 py-1 text-[11px] font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";
