// ============================================================
// luat/luat-mau.ts — BỘ LUẬT MẪU MẶC ĐỊNH cho các mẫu báo cáo thật (Form 0–8 của anh Đại, Form 9 Phòng Cơ điện). Chủ: agent luat-mau.
// luat/hat-giong.ts (agent luat-loi) gieo mỗi mã MỘT lần; quản trị sửa/tắt/xóa thoải mái sau đó.
//
// Nguyên tắc: "code giữ cửa, AI góp ý". Ưu tiên DẠNG LUẬT CODE (loai-luat.ts) — chạy chắc, không tốn AI;
// phép tính giữa các cột (Lệch = TH − KH, % = A ÷ B, Tổng = cộng cột) dùng dạng tinh_toan; dòng TỔNG = tổng các dòng dùng
// dong_tong (loai/tinh-toan.ts). Luật cần hiểu nghĩa ("có định lượng", khớp hai mục, ghi chú nêu lý do) là luật AI.
// Mức thận trọng: chỉ 'chan' khi chắc chắn là lỗi thật (ngày lập trước kỳ, % tiến độ ngoài 0–100); luật tính toán để
// cảnh báo/gợi ý — đã chạy trên số liệu thật của 9 mẫu và báo cáo ví dụ (mau-word/vi-du) mà không báo sai.
// KHÔNG lặp 9 luật hệ thống (cau-hinh/mac-dinh.ts): ngày dd/mm/yyyy, bắt đầu ≤ kết thúc, phụ trách nhận ra được,
// ô bắt buộc, kỳ báo cáo, nơi nhận, việc trùng sổ cái, mục trống / "......" — đã có sẵn.
// Bảng/cột trỏ tới đều có trong mau-word/dinh-nghia.json (bảng số liệu gắn mã từ phiên bản mẫu 3 —
// scripts/chuyen-mau-that.mjs BANG_SO_LIEU). Danh sách cho bố và anh Đại duyệt: docs/LUAT-MAU.md.
// ============================================================
import type { DieuKien, LuatNhap, MucLuat, ThamChieu } from "./types";

const F = (...so: number[]) => so.map((n) => `form-${n}`);
/** Mẫu có chương việc "KẾT QUẢ VÀ KẾ HOẠCH VIỆC TUẦN/THÁNG TỚI" (bảng bang_cong_viec) — mọi mẫu từ phiên bản mẫu 4. */
const CO_BANG_CONG_VIEC = F(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11);
/** Mẫu cấp phòng (mức độ kiến nghị theo việc cần làm) và mẫu đơn vị (mức độ rủi ro Cao/TB/Thấp). */
const MAU_PHONG = F(1, 2, 3, 4, 9);
/** Form 10 (Ban điều hành tổng thầu) = Form 7 bỏ GPMB: dùng chung luật Form 7 trừ luật GPMB.
 *  Form 11 (Ban điều hành dự án Loại khác gửi SCI E&C, Mr. Đại chốt 20/10/2026) = Form 10 đổi nơi nhận: dùng chung luật Form 10. */
const MAU_DON_VI = F(5, 6, 7, 8, 10, 11);

const o = (tag: string): ThamChieu => ({ o: tag });
const c = (bang: string, cot: string): ThamChieu => ({ bang, cot });
const dk = (tham_chieu: ThamChieu, phep: DieuKien["phep"], gia_tri?: string | number): DieuKien =>
  gia_tri === undefined ? { tham_chieu, phep } : { tham_chieu, phep, gia_tri };

type Chung = { ma: string; ten: string; cau_luat: string; mo_ta: string; ap_dung: string[] | "tat_ca"; muc: MucLuat; nhom: string };

/** Luật code: dạng luật + tham số. */
function code(l: Chung & { loai: string; tham_so: Record<string, unknown> }): Omit<LuatNhap, "thu_tu"> {
  return { ...l, cach_kiem: "code", huong_dan_ai: null, khi_ai_loi: "cho_gui", bat: true };
}

/** Luật AI: câu hướng dẫn cho AI (kết luận đạt/không đạt, nêu đúng dòng/cột). Không bao giờ chặn khi AI lỗi. */
function ai(l: Chung & { huong_dan_ai: string }): Omit<LuatNhap, "thu_tu"> {
  return { ...l, cach_kiem: "ai", loai: null, tham_so: null, khi_ai_loi: "cho_gui", bat: true };
}

const NHOM = {
  ngay: "Kỳ và ngày nộp",
  viec: "Bảng Công việc",
  kien_nghi: "Kiến nghị & rủi ro",
  quyet_dinh: "Việc cần TGĐ quyết định",
  canh_bao: "Cảnh báo đầu tư – pháp lý",
  an_toan: "An toàn, môi trường",
  kpi: "KPI & sản lượng",
  tien_do: "Tiến độ",
  gpmb: "GPMB",
  tien: "Thu vốn, công nợ, tài chính",
  nhan_su: "Nhân sự & nhân lực",
  su_co: "Sự cố thiết bị",
} as const;

