# Test e2e (Playwright)

Bộ test này bấm thử ứng dụng thật trong trình duyệt Chromium, giống người dùng.
Nó bao cả tính năng lẫn giao diện.

## Chạy

```bash
npm run e2e                                   # build production rồi chạy toàn bộ (~2 phút build + ~8 phút test)
npx playwright test tests/e2e/04-nghiep-vu-gui.spec.ts   # chỉ chạy một file
npx playwright test -g "trả lại"              # chỉ chạy các test có chữ "trả lại" trong tên
npm run e2e:ui                                # mở giao diện Playwright để xem từng bước
npm run e2e:bao-cao                           # mở báo cáo HTML của lần chạy gần nhất
```

Lần đầu trên máy mới cần cài trình duyệt: `npx playwright install chromium`.

## Máy chủ test riêng, không đụng dữ liệu thật

`npm run e2e` tự dựng một máy chủ riêng (xem `may-chu.mjs`):

- Máy chủ chạy ở cổng **3104**, nên không đụng máy chủ đang chạy ở 3004.
- Thư mục build là `.next-e2e-build` (hoặc `.next-e2e` khi chạy dev), không đè `.next`.
- CSDL là PGlite trong RAM. Mỗi lần chạy, CSDL được gieo mới với 9 đơn vị, người dùng mẫu và mật khẩu `Sci@2026`.
  - Bộ test không mở `data/pgdata`.
  - Dù `.env.local` có khai `DATABASE_URL`, bộ test cũng bỏ qua.
- File tải lên, bản xem trước, dữ liệu AI (kỹ năng, phiên chat) và thư email thử đều nằm trong `tests/e2e/.tam/`.
  - Thư mục này bị xóa ở đầu mỗi lần chạy.
- AI tắt (`AI_MODE=off`), nên test không gọi Claude và không tốn token.
- Email chạy ở chế độ thử: thư được ghi thành file `.eml`, không gửi thật.
- Bộ hẹn giờ quét hạn và bộ gửi thư đều tắt.

Mặc định máy chủ test chạy **bản build production** (`next build` vào `.next-e2e-build` rồi `next start`).
Bản build là ảnh chụp mã nguồn lúc chạy, nên test không chập chờn khi đang có người sửa code (next dev biên dịch lại giữa chừng
làm trình duyệt nhận file JS viết dở).

Các biến điều khiển:

| Biến | Ý nghĩa |
|---|---|
| `E2E_CHE_DO=dev` | Chạy `next dev` thay vì build (nhanh khi sửa-thử liên tục; test "bấm dòng tài khoản mẫu" chỉ chạy ở chế độ này). |
| `E2E_DUNG_BAN_BUILD=1` | Dùng lại bản build có sẵn, không build lại (khi chỉ sửa file test). |
| `E2E_PORT=3105` | Đổi cổng. Mỗi cổng có thư mục tạm riêng, nên chạy được nhiều nhóm test song song. |

Ví dụ chạy song song hai nhóm sau một lần build (PowerShell):

```powershell
$env:E2E_DUNG_BAN_BUILD='1'
$env:E2E_PORT='3104'; npx playwright test tests/e2e/01 tests/e2e/02 tests/e2e/03 tests/e2e/04
$env:E2E_PORT='3105'; npx playwright test tests/e2e/05 tests/e2e/06 tests/e2e/07   # ở cửa sổ khác
```

## Hai nhóm test, hai máy chủ

- **Nhóm `chung`** gồm file 01–14, chạy trên máy chủ cổng 3104.
- **Nhóm `kich-ban`** gồm file 15 (kịch bản vận hành 9 đơn vị), chạy trên máy chủ riêng ở cổng 3105.
  - Nhóm này có CSDL sạch của riêng nó. Nếu chạy chung, dữ liệu do các file 01–14 để lại (các việc "GPMB Trụ T11" cũ…) sẽ làm sai kết quả đè trên sổ cái.
- Cả hai máy chủ dùng chung một bản build.

```bash
npx playwright test --project chung       # chỉ file 01–14
npx playwright test --project kich-ban    # chỉ kịch bản vận hành
```

## Các file test

Các file chạy **tuần tự theo số thứ tự** và dùng chung một CSDL, vì vậy dữ liệu của file trước có mặt ở file sau.

