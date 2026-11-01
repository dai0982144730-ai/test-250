# KẾT QUẢ KIỂM ĐỘC LẬP LẦN 5 — phiên "2 Agent Công việc": Luật 33 hỏi trùng + TỔNG THỂ + Cây việc (05/10/2026, 07:55 – 09:10)

Đề: `05-10-lan-5-luat-33-hoi-trung-tong-the.md` (`789a44c`). Chỉ đọc và đo; cookie tự ký; bài test tạm đã xoá; cổng gọi bằng `agent_goi: kiem-doc-lap` (ghi 4 dòng/agent vào sổ nhật ký 5 agent lúc 08:07–08:08, 1 lượt AI phán thật ở 3004 5,3 giây — đúng mục 6.5 của đề).

## 1. Kết luận một dòng

**ĐẠT CÓ ĐIỀU KIỆN — 1 🔴 · 4 🟡 · 7 ⚪.** Khuôn chung, 5 cổng trả lời, bên hỏi, trùng muộn, Cây việc C8–C9, xoá 16 nháp đều đúng; **🔴 duy nhất: nháp soạn từ trợ lý chat CÓ HẠN gửi hạn dạng dd/mm/yyyy nên cả 4 agent từ chối câu hỏi ("Hạn phải dạng yyyy-mm-dd") → bên hỏi coi là "không thưa", gọi lại 3 lần rồi soạn với "chưa hỏi được agent …" — Luật 33 bị bỏ qua lặng lẽ ở Tiến độ · Hợp đồng · Main.**

## 2. Bảng chốt C1–C9

| # | Chốt | Kết quả | Bằng chứng |
|---|---|---|---|
| C1 | Luật 33: hỏi 4 agent, 3 lần, câu nguyên văn, qua sổ, xét cả nháp lẫn việc mở | **Đạt — trừ 🔴1** | `hoi-trung-kieu.ts` 5 bản md5 `957fa55a80` trùng; `dieuPhoiHoiTrung` lịch `[0, 60 s, 180 s]`, `HAN_CHO_MS` 15 s; câu `cauDaCoAgentSoan` đúng nguyên văn anh chốt; 3004 so việc đang mở sổ cái (`hoi-trung.ts:21-45`), TĐ/HĐ/Main so nháp còn sống (`viecDeSoTuNhap`), PL so `ViecChoDuyet`. Đo sống 3004 ca 6.1.4 → `trung=true CV-2026-0132`, 3 ứng viên, 5,3 s, lý do tiếng Việt |
| C2 | Máy lọc → 🤖 AI phán, nút "Vẫn soạn việc riêng" | **Đạt** | `locUngVienTrung` (cùng dự án ∧ hồ sơ/WBS/≥60% từ) → `phanTrung`; `vanSoan` ở `viec-ai-soan.ts:181-189`; PL `vanSoanViecRieng` (`viec-cho-duyet.ts:101`), nút `data-lenh="viec-cho-duyet-van-soan"` mờ kèm lý do |
| C3 | Người chờ: 1 lần 15 s, 2 lần ngầm, trùng muộn gắn cờ | **Đạt** | `dieuPhoiHoiTrung` nhánh `cho === "nguoi"` + `sauKhiHoiNot`; `banGhiHoiTrung(..., muon=true)` tại `viec-ai-soan.ts:200,365`; `laBanGhiTrung` bỏ qua `muon` → nháp vẫn hiện |
| C4 | Issue loại nhắc không sinh việc (đợt ⑤ — chỉ soát) | **ĐANG VI PHẠM 1 ca** | `KhoiViecIssue.tsx:52` `coKhoiViec` chỉ loại `nguon === "ai"`; issue `ISS-2026-40-003` (nguon `xong-giay`, "nhắc đóng việc") đã sinh **CV-2026-0134** lúc 05/10 07:03 (sổ cái, giao bởi quantri). Ghi cho đợt ⑤ |
| C5 | Xoá 16 nháp rác, có sao lưu | **Đạt** | So `viec-ai-soan.json` với `viec-ai-soan.truoc-don-04-10.json`: TĐ 8→3 (xoá 5) · HĐ 6→0 (xoá 6) · Main 5→0 (xoá 5) = **16**; `NH-1791130494317` còn ✓; 0 nháp mới thêm |
| C6 | Luật 32 ẩn hẳn tới 7 ngày trước | **Đạt ở TĐ/3004 · PL chưa trừ 7 ngày (đã biết)** | TĐ HV: 0 thẻ dự báo mở (ISS-2026-39-107 7.5.1 đã `da-dong`); 3004 Cây việc thẻ 4 "Chưa giao trong 7 ngày tới" ✓; PL: 10 nháp chờ duyệt đều **hạn đã qua** (xem 🟡3) |
| C7 | Không một việc nhiều nơi; cặp mẫu CV-0124/0132 | **Đạt** | Sổ cái (bản sao 08:00): trùng (dự án, WBS) đang mở chỉ 2 nhóm — 6.1.4 {CV-0124, CV-0132} (cặp mẫu, đều `wbs_viec` 6.1.4 `da_duyet`) · 7.3.2.1 {CV-0086 Nghiệm thu móng T5–T8, CV-0120 Rà soát hoàn công T1–T4, CV-0121 Đổ bê tông T9} = 3 việc khác nhau. PL `da_gui` 3 dòng khớp CV-0129/0130/0133, không nháp chờ duyệt nào trùng việc đã giao |
| C8 | Cây việc: 🤔 Mã AI (dưới 70%) · 🤖 AI đề xuất · 5 nút · Đầu việc WBS · thẻ 4 · bỏ "Không còn việc mới" · dòng chờ duyệt chỉ khi Mở | **Đạt — đo bằng trình duyệt** | `/cay-viec?du_an=HV`: 5 nút lọc một hàng (🔴 Việc găng · 👤 đã giao · ⭕ chưa giao · 🤔 Mã AI (dưới 70%) · 🤖 AI đề xuất); thẻ "Đầu việc WBS", "Chưa giao trong 7 ngày tới · 4 việc chờ"; "Không còn việc mới" 0 |
| C9 | Việc xong ẩn sau chữ xanh, chỉ mở khi bấm; số chỉ đếm chưa xong | **Đạt — đo bằng trình duyệt** | Dòng 1.1.4 Lập hồ sơ BCNCKT: `▸ 1 việc đã xong` (nút, xanh rgb(21,128,61)) · "· 1 việc" · 0 chữ "Xong ngày" lúc mới mở; bấm → `▾ 1 việc đã xong` + "Xong ngày 30/09/2026" xanh; `demViec` chỉ đếm `!daXong` (`CayGiaiDoan.tsx:75`); `moXong` không lưu (`:157-158`) |

