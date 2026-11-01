// ============================================================
// kiem-tra/de-xuat-cau-truc.ts — 🤖 AI ĐỀ XUẤT CẤU TRÚC MẪU, phần SERVER (Khai báo mẫu không cần sửa code — Đợt C, 01/10/2026).
// Rút khung file (gan-nhan.ts khungVanBan — cùng cách nhìn file với bước gắn nhãn) → AI → lưới (de-xuat-cau-truc-thuan.ts).
// Bản cập nhật: "phiên bản trước" = cau_truc nếu mẫu đã khai theo nghĩa, chưa thì đọc từ chính file mẫu đang dùng
// (đo 01/10: thiếu bước này thì bảng đặc biệt Tiến độ thiết kế của PMC bị đọc như bảng thường — 1/4 việc khớp; có thì 4/4).
// ============================================================
import type { CauTrucMau } from "@/lib/types";
import type { Q } from "@/lib/db";
import { cauTrucTuFileCo, khungVanBan, type KhungVanBan } from "./gan-nhan";
import { dungPromptCauTruc, ghepDeXuat, HE_THONG_CAU_TRUC, type KetQuaDeXuat } from "./de-xuat-cau-truc-thuan";
import { layMau } from "./kiem-tra";
import { docTepMau } from "./quan-ly-mau";

export { dungPromptCauTruc, ghepDeXuat, HE_THONG_CAU_TRUC } from "./de-xuat-cau-truc-thuan";
export type { HangDuyet, KetQuaDeXuat } from "./de-xuat-cau-truc-thuan";

/** "Phiên bản trước" của một mẫu: cau_truc nếu đã khai theo nghĩa, chưa thì đọc từ chính file mẫu đang dùng. Mẫu mới tinh → null. */
export async function cauTrucTruoc(q: Q, ma: string): Promise<CauTrucMau | null> {
  const m = await layMau(q, ma);
  if (!m) return null;
  if (m.dinh_nghia.cau_truc) return m.dinh_nghia.cau_truc;
  const tep = await docTepMau(q, ma).catch(() => null);
  return tep ? cauTrucTuFileCo(tep.noi_dung, m.dinh_nghia) : null;
}

/** Chạy đủ: rút khung → AI → ghép + soát. `goiAi(prompt, system)` → chữ (tiêm vào để test không gọi AI thật). */
export async function deXuatCauTruc(
  buf: Buffer,
  goiAi: (prompt: string, system: string) => Promise<string>,
  cu?: CauTrucMau | null,
): Promise<KetQuaDeXuat & { ai: unknown; khung: KhungVanBan }> {
  const khung = await khungVanBan(buf);
  if (!khung.chuong.length) throw new Error('Không thấy chương nào trong file — tiêu đề chương phải in đậm và đánh số "I. …", "II. …" (hoặc dùng kiểu Heading)');
  const text = await goiAi(dungPromptCauTruc(khung, cu), HE_THONG_CAU_TRUC);
  const { layJson } = await import("./gop-y-ai");
  let ai: unknown;
  try {
    ai = layJson(text);
  } catch {
    throw new Error("🤖 AI trả lời không đúng khuôn — bấm đọc lại, hoặc tự chọn nghĩa từng dòng");
  }
  return { ...ghepDeXuat(ai, khung, cu), ai, khung };
}
