// ============================================================
// BỘ CÔNG CỤ CỦA TRỢ LÝ MAIN — thực thi các công cụ khai trong TOOL_SPECS
// (src/lib/ai/chat-types.ts). Mô hình chỉ được trả TÊN + ARGS; việc đọc/ghi
// thật xảy ra ở đây.
//
// ⛔ MR. ĐẠI CHỐT 24/09: Main CHỈ ÁNH XẠ số của agent tiến độ qua cổng, không
//    tự tính cùng một vấn đề ("khi sửa phải rà soát 2 nơi thay vì 1"). Trước
//    ngày này file này là bản chép trợ lý kỹ sư tiến độ: 35 công cụ đọc thẳng
//    schedule.json / BC ngày CHÉP về Main rồi tự chạy CPM, năng suất, COD.
//    Nay:
//      · công cụ ĐỌC số tiến độ = MỘT lời gọi hoiAgent("tiendo", "tiendo.<tên>")
//        qua cổng thật (danh bạ → 3003), có ghi sổ nhật ký (luật 29);
//      · công cụ GHI tiến độ (ghi %, baseline, nạp báo cáo, chạy phân tích,
//        viết nháp BC tuần…) KHÔNG còn ở Main — gọi tên cũ thì trả câu "việc
//        này làm ở Agent tiến độ: localhost:3003/…" (trợ lý Main là lễ tân,
//        lộ trình 13/09).
//
// NGUYÊN TẮC:
// - KHÔNG BAO GIỜ throw: mọi lỗi đều trả { ok:false, summary: "câu tiếng Việt" }.
// - Kiểm quyền theo CỬA của công cụ (ToolSpec.cua × ma trận quyen.ts) TRƯỚC khi chạy.
// - Công cụ điều hướng KHÔNG tự làm gì trên server, chỉ trả uiAction cho client.
// CHỈ chạy phía server — không import vào Client Component.
// ============================================================

import { ALLOWED_TAB_PATHS, TOOL_SPECS, type ToolSpec, type UiAction } from "@/lib/ai/chat-types";
import { timVaDocWeb } from "@/lib/web/tim-web";
import { tenNha, xepKetQua } from "@/lib/web/tim-web-chung";
import { canAccessProjectByEmail, getProject, listProjects, timDuAn } from "@/lib/projects";
import { getUserByEmail } from "@/lib/users";
import { dsNguoiNhanCV, giaoSangCongViec, hanIso, homNayIso, layViecCuaToiCV } from "@/lib/chung/viec-cong-viec";
import type { ViecCV } from "@/lib/chung/viec-cong-viec-kieu";
import { DANH_MUC_LENH, timTheoMoc } from "@/lib/lenh/danh-muc";
import { TRAN_BUOC, bangNhau, type BuocGiaoDien } from "@/lib/lenh/mo-hinh";
import { ghiNhapCoHoiTrung, hoiTrungCauNoi } from "@/lib/chung/viec-ai-soan";
import { tomTatHoiTrung } from "@/lib/chung/hoi-trung-kieu";
import { hoiAgent, noiGoi } from "@/lib/nguon/hoi-agent";
import type { NguonMcp } from "@/lib/mcp/khuon";
import { LY_DO_CHAN, NHAN_LOAI, duocCaiDat, duocQuaCua, type Role } from "@/lib/quyen";
import { docSoMay } from "@/lib/chung/doc-so";
import { boLocMatCuaNguoi } from "@/lib/agent-mat-tren-main";
import { cauAnMat, laAgentMat } from "@/lib/agent-mat-loc";
import { gioVn } from "@/lib/gio-vn";
import { CONG_CU_CO_KHUON, apDungKhuon } from "@/lib/ai/khuon-danh-sach-thuan";
import { docCaiDatKhuon } from "@/lib/ai/khuon-danh-sach-cai-dat";

export interface ToolContext {
  /** Trang đang mở — bảng lệnh của trang này đã nằm sẵn trong system prompt */
  trangDangMo?: string;
  projectId: string;
  email: string;
  /** Bậc sổ lệnh trợ lý: PM/Admin = "pm", còn lại "engineer" (giữ cho sổ lệnh cũ) */
  role: "pm" | "engineer";
  /**
   * LOẠI TÀI KHOẢN THẬT (pm · admin · engineer · viewer) — cổng kiemCongCu hỏi
   * ma trận quyen.ts bằng loại này (Admin ≠ PM ở cửa pheduyet). Thiếu (bài
   * test cũ) thì suy từ role + chiXem.
   */
  loai?: Role;
  /**
   * true = tài khoản Người xem (quyen.ts: không qua cửa "ghi") — chat được,
   * nhưng mọi công cụ `writes: true` bị từ chối trước khi chạy.
   */
  chiXem?: boolean;
  /** Tên loại tài khoản để trợ lý xưng đúng (PM · Admin · Người dùng · Người xem) */
  tenLoai?: string;
  /**
   * TIN NHẮN CUỐI của chính người dùng (không phải dữ liệu hệ thống). Dùng để
   * chặn PROMPT INJECTION: công cụ GHI chỉ chạy khi người dùng thật sự yêu cầu.
   * Cũng là "vì sao hỏi" ghi vào sổ khi đi hỏi agent tiến độ.
   */
  userMessage?: string;
  /** Người dùng có BẬT nút 🌐 tìm trên internet không (06/09) */
  timWebBat?: boolean;
}

export interface ToolResult {
  ok: boolean;
  /** Câu tiếng Việt hiển thị cho người dùng + đưa lại cho mô hình đọc */
  summary: string;
  /** Dữ liệu chi tiết đưa lại cho mô hình (KHÔNG hiện thẳng cho người dùng) */
  data?: unknown;
  /** Việc client phải làm sau khi nhận trả lời */
  uiAction?: UiAction;
}

// ===== Tiện ích đọc tham số (mô hình hay trả số dạng chuỗi) =====

function argStr(args: Record<string, unknown>, key: string): string {
  const v = args[key];
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return "";
}

/** true / "true" — cờ do mô hình gửi */
function argBool(args: Record<string, unknown>, key: string): boolean {
  const v = args[key];
  return v === true || (typeof v === "string" && v.trim().toLowerCase() === "true");
}

function argNum(args: Record<string, unknown>, key: string): number | null {
  const v = args[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = docSoMay(v.replace(/%/g, "")); // chữ AI viết: cú pháp số của máy, không thì chuẩn số Việt Nam (lib/chung/doc-so, chốt 130)
    if (n !== null) return n;
  }
  return null;
}

/** Bỏ dấu tiếng Việt + hạ chữ thường để so khớp từ khóa "dễ tính" */
function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();
}

// ===================================================================
// ĐI HỎI AGENT TIẾN ĐỘ — cổng thật, có ghi sổ (luật 29)
// ===================================================================

/**
 * Công cụ trợ lý → công cụ cổng `tiendo.*` + tham số mô hình được phép
 * truyền. `ma_du_an` KHÔNG nằm trong danh sách: luôn lấy dự án đang mở, để
 * mô hình không hỏi nhầm dự án khác.
 */
export const CONG_TIEN_DO: Record<string, { congCu: string; thamSo: string[] }> = {
  tom_tat_du_an: { congCu: "tiendo.tom_tat_du_an", thamSo: [] },
  duong_gang: { congCu: "tiendo.duong_gang", thamSo: [] },
  du_bao: { congCu: "tiendo.du_bao", thamSo: [] },
  lich_su_du_bao: { congCu: "tiendo.lich_su_du_bao", thamSo: ["so_thang"] },
  nang_suat: { congCu: "tiendo.nang_suat", thamSo: ["ma_wbs", "thau_phu"] },
  s_curve: { congCu: "tiendo.s_curve", thamSo: [] },
  so_tuan: { congCu: "tiendo.so_tuan", thamSo: [] },
  tim_dau_viec: { congCu: "tiendo.tim_dau_viec", thamSo: ["tu_khoa", "ma_wbs"] },
  chi_tiet_dau_viec: { congCu: "tiendo.chi_tiet_dau_viec", thamSo: ["ma_wbs"] },
  // ⭐ 26/09 (Mr. Đại chốt): "nếu … thì COD …" do CODE agent tiến độ tính (tiến độ 80245bf)
  gia_dinh_cod: { congCu: "tiendo.gia_dinh_cod", thamSo: ["thay_doi"] },
  khoi_luong_hang_muc: {
    congCu: "tiendo.khoi_luong_hang_muc",
    thamSo: ["thau_phu", "ma_wbs", "tu_ngay", "den_ngay"],
  },
  nguon_luc_huy_dong: {
    congCu: "tiendo.nguon_luc_huy_dong",
    thamSo: ["thau_phu", "tu_ngay", "den_ngay"],
  },
  thau_phu: { congCu: "tiendo.thau_phu", thamSo: ["ma_thau_phu", "ma_wbs"] },
  soat_quy_tac: { congCu: "tiendo.soat_quy_tac", thamSo: [] },
  // 26/10/2026 (Mr. Đại: Main trả «chưa có công cụ» khi hỏi khối lượng BOQ đường dây 110kV và hồ sơ thiết kế sắp cần)
  boq_theo_hang_muc: { congCu: "tiendo.boq_theo_hang_muc", thamSo: ["hang_muc", "tu_khoa", "vi_tri"] },
  bao_cao_ngay_boq: { congCu: "tiendo.bao_cao_ngay_boq", thamSo: ["ma_boq", "tu_ngay", "vi_tri"] },
  hop_dong_nha_thau: { congCu: "tiendo.hop_dong_nha_thau", thamSo: ["ma_hop_dong", "ma_nha_thau", "ma_boq", "tu"] },
  ho_so_thiet_ke: { congCu: "tiendo.ho_so_thiet_ke", thamSo: ["ca_da_co", "gioi_han"] },
  // ⭐ 26/10/2026 đợt 1 (KE-HOACH/31 mục 7): công cụ cổng Tiến độ đã có mà chat chưa nối
  luy_ke_boq: { congCu: "tiendo.luy_ke_boq", thamSo: ["ma_boq", "vi_tri"] },
  san_luong_hop_dong: { congCu: "tiendo.san_luong_hop_dong", thamSo: ["ma_hop_dong"] },
  nhat_ky_thi_cong: { congCu: "tiendo.nhat_ky_thi_cong", thamSo: ["tu_ngay", "den_ngay"] },
  viec_trong_khoang: { congCu: "tiendo.viec_trong_khoang", thamSo: ["tu_ngay", "den_ngay", "gioi_han", "vi_tri"] },
  bang_gantt: { congCu: "tiendo.bang_gantt", thamSo: ["vi_tri"] },
  nha_thau: { congCu: "tiendo.nha_thau", thamSo: ["ten"] },
  danh_sach_issue: { congCu: "tiendo.danh_sach_issue", thamSo: ["chi_dang_mo", "gioi_han"] },
  // ⭐ ĐỢT 3c (KE-HOACH/31, 27/10/2026, Tiến độ `d48a409`)
  bao_cao_tuan: { congCu: "tiendo.bao_cao_tuan", thamSo: ["tuan", "gioi_han"] },
  thoi_tiet: { congCu: "tiendo.thoi_tiet", thamSo: ["tu_ngay", "den_ngay", "tuan", "gioi_han"] },
};

