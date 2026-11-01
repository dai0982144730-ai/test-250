// ============================================================
// types.ts — KIỂU DỮ LIỆU CHUNG giữa các module (hợp đồng, xem KIEN-TRUC.md).
// Dùng được cả phía client lẫn server (không import gì của node).
// Đổi tên/kiểu ở đây là đổi hợp đồng — báo cho mọi module.
// ============================================================

// ---------------- Người dùng · quyền ----------------

export type PhamVi = "cua_minh" | "don_vi" | "don_vi_va_cap_duoi" | "toan_bo";

/** Danh mục quyền. Thêm quyền mới: thêm vào đây + trang "Vai trò và quyền" tự hiện. */
export const DANH_MUC_QUYEN = {
  "tai_lieu.xem": "Mở xem nội dung tài liệu",
  "tai_lieu.tai_len": "Tải tài liệu thẳng lên thư mục (không qua Soạn và gửi) — chỉ khi được cấp",
  "tai_lieu.xoa": "Xóa tài liệu (vào thùng rác)",
  "tai_lieu.khoi_phuc": "Khôi phục tài liệu từ thùng rác",
  "tai_lieu.gui": "Gửi, chuyển tiếp, trả lại tài liệu",
  "tai_lieu.kiem_soat": "Kiểm soát báo cáo (Trưởng phòng / GĐ đơn vị, Phó TGĐ phụ trách)",
  "van_thu.nhap_den": "Văn thư: vào sổ văn bản đến thay người ngoài",
  // Mr. Đại chốt 29/09: bình luận việc cấu hình chung với Giao việc (không thêm quyền riêng)
  "cong_viec.giao":
    "Giao việc + bình luận việc (nơi chủ trì phải trong phạm vi; mời phối hợp thì tự do). Bình luận được việc của đơn vị trong phạm vi; người liên quan việc (người giao, người làm, đơn vị đang làm, được @) luôn bình luận được — ngoài ra chỉ đọc",
  // Mr. Đại chốt 29/09: phối hợp chỉ được biết + báo xong + bình luận; ai được sửa việc khai ở ma trận này, không cố định trong code
  "cong_viec.sua":
    "Gia hạn, thêm/đổi người, hủy việc — Của mình: việc mình giao · Đơn vị: việc đơn vị mình chủ trì · Mình + cấp dưới: cả đơn vị cấp dưới chủ trì · Toàn bộ: mọi việc. Đứng phối hợp không bao giờ được sửa",
  // Mr. Đại chốt 29/09: cây bút ✏ cạnh tên việc — quyền riêng, không gộp với quyền trên
  "cong_viec.sua_viec":
    "Sửa việc (cây bút ✏ cạnh tên việc): tên, kết quả cần có, ngày bắt đầu, hạn, chủ trì, phối hợp — phạm vi tính như quyền trên. Đứng phối hợp không bao giờ được sửa",
  // Mr. Đại chốt 29/09: gõ @ trong bình luận chỉ tag NGƯỜI (không tag tổ chức); phạm vi = được @ những ai
  "cong_viec.tag_ten":
    "Tag tên mở rộng — gõ @@ trong bình luận (gõ @ luôn chỉ ra người liên quan việc). Của mình: người liên quan · Đơn vị: + người cùng đơn vị · Mình + cấp dưới: + đơn vị cấp dưới · Toàn bộ: cả công ty. Chỉ tag người, không tag tổ chức",
  "so_cai.xem": "Xem sổ cái",
  // Mr. Đại chốt 03/10: agent Công việc gắn việc vào cây WBS của agent Tiến độ — ai duyệt khai ở ma trận này
  "wbs.duyet":
    "Duyệt gắn WBS — xác nhận / sửa mã WBS 🤖 AI đề xuất cho việc của dự án (màn Cây việc & đường găng). Phạm vi tính theo đơn vị chủ trì việc",
  "lich_su.xem": "Xem lịch sử",
  "mau.quan_ly": "Quản lý mẫu báo cáo",
  "ky_nang.them_chung": "Thêm kỹ năng AI vào kho chung",
  "agent.cap_khoa": "Cấp khóa cho agent đọc sổ cái",
  "nguoi_dung.quan_ly": "Quản lý người dùng, đơn vị, vai trò",
  "cau_hinh.sua": "Sửa cài đặt hệ thống",
} as const;

export type Quyen = keyof typeof DANH_MUC_QUYEN;

