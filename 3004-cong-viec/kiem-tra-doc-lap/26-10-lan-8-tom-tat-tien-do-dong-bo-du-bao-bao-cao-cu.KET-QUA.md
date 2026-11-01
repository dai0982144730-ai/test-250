# Kết quả kiểm độc lập lần 8 — Tóm tắt tiến độ đồng bộ · dự báo khi báo cáo cũ · Phòng họp · Sơ đồ · Main câu báo (26/10/2026 tối)

**Kết luận: ĐẠT CÓ ĐIỀU KIỆN · 🔴 2 · 🟡 17 · ⚪ 17**

Chỉ đọc và đo. Ba phần do ba trợ lý đo riêng (phụ lục): TD (agent Tiến độ 3003) · CT (agent Công việc 3004) · MC (Main + chuông nhúng 5 agent). Phiên «0 Kiểm tra độc lập» tự đọc lại mã hai điểm 🔴 (xác nhận mã; số đo là của trợ lý). **Không tắt / dựng lại 3004, không build 3003**, không POST ghi dữ liệu thật, không Telegram, không AI thật. Cổng 3003 chỉ gọi đọc.

| Phần | Kết luận | 🔴 | 🟡 | ⚪ |
|---|---|---|---|---|
| TD — agent Tiến độ `1c403b9` `c376b2e` `345efa4` `946a773` | Đạt có điều kiện | 1 | 5 | 6 |
| CT — agent Công việc 3004 (đồng bộ Tiến độ, Phòng họp, Sơ đồ, chuông) + `421926f` | Đạt có điều kiện | 1 | 6 | 6 |
| MC — Main `d8e984e` `ff29012` `f712e97` + chuông nhúng 5 agent | T9 đạt có điều kiện; chuông **đạt** | 0 | 6 | 5 |

## Hai điểm 🔴

| Mã | Chỗ | Thấy gì · số đo | Đề xuất |
|---|---|---|---|
| **TD-01** | `5-Agent-tien-do/src/lib/du-bao/gia-dinh.ts:500` (mô tả `:505`) | Giả định `thoi_luong` cho **việc đang làm** quên cộng số ngày chưa báo cáo. Tôi đã tự đọc: đường dự báo thường ở `lich.ts:407-408` dựng `durationDays = soNgayDaLam + soNgayCho + R`, còn đường giả định ở `gia-dinh.ts:500` dựng `daLam + N` — thiếu `soNgayCho` mà T6 vừa thêm. Đo thật HV qua cổng `tiendo.gia_dinh_cod {wbs: 7.2.1.3, thoi_luong, soNgay: 34}`: giả định «còn lại 34 → 34» (**không đổi gì**) mà dự báo xong tụt từ 28/11 xuống 14/11. Bài thuần cho COD lệch **−13 ngày** (báo cáo cũ 14 ngày) và **−44 ngày** (cũ 200 ngày); trước T6 cùng ca cho 0. Số «COD lùi / sớm» của giả định và thẻ issue sai tỷ lệ với số ngày chưa báo cáo | Cộng `soNgayCho` vào `durationDays` ở nhánh «đang làm» (cùng công thức `lich.ts:408`), thêm bài giữ «giả định không đổi ⇒ không đổi dự báo» |
| **CT-421** | `6-Agent-cong-viec/CodeSCICongViec/src/lib/mcp/cong-base.ts:942-975` (`lichHop`) | `421926f` lọc `ghi_chu` / `duong_dan_hop` / `khach_ngoai` ở `GET /api/phong-hop` (đo đúng ý chốt), nhưng cổng `base.lich_hop` **không dùng** `locChiTietCuoc` và bỏ qua `ma_nguoi_dung`. Tôi đã tự đọc mã đã commit (`b716bc9`, 20:21): hàm vẫn trả ba trường đó cho `nguoi` được mời, bất kể ai gọi. Trợ lý đo: gọi với `nguoi` = người được mời và `ma_nguoi_dung` = nhân viên không được mời vẫn nhận đủ. Mức thực tế: rò chỉ xảy ra khi người gọi khác `nguoi`; hiện chỉ Main gọi cổng và Main ép `nguoi` = người hỏi (`chat-tools.ts:372`), nên chưa rò ngoài đời. Trợ lý xếp 🔴 vì lệch ý chốt; tôi coi là **🔴 về thiết kế / 🟡 về rò thực** | Cổng lọc theo `ma_nguoi_dung` (so với `nguoi`): khác thì dùng `locChiTietCuoc`; thêm bài RAM cho ca này |

## Điểm 🟡

| Mã | Phần | Chỗ | Thấy gì |
|---|---|---|---|
| TD-04 | TD | `cham-ngay.ts:95`, `bang-gantt.ts:148` | «Chậm khởi công» vẫn đếm tới **ngày cắt** (11/10), không tới hôm nay. HV: 20 dòng chưa khởi công mà Baseline đã bắt đầu trước hôm nay; 15 dòng thiếu đúng 15 ngày (vd `3.1.4` ghi 22 ngày, dự báo bắt đầu 26/10); 5 dòng (`6.2`, `6.2.1`–`6.2.4`) ghi «Chưa đến ngày bắt đầu» dù Baseline bắt đầu từ 24/10. Cách đếm anh chốt 14/10 → cần hỏi anh |
| TD-05 | TD | `nho-tam/chu-ky-du-lieu.ts:90` | Chữ ký bộ nhớ có ngày máy + UTC, không có ngày VN. Máy múi VN (máy này) đúng, đo qua 00:00. Hosting múi UTC thì 00:00–07:00 VN vẫn trả số của ngày hôm qua (luật 44) |
| TD-02 | TD | `lich.ts:407-408` | Việc đang làm có `R = 0` (khối lượng đủ, % chưa 100): dự báo xong = **hôm qua** và trôi lùi mỗi ngày. Bài thuần: hôm nay 29/01 → xong 28/01; hôm nay 03/08 → xong 02/08. HV thật hiện chưa gặp |
| TD-03 | TD | `lich.ts:467,:484` | Cửa sổ thời tiết bị cộng thừa 1–2 ngày (ví dụ xong 26/07, đáng ra 25/07) |
| TD-06 / TD-07 | TD | `can_cu` của `du_bao`, trang chủ, hướng dẫn; Gantt | Mô tả «từ ngày cắt» còn sót; Gantt lấy «hôm nay» theo ngày trình duyệt, không truyền `todayIso` |
| CT-2 | CT | `dong-bo.ts:27` | Trang 2 của `tiendo.bang_gantt` hỏng vẫn trả ok với bảng cụt (HV 100/183 dòng), nhớ 2 phút, không báo người đọc (luật 39) |
| CT-3 | CT | số cũ > 2 phút | Mỗi lượt gọi tự hỏi ngầm 3003; khi 3003 tắt, mỗi dự án trong danh sách gây một lỗi, ba lỗi liền mở ngắt mạch 10 phút cho mọi công cụ 3004→3003 (suy từ mã và mô phỏng, chưa bắn thật) |
| CT-1 | CT | `TomTatGanttTD.tsx:189` | Hộp rê chuột dòng «Thực tế» không kèm số ngày (luật 31), khác 3003 |
| CT-4 / CT-5 | CT | nút C2/C3; danh sách Dự án | Nút lệch một cấp so với tên nút; danh sách Dự án mất icon âm thầm và vẫn hiện «Nạp tiến độ» khi 3003 tắt và chưa có bản nhớ |
| CT-421b | CT | route Phòng họp | Không có bài kiểm cho `GET /api/phong-hop` sau `421926f` (đo bằng phiên giả đúng ý chốt, nhưng chưa có bài giữ) |
| MC-01 | MC | `hoi-agent.ts` (câu ngắt mạch) | Câu nói «đang tắt hoặc đang được khởi động lại» cho **mọi** nguyên nhân. Sổ thật: 23/97 lần mở ngắt mạch là do agent chậm; 3 lần mất quyền cũng mở mạch, khoá agent đang sống 10 phút cho mọi người mà câu vẫn nói «đang tắt». Mã không phân biệt «tắt» với «khởi động lại» |
| MC-02 | MC | `chat-agent.ts:316` (V3) | Ép AI nói «đang tạm không trả lời»: ở chat và Telegram anh không thấy chữ «đang tắt / khởi động lại» hay giờ thử lại (liên quan câu V3 đang chờ anh) |
| MC-03 | MC | `nguon-tien-do.ts:231` | T9 làm nửa vời: đường Bảng điều hành vẫn in «Đã bật chưa?»; hai đường còn in địa chỉ `http://127.0.0.1:300x/api/mcp/...` ra màn |
| MC-04 | MC | `kiem-thu/noi-dung-chung.ts:142` | Màn kiểm thử E-05 còn mong đợi «Thử lại sau HH:mm» |
| MC-08 | MC | tests | Bài T9 chỉ phủ `hoiTienDo`: đột biến bắt 5, sống 5 (sửa chữ hoặc giờ nghỉ ở `hoi-agent.ts` không bài nào bắt) |
| MC-09 | MC | chuông nhúng | Bỏ `flex 0 1000` nên cố định chiều rộng, đo lại lúc vào, sau 1,5 giây, khi `resize`, khi `rong` đổi; nút nạp trễ có thể gây tràn (chưa thử trình duyệt, suy từ mã) |

## Trả lời 14 điểm tự nghi

| # | Kết luận | Căn cứ |
|---|---|---|
| N1 | **Không sao, trừ TD-01** | Mọi chỗ gọi dự báo đều truyền `homNay` theo giờ VN. COD dự báo HV là 11/11/2027 ở `tom_tat`, `duong_gang`, `s_curve`, `gia_dinh_cod`, `bang_gantt`; `7.2.1.3` xong 28/11; đoạn xám 12/10–25/10, nét đứt bắt đầu 26/10 — khớp số đề. Ngoại lệ: nhánh giả định thoi_luong (TD-01) |
| N2 | **Đúng, trừ hai ca biên** | Đúng với lịch liên tục, lịch nghỉ Chủ nhật, ngày lễ; việc chưa bắt đầu và việc không có ngày bắt đầu thật bắt đầu hôm nay (đúng ý T6). Sai ở TD-02 và TD-03 |
| N3 | **Đúng ở múi VN, hở ở múi UTC** | TD-05. Bộ nhớ bị chặn trần, vài trăm KB |
| N4 | **Đúng nghi một phần** | Luôn trả bản cũ ✔, không hết hạn (6 giờ vẫn trả); giờ lấy số chỉ ghi khi > 5 phút; chưa đủ — CT-2, CT-3 |
| N5 | **Một nửa** | Màn Dự án không chờ ✔; API danh sách chờ chậm nhất ≤ 20 giây/trang, không hạn tổng; icon mất âm thầm khi 3003 tắt (CT-5) |
| N6 | **Đúng** | `banTuBangGantt` đúng; lệch nhãn C2/C3 (CT-4) |
| N7 | **Khớp phần chính** | 6 màu đúng bảng; 4 lệch ⚪ |
| N8 | **Khớp thứ tự** | 3003 đạt luật 31, 35, 36; 3004 thiếu số ngày ở «Thực tế» (CT-1), thiếu 3 dòng phụ |
| N9 | **Không có tiền; 3004 chưa lọc theo dự án/vai** | `bang_gantt` quét 495 dòng thật không có đơn giá hay giá trị BOQ, không nằm trong danh sách công cụ có tiền nên không lọc người xem (nhất quán với `khoi_luong_hang_muc`); route Tóm tắt của 3004 chưa lọc theo dự án/vai (CT-7) |
| N10 | **Đúng nghi, lọt hẹp** | Nạp tay lọt khi 3003 tắt; không mất dữ liệu (CT-6) |
| N11 | **Không tự gây vòng vẽ lại** | Tính 6 cỡ khung, ổn định; đáy ô cuối vừa khung ở cả 6 cỡ; khoảng cột tối đa 256 px (1,6 lần bước gốc). Đo trình duyệt chưa đo được |
| N12 | **Khớp** | Ảnh 1295×1215, ô bấm P01/P03/P09 đúng, phòng mới không lẫn |
| N13 | **Không bị đè** | Không có rule `.vong-xanh-duong` |
| N14 | **Không nơi nào vỡ** | Telegram `RE_CAU_SU_VIEC` và Pháp lý `/Không nối được/` đều khớp chữ mới; Quan sát đếm theo dòng sổ `ngat_mach`; gác không đọc chữ. Còn MC-03/MC-04 (chữ cũ ở hai nơi) |

## Đã đúng, đã đo

- **Bài kiểm:** `tsc` sạch cả ba kho. Tiến độ vitest 1.613 qua / 4 đỏ (tổng 1.617; đề ghi 1.610 — phiên khác thêm bài): `quyen.test` ×3 (vai «Nhà thầu») và `mcp-loc-nguoi-xem` ×1 (công cụ BOQ mới chưa khai) — **không do 4 commit**: chạy lại ở `git archive 1c403b9~1` vẫn đúng 4 bài đỏ đó; dưới đồng hồ giả 10/09/2026 và 01/03/2027 danh sách bài trượt trước và sau `946a773` giống hệt. 3004: RAM 69/69 (tom-tat-tien-do 20/20, phong-hop 15/15 — đề 14, thêm 1 bài của `421926f`). Sơ đồ chạy được 34 bài (không ra 97 như đề vì các tệp `phong*.test.ts` và mau-excel đang bị phiên khác sửa). Main: 1.067 qua / 7 trượt, 6 khớp danh sách có sẵn; `vong-nen-con-tro-main` quá 5000 ms khi chạy cả bộ, chạy riêng 49/49; `nguon-tien-do.test` 22/22.
- **Route Phòng họp sau `421926f` đúng ý chốt** (gọi `GET /api/phong-hop` bằng phiên giả): người đặt, người được mời đích danh, người trong đơn vị được mời và quản trị thấy đủ; nhân viên và Tổng giám đốc không được mời thấy null; các đường khác (cua-toi, PUT/POST, giao-ban, chuông) đạt.
- **Chuông nhúng 5 kho:** Main, Tiến độ, Hợp đồng, Nghiệm thu giống hệt (băm tệp `e07e8494`); Pháp lý chỉ khác kiểu style và một dòng chú thích; không còn `0 1000`, vòng đo không tự lặp, không chớp, không rò quyền, không kéo `node:fs`.
- **Gói gửi anh Thịnh:** 10 bản vá khớp `git show` 10/10, áp sạch vào bản `git archive` của commit cha 10/10, kết quả khớp HEAD 13/13; không có khoá hay đường dẫn máy. ⚪ đầu bản vá ghi gmail cá nhân của anh Đại.
- **`8119d09`** cuốn theo 2 dòng «Sơ đồ tổ chức» → «Sơ đồ» là hợp lý, nhưng còn khoảng 136 chỗ hướng dẫn/giải thích ghi «Sơ đồ tổ chức» (luật 43, ⚪).

