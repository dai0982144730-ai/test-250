// ============================================================
// QUYỀN — MỘT ĐỊNH NGHĨA DUY NHẤT (Mr. Đại chốt 25/09/2026)
//
// FILE THUẦN: không node:fs, không next/headers — client, server, middleware
// edge đều import được (luật 10). Bảng này là nguồn sự thật cho: requireRole
// (route-auth.ts), middleware + menu (auth.ts canAccessPath), mọi nút mờ ở
// giao diện, màn ma trận quyền (UserManagement.tsx). Chỗ khác KHÔNG tự so
// `role === "pm"` nữa — hỏi hàm ở đây (luật 7).
//
//                       │ PM │ Admin │ Người dùng │ Người xem │ Nhà thầu (18/10 — chỉ ở agent Tiến độ, Nghiệm thu)
//  xem  (mọi màn + chat)│ ✓  │  ✓    │     ✓      │    ✓
//  ghi  (ghi/nạp/sửa +  │ ✓  │  ✓    │     ✓      │    ✗
//        MỌI loại duyệt khác: Baseline, tab 🤖, căn cứ, mốc, đơn giá…)
//  caidat (Cài đặt, kể  │ ✓  │  ✓    │     ✗      │    ✗
//        cả kết nối Drive/AI, ma trận gọi, dự án)
//  quanlynguoidung      │ ✗  │  ✓    │     ✗      │    ✗
//  pheduyet (CHỈ ✍ ký   │ ✓  │  ✗    │     ✗      │    ✗
//        phiếu giá thanh toán ở Agent hợp đồng; PM nào cũng ký mọi dự án)
//
// "Giám đốc dự án" KHÔNG còn là điều kiện quyền — chỉ còn là dữ liệu dự án.
//
// Mã kỹ thuật giữ nguyên (pm · admin · engineer · viewer) để không phải đổi
// users.json của 5 agent. Mã cũ `field` (NV hiện trường) đã GỠ: đọc thấy thì
// coi là engineer — lớp chuyển đổi duy nhất là `chuanHoaLoai()` dưới đây.
//
// CHÉP SANG AGENT KHÁC: chép nguyên file, không sửa gì.
// ============================================================

/** Năm loại tài khoản — «nhathau» thêm 18/10/2026 */
export type Role = "pm" | "admin" | "engineer" | "viewer" | "nhathau";

/** Năm cửa quyền — mỗi thao tác trong hệ thuộc đúng MỘT cửa */
export type Cua = "xem" | "ghi" | "caidat" | "quanlynguoidung" | "pheduyet";

export const CAC_LOAI: readonly Role[] = ["pm", "admin", "engineer", "viewer", "nhathau"];
export const CAC_CUA: readonly Cua[] = ["xem", "ghi", "caidat", "quanlynguoidung", "pheduyet"];

/** Tên hiển thị của loại tài khoản */
export const NHAN_LOAI: Record<Role, string> = {
  pm: "PM",
  admin: "Admin",
  engineer: "Người dùng",
  viewer: "Người xem",
  nhathau: "Nhà thầu",
};

/** Tên hiển thị của cửa — cột màn ma trận quyền */
export const NHAN_CUA: Record<Cua, string> = {
  // Mr. Đại chốt 04/10/2026: Người xem KHÔNG dùng trợ lý AI → chat chuyển sang cửa "ghi"
  xem: "Xem",
  ghi: "Ghi · nạp · sửa · duyệt · trợ lý AI",
  caidat: "Cài đặt",
  quanlynguoidung: "Quản lý người dùng",
  pheduyet: "Phê duyệt (✍ ký phiếu giá)",
};

/** Bảng quyền — loại nào qua được cửa nào */
export const MA_TRAN_QUYEN: Record<Cua, readonly Role[]> = {
  xem: ["pm", "admin", "engineer", "viewer", "nhathau"],
  ghi: ["pm", "admin", "engineer"],
  caidat: ["pm", "admin"],
  quanlynguoidung: ["admin"],
  pheduyet: ["pm"],
};

