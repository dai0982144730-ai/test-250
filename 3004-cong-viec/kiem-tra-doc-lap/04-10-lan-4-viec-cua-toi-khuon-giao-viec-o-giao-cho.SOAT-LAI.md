# SOÁT LẠI — kiểm độc lập lần 4 (phiên "2 Agent Công việc", 04/10 23:10 → 05/10 00:20)

Kết quả kiểm: `04-10-lan-4-viec-cua-toi-khuon-giao-viec-o-giao-cho.KET-QUA.md` — 0 🔴 · 5 🟡 · 9 ⚪. Từng điểm đo lại trước khi sửa.

## 1. Từng điểm

| # | Kiểm nói | Em đo lại | Làm gì · commit |
|---|---|---|---|
| 🟡1 | 2 bài test 3004 hỏng do chặn hạn đã qua | **Đúng, còn thiếu**: thêm `so-cai-ap-dung-lai.test.ts` hỏng ở bước chuẩn bị (7 ca hiện "bỏ qua", không đỏ). Thêm 7 tệp test có hạn cố định sẽ hỏng dần (`binh-luan` từ 16/10/2026, 35 chỗ ngày cuối 2026 / năm 2027, phần lớn `2026-12-31` hỏng từ 01/01/2027) | Dời hạn sang 2099/2100 ở 9 tệp, giữ nguyên quan hệ trước/sau. 3004: **978 bài — 959 đạt · 19 bỏ qua · 0 hỏng** (trước: 2 hỏng + 7 bỏ qua ngầm) · `a24a890` |
| 🟡2 | `npm test` Pháp lý đứt chuỗi | Đúng — do commit `831a7c7` của phiên Quan sát (Token AI Đợt 2) xoá `scripts/test-tach-credential.ts`; không phải code phiên này | Không sửa; bên kiểm đã nhắn phiên Pháp lý |
| 🟡3 | 3 việc hạn quá khứ CV-2026-0129 · 0130 · 0133 | Đúng — gửi từ Pháp lý 13:40–16:24, trước lúc chặn 19:33 | **Hỏi Mr. Đại** (câu Q1) |
| 🟡4 | 8 ô `type="date"` ở 3004 | **Đếm thiếu**: tìm nhiều dòng thì là **18 ô** (`SoDoPhong.tsx` có 5, không phải 2; `HopGiaoViec.tsx` 2) | Em thay **11 ô** khu giao việc (Sơ đồ/Dự án 5 · Issue 1 · nộp báo cáo 3 · hộp giao việc sổ cái 2) · `a24a890`. Phiên giao diện thay 5 ô (`1293d39`). Còn 1 ô `ThongKeAI.tsx` của phiên Quan sát |
| 🟡5 | Thẻ Tiến độ bị Luật 32 ẩn vẫn hiện thêm 3 lần chạy | Đúng (ISS-2026-39-107 7.5.1 Thi công tiếp địa còn `cho-on-dinh`) | **Tự quyết theo Luật 32** ("ẩn hẳn", anh chốt): thẻ dự báo cũ mà nay chỉ còn vì chưa tới lúc → **đóng ngay** kèm lý do; thẻ hết vi phạm vì lý do khác vẫn hạ bậc như cũ. Bài test mới · `9dd3b25` |
| ⚪1 | Trang nhúng: mã lạ hiện "Đang mở việc…" mãi | **Không lỗi** — curl không chạy JS nên chỉ thấy vỏ trang; nhánh "Không tìm thấy việc … có thể đã bị xoá, hoặc đã xong quá thời hạn lưu" có ở `TheViecNhung.tsx:69` | Không sửa. `frame-ancestors`: không thêm (nội bộ, anh "không sợ lộ code"); xem theo `so_cai.xem` = thiết kế sổ cái công khai nội bộ |
| ⚪2 | Không khoá chống trùng phía máy chủ 3004 | Đúng — và **em tự thấy lỗi cùng gốc**: Tiến độ/Main/Hợp đồng gửi việc luôn kèm `ma_wbs: ""` → CV-2026-0132 (6.1.4) vào sổ không gắn mã. ⚠ Đo lại 00:10: 6.1.4 **đã có** CV-2026-0124 (giao từ Cây việc 12:23, gắn mã) trước khi CV-2026-0132 được giao từ Tiến độ 15:06 → **một việc giao hai lần thật**; issue găng ISS-2026-40-001 đã đóng từ trước nên KHÔNG phải đường giao lần hai như em viết lúc đầu | Sửa phần mã: nháp từ thẻ mang mã WBS + tên đầu việc sang (`9dd3b25` Tiến độ · `61622b5` Hợp đồng · `8ebafae` Main · `a24a890` agent Công việc nhận `ten_wbs`). Khoá chống trùng phía máy chủ → đợt ② cùng Luật 33. Dữ liệu CV-2026-0132 → câu Q3 |
| ⚪3 | AI chọn người cho issue găng chạy lại mỗi lần mở trang | Đúng | Để đợt ⑤ (nháp tính phía máy chủ, lưu kết quả) — đã ghi trong `THIET-KE-VIEC-CHO-DUYET-CHUNG-04-10.md` |
| ⚪4 | Cổng 3003 chưa khởi động lại | Đúng | Khởi động lại 05/10 ~00:00 (tắt tiến trình, bộ gác bật lại); `/` · `/viec-cua-toi` · `/alerts` đều 200 |
| ⚪5 | `NGAY_XIN_GIA_HAN = 30` tự đặt | Đúng | **Hỏi Mr. Đại** (câu Q2) |
| ⚪6 | Từ điển cắt `slice(0, 20_000)` giữa câu | Đúng | Cắt ở ranh mục gần nhất + ghi "bớt N ký tự cuối" (Tiến độ `9dd3b25` · Pháp lý `97b3983`); bài thử tạm đạt rồi xoá |
| ⚪7 | Bảng người dùng hiện "vai trò trống" cho trưởng chính | Đúng | Thêm dòng chữ thuần "Trưởng chính <đơn vị> — đủ quyền trưởng" · `a24a890` |
| ⚪8 | 10 dòng sổ cũ tên công cụ có "/" | Đúng | Để nguyên — luật không xoá dòng sổ |
| ⚪9 | Prompt trợ lý Main còn "Base.vn" | Đúng | Đổi thành "Công việc" · `8ebafae` |
| Nghi 7·8 | Agent tin nhau (email truyền vào, "đã duyệt ở agent X") | Đúng thiết kế | **Hỏi Mr. Đại** (câu Q4), em khuyên giữ |