## Cần Mr. Đại quyết

**Câu mới (một), dành cho lúc anh rảnh — không gấp bằng câu 02:05:**

| | |
|---|---|
| **Vấn đề** | Cách đếm «Chậm khởi công» anh chốt 14/10 là tới **ngày cắt dữ liệu** (11/10). Sau khi anh chốt 26/10 «ngày không báo cáo = không làm», dự báo đã bắt đầu từ **hôm nay** (26/10), nên hai con số đá nhau: HV có 15 dòng ghi thiếu đúng 15 ngày (ví dụ `3.1.4` ghi 22 ngày, tính tới hôm nay phải 37) và 5 dòng (`6.2`, `6.2.1`–`6.2.4`) ghi «Chưa đến ngày bắt đầu» dù Baseline đã bắt đầu từ 24/10 |
| **(gợi ý) Đếm «Chậm khởi công» tới hôm nay (cùng mốc với dự báo), ghi rõ «chưa có báo cáo từ dd/mm»** | Được: một mốc cho cả bảng, người đọc không thấy hai con số khác nhau; hết dòng «Chưa đến ngày bắt đầu» trong khi Baseline đã qua. Mất: số «Chậm khởi công» tăng theo từng ngày không có báo cáo, tức là phạt cả ngày công trường chưa báo cáo |
| Giữ tới ngày cắt (chốt 14/10) | Khuyết điểm: tiếp tục lệch với dự báo, 5 dòng ghi sai chữ «Chưa đến ngày bắt đầu». Ưu điểm: số không đổi khi không có báo cáo mới, đúng nguyên văn anh chốt |
| Hiện cả hai mốc (tới ngày cắt và tới hôm nay) | Khuyết điểm: thêm một cột, trái ba nguyên tắc trình bày (một vấn đề một nơi). Ưu điểm: không mất thông tin nào |

**Các câu cũ vẫn chờ (không thêm):** lượt tự sửa đêm nay 02:05 chạy với quyền nào (trả lời 1, 2 hoặc 3 — **có hạn giờ**) · V3 «một dòng cho mọi nơi hay Quản trị web thêm nguyên nhân» · câu Phòng họp (ai xem ghi chú / link / khách ngoài): phiên «2 Agent Công việc» báo anh đã chốt 26/10 bằng `421926f`; tôi chưa có lời anh, và CT-421 cho thấy cổng MCP chưa theo chốt đó · tài khoản Claude chạy lượt đêm · người xem có thấy trả lời Pháp lý ở tab Video · đăng nhập chung · Nghiệm thu lần 3, 4 · Hợp đồng · Cảnh báo · việc 7.1.2 · hai bản sao CSDL Pháp lý · commit 16 tệp Pháp lý.

## Chưa đo được

Đo sống 3004 và trình duyệt (1366×768, 1920×1080, MutationObserver): `test.quantri` không có ở 3004 và đăng nhập một lần bị từ chối; không tự ký cookie · chuông trên trình duyệt thật · thời gian lạnh thật của `bang_gantt` (bộ nhớ đã nóng, đo nóng 80–130 ms) · nhánh BOQ của `bang_gantt` (không dự án nào có BOQ) · hình vẽ trên giao diện thật · `tiendo.du_bao` và `lich_su_du_bao` (ghi sổ nên không gọi) · ngắt mạch ba lỗi liền (CT-3) bắn thật.

## Xác nhận an toàn

Không tắt / khởi động lại / dựng lại 3004 hay cổng nào; không `next build`; không sửa `data/` (kể cả `BT.json`); chỉ CSDL RAM; không Telegram thật; không AI / `claude` CLI thật; cổng 3003 chỉ gọi đọc với `agent_goi` = `base`; không sửa Main / Tiến độ / 3004 (bài thử tạm đã `rm`, junction đã gỡ bằng `rmdir`); không commit.

---

# PHỤ LỤC 1 — TD: agent Tiến độ 3003

# Kiểm độc lập lần 8 — agent Tiến độ 3003 (kho T = `5-Agent-tien-do`) — mã phát hiện TD-

Đo ngày 26/10/2026 20:10–20:40 (giờ VN). Commit xét: `1c403b9` (cổng `bang_gantt`) · `c376b2e` (nhớ cả bảng) · `345efa4` (tam giác) · `946a773` (T6). Không sửa gì trong kho T / C3004 / M; không bật tắt cổng nào; chỉ GỌI ĐỌC cổng 3003 (`agent_goi=base`, `ly_do_goi=kiểm độc lập lần 8`). Bài thử tạm chạy ở bản `git archive` ngoài kho (`tam-td/cha*`), đã gỡ junction `node_modules`.

## 0. Kết quả tsc / vitest (chỉ mình tôi chạy trong kho T)

| Lệnh | Kết quả |
|---|---|
| `npx tsc --noEmit -p .` (kho T, cây làm việc hiện tại) | **0 lỗi** (exit 0) |
| `npx vitest run` (kho T) | **1.613 qua / 4 đỏ / 1.617 bài** (161 tệp, 2 tệp đỏ), 36,7 giây. Đề ghi 1.606/1.610 — nay nhiều hơn 7 bài vì phiên khác thêm bài, 4 đỏ vẫn đúng 4 |
| 4 bài đỏ | `quyen.test.ts` ×3 (năm hàm tắt · tên hiển thị · «so mã loại tay» ở `lib/users.ts`, `app/api/auth/danh-sach/route.ts` = vai «Nhà thầu» của phiên khác) · `mcp-loc-nguoi-xem.test.ts` ×1 (công cụ BOQ mới chưa khai: `bao_cao_ngay_boq`, `boq_nghiem_thu`, `boq_theo_hang_muc`, `luy_ke_boq`) |
| Chứng minh KHÔNG do 4 commit | Chạy lại đúng 2 tệp đó ở `git archive 1c403b9~1` (cha của 4 commit): **vẫn đúng 4 bài đỏ** (`quyen` ×3 + `mcp-loc-nguoi-xem` ×1; danh sách thiếu của bài thứ tư ở cha là 7 công cụ, nay 8 — thêm `boq_theo_hang_muc` của `73ad432`, không phải của 4 commit này). Bộ bài cũ + mới còn chạy dưới đồng hồ giả 10/09/2026 và 01/03/2027: danh sách trượt của `946a773~1` và `946a773` **giống hệt** (các bài `nhat-ky`/`don-so` đỏ thêm là do đồng hồ đóng băng, cả hai bản đều thế) → T6 không làm bài cố định theo dữ liệu mẫu phụ thuộc ngày chạy |
| Bài mới của T6 | `tests/unit/du-bao-bao-cao-cu-26-10.test.ts` 3/3 qua. Chỉ 3 ca, đều lịch liên tục, không có ca lịch nghỉ / việc R=0 / thời tiết / giả định COD / `bang_gantt` (xem TD-03, TD-04, TD-09) |

## 1. Phát hiện

| Mã | Mức | Vị trí | Thấy gì · đo gì · số | Đề xuất |
|---|---|---|---|---|
| TD-01 | 🔴 | `src/lib/du-bao/gia-dinh.ts:500` (`durationDays: daLam !== null ? daLam + N : N`), câu mô tả `:505` | Giả định «thoi_luong» cho **việc đang làm** quên cộng số ngày chưa báo cáo (T6 thêm `soNgayCho` ở `lich.ts:407` nhưng không thêm ở đây) → lượt «sau» vẫn nối ngay sau ngày cắt, lượt «trước» nối từ hôm nay. **Đo thật HV qua cổng** `tiendo.gia_dinh_cod {wbs:7.2.1.3, thoi_luong, soNgay:34}`: mô tả ghi «CÒN LẠI 34 → 34» (không đổi gì) mà dự báo xong **28/11/2026 → 14/11/2026 (sớm 14 ngày)**, float 169 → 183. **Bài thuần** (báo cáo cuối 15/01, hôm nay 29/01): «45 → 45» cho COD trước 14/03, sau 01/03 (**−13 ngày**); báo cáo cũ 200 ngày: **−44 ngày**. Trước T6 (`946a773~1`) cùng ca cho 0. Hiện hiện ra ở công cụ chat/cổng «giả định COD» (loại `thoi_luong` trên việc đang làm); `xong_som/xong_muon/ve_baseline` dùng ngày nên không sai | Cộng `soNgayCho` vào `durationDays` giống `lich.ts:407` (hoặc đặt `notEarlierThan` + chạy từ `sauCat`); thêm 1 bài «N = số còn lại hiện tại ⇒ COD không đổi» khi báo cáo cũ |
| TD-02 | 🟡 | `src/lib/du-bao/lich.ts:407-408` | Việc đang làm có `R = 0` (KL đã đủ nhưng % chưa 100): thời lượng = `daLam + soNgayCho + 0` ⇒ dự báo xong = **hôm qua** và **trôi lùi mỗi ngày**. Bài thuần việc «6» (KL 100/100, % 90, ngày cắt 15/01): hôm nay=29/01 → xong 28/01; hôm nay=03/08 → xong **02/08**; trước T6 luôn 15/01. Dự báo xong < hôm nay với % < 100 và còn đi vào ngày bắt đầu việc sau/COD. Quét HV thật (3 việc đang làm: 0 ca R=0, 0 dự báo xong < hôm nay) ⇒ chưa gặp nhưng nằm sẵn | Chỉ cộng `soNgayCho` khi `R > 0`; `R = 0` giữ «xong tại ngày cắt» như cũ |
| TD-03 | 🟡 | `src/lib/du-bao/lich.ts:467` + `:484` (thời tiết, việc «năng suất kế hoạch» có ngày bắt đầu) | `can = durationDays − daLam` nay gồm cả `soNgayCho` nhưng cửa sổ mưa bắt đầu từ hôm nay (`tu: sauCat`) ⇒ cộng thừa ngày mưa ở phần đuôi. Bài thuần (A: 20% ngày 05/07, mưa T7 nhóm 30%): hôm nay=15/07 → xong 26/07 (+4 ngày thời tiết), đáng ra 25/07 (+3: ⌈8×1,3⌉=11 ngày từ 15/07). Lệch ≤ 1–2 ngày | `can` phải là `R` (không kèm `soNgayCho`) khi tính cửa sổ thời tiết |
| TD-04 | 🟡 | `src/lib/cham-ngay.ts:95` + `src/lib/mcp/bang-gantt.ts:148` (`ngayCat: ngayBC ?? homNay`), `MiniGantt.tsx:2788` | «Chậm khởi công» vẫn đếm tới **ngày cắt**, trong khi T6 nói «ngày không báo cáo = không làm» và dự báo bắt đầu hôm nay. HV thật: 20 dòng chưa khởi công mà Baseline đã bắt đầu trước hôm nay; **15 dòng** ghi «Chậm khởi công N ngày so với Baseline» thiếu đúng 15 ngày chưa báo cáo, **5 dòng** (`6.2`, `6.2.1`–`6.2.4`, Baseline bắt đầu 24/10) ghi **«Chưa đến ngày bắt đầu theo Baseline»** dù Baseline đã bắt đầu 2 ngày trước. Ví dụ `3.1.4 Thỏa thuận đo đếm điện năng`: Baseline bắt đầu 19/09, dự báo bắt đầu 26/10 (37 ngày sau) mà câu ghi **«Chậm khởi công 22 ngày so với Baseline»** (19/09→11/10). `6.1.x` ghi 40 ngày, thực tế tới hôm nay 55 ngày. Cách đếm 14/10 do anh chốt («ngày cắt − ngày bắt đầu») có trước T6 | Hỏi anh một câu (theo khuôn 5 phần): đếm tới hôm nay khi báo cáo cuối đã cũ? (gợi ý: có — cùng bộ với dự báo). Sửa một chỗ `chamSoVoiMoc` truyền `homNay` |
| TD-05 | 🟡 | `src/lib/nho-tam/chu-ky-du-lieu.ts:90` | Chữ ký bộ nhớ chỉ có ngày **máy** + ngày **UTC**, không có ngày **VN**; T6 làm số phụ thuộc `homNayVN()` nên luật 44 hở. Đo bằng đồng hồ giả: **máy ở múi VN** ⇒ sang ngày đúng 00:00 VN (`getComputed` và cổng `bang_gantt` đều tính lại, `cho_bao_cao.kt` 25/10 → 26/10) ✔. **Máy múi UTC (hosting sắp tới)** ⇒ từ 00:01 tới 06:59 VN ngày 27/10 vẫn trả «từ hôm nay 26/10» (COD dự báo 22/10/2027 thay vì 23/10/2027), tới 07:01 mới đúng | Thêm `homNayVN(bayGio)` vào chữ ký (một dòng) |
| TD-06 | 🟡 | `cong-tiendo.ts:759-766` (`can_cu` của `tiendo.du_bao` — chữ ra cho agent khác/AI), `app/page.tsx:368`, `lib/huong-dan/tab/gs-tong-quan.ts:122,143`, `components/tabs/settings/AnhHuongThoiTiet.tsx:222`, `lib/huong-dan/tab/cd-thoi-tiet.ts:168`, `gia-dinh.ts:447,451,475,505` | Luật 43: T6 đổi hành vi nhưng các câu mô tả vẫn nói «chạy từ sau ngày cắt dữ liệu / ngày sau ngày cắt / bắt đầu = muộn nhất của {…ngày sau ngày cắt…}». Đọc mã: `can_cu` của `tiendo.du_bao` chưa có chữ «hôm nay» (không gọi cổng này để tránh ghi sổ). Chỉ `gs-gantt.ts` và chú giải Gantt được sửa | Grep «ngày cắt» ở các tệp trên, thêm «(báo cáo cuối cũ thì từ hôm nay)» |
| TD-07 | 🟡 | `MiniGantt.tsx:875-881` (`todayIso ?? fallbackToday`), `GanttMoi.tsx:131`, `PlanningView.tsx:2886` không truyền `todayIso` | Nét xám + điểm bắt đầu nét dự báo của Gantt lấy «hôm nay» theo **ngày máy trình duyệt**, đóng băng lúc mở trang (`useState`); phía máy chủ dùng giờ VN. Người xem ở múi giờ khác, hoặc để tab qua nửa đêm ⇒ thanh vẽ lệch 1 ngày so với số `bang_gantt`/COD (luật 38, 44). Anh Đại ở VN nên chưa thấy | Truyền `todayIso={homNayVN()}` từ máy chủ qua `GanttMoi` |
| TD-08 | ⚪ | `src/lib/schedule/cod-history.ts:93` (sổ mốc COD) | HV: sổ có 34 điểm, điểm cuối 26/10 05:43Z = **28/10/2027**; điểm kế tiếp sẽ là **11/11/2027 (+14 ngày)** rồi **+1 ngày mỗi ngày** khi báo cáo còn cũ, cùng nhãn `cachTinh:"nang-suat-7-ngay"` ⇒ biểu đồ lịch sử sẽ vẽ một bước nhảy do ĐỔI CÁCH TÍNH như dự án trễ thật; luật «điểm lạ» (`cod-history-diem-la.ts:44`) không bắt vì bước nhảy bền | Đổi nhãn `cachTinh` (vd `nang-suat-7-ngay-tu-hom-nay`) để biểu đồ ngắt đường, hoặc ghi chú tại điểm 26/10 |
| TD-09 | ⚪ | cả `tests/` | Không có bài nào cho `bang-gantt.ts` (`grep bang_gantt\|bangGanttCuaDuAn tests` = 0), nhánh BOQ (`kl.theo=boq-dai-dien`, `theo_tien_boq`) chưa có dòng thật nào: HV/TT/N3A đo được **0/495 dòng** có hai nhánh này | Một bài dùng dữ liệu mẫu BOQ, một bài `cho_bao_cao`/`du_bao` giống 3 ca của `MiniGantt` |
| TD-10 | ⚪ | `src/lib/mcp/cong-tiendo.ts:195-203` (mô tả công cụ `tiendo.bang_gantt`) | Thiếu trường `cho_bao_cao` mà `946a773` thêm (danh mục công cụ là thứ các agent khác đọc) | Thêm «cho_bao_cao (nét xám)» vào `mo_ta` |
| TD-11 | ⚪ | `cong-tiendo.ts:1654` | Câu «Dự án chưa có bảng tiến độ.» khác khuôn «Dự án chưa có tiến độ đã lưu — …» của mọi công cụ khác; Main `bao-cao-sang/dung.ts:262` so mẫu `/chưa có tiến độ/` ⇒ nếu sau này Main hỏi `bang_gantt` thì bị đọc thành LỖI. 3004 hiện đọc `ma_loi === "KHONG_CO_DU_LIEU"` nên đúng (`dong-bo.ts:34`) | Đổi thành «Dự án chưa có tiến độ đã lưu — chưa có bảng Gantt.» (vẫn chứa «chưa có bảng») |
| TD-12 | ⚪ | `MiniGantt.tsx:503,688-689,1597`, `GanttMoi.tsx:161`, `PlanningView.tsx:2898`, `mau-do-hoa.ts:24` | T5: còn 7 chú thích code «hai đầu mũi tên» (không phải chữ ra người dùng; chữ ra người dùng — chú giải, hướng dẫn `gs-gantt.ts:82` — đã sửa) | Dọn khi tiện |
| TD-13 | ⚪ | `bang-gantt.ts:93` | Tính lại `new Date(Date.now()+7*3600_000)` thay vì dùng `homNayVN()` (`tuan-hien-tai.ts:11`) — hai chỗ cùng giờ VN nhưng viết hai lần (luật 7) | Dùng chung |

