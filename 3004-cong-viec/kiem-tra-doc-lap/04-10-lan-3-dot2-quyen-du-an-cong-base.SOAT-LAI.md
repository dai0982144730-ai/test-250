# SOÁT LẠI KẾT QUẢ KIỂM ĐỘC LẬP LẦN 3 — phiên "2 Agent Công việc", 04/10/2026 ~02:00–02:40

> Đọc `04-10-lan-3-dot2-quyen-du-an-cong-base.KET-QUA.md` rồi đo lại từng điểm. Mr. Đại ngủ, dặn: chắc chắn sai thì sửa, cần quyết thì gom cuối phiên.

## Từng phát hiện

| # | Phiên kiểm nói | Em đo lại | Xử lý | Commit |
|---|---|---|---|---|
| 1 | Báo cáo sáng ghi "chưa hỏi được" 13 dự án | **Đúng cơ chế.** Đo thêm: bộ sinh issue KHÔNG chạy cho dự án chưa có cây WBS (`src/lib/cay-viec/issue/chay.ts`) và chỉ chạy khi mở màn Issue → "chưa có sổ" = **chưa soát**, không phải 0 issue | Sửa câu báo cho rõ ("CHƯA SOÁT, không phải 0 issue"); KHÔNG đổi cách Main xếp loại — ⏸ Mr. Đại chốt nghĩa | 3004 `a6b975f` |
| 2 | Lượt lỗi lặp mỗi lần mở màn Việc sau `d8252c8` | **Đúng** (lỗi do chính em gây ra). Hợp đồng có đoạn code giống Main → cũng dính (sau 21:04 04/10) | Luật mới: `KHONG_CO_DU_LIEU` là câu trả lời thật → `hoiLaiSau` = +24 giờ, `luc` giữ lần kéo thành công; lỗi kết nối thử lại ngay như cũ. Bài test mới 3 ca | Main `6eb8008` · Hợp đồng `ed24e7a` · Tiến độ `9e6307b` · 3004 `d3e37d3` (gắn `ma_loi`) |
| 3 | Tiến độ `doan-anh` thiếu kiểm theo dự án | **Đúng** | Chép dòng kiểm của Hợp đồng `bb7bb92`. Thử sống phiên ký thử nhân viên BQLDA QT: `projectId=nam-khian-1` → 403 câu Việt; `dien-gio-huong-viet…` → 200 | Tiến độ `b1ba821` |
| 4 | Luật 30: mã đơn vị trần | **Đúng, đã sửa trước khi nhận file** (phiên kiểm đo trước lúc commit). `tom-tat-ai.ts:124` và `page.tsx:551,557` đọc từ `gom.ts` nên hết theo | — | Main `4933dde` · Tiến độ `6f2b9a3` |
| 5 | Tiến độ còn mã `10017568`, `hoi-base.ts:106` gửi mã này | **Đúng một nửa.** Mã còn trong tệp, nhưng `maViecBase` chỉ được GHI (`hoi-base.ts:101`), grep cả `src`: không nơi nào đọc; dòng 106 gửi `chon.ma_viec_base` vừa tra được ở lượt đó | Không sửa — dữ liệu thừa vô hại | — |
| 6 | Sổ 3004: 19 lý do hỏng ký tự, 20 lượt giả danh | **Đúng.** Do lệnh thử của em truyền chữ có dấu qua dòng lệnh Git Bash + dùng `agent_goi` thật | Không xoá dòng sổ (sổ chỉ ghi thêm, xoá là mất dữ liệu vĩnh viễn) — đã khai ở hồ sơ nhiệm vụ mục 6; từ nay gửi thân lời gọi bằng tệp UTF-8 + mã lạ có khoá | — |
| 7 | Test `chuan-mau-bao-cao` hỏng vì thư mục bị DỜI | **Đúng — em sai** (trước ghi "bớt tệp"). Thư mục ở `SCI-AI-AGENT/Lưu tạm 6-Agent-cong-viec/` từ 02/10, đủ 34 tệp | Test tìm cả chỗ mới (không dời tệp của Mr. Đại) → **đạt lại 78/78** | 3004 `aa37d16` |
| 8 | Pháp lý CRLF làm phồng số dòng | **Đúng** (chính em tự nghi) | Không sửa: `.gitattributes` đụng cả repo Pháp lý, nhiều phiên đang sửa | — |
| 9 | Main chặn mã lạ dù có khoá | Đúng như mô tả | ⏸ Mr. Đại quyết | — |
| 10 | Cửa danh bạ trả 200 + `ok:false` | Đúng; Tiến độ không đọc mã HTTP | Giữ 200, thêm `ma_loi` (xem #2) | 3004 `d3e37d3` |
| 11 | Tiền tố chữ thường không bỏ | **Đúng** | Biểu thức nhận cả chữ thường; test thêm ca `hv.7.2.3` | 3004 `d3e37d3` |
| 12 | IAD1 gắn P.ĐT&PC làm Ban QLDA | Dữ liệu, không phải code | ⏸ Mr. Đại quyết | — |

## Số sau khi sửa

| Bộ | tsc | Test |
|---|---|---|
| Main | 0 lỗi | 712 đạt · 3 hỏng cũ `man-cua-main` (+3 bài mới) |
| Tiến độ | 0 lỗi | 901 đạt · 1 hỏng cũ `trang-trong-app` |
| Hợp đồng | 0 lỗi | 668 đạt · 1 hỏng cũ `nhan-dien-agent` |
| Công việc | 0 lỗi | `cong-base` 11/11 · `chuan-mau-bao-cao` **đạt** (trước hỏng) |

## Mr. Đại chốt sáng 04/10 (qua phiên kiểm) — đã xử lý

| # | Chốt | Xử lý | Commit |
|---|---|---|---|
| 1 | Dự án chưa có sổ issue giữ nghĩa **"chưa soát"** (a6b975f), không sửa thêm | Ghi vào hướng dẫn AI test 4.9.7 | — |
| 2 | **Tắt hẳn tự kéo** danh bạ `base` ở Main · Tiến độ · Hợp đồng cho tới đợt sửa "Việc của tôi" (không chỉ hẹn 24 giờ) | Công tắc `TU_KEO_DANH_BA_BASE = false`; kéo tay vẫn chạy (nhận câu "tạm đóng"). Thử sống: Tiến độ mốc 47 giờ mở màn Việc không kéo, sổ agent Công việc giữ 889 dòng. Test: Main 713 · Hợp đồng 668 · Tiến độ 901 đạt (chỉ hỏng cũ) | Main `c0acc4b` · Hợp đồng `0d55c5a` · Tiến độ `93fbd70` |
| 9 | Main xử mã lạ như agent con (có khoá nội bộ thì cho qua kèm cảnh báo) | Giao phiên Quan sát (code dùng chung) — phiên này không làm | — |
| 12 | IAD1 gắn P.ĐT&PC đứng đầu là **đúng** | Đóng, ghi hướng dẫn AI test 4.9.8 | — |
