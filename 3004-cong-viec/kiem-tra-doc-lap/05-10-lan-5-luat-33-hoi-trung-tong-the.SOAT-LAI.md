# SOÁT LẠI KẾT QUẢ KIỂM LẦN 5 — phiên "2 Agent Công việc" (05/10/2026 ~08:15 – 08:35)

Kết quả: `05-10-lan-5-luat-33-hoi-trung-tong-the.KET-QUA.md` — ĐẠT CÓ ĐIỀU KIỆN (1 🔴 · 4 🟡 · 7 ⚪). Từng điểm đo lại trước khi sửa.

## Điểm sửa

| # | Đo lại | Kết luận | Sửa | Đo sau sửa |
|---|---|---|---|---|
| 🔴1 | `docCauHoiTrung` (`hoi-trung-kieu.ts:88` cũ) chỉ nhận `^\d{4}-\d{2}-\d{2}$`; `hoiTrungCauNoi` đưa `n.han` dd/mm/yyyy nguyên văn. **Bài test cũ `hoi-trung-kieu.test.ts:38` còn khoá đúng cái lỗi** (đòi "05/10/2026" bị từ chối) | Đúng | Khuôn: `chuanHanHoiTrung` nhận yyyy-mm-dd hoặc dd/mm/yyyy → yyyy-mm-dd; bên hỏi (TĐ/HĐ/Main `viec-ai-soan.ts`, `hoi-trung.ts`, PL `viec-cho-duyet.ts`) đổi trước khi gửi. Thêm theo đề xuất phiên kiểm: bên hỏi phân biệt **từ chối** (`KHONG_HIEU_YEU_CAU` · `KHONG_CO_QUYEN` → `"tu_choi"`, không gọi lại) với **không thưa** (`null`, gọi lại theo lịch) | Cổng TĐ nhận `han:"14/10/2026"` → 200, `trung:true`. Test Main 17/17 (thêm 2 ca: dd/mm/yyyy · từ chối gọi 1 lần, im gọi 3 lần) |
| 🟡1 | Không chỉ Main: `tro-ly-web-quyen-xac-nhan.test.ts` ở **cả 3 bộ** (Main · TĐ · HĐ) chạy `tao_viec_base` thật mà không giả phần hỏi | Đúng, rộng hơn kết quả nêu | Giả `@/lib/chung/hoi-trung-hoi` ở 3 tệp | Chạy lại vitest 3 bộ lúc ~08:20 → sổ TĐ + 3004 **0 lượt mới** (lượt cuối 08:07–08:08 là của phiên kiểm) |
| 🟡2 | `runAI(prompt, heThong)` TĐ/HĐ/Main không đặt ngân sách nghĩ; 3004 `runAIGan(…, true)` tắt | Đúng | TĐ `runAI(…, undefined, 0)` · HĐ `runAI(…, undefined, undefined, undefined, 0)` · Main `runAI(…, undefined, { tokenNghi: 0 })` — giữ 15 giây anh chốt, không nâng hạn chờ | Cổng TĐ ca có ứng viên (7.3.1.3): **7,3 giây** (trước: trung vị 15,1 s, một lượt 16,3 s) |
| ⚪1 | 3004 trả lỗi `KHONG_CO_DU_LIEU`, 4 cổng kia im lặng `ok` | Đúng — nhưng **không thống nhất theo 3004** như đề xuất: bên hỏi coi lỗi là không thưa → gọi lại 3 lần cho một câu không bao giờ khác đi | Cả 5 cổng: dự án không theo dõi → `ok` + `khong_ung_vien` + `ly_do` "Agent X không theo dõi dự án mã Y — không có việc nào để so" | tsc 5 bộ sạch (Main chỉ còn 4 lỗi `agent-mat-loc.test.ts` của phiên Quan sát) |
| ⚪2 | `sauKhiHoiNot` không kiểm `daGiao` | Đúng (vô hại) | Bỏ qua nháp đã giao — TĐ/HĐ/Main 2 chỗ mỗi bộ | — |

Commit: Main `4131e27` · TĐ `6bebec9` · HĐ `f618667` · PL `596954f` · 3004 `c2a982c` · CHOT 4.2 `0c494f1` (sửa câu "dự án lạ → KHONG_CO_DU_LIEU" phiên gửi đã ghi sai so với cách làm mới; thêm từ chối + tắt nghĩ).

Test sau sửa: TĐ 941/941 · HĐ 717 đạt + 1 hỏng cũ (menu) · Main 797 đạt + 3 hỏng cũ (menu) · PL `test-hoi-trung-dem` 8/8.

## Điểm không sửa — lý do

| # | Lý do |
|---|---|
| 🟡3 (TĐ) | `NH-1791096956784` — nháp 6.1.4 cùng thẻ ISS-2026-39-140 với nháp đã giao CV-2026-0132. Anh chốt 04/10 23:00 khi xoá 16 nháp rác: **giữ nháp 6.1.4 làm ca chạy lại qua Luật 33** — không nằm trong danh sách xoá. Đang ẩn ở mọi màn và bị loại khỏi so trùng. Xử lý cùng lúc anh chọn huỷ CV-2026-0124 hay CV-2026-0132 |
| 🟡3 (PL) | 10 nháp hạn đã qua — cần anh chọn cách (câu 3 dưới) |
| 🟡4 | Đúng: Main chưa có lượt hỏi thật đi ra (3 lượt cũ là vitest, nay đã chặn). Code đi `hoiAgent → goiCoGhi` (luật 29). Tạo lượt thật phải qua trợ lý chat Main (gọi AI thật) — để lần dùng thật đầu tiên rồi soát sổ hai đầu |
| ⚪3 · ⚪4 · C4 | Cần anh quyết (dưới) |
| ⚪5 | Tệp của phiên Quan sát — báo anh |
| ⚪6 | Đo lại sau |
| ⚪7 | Đã tự khai ở đề — đợt sau |

## Câu hỏi cho Mr. Đại (giữ nguyên 4 câu phiên kiểm nêu)

1. Hai người **cùng một agent** cùng bấm "AI soạn việc giao" trên cùng thẻ → hiện ra 2 nháp. Có chặn không?
2. Pháp lý hỏi lại bản ghi trùng **mỗi đêm** (mỗi bản ghi có ứng viên tốn 1 lượt AI ở bên kia/đêm): giữ, hay chỉ hỏi lại khi việc bên kia đổi trạng thái?
3. 10 nháp Pháp lý **hạn đã qua** (không gửi được tới khi chọn hạn mới): lượt đêm tự dời hạn, tự Bỏ qua, hay để người xử từng cái?
4. CV-2026-0134 sinh từ issue "nhắc đóng việc" ISS-2026-40-003 (đợt ⑤ sẽ chặn loại này): giữ hay huỷ?