## 2. Trả lời điểm tự nghi

### N1 — bộ tính dự báo dùng chung có chỗ nào quên `homNay`? → **KHÔNG sao ở lượt chạy thật; có lệch ở giả định (TD-01)**

Bảng mọi chỗ gọi (`grep lapLichDuBao|docDauVaoDuBao|apDuBao|tinhGiaDinhCod|tinhAnhHuongCodDuAn`):

| Chỗ gọi | Truyền `homNay`? | Nguồn «hôm nay» |
|---|---|---|
| `du-bao/doc.ts:115-124` `apDuBao` → `lapLichDuBao` | Có | `docDauVaoDuBao` → `homNayVN()` (`tuan-hien-tai.ts:11`, +7 giờ ✔ luật 44) |
| `schedule/store.ts:456, 507, 808` + `api/schedule/preview/route.ts:59` (gọi `apDuBao`) | Có (qua `apDuBao`) | như trên |
| `getComputed` → `tinhGetComputed` (mọi màn: COD, cảnh báo, báo cáo tuần/tháng/sáng, Gantt, Tóm tắt, `bang_gantt`, `du_bao`, `duong_gang`, `s_curve`) | Có | như trên |
| `du-bao/gia-dinh-doc.ts:35` `tinhAnhHuongCodDuAn` (ảnh hưởng hạng mục, trang chủ, `duong_gang`) | Có `dv.homNay` | như trên |
| `gia-dinh-doc.ts:60` `tinhGiaDinhCod` (chat, cổng `gia_dinh_cod`, đo lại COD thẻ cảnh báo `canh-bao/do-lai-cod.ts:39`) | Có `dv.homNay` | như trên |
| `anh-huong-cod.ts:70, 101`, `gia-dinh.ts:346, 519` | Có qua `...v` | `v.homNay` |
| `gia-dinh.ts:363` `sauCat` | Có (dùng `batDauPhanConLai`) | `v.homNay` |
| Bài kiểm cũ (`tests/unit/*.test.ts`) | Không (cố ý: «thiếu = cách cũ») | — |
| Chỗ **cộng ngày** thủ công bỏ sót | Không còn: `grep addDays(.*ngayCat` ngoài `lich.ts` = 0 | — |

Đo thật HV qua cổng: COD dự báo = **11/11/2027** ở cả `tom_tat_du_an` (`cod`, `cod_du_bao`), `duong_gang`, `s_curve` (`codDuBao`), `gia_dinh_cod` (`cod_truoc`), `bang_gantt` (`cod_du_bao`) ✔ bằng nhau; thẻ `ISS-2026-39-140` 58 ngày = 11/11/2027 − Baseline 14/09/2027 ✔; `tach_cham_cod` «chậm 100 ngày so với Tiến độ mục tiêu = 42 + 58» ✔ ghi rõ hệ (luật 36). `7.2.1.3` (`chi_tiet_dau_viec`): dự báo xong **28/11/2026**, bắt đầu 05/10, «còn 1,7 trạm cần 34 ngày» (26/10 + 33 = 28/11 ✔). Đoạn xám `bang_gantt`: 6 dòng nhóm `3 · 3.1 · 4 · 7 · 7.2 · 7.2.1` đều **12/10 → 25/10**, nét đứt bắt đầu **26/10**; 0 dòng chồng nhau, 0 dòng `du_bao.kt < bd`. Khác với số đề (28/10→11/11/2027, 14/11→28/11, 12/10–25/10): **trùng khớp**.
Chưa kiểm bằng cổng: báo cáo sáng / báo cáo tháng của Main (đọc mã: chúng gọi cổng `tiendo.*` nên cùng số). **`tiendo.du_bao` / `lich_su_du_bao` không gọi** vì mỗi lượt ghi sổ mốc COD (là ghi dữ liệu thật).
Một lệch nhỏ: mốc «hôm nay» của **cảnh báo** (`api/canh-bao/route.ts:40`, `app/alerts/page.tsx:33`, `app/page.tsx:148`) là ngày UTC (`toISOString().slice(0,10)`) chứ không phải VN ⇒ 00:00–07:00 VN nhãn «lần chạy»/ngày mở thẻ chậm một ngày so với dự báo (không đổi con số dự báo; có từ trước T6) — gộp vào TD-05/TD-07.

### N2 — `soNgayCho` có đúng không? → **Đúng với lịch liên tục và lịch có ngày nghỉ; sai ở hai ca biên (TD-02, TD-03)**

Đọc `lich.ts:405-408`: `demNgayLamViec(ps, calendar, ngaySauCat, sauCat−1, lienTuc)` dùng đúng hàm đếm của engine (`engine.ts:937`) ⇒ tôn trọng `calendarMode=continuous`, ngày nghỉ hằng tuần, ngày lễ. Bài thuần (lịch nghỉ CN + lễ 20–21/01, việc 1 còn 45 ngày làm việc, ngày cắt 15/01):

| Hôm nay giả | Việc 1 (lịch thường) xong | Việc 1 (ép liên tục) xong | Ghi chú |
|---|---|---|---|
| = 15/01, 16/01 | 11/03 · như trước | 01/03 | không đổi (báo cáo hôm qua/hôm nay) |
| 26/01 | 18/03 | 11/03 | 45 ngày làm việc kể từ **26/01** (bỏ qua các Chủ nhật) ✔ đúng, 11/03 = 26/01+44 ngày lịch ✔ |
| 10/02 | 02/04 | — | |
| 29/01 (lịch liên tục) | 14/03 | — | 01/03 + 13 ngày chưa báo cáo ✔ |

Các loại việc (hôm nay giả 29/01): xong 100% **không đổi** (02–10/01) ✔; chưa bắt đầu → bắt đầu hôm nay (16/01 → 29/01, 5 ngày ✔); «đang làm không ngày bắt đầu thật» (`notEarlierThan: sauCat`) → **bắt đầu hôm nay** ✔ đúng ý T6 («ngày không báo cáo = không làm»); hạn «không sớm hơn» tương lai (01/03) **giữ**, quá khứ → hôm nay ✔. Nhảy số: ngày hôm nay +1 ⇒ dự báo +1 (đều, không nhảy lớn); không có dự báo âm hay dự báo xong < ngày bắt đầu (quét HV thật: 0). Hai ca biên: TD-02 (R=0) và TD-03 (thời tiết).

### N3 — bộ nhớ qua nửa đêm → **Đúng nếu máy múi VN (máy này); hở ở máy múi UTC (TD-05)**

- `getComputed` (`store.ts:~476`, 50 mục, mỗi dự án một mục) và `NHO_BANG_GANTT` (`cong-tiendo.ts:1648`) cùng khoá `chuKyDuLieu(pid)` — **có NGÀY** (ngày máy + ngày UTC). Đồng hồ giả qua 00:00 VN 27/10 với `TZ=Asia/Saigon`: lúc 23:59 «từ hôm nay 26/10», 00:01 «từ hôm nay 27/10», COD dự báo fixture HV 22/10 → 23/10/2027; cổng `bang_gantt` `cho_bao_cao.kt` 25/10 → 26/10, `du_bao.bd` 26/10 → 27/10 ✔. Với `TZ=UTC`: 00:01–06:59 VN vẫn trả số ngày 26/10 (TD-05).
- Dung lượng: `getComputed` ≤ 50 mục; kho cổng `cong-mcp-tiendo` trần 300 mục; `NHO_BANG_GANTT` mỗi dự án đúng 1 mục (đo được 3 dự án có tiến độ: HV 3 trang ~74+62 KB, TT 3 trang ~69+70+54 KB, N3A 23 KB) ⇒ vài trăm KB. Mục ngày cũ không có dọn riêng nhưng được ghi đè (cùng khoá) hoặc đẩy ra khi chạm trần 300 ✔. `NHO_BANG_GANTT` là biến mức mô-đun (không `globalThis`) ⇒ `next dev` nạp lại thì mất — chỉ mất tốc độ.
- Nhớ cũng nhớ **kết quả «không có bảng» (null)** cho tới khi dữ liệu dự án đổi (số tệp đổi ⇒ chữ ký đổi) ✔ không kẹt.

### N8 — hộp rê chuột 3003 (`MiniGantt.tsx:2772-2891`) → **Đạt (luật 31, 35, 36)**

Thứ tự dòng: tên + WBS → % thực tế → Mục tiêu → Baseline → (Bảng đang lập) → Thực tế → **Chưa có báo cáo** (mới, T6) → Dự báo xong/Dự báo → Thanh nhóm → lý do dự báo → nhà thầu hứa → hạn hợp đồng → KL TH/TK → BOQ → hai câu cuối. Khoảng ngày đều qua `khoangNgay` (kèm số ngày ✔, kể cả dòng «Chưa có báo cáo: 14 ngày · 12/10/2026 – 25/10/2026»); hai câu nhanh/chậm lấy từ `chamSoVoi` ⇒ luôn «… so với Tiến độ mục tiêu» / «… so với Baseline» hoặc «chưa có Baseline đã duyệt» ✔. Điều kiện hiện dòng xám = đúng điều kiện vẽ thanh xám (`today > mocBaoCao+1`). Vấn đề kèm: TD-04 (đếm «chậm khởi công» tới ngày cắt), TD-07 (`today` là ngày trình duyệt). Chưa so từng dòng với `TomTatGanttTD.tsx` của 3004 (phiên khác).

### N9 phía 3003 — `bang_gantt` có tiền? quyền? → **Không có tiền; không lọc theo người/dự án như các công cụ có tiền; chấp nhận được**

