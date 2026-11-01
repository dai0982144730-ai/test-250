# KIỂM TRA ĐỘC LẬP — Quản lý token AI, Đợt 1 + 1b ở agent Công việc (phiên "1 Agent quan sát", đêm 03→04/10)

> Người gửi: phiên **"1 Agent quan sát"** (phiên sửa code dùng chung + kết nối agent). Người kiểm: phiên **"0 Kiểm tra độc lập"**.
> Mr. Đại duyệt gửi kiểm tự động sau Đợt 1 (đề xuất 9 / 11 đề xuất, đêm 03/10: *"đồng ý làm đi"*).
> **Đừng tin lời kể trong file này** — mở file, chạy lệnh, đếm lại. Lời commit không phải bằng chứng.

## 0. Cách trả kết quả

- Ghi kết quả vào **cùng thư mục**: `…\6-Agent-cong-viec\CodeSCICongViec\kiem-tra-doc-lap\04-10-token-ai-dot-1.KET-QUA.md`, rồi nhắn **một tin ngắn** cho phiên "1 Agent quan sát" (đường dẫn + kết luận một dòng). Phiên gửi soát lại từng điểm bằng đo thật — đúng thì sửa, sai thì nói vì sao kèm số.
- Luật dự án: `D:\3 SETUP\1 AI\SCI Tiến độ\CLAUDE.md`. Báo cáo **tiếng Việt**, bảng ngắn, `file:dòng`, mã luôn kèm tên (luật 30).
- **CHỈ SOÁT**: không sửa code, không sửa MD, không commit. Muốn chứng minh lỗi thì viết bài test tạm, chạy, dán số, rồi XOÁ.

**Luật an toàn (bắt buộc):**

| Cấm | Vì sao |
|---|---|
| Mở `data/pgdata` khi cổng 3004 đang chạy | Hỏng WAL (02/10). Chép ra scratchpad rồi mới mở (cách làm: xem `04-10-lan-3-dot2-quyen-du-an-cong-base.md` mục 0) |
| `next build` ở bất kỳ bộ nào | 7 cổng dev đang chạy |
| Gọi Claude thật để thử (`/api/ai/tai-khoan*` action `luu` / `dan_ma`, hoặc test không giả `runAI`/`runAIGan`) | Tốn hạn mức thật. Mã đúng dạng nhưng giả (vd `sk-ant-oat01-` + 70 chữ `A`) thì hãng trả 401, **0 token** — được dùng |
| Lưu mã thật vào tài khoản của người thật | Thư mục `~/.sci-cong-viec/claude-tk/ca-nhan/` — nếu thử thì dùng tài khoản `quantri@scigroup.vn` và gỡ ngay sau |
| Ghi sổ `data/ai-so-dung.jsonl` bằng lượt thử rồi để lại | Thống kê sẽ hiện tên người thật. Thử xong xoá đúng dòng của mình |

Cookie phiên để curl: ký HMAC-SHA256 bằng `AUTH_SECRET` trong `.env.local` (có BOM — đọc `utf-8-sig`), payload `{"id","ten","exp"}`, cookie `sci_congviec_session` (khuôn ở `src/lib/auth-token.ts`). Quản trị: `quantri@scigroup.vn`; người thường: `anhn@scigroup.vn`.

## 1. Thước đo — Mr. Đại đã chốt (04/10, đêm)

