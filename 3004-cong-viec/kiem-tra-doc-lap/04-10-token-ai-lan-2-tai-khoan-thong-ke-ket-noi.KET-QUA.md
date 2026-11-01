# KẾT QUẢ KIỂM TRA ĐỘC LẬP — Token AI lần 2: 3 tài khoản Claude · biểu đồ · kết nối (9 commit, 3 bộ)

> Người kiểm: phiên **"0 Kiểm tra độc lập"** · 04/10/2026 12:05 → 12:40 · Chỉ đọc + đo sống bằng cookie ký (quantri · anhn) và mã GIẢ. Không sửa code/MD, không commit. Không đăng nhập Claude thật, không gọi Claude thật.
> Đo sống để lại: 0 tiến trình `auth login`, 0 thư mục cá nhân mới (thư mục `ca-nhan/2e97e71113f9fa9c` có sẵn từ trước, không đụng), 0 dòng sổ dùng AI (mo_link/nhap_ma không ghi sổ). Script + JSON: scratchpad phiên kiểm `kiem-token-ai-2.py` / `.json`.

## Kết luận một dòng

**Không có 🔴. Cả 9 commit làm đúng 16 chốt** (T1–T4, T9–T14 đủ; T5–T8 đủ theo code + số khớp; T15 đã trả; T16 đạt, một chỗ "(Claude báo: …)" lọt tiếng Anh thô có chủ ý). Đo sống: **0 tiến trình treo** ở 4 đường (huỷ · bấm lại · mã sai · hết lượt), Main xử mã lạ đúng 3 ca, số đồ thị = bảng = tổng. tsc 3 bộ 0 lỗi; test 3004 **950/0**, Quan sát 369/369, Main 721 đạt + 3 hỏng cũ; **0 lượt test gọi Claude thật**. Còn **5 điểm 🟡** đáng sửa sớm và 8 ⚪ góp ý.

## Bảng phát hiện