- Khoá phần đầu: `co_tien_do, co_baseline_duyet, phien_ban_baseline, baseline_duyet_luc, co_muc_tieu, ngay_bao_cao, cod_muc_tieu, cod_baseline, cod_du_bao, tong_so_dong (nội bộ), tong_so, vi_tri, so_tra_ve, con_nua` + ngoài khuôn `nguon[]` (có `file_goc` = đường dẫn tuyệt đối tệp `schedule.json` — giống mọi công cụ khác), `thoi_diem_tra_loi`, `canh_bao`.
- Khoá một dòng (23): `wbs, ten, cap, nhom, moc, ke_hoach, baseline_duyet, muc_tieu, thanh_nhom, thuc_te, cho_bao_cao, du_bao, gang, gang_du_bao, pct, kl, theo_tien_boq, du_bao_xong, du_bao_bat_dau, ly_do_du_bao, nha_thau_hua, cham_so_muc_tieu, cham_so_baseline`. `kl` = {th, tk, don_vi, theo}; `theo_tien_boq` là cờ đúng/sai. Quét chuỗi 495 dòng thật (HV 183 · TT 275 · N3A 37): **không có** khoá hay chữ nào về đơn giá, thành tiền, giá trị BOQ, hợp đồng (chỉ chữ «Hợp đồng EPC», «Hợp đồng mua bán điện» trong TÊN việc). **0/495 dòng** có nhánh BOQ ⇒ nhánh BOQ chưa đo được (TD-09).
- Quyền: công cụ **không** nằm trong `CONG_CU_CO_TIEN_HOP_DONG` (`loc-nguoi-xem.ts:25`) ⇒ Người xem / lượt máy không khoá nhận nguyên bảng — nhất quán với `khoi_luong_hang_muc`, `tim_dau_viec`; không có tiền nên không phạm chốt 12/10 («Người xem không thấy giá tiền và hợp đồng»). Lọc theo dự án không có ở cổng này (cổng tin vào lớp hỏi: Main / 3004 / `ma_nguoi_dung`) — giống mọi `tiendo.*`; «agent mật Hợp đồng/Pháp lý» ngoài đề này.
- Luật 39 (thời gian trả, cổng 3003, bản chạy nóng, 1 lượt/lần): HV 106 ms (183 dòng, 2 trang) · TT 87–93 ms (275 dòng, 3 trang) · N3A 80–82 ms · BT 80–90 ms. **Lạnh thật chưa đo lại được**: bộ nhớ đã nóng (3004 hỏi trước) và đo lạnh buộc phải đổi dữ liệu dự án. Tham chiếu: phiên làm đo TT lạnh 2,5–7,7 giây; bài đo của tôi ở bản vitest (không phải `next dev`) HV lạnh 332 ms, nóng 84 ms. Dưới trần 15 giây của Main.
- BT: `ma_loi: KHONG_CO_DU_LIEU`, câu «[Dự án Ba Tầng 1 · BT · ba-tang-1] Dự án chưa có bảng tiến độ.» ✔ (3004 `dong-bo.ts:34` khớp theo `ma_loi`; khuôn chữ xem TD-11). 12 dự án khác cũng `KHONG_CO_DU_LIEU` (chưa có tiến độ).

### T5 (tam giác) và T6 (nét xám) phía 3003

- T5: `ThanhNhom` (`MiniGantt.tsx:508-523`) vẽ thân dày liền + hai tam giác chúc xuống; chú giải `ChuGiaiGantt.tsx:38-46,102` và hướng dẫn `gs-gantt.ts:82` đã đổi; mọi chỗ gọi dùng chung `DAU_THANH_NHOM="tam-giac"`. Không có bộ vẽ in/xuất riêng (grep `ThanhNhom|khoangNhom` chỉ trong 5 tệp). Sót: 7 chú thích code (TD-12). Chưa nhìn bằng mắt (không bật giao diện).
- T6: nét xám `MiniGantt.tsx:1668-1678` từ `xMoc` tới `dateToX(today)` (= ngày cắt+1 … hôm nay−1) khớp `bang_gantt.cho_bao_cao` (12/10–25/10); nét đứt bắt đầu `max(xMoc, xHomNay)`; điều kiện `kt >= bdDuBao` của `bang_gantt` tương đương `xHomNay < xDuBao` của màn ✔ (hai bên cùng luật). `cho_bao_cao` = khoảng {bd, kt} ngày cắt+1…hôm nay−1 chỉ cho việc đang làm chưa xong và có ngày bắt đầu thật + có báo cáo (`null` ở các ca khác). Luật 35/36: chữ mới của commit («chưa có báo cáo», «tính từ hôm nay», ghi chú dự báo) không dùng chữ chậm/trễ/sớm; ghi chú dự báo dùng khuôn luật 31 «14 ngày · 12/10/2026 – 25/10/2026» ✔; toàn bộ tiếng Việt ✔. Điểm trừ: TD-04, TD-06, TD-07.

## 3. Thước T1–T10 liên quan phần 3003

| Thước | Kết |
|---|---|
| T2 (a) `tiendo.bang_gantt` cùng hàm màn | ✔ (`bang-gantt.ts` dùng `getComputed`, `docTienDoThucTe`, `tinhKhoangNhom`, `pctThucTeCuaViec`, `chamSoVoi` như `MiniGantt`); số khớp giữa các công cụ cổng (N1) |
| T5 tam giác cả 3003 | ✔ (trừ chú thích code, TD-12) |
| T6 vạch xám + dự báo từ hôm nay (tiến độ) | ✔ chạy đúng trên dữ liệu thật; ba chỗ chưa theo T6: TD-01 (giả định), TD-04 (chậm khởi công), TD-06 (mô tả) |
| T7 mẫu số 7 ngày | ✔ không đụng: `7.2.1.3` «6/7 ngày có báo cáo», cửa sổ 05/10–11/10 vẫn tính tới ngày cắt |

## 4. Chưa đo được

- Thời gian lạnh thật của `bang_gantt` trên 3003 đang chạy (bộ nhớ nóng; ép lạnh = sửa dữ liệu dự án).
- Nhánh BOQ của `bang_gantt` (không dự án nào đang có BOQ trong 3 dự án có tiến độ).
- Hộp rê chuột và nét xám trên giao diện thật (không đăng nhập, không bật Gantt).
- `tiendo.du_bao`, `lich_su_du_bao`, báo cáo sáng / tháng của Main (ghi sổ / ngoài kho).
- Hộp rê chuột 3004 `TomTatGanttTD.tsx` so với 3003 (thuộc trợ lý khác).

## 5. Xác nhận các điều cấm

- Không tắt / khởi động / dựng lại bất kỳ cổng nào; không `next build/start`; không động 3004 và gác; không gọi gì vào 3004.
- Không sửa / tạo / xoá tệp trong C3004, T, M, CHOT; bài thử tạm nằm ở `K\tam-td\cha*` (bản `git archive` ngoài kho, junction `node_modules` đã `rmdir`, target nguyên vẹn). `git status` kho T không có tệp `kiem-doc-lap-*`.
- Không Telegram, không AI thật (`CAM_CLI_THAT=1` trong cấu hình vitest; bài thử của tôi không gọi `runChatAgent`), không đọc `.env.local`, không in khoá. Không mở `pgdata`.
- Cổng 3003 chỉ gọi ĐỌC bằng `agent_goi=base`, `ly_do_goi=kiểm độc lập lần 8`: `bang_gantt` (HV, TT, N3A, BT + 12 mã khác), `tom_tat_du_an`, `duong_gang`, `chi_tiet_dau_viec`, `s_curve`, `tim_dau_viec`, `viec_trong_khoang`, `nang_suat`, `danh_sach_issue`, `gia_dinh_cod` (hai lượt thử giả định, không lưu gì). Không gọi `du_bao` / `lich_su_du_bao` / `soat_quy_tac` (có ghi sổ). Các lượt này vẫn vào sổ nhật ký hỏi–đáp của 3003 như lượt thật.

## 6. Kết luận

**ĐẠT CÓ ĐIỀU KIỆN.** `tsc` sạch, 4 bài đỏ không do 4 commit; cổng `bang_gantt` đúng số, không tiền, khớp các công cụ khác; T5/T6 chạy đúng trên dữ liệu HV thật. Điều kiện: sửa TD-01 (giả định «số ngày còn lại» sai tới −44 ngày khi báo cáo cũ), cân nhắc TD-02/03/05 trước khi chuyển hosting múi UTC, và hỏi anh về TD-04 (chậm khởi công tới ngày cắt hay tới hôm nay).


---

# PHỤ LỤC 2 — CT: agent Công việc 3004

# Kiểm độc lập lần 8 — agent Công việc 3004 (mã CT-)
Kiểm lúc 26/10/2026 ~20:05–20:35, kho `C3004` HEAD `421926f` (cây có thay đổi của phiên khác — chỉ soát phần thuộc commit trong đề). Đo thật; không sửa code; không động 3004/3003.

## Số chạy (chỉ mình tôi chạy trong kho C3004)
| Lệnh | Kết quả |
|---|---|
| `npx tsc --noEmit -p .` (2 lần: đầu phiên và cuối phiên) | exit 0, không lỗi (24 giây lần 2) |
| `vitest run tom-tat-tien-do phong-hop so-do to-chuc` (CSDL RAM `DOCFLOW_DB=memory`) | 6 tệp, **69/69 đạt**: tom-tat-tien-do 17/17 + dong-bo 3/3 (= 20/20 đúng đề) · phong-hop-25-10 **15/15** (đề nói 14: thêm 1 bài của 421926f) · so-do-loai-khac 21/21 + so-do-to-chuc 6/6 + to-chuc 7/7 = 34 (**đề nói sơ đồ 97/97 — bộ nào cho 97 tôi không tìm ra**; còn `phong.test.ts`, `phong-dot3.test.ts`, `dong-dau-theo-mau.test.ts`, `mau-excel.test.ts` có nhắc bo-cuc/SoDo, các tệp này đang bị phiên khác sửa nên tôi KHÔNG chạy) |
| Bài thử tạm của tôi (đã `rm` hết, `git status` không còn `tmp`) | ct421.txt, ct-donbo.txt, ct-bocuc.txt trong `tam-ct/` |
| Đo sống 3004 | **Chưa đo được**: `test.quantri@scigroup.vn` không có ở 3004 (3004 dùng 33 tài khoản thật) → đăng nhập trả «Email hoặc mật khẩu không đúng» (1 lần thử duy nhất); không có tài khoản thử hợp lệ → dừng, không dùng trình duyệt |
| Đọc cổng 3003 `tiendo.bang_gantt` (đọc, `agent_goi=base`) | HV: 183 dòng/trang 1 = 100, ngày báo cáo 11/10/2026, COD mục tiêu 03/08/2027 · Baseline 14/09/2027 · dự báo 11/11/2027; 24/24 dòng nhóm có `thanh_nhom`; câu chậm ghi «so với Tiến độ mục tiêu / so với Baseline» (luật 36 ✔); mất 3,2 giây |

---
## Phát hiện (mã · mức)

### CT-1 🟡 Hộp rê chuột dòng «Thực tế:» không kèm số ngày (luật 31) và khác 3003
`TomTatGanttTD.tsx:189` — đang làm / nhóm: `ngayVN(bd) – (xong ? ngayVN(kt) : "đang làm")`, chỉ ghi hai ngày. 3003 (`MiniGantt.tsx` ~2842) dùng `khoangNgay(bd, ketThuc, {thieuCuoi:"đang làm", tinhDen: ngàyBC})` → «185 ngày tới 11/10/2026 · 10/04/2026 – đang làm». Mẫu thật HV dòng «1 BÁO CÁO NGHIÊN CỨU…»: `thuc_te {bd 10/04/2026, kt 11/10/2026, xong:true, ket_thuc_that:null}` → 3004 ghi «10/04/2026 – 11/10/2026» (không số ngày; còn nói «xong» trong khi 3003 nói «đang làm»). Đề xuất: gọi `khoangNgay(bd, kt)` cho `ket_thuc_that` null như 3003, ghi «tới <ngày BC>» khi chưa xong.

### CT-2 🟡 Trang sau của cổng hỏng → bảng CỤT, báo «ok», nhớ 2 phút, không báo người đọc (luật 39)
`dong-bo.ts:27` `if (dau) break; // trang sau hỏng: dùng phần đã có` rồi trả `ok:true`. HV có 183 dòng = 2 trang; trang 2 quá hạn/ngắt mạch → màn vẽ 100/183 dòng, không chữ nào báo (chú giải chỉ ghi «100/100 dòng»), kho nhớ 2 phút và `banCuoi` giữ làm «bản cũ». Cổng đã trả `tong_so_dong` (183) nhưng 3004 không đọc. Không có bài kiểm cho nhánh này. Đề xuất: so `dong.length` với `tong_so`; thiếu thì trả `ok:false` (hoặc ok kèm cờ `cut` và dòng báo «mới lấy 100/183 dòng») và không đưa vào bộ nhớ.