/**
 * ⭐ QUYỀN THEO TỪNG AGENT (Mr. Đại chốt 04/10/2026 tối) — bảng hiện ở Main → Cài đặt → Người dùng, dưới ma trận cửa.
 * Tóm tắt cho người đọc; luật thật nằm ở code từng agent (loai-du-an.ts · route-auth.ts) và CHOT LOI-DUNG-CHUNG 6g.6.13.
 * "Người xem" ở Tiến độ · Hợp đồng · Pháp lý = không thuộc dự án nào theo sơ đồ tổ chức; Main tính theo chức vụ.
 */
export const BANG_QUYEN_THEO_AGENT: readonly { agent: string; nguoiXem: string; nguoiDung: string }[] = [
  { agent: "Main", nguoiXem: "Xem mọi màn · Việc của tôi (giao / nhận / phối hợp); việc AI soạn chỉ xem · không trợ lý AI", nguoiDung: "Trợ lý AI + ghi theo quyền từng màn" },
  { agent: "Tiến độ", nguoiXem: "Xem tiến độ, khối lượng, % mọi dự án + một số tổng sản lượng · KHÔNG thấy giá tiền, hợp đồng · không trợ lý AI, không ghi", nguoiDung: "Dự án mình thuộc: đủ số liệu + trợ lý AI + ghi · nạp · sửa · duyệt. Dự án khác: như Người xem" },
  { agent: "Hợp đồng", nguoiXem: "Không vào được (tài liệu mật)", nguoiDung: "Chỉ thấy dự án mình thuộc: trợ lý AI + ghi · nạp · sửa · duyệt. Dự án khác: không thấy" },
  { agent: "Pháp lý", nguoiXem: "Xem luật Việt Nam · luật Lào · mẫu biểu · hướng dẫn · KHÔNG thấy hồ sơ dự án · không trợ lý AI", nguoiDung: "Thư viện luật: xem. Dự án mình thuộc: trợ lý AI + hồ sơ. Dự án khác: không thấy" },
  { agent: "Quan sát", nguoiXem: "Chỉ xem", nguoiDung: "Chỉ xem" },
  { agent: "Công việc", nguoiXem: "Theo phân quyền riêng của agent Công việc", nguoiDung: "Theo phân quyền riêng của agent Công việc" },
];

/** Câu báo khi bị chặn ở cửa — dùng cho HTTP 403 và chú thích nút mờ */
export const LY_DO_CHAN: Record<Cua, string> = {
  xem: "Cần đăng nhập.",
  ghi: "Người xem chỉ được xem — ghi, nạp, sửa, duyệt cần loại Người dùng trở lên.",
  caidat: "Cài đặt chỉ PM và Admin được làm.",
  quanlynguoidung: "Quản lý người dùng chỉ Admin được làm.",
  pheduyet: "Phê duyệt (✍ ký phiếu giá thanh toán) chỉ PM được làm.",
};

/**
 * Trợ lý AI = cửa "ghi" (Mr. Đại chốt 04/10/2026: "Người xem trong mọi tình huống không được dùng trợ lý chat kẻo tốn
 * tiền công ty" — thay chốt 26/09 "Người xem chat được bằng chữ"). Câu cho HTTP 403 và nút chat mờ.
 */
export const LY_DO_TRO_LY =
  "Người xem không dùng trợ lý AI. Cần loại Người dùng trở lên; nhờ quản trị cấp.";

/**
 * Lớp chuyển đổi DUY NHẤT cho mã loại đọc từ cookie / users.json.
 * `field` (NV hiện trường, đã gỡ 25/09) → engineer. Mã lạ → null.
 */
export function chuanHoaLoai(ma: unknown): Role | null {
  if (ma === "field") return "engineer";
  return typeof ma === "string" && (CAC_LOAI as readonly string[]).includes(ma) ? (ma as Role) : null;
}

/** Loại `role` có qua được `cua` không. role rỗng/lạ → không. */
export function duocQuaCua(role: string | null | undefined, cua: Cua): boolean {
  const r = chuanHoaLoai(role);
  return r !== null && MA_TRAN_QUYEN[cua].includes(r);
}

