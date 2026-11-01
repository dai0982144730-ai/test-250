# SCI Công việc 3004 — app Android bản thứ hai (chạy với agent 3004 + trợ lý Main)

*01/11/2026 · gốc: `../CodeApp` bản 0.1.32 · Mr. Đại duyệt kế hoạch `../KE-HOACH-APK-3004-CHAT-MAIN.md` (1A · 2A · 3A · 4A).*

## Khác gì app live

| Phần | App live (`CodeApp`) | App 3004 (`CodeApp-3004`) |
|---|---|---|
| Tên gói / tên app | `vn.scigroup.congviec` · «SCI Công việc» | `vn.scigroup.congviec3004` · «SCI Công việc 3004» → **cài song song**, không đè |
| Phiên bản | 0.1.32 (bản 33) | 3004-0.1.0 (bản 1) |
| Địa chỉ máy chủ | mặc định `https://congviec.scigroup.vn` | để trống, gợi ý `http://192.168.1.10:3004` |
| Cảnh báo `http://` | lỗi: hiện chữ «/^http:/» khi gõ | không cảnh báo IP nội bộ; gõ `localhost` → nhắc dùng IP Wi-Fi |
| Menu đáy | 4 mục | 5 mục, thêm **Trợ lý** |
| Trợ lý Main | — | chat với trợ lý AI của Main: hỏi–đáp, phiên cũ, ✅ Làm / ❌ Bỏ |
| Thông báo | «SCI Công việc · …» | «SCI Công việc 3004 · …» (phân biệt khi cài cả hai) |
| Còn lại | | **giống hệt**: việc, phòng ban, dự án, phòng họp, chuông, báo họp, dịch vụ nền, kẹp tệp |

## Tệp đã sửa (so với `CodeApp`)

| Tệp | Sửa |
|---|---|
| `app/build.gradle.kts` | tên gói, số phiên bản |
| `res/values/strings.xml` | tên app |
| `TroLyMain.kt` (mới) | đăng nhập Main (`{email, password}`), gọi `/api/ai/chat*`, chờ tới 300 giây, tự đăng nhập lại; Main hết phiên thì **chuyển hướng /login** chứ không trả 401 → app tự nhận ra |
| `Cfg.kt` | lưu phiên Main riêng (`main_*`), mật khẩu Main mã hoá Keystore như mật khẩu 3004 |
| `MainActivity.kt` | cầu nối `mainTrangThai · mainDangNhap · mainApi · mainThoat`; `mainApi` chỉ cho đường `/api/ai/chat…`; Đăng xuất app = quên cả phiên Main |
| `TB.kt` | chữ «SCI Công việc 3004» trên thông báo |
| `assets/app/app.js` | mục Trợ lý + sửa ô địa chỉ máy chủ |
| `ghep-giao-dien.js` → `index.html` | nút «Trợ lý», màn chat, CSS; bỏ qua chép `thuan.js` khi thư mục nguồn PC không có |

## Đã kiểm ở phiên đám mây (đo thật)

| Kiểm | Kết quả |
|---|---|
| Biên dịch Kotlin cả 10 tệp (kotlinc 2.0.21 + thư viện Android 14, `R` giả) | 0 lỗi · bản gốc cũng 0 lỗi (đối chứng) |
| `node --check app.js` | đạt |
| Ghép lại `index.html` từ bản gốc trước khi sửa | khớp từng byte → ghép bản mới đáng tin |
| Chạy giao diện trong Chromium, cầu nối Android giả theo đúng khuôn API Main | 25/25 bước đạt (đăng nhập Main, gửi câu, bảng, chip, ✅ Làm, phiên cũ, Back, thoát, ô địa chỉ, không chèn được `<script>`) |
| Chưa kiểm | build APK thật, ký, máy Xiaomi, máy chủ 3004/Main thật |

## Sửa sau kiểm độc lập 01/11/2026 (`../kiem-tra-doc-lap/01-11-app-3004-tro-ly-main.KET-QUA.md`)

