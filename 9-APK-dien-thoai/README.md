# SCI Công việc — ứng dụng Android (APK)

Chuông «57+11» · dòng báo họp (đỏ nháy / đỏ chạy ngang / vàng «CHUẨN BỊ ĐI ĐẾN CUỘC HỌP») · Việc của tôi · Phòng ban · Dự án · Phòng họp (lịch + đăng ký) · màn «Giữ thông báo không bị lỡ». Thiết kế chống lỡ thông báo trên Xiaomi: `THIET-KE-KHONG-LO-THONG-BAO.md`. Demo thước: `demo/demo-apk-cong-viec.html`.

| Việc | Cách |
|---|---|
| Cài lên điện thoại | Chép `dist/SCI-Cong-viec-0.1.6.apk` sang điện thoại, mở, cho phép «cài từ nguồn không xác định» |
| Đăng nhập | Nhập email, mật khẩu, địa chỉ máy chủ (live: `https://congviec.scigroup.vn`). Điện thoại KHÔNG vào được `localhost` |
| Dựng lại APK | Xem «Dựng APK» dưới đây |

## Dựng APK (máy dựng của anh)

Công cụ nằm ở `C:\dev` (JDK 17 · Gradle 8.7 · Android SDK 34). Android Gradle Plugin **từ chối đường dẫn có chữ tiếng Việt có dấu** (thư mục «Tiến độ») nên build qua **liên kết ASCII** `C:\dev\apk-src` trỏ về `CodeApp` (tạo bằng `mklink /J`):

```bash
cd /c/dev
export JAVA_HOME="C:/dev/jdk-17" ANDROID_HOME="C:/dev/android-sdk" ANDROID_SDK_ROOT="C:/dev/android-sdk"
node "D:/3 SETUP/1 AI/SCI Tiến độ/SCI-AI-AGENT/9-APK-dien-thoai/CodeApp/ghep-giao-dien.js"   # ghép giao diện từ demo
"C:/dev/gradle-8.7/bin/gradle.bat" --no-daemon --project-dir "C:/dev/apk-src" assembleDebug
# APK: C:\dev\apk-src\app\build\outputs\apk\debug\app-debug.apk
```

APK phát hành ký bằng khoá riêng **C:devkeyssci-congviec.jks** (mật khẩu trong sci-keystore.properties cùng thư mục, NGOÀI dự án, không đưa vào git). **Sao lưu thư mục C:devkeys**: mất khoá thì không cập nhật đè lên bản đã cài được, người dùng phải gỡ rồi cài lại. Bản 0.1.0 (debug) bị Xiaomi từ chối cài («ứng dụng chưa được cài đặt») nên đã thay bằng bản phát hành 0.1.1.

## Cấu trúc

- `CodeApp/app/src/main/java/vn/scigroup/congviec/` — Kotlin: `Api` (đăng nhập, cookie theo mọi tên), `Nhip` + `NhipService` (dịch vụ nền hỏi 60 giây), `Bao` (báo thức họp + cứu hộ), `TB` (kênh + thông báo), `MainActivity` + cầu nối `Cau`.
- `CodeApp/app/src/main/assets/app/` — giao diện web: `index.html` (ghép từ demo), `app.js` (nối API thật), `thuan.js` (chung với bản PC).
- Không có thư viện ngoài (ít thứ để hỏng, APK ~0,85 MB).
