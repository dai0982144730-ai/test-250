// Hiệu lực của hai công tắc ở màn đăng nhập (Cài đặt › Tài khoản người dùng). Hàm thuần — dùng cả ở route và bài kiểm.
/** «Bấm tên là đăng nhập luôn» CHỈ có hiệu lực khi danh sách tài khoản KHÔNG hiện cùng lúc: dữ liệu cũ bật cả hai thì coi như tắt (an toàn). */
export function bamLaDangNhapHieuLuc(tk: { danh_sach_dang_nhap: boolean; bam_la_dang_nhap: boolean }): boolean {
  return tk.bam_la_dang_nhap && !tk.danh_sach_dang_nhap;
}
