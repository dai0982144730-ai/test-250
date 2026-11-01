# Hiện trạng app Android «SCI Công việc» — 01/11/2026

*Phiên mới nhận lại việc từ phiên cũ (tài khoản khác, không mở lại được). Mọi dòng dưới đây đều đo thật trên máy, không đoán. Chưa sửa gì.*

## 1. Bản APK mới nhất

| Mục | Đo được |
|---|---|
| Bản mới nhất | `dist/SCI-Cong-viec-0.1.29.apk` · 30/10 09:49 · 718 KB · versionCode 30 |
| Mã nguồn khớp APK? | **Khớp.** `app.js` trong APK và trong `CodeApp` cùng mã băm |
| Số bản đã phát 28–30/10 | 24 bản (0.1.6 → 0.1.29), 1.0.x bị Xiaomi từ chối nên từ 0.1.1 ký khoá riêng |
| Đã thử trên máy Xiaomi thật | Phiên cũ **không** thử; chỉ chạy bản giả lập trên trình duyệt. Anh là người cài thử |
| Qua kiểm độc lập | 0.1.19 → 0.1.25 **có** (phiên «0 Kiểm tra code») · 0.1.26 → 0.1.29 **chưa** (phiên kiểm đã tắt) |

## 2. Phiên cũ làm xong 29–30/10 (theo thứ tự bản)

| Bản | Nội dung | Anh đã chốt |
|---|---|---|
| 0.1.19 | Chuyển tiếp có «Chính tôi» + nhóm Hỗ trợ BLĐ · **tên người đậm** · sửa số chuông | Cần bản hosting lên gói `GOI-GIAO-CA-NHAN-29-10` trước |
| 0.1.20 | Bấm chuông / thông báo mở **trong app**, không văng ra web | Chỉ còn Zoom/Meet và trang app chưa có mới mở web |
| 0.1.21 | Mở việc ngoài 3 ngăn (tìm thêm ở Phòng ban, Dự án); tự tắt lọc «!» và «Đường găng» khi mở từ chuông | |
| 0.1.22 | **Đổi icon** Dự án (9 icon) và Phòng ban (9 icon riêng), bảng 3×3, lưu ở máy theo từng tài khoản | Chốt 29/10 |
| 0.1.23 | Quyền sửa/hủy **phương án A**: trưởng đơn vị sửa, hủy việc máy sinh hoặc người giao đã mất; nút ✏ Sửa việc | Gói `GOI-NANG-CAP-29-10` cho hosting |
| 0.1.24 | Tìm kiếm gõ tới đâu lọc tới đó · ẩn menu đáy khi tìm · «Xem tin đã đọc» | |
| 0.1.25 | Tìm kiếm danh sách phẳng, chạm ngoài ẩn ô tìm | «Kết thúc sớm» web bấm hai lần, 3004 đã dựng lại 29/10 |
| 0.1.26 | **Tự đăng nhập lại** khi hết phiên 8 giờ (mật khẩu mã hoá trong Keystore) · đăng lại số trên biểu tượng | Phương án A 30/10 |
| 0.1.27 | **Bảng tiến độ dự án** (nút 3 gạch cạnh icon dự án): cột tên + sơ đồ theo tháng, C2/C3, − +, vạch kéo, popup nhỏ | 5–6 chữ đầu tên việc, không mã/đơn vị |
| 0.1.28 | Mốc hình thoi · thanh nằm trên đường dóng · cấp 1–2 chữ cam (1 đậm, 2 thường) · «Hôm nay» nét đứt · cột tên 6 chữ | Chốt 30/10 |
| 0.1.29 | **Bỏ ép hoa thường trong code**, sửa hoa/thường trong tệp xlsx | «đổi hoa thường trong file xlsx không ép trong code» |

Việc cuối cùng phiên cũ (30/10 10:00): tách tệp tổng Hướng Việt thành 3 xlsx (Hướng Việt 50 · Tân Thành 60 · Ba Tầng 1 41 dòng) ở `6-Agent-cong-viec/Tien-do-tach-3/`. **Chưa nạp lên web** vì không đăng nhập được, anh nạp tay.

