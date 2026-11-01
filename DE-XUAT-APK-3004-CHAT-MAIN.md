# Đề xuất: app Android chạy với agent Công việc 3004 + mục chat trợ lý Main

*01/11/2026 · Chỉ là đề xuất, **chưa viết dòng code nào**. Chờ anh gật từng câu hỏi ở mục 3.*

## 1. App hiện có — đo bằng lệnh

| Mục | Số đo |
|---|---|
| Giao diện | `app.js` 1.725 dòng, bọc trong WebView; vỏ Kotlin 9 tệp (`MainActivity.kt` 338 dòng) |
| Địa chỉ máy chủ | **Đã có ô nhập** ở màn đăng nhập (mặc định `https://congviec.scigroup.vn`) — không cần làm ô mới |
| Chạy `http://` | `usesCleartextTraffic="true"` → IP LAN dạng `http://192.168.x.x:3004` chạy được |
| Cảnh báo `http://` | Chỉ miễn cho `localhost`/`127.0.0.1`; IP LAN sẽ hiện chữ ⚠ đỏ (chỉ cảnh báo, **không chặn**) |
| API app đang gọi | 18 đường; **cả 18 đều có route trong `3004-cong-viec`** (đã dò từng đường) |
| Đăng nhập | `POST /api/auth/login` `{email, mat_khau}`; app tự nhận cookie **bất kỳ tên nào** (3004 trả `sci_congviec_session`); nhớ mật khẩu mã hoá, tự đăng nhập lại khi hết 8 giờ |
| Khác biệt 3004 ↔ live | Chỉ thấy 1 chỗ trong mã: số tin đã đọc tên `da_doc_gan_day` (3004) so với `so_da_doc` (live) — app đã xử lý. Không có bản live trong kho nên **chưa so được đầy đủ** |
| Máy chủ 3004 | `CHAY-UNG-DUNG.bat` mở cổng `-H 0.0.0.0` và tự thêm luật tường lửa (chỉ mạng Domain/Private) → điện thoại cùng Wi-Fi vào được |

## 2. Trợ lý Main — đo từ mã

| Mục | Số đo |
|---|---|
| Lưu ý tên | `main-3010/src/app/api/tro-ly/` **không có cửa chat**, chỉ có `model`, `xuat`, `dinh-kem`. Cửa chat thật là **`POST /api/ai/chat`** (kèm `/sessions`, `/messages`, `/xac-nhan`) |
| Gửi | `{ sessionId?, message ≤ 4.000 ký tự }`; không gửi `sessionId` thì tự tạo phiên |
| Nhận | `{ ok, reply, actions, uiActions, choDuyet, session }`; lỗi có dạng `{ ok:false, message }` (3004 dùng `{ loi }` — khác nhau) |
| Đăng nhập Main | `POST /api/auth/login` `{ email, password }` → cookie `sci_session`, 8 giờ. Sổ người dùng **riêng** của Main; không trả tên người dùng |
| Thời gian chờ | Main cho AI tối đa **150 giây** (`hoi-main.ts`); app hiện cắt ở **15 giây** (`Api.kt`) → câu chat dài sẽ báo lỗi giả nếu dùng đường cũ |
| Công cụ GHI | Không chạy ngay; vào hàng chờ, người bấm ✅ Làm / ❌ Bỏ (`/xac-nhan`) |
| Đã có sẵn ở 3004 | 3004 có trợ lý riêng `POST /api/ai/chat` (cùng cookie, không cần đăng nhập thêm) và **tự chuyển câu hỏi cần dữ liệu agent khác sang Main** (`chat-tools.ts:811` → `main.tra_loi_cau_hoi`) |

## 3. Các câu cần anh quyết

### Câu 1 — Điện thoại nối tới máy chủ 3004 bằng đường nào?

| Phần | Nội dung |
|---|---|
| **Vấn đề + số đo** | Điện thoại không thấy `localhost:3004` của PC. Máy chủ đã mở `0.0.0.0` + tường lửa Private, app đã cho nhập `http://`. IP LAN của PC đổi khi router cấp lại (chưa đo được ở đây) |
| **Phương án gợi ý** | **A. IP LAN cố định** (đặt "địa chỉ giữ chỗ" cho PC trong router), nhập `http://192.168.x.x:3004` một lần. Không đổi mã app, trừ việc bỏ chữ ⚠ cho dải IP riêng (192.168/10/172.16) |
| **Vì sao** | Rẻ nhất, không tốn tiền, không thêm phần mềm; đủ cho lúc anh thử trên Xiaomi 14 Ultra cùng Wi-Fi |
| **Nhược điểm** | Chỉ dùng khi điện thoại **cùng Wi-Fi**; đổi mạng / ra ngoài là mất; mật khẩu đi `http` không mã hoá (trong nhà thì chấp nhận được) |
| **Không chọn** | **B. Tunnel (Cloudflare Tunnel / Tailscale)**: + dùng được mọi nơi, có `https`; − phải cài và giữ dịch vụ ở PC, link có thể đổi, thêm một thứ có thể hỏng. **C. Cả hai (nhớ 2 địa chỉ, tự chuyển)**: + tiện; − thêm mã, phải thử nhiều tình huống, chưa cần cho bản thử |

