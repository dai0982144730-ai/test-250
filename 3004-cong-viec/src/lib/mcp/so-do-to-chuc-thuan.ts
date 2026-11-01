// ============================================================
// base.so_do_to_chuc — SƠ ĐỒ TỔ CHỨC giao cho MAIN (Mr. Đại chốt 12/10/2026 — câu 9 bản rà phân quyền). File THUẦN.
//
// Vì sao có cửa này: Main tính "ai thuộc dự án nào" từ sơ đồ tổ chức (đơn vị chính · kiêm nhiệm · vai lãnh đạo / trưởng),
// nhưng sơ đồ đang SỬA ở agent Công việc — bản Main giữ là bản chép tay một lần (04/10). Sửa kiêm nhiệm bên này mà Main
// không biết thì quyền ở Tiến độ · Hợp đồng · Pháp lý đứng yên. Từ nay Main tự kéo cửa này mỗi 30 phút.
//
//   · CHỈ ĐỌC. Trả: cây đơn vị · kiêm nhiệm · từng người (mã · email · tên · đơn vị chính · chức vụ · vai trò · còn hoạt động).
//   · ⛔ KHÔNG trả mật khẩu (băm, salt), KHÔNG trả cờ quản trị — Main không đổi mật khẩu, email, loại tài khoản theo cửa này.
//   · Chỉ MAIN gọi được, kèm khoá nội bộ (đầu thư x-sci-noi-bo): đây là danh sách cả công ty, agent khác lấy người qua Main.
//   · Tên trường giữ y như bảng identity.* — Main chép thẳng vào data/to-chuc.json (4-agent-main/src/lib/to-chuc-kieu.ts).
// ⚠ Cầu TẠM: khi làm Đợt 3 của LOI-DUNG-CHUNG 6g.6.3 (màn sửa tổ chức chuyển lên Main, agent Công việc thành bản chép)
//   thì chiều kéo đảo lại — lúc đó ĐÓNG cửa này, kẻo hai bên chép qua lại.
// ============================================================
import { chuanHoaMaAgent } from "@/lib/chung/ma-agent";

export const CUA_SO_DO = "base.so_do_to_chuc";

export const DONG_DANH_MUC_SO_DO = {
  ten: CUA_SO_DO,
  mo_ta:
    "Sơ đồ tổ chức đang sửa ở agent Công việc — cây đơn vị · kiêm nhiệm · đơn vị chính, chức vụ, vai trò từng người. CHỈ ĐỌC, không có mật khẩu. " +
    "Chỉ Main gọi được (kèm khoá nội bộ) để tự cập nhật bản sơ đồ của Main mỗi 30 phút.",
  tham_so: "—",
  san_sang: true,
};

/** Cửa riêng, chặt hơn ma trận theo cặp: đúng Main + có khoá nội bộ */
export function xetCuaSoDo(agentGoi: string, coKhoa: boolean): { duoc: true; laMaLa: false; canhBao: null } | { duoc: false; lyDo: string } {
  if (chuanHoaMaAgent(agentGoi) !== "main") return { duoc: false, lyDo: `Cửa ${CUA_SO_DO} chỉ dành cho Main — agent khác lấy danh sách người qua Main.` };
  if (!coKhoa) return { duoc: false, lyDo: `Cửa ${CUA_SO_DO} cần khoá nội bộ (đầu thư x-sci-noi-bo).` };
  return { duoc: true, laMaLa: false, canhBao: null };
}

export interface HangDonVi {
  id: string;
  ten: string;
  ten_ngan: string | null;
  cap: number;
  cha_id: string | null;
  loai: string;
  thu_tu: number | null;
  active: boolean | null;
  chuc_danh: string | null;
  chuc_danh_ngan: string | null;
  chuc_nang: string | null;
  uy_quyen_truong: string | null;
}
export interface HangKiemNhiem {
  nguoi_dung_id: string;
  don_vi_id: string;
  chuc_vu: string | null;
}
export interface HangNguoi {
  id: string;
  email: string;
  ten: string;
  don_vi_id: string | null;
  chuc_vu: string | null;
  cap_chuc_vu: number | null;
  active: boolean | null;
}
export interface HangVai {
  nguoi_dung_id: string;
  vai_tro_id: string;
}

export interface SoDoGiao {
  phien_ban: 1;
  so_don_vi: number;
  so_kiem_nhiem: number;
  so_nguoi: number;
  so_nguoi_dang_khoa: number;
  don_vi: {
    id: string;
    ten: string;
    ten_ngan: string;
    cap: number;
    cha_id: string | null;
    loai: string;
    thu_tu: number;
    active: boolean;
    chuc_danh: string | null;
    chuc_danh_ngan: string | null;
    chuc_nang: string | null;
    uy_quyen_truong: string | null;
  }[];
  kiem_nhiem: { nguoi_id: string; don_vi_id: string; chuc_vu: string | null }[];
  nguoi: {
    id: string;
    email: string;
    ten: string;
    don_vi_id: string | null;
    chuc_vu: string | null;
    cap_chuc_vu: number | null;
    active: boolean;
    vai: string[];
  }[];
}

/**
 * Dựng bản giao từ các hàng đọc trong cơ sở dữ liệu. Chỉ CHÉP đúng các trường kê ở trên — hàng có thêm cột gì (mật khẩu…)
 * cũng không lọt ra ngoài, vì hàm tự chọn từng trường chứ không trải cả hàng.
 */
export function dungSoDo(nguon: { donVi: HangDonVi[]; kiemNhiem: HangKiemNhiem[]; nguoi: HangNguoi[]; vai: HangVai[] }): SoDoGiao {
  const vaiTheoNguoi = new Map<string, string[]>();
  for (const v of nguon.vai) vaiTheoNguoi.set(v.nguoi_dung_id, [...(vaiTheoNguoi.get(v.nguoi_dung_id) ?? []), v.vai_tro_id]);
  const nguoi = nguon.nguoi.map((p) => ({
    id: p.id,
    email: (p.email ?? "").trim().toLowerCase(),
    ten: p.ten,
    don_vi_id: p.don_vi_id ?? null,
    chuc_vu: p.chuc_vu ?? null,
    cap_chuc_vu: typeof p.cap_chuc_vu === "number" ? p.cap_chuc_vu : null,
    active: p.active !== false,
    vai: [...(vaiTheoNguoi.get(p.id) ?? [])].sort(),
  }));
  return {
    phien_ban: 1,
    so_don_vi: nguon.donVi.length,
    so_kiem_nhiem: nguon.kiemNhiem.length,
    so_nguoi: nguoi.length,
    so_nguoi_dang_khoa: nguoi.filter((p) => !p.active).length,
    don_vi: nguon.donVi.map((d) => ({
      id: d.id,
      ten: d.ten,
      ten_ngan: d.ten_ngan ?? d.ten,
      cap: d.cap,
      cha_id: d.cha_id ?? null,
      loai: d.loai,
      thu_tu: d.thu_tu ?? 0,
      active: d.active !== false,
      chuc_danh: d.chuc_danh ?? null,
      chuc_danh_ngan: d.chuc_danh_ngan ?? null,
      chuc_nang: d.chuc_nang ?? null,
      uy_quyen_truong: d.uy_quyen_truong ?? null,
    })),
    kiem_nhiem: nguon.kiemNhiem.map((k) => ({ nguoi_id: k.nguoi_dung_id, don_vi_id: k.don_vi_id, chuc_vu: k.chuc_vu ?? null })),
    nguoi,
  };
}