### CT-3 🟡 Mỗi lượt mở màn Dự án khi 3003 tắt >2 phút = N lượt hỏi hỏng → ngắt mạch 10 phút chung cho mọi công cụ 3004→3003
`dong-bo.ts:64,78`: số cũ quá 2 phút → `void layBangGantt(...)` ở MỖI lần gọi, không có «nghỉ sau lần ngầm hỏng». Mô phỏng (giả `hoiTienDo`, 3003 tắt): 5 lượt GET liền → 2 lần hỏi ra ngoài (kho chỉ gộp lượt đang bay). `nguon-tien-do.ts:`ngatMach`: 3 lỗi liên tiếp (AGENT_KHONG_SAN_SANG tính là hỏng) → mạch mở 10 phút. Danh sách `GET /api/phong/tom-tat-tien-do` (không `du_an`) gọi `coBangGantt` cho TỪNG dự án có `ma_tien_do` song song; 3 dự án (HV, TT, N3A) = 3 lỗi trong MỘT lượt mở màn → ngắt mạch 10 phút, chặn cả găng, dự báo, hỏi trùng… dù 3003 sống lại sau 1 phút. (suy từ mã + mô phỏng; chưa bắn 3 lỗi thật vì cấm tắt 3003.) Đề xuất: ghi `lanHongCuoi` theo dự án, trong 60 giây sau lỗi ngầm thì không thử lại.

### CT-4 🟡 Nút C2 · C3 của bảng đồng bộ lệch một cấp so với tên nút
Bảng đồng bộ có dòng «0» tên dự án nên cấp 3003 lùi một cấp (`wbs "0.1"` = cấp 2). `datCap(2)` gập từ cấp ≥2 → màn chỉ còn tên dự án + **giai đoạn cấp 1 của 3003**; `title` nút vẫn ghi «Chỉ bung tới cấp WBS 2» trong khi cột WBS đang hiện mã «1», «2»… (1 đoạn). «C3» của 3003 (cấp 1–3) tương ứng nút «Full» ở đây. Đề nghị ghi chú ở `title` («cấp 1 là tên dự án») hoặc đổi nhãn.

### CT-5 🟡 Danh sách Dự án khi 3003 tắt: icon mất âm thầm; nút «Nạp tiến độ» vẫn hiện (N10)
`DuAnPhong.tsx:116` bắt lỗi rồi bỏ qua; `route.ts` danh sách: `coBangGantt` lần đầu chưa biết + 3003 tắt → `false` → dự án đã có Baseline rơi khỏi `co` và NẰM trong `nap_duoc` (nút nạp tay hiện). Không có chữ báo (luật 39). Chỉ xảy ra trong cửa sổ «3004 vừa khởi động lại / chưa từng lấy được bảng + 3003 tắt» (khi đã từng lấy được: `biet` giữ `true`, đo: `coBangGantt` = true sau khi 3003 tắt 6 giờ).

### CT-6 ⚪ N10 — POST nạp tay lọt khi 3003 tắt và chưa có bản nhớ
`route.ts` POST: `banTienDo(a)` trả `ban:null` khi hỏi hỏng → không 409. Hệ quả đo bằng đọc mã: bảng nạp tay LƯU (tệp trên đĩa) nhưng 3003 sống lại thì `GET ?du_an=` lấy bản đồng bộ (`td.ban` thắng), bản nạp tay bị che (không mất, hiện lại nếu Baseline bị gỡ). Người nạp thấy «Đã nạp N dòng» rồi mở lại thấy bảng khác. Chấp nhận được (hẹp, không mất dữ liệu); đề xuất: lúc `ok:false` chưa chắc → từ chối nạp «chưa hỏi được agent Tiến độ, thử lại sau» thay vì cho lọt.

### CT-7 ⚪ N9 — quyền
`route.ts` chỉ kiểm `coQuyen(nd,"so_cai.xem")`; không lọc theo dự án / vai (như bản nạp tay cũ — cùng mức). Bảng trả KHÔNG có đồng nào: `kl` chỉ khối lượng (`theo_tien_boq` → chỉ %), nhưng có `nha_thau_hua` (chữ) và `ly_do_du_bao`. Seed 3004 không có vai «Người xem» riêng (3 vai gieo đều `so_cai.xem toan_bo`) nên tôi không đo được Người xem; bảng này lộ cho mọi người đăng nhập. Chờ anh quyết có lọc theo dự án không.

### CT-8 ⚪ N7 — vẽ so MiniGantt 3003: khớp phần chính
Khớp: màu 6/6 (cam #f97316, xanh lá #22c55e, đỏ #ef4444, trắng, vàng #fbbf24, xám #6b7280 — đúng `lib/mau-do-hoa.ts`); độ mờ nhóm (mục tiêu 0,5 · thực tế 0,75 · dự báo 0,6 khi nhóm có thực tế); mốc hình thoi; thanh nhóm = `thanh_nhom ?? ke_hoach`, thân 6 px + tam giác 5 px đúng `ThanhNhom "tam-giac"`; nét thực hiện trùng tim, dự báo cùng làn (27/09); làn cam trên/xanh dưới; dự báo đỏ theo `gang_du_bao`. Lệch (⚪): (a) vạch «Hôm nay» 3004 nét liền 1,5 px (`phong.css:889`), 3003 nét đứt 1 px; (b) 3003 có vạch xám «ngày BC» (`MiniGantt.tsx` ~1790), 3004 không (chỉ ghi ở chú giải); (c) thanh Baseline việc lá không tô % (3003 tô khi không có làn thực tế); (d) màu viết thẳng hex (`#A8A29E`, `#F87171`, `#4ADE80`, `#FBBF24`) không qua token — cùng nếp cả `phong.css`, không có rgba tay (luật 25 ✔).

### CT-9 ⚪ N8 — hộp rê chuột
Thứ tự dòng khớp 3003 (% thực tế → Mục tiêu → Baseline → Bảng đang lập → Thực tế → Chưa có báo cáo → Dự báo → Thanh nhóm → lý do → nhà thầu hứa → KL → cuối 2 câu chậm). Thiếu so 3003: «Hạn hợp đồng» (cổng không trả), nhãn «★ KL TH/TK» và câu «Đo theo dòng BOQ đại diện…», cảnh báo vượt BOQ. Hai câu nhanh/chậm lấy nguyên từ cổng (có «so với Tiến độ mục tiêu / Baseline»; mẫu: «Đã xong, chậm 27 ngày so với Tiến độ mục tiêu» ✔ luật 35/36). Khoảng ngày kèm số ngày ✔ trừ CT-1. COD: chỉ một ngày, không kèm «chậm bao nhiêu ngày so với …».

### CT-10 ✔ N6 — `banTuBangGantt`
Đọc từng chỗ + bài 20/20: dòng «0» `ma:""` → cột WBS hiện rỗng (`d.ma ?? d.wbs` giữ chuỗi rỗng ✔); hộp dòng dự án chọn theo `!d.ma` ✔; `wbsCoCon` tính trên `wbs` có «0.» nên «0» là nhóm gốc, có ▼ ✔; `thanh_nhom` dòng gốc = gộp cấp 1 (`thanh_nhom ?? ke_hoach`) ✔; xuất «Tải file» bỏ dòng 0 (`filter(d => d.ma)`), `wbs = ma`, KL = `kl.tk`, ngày = Baseline duyệt ?? kế hoạch ✔ (đọc mã; chưa tải tệp thật vì cần đăng nhập). Dòng nhóm cấp 3 của 3003 có con cấp 4 (cổng chỉ trả tới cấp 3) → `t.nhom` đúng nên thanh vẽ đúng, nhưng không có ▼ vì bảng không có con (hợp lý). Không có tổng cần đặt trên cùng (luật 34 không áp; dòng gốc là dòng đầu ✔). Luật 28: chú giải/chip chỉ chữ + biểu tượng, không viền ✔.

### CT-11 ✔ T1 · luật 28
`TomTatTienDo.tsx:35-37` cấp 1–2 cam, cấp 3+ `#A8A29E` (chữ cấp 3 mặc định = như cấp 4 ✔); thanh nhóm dày 11 = việc lá + 2 tam giác (`:335-346`) ✔; chú giải «cấp 1 – 2 / cấp 3 trở xuống» ✔; hướng dẫn `du-an.ts` + `du-an-tom-tat-tien-do.ts` đổi theo ✔.

### CT-12 ⚪ N4 luật 39 — giờ lấy số (db19cef) có đủ chưa
Có: `lay_luc` = lúc lấy thật; quá 5 phút thì chú giải ghi «lúc HH:mm dd/mm» theo giờ VN (`TomTatGanttTD.tsx:143`, múi giờ `Asia/Ho_Chi_Minh` ✔ luật 44). Thiếu: (1) chỉ tính lúc vẽ, bảng để mở không tự đổi chữ; (2) 2–5 phút không ghi; (3) bản cũ không có hạn — đo: giả 3003 tắt 3 phút / 10 phút / 6 giờ → vẫn trả đúng bản lúc 01:00 (cũ 360 phút) và chỉ 2 lượt hỏi; chữ «máy đang hỏi lại, mở lại bảng sau ít phút» sai nếu mạch đang ngắt 10 phút; (4) CT-2 (cụt) không báo. Hợp ý «luôn trả bản cũ trước» nhưng nên có hạn (vd 24 giờ thì báo «số quá cũ, chưa dùng được») vì dự báo tính từ hôm nay (T6) sai ngay sang ngày mới.

### CT-13 ⚪ N5 — danh sách chờ 3003?
Màn Dự án KHÔNG chờ: `taiTomTat` chạy riêng, lỗi bỏ qua (`DuAnPhong.tsx:113-120`); API danh sách tự chờ chậm nhất trong các dự án (lạnh ~13 s đề đo, chưa đo lại được). Hạn cổng: `nguon-tien-do.ts` 10 s thường, thử lại 1 lần khi `HET_HAN_CHO` → **tối đa 20 giây mỗi trang**, 3 trang × 20 s xấu nhất (bảng 275 dòng); không có hạn tổng ở `dong-bo.ts`. Main chờ 15 s nhưng Main KHÔNG gọi route này. Giả `fetch` chậm 300 ms: lần đầu chờ đúng 305 ms (không hạn riêng). Mô phỏng 3003 tắt: lần đầu `ok:false, chua_co:false` + câu «Không nối được tới agent tiến độ…» → màn hiện `canh_bao` tiếng Việt kèm bản nạp tay (không bảng rỗng im lặng ✔ với màn bảng; ✗ với icon, xem CT-5). Câu lỗi lộ «tại http://127.0.0.1:3003 … biến môi trường URL_AGENT_TIEN_DO» cho người dùng thường (⚪, chữ kỹ thuật).

---
### N11 / T10 — Sơ đồ (d866f6e)
**Vòng đo `useLayoutEffect` không tự quay vòng** (đọc `SoDoPhong.tsx` + tính trên bố cục thật của `bo-cuc.ts`): `setCotX(cot)` chỉ khi `|cot−cotX|>0,5`; `cot` là hàm THUẦN của `k.clientWidth/clientHeight`, `bcMax` (không phụ thuộc `cotX` vì gọi `xepSoDo` không truyền `cot`) và `hNhaMay` → sau 1 lần đặt thì lần chạy kế cho cùng `cot` ⇒ dừng. Tính 6 cỡ khung (seed 26 đơn vị, `p-ktvh@nhom` 7 nhà máy, `bcMax` W=810 H=615 Hcd=275, 5 cột): lặp lần 2 luôn ổn định (6/6). Ngoài ra `overflowY:"auto"` có thể làm `clientWidth` giảm 15 px → `rongDo` (làm tròn 16) có thể nhảy một bậc — chỉ xảy ra khi bung nhóm KHÁC cao hơn `hNhaMay`, `H·s` cách ngưỡng xa nên không dao động (chưa đo trên trình duyệt thật).

**Hình học T10** (công thức đúng mã, khung k tự đặt vì chưa đo được k thật): khung 900×520 → cot 226, s 0,834, bung nhà máy H·s+4=517 < 520 vừa · 1100×560 → cot 256 (trần 1,6×160), s 0,901, 558 < 560 vừa · 1200×650 → cot 244, s 1,047, 648 vừa · 1300×700 → 697 vừa · 1500×860 → 803 vừa · 1700×900 → s trần 1,3, 804 vừa. Tức đáy ô cuối (nhà máy thứ 7) vừa khung ở mọi cỡ tính, không thanh cuộn (khi chỉ bung «Các nhà máy»); bung hết cùng giá trị vì seed chỉ có 2 nhóm. `cot` không vượt 256 = 1,6× ✔ (khối không xa quá). **Chưa đo được**: 1366×768 và 1920×1080 thật, MutationObserver 3 giây, vì 3004 không có tài khoản thử; dữ liệu thật «Hướng Linh 8» và các nhóm SCI PMC/E&C/BQLDA có thể làm `bcMax` khác seed.

### N12 · N13 · T8 (ảnh, vòng)
- Ảnh `mat-bang.webp`: 1295×1215 (tỉ lệ 1,0658) = `ANH_RONG/ANH_CAO` ✔. Đọc ảnh bằng mắt: khung P01 `x 34,0% w 20,1%` = 440–700 px (ảnh 430–710 ✔), P03 714–965 (ảnh 710–970 ✔), P09 500–1122 × 790–1178 (ảnh 485–1135 × 785–1185 ✔). Ghế theo toạ độ ảnh khớp ghế vẽ (P01 cột 524/634, P03 782/892, P09 hàng 885/1045). Phòng vệ sinh nay là phòng trống sàn kem một cửa ở góc trên trái (x 45–295, y 10–315), không trùng ô bấm nào (khung P01 bắt đầu x=440) ✔. Hành lang gạch trắng giữ nguyên.
- Phó chủ tịch HĐQT: `vongDau` → `"xanh-duong"` cho `bld-pct-hdqt` (có thật ở `chuc-nang-don-vi.ts:16`); bài `xepGhe` kiểm ✔ (15/15); vòng không ghi tên ✔ (`PhongHop.tsx:183-190`). **Không bị CSS đè**: `phong-hop.css:47-49` chỉ đặt `fill:none; stroke-width:3` cho `.vong` và `stroke` cho `.vong-xanh`/`.vong-do`; không có rule `.vong-xanh-duong` nên thuộc tính `stroke="#2563EB"` có hiệu lực (kiểm cả HEAD lẫn cây: giống nhau). ⚪ khi phiên khác hết sửa nên đưa `#2563EB` vào CSS để cùng một chỗ.
- ⚪ `PhongHop.tsx:162` `mat-bang.webp?v=3` — ảnh đã đổi 2 lần sau lúc đặt `v=3` (61d1342, 3e3bc76) mà không tăng; Next phục vụ `public/` kiểu hỏi lại, rủi ro thấp, đề xuất tăng thành `v=4`.

### Chuông nhúng và Phòng họp sửa theo lần 7
- 99232b3/6bb1b5e đúng ý (một hàng `flex nowrap`; nền sáng + nét `border-right`).
- 8014564 `DongHop.tsx:21-38`: đo bề rộng CHỮ (tổng rect các đoạn con, độ rộng không phụ thuộc đệm `.lan` hay `transform`) so với `clientWidth − padding`; `setTran` chỉ đổi khi khác ⇒ không chớp (điều kiện dừng ✔). ⚪ `useEffect` không mảng phụ thuộc → mỗi lần vẽ lại tạo một `ResizeObserver` mới (gỡ cái cũ, hiệu năng nhỏ, không vòng). Nhấp nháy bằng nền (`ph-nhap-nen`) không đổi bố cục ✔. Chưa đo đếm DOM 3 giây (không đăng nhập được).
- a274eed/e03fbbf: `laDuongDanHop` `/^https?:\/\/[^\s<>"]+$/i` chặn `javascript:`/`data:`, dùng ở máy chủ (`thuan.ts:212`) lẫn giao diện (3 chỗ); `laNgayThat` quay vòng ISO chặn 31/02; giao ban kế tiếp theo giờ bắt đầu; bài 15/15 ✔. Hướng dẫn e03fbbf khớp hành vi (ai cũng đặt được: `POST` chỉ `batBuocDangNhap`; đổi giờ/phòng/huỷ/kết thúc sớm có `baoNguoiDu`) ✔.
- 8119d09 cuốn theo 2 dòng của phiên khác trong `giai-thich/noi-dung.ts` (đầu tệp chú thích + `ten` của `menu:/so-do` «Sơ đồ tổ chức»→«Sơ đồ»): **hợp lý** — khớp nhãn menu thật `KhungPhong.tsx:27` `nhan:"Sơ đồ"` (đổi ở b716bc9). **Có sót (luật 43, ⚪)**: còn ~136 chỗ trong `lib/huong-dan` + `lib/giai-thich` nói «Sơ đồ tổ chức» (không tính «Sơ đồ tổ chức dự án» của Cài đặt) trong khi menu tên «Sơ đồ» — vẫn hiểu được, chưa đồng bộ.