export interface DonVi {
  id: string;
  ten: string;
  ten_ngan: string;
  cap: number;
  cha_id: string | null;
  loai: "ban_tgd" | "chuc_danh" | "phong" | "don_vi" | "rieng" | "ca_nhan" | "ben_ngoai"; // chuc_danh: từng lãnh đạo trong Ban TGĐ (tên hiện kèm người giữ)
  mau_ma: string | null;
  thu_tu: number;
  active: boolean;
}

/** Người đang đăng nhập, đã tính sẵn quyền. */
export interface NguoiDungPhien {
  id: string;
  email: string;
  ten: string;
  don_vi_id: string | null; // null = người mới chưa gán đơn vị
  don_vi_ids: string[]; // đơn vị chính + kiêm nhiệm
  chuc_vu: string | null;
  cap: number; // cấp hiệu lực: cap_chuc_vu nếu có, không thì cấp đơn vị, không có đơn vị = cấp thấp nhất
  la_quan_tri: boolean;
  vai_tro: string[];
  quyen: Partial<Record<Quyen, PhamVi>>; // phạm vi RỘNG nhất trong các vai trò
  /**
   * ⭐ TRƯỞNG CHÍNH theo từng đơn vị (Mr. Đại chốt 03/10/2026). Đơn vị có từ 2 người mang vai Trưởng thì chọn MỘT "trưởng chính"
   * (cột identity.don_vi.uy_quyen_truong): đứng tên người giao khi máy tự giao, nhận mặc định việc giao cho cả phòng, tên ở Thư
   * mục. Trưởng còn lại = TRƯỞNG PHỤ (chốt lại 08/10/2026): ĐỦ quyền trưởng + nhận chuông như trưởng.
   * Bảng quyền tách chỉ còn dùng cho trưởng chính KHÔNG mang vai Trưởng (dữ liệu cũ) mà thuộc thêm đơn vị khác.
   *   don_vi_truong — đơn vị người này giữ QUYỀN trưởng (áp `quyen_truong`)
   *   don_vi_dau    — đơn vị người này là đầu đơn vị NHẬN CHUÔNG như trưởng (gồm cả nơi đã có trưởng chính khác)
   *   quyen_thanh_vien — quyền từ các vai trò KHÁC vai Trưởng (áp trên don_vi_ids như cũ)
   * Thiếu các trường này (bản cũ) thì coQuyen tính như trước.
   */
  don_vi_truong?: string[];
  don_vi_dau?: string[];
  quyen_thanh_vien?: Partial<Record<Quyen, PhamVi>>;
  quyen_truong?: Partial<Record<Quyen, PhamVi>>;
}

// ---------------- Kỳ báo cáo · mẫu Word ----------------

export interface KyBaoCao {
  loai: "tuan" | "thang" | "quy" | "tu_do";
  so?: number; // tuần 29, tháng 7
  nam?: number;
  tu?: string; // ISO yyyy-mm-dd
  den?: string; // ISO yyyy-mm-dd — "ngày sau" tính theo ngày này khi cấu hình chọn "kỳ báo cáo"
}

/** Ô nhập gắn mã (Word content control, w:sdt với w:tag). */
export interface ONhapMau {
  tag: string; // 'nguoi_lap', 'ky_bao_cao_den'...
  nhan: string; // 'Người lập'
  bat_buoc: boolean;
  kieu: "chu" | "ngay" | "chon" | "don_vi";
  lua_chon?: string[];
}

/** Bảng sinh việc vào sổ cái. Mỗi ô trong dòng là một content control có tag = tên cột. */
export interface BangSinhViec {
  tag: string; // 'bang_cong_viec' | 'bang_quyet_dinh'
  nhan: string; // 'Công việc' | 'Nội dung cần TGĐ quyết định'
  la_quyet_dinh?: boolean; // Form 0: quyết định của TGĐ → cấp 1, đè tất cả
}

export interface DinhNghiaMau {
  o_nhap: ONhapMau[];
  bang_cong_viec: BangSinhViec[];
  muc_bat_buoc: string[]; // tiêu đề mục phải còn nguyên, vd 'Vấn đề nổi bật và kiến nghị'
  /** Cấu trúc khai theo NGHĨA (Khai báo mẫu không cần sửa code, Mr. Đại duyệt 01/10/2026). Có thì là nguồn gốc:
   *  bang_cong_viec + muc_bat_buoc được sinh lại từ đây khi lưu (lib/kiem-tra/cau-truc.ts). Không có = mẫu cũ, chạy như trước. */
  cau_truc?: CauTrucMau;
}

// ---------------- Cấu trúc mẫu theo nghĩa (0 Tài liệu thiết kế/DE-XUAT-KHAI-BAO-MAU-BAO-CAO-v0.1, mục 2–3) ----------------