export const duocXem = (role: string | null | undefined): boolean => duocQuaCua(role, "xem");
export const duocGhi = (role: string | null | undefined): boolean => duocQuaCua(role, "ghi");
export const duocCaiDat = (role: string | null | undefined): boolean => duocQuaCua(role, "caidat");
export const duocQuanLyNguoiDung = (role: string | null | undefined): boolean =>
  duocQuaCua(role, "quanlynguoidung");
export const duocPheDuyet = (role: string | null | undefined): boolean => duocQuaCua(role, "pheduyet");

/**
 * Loại luôn vào được MỌI dự án bất kể danh sách dự án khai cho tài khoản.
 * = người có quyền Cài đặt (PM, Admin): Cài đặt gồm cả quản lý dự án, không
 * thể quản lý dự án mình không nhìn thấy; PM ký mọi dự án.
 */
export const luonMoiDuAn = (role: string | null | undefined): boolean => duocCaiDat(role);

// ===== Trang cần cửa riêng (middleware + menu trái) =====

/** Trang nào cần cửa khác "xem". Không có trong bảng = cửa "xem". */
export const CUA_THEO_TRANG: readonly { tienTo: string; cua: Cua }[] = [
  { tienTo: "/settings", cua: "caidat" },
];

function khopTienTo(duong: string, tienTo: string): boolean {
  return duong === tienTo || duong.startsWith(tienTo + "/");
}

/** Cửa cần có để mở trang `duong` */
export function cuaCuaTrang(duong: string): Cua {
  return CUA_THEO_TRANG.find((d) => khopTienTo(duong, d.tienTo))?.cua ?? "xem";
}

/**
 * Tương thích NGƯỢC cho lời gọi requireRole kiểu cũ (mảng mã loại) — để bộ
 * code chép sang agent khác vẫn đúng bảng mới trước khi kịp đổi từng lời gọi:
 * `[]` hoặc có viewer → xem · có engineer/field → ghi · chỉ pm/admin → caidat.
 * Lời gọi mới khai thẳng tên cửa, đừng dùng mảng.
 */
export function cuaTuDanhSachCu(ds: readonly string[]): Cua {
  if (ds.length === 0 || ds.includes("viewer")) return "xem";
  if (ds.includes("engineer") || ds.includes("field")) return "ghi";
  return "caidat";
}

// ===== TÀI KHOẢN NHÀ THẦU (Mr. Đại chốt 18/10/2026 — PLAN-AGENT-NGHIEM-THU v2.0, Đợt 1b) =====
// Người của nhà thầu chính (NT-) hoặc thầu phụ (TP-), Admin tạo ở Main → Cài đặt → Người dùng, mỗi người MỘT đơn vị.
// Chỉ vào được agent Tiến độ và agent Nghiệm thu; agent khác chặn. Cách chặn: Main KHÔNG gửi tài khoản nhà thầu sang agent
// nào ngoài hai agent này (đo 18/10: Pháp lý đọc mã loại lạ thành Người xem nên không được để nó nhận) + Main tự chặn ở cửa.
// Ở hai agent được vào: chỉ qua cửa «xem» → giống Người xem (không giá tiền, không trợ lý AI, không Cài đặt); phần được ghi
// (lập biên bản của đơn vị mình, nạp BC ngày của đơn vị mình) mở riêng ở từng agent theo đơn vị — không mở cửa «ghi» chung.

/** Mã agent (danh bạ Main) tài khoản nhà thầu được vào */
export const AGENT_CHO_NHA_THAU: readonly string[] = ["tiendo", "nghiemthu"];

export const laNhaThau = (role: string | null | undefined): boolean => role === "nhathau";

/** Loại `role` có được vào agent `maAgent` không — chỉ tài khoản nhà thầu bị giới hạn */
export function duocVaoAgent(role: string | null | undefined, maAgent: string): boolean {
  return !laNhaThau(role) || AGENT_CHO_NHA_THAU.includes(maAgent);
}

export const CAU_CHAN_NHA_THAU = "Tài khoản nhà thầu chỉ dùng agent Tiến độ và agent Nghiệm thu.";
