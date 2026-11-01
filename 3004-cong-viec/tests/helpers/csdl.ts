// Tiện ích test: CSDL RAM mới tinh (đã có lược đồ + dữ liệu gieo) và người dùng mẫu.
import { __moCsdlTestMoi, layQ } from "@/lib/db";
import { napNguoiDung } from "@/lib/phien";
import type { NguoiDungPhien } from "@/lib/types";
import { MAC_DINH } from "@/lib/cau-hinh/mac-dinh";

/** Nền quy tắc của test cũ: việc không ngày được vào sổ cái (luôn mở). */
export const QUY_TAC_DE_TEST = { ...MAC_DINH.quy_tac_de, viec_khong_ngay_luon_mo: true };

export async function csdlMoi(tuyChon: { macDinhGoc?: boolean } = {}) {
  await __moCsdlTestMoi();
  const q = await layQ();
  if (tuyChon.macDinhGoc) return q; // test cài đặt: đúng mặc định của hệ thống
  // Báo cáo mẫu trong mau-word/vi-du có việc không ngày (soạn theo quy tắc cũ "việc không ngày thì luôn mở").
  // Từ 25/09/2026 mặc định là CHẶN việc thiếu ngày kết thúc; test cũ giữ quy tắc cũ (phiên bản 0, không ghi nhật ký),
  // test quy tắc mới tự đặt lại viec_khong_ngay_luon_mo = false (tests/unit/kiem-tra-thieu-han.test.ts).
  await q.query("INSERT INTO docflow.cau_hinh (khoa, gia_tri, phien_ban) VALUES ('quy_tac_de', $1, 0) ON CONFLICT (khoa) DO NOTHING", [
    JSON.stringify(QUY_TAC_DE_TEST),
  ]);
  return q;
}

/** Người dùng mẫu theo email trong NGUOI_DUNG_MAU (src/lib/khoi-tao.ts), vd 'hung.tv@scigroup.vn'. */
export async function nguoi(email: string): Promise<NguoiDungPhien> {
  const nd = await napNguoiDung(await layQ(), email);
  if (!nd) throw new Error("Không có người dùng mẫu " + email);
  return nd;
}