/** Nghĩa của cột trong bảng sinh việc — BỘ NGHĨA CỐ ĐỊNH code đã hiểu (mục 2.3). */
export type NghiaCot =
  | "ten"
  | "ket_thuc"
  | "tinh_trang"
  | "du_an"
  | "phu_trach"
  | "bat_dau"
  | "ket_qua_can_co"
  | "ma_viec"
  | "han_quyet_dinh"
  | "them" // thông tin thêm: lưu + hiện kèm việc, AI đọc, code không tính
  | "bo_qua"; // máy bỏ qua

export interface CotMau {
  tag: string; // tag của ô trong Word (content control)
  tieu_de: string; // chữ tiêu đề cột trên file
  nghia: NghiaCot;
  /** khoá lưu khi nghia = "them" (mặc định = tag) */
  ten_them?: string;
}

export interface BangMau {
  tag: string; // 'bang_*'
  tieu_de: string;
  nghia: "sinh_viec" | "quyet_dinh" | "so_lieu" | "dac_biet";
  cot: CotMau[];
}

export interface ChuongMau {
  tieu_de: string;
  /** tên cũ vẫn nhận (file theo mẫu bản trước) */
  ten_cu?: string[];
  nghia: "sinh_viec_bang" | "sinh_viec_van_xuoi" | "so_lieu" | "thong_tin";
  bat_buoc: boolean;
  bang: BangMau[];
}

export interface CauTrucMau {
  chuong: ChuongMau[];
}

export interface MauWord {
  ma: string; // 'form-7'
  ten: string;
  don_vi_lap: string | null;
  gui_den_mac_dinh: string | null;
  loai_ky: KyBaoCao["loai"];
  dinh_nghia: DinhNghiaMau;
  phien_ban: number;
  active: boolean;
}

// ---------------- Kiểm tra trước khi gửi ----------------

export interface PhuTrach {
  loai: "nguoi" | "don_vi";
  id: string;
  ten: string;
  noi_dung?: string; // phần việc riêng của người này (mặc định = tên việc)
}

/** Một việc làm mốc: mã việc (sổ cái) hoặc dòng khác của cùng báo cáo; chưa xác định thì chỉ có tên. */
export interface ViecMoc {
  ma?: string; // mã việc trong sổ cái
  ten: string; // như ghi trong báo cáo (hoặc tên việc đã khớp)
  bang?: string; // dòng khác của cùng báo cáo: tag bảng + số dòng
  dong?: number;
}

/** Ngày tính theo việc khác: "sau khi xong X" / "2 ngày sau khi X" — ngày = ngày X xong + so_ngay. */
export interface MocViec {
  goc: string; // chữ gốc trong ô ngày
  so_ngay: number;
  viec: ViecMoc[];
}

/** Một dòng công việc đọc từ bảng Công việc của báo cáo. */
export interface DongCongViec {
  ma_viec?: string; // có mã (vd CV-2026-0412) = chắc chắn trùng
  ten: string;
  du_an?: string;
  hang_muc?: string;
  phu_trach: PhuTrach[]; // trống trong file → tự gán đơn vị lập báo cáo
  phu_trach_tu_gan?: boolean;
  bat_dau?: string; // ISO; ô trống = ngày lập báo cáo (bat_dau_kieu 'ngay_bao_cao')
  ket_thuc?: string;
  bat_dau_kieu?: "ngay" | "ngay_bao_cao" | "sau_viec";
  bat_dau_sau?: MocViec; // bắt đầu khi xong (các) việc khác
  ket_thuc_sau?: MocViec; // kết thúc N ngày sau khi xong việc/mốc khác
  ket_qua_can_co?: string;
  da_xong?: boolean; // báo cáo ghi việc đã xong
  /** chữ nguyên văn ô Tình trạng / Đã xong (AI đọc lại ở bước 4 — người viết ghi nhiều kiểu: xong, 100%, đạt…) */
  tinh_trang?: string;
  /** 🤖 AI đọc ô Tình trạng là ĐÃ XONG trong khi code chưa nhận ra (bước 4) — lý do ngắn */
  da_xong_ai?: string;
  nguon_bang: string; // tag bảng
  dong_so: number; // dòng thứ mấy trong bảng (1-based)
  y_so?: number; // ô Công việc có nhiều ý đánh số → nhiều việc cùng một dòng: ý thứ mấy (1-based)
}

export interface LoiKiemTra {
  luat: string; // mã luật, vd 'dung_mau', 'nguoi_lap', 'ngay_hop_le'
  muc: "chan" | "canh_bao" | "goi_y"; // chan = khóa nút Gửi
  thong_diep: string;
  vi_tri?: { tag?: string; bang?: string; dong?: number; cot?: string };
}

