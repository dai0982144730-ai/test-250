# Đề xuất 01/11/2026 — ① số trên biểu tượng app ② nút ✏ sửa chủ trì / phối hợp

*Chưa sửa code. Mọi dòng «đo» là đọc code thật hoặc nguồn mạng có link; chỗ nào suy luận em ghi rõ.*

---

## ① Số chưa đọc trên biểu tượng app lúc hiện lúc không (Xiaomi 14 Ultra, HyperOS)

### Vấn đề — app đang làm gì (đo trong `TB.kt`, `Nhip.kt`, `MainActivity.kt`)

| # | App hiện tại | Chỗ |
|---|---|---|
| 1 | Con số = **một thông báo im lặng** riêng (kênh «Số trên biểu tượng»), mang `setNumber(số chưa đọc + họp chưa xem)`; thêm lối cũ MIUI `extraNotification.setMessageCount` | `TB.huyHieu` |
| 2 | Chỉ đăng lại khi **số đổi** hoặc thông báo đó **không còn trong khay**; rời app thì đăng lại ép (cùng mã thông báo = *cập nhật*, không phải tin mới) | `TB.huyHieu`, `MainActivity.onStop` |
| 3 | Tin mới: mỗi nhịp 60 giây đăng thêm **tối đa 5** thông báo tin + 1 dòng «còn N tin khác» | `Nhip.baoTinMoi` |
| 4 | Tin đã đọc ở PC/web → app **gỡ** thông báo tin đó khỏi khay | `Nhip.baoTinMoi` |
| 5 | Thông báo cố định của dịch vụ nền: kênh **tắt huy hiệu** (cố ý, 29/10) | `TB.kenh` |
| 6 | App **chưa kiểm** HyperOS có cho app hiện huy hiệu không (`areNotificationsEnabled`, `canShowBadge`) — không có chỗ nào đọc | grep `canShowBadge` = 0 |

### Tra mạng — HyperOS đếm thế nào