## 3. Phát hiện — nặng → nhẹ

| # | Mức | Mô tả | Bằng chứng | Kịch bản | Đề xuất |
|---|---|---|---|---|---|
| 🔴1 | **Nặng — hỏi trùng bị bỏ qua** | Nháp soạn từ trợ lý chat (công cụ soạn nháp) đưa `han` nguyên dạng **dd/mm/yyyy** vào câu hỏi; bên nhận `docCauHoiTrung` chỉ nhận yyyy-mm-dd → trả `ok:false "Hạn phải dạng yyyy-mm-dd."` → bên hỏi coi là **không thưa** (null) → gọi lại 1 phút, 3 phút rồi soạn kèm "chưa hỏi được agent Tiến độ, Hợp đồng, Pháp lý, Công việc". Cùng tệp ở 3 bộ | TĐ `chat-tools.ts:840` `han: argStr(args,"han")` (dd/mm) → `viec-ai-soan.ts:196` `han: n.han ?? null` → `hoiTrungCauNoi` `:165 han: v.han`; HĐ `chat-tools.ts:242`, Main `:577`; **bài thử tạm** `docCauHoiTrung({han:"14/10/2026"})` → `"Hạn phải dạng yyyy-mm-dd."`, `"2026-10-14"` → qua. Đường giao thẳng (`:765 hanIso`) và soạn từ thẻ (`cauHoiTuThe` không hạn) **không** dính | Người nói "soạn việc X hạn 14/10/2026" → 4 agent từ chối ngay → không ai phán trùng → nháp ra đời dù 3004 đang có việc trùng; sổ 4 agent mỗi lần thêm 3 dòng lỗi | Chuyển `han` qua `hanIso()` trước khi hỏi (hoặc `docCauHoiTrung` nhận cả dd/mm/yyyy và tự đổi). Bên hỏi nên phân biệt "ok:false có câu" với "không thưa" — câu báo tham số sai không phải lý do gọi lại 3 lần |
| 🟡1 | Vừa | **Bài test Main gọi agent THẬT**: `tests/unit/tro-ly-web-quyen-xac-nhan.test.ts` gọi công cụ `tao_viec_base` "Đổ bê tông móng" → `hoiTrungCauNoi` → `hoiAgent` thật sang 3003 · 3004 (không mock `@/lib/nguon/hoi-agent`/`hoi-trung-hoi`). Mỗi lần chạy vitest Main để lại 2 dòng `main.hoi_trung_viec` trong sổ TĐ + 3004 (đo: 07:30:39 · 07:59:21 · 08:02:39 — 3 lượt, lượt 08:02 là vitest của phiên kiểm) | TĐ/3004 `nhat-ky-hoi-agent.jsonl` dòng `agentHoi:"main"`, mã chuỗi `main-muuik5en…`; test file mocks dòng 11–23 | Máy không bật 3003/3004 → test chờ 15 s ×2; bật → sổ thật nhiễu; ca có ứng viên → AI thật | Mock `@/lib/chung/hoi-trung-hoi` như `soan-viec-hoi-trung.test.ts:15` |
| 🟡2 | Vừa | **AI phán bên trả lời có thể vượt 15 giây** (nghi 1 của phiên gửi — đúng): TĐ lượt `lib/chung/hoi-trung` thật 04/10 23:57 chạy **16 340 ms** (`ai-so-dung.jsonl`); `runAI` TĐ/HĐ/Main không tắt nghĩ dài (`hoi-trung.ts:69 runAI(prompt, heThong)`), trung vị lượt ok từ 03/10: TĐ 15,1 s · Main 13,7 s. 3004 dùng `runAIGan` 5,0–5,3 s | ai-so-dung 3 bộ | Có ứng viên ở TĐ → bên hỏi hết 15 s → coi "không thưa" → 1 phút sau hỏi lại → AI chạy lần 2 (tốn gấp đôi) và người chờ nhận "chưa hỏi được" dù bên kia đã phán | Truyền ngân sách nghĩ ngắn/JSON (như `runAIGan` 3004) hoặc nâng `HAN_CHO_MS` cho cửa này lên 30 s |
| 🟡3 | Vừa | **Rác nháp**: PL **10/10** nháp `cho_duyet` đều **hạn đã qua** (11/07, 19/08, 07/08, 20/08, 30/08, 19/09, 23/01, 21/09, 03/02, 19/09/2026) — C10 lần 4 chặn gửi, popup bắt chọn hạn mới → 10 dòng nằm chờ; TĐ còn 1 nháp của thẻ đã giao (`NH-1791096956784`, cùng thẻ ISS-2026-39-140 với nháp đã giao CV-0132) — màn ẩn nhưng tệp còn | bản sao `phaply.db` bảng `ViecChoDuyet`; `viec-ai-soan.json` TĐ | Màn Duyệt giao việc PL luôn 10 dòng không gửi được; TĐ nháp chết nằm mãi | PL: lượt đêm làm mới hạn hoặc tự `bo_qua` nháp hạn đã qua; TĐ: dọn nháp của thẻ đã giao (nếp "ẩn ở màn" chưa đủ) |
| 🟡4 | Vừa | **Main sổ không có vết lượt hỏi trùng đi ra** của chính nó: 3 lượt `main → tiendo/base` có trong sổ TĐ + 3004 nhưng `4-agent-main/data/nhat-ky-hoi-agent.jsonl` chỉ có 1 dòng `hoi_trung` (lượt kiem-doc-lap đi vào). Nguyên nhân đo được: 3 lượt đó đều từ vitest (🟡1) ghi sổ vào sân tạm. Đường app thật (`hoiAgent → goiCoGhi`, `hoi-agent.ts:302-315`) đúng luật 29 theo code — **chưa có lượt thật nào để chứng minh** | grep `hoi_trung` sổ Main = 1 | — | Chạy một lượt thật từ Main rồi soát sổ hai đầu khớp mã lượt |
| ⚪1 | Nhẹ | Cổng dự án lạ: 3004 trả `ok:false` "Không có dự án nào mang mã XXZZ…" (đúng); TĐ · HĐ · Main · PL trả `ok:true, khong_ung_vien` (im lặng) — 4 cổng không cùng nếp | đo 08:07 | Hỏi nhầm mã dự án không ai báo | Thống nhất theo 3004 |
| ⚪2 | Nhẹ | Trùng muộn ghi lên nháp **đã giao** (nghi 2): `capNhatNhap(giu.id, x => x.hoiTrung = …muon)` không kiểm `daGiao`; `laBanGhiTrung` bỏ `muon` và màn ẩn `daGiao` → vô hại, chỉ thêm trường | `viec-ai-soan.ts:200,365` | — | Bỏ qua khi `daGiao` để tệp sạch |
| ⚪3 | Nhẹ | Giữ chỗ chỉ chặn cùng người + cùng thẻ (nghi 3): `:335 n.nguoi === nguoi` — hai người cùng agent bấm cùng thẻ → 2 nháp. Luật 33 nói giữa các agent; **ghi nhận**, cần anh quyết có mở rộng trong-agent không | — | — | — |
| ⚪4 | Nhẹ | Bản ghi trùng nằm mãi trong tệp nháp (nghi 5); PL hỏi lại bản ghi `trung` mỗi đêm → bên kia 1 lượt AI/đêm/bản ghi nếu có ứng viên (nghi 6) | `viec-cho-duyet.ts:73-76` | Tốn token lặp | Ngày hết hạn cho bản ghi trùng; PL chỉ hỏi lại khi việc bên kia đổi trạng thái |
| ⚪5 | Nhẹ | `tsc` Main **4 lỗi** nhưng ở `tests/unit/agent-mat-loc.test.ts` (phiên Quan sát, lần 6) — không thuộc lô này | `tsc10-4-agent-main.txt` | — | Báo phiên Quan sát |
| ⚪6 | Nhẹ | Trang TĐ `/alerts?project=HV` tải 15,0 s (HĐ 1,0 s, Main 4,0 s) — lần đầu sau sửa, chưa đo lại | curl 08:10 | — | Đo lại khi rảnh |
| ⚪7 | Nhẹ | Đường soạn/giao CHƯA hỏi trùng (nghi 10): TĐ `nhac-im-lang.ts:176 ghiNhapTuDo` (máy soạn nhắc nộp BC) · 3004 `soan-giao.ts:186` (Cây việc) · `api/cay-viec/issue/route.ts:197` (khối giao Issue) · `api/cong-viec/route.ts:14` (nút "+" người giao tay) — 3 đường máy/AI soạn chưa hỏi, đúng như phiên gửi tự khai; không thấy đường khác | grep | — | Đợt ③–⑥ |

