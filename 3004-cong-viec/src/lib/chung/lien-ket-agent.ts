// ============================================================
// DÃY LINK CÁC AGENT — dưới "Đăng xuất" trong menu tên người (Mr. Đại chốt 04/10/2026)
//
// Nguyên văn: "thêm dưới chữ đăng xuất là gạch ngang các link tới 6 agent với trình tự quan sát,
// …, công việc, tiến độ, hợp đồng, pháp lý, nghiệm thu. agent nào chưa có link thì hiện chưa đưa
// lên hoạt động". Agent Base đã đóng — agent Công việc thay chỗ (trong danh bạ vẫn mang mã "base").
// Agent Main đứng ngay dưới Agent Quan sát (Mr. Đại 04/10 chiều: "Thêm agent main dưới agent quan sát").
// Agent Quan sát không có menu tên người nên không có dãy này.
//
// Địa chỉ lấy từ DANH BẠ AGENT của từng app (không gắn cứng) — lên hosting đổi địa chỉ ở danh bạ là đủ.
// File THUẦN — màn hình và máy chủ cùng import (luật 10). Bản giống hệt ở Main · Tiến độ · Hợp đồng ·
// Pháp lý · Công việc; sửa một nơi thì chép sang nơi kia (luật 7).
// ============================================================

export const DAY_AGENT: readonly { ma: string; ten: string }[] = [
  { ma: "quansat", ten: "Agent Quan sát" },
  { ma: "main", ten: "Agent Main" },
  { ma: "base", ten: "Agent Công việc" },
  { ma: "tiendo", ten: "Agent Tiến độ" },
  { ma: "hopdong", ten: "Agent Hợp đồng" },
  { ma: "phaply", ten: "Agent Pháp lý" },
  { ma: "nghiemthu", ten: "Agent Nghiệm thu" },
];

/** Chữ hiện cạnh agent chưa có địa chỉ (đúng lời Mr. Đại) */
export const CHUA_HOAT_DONG = "chưa đưa lên hoạt động";

/** Chữ hiện cạnh agent đang mở — không phải link */
export const DANG_O_DAY = "đang ở đây";

export interface LienKetAgent {
  ma: string;
  ten: string;
  /** Địa chỉ gốc để trình duyệt mở; null = chưa đưa lên hoạt động */
  diaChi: string | null;
}

const MAY_NOI_BO = /^(127\.0\.0\.1|localhost|0\.0\.0\.0|\[::1\])$/i;

/**
 * Danh bạ ghi địa chỉ máy nội bộ cho lời gọi máy–máy (127.0.0.1:3003). Trang đang mở cũng bằng tên
 * máy nội bộ (localhost:3010) thì đổi theo tên máy của trang — cookie đăng nhập gắn TÊN MÁY chứ không
 * gắn cổng, nên giữ cùng tên máy là sang agent kia không phải đăng nhập lại.
 */
export function diaChiChoTrinhDuyet(diaChi: string, hostTrang: string | null | undefined): string | null {
  let u: URL;
  try {
    u = new URL(diaChi);
  } catch {
    return null;
  }
  const may = (hostTrang ?? "").replace(/:\d+$/, "");
  if (MAY_NOI_BO.test(u.hostname) && MAY_NOI_BO.test(may)) u.hostname = may;
  return u.origin;
}

/** Dựng dãy đúng thứ tự Mr. Đại chốt. `tim(ma)` trả dòng danh bạ của mã đó (không có → undefined). */
export function dungDayAgent(
  tim: (ma: string) => { diaChi?: string | null; dangBat?: boolean } | undefined,
  hostTrang: string | null | undefined
): LienKetAgent[] {
  return DAY_AGENT.map(({ ma, ten }) => {
    const a = tim(ma);
    const diaChi = a && a.dangBat !== false && a.diaChi ? diaChiChoTrinhDuyet(a.diaChi, hostTrang) : null;
    return { ma, ten, diaChi };
  });
}