export interface KetQuaKiemTra {
  dat: boolean; // không có lỗi mức 'chan'
  mau_ma: string | null;
  ky_bao_cao?: KyBaoCao;
  o_nhap: Record<string, string>;
  gui_den: string[]; // don_vi ids
  cong_viec: DongCongViec[];
  loi: LoiKiemTra[];
  ngay_nop?: string; // yyyy-mm-dd — máy ghi lúc nộp (mẫu bản 6 bỏ ô Ngày lập)
}

// ---------------- Sổ cái ----------------

export type TrangThaiCongViec = "dang_mo" | "hoan_thanh" | "da_dong";

export interface PhanViec {
  id: string;
  cong_viec_id: string;
  phu_trach_loai: "nguoi" | "don_vi";
  phu_trach_id: string;
  phu_trach_ten?: string;
  noi_dung: string;
  luon_mo: boolean;
  bat_dau: string | null;
  ket_thuc: string | null;
  trang_thai: "dang_lam" | "da_ket_thuc";
  ket_thuc_boi: string | null;
  ket_thuc_luc: string | null;
  ghi_chu: string | null;
  /** Mỗi việc đúng một chủ trì; phối hợp = quan tâm được biết, không hạn riêng, không chặn đóng việc (db/68) */
  vai?: "chu_tri" | "phoi_hop";
}

export interface NguonCongViec {
  id: string;
  cong_viec_id: string;
  tai_lieu_id: string | null;
  phien_ban: number | null;
  mau_ma: string | null;
  nhan: string;
  don_vi_id: string | null;
  /** tên ngắn đơn vị lập báo cáo (để hiện chữ, không hiện mã — luật 30) */
  don_vi_ten?: string | null;
  cap: number;
  ky_bao_cao: string | null;
  ngay_gui: string;
  du_lieu: DongCongViec;
  trang_thai: "hien_hanh" | "bi_de" | "khong_dung";
  ly_do: string | null;
}

export interface CongViec {
  id: string;
  ten: string;
  du_an: string | null;
  hang_muc: string | null;
  ket_qua_can_co: string | null;
  luon_mo: boolean;
  bat_dau: string | null;
  ket_thuc: string | null;
  trang_thai: TrangThaiCongViec;
  cho_sua: boolean;
  giao_boi: string | null;
  don_vi_giao: string | null;
  nguon_hien_hanh_id: string | null;
  tao_luc: string;
  dong_luc: string | null;
  ly_do_dong: string | null;
  phan_viec?: PhanViec[];
}

/** Đầu vào khi một tài liệu đạt kiểm tra được gửi: các dòng việc vào sổ cái. */
export interface DauVaoSoCai {
  tai_lieu_id: string | null; // null = việc giao tay, không từ tài liệu
  phien_ban: number | null;
  mau_ma: string | null;
  nhan: string; // 'BQLDA Quảng Trị · Form 7 · tuần 29'
  don_vi_id: string | null; // đơn vị gửi
  cap: number; // cấp của nguồn (đơn vị hoặc chức vụ; quyết định TGĐ = 1)
  nguoi_gui: string;
  ky_bao_cao_den?: string | null;
  ngay_gui: string; // ISO timestamp
  cong_viec: DongCongViec[];
  /** Người gửi xác nhận gợi ý trùng: chỉ số dòng → mã việc đã có, hoặc 'moi' = tạo việc mới */
  xac_nhan_trung?: Record<number, string>;
}

export interface DuDoanDong {
  dong: number; // chỉ số trong DauVaoSoCai.cong_viec
  /** vao_so_xong: dòng báo đã xong vào sổ ở trạng thái ĐÃ XONG — chỉ lần nạp đầu của đơn vị lập + mẫu (Mr. Đại chốt 08/10, gật 18/10/2026) */
  hanh_dong: "tao_moi" | "de" | "khong_dung" | "dong_viec" | "goi_y_trung" | "vao_so_xong";
  cong_viec_id?: string;
  /** Bản này là LẦN NẠP ĐẦU của đơn vị lập + mẫu: dòng báo đã xong (code hay 🤖 AI đọc) vào sổ ở trạng thái đã xong ngày này (yyyy-mm-dd) */
  xong_lan_dau?: string;
  ly_do?: string; // 'thua cấp', 'thua ngày', 'cấp cao hơn đè', ...
  goi_y?: {
    cong_viec_id: string;
    ten: string;
    do_giong: number;
    /** việc đã xong (ngày yyyy-mm-dd): chọn = mở lại */
    da_xong?: string | null;
    /** việc do bản CẤP CAO HƠN người nộp báo xong: chọn = ghi ý kiến khác, KHÔNG mở lại (Mr. Đại chốt 02/10) */
    cap_tren_xong?: string | null;
  }[];
}

