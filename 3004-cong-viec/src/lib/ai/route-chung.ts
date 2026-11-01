// route-chung.ts — tiện ích nhỏ dùng chung cho API của module AI (server-only).
import { coQuyen } from "@sci/identity";
import { LoiHttp } from "@/lib/phien";
import { tx } from "@/lib/db";
import { ghiLichSu } from "@/lib/lich-su/ghi";
import type { NguoiDungPhien, Quyen } from "@/lib/types";

/** Đọc body JSON object; hỏng → LoiHttp 400 */
export async function docJson(req: Request, batBuoc = true): Promise<Record<string, unknown>> {
  try {
    const v: unknown = await req.json();
    if (v === null || typeof v !== "object" || Array.isArray(v)) throw new Error("x");
    return v as Record<string, unknown>;
  } catch {
    if (!batBuoc) return {};
    throw new LoiHttp(400, "Nội dung gửi lên phải là JSON.");
  }
}

/** Bắt buộc có quyền (ở phạm vi nào đó) — không có → 403 */
export function batBuocQuyen(nd: NguoiDungPhien, quyen: Quyen, thongBao: string): void {
  if (!coQuyen(nd, quyen)) throw new LoiHttp(403, thongBao);
}

/**
 * Ghi lịch sử MỘT lần đổi kết nối AI (sua_cau_hinh, đối tượng cau_hinh/ai_ket_noi).
 * Chỉ ghi TÊN trường và thao tác — không bao giờ ghi giá trị khóa API (người gọi tự lọc,
 * ở đây chặn thêm một lớp: bỏ mọi trường tên có "khoa"/"key"/"token" mang giá trị chuỗi).
 */
export async function ghiDoiKetNoi(nd: NguoiDungPhien, chiTiet: Record<string, unknown>): Promise<void> {
  const sach: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(chiTiet)) {
    if (/khoa|key|token|secret|mat_khau/i.test(k) && typeof v === "string") continue;
    sach[k] = v;
  }
  await tx((q) =>
    ghiLichSu(q, {
      nguoi: nd.id,
      doi_tuong_loai: "cau_hinh",
      doi_tuong_id: "ai_ket_noi",
      hanh_dong: "sua_cau_hinh",
      don_vi_id: nd.don_vi_id,
      chi_tiet: sach,
    }),
  );
}
