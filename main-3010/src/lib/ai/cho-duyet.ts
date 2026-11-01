// ============================================================
// CÔNG CỤ GHI CHỜ BẤM ✅ LÀM / ❌ BỎ — phần THUẦN, DÙNG CHUNG web + Telegram
// (Mr. Đại chốt 25/09/2026).
//
// Luật một câu: trợ lý gọi công cụ GHI thì KHÔNG chạy ngay — hệ hiện tóm tắt
// việc sắp làm + nút ✅ Làm / ❌ Bỏ (khung chat web hoặc tin Telegram), người
// bấm Làm mới chạy. Cổng quyền đứng TRƯỚC hàng chờ (kiemCongCu) nên Người xem
// không bao giờ thấy nút.
//
// Ngoại lệ có chủ đích (giữ hành vi tốt hơn đã có):
//   · soan_viec_giao trên WEB — bản thân nó chỉ đẻ NHÁP ở màn «Việc của tôi»,
//     người bấm «Giao ngay» mới lên Base. Thêm ✅ Làm là bắt bấm hai lần cho
//     cùng một việc (nếp "bớt cú bấm"). Telegram không có màn nháp → vẫn chờ.
//   · dieu_khien_giao_dien chỉ chờ khi dãy bước có lệnh `ghi: true` trong sổ
//     lệnh; bước chỉ mở trang / lọc / cuộn chạy ngay.
//
// FILE THUẦN (luật 10): không node:fs. Kho đĩa + bộ chạy ở cho-duyet-kho.ts.
// ============================================================

import { TOOL_SPECS } from "@/lib/ai/chat-types";
import { timTheoMoc } from "@/lib/lenh/danh-muc";

export type KenhTroLy = "web" | "telegram";

/** Nút ✅ Làm sống 24 giờ — quá hạn thì nhắn lại yêu cầu */
export const HAN_CHO_DUYET_MS = 24 * 60 * 60 * 1000;

/** Một công cụ GHI đã qua cổng kiểm, đang chờ người bấm ✅ Làm */
export interface CongCuChoDuyet {
  name: string;
  args: Record<string, unknown>;
}

/** Một việc chờ trong kho (data/tro-ly/cho-duyet.json) */
export interface ViecCho {
  id: string;
  kenh: KenhTroLy;
  /** Chỉ kênh Telegram: chat được bấm */
  chatId?: string;
  email: string;
  projectId: string;
  sessionId: string;
  name: string;
  args: Record<string, unknown>;
  /** Câu người dùng nhắn ở lượt đó — cổng chống chèn lệnh xét lại khi chạy */
  cauHoi: string;
  luc: string;
  trangThai: "cho" | "da-lam" | "da-bo";
  messageId?: number;
  ketQua?: string;
}

/** Bản gọn gửi xuống trình duyệt — không lộ args thô */
export interface ViecChoGon {
  id: string;
  name: string;
  moTa: string;
  luc: string;
}

/** Dãy bước dieu_khien_giao_dien có bước nào GHI dữ liệu thật không */
export function coBuocGhi(args: Record<string, unknown>): boolean {
  const buoc = Array.isArray(args.buoc) ? (args.buoc as unknown[]) : [];
  return buoc.some((b) => {
    if (b === null || typeof b !== "object") return false;
    const lenh = (b as Record<string, unknown>).lenh;
    return typeof lenh === "string" && timTheoMoc(lenh.trim())?.ghi === true;
  });
}

/** Công cụ này (với tham số này, trên kênh này) có phải chờ bấm ✅ Làm không */
export function canXacNhan(name: string, args: Record<string, unknown>, kenh: KenhTroLy): boolean {
  const spec = TOOL_SPECS.find((s) => s.name === name);
  if (!spec || spec.writes !== true) return false;
  if (name === "soan_viec_giao" && kenh === "web") return false;
  if (name === "dieu_khien_giao_dien") return coBuocGhi(args);
  return true;
}

function chuoi(v: unknown): string {
  return typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "";
}

/** Câu tiếng Việt tả việc sắp làm — hiện ngay cạnh nút ✅ Làm / ❌ Bỏ */
export function moTaViecCho(name: string, args: Record<string, unknown>): string {
  const ten = chuoi(args.ten);
  const giaoCho = chuoi(args.giaoCho).replace(/^@/, "");
  const han = chuoi(args.han);
  if (name === "tao_viec_base") {
    return (
      `Giao việc sang agent Công việc: «${ten || "(chưa có tên)"}»` +
      (giaoCho ? ` cho ${giaoCho}` : " cho chính bạn") +
      (han ? `, hạn ${han}` : "") +
      (chuoi(args.duAn) ? `, dự án ${chuoi(args.duAn)}` : "")
    );
  }
  if (name === "soan_viec_giao") {
    return (
      `Soạn NHÁP việc «${ten || "(chưa có tên)"}»` +
      (giaoCho ? ` để giao ${giaoCho}` : "") +
      (han ? `, hạn ${han}` : "") +
      " — nháp nằm ở màn Việc của tôi, chưa giao"
    );
  }
  if (name === "dieu_khien_giao_dien") {
    const buoc = Array.isArray(args.buoc) ? (args.buoc as unknown[]) : [];
    const ds = buoc
      .map((b) => {
        if (b === null || typeof b !== "object") return "";
        const o = b as Record<string, unknown>;
        const khai = timTheoMoc(chuoi(o.lenh));
        const ta = chuoi(o.moTa) || khai?.ten || chuoi(o.lenh);
        return khai?.ghi ? `${ta} [GHI]` : ta;
      })
      .filter((x) => x !== "");
    return `Bấm hộ trên màn hình ${ds.length} bước: ${ds.join(" → ").slice(0, 400)}`;
  }
  let thamSo = "";
  try {
    thamSo = JSON.stringify(args);
  } catch {
    thamSo = "";
  }
  return `Chạy "${name}"${thamSo && thamSo !== "{}" ? ` với ${thamSo.slice(0, 300)}` : ""}`;
}

/** Việc chờ → bản gọn cho giao diện */
export function gonViecCho(v: ViecCho): ViecChoGon {
  return { id: v.id, name: v.name, moTa: moTaViecCho(v.name, v.args), luc: v.luc };
}
