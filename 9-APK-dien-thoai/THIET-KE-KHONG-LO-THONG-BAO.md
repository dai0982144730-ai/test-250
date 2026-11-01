# Thiết kế: chuông và báo họp KHÔNG bị lỡ trên Xiaomi 14 Ultra (HyperOS)

*28/10/2026 · tài liệu thiết kế, chưa code · máy mục tiêu: Xiaomi 14 Ultra (Android 14, HyperOS)*

## 1. Vấn đề, nói bằng đời thường

Xiaomi (MIUI / HyperOS) là hãng **giết app chạy nền mạnh tay nhất**. App tắt màn hình vài phút là có thể bị hệ điều hành dừng. Khi đó chuông và báo họp **không tự hiện**, chỉ hiện khi anh mở app. Đây là lỗi chung của rất nhiều app bên thứ ba, không riêng app mình.

| Điều tra được | Nguồn |
|---|---|
| Cách chữa chuẩn trên Xiaomi: bật **Tự khởi động**, đặt pin **Không hạn chế**, **khoá app** trong màn hình đa nhiệm. Trang này không có API chính thức, hành vi không được đảm bảo | [dontkillmyapp.com/xiaomi](https://dontkillmyapp.com/xiaomi) |
| Các diễn đàn HyperOS: thông báo trễ đến khi mở app thường do pin/tự khởi động; có báo cáo HyperOS còn **cắt kết nối nền của Google**, nên chỉ dựa vào đẩy tin Firebase cũng chưa chắc ăn (chưa kiểm chứng) | [diễn đàn Xiaomi](https://www.xiaomi.eu/community/threads/how-to-fix-notification-sync-delay-after-upgrading.75846) · [Home Assistant, Xiaomi 14](https://community.home-assistant.io/t/not-getting-notifications-in-ha-companion-app-on-xiaomi-14/786934) |
| Android 14 bắt dịch vụ nền tiền cảnh phải **khai loại**; loại `dataSync` bị giới hạn 6 giờ/24 giờ từ Android 15 → **không dùng**, dùng `specialUse` | [Android 14](https://developer.android.com/about/versions/14/changes/fgs-types-required) · [Android 15](https://developer.android.com/about/versions/15/behavior-changes-15) |

**Kết luận thiết kế:** không có một mẹo nào đủ. Phải xếp **nhiều lớp bảo hiểm**, mỗi lớp cứu lớp trên khi nó chết, và app phải **tự đo** để biết có lỡ không.

## 2. Năm lớp bảo hiểm

| # | Lớp | Làm gì | Cứu trường hợp nào |
|---|---|---|---|
| 1 | **Dịch vụ nền tiền cảnh** (loại `specialUse`) | Hỏi máy chủ 60 giây một lần như app PC. Có một **thông báo cố định** trên thanh trạng thái: «57+11 · 11:00 họp …» | Bình thường: màn tắt, app ở nền |
| 2 | **Báo thức đặt sẵn cho từng cuộc họp** (`setAlarmClock`) | Khi đồng bộ được lịch họp, đặt báo thức lúc **giờ họp trừ 15 phút** (CHUẨN BỊ ĐI ĐẾN CUỘC HỌP) và lúc **giờ họp**. Báo thức do hệ điều hành giữ, không cần app sống, không cần mạng | Dịch vụ nền bị giết, mạng chập chờn: báo họp **vẫn đúng giờ** |
| 3 | **Cứu hộ khởi động lại** | Mỗi 5 phút một báo thức kiểm dịch vụ còn sống không, chết thì bật lại. WorkManager 15 phút làm dự phòng. Tự bật lại sau khi khởi động máy và sau khi cập nhật app | Dịch vụ bị giết nhưng app chưa bị «dừng cưỡng bức» |
| 4 | **Bù tin** | Tin nằm ở máy chủ nên **không mất**, chỉ trễ. Mỗi lần thức dậy app lấy mọi tin có số thứ tự lớn hơn tin đã báo cuối và **báo bù**. Họp đã tới giờ mà chưa báo → báo ngay «đã lỡ N phút» | Mọi lần trễ: sau khi hồi lại sẽ không sót |
| 5 | **Hướng dẫn + tự đo trong app** | Màn «Giữ thông báo không bị lỡ» (xem demo): 5 mục kiểm cài đặt Xiaomi, nút «Gửi thông báo thử sau 1 phút», nhật ký đo. Nếu **quá 10 phút không có nhịp hỏi**, mở app lên báo đỏ «Thông báo có thể đã bị tắt từ HH:MM» | Người dùng chưa bật quyền / hệ điều hành tắt hẳn |

**Chưa làm giai đoạn 1:** đẩy tin qua Firebase (FCM). Lý do: phải sửa máy chủ, phải lập tài khoản Google của công ty, và theo báo cáo trên HyperOS nó cũng không chắc hơn. Có thể thêm sau như lớp thứ 6 nếu đo thấy còn lỡ.

## 3. Điều app KHÔNG thể hứa (nói thẳng)

| Tình huống | Hệ quả |
|---|---|
| Người dùng vào Cài đặt → **Buộc dừng** app, hoặc tắt «Tự khởi động» | Cả 3 lớp đầu đều ngừng tới khi mở app lại. Chỉ lớp 5 phát hiện và nhắc được |
| Xiaomi cập nhật HyperOS đổi cách chặn | Phải kiểm lại trên máy thật sau mỗi bản cập nhật lớn |

Vì vậy lớp 5 (hướng dẫn + tự đo) **quan trọng ngang** các lớp kỹ thuật.

## 4. Kênh thông báo trên Android

| Kênh | Mức | Dùng cho |
|---|---|---|
| Họp | Cao (nổi lên, có tiếng) | CHUẨN BỊ ĐI ĐẾN CUỘC HỌP · đến giờ họp · lịch họp mới |
| Việc quá hạn | Cao | Việc quá hạn, BLĐ nhắc việc |
| Chung | Thường | Bình luận, tin khác |
| Trạng thái | Thấp, không tiếng, cố định | «57+11 · dòng họp» (lớp 1) |

Số «57+11» tính **đúng công thức web**: 57 = chưa đọc đã thấy, 11 = tin mới từ lần mở chuông trước.

## 5. Đo thật trên Xiaomi 14 Ultra trước khi giao anh

| Kịch bản | Đạt khi |
|---|---|
| Khoá màn 30 phút · 2 giờ · qua đêm | Họp báo lệch ≤ 1 phút, tin mới tới ≤ 2 phút, 0 tin lỡ |
| Vuốt xoá app khỏi đa nhiệm (đã khoá app) | Vẫn nhận |
| Bật «Tiết kiệm pin» | Vẫn nhận (hoặc app báo đỏ rõ ràng) |
| Mất mạng 10 phút rồi có lại | Tin bù đủ; báo thức họp vẫn đúng giờ |
| Khởi động lại máy | Dịch vụ tự bật |

App ghi nhật ký mỗi lần hỏi (giờ, độ trễ, kết quả) để em và anh **đọc số, không đoán** (nối luật «Đo, đừng đoán»).

## 6. Danh mục việc khi code (để không quên)

- `targetSdk` 34; khai `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_SPECIAL_USE` kèm lời giải thích trong tệp khai báo.
- Quyền: `POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED`, `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` (app cài thẳng APK nội bộ, không qua Google Play nên không vướng chính sách của Play).
- `setAlarmClock` không cần quyền báo thức chính xác riêng — **em cần thử trên máy thật** vì HyperOS có thể khác.
- Mở thẳng trang «Tự khởi động» / «Tiết kiệm pin» của Xiaomi bằng Intent riêng của hãng; **mỗi máy một khác**, nên luôn có phương án dự phòng là mở trang thông tin app.
- Không dùng `dataSync` (giới hạn 6 giờ ở Android 15).

## 7. Chỗ em chưa chắc

| Việc | Cách xử |
|---|---|
| Intent mở trang «Tự khởi động» có còn đúng trên HyperOS | Thử trên Xiaomi 14 Ultra của anh, hỏng thì dùng trang thông tin app |
| Báo cáo «HyperOS cắt kết nối nền của Google» | Chưa kiểm chứng; chỉ là lý do em không dựa vào Firebase ở giai đoạn 1 |
| Có thể đọc trạng thái «Tự khởi động» bằng code không | Thư viện cộng đồng chỉ thử tới MIUI 14, chưa nói HyperOS → để người dùng tự bấm «Đã bật» |

## 8. Máy chủ: bản đang chạy khác bản 3004

Đo 28/10 (chưa đăng nhập, chỉ xem mã trả về): mọi đường dẫn app cần đều **có mặt** trên cả `https://congviec.scigroup.vn` và `localhost:3004`.

| Đường dẫn | Bản chạy (congviec.scigroup.vn) |
|---|---|
| `/api/phong-hop`, `/api/phong-hop/cua-toi` | 401 (có, cần đăng nhập) |
| `/api/thong-bao`, `/api/toi`, `/api/viec-cua-toi` | 401 (có) |
| `/api/phong/so-do`, `/api/phong/viec-gang`, `/api/so-cai`, `/api/cay-viec` | 401 (có) |

Phần khác nhau cụ thể (hình dạng dữ liệu, chức năng) chưa đo được vì cần đăng nhập. App sẽ **kiểm từng đường dẫn khi đăng nhập** và ẩn tính năng nào máy chủ chưa có.
