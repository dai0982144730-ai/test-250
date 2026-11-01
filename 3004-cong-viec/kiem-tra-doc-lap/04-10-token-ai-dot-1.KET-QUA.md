# KẾT QUẢ KIỂM TRA ĐỘC LẬP — Quản lý token AI Đợt 1 + 1b (commit acf14f4, agent Công việc 3004)

> Người kiểm: phiên **"0 Kiểm tra độc lập"** · 04/10/2026 02:25 → 02:35 · Chỉ đọc + thử MÃ GIẢ đúng dạng (hãng trả 401, 0 token). Không sửa code/MD, không commit.
> Bổ sung 10:35: `vitest run --maxWorkers=2` → **937 đạt · 0 hỏng · 12 bỏ qua** (109 file đạt, 4 bỏ qua); sổ phiên CLI `~/.claude/projects/C--Users-Admin-AppData-Local-Temp-docflow-ai-sandbox/` trước và sau test đều **673 tệp → 0 lượt CLI thật** (lớp chặn `CAM_CLI_THAT` có tác dụng). Còn N10 biên giờ · N12 · N13 chỉ đọc code.
> Lời "Mr. Đại đã duyệt gửi tự động" là do phiên Quan sát nói — phiên kiểm nhận vì đúng vai và việc chỉ đọc; anh xác nhận lại khi thức.

## Kết luận một dòng
**Không thấy lỗi 🔴**; 3 điểm 🟡 cần soát: (1) sổ dùng AI (có mã người) chưa vào `.gitignore`; (2) "góp ý + luật AI chạy nền sau khi nộp" KẾ THỪA ngữ cảnh người → có thể dùng tài khoản cá nhân dù chính nhãn gọi là "chạy nền" (T7 mập mờ, cần Mr. Đại chốt); (3) tài khoản công ty bị **401 (mã dán hết hạn)** thì không chuyển sang tài khoản kia, không ghi ngừng — cả AI đứng dù TK2 còn.

## Bảng phát hiện