| # | Mức | Chỗ `file:dòng` | Thấy gì (kèm số / lệnh) | Nên sửa |
|---|---|---|---|---|
| 1 | 🟡 | `src/lib/ai/providers.ts` `thuTaiKhoan` (nghi #8 · #9) | Nút "Thử trợ lý AI" đi hàng chờ thường (`laUuTien()` = false ngoài khung chat) → xếp sau việc nền đang chờ, người bấm có thể đợi vài phút không rõ vì sao; thử trúng hết hạn mức / 401 thì **không** `danhDauHet` / `danhDauHongDangNhap` → thẻ vẫn "Đã đăng nhập", lượt thật tiếp theo mới phát hiện | Thử bằng lượt ưu tiên; kết quả hết/401 thì đánh dấu như lượt thật |
| 2 | 🟡 | `src/app/api/ai/status/route.ts:22` + `KetNoiAI.tsx:666` (nghi #7) | Thanh trên đọc `thuMucChay(1)`; "Đang dùng" gắn cho tài khoản **chính** chưa hết/hỏng. Khi TK1 hết hạn mức và TK2 đang trả lời: thanh trên vẫn nói TK1 (hết → `loggedIn` vẫn true), thẻ TK2 không "Đang dùng" dù đang phục vụ | Đọc `chonTaiKhoan()` để biết tài khoản đang thực sự được chọn, gắn "Đang dùng" theo đó |
| 3 | 🟡 | `src/app/api/ai/login-cli/route.ts` · `tai-khoan/route.ts:128` `dan_ma` · `tai-khoan-ca-nhan/route.ts` `luu` (nghi #10) | 3 cửa cũ còn sống, không màn nào gọi: `login-cli` mở cửa sổ đăng nhập trên MÁY CHỦ (trái T13), `dan_ma`/`luu` nhận mã dài hạn. Người có quyền gọi tay vẫn làm được → hai cách đăng nhập tồn tại ngầm, trái "một cách" | Gỡ `login-cli`; `dan_ma`/`luu` trả 410 câu Việt "đã bỏ, dùng Đăng nhập Claude bằng link" |
| 4 | 🟡 | `src/lib/ai/dang-nhap-link.ts` `moDangNhapLink` (nghi #4) | Mỗi `mo_link` một tiến trình CLI ≤ 15 phút, mỗi người một khoá, không trần tổng: 52 người cùng bấm = 52 `claude.exe` (đo: 1 tiến trình ≈ 5,3 s khởi động, ~60–100 MB) | Trần tổng (vd 5 lượt chờ cùng lúc) + câu "đang có N người đăng nhập, thử lại sau" |
| 5 | 🟡 | `src/lib/ai/dang-nhap-link.ts:60` `chuanHoaMaLink` · `TheTaiKhoanClaude.tsx:35` `RE_MA` (nghi #3) | Dạng mã thật **chưa ai thấy** (chưa đăng nhập trọn). Lọc `[A-Za-z0-9_\-.~#]{10,2000}`; nếu mã thật có `=` `%` `/` `+` thì 400 "Mã không đúng dạng" — người dùng kẹt, không có đường vòng | Khi Mr. Đại thử lần đầu, ghi lại dạng mã thật rồi chốt bộ lọc; tạm thời nới thêm `=%/+` (vẫn qua stdin, không vào dòng lệnh) |
| 6 | ⚪ | `dang-nhap-link.ts:166` `guiMaDangNhap` · `moDangNhapLink:128` | Câu "(Claude báo: …)" ghép nguyên văn tiếng Anh của CLI (tối đa 200 ký tự) vào câu Việt — T16 "tiếng Việt mọi chữ ra" lọt có chủ ý | Dịch 3–4 câu CLI hay gặp; còn lại ghi "xem nhật ký máy chủ" |
| 7 | ⚪ (nghi #1) | `dang-nhap-link.ts` `huyDangNhapLink` · `251ca54` | **Không tái hiện được treo**: đo 4 đường (huỷ · bấm lại 2 lần · mã sai · gửi mã khi không có lượt) đếm `Win32_Process` có "auth login": 0 → 1 → 0 → 1 → 0 → 0. `claude.exe` là con trực tiếp của tiến trình Next (cha 25208, không qua cmd.exe) nên `p.kill()` giết đúng nó. Treo lúc 11:48 nhiều khả năng do nạp lại module trong `next dev` giữa hai lần bấm (danh sách chờ ở `globalThis` giữ, nhưng `hen` là timer của module cũ) — 251ca54 (tắt chính tiến trình) đã bịt | Giữ 251ca54; thêm test "tiến trình chết sau huỷ" (đếm `p.exitCode`) |
| 8 | ⚪ (nghi #2) | `guiMaDangNhap:150` | Đường thành công suy từ CLI giả; chưa ai đăng nhập trọn. Đã kiểm: mã sai thật → CLI thoát 1, câu Việt đúng, lượt kết thúc | Mr. Đại thử trọn một lần; phiên gửi ghi lại dạng mã + có `.credentials.json` không |
| 9 | ⚪ (nghi #5) | `TheTaiKhoanClaude.tsx:75` `window.open("about:blank")` | Điện thoại chưa thử; code đã có đường vòng "Mở trang đăng nhập Claude ↗" nên không kẹt | Thử trên điện thoại khi anh đăng nhập trọn |
| 10 | ⚪ (nghi #6) | `tai-khoan-claude.ts` `thuMucChay(1)` · thẻ TK1 | Đăng xuất TK1 (đã đăng nhập riêng) → lặng lẽ về tài khoản mặc định của máy, thẻ hiện "Đang dùng tài khoản Claude mặc định của máy chủ" — có câu, không gây hiểu nhầm | — |
| 11 | ⚪ (nghi #11) | `tai-khoan-claude.ts` `docHetCaNhan` | Đọc cả mốc cũ trong file mã lẫn `sci-het-han-muc.json`, lấy max — đúng; file mã cũ còn mốc cũ không hại | — |
| 12 | ⚪ (nghi #13 · #14) | `ThongKeAI.tsx` `duongMem` · `thong-ke-ai.ts` `vet` | Nội suy Fritsch–Carlson đơn điệu: không vượt đỉnh / không âm (đúng theo công thức, kẹp `s > 9`). Sổ cũ có `cho_ms` + `chay_ms` (dòng mẫu 01/10: `cho_ms:0, chay_ms:5464`) → vệt vẽ được; đo: tổng phút vệt = 93,0 = `phutChay` 93,0 | — |
| 13 | ⚪ | `GET /api/ai/tai-khoan` | Mỗi lần mở thẻ chạy `claude --version` + `auth status` cho từng tài khoản: đo 2,7 s (quản trị), 1,2 s (người thường); `mo_link` 5,3 s lần đầu | Nhớ kết quả `auth status` 30 giây |
| 14 | ⚪ (ngoài phạm vi, phát hiện tiện tay) | `tests/unit/*.test.ts` dùng `mkdtemp` + `afterAll rmSync` | `%TEMP%` đang có **5.039 thư mục `docflow-*`** rác do test để lại (Windows giữ file nên `rmSync` thất bại lặng): `kiem-gui` 3.699 · `ai-kn-cli` 196 · `ai-kn-api` 192 · `eml` 185 · `email` 184 · … · `ai-ca-nhan` 15 · `cam-cli` 11 (hai nhóm cuối từ các bài test token AI) | Dọn một lần; test dùng chung một gốc tạm `docflow-test/<run>` và xoá gốc ở đầu lần chạy sau |

## Trả lời 16 điểm tự nghi

| # | Kết luận |
|---|---|
| 1 | Không tái hiện (bảng #7); 251ca54 đủ |
| 2 | Chưa kiểm được — chỉ Mr. Đại thử trọn (bảng #8) |
| 3 | Đúng nghi, chưa đo được dạng thật (bảng #5) |
| 4 | Đúng nghi (bảng #4) |
| 5 | Chưa thử điện thoại (bảng #9) |
| 6 | Không lỗi (bảng #10) |
| 7 | Đúng nghi (bảng #2) |
| 8 · 9 | Đúng nghi (bảng #1) |
| 10 | Đúng nghi (bảng #3) |
| 11 | Không lỗi (bảng #11) |
| 12 | Đúng ý: chuông ghi "Vào Cài đặt → AI → thẻ Tài khoản N → Đăng nhập lại" khớp nút "Đăng nhập lại" trên thẻ (`TheTaiKhoanClaude.tsx:150`); bỏ qua 60 phút; chuông 1 lần nhờ `daBao = !!hong_ly_do` — lưu ý: sau 60 phút thử lại vẫn 401 thì **không** báo lại cho tới khi `boDauHong` (đúng chốt "một lần") |
| 13 · 14 | Không lỗi (bảng #12) |
| 15 | Đo thật 3010: `main.danh_ba` với `kiem-doc-lap` **có khoá** → `ok:true` + cảnh báo "cho qua vì có khoá nội bộ (bài đo)"; **không khoá** → `KHONG_CO_QUYEN` câu dặn gửi khoá; **khoá sai** (64 số 0) → chặn; `suc_khoe` không khoá → qua (KHONG_QUA_MA_TRAN). `coKhoaNoiBo` so `timingSafeEqual` sau khi so độ dài ✓ |
| 16 | Mốc `MOC_CHUYEN_BASE` 17:45:00Z nằm giữa 2 số đo: lượt nhận đầu của 3004 17:46:44Z (sổ 3004, tôi đo lần 3) · Base cũ trả lời agent khác lần cuối 17:44:33Z (phiên gửi). Dòng ĐÚNG mốc → giữ `base` (test `base-cu.test.ts:17`). Chỉ đổi bản đọc (`docBanSao` → 5 chỗ gọi: màn, đánh giá ngày, tự chạy), sổ gốc giữ nguyên ✓. Lưu ý: sổ của Base cũ (3011) vẫn tự ghi lượt `base → base viec_dem` tới 19:30Z nhưng danh bạ đã trỏ 3004 nên Quan sát không kéo sổ đó nữa — không lệch |

## Đối chốt T1–T16

| Chốt | Kết quả | Bằng chứng |
|---|---|---|
| T1 thứ tự TK1 → TK2 → cá nhân; việc nền không cá nhân | Đủ | `providers.ts` `chayTrenTaiKhoan` (`meta.nguoi && caNhanDungDuoc`); test `ai-tai-khoan-ca-nhan.test.ts:164` |
| T2 401 → tự chuyển, chuông | Đủ | `tai-khoan-claude.ts` `danhDauHongDangNhap` · `laLoiDangNhap` · `dungDuoc` xét `hong_den`; test `:221`, `:239` |
| T3 đổi tên "Góp ý + luật AI sau khi nộp", giữ code | Đủ | `thong-ke-ai.ts:311` |
| T4 Main mã lạ như agent con | Đủ | đo sống 3 ca (nghi #15); `cua-ma-la.ts` |
| T5 4 đường mềm, dóng 100 nghìn / 1 triệu | Đủ | `ThongKeAI.tsx` `BieuDoToken` (`buoc = ngày ? 100_000 : 1_000_000`, chỉ vẽ tài khoản có số); đo: tuần cộng 7 múi theo tài khoản = tổng (tk1 5.718.622) |
| T6 một vệt xanh / vàng / xám rảnh | Đủ | `VetThoiGian` nền `bg-border` xám, chạy `bg-green`, ngừng `bg-yellow`, tương lai mờ; đo vệt = phút chạy |
| T7 bảng đóng sẵn; tuần 7 dòng; ngày/tháng 15 dòng/trang | Đủ | `moBang` mặc định false; `DONG_MOT_TRANG = 15`; tuần không chia (`soTrang = 1`); dòng "Tổng cả kỳ" hiện mọi trang |
| T8 xếp hạng có tiêu đề cột + thanh tỉ lệ; sổ cũ thành ghi chú | Đủ | `BangXep`; đo tuần: `topNguoi` chỉ 1 người (quantri 9 lượt), `soCu` 393 lượt / 5.588.563 token ghi chú riêng |
| T9 "Agent Base (cũ)" | Đủ | nghi #16 |
| T10 Thống kê thành mục riêng, ẩn khi không quyền | Đủ | `TrangCaiDat.tsx` mục `thong-ke-ai`; `/api/toi` `co_the.thong_ke_ai` đo: quản trị true · người thường false |
| T11 menu "Tài khoản Claude cá nhân" | Đủ | grep "Tài khoản Claude của tôi" trong `src`: 0 |
| T12 một khuôn thẻ | Đủ | `TheTaiKhoanClaude` dùng ở `KetNoiAI.tsx:662` (TK1/TK2) và `TaiKhoanClaudeCuaToi.tsx` |
| T13 một cách đăng nhập (link + mã) | Đủ trên giao diện; cửa cũ còn ngầm (bảng #3) | |
| T14 2 thẻ cùng khuôn; model + Cài CLI một chỗ | Đủ | khối "Gói thuê bao Claude (Pro/Max)" giữ model + cài; 2 thẻ bên dưới |
| T15 E30 huỷ, câu lỗi đỏ | Đủ | `62323ab`; `TheTaiKhoanClaude.tsx` `text-red` cho mất đăng nhập / lỗi, `text-yellow` cho hết hạn mức |
| T16 luật chung | Đạt, trừ bảng #6 | Luật 17 ẩn: người thường `sua=false` → không nút; mục Thống kê ẩn · Luật 28: "Đang dùng", "chính/phụ" chữ thuần · Luật 11: `accent blue green yellow red border border-light bg bg2 surface text-muted` đều trong `tailwind.config.ts` · Luật 29: `dang-nhap-link` không gọi agent khác |

## Bảo mật (danh mục 2)

| Kiểm | Kết quả |
|---|---|
| Chuỗi người dùng vào dòng lệnh | Không: lệnh ghép `quoteForShell(bin) + " auth login --claudeai"` cố định; mã đi stdin sau khi lọc; `BROWSER` trỏ file cố định trong `%TEMP%` |
| Mã / khoá về trình duyệt | `mo_link` chỉ trả `url`; `nhap_ma` trả câu; GET tài khoản không có `sk-ant`, người thường không có email/gói/đuôi mã |
| Người thường đụng thẻ công ty | `POST /api/ai/tai-khoan mo_link` → 403 "Chỉ người có quyền sửa cài đặt…" (đo) |
| Đụng tài khoản cá nhân người khác | Khoá `ca_nhan:<nd.id>` lấy từ phiên, không từ body ✓ |

## tsc · test · tiến trình

| Bộ | tsc | Test | Lượt CLI thật |
|---|---|---|---|
| Công việc 3004 | 0 lỗi | `vitest run --maxWorkers=2`: **950 đạt · 0 hỏng · 12 bỏ qua** (110 file) | **0 lượt test gọi Claude thật.** Sổ phiên CLI 673 → 701 trong lúc chạy, nhưng 28 tệp mới đều ghi 12:00:59–12:05:32 (TRƯỚC khi test bắt đầu 12:07) và khớp đúng 28 dòng sổ dùng AI `quantri · app/api/cay-viec/soan-giao/route · ok` = lượt thật của app 3004 đang chạy (phiên Công việc dùng Cây việc) — sổ mới ghi đúng người và tính năng |
| Main 3010 | 0 lỗi | 721 đạt · 2 bỏ qua · 3 hỏng cũ (`man-cua-main.test.ts`) | — |
| Quan sát 3014 | 0 lỗi | 369 đạt (27 file, có `base-cu.test.ts`) | — |
| Tiến trình `auth login` trước / sau toàn bộ kiểm | 0 → 0 | | |

## Chưa kiểm được · cần Mr. Đại

- Chưa kiểm: đăng nhập trọn bằng link (dạng mã thật, `.credentials.json` có ghi không) — **chỉ anh thử**; điện thoại; test còn thiếu cho nghi #1/#3/#9 (phiên gửi tự khai).
- Cần anh: ① sau khi anh đăng nhập thử lần đầu, cho phiên Quan sát biết dạng mã (có ký tự lạ không) để chốt bộ lọc (bảng #5); ② có bỏ hẳn 3 cửa cũ `login-cli` / `dan_ma` / `luu` không (bảng #3); ③ Đợt 2–3 token AI (nhân bản sang 4 agent) chưa duyệt.