## 3. Việc còn dở (đối chiếu ghi nhớ 28/10)

| Việc | Hiện trạng đo được |
|---|---|
| Kẹp tệp 📎 | Code nằm trong `app.js` (dòng 1213–1330), **đã có trong APK 0.1.29**. Chỉ mới thử trên máy chủ giả, chưa thử với bản live |
| Tên người đậm trong danh sách gom theo người | **Đã code** (0.1.19, lớp `.nhom2`), ghi nhớ cũ chưa cập nhật |
| Chốt live / 3004 làm máy chủ | App không chốt cứng: ô địa chỉ máy chủ ở màn đăng nhập, mặc định `https://congviec.scigroup.vn`. App tự nhận dạng 2 bản (vd `so_da_doc` / `da_doc_gan_day`) |
| Bản iPhone (anh hỏi 29/10 09:28) | Phiên cũ đưa 2 phương án (A «Thêm vào màn hình chính», gợi ý), **anh chưa chọn**, việc dừng |
| 0.1.26–0.1.29 | Chưa thử máy thật, chưa qua kiểm độc lập |
| Hosting | Bản live cần người giữ áp 2 gói: `GOI-GIAO-CA-NHAN-29-10.zip` và `GOI-NANG-CAP-29-10.zip`, thì «Chính tôi», Thủy, quyền sửa/hủy, «Xem tin đã đọc» mới chạy. Em chưa biết đã áp chưa |
| Đề xuất sửa máy chủ | `DE-XUAT-SUA-MAY-CHU.md` (2 mục: tự nhận chuyển tiếp · nhân sự BLĐ ô chức danh) — đã gộp vào gói hosting 29/10 |

## 4. Môi trường dựng — còn dùng được

| Thành phần | Kiểm | Kết quả |
|---|---|---|
| Khoá ký `C:\dev\keys\sci-congviec.jks` + `sci-keystore.properties` | Có tệp | ✅ |
| Junction `C:\dev\apk-src` → `CodeApp` | Có, trỏ đúng | ✅ |
| Gradle 8.7 | Chạy `gradle --version` | ✅ Gradle 8.7, JVM 17.0.20 |
| JDK 17 `C:\dev\jdk-17` | Có | ✅ |
| Android SDK `C:\dev\android-sdk` | build-tools 34.0.0 · platforms android-34 | ✅ |
| Bản build gần nhất | `app-release.apk` 30/10 09:49 | ✅ khớp 0.1.29 |

Em chưa chạy build thử (không cần thiết, tốn 2–3 phút); khi anh giao việc đầu tiên em sẽ build thật và báo số.

## 5. Chốt của anh phiên cũ — em sẽ KHÔNG hỏi lại

- Giữ đường găng (bộ lọc, dấu «!», dòng «n việc găng»).
- Icon dự án tự chọn theo tên; đổi icon lưu ở máy, riêng từng tài khoản.
- Nút không có quyền thì **ẩn** (riêng agent Công việc).
- Gantt: 5–6 chữ đầu tên việc, không mã/đơn vị/khối lượng; bấm dòng → popup nhỏ (tên đầy đủ, khối lượng + đơn vị, bắt đầu, kết thúc); mốc hình thoi; thanh trên đường dóng; cấp 1–2 cam; «Hôm nay» nét đứt; hoa/thường sửa trong xlsx.
- Phiên đăng nhập: phương án A (app nhớ mật khẩu mã hoá, tự đăng nhập lại).
- Quyền sửa/hủy: phương án A (trưởng đơn vị sửa, hủy việc máy sinh / người giao đã mất).
- Kết thúc họp sớm: bấm hai lần, lần 1 hiện giờ kết thúc.
- Mọi sửa phải qua phiên kiểm độc lập trước khi đóng gói (anh chốt 29/10) — phiên kiểm «0 Kiểm tra code» hiện đã tắt.

**Em chờ anh nói việc tiếp theo.**
