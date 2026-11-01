# Kết quả kiểm độc lập — app «SCI Công việc 3004» + mục Trợ lý (Main) — 01/11/2026

**Đối tượng:** lần lưu `1cdb82c` (nhánh `claude/gracious-galileo-n1wzq6`) so với `9982546` — 12 tệp, +672/−27, thư mục `9-APK-dien-thoai/CodeApp-3004`.
**Cách kiểm:** chỉ đọc + đo. Không sửa mã, không dựng APK, không gọi AI thật. Gọi Main thật chỉ bằng tài khoản thử quản trị, chỉ GET + đăng nhập.

## 1. Lời README tự khai — đã đo lại

| Lời khai | Kết quả đo |
|---|---|
| `node --check app.js` qua | ✅ ĐÚNG — chạy lại, qua |
| 25/25 bước giao diện trong Chromium (cầu nối Android giả) | ✅ ĐÚNG — chạy lại `kiem-thu/thu-giao-dien-tro-ly.js` bằng playwright + Chromium trên máy: 25/25 ĐẠT, 0 lỗi JS |
| `index.html` ghép lại từ demo giống hệt | ✅ ĐÚNG — chạy lại `ghep-giao-dien.js` trên bản chiết xuất của lần lưu, so với tệp đã lưu: giống từng chữ (chỉ khác ký tự xuống dòng CR do cách chiết xuất); `thuan.js` cũng giống |
| Kotlin biên dịch 10 tệp 0 lỗi | ⚪ KHÔNG ĐO ĐƯỢC — máy này không có `kotlinc`/Java/Android SDK. Chỉ soát bằng mắt: các kiểu `Api.Kq`, `Api.LoiMang`, `Nhat.ghi`, `Api.gomCookie` có thật; import đủ; không thấy lỗi rõ |
| Chưa kiểm: APK thật, ký, Xiaomi, máy chủ thật | ✅ README khai thật; vẫn đúng là chưa ai kiểm |

## 2. Khuôn API thật của Main so với cầu nối giả của bài kiểm

Bài kiểm 25 bước dùng cầu nối giả do chính người viết app dựng. Em đối chiếu với Main đang chạy (cổng 3010, tài khoản thử quản trị):

| Điểm | Đo thật |
|---|---|
| Đăng nhập `POST /api/auth/login {email,password}` | ✅ 200 `{"ok":true,"role":"admin"}`, đúng một cookie `sci_session`, `Max-Age=28800` (8 giờ), HttpOnly |
| Hết phiên / cookie hỏng / không cookie | ✅ 307 → `/login` cả ba trường hợp — đúng điều app dựa vào (`TroLyMain.goiMot` đọc mã 3xx có `/login`) |
| `GET /api/ai/chat/sessions` | ✅ `{ok, sessions[]}` đúng khuôn app đọc |
| Giới hạn 4.000 ký tự | ✅ khớp `MAX_MESSAGE_CHARS = 4000` ở `api/ai/chat/route.ts:54` |
| `messages` có trả `choDuyet` | ✅ có (`messages/route.ts:45`) — mở lại phiên sẽ thấy lại thẻ chờ duyệt |
| Đường có `..` (`/api/ai/chat/../../me`, `/../projects`) | ✅ Main trả 404 cả hai — chốt chặn `startsWith("/api/ai/chat")` yếu về lý thuyết nhưng không khai thác được, và chỉ mã trong app gọi được |

## 3. Phát hiện

