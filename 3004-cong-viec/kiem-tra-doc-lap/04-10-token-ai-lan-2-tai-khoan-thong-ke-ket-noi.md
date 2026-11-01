# KIỂM TRA ĐỘC LẬP — Token AI lần 2: 3 tài khoản Claude · biểu đồ thống kê token · kết nối (phiên "1 Agent quan sát", sáng–trưa 04/10)

> Người gửi: phiên **"1 Agent quan sát"**. Người kiểm: phiên **"0 Kiểm tra độc lập"**.
> Mr. Đại giao trưa 04/10: *"sau khi tôi chốt vấn đề 3 tài khoản claude, biểu đồ theo dõi token và kết nối thì nhắn cho agent kiểm tra độc lập kiểm tra code"*.
> Lần 1 (`04-10-token-ai-dot-1.md`) chỉ soát commit `acf14f4`. Lần này = **mọi commit code của phiên Quan sát SAU đó** (mục 2).
> **Đừng tin lời kể trong file này** — mở file, chạy lệnh, đếm lại. Lời commit không phải bằng chứng.

## 0. Cách trả kết quả

- Ghi kết quả vào **cùng thư mục**: `…\6-Agent-cong-viec\CodeSCICongViec\kiem-tra-doc-lap\04-10-token-ai-lan-2-tai-khoan-thong-ke-ket-noi.KET-QUA.md`, rồi nhắn **một tin ngắn** cho phiên "1 Agent quan sát" (đường dẫn + kết luận một dòng). Phiên gửi soát lại từng điểm bằng đo thật.
- Luật dự án: `D:\3 SETUP\1 AI\SCI Tiến độ\CLAUDE.md`. Báo cáo **tiếng Việt**, bảng ngắn, `file:dòng`, mã luôn kèm tên (luật 30).
- **CHỈ SOÁT**: không sửa code, không sửa MD, không commit. Muốn chứng minh lỗi thì viết bài test tạm, chạy, dán số, rồi XOÁ.

**Luật an toàn (bắt buộc):**

| Cấm | Vì sao |
|---|---|
| Mở `data/pgdata` khi cổng agent Công việc đang chạy | Hỏng WAL (02/10) — chép ra scratchpad rồi mới mở |
| `next build` ở bất kỳ bộ nào | 7 cổng dev đang chạy |
| Gọi Claude thật (`action: "thu"`, `dan_ma`, `luu`, test không giả `runAI`/`runAIGan`) | Tốn hạn mức thật. Mã dài hạn đúng dạng nhưng giả (`sk-ant-oat01-` + 70 chữ `A`) → 401, **0 token** — được dùng |
| Dán mã đăng nhập link THẬT / đăng nhập trọn bằng tài khoản Claude thật | Không ai trong phiên AI được nhập tài khoản. Bước cuối để Mr. Đại thử |
| `action: "mo_link"` rồi bỏ đó | Mỗi lượt để lại một tiến trình `claude.exe auth login` chờ 15 phút. Gọi xong thì `huy_link`, rồi đếm tiến trình (lệnh ở mục 4) phải về 0 |
| Thử bằng tài khoản người thật | Dùng `quantri@scigroup.vn` (quản trị) / `anhn@scigroup.vn` (người thường) — CLI tạo thư mục `~/.sci-cong-viec/claude-tk/ca-nhan/<băm>`; thử xong XOÁ thư mục đó (không có `.credentials.json` thì xoá được) |

Cookie phiên để curl: ký HMAC-SHA256 bằng `AUTH_SECRET` trong `.env.local` (có BOM — đọc `utf-8-sig`), payload `{"id","ten","exp"}`, cookie `sci_congviec_session`. **Dùng curl** — PowerShell 5.1 `Invoke-RestMethod` lặng lẽ bỏ header Cookie (đo 04/10: ra 401).

## 1. Thước đo — Mr. Đại đã chốt

