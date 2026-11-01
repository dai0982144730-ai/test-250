# Kế hoạch: app «SCI Công việc 3004» (bản thứ hai) + mục chat trợ lý Main

*01/11/2026 · gốc: `9-APK-dien-thoai/CodeApp` (v0.1.32, versionCode 33) · **chưa code**, chờ anh duyệt · thay cho bản đề xuất trước (đã xoá, vì trỏ vào `apk-CodeApp` đã bỏ).*

## 1. Hai app khác nhau ở đâu (đo bằng lệnh)

| Phần | Dùng chung với app live | Khác ở app 3004 |
|---|---|---|
| Mã Kotlin (9 tệp, 1.282 dòng) và `app.js` (1.725 dòng) | Gần như toàn bộ: màn Việc của tôi, Phòng ban, Dự án, Phòng họp, chuông, báo thức họp, dịch vụ nền, kẹp tệp | Thêm mục Chat (mục 3) |
| Tên gói / tên hiển thị | — | Đổi `applicationId` `vn.scigroup.congviec` → `vn.scigroup.congviec3004`; tên «SCI Công việc 3004» (hiện: «SCI Công việc»). `namespace` giữ nguyên để khỏi đổi 9 tệp |
| Địa chỉ máy chủ | Ô nhập đã có (không cứng) | Mặc định `app.js:59` là `https://congviec.scigroup.vn` → đổi gợi ý sang `http://192.168.…:3004`; cảnh báo ⚠ `http://` (dòng 66, 81) bỏ cho dải IP riêng |
| Đăng nhập, cookie, tự đăng nhập lại | `Api.kt`: cookie theo mọi tên, nhớ mật khẩu mã hoá | Không đổi. 3004 nhận `{email, mat_khau}` đúng như app gửi |
| API gọi (18 đường) | — | Cả 18 đã có trong `3004-cong-viec`. Khác biệt duy nhất tìm được: `da_doc_gan_day` (3004) / `so_da_doc` (live), app đã xử lý |
| Menu đáy | 4 mục: `toi`, `pb`, `da`, `ph` | Thêm mục thứ 5 «Chat» (`index.html:314`) |
| Cổng chat | — | Mới: thêm `Cau.chat…` trong `MainActivity.kt`, cookie thứ hai, thời gian chờ dài (hiện `Api.kt` cắt ở 15 giây, Main cho AI chờ tới 150 giây) |
| Khoá ký, thư mục dựng | Dùng chung `C:\dev\keys\sci-congviec.jks` | Cùng khoá ký được (khác tên gói thì không đè nhau) |
| Dựng APK | `ghep-giao-dien.js` đọc `../demo`; **cần chạy lại nếu sửa CSS** | Nếu chỉ sửa `app.js`/`index.html` thì không cần ghép |

**Cách giữ hai app không lệch nhau (đề xuất, chờ anh duyệt):** sao `CodeApp` thành `9-APK-dien-thoai/CodeApp-3004` rồi sửa ở đó, **không** đụng `CodeApp` (bản live đang ổn định). Nhược: sửa lỗi chung phải làm hai chỗ.

## 2. Các câu cần anh quyết

*Anh chưa trả lời bốn câu em hỏi, nên dưới đây em ghi gợi ý; anh chỉ cần trả lời «1A 2A 3A 4A» hoặc đổi.*

### Câu 1 — Điện thoại thấy «localhost:3004» bằng cách nào?
| Phần | Nội dung |
|---|---|
| Vấn đề + số đo | Trong điện thoại, `localhost` là chính điện thoại, không phải PC. Máy chủ 3004 đã mở `-H 0.0.0.0` và tự thêm luật tường lửa Private (`chay-ung-dung.ps1:110,142`); app đã cho `http://` (`usesCleartextTraffic=true`) |
| Gợi ý | **A. IP LAN cố định**: đặt «địa chỉ giữ chỗ» cho PC trong router, nhập `http://192.168.x.x:3004` một lần |
| Vì sao | Không tốn tiền, không cài thêm, cùng Wi-Fi là chạy; đủ để thử trên Xiaomi 14 Ultra |
| Nhược điểm | Ra khỏi Wi-Fi là mất; mật khẩu đi `http` không mã hoá |
| Không chọn | **B. Cáp USB `adb reverse`** (gõ được đúng `http://localhost:3004`): + không phụ thuộc Wi-Fi; − phải cắm cáp, chạy 1 lệnh mỗi lần cắm lại. **C. Tunnel Cloudflare/Tailscale**: + mọi nơi, có https; − phải cài và giữ dịch vụ ở PC, link có thể đổi |

