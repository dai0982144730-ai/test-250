// ============================================================
// mo-hinh.ts — KIỂU DỮ LIỆU CỦA MỘT LƯỢT TRỢ LÝ TỰ THAO TÁC
//
// Trợ lý trả về một DÃY BƯỚC; client chạy lần lượt, mỗi bước diễn ra trên
// màn cho người dùng nhìn thấy (con trỏ ảo, gõ từng ký tự).
// File THUẦN — server (dựng bước) và client (chạy bước) dùng chung.
// ============================================================

export interface BuocGiaoDien {
  /** Mã móc khai trong danh-muc.ts, ví dụ "alerts.chay-ai" */
  lenh: string;
  /** Dòng WBS cần tác động (với lệnh nằm trong bảng tiến độ) */
  wbs?: string;
  /** Giá trị để điền / chọn / phân biệt nút nào trong nhóm ("C2", "Full"…) */
  giaTri?: string;
  /** Câu tiếng Việt hiện trên thanh diễn: "điền 12 ngày cho 7.2.2" */
  moTa: string;
}

/** Kết quả chạy một bước — client báo ngược lên để trợ lý biết dừng hay đi tiếp */
export interface KetQuaBuoc {
  lenh: string;
  ok: boolean;
  /** Vì sao hỏng, tiếng Việt cho người đọc */
  loi?: string;
}

/** Tốc độ diễn hoạt — người chọn ở thanh điều khiển, nhớ cho lần sau */
export type TocDoDien = "cham" | "nhanh";

export const NHIP: Record<TocDoDien, { buoc: number; goPhim: number }> = {
  // chậm: nhìn kịp con trỏ bay và chữ hiện dần
  cham: { buoc: 620, goPhim: 28 },
  // nhanh: vẫn thấy nút sáng lên nhưng không phải ngồi chờ
  nhanh: { buoc: 130, goPhim: 0 },
};

/** Trần số bước một lượt — chống trợ lý (hoặc câu chèn lệnh) sai khiến vô hạn */
export const TRAN_BUOC = 24;

/**
 * So hai chuỗi giá trị giao diện theo kiểu NGƯỜI ĐỌC: bỏ dấu tiếng Việt, bỏ
 * dấu câu, chứa nhau là khớp. Để trợ lý viết "chỉ đường găng" vẫn trúng option
 * "Chỉ đường găng (nội bộ)" — nhưng vẫn trượt khi nói sang thứ khác hẳn.
 */
export function bangNhau(a: string, b: string): boolean {
  const chuan = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/đ/gi, "d")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const x = chuan(a);
  const y = chuan(b);
  if (x === "" || y === "") return false;
  return x === y || x.includes(y) || y.includes(x);
}