/**
 * ⭐ 25/09 (Mr. Đại chốt phương án b — bỏ màn "Hỏi vắt ngang các ban", dồn vào
 * trợ lý chat): công cụ ĐỌC của ba agent còn lại. Tên công cụ lấy từ
 * `nang_luc()` đo 25/09 (pháp lý 11 · hợp đồng 13 · Base 12 công cụ) — không
 * bịa tên. Khuôn giống CONG_TIEN_DO: MỘT lời hoiAgent có ghi sổ (luật 29);
 * `ma_du_an` do code điền từ dự án (tham số `du_an` hoặc dự án đang mở).
 * `coDuAn: false` = công cụ không nhận dự án (hoặc nhận mã khác thay thế).
 */
export const CONG_AGENT_KHAC: Record<
  string,
  { agent: "phaply" | "hopdong" | "base" | "nghiemthu"; congCu: string; thamSo: string[]; coDuAn: boolean }
> = {
  phaply_ho_so_thieu: { agent: "phaply", congCu: "phaply.ho_so_thieu", thamSo: ["gom_nghi_ngo", "gioi_han"], coDuAn: true },
  phaply_han_chu_truong: { agent: "phaply", congCu: "phaply.han_chu_truong", thamSo: [], coDuAn: true },
  phaply_ho_so_cua_wbs: { agent: "phaply", congCu: "phaply.ho_so_cua_wbs", thamSo: ["ma_wbs", "gioi_han"], coDuAn: true },
  phaply_danh_sach_issue: { agent: "phaply", congCu: "phaply.danh_sach_issue", thamSo: ["ca_da_dong", "gioi_han"], coDuAn: true },
  hopdong_phieu_gia_dang_cho: { agent: "hopdong", congCu: "hopdong.phieu_gia_dang_cho", thamSo: ["gioi_han"], coDuAn: true },
  hopdong_gia_tri_luy_ke: { agent: "hopdong", congCu: "hopdong.gia_tri_luy_ke", thamSo: [], coDuAn: true },
  hopdong_toan_canh: { agent: "hopdong", congCu: "hopdong.toan_canh", thamSo: ["ma_hop_dong"], coDuAn: true },
  // 20/10/2026 (PLAN Nghiệm thu §12 P2 + P3): «đã nghiệm thu chưa» ghép 4 trạng thái ở agent Nghiệm thu — trước hỏi agent Hợp đồng
  nghiemthu_da_nghiem_thu_chua: { agent: "nghiemthu", congCu: "nghiemthu.da_nghiem_thu_chua", thamSo: ["ma_wbs"], coDuAn: true },
  // 25/10/2026 (KE-HOACH/24 đợt 1): sổ Issue của agent Nghiệm thu — khuôn trả giống 4 agent kia
  // 25/10/2026 (KE-HOACH/24 đợt 2–3)
  nghiemthu_so_lieu_sang: { agent: "nghiemthu", congCu: "nghiemthu.so_lieu_sang", thamSo: [], coDuAn: true },
  nghiemthu_ho_so_hoan_thanh: { agent: "nghiemthu", congCu: "nghiemthu.ho_so_hoan_thanh", thamSo: [], coDuAn: true },
  nghiemthu_khoi_luong_da_nghiem_thu: { agent: "nghiemthu", congCu: "nghiemthu.khoi_luong_da_nghiem_thu", thamSo: ["ma_boq", "ma_wbs", "gioi_han"], coDuAn: true },
  nghiemthu_luat_logic: { agent: "nghiemthu", congCu: "nghiemthu.luat_logic", thamSo: ["ma_luat", "ap_cho"], coDuAn: false },
  nghiemthu_danh_sach_issue: { agent: "nghiemthu", congCu: "nghiemthu.danh_sach_issue", thamSo: ["ca_da_dong", "gioi_han"], coDuAn: true },
  hopdong_moc_hop_dong: { agent: "hopdong", congCu: "hopdong.moc_hop_dong", thamSo: ["ma_wbs", "ten_hang_muc"], coDuAn: true },
  hopdong_danh_sach_issue: { agent: "hopdong", congCu: "hopdong.danh_sach_issue", thamSo: ["ca_da_dong", "gioi_han"], coDuAn: true },
  base_viec_qua_han: { agent: "base", congCu: "base.viec_qua_han", thamSo: ["nguoi", "gioi_han"], coDuAn: true },
  // 04/10 tối: bỏ base_quy_trinh_dang_tac — agent Công việc chưa có luồng đề xuất/duyệt (công cụ luôn trả "chưa có dữ liệu")
  base_tai_viec_theo_nguoi: { agent: "base", congCu: "base.tai_viec_theo_nguoi", thamSo: ["nguoi", "gioi_han"], coDuAn: true },
  base_co_viec_cho_ma_khong: { agent: "base", congCu: "base.co_viec_cho_ma_khong", thamSo: ["ma_he_thong"], coDuAn: true },
  base_danh_sach_issue: { agent: "base", congCu: "base.danh_sach_issue", thamSo: ["ca_da_dong", "gioi_han"], coDuAn: true },
  // 26/10/2026 (Mr. Đại): «lịch họp gần nhất tôi cần tham dự» — sổ Phòng họp của agent Công việc; thiếu `nguoi` = chính người đang hỏi
  base_lich_hop: { agent: "base", congCu: "base.lich_hop", thamSo: ["nguoi", "so_ngay"], coDuAn: false },
  // ⭐ 26/10/2026 đợt 1 (KE-HOACH/31 mục 7): công cụ cổng đã có mà chat chưa nối
  hopdong_dieu_khoan: { agent: "hopdong", congCu: "hopdong.dieu_khoan", thamSo: ["ma_hop_dong", "chu_de", "gioi_han"], coDuAn: true },
  hopdong_chi_phi_theo_hop_dong: { agent: "hopdong", congCu: "hopdong.chi_phi_theo_hop_dong", thamSo: ["ma_hop_dong"], coDuAn: true },
  hopdong_phieu_gia_so_san_luong: { agent: "hopdong", congCu: "hopdong.phieu_gia_so_san_luong", thamSo: [], coDuAn: true },
  hopdong_cam_ket_nha_thau: { agent: "hopdong", congCu: "hopdong.cam_ket_nha_thau", thamSo: ["ma_hop_dong"], coDuAn: true },
  hopdong_ket_qua_soat: { agent: "hopdong", congCu: "hopdong.ket_qua_soat", thamSo: ["ma_phieu_gia", "gioi_han"], coDuAn: false },
  hopdong_co_hop_dong_chua: { agent: "hopdong", congCu: "hopdong.co_hop_dong_chua", thamSo: ["ma_wbs"], coDuAn: true },
  phaply_tra_van_ban: { agent: "phaply", congCu: "phaply.tra_van_ban", thamSo: ["so_hieu", "tu_khoa", "gioi_han"], coDuAn: false },
  phaply_can_cu_phap_ly: { agent: "phaply", congCu: "phaply.can_cu_phap_ly", thamSo: ["tu_khoa", "so_hieu", "gioi_han"], coDuAn: false },
  phaply_van_ban_con_hieu_luc: { agent: "phaply", congCu: "phaply.van_ban_con_hieu_luc", thamSo: ["so_hieu"], coDuAn: false },
  // Đợt 3d (27/10, Pháp lý `33ba7b5`): bỏ trống ma_wbs = mọi giấy phép đã có của dự án sắp hết hiệu lực trong `so_ngay`
  phaply_han_giay_phep: { agent: "phaply", congCu: "phaply.han_giay_phep", thamSo: ["ma_wbs", "so_ngay", "gioi_han"], coDuAn: true },
  phaply_doi_ngay_nen_bat_dau: { agent: "phaply", congCu: "phaply.doi_ngay_nen_bat_dau", thamSo: ["tat_ca", "gioi_han"], coDuAn: true },
  // Đợt 3c (27/10, Nghiệm thu `5d03c42`): lịch nhận khoảng ngày; bỏ trống = hôm nay + ngày mai như cũ
  nghiemthu_lich_nghiem_thu: { agent: "nghiemthu", congCu: "nghiemthu.lich_nghiem_thu", thamSo: ["tu_ngay", "den_ngay"], coDuAn: true },
  // ⭐ ĐỢT 3 (KE-HOACH/31, 27/10/2026): công cụ cổng MỚI
  phaply_lich_ho_so: { agent: "phaply", congCu: "phaply.lich_ho_so", thamSo: ["tu_ngay", "den_ngay", "so_ngay", "loc", "gioi_han"], coDuAn: true },
  phaply_khung_thu_tuc: { agent: "phaply", congCu: "phaply.khung_thu_tuc", thamSo: ["loai_du_an", "tu_khoa", "giai_doan", "gioi_han"], coDuAn: true },
  phaply_tong_quan: { agent: "phaply", congCu: "phaply.tong_quan", thamSo: [], coDuAn: true },
  phaply_van_ban_theo_nhom: { agent: "phaply", congCu: "phaply.van_ban_theo_nhom", thamSo: ["nhom", "loai", "tu_khoa", "trang_thai", "gioi_han"], coDuAn: false },
  hopdong_danh_sach_hop_dong: { agent: "hopdong", congCu: "hopdong.danh_sach_hop_dong", thamSo: ["tu_khoa", "gioi_han"], coDuAn: true },
  hopdong_bao_lanh_tam_ung: { agent: "hopdong", congCu: "hopdong.bao_lanh_tam_ung", thamSo: ["ma_hop_dong", "tu_khoa", "phan", "gioi_han"], coDuAn: true },
  hopdong_moc_thanh_toan: { agent: "hopdong", congCu: "hopdong.moc_thanh_toan", thamSo: ["ma_hop_dong", "tu_khoa", "gioi_han"], coDuAn: true },
  hopdong_gia_qua_khu: { agent: "hopdong", congCu: "hopdong.gia_qua_khu", thamSo: ["cong_viec", "vung", "gioi_han"], coDuAn: false },
  hopdong_du_thao_dang_soat: { agent: "hopdong", congCu: "hopdong.du_thao_dang_soat", thamSo: ["gioi_han"], coDuAn: true },
  nghiemthu_danh_sach_phieu: { agent: "nghiemthu", congCu: "nghiemthu.danh_sach_phieu", thamSo: ["trang_thai", "chi_qua_han", "gioi_han"], coDuAn: true },
  nghiemthu_bien_ban: { agent: "nghiemthu", congCu: "nghiemthu.bien_ban", thamSo: ["tu_khoa", "hang_muc", "ma_wbs", "ma_bien_ban", "gioi_han"], coDuAn: true },
  nghiemthu_thi_nghiem: { agent: "nghiemthu", congCu: "nghiemthu.thi_nghiem", thamSo: ["tu_khoa", "loai", "gioi_han"], coDuAn: true },
  nghiemthu_doi_chieu_khoi_luong: { agent: "nghiemthu", congCu: "nghiemthu.doi_chieu_khoi_luong", thamSo: ["hang_muc", "ma_boq", "loc", "gioi_han"], coDuAn: true },
  base_trang_thai_cong_viec: { agent: "base", congCu: "base.trang_thai_cong_viec", thamSo: ["ma_viec_base"], coDuAn: false },
  base_nguoi_phu_trach: { agent: "base", congCu: "base.nguoi_phu_trach", thamSo: ["tu_khoa", "ma_he_thong"], coDuAn: true },
  // Đợt 3a (27/10, 3004 `433f8c6`): bỏ trống mã dự án = mọi dự án người hỏi được xem; lọc thêm theo người / đơn vị
  base_viec_co_han_trong_khoang: { agent: "base", congCu: "base.viec_co_han_trong_khoang", thamSo: ["tu_ngay", "den_ngay", "nguoi", "don_vi"], coDuAn: false },
  base_bao_cao_da_nop: { agent: "base", congCu: "base.bao_cao_da_nop", thamSo: ["tuan", "ngay", "nam", "don_vi", "nguoi"], coDuAn: false },
  base_kien_nghi_can_quyet: { agent: "base", congCu: "base.kien_nghi_can_quyet", thamSo: ["tuan", "ngay", "nam", "don_vi", "gioi_han"], coDuAn: false },
  base_bao_cao_tuan: { agent: "base", congCu: "base.bao_cao_tuan", thamSo: ["tuan", "ngay", "nam", "don_vi"], coDuAn: true },
  base_lich_phong: { agent: "base", congCu: "base.lich_phong", thamSo: ["phong", "ngay", "tu_ngay", "den_ngay", "buoi"], coDuAn: false },
  base_viec_da_xong: { agent: "base", congCu: "base.viec_da_xong", thamSo: ["tu_ngay", "den_ngay", "don_vi", "nguoi", "gioi_han"], coDuAn: false },
  base_thong_bao_cua_toi: { agent: "base", congCu: "base.thong_bao_cua_toi", thamSo: ["gioi_han"], coDuAn: false },
};

