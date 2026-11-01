// Cột phải của màn Cây việc đang hiện gì (Mr. Đại chốt 03/10/2026: MỌI chỗ bấm ở cột trái mở nội dung ở cột phải — không chuyển
// trang, không tab mới, không popup/prompt/confirm). File thuần, client dùng chung.
export type Chon =
  | { loai: "tong" }
  | { loai: "nguon"; so: 1 | 2 | 3 | 4 }
  /** `soan` > 0 = vừa bấm "🤖 Xem việc AI soạn sẵn" → khung phải tự soạn (đổi số để soạn lại) */
  | { loai: "nut"; wbs: string; soan?: number }
  | { loai: "viec"; id: string }
  | { loai: "hang-loat"; lan: number }
  | { loai: "gan"; tin: string; loi?: boolean }
  /** Sửa việc soạn sẵn từ issue găng (khối dưới dòng CHƯA AI ĐƯỢC GIAO — Mr. Đại chốt 06/10) → ô giao việc ở khung phải */
  | { loai: "sua-giao"; id: string; wbs: string };

export const khoaChon = (c: Chon): string =>
  c.loai === "nut" ? `nut:${c.wbs}` : c.loai === "viec" ? `viec:${c.id}` : c.loai === "nguon" ? `nguon:${c.so}` : c.loai === "sua-giao" ? `sua-giao:${c.id}` : c.loai;
