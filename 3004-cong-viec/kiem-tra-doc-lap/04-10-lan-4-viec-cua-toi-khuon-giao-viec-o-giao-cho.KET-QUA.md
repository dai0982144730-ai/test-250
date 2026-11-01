# KẾT QUẢ KIỂM ĐỘC LẬP — lần 4 agent Công việc (04/10/2026 tối, 22:10 – 23:05)

Đề: `04-10-lan-4-viec-cua-toi-khuon-giao-viec-o-giao-cho.md` (51 commit ở 5 bộ). Phiên kiểm: "0 Kiểm tra độc lập". Chỉ đọc và đo, không sửa code/MD, không commit.

## 1. Kết luận một dòng

**ĐẠT có điều kiện — 0 🔴 · 5 🟡 · 9 ⚪.** Quyền, phạm vi giao, chặn hạn đã qua, luật thời điểm Tiến độ đều đo đúng trên dữ liệu thật; 5 chỗ vàng là test hỏng do chính sửa đổi, `npm test` Pháp lý đứt chuỗi từ 18:45, 3 việc hạn quá khứ đã lọt vào sổ trước lúc chặn, 8 ô `type="date"` còn sót ở 3004, trợ lý Main còn tự xưng đi hỏi Base.vn.

## 2. Bảng chốt C1–C13

| # | Chốt | Kết quả | Bằng chứng |
|---|---|---|---|
| C1 | Duyệt tại chỗ | **Đạt** | `src/lib/cay-viec/nhan-tu-agent.ts` — khoá nội bộ + `nguoi_bam` phải active và có `cong_viec.giao`, whitelist 4 agent, ghi `ghiLuotNhan`; `middleware.ts:32` chừa `api/cay-viec/soan-giao`. Pháp lý gửi qua `lib/hoi-base.ts:158` `goiCuaGiaoTho` (không export) |
| C2 | Việc của tôi thu gọn, bỏ Base.vn | **Đạt theo code, còn 1 vết chữ** | grep 5 bộ: 0 `noi-lam-viec` · `GhimNoi` · `PanelChiTiet` · `/api/viec/ghim` · `/api/viec/chi-tiet`; còn `4-agent-main/src/lib/ai/chat-agent.ts:207` prompt "ĐI HỎI 4 agent … Base.vn" (⚪9) |
| C3 | Việc của tôi hai nửa | **Chưa kiểm bằng mắt** | chỉ đọc code; không có trong danh mục đo mục 6 |
| C4 | Khuôn giao việc chung | **Đạt** | `FormGiaoCongViec.tsx` · `PopupViecCV.tsx` 3 bộ Main=TĐ=HĐ 0 dòng khác (luật 7); Pháp lý `TheViecChoDuyet.tsx` + `OChonNoiNhan.tsx`; `OGiaoChoCongViec.tsx` đã xoá, 0 import mồ côi |
| C5 | Chữ "Agent Base" → "agent Công việc", giữ mã `base` | **Đạt (còn 1 chú thích + 1 prompt)** | `/api/mcp/base` còn; chữ ra màn 0 "Agent Base"; `CaiDatHopDongView.tsx:334` chỉ là chú thích code; prompt Main ⚪9 |
| C6 | Từ điển ngữ cảnh, trần 20.000 | **Đạt** | TĐ `src/lib/tu-dien-ngu-canh.ts:116` `tuDien.slice(0, 20_000)` (cắt thô — ⚪6) |
| C7 | Cây việc chỉ việc lá, cửa sổ 7 ngày | **Đạt theo code** | diff `893e0bd` `PhaiCayViec.tsx` ẩn khối giao khi `!toiLuc`; `PhaiCayViec.tsx:317,476` nút Giao mờ khi hạn qua |
| C8 | Ô Giao cho bản gọn, chỉ hiện nơi giao được | **Đạt — đo sống 8 người** | bảng mục 3b; khách `noi-nhan-thuan.ts:70-72` và máy chủ `dich-vu.ts:248-279` dùng CÙNG hai điều kiện (cùng đơn vị với người bấm ∧ đơn vị trong phạm vi) |
| C9 | Khối giao dưới thẻ Issue | **Đạt** | `IssueView.tsx:325` một khối/thẻ; `PhaiIssue.tsx` chỉ còn `KhungSuaGiao` (khu phải); sổ issue 3004 chưa có thẻ nào bấm "không cần giao" (0 `khongCanGiao` trong `data/cay-viec/issue/*.json`) |
| C10 | Không gửi việc hạn đã qua, 5 agent | **Đạt về code · 🟡1 test hỏng · 🟡3 dữ liệu cũ** | 3004 `dich-vu.ts:1122` chặn mọi đường (agent gửi sang không mang `tu_tai_lieu`/`cong_viec_id`); Main/TĐ/HĐ `giaoSangCongViec` chặn trước `fetch`; Pháp lý `TheViecChoDuyet.tsx:74,161` theo giờ VN |
| C11 | Luật thời điểm | **Đạt — đo sống** | TĐ `moc-hop-dong.ts:202-203` `khoiCong = actualStartCalc ?? start`, ẩn khi còn > 7 ngày; sổ HV sau lần chạy 22:29 không sinh thẻ dự báo mới; thẻ cũ ISS-2026-39-107 (7.5.1 Thi công tiếp địa, mở 24/09) đang hạ bậc `cho-on-dinh`, lần chạy tới tự đóng (`so-issue.ts:147-149`) |
| C12 | Tắt tự kéo danh bạ | **Đạt** | `TU_KEO_DANH_BA_BASE=false` 3 bộ; Quan sát 32f7e0b đã gỡ `quetToanCongTy`, POST danh-ba trả 410 |
| C13 | Luật chung | **Một phần — 🟡4** | 29 ✓ (fetch chỉ trong `…Tho`) · 7 ✓ · 10 ✓ (`noi-nhan-thuan.ts` 0 import, `viec-cong-viec-kieu.ts` chỉ import type) · 28 ✓ (0 `<span rounded+border/bg>` ở 8 tệp đổi) · 17 ✓ · tiếng Việt ✓ · **ngày dd/mm/yyyy ✗ 8 ô `type="date"` ở 3004** |