/** Tên agent để trả lời người dùng "(nguồn: Agent pháp lý · phaply.ho_so_thieu)" */
export const TEN_AGENT_HOI: Record<string, string> = {
  tiendo: "Agent tiến độ",
  phaply: "Agent pháp lý",
  hopdong: "Agent hợp đồng",
  base: "Agent Công việc",
  nghiemthu: "Agent Nghiệm thu",
};

/** Địa chỉ Agent tiến độ để đưa link cho người dùng — đọc danh bạ, không gắn cứng */
export function diaChiTienDo(): string {
  const n = noiGoi("tiendo");
  const goc = n.diaChi !== "" ? n.diaChi : "http://localhost:3003";
  return goc.replace("127.0.0.1", "localhost").replace(/\/$/, "");
}

/** Gộp nguồn cổng trả thành một dòng người đọc được */
export function nguonGon(ds: NguonMcp[]): string {
  const cai = ds
    .slice(0, 3)
    .map((n) => {
      // Đợt 3 (27/10): bỏ đường dẫn tệp kỹ thuật («data/hop-dong.json», «…/so.json») — AI hay chép vào câu cho người đọc.
      // 30/10 (kiểm phiên «11 Việc chung»): nguồn có lời mô tả sau đường dẫn («data/nha-thau.json — bản sao sổ nhà thầu…») trước lọt qua
      // vì chuỗi không kết thúc bằng «.json» → tách đường dẫn khỏi phần mô tả, bỏ tên tệp, giữ lời mô tả.
      const goc = (n.file_goc ?? "").trim();
      const cat = goc.indexOf(" — ");
      const duongDan = cat >= 0 ? goc.slice(0, cat).trim() : goc;
      const moTa = cat >= 0 ? goc.slice(cat + 3).trim() : "";
      const tepCuoi = duongDan.split(/[\\/]/).slice(-2).join("/");
      const tep = /\.(json|jsonl|ts|tsx|js|db|sqlite)$/i.test(duongDan) ? moTa : [tepCuoi, moTa].filter(Boolean).join(" — ");
      return [n.loai, n.ma].filter(Boolean).join(":") + (tep ? ` · ${tep}` : "") + (n.vi_tri ? ` · ${n.vi_tri}` : "");
    })
    .filter((x) => x.trim() !== "");
  return cai.join(" | ") + (ds.length > 3 ? ` | … (+${ds.length - 3})` : "");
}

/**
 * S-Curve trả hàng trăm điểm tuần — đưa nguyên cho mô hình thì tràn trần 6000
 * ký tự và cắt mất phần kết luận. Giữ các trường tổng + 3 điểm quanh ngày cắt.
 */
function gonDuLieu(congCu: string, duLieu: unknown): unknown {
  // Kiểm độc lập đợt 1 NC-08: bảng Gantt 101 dòng bị lưới gọn cắt còn 16 → giữ cấp 1–2 (hạng mục chính), ghi số dòng gốc
  if (congCu === "tiendo.bang_gantt" && duLieu && typeof duLieu === "object") {
    const d = duLieu as Record<string, unknown>;
    const khoa = Object.keys(d).find((k) => Array.isArray(d[k]) && (d[k] as unknown[]).some((x) => x && typeof x === "object" && "cap" in (x as object)));
    if (khoa) {
      const dong = d[khoa] as Record<string, unknown>[];
      const giu = dong.filter((x) => Number(x.cap) <= 2);
      return { ...d, [khoa]: giu, so_dong_goc: dong.length, ghi_chu_gon: `Chỉ giữ cấp 1–2 (${giu.length}/${dong.length} dòng); hỏi một hạng mục cụ thể để xem cấp 3.` };
    }
    return duLieu;
  }
  if (congCu !== "tiendo.s_curve" || !duLieu || typeof duLieu !== "object") return duLieu;
  const d = duLieu as Record<string, unknown>;
  const diem = Array.isArray(d.diem) ? (d.diem as Record<string, unknown>[]) : [];
  const cat = typeof d.ngayCatDuLieu === "string" ? d.ngayCatDuLieu : "";
  let i = diem.findIndex((p) => typeof p.ngayDauTuan === "string" && (p.ngayDauTuan as string) > cat);
  if (i < 0) i = diem.length;
  const { diem: _bo, ...conLai } = d;
  void _bo;
  return { ...conLai, so_diem: diem.length, diem_quanh_ngay_cat: diem.slice(Math.max(0, i - 2), i + 1) };
}

/**
 * Dự án của MỘT lượt hỏi agent: tham số `du_an` (mã ngắn HV/N3A/TT/BT, slug,
 * hay tên — tra bằng timDuAn ở projects.ts) hoặc dự án đang mở. Người không
 * được vào dự án đó → từ chối. Tham số `ma_du_an` mô hình tự điền bị BỎ QUA.
 */
function duAnCuaLuotHoi(ctx: ToolContext, args: Record<string, unknown>): { id: string } | ToolResult {
  const goi = argStr(args, "du_an");
  if (goi === "") return { id: ctx.projectId };
  const p = timDuAn(goi.slice(0, 80));
  if (!p) {
    const co = listProjects()
      .map((d) => (d.ma ? `${d.ma} · ${d.name}` : d.name))
      .join(" | ");
    return {
      ok: false,
      summary: `Không nhận ra dự án "${goi}" (hoặc khớp nhiều dự án). Dự án đang có: ${co}. Hỏi lại người dùng muốn dự án nào.`,
    };
  }
  if (!canAccessProjectByEmail(ctx.email, loaiCua(ctx), p.id)) {
    return { ok: false, summary: `Bạn không có quyền truy cập dự án "${p.name}".` };
  }
  return { id: p.id };
}

/**
 * MỘT lời hỏi agent qua cổng (hoiAgent — ghi sổ, luật 29). Dùng chung cho 14
 * công cụ tiến độ và 15 công cụ pháp lý / hợp đồng / Base.
 */