| Mã | Đã sửa |
|---|---|
| AP-01 | **Ô chọn dự án** ở đầu khung Trợ lý, đúng demo `../demo/demo-apk-tro-ly-chon-du-an.html` (Mr. Đại duyệt 01/11). Danh sách lấy từ `GET /api/projects` của Main (đã lọc quyền). Nhớ dự án theo email; chỉ một dự án thì chọn luôn; chưa chọn thì khoá ô gửi (hiện mờ). Mọi cuộc gọi `/api/ai/chat`, `/sessions`, `/messages` gửi kèm `?project=`. Đổi dự án = chat mới của dự án đó; phiên đang mở nhớ riêng từng dự án. ≥20 dự án có ô tìm |
| AP-02 | ✅ Làm gặp mất mạng / quá giờ chờ: **giữ thẻ chờ duyệt**, báo «Chưa rõ lệnh đã chạy hay chưa… mở Phiên cũ để kiểm» |
| AP-04 | `mainApi` chỉ cho GET/POST và đúng mẫu đường `^/api/(ai/chat(/(sessions\|messages\|xac-nhan))?\|projects)(\?…)?$`, chặn `..` (`TroLyMain.duongDuocGoi`) |
| AP-05 | Địa chỉ Main chỉ tự gợi ý `:3010` khi 3004 là `http://` máy nội bộ (IP riêng, localhost, `.local`); tên miền công khai thì để trống cho người dùng nhập |
| AP-07 | Ghi giới hạn dưới đây |

## Giới hạn của bản này (chưa làm)

- **Bỏ qua `uiActions` của Main** (mở tab, chuyển màn, đổi dự án trên giao diện web). Câu trả lời có thể viết «đã mở tab Gantt» nhưng app không mở gì — muốn xem thì mở web Main.
- Chưa có: xuất tệp, kẹp tệp 📎, tìm web 🌐, chọn model, nút «Duyệt & tạo file».
- Bài thử giao diện `kiem-thu/thu-giao-dien-tro-ly.js` sau khi sửa: **39/39 bước đạt** (máy chủ của anh, Chromium 1234, cầu nối giả). Kotlin chưa biên dịch lại sau lần sửa này.

## Việc của phiên trên máy chủ của anh

1. Dựng như `CodeApp` (README chung), nhưng liên kết riêng: `mklink /J C:\dev\apk-src-3004 "<…>\9-APK-dien-thoai\CodeApp-3004"`, rồi `gradle --project-dir C:/dev/apk-src-3004 assembleRelease`. Cùng khoá ký `sci-congviec.jks`.
2. Không cần chạy `ghep-giao-dien.js` (đã ghép sẵn). Nếu sửa CSS demo thì chạy `node CodeApp-3004/ghep-giao-dien.js`.
3. Máy chủ: 3004 chạy bằng `CHAY-UNG-DUNG.bat` (đã mở `0.0.0.0` + tường lửa). **Main phải mở cổng tường lửa riêng** (không script nào làm). Cổng Main tuỳ cách chạy: `npm run dev` = 3010, `CHAY-UNG-DUNG.bat` = **3100**. Lệnh (PowerShell quyền quản trị, đổi số cổng cho đúng):
   `New-NetFirewallRule -DisplayName 'SCI Main 3010' -Direction Inbound -Protocol TCP -LocalPort 3010 -Action Allow -Profile Domain,Private`
4. Kiểm Main đã bật kết nối AI (Cài đặt → Kết nối AI); tài khoản thử phải là Người dùng trở lên (Người xem bị Main chặn trợ lý).

## Thử trên Xiaomi 14 Ultra

| # | Làm | Mong đợi |
|---|---|---|
| 1 | Cài APK (app cũ vẫn còn) | 2 biểu tượng: «SCI Công việc» và «SCI Công việc 3004» |
| 2 | Đăng nhập `http://<IP PC>:3004` | vào được Việc của tôi; ô lỗi không hiện «/^http:/» |
| 3 | Bấm **Trợ lý** → địa chỉ Main tự điền `http://<IP PC>:3010`, để trống mật khẩu | đăng nhập được nếu mật khẩu Main giống mật khẩu 3004 |
| 4 | Hỏi «Hướng Việt có bao nhiêu issue?» | thấy đếm giây, rồi câu trả lời + chip «✓ Agent … trả lời»; ghi lại số giây |
| 5 | Nhờ trợ lý làm một việc có ghi dữ liệu | hiện ✅ Làm / ❌ Bỏ; bấm thì có câu xác nhận |
| 6 | «Phiên cũ» → mở phiên làm trên web Main | thấy đủ tin của phiên đó |
| 7 | Tắt Wi-Fi rồi gửi | báo «Không kết nối được Main», câu hỏi trả lại vào ô |

## Giới hạn bản đầu (đã chốt câu 4A)

Chưa có: xuất file Word/Excel…, kẹp tệp 📎 cho trợ lý, tìm web 🌐, chọn model, nút «Duyệt & tạo file». Hỏi kiểu «xuất ra excel» thì Main vẫn trả lời, nhưng phải tải tệp và duyệt kế hoạch trên web Main. Link trong câu trả lời (vd `/alerts`) mở trang web Main bằng trình duyệt.