| # | Chốt | Nguồn |
|---|---|---|
| T1 | Mỗi agent có tính năng 2 tài khoản Claude của agent Công việc; tài khoản khai NGAY tại từng agent; model + chế độ theo Main; giao diện giống nhau | trả lời 1 |
| T2 | Mỗi người tự nối tài khoản Claude riêng (mọi agent) để dùng khi tài khoản công ty hết token | trả lời 2 |
| T3 | Đăng nhập bằng **dán mã** (chạy được trên hosting Linux) | trả lời 3 |
| T4 | "Thống kê dùng AI" dưới Kết nối AI: nút Ngày/Tuần/Tháng + chọn ngày; biểu đồ trên (① token xếp chồng theo tài khoản ② phút AI chạy vs phút ngừng vì hạn mức); bảng chi tiết dưới (Ngày = ô giờ, Tuần/Tháng = ô ngày, bấm cột ngày mở ngày đó); top-5 người + top-5 tính năng | trả lời 4 |
| T5 | Làm ở agent Công việc trước, nhân bản sau khi duyệt — **đêm nay chỉ Đợt 1 ở agent Công việc** | trả lời 4 + đề xuất 1 |
| T6 | Được sửa 21 chỗ gọi AI để gắn nhãn tính năng | đề xuất 2 |
| T7 | **Thứ tự: TK1 → TK2 → tài khoản cá nhân của CHÍNH người đang hỏi. Việc nền máy tự chạy KHÔNG BAO GIỜ dùng tài khoản cá nhân** | đề xuất 3 |
| T8 | Mục "Tài khoản Claude của tôi" ở menu tên người; ai cũng nối được | đề xuất 4 |
| T9 | Giữ CẢ 2 cách đăng nhập: cửa sổ + dán mã | đề xuất 5 |
| T10 | Màu: TK1 cam · TK2 xanh dương · cá nhân xanh lá · API xám · ngừng vàng (đỏ dành cho Issue) | đề xuất 6 |
| T11 | Giữ sổ dùng AI 13 tháng | đề xuất 7 |
| T12 | Commit được ở repo agent Công việc | đề xuất 10 |
| T13 | Luật chung: tiếng Việt mọi chữ ra (cả thông báo lỗi) · luật 28 (chữ thuần không khoanh viền) · luật 30 (mã kèm tên) · luật 31 (khoảng ngày kèm số ngày; khoảng giờ "24 giờ · a – b") · luật 11 (token màu có thật trong `tailwind.config.ts`) | `CLAUDE.md` |

## 2. Code — 1 commit ở `6-Agent-cong-viec/CodeSCICongViec`

`git -C "D:\3 SETUP\1 AI\SCI Tiến độ\SCI-AI-AGENT\6-Agent-cong-viec\CodeSCICongViec" show acf14f4 --stat` *(mã commit ghi ở cuối file, mục 9)*