### Gói gửi anh Thịnh
- 10 tệp `.patch` (4 của 3004 + 4 của 3003 + `mau-cap-thanh-nhom` + `vong-xanh-duong`): so các dòng `+`/`-` với `git show` của đúng commit — **khớp 10/10** (chỉ khác dòng `---` và chữ ký «-- 2.55.0»).
- Áp thử bằng `git apply --check` + áp thật vào bản `git archive` của cha commit, ngoài kho: **áp sạch 10/10**; 13 tệp kết quả so với HEAD tương ứng (`db19cef`, `946a773`, `8119d09`, `7c88006`) bỏ qua CR: **khớp 13/13**.
- Không có khoá/token/mật khẩu/đường dẫn máy (grep 0 hit trên mọi tệp gói). ⚪ Đầu mỗi patch ghi `From: Admin <dai0982144730@gmail.com>` (email cá nhân của anh Đại) và gói `vong-xanh-duong` kèm 2 dòng «Sơ đồ» của phiên khác — gửi ra ngoài thì nên đổi tên/địa chỉ tác giả hoặc xác nhận không ngại.

---
## CT-421 — commit `421926f`: ghi chú · đường dẫn họp · khách ngoài chỉ người đặt / được mời / quản trị

**Hàm lọc** `locChiTietCuoc` (`thuan.ts:149-153`): giữ nguyên nếu `nd.la_quan_tri` hoặc `c.nguoi_dat === nd.id` hoặc `c.moi.some(m => m.id === nd.id)`; ngược lại `ghi_chu/khach_ngoai/duong_dan = null` + `an_chi_tiet:true`. So sánh `===` trên **mã tài khoản** (cùng cột `identity.nguoi_dung.id` ở cả hai vế) nên không có chuyện hoa/thường; `moi` chỉ gồm người (`phong_hop_moi.nguoi_id`) — mời theo đơn vị/phòng/ban được **bung thành từng người LÚC ĐẶT** (`bungMoi`), nên người trong đơn vị được mời có thấy (đo bên dưới), người vào đơn vị SAU khi đặt thì không. Quản trị = cờ `la_quan_tri` (không phải vai «quản trị» khác, không phải Ban lãnh đạo). Chưa đăng nhập: `batBuocDangNhap` → từ chối trước khi tới hàm lọc.

**Đo thật (bài RAM, gọi `GET /api/phong-hop` bằng chính route, giả phiên):** cuộc do trưởng ĐT&PC đặt, mời `nv.dtpc` + đơn vị `p-ktvh`:
| Người xem | ghi_chu | khach_ngoai | duong_dan | an_chi_tiet |
|---|---|---|---|---|
| người đặt (truong.dtpc) | CÓ | CÓ | CÓ | – |
| người được mời đích danh (nv.dtpc) | CÓ | CÓ | CÓ | – |
| người trong đơn vị được mời (hung.tv, P.KT&VH) | CÓ | CÓ | CÓ | – |
| quản trị (`la_quan_tri`) | CÓ | CÓ | CÓ | – |
| nhân viên Cơ điện (không mời) | null | null | null | true |
| Tổng giám đốc (không mời, không quản trị) | null | null | null | true |
→ khớp ý chốt. Lưu ý (⚪): Tổng giám đốc / Ban lãnh đạo không được mời cũng bị ẩn — đúng chữ «chỉ người đặt, người được mời và quản trị» nhưng anh nên biết.

**Mọi đường trả ba trường (và tên người dự):**
| Đường | Trường lộ | Ai thấy sau 421926f | Đạt ý chốt? |
|---|---|---|---|
| `GET /api/phong-hop` (danh sách/ngày) | cả 3 + `moi[]` | đã lọc ở máy chủ; người dự (tên) hiện cho mọi người đăng nhập (ý chốt cho phép) | ✔ |
| `POST /api/phong-hop` (đặt) | cả 3 | chính người đặt | ✔ |
| `PUT/POST /api/phong-hop/[id]` (sửa, kết thúc sớm) | cả 3 | `duocSua`: chỉ người đặt/quản trị (403 nếu khác) → trả đủ chỉ cho họ | ✔ |
| `DELETE …/[id]` | không trả bản ghi | – | ✔ |
| `GET /api/phong-hop/cua-toi` (chuông + dòng chữ đỏ, cả chuông nhúng 4 agent) | cả 3 | chỉ cuộc MÌNH được mời (`phong_hop_moi.nguoi_id = tôi`) | ✔ |
| `GET/PUT/POST /api/phong-hop/giao-ban` | không (cấu hình + `cuoc` của người lập) | người lập giao ban (đứng tên) | ✔ (⚪ giao ban gửi lại ghi đè `ghi_chu` bằng null — cũ, không phải rò) |
| Chuông tin (`baoNguoiDu`: đổi giờ/huỷ/kết thúc sớm) | chỉ `noi_dung`, phòng, giờ | người dự | ✔ không có 3 trường |
| 409 trùng giờ (`cauTrung`) | `noi_dung` + tên người đặt | mọi người đặt phòng trùng | ✔ (đã cho phép: nội dung/người tổ chức công khai) |
| Telegram / email / xuất tệp / trang chia sẻ / nhật ký audit / Agent quan sát | grep `phong_hop` + `phong-hop` trong `src`, `db`, `scripts`: chỉ 4 route trên + `cong-base.ts` | không có đường nào khác | ✔ |
| Hướng dẫn · giải thích | chỉ chữ mô tả | – | ✔ (hướng dẫn đã cập nhật câu mới) |
| **Cổng MCP `base.lich_hop` (`cong-base.ts` `lichHop`)** | **cả 3 + người dự** | **BẤT KỲ nơi gọi nào có `nguoi=<email>`** | **✗ 🔴** |

### CT-421 🔴 Cổng `base.lich_hop` không bị 421926f chặn — lộ ghi chú · đường dẫn · khách ngoài của người bất kỳ
`cong-base.ts:942-973` lấy `nguoi` (email) từ tham số rồi gọi `hopCuaToi(q, nd.id)` và trả `ghi_chu` (cắt 200 ký tự), `duong_dan_hop`, `khach_ngoai`, `nguoi_du`. **Không dùng `ma_nguoi_dung`** (tham số thứ 3 của `chayCongCu` bị `lichHop(thamSo)` bỏ qua), không kiểm người hỏi = `nguoi`. Đo (bài RAM, `chayCongCu("base.lich_hop",{nguoi: nv}, ma)`): với `ma_nguoi_dung` bỏ trống **và** với `ma_nguoi_dung` = nhân viên Cơ điện (người không được mời) đều trả đủ `GHICHU-BI-MAT` · `KHACH-BI-MAT` · `https://meet.example/BI-MAT`. Main chặn ở phía Main (`4-agent-main/src/lib/ai/chat-tools.ts:372` `if (name === "base_lich_hop") ts.nguoi = ctx.email`), nhưng cổng `/api/mcp/base` nhận lời gọi từ mọi agent có trong ma trận (hoặc mã lạ kèm khoá nội bộ), chỉ chặn bằng localhost + ma trận, nên agent khác hoặc bài đo gọi thẳng vẫn xem được lịch họp, ghi chú, khách ngoài của AI cũng được. Hiện chỉ Main gọi `base.lich_hop` (grep 5 agent) nên rủi ro thực tế thấp, nhưng đúng là ý chốt «chỉ người đặt/được mời/quản trị» chưa đóng ở cổng. Đề xuất một câu: trong `lichHop`, bắt buộc `ma_nguoi_dung` = mã của `nguoi` (hoặc quản trị) mới trả 3 trường; nếu không thì cắt như `locChiTietCuoc` (dùng chính hàm đó với nd giả = người hỏi).
**Ngoài ra (⚪ nhưng quan trọng khi gói):** `base.lich_hop` và bài `tests/unit/lich-hop-mcp-26-10.test.ts` CHƯA nằm trong HEAD `421926f` (chỉ có ở cây làm việc, `git status`: ` M cong-base.ts`, `?? lich-hop-mcp-26-10.test.ts`) — khi đóng lỗ này nhớ commit cả hai; bài đó chưa có ca «người hỏi khác người được hỏi».

### CT-421b 🟡 Bài kiểm của 421926f chỉ phủ hàm thuần; route không có bài
`phong-hop-25-10.test.ts` thêm 1 bài `locChiTietCuoc` (người ngoài mất 3 trường + `an_chi_tiet`; người đặt / được mời / quản trị trả đúng đối tượng cũ `toBe(c)`). Đột biến (suy từ bài, không sửa mã được): bỏ nhánh quản trị → bài thứ 3 trong vòng `for` đỏ; bỏ `nguoi_dat` → vòng 1 đỏ; bỏ `moi.some` → vòng 2 đỏ; đảo điều kiện / quên một trường → `toMatchObject` bắt (cả 3 trường + cờ); **không bắt được**: bỏ `.map(locChiTietCuoc)` ở `route.ts:25` (không bài nào gọi route; tôi tự gọi route ở bài thử tạm bên trên và nó đạt, nhưng đó là bài của tôi, đã xoá). Chạy: 15/15 đạt. Đề xuất: thêm bài gọi `GET` với phiên giả như tôi (khoảng 20 dòng) và bài cho `lichHop`.

### CT-421c ⚪ Không đo sống được 421926f
Phiên «2 Agent Công việc» nói 3004 chưa dựng lại cho commit này — đúng lệnh cấm, đã kiểm bằng mã + bài RAM, không đo sống.

---
## Trả lời từng điểm tự nghi giao cho tôi
| # | Kết luận |
|---|---|
| N4 | Đúng nghi một phần: luôn trả bản cũ ✔, không hết hạn (đo 6 giờ vẫn trả); giờ lấy số chỉ ghi >5 phút trên chú giải; **chưa đủ** — CT-12, CT-2, CT-3 |
| N5 | Màn Dự án không chờ (✔); API danh sách chờ chậm nhất (≤20 s/trang, không hạn tổng) — CT-13; icon mất âm thầm khi 3003 tắt — CT-5 |
| N6 | Đúng — CT-10 (✔); lệch nhãn C2/C3 — CT-4 |
| N7 | Khớp phần chính; 4 lệch ⚪ — CT-8 |
| N8 | Khớp thứ tự; thiếu số ngày ở «Thực tế» — CT-1; thiếu 3 dòng phụ — CT-9 |
| N9 | Chưa lọc theo dự án/vai, không có đồng nào — CT-7 |
| N10 | Đúng nghi; lọt hẹp, không mất dữ liệu — CT-6 |
| N11 | Không tự gây vòng vẽ lại (tính 6 cỡ, ổn định); đo trình duyệt chưa đo được — mục N11 |
| N12 | Khớp ảnh 1295×1215, ô bấm P01/P03/P09 đúng; phòng mới không lẫn |
| N13 | Không bị CSS đè (không có rule `.vong-xanh-duong`) |
Thước T1 ✔ (CT-11) · T3 (vạch/màu) ✔ trừ CT-8 · T5 ✔ (tam giác cả hai bên) · T6 hiển thị ✔ (nét xám, dự báo từ hôm nay) · T8 ✔ · T10 tính ✔, đo sống chưa được.

## Chưa đo được
Đo sống 3004 (3 GET danh sách + mở bảng, MutationObserver, 1366×768 và 1920×1080, tải thử «Tải file» xlsx, hover thật) — không có tài khoản thử ở 3004; bắn 3 lỗi liền khiến ngắt mạch thật (CT-3) — cấm tắt 3003; `tests/unit/so-do-*` đủ 97 (xem bảng số chạy); kết quả `421926f` trên bản đang chạy — chưa dựng lại.

## Xác nhận các điều cấm
Không tắt/khởi động/dựng lại 3004 hoặc 3003, không `next build`; không động `data/` (`BT.json` nguyên), không mở `pgdata`; chỉ DB RAM; không Telegram, không đọc `.env.local`, không gọi AI/`claude`; cổng 3003 chỉ ĐỌC 1 lần (`bang_gantt` HV, `agent_goi=base`, gửi bằng tệp UTF-8); 1 lần thử đăng nhập 3004 bằng tài khoản thử đã biết, không tạo tài khoản, không tự ký cookie; không sửa/commit/stash/checkout; bài thử tạm trong `tests/unit/kiem-doc-lap-tmp-ct*.test.ts` đã `rm`, `git status` không còn; bản `git archive` áp patch ở `K\tam-ct\ap-*` (ngoài kho, không có junction).

## Kết luận
**ĐẠT CÓ ĐIỀU KIỆN**: 1 🔴 (CT-421: cổng `base.lich_hop`), 6 🟡 (CT-1…5, CT-421b), phần còn lại ⚪.


---

# PHỤ LỤC 3 — MC: Main câu báo + chuông nhúng

# MC — Kiểm lần 8: Main câu báo T9 + N14 + chuông nhúng 4 agent (26/10/2026 tối)

Phạm vi: M = `4-agent-main` commit `d8e984e` `ff29012` `f712e97`; chuông nhúng `5824061` `a5adacf` `5dacce3` `1a79471` `0690748`.
Đo trên cây làm việc lúc 20:15–20:40 (HEAD Main lúc đo đã nhảy `91d7ef8` → `48c09c8` do phiên khác gom commit; phần T9 không đổi).
Tệp thử: `K/tam-mc/` (bài thử tạm trong `tests/unit/kiem-doc-lap-tmp-*` đã `rm`, `git status` sạch phần của tôi; thư mục đột biến `tam-mc/mut` = bản `git archive`, junction node_modules đã gỡ bằng `rmdir`).