## 3. Số đo

### 3a. tsc + test

| Bộ | tsc | Test | Ghi chú |
|---|---|---|---|
| Main 3010 | 0 lỗi | 761 đạt · **3 hỏng cũ** (`man-cua-main` menu) · 2 bỏ | hỏng cũ như lần 3 |
| Tiến độ 3003 | 0 lỗi | 928/928 | — |
| Hợp đồng 3012 | 0 lỗi | 698 đạt · **1 hỏng cũ** (`nhan-dien-agent` menu) · 23 bỏ | hỏng cũ |
| Pháp lý 3013 | 0 lỗi | 16/44 kịch bản chạy, đều đạt · **28 kịch bản KHÔNG CHẠY** | 🟡2 — chuỗi `npm test` đứt ở `test-tach-credential.ts` |
| Công việc 3004 | 0 lỗi | 957 đạt · **2 hỏng MỚI** · 19 bỏ | 🟡1 — `so-cai-dich-vu.test.ts` |

Lượt gọi Claude thật từ test: **0**. Trong cửa sổ test có 1 lượt CLI thật lúc 22:23:55 nhưng là Main bảng điều hành (`data/ai-so-dung.jsonl`: `lib/bang-dieu-hanh/tom-tat-ai`, người `quantri@scigroup.vn`, sonnet-4-5, 10,6 s) — do người mở trang Main, không phải test.

### 3b. C8 đo sống `GET 3004/api/phong/noi-nhan` (cookie ký thử, bản sao pgdata 22:21)

| Người bấm | Vai trò | Ban lãnh đạo | Đơn vị (cây) | Cá nhân (@) | Tính tay | Khớp |
|---|---|---|---|---|---|---|
| PTGĐ Đại (PM) | lanh-dao + truong | 7 | 25 | 52 | tat_ca: 8 chức danh − 1 trợ lý = 7 · 34 − 1 Ban TGĐ − 8 chức danh = 25 · 52 active | ✓ |
| TGĐ | lanh-dao | 7 | 25 | 52 | như trên | ✓ |
| Quản trị | quan-tri | 7 | 25 | 52 | như trên | ✓ |
| Trưởng P.CĐ | truong | 0 | 1 (p-cd) | 7 | P.CĐ không có con; 7 người P.CĐ | ✓ |
| GĐ SCI PMC | truong | 0 | 1 (sci-pmc) | 13 | 13 người PMC (11 chính + 2 kiêm nhiệm) | ✓ |
| Trưởng BQLDA QT | truong | 0 | 4 (bqlda-qt + 3 BĐH) | 6 | 4 người QT + 2 kiêm nhiệm | ✓ |
| Trưởng P.KT&VH | truong | 0 | 8 (p-ktvh + 7 NM) | 4 | 3 người phòng + chính mình kiêm nhiệm QT | ✓ |
| Phó phòng ĐT&PC | **vai trò rỗng** | 0 | 14 (p-dtpc + toàn nhánh) | 10 | được `uy_quyen_truong` của p-dtpc → `phien.ts:66-68` cấp vai trưởng tự động (thiết kế Trưởng chính 03/10) | ✓ (⚪7) |
| NV P.CĐ | nhan-vien | 403 "Bạn không có quyền giao việc" | | | | ✓ |