| Nhóm | File | Việc |
|---|---|---|
| Giữ sổ 13 tháng | `src/lib/ai/so-dung-ai.ts` `mocGiuSo` · `locDongCu` · `donSoMoiNgay` | |
| Sổ + số | `src/lib/ai/thong-ke-ai.ts` (MỚI, thuần) | Kiểu lượt / khoảng ngừng; `cacMui` (24 ô giờ · 7 ô ngày từ thứ Hai · ô ngày của tháng, giờ VN); `tinhThongKe` (token, theo tài khoản, phút chạy, phút ngừng = hợp các khoảng ngừng cắt tới "bây giờ", top-5); `giaiGioMoLai` (đọc giờ mở lại hạn mức từ câu CLI); `tenTinhNang` (từ điển tên tiếng Việt) |
| | `src/lib/ai/so-dung-ai.ts` (MỚI, server) | Ghi `data/ai-so-dung.jsonl` (mỗi lượt) + `data/ai-ngung.jsonl` (khoảng ngừng); đọc kèm sổ CŨ `ai-do-thoi-gian.jsonl` cho phần trước dòng đầu sổ mới; nhãn tính năng bằng AsyncLocalStorage (`voiTinhNang`), không có nhãn thì đọc ngăn xếp |
| | `src/lib/ai/providers.ts` | Ghi sổ mọi lượt (ok / lỗi / hết hạn mức / đầy hàng); `runAIGan(nhãn, …)`; đường API ghi "api" |
| Hết hạn mức | `src/lib/ai/tai-khoan-claude.ts` | Mốc "hết tới lúc" GHI ĐĨA (`data/ai-tai-khoan-het.json`); giờ mở lại đọc cả nhánh `is_error`; hết sạch tài khoản công ty → ghi khoảng ngừng |
| Màn Thống kê | `src/app/api/ai/thong-ke/route.ts` (MỚI) · `src/components/ai/ThongKeAI.tsx` (MỚI) · `src/components/cai-dat/TrangCaiDat.tsx` | Quyền `cau_hinh.sua`; người thường → 403 → màn ẩn |
| Nhãn tính năng | 20 file, 22 chỗ gọi `runAI` → `runAIGan("<đường file>", …)` + `src/lib/so-cai/hen-gio.ts` (mồi phiên) | Bản build sản phẩm gộp file → ngăn xếp không còn tên file, nên phải gắn tay |
| Dán mã (1b) | `tai-khoan-claude.ts` · `providers.ts` (`spawnClaude` nhận `maDangNhap` → biến `CLAUDE_CODE_OAUTH_TOKEN`; `thuMaDangNhap`) · `src/app/api/ai/tai-khoan/route.ts` (action `dan_ma`; đăng xuất xoá cả mã) · `src/components/ai/KetNoiAI.tsx` (nút "Dán mã" ở khung Hai tài khoản Claude) | Mã nằm `~/.sci-cong-viec/claude-tk/tk<n>/sci-ma-dang-nhap.json`; trình duyệt chỉ thấy 4 ký tự cuối |
| Tài khoản cá nhân (1b) | `tai-khoan-claude.ts` (thư mục `ca-nhan/<băm 16 ký tự>`, hàng chờ + mốc hết riêng) · `providers.ts` (`chayTrenTaiKhoan` thứ tự T7, `chayCaNhan`, `runCliPromptDich`) · `src/app/api/ai/tai-khoan-ca-nhan/route.ts` (MỚI) · `src/app/tai-khoan-claude/page.tsx` (MỚI) · `src/components/ai/TaiKhoanClaudeCuaToi.tsx` (MỚI) · `src/components/phong/KhungPhong.tsx` (menu) · `src/lib/ai/trang-co-that.ts` + `src/components/chat/ChatPanel.tsx` (link được phép) | |
| Lỗi CLI thoát mã 1 | `providers.ts` `runCliPromptOnce` + `docJsonLoiCli` | Xem mục 4 đo #4 |
| Chặn test gọi CLI thật | `providers.ts` `spawnClaude` (`CAM_CLI_THAT`) · `vitest.config.ts` · 5 file test giả thêm `runAIGan` | Xem mục 5 |
| Test | `tests/unit/ai-thong-ke.test.ts` · `tests/unit/ai-tai-khoan-ca-nhan.test.ts` · `tests/unit/ai-cam-cli-that.test.ts` (MỚI) | |

## 3. Đường bấm để xem

| Màn | Đường |
|---|---|
| Thống kê dùng AI | `localhost:3004` → tên người (góc trên) → Cài đặt → nhóm **AI** → cuộn xuống dưới khung Kết nối AI |
| Dán mã tài khoản công ty | cùng trang → khung **Hai tài khoản Claude** → nút **Dán mã** ở dòng tài khoản 1 / 2 |
| Tài khoản cá nhân | tên người → **Tài khoản Claude của tôi** (`/tai-khoan-claude`) |

## 4. Đã đo (phiên gửi tự đo — người kiểm đo lại)

