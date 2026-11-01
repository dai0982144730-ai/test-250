# SCI công việc

Giao việc bằng tài liệu. Sổ cái biết việc nào đang chạy.

Nhận tài liệu Word theo mẫu, kiểm tra đủ điều kiện rồi mới cho gửi. Công việc trong tài liệu được ghi vào **sổ cái**
cho đến khi mọi người thực hiện bấm **Kết thúc**. Mọi nội dung và thao tác được lưu mãi trong **lịch sử**.
Có trợ lý AI (khung chat giống các agent SCI) và cổng cho agent khác đọc sổ cái. Áp dụng cho 9 đơn vị theo bộ mẫu báo cáo tuần/tháng.

- Kế hoạch: `docs/SCI-CongViec-KeHoach-v2.html` (bản chữ `docs/KE-HOACH-v2.txt`)
- Hướng dẫn sử dụng (cho người dùng): `public/huong-dan/index.html` — trong ứng dụng bấm nút **Hướng dẫn sử dụng**
- Kiến trúc và hợp đồng module: `KIEN-TRUC.md`
- Câu hỏi còn chờ chốt + mặc định đang dùng: `docs/CAN-CHOT.md`
- Triển khai máy chủ: `deploy/TRIEN-KHAI.md`

## Chạy trên máy (Windows) — bấm đúp là chạy

Bấm đúp **`CHAY-UNG-DUNG.bat`** (hoặc `../CHAY-SCI-CONG-VIEC.bat` ở thư mục Cty). Script `scripts/chay-ung-dung.ps1` tự lo:

1. Node.js — chưa có thì cài bằng winget (cần Internet), không được thì mở trang tải Node.js LTS.
2. Thư viện `node_modules` — chưa có thì `npm install` (lần đầu, cần Internet).
3. Khóa phiên đăng nhập `.env.local` — chưa có thì tự tạo.
4. Bản chạy `.next` — chưa có hoặc mã nguồn mới hơn thì build lại (~1,5 phút).
5. Mở cổng 3004 trên tường lửa cho máy khác trong mạng LAN (Windows hỏi quyền quản trị một lần).
6. Chạy máy chủ, in địa chỉ LAN, tự mở trình duyệt. **Đóng cửa sổ = tắt ứng dụng.**

Tham số: `CHAY-UNG-DUNG.bat -Cong 3005 -KhongMoTrinhDuyet -BuildLai -KhongMoTuongLua`.

### Dữ liệu nằm ở đâu

| Thư mục | Nội dung |
|---|---|
| `data/pgdata/` | **Cơ sở dữ liệu** (PostgreSQL nhúng PGlite): người dùng, đơn vị, tài liệu, sổ cái, lịch sử, cài đặt |
| `data/files/` | File tài liệu đã tải lên (mọi phiên bản) |
| `data/chat/`, `data/skills/`, `data/xem-truoc/` | Phiên trợ lý AI, kỹ năng, ảnh xem trước |
| `.env.local` | Khóa phiên đăng nhập (mất thì mọi người đăng nhập lại, không mất dữ liệu) |

Không cần cài PostgreSQL. Muốn dùng PostgreSQL thật thì khai `DATABASE_URL` trong `.env.local` (xem `.env.example`).

### Chép sang máy khác

1. **Đóng cửa sổ SCI công việc** (tắt máy chủ) trước khi chép — chép lúc đang chạy có thể làm bản sao cơ sở dữ liệu lỗi.
2. Chép **cả thư mục `CodeSCICongViec`** (gồm `data/`, `node_modules/`, `.next/`) sang máy mới, vd bằng USB hoặc thư mục chia sẻ.
3. Trên máy mới bấm đúp `CHAY-UNG-DUNG.bat`. Máy chưa có Node.js thì script tự cài (cần Internet lần đầu).

Chép cả `node_modules` và `.next` thì máy mới chạy ngay không cần Internet (chỉ cần Node.js). Chỉ chép mã nguồn + `data/` thì lần đầu script tự cài thư viện và build.

Lần đầu trên máy trống (không có `data/`): tự tạo lược đồ, gieo đơn vị, vai trò, mẫu Word, người dùng mẫu (mật khẩu `Sci@2026`).

### Dành cho người phát triển

```bash
npm install --include=dev   # máy có NODE_ENV=production toàn cục thì cần --include=dev
NODE_ENV=development DIST_DIR=.next-dev npx next dev -p 3004 -H 0.0.0.0
npx vitest run tests/unit   # CSDL RAM riêng mỗi file test
```

## Tình trạng theo 8 giai đoạn của kế hoạch (24/09/2026)

| Giai đoạn | Tình trạng |
|---|---|
| 0 · Chốt và chuẩn bị | Chờ bố: 8 câu hỏi + 9 file mẫu thật + danh sách người dùng (`docs/CAN-CHOT.md`). Đã dựng 9 mẫu thay thế có ô gắn mã. |
| 1 · Khung, khung chat, sci-identity | Xong: đăng nhập, quản trị người dùng/đơn vị/quyền, nhập Excel, Cài đặt có phiên bản, khung chat lấy nguyên từ agent tiến độ. |
| 2 · Thư mục và lịch sử | Xong: cây thư mục 9 đơn vị, tải lên, phiên bản, xem trước Word, xóa theo quyền, thùng rác, lịch sử chỉ ghi thêm + chuỗi băm. |
| 3 · Mẫu Word, kiểm tra, gửi | Xong: kiểm tra chặn đúng ô, 6 thao tác gửi/chuyển tiếp/kèm/trả lại/gửi lại/gửi mới/hoàn thành, cây hành trình, sổ văn bản đến. |
| 4 · Công việc, sổ cái | Xong: quy tắc đè, luôn mở, nhiều phần việc, Kết thúc, nhắc hạn; test tích hợp 10 bước sơ đồ hoạt động đạt. |
| 5 · AI, kỹ năng, cổng agent | Xong: công cụ chat thư mục/sổ cái/lịch sử, 5 kỹ năng hệ thống, cổng MCP `socai.*` + API có khóa. |
| 6 · Máy chủ, thí điểm | Sẵn file triển khai (`deploy/`); chờ DNS, GitHub, quyền máy chủ. Thí điểm một kỳ báo cáo thật chưa làm. |
| 7 · Mở rộng | Chưa làm (theo thứ tự bố ưu tiên sau thí điểm). |