| File | Nội dung |
|---|---|
| `01-dang-nhap` | Đăng nhập đúng và sai; khi chưa đăng nhập thì chuyển về `/login?tiep=…`; đăng xuất; đổi mật khẩu (kể cả các trường hợp nhập sai). |
| `02-khung-ung-dung` | Thanh bên hiện mục khác nhau theo vai; mục đang mở; thu gọn thanh bên; công tắc nhận email; trang Tổng quan; Thông báo. |
| `03-thu-muc` | Cây 9 đơn vị; tải lên nhiều file; kéo thả; bản mới; xem trước Word; tải về; xóa, hoàn tác, thùng rác, khôi phục; thư mục con; tìm bằng Ctrl+K; phân quyền; trang tài liệu. |
| `04-nghiep-vu-gui` | Luồng nghiệp vụ chính, làm hoàn toàn trên giao diện (chi tiết ngay dưới bảng). |
| `05-van-thu` | Vào sổ văn bản đến (giấy và email); chuyển đơn vị xử lý; đơn vị nhận văn bản; người khác chỉ xem. |
| `06-lich-su` | Lọc lịch sử; kiểm tra toàn vẹn chuỗi băm; phạm vi xem theo vai; lịch sử chỉ ghi thêm. |
| `07-mau-word` | Tải mẫu; sửa định nghĩa có phiên bản; kiểm lỗi; tải phiên bản file mới; thêm mẫu; quyền chỉ xem. |
| `08-luat-kiem-tra` | Thêm luật từ câu tiếng Việt; sửa, xem phiên bản, quay lại bản cũ; bật/tắt; đổi mức; xóa; luật hệ thống; khi AI tắt; phân quyền. |
| `09-cai-dat` | Sửa nhóm cài đặt ra phiên bản mới; quay lại bản cũ hoặc mặc định; kiểm lỗi; JSON; xuất và nhập cấu hình; email thử; quyền theo nhóm. |
| `10-ky-nang` | Kỹ năng hệ thống; viết, xem, xuất `.skill`, xóa và nạp lại kỹ năng; kiểm đầu vào; quyền kho chung. |
| `11-quan-tri` | Người dùng (thêm, khóa, mở khóa, đặt lại mật khẩu); đơn vị; vai trò và ma trận quyền; nhập từ Excel. |
| `12-khoa-agent-api` | Cấp khóa trên giao diện; gọi cổng MCP và `/api/v1/so-cai` bằng khóa; khóa giới hạn công cụ; thu hồi khóa. |
| `13-tro-ly-chat` | Khung chat khi AI tắt; quản lý phiên; kẹp file; gọi kỹ năng bằng `/`; chọn model; phím tắt Ctrl+K. |
| `14-giao-dien-chung` | Mở **mọi trang × 6 vai** (xem các mục kiểm ở phần sau); bố cục ở 1280 và 1024 px; đi qua các mục bằng phím Tab. |
| `15-kich-ban-van-hanh` | **Kịch bản vận hành một tuần báo cáo của 9 đơn vị**, 24 bước, mỗi bước một người đóng đúng vai. Đặc tả: [KICH-BAN-VAN-HANH.md](KICH-BAN-VAN-HANH.md). |

`04-nghiep-vu-gui` đi qua các bước sau:

1. Kiểm tra chặn gửi đúng ô.
2. Tải bản đã sửa rồi gửi.
3. Nhận tài liệu.
4. Sổ cái đè theo cấp và ngày.
5. TGĐ quyết định giao việc.
6. Các bên bấm Kết thúc, việc rời sổ cái.
7. Trả lại, gửi lại, chuyển tiếp, gửi kèm, gửi mới, hoàn thành.
8. File sai mẫu bị từ chối.

Với mỗi trang, `14-giao-dien-chung` kiểm:

- Có tiêu đề.
- Không có lỗi JS hay React.
- Không tràn ngang.
- Không có ảnh vỡ.
- Nút và ô nhập nào cũng có tên đọc được.
- Chụp ảnh toàn trang và đính kèm vào báo cáo.

## Test tự canh lỗi giao diện

`co-so.ts` theo dõi mọi trang mà test mở. Test sẽ trượt nếu gặp một trong các lỗi sau, kể cả khi các bước bấm vẫn chạy được:

- Lỗi JavaScript chưa bắt (`pageerror`).
- `console.error`, ví dụ lỗi React như key trùng hoặc hydration mismatch.

Riêng thông báo "Failed to load resource" được bỏ qua, vì nhiều test cố ý gọi API bị từ chối. Nội dung lỗi được đính kèm trong báo cáo (`loi-giao-dien.txt`).

## Khi test trượt

- Mở báo cáo bằng `npm run e2e:bao-cao`. Mỗi test trượt có ảnh chụp, video và trace (bấm vào để xem lại từng bước, DOM, mạng).
- Nếu giao diện đổi chữ (tên nút, thông báo), sửa chuỗi tương ứng trong file test. Test dùng chữ hiện trên màn hình làm bộ chọn, vì mã nguồn không có `data-testid`.

## Viết thêm test

- Import từ `./co-so` (dùng `test`, `expect`, `ND`, `dangNhapApi`, `moTrang`…), không import thẳng từ `@playwright/test`. Như vậy test mới có sẵn phần canh lỗi giao diện.
- Nếu một test phải làm việc với nhiều người, dùng `moTrang(ND.xxx)`: mỗi người có context riêng và đã đăng nhập sẵn.
- Đặt tên dữ liệu kèm `MA_CHAY` để không trùng giữa các lần chạy.