Main `GET 3010/api/viec/nguoi-nhan` (dainc): 52 cá nhân · 7 lãnh đạo · 25 đơn vị — danh sách theo NGƯỜI BẤM, không theo tài khoản dịch vụ ✓.

### 3c. Trang nhúng `/nhung/viec/CV-2026-0132`

| Ca | Kết quả |
|---|---|
| Không cookie | 307 → `/login?tiep=/nhung/viec/CV-2026-0132` ✓ |
| Cookie đổi 1 ký tự chữ ký (giữa) / đổi payload / đổi ký tự cuối | 307 login ✓ (3 API phía sau đều 401) |
| Cookie người không liên quan (NV P.CĐ) | 200 — thấy việc; `/api/so-cai` chỉ kiểm `so_cai.xem` (sổ cái toàn công ty, `api/so-cai/route.ts:16`) — đúng thiết kế sổ cái công khai nội bộ (⚪1) |
| Mã không tồn tại | 200 vỏ trang "Đang mở việc CV-9999-9999 …" — không có câu "không tìm thấy" (⚪1) |
| Header | không `Content-Security-Policy frame-ancestors`, không `X-Frame-Options` → trang lạ nhúng được (⚪1); cookie `sameSite: "lax"` (`api/auth/login/route.ts:22`) — cùng site localhost/scigroup.vn nên khung khác cổng vẫn gửi cookie ✓ |

### 3d. Sổ cái 3004 — việc tạo 04/10 (bản sao 22:21)

| Mã | Tên | Giao bởi | Lúc (VN) | Hạn |
|---|---|---|---|---|
| CV-2026-0124 | [HV test] Xử lý 6.1.4 Cung cấp Hub, Nacelle, Blade | quantri | 12:23 | 26/04/2027 |
| CV-2026-0126 | [HV test] Xử lý 6.1 Hợp đồng cung cấp turbine | quantri | 12:33 | 27/04/2027 |
| CV-2026-0128 | [HV test] Bổ sung khối lượng thiết kế WBS 1.1.4 | ptgd.dai | 12:53 | 08/10/2026 |
| **CV-2026-0129** | [Nậm săm 3A] Làm hồ sơ pháp lý N3A-AI-05 Văn bản chấp thuận chuyển mục đích sử dụng đất | ptgd.dai | 13:40 | **05/11/2024** |
| **CV-2026-0130** | [HV test] Làm hồ sơ pháp lý HV-09-01 Hợp đồng tín dụng | ptgd.dai | 13:41 | **09/02/2026** |
| CV-2026-0132 | Khởi công 6.1.4 Cung cấp Hub, Nacelle, Blade (trễ 27 ngày, kéo 20 việc) | ptgd.dai | 15:06 | 14/10/2026 |
| **CV-2026-0133** | [HV test] Làm hồ sơ pháp lý HV-01-01 Văn bản chấp thuận khảo sát cột đo gió | ptgd.dai | 16:24 | **21/03/2026** |

Không việc nào tên "test"/người tạo "Phiên thử"; không `khongCanGiao` nào trên issue thật → lượt đo lần 3 của phiên gửi không để lại vết ghi (T2 sạch). Nhưng 3 việc đậm có **hạn trong quá khứ**, tạo 13:40–16:24, TRƯỚC commit chặn `ea141f0` 19:33 — đều từ Pháp lý gửi sang (🟡3).

## 4. Phát hiện — nặng → nhẹ

