// ============================================================
// luat/types.ts — HỢP ĐỒNG của bộ LUẬT KIỂM TRA ĐỘNG (dùng được cả client lẫn server).
// Người dùng viết luật bằng câu tiếng Việt → AI dịch sang DẠNG LUẬT CODE nếu được (chạy chắc, không tốn AI,
// được chặn gửi); không dịch được thì giữ làm LUẬT AI (mặc định cảnh báo). "Code giữ cửa, AI góp ý".
// Luật hệ thống (9 luật gốc) chỉ tắt/đổi mức được, không xóa được. Mọi thay đổi có phiên bản + lịch sử.
// Đổi tên/kiểu ở đây là đổi hợp đồng giữa các module luat-*.
// ============================================================
import type { LoiKiemTra } from "@/lib/types";

export type CachKiem = "code" | "ai" | "ca_hai";
export type MucLuat = "chan" | "canh_bao" | "goi_y";

/** Một luật kiểm tra (một dòng bảng docflow.luat_kiem_tra). */
export interface LuatKiemTra {
  id: string;
  ma: string; // mã ngắn duy nhất, vd 'nguoi_lap' (hệ thống) hoặc 'f7-pt-lk-0-100'
  ten: string; // tên hiển thị ngắn
  cau_luat: string; // câu tiếng Việt người dùng viết (nguồn gốc của luật)
  mo_ta: string | null;
  he_thong: boolean; // luật gốc: không xóa được
  cach_kiem: CachKiem;
  loai: string | null; // mã DẠNG LUẬT CODE (LOAI_LUAT) — hệ thống: 'he_thong'; AI thuần: null
  tham_so: Record<string, unknown> | null; // tham số của dạng luật code
  huong_dan_ai: string | null; // hướng dẫn cho AI (cach_kiem 'ai' | 'ca_hai')
  ap_dung: string[] | "tat_ca"; // mã mẫu
  muc: MucLuat;
  khi_ai_loi: "cho_gui" | "chan"; // chỉ có nghĩa khi luật AI ở mức 'chan'
  bat: boolean;
  nhom: string | null; // nhóm hiển thị, vd 'Ô chung', 'Bảng Công việc', 'Số liệu'
  thu_tu: number;
  phien_ban: number;
  tao_boi: string | null;
  tao_luc: string;
  sua_boi: string | null;
  sua_luc: string;
  da_xoa: boolean;
}

/** Dữ liệu tạo/sửa luật (id rỗng = tạo mới). */
export type LuatNhap = Omit<LuatKiemTra, "id" | "he_thong" | "phien_ban" | "tao_boi" | "tao_luc" | "sua_boi" | "sua_luc" | "da_xoa"> & {
  id?: string | null;
};

// ---------------- Tham chiếu tới dữ liệu trong báo cáo ----------------

/** Trỏ tới một giá trị trong báo cáo: một ô, một cột của bảng (xét từng dòng), hoặc mốc kỳ báo cáo. */
export type ThamChieu =
  | { o: string } // tag ô nhập, vd 'ky_bao_cao'
  | { bang: string; cot: string } // tag bảng + tag cột (luật chạy trên TỪNG dòng)
  | { ky: "tu" | "den" | "nop" }; // ngày đầu / cuối kỳ báo cáo; ngày nộp (máy ghi — mẫu bản 6 bỏ ô Ngày lập)

export type PhepSo = "=" | "!=" | "<" | "<=" | ">" | ">=";

export interface DieuKien {
  tham_chieu: ThamChieu;
  phep: "co_gia_tri" | "trong" | "bang" | "khac" | "chua" | "khong_chua" | PhepSo;
  gia_tri?: string | number;
}

// ---------------- Dạng luật code (registry trong loai-luat.ts) ----------------

/** Mô tả MỘT tham số để giao diện dựng ô nhập (chọn ô/bảng/cột theo định nghĩa mẫu). */
export interface ThamSoDinhNghia {
  khoa: string;
  nhan: string;
  kieu: "o" | "bang" | "cot" | "tham_chieu" | "phep_so" | "so" | "chu" | "danh_sach" | "muc" | "dieu_kien" | "bool";
  bat_buoc: boolean;
  goi_y?: string;
  /** Với kieu 'cot': khóa của tham số 'bang' mà cột thuộc về */
  theo_bang?: string;
}