async function toolHoiCong(
  agent: string,
  congCu: string,
  thamSoDuocTruyen: string[],
  coDuAn: boolean,
  ctx: ToolContext,
  args: Record<string, unknown>,
  toiThieu?: (ts: Record<string, unknown>) => string | null,
): Promise<ToolResult> {
  const duAn = duAnCuaLuotHoi(ctx, args);
  if (!("id" in duAn)) return duAn;
  const thamSo: Record<string, unknown> = coDuAn ? { ma_du_an: duAn.id } : {};
  for (const k of thamSoDuocTruyen) {
    const v = args[k];
    if (v === undefined || v === null || v === "") continue;
    thamSo[k] = typeof v === "string" ? v.trim().slice(0, 120) : v;
  }
  // 27/10/2026 Mr. Đại chốt «gọn văn phong, không gọn thông tin»: AI không nêu số dòng → xin trần của cổng (100) thay mặc định 20
  // (đo: PL-12 «28 issue, dưới đây 20, còn 8 chưa đưa vào»). Bước gọn kết quả vẫn giữ trần ký tự và ghi rõ nếu phải bớt.
  if (thamSoDuocTruyen.includes("gioi_han") && thamSo.gioi_han === undefined) thamSo.gioi_han = 100;
  const thieu = toiThieu?.(thamSo);
  if (thieu) return { ok: false, summary: thieu };

  // ⭐ 12/10/2026 (Mr. Đại: Main ẩn phần Pháp lý với người ngoài dự án, giống Hợp đồng): trợ lý không hỏi HỘ phần mật của dự án
  // mà người đang hỏi không thuộc — chặn TRƯỚC khi gọi sang agent. Cùng một bộ lọc với màn Cảnh báo, Bảng điều hành, báo cáo.
  if (laAgentMat(agent) && !boLocMatCuaNguoi(ctx.email, loaiCua(ctx)).thay(agent, coDuAn ? duAn.id : null)) {
    return { ok: false, summary: `${cauAnMat(agent)} Nói nguyên câu này với người dùng, không tự suy đoán số liệu.` };
  }

  const ten = TEN_AGENT_HOI[agent] ?? agent;
  const cau = (ctx.userMessage ?? "").replace(/\s+/g, " ").trim().slice(0, 100);
  const kq = await hoiAgent(agent, congCu, `Trợ lý chat Main trả lời người dùng: «${cau || "không rõ câu hỏi"}»`, {
    // QS-074 (27/09): người đang hỏi trực tiếp (chat web + Telegram) → luôn lấy số TƯƠI,
    // không dùng bộ nhớ 10 phút của Bảng điều hành (số mới vẫn được ghi vào bộ nhớ đó)
    boQuaNho: true,
    tham_so: thamSo,
    ma_nguoi_dung: ctx.email.split("@")[0] ?? ctx.email,
  });
  if (!kq.ok) {
    return {
      ok: false,
      summary: `${ten} chưa trả lời được ${congCu} (${kq.ma_loi}): ${kq.thong_diep} — nói với người dùng "${ten} chưa có số liệu", không tự ước.`,
    };
  }
  const nguon = nguonGon(kq.nguon);
  const d = kq.du_lieu as Record<string, unknown> | null;
  const tomTat = d && typeof d === "object" && typeof d.tom_tat === "string" ? ` ${d.tom_tat}` : "";
  return {
    ok: true,
    summary: `${ten} trả lời ${congCu}.${tomTat} Nguồn: ${nguon}`,
    data: {
      agent: ten,
      cong_cu: congCu,
      du_lieu: gonDuLieu(congCu, kq.du_lieu),
      nguon,
      canh_bao: kq.canh_bao,
    },
  };
}

/**
 * `thay_doi` của gia_dinh_cod về MẢNG (cổng cắt chuỗi còn 120 ký tự nên không
 * được để nguyên chuỗi JSON). Mô hình hay gửi thẳng một thay đổi ở tầng ngoài
 * ({ wbs, loai, soNgay }) hoặc chuỗi JSON — nhận cả hai. Kiểm chi tiết do cổng
 * tiến độ làm (docThayDoi), ở đây chỉ gói cho đúng khuôn.
 */
export function chuanThayDoi(args: Record<string, unknown>): unknown[] | undefined {
  let v: unknown = args.thay_doi ?? args.thayDoi;
  if (v === undefined && (args.wbs !== undefined || args.ma_wbs !== undefined)) {
    const { du_an: _duAn, ...mot } = args;
    void _duAn;
    v = mot;
  }
  if (typeof v === "string") {
    try {
      v = JSON.parse(v);
    } catch {
      return undefined;
    }
  }
  if (v && typeof v === "object" && !Array.isArray(v)) v = [v];
  return Array.isArray(v) && v.length > 0 ? v.slice(0, 20) : undefined;
}

/**
 * Đợt 1 (26/10): MỘT công cụ «tra mã» thay bốn `tim_theo_ma` của 4 agent — code chọn agent theo DẠNG mã:
 * CV-… → Công việc · HD-/PG-/NT- → Hợp đồng · mã WBS số (6.1.4) → Tiến độ · còn lại (K-09, 1315/QĐ-UBND…) → Pháp lý.
 */