| Mã | Mức | Điều đo được | Đo hay chỉ đọc |
|---|---|---|---|
| **AP-01** | 🟡 | **App không gửi `?project=`** (web thì gửi theo dự án đang chọn — `ChatPanel.tsx` `projectQuery`). Main rơi về **dự án đầu danh sách** (`resolveProjectId` → `listProjects()[0]`, danh sách chung cho mọi người). Tài khoản thử thấy 16 dự án; đầu danh sách = Điện gió Hướng Việt; cả 4/4 phiên trả về thuộc dự án này. Hệ quả: người đang làm dự án khác hỏi «dự án này…» vẫn được trả lời theo Hướng Việt, và nút ✅ Làm (giao việc…) chạy trên dự án đầu. Người không có quyền vào dự án đầu có thể nhận 403 (đọc mã `canAccessProjectByEmail`, chưa thử bằng tài khoản thường) | Đo (dự án đầu, 4/4 phiên) + đọc mã (403) |
| **AP-02** | 🟡 | **Bấm ✅ Làm gặp lỗi mạng → thẻ chờ duyệt biến mất** (1 → 0), chỉ còn dòng «Không kết nối được Main». Người dùng không biết lệnh đã chạy hay chưa. Gốc: `xacNhan` ở `app.js` ~dòng 1890 xoá thẻ khỏi danh sách mọi trường hợp lỗi, kể cả mã 0 (mất mạng/quá 300 giây). Cứu được: «Phiên cũ» → mở lại phiên thì Main trả `choDuyet` về | Đo bằng cầu nối giả trả mã 0 |
| **AP-03** | 🟡 | **Mật khẩu SCI Công việc đem thử sang Main** khi ô mật khẩu Main để trống và hai địa chỉ cùng máy (so `host`, không so cổng). Thiết kế đã được duyệt (câu 2A) và có hàng rào «khác máy thì không gửi»; rủi ro còn lại: gửi qua `http://` không mã hoá trong Wi-Fi công ty (giống đăng nhập 3004 hiện tại, không phải loại rủi ro mới) và cùng một mật khẩu cho hai hệ | Đọc mã `TroLyMain.kt:34-40` |
| **AP-04** | ⚪ | `mainApi` chỉ kiểm `startsWith("/api/ai/chat")`: không chặn `..`, không liệt kê `method`. Không khai thác được (xem mục 2) nhưng nên siết bằng regex `^/api/ai/chat(/(sessions\|messages\|xac-nhan))?(\?[^/]*)?$` | Đo (404) |
| **AP-05** | ⚪ | Địa chỉ Main gợi ý luôn là «cùng host + `:3010`». Với 3004 chạy `https://congviec.scigroup.vn` thì gợi ý thành `https://congviec.scigroup.vn:3010` — không có thật. Chỉ đúng kịch bản Wi-Fi nội bộ như README tả | Đọc mã `diaChiGoiY` |
| **AP-06** | ⚪ | Cookie Main (`main_cookie`) lưu chữ thường trong `SharedPreferences` riêng của app — cùng cách app gốc lưu cookie 3004. `allowBackup="false"` nên không bị sao lưu đám mây; mật khẩu Main mã hoá Keystore | Đọc mã + Manifest |
| **AP-07** | ⚪ | App bỏ qua `uiActions` Main trả về (mở tab, thao tác giao diện, chuyển dự án). Câu trả lời có thể viết «đã mở tab Gantt» mà app không mở gì; README liệt kê giới hạn (không xuất tệp, 📎, 🌐, chọn model, «Duyệt & tạo file») nhưng **chưa ghi** giới hạn này | Đọc mã (`app.js` không có `uiActions`) |

## 4. Đã thử phá nhưng KHÔNG thủng

| Thử | Kết quả |
|---|---|
| Chèn `<script>` trong câu trả lời | thoát HTML (`esc()` chạy trước `md()`) — hộp thoại XSS: không có |
| Liên kết `[a](/x"onmouseover="alert(1))` | thuộc tính lạ trong khung: **0** — `esc()` đổi `"` thành `&quot;` |
| `[a](javascript:alert(1))`, `[b](//evil.example/x)` | bấm không mở gì (chỉ mở `http(s)://…` hoặc `/đường` ghép vào địa chỉ Main) |
| `[c](https://evil.example/y)` | **mở bằng trình duyệt ngoài** khi người dùng bấm — đúng thiết kế, nhưng lời AI có thể bị chèn nội dung từ dữ liệu dự án; ghi nhận, không sửa |
| WebView trỏ đi chỗ khác | `shouldOverrideUrlLoading` chỉ cho `file:///android_asset/`, còn lại mở ngoài app — cầu nối `Android` không lộ ra trang lạ |
| Dấu hiệu lộ khoá/ký | `git ls-tree` không có `.jks`, `.keystore`, `local.properties`, `.apk`, `.env` trong lần lưu |

## 5. Chưa kiểm được (nói thẳng)

- Biên dịch Kotlin, dựng và ký APK, chạy trên máy thật (Xiaomi 14 Ultra) — máy này không có công cụ.
- Hành vi mạng thật từ điện thoại: tường lửa cổng Main, `usesCleartextTraffic="true"`, thời gian chờ 300 giây trên mạng di động.
- Gửi một câu hỏi AI thật và bấm ✅ Làm thật (cố ý không làm: gọi AI thật + ghi dữ liệu).
- Người dùng thường (không phải quản trị) — AP-01 phần 403 mới chỉ đọc mã.

## 6. Tệp bài đo

Bài đo thêm (lỗi mạng ở ✅ Làm, liên kết lạ) nằm ở thư mục tạm của phiên kiểm, không đưa vào kho: `…\scratchpad\apk\do-them.js`.