| # | Mức | Mô tả | Bằng chứng | Kịch bản | Đề xuất (không tự sửa) |
|---|---|---|---|---|---|
| 🟡1 | Vừa | **2 bài test 3004 hỏng do chính C10**: test dùng hạn cố định 31/07/2026 và 15/08/2026 → từ 04/10 `giaoViec` ném "Hạn … đã qua". Commit `ea141f0` không đụng test | `tests/unit/so-cai-dich-vu.test.ts:279,324`; `test8-3004.txt` 2 hỏng | Ai chạy vitest 3004 từ nay thấy đỏ, tưởng app hỏng | Đổi hạn trong test thành ngày tương lai tính từ hôm nay (vd `homNayVN()+30`), hoặc truyền `tu_tai_lieu` nếu ca đó là việc từ văn bản |
| 🟡2 | Vừa | **`npm test` Pháp lý đứt chuỗi** từ commit `831a7c7` 18:45 (Token AI Đợt 2 xoá `scripts/test-tach-credential.ts` nhưng `package.json:12` vẫn gọi) → 28 kịch bản sau nó (cổng MCP, quyền 4 loại, sổ issue, nhắc trước hạn…) KHÔNG CHẠY; màn hình vẫn in "TẤT CẢ ĐẠT" cho 16 bài đầu nên dễ tưởng xong | `test8-phaply.txt:848` `ERR_MODULE_NOT_FOUND`; `grep -o "tsx scripts/test-" package.json` sau tên đó = 28 | Mọi lần kiểm Pháp lý từ 18:45 chỉ chạy 16/44 | Phiên Pháp lý bỏ tên khỏi `package.json` (hoặc khôi phục file); báo lại số 44/44 |
| 🟡3 | Vừa | **3 việc hạn quá khứ đang mở trong sổ cái** (CV-0129 hạn 05/11/2024 · CV-0130 09/02/2026 · CV-0133 21/03/2026) — gửi từ Pháp lý trước lúc chặn | bảng 3d; `so_cai.ket_thuc` | Người nhận thấy việc "quá hạn 2 năm" ngay khi mở; Pháp lý/Tiến độ tính trễ sai | **Cần Mr. Đại quyết**: xoá 3 việc hay sửa hạn; phiên Công việc thực hiện |
| 🟡4 | Vừa | **8 ô `type="date"` còn ở 3004** — trái C13 (ngày dd/mm/yyyy, `ONhapNgay`); 2 ô nằm trong hộp giao việc màn Dự án mà C8 vừa sửa | `SoDoPhong.tsx:775,779` (blame 29/09) · `issue/PhaiIssue.tsx:393` (03/10) · `BangDuyetViec.tsx:312` · `BuocSuaLoi.tsx:176` · `ViecAiNgoaiBang.tsx:65` · `TraCuuLichSu.tsx:150,154` · `ThongKeAI.tsx:189` | Trình duyệt hiện mm/dd/yyyy theo máy | Thay bằng `ONhapNgay`; riêng `ThongKeAI.tsx` là tệp Quan sát đang sửa (uncommitted) |
| 🟡5 | Vừa | **Thẻ Tiến độ bị luật mới ẩn vẫn hiện thêm 3 lần chạy** — `hoaVaoSo` hạ bậc `dang-vi-pham → het-vi-pham → cho-on-dinh → da-dong` mỗi lần một bậc, không có nhánh "ẩn vì chưa tới lúc" | `so-issue.ts:139-149`; ISS-2026-39-107 7.5.1 còn `cho-on-dinh` lúc 22:29 | Mr. Đại mở Cảnh báo HV thấy thẻ "Quá hạn hợp đồng 62 ngày — 7.5.1" dù C11 nói ẩn hẳn; 7.5.1 còn ~151 ngày mới khởi công | Hoặc chấp nhận 3 đêm tự đóng (ghi rõ), hoặc thẻ `hop-dong`/`giay-phep` chưa tới lúc thì `dongMay` ngay như ca `doiDinhNghia` |
| ⚪1 | Nhẹ | Trang nhúng: ai đăng nhập có `so_cai.xem` đều xem được mọi mã; mã lạ hiện vỏ "Đang mở việc…" mãi; không `frame-ancestors` | mục 3c | — | Thêm câu "Không tìm thấy việc"; `frame-ancestors` 4 cổng agent nếu muốn chặn trang lạ |
| ⚪2 | Nhẹ | `maViecDaGiao` chống trùng chỉ bằng regex `CV-\d{4}-\d+` trong `ghiNhan` của issue nguồn; máy chủ 3004 không có khoá chống trùng theo (dự án, WBS, nguồn) — `nguon_cong_viec` chỉ dùng cho báo cáo tuần | `KhoiViecIssue.tsx:55`; grep `nhan-tu-agent.ts`/`soan-giao` 0 "trùng" | Tạo việc xong, ghi "Đã giao" vào issue nguồn hỏng → bấm lại = 2 việc | Khoá mềm phía 3004: cùng `du_an + ma_wbs + agent_goi` đang mở thì trả mã cũ |
| ⚪3 | Nhẹ | AI chọn người cho issue găng gọi **mỗi lần mở trang** (Set theo mount, không lưu) — đúng nghi 9; kết quả có bó `giaoDuoc` | `KhoiViecIssue.tsx:112-135` | Mỗi lần mở Issue HV tốn N lượt AI | Lưu đề xuất vào sổ issue (`deXuatAi`) hoặc cache theo ngày |
| ⚪4 | Nhẹ | Cổng 3003 chạy từ 14:26, chưa khởi động lại sau `2a86036` 19:51 — lần chạy 22:29 là người bấm tay (sổ ghi `duong: "tay"`), đã dùng code mới; **vòng nền hẹn giờ đêm** vẫn là code cũ | `hen-gio-nhat-ky.jsonl`; tiến trình node 3003 CreationDate 14:26:48 | Đêm nay bộ sinh issue có thể lại sinh thẻ 7.5.1 | Khởi động lại 3003 (bộ nhớ `khoi-dong-lai-khi-sua-code-hen-gio`) |
| ⚪5 | Nhẹ | `NGAY_XIN_GIA_HAN = 30` (giấy phép) là số phiên gửi tự đặt | `han-giay-phep.ts` | — | Mr. Đại chốt số |
| ⚪6 | Nhẹ | Trần từ điển `slice(0, 20_000)` cắt giữa câu; hiện 16.952 < trần nên chưa ảnh hưởng | `tu-dien-ngu-canh.ts:116` | Sơ đồ lớn thêm → mục cuối đứt | Cắt theo ranh mục khi vượt trần |
| ⚪7 | Nhẹ | Phó phòng được `uy_quyen_truong` có đủ quyền trưởng dù `gan_vai_tro` rỗng (phien.ts:66-68) — đúng thiết kế Trưởng chính nhưng màn Quản trị → Người dùng hiện "vai trò: (trống)" | `/api/quan-tri/nguoi-dung`: truong.dtpc `vai_tro: []` | Admin nhìn bảng tưởng người này không có quyền | Hiện nhãn "uỷ quyền trưởng P.ĐT&PC" ở cột vai trò |
| ⚪8 | Nhẹ | Sổ 3004 còn 10 dòng cũ tên công cụ có "/" (trước 12:38); sau `b6ff39c` 0/1.133 dòng mới — thống kê Quan sát theo tên tách đôi 10 dòng | `data/nhat-ky-hoi-agent.jsonl` | — | Bỏ qua hoặc gộp khi thống kê |
| ⚪9 | Nhẹ | Prompt trợ lý Main còn "ĐI HỎI 4 agent (Tiến độ · Hợp đồng · Pháp lý · **Base.vn**)" | `chat-agent.ts:207` | 🤖 trả lời "tôi đã hỏi Base.vn" | Đổi thành "Công việc" |