const DS: Omit<LuatNhap, "thu_tu">[] = [
  // ======================= MỌI MẪU: kỳ báo cáo và ngày nộp =======================
  // Mẫu bản 6 (Mr. Đại chốt 29/09/2026) bỏ ô Ngày lập / Người lập / chữ ký — "gửi lên là đã ký": so với NGÀY NỘP máy ghi.
  // Thay 2 luật "chung-ngay-lap-*" (so với ô Ngày lập) — hat-giong tự TẮT bản cũ nếu quản trị chưa sửa.
  code({
    ma: "chung-ky-bat-dau-truoc-ngay-nop",
    ten: "Kỳ báo cáo đã bắt đầu khi nộp",
    cau_luat: "Ngày đầu kỳ báo cáo không được sau ngày nộp báo cáo",
    mo_ta: "Nộp ngày 21/07 mà ghi kỳ tuần 31 (28/07–03/08) là nhầm số tuần/tháng. Nộp giữa tuần cho chính tuần đó (vd 18/07 cho tuần 14–20/07) vẫn đạt.",
    loai: "so_sanh_ngay",
    tham_so: { a: { ky: "tu" }, phep: "<=", b: { ky: "nop" } },
    ap_dung: "tat_ca",
    muc: "chan",
    nhom: NHOM.ngay,
  }),
  code({
    ma: "chung-ky-khong-qua-cu",
    ten: "Nộp không quá 10 ngày sau cuối kỳ",
    cau_luat: "Ngày nộp không được muộn hơn ngày cuối kỳ báo cáo quá 10 ngày",
    mo_ta: "Hạn nộp báo cáo tuần theo Cài đặt (thứ Bảy cùng tuần), báo cáo tháng đầu tháng sau. Nộp quá 10 ngày sau cuối kỳ thường là quên đổi kỳ báo cáo.",
    loai: "so_sanh_ngay",
    tham_so: { a: { ky: "nop" }, phep: "<=", b: { ky: "den" }, lech_ngay: 10 },
    ap_dung: "tat_ca",
    muc: "canh_bao",
    nhom: NHOM.ngay,
  }),
  // Luật AI "Ngày ký khớp ngày lập" (chung-ai-ngay-ky) BỎ 29/09/2026 — Mr. Đại: chỉ cần ngày báo cáo, gửi lên là đã ký.
  // (Đo trước khi bỏ: 2/2 file test luôn "không kết luận" vì doc-word cắt dòng "…, ngày … tháng … năm …" trước khi đưa AI.)
  // hat-giong tự TẮT bản đã gieo nếu quản trị chưa sửa.

  // ======================= MỌI MẪU: bảng Công việc =======================
  code({
    ma: "chung-viec-ket-qua-can-co",
    ten: "Việc có kết quả cần có",
    cau_luat: "Mỗi việc trong bảng Công việc nên ghi Kết quả cần có",
    mo_ta: "Kết quả cần có là căn cứ để người giao đánh giá việc đã xong hay chưa trong sổ cái.",
    loai: "cot_bat_buoc",
    tham_so: { bang: "bang_cong_viec", cot: "ket_qua_can_co" },
    ap_dung: CO_BANG_CONG_VIEC,
    muc: "goi_y",
    nhom: NHOM.viec,
  }),
  code({
    ma: "chung-viec-ket-thuc-tu-ngay-nop",
    ten: "Hạn việc không trước ngày nộp",
    cau_luat: "Ngày kết thúc của việc trong bảng Công việc không nên trước ngày nộp báo cáo",
    mo_ta: "Việc có hạn đã qua lúc nộp báo cáo: hoặc đã xong (chọn Tình trạng \"Đã xong\"), hoặc cần gia hạn — nhắc người lập xem lại.",
    loai: "so_sanh_ngay",
    tham_so: { a: c("bang_cong_viec", "ket_thuc"), phep: ">=", b: { ky: "nop" } },
    ap_dung: CO_BANG_CONG_VIEC,
    muc: "goi_y",
    nhom: NHOM.viec,
  }),
  // Hai luật "Mã việc đúng dạng" / "Mã việc không trùng" bỏ từ mẫu phiên bản 4 (29/09/2026): chương việc không còn cột Mã việc
  // (đo: 0/20 dòng đã vào sổ có ghi mã). hat-giong tự TẮT bản đã gieo nếu quản trị chưa sửa.

  // ======================= KIẾN NGHỊ & RỦI RO =======================
  code({
    ma: "chung-kien-nghi-co-noi-dung",
    ten: "Mỗi vấn đề có kiến nghị",
    cau_luat: "Mỗi dòng trong bảng Vấn đề nổi bật và kiến nghị lãnh đạo phải có nội dung kiến nghị",
    mo_ta: "Báo cáo phòng gửi TGĐ: vấn đề nêu ra phải kèm đề xuất xử lý.",
    loai: "cot_bat_buoc",
    tham_so: { bang: "bang_kien_nghi", cot: "kien_nghi" },
    ap_dung: MAU_PHONG,
    muc: "canh_bao",
    nhom: NHOM.kien_nghi,
  }),
  code({
    ma: "chung-muc-do-phong",
    ten: "Mức độ kiến nghị theo danh mục (phòng)",
    cau_luat: "Mức độ của vấn đề chỉ ghi: Khẩn cấp, Cần xử lý ngay, Cần quyết định, Cần phê duyệt, Cần sớm XL, Cần theo dõi, Theo dõi, Thông tin",
    mo_ta: "Danh mục lấy từ chính các mẫu Form 1–4 của anh Đại; ghi thống nhất để TGĐ lọc việc cần quyết.",
    loai: "thuoc_danh_sach",
    tham_so: {
      tham_chieu: c("bang_kien_nghi", "muc_do"),
      danh_sach: ["Khẩn cấp", "Cần xử lý ngay", "Cần quyết định", "Cần phê duyệt", "Cần sớm XL", "Cần theo dõi", "Theo dõi", "Thông tin"],
      bo_dau: true,
    },
    ap_dung: MAU_PHONG,
    muc: "goi_y",
    nhom: NHOM.kien_nghi,
  }),
  code({
    ma: "chung-kien-nghi-nguon",
    ten: "Vấn đề ghi rõ nguồn",
    cau_luat: "Mỗi vấn đề trong bảng kiến nghị phải ghi Nguồn (đơn vị báo lên)",
    mo_ta: "Form 1, 2 tổng hợp từ các đơn vị cấp dưới; cột Nguồn cho biết hỏi lại ai.",
    loai: "cot_bat_buoc",
    tham_so: { bang: "bang_kien_nghi", cot: "nguon" },
    ap_dung: F(1, 2, 9),
    muc: "goi_y",
    nhom: NHOM.kien_nghi,
  }),
  ai({
    ma: "chung-ai-kien-nghi-ro-viec",
    ten: "Kiến nghị nêu rõ ai quyết việc gì",
    cau_luat: "Vấn đề ở mức Cần quyết định, Cần phê duyệt hoặc Khẩn cấp thì kiến nghị phải nói rõ đề nghị ai quyết định việc gì",
    mo_ta: "Để TGĐ đọc là biết phải quyết gì, không phải hỏi lại.",
    huong_dan_ai:
      "Xét từng dòng bảng bang_kien_nghi có cột muc_do là “Cần quyết định”, “Cần phê duyệt”, “Khẩn cấp” hoặc “Cần xử lý ngay”. " +
      "Không đạt nếu cột kien_nghi chỉ nêu chung chung (vd “đề nghị xem xét”, “báo cáo để biết”) mà không nói rõ: đề nghị AI " +
      "(TGĐ, phòng nào) quyết định/phê duyệt/làm VIỆC GÌ cụ thể (số tiền, phương án, văn bản). Các mức khác bỏ qua. " +
      "Thông điệp chỉ ra dòng (số thứ tự) và nên bổ sung gì.",
    ap_dung: MAU_PHONG,
    muc: "goi_y",
    nhom: NHOM.kien_nghi,
  }),
  code({
    ma: "chung-rui-ro-cao-co-kien-nghi",
    ten: "Rủi ro mức Cao phải có kiến nghị",
    cau_luat: "Rủi ro có mức độ Cao phải có kiến nghị",
    mo_ta: "Rủi ro Cao mà không kiến nghị thì phòng nhận (ĐT&PC, KT&VH) không biết cần hỗ trợ gì.",
    loai: "neu_thi",
    tham_so: { neu: dk(c("bang_kien_nghi", "muc_do"), "bang", "Cao"), thi: dk(c("bang_kien_nghi", "kien_nghi"), "co_gia_tri") },
    ap_dung: MAU_DON_VI,
    muc: "canh_bao",
    nhom: NHOM.kien_nghi,
  }),
  code({
    ma: "chung-rui-ro-khac-co-kien-nghi",
    ten: "Rủi ro mức khác nên có kiến nghị",
    cau_luat: "Rủi ro mức Trung bình, Thấp cũng nên có kiến nghị",
    mo_ta: "Như luật mức Cao nhưng chỉ nhắc (gợi ý), để không báo trùng hai lần một dòng.",
    loai: "neu_thi",
    tham_so: { neu: dk(c("bang_kien_nghi", "muc_do"), "khac", "Cao"), thi: dk(c("bang_kien_nghi", "kien_nghi"), "co_gia_tri") },
    ap_dung: MAU_DON_VI,
    muc: "goi_y",
    nhom: NHOM.kien_nghi,
  }),
  code({
    ma: "chung-muc-do-don-vi",
    ten: "Mức độ rủi ro: Cao / Trung bình / Thấp",
    cau_luat: "Mức độ rủi ro chỉ ghi Cao, Trung bình (TB) hoặc Thấp",
    mo_ta: "Form 5–8 dùng Cao/Trung bình/TB; ghi thống nhất để lọc rủi ro Cao.",
    loai: "thuoc_danh_sach",
    tham_so: { tham_chieu: c("bang_kien_nghi", "muc_do"), danh_sach: ["Cao", "Trung bình", "TB", "Thấp"], bo_dau: true },
    ap_dung: MAU_DON_VI,
    muc: "goi_y",
    nhom: NHOM.kien_nghi,
  }),

  // ======================= FORM 0 — BÁO CÁO HỢP NHẤT TRÌNH TGĐ =======================
  code({
    ma: "f0-han-qd-tu-ngay-nop",
    ten: "Hạn quyết định không trước ngày nộp",
    cau_luat: "Hạn quyết định của việc cần TGĐ quyết định không được trước ngày nộp báo cáo",
    mo_ta: "Việc trình TGĐ mà hạn đã qua lúc nộp báo cáo: ghi nhầm ngày, hoặc phải ghi rõ là việc quá hạn.",
    loai: "so_sanh_ngay",
    tham_so: { a: c("bang_quyet_dinh", "han_quyet_dinh"), phep: ">=", b: { ky: "nop" } },
    ap_dung: F(0),
    muc: "canh_bao",
    nhom: NHOM.quyet_dinh,
  }),
  code({
    ma: "f0-qd-co-phu-trach-trinh",
    ten: "Việc cần quyết định có phụ trách trình",
    cau_luat: "Mỗi việc cần TGĐ quyết định phải có đơn vị phụ trách trình",
    mo_ta: "Cột “Phụ trách (trình)” là nơi chuẩn bị tờ trình và nhận kết quả quyết định. (Đơn vị THỰC HIỆN sau quyết định do TGĐ chọn khi giao — luật hệ thống.)",
    loai: "cot_bat_buoc",
    tham_so: { bang: "bang_quyet_dinh", cot: "phu_trach" },
    ap_dung: F(0),
    muc: "canh_bao",
    nhom: NHOM.quyet_dinh,
  }),
  code({
    ma: "f0-qd-co-tai-lieu",
    ten: "Việc cần quyết định có tài liệu",
    cau_luat: "Mỗi việc cần TGĐ quyết định nên ghi tài liệu đã chuẩn bị",
    mo_ta: "TGĐ cần biết đã có tờ trình/dự thảo chưa trước khi quyết.",
    loai: "cot_bat_buoc",
    tham_so: { bang: "bang_quyet_dinh", cot: "tai_lieu" },
    ap_dung: F(0),
    muc: "goi_y",
    nhom: NHOM.quyet_dinh,
  }),
  code({
    ma: "f0-qd-uu-tien-khong-trung",
    ten: "Thứ tự ưu tiên không trùng",
    cau_luat: "Hai việc cần quyết định không được cùng số ưu tiên",
    mo_ta: "Ưu tiên 1, 2, 3… là thứ tự TGĐ xử lý.",
    loai: "khong_trung",
    tham_so: { bang: "bang_quyet_dinh", cot: "uu_tien" },
    ap_dung: F(0),
    muc: "goi_y",
    nhom: NHOM.quyet_dinh,
  }),
  code({
    ma: "f0-cong-no-con-lai-khong-am",
    ten: "Giá trị còn lại không âm",
    cau_luat: "Giá trị còn lại trong bảng Công nợ phải thu không được âm",
    mo_ta: "Giá trị còn lại âm nghĩa là đã xuất hóa đơn vượt giá trị hợp đồng — thường là số liệu sai.",
    loai: "khoang_so",
    tham_so: { tham_chieu: c("bang_cong_no", "con_lai"), tu: 0 },
    ap_dung: F(0),
    muc: "canh_bao",
    nhom: NHOM.tien,
  }),
  code({
    ma: "f0-cong-no-con-lai",
    ten: "Công nợ: còn lại = hợp đồng − đã xuất HĐ",
    cau_luat: "Giá trị còn lại bằng giá trị hợp đồng trừ giá trị đã xuất hóa đơn",
    mo_ta: "Trước đây là luật AI (f0-ai-cong-no). Số mẫu khớp: 1.850 − 1.650 = 200; dòng TỔNG 2.455 − 2.003 = 452. Cho lệch làm tròn ±1.",
    loai: "tinh_toan",
    tham_so: { ket_qua: c("bang_cong_no", "con_lai"), phep_tinh: "hieu", a: c("bang_cong_no", "gia_tri_hd"), b: c("bang_cong_no", "da_xuat_hd"), sai_so: 1 },
    ap_dung: F(0),
    muc: "canh_bao",
    nhom: NHOM.tien,
  }),
  code({
    ma: "f0-cong-no-dong-tong",
    ten: "Công nợ: dòng TỔNG = tổng các dự án",
    cau_luat: "Dòng TỔNG của bảng Công nợ phải thu bằng tổng các dự án ở mọi cột số",
    mo_ta: "Trước đây là luật AI (f0-ai-cong-no). “—” ở dòng dự án tính là 0 (Trong hạn: 40.951 + — + — = 40.951); dòng TỔNG ghi “—” thì bỏ qua cột đó.",
    loai: "dong_tong",
    tham_so: { bang: "bang_cong_no", cot_nhan: "du_an", nhan: ["TỔNG"], cot: ["gia_tri_hd", "da_xuat_hd", "con_lai", "do_dang", "no_trong_han", "no_qua_han"], sai_so: 1 },
    ap_dung: F(0),
    muc: "canh_bao",
    nhom: NHOM.tien,
  }),
  code({
    ma: "chung-canh-bao-tinh-trang",
    ten: "Hồ sơ cảnh báo có tình trạng hiện tại",
    cau_luat: "Mỗi hồ sơ / mốc pháp lý trong bảng Cảnh báo đầu tư phải ghi tình trạng hiện tại",
    mo_ta: "Bảng cảnh báo B1 (Form 0) / I (Form 1); dòng nhóm ĐẦU TƯ, TƯ VẤN… không tính.",
    loai: "cot_bat_buoc",
    tham_so: { bang: "bang_canh_bao", cot: "tinh_trang" },
    ap_dung: F(0, 1, 9),
    muc: "canh_bao",
    nhom: NHOM.canh_bao,
  }),
  ai({
    ma: "chung-ai-anh-huong-dinh-luong",
    ten: "Ảnh hưởng nếu trễ có định lượng",
    cau_luat: "Cột Ảnh hưởng nếu trễ phải có định lượng (số tiền, số ngày/tháng trễ, công suất…) hoặc ghi rõ không có rủi ro",
    mo_ta: "Tiêu đề cột của mẫu ghi rõ “(có định lượng)”.",
    huong_dan_ai:
      "Bảng bang_canh_bao, cột anh_huong, từng dòng có nội dung (bỏ dòng trống). Đạt nếu có ít nhất một con số định lượng " +
      "(tiền: tỷ/triệu đồng; thời gian: ngày/tuần/tháng/quý trễ, mốc COD; công suất MW; % …) HOẶC ghi rõ “không có rủi ro”/“không ảnh hưởng”. " +
      "Không đạt nếu chỉ mô tả định tính (vd “ảnh hưởng tiến độ”, “chậm dự án”). Nêu dòng (tên hồ sơ ở cột ho_so) cần bổ sung định lượng.",
    ap_dung: F(0, 1, 9),
    muc: "goi_y",
    nhom: NHOM.canh_bao,
  }),

  // ======================= FORM 0, 2 — AN TOÀN & KPI NHÀ MÁY =======================
  code({
    ma: "chung-an-toan-khong-am",
    ten: "Số sự cố tuần này không âm",
    cau_luat: "Số sự cố / sự kiện tuần này trong bảng cảnh báo an toàn phải là số từ 0 trở lên",
    mo_ta: "Cột “Tuần này” của bảng A0 (Form 0) / I (Form 2).",
    loai: "khoang_so",
    tham_so: { tham_chieu: c("bang_an_toan", "tuan_nay"), tu: 0 },
    ap_dung: F(0, 2, 9),
    muc: "canh_bao",
    nhom: NHOM.an_toan,
  }),
  code({
    ma: "chung-an-toan-co-hanh-dong",
    ten: "Có sự cố thì ghi hành động ngay",
    cau_luat: "Chỉ tiêu an toàn nào có số tuần này lớn hơn 0 thì phải ghi Ghi chú / Hành động ngay",
    mo_ta: "Mẫu ghi: “Ô Tuần này > 0 = cảnh báo cứng” — phải nói đã/đang làm gì.",
    loai: "neu_thi",
    tham_so: { neu: dk(c("bang_an_toan", "tuan_nay"), ">", 0), thi: dk(c("bang_an_toan", "ghi_chu"), "co_gia_tri") },
    ap_dung: F(0, 2),
    muc: "canh_bao",
    nhom: NHOM.an_toan,
  }),
  code({
    ma: "f9-an-toan-co-hanh-dong",
    ten: "Có sự cố thì ghi hành động ngay",
    cau_luat: "Chỉ tiêu an toàn điện / sự cố / kiểm định nào có số tuần này lớn hơn 0 thì phải ghi Ghi chú / Hành động ngay",
    mo_ta: "Form 9 (Phòng Cơ điện, mẫu SCI-160): cột cuối là “Ghi chú / Hành động ngay” — việc ghi ở đây kèm ngày sẽ vào sổ cái.",
    loai: "neu_thi",
    tham_so: { neu: dk(c("bang_an_toan", "tuan_nay"), ">", 0), thi: dk(c("bang_an_toan", "hanh_dong"), "co_gia_tri") },
    ap_dung: F(9),
    muc: "canh_bao",
    nhom: NHOM.an_toan,
  }),
  code({
    ma: "chung-an-toan-luy-ke-tu-tuan",
    ten: "Lũy kế năm không nhỏ hơn tuần này",
    cau_luat: "Lũy kế năm của từng chỉ tiêu an toàn không được nhỏ hơn số tuần này",
    mo_ta: "Trước đây là luật AI (chung-ai-an-toan-luy-ke). “1 sự kiện” đọc được là 1.",
    loai: "tinh_toan",
    tham_so: { ket_qua: c("bang_an_toan", "luy_ke_nam"), so_sanh: ">=", phep_tinh: "chi_a", a: c("bang_an_toan", "tuan_nay") },
    ap_dung: F(0, 2, 9),
    muc: "goi_y",
    nhom: NHOM.an_toan,
  }),
  code({
    ma: "chung-an-toan-dong-tong",
    ten: "Dòng tổng an toàn khớp các chỉ tiêu",
    cau_luat: "Dòng TỔNG của bảng cảnh báo an toàn bằng tổng các chỉ tiêu ở cột Tuần này và Lũy kế năm",
    mo_ta:
      "Trước đây là luật AI (chung-ai-an-toan-luy-ke). Form 0 có dòng “TỔNG TRẠNG THÁI TUẦN NÀY” (1 sự kiện; lũy kế 5); " +
      "Form 2 không có dòng tổng thì luật không báo gì.",
    loai: "dong_tong",
    tham_so: { bang: "bang_an_toan", cot_nhan: "chi_tieu", nhan: ["TỔNG"], cot: ["tuan_nay", "luy_ke_nam"] },
    ap_dung: F(0, 2),
    muc: "goi_y",
    nhom: NHOM.an_toan,
  }),
  code({
    ma: "chung-kpi-tinh-trang",
    ten: "Tình trạng KPI theo danh mục",
    cau_luat: "Tình trạng KPI nhà máy chỉ ghi Bình thường, Chú ý hoặc Cảnh báo",
    mo_ta: "Ba mức đang dùng trong mẫu Form 0, Form 2.",
    loai: "thuoc_danh_sach",
    tham_so: { tham_chieu: c("bang_kpi", "tinh_trang"), danh_sach: ["Bình thường", "Chú ý", "Cảnh báo"], bo_dau: true },
    ap_dung: F(0, 2),
    muc: "goi_y",
    nhom: NHOM.kpi,
  }),
  code({
    ma: "chung-kpi-kh-khong-am",
    ten: "Kế hoạch tháng không âm",
    cau_luat: "Kế hoạch tháng của KPI sản lượng, doanh thu nhà máy không được âm",
    mo_ta: "Cột “KH tháng” của bảng KPI (dòng tên nhà máy là dòng nhóm, không tính).",
    loai: "khoang_so",
    tham_so: { tham_chieu: c("bang_kpi", "kh_thang"), tu: 0 },
    ap_dung: F(0, 2),
    muc: "canh_bao",
    nhom: NHOM.kpi,
  }),
  ai({
    ma: "chung-ai-kpi-tinh-trang",
    ten: "Tình trạng KPI khớp % đạt kế hoạch",
    cau_luat: "KPI đạt dưới 92% kế hoạch thì tình trạng không được ghi Bình thường",
    mo_ta: "Ngưỡng 92% suy từ số liệu mẫu (91,8% → Cảnh báo; 94,8% → Chú ý) — cần anh Đại chốt ngưỡng.",
    huong_dan_ai:
      "Bảng bang_kpi (cột nhom là tên nhà máy). Mỗi dòng có một con số “…% KH” (trong mẫu hiện nằm ở cột mat_agc_tuan) là mức đạt kế hoạch. " +
      "Không đạt nếu mức đạt dưới 92% KH mà tinh_trang là “Bình thường”. Dòng không có “% KH” thì bỏ qua. " +
      "Nêu nhà máy, KPI, % KH và tình trạng đang ghi.",
    ap_dung: F(0, 2),
    muc: "goi_y",
    nhom: NHOM.kpi,
  }),

  // ======================= FORM 3 — HÀNH CHÍNH TỔNG HỢP =======================
  code({
    ma: "f3-nhan-su-cuoi-ky",
    ten: "Có số nhân sự cuối kỳ",
    cau_luat: "Mỗi dòng bảng Tổng hợp nhân sự phải ghi số nhân sự cuối tuần",
    mo_ta: "Bảng danh mục cố định (SCI, SCI Năng Lượng, SCI Tư Vấn, Tổng cộng): mẫu trắng giữ tên dòng, người lập điền số.",
    loai: "cot_bat_buoc",
    tham_so: { bang: "bang_nhan_su", cot: "cuoi_ky" },
    ap_dung: F(3),
    muc: "canh_bao",
    nhom: NHOM.nhan_su,
  }),
  code({
    ma: "f3-nhan-su-khong-am",
    ten: "Số nhân sự không âm",
    cau_luat: "Số nhân sự cuối tuần phải là số từ 0 trở lên",
    mo_ta: "Cột Biến động mới được âm; số người thì không.",
    loai: "khoang_so",
    tham_so: { tham_chieu: c("bang_nhan_su", "cuoi_ky"), tu: 0 },
    ap_dung: F(3),
    muc: "canh_bao",
    nhom: NHOM.nhan_su,
  }),
  code({
    ma: "f3-bien-dong",
    ten: "Biến động = cuối kỳ − đầu kỳ",
    cau_luat: "Biến động nhân sự bằng số cuối tuần trừ số đầu tuần",
    mo_ta: "Trước đây là luật AI (f3-ai-bien-dong). Ghi “+1”, “0”, “−2” đều đọc được. Số người là số nguyên nên không đặt sai số.",
    loai: "tinh_toan",
    tham_so: { ket_qua: c("bang_nhan_su", "bien_dong"), phep_tinh: "hieu", a: c("bang_nhan_su", "cuoi_ky"), b: c("bang_nhan_su", "dau_ky") },
    ap_dung: F(3),
    muc: "canh_bao",
    nhom: NHOM.nhan_su,
  }),
  code({
    ma: "f3-tong-cong",
    ten: "Tổng cộng nhân sự = tổng các công ty",
    cau_luat: "Dòng Tổng cộng của bảng nhân sự bằng tổng các công ty ở cột KH năm, đầu tuần, cuối tuần, biến động",
    mo_ta: "Trước đây là luật AI (f3-ai-bien-dong). Số mẫu khớp: 45 + 120 + 28 = 193; 43 + 118 + 27 = 188.",
    loai: "dong_tong",
    tham_so: { bang: "bang_nhan_su", cot_nhan: "chi_tieu", nhan: ["TỔNG CỘNG", "TỔNG"], cot: ["kh_nam", "dau_ky", "cuoi_ky", "bien_dong"] },
    ap_dung: F(3),
    muc: "canh_bao",
    nhom: NHOM.nhan_su,
  }),
  ai({
    ma: "f3-ai-vuot-kh-nam",
    ten: "Nhân sự vượt KH năm phải nêu lý do",
    cau_luat: "Công ty có số nhân sự cuối tuần vượt kế hoạch năm thì ghi chú phải nêu lý do",
    mo_ta: "Phần còn lại của luật AI f3-ai-bien-dong (phép tính đã chuyển sang code): cần hiểu ghi chú có nêu lý do không.",
    huong_dan_ai:
      "Bảng bang_nhan_su: xét từng dòng công ty (bỏ dòng “TỔNG CỘNG”). Nếu cuoi_ky lớn hơn kh_nam mà ghi_chu để trống, “—” hoặc không nêu " +
      "lý do (tuyển thêm cho dự án nào, được duyệt bổ sung…) thì không đạt. cuoi_ky không vượt kh_nam thì đạt. Nêu công ty, hai số và ghi chú đang ghi.",
    ap_dung: F(3),
    muc: "canh_bao",
    nhom: NHOM.nhan_su,
  }),

  // ======================= FORM 4 — TÀI CHÍNH KẾ TOÁN =======================
  code({
    ma: "f4-ke-hoach-khong-am",
    ten: "Kế hoạch năm của khoản mục không âm",
    cau_luat: "Kế hoạch năm của các khoản chi phí, doanh thu trong bảng Chi phí giá thành không được âm",
    mo_ta: "Chỉ kiểm cột Kế hoạch năm: cột Tháng, Lũy kế của mẫu dùng “—” cho khoản không phát sinh.",
    loai: "khoang_so",
    tham_so: { tham_chieu: c("bang_chi_phi", "ke_hoach"), tu: 0 },
    ap_dung: F(4),
    muc: "canh_bao",
    nhom: NHOM.tien,
  }),
  ai({
    ma: "f4-ai-tien-khong-am",
    ten: "Khoản tiền không thể âm thì không âm",
    cau_luat: "Tiền mặt, tiền gửi, phải thu, dư nợ vay, chi phí, doanh thu không được âm; chỉ dòng cân đối nguồn, VLĐ và lợi nhuận mới được âm",
    mo_ta: "Bảng Nguồn tiền có 8 cột đơn vị × ~50 dòng, dòng nào được âm phải hiểu nghĩa — để AI kiểm.",
    huong_dan_ai:
      "Bảng bang_nguon_tien (cột noi_dung là khoản mục; các cột sci, sci_nang_luong, sci_tu_van, sci_quang_tri, sci_lai_chau, sci_nghe_an, " +
      "huong_linh_7, huong_linh_8 là số triệu đồng) và bảng bang_chi_phi (cột thang, luy_ke, ke_hoach). “—” là không phát sinh. " +
      "Không đạt nếu có số ÂM (dấu −, - hoặc trong ngoặc) ở khoản: nguồn hiện có, tiền mặt, tiền gửi, phải thu, dự kiến thu/chi, dư nợ vay, " +
      "lãi vay, lương, thuế, chi phí, doanh thu. ĐƯỢC âm: dòng “CÂN ĐỐI NGUỒN”, “VLĐ”, “LỢI NHUẬN”. Nêu khoản mục, đơn vị (cột) và số.",
    ap_dung: F(4),
    muc: "canh_bao",
    nhom: NHOM.tien,
  }),
  ai({
    ma: "f4-ai-can-doi-nguon",
    ten: "Cân đối nguồn = hiện có + dự kiến thu − dự kiến chi",
    cau_luat: "Cân đối nguồn của từng đơn vị bằng nguồn hiện có cộng dự kiến thu trừ dự kiến chi; bảng tóm tắt khớp bảng chi tiết",
    mo_ta: "Số liệu mẫu khớp công thức (lệch làm tròn 1 tr.đ).",
    huong_dan_ai:
      "Bảng bang_nguon_tien, với từng cột đơn vị: dòng “CÂN ĐỐI NGUỒN” phải bằng dòng “I NGUỒN HIỆN CÓ” + dòng “II NGUỒN DỰ KIẾN THU” − " +
      "dòng “III NGUỒN DỰ KIẾN CHI” (“—” = 0; cho lệch làm tròn ±2 triệu). Mục I “TÓM TẮT THÔNG TIN CHÍNH”: “Tổng nguồn tiền hiện có” phải " +
      "bằng tổng dòng NGUỒN HIỆN CÓ của các đơn vị (±2). Số kiểu Việt Nam: 673.396 = sáu trăm bảy mươi ba nghìn… Nêu đơn vị, số đang ghi, số tính ra.",
    ap_dung: F(4),
    muc: "canh_bao",
    nhom: NHOM.tien,
  }),
  code({
    ma: "f4-chi-phi-pt-ht",
    ten: "% hoàn thành = lũy kế ÷ kế hoạch năm",
    cau_luat: "Trong bảng Chi phí giá thành, % hoàn thành bằng lũy kế chia kế hoạch năm nhân 100",
    mo_ta:
      "Trước đây là luật AI (f4-ai-chi-phi-hoan-thanh). Mẫu làm tròn đến 1% (42.378 ÷ 82.316 = 51,5% ghi 51%) nên cho lệch ±1. " +
      "Vượt 100% (doanh thu tài chính 112%) không phải lỗi nếu phép chia đúng.",
    loai: "tinh_toan",
    tham_so: { ket_qua: c("bang_chi_phi", "pt_ht"), phep_tinh: "phan_tram", a: c("bang_chi_phi", "luy_ke"), b: c("bang_chi_phi", "ke_hoach"), sai_so: 1 },
    ap_dung: F(4),
    muc: "goi_y",
    nhom: NHOM.tien,
  }),
  code({
    ma: "f4-chi-phi-luy-ke-tu-thang",
    ten: "Lũy kế chi phí không nhỏ hơn tháng",
    cau_luat: "Trong bảng Chi phí giá thành, số lũy kế không được nhỏ hơn số của tháng",
    mo_ta: "Trước đây là luật AI (f4-ai-chi-phi-hoan-thanh). Tháng ghi “—” tính là 0. Dòng Lợi nhuận có thể lỗ các tháng trước nên chỉ gợi ý.",
    loai: "tinh_toan",
    tham_so: { ket_qua: c("bang_chi_phi", "luy_ke"), so_sanh: ">=", phep_tinh: "chi_a", a: c("bang_chi_phi", "thang"), trong_la_0: true },
    ap_dung: F(4),
    muc: "goi_y",
    nhom: NHOM.tien,
  }),

  // ======================= FORM 5 — SCI PMC =======================
  code({
    ma: "f5-pt-ht-0-100",
    ten: "% hoàn thành thiết kế từ 0 đến 100",
    cau_luat: "% hoàn thành của hạng mục thiết kế phải từ 0 đến 100",
    mo_ta: "Phần trăm hoàn thành ngoài 0–100 chắc chắn là ghi sai.",
    loai: "khoang_so",
    tham_so: { tham_chieu: c("bang_tien_do_tk", "pt_ht"), tu: 0, den: 100 },
    ap_dung: F(5),
    muc: "chan",
    nhom: NHOM.tien_do,
  }),
  code({
    ma: "f5-tien-do-tk-co-ngay",
    ten: "Hạng mục thiết kế có ngày kế hoạch",
    cau_luat: "Mỗi hạng mục thiết kế nên ghi ngày kế hoạch hoàn thành (chưa có thì ghi “—”)",
    mo_ta: "Để theo dõi trễ hạn; mẫu dùng “—” cho hạng mục chưa có ngày.",
    loai: "cot_bat_buoc",
    tham_so: { bang: "bang_tien_do_tk", cot: "ngay_ke_hoach" },
    ap_dung: F(5),
    muc: "goi_y",
    nhom: NHOM.tien_do,
  }),
  code({
    ma: "f5-tien-do-tk-co-dong",
    ten: "Có tiến độ thiết kế",
    cau_luat: "Bảng Tiến độ chi tiết công tác thiết kế phải có ít nhất một hạng mục",
    mo_ta: "Mục chính của báo cáo SCI PMC.",
    loai: "bang_toi_thieu",
    tham_so: { bang: "bang_tien_do_tk", so_dong: 1 },
    ap_dung: F(5),
    muc: "canh_bao",
    nhom: NHOM.tien_do,
  }),
  ai({
    ma: "f5-ai-thiet-ke-tre-han-ky", // đổi mã 29/09/2026 (mẫu bản 6 bỏ ô Ngày lập): so với ngày cuối kỳ báo cáo
    ten: "Hạng mục trễ hạn phải nêu lý do",
    cau_luat: "Hạng mục thiết kế chưa xong mà ngày kế hoạch đã qua ngày cuối kỳ báo cáo thì ghi chú phải nêu lý do và biện pháp",
    mo_ta: "Cần so hai điều kiện (% < 100 và ngày đã qua) và hiểu ghi chú — để AI kiểm.",
    huong_dan_ai:
      "Bảng bang_tien_do_tk: dòng có pt_ht < 100% và ngay_ke_hoach là ngày TRƯỚC ngày cuối kỳ báo cáo (ngày thiếu năm lấy năm của kỳ báo cáo; “—” bỏ qua) là hạng mục trễ. " +
      "Không đạt nếu ghi_chu của dòng trễ không nêu lý do trễ hoặc biện pháp / ngày hoàn thành mới. Nêu hạng mục, ngày kế hoạch, % HT.",
    ap_dung: F(5),
    muc: "goi_y",
    nhom: NHOM.tien_do,
  }),
  code({
    ma: "chung-du-an-trang-thai",
    ten: "Dự án có trạng thái",
    cau_luat: "Mỗi dự án trong bảng Tổng quan các dự án phải ghi trạng thái",
    mo_ta: "Form 6 “Trạng thái tổng thể” (Form 5 bỏ bảng dự án từ mẫu tuần 20/10/2026).",
    loai: "cot_bat_buoc",
    tham_so: { bang: "bang_du_an", cot: "trang_thai" },
    ap_dung: F(6),
    muc: "canh_bao",
    nhom: NHOM.tien_do,
  }),

  // ======================= FORM 6 — SCI E&C (BÁO CÁO TUẦN từ 20/10/2026) =======================
  // Mr. Đại chốt 20/10/2026: Form 6 thành báo cáo TUẦN, chỉ 3 chương (Tổng quan các dự án · Vấn đề nổi bật · Kết quả và kế hoạch
  // việc tuần tới). Bỏ 13 luật riêng của 3 bảng đã xoá (tiến độ thi công · thu vốn · nhân lực & ATLĐ) — hat-giong tự TẮT bản
  // đã gieo nếu quản trị chưa sửa. Còn áp: luật chung (chung-*), luật MAU_DON_VI, chung-du-an-trang-thai.

  // ======================= FORM 7 — BQLDA QUẢNG TRỊ =======================
  code({
    ma: "f7-kh-luy-ke-0-100",
    ten: "KH lũy kế từ 0 đến 100%",
    cau_luat: "KH lũy kế trong bảng Tiến độ tổng thể phải từ 0 đến 100%",
    mo_ta: "Phần trăm kế hoạch lũy kế ngoài 0–100 chắc chắn là ghi sai.",
    loai: "khoang_so",
    tham_so: { tham_chieu: c("bang_tien_do", "kh_luy_ke"), tu: 0, den: 100 },
    ap_dung: F(7, 10, 11),
    muc: "chan",
    nhom: NHOM.tien_do,
  }),
  code({
    ma: "f7-th-luy-ke-0-100",
    ten: "% tiến độ lũy kế từ 0 đến 100",
    cau_luat: "% tiến độ thực hiện lũy kế trong bảng Tiến độ tổng thể phải từ 0 đến 100",
    mo_ta: "Phần trăm thực hiện lũy kế ngoài 0–100 chắc chắn là ghi sai.",
    loai: "khoang_so",
    tham_so: { tham_chieu: c("bang_tien_do", "th_luy_ke"), tu: 0, den: 100 },
    ap_dung: F(7, 10, 11),
    muc: "chan",
    nhom: NHOM.tien_do,
  }),
  code({
    ma: "f7-lech",
    ten: "Lệch = TH − KH",
    cau_luat: "Cột Lệch của bảng Tiến độ tổng thể bằng TH lũy kế trừ KH lũy kế",
    mo_ta: "Trước đây là luật AI (f7-ai-lech). Lệch theo điểm %: 41,5% − 44,2% = −2,7%; 68% − 65% = +3%. Cho lệch ±0,1.",
    loai: "tinh_toan",
    tham_so: { ket_qua: c("bang_tien_do", "lech"), phep_tinh: "hieu", a: c("bang_tien_do", "th_luy_ke"), b: c("bang_tien_do", "kh_luy_ke"), sai_so: 0.1 },
    ap_dung: F(7, 10, 11),
    muc: "canh_bao",
    nhom: NHOM.tien_do,
  }),
  ai({
    ma: "f7-ai-thong-tin-chung-khop",
    ten: "Tiến độ ở Thông tin chung khớp bảng tiến độ",
    cau_luat: "Tiến độ lũy kế (vs KH) ở mục Thông tin chung dự án phải khớp dòng Tổng tiến độ dự án",
    mo_ta: "Hai mục ghi cùng một số (41,5% / KH 44,2% / lệch −2,7%) — hay quên sửa một bên.",
    huong_dan_ai:
      "Mục I “THÔNG TIN CHUNG DỰ ÁN” có ô “Tiến độ lũy kế (vs KH)” dạng “41,5% (KH: 44,2%) — lệch -2,7%”. Bảng bang_tien_do có dòng " +
      "“TỔNG TIẾN ĐỘ DỰ ÁN”. Không đạt nếu TH, KH hoặc mức lệch ở hai nơi khác nhau. Nêu cả hai bộ số.",
    ap_dung: F(7, 10, 11),
    muc: "canh_bao",
    nhom: NHOM.tien_do,
  }),
  ai({
    ma: "f7-ai-tinh-trang-tong-the",
    ten: "Tình trạng tổng thể phù hợp mức lệch",
    cau_luat: "Tình trạng tổng thể không được ghi đúng tiến độ khi thực hiện chậm hơn kế hoạch quá 2%",
    mo_ta: "Mẫu gốc đang ghi “đúng tiến độ” với lệch −2,7% — cần anh Đại chốt ngưỡng (2%?).",
    huong_dan_ai:
      "Mục I “THÔNG TIN CHUNG DỰ ÁN”, ô “Tình trạng tổng thể”. Lấy mức lệch của dòng “TỔNG TIẾN ĐỘ DỰ ÁN” (bảng bang_tien_do, cột lech). " +
      "Không đạt nếu tình trạng ghi “đúng tiến độ”/“vượt tiến độ” mà lệch âm quá 2 điểm % (vd −2,7%). Nêu tình trạng đang ghi và mức lệch.",
    ap_dung: F(7, 10, 11),
    muc: "goi_y",
    nhom: NHOM.tien_do,
  }),
  code({
    ma: "f7-kl-pt-dat-0-100",
    ten: "% đạt khối lượng từ 0 đến 100",
    cau_luat: "% đạt được của khối lượng thi công phải từ 0 đến 100",
    mo_ta: "Vượt 100% là thực hiện vượt khối lượng thiết kế — có thể do phát sinh, nên chỉ cảnh báo.",
    loai: "khoang_so",
    tham_so: { tham_chieu: c("bang_khoi_luong", "pt_dat"), tu: 0, den: 100 },
    ap_dung: F(7, 10, 11),
    muc: "canh_bao",
    nhom: NHOM.tien_do,
  }),
  code({
    ma: "f7-kl-pt-dat",
    ten: "% đạt = KL thực hiện ÷ KL thiết kế",
    cau_luat: "% đạt được bằng khối lượng thực hiện lũy kế chia khối lượng thiết kế nhân 100",
    mo_ta: "Trước đây là luật AI (f7-ai-khoi-luong). Số mẫu khớp: 3.150 ÷ 3.200 = 98,4%. Cho lệch ±0,2.",
    loai: "tinh_toan",
    tham_so: { ket_qua: c("bang_khoi_luong", "pt_dat"), phep_tinh: "phan_tram", a: c("bang_khoi_luong", "kl_thuc_hien"), b: c("bang_khoi_luong", "kl_thiet_ke"), sai_so: 0.2 },
    ap_dung: F(7, 10, 11),
    muc: "canh_bao",
    nhom: NHOM.tien_do,
  }),
  ai({
    ma: "f7-ai-kl-vuot-thiet-ke",
    ten: "Vượt khối lượng thiết kế phải giải thích",
    cau_luat: "Công việc có khối lượng thực hiện vượt khối lượng thiết kế thì ghi chú phải giải thích",
    mo_ta: "Phần còn lại của luật AI f7-ai-khoi-luong (phép chia đã chuyển sang code): cần hiểu ghi chú có giải thích không.",
    huong_dan_ai:
      "Bảng bang_khoi_luong: công việc có kl_thuc_hien lớn hơn kl_thiet_ke (số kiểu Việt Nam: 3.200 = ba nghìn hai trăm) thì ghi_chu phải " +
      "giải thích vì sao vượt (phát sinh, điều chỉnh thiết kế, phụ lục…). Không vượt thì đạt. Nêu công việc, hai khối lượng và ghi chú đang ghi.",
    ap_dung: F(7, 10, 11),
    muc: "canh_bao",
    nhom: NHOM.tien_do,
  }),
  code({
    ma: "f7-gpmb-co-tinh-trang",
    ten: "Khu vực GPMB có tình trạng",
    cau_luat: "Mỗi khu vực / hộ dân trong bảng GPMB phải ghi tình trạng",
    mo_ta: "Tình trạng là cột TGĐ và P.ĐT&PC đọc đầu tiên.",
    loai: "cot_bat_buoc",
    tham_so: { bang: "bang_gpmb", cot: "tinh_trang" },
    ap_dung: F(7),
    muc: "canh_bao",
    nhom: NHOM.gpmb,
  }),
  code({
    ma: "f7-gpmb-tinh-trang-danh-muc",
    ten: "Tình trạng GPMB theo danh mục",
    cau_luat: "Tình trạng GPMB chỉ ghi: Chưa triển khai, Đang kiểm đếm, Đang thương lượng, Chờ văn bản, Khiếu nại, Đã thỏa thuận, Đã chi trả, Đã bàn giao",
    mo_ta: "Mẫu có Khiếu nại, Chờ văn bản, Đã thỏa thuận; các mức còn lại là đề xuất — cần anh Đại chốt.",
    loai: "thuoc_danh_sach",
    tham_so: {
      tham_chieu: c("bang_gpmb", "tinh_trang"),
      danh_sach: ["Chưa triển khai", "Đang kiểm đếm", "Đang thương lượng", "Chờ văn bản", "Khiếu nại", "Đã thỏa thuận", "Đã chi trả", "Đã bàn giao"],
      bo_dau: true,
    },
    ap_dung: F(7),
    muc: "goi_y",
    nhom: NHOM.gpmb,
  }),
  code({
    ma: "f7-gpmb-khieu-nai-vuong-mac",
    ten: "Khiếu nại GPMB phải ghi vướng mắc",
    cau_luat: "Khu vực GPMB đang khiếu nại thì phải ghi rõ vướng mắc",
    mo_ta: "Vd “Hộ dân yêu cầu 500.000đ/m² — chênh lệch 43%”.",
    loai: "neu_thi",
    tham_so: { neu: dk(c("bang_gpmb", "tinh_trang"), "bang", "Khiếu nại"), thi: dk(c("bang_gpmb", "vuong_mac"), "co_gia_tri") },
    ap_dung: F(7),
    muc: "canh_bao",
    nhom: NHOM.gpmb,
  }),
  code({
    ma: "f7-rui-ro-cao-anh-huong",
    ten: "Rủi ro Cao phải ghi ảnh hưởng",
    cau_luat: "Rủi ro mức độ Cao phải ghi rõ ảnh hưởng",
    mo_ta: "Bảng rủi ro Form 7 có cột Ảnh hưởng (vd “chậm 3–6 tuần phát điện”).",
    loai: "neu_thi",
    tham_so: { neu: dk(c("bang_kien_nghi", "muc_do"), "bang", "Cao"), thi: dk(c("bang_kien_nghi", "anh_huong"), "co_gia_tri") },
    ap_dung: F(7, 10, 11),
    muc: "canh_bao",
    nhom: NHOM.kien_nghi,
  }),

  // ======================= FORM 8 — NHÀ MÁY THỦY ĐIỆN NẬM XE =======================
  code({
    ma: "f8-gio-van-hanh-tuan",
    ten: "Giờ vận hành tuần không quá 168 giờ",
    cau_luat: "Giờ vận hành trong tuần không được vượt 168 giờ",
    mo_ta: "Một tuần có 168 giờ. Nếu nhà máy cộng giờ của nhiều tổ máy thì cần đổi ngưỡng.",
    loai: "neu_thi",
    tham_so: { neu: dk(c("bang_san_luong", "chi_tieu"), "chua", "giờ vận hành"), thi: dk(c("bang_san_luong", "tuan_th"), "<=", 168) },
    ap_dung: F(8),
    muc: "canh_bao",
    nhom: NHOM.kpi,
  }),
  code({
    ma: "f8-gio-van-hanh-thang",
    ten: "Giờ vận hành lũy kế tháng không quá 744 giờ",
    cau_luat: "Giờ vận hành lũy kế tháng không được vượt 744 giờ",
    mo_ta: "Tháng dài nhất 31 ngày × 24 giờ = 744 giờ.",
    loai: "neu_thi",
    tham_so: { neu: dk(c("bang_san_luong", "chi_tieu"), "chua", "giờ vận hành"), thi: dk(c("bang_san_luong", "thang_lk"), "<=", 744) },
    ap_dung: F(8),
    muc: "canh_bao",
    nhom: NHOM.kpi,
  }),
  code({
    ma: "f8-san-luong-khong-am",
    ten: "Sản lượng, doanh thu tuần không âm",
    cau_luat: "Số thực hiện trong tuần (sản lượng, doanh thu, giờ vận hành) không được âm",
    mo_ta: "Cột T/H tuần của bảng tổng hợp sản lượng & doanh thu.",
    loai: "khoang_so",
    tham_so: { tham_chieu: c("bang_san_luong", "tuan_th"), tu: 0 },
    ap_dung: F(8),
    muc: "canh_bao",
    nhom: NHOM.kpi,
  }),
  code({
    ma: "f8-pt-kh-tuan",
    ten: "% KH tuần = T/H ÷ KH",
    cau_luat: "% KH tuần bằng thực hiện tuần chia kế hoạch tuần nhân 100",
    mo_ta: "Trước đây là luật AI (f8-ai-pt-ke-hoach). Số mẫu khớp: 780 ÷ 823 = 94,8%. Cho lệch ±0,2; ô KH trống thì bỏ qua.",
    loai: "tinh_toan",
    tham_so: { ket_qua: c("bang_san_luong", "tuan_pt_kh"), phep_tinh: "phan_tram", a: c("bang_san_luong", "tuan_th"), b: c("bang_san_luong", "tuan_kh"), sai_so: 0.2 },
    ap_dung: F(8),
    muc: "canh_bao",
    nhom: NHOM.kpi,
  }),
  code({
    ma: "f8-pt-kh-thang",
    ten: "% KH tháng = lũy kế ÷ KH tháng",
    cau_luat: "% KH tháng bằng lũy kế tháng chia kế hoạch tháng nhân 100",
    mo_ta: "Trước đây là luật AI (f8-ai-pt-ke-hoach). Số mẫu khớp: 2.418 ÷ 4.810 = 50,3%. Cho lệch ±0,2.",
    loai: "tinh_toan",
    tham_so: { ket_qua: c("bang_san_luong", "thang_pt_kh"), phep_tinh: "phan_tram", a: c("bang_san_luong", "thang_lk"), b: c("bang_san_luong", "thang_kh"), sai_so: 0.2 },
    ap_dung: F(8),
    muc: "canh_bao",
    nhom: NHOM.kpi,
  }),
  code({
    ma: "f8-nam-lk-tu-thang",
    ten: "Lũy kế năm không nhỏ hơn lũy kế tháng",
    cau_luat: "Lũy kế năm (LK YTD) không được nhỏ hơn lũy kế tháng",
    mo_ta: "Trước đây là luật AI (f8-ai-pt-ke-hoach). Lũy kế năm đã gồm tháng hiện tại.",
    loai: "tinh_toan",
    tham_so: { ket_qua: c("bang_san_luong", "nam_lk"), so_sanh: ">=", phep_tinh: "chi_a", a: c("bang_san_luong", "thang_lk") },
    ap_dung: F(8),
    muc: "canh_bao",
    nhom: NHOM.kpi,
  }),
  code({
    ma: "f8-thang-lk-tu-tuan",
    ten: "Lũy kế tháng không nhỏ hơn số tuần",
    cau_luat: "Lũy kế tháng không được nhỏ hơn số thực hiện trong tuần",
    mo_ta: "Trước đây là luật AI (f8-ai-pt-ke-hoach). Chỉ gợi ý: tuần vắt qua hai tháng (vd 28/07–03/08) thì lũy kế tháng mới có thể nhỏ hơn số tuần.",
    loai: "tinh_toan",
    tham_so: { ket_qua: c("bang_san_luong", "thang_lk"), so_sanh: ">=", phep_tinh: "chi_a", a: c("bang_san_luong", "tuan_th") },
    ap_dung: F(8),
    muc: "goi_y",
    nhom: NHOM.kpi,
  }),
  code({
    ma: "f8-su-co-bien-phap",
    ten: "Sự cố có trạng thái & biện pháp",
    cau_luat: "Mỗi sự cố, bất thường thiết bị phải ghi trạng thái và biện pháp xử lý",
    mo_ta: "Bảng mục II “Thiết bị & bảo trì — sự cố & bất thường”.",
    loai: "cot_bat_buoc",
    tham_so: { bang: "bang_su_co", cot: "bien_phap" },
    ap_dung: F(8),
    muc: "canh_bao",
    nhom: NHOM.su_co,
  }),
  code({
    ma: "f8-su-co-thiet-bi",
    ten: "Sự cố ghi rõ thiết bị",
    cau_luat: "Mỗi sự cố, bất thường phải ghi rõ thiết bị",
    mo_ta: "Vd “Relay bảo vệ R21 — máy phát TM2”.",
    loai: "cot_bat_buoc",
    tham_so: { bang: "bang_su_co", cot: "thiet_bi" },
    ap_dung: F(8),
    muc: "canh_bao",
    nhom: NHOM.su_co,
  }),
  ai({
    ma: "f8-ai-su-co-kien-nghi",
    ten: "Sự cố cần mua sắm phải có kiến nghị",
    cau_luat: "Sự cố đang xử lý mà cần thay thiết bị hay kinh phí thì mục kiến nghị phải có dòng tương ứng",
    mo_ta: "Vd relay R21 cần thay → kiến nghị P.KT&VH phê duyệt mua. Đối chiếu hai mục — để AI kiểm.",
    huong_dan_ai:
      "Bảng bang_su_co: dòng có bien_phap nói “cần thay”, “mua”, “đề xuất kinh phí”, “chờ phê duyệt” là sự cố cần cấp trên hỗ trợ. " +
      "Mỗi sự cố như vậy phải có một dòng trong bảng bang_kien_nghi nói về cùng thiết bị. Thiếu thì không đạt; nêu thiết bị.",
    ap_dung: F(8),
    muc: "goi_y",
    nhom: NHOM.su_co,
  }),

  // ======================= FORM 9 — PHÒNG CƠ ĐIỆN (mẫu SCI-160) =======================
  ai({
    ma: "f9-ai-su-co-co-xu-ly",
    ten: "Sự cố thiết bị có hướng xử lý",
    cau_luat: "Có sự cố thiết bị cơ điện (tuần này > 0) thì phải nêu thiết bị, và có hạng mục ở Mục 2 hoặc kiến nghị ở Mục 3 để xử lý",
    mo_ta: "Vd tuabin WTG-05 dừng do lỗi hộp số → Mục 2 có hạng mục bảo hành WTG-05, Mục 3 có kiến nghị. Đối chiếu hai mục — để AI kiểm.",
    huong_dan_ai:
      "Bảng bang_an_toan: dòng chi_tieu nói về “sự cố thiết bị” có tuan_nay > 0 là có sự cố tuần này. Cột hanh_dong phải nêu thiết bị nào, " +
      "và phải có ít nhất một dòng trong bang_canh_bao (cột ho_so) hoặc bang_kien_nghi (cột noi_dung) nói về cùng thiết bị đó. " +
      "Không có sự cố (tuan_nay = 0) thì đạt. Thiếu thì không đạt; nêu thiết bị / dòng cần bổ sung.",
    ap_dung: F(9),
    muc: "canh_bao",
    nhom: NHOM.su_co,
  }),
  ai({
    ma: "f9-ai-kiem-dinh-truoc-han",
    ten: "Thiết bị đến hạn kiểm định có lịch trước hạn",
    cau_luat: "Thiết bị đến hạn / quá hạn kiểm định phải có lịch kiểm định trước ngày hết hạn (ghi ở Hành động ngay)",
    mo_ta: "Vd MBA T1 Ca Nan 2 hết hạn 15/10 — đặt lịch kiểm định 08/10 → đạt; chỉ ghi “hết hạn 15/10” mà không có lịch → không đạt.",
    huong_dan_ai:
      "Bảng bang_an_toan: dòng chi_tieu nói về “kiểm định” có tuan_nay > 0. Cột hanh_dong phải nêu thiết bị và NGÀY kiểm định (đã đặt lịch) " +
      "không muộn hơn ngày hết hạn. Không có lịch, hoặc lịch sau ngày hết hạn → không đạt; nêu thiết bị và hai ngày.",
    ap_dung: F(9),
    muc: "canh_bao",
    nhom: NHOM.an_toan,
  }),
  ai({
    ma: "f9-ai-vuong-mac-co-moc",
    ten: "Vướng mắc kỹ thuật có mốc xử lý",
    cau_luat: "Mỗi hạng mục cảnh báo kỹ thuật còn vướng mắc phải ghi mốc / hạn xử lý (ngày, tuần, tháng) để theo dõi trong sổ cái",
    mo_ta: "Hạng mục không có mốc sẽ bị chặn gửi vì việc thiếu hạn — luật này chỉ rõ cần ghi mốc ở đâu và gợi ý mốc hợp lý theo nội dung.",
    huong_dan_ai:
      "Bảng bang_canh_bao, từng dòng có ho_so (bỏ dòng nhóm). Đạt nếu tinh_trang hoặc vuong_mac có mốc thời gian cụ thể (dd/mm, T10/2026, " +
      "“dự kiến 15/10”, “hạn 30/09”, khoảng ngày). Không có thì không đạt; nêu hạng mục và gợi ý câu ghi mốc (vd “chốt trước dd/mm”).",
    ap_dung: F(9),
    muc: "goi_y",
    nhom: NHOM.canh_bao,
  }),
];

/** Bộ luật mẫu mặc định (thứ tự hiển thị từ 200, cách 10 — sau 9 luật hệ thống). */
export const LUAT_MAU: LuatNhap[] = DS.map((l, i) => ({ ...l, thu_tu: 200 + i * 10 }));
