# Câu hỏi còn chờ bố chốt — mặc định con đã dùng khi làm

Kế hoạch v2 (24/09/2026) mục "Cần bố chốt" còn 8 câu. Để không đứng việc, con làm theo đề xuất trong kế hoạch;
mọi mặc định dưới đây đều là **cấu hình** (trang Cài đặt) hoặc **dữ liệu** (trang Quản trị), đổi được không sửa code.

| # | Câu hỏi | Mặc định đang dùng | Đổi ở đâu |
|---|---|---|---|
| 1 | Mặc định quy tắc đè | "Cấp trước, cùng cấp so ngày", "ngày sau" tính theo kỳ báo cáo, "đã xong" luôn ghi nhận | Cài đặt › Quy tắc đè, luôn mở |
| 2 | Bảng Công việc chuẩn trong 9 mẫu | Đã thêm vào cả 9 mẫu thay thế: Mã việc · Công việc · Dự án · Người phụ trách · Bắt đầu · Kết thúc · Kết quả cần có · Đã xong, kèm ô nhập gắn mã | Mẫu Word |
| 3 | Mở xem nội dung tài liệu phòng khác | Ai cũng mở xem được (cấu trúc thư mục luôn thấy) | Cài đặt › Thư mục › "Xem nội dung phòng khác" = theo quyền |
| 4 | Quyền xóa mặc định | Người tải lên, trưởng đơn vị của thư mục, quản trị viên; xóa vào thùng rác, lịch sử giữ nội dung | Quản trị › Vai trò và quyền |
| 5 | Ký duyệt | Chưa làm (để giai đoạn 7 nếu bố cần) | — |
| 6 | Agent nào đọc sổ cái, thêm trường gì | Cổng MCP `socai.*` + API `/api/v1/so-cai` theo đúng mẫu JSON trong kế hoạch; agent nào cũng dùng được khi được cấp khóa | Quản trị › Khóa cho agent; `docs/SO-CAI-CHO-AGENT.md` |
| 7 | Gia hạn, đổi người, đóng việc | Chỉ người giao việc (hoặc người có quyền giao việc đủ phạm vi) | Cài đặt › Sổ cái › "Chỉ người giao được sửa" |
| 8 | Tên miền, email nhắc việc | `docflow.scigroup.vn`; nhắc việc trong app, email chờ hộp thư gửi | Cài đặt › Thông báo |

## Việc giai đoạn 0 cần bố / anh Đại gửi
- **9 file mẫu Word thật (Form 0 – Form 8)**: máy này không có. Con dựng 9 mẫu thay thế theo mô tả trong kế hoạch
  (`mau-word/`). Khi có file thật: quản trị tải lên ở trang Mẫu Word, gắn ô nhập theo đúng mã (tag) của mẫu thay thế.
- **Danh sách người dùng của 9 đơn vị** (Excel: Họ tên, Email, Đơn vị, Chức vụ, Vai trò) — nhập ở Quản trị › Nhập Excel.
  Hiện có sẵn người dùng mẫu để chạy thử (mật khẩu `Sci@2026`).
- Trỏ DNS, kho GitHub, quyền vào máy chủ: xem `deploy/TRIEN-KHAI.md`.
- Mật khẩu PostgreSQL: trên máy này con không dùng mật khẩu của web khác; app chạy bằng Postgres nhúng (`data/pgdata`).
  Muốn chạy trên PostgreSQL thật thì tạo CSDL riêng theo `deploy/tao-csdl.sql` rồi điền `DATABASE_URL` vào `.env.local`.