## 4. Trả lời 10 điểm mục 5

| # | Kết luận |
|---|---|
| 1 | **Đúng nghi** (🟡2): TĐ đã có lượt thật 16,3 s > 15 s. Không đo được ca có ứng viên sống ở TĐ/HĐ/Main vì kho nháp hiện không có ứng viên 6.1.4 (TĐ nháp cùng thẻ bị loại vì thẻ đã giao); 3004 5,3 s |
| 2 | Không hại (⚪2) |
| 3 | Ghi nhận (⚪3) — anh quyết |
| 4 | **Có lỗi, nặng** (🔴1): máy lọc không dùng hạn, nhưng `docCauHoiTrung` **từ chối cả câu** khi hạn sai dạng |
| 5 | Rác nhẹ (⚪4) |
| 6 | Đúng: mỗi đêm hỏi lại bản ghi `trung` (⚪4) |
| 7 | Ma trận không chặn: 3 lượt thật từ `main` tới `tiendo` và `base` đều `ok`; hopdong/phaply không thấy lượt vì vitest Main chỉ tới 2 nơi đó? — **chưa kết luận được** (sổ HĐ 0 lượt từ main; PL ghi sổ MCP vào bảng `NhatKyAi` không tách được). Cần một lượt thật từ app Main để soát 4 đầu |
| 8 | Không lỗi: `data-lenh="cay-viec.xem-nut"` còn (`CayGiaiDoan.tsx:339`, `role="button"` `:337`); `demViec` chỉ dùng tại `CayGiaiDoan.tsx:75,304` |
| 9 | Đúng luật 19: câu trùng do máy ghép nhưng AI quyết → 🤖 đứng trước; TĐ `/alerts` 3 🤖, HĐ 2 |
| 10 | Đúng như phiên gửi khai + không thêm (⚪7) |

