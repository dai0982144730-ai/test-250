// ============================================================
// QUYỀN GHI TRÊN SỔ ISSUE — MỘT ĐỊNH NGHĨA DUY NHẤT
//
// Chốt BC 04/09 (LOI-DUNG-CHUNG 6e.1), nguyên văn Mr. Đại:
//   "Tất cả các agent đều nhìn thấy issue của các agent còn lại và chỉ thêm
//    sửa xoá issue chính nó."
//
// Hai vế KHÔNG được lẫn:
//   NHÌN — mọi agent đọc được issue của cả 5. Ô lọc trên màn là LỌC MẶC ĐỊNH,
//          không phải giới hạn quyền đọc. Đổi ô lọc là thấy hết.
//   GHI  — thêm/sửa/xoá chỉ với issue do chính agent đó sinh ra.
//
// ⭐ CHẶN Ở TẦNG DỮ LIỆU, KHÔNG PHẢI Ở NÚT BẤM.
// Giao diện có ẩn nút hay không thì đường ghi vẫn phải bị chặn — người ta gọi
// thẳng API được. Vì vậy `so-issue.ts` gọi hàm dưới đây trước MỌI phép ghi.
// Màn hình dùng ĐÚNG hàm này để biết nên làm mờ nút nào, nên hai bên không
// bao giờ nói khác nhau.
//
// Và theo luật cứng của dự án: NÚT BỊ CHẶN THÌ HIỆN MỜ, KHÔNG ẨN — nên hàm
// trả về LÝ DO bằng tiếng Việt để hiện làm tooltip, chứ không trả boolean.
//
// File THUẦN — không đụng node:fs, cả server lẫn màn hình đều import được.
// ============================================================

import { LY_DO_CHAN } from "@/lib/quyen";
import { AGENT_NAY, TEN_AGENT, laNguonMay, type MaAgent, type TheCanhBao } from "./model";

/** Chủ sở hữu một thẻ. Thiếu trường `agent` = dữ liệu cũ, coi là của agent này */
export function chuSoHuu(t: Pick<TheCanhBao, "agent">): MaAgent {
  return t.agent ?? AGENT_NAY;
}

/** Thẻ do agent KHÁC sinh ra hay không */
export function cuaAgentKhac(t: Pick<TheCanhBao, "agent">): boolean {
  return chuSoHuu(t) !== AGENT_NAY;
}

/**
 * VÌ SAO không ghi được vào thẻ này — `null` nghĩa là ghi được.
 *
 * @param choPhepGhi người dùng có qua cửa "ghi" không (quyen.ts: PM/Admin/
 *                   Người dùng = có, Người xem = không). Mặc định `true` để tầng dữ liệu gọi
 *                   được mà không cần biết vai trò — vai trò đã chặn ở API.
 */
export function lyDoChanGhi(
  t: Pick<TheCanhBao, "agent" | "dieuKien">,
  choPhepGhi = true
): string | null {
  if (cuaAgentKhac(t)) {
    const chu = TEN_AGENT[chuSoHuu(t)];
    return `Issue này do ${chu} sinh ra. ${TEN_AGENT[AGENT_NAY]} nhìn thấy nhưng không sửa được — mở bên ${chu} để xử lý.`;
  }
  if (t.dieuKien === "da-dong") {
    return "Issue đã đóng — không ghi thêm được nữa.";
  }
  if (!choPhepGhi) {
    return LY_DO_CHAN.ghi;
  }
  return null;
}

/**
 * VÌ SAO không ĐÓNG được thẻ này — `null` nghĩa là đóng được.
 *
 * Khác `lyDoChanGhi` ở một điều: issue do MÁY sinh (nguồn 1–3) thì chỉ máy
 * đóng được, hết vi phạm là máy tự hạ qua các bậc (PLAN-TONG-THE 8.2c).
 * Người bấm đóng tay là làm sai luật vận hành, không phải thiếu quyền.
 */
export function lyDoChanDong(
  t: Pick<TheCanhBao, "agent" | "dieuKien" | "nguon">,
  choPhepGhi = true
): string | null {
  const chung = lyDoChanGhi(t, choPhepGhi);
  if (chung) return chung;
  if (laNguonMay(t.nguon)) {
    return "Issue do máy sinh thì CHỈ MÁY đóng được — hết vi phạm là máy tự hạ (PLAN-TONG-THE 8.2c).";
  }
  return null;
}
