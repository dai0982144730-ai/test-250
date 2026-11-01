// ============================================================
// KẾT NỐI BASE.VN — MODEL & HỢP ĐỒNG (nguồn sự thật chung)
//
// Mục tiêu: cắm khoá vào Cài đặt là hệ thống kéo được dữ liệu từ Base về.
// Làm SẴN cho cả 5 ứng dụng; ứng dụng nào chưa có khoá thì báo "chưa cấu hình",
// KHÔNG lỗi. Công ty nhập đủ khoá lúc nào là chạy lúc đó.
//
// ĐÃ KIỂM CHỨNG BẰNG API THẬT (14/08/2026, tài khoản SCI):
//   • Mọi endpoint đều POST, body `application/x-www-form-urlencoded`
//   • Tên trường token là `access_token_v2` (KHÔNG phải access_token như tài liệu)
//   • Mỗi khoá chỉ mở ĐÚNG MỘT ứng dụng → phải lưu 5 khoá riêng
//   • project/list mặc định GIẤU dự án riêng tư → luôn gửi include_private=1
//     (78 dự án → 273 dự án khi bật cờ này)
//   • Ngày trong Base là chuỗi dd/mm/YYYY
//   • Base KHÔNG có: quan hệ phụ thuộc (FS/SS/FF/SF + lag), % hoàn thành chi
//     tiết (chỉ status 0/1), mã WBS → mapper tự sinh WBS, deps = [] + cảnh báo
//
// HỢP ĐỒNG API (pm|engineer; ghi cấu hình chỉ pm):
//   GET  /api/base/status              → { ok, apps: BaseAppStatus[] }
//        (thử từng khoá đã lưu, trả trạng thái + số bản ghi đọc thử được)
//   GET  /api/base/projects            → { ok, projects: BaseProjectBrief[] }
//        (danh sách dự án Wework để người dùng chọn; 403 nếu chưa có khoá)
//   POST /api/base/import  body { projectId }  (+?project=<id dự án QLDASCI>)
//        → { ok, projectName, tasks: ScheduleTask[], warnings, mapping }
//        KHÔNG tự lưu — UI xem trước rồi PUT /api/schedule như luồng Excel.
//
// KHOÁ CẤU HÌNH (appconfig, mask ••••abcd khi GET như token AI):
//   baseTokenWework · baseTokenWorkflow · baseTokenRequest · baseTokenHrm
//   · baseTokenAccount
// ============================================================

/** 5 ứng dụng Base hệ thống hỗ trợ */
export type BaseApp = "wework" | "workflow" | "request" | "hrm" | "account";

export interface BaseAppInfo {
  app: BaseApp;
  /** Tên hiển thị cho người dùng */
  label: string;
  /** Khoá cấu hình trong appconfig */
  configKey: string;
  /** Base URL đã kiểm chứng thật */
  apiUrl: string;
  /** Endpoint dùng để KIỂM TRA khoá (đọc, nhẹ) */
  testPath: string;
  /** Tham số kèm theo khi kiểm tra */
  testFields: Record<string, string>;
  /** Tên mảng trong JSON trả về để đếm bản ghi */
  countField: string;
  /** Mô tả dữ liệu lấy được — hiện trong Cài đặt */
  moTa: string;
}

/**
 * Bảng cấu hình 5 ứng dụng. apiUrl/testPath đã gọi thật và xác nhận hoạt động
 * (wework/workflow/request/hrm) — riêng account chưa có khoá để thử, đường dẫn
 * lấy từ tài liệu Postman chính thức.
 */
export const BASE_APPS: BaseAppInfo[] = [
  {
    app: "wework",
    label: "Base Wework — Dự án & công việc",
    configKey: "baseTokenWework",
    apiUrl: "https://wework.base.vn/extapi/v3",
    testPath: "/project/list",
    testFields: { page: "0", items_per_page: "5", include_private: "1" },
    countField: "projects",
    moTa: "Dự án, nhóm việc, công việc, việc con, mốc — nguồn để lập tiến độ.",
  },
  {
    app: "request",
    label: "Base Request — Đề xuất & phê duyệt",
    configKey: "baseTokenRequest",
    apiUrl: "https://request.base.vn/extapi/v1",
    testPath: "/group/list",
    testFields: { page: "0" },
    countField: "groups",
    moTa: "Đề xuất mua sắm/thanh toán và trạng thái duyệt — giải thích nguyên nhân chậm.",
  },
  {
    app: "workflow",
    label: "Base Workflow — Quy trình",
    configKey: "baseTokenWorkflow",
    apiUrl: "https://workflow.base.vn/extapi/v1",
    testPath: "/workflows/get",
    testFields: {},
    countField: "workflows",
    moTa: "Quy trình đang chạy (nghiệm thu, thanh toán). Công ty chưa dùng — hiện rỗng.",
  },
  {
    app: "hrm",
    label: "Base HRM — Nhân sự",
    configKey: "baseTokenHrm",
    apiUrl: "https://hrm.base.vn/extapi/v1",
    testPath: "/employee/list",
    testFields: {},
    countField: "employees",
    moTa: "Hồ sơ nhân sự. Công ty chưa nhập dữ liệu — hiện rỗng.",
  },
  {
    app: "account",
    label: "Base Account — Người dùng & phòng ban",
    configKey: "baseTokenAccount",
    apiUrl: "https://account.base.vn/extapi/v1",
    testPath: "/users",
    testFields: {},
    countField: "users",
    moTa: "Danh sách người dùng, phòng ban — để ghép người phụ trách với nhân sự thật.",
  },
];

/** Trạng thái 1 ứng dụng, trả về cho màn Cài đặt */
export interface BaseAppStatus {
  app: BaseApp;
  label: string;
  moTa: string;
  /** Đã lưu khoá chưa */
  daCauHinh: boolean;
  /** Khoá đã che, vd "••••4lg" */
  khoaMask: string;
  /** Gọi thử thành công không (chỉ khi daCauHinh) */
  ok: boolean;
  /** Số bản ghi đọc thử được (0 = kết nối được nhưng chưa có dữ liệu) */
  soBanGhi: number;
  /** Thông báo tiếng Việt cho người dùng */
  thongBao: string;
}

/** Dự án Base rút gọn cho danh sách chọn */
export interface BaseProjectBrief {
  id: string;
  name: string;
  /** Số việc theo thống kê của Base (nếu có) */
  soViec?: number;
  /** true = dự án riêng tư */
  riengTu?: boolean;
}