**Hướng bỏ (mục 4 đề):** 0 code nửa vời của cửa ĐỌC/GIAO/BỎ QUA khuôn chung; `hoiTrung` trong `NhapViecAi` là `BanGhiHoiTrung` (`viec-ai-soan.ts:53`) ✓.

## 5. Tổng thể (mục 6-B)

| Agent | Issue mở (nguồn) | Chưa tới lúc còn hiện | Rác nháp | Một việc nhiều nơi | Hỏi nhau trước khi mở (sổ từ 07:00) |
|---|---|---|---|---|---|
| Tiến độ HV | 16 (su-kien 9 · nguoi 3 · ai 2 · nang-suat 1 · gang 1); NK1 0 | 0 thẻ dự báo mở, 0 thẻ hạn > 12/10 | 1 (nháp thẻ đã giao) · 0 `dang_hoi` | 0 | 2 lượt nhận từ main (vitest) + 4 kiem-doc-lap; 0 lượt soạn |
| Hợp đồng N3A | 45 (nang-suat 42 · gang 3); HV 0 | 0 | 0 nháp | 0 | 0 (chỉ 4 kiem-doc-lap) |
| Pháp lý | HV 25 mở (ai 11 · máy 14) · BT 5 · TT 4 · N3A 1 | 1 issue hạn > 12/10; **chưa trừ 7 ngày** | **10 nháp hạn đã qua** · 0 `dang_hoi`/`trung` | 0 (3 `da_gui` = 3 việc 3004) | lượt đêm chưa chạy sau commit; bài giả 8/8 |
| Công việc 3004 | HV 14 (ai 5 · xong-giay 5 · nguoi 3 · nang-suat 1) · N3A 2 | thẻ 4 "Chưa giao trong 7 ngày tới · 4 việc chờ" | — | 2 nhóm cùng WBS: 6.1.4 (cặp mẫu) · 7.3.2.1 (3 việc khác nhau) | 3 lượt nhận từ main (vitest) + 1 kiem-doc-lap phiên gửi 07:56 (AI 4,95 s) + 4 kiem-doc-lap phiên kiểm; **CV-2026-0134** sinh 07:03 từ issue nhắc, không có lượt hỏi trùng trước (đường Issue chưa hỏi — ⚪7, C4) |
| Main | — | — | 0 nháp | — | 1 lượt nhận (kiem-doc-lap); 0 lượt đi ra trong sổ (🟡4) |