| # | Chốt | Lúc / nguồn |
|---|---|---|
| T1 | Thứ tự TK1 → TK2 → tài khoản cá nhân của CHÍNH người hỏi; việc nền máy tự chạy KHÔNG BAO GIỜ dùng tài khoản cá nhân | đêm 03/10, đề xuất 3 |
| T2 | Tài khoản công ty mất đăng nhập (401) → tự chuyển tài khoản kia rồi cá nhân; báo chuông quản trị | sáng 04/10, ô chọn ở phiên kiểm |
| T3 | "Góp ý + luật AI sau khi nộp" là việc của người nộp → giữ code, đổi tên tính năng | sáng 04/10 |
| T4 | Cổng Main xử mã lạ NHƯ agent con: có khoá nội bộ `x-sci-noi-bo` → cho qua kèm cảnh báo; không khoá → chặn | sáng 04/10 |
| T5 | Biểu đồ token: **4 đường mềm** nối đỉnh (TK1 · TK2 · cá nhân · khoá API, 4 màu); dóng ngang **Ngày 100 nghìn · Tuần/Tháng 1 triệu** | trưa 04/10 (lời + ô chọn) |
| T6 | Thời gian: **một vệt dài** — xanh = AI chạy · vàng = ngừng vì hết hạn mức · **xám nhạt = rảnh** | trưa 04/10 (ô chọn) |
| T7 | Bảng chi tiết **đóng sẵn**, bấm mới mở; Tuần 7 dòng; Ngày/Tháng **15 dòng/trang**, có chuyển trang | trưa 04/10 |
| T8 | "Ai dùng nhiều nhất" / "Tính năng tốn token nhất": bảng có **tiêu đề cột + thanh tỉ lệ**; dòng sổ cũ thành ghi chú xám, không xếp hạng | trưa 04/10 (ô chọn) |
| T9 | Quan sát: lượt mã `base` trước mốc chuyển cổng hiện **"Agent Base (cũ)"**, không gán cho agent Công việc | trưa 04/10 (ô chọn) |
| T10 | "Thống kê dùng AI" **tách khỏi mục AI thành mục riêng** (agent Công việc). Agent khác (Đợt 2, CHƯA làm): tab riêng | trưa 04/10 |
| T11 | Menu tên người góc phải: **"Tài khoản Claude cá nhân"** — khi TK1, TK2 hết thì bấm vào đó đăng nhập tài khoản của mình | trưa 04/10 |
| T12 | *"bản chất đây là cùng 1 việc thì không trình bầy 1 vấn đề theo 2 cách khác nhau"* → **MỘT khuôn thẻ** cho TK1, TK2, cá nhân (theo khối "Tài khoản Claude (Pro/Max)" anh chụp) | trưa 04/10 |
| T13 | **MỘT cách đăng nhập: link + dán mã** cho cả 3 — bỏ cửa sổ trên máy chủ và mã dài hạn khỏi giao diện | trưa 04/10 (ô chọn) |
| T14 | Gộp khối lớn + 2 dòng TK thành **2 thẻ cùng khuôn**; model mặc định + Cài lại CLI ở MỘT chỗ chung | trưa 04/10 (ô chọn) |
| T15 | **E30 đã HUỶ** ("để lại như cũ không đổi đỏ thành vàng nữa"): câu lỗi đỏ như cũ; màu đỏ/vàng là việc phiên "0 Sửa giao diện". → phần đổi màu trong `631fc40` **NGOÀI PHẠM VI** (phiên giao diện đã trả ở `ec4f8ca`) | trưa 04/10 |
| T16 | Luật chung: tiếng Việt mọi chữ ra (cả lỗi) · luật 11 (token màu có thật) · luật 17 ngoại lệ agent Công việc (nút không quyền thì ẨN) · luật 28 (chữ thuần không viền) · luật 29 (gọi agent khác qua sổ) · luật 30 · luật 31 | `CLAUDE.md` |