## 5. Trả lời 14 điểm nghi

| # | Kết luận |
|---|---|
| 1 | **Không lỗi.** `nhan-tu-agent.ts` gọi `giaoViec` không mang `tu_tai_lieu`/`cong_viec_id` → bị chặn như mọi đường. Lọt 3 việc là vì tạo TRƯỚC 19:33 (🟡3) |
| 2 | **Không lỗi.** Pháp lý `TheViecChoDuyet.tsx:74,153` dùng `toLocaleDateString("sv-SE",{timeZone:"Asia/Ho_Chi_Minh"})`; 3004 `PhaiCayViec.tsx:317` cùng `homNay` VN; máy chủ `homNayVN()`/`homNayIso()` — không lệch ca 00:00–07:00 |
| 3 | **Khớp.** Hai điều kiện ở khách (`noi-nhan-thuan.ts:70-72`) đúng bằng hai điều kiện máy chủ (`dich-vu.ts:264,272`), kể cả kiêm nhiệm (`don_vi_ids` gồm kiêm nhiệm cả hai bên). Đo sống 8 người đều khớp tính tay (3b). Main/TĐ/HĐ lấy theo người bấm. Chưa chạy bài test tạm gọi `batBuocTrongPhamVi` (không export) — chứng minh bằng đọc code + đếm sống |
| 4 | **Không lỗi.** Ban lãnh đạo là đơn vị chức danh `bld-*` → `phu_trach_loai: "don_vi"`; sổ thật đã có dòng (CV-2026-0132 phối hợp `bld-ptgd-dai`) |
| 5 | **Đúng nghi, mức nhẹ** (⚪2): không khoá chống trùng phía máy chủ |
| 6 | Xem 3c: cookie sai/thiếu đều về login; người có `so_cai.xem` xem được mọi mã (thiết kế sổ cái); không chặn trang lạ nhúng; SameSite lax đủ cho cùng site (⚪1) |
| 7 | **Đúng thiết kế agent tin nhau** — chỉ khoá nội bộ; email truyền vào không kiểm. Để Mr. Đại biết, không coi là lỗi |
| 8 | `middleware.ts:32` chừa `api/cay-viec/soan-giao` và `api/viec/danh-ba`; "đã duyệt ở agent X" là bên gửi tự khai, 3004 chỉ kiểm `nguoi_bam` active có `cong_viec.giao`. Lối gửi không qua người = ai cầm khoá nội bộ. Đúng thiết kế, nêu để biết |
| 9 | **Đúng nghi** (⚪3): gọi lại mỗi lần mở; không lưu; có bó phạm vi `giaoDuoc` |
| 10 | `actualStartCalc ?? start` hợp lý: đã khởi công thực tế = đã tới lúc. `NGAY_XIN_GIA_HAN = 30` → Mr. Đại quyết (⚪5) |
| 11 | Cắt thô `slice(0, 20_000)` (⚪6); chèn mỗi lượt chat |
| 12 | 10 dòng cũ tách đôi (⚪8), không phát sinh thêm |
| 13 | **Không lỗi** — `TheViecChoDuyet.tsx` dùng `ONhapNgay`, 0 `type="date"` |
| 14 | **Đúng luật** — test `tren-base-giay-phep` đổi ngày mong đợi theo ngưỡng 7 ngày/30 ngày mới, có ghi lý do trong test |