## 6. tsc + test

| Bộ | tsc | Test | Ghi chú |
|---|---|---|---|
| Main | **4 lỗi** (tệp phiên Quan sát) | 795 đạt · 3 hỏng cũ (menu) · 2 bỏ | 🟡1 test gọi agent thật |
| Tiến độ | 0 | **941/941** | |
| Hợp đồng | 0 | 717 đạt · 1 hỏng cũ (menu) · 23 bỏ | |
| Pháp lý | 0 | `test-hoi-trung-dem` **8/8** (giả hỏi + AI) | `npm test` còn đứt ở `test-tach-credential.ts` (lần 4 🟡2, chưa sửa) |
| Công việc 3004 | 0 | **966 đạt** · 12 bỏ · 0 hỏng (2 bài hạn cố định lần 4 đã sửa) | |

Lượt Claude thật từ test: **0** (transcript 2376→2378: 2 tệp mới là sandbox app Quan sát 08:02–08:10 và 3004 08:08 — vòng nền app, không phải test). Lượt agent thật từ test: **2** (🟡1).

## 7. Đã kiểm · chưa kiểm · cần Mr. Đại

**Đã kiểm:** C1–C9 · 5 cổng × 4 ca · bên hỏi 3 bộ + PL (đọc code + bài giả có sẵn) · luật 7 (5 bản khuôn trùng; `NutAiSoanViec` TĐ=HĐ; `ViecView` 3 bộ trùng; `viec-ai-soan.ts` HĐ khác TĐ 33 dòng, Main 18 dòng — đều chỗ riêng: từ điển mã, thư mục, câu lý do) · luật 29 (HĐ `goiHoiTrungTho` không export, bọc `goiCoGhi`; TĐ `goiAgent`; PL `goiCongCoGhi`; Main `hoiAgent`) · luật 28 (0 span viền ở 5 tệp đổi) · luật 10 (`ViecView` chỉ import tệp thuần) · luật 17 PL nút mờ kèm lý do · màn 7 trang · tổng thể 4 bảng.

**Chưa kiểm được:** ca có ứng viên sống ở cổng TĐ/HĐ/Main (kho nháp không có ứng viên — không tạo nháp thật) · nghi 7 bốn đầu từ app Main · PL lượt đêm thật (chạy 02:00).

**Cần Mr. Đại quyết:**
1. ⚪3 — giữ chỗ trong CÙNG agent: hai người cùng bấm soạn cùng thẻ có chặn không?
2. ⚪4 — PL hỏi lại bản ghi trùng mỗi đêm (tốn 1 lượt AI/đêm/bản ghi khi có ứng viên): giữ hay chỉ hỏi khi việc bên kia đổi?
3. 🟡3 — 10 nháp Pháp lý hạn đã qua: lượt đêm tự dời hạn, tự bỏ qua, hay để người xử từng cái?
4. C4 — `CV-2026-0134` sinh từ issue "nhắc đóng việc": giữ hay huỷ (đợt ⑤ sẽ chặn)?