## 2. Code — 9 commit, 3 bộ

| Commit | Bộ | Việc | File chính |
|---|---|---|---|
| `a601e7f` | agent Công việc | Sửa theo kiểm lần 1 (4 sửa): `.gitignore` sổ AI · mốc hết ĐOÁN 15 phút thì thử công ty trước cá nhân (`het_doan`) · ẩn gói với người thường · ngày sai báo 400 | `tai-khoan-claude.ts` · `providers.ts` · `api/ai/thong-ke` · `api/ai/tai-khoan` |
| `631fc40` | agent Công việc | T2 + T3 (**chỉ soát phần này**; ~25 file đổi màu là E30 — ngoài phạm vi) | `tai-khoan-claude.ts` (`danhDauHongDangNhap` · `boDauHong` · `laLoiDangNhap`) · `providers.ts` (`chayTrenTaiKhoan` nhánh 401, `cauHetCongTy`) · `thong-ke-ai.ts` |
| `67c3d9a` | agent Công việc | T5–T8 | `components/ai/ThongKeAI.tsx` (vẽ lại) · `thong-ke-ai.ts` (`vet`, `soCu`) |
| `0035892` | agent Công việc | T10 + T11 | `cai-dat/TrangCaiDat.tsx` (mục `thong-ke-ai`) · `api/toi` (`co_the.thong_ke_ai`) · 10 chỗ đổi tên |
| `7837843` | agent Công việc | T12–T14 | MỚI `lib/ai/dang-nhap-link.ts` · MỚI `components/ai/TheTaiKhoanClaude.tsx` · `KetNoiAI.tsx` · `TaiKhoanClaudeCuaToi.tsx` · `api/ai/tai-khoan` · `api/ai/tai-khoan-ca-nhan` · `api/ai/status` · `tai-khoan-claude.ts` (cá nhân nhận file đăng nhập) · `providers.ts` (`thuTaiKhoan`) · MỚI `tests/unit/ai-dang-nhap-link.test.ts` |
| `62323ab` | agent Công việc | T15: câu lỗi + "mất đăng nhập" trên thẻ về đỏ; hết hạn mức giữ vàng | `TheTaiKhoanClaude.tsx` · `TaiKhoanClaudeCuaToi.tsx` |
| `251ca54` | agent Công việc | Hẹn 15 phút tắt CHÍNH tiến trình của lượt (xem mục 7 #1) | `dang-nhap-link.ts` |
| `47fe9df` | Main (`4-agent-main`) | T4 | MỚI `src/lib/mcp/cua-ma-la.ts` (`xetMaLa`) · `src/lib/day-sang-agent.ts` (`coKhoaNoiBo`, so sánh an toàn thời gian) · `src/app/api/mcp/main/route.ts` |
| `3e935af` | Quan sát (`0-agent-quan-sat`) | T9 | `src/lib/ban-sao-so/model.ts` (`MOC_CHUYEN_BASE`, `gatNhanBaseCu`) · `luu.ts` · `src/lib/quan-sat/gop-ten.ts` |

Đường dẫn bộ: agent Công việc `SCI-AI-AGENT\6-Agent-cong-viec\CodeSCICongViec` · Main `SCI-AI-AGENT\4-agent-main` · Quan sát `SCI-AI-AGENT\0-agent-quan-sat` (đều dưới `D:\3 SETUP\1 AI\SCI Tiến độ\`). Git cùng repo có commit phiên khác xen giữa — chỉ soát đúng 9 mã trên.

## 3. Đường bấm để xem (localhost:3004)

| Xem | Đường bấm |
|---|---|
| 2 thẻ tài khoản công ty + khối chung | Cài đặt → tab 🔌 Kết nối → mục **AI** (chế độ Gói thuê bao) |
| Thống kê | Cài đặt → 🔌 Kết nối → mục **Thống kê dùng AI** (người thường không thấy mục) |
| Thẻ cá nhân | bấm tên mình góc phải → **Tài khoản Claude cá nhân** (`/tai-khoan-claude`) |
| Quan sát "Agent Base (cũ)" | localhost:3014 — đồ hoạ luồng / đánh giá đêm |

## 4. Đã đo (phiên gửi tự đo — người kiểm đo lại)

| # | Đo | Kết quả |
|---|---|---|
| 1 | `claude auth login --claudeai` chạy qua ống (stdin/stdout pipe), thư mục cấu hình tạm | In *"If the browser didn't open, visit: https://claude.com/cai/oauth/authorize?…"* rồi *"Paste code here if prompted >"*. `claude setup-token` qua ống: **0 chữ** trong 12 giây |
| 2 | Biến `BROWSER` trỏ tới file `.cmd` ghi dấu | CLI **gọi đúng chương trình đó** → đặt lệnh rỗng thì máy chủ không bật tab |
| 3 | Dán mã sai qua stdin | thoát mã 1, stderr `Login failed: Request failed with status code 400`, không có `.credentials.json` |
| 4 | Máy chủ thật, `mo_link` tài khoản cá nhân | trả link sau **735 ms**; dán mã sai → câu Việt "Mã không đúng hoặc đã quá hạn…"; dán lần nữa → "Lượt đăng nhập này đã hết hạn…" |
| 5 | `mo_link` 2 lần liền rồi `huy_link` (curl) | tiến trình `auth login`: 0 → 1 → 1 → **0** |
| 6 | Quyền | người thường gọi `/api/ai/tai-khoan` → câu chặn tiếng Việt; `co_the.thong_ke_ai` quản trị `true` / người thường `false` |
| 7 | `kiem_tra` TK1 (0 token) | "đang đăng nhập: dai0982144730@gmail.com · Claude Max" — TK1 chưa đăng nhập riêng → chạy bằng tài khoản mặc định của máy |
| 8 | Test | tsc sạch · cụm `tests/unit/ai-*` 102/102 + `ai-dang-nhap-link` 7/7 (CLI giả = script node qua `.cmd`, tiến trình con THẬT) · sổ `data/ai-do-thoi-gian.jsonl` giữ 393 dòng, không có `data/ai-so-dung.jsonl` → **0 lượt Claude thật** |
| 9 | Trang | `/cai-dat?tab=ket-noi&muc=ai` · `…&muc=thong-ke-ai` · `/tai-khoan-claude` · `/ky-nang` · `/so-do` → 200 (quản trị + người thường) |

Lệnh đếm tiến trình treo (Windows): `powershell -NoProfile -Command "@(Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'claude.exe' -and $_.CommandLine -match 'auth login' }).Count"`

## 5. Lỗi phiên gửi đã mắc trong đợt này

| # | Lỗi | Đã làm |
|---|---|---|
| 1 | Báo anh "Huỷ xong 0 tiến trình treo" — sai: còn 1 tiến trình `auth login` từ lượt bấm thử đầu tiên qua trình duyệt (11:48:09) | Đã tắt; thêm hẹn giờ tự tắt chính tiến trình (`251ca54`). **Chưa rõ gốc** — xem mục 7 #1 |
| 2 | Thẻ mới viết câu lỗi màu vàng sau khi E30 đã huỷ | `62323ab` |
| 3 | Khung đăng nhập ghi "đã mở ở tab mới" cả khi trình duyệt chặn tab | sửa trước commit: `daMoTab` |
| 4 | Lượt thử để lại 2 thư mục `ca-nhan/<băm>` (quản trị + anhn) | đã xoá |

## 6. Hướng đã bỏ

| Hướng | Vì sao bỏ |
|---|---|
| Chạy `claude setup-token` ngầm rồi đưa link lên web | Đo #1: qua ống không in gì (cần cửa sổ lệnh thật) |
| Tự dựng luồng OAuth bằng mã khách của Claude Code | Giả làm ứng dụng chính hãng, dễ gãy khi hãng đổi |
| Giữ cửa sổ máy chủ cho công ty + link cho cá nhân | Hai cách cho một việc — trái T12 (anh chọn) |
| Nút "Đăng xuất" cho TK1 khi đang chạy bằng tài khoản mặc định của máy | Xoá luôn đăng nhập Claude Code của máy chủ. Thay bằng "Đăng nhập tài khoản riêng" |
| Thống kê thành tab thứ 5 ở agent Công việc | Anh nói "mục riêng" cho agent này, "tab riêng" cho agent khác — làm đúng chữ; chưa hỏi lại |

## 7. Điểm phiên gửi TỰ NGHI NGỜ — soát kỹ

| # | Nghi ngờ | Ở đâu |
|---|---|---|
| 1 | **Tiến trình treo chưa rõ gốc.** Bấm thử lần 1 qua trình duyệt (11:48) → sửa `TheTaiKhoanClaude.tsx` (chỉ phía trình duyệt) → nạp lại trang → bấm lần 2 → Huỷ. Lượt 1 còn sống tới ~12:0x dù `moDangNhapLink` gọi `huyDangNhapLink(khoa)` trước khi chạy lượt mới. Đo bằng curl thì tắt đúng. Danh sách chờ để ở `globalThis` | `dang-nhap-link.ts` `dsCho` · `huyDangNhapLink` |
| 2 | **Chưa ai đăng nhập TRỌN bằng link.** Đường thành công (CLI thoát 0 + có `.credentials.json` trong `CLAUDE_CONFIG_DIR`) là suy từ cách cửa sổ đăng nhập cũ ghi file (đo 02/10), CLI giả chỉ bắt chước | `guiMaDangNhap` |
| 3 | **Dạng mã thật chưa biết** — lọc `^[A-Za-z0-9_\-.~#]{10,2000}$`. Mã thật có `=` `%` `/` thì bị chặn oan, người dùng không đăng nhập được | `chuanHoaMaLink` · `TheTaiKhoanClaude.tsx` `RE_MA` (dán tự gửi chỉ khi ≥ 20 ký tự) |
| 4 | Mỗi người bấm `mo_link` là một tiến trình CLI sống tối đa 15 phút; không có trần tổng | `moDangNhapLink` |
| 5 | `window.open("about:blank")` ngay trong cú bấm rồi gán link sau — trình duyệt trong app chặn (khung chuyển sang "Bấm link…"); **điện thoại chưa thử** | `TheTaiKhoanClaude.tsx` `dangNhap` |
| 6 | TK1 đăng nhập bằng link → rời tài khoản mặc định của máy; Đăng xuất TK1 sau đó → lặng lẽ quay về tài khoản mặc định (thẻ hiện lại "mặc định của máy chủ"). Có gây hiểu nhầm? | `thuMucChay` · `TheTaiKhoanClaude.tsx` |
| 7 | Thanh "Đang dùng: …" trên cùng nay đọc TK1 (`thuMucChay(1)`) — khi TK1 hết/mất đăng nhập và TK2 đang chạy, thanh vẫn nói TK1 | `api/ai/status` |
| 8 | Nút "Thử trợ lý AI" đi qua hàng chờ của tài khoản — gọi từ API (không trong khung chat) nên có thể xếp sau việc nền, chờ lâu | `providers.ts` `thuTaiKhoan` · `runCliPromptDich` `laUuTien()` |
| 9 | Thử trúng hết hạn mức / 401 thì `thuTaiKhoan` KHÔNG đánh dấu hết / mất đăng nhập cho tài khoản | `thuTaiKhoan` |
| 10 | Cổng `dan_ma` / `luu` (mã dài hạn) giữ lại dù giao diện đã bỏ; `/api/ai/login-cli` (cửa sổ máy chủ) không còn ai gọi nhưng vẫn sống | 2 route + `api/ai/login-cli/route.ts` |
| 11 | Tài khoản cá nhân: mốc hết hạn mức chuyển sang file `sci-het-han-muc.json`; vẫn đọc mốc cũ trong file mã | `tai-khoan-claude.ts` `docHetCaNhan` · `ghiHetCaNhan` |
| 12 | 401 (T2): bỏ qua 60 phút rồi thử lại; chuông quản trị MỘT lần; hết đường thì ném câu gốc. Kiểm câu chuông nay ghi "thẻ Tài khoản N → Đăng nhập lại" — khớp giao diện mới? | `danhDauHongDangNhap` |
| 13 | Biểu đồ: đường mềm kiểu cubic đơn điệu có vượt dưới 0 / vượt đỉnh không; nhãn trục mỗi `ceil(n/5)` ô; dóng phụ đứt nét; tài khoản "chưa dùng" không vẽ | `ThongKeAI.tsx` `duongMem` · `BieuDoToken` |
| 14 | Vệt thời gian: khoảng chạy = `[t + cho_ms, t + cho_ms + chay_ms]` gộp chồng, cắt theo cửa sổ; phần tương lai làm mờ. Lượt sổ cũ (không có `cho_ms`) thì sao? | `thong-ke-ai.ts` `tinhThongKe` (`vet`) |
| 15 | Main `xetMaLa`: mã hệ thống / mã trong danh bạ → bỏ qua; có khoá → qua + cảnh báo; không khoá → chặn. So khoá an toàn thời gian. Sổ ghi đúng mã bài đo? | `cua-ma-la.ts` · `day-sang-agent.ts` |
| 16 | Quan sát: mốc `MOC_CHUYEN_BASE` viết cứng; lượt đúng mốc (bằng) rơi về bên nào; bản sao sổ cũ đã có nhãn `base` được gạt lại khi đọc chứ không ghi đè | `ban-sao-so/model.ts` `gatNhanBaseCu` |

## 8. Danh mục kiểm (gợi ý)

1. Đối từng chốt T1–T16 với code (mở file, không đọc lời commit).
2. Bảo mật: chuỗi người dùng có lọt vào dòng lệnh không (`dang-nhap-link.ts` chạy `.cmd` qua `shell: true`); mã đăng nhập / khoá có về trình duyệt không; người thường đụng được thẻ công ty không; người này đụng được tài khoản cá nhân người khác không (khoá `ca_nhan:<id>`).
3. Tiến trình: mọi đường (thành công · mã sai · hết 60 giây · Huỷ · bấm lại · hết 15 phút · máy chủ tắt) có để lại `claude.exe auth login` không.
4. Tiếng Việt: mọi câu ra màn / API ở 9 commit (kể cả nhánh lỗi "(Claude báo: …)" — có để lọt tiếng Anh thô không).
5. Luật 17 ngoại lệ (ẩn nút không quyền) · luật 28 (chip "Đang dùng", "chính/phụ" là chữ thuần) · luật 11 (token màu).
6. Thống kê: số trên biểu đồ = số trong bảng chi tiết = tổng; 15 dòng/trang; Tuần không chia trang; sổ cũ không vào xếp hạng.
7. Test: đủ đường chưa (mục 7 #1, #3, #9 chưa có bài).

## 9. Khuôn kết quả (`.KET-QUA.md`)

| # | Mức (🔴 sai chốt / lỗi chạy · 🟡 thiếu / rủi ro · ⚪ góp ý) | Chỗ `file:dòng` | Thấy gì (kèm số / lệnh) | Nên sửa thế nào |
|---|---|---|---|---|

Cuối file: bảng đối chốt T1–T16 (đủ / thiếu / khác / ngoài phạm vi) + một dòng kết luận.

---
**Mã commit:** agent Công việc `a601e7f` `631fc40` `67c3d9a` `0035892` `7837843` `62323ab` `251ca54` · Main `47fe9df` · Quan sát `3e935af`