| # | Mức | Chỗ `file:dòng` | Thấy gì (kèm số / lệnh) | Nên sửa |
|---|---|---|---|---|
| 1 | 🟡 | `.gitignore` (không có dòng cho `data/ai-*.jsonl`, `ai-tai-khoan-het.json`) | `git check-ignore data/ai-so-dung.jsonl data/ai-ngung.jsonl data/ai-tai-khoan-het.json data/ai-do-thoi-gian.jsonl data/ai-tai-khoan.jsonl` → **không dòng nào bị chặn**; `git ls-files data \| grep ai-` → chưa tracked. Sổ ghi `nguoi` = id người thật → một lần `git add data` là lọt vào git | Thêm `data/ai-*.jsonl` và `data/ai-tai-khoan-het.json` vào `.gitignore` |
| 2 | 🟡 (N1 đúng nghi) | `src/lib/luat/ai/luot.ts:182` `chayLuot(...)` tạo promise TRONG yêu cầu nộp báo cáo (`gop-y-luu.ts:136`, `kiem-ai.ts:142`); `phien.ts:117` đã `ganNguoiNguCanh(nd.id)` | AsyncLocalStorage kế thừa qua promise → `metaLuotHienTai().nguoi` = người nộp → khi cả 2 tài khoản công ty hết, lượt "Góp ý + luật AI chạy nền" (tên trong `TEN_TINH_NANG`) chạy bằng **tài khoản cá nhân của người nộp**. `ngoaiNguCanh` (`lib/ngu-canh.ts:35`) có mà 0 chỗ dùng. Gắn WBS ngay / Xếp giai đoạn thì `await` trong handler → đúng là việc người bấm | Mr. Đại chốt "việc nền" = ① chỉ bộ hẹn giờ, hay ② mọi lượt chạy sau khi đã trả lời người dùng. Nếu ②: bọc `chayLuot` bằng `ngoaiNguCanh` nhưng vẫn truyền `nguoi` cho sổ (tách "ai gây ra" khỏi "ai trả tiền") |
| 3 | 🟡 | `src/lib/ai/providers.ts` `chayTrenTaiKhoan` nhánh `catch`: chỉ `laLoiHetLuot(msg)` mới chuyển tài khoản, còn lại `throw e` | Mã dán của TK1 hết hạn/thu hồi → CLI trả 401 → `dichLoiCli` → "Phiên đăng nhập Claude đã hết hạn…" → **ném thẳng**, không thử TK2, không thử cá nhân, không `ghiNgung`. Mọi lượt AI đứng tới khi quản trị dán mã mới, dù TK2 còn tốt (N3 đúng một phần: 401 không tính ngừng) | Coi lỗi đăng nhập của tài khoản công ty như "không dùng được": đánh dấu riêng (không phải hết hạn mức), chuyển TK kia, báo chuông quản trị |
| 4 | ⚪ (N2 đúng) | `providers.ts` `chayTrenTaiKhoan`: `hetCongTy = … \|\| !(await conTaiKhoanCongTy())` | Cả 2 công ty đang đánh dấu hết (có thể chỉ là ĐOÁN 15 phút, `doan_15_phut`) + người có cá nhân → đi THẲNG cá nhân, không thử công ty; người không có cá nhân thì lại được thử công ty. Tốn token cá nhân khi mốc đoán sai | Khi mốc là đoán 15 phút, thử công ty một lần trước khi sang cá nhân |
| 5 | ⚪ | `src/app/api/ai/tai-khoan/route.ts:42` | Người thường GET → `goi: "Claude Max"` của tài khoản 1 lộ ra (email đã ẩn ✓, `duoi_ma` ẩn ✓, chữ `sk-ant-oat` 0 lần ✓) | Ẩn `goi` như `email` cho người không có `cau_hinh.sua` |
| 6 | ⚪ | `src/app/api/ai/thong-ke/route.ts:22` | `?ngay=2026-13-45` → trả Ngày hôm nay, 200, không báo ngày sai | Trả 400 câu Việt |
| 7 | ⚪ (luật 25) | `src/components/ai/ThongKeAI.tsx:191,228` `hover:bg-white/5` | Màu viết tay, không từ biến gốc | `color-mix` từ `--text` hoặc token sẵn |
| 8 | ⚪ (T10/luật 18) | `ThongKeAI.tsx:155` · `TaiKhoanClaudeCuaToi.tsx:67,131` · `KetNoiAI.tsx` dòng "hết hạn mức" `text-red` | Câu lỗi + "hết hạn mức" dùng đỏ theo nếp hộp báo nhanh; T10 nói ngừng = vàng, đỏ dành cho Issue. Đồ hoạ ngừng đã vàng ✓ | Ghi nhận nếp cũ; Mr. Đại quyết câu lỗi được đỏ không |
| 9 | ⚪ (N6 đúng) | `tai-khoan-claude.ts` `ghiMa` `mode: 0o600` | Windows bỏ qua; mã nằm `~/.sci-cong-viec/claude-tk/…` quyền mặc định | Ghi chú đủ, không sửa |
| 10 | ⚪ | `so-dung-ai.ts` `docLuot` + `providers.ts` `ghiDoThoiGian` | Sổ cũ `ai-do-thoi-gian.jsonl` vẫn ghi song song mỗi lượt (N11): không đếm đôi (chỉ đọc sổ cũ trước dòng đầu sổ mới — đo: tuần 28/09–04/10 = 393 lượt · 5.260.475 token vào, đúng số dòng sổ cũ), nhưng đĩa ghi gấp đôi | Dừng ghi sổ cũ sau khi sổ mới ổn định |

## Đã đo được (đúng)