// ---------------- Lịch sử ----------------

export type LoaiDoiTuong =
  | "tai_lieu"
  | "cong_viec"
  | "thu_muc"
  | "cau_hinh"
  | "nguoi_dung"
  | "don_vi"
  | "mau"
  | "ky_nang"
  | "agent";

/** Hành động ghi lịch sử — dùng đúng các mã này để màn Lịch sử hiển thị được. */
export const HANH_DONG_LICH_SU = {
  // tài liệu
  tai_len: "Tải lên",
  kiem_tra: "Kiểm tra",
  gui: "Gửi",
  nhan: "Nhận",
  mo_xem: "Mở xem",
  tai_ve: "Tải về",
  xoa: "Xóa (vào thùng rác)",
  khoi_phuc: "Khôi phục",
  chuyen_tiep: "Chuyển tiếp nguyên văn",
  chuyen_tiep_kem: "Chuyển tiếp kèm tài liệu",
  tra_lai: "Trả lại",
  gui_lai: "Gửi lại bản mới",
  gui_moi: "Gửi tài liệu mới",
  hoan_thanh: "Hoàn thành",
  vao_so_van_ban_den: "Vào sổ văn bản đến",
  // công việc
  vao_so_cai: "Vào sổ cái",
  bi_de: "Bị đè",
  khong_dung: "Bản không được dùng",
  giao_viec: "Giao việc",
  gia_han: "Gia hạn",
  doi_nguoi: "Đổi người phụ trách",
  phan_cong: "Phân công cho nhân viên",
  nhac_tu_bao_cao_tuan: "Nhắc việc từ Báo cáo tuần",
  nhac_tu_issue: "Nhắc người giữ việc từ Issue",
  giao_tu_bao_cao_tuan: "Giao việc từ Báo cáo tuần",
  sua_viec: "Sửa việc",
  them_phan_viec: "Thêm phần việc",
  bot_phan_viec: "Bớt phần việc",
  ket_thuc_phan_viec: "Xong việc (người làm báo xong)",
  cong_viec_hoan_thanh: "Công việc hoàn thành, rời sổ cái",
  dong_viec: "Hủy việc (người giao)",
  mo_lai_viec: "Mở lại việc đã xong / đã hủy",
  y_kien_khac: "Báo cáo ghi chưa xong nhưng cấp trên đã báo xong (giữ đã xong, báo người giao)",
  tach_nguon: "Tách dòng báo cáo gộp nhầm khỏi việc",
  xoa_viec: "Xoá việc (quản trị dọn lỗi)",
  gan_wbs: "Gắn / sửa mã WBS của việc",
  duyet_wbs: "Duyệt mã WBS 🤖 AI đề xuất",
  lanh_dao_phoi_hop: "🤖 Gắn lãnh đạo phối hợp theo phân công Ban lãnh đạo",
  cho_sua: "Chờ sửa (tài liệu bị trả lại)",
  qua_han: "Quá hạn",
  tu_tinh_ngay: "Tự tính ngày theo việc trước",
  so_cai_thieu: "Sổ cái thiếu việc (đối chiếu sau khi gửi)",
  bo_viec_khi_gui: "Bỏ việc khi duyệt trước lúc gửi (không vào sổ cái)",
  // khác
  tao_thu_muc: "Tạo thư mục",
  sua_cau_hinh: "Đổi cài đặt",
  dang_nhap: "Đăng nhập",
  sua_nguoi_dung: "Sửa người dùng",
  them_ky_nang: "Thêm kỹ năng AI",
  xoa_ky_nang: "Xóa kỹ năng AI",
  cap_khoa_agent: "Cấp khóa agent",
  thu_hoi_khoa_agent: "Thu hồi khóa agent",
  agent_doc: "Agent đọc sổ cái",
} as const;

export type HanhDongLichSu = keyof typeof HANH_DONG_LICH_SU;

export interface DongLichSu {
  id: number;
  luc: string;
  nguoi: string;
  thay_cho: string | null;
  don_vi_id: string | null;
  thiet_bi: string | null;
  doi_tuong_loai: LoaiDoiTuong;
  doi_tuong_id: string;
  hanh_dong: HanhDongLichSu;
  chi_tiet: Record<string, unknown>;
  hash_truoc: string | null;
  hash: string;
}
