// ============================================================
// kich-ban-chung.ts — FILE THUẦN (luật 10): không fs, không mạng.
//
// KỊCH BẢN TEST — khuôn lấy từ màn test của agent pháp lý
// (phaply.scigroup.vn → nút Test), Mr. Đại chỉ 06/09: "vào xem mục test để
// nhìn giao diện rồi viết code theo đó".
//
// Đo tận nơi trên bản chạy thật 06/09, những thứ bê nguyên:
//   · Panel trượt từ phải, hàng tab kèm SỐ ĐẾM "0/6" ngay trên tên tab
//   · Mỗi tab: nhãn nhỏ chữ hoa → tiêu đề → câu dẫn → thanh tiến độ "0/6 đạt"
//   · Mỗi bài: chip mã (NX-01) · tiêu đề · hai nút Đạt / Không đạt ở góc phải
//   · Các bước đánh số, rồi ô "Mong đợi:" nền khác
//   · Bấm "Không đạt" → bung ô mô tả để ghi lý do
//
// KHÁC bản pháp lý ở hai chỗ, đều theo lệnh Mr. Đại:
//   ① Ô lý do nhận THÊM ẢNH dán thẳng bằng Ctrl+V (Snipping Tool), và có ô
//      viết luôn câu lệnh nhờ AI sửa.
//   ② Kết quả lưu ra FILE trên máy chứ không phải localStorage — vì mục đích
//      là "bảo AI vào đó đọc và làm theo", mà localStorage thì AI không đọc
//      được, lại đầy rất nhanh khi dán ảnh.
// ============================================================

/** Một bài test */
export interface BaiTest {
  /** Mã tra cứu, ví dụ "KHO-01" — cũng là khóa lưu kết quả */
  ma: string;
  ten: string;
  /** Các bước làm, đánh số tự động khi hiện */
  buoc: string[];
  /** Câu "Mong đợi" — không có thì bài test vô nghĩa, nên bắt buộc */
  mongDoi: string;
  /**
   * Góc cạnh bài này soi: đường thuận · làm sai xem có chặn không · ca ở rìa ·
   * tiếng Việt · phân quyền. Hiện thành chip nhỏ để Mr. Đại chọn nhanh bài nào
   * cần giữ, bài nào bỏ.
   */
  goc: "thuan" | "sai" | "bien" | "viet" | "quyen";
  /** File mẫu cố tình sai cần dùng — có thì hiện tên để khỏi phải tra bảng */
  fileMau?: string;
}

/** Một tab = một chủ đề test */
export interface TabTest {
  ma: string;
  ten: string;
  /** Nhãn nhỏ chữ hoa trên tiêu đề, ví dụ "NHÓM A · DÒNG DỮ LIỆU" */
  nhom: string;
  /** Câu dẫn: tab này soi cái gì, mở màn nào */
  dan: string;
  bai: BaiTest[];
}

export const NHAN_GOC: Record<BaiTest["goc"], string> = {
  thuan: "đường thuận",
  sai: "làm sai xem có chặn không",
  bien: "ca ở rìa",
  viet: "tiếng Việt",
  quyen: "phân quyền",
};

/** Trạng thái một bài — chưa chấm thì không có bản ghi */
export type TrangThaiBai = "dat" | "khong-dat";

/** Kết quả một bài, đúng thứ Mr. Đại cần khi bảo AI đọc lại */
export interface KetQuaBai {
  trangThai: TrangThaiBai;
  /** Mô tả vấn đề gặp phải */
  ghiChu?: string;
  /** Câu lệnh Mr. Đại viết sẵn để nhờ AI sửa */
  prompt?: string;
  /** Tên file ảnh đã dán (nằm trong thư mục anh/ cùng chỗ) */
  anh?: string[];
  /** Lúc chấm, ISO */
  luc: string;
}

/** Một vấn đề phát sinh NGOÀI kịch bản (tab riêng) */
export interface VanDePhatSinh {
  id: string;
  ten: string;
  prompt: string;
  anh: string[];
  luc: string;
}

export interface SoKetQuaTest {
  /** khóa là mã bài */
  bai: Record<string, KetQuaBai>;
  phatSinh: VanDePhatSinh[];
  capNhatLuc: string;
}

export const SO_RONG: SoKetQuaTest = { bai: {}, phatSinh: [], capNhatLuc: "" };

/** Đếm cho một tab: đã chấm bao nhiêu, đạt bao nhiêu */
export function demTab(tab: TabTest, so: SoKetQuaTest): { daCham: number; dat: number; tong: number } {
  let daCham = 0;
  let dat = 0;
  for (const b of tab.bai) {
    const k = so.bai[b.ma];
    if (!k) continue;
    daCham++;
    if (k.trangThai === "dat") dat++;
  }
  return { daCham, dat, tong: tab.bai.length };
}

/** Đuôi ảnh nhận được khi dán — giữ hẹp để không nhận file lạ */
export const DUOI_ANH_DAN = ["png", "jpg", "jpeg", "webp", "gif"];

/** Trần cỡ một ảnh dán (byte) — ảnh chụp màn hình thường dưới 1 MB */
export const TRAN_ANH = 5 * 1024 * 1024;
