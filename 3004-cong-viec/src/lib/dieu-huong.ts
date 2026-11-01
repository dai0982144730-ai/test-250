// dieu-huong.ts — danh sách trang trên thanh bên (nguồn duy nhất). Module thêm trang: thêm MỘT dòng ở đây.
export interface MucDieuHuong {
  href: string;
  nhan: string;
  bieu_tuong: string; // tên icon lucide-react
  nhom: "lam_viec" | "tra_cuu" | "quan_tri";
  /** Chỉ hiện khi người dùng có quyền tương ứng (theo /api/toi → co_the). Không ghi = ai cũng thấy. */
  can?: "quan_tri" | "cai_dat";
}

export const DIEU_HUONG: MucDieuHuong[] = [
  { href: "/", nhan: "Tổng quan", bieu_tuong: "LayoutDashboard", nhom: "lam_viec" },
  // Soạn và gửi gộp vào Thư mục (cột phải "Nạp file & gửi báo cáo"); /soan-gui chuyển về đây
  { href: "/thu-muc", nhan: "Thư mục & gửi", bieu_tuong: "FolderTree", nhom: "lam_viec" },
  { href: "/so-cai", nhan: "Sổ cái", bieu_tuong: "ListChecks", nhom: "lam_viec" },
  // "Sổ văn bản đến" (/van-thu) đã bỏ khỏi menu theo yêu cầu (25/09/2026) — trang và API vẫn giữ, chưa xóa
  { href: "/mau-word", nhan: "Mẫu báo cáo", bieu_tuong: "FileText", nhom: "tra_cuu" },
  { href: "/ky-nang", nhan: "Kỹ năng AI", bieu_tuong: "Sparkles", nhom: "tra_cuu" },
  // Lịch sử, Luật kiểm tra, Quản trị nằm trong Cài đặt (4 tab chuẩn chung các agent) — một menu Cài đặt duy nhất
  { href: "/cai-dat", nhan: "Cài đặt", bieu_tuong: "Settings", nhom: "quan_tri" },
];