/** Dữ liệu một luật code được xem khi chạy (không cần CSDL). */
export interface NguCanhKiem {
  mau_ma: string | null;
  ky_bao_cao?: { tu?: string; den?: string; nop?: string } | null;
  gia_tri_chua_dien: string[]; // chuỗi coi là "chưa điền", vd "......"
  /** Phân giải tên đơn vị/người (cho luật 'phu_trach_hop_le'); không truyền = bỏ qua luật đó */
  phan_giai_ten?: (ten: string) => boolean;
  /** Định nghĩa mẫu của báo cáo (tùy chọn) — để lời báo lỗi dùng nhãn thật của ô/bảng/cột thay vì tag */
  dinh_nghia_mau?: import("./types-them").DinhNghiaMauRutGon | null;
}

/** Nội dung báo cáo đã đọc (cùng dạng NoiDungWord của kiem-tra/doc-word.ts). */
export interface DuLieuBaoCao {
  o_nhap: Record<string, string>;
  bang: Record<string, Record<string, string>[]>;
  tieu_de: string[];
  muc?: { tieu_de: string; van_ban: string }[];
}

export interface DinhNghiaLoaiLuat {
  ma: string; // vd 'khoang_so'
  ten: string; // 'Số nằm trong khoảng'
  mo_ta: string; // một câu giải thích cho người dùng
  vi_du: string; // câu luật mẫu, vd '% hoàn thành từ 0 đến 100'
  tham_so: ThamSoDinhNghia[];
  /** Kiểm một báo cáo. Trả lỗi đã gắn vi_tri (tag ô / bảng + dòng + cột); luat/muc do bộ chạy điền. */
  kiem(bc: DuLieuBaoCao, ts: Record<string, unknown>, ctx: NguCanhKiem): Omit<LoiKiemTra, "luat" | "muc">[];
}

// ---------------- Kết quả chạy ----------------

/** Lỗi kèm thông tin luật (mở rộng LoiKiemTra — trường thêm đều tùy chọn để không phá chỗ cũ). */
export type LoiLuat = LoiKiemTra & { luat_id?: string; cach_kiem?: CachKiem; ten_luat?: string };

export interface KetQuaLuatAi {
  luat_id: string;
  dat: boolean | null; // null = AI không kết luận được
  thong_diep: string;
  vi_tri?: LoiKiemTra["vi_tri"];
  /** 🤖 chữ mới đề xuất cho cả ô ở vi_tri khi không đạt (chốt 29/09: người nộp duyệt → máy ghi vào file) */
  de_xuat?: string;
  /** Đã ghi đề xuất vào file ở bản sau (chép sang bản mới, coi như đạt, không soát lại) */
  da_sua?: boolean;
}

export type TrangThaiLuatAi = "khong_co" | "dang_kiem" | "xong" | "loi";

/** AI đề xuất cách chạy cho một câu luật (người dùng xác nhận trước khi lưu). */
export interface DeXuatLuat {
  cach_kiem: CachKiem;
  loai: string | null;
  tham_so: Record<string, unknown> | null;
  huong_dan_ai: string | null;
  ten_goi_y: string;
  nhom_goi_y: string | null;
  ap_dung_goi_y: string[] | "tat_ca";
  muc_goi_y: MucLuat;
  giai_thich: string; // vì sao chọn code/AI, đọc tham số ra lời
  canh_bao: string[]; // vd 'bảng này chưa được gắn mã trong mẫu nên code không đọc được'
}

export interface KetQuaChayThu {
  so_tai_lieu: number;
  so_dat: number;
  so_khong_dat: number;
  so_bo_qua: number; // tài liệu không thuộc mẫu áp dụng / không đọc được
  mau: { tai_lieu_id: string; ten: string; mau_ma: string | null; dat: boolean; loi: LoiLuat[] }[];
}