| Nguồn | Nói gì |
|---|---|
| [Xiaomi hỗ trợ KA-33185](https://www.mi.com/ph/support/article/KA-33185/) | Huy hiệu = **số thông báo của app đang có**; phải bật ở *Cài đặt → Thông báo & thanh trạng thái → Huy hiệu*, và bật **riêng từng app** |
| [app_badge_plus](https://pub.dev/packages/app_badge_plus) (thư viện huy hiệu, 2025) | Trên Xiaomi/POCO HyperOS: **số đếm đi theo thông báo đang treo**; lối cũ `extraNotification` **không còn** trên HyperOS |
| [ShortcutBadger #170](https://github.com/leolin310148/ShortcutBadger/issues/170) | MIUI đặt huy hiệu = **số thông báo trong khay**; muốn số khác thì phải gửi kèm một thông báo |
| [Hướng dẫn huy hiệu Xiaomi](https://unbadge.app/blog/xiaomi-notification-badges) | Không có thông báo = không có huy hiệu; cập nhật HyperOS hay làm **mất huy hiệu mọi app bên thứ ba**, phải xoá bộ nhớ đệm System Launcher; app bị giết nền → huy hiệu dừng |

### Vì sao lúc hiện lúc không — suy từ code + nguồn (⚠ chưa đo trên máy anh)

| # | Tình huống | Hệ quả |
|---|---|---|
| a | HyperOS đếm **số thông báo trong khay**, không đọc số app gửi | Icon có thể hiện «1» (1 thông báo đếm) hoặc «6» (1 + 5 tin), **không phải 12** như web |
| b | Anh **vuốt xoá khay** | Mất ngay; app chỉ đăng lại ở nhịp sau (≤ 60 giây) và chỉ khi dịch vụ nền còn sống |
| c | **Mở app** → HyperOS xoá huy hiệu (coi là đã xem) | App đăng lại khi rời app nhưng bằng *cập nhật* cùng mã → launcher có thể không đếm lại |
| d | Tin được đọc trên PC | App gỡ thông báo tin → số tụt |
| e | HyperOS giết dịch vụ nền | Không ai đăng lại → mất tới khi mở app |
| f | Huy hiệu của app bị tắt ở Cài đặt máy (hay bị reset sau cập nhật HyperOS) | Không bao giờ hiện, app không biết để báo |

### Phương án

| | Nội dung | Vì sao / nhược |
|---|---|---|
| **A (gợi ý)** — Làm khớp cách HyperOS đếm + **tự đo** | ① Rời app hoặc số đổi: **gỡ rồi đăng mới** thông báo đếm (cancel + notify) để launcher đếm lại ② Thêm 2 kiểm thật: app có được phép thông báo? kênh «Số trên biểu tượng» có được hiện huy hiệu? → màn «Giữ thông báo không bị lỡ» báo **đỏ** kèm nút mở thẳng Cài đặt thông báo của app ③ Nút **«Thử huy hiệu»**: đặt số 3, anh về màn hình chính nhìn 10 giây, kết quả ghi nhật ký ④ Nhật ký ghi mỗi lần đăng/gỡ + lý do (đã có một phần) | **Ưu:** giữ nguyên cấu trúc, ít rủi ro, cho **số đo thật** trên máy anh để kết luận thay vì đoán tiếp; chữa được b, c, e, f. **Nhược:** chưa chắc chữa dứt vì em không có máy Xiaomi; con số có thể vẫn là «số thông báo» (a) nếu HyperOS không đọc `setNumber` — sau khi có nhật ký mới biết có cần sang B không |
| B — Mỗi tin chưa đọc = **một thông báo** trong khay (như Zalo) | Bỏ thông báo đếm; icon = số tin thật | **Khuyết điểm lớn:** 57 tin chưa đọc → 57 thông báo trong khay, ngập; HyperOS gộp lại thì số cũng lệch; đọc trên PC phải gỡ từng cái. **Ưu:** đúng hẳn cách HyperOS đếm, số icon = số tin |
| C — Chỉ **chấm đỏ** có/không, bỏ con số | Một thông báo đếm, không `setNumber` | **Khuyết điểm lớn:** mất thông tin «bao nhiêu». **Ưu:** không bao giờ lệch số |

**Anh làm giúp 2 việc không cần code (5 phút), kết quả quyết A hay B:**
1. *Cài đặt → Thông báo & thanh trạng thái → Huy hiệu biểu tượng ứng dụng*: đang bật? SCI Công việc có trong danh sách và bật?
2. Trong app: màn «Giữ thông báo không bị lỡ» → chụp phần **nhật ký** (có dòng «huy hiệu: đặt số … · khay có … thông báo») gửi em.

---

## ② Nút ✏ Sửa việc: sửa được Chủ trì · Lãnh đạo phối hợp · Phối hợp

> **Anh chốt 01/11: thước là bộ code live `congviec.scigroup.vn`** (`6-Agent-cong-viec-ban-chay-congviec.scigroup.vn`), không phải 3004. Em đã đo lại theo bộ live; đã ghi nhớ.

### Ý hiểu — web live đang làm thế nào (đo `SoDoPhong.tsx:830` FormSuaViec, `dich-vu.ts:1780` suaViec của bộ live)

| Ô trên form ✏ web live | Cách làm | Nguồn danh sách |
|---|---|---|
| Tên việc · Kết quả cần có · Bắt đầu · Hạn | Có đủ (app mới có Tên, Kết quả, Hạn — **thiếu Bắt đầu**) | |
| **Chủ trì** | Danh sách xổ: dòng đầu = người/đơn vị đang chủ trì, bên dưới là **người** nhóm theo đơn vị — *đúng* danh sách ô giao chuyển tiếp (chốt 10/10: «sửa chủ trì chính là giao việc») | `/api/phong/so-do` → `giao_nguoi` (app đã có sẵn) |
| **Dự án** | Danh sách xổ «SCI đầu tư» / «Loại khác» + «— không thuộc dự án —» | Danh mục dự án |
| **Phối hợp** | Các chip có ✕ để bỏ + ô «＋ thêm phối hợp…» nhóm theo đơn vị, có dòng «Cả <đơn vị>» | `/api/phong/so-do` → `phoi_hop` (app đã có sẵn) |
| **Lãnh đạo phối hợp** | **Bản live KHÔNG có ô này** (grep `lanh_dao_phoi_hop` trong bộ live = 0). Chỉ 3004 có | |
| Lưu | **Một lần** `sua_viec` gửi `chu_tri` (nếu đổi) + `phoi_hop` (toàn bộ danh sách) + `du_an` (nếu đổi) | |
| Máy chủ live | Đã nhận `chu_tri`, `phoi_hop`, `du_an` (`dich-vu.ts:1789`): đổi chủ trì = đổi người phần việc chủ trì · phối hợp: bỏ cái thiếu, thêm cái mới | Không cần nâng cấp máy chủ |

### Em sẽ code trong app (nếu anh gật)

| # | Việc |
|---|---|
| 1 | Form ✏ thêm đúng thứ tự web live: **Bắt đầu** → **Chủ trì** → **Dự án** → **Phối hợp** (chip ✕ + ô «＋ thêm phối hợp…») |
| 2 | Chủ trì: danh sách xổ nhóm theo đơn vị lấy từ `giao_nguoi` (đúng danh sách giao chuyển tiếp app đang dùng); ≥ 20 người thì có ô tìm (ghi nhớ 24/10) |
| 3 | Bấm «Lưu thay đổi» gửi **một** lệnh `sua_viec` như web; máy chủ live vẫn chặn quyền lần cuối |
| 4 | Giữ nút «＋ Phối hợp» riêng như web (thêm nhanh một người) |
| 5 | **Không** làm ô Lãnh đạo phối hợp vì live không có. Anh viết «(nếu có trường này)» → em hiểu là bỏ. Nếu anh muốn có thì phải sửa cả máy chủ live (gói nâng cấp), em sẽ nói riêng |

Ô **Dự án** anh không nhắc; web live có nên em định làm cho đủ giống web. Anh không muốn thì nói «bỏ Dự án».

**Thứ tự em định làm:** ② trước (chắc chắn, một lượt build) · ① theo phương án anh chọn, gộp cùng bản APK 0.1.30 · tự kiểm (phiên kiểm độc lập đã tắt — em nói rõ chỗ chưa kiểm). Anh trả lời gọn là đủ, ví dụ: **«A, làm ②, bỏ Dự án»**.