### Câu 2 — Chat với Main đi đường nào?

| Phần | Nội dung |
|---|---|
| **Vấn đề + số đo** | Main có bộ chat riêng (`/api/ai/chat` cổng 3010, đăng nhập riêng, cookie riêng). 3004 đã có chat tự hỏi Main hộ. App hiện chỉ giữ **1** máy chủ + **1** cookie (`Cfg.kt`) |
| **Phương án gợi ý** | **A. Gọi thẳng Main 3010**: thêm ô "Địa chỉ Main" (mặc định cùng IP, cổng 3010), đăng nhập Main lần 1 trong mục Chat, lưu cookie thứ hai, tự đăng nhập lại như hiện nay |
| **Vì sao** | Đúng yêu cầu "chat với trợ lý AI của Main": dùng đúng bộ não, đúng quyền, đúng hàng chờ ✅ Làm của Main, có lịch sử phiên riêng |
| **Nhược điểm** | Phải mở thêm cổng 3010 trên tường lửa; đăng nhập 2 lần (2 sổ người dùng khác nhau); thêm khoảng 150–250 dòng mã (cookie thứ hai, màn chat, màn xác nhận ✅/❌); phải nâng thời gian chờ lên ≥ 150 giây |
| **Không chọn** | **B. Gọi `/api/ai/chat` của 3004 (3004 tự hỏi Main khi cần)**: + không đăng nhập thêm, không mở cổng thêm, ít mã nhất (~100 dòng), giữ 1 máy chủ; − đây là trợ lý của agent Công việc chứ không phải trợ lý Main — chỉ hỏi được Main khi 3004 tự thấy cần, mất hàng chờ ✅ Làm của Main. **C. Mở trang chat của Main trong WebView**: + gần như không viết mã; − bị app chặn (chỉ cho trang trong app), giao diện web không vừa điện thoại, lại đăng nhập riêng |

### Câu 3 — Đăng nhập Main (chỉ cần quyết nếu Câu 2 chọn A)

| Phần | Nội dung |
|---|---|
| **Vấn đề + số đo** | 3004 có nhận "đăng nhập một lần" qua cookie chung `sci_session` **nếu** `AUTH_SECRET_CHUNG` được đặt ở cả hai máy chủ (`auth-token.ts:52`). Tôi **không đo được** máy chủ thật có đặt chưa. Nhưng ngược lại 3004 khi đăng nhập lại sẽ **xoá** cookie đó, nên hai cookie dễ đè nhau |
| **Phương án gợi ý** | **A. Hai lần nhập, giữ hai cookie tách biệt trong app** (cùng email/mật khẩu nếu anh dùng chung, app hỏi một lần rồi thử cả hai) |
| **Vì sao** | Chắc chạy, không phụ thuộc cấu hình máy chủ chưa kiểm được |
| **Nhược điểm** | Mật khẩu Main lưu thêm một bản (mã hoá Keystore như hiện nay); nếu email hai nơi khác nhau, anh phải nhập 2 lần |
| **Không chọn** | **B. Dùng cookie chung, chỉ đăng nhập Main**: + 1 lần nhập; − chỉ chạy khi `AUTH_SECRET_CHUNG` đúng ở cả hai, nếu sai thì app hỏng mà khó biết; cần phiên máy chủ kiểm trước |

## 4. Việc sẽ làm sau khi anh gật (chưa làm)

| # | Việc | Ai làm |
|---|---|---|
| 1 | Bỏ ⚠ cho IP LAN; mặc định ô địa chỉ thành gợi ý `http://192.168.…:3004` | phiên này |
| 2 | Mục **Chat** ở menu đáy: danh sách phiên, khung chat, nút ✅/❌ cho việc chờ duyệt | phiên này |
| 3 | Nâng thời gian chờ cho chat; hiện "đang suy nghĩ…" | phiên này |
| 4 | Kiểm độc lập (anh đã chốt 29/10) → build, ký APK | phiên trên máy anh (có khoá ký, JDK/SDK) |
| 5 | Thử máy thật Xiaomi 14 Ultra, đo thời gian trả lời | anh + phiên trên máy anh |

## 5. Chưa đo được (môi trường này không có)

| Thiếu | Hệ quả |
|---|---|
| Máy chủ 3004/3010 chạy thật | Chưa gọi thử API, chưa đo giây trả lời của chat |
| Bản live `congviec.scigroup.vn` | Chưa so đủ khác biệt API; mới biết 1 chỗ qua chú thích trong mã |
| JDK/SDK Android, khoá ký | Chưa build được APK |
| Cấu hình `.env` hai máy chủ | Không biết `AUTH_SECRET_CHUNG`, `URL_AGENT_MAIN`, kết nối AI đã bật chưa |

**Gợi ý gọn của em: Câu 1 = A · Câu 2 = A · Câu 3 = A.** Nếu anh muốn bản thử nhanh và ít rủi ro, chọn Câu 2 = B.