## 6. Hướng bỏ — rác

0 ở 5 bộ cho `@@` · `do-ten-trong-chu` · `doTenTrongChu` · `lienQuan` nhánh sống · "đưa thành việc từ" · `KhoiSoanViec` ở `PhaiIssue.tsx`. Còn chú thích cũ "Ô 2 trong 1" ở `FormGiaoCongViec.tsx:146` Main/HĐ và `OGiaoSua.tsx:5` (chữ trong code, không ra màn). T4: `do-ten-trong-chu.ts` 4 bộ bị cuốn vào commit Quan sát `c8b78fd`/`5144f7b`/`bfd72b3`/`7c74d5f` — đúng như phiên gửi nói; cây làm việc Main/TĐ/HĐ còn tệp uncommitted của phiên Quan sát (`tai-khoan-ca-nhan/route.ts`, `api/viec/danh-ba/route.ts`, `TaiKhoanClaudeCuaToi.tsx`, `ThongKeAI.tsx`) + HĐ `NhaThauView.tsx`, `sinh-phieu-gia-tac.ts`; Pháp lý `lich-ho-so/page.tsx` — không phải của phiên gửi.

## 7. Đã kiểm · chưa kiểm · cần Mr. Đại quyết

**Đã kiểm xong:** tsc 5 bộ · test 5 bộ · C8 sống 8 người + Main · C10 code 5 bộ · C11 sống HV · trang nhúng 5 ca · luật 29/7/10/28/17 · rác hướng bỏ · T1–T5 · 14 nghi.

**Chưa kiểm được:** C3 và C7 bằng mắt (chỉ đọc code); bài test tạm gọi `batBuocTrongPhamVi` (hàm không export — thay bằng đọc đối chiếu + đếm sống); vòng nền hẹn giờ 3003 đêm nay (chỉ biết sau 02:00).

**Cần Mr. Đại quyết:**
1. 3 việc hạn quá khứ CV-2026-0129 · 0130 · 0133 — xoá hay sửa hạn (🟡3).
2. Thẻ Tiến độ bị luật C11 ẩn: chấp nhận 3 đêm tự đóng, hay đóng ngay (🟡5).
3. `NGAY_XIN_GIA_HAN = 30` ngày cho giấy phép (⚪5).
4. `base.viec_cua_toi` và duyệt tại chỗ tin email agent truyền vào — giữ "agent tin nhau" hay buộc kiểm (nghi 7, 8).

**Ngoài phạm vi, ghi sẵn cho lần 5 (tổng thể):** ⚪2 (một việc hai bản khi ghi "Đã giao" hỏng) · ⚪3 (AI gọi lặp) · 🟡3 (3 việc quá hạn từ ngày sinh — đúng ca "không có việc chưa tới lúc/đã quá lúc đã vội mở") · 🟡5 (thẻ ẩn còn hiện 3 đêm = "việc chưa tới lúc hiện thành rác").