export function agentTheoMa(ma: string): "base" | "hopdong" | "tiendo" | "phaply" {
  // Kiểm độc lập đợt 1 NC-01…04: chữ thường «hd-548», «HĐ-548»; mã BOQ / TP- / P01 / ISS- trước đây rơi nhầm về Pháp lý
  const m = ma.trim().toUpperCase().replace(/Đ/g, "D");
  if (/^CV-\d/.test(m)) return "base";
  if (/^(HD|PG|NT)-/.test(m) || /^ISS-HD/.test(m)) return "hopdong";
  // Pháp lý: mã hồ sơ cần có (K-09, HV-K-09, PL-…, #58), số hiệu văn bản (có «/»), issue pháp lý
  if (/(^|-)K-\d/.test(m) || /^PL-/.test(m) || /^#\d/.test(m) || m.includes("/") || /^ISS-PL/.test(m)) return "phaply";
  // Kiểm độc lập đợt 2 B2-02: mã hồ sơ cần có dạng «HV-06-03» (469 lần trong sổ), «HV-AI-44» (50 lần), «AI-44» trước đây rơi về Tiến độ
  if (/^[A-Z0-9]{1,4}-(AI|\d{2})-\d{2}\b/.test(m) || /^AI-\d{2}\b/.test(m)) return "phaply";
  // Còn lại về Tiến độ: WBS 6.1.4 · BOQ A.1.1-01 · thầu phụ TP- · quy tắc P01 · issue tiến độ
  return "tiendo";
}

function toolTraMa(ctx: ToolContext, args: Record<string, unknown>): Promise<ToolResult> {
  const ma = argStr(args, "ma");
  if (ma === "") return Promise.resolve({ ok: false, summary: "Thiếu mã cần tra (ma)." });
  const agent = agentTheoMa(ma);
  // Đợt 2 (27/10, PL-07): «K-09» thiếu tiền tố dự án → thử mã của dự án đang mở trước («HV-K-09»); không ra thì tra mã gốc
  // Kiểm độc lập đợt 2 B2-08: người hỏi nêu dự án («K-09 của HV») thì lấy mã dự án ĐÓ, không phải dự án đang mở
  const daHoi = duAnCuaLuotHoi(ctx, args);
  const maDa = getProject("id" in daHoi ? daHoi.id : ctx.projectId)?.ma;
  if (agent === "phaply" && maDa && /^[A-Z]{1,3}-\d/i.test(ma) && !ma.toUpperCase().startsWith(`${maDa.toUpperCase()}-`)) {
    return toolHoiCong(agent, "tim_theo_ma", ["ma"], false, ctx, { ...args, ma: `${maDa}-${ma.toUpperCase()}` }).then((r) =>
      r.ok && !/không nhận ra mã/.test(r.summary) ? r : toolHoiCong(agent, "tim_theo_ma", ["ma"], false, ctx, { ...args, ma }),
    );
  }
  return toolHoiCong(agent, "tim_theo_ma", ["ma"], agent === "tiendo", ctx, { ...args, ma });
}

/** Khoảng ngày mặc định khi bỏ trống: từ hôm nay+tu đến hôm nay+den (ngày giờ VN, yyyy-mm-dd) — đợt 1 (26/10) */
function khoangMacDinh(ts: Record<string, unknown>, tu: number, den: number): void {
  const homNay = gioVn(new Date()).ngay;
  const cong = (goc: string, n: number) => {
    const d = new Date(`${goc}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  // dd/mm/yyyy → yyyy-mm-dd (cổng chỉ nhận ISO — kiểm độc lập NC-06)
  for (const k of ["tu_ngay", "den_ngay"] as const) {
    const v = typeof ts[k] === "string" ? (ts[k] as string).trim() : "";
    const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) ts[k] = `${m[3]}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
  }
  // Chỉ nêu MỘT đầu → đầu kia tính theo đầu đã nêu, giữ độ dài mặc định (trước đây theo «hôm nay» → tu sau den)
  const doDai = den - tu;
  const a = typeof ts.tu_ngay === "string" && ts.tu_ngay ? (ts.tu_ngay as string) : null;
  const b = typeof ts.den_ngay === "string" && ts.den_ngay ? (ts.den_ngay as string) : null;
  if (a && !b) ts.den_ngay = cong(a, doDai);
  else if (!a && b) ts.tu_ngay = cong(b, -doDai);
  else if (!a && !b) {
    ts.tu_ngay = cong(homNay, tu);
    ts.den_ngay = cong(homNay, den);
  }
}

function toolHoiTienDo(name: string, ctx: ToolContext, args: Record<string, unknown>): Promise<ToolResult> {
  const khai = CONG_TIEN_DO[name]!;
  const bu: Record<string, unknown> = { ...args };
  if (name === "gia_dinh_cod") bu.thay_doi = chuanThayDoi(args);
  return toolHoiCong("tiendo", khai.congCu, khai.thamSo, true, ctx, bu, (ts) => {
    if (name === "danh_sach_issue" && ts.chi_dang_mo === undefined) ts.chi_dang_mo = true;
    if (name === "chi_tiet_dau_viec" && !ts.ma_wbs) return "Thiếu mã WBS của đầu việc cần xem.";
    // Đợt 1 (26/10): khoảng ngày bỏ trống → mặc định theo giờ VN (luật 44)
    if (name === "nhat_ky_thi_cong") khoangMacDinh(ts, -6, 0);
    if (name === "viec_trong_khoang") khoangMacDinh(ts, 0, 7);
    if (name === "gia_dinh_cod" && !Array.isArray(ts.thay_doi)) {
      return 'Thiếu thay_doi — cần mảng [{ wbs: "6.1.4", loai: "xong_som"|"xong_muon"|"bat_dau_ngay"|"thoi_luong", soNgay: 10 }]. Hỏi người dùng việc nào, sớm/muộn bao nhiêu ngày.';
    }
    return null;
  });
}

function toolHoiAgentKhac(name: string, ctx: ToolContext, args: Record<string, unknown>): Promise<ToolResult> {
  const khai = CONG_AGENT_KHAC[name]!;
  return toolHoiCong(khai.agent, khai.congCu, khai.thamSo, khai.coDuAn, ctx, args, (ts) => {
    if ((name === "phaply_ho_so_cua_wbs" || name === "nghiemthu_da_nghiem_thu_chua") && !ts.ma_wbs) {
      return "Thiếu mã WBS (ma_wbs) — hỏi người dùng hạng mục nào.";
    }
    if (name === "base_co_viec_cho_ma_khong" && !ts.ma_he_thong) {
      return "Thiếu mã cần tra (ma_he_thong) — vd mã WBS, mã hồ sơ PL-, mã phiếu giá PG-.";
    }
    // Lịch họp: không nói ai → của chính người đang hỏi (chat web và Telegram đều mang email người đã nối)
    // 26/10 — LUÔN là người đang hỏi: không để AI truyền email người khác rồi xem lịch họp của họ (⏸ mở rộng theo quyền thì Mr. Đại quyết)
    if (name === "base_lich_hop") ts.nguoi = ctx.email;
    // Có mã hợp đồng thì hỏi đúng hợp đồng đó, không kèm dự án
    if (name === "hopdong_toan_canh" && ts.ma_hop_dong) delete ts.ma_du_an;
    // Đợt 1 (26/10)
    if ((name === "hopdong_dieu_khoan" || name === "hopdong_cam_ket_nha_thau" || name === "hopdong_chi_phi_theo_hop_dong") && ts.ma_hop_dong) {
      if (name !== "hopdong_chi_phi_theo_hop_dong") delete ts.ma_du_an;
    }
    if (name === "hopdong_dieu_khoan" && !ts.chu_de) return "Thiếu chu_de — vd «phạt», «tạm ứng», «bảo hành», «thanh toán».";
    if (name === "hopdong_ket_qua_soat" && !ts.ma_phieu_gia) return "Thiếu mã phiếu giá (ma_phieu_gia) — vd PG-548.02.";
    if ((name === "phaply_van_ban_con_hieu_luc") && !ts.so_hieu) return "Thiếu số hiệu văn bản (so_hieu).";
    if (name === "phaply_can_cu_phap_ly" && !ts.tu_khoa) return "Thiếu từ khoá việc cần căn cứ (tu_khoa).";
    if (name === "phaply_tra_van_ban" && !ts.so_hieu && !ts.tu_khoa) return "Cần so_hieu hoặc tu_khoa để tra văn bản.";
    if (name === "hopdong_co_hop_dong_chua" && !ts.ma_wbs) return "Thiếu mã WBS (ma_wbs).";
    // Đợt 3 (27/10)
    if (name === "nghiemthu_bien_ban" && !ts.tu_khoa && !ts.hang_muc && !ts.ma_wbs && !ts.ma_bien_ban)
      return "Cần ít nhất một trong: tu_khoa (vd «móng turbine số 3»), hang_muc (vd «TB3»), ma_wbs, ma_bien_ban.";
    if ((name === "hopdong_bao_lanh_tam_ung" || name === "hopdong_moc_thanh_toan") && ts.ma_hop_dong) delete ts.ma_du_an;
    if (name === "nghiemthu_lich_nghiem_thu") {
      for (const k of ["tu_ngay", "den_ngay"] as const) {
        const m = typeof ts[k] === "string" ? (ts[k] as string).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/) : null;
        if (m) ts[k] = `${m[3]}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
      }
    }
    if (name === "base_trang_thai_cong_viec" && !ts.ma_viec_base) return "Thiếu mã việc (ma_viec_base, dạng CV-…) — tra trước bằng viec_base / base_nguoi_phu_trach.";
    if (name === "base_nguoi_phu_trach" && !ts.tu_khoa && !ts.ma_he_thong) return "Cần tu_khoa (tên việc) hoặc ma_he_thong.";
    if (name === "base_viec_co_han_trong_khoang") khoangMacDinh(ts, 0, 7);
    if (name === "base_viec_da_xong") khoangMacDinh(ts, -30, 0);
    if (name === "base_lich_phong" && !ts.phong) return "Thiếu phòng họp (phong) — vd «01», «03», «09» hoặc tên phòng.";
    return null;
  });
}

// ===================================================================
// CÔNG CỤ CŨ ĐÃ CHUYỂN VỀ AGENT TIẾN ĐỘ (24/09)
// ===================================================================

/**
 * Tên công cụ của bản chép cũ → việc đó nay làm ở trang nào của Agent tiến độ.
 * Phiên chat cũ, skill cũ hay mô hình nhớ nhầm gọi tên này thì nhận câu chỉ
 * đường, không nhận lỗi "không có công cụ".
 */
export const DA_CHUYEN_SANG_TIEN_DO: Record<string, { viec: string; trang: string; thay?: string }> = {
  update_task_pct: { viec: "ghi % hoàn thành (vào bằng báo cáo qua Lớp 0)", trang: "/docs" },
  lock_baseline: { viec: "duyệt/chốt Baseline", trang: "/planning" },
  run_analysis: { viec: "chạy phân tích AI sinh cảnh báo/dự báo", trang: "/alerts" },
  sinh_de_xuat_ai: { viec: "sinh đề xuất AI từ vướng mắc báo cáo", trang: "/alerts" },
  soan_viec_tu_the: { viec: "soạn việc từ thẻ cảnh báo tiến độ", trang: "/alerts" },
  de_xuat_lich_lag: { viec: "AI đề xuất lịch chạy liên tục / lag", trang: "/planning" },
  viet_nhap_bao_cao: { viec: "viết nháp lời văn BC tuần", trang: "/report-mgmt" },
  // (27/10 đợt 3c: bao_cao_tuan · thoi_tiet nay là công cụ cổng THẬT của Tiến độ — bỏ khỏi danh sách chỉ đường)
  chay_nhan_xet_ai: { viec: "chạy lại nhận xét năng suất / giải thích COD", trang: "/productivity" },
  xuat_file: { viec: "xuất BC tuần Word / tiến độ Excel", trang: "/report-mgmt" },
  bao_cao_ngay: { viec: "đọc báo cáo ngày công trường", trang: "/report-field", thay: "khoi_luong_hang_muc" },
  thiet_ke_tk: { viec: "theo dõi thiết kế TK-", trang: "/thiet-ke", thay: "ho_so_thiet_ke" },
  soat_so_lieu: { viec: "đối chiếu chéo BC ngày ↔ BC tuần", trang: "/soat-so-lieu" },
  tim_ho_so: { viec: "tìm file đã nộp (sổ nộp Lớp 0)", trang: "/docs" },
  lich_du_an: { viec: "lịch làm việc, ngày nghỉ của dự án", trang: "/planning" },
  // Tên đọc số cũ → tên mới đi hỏi cổng
  project_summary: { viec: "tóm tắt dự án", trang: "/", thay: "tom_tat_du_an" },
  find_tasks: { viec: "tìm đầu việc", trang: "/detail", thay: "tim_dau_viec" },
  task_detail: { viec: "chi tiết đầu việc", trang: "/detail", thay: "chi_tiet_dau_viec" },
  list_alerts: { viec: "cảnh báo tiến độ", trang: "/alerts", thay: "danh_sach_issue" },
  giai_thich_cod: { viec: "chuỗi việc quyết định COD", trang: "/", thay: "duong_gang" },
  tuan_truoc: { viec: "so tuần này với tuần trước", trang: "/tuan-truoc", thay: "so_tuan" },
};

function toolDaChuyen(name: string): ToolResult {
  const c = DA_CHUYEN_SANG_TIEN_DO[name]!;
  const link = `${diaChiTienDo()}${c.trang}`;
  return {
    ok: false,
    summary:
      `Việc "${c.viec}" làm ở Agent tiến độ: ${link} — Main không giữ bản chép bộ tính tiến độ (chốt 24/09).` +
      (c.thay ? ` Muốn ĐỌC số thì gọi công cụ ${c.thay}.` : ""),
    data: { link },
  };
}

// ===================================================================
// CÔNG CỤ CỦA CHÍNH MAIN
// ===================================================================

function toolListProjects(ctx: ToolContext): ToolResult {
  const projects = listProjects();
  const rows = projects.map((p) => ({
    id: p.id,
    name: p.name,
    projectStart: p.projectStart ?? null,
    current: p.id === ctx.projectId,
  }));
  const cur = rows.find((r) => r.current);
  return {
    ok: true,
    summary: `Có ${rows.length} dự án${cur ? ` — đang mở: ${cur.name} (${cur.id})` : ""}.`,
    data: { projects: rows },
  };
}

function toolOpenTab(args: Record<string, unknown>): ToolResult {
  let p = argStr(args, "path");
  if (p === "") return { ok: false, summary: "Thiếu đường dẫn tab cần mở." };
  if (p.indexOf("/") !== 0) p = `/${p}`;
  if (p.length > 1) p = p.replace(/\/+(?=\?|$)/, "");
  // Đường gốc phải là màn của Main; phần ?tab=… (chỉ chữ thường, số, gạch) đi theo
  const [goc, truyVan] = p.split("?", 2) as [string, string | undefined];
  if (truyVan !== undefined && !/^tab=[a-z0-9-]{1,30}$/.test(truyVan)) {
    return { ok: false, summary: `Phần sau dấu ? chỉ nhận dạng "tab=<tên tab>" — "${truyVan}" không hợp lệ.` };
  }
  if (ALLOWED_TAB_PATHS.indexOf(goc) < 0) {
    return {
      ok: false,
      summary: `Đường dẫn "${p}" không phải màn của Main. Các tab mở được: ${ALLOWED_TAB_PATHS.join(", ")}. Màn tiến độ (Gantt, Lập tiến độ, Năng suất…) nằm ở Agent tiến độ: ${diaChiTienDo()}.`,
    };
  }
  return {
    ok: true,
    summary: `Đã mở tab ${p}.`,
    data: { path: p },
    uiAction: { type: "navigate", path: p },
  };
}

function toolSwitchProject(ctx: ToolContext, args: Record<string, unknown>): ToolResult {
  const id = argStr(args, "projectId").toLowerCase();
  if (id === "") return { ok: false, summary: "Thiếu mã dự án cần chuyển sang." };
  if (id === ctx.projectId) {
    return { ok: false, summary: "Dự án này đang được mở sẵn rồi ạ." };
  }
  const project = getProject(id);
  if (!project || project.archived === true) {
    return { ok: false, summary: `Không tìm thấy dự án "${id}" (hoặc đã được lưu trữ).` };
  }
  if (!canAccessProjectByEmail(ctx.email, loaiCua(ctx), id)) {
    return { ok: false, summary: `Bạn không có quyền truy cập dự án "${project.name}".` };
  }
  return {
    ok: true,
    summary: `Đã chuyển sang dự án ${project.name}.`,
    data: { projectId: id, name: project.name },
    uiAction: { type: "switchProject", projectId: id },
  };
}

// ===== VIỆC — ĐỌC VÀ GIAO QUA AGENT CÔNG VIỆC (Mr. Đại chốt 04/10/2026: Base.vn hết hợp đồng, trợ lý giao THẲNG sang
// agent Công việc sau khi người bấm ✅ Làm). Tên công cụ giữ mã nội bộ "base" (= agent Công việc, chốt 03/10).
// Mọi lời gọi đi qua lib/chung/viec-cong-viec.ts (luật 29 — có ghi sổ).

/** yyyy-mm-dd → dd/mm/yyyy cho chữ trợ lý đọc (Mr. Đại chốt 04/10: mọi ngày hiện ra dd/mm/yyyy) */
function ngayVnCongCu(iso: string | null): string | null {
  const m = iso ? /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) : null;
  return m ? `${m[3]}/${m[2]}/${m[1]}` : null;
}

/**
 * B2 (Mr. Đại chốt 28/10/2026, phương án a): xem việc của NGƯỜI KHÁC. PM và Admin (cửa «Cài đặt», `duocCaiDat`) xem được;
 * Người dùng / Người xem chỉ xem việc của mình. «Trưởng phòng xem phòng mình» chưa làm — Main chưa có chức vụ từng người để xét (ghi ở KE-HOACH/31).
 * Trả `{email}` của người cần xem, hoặc `{loi}` bằng lời thường.
 */
export async function nguoiCanXemViec(ctx: ToolContext, tenHoacMa: string): Promise<{ email: string } | { loi: string }> {
  const goc = tenHoacMa.trim().replace(/^@/, "");
  if (goc === "" || goc.toLowerCase() === ctx.email.toLowerCase()) return { email: ctx.email };
  if (!duocCaiDat(loaiCua(ctx))) {
    return { loi: "Bạn chỉ xem được việc của chính mình. Xem việc của người khác cần tài khoản PM hoặc Admin." };
  }
  if (goc.includes("@")) return { email: goc };
  const ds = await dsNguoiNhanCV(ctx.email);
  if (!ds.ok) return { loi: `Không tra được danh bạ agent Công việc: ${ds.loi}` };
  const chuanHoa = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").toLowerCase();
  const can = chuanHoa(goc);
  const khop = ds.ds.nguoi.filter((n) => chuanHoa(n.id) === can || chuanHoa(n.ten ?? "").includes(can));
  if (khop.length === 0) return { loi: `Không có ai tên «${goc}» trong danh bạ agent Công việc.` };
  if (khop.length > 1) return { loi: `Có ${khop.length} người khớp «${goc}»: ${khop.slice(0, 6).map((n) => n.ten ?? n.id).join(", ")}. Hỏi người dùng chọn đúng người.` };
  return { email: khop[0].id };
}

async function toolViecBase(ctx: ToolContext, args: Record<string, unknown>): Promise<ToolResult> {
  const xem = await nguoiCanXemViec(ctx, argStr(args, "nguoi"));
  if ("loi" in xem) return { ok: false, summary: xem.loi };
  const laToi = xem.email === ctx.email;
  const kq = await layViecCuaToiCV(xem.email);
  if (!kq.ok) return { ok: false, summary: `Không đọc được việc ở agent Công việc: ${kq.loi ?? "lỗi không rõ"}` };
  const bang = argStr(args, "bang") || "ca-ba";
  const limit = Math.min(Math.max(argNum(args, "limit") ?? 15, 1), 50);
  const rutGon = (ds: ViecCV[]) =>
    ds.slice(0, limit).map((v) => ({
      ma: v.ma_viec_base,
      ten: v.ten,
      duAn: v.du_an,
      han: ngayVnCongCu(v.han),
      quaHanNgay: v.qua_han_ngay,
      chuTri: v.chu_tri,
      nguoiGiao: v.nguoi_giao,
    }));
  // Đợt 2 (27/10, CV-02 · CV-13): việc TỰ GIAO cho chính mình nằm ở cả «nhận» lẫn «giao» → chỉ để ở «nhận», khỏi kể hai lần
  const maNhan = new Set(kq.ds.nhan.map((v) => v.ma_viec_base));
  const giaoKhac = kq.ds.giao.filter((v) => !maNhan.has(v.ma_viec_base));
  const tuGiao = kq.ds.giao.length - giaoKhac.length;
  const nguon = { nhan: kq.ds.nhan, giao: giaoKhac, phoi_hop: kq.ds.phoi_hop };
  const lay = (k: "nhan" | "giao" | "phoi_hop") => (bang === "ca-ba" || bang === k ? rutGon(nguon[k]) : []);
  return {
    ok: true,
    summary:
      `Agent Công việc${laToi ? "" : ` — việc của ${argStr(args, "nguoi")}`}: ${kq.dem.nhan} việc ${laToi ? "tôi" : "người này"} nhận · ${kq.dem.giao - tuGiao} việc ${laToi ? "tôi" : "người này"} giao cho người khác` +
      (tuGiao > 0 ? ` (thêm ${tuGiao} việc tự giao cho chính mình — đã tính ở phần nhận)` : "") +
      ` · ${kq.dem.phoi_hop} việc cần phối hợp (việc đang mở, mọi dự án).`,
    data: { dem: kq.dem, viecToiNhan: lay("nhan"), viecToiGiao: lay("giao"), viecCanPhoiHop: lay("phoi_hop") },
  };
}

async function toolTaoViecBase(ctx: ToolContext, args: Record<string, unknown>): Promise<ToolResult> {
  const ten = argStr(args, "ten");
  if (ten === "") return { ok: false, summary: "Thiếu tên công việc." };
  // Không nói giao cho ai → giao cho chính người dùng (agent Công việc nhận email làm mã người)
  const giaoCho = argStr(args, "giaoCho").replace(/^@/, "") || ctx.email;
  const hanChu = argStr(args, "han");
  const han = hanIso(hanChu);
  if (hanChu && !han) return { ok: false, summary: `Hạn "${hanChu}" không đúng dạng dd/mm/yyyy.` };
  const ds = await dsNguoiNhanCV(ctx.email);
  const tenNhan = ds.ok ? (ds.ds.don_vi.find((d) => d.id === giaoCho)?.ten ?? ds.ds.nguoi.find((n) => n.id === giaoCho)?.ten ?? giaoCho) : giaoCho;
  // LUẬT 33 (Mr. Đại chốt 04/10/2026): hỏi 4 agent kia trước khi mở việc — trùng thì không giao, trả câu cho người quyết
  if (!argBool(args, "vanSoan")) {
    const hoi = await hoiTrungCauNoi(
      { ten, moTa: argStr(args, "moTa"), han, maDuAn: argStr(args, "duAn") || null, projectId: argStr(args, "duAn") ? undefined : ctx.projectId },
      { duong: "A", nguoi: ctx.email.split("@")[0] ?? ctx.email },
    );
    if (hoi.trung) {
      return {
        ok: false,
        summary: `CHƯA GIAO — 🤖 ${tomTatHoiTrung(hoi)}. Nói lại với người dùng câu này; người dùng xác nhận đây là việc KHÁC thì gọi lại tao_viec_base với vanSoan=true.`,
      };
    }
  }
  const kq = await giaoSangCongViec({
    email: ctx.email,
    maDuAn: argStr(args, "duAn"),
    ten,
    han,
    giaoCho,
    canCu: "",
    ketQua: argStr(args, "moTa") || undefined,
    nguon: "trợ lý chat Main (người bấm ✅ Làm)",
  });
  if (!kq.ok) return { ok: false, summary: `Agent Công việc chưa nhận việc: ${kq.loi}` };
  return {
    ok: true,
    summary: `Đã giao việc «${ten}» cho ${giaoCho === ctx.email ? "chính bạn" : tenNhan} ở agent Công việc${kq.maViec ? ` — mã ${kq.maViec}` : ""}. Xem ở màn Việc của tôi.`,
    data: { maViec: kq.maViec },
  };
}

async function toolDanhBaBase(ctx: ToolContext, args: Record<string, unknown>): Promise<ToolResult> {
  const q = fold(argStr(args, "q").slice(0, 64));
  if (q === "") return { ok: false, summary: "Thiếu từ khóa tra danh bạ." };
  const ds = await dsNguoiNhanCV(ctx.email);
  if (!ds.ok) return { ok: false, summary: `Không tra được danh bạ agent Công việc: ${ds.loi}` };
  const nguoi = ds.ds.nguoi.filter((n) => fold(`${n.ten} ${n.dv ?? ""} ${n.id}`).includes(q)).slice(0, 12);
  const donVi = ds.ds.don_vi.filter((d) => fold(`${d.ten} ${d.id}`).includes(q)).slice(0, 8);
  const tong = nguoi.length + donVi.length;
  // Đợt 2 (27/10, CV-09 · CV-20): «dv» chỉ là tên viết tắt (P.ĐT&PC) → AI tự đoán sai «Đầu tư & Phát triển». Trả TÊN ĐẦY ĐỦ
  // đơn vị (từ don_vi_ids) + CHỨC DANH (mục loại chuc_danh «<chức danh> · <tên người>»); đơn vị kèm các chức danh con.
  type DvCV = { id: string; ten: string; loai?: string; cha_id?: string | null };
  const dsDv = ds.ds.don_vi as DvCV[];
  const tenDv = new Map(dsDv.map((d) => [d.id, d.ten]));
  const chucDanh = dsDv.filter((d) => d.loai === "chuc_danh");
  const chucCua = (ten: string) => chucDanh.filter((c) => c.ten.endsWith(`· ${ten}`)).map((c) => c.ten.split(" · ")[0]!.trim());
  return {
    ok: true,
    summary:
      `Danh bạ agent Công việc khớp "${argStr(args, "q")}": ${nguoi.length} người · ${donVi.length} đơn vị` +
      (tong > 1 ? " — NHIỀU HƠN MỘT, phải hỏi lại người dùng chọn ai." : tong === 0 ? " — không ai khớp, hỏi người dùng chọn người/đơn vị nhận." : ""),
    data: [
      ...nguoi.map((n) => {
        const ids = (n as { don_vi_ids?: string[] }).don_vi_ids ?? [];
        const day = ids.map((i) => tenDv.get(i)).filter((x): x is string => !!x);
        // Kiểm độc lập B2-09: Main có chức vụ trong hồ sơ người dùng (users.json `chucVu`) — dùng khi danh bạ 3004 không có chức danh
        const cv = chucCua(n.ten);
        const cvMain = getUserByEmail(n.id)?.chucVu ?? null;
        return { ma: n.id, ten: n.ten, donVi: day.length ? day.join(", ") : n.dv, chucDanh: cv.join(", ") || cvMain || "chưa có trong danh bạ", loai: "người" };
      }),
      ...donVi.map((d) => {
        // Hàng chức danh («Tổng Giám đốc · Trương Bửu Ngọc») là một CHỨC DANH, không phải đơn vị (kiểm độc lập B2-10: nhãn sai)
        if ((d as DvCV).loai === "chuc_danh") return { ma: d.id, ten: d.ten, loai: "chức danh" };
        const con = chucDanh.filter((c) => c.cha_id === d.id).map((c) => c.ten);
        // Người trong đơn vị có chức vụ trưởng/phó (Main users.json) — trả lời «ai là trưởng phòng X»
        const truong = ds.ds.nguoi
          .filter((n) => ((n as { don_vi_ids?: string[] }).don_vi_ids ?? []).includes(d.id))
          .map((n) => ({ ten: n.ten, chucVu: getUserByEmail(n.id)?.chucVu ?? null }))
          .filter((x) => x.chucVu && /trưởng|phó|giám đốc/i.test(x.chucVu))
          .map((x) => `${x.chucVu} · ${x.ten}`);
        const tatCa = [...con, ...truong];
        return { ma: d.id, ten: d.ten, loai: "đơn vị", chucDanhTrongDonVi: tatCa.length ? tatCa : "danh bạ chưa khai trưởng/phó đơn vị này" };
      }),
    ],
  };
}

/** 05/09 — SOẠN NHÁP việc từ câu nói; chờ người chọn người nhận rồi bấm Gửi ở màn Việc của tôi */
async function toolSoanViecGiao(ctx: ToolContext, args: Record<string, unknown>): Promise<ToolResult> {
  const ten = argStr(args, "ten");
  if (ten === "") return { ok: false, summary: "Thiếu tên việc cần soạn." };
  const giaoCho = argStr(args, "giaoCho").replace(/^@/, "");
  if (giaoCho !== "") {
    const ds = await dsNguoiNhanCV(ctx.email);
    if (ds.ok && !ds.ds.nguoi.some((n) => n.id === giaoCho) && !ds.ds.don_vi.some((d) => d.id === giaoCho)) {
      return { ok: false, summary: `Không có mã "${giaoCho}" trong danh bạ agent Công việc — tra lại bằng danh_ba_base rồi hỏi người dùng chọn đúng người.` };
    }
  }
  // Không soạn nháp có hạn đã qua (Mr. Đại chốt 04/10/2026 tối) — nháp đó không gửi được, chỉ thành rác
  const hanX = hanIso(argStr(args, "han"));
  if (hanX && hanX < homNayIso()) return { ok: false, summary: `Hạn ${argStr(args, "han")} đã qua — hỏi người dùng hạn mới (từ hôm nay trở đi) rồi mới soạn.` };
  // LUẬT 33: giữ chỗ → hỏi 4 agent kia → trùng thì không soạn (bản ghi trùng), trả câu cho người quyết
  const { nhap, trung } = await ghiNhapCoHoiTrung(
    {
      nguoi: ctx.email.split("@")[0] ?? ctx.email,
      ten,
      moTa: argStr(args, "moTa"),
      han: argStr(args, "han") || undefined,
      giaoCho: giaoCho || undefined,
      projectId: ctx.projectId,
    },
    { duong: "A", vanSoan: argBool(args, "vanSoan") },
  );
  if (trung) {
    return {
      ok: false,
      summary: `CHƯA SOẠN — 🤖 ${trung.tomTat}. Nói lại với người dùng câu này; người dùng xác nhận đây là việc KHÁC thì gọi lại soan_viec_giao với vanSoan=true.`,
    };
  }
  return {
    ok: true,
    summary:
      `Đã soạn NHÁP việc "${nhap.ten}"` +
      (giaoCho ? " (đã chọn sẵn người nhận)" : " (chưa chọn người nhận)") +
      (nhap.han ? `, hạn ${nhap.han}` : "") +
      ". Nháp đang nằm ở màn «Việc của tôi» → khối «Việc AI soạn chờ duyệt»: bấm Gửi (hoặc Sửa để chỉnh) thì thành việc ở agent Công việc. CHƯA giao.",
    data: { id: nhap.id, ten: nhap.ten, giaoCho: nhap.giaoCho ?? null, han: nhap.han ?? null },
    uiAction: { type: "navigate", path: "/viec-cua-toi" },
  };
}

// ===== TRỢ LÝ TỰ THAO TÁC GIAO DIỆN (Mr. Đại chốt 06/09) =====
// Server chỉ DỰNG dãy bước và kiểm từng mã lệnh có thật trong sổ; việc bấm
// do client làm (chay-lenh.ts), vì chỉ client mới thấy màn hình.
// Sổ lệnh còn khai lệnh của các trang tiến độ (/planning, /detail…) — Main
// không có những trang đó nên chỉ đưa ra lệnh của trang CÓ THẬT ở Main.

/** Lệnh dùng được ở Main: trang "*" hoặc một màn có thật của Main */
export function laLenhCuaMain(trang: string): boolean {
  return trang === "*" || ALLOWED_TAB_PATHS.includes(trang);
}

function toolLietKeLenh(args: Record<string, unknown>, trangDangMo: string): ToolResult {
  const trang = argStr(args, "trang");
  if (trangDangMo !== "" && (trang === "" || trang === trangDangMo)) {
    return {
      ok: false,
      summary:
        "Bảng lệnh của trang đang mở ĐÃ nằm trong hướng dẫn phía trên — dùng thẳng, " +
        "đừng gọi liet_ke_lenh nữa (mỗi lượt chỉ có 3 vòng). Hãy gọi dieu_khien_giao_dien ngay.",
    };
  }
  const ds = DANH_MUC_LENH.filter(
    (l) => laLenhCuaMain(l.trang) && (trang === "" || l.trang === trang || l.trang === "*"),
  );
  return {
    ok: true,
    summary: `${ds.length} lệnh bấm được${trang ? ` ở ${trang}` : ""}.`,
    data: {
      lenh: ds.map((l) => ({
        ma: l.ma,
        moc: l.moc,
        ten: l.ten,
        trang: l.trang,
        kieu: l.kieu,
        ghi_du_lieu: l.ghi,
        gia_tri_hop_le: l.giaTriHopLe,
      })),
    },
  };
}

function toolDieuKhienGiaoDien(ctx: ToolContext, args: Record<string, unknown>): ToolResult {
  const tho = Array.isArray(args.buoc) ? (args.buoc as unknown[]) : [];
  if (tho.length === 0) {
    return { ok: false, summary: "Chưa có bước nào để làm — cần mảng buoc." };
  }
  const buoc: BuocGiaoDien[] = [];
  for (const b of tho.slice(0, TRAN_BUOC)) {
    if (b === null || typeof b !== "object") continue;
    const o = b as Record<string, unknown>;
    const lenh = typeof o.lenh === "string" ? o.lenh.trim() : "";
    const khai = timTheoMoc(lenh);
    if (!khai) {
      return {
        ok: false,
        summary: `Lệnh "${lenh}" không có trong sổ lệnh — gọi liet_ke_lenh để xem mã đúng.`,
      };
    }
    if (!laLenhCuaMain(khai.trang)) {
      return {
        ok: false,
        summary: `Lệnh "${khai.ten}" thuộc màn ${khai.trang} của Agent tiến độ — Main không có màn đó. Làm ở ${diaChiTienDo()}${khai.trang}.`,
      };
    }
    // Lệnh sổ lệnh khai vai "pm" = bậc Cài đặt (quyen.ts: PM + Admin)
    if (khai.vai === "pm" && !duocCaiDat(loaiCua(ctx))) {
      return { ok: false, summary: `Lệnh "${khai.ten}" chỉ PM/Admin được dùng. ${LY_DO_CHAN.caidat}` };
    }
    if ((khai.kieu === "dien" || khai.kieu === "chon") && typeof o.giaTri !== "string") {
      return { ok: false, summary: `Bước "${khai.ten}" thiếu giá trị cần điền/chọn.` };
    }
    if (khai.giaTriHopLe && typeof o.giaTri === "string") {
      const khop = khai.giaTriHopLe.some((g) => bangNhau(g, o.giaTri as string));
      if (!khop) {
        return {
          ok: false,
          summary:
            `"${o.giaTri}" không phải giá trị của "${khai.ten}". ` +
            `Chỉ nhận đúng một trong: ${khai.giaTriHopLe.join(" · ")}.`,
        };
      }
    }
    buoc.push({
      lenh,
      wbs: typeof o.wbs === "string" ? o.wbs.trim() : undefined,
      giaTri: typeof o.giaTri === "string" ? o.giaTri : undefined,
      moTa: typeof o.moTa === "string" && o.moTa.trim() !== "" ? o.moTa.trim() : khai.ten,
    });
  }
  if (buoc.length === 0) return { ok: false, summary: "Không dựng được bước nào hợp lệ." };

  const soGhi = buoc.filter((b) => timTheoMoc(b.lenh)?.ghi).length;
  return {
    ok: true,
    summary:
      `Sẽ làm ${buoc.length} bước trên màn hình` +
      (soGhi > 0 ? ` (${soGhi} bước ghi dữ liệu thật)` : "") +
      ": " +
      buoc.map((b) => b.moTa).join(" → "),
    data: { so_buoc: buoc.length },
    uiAction: { type: "thaoTac", buoc },
  };
}

// ===== Chốt chặn PROMPT INJECTION cho công cụ GHI dữ liệu =====

/**
 * Từ khóa thể hiện CHÍNH NGƯỜI DÙNG yêu cầu hành động ghi (đã bỏ dấu).
 * Chỉ tin nhắn cuối của người dùng được xét.
 */
const WRITE_INTENT: Record<string, RegExp[]> = {
  // "tạo việc…", "giao việc cho @thanhnv…" — ĐỘNG TỪ + ĐỐI TƯỢNG việc
  tao_viec_base: [/(tao |giao |lap )/, /(viec|task|cong viec)/],
  // "vào Issue lọc nhóm Pháp lý" — ĐỘNG TỪ THAO TÁC MÀN HÌNH, đứng thành TỪ RIÊNG.
  // ⭐ 26/09 siết (khuôn tiến độ be1825c): mẫu cũ có "lam |giup|ho |chay |soat" nên
  // "làm sao…", "cho tôi…" (chứa "ho "), "giúp mình xem…" đều lọt.
  dieu_khien_giao_dien: [/\b(vao|mo|bam|an nut|sua|dien|chon|loc|cuon|luu|nhap|go)\b/],
  // Luồng giao việc bằng câu nói đi NHIỀU LƯỢT (đo 05/09) — nới đúng phạm vi
  // ngôn ngữ của luồng (nháp · duyệt · màn hình). Chặn hụt chỉ đẻ ra một NHÁP.
  soan_viec_giao: [
    /(soan|tao |giao |lap |chuan bi|nhap|de nhap)/,
    /(viec|task|cong viec|nhap|man hinh|duyet)/,
  ],
};

/**
 * ⭐ 26/09 — câu HỎI không phải lệnh GHI: "đã lưu chưa?", "lọc xong chưa", "lần cuối
 * ghi khi nào". Áp cho dãy bấm hộ có bước GHI (bước chỉ mở trang / lọc vẫn chạy
 * với câu hỏi lịch sự "mở màn Cảnh báo được không?").
 */
const CAU_HOI_KHONG_PHAI_LENH =
  /(\?\s*$|\bchua\s*$|\bda\b.*\bchua\b|\bda chay\b|\bbao gio\b|\bluc nao\b|\bkhi nao\b|\blan cuoi\b)/;

/** Dãy bước dieu_khien_giao_dien có lệnh `ghi: true` trong sổ lệnh không */
function dayBuocCoGhi(args: Record<string, unknown>): boolean {
  const buoc = Array.isArray(args.buoc) ? (args.buoc as unknown[]) : [];
  return buoc.some((b) => {
    if (b === null || typeof b !== "object") return false;
    const lenh = (b as Record<string, unknown>).lenh;
    return typeof lenh === "string" && timTheoMoc(lenh.trim())?.ghi === true;
  });
}

/** Người dùng có thật sự yêu cầu công cụ ghi này ở tin nhắn cuối không? */
function userAskedForWrite(
  toolName: string,
  userMessage: string | undefined,
  args: Record<string, unknown> = {},
): boolean {
  const rules = WRITE_INTENT[toolName];
  if (!rules) return true; // công cụ ghi mới chưa khai báo → không chặn nhầm
  const msg = fold(typeof userMessage === "string" ? userMessage : "");
  if (msg === "") return false;
  if (toolName === "dieu_khien_giao_dien" && dayBuocCoGhi(args) && CAU_HOI_KHONG_PHAI_LENH.test(msg)) return false;
  return rules.every((re) => re.test(msg));
}

/**
 * TÌM TRÊN INTERNET (06/09) — chỉ chạy khi người dùng BẬT nút 🌐; không bao
 * giờ ném ngoại lệ.
 */
async function toolTimKiemWeb(
  ctx: ToolContext,
  args: Record<string, unknown>
): Promise<ToolResult> {
  if (ctx.timWebBat !== true) {
    return {
      ok: false,
      summary:
        "Chế độ tìm trên internet đang TẮT. Bấm nút 🌐 cạnh ô nhập để bật rồi hỏi lại — mình chỉ ra ngoài internet khi bạn cho phép.",
    };
  }
  const query = typeof args.query === "string" ? args.query.trim() : "";
  if (query === "") return { ok: false, summary: "Thiếu từ khoá tìm kiếm." };

  const kq = await timVaDocWeb(query);
  if (kq.ketQua.length === 0) {
    return { ok: false, summary: kq.loi ?? "Không tìm thấy kết quả nào trên internet." };
  }
  return {
    ok: true,
    summary: `Đã tìm trên internet qua ${tenNha(kq.nha)}: ${kq.ketQua.length} kết quả cho "${query}".`,
    data: {
      nguon: tenNha(kq.nha),
      noiDung: xepKetQua(kq.ketQua),
      trang: kq.ketQua.map((k) => ({ tieuDe: k.tieuDe, link: k.link })),
    },
  };
}

// ===== Điều phối =====

/** Loại tài khoản thật của người đang chat (xem ToolContext.loai) */
export function loaiCua(ctx: ToolContext): Role {
  if (ctx.loai) return ctx.loai;
  if (ctx.chiXem === true) return "viewer";
  return ctx.role === "pm" ? "pm" : "engineer";
}

/**
 * CỔNG KIỂM trước khi chạy một công cụ — tách khỏi runTool (25/09) để kênh
 * Telegram hỏi được "công cụ này có được phép không" TRƯỚC khi hiện nút
 * ✅ Làm, thay vì hiện nút rồi mới báo bị chặn. Trả null = được chạy.
 * Kiểm: tên có thật · CỬA QUYỀN (spec.cua × loại tài khoản, quyen.ts) ·
 * chống chèn lệnh (công cụ GHI chỉ khi tin cuối của người dùng yêu cầu).
 * MỘT cổng cho cả web và Telegram, cho cả lượt chat lẫn lúc bấm ✅ Làm.
 */
export function kiemCongCu(
  name: string,
  ctx: ToolContext,
  specs: readonly ToolSpec[] = TOOL_SPECS,
  /** Tham số công cụ — dieu_khien_giao_dien cần biết dãy bước có bước GHI không (26/09) */
  args: Record<string, unknown> = {},
): ToolResult | null {
  const spec = specs.find((s) => s.name === name);
  if (!spec) {
    if (DA_CHUYEN_SANG_TIEN_DO[name]) return toolDaChuyen(name);
    return {
      ok: false,
      summary: `Không có công cụ tên "${name}" — bỏ qua yêu cầu này.`,
    };
  }
  // CỬA QUYỀN (Mr. Đại chốt 25/09): mỗi công cụ khai đúng một cửa; hỏi ma trận
  // quyen.ts bằng loại tài khoản thật. Công cụ GHI khai nhầm "xem" vẫn bị
  // nâng lên cửa "ghi" — lưới an toàn cho người thêm công cụ sau.
  const loai = loaiCua(ctx);
  const cua = spec.writes === true && spec.cua === "xem" ? "ghi" : spec.cua;
  if (!duocQuaCua(loai, cua)) {
    return {
      ok: false,
      summary: `KHÔNG CHẠY "${spec.name}" — tài khoản ${NHAN_LOAI[loai]}: ${LY_DO_CHAN[cua]} Hãy nói lại lý do này với người dùng bằng lời, đừng thử công cụ khác để làm thay.`,
    };
  }
  // CHỐNG PROMPT INJECTION: công cụ GHI chỉ chạy khi tin nhắn cuối của CHÍNH
  // người dùng yêu cầu.
  if (spec.writes === true && !userAskedForWrite(spec.name, ctx.userMessage, args)) {
    return {
      ok: false,
      summary: `Mình KHÔNG tự chạy "${spec.name}" vì tin nhắn cuối của bạn không yêu cầu rõ ràng việc ghi dữ liệu này (đề phòng nội dung trong dữ liệu giả mạo mệnh lệnh). Bạn nhắn rõ giúp mình.`,
    };
  }
  return null;
}

/**
 * Chạy công cụ rồi áp KHUÔN DANH SÁCH (lib/ai/khuon-danh-sach-thuan.ts, Mr. Đại chốt 28/10/2026): danh sách dài được rút gọn
 * trước khi đưa cho AI để AI gõ ít chữ hơn → trả lời nhanh hơn. Quản trị chuyển «đầy đủ» ở Cài đặt; người dùng gõ «xem hết» thì lượt đó đủ.
 * Lỗi của khuôn KHÔNG bao giờ làm hỏng công cụ: lỗi thì trả nguyên kết quả gốc.
 */
export async function runTool(name: string, args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
  const kq = await runToolGoc(name, args, ctx);
  try {
    if (!CONG_CU_CO_KHUON.includes(name)) return kq;
    const moi = apDungKhuon({
      ten: name,
      args: args !== null && typeof args === "object" && !Array.isArray(args) ? args : {},
      ketQua: kq,
      caiDat: docCaiDatKhuon(),
      tin: ctx.userMessage,
      homNay: gioVn(new Date()).ngay,
    });
    return moi === kq ? kq : { ...kq, summary: moi.summary, data: moi.data };
  } catch {
    return kq;
  }
}

/**
 * Chạy 1 công cụ theo tên do mô hình đề xuất. KHÔNG throw trong mọi tình
 * huống — tên lạ, args sai kiểu, thiếu quyền, dữ liệu hỏng đều thành
 * { ok:false, summary }.
 */
async function runToolGoc(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext
): Promise<ToolResult> {
  const safeArgs: Record<string, unknown> =
    args !== null && typeof args === "object" && !Array.isArray(args) ? args : {};

  const chan = kiemCongCu(name, ctx, TOOL_SPECS, safeArgs);
  if (chan) return chan;
  const spec = TOOL_SPECS.find((s) => s.name === name)!;

  try {
    if (CONG_TIEN_DO[spec.name]) return await toolHoiTienDo(spec.name, ctx, safeArgs);
    if (CONG_AGENT_KHAC[spec.name]) return await toolHoiAgentKhac(spec.name, ctx, safeArgs);
    if (spec.name === "tra_ma") return await toolTraMa(ctx, safeArgs);
    switch (spec.name) {
      case "list_projects":
        return toolListProjects(ctx);
      case "open_tab":
        return toolOpenTab(safeArgs);
      case "switch_project":
        return toolSwitchProject(ctx, safeArgs);
      case "dieu_khien_giao_dien":
        return toolDieuKhienGiaoDien(ctx, safeArgs);
      case "liet_ke_lenh":
        return toolLietKeLenh(safeArgs, ctx.trangDangMo ?? "");
      case "viec_base":
        return await toolViecBase(ctx, safeArgs);
      case "tao_viec_base":
        return await toolTaoViecBase(ctx, safeArgs);
      case "danh_ba_base":
        return await toolDanhBaBase(ctx, safeArgs);
      case "soan_viec_giao":
        return await toolSoanViecGiao(ctx, safeArgs);
      case "tim_kiem_web":
        return await toolTimKiemWeb(ctx, safeArgs);
      default:
        return { ok: false, summary: `Công cụ "${spec.name}" chưa được cài đặt.` };
    }
  } catch (e) {
    // Lưới an toàn cuối cùng — không để lỗi lạ làm hỏng cả lượt chat
    return {
      ok: false,
      summary: `Lỗi khi chạy "${spec.name}": ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}