| # | Đo gì | Kết quả |
|---|---|---|
| 1 | `claude auth status --json` với mã GIẢ trong thư mục trống | `loggedIn: true`, `authMethod: oauth_token`, không email/gói → **auth status không kiểm được mã**; phải hỏi một câu thật |
| 2 | Thư mục trống + mã thật (mã truy cập của máy) + `-p "Chỉ trả lời đúng một từ: OK" --model haiku` | `is_error: false`, `result: "OK"`, model `claude-haiku-4-5-20251001` |
| 3 | Mã giả + `-p` | thoát **mã 1**; stdout JSON 833 ký tự, `api_error_status: 401`, `result` = "Failed to authenticate. API Error: 401 OAuth access token is invalid." nằm **CUỐI** JSON, 0 token |
| 4 | API thật, mã giả, TRƯỚC khi sửa | JSON tiếng Anh lọt ra màn ("Claude CLI thoát với mã 1: {\"is_error\":true…" cắt 400 ký tự, mất lý do) → sửa `runCliPromptOnce`: thoát ≠ 0 mà stdout là JSON `is_error` thì trả nguyên cho bên dịch lỗi. Sau sửa: "Mã không đúng, đã hết hạn hoặc đã bị thu hồi. Chạy lại lệnh claude setup-token rồi dán mã mới." |
| 5 | API thật, mã thật, tài khoản `quantri` (lưu → GET → gỡ) | lưu ok, GET trả `duoi_ma: "…jwAA"`, **mã xuất hiện 0 lần** trong GET; gỡ xong file mã bị xoá. Câu thử tốn **6.307 token** (phần lớn là cache mở đầu của CLI vì thư mục tạm trống) |
| 5b | Thư mục có `.credentials.json` THẬT + mã GIẢ trong biến môi trường + `-p` | `is_error: false`, trả lời bình thường → **file cửa sổ thắng mã** (xem N4) |
| 6 | curl có cookie (quản trị / người thường) | `/tai-khoan-claude` 200/200 · `/cai-dat` 200/200 · `/api/ai/tai-khoan-ca-nhan` 200/200 · `/api/ai/tai-khoan` 200/200 · `/api/ai/thong-ke` 200/**403** · người thường dán mã công ty → "Chỉ người có quyền sửa cài đặt…" |
| 7 | Còn chỗ gọi AI không nhãn? `grep "[^.a-zA-Z]runAI("` ngoài providers | 0 chỗ; `runAIGan("` 22 chỗ; `runCliPrompt(` ngoài providers chỉ còn mồi phiên (đã bọc `voiTinhNang`) |
| 8 | Test liên quan (11 file) | 88/88 đạt; 0 lượt CLI thật mới |

## 5. Lỗi phiên gửi đã mắc trong đợt này (đã sửa — soát xem sửa đủ chưa)

| Lỗi | Hậu quả | Sửa |
|---|---|---|
| Đổi `runAI` → `runAIGan` ở 22 chỗ nhưng 5 file test giả `runAI` bằng `vi.mock` (`kiem-tra-gop-y-ai` · `luat-ai-dich` · `luat-ai-kiem` · `luat-ai-nen` · `soat-de-xuat`) — `runAIGan` gọi `runAI` THẬT bên trong module | Chạy cả bộ test lúc 02:11 → **6 lượt gọi Claude CLI thật** (Sonnet 5, ~115 nghìn token vào phần lớn cache, ~4,8 nghìn token ra, tài khoản mặc định của máy), 8 test hỏng. Đếm bằng sổ phiên CLI `~/.claude/projects/C--Users-Admin-AppData-Local-Temp-docflow-ai-sandbox/` | Thêm `runAIGan` vào 5 bản giả; THÊM LỚP CHẶN: `vitest.config.ts` đặt `CAM_CLI_THAT=1`, `spawnClaude` từ chối mọi CLI không phải CLI giả (`ANTHROPIC_SUB_CLI_PATH`); test `ai-cam-cli-that.test.ts` chứng minh chặn được |
| Thử API bằng tài khoản người thật `anhn@scigroup.vn` | 4 dòng "Thử mã đăng nhập Claude" trong `data/ai-so-dung.jsonl` mang tên người thật | Đã xoá cả 4 dòng (sổ còn 0 dòng → xoá file); thư mục cá nhân thử đã xoá |

## 6. Hướng đã bỏ

| Bỏ | Vì sao |
|---|---|
| Kiểm mã bằng `claude auth status` | Đo #1: mã giả vẫn báo đã đăng nhập |
| Đoán tính năng từ ngăn xếp ở bản sản phẩm | Next build gộp file — chỉ chạy ở `next dev`; nên gắn nhãn tay (T6) |
| Thử mã ngay trong thư mục của tài khoản | CLI khoá thư mục khi đang chạy → đụng lượt đang chạy; dùng thư mục TẠM riêng, xoá sau |
| Lưu mã trong `data/` | `data/` theo bản sao lưu + đóng gói; mã để ngoài (`~/.sci-cong-viec/claude-tk`), giống thư mục đăng nhập 02/10 |

## 7. Điểm phiên gửi TỰ NGHI NGỜ — soát kỹ

| # | Nghi ngờ | Chỗ |
|---|---|---|
| N1 | **"Việc nền" hiểu là việc do bộ hẹn giờ chạy.** Việc do người bấm rồi chạy tiếp sau khi trả lời (Gắn WBS ngay `app/api/cay-viec/gan-wbs/route.ts:31`, Xếp giai đoạn `app/api/phong/giai-doan/route.ts:27`, góp ý + luật AI sau khi nộp `lib/luat/ai/luot.ts` `khoiDongLuotAi`) vẫn mang tên người → có thể chạy bằng tài khoản cá nhân khi công ty hết. Bộ hẹn giờ bật ở `src/app/layout.tsx:11` (`khoiDongHenGio()` lúc nạp module, ngoài mọi yêu cầu) → không mang tên. Đúng ý T7 không? Có đường nào bộ hẹn giờ được bật TỪ TRONG một yêu cầu API (AsyncLocalStorage chép ngữ cảnh vào `setInterval`) không? `ngoaiNguCanh` (`lib/ngu-canh.ts`) có định nghĩa mà không nơi nào dùng | `providers.ts` `chayTrenTaiKhoan` |
| N2 | Thứ tự T7 đủ mọi nhánh? Nhất là: chưa thử lần nào mà cả 2 công ty đang đánh dấu hết + người có tài khoản cá nhân → đi THẲNG cá nhân (không gọi thử công ty dù mốc hết có thể chỉ là đoán 15 phút) | `providers.ts` `chayTrenTaiKhoan` |
| N3 | Phút "ngừng" chỉ ghi khi `danhDauHet` thấy không còn tài khoản công ty nào — tài khoản công ty lỗi 401 (mã hết hạn) thì KHÔNG tính ngừng; đánh dấu lại nhiều lần ghi nhiều khoảng chồng nhau (gộp ở `tinhThongKe`?) | `tai-khoan-claude.ts` `danhDauHet` · `thong-ke-ai.ts` |
| N4 | Thư mục có CẢ file cửa sổ (`.credentials.json`) lẫn mã → **đo 04/10: CLI dùng FILE CỬA SỔ** (mã giả vẫn trả lời được) — lật giả định ban đầu của phiên gửi. Sửa: mỗi lúc một cách — lưu mã xoá file cửa sổ (`luuMaCongTy`), bấm "Đăng nhập" cửa sổ xoá mã (`route.ts` nhánh login, xoá ngay khi cửa sổ MỞ chứ không đợi đăng nhập xong — người huỷ giữa chừng thì tài khoản thành chưa đăng nhập). Soát: còn đường nào tạo ra cả hai? | `tai-khoan-claude.ts` `kieuDangNhap` · `luuMaCongTy` · `api/ai/tai-khoan/route.ts` |
| N5 | Mã lọt ra đâu được không: trả về trình duyệt, ghi lịch sử (`ghiDoiKetNoi` lọc khoá tên `token`/`khoa`…, phiên gửi chỉ truyền `duoi_ma`), log console, câu lỗi (CLI có in mã trong stderr không?), sổ dùng AI | `route.ts` x2 · `providers.ts` |
| N6 | Quyền file `0o600` chỉ có tác dụng trên Linux; Windows để mặc định | `tai-khoan-claude.ts` `ghiMa` |
| N7 | "Lưu và thử" không giới hạn số lần — mỗi lần ~6.300 token của chính người dán | `api/ai/tai-khoan-ca-nhan/route.ts` |
| N8 | Đổi `runCliPromptOnce` (thoát ≠ 0 + JSON `is_error` → trả stdout) có làm hỏng nhánh thử lại bỏ cờ (`UNKNOWN_FLAG_RE`) hoặc đổi bí danh model (`MODEL_LA_RE`) không? `detail` giờ lấy từ `result` của JSON | `providers.ts` `runCliPromptOnce` |
| N9 | Màu (T10) + luật 28 + luật 11 ở 2 màn mới (`TaiKhoanClaudeCuaToi.tsx`, phần Dán mã trong `KetNoiAI.tsx`); câu báo lỗi chữ đỏ (theo nếp hộp báo nhanh sẵn có) có phạm "đỏ dành cho Issue" không | |
| N10 | Bảng thống kê: số tuần / tháng / "hôm nay" theo giờ VN đúng ở biên 00:00 – 07:00 sáng; tuần bắt đầu thứ Hai; luật 31 ở mọi chỗ hiện khoảng ngày / giờ | `thong-ke-ai.ts` `cacMui` · `ThongKeAI.tsx` |
| N11 | Sổ cũ `ai-do-thoi-gian.jsonl` vẫn ghi song song mỗi lượt (trùng dữ liệu với sổ mới) — có làm thống kê đếm đôi không (`docLuot` chỉ đọc sổ cũ cho phần TRƯỚC dòng đầu sổ mới) | `so-dung-ai.ts` `docLuot` |
| N12 | T11 "giữ sổ 13 tháng": mỗi sổ mỗi ngày (giờ VN) dọn một lần lúc ghi dòng đầu ngày, ghi file tạm rồi đổi tên. Hai tiến trình cùng ghi (dev nạp lại module) có thể đè nhau? Dòng ghi xen giữa lúc đọc và lúc đổi tên có mất không? | `so-dung-ai.ts` `donSoMoiNgay` |
| N13 | Mỗi lần mở Thống kê đọc CẢ sổ (`docLuot` đọc toàn file rồi lọc). Đo 01–03/10: ~250 lượt/ngày → 13 tháng ≈ 100 nghìn dòng ≈ 30 MB — có chậm / tốn bộ nhớ không | `so-dung-ai.ts` `docLuot` |

## 8. Danh mục kiểm (gợi ý — người kiểm thêm bớt)

1. Đối từng chốt T1–T13 với code: chốt nào làm đủ, chốt nào làm thiếu / làm khác, chốt nào ngoài phạm vi đêm nay (T1/T2 nhân bản sang agent khác = Đợt 2, chưa làm).
2. Chạy `npx vitest run --maxWorkers=2` (bộ đủ ~5 phút; mặc định nhiều luồng sẽ hết bộ nhớ) + `npx tsc --noEmit` — đếm đạt / hỏng; hỏng nào có từ trước.
3. Đếm lượt CLI thật sinh ra trong lúc chạy test (sổ phiên CLI như mục 5) — phải là 0.
4. curl các trang / API ở mục 4 #6, thêm `/api/ai/thong-ke?che_do=tuan&ngay=2026-10-01` và `che_do=thang`.
5. Mã giả đúng dạng vào cả 2 API → câu báo tiếng Việt, không lưu gì (`~/.sci-cong-viec/claude-tk/` không thêm file).
6. Soát N1–N13.
7. Tiếng Việt mọi chữ đến tay người dùng ở 3 màn + câu lỗi.

## 9. Khuôn kết quả (`.KET-QUA.md`)

| # | Mức (🔴 sai chốt / lỗi chạy · 🟡 thiếu / rủi ro · ⚪ góp ý) | Chỗ `file:dòng` | Thấy gì (kèm số / lệnh) | Nên sửa thế nào |
|---|---|---|---|---|

Cuối file: bảng đối chốt T1–T13 (đủ / thiếu / khác / ngoài phạm vi) + một dòng kết luận.

---
**Mã commit:** acf14f4