## 0. Kết quả tsc / vitest (chỉ tôi chạy ở kho M)

| Lệnh | Kết quả |
|---|---|
| `npx tsc --noEmit -p .` (M) | exit 0, không in lỗi |
| `vitest run` cả bộ (M) | 91 tệp: 87 qua, 4 trượt · 1067 bài qua, 7 trượt, 2 bỏ qua |
| Trượt "có sẵn" khớp danh sách đề | bao-cao-thang ×3 (bài 59, 61, 71) · quyen ×2 · so-lenh `/alerts` G1 |
| Trượt THÊM 1 bài | `vong-nen-con-tro-main` «nhịp báo cáo sáng» — hết 5000 ms. Chạy riêng cùng 3 tệp liên quan: 4 tệp / 49 bài qua → **thất thường do tải song song, không liên quan hoi-agent/ngắt mạch** |
| `nguon-tien-do.test.ts` riêng | **22/22** (đúng đề «ngắt mạch 22/22»); thêm `bo-nho-hoi` + `so-ban-2` + `nguon-tien-do` = 47/47 |

Không bài nào chứa chữ cũ «Đã bật chưa» (Main). Bài duy nhất so «Thử lại sau» (nguon-tien-do.test.ts:313) đã đổi theo câu mới.

## 1. T9 + luật 37 (N14)

### 1.1 Câu báo mới nằm ở đâu

| Nơi | Tệp:dòng | Câu |
|---|---|---|
| Ngắt mạch đang mở — đường `hoiAgent` (chat, báo cáo sáng, mâu thuẫn chéo…) | `src/lib/nguon/hoi-agent.ts:325-329` | «<tên> đang tắt hoặc đang được khởi động lại (đã hỏng 3 lần liên tiếp). Máy tự thử lại sau HH:mm:ss — hỏi lại sau giờ đó.» |
| Cổng không nối được — đường `hoiAgent` | `hoi-agent.ts:228-232` | «Không nối được tới <tên> ở <địa chỉ+đường dẫn> — agent đang tắt hoặc đang được khởi động lại (thường vài phút). Tắt lâu thì kiểm địa chỉ ở Danh bạ agent.» |
| Ngắt mạch đang mở — đường `hoiTienDo` (Bảng điều hành) | `src/lib/nguon-tien-do.ts:261-267` | cùng khuôn câu ngắt mạch |
| Cổng không nối được — đường `hoiTienDo` | `nguon-tien-do.ts:229-232` | **vẫn chữ CŨ**: «Không nối được tới agent tiến độ tại http://127.0.0.1:3003. Đã bật chưa? Địa chỉ khai ở Cài đặt → Danh bạ agent.» |

### 1.2 Bảng nơi · chữ so khớp · còn đúng? (N14, luật 37)

| Nơi (tệp:dòng) | Chữ so khớp / phân tích | Còn đúng với câu mới? |
|---|---|---|
| `4-agent-main/src/lib/telegram-tro-ly/thuan.ts:236` `RE_CAU_SU_VIEC` | `chưa có số liệu\|không trả lời\|không nối được\|không phản hồi\|đang tắt\|tạm không` — dùng ở :323 để GIỮ dòng báo lỗi dù có địa chỉ máy | ✔ khớp «không nối được» và «đang tắt». Câu ngắt mạch CŨ («đã hỏng… Thử lại sau») KHÔNG khớp → câu mới còn tốt hơn. Nhưng xem MC-05 (còn sót «ở — …») |
| `thuan.ts:231-235` `RE_CONG_CU_MAY`, `RE_MAY_CUC_BO`, `RE_CAI_DAT_KET_NOI` | cắt tên công cụ máy, localhost, «Cài đặt → Kết nối» | ✔ không phụ thuộc chữ cũ/mới; câu mới dùng «Danh bạ agent» nên KHÔNG bị `RE_CAI_DAT_KET_NOI` cắt (xem MC-05) |
| `4-agent-main/src/lib/ai/chat-agent.ts:316` luật V3 | «Agent KHÔNG THƯA (… ngắt mạch) → MỘT dòng “Agent X đang tạm không trả lời — bạn hỏi lại sau ít phút.”» | Không so khớp chữ, nhưng **ép AI nén câu**: người dùng ở chat/Telegram không bao giờ thấy «đang tắt / khởi động lại» hay giờ thử lại → xem MC-02 |
| `chat-tools.ts:304` | ghép `${kq.ma_loi}: ${kq.thong_diep}` cho AI | ✔ không so khớp; nhưng đưa tên công cụ máy + mã lỗi + địa chỉ vào bối cảnh AI (đã có lưới ở thuan.ts) |
| `bang-dieu-hanh/gom.ts:69` `cauChuaCoSo` | chỉ đặc biệt hoá `HET_HAN_CHO`; mã khác in thẳng `thong_diep` | ✔ chạy; kết quả «Chưa lấy được từ Agent Tiến độ — Agent Tiến độ đang tắt…» lặp tên 2 lần (MC-06) |
| `bang-dieu-hanh/mau-thuan-cheo.ts:244,269,390,474` · `nguon/bo-nho-hoi.ts:122` | so theo `ma_loi === "AGENT_KHONG_SAN_SANG"` | ✔ theo MÃ, không theo chữ |
| `bao-cao-sang/dung.ts:262` | `/chưa có tiến độ/i` | ✔ không liên quan câu mới |
| `5-Agent-tien-do/src/app/api/auth/change-password/route.ts:33` | `ma_loi === AGENT_KHONG_SAN_SANG \|\| /không thưa\|kết nối\|timeout/i` | ✔ nhánh đầu theo mã nên đủ |
| `3-agent-phap-ly-code/lib/baseline-tien-do.ts:103`, `dung-danh-muc-ai.ts:63` | `/Không nối được/.test(kq.loi)` | ✔ nhưng `kq.loi` là câu của **hàm bọc Pháp lý** (`mcp/goi-co-ghi.ts:138` «Không nối được <agent> tại <url>»), không phải câu Main → không dính |
| `3-agent-phap-ly-code/scripts/test-cong-mcp.ts:175` | `startsWith("không có công cụ…")` | ✔ không liên quan |
| `4-agent-main/src/lib/so-do-keo.ts:158` | `includes("không có công cụ")` | ✔ không liên quan |
| `0-agent-quan-sat` (ngắt mạch: `luat-code/model.ts:369`, bài `luat-code.test.ts:140`) | đếm DÒNG sổ `ngat_mach`, «không suy từ chuỗi lỗi» | ✔ không phụ thuộc chữ |
| `0-agent-quan-sat/src/lib/so-quan-sat/tra-loi-gon.ts:34` | ghi `khong-co · <mã> · <câu>` rồi `.slice(0,200)` | ✔; câu «không nối được» mới ≈ 175 ký tự + 34 tiền tố ≈ 209 → cắt mất đuôi «Danh bạ agent.» trong sổ (⚪ vô hại, phần «đang tắt» nằm trong 200 đầu) |
| `D:\3 SETUP\1 AI\SCI Tiến độ\GAC-5-AGENT.ps1` | không đọc câu Main; gác theo cổng/404/BUILD_ID | ✔ không phụ thuộc |
| `4-agent-main/src/lib/kiem-thu/noi-dung-chung.ts:142` (màn kiểm thử E-05) | mong đợi «kèm câu “Thử lại sau HH:mm”» | ✘ lệch chữ — luật 43 (MC-04) |
| Tài liệu cũ: `HUONG-DAN-DUNG.md:488`, `BAI-TEST-NGUOI-DUNG.md:151`, `KE-HOACH/05-CACH-TEST.md:143` | mô tả «kèm câu Thử lại sau» | ⚪ tài liệu, lệch nhẹ |
| `1-agent-base/src/lib/nguon-tien-do.ts:202,235` · `2-agent-hop-dong/src/lib/nguon-tien-do.ts:214,247` · `6-Agent-cong-viec/CodeSCICongViec/src/lib/nguon-tien-do.ts:199,232` + bài `…/tests/unit/nguon-tien-do.test.ts:312` | bản chép riêng của cùng lớp cách ly, còn «Đã bật chưa? / Thử lại sau» | Không vỡ (mỗi bài so câu của chính nó) nhưng **lệch chữ giữa agent** — luật 7 (MC-07) |

Kết luận N14: **không nơi nào so khớp chữ cũ rồi bị vỡ**; hai nơi máy đọc chữ (Telegram `RE_CAU_SU_VIEC`, Pháp lý `/Không nối được/`) vẫn khớp chữ mới. Cái sót là (a) nửa vời trong chính `nguon-tien-do.ts` và (b) chữ hướng dẫn kiểm thử.

### 1.3 Hành vi — «đang tắt» vs «đang khởi động lại» do đâu phân biệt? Đo bằng `fetch` giả (bài tạm, đã xoá)

**Không phân biệt gì cả**: mã không đọc sổ gác, không đọc trạng thái tiến trình, không xét mã lỗi kết nối; mọi lỗi «không nối được» và mọi lần mở ngắt mạch đều in cùng câu «đang tắt hoặc đang được khởi động lại». Kết quả đo (tệp ra `K/tam-mc/mc-ra.txt`, `mc-ra3.txt`):

| Ca | Mã trả | Câu (rút) | Đúng? |
|---|---|---|---|
| ECONNREFUSED (cổng không nghe) | AGENT_KHONG_SAN_SANG | «Không nối được tới Agent Tiến độ ở http://127.0.0.1:3003/api/mcp/tiendo — agent đang tắt hoặc đang được khởi động lại (thường vài phút)…» | ✔ đúng ca; ✘ lộ địa chỉ localhost (MC-03) |
| Nghe nhưng chậm (treo tới hết hạn) | HET_HAN_CHO | «Agent Tiến độ không trả lời trong 1 giây.» | ✔ không nói oan là tắt |
| 500 HTML | AGENT_KHONG_SAN_SANG | «Cổng … trả mã 500 kèm trang text/html… kiểm cổng ở Danh bạ agent» | ✔ |
| 404 HTML (bộ đệm dev hỏng) | AGENT_KHONG_SAN_SANG | «…bộ đệm dev… cần khởi động lại agent đó» | ✔ |
| 200 JSON `{}` | LOI_NOI_BO | «Cổng … trả khuôn lạ, không có trường ok» | ✔ |
| 401/403 JSON KHONG_CO_QUYEN | KHONG_CO_QUYEN | câu của agent | ✔ lượt đơn; xem dòng dưới |
| Mở ngắt mạch (3 lỗi) rồi lượt 4 | AGENT_KHONG_SAN_SANG | «Agent Tiến độ đang tắt hoặc đang được khởi động lại (đã hỏng 3 lần liên tiếp). Máy tự thử lại sau 20:27:24 — hỏi lại sau giờ đó.» | ✔ khi nguyên nhân là tắt |
| Mở ngắt mạch vì **3 lần HẾT HẠN** (agent chỉ chậm/bận) | AGENT_KHONG_SAN_SANG | cùng câu «đang tắt hoặc đang được khởi động lại» | ✘ nói oan (MC-01) |
| Mở ngắt mạch vì **3 lần 404 HTML** | idem | idem | ⚠ «khởi động lại» đúng, «tắt» sai |
| Mở ngắt mạch vì **3 lần KHONG_CO_QUYEN** (agent sống, chỉ từ chối người xem) | idem | idem | ✘ nói oan + khoá agent 10 phút cho MỌI người (MC-01) |
| Ngắt mạch: t+9:59 | vẫn mở | cùng câu, cùng giờ 20:27:24 | ✔ |
| t+10:01 (lượt thăm dò, agent vẫn tắt) | AGENT_KHONG_SAN_SANG | câu «Không nối được…»; mạch mở lại tới +10 phút (20:37:25) | ✔ |
| t+20:05, agent sống lại | ok | `dangNgat:false`, `moLaiLuc:null` | ✔ đóng lại đúng |
| 5 agent tắt cùng lúc (tiendo, phaply, hopdong, nghiemthu) | mỗi con một mạch riêng | 4 câu rời, cùng khuôn, giờ lệch nhau theo con | ✔ riêng từng con; **không gộp** (MC-06) |
| `hoiTienDo` (đường Bảng điều hành) lượt 1 | AGENT_KHONG_SAN_SANG | «Không nối được tới agent tiến độ tại http://127.0.0.1:3003. **Đã bật chưa?** …» | ✘ chữ cũ còn (MC-03) |
| `hoiTienDo` lượt 4 | idem | câu ngắt mạch mới | ✔ |

Đo thật trong sổ `4-agent-main/data/nhat-ky-hoi-agent.jsonl` (48.597 dòng): 97 lần ngắt mạch mở; ba lỗi ngay trước: 74 lần toàn AGENT_KHONG_SAN_SANG, 23 lần có HET_HAN_CHO (chậm), 0 lần KHONG_CO_QUYEN (sổ có 39 dòng quyền nhưng chưa lần nào đủ 3 liền). → **~24% lần mở ngắt mạch thật là do agent chậm, không phải tắt**, câu mới vẫn nói «đang tắt».

Luật 29: lượt thật vẫn qua `goiCoGhi` (hoi-agent.ts:337-350, nguon-tien-do.ts hoiTienDoCoGhi); lượt bị ngắt mạch trả sớm không ghi sổ (như trước, ghi bằng sự kiện mở/đóng). ✔ không đổi.
Luật 30/36: câu không chứa mã trần, không nhắc nhanh/chậm. ✔. Luật 44: giờ `toLocaleTimeString("vi-VN")` theo múi giờ máy chủ (không ép +7) — máy này là VN nên đúng, ⚪.

## 2. Bài kiểm mới — đột biến (bản `git archive` HEAD, chạy `nguon-tien-do` + `bo-nho-hoi` + `so-ban-2` = 47 bài)