### Câu 2 — Chat với Main đi đường nào?
| Phần | Nội dung |
|---|---|
| Vấn đề + số đo | `main-3010/src/app/api/tro-ly/` chỉ có 3 cửa (`model`, `xuat`, `dinh-kem`), **không có chat**; chat thật là `POST /api/ai/chat` (+ `/sessions`, `/messages`, `/xac-nhan`) cổng 3010, đăng nhập riêng (`sci_session`, 8 giờ), câu ≤ 4.000 ký tự. 3004 có chat riêng và tự hỏi Main khi cần (`chat-tools.ts:811`) |
| Gợi ý | **A. Gọi thẳng Main 3010**: thêm ô «Địa chỉ Main» (mặc định cùng IP, cổng 3010), cookie thứ hai |
| Vì sao | Đúng yêu cầu «trợ lý AI của Main», đúng quyền và hàng chờ ✅/❌ của Main |
| Nhược điểm | Mở thêm cổng 3010; đăng nhập Main riêng; thêm ~150–250 dòng mã; phải nâng thời gian chờ ≥ 150 giây |
| Không chọn | **B. Qua `/api/ai/chat` của 3004**: + ít việc nhất (~100 dòng), một máy chủ; − là trợ lý Công việc, chỉ hỏi Main khi nó tự thấy cần. **C. Làm cả hai có nút chuyển**: + đầy đủ; − gấp đôi công thử |

### Câu 3 — Cài đặt cạnh app cũ
| Phần | Nội dung |
|---|---|
| Vấn đề + số đo | App live hiện ổn định, 24 bản đã phát, cùng `applicationId`+khoá ký |
| Gợi ý | **A. Cài song song** (tên gói mới) |
| Vì sao | Hỏng bản mới không ảnh hưởng bản đang dùng |
| Nhược điểm | Hai biểu tượng; hai dịch vụ nền; **hai chuông/hai báo thức họp trùng nhau** nếu cùng tài khoản; số huy hiệu hai app |
| Không chọn | **B. Cài đè**: + một app; − hỏng là mất bản ổn định |

### Câu 4 — Phạm vi chat bản đầu
| Phần | Nội dung |
|---|---|
| Vấn đề + số đo | Main có thêm ✅Làm/❌Bỏ (`/xac-nhan`), đính kèm (`/api/tro-ly/dinh-kem`), xuất tệp (`/api/tro-ly/xuat`) |
| Gợi ý | **A. Bản đầu: hỏi–đáp + danh sách phiên + ✅/❌**; đính kèm và tải tệp xuất để bản sau |
| Vì sao | ✅/❌ là cửa an toàn của Main: không có thì công cụ ghi không dùng được trên điện thoại; hai cái kia lớn, ít cần |
| Nhược điểm | Chưa gửi ảnh/tài liệu, chưa tải Word/Excel trợ lý tạo |
| Không chọn | **B. Làm đủ cả 4 ngay**: + đủ tính năng; − gấp ~2–3 lần công thử, khó kiểm |

## 3. Việc sẽ làm sau khi anh gật (chưa làm)

| # | Việc | Ai làm |
|---|---|---|
| 1 | Sao `CodeApp-3004`, đổi tên gói/tên app, đổi mặc định địa chỉ, bỏ ⚠ cho IP LAN | phiên này |
| 2 | Mục «Chat»: danh sách phiên, khung chat, «đang suy nghĩ…», ✅/❌; cookie Main riêng | phiên này |
| 3 | Chuyển lỗi: Main trả `{ok:false,message}`, 3004 trả `{loi}` — app đọc cả hai | phiên này |
| 4 | Kiểm độc lập (anh đã chốt 29/10) | phiên kiểm |
| 5 | Build + ký APK; thử Xiaomi 14 Ultra, đo giây trả lời | phiên trên máy anh |

## 4. Chưa đo được ở đây

| Thiếu | Hệ quả |
|---|---|
| Máy chủ 3004/3010 chạy thật, `.env` hai bên | Chưa gọi thử, chưa biết AI Main đã bật, `AUTH_SECRET_CHUNG` đặt chưa |
| Bản live | Chưa so đủ khác biệt API |
| JDK/SDK, khoá ký, Xiaomi | Không build/thử được |