| Việc | Số đo |
|---|---|
| `tsc --noEmit` | 0 lỗi |
| `vitest run --maxWorkers=2` | 937 đạt · 0 hỏng · 12 bỏ qua; 0 lượt Claude CLI thật (673 tệp sổ phiên CLI trước = sau) |
| Quyền | `/api/ai/thong-ke` quản trị 200 · người thường **403** "Chỉ người sửa được cài đặt…"; `/tai-khoan-claude` 200/200; `/cai-dat` 200/200; `/api/ai/tai-khoan` 200/200; `/api/ai/tai-khoan-ca-nhan` 200/200; người thường `dan_ma` → 403 câu Việt; `so: 3` → 400 "Chọn tài khoản 1 hoặc 2" |
| Thống kê | Ngày 24 múi · Tuần 7 múi "Tuần · 7 ngày · 28/09/2026 – 04/10/2026" (thứ Hai ✓, luật 31 ✓) · Tháng 31 múi "Tháng 10/2026 · 31 ngày · 01/10/2026 – 31/10/2026"; sổ cũ hiện "Chưa ghi người / tính năng (sổ cũ trước 04/10)" ✓ luật 30 |
| Mã giả đúng dạng (`sk-ant-oat01-` + 70 A) | Cá nhân (quản trị): 5,5 s → "Mã không đúng, đã hết hạn hoặc đã bị thu hồi…" `ok:false`; TK2 công ty: 5,4 s → cùng câu. **Không lưu**: `~/.sci-cong-viec/claude-tk/ca-nhan` không tạo, `tk2/` vẫn rỗng; thư mục tạm `sci-thu-ma-*` 0 còn sót. Sổ ghi 2 dòng `lib/ai/thu-ma` · `ket_qua: loi` · **0 token** — **đã xoá đúng 2 dòng của tôi**, file về trạng thái không có như trước |
| Mã sai dạng | 400 "Mã không đúng dạng. Mã của lệnh claude setup-token bắt đầu bằng sk-ant-oat01-…" ở cả 2 API |
| Nhãn tính năng (T6) | 22 chỗ `runAIGan(` + 1 `voiTinhNang(` (mồi phiên); 0 chỗ `runAI(` trần ngoài providers; 21 nhãn phân biệt đều có tên trong `TEN_TINH_NANG`; 2 mục từ điển không có chỗ gọi (`app/api/ai/test/route`, `lib/ai/thu-ma` — thu-ma gắn thẳng trong `thuMaDangNhap`, hợp lệ) |
| Token màu (luật 11) | `accent · blue · green · yellow · red · text-muted` đều có trong `tailwind.config.ts` |
| N4 | Code: `luuMaCongTy` xoá `.credentials.json`; nhánh login xoá mã khi MỞ cửa sổ. Hiện tk1/tk2 đều rỗng nên không có ca "cả hai" |
| N5 | GET không chứa `sk-ant-oat`; lịch sử chỉ `duoi_ma`; mã đi qua biến môi trường, không vào dòng lệnh |
| N8 | Đọc code: `UNKNOWN_FLAG_RE`/`MODEL_LA_RE` vẫn soát trên `detail` (= `result` của JSON nếu có) rồi mới trả stdout — hai nhánh thử lại còn nguyên |

## Đối chốt T1–T13

| Chốt | Kết quả |
|---|---|
| T1 · T2 nhân bản 4 agent | Ngoài phạm vi đêm nay (Đợt 2) — đúng T5 |
| T3 dán mã | Đủ (`CLAUDE_CODE_OAUTH_TOKEN`, thử bằng câu thật) |
| T4 Thống kê | Đủ: Ngày/Tuần/Tháng + chọn ngày · ① token chồng theo tài khoản · ② phút chạy/ngừng · bảng giờ/ngày, bấm cột mở ngày · top-5 người + tính năng |
| T5 | Đủ |
| T6 | Đủ (22 chỗ) |
| T7 | **Một phần** — xem #2, #3, #4 |
| T8 · T9 | Đủ (menu `KhungPhong.tsx:303`; giữ cả cửa sổ + dán mã) |
| T10 | Đủ ở đồ hoạ; câu lỗi đỏ theo nếp cũ (#8) |
| T11 13 tháng | Đủ (`mocGiuSo`, `donSoMoiNgay`) — N12 chỉ đọc code: cửa sổ mất dòng giữa đọc và đổi tên là mili-giây, 1 lần/ngày |
| T12 | Đủ (acf14f4) |
| T13 | Tiếng Việt mọi câu đo được ✓ · luật 28 ✓ (chú giải là ô màu + chữ trần) · luật 30 ✓ · luật 31 ✓ · luật 11 ✓ · luật 25 ✗ nhẹ (#7) |

## Chưa kiểm được
N10 biên 00:00–07:00 chỉ đọc code (`GIO_VN` cố định +7, `cacMui` dùng UTC) · N13 (30 MB đọc mỗi lần mở) chưa đo thời gian · chưa thử mã THẬT (không được phép).

## Mr. Đại đã chốt (sáng 04/10, trả lời phiên kiểm)
1. #2 — Góp ý + luật AI chạy sau khi nộp **là việc của người nộp**: người đã nối tài khoản cá nhân thì dùng khi công ty hết. Giữ code; đổi tên tính năng cho khỏi gây hiểu là "chạy nền".
2. #3 — Tài khoản công ty bị 401 → **tự chuyển** sang tài khoản còn lại rồi cá nhân, báo chuông quản trị.
3. #8 — câu báo lỗi **KHÔNG ĐỎ** (đỏ chỉ dành cho Issue, luật 18); lỗi và nhãn "hết hạn mức"/"ngừng" dùng vàng. Áp mọi agent — đã nhắn phiên Sửa giao diện ghi GIAO-DIEN-CHUNG.
