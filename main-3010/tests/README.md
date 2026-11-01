# Bộ E2E test toàn dự án

## Cách chạy

1. Bật server dashboard tại cổng **3100** (test gọi `http://localhost:3100`):

   ```bash
   npx next start -p 3100        # bản đã build
   # hoặc: npm run dev -- -p 3100
   ```

2. Chạy toàn bộ test:

   ```bash
   npm run test:e2e
   ```

Script kiểm tra server đầu tiên — nếu không kết nối được sẽ in hướng dẫn và thoát.
Exit code `1` khi có case FAIL (dùng được cho CI). Có thể đổi địa chỉ server qua
biến môi trường `E2E_BASE`.

## Phạm vi — 6 nhóm

| Nhóm | Nội dung |
|------|----------|
| A | Phân quyền: route guard, session, cookie giả, 3 vai trò pm/engineer/field |
| B | Quản trị người dùng: CRUD, khóa/mở, reset & đổi mật khẩu, chặn biên |
| C | Tích hợp bên thứ 3: token UI (mask, nhận ngay), Smartsheet/Supabase/GDrive status, upload BC Tuần/Ngày, kiểm tra chéo, xuất DOCX |
| D | Kênh Claude Desktop: API ai-output (forecast/alerts/productivity), overlay Gantt, prompts S1–S6 |
| E | Module tiến độ nội bộ: CPM (chuỗi P04, lag 28d), chu trình, buffer mùa bão, baseline, chuyển nguồn native/smartsheet/seed |
| F | Phủ toàn bộ trang & biên: render 13 trang đúng title, /login, API biên (body thiếu, email trùng/sai, path traversal, file sai định dạng…), nút Hướng dẫn |

## Lưu ý

- **Test tự dọn dữ liệu** về trạng thái demo sạch ở cuối (kể cả khi có FAIL):
  xóa `data/weekreport-*`, `dayreport-*`, `ai-*`, `schedule.json`, `baseline-*`,
  user `test-*`; reset các key settings đã đổi. Giữ nguyên `users.json` với
  3 tài khoản gốc.
- Case **SKIP** là chủ đích, không phải lỗi: "MCP Smartsheet đã cấu hình" chờ
  token thật; "Nút Hướng dẫn trang chủ" chờ hệ thống help đang build song song.
- Test dùng 3 tài khoản demo (`dai@sci.vn` / `duong@sci.vn` / `hientruong@sci.vn`,
  mật khẩu `Sci@2026`) — không chạy trên môi trường đã đổi mật khẩu các tài khoản này.