## 2. Việc khác làm cùng lượt

| Việc | Ghi chú |
|---|---|
| Xoá 16 nháp rác (Main 5 · Tiến độ 5 · Hợp đồng 6) — **anh chọn "xoá hẳn" 04/10 23:00** | Sao lưu trước: `data/viec/viec-ai-soan.truoc-don-04-10.json` ở 3 bộ (không commit) |
| ⚠ **Em xoá nhầm 1 nháp rồi khôi phục ngay** | Nháp `NH-1791130494317` (tài khoản quantri soạn 23:14 cho ISS-2026-36-003 Dừng thi công 4 ngày 7.3.1.3 Lắp đặt trạm biến áp) sinh SAU lúc em đo nên không thuộc 16 nháp anh cho xoá; script lọc theo luật thay vì theo danh sách mã. Khôi phục nguyên văn từ bản sao lưu trong ~1 phút. Bài học: xoá dữ liệu phải lọc theo **danh sách mã đã trình**, không theo điều kiện |
| Hướng dẫn AI test | Thêm 4.9.17 (Luật 32) · 4.9.18 (việc mang mã WBS) · 4.9.19 (không gửi hạn đã qua) |

## 3. Số đo sau sửa

| Bộ | tsc | Test |
|---|---|---|
| Công việc 3004 | 0 lỗi | 959 đạt · 19 bỏ qua · **0 hỏng** |
| Tiến độ | 0 lỗi | 928 đạt · 1 hỏng **không phải của phiên này** (`quyen.test.ts` bắt `src/lib/loai-du-an.ts` — tệp phiên khác đang sửa dở, chưa commit) |
| Hợp đồng | 0 lỗi | 695 đạt · 4 hỏng: 1 cũ (`nhan-dien-agent`) + 3 do cùng tệp `loai-du-an.ts` sửa dở của phiên khác |
| Main | 0 lỗi | 760 đạt · 4 hỏng: 3 cũ (`man-cua-main`) + 1 `quyen.test.ts` (tệp mới `src/lib/loai-du-an.ts` chưa commit của phiên khác) |
| Pháp lý | 0 lỗi | chưa chạy lại — chuỗi `npm test` đứt (🟡2) |

Trang (curl có cookie): 3004 `/so-do` `/du-an` `/cay-viec/issue` `/gui-bao-cao` `/nhung/viec/CV-2026-0132` 200 · Tiến độ `/viec-cua-toi` `/alerts` 200 · Main, Hợp đồng `/viec-cua-toi` 200.

## 4. Mr. Đại đã quyết (05/10 00:08)

| # | Câu hỏi | Em khuyên |
|---|---|---|
| Q1 | 3 việc hạn quá khứ CV-2026-0129 · 0130 · 0133 | **Anh chọn: để nguyên** (người nhận tự gia hạn) |
| Q2 | `NGAY_XIN_GIA_HAN = 30` | **Anh chọn: giữ 30 tạm**, có số thủ tục của Pháp lý thì dùng số đó |
| Q3 | CV-2026-0132 (6.1.4) chưa gắn mã | **Anh chọn: em gắn hộ** → gắn 05/10 00:09 bằng tài khoản Quản trị (`/api/cay-viec/gan-wbs`, lịch sử `gan_wbs`). Nay cây 6.1.4 hiện đủ 2 việc trùng CV-2026-0124 + CV-2026-0132 — giữ việc nào là câu hỏi mới |
| Q4 | Agent tin nhau | **Anh chọn: giữ như hiện nay** |

## 5. Phạm vi lần kiểm 5 (tổng thể — Mr. Đại dặn)

Issue các agent · agent mở việc thế nào · hỏi nhau trước khi mở (Luật 33) · không mở sớm (Luật 32) · không rác · không một việc nhiều nơi · cộng code từ sau `a24a890` (3004) · `9dd3b25` (Tiến độ) · `61622b5` (Hợp đồng) · `8ebafae` (Main) · `97b3983` (Pháp lý).