Biểu thức bài (`nguon-tien-do.test.ts:313`, bản `f712e97`): `/đang tắt hoặc đang được khởi động lại.*thử lại sau \d/`. `ff29012` lỡ mất `\` (thành `sau d`, sẽ KHÔNG khớp «sau 20:27») — `f712e97` đã sửa, đọc byte tệp thấy `\d` nguyên. Chỉ kiểm đường `hoiTienDo`.

| # | Đột biến | Kết quả |
|---|---|---|
| M0 | không đổi | 47 qua |
| M1 | `Máy tự thử lại sau` → `Thử lại sau` (nguon-tien-do.ts) | **bắt** (1 trượt) |
| M2 | bỏ «đang tắt hoặc đang được khởi động lại» (nguon-tien-do.ts) | **bắt** |
| M3 | nghỉ 10 phút → 1 phút (nguon-tien-do.ts) | **SỐNG** — không bài nào đo thời gian nghỉ ở đường này |
| M4 | ngưỡng 3 → 5 (nguon-tien-do.ts) | bắt (3 trượt) |
| M5 | nguon-tien-do.ts câu nối: bỏ «Đã bật chưa?» | **SỐNG** — không bài so câu «không nối được» |
| M6 | hoi-agent.ts câu ngắt mạch: bỏ «đang tắt hoặc… khởi động lại» | **SỐNG** — không bài nào so chữ ở hoi-agent.ts |
| M7 | hoi-agent.ts câu nối: trả «Đã bật chưa?» | **SỐNG** |
| M8 | hoi-agent.ts nghỉ 10 → 1 phút | bắt (1 trượt) |
| M9 | hoi-agent.ts ngưỡng 3 → 5 | bắt (1 trượt) |
| M10 | hoi-agent.ts bỏ thử lại khi HẾT HẠN | **SỐNG** |

→ Phần T9 trong `hoi-agent.ts` (đường chính của chat/báo cáo sáng/mâu thuẫn chéo) **không có bài nào** giữ chữ (MC-08).

## 3. Chuông nhúng 4 agent

| Việc | Đo | Kết quả |
|---|---|---|
| `git show --stat` | 5 commit cùng phút 19:01:45–46 25/10, mỗi kho 1 tệp, +39 −11 | ✔ |
| So diff | `ChuongCongViec.tsx` Main · Tiến độ · Hợp đồng · Nghiệm thu: diff sinh ra băm **9986a0fc…giống hệt**, và tệp tại HEAD cùng băm `e07e8494eff6`. Pháp lý (`components/ChuongCongViec.tsx`) khác đúng 2 chỗ: kiểu viết style (inline thay Tailwind `relative shrink-0`) và 1 dòng chú thích bị xoá | ✔ luật 7: logic tính khoảng trống giống nhau 5/5 |
| Hằng «hệ số co 1000» | `grep "0 1000"` trong 6 kho: không còn chỗ nào | ✔ |
| Tệp trùng tên | `nut-tren.css` 5 kho băm khác nhau (`5d11ea…`, `41dba2…`, `41aaa8…`, `38d18c…`, `a746227…`) — không thuộc commit này, mỗi agent có bản riêng từ trước | ⚪ ghi nhận |
| Vòng đo có điều kiện dừng | `useLayoutEffect(..., [rong, song, goc])`; `setRongDung` không nằm trong deps; đặt cùng giá trị thì React bỏ qua → **không tự gây vòng vẽ lại**. Hẹn 1 lần 1500 ms + `resize`. Đo bằng cách đặt tạm `width=40` rồi trả `cu` ngay trong cùng đồng bộ → không có khung hình giữa → không chớp | ✔ (đọc mã; chưa thử trình duyệt theo lệnh cấm) |
| Rò quyền | commit chỉ đo bố cục; nội dung chuông lấy từ iframe `${goc}/nhung/chuong` bằng cookie người dùng; bắt `postMessage` có `e.origin !== nguon` và kẹp `rong` 0–400 | ✔ phạm vi này không mở thêm gì. «Chuông hiện cuộc họp của ai» nằm ở 3004 (phần trợ lý 3004) |
| Luật 10 | tệp `"use client"`, chỉ import `react` + `@/components/huong-dan/kho-huong-dan` (có `KhaiHuongDan` ở cả 4 kho; Pháp lý có `huong-dan/kho-huong-dan.ts`) — không node:fs | ✔ |
| Thanh trên | cả 5 kho đều có thẻ `<header>` (`closest("header")` hợp lệ); Main/Tiến độ/Hợp đồng/Nghiệm thu: nhóm trái `shrink-0` + nhóm phải `shrink-0` + `justify-between` → khoảng trống = phần tự do giữa hai nhóm, đo đúng | ✔ |
| Cây làm việc | cả 5 kho còn thay đổi chưa commit ở tệp này (thêm `?theme=` + MutationObserver) — của phiên khác, Main đã được gom vào `48c09c8`; 4 bản cây làm việc cùng băm `3bd63ad7e16e` | ⚪ không thuộc commit đề |

Rủi ro đọc mã: MC-09 (mất tính tự co vì bỏ `flex 0 1000`; đo chỉ ở lúc vào, +1,5 s, `resize`).

## 4. Phát hiện

| Mã | Mức | Tệp:dòng | Thấy gì · đo | Đề xuất |
|---|---|---|---|---|
| MC-01 | 🟡 | `hoi-agent.ts:325-329`, `nguon-tien-do.ts:262-268`; `hoi-agent.ts:109` `laLoiHong` | Câu ngắt mạch khẳng định «đang tắt hoặc đang được khởi động lại» **bất kể nguyên nhân**: 3 lần HẾT HẠN (agent chậm) → vẫn nói tắt (đo bài thử + sổ thật: 23/97 lần mở là do chậm); 3 lần 404 HTML; 3 lần KHONG_CO_QUYEN (bài thử: lượt 4 thành AGENT_KHONG_SAN_SANG «đang tắt…», mạch mở tới 20:33:49, fetch chỉ gọi 3 lần) → khoá cả agent đang SỐNG cho mọi người 10 phút. Trước T9 câu còn trung tính («đã hỏng 3 lần») nay nói sai sự thật | Lưu `maLoiCuoi` trong `TrangThaiMach`; chỉ nói «đang tắt hoặc đang khởi động lại» khi lỗi gần nhất là kết nối/404-HTML; HẾT HẠN → «đang bận, chưa trả lời kịp»; và cân nhắc KHONG_CO_QUYEN không tính vào đếm hỏng |
| MC-02 | 🟡 | `chat-agent.ts:316` (V3) | Luật V3 ép AI trả «Agent X đang tạm không trả lời — bạn hỏi lại sau ít phút.» cho mọi ca ngắt mạch → ở chat web và Telegram (nơi anh Đại đọc) **không bao giờ hiện «đang tắt / khởi động lại» hay giờ thử lại**; câu T9 chỉ lộ ở Bảng điều hành, báo cáo sáng, mâu thuẫn chéo | Hỏi anh: muốn chat cũng nói «đang tắt/khởi động lại, thử lại sau HH:mm» thì sửa V3; nếu không, ghi rõ T9 chỉ cho màn tổng hợp |
| MC-03 | 🟡 | `nguon-tien-do.ts:229-232` ; `hoi-agent.ts:230-232` | T9 làm nửa vời: đường `hoiTienDo` (Bảng điều hành, mâu thuẫn chéo, tìm đầu việc) lượt ĐẦU khi cổng chết vẫn in «…tại http://127.0.0.1:3003. Đã bật chưa?…» (bài thử `TD lượt1`). Cả hai đường còn in địa chỉ `http://127.0.0.1:300x/api/mcp/…` ra màn (trái dặn «không localhost» dành cho người đọc) | Đổi cùng khuôn ở `nguon-tien-do.ts:231` và bỏ địa chỉ khỏi chữ hiện (giữ ở trường kỹ thuật / sổ) |
| MC-04 | 🟡 | `kiem-thu/noi-dung-chung.ts:142` | Màn kiểm thử E-05 còn mong đợi «Thử lại sau HH:mm» — người test sẽ thấy câu khác (luật 43 grep hướng dẫn khi đổi chữ) | Sửa thành «Máy tự thử lại sau HH:mm — hỏi lại sau giờ đó» |
| MC-05 | ⚪ | `telegram-tro-ly/thuan.ts:323-329` | Đo `gonChoTelegram` với câu mới «Không nối được tới X ở http://127.0.0.1:3003/api/mcp/tiendo — agent đang tắt…»: ra «Không nối được tới Agent Tiến độ ở — agent đang tắt hoặc… Tắt lâu thì kiểm địa chỉ ở Danh bạ agent.» (thừa «ở —», còn chỉ dẫn máy). Câu ngắt mạch ra nguyên vẹn, tốt | Hết khi bỏ địa chỉ khỏi chữ (MC-03) |
| MC-06 | ⚪ | `gom.ts:69` | Nhiều agent tắt: mỗi con một câu dài, không gộp; Bảng điều hành thành «Chưa lấy được từ Agent Tiến độ — Agent Tiến độ đang tắt… (đã hỏng 3 lần liên tiếp)…» lặp tên, lộ «hỏng 3 lần liên tiếp» cho người chỉ hỏi 1 lần | Rút gọn: bỏ tên lặp, bỏ «đã hỏng N lần» khỏi câu hiện cho người |
| MC-07 | ⚪ | `2-agent-hop-dong/src/lib/nguon-tien-do.ts:214,247`, `6-Agent-cong-viec/…/nguon-tien-do.ts:199,232`, `1-agent-base/…` | Cùng lớp cách ly bản chép riêng còn câu cũ; Main nay khác 3 bản (luật 7) | Hỏi anh có áp T9 cho Hợp đồng/Công việc không |
| MC-08 | 🟡 | `tests/unit/nguon-tien-do.test.ts:313`; không có bài cho `hoi-agent.ts` | Bài T9 chỉ phủ đường `hoiTienDo`; đột biến M3, M5, M6, M7, M10 sống → đổi chữ/giờ nghỉ ở `hoi-agent.ts` không bài nào bắt | Thêm 1 bài `hoi-agent`: câu ngắt mạch có «đang tắt hoặc… sau \d» + câu ECONNREFUSED + 10 phút (bằng `vi.setSystemTime`) |
| MC-09 | 🟡 | `ChuongCongViec.tsx` (5 kho) `useLayoutEffect` khối đo | Bỏ `flex: 0 1000` → chuông `shrink-0` cố định; đo lại chỉ ở lúc vào, +1,5 s, `resize`, `rong` đổi. Nhóm phải thanh trên (ProjectSwitcher, tên người, nút) nạp trễ sau 1,5 s mà không có `resize` thì tổng chiều rộng vượt → hai nhóm đều `shrink-0` → tràn, đẩy nút ra mép. **Chưa đo trên trình duyệt** (lệnh cấm), dựa trên đọc mã | `ResizeObserver` trên nhóm phải (hoặc `<header>`) gọi lại `doCho` (không loop vì chỉ quan sát phần tử không nằm trong khung chuông) |
| MC-10 | ⚪ | `ChuongCongViec.tsx` đo | `querySelectorAll("*")` trong header mỗi lần `resize` không giảm tần (không throttle); phần tử `opacity:0` vẫn tính là «nút kế bên» | Throttle 1 khung hình / bỏ phần tử `visibility/opacity` ẩn |
| MC-11 | ⚪ | `hoi-agent.ts:325` | Câu nói «Máy tự thử lại sau HH:mm» nhưng không có bộ hẹn: chỉ lượt hỏi kế tiếp sau mốc đó mới thử (đúng như «hỏi lại sau giờ đó» chữa). Ngoài ra nghỉ 10 phút > «thường vài phút»: 3004 tắt ~4 phút vẫn bị báo «đang tắt» tới ~6 phút sau khi đã sống lại | Thăm dò nhẹ `suc_khoe` (3 s) mỗi 60 s để đóng sớm, hoặc giữ nguyên và sửa chữ «tối đa 10 phút» |

✔ Đúng (không phải phát hiện): `\d` trong bài đã nguyên; ngắt mạch mở/đóng/thăm dò đúng giờ; mỗi agent một mạch; luật 29 còn qua `goiCoGhi`; không nơi nào vỡ vì đổi chữ; tsc sạch; 4/5 bản chuông giống hệt; vòng đo không tự lặp.

## 5. Trả lời N14 và thước

| Mục | Kết luận |
|---|---|
| N14 | **Không sao** về so khớp chữ (bảng 1.2: 0 nơi vỡ; Telegram `RE_CAU_SU_VIEC` khớp chữ mới tốt hơn chữ cũ). **Đúng nghi một phần**: còn câu cũ ở `nguon-tien-do.ts:231` và hướng dẫn kiểm thử E-05 (MC-03, MC-04) |
| T9 | **Đạt có điều kiện**: câu mới đúng khi nguyên nhân là tắt/khởi động; không phân biệt «tắt» và «khởi động lại» (cùng một câu «A hoặc B»); nói sai ở ca chậm/quyền (MC-01); chat/Telegram không hiện (MC-02) |
| Chuông nhúng (kiểm lại nhanh) | Giống nhau 5/5, không rò quyền, không tự lặp; rủi ro tràn khi nút nạp trễ (MC-09) chưa đo được |

## Chưa đo được
- Chuông nhúng trên trình duyệt thật 1366/1920 (cấm động tới 3004, trình duyệt dành cho trợ lý 3004) → MC-09 chỉ là suy từ mã.
- Sự khác nhau «tắt» và «khởi động lại» theo sổ gác `GAC-5-AGENT.ps1` — mã Main không đọc nó nên không đo hành vi phân biệt (không tồn tại).

## Xác nhận điều cấm
Không đụng tiến trình/cổng 3004, không `next build`/`next start`/`taskkill`; không tắt/mở cổng nào; không gửi Telegram thật, không đọc `.env.local`, không gọi AI thật (mọi `fetch` thay giả); không mở `pgdata` (bài chạy trên bản sao `data/` của vitest); không gọi cổng MCP 3003; không commit/checkout/stash/add; bài thử tạm trong kho M đã `rm` (`ls tests/unit | grep kiem-doc-lap-tmp` = 0); `tam-mc/mut` ngoài kho, junction đã `rmdir`, `node_modules` gốc còn nguyên.
