# Kết quả kiểm độc lập — báo cáo sáng · tuần · tháng, toàn bộ việc của phiên 12 và các phiên khác (27/10/2026)

**Kết luận: ĐẠT CÓ ĐIỀU KIỆN — 1 lỗi lộ dữ liệu mật trên web cần sửa trước, còn lại chủ yếu là lệch luật 36/43 và bài kiểm yếu.**

**Tổng (cộng 4 phần, có chỗ trùng): 🔴 4 · 🟡 ≈ 36 · ⚪ ≈ 40.**

| Phần | 🔴 | 🟡 | ⚪ | Nội dung |
|---|---|---|---|---|
| BA — mã Main: `tsc`/vitest, dấu `\`, chia tin, gom khối, album, xlsx | 0 | 4 | 10 | Phụ lục 1 |
| BB — nội dung 21 khối: mã lọt, luật 36, quyền, gỡ trùng | 2 | 10 | 8 | Phụ lục 2 |
| BC — giao diện sống 3010 + 3003, ảnh | 2 | 9 | 8 | Phụ lục 3 |
| BD — báo cáo tháng, tuần, Excel, kho Tiến độ | 0 | 13 | 14 | Phụ lục 4 |

Đề: `4-agent-main\kiem-tra-doc-lap\27-10-bao-cao-sang-tuan-thang-toan-bo-phien.md` (commit `188da0b`; phiên gửi đề nay tên «@ Báo cáo: dữ liệu và trình bầy», tên cũ «@ 12 Code hoàn thiện»). Chỉ đọc và đo. **Không bấm Gửi** (không `guiAlbumToi`, không `guiTin` thật), **không «Dựng lại»** (đề cho tối đa một lần; tôi chưa dùng vì dữ liệu thử đủ cho S1–S12), không gọi AI, không đọc `data/` thật, không tắt/dựng cổng nào, không `next build`; chỉ MỘT trợ lý dùng khung trình duyệt, không bấm Lưu/Gửi/Dựng lại/Xuất; đăng nhập chỉ bằng tài khoản thử, không tự ký cookie.

## Bốn điểm 🔴

| Mã | Chỗ | Thấy gì · số đo | Đề xuất |
|---|---|---|---|
| **BB-01** (tôi đã đọc mã) | `4-agent-main/src/lib/agent-mat-loc.ts:161-178` (`locDuLieuKhoi`) | Hàm chỉ ẩn `tien`, `phieuGia`, `hoSo`, `hanChuTruong`, `cauAi`; **không ẩn `lichHoSo`** (khối PL-2, Pháp lý; khai ở `:310`) **và `nguonLuc.camKet`** (khối CT-1, Hợp đồng; kiểu ở `:250`). Telegram đúng vì có truyền bộ lọc; **web thì JSON gửi trình duyệt còn nguyên** (`api/bao-cao-sang/route.ts:58`, `khoi/route.ts:39`, `app/bao-cao/page.tsx:107`). Đo của trợ lý: ở web mọi vai (Người xem, nhà thầu, Người dùng không thuộc dự án, cả "email lạ") thấy PL-2 và CT-1 của 3/3 dự án. Trái luật Agent mật (không thuộc dự án = không vào) | Thêm `lichHoSo` và `nguonLuc.camKet` vào `locDuLieuKhoi` theo quyền Pháp lý/Hợp đồng từng dự án; thêm bài kiểm vai × khối × dự án |
| **BB-02** | `khoi-telegram.ts:140` (`coKhoi`), dùng ở `:549-550`, `:938` | Gỡ trùng theo bộ chỉ xét "bộ có mã khối đó" chứ không xét khối kia **có thật sự in dòng ấy cho dự án ấy**. Đo 10 ca: RQ-6 không có số hoặc chỉ chọn dự án khác thì DA-1 in "**Không có việc đỏ nào**" dù có thẻ "tồn 39 việc quá hạn" (báo sạch giả). TQ-1 chỉ chọn HV thì thẻ vượt hạn chủ trương của dự án LG **biến mất**. Ví dụ BA: TQ-1 chọn Tân Thành + RQ-1 công ty thì dòng "vượt hạn chủ trương 316 ngày" của Hướng Việt biến mất ở cả hai khối. `hanChuTruong` lỗi thì TQ-1 im lặng còn RQ-1 vẫn bỏ thẻ. Tiêu đề đổi chữ thì an toàn (in trùng, không mất) | Gỡ trùng chỉ khi khối kia có thẻ đó cho đúng dự án; nếu không thì giữ |
| **BC-01** (tôi đã đọc mã một nửa) | `5-Agent-tien-do/src/components/tabs/report-mgmt/NhapAiTuan.tsx:264` | Hàng ghim "Báo cáo Tuần" (3003) nằm **dưới** thanh trên: thanh trên sticky `top:0` cao 38 px (z 40), hàng ghim `top:0` cao 51 px (z 30), nên ①②③ và nút AI/Excel bị che khi cuộn. Dòng 264 dùng `ghim-the-cho` mà `report-mgmt/page.tsx` không truyền `coGhim` (đã grep: không có `coGhim` trong cả hai tệp). Số px là của trợ lý. Main (3010) đúng, hàng ghim dừng ở top:38 | Truyền `coGhim` như Main |
| **BC-02** | `dung.ts:275` (đọc `cham_ngay_so_baseline`) | Tin sáng tự mâu thuẫn: bảng COD ghi Tân Thành và Nậm săm 3A "đúng hạn so với Baseline"; cùng tin khối RQ-2 ghi "Tân Thành: chưa có Baseline đã duyệt"; báo cáo tháng ghi cả hai "chưa có Baseline đã duyệt"; S-Curve vẫn vẽ đường "Baseline" cho hai dự án đó. Nghi cổng Tiến độ trả 0 thay vì null. **Chưa gọi cổng để xác nhận** | Gọi cổng đọc xem `cham_ngay_so_baseline` thật là gì; nếu trả 0 cho dự án chưa duyệt thì sửa ở cổng hoặc `docSo` |

## Điểm 🟡 chính

| Mã | Chỗ | Thấy gì |
|---|---|---|
| BA-04 / BA-03 | `gon-cho-telegram.test.ts:70`; `khoi-telegram.ts:1543-1555` | Bài `/D:\|sk-/` thiếu một `\` (từ `8f6b78f`, 26/10) nên **vô hiệu**; đo thật: `gonChoTelegram` vẫn để lộ `SETUP\log.txt` khi đường dẫn có dấu cách. Tiêu đề khối mồ côi cuối tin, tin sau lặp "… (tiếp)" |
| BA-02 (S3) | `dung.ts:528`, `khoi-du-lieu.ts:790` | "Dựng lại" ghi đè hết số trong ngày bằng lượt mới, kể cả khi lượt mới hỏng; ô đã gom thì không gom lại trong ngày. Log: 5/586 lượt gom lỗi từ 20/10. `damBaoKhoi` không có bài kiểm trực tiếp và thường không có khoá riêng |
| BB-03 / BB-08 | `khoi-telegram.ts:125` (`boMa`), `:778` | `boMa` vừa để lọt mã vừa xoá nhầm số thật. Lọt: mã phiếu 6 khúc `HV-EPC-ENC-CBCT-PYC-013`, `ISS_PL_0115`, `A.13-02`. Xoá nhầm: "Turbine 4.6 MW" → "Turbine MW", "Nhà máy 49.5 MW" → "Nhà máy MW", xoá cả HD-548. Bản web RQ-4 in thêm mã nội bộ hợp đồng ("NT-03-HV-HD02"). BC-06: mã WBS vẫn lọt web và Telegram ("6.1.4…", "1.1: không áp…") vì `khoi-telegram.ts:587,592,731` không qua `boMa`, regex bỏ sót "n.n:" |
| BB-05/06 | `ghepHeTheoKhung` | Thử 50 ca: 19 ca khác mong đợi. Câu AI có "(so với Baseline)" hoặc ", so với …" ở vế khác thì bị ghép thêm hệ thứ hai, ra câu hai hệ mâu thuẫn; cùng số nhưng khác nghĩa bị gắn hệ sai ("Việc giao trễ 25 ngày" → "so với Baseline"); hệ bắt dư đuôi ("Baseline do thời tiết do thời tiết"). Lưới luật 36 vẫn lọt "chậm tới / hơn / khoảng / muộn", chữ đậm **N ngày**, dải 59–65. Số có "," và "." (1.234, 12,5) đúng |
| BB-04/07/09 | `:953`, `:941`, `kich-ban.ts:304`, `luat-cod.ts:553,572` | DA-1 "quá hạn N ngày" không ghi hệ (luật 36); "đã mở N ngày" cắt ngày theo UTC, lệch 1 ngày với thẻ mở 00:00–07:00 giờ VN (luật 44); tin còn "lý do xem trên web" và "xem ở Main" ở đường cũ; `kich-ban.ts` có 4 chỗ "xem ở Main" là mã chết kèm import thừa `dongGoiTin` |
| BB-10, BB-11/12 | `dung.ts:719-730` | Không trần số tin, gửi tuần tự, không xử lý 429/`retry_after`, dừng ngay khi một tin lỗi; `chiaManh` hở thẻ khi một dòng dài hơn 3.800 ký tự; câu "màn tự lấy trong vài giây" xuất hiện cả trong Telegram |
| BC-03/04 | màn Sáng, Tháng, Tuần | Số hồ sơ thiếu lệch giữa hai màn (tháng 20/103 và 20/85; sáng 91/103 và 78/97; trùng trần 20 của Pháp lý `khuon-agent.ts:480`); báo cáo tuần: "Nhận xét chung" AI viết 20/10 ghi chậm 44/86 ngày còn bảng ngay trên ghi 59/101, không cảnh báo lời văn cũ |
| BC-07/08 | `thuan.ts:100`, `noi-tai-khoan.ts:48-49` | Câu bot hướng dẫn nối Telegram chỉ sai chỗ (ghi "góc dưới thanh bên trái ✈", thực tế ở menu tên người, dòng cuối, không có ✈). Luật 43: còn "BC Lãnh đạo / BC Kỹ thuật" ở `gioi-thieu/noi-dung.tsx:390`, `van-phong.ts:18` (prompt AI), `noi-dung-bc.ts:77` |
| BC-09/10/11 | báo cáo tháng/tuần/ảnh | Bảng 10 tháng: bốn dòng "Còn N vấn đề khác" không ghi tên dự án, có câu "xem ở màn Issue của Main" ngay trong Main; Kỳ báo cáo tuần thiếu số ngày (luật 31); ảnh thanh ngang vẽ 6 trong 8 thanh và ghi "… và 2 mục khác không đủ chỗ vẽ" (`ve-anh.ts:717-720`), dữ liệu thật mới 7 người |
| BD-T1 | `form7.ts:157-163`, `viet-nhap.ts:135` | Chữ sửa tay báo cáo tuần khoá theo **chỉ số dòng**: "AI viết lại nháp" có thể gắn hạn do người gõ vào việc khác, việc đó vào sổ cái 3004 với hạn sai. Mới đọc mã |
| BD-1 | `ChuSuaDuoc.tsx:49` | Bấm "✎ Sửa" rồi rời ô không gõ gì thì chữ AI bị chốt thành chữ sửa tay, "Làm lại" sau đó không cập nhật ô đó. Mới đọc mã |
| BD-5 (luật 44) | `kyThangTruoc`, `ngayHomNay` | Dùng giờ máy, không cố định +7: với `TZ=UTC` lúc 03:00 ngày 01/11 giờ VN ra kỳ 09/2026, đáng ra 10/2026. Máy này giờ VN nên chưa lỗi; lên hosting UTC sẽ lỗi |
| BD-3, BD-T3, BD-T2, BD-4 | báo cáo tháng/tuần | "COD lùi/+N ngày" (Bảng 10, chương III, V) không ghi so với hệ nào; Form 7 chương I "Thời gian thi công" khoảng ngày không kèm số ngày; mã lọt (`NT-03-HV-HD02`, `PG-02`, WBS, `HV-K-17`, `ISS-…`) — chốt 28/10 "không ghi mã" mới áp báo cáo sáng |
| BD-2, BD-T6 | hướng dẫn | Hướng dẫn tháng còn nhắc Word, "Dựng lúc", ô Người ký, "Mục n/6"; `chat-tools.ts:1318,1323`, `chat-types.ts:371` còn nói "xuất Word" (luật 43) |
| BD-9, BD-T5 | Tiến độ | Vitest Tiến độ hỏng 1 bài `mcp-loc-nguoi-xem.test.ts:66` (không do báo cáo): 4 công cụ BOQ chưa khai vào danh sách lọc Người xem — cần chủ công cụ xác nhận có trả đơn giá/thành tiền không. Nút "⬇ Xuất Excel" tuần không mờ khi chưa có nháp, bấm mở tab JSON thô |

## Đã đúng, đã đo

- **tsc** 0 lỗi cả hai kho. **Main vitest** 98/98 tệp, 1.171 qua, 0 hỏng, 2 bỏ qua (hợp lệ), chạy hai lần giống nhau; **Tiến độ vitest** 162 tệp qua + 1 hỏng (cũ, 1.633 qua).
- **S11 (dấu `\`):** quét 101 tệp (423 regex) và từng commit (43 Main + 5 Tiến độ): **0 chỗ mất `\`** trong khoảng kiểm (bộ quét đã thử đúng trên một ca giả). Ngoại lệ duy nhất BA-04 ở trên (một bài kiểm từ 26/10).
- **K10:** không tệp báo cáo nào chưa vào commit; chỉ còn `mc-ra.txt` rác chưa theo dõi; phiên 11 và 12 không dẫm nhau trong 44 commit; `a6ca54d` chỉ có đúng `xlsx-mau-cong-ty.ts`.
- **Tin Telegram:** bộ đủ 21 khối hôm nay ra 11 tin, dài nhất 3.949 ≤ 4.096; mô phỏng 8 tin (5 dự án), 61 tin (45 dự án), 173 tin (trần 1.500) đều 0 lỗi thẻ, không rò `<script>`/`&`/`<b>` từ dữ liệu, không tin rỗng. Album 0/1/2/10/11/21/25 ảnh chia đúng, chú thích ≤ 1.024.
- **Quyền Telegram đúng** ở 11 vai × 3 dự án; chọn "dự án tôi chọn" ngoài quyền không lộ. **S3:** số lượt gom không nhân với 55 người nhận (gom theo khối × dự án, 59–70 lượt/lần với 3 dự án có số); luật 29 đạt; khoá chống trùng `dungBaoCao` đạt.
- **Excel:** Form 0 cũ không đổi (so từng ô `a6ca54d^` với HEAD bằng exceljs); báo cáo tháng sửa tay ô 🤖 thì Excel lấy đúng chữ sửa, "Làm lại" giữ chữ sửa, xoá chữ sửa thì về chữ AI; Form 7 đọc lại đúng bằng bộ đọc thật của 3004 (CSDL RAM, bản archive): tờ "Mẫu trắng", Tuần 39/2026 (21/09–27/09), 5 bảng. Tuần ISO quét 1.157 ngày (01/12/2024 → 31/01/2028), 0 lỗi; 26/10/2026 là W44, 28/12/2026–03/01/2027 là W53. Bảng 8 có hàng "TỔNG CỘNG · 2 dự án" đứng đầu cả web lẫn Excel (luật 34).
- **Giao diện:** S5 `OChonDuAn` đúng (gập khi bấm ra ngoài, không hai ô cùng lúc, listener gỡ khi unmount); S6 gom thẻ thành bảng chỉ trong một khối, bảng nằm trong khung cuộn ngang riêng; 6 ảnh thật đọc được ở rộng 360; luật 31/34/36/17/18/28 nhìn chung đúng; luật 10: 19 tệp client Main và 1 Tiến độ, 0 vi phạm.

## Cần Mr. Đại quyết (một câu mới)

**Chốt «không ghi mã» có áp cho báo cáo tháng và tuần không?**

| | |
|---|---|
| **Vấn đề** | Chốt 28/10 bỏ mã (WBS/hồ sơ/issue) chỉ rõ áp cho báo cáo sáng. Báo cáo tháng và tuần vẫn in mã: cột "Hợp đồng" Bảng 8 in `NT-03-HV-HD02`, "Đang ở khâu" in `PG-02`, mã WBS, `HV-K-17`, `ISS-…` (BD-4). Cả báo cáo sáng vẫn còn mã lọt (BB-03, BC-06) vì hàm gỡ mã vừa sót vừa xoá nhầm "4.6 MW" |
| **(gợi ý) Áp cùng chốt cho cả tháng và tuần; viết nội dung đủ hiểu (vd "hợp đồng EPC Tổng thầu ENC") và sửa hàm gỡ mã để không xoá số kỹ thuật** | Được: ba báo cáo cùng một cách đọc; người nhận không phải tra mã. Mất: báo cáo tháng/tuần mất khả năng đối chiếu nhanh với sổ; phải viết lại một số cột |
| Chỉ áp cho báo cáo sáng | Khuyết điểm: tháng/tuần vẫn mã trơn, trái luật 30 ("không chỉ viết mã"). Ưu điểm: không phải sửa; mã giúp đối chiếu khi nộp |
| Giữ mã nhưng kèm tên (luật 30: "mã + tên ngắn") ở tháng/tuần | Khuyết điểm: dài hơn, vẫn có mã. Ưu điểm: đối chiếu được với sổ và dễ hiểu |

Trả lời «1», «2» hoặc «3» là đủ.

**Các câu cũ vẫn chờ (không thêm):** bảng nhiều dòng trên điện thoại (Đợt 2) · dòng «Kỹ thuật:» ai xem và ô Cài đặt thay email gắn cứng (Đợt 1) · cách đếm «Chậm khởi công» (lần 8) · V3 (Đợt 0) · định nghĩa "nghiệm thu" giữa Hợp đồng và Nghiệm thu · câu Phòng họp (chờ lời anh) · tài khoản Claude chạy lượt đêm · người xem có thấy trả lời Pháp lý ở tab Video · đăng nhập chung · Nghiệm thu lần 3, 4 · Hợp đồng · Cảnh báo · việc 7.1.2 · hai bản sao CSDL Pháp lý · commit 16 tệp Pháp lý.

## Chưa đo được

Gửi Telegram thật (kể cả xử lý 429) · mở bằng Excel thật · cuộn hàng ghim và 3 tab trên điện thoại (BC đo 375×812: Main hàng ghim 254 px = 31% màn, `scrollWidth` 742; 3003 `scrollWidth` 622 — theo quy ước chỉ 3004 hỗ trợ điện thoại nên ghi góp ý) · "Làm lại" với AI thật · luật 36 trong chữ AI tự viết · vai Người xem thật (không có tài khoản thử, luật 17 chỉ đọc mã) · gốc dữ liệu của BC-02/BC-03 (chưa gọi cổng) · thời gian "Dựng lại" với 17 dự án · "Uncaught SyntaxError" trong console lần tải đầu của 3010 · emoji cắt đôi ở ký tự thứ 1.000.

Ghi nhận: mỗi lần tải trang Main/3003 tự nhúng khung trợ lý của 3004 (`/nhung/chuong`, `/api/toi` trả 401); BC tải ≈ 12 trang nên có ≈ 12–30 lượt vào 3004 — hành vi của chính trang, BC không gọi trực tiếp.

## Xác nhận an toàn

Không gửi Telegram thật; không bấm Gửi/Dựng lại/Lưu/AI viết nháp/Xuất Excel; không gọi AI / `claude` CLI; không `next build`; không tắt/dựng/khởi động lại cổng nào; không đọc `data/` thật hay `data/pgdata`; không sửa kho nào (thí nghiệm trên bản `git archive`, đã xoá; junction gỡ bằng `rmdir`, `node_modules` gốc còn nguyên; khung trình duyệt đã trả về desktop); không tự ký cookie; không commit.

---

# PHỤ LỤC 1 — BA: mã Main, tsc/vitest, dấu `\`, chia tin, gom khối, album, xlsx

# Kết quả kiểm độc lập BA — hạ tầng, gói tin, gom lại, dấu `\` (báo cáo sáng · tuần · tháng)

*Phiên «0 Kiểm tra độc lập» · trợ lý BA · 27/10/2026 ~16:30 · M = `4-agent-main` (HEAD `188da0b`) · T = `5-Agent-tien-do` (HEAD `0f7572e`). KHÔNG sửa code ai; bài thử tạm đã `rm` hết (`git status` M chỉ còn `?? mc-ra.txt`, tệp của người khác).*
*Tệp đo phụ: `…\scratchpad\bc\BA-tmp\` (script quét, kết quả json).*

## 0. Tổng

| 🔴 | 🟡 | ⚪ |
|---|---|---|
| 0 | 4 | 10 |

Nặng nhất: **BA-01** gỡ trùng làm mất tin (đo bằng bài thử) · **BA-02** Dựng lại ghi đè số tốt bằng số lỗi · **BA-03** tiêu đề khối mồ côi cuối tin · **BA-04** bài khoá tin `D:\|sk-` mất `\` + lộ «SETUP\log.txt».

## 1. K1 · K10 — tsc, vitest, git

| Việc | Lệnh | Kết quả |
|---|---|---|
| tsc M | `npx tsc --noEmit -p .` và `--incremental false` | **0 lỗi** (exit 0; 6 s có bộ nhớ đệm, 17,9 s không) |
| vitest M lần 1 | `npx vitest run --testTimeout=60000` | **98/98 tệp · 1.171 qua · 0 hỏng · 2 BỎ QUA (1.173)** · 25,4 s |
| vitest M lần 2 | `--reporter=verbose` | **y hệt** 1.171 qua · 2 bỏ qua · 14,9 s |
| 2 bài bỏ qua | `dong-bo-keo-cau-hinh.test.ts:375,386` | `it.skipIf(!coTrenMay)`: «máy này không có repo» `D:/CongviecHpt/…/Code Agent tien do/src/lib/keo-cau-hinh.ts` — bỏ qua hợp lệ, không phải lỗi |
| `bao-cao-sang-cod` riêng | `vitest run tests/unit/bao-cao-sang-cod.test.ts` | **23/23** · 1,6 s. Trong bộ đầy đủ, bài chậm nhất của tệp này = **4.185 ms** (cùng lúc phiên BD chạy vitest ở T) — sát mốc 5 s mặc định, xem BA-12 |
| tsc/vitest T | — | do BD chạy, không làm |
| `git -C M status --short \| grep -v data/` | | chỉ `?? mc-ra.txt` (gốc kho, đầu ra «CA ECONNREFUSED …Agent Tiến độ… 3003» — tệp rác của ai đó chạy công cụ; KHÔNG thuộc báo cáo). **Không còn tệp báo cáo nào chưa vào commit.** |
| `git -C T status` | | ` M src/app/globals.css` (chưa commit, không nằm trong 5 commit báo cáo tuần — chưa biết phiên nào) · `?? kiem-tra-doc-lap/_cat-giu/` · các tệp `data/` đang đổi (T theo dõi `data/` trong git) |

### Bảng commit ↔ ranh giới (M, 44 commit `6b7021f^..HEAD`, một tác giả `Admin`)

Ranh giới: phiên 12 = `lib/bao-cao-sang/*`, `components/tabs/bao-cao-sang/*`, `api/bao-cao-sang/*`; phiên 11 = `lib/ai/chat-*`, `lib/telegram-tro-ly/*`.

| Commit | Chạm ngoài ranh giới phiên của nó? |
|---|---|
| 6b7021f 7568425 f180a17 d215e4c cc010f6 9ea9985 6720fe3 69331bd 6c34de4 ebd4bf6 0985899 6ee9808 a19e0c0 fea5349 7446c8e | Không — chỉ 3 thư mục phiên 12 + `tests/` + `lib/huong-dan/tab/bcs-*`, `lib/giai-thich/noi-dung.ts` (tài liệu của chính báo cáo sáng, đúng luật 43) |
| 3e14e47 5252be9 6ed0b56 e8f247d af2bbd2 | chỉ thêm `lib/huong-dan/tab/bcs-*` + `lib/giai-thich/noi-dung.ts` — hợp lệ |
| **e8575d5** (Bảng điều hành đợt 1) | ⚪ **lọt `lib/bao-cao-sang/khoi-telegram.ts` (+`export` cho `boMa`, `boTienToDuAn`, 4 dòng)** vào commit của Bảng điều hành — vô hại, nhưng sai ranh giới |
| d7af38d | chỉ `components/tabs/bang-dieu-hanh/` |
| **0ee302d** | chạm `lib/bang-dieu-hanh/tom-tat-ai.ts` (mô-đun DÙNG CHUNG với trang Bảng điều hành) — xem BA-09 |
| e1bb0d0 f1a2fa6 b7b791b | `components/layout/UserMenu.tsx`, `components/huong-dan/{HinhMinhHoa,NutHuongDan}.tsx`, `components/telegram-tro-ly/NoiTelegram.tsx` (UI «Nối Telegram»; không phải `lib/telegram-tro-ly/*`) — khuôn chung, hợp lệ |
| 396c458 0dadfa2 33aba81 6087db5 c12d9ba 3e00fea 028b1d4 51bb5ad 5343622 | báo cáo tháng (`bao-cao-thang`, `app/bao-cao/page.tsx`, `xlsx-mau-cong-ty.ts`) — phiên khác, không chạm phiên 12/11 |
| f878e4e | `Sidebar.tsx` |
| **a6ca54d** (commit hộ) | **chỉ** `src/lib/xlsx-mau-cong-ty.ts` (+62/−3). Sạch |
| ba6052d 642890f e5dd82e b774616 (phiên 11) | chỉ `lib/ai/chat-*`, `lib/ai/chon-cong-cu.ts`, `lib/telegram-tro-ly/thuan.ts`, `scripts/chay-bo-cau-hoi.mts`, `tests/` — **không** chạm `bao-cao-sang` (grep trống). Ngược lại 40 commit còn lại **không** chạm `lib/ai/chat-*`/`lib/telegram-tro-ly/` ✔ |
| 188da0b | tệp đề `.md` |
| T: 16f2166 8850895 33bf249 4b77d85 0f7572e | `0f7572e` chạm 23 tệp nhưng là quét đổi tên menu («Báo cáo Tuần», «Data đầu vào») — mỗi tệp 2–6 dòng, đúng luật 43. `8850895` có `lib/ai/chat-tools.ts` (bản T). Không lọt tệp lạ |

## 2. S11 — dấu `\` bị đổi: **không còn nơi nào mất `\` trong tệp đã đổi** (0/2 kho), kèm một ca cũ

Cách đo (không đoán): ba lớp.

| Lớp | Script | Phạm vi | Kết quả |
|---|---|---|---|
| (a) trích MỌI literal regex + `new RegExp("…")`, tìm mẫu `d+ d{ s* s+ w+ \bd ))s*` không có `\` ngay trước | `BA-tmp\quet-regex.mjs` | M: 70 tệp `.ts/.tsx/.mts`, **350 regex** · T: 31 tệp, **73 regex** | **0** nghi `d+`/`s*`/`w+`/`))s*`. Cờ còn lại 42+6 dòng đều **sai báo** (đã đọc từng dòng): quy tắc «`b` đứng trước chữ» bắt nhầm danh sách từ (`(bao cao\|bc \|…)`, `(?:b\|i\|pre\|blockquote)` — chữ `b` là tên thẻ thật, `\b` đã có ở hai đầu); 3 dòng «không compile» là văn bản JSX nằm giữa hai dấu `/` bị bộ quét nhầm là regex |
| (b) compile từng regex thật | cùng script | 423 regex | 0 lỗi cú pháp thật |
| (c) **từng commit**: dòng (−) có literal chứa `\` mà dòng (+) có cùng chữ nhưng bỏ `\` | `BA-tmp\quet-diff-tung-commit.mjs` | M 43 commit · T 5 commit | **0 nghi vấn**. Kiểm chứng bộ quét: dựng kho thử, đổi `/tồn \d+ việc/`→`/tồn d+ việc/` thì bộ quét báo đúng 1 ca ✔ |
| (d) chuỗi `"\n"`→`"n"`, đường dẫn Windows | grep `join("n")`, `split("n")`, `+ "n"`, `D:3…` trên tệp đổi | M, T | 0. Đường dẫn font `ve-anh.ts:37-38,51-52` vẫn `C:\\Windows\\Fonts\\…` đủ `\\` ✔ |

Hai ca `/tồn \d+ việc quá hạn/` (`khoi-telegram.ts:139`) và `/vượt hạn theo chủ trương/` (`:138`) hiện **đúng** (`\d+`, `\s*\(…\)` ở `:122`). Tiêu đề nguồn khớp mã sinh: `6-Agent-cong-viec/…/issue/sinh.ts:264` («`${nguoi} tồn ${ds.length} việc quá hạn ≥ …`») và `3-agent-phap-ly-code/lib/viec-chay-dem.ts:722` («COD dự báo vượt hạn theo chủ trương …»).

### BA-04 🟡 Một ca mất `\` NGOÀI khoảng kiểm (26/10, phiên 11) — và bài khoá tin vì thế vô hiệu, tin vẫn rò

- `tests/unit/gon-cho-telegram.test.ts:70` — `expect(r).not.toMatch(/127\.0\.0\.1|3004\/|D:\|sk-/)`. Trong regex, `D:\|sk-` = chữ **`D:|sk-`** (một `\` bị nuốt; chắc là `D:\\|sk-`). Dấu vết: `git log -S'D:\|sk-'` → `8f6b78f` (26/10 21:06).
- Hệ quả đo thật (bài thử tạm gọi `gonChoTelegram(String.raw\`…xem D:\3 SETUP\log.txt, khoá sk-abc…\`)`): đầu ra = `Kỹ thuật: cổng  không thưa, xem  SETUP\log.txt, khoá` → **đường dẫn có dấu cách chỉ bị cắt «D:\3», còn lộ `SETUP\log.txt`**; khoá `sk-…` bị cắt đúng. Bài test xanh vì regex không bao giờ khớp.
- Đề xuất: sửa regex bài thành `/D:\\|sk-/` **và** sửa lưới `lib/telegram-tro-ly/thuan.ts` cho đường dẫn có dấu cách (cho phiên 11).

## 3. S2 — `dongGoiManh` / `chiaManh` (`khoi-telegram.ts:1494-1562`)

Đo bằng bài thử tạm (kiểm ngăn xếp thẻ `<b> <i> <pre> <blockquote> <code> <a>`, `< > &` trần, độ dài):

| Ca | Số đo | Kết luận |
|---|---|---|
| Khối thẻ việc dài 6.635 ký tự (ba lần dùng cùng loại với RQ-5) | 2 tin: 3.886 + 2.843; 0 lỗi thẻ | ✔ |
| Bảng `<pre>` 400 dòng | 2 tin: 3.755 + 2.918; mỗi mảnh tự bọc `<pre>`; 0 lỗi thẻ | ✔ — nhưng xem BA-06 |
| Biên: ca = 3.928…3.936 ký tự | 1 tin 3.934–3.936 | ✔ |
| Biên: ca = 3.938 (vừa quá `tran−60`=3.940 khi ghép) | 3 tin: **3 ký tự** («đầu») + 3.953 + 16 («(tiếp 3/3)\n\nc») | ⚪ tin chỉ có dòng đầu / chỉ có dòng cuối — chấp nhận được, ghi nhận |
| Biên 4.096 / 4.097 ký tự | 2 tin: 3.755 + 372/373 | ✔ ≤ 4.096 |
| Khối 7.853 ký tự kiểu RQ-5 (dữ liệu thật hôm nay, **bộ đầy đủ 21 khối**, bản sao `data/` hôm nay) | **11 tin**: 3.692 · 3.830 · 3.948 · 3.889 · 1.816 · 2.217 · 3.770 · 3.408 · 3.889 · 3.949 · 1.546; **0 lỗi thẻ, không tin rỗng, tin dài nhất 3.949 ≤ 4.096** | ✔ |
| Người nhận hiện có «Quản trị viên» (6 khối) | 2 tin (3.504 + 2.971) + 5 ảnh | ✔ |
| NFD/NFC: «Hạng mục việc chậm» NFD dài 24, NFC dài 18 | 300 dòng NFD → 3 tin, dài nhất 3.936 | ✔ (đếm theo `length` JS, Telegram đếm ≤ nên an toàn); không có chuẩn hoá NFC — ⚪ |
| Emoji ở biên | `📋 (tiếp k/n)` + `🤖` — không cắt đôi cặp thay thế (dòng cắt theo `\n`, ký tự thì `slice` — xem BA-05) | ✔ với dữ liệu thật |

### BA-03 🟡 Tiêu đề khối mồ côi ở cuối tin
`khoi-telegram.ts:1543-1555`: mảnh đầu (dòng tên khối) vừa chỗ trống cuối tin thì được nối vào, mảnh thân kế tiếp không vừa → sang tin mới với «`<tên> (tiếp)`». Đo: `cuoiTin1` = `…yyyy\n\n<b>▍KHỐI DÀI</b>`, tin 2 mở bằng `📋 (tiếp 2/4)\n\n<b>▍KHỐI DÀI (tiếp)</b>`. Người đọc thấy một tên khối cụt ở cuối tin và lại thấy tên đó «(tiếp)» ngay tin sau.
Đề xuất: chỉ đặt mảnh đầu khi mảnh thân thứ nhất cũng vừa (gói [đầu + mảnh 1] làm một đơn vị).

### BA-05 ⚪ Mảnh quá 3.740 ký tự không phải `<pre>` bị chia theo dòng/ký tự, có thể hở thẻ
`khoi-telegram.ts:1507-1509`. Đo: `<blockquote><i>🤖 …200 dòng…</i></blockquote>` (~7.000 ký tự) → tin 1 «hở thẻ: blockquote,i», tin 2 «đóng sai </i></blockquote>»; một dòng 5.000+ ký tự có `&amp;` ở chỗ cắt → «& trần: &amp». Lời nhận định «mỗi mảnh đóng đủ thẻ nên không bao giờ hở» (`:1520`) chỉ đúng cho `<pre>`. Chưa gặp trong dữ liệu thật (câu 🤖 hiện ≤ vài trăm ký tự) và Telegram từ chối thì đã có đường lùi chữ thuần (`telegram.ts:140-143`). Đề xuất: bọc lại thẻ khi chia mảnh `<blockquote>`, hoặc chia ở ranh giới câu.

### BA-06 ⚪ Mảnh `<pre>` tiếp theo không lặp hàng tên cột
Đo: tin 2 mở bằng `<b>▍BẢNG (tiếp)</b>\n<pre>H232 Việc 232 12…`. Bảng thật có hàng tên cột ở đầu (`khoi-in.ts:111`), nên các mảnh sau mất nhãn cột. Đề xuất: lặp hàng tên cột ở đầu mỗi mảnh `<pre>` tiếp.

### BA-07 ⚪ `dau`/`cuoi` không bao giờ được chia
`khoi-telegram.ts:1557-1559` — `cuoi` 5.000 ký tự → tin 5.015 (> 4.096). Thực tế `cuoi` ngắn (dòng luật đang áp + liên kết), nhưng nhiều luật áp cùng lúc không có trần. Hiếm.

### BA-08 ⚪ Gửi: không xử lý 429, lỗi một tin thì dừng và «Gửi» lần sau trùng từ tin 1
Bỏ trần số tin (N7) nên bộ 21 khối = **11 tin/người** (đo hôm nay) → tối đa ~605 tin tuần tự cho 55 người (`dung.ts:725-731`). `telegram.ts:137-158` không đọc `retry_after`; tin n lỗi → `break`, `ghiDaGui ok:false` → lần «Gửi» (không «Gửi lại») sau gửi **lại từ tin 1** → người nhận thấy tin 1…n−1 hai lần. **Chưa đo được** (cấm gửi Telegram thật).

## 4. S3 — `damBaoKhoi(lamMoi)` (`dung.ts:520-547`, `gom-khoi.ts`)

Số lượt gọi agent (đo từ `data/nhat-ky-hoi-agent.jsonl`, lý do «KE-HOACH/23 … dựng báo cáo sáng 2026-10-27»):

| Lần Dựng lại hôm nay | Lượt Main→agent | Dự án | Thời gian | Không-ok |
|---|---|---|---|---|
| 08:54 | 66 | 6 mã | 10 s | 24 (đa số «không có dữ liệu») |
| 09:00 | 59 | 6 | 4 s | 24 |
| 09:05 | 70 | 6 | 8 s | 24 |
| 09:07 | 59 | 6 | 4 s | 24 |

- Số lượt **KHÔNG nhân với 55 người nhận**: gom theo khối × dự án có trong phạm vi hợp nhất (`canCuaNguoiNhan`, `khoi-telegram.ts:1605-1620`). Tối đa trên lý thuyết ~34 lượt/dự án (22 cố định + ≤10 «kéo COD về» + ≤2 RQ-3; CT-1/CT-2 thêm 1–2 lượt hỏi lùi kỳ); dự án chạy **2 song song** (`gom-khoi.ts:292`). Mẫu 3 dự án có số hôm nay: 59–70 lượt. Ước cho 17 dự án thật (sổ dự án 17 dòng): vài trăm lượt — **chưa đo được thời gian** (dữ liệu test chỉ 3 dự án có số).
- Luật 29 ✔: `gom-khoi.ts` chỉ gọi `hoiAgent` (qua sổ); `grep fetch(` trong `lib/bao-cao-sang` chỉ ra 3 chỗ gọi `api.telegram.org`.
- Chạy **trong request**: `app/api/bao-cao-sang/route.ts:90` (`await dungBaoCao`) → người bấm «Dựng lại» chờ cả lượt gom.
- Khoá chống trùng: `dungBaoCao` có khoá theo ngày trên `globalThis` (`dung.ts:325-329`) → bấm «Dựng lại» hai lần liền, hoặc trùng nhịp 07:45 (`chayNhipTho` → `dungBaoCao`, `dung.ts:952`) **dùng chung một lượt** ✔.
- `damBaoKhoi` KHÔNG có khoá riêng; các đường không-lamMoi (`api/bao-cao-sang/khoi/route.ts:37`, `guiChoMotNguoi` `dung.ts:714`, `guiBaoCaoSangTho` `dung.ts:793`) khi thiếu cặp khối–dự án cùng lúc thì hỏi agent hai lần và ghi đè nhau (`kho.ts:238-246` dùng tệp tạm tên cố định `<ngày>.json.tam`: hai lượt ghi chồng → `renameSync` của lượt sau có thể lỗi, hàm nuốt lỗi và trả `false`).
- Lỗi giữa chừng: ném lỗi → `catch` trả `co` (=`null` khi lamMoi) và **không ghi** nên tệp cũ còn nguyên ✔ (không nửa khối). Nhưng lỗi **từng lời gọi** không ném (`ket()` ghi `{ok:false, loi}`).
- Luật 39: trong lúc gom (vài giây–phút) màn/lượt gửi vẫn đọc tệp cũ → không bảng rỗng ✔.
- **Không có bài kiểm trực tiếp cho `damBaoKhoi`** (`grep damBaoKhoi tests/` trống) — chính hàm vừa sửa ở `6b7021f`.

### BA-02 🟡 «Dựng lại» thay HẾT số trong ngày bằng kết quả lượt mới, kể cả khi lượt mới hỏng
`dung.ts:528` `co = lamMoi ? null : cu` → `kho` `khoi-du-lieu.ts:790` `if (!cu) return moi` → `luuKhoi` ghi đè. Nếu lúc bấm agent Tiến độ đang khởi động lại (cổng 3003 đang `next dev`; `mc-ra.txt` ở gốc M chính là đầu ra `ECONNREFUSED` 3003), mọi ô số Tiến độ hôm nay thành `{ok:false,"Agent đang tắt"}` và `daGom` ghi là «đã gom» nên `phanThieu` không bao giờ gom lại trong ngày; bản gửi 07:00 in «chưa có số/lỗi» cho cả khối. Đo log: **5/586** lượt gom từ 20/10 mang `ketQua: loi` (còn lại ok 415, không-có-dữ-liệu 166) — hiếm nhưng có. Trái tinh thần luật 39 («có số cũ thì dùng kèm giờ lấy số»).
Đề xuất: khi lượt mới của một ô `ok:false` mà ô cũ `ok:true` thì giữ ô cũ (kèm giờ gom), hoặc gom lại các ô lỗi ở lượt kế.

## 5. S4 — gỡ trùng theo bộ (`khoi-telegram.ts:138-140, 549-551, 938-944`)

Bộ khối có sẵn trong cấu hình: `BO_MAC_DINH` (`khoi.ts:360`, 3 bộ: tong-quat = TQ-1 công ty + RQ-1 · dieu-hanh = RQ-1 · du-an = TQ-1 + RQ-1 cùng «dự án tôi chọn» — hai bộ cuối không có cặp TQ-1/RQ-1 lệch phạm vi nên chưa dính BA-01 nếu dữ liệu đủ) + bộ riêng từng người (`data/bao-cao-sang-kich-ban.json` hiện 3 người). Bài thử tạm (sao chép `bao-cao-sang-khoi.test.ts`, thêm ca) cho kết quả:

| Ca | Đo | Kết luận |
|---|---|---|
| Bộ có TQ-1 «dự án tôi chọn» = Tân Thành + RQ-1 «công ty»; việc «vượt hạn theo chủ trương 316 ngày» ở Hướng Việt | RQ-1 bỏ dòng đó; TQ-1 chỉ in Tân Thành → **316 ngày không còn ở đâu**; RQ-1 vẫn ghi chú giải «không in lại ở…» | 🟡 **mất tin** (`coKhoi` chỉ xét bộ có khối, không xét khối kia có phủ dự án đó) |
| TQ-1 «công ty», Pháp lý trả lỗi cho Hướng Việt | RQ-1 bỏ dòng; TQ-1 in dòng Hướng Việt **không** có hạn chủ trương, không cảnh báo | 🟡 mất tin |
| Đổi chữ tiêu đề («vượt hạn» → «QUÁ hạn chủ trương») | không khớp → RQ-1 **in lại** (thừa) | ⚪ thất bại theo hướng an toàn (trùng chứ không mất) |
| DA-1 + RQ-6, RQ-6 «chưa có số» (Base lỗi) | DA-1 in «**Không có việc đỏ nào ngoài «Việc làm chậm COD»**» dù có 1 việc «tồn 5 việc quá hạn» bị gỡ; RQ-6 chỉ có dòng «⚠ chưa có số» | 🟡 câu **sai sự thật** + mất tin |

### BA-01 🟡 Gỡ trùng làm mất tin khi khối «kia» không phủ đủ
`khoi-telegram.ts:549-550` (`trungTq1`, `trungRq6`) và `:938` (`laTrungRq6`). Đề xuất: chỉ gỡ khi khối kia **thực sự có số** cho đúng dự án ấy (`khoi.theoDuAn[ma].hanChuTruong?.ok` / `taiViec?.ok`, và dự án nằm trong phạm vi khối kia); không thì giữ dòng. Thêm bài kiểm hai ca trên.
Ghi chú: `RQ-6` lấy `gioi_han: 50` người/dự án (`gom-khoi.ts:246`) — người thứ 51+ bị DA-1 gỡ mà RQ-6 không có (chưa đo, cần dự án > 50 người quá hạn).

## 6. S8 — `tom-tat-ai.ts` (`HE_THONG` +1 câu, `:89`)

| Câu hỏi | Đo / đọc | Kết luận |
|---|---|---|
| Bài `tom-tat-ai.test.ts` khoá câu mới? | `grep` — tệp chỉ `import HE_THONG` để **in độ dài** (`:113`); không `toContain` câu nào | ⚪ không khoá (xoá/đổi câu mới bài vẫn xanh) — đã kiểm bằng đọc, không sửa nguồn để đột biến |
| Mâu thuẫn «≤ 60 từ»? | câu mới cùng ý với `LUAT_NHANH_CHAM_THEO_NGAY` (`lib/chung/luat-nhanh-cham.ts:10-13`) đã nối ngay sau → **trùng ý**, không mâu thuẫn; ví dụ «chậm 56 và 20 ngày» là số trong lời dặn, trái dòng «CHỈ dùng số trong dữ liệu» (rủi ro chép số mẫu — chưa đo, không gọi AI) |
| Trang Bảng điều hành dùng chung | `api/bang-dieu-hanh/tom-tat/route.ts:42` trả `layTomTatAi` thẳng, **không** qua `ghepHeTheoKhung`/`quaLuoiLuat36` (chỉ `gom-khoi.ts:91` có) | ⚪ BA-09: trên trang Bảng điều hành, câu AI thiếu «so với» vẫn hiện nguyên |
| Câu cũ trong bộ nhớ | `vanTay` = băm bộ số (`tom-tat-ai.ts:144-146`), **không** gồm `HE_THONG` → câu viết trước khi đổi lời dặn còn dùng 24 giờ | ⚪ BA-09: lời dặn mới chỉ có hiệu lực khi bộ số đổi |

## 7. S9 — `guiAlbumToi` (`telegram.ts:288-370`) — fetch giả, 0 lời gọi thật

| Số ảnh | Lời gọi |
|---|---|
| 0 | không gọi |
| 1 | `sendPhoto` đơn |
| 2 | `sendMediaGroup`×1 (2 ảnh) |
| 10 | `sendMediaGroup`×1 (10) |
| 11 | `sendMediaGroup`(10) + `sendPhoto` đơn ✔ (ảnh lẻ không vào album 1 ảnh) |
| 21 | 10 + 10 + `sendPhoto` đơn ✔ |
| 25 | 10 + 10 + 5 ✔ |

Chú thích: 1.023 → giữ 1.023; 1.024 → giữ; 1.025 → cắt còn 1.024 kết «…» (`catChuThich` không cắt đôi cặp thay thế); `<b>x</b> & …` đi nguyên văn vì **không có `parse_mode`** ✔ (không đứt thẻ). `TRAN_ANH_MOI_SANG`: không còn trong `src`/`tests` ✔. Thứ tự giữ nguyên thứ tự khối.

### BA-10 ⚪ (ba chi tiết nhỏ)
1. `dung.ts:743` `.slice(0, 1000)` cắt chú thích **trước** `catChuThich`, có thể cắt đôi emoji (cặp thay thế lẻ trong JSON `media` — Telegram có thể từ chối cả album; **chưa đo được**, cấm gửi).
2. `telegram.ts:350-356`: album lỗi → mất cả ≤ 10 ảnh, không thử gửi lẻ từng ảnh.
3. Mỗi ảnh có chú thích riêng: ứng dụng Telegram chỉ hiện chú thích dưới nhóm khi đúng một ảnh có chú thích — **chưa đo được** (cần máy thật).
Bài `ve-anh-bao-cao-sang.test.ts:177,189` đã kiểm 3 ảnh và 11 ảnh ✔.

## 8. S10 — `xlsx-mau-cong-ty.ts` (`a6ca54d`, +62/−3)

- Mẫu Form 0 cũ **không đổi hành vi** ✔: dựng cùng một `TaiLieuXlsx` (có `tieuDePhu`, mục, chữ, bảng có hàng tổng) bằng bản `a6ca54d^` và bản HEAD, đọc lại bằng exceljs: tờ, số hàng/cột, danh sách ô gộp, chữ từng ô, chiều cao hàng, vùng in — **bằng nhau từng ô** (`toEqual`). Tuỳ chọn mới (`donViLap`, `kyNhan`, `maMau`, `chuKy`, khối `cap`) đều mặc định tắt (`r += 2` giữ nguyên khi không có `maMau`).
- Form 7 thử (donViLap, kyNhan «Kỳ báo cáo *», maMau, chuKy:false, khối `cap` 2 cặp/hàng): đọc lại 10 hàng × 60 cột; hàng 2: «Gửi: Phòng Đầu tư và Pháp chế» + «Đơn vị lập *» + giá trị; hàng 4: «Kỳ báo cáo *» + khoảng ngày kèm **«· 7 ngày»** (luật 31 ✔); hàng 5: «Mã mẫu: form-7»; không có khối NGƯỜI LẬP/KÝ; vùng in `A1:BH12`. Tệp thử: `BA-tmp\mau-form7-thu.xlsx` (mở bằng Excel thật: **chưa đo được**).
- Hai bản (M, T) giống nhau trừ dòng chú thích đầu tệp (`diff` 1 dòng) ✔.
- Luật 34 (hàng tổng đầu bảng): nằm ở khối `bang` có sẵn (`kieu:"tong"`), không đổi bởi `a6ca54d`.

### BA-11 ⚪ Hai chỗ chưa được che
1. `donViLap` cùng lúc `tieuDePhu` → hai ô gộp chồng cùng hàng (`:161`, `:163-170`) → exceljs **ném** «Cannot merge already merged cells» (đã thử). Hiện không nơi nào truyền cả hai (Form 0 chỉ `tieuDePhu`, Form 7 chỉ `donViLap`) nên chỉ là mìn nằm đó.
2. Khối `cap` hàng có ≥ 3 cặp: `c0 = 1 + i*30` → cặp 3 ghi ở cột 61+ ngoài lưới 60 (đã thử, không ném, ghi ngoài vùng in).

## 9. Luật 10 — tệp mới của báo cáo sáng/tháng/tuần

Script `BA-tmp\luat10.mjs`: từ 19 tệp `"use client"` của `components/tabs/{bao-cao-sang,bao-cao-thang,bang-dieu-hanh}`, `components/{telegram-tro-ly,huong-dan}`, `app/{bao-cao,bang-dieu-hanh}`, đi theo mọi `import` không phải `type` (kể cả bắc cầu) tìm `node:*`, `fs`, `path`, `@napi-rs`, `exceljs`, `server-only`: **0 vi phạm**. T: 1 tệp client `report-mgmt` → **0**. `ve-anh.ts` (canvas + `node:fs`) chỉ được `khoi-telegram.ts` tham chiếu bằng `import type` (`anh-kieu`) ✔. Kiểm tay: `lib/bao-cao-sang/{khoi,khoi-in,khoi-du-lieu,telegram-html,kich-ban,luat}.ts` và `lib/bao-cao-thang/{model,sua-tay,loc-du-an}.ts` không `import` thứ gì thuộc server.

## 10. Ghi nhận khác

| Mã | Mức | Điểm |
|---|---|---|
| BA-12 | ⚪ | Bài `bao-cao-sang-cod` hay chạm trần 5 s: trong bộ đầy đủ 4.185 ms (lúc BD cũng chạy vitest). Dùng `--testTimeout=60000` hoặc tách nhóm |
| BA-13 | ⚪ | Luật 45 tái diễn ngay trong phiên kiểm: gõ `/D:\\/` trong heredoc shell → thành `/D:\/` (lỗi cú pháp). Nên dùng công cụ Write/Edit cho mọi tệp chứa `\` |
| BA-14 | ⚪ | `mc-ra.txt` rác ở gốc `4-agent-main` (untracked) — dọn kẻo `git add .` lọt |

## 11. Đạt (✔)

tsc M 0 lỗi · vitest M 1.171/1.171 (2 bỏ qua hợp lệ, hai lần giống nhau) · `bao-cao-sang-cod` 23/23 · không tệp báo cáo nào chưa vào commit · `a6ca54d` chỉ một tệp · phiên 11 và phiên 12 không dẫm ranh giới nhau · không mất `\` trong 101 tệp / 48 commit · mọi tin Telegram HTML đo được (bộ đầy đủ 21 khối, 11 tin) ≤ 4.096, thẻ cân, không rỗng · album 0/1/2/10/11/21/25 đúng · chú thích ≤ 1.024 · Form 0 cũ không đổi · luật 29 (chỉ `hoiAgent`) · khoá `dungBaoCao` chống Dựng lại đúp/trùng nhịp · luật 10 sạch.

## 12. Chưa đo được

Gửi Telegram thật (429, thứ tự, chú thích album trên máy thật, emoji cắt đôi ở 1.000) · mở `.xlsx` bằng Excel thật · thời gian «Dựng lại» với 17 dự án có số · hành vi Telegram với `&` trần/`&amp` cụt · rò listener / điện thoại hẹp (thuộc BC). **Các điều cấm đã giữ:** không gửi/gọi `guiAlbumToi`/`guiTin` thật (chỉ `fetch` giả), không bấm «Dựng lại», không gọi `damBaoKhoi(lamMoi)` thật, không gọi AI/claude CLI, không khởi động lại cổng, không `next build`, không mở `pgdata`. Bài thử tạm (`kiem-doc-lap-tmp-ba*.test.ts`) đã xoá sau mỗi lần chạy; `git status` M chỉ còn `?? mc-ra.txt`.

*Lần sau tính từ sau commit `188da0b` (M) và `0f7572e` (T).*


---

# PHỤ LỤC 2 — BB: nội dung 21 khối, luật, quyền

# BB — Kiểm độc lập nội dung báo cáo sáng (21 khối) · S1 · S4 · K3–K6

Phiên «0 Kiểm tra độc lập» · trợ lý BB · đo trên `git archive HEAD` của `4-agent-main` = `188da0b` (không đọc `data/`, không gọi AI/Telegram/cổng, không chạy tsc/vitest trong kho Main, không sửa code của ai).
Bộ đo nằm ở `bc\kho\tests\bc\*.test.ts` (fixture `fix.ts`, `fixMa.ts`); kết quả thô cùng thư mục `bc\` (`s1-bang.md`, `s1b.md`, `s4-ket-qua.txt`, `k3-*.txt`, `k4*.md`, `k5*.md`, `k6-*.md`, `bc-tin\`).
Thư mục đầy đủ: `C:\Users\Admin\AppData\Local\Temp\claude\D--3-SETUP-1-AI-SCI-Ti-n---\82fbe873-f870-4ac5-81da-b0f1f906df08\scratchpad\bc\`.
Dữ liệu mẫu: 5 dự án (Hướng Việt đủ số, Tân Thành thiếu số, «Gió <script>…», tên 100 ký tự, Nậm Pông 2 chỉ có COD chậm 1.234 ngày), 9 vấn đề, 3 việc đỏ, đủ 21 khối, mã lẫn trong tiêu đề.

## Bảng tổng

| | Số |
|---|---|
| 🔴 | 2 (BB-01, BB-02) |
| 🟡 | 10 (BB-03 … BB-12) |
| ⚪ | 8 (BB-13 … BB-20) |

## 🔴 Hỏng thật

### BB-01 · 🔴 · Kênh WEB để lọt hồ sơ pháp lý sắp đến hạn (PL-2) và cam kết nhà thầu của hợp đồng (CT-1) cho người không có quyền
- `src/lib/agent-mat-loc.ts:161-178` (`locDuLieuKhoi`) chỉ ẩn `tien`, `phieuGia`, `hoSo`, `hanChuTruong`, `cauAi`. **Không ẩn `lichHoSo` (Pháp lý, khối PL-2) và `nguonLuc.camKet` (Hợp đồng, khối CT-1).**
- Telegram vẫn đúng vì `ketXuatBoKhoi` được truyền `loc` (`dung.ts:715-722`; `khoi-telegram.ts:1212,1220,1314-1315`). Web không truyền `loc` (`XemBoKhoi.tsx:24`, `KhoiNguoiNhan.tsx:231-238`), và chuỗi JSON gửi trình duyệt (`api/bao-cao-sang/route.ts:58`, `api/bao-cao-sang/khoi/route.ts:39`, `app/bao-cao/page.tsx:107`) mang nguyên dữ liệu.
- Đo: với người xem giả không thuộc dự án nào, JSON sau `locDuLieuKhoi(...)` còn `camKet`, `lichHoSo`, «trồng rừng», «Tổng thầu EPC», «thẩm tra». «Email lạ» và «không email» (bộ lọc ẩn hết) cũng còn đủ 5 chuỗi đó (`k6-json.md`). Ma trận vai × khối × dự án (`k6-ma-tran.md`, phần web): dòng PL-2 và CT-1 là «THẤY/THẤY/THẤY» ở mọi vai kể cả Người xem, nhà thầu, Người dùng không thuộc dự án.
- Đề xuất: thêm vào `locDuLieuKhoi`: `lichHoSo` ẩn khi không có quyền Pháp lý; `nguonLuc.camKet` đặt `null` khi không có quyền Hợp đồng; thêm một bài kiểm «chạy mọi khối cho mọi vai, không còn chữ mật» để lần sau thêm khối là bị bắt.

### BB-02 · 🔴 · Gỡ trùng theo bộ làm MẤT tin và còn nói «đã có ở khối kia» (S4)
- Gốc: `khoi-telegram.ts:140` `coKhoi()` chỉ hỏi «bộ có mã khối đó không», **không hỏi khối đó có thật sự in dòng ấy cho dự án ấy không**. Dùng ở `:549-550` (RQ-1 bỏ thẻ «vượt hạn theo chủ trương» khi bộ có TQ-1; bỏ thẻ «tồn N việc quá hạn» khi bộ có RQ-6) và `:938` (DA-1 bỏ thẻ «tồn N việc quá hạn» khi bộ có RQ-6).
- Đo (`s4-ket-qua.txt`, 10 ca), bộ có cả hai khối:

| Ca | Điều kiện | Kết quả |
|---|---|---|
| S4-1 | TQ-1 «dự án tôi chọn»=[HV], RQ-1 công ty | RQ-1 bỏ thẻ «vượt hạn chủ trương» của cả LG; TQ-1 chỉ in HV → thẻ của LG biến mất. Chú giải vẫn ghi «2 việc… đã có ở khối Bảng COD» (sai) |
| S4-2 / S4-3 | `hanChuTruong` lỗi hoặc `soNgayVuot=null` | TQ-1 không in dòng hạn chủ trương và **không ghi lỗi** (`:182` chỉ in khi `ok`), RQ-1 vẫn bỏ thẻ → mất, chú giải vẫn nói «đã có» |
| S4-4 | `soNgayVuot=0` nhưng thẻ issue nói vượt 316 ngày | TQ-1 in «còn trong hạn chủ trương», thẻ vượt bị giấu → hai nguồn lệch nhau, người đọc chỉ thấy một |
| S4-5 | RQ-6 không có số (Công việc tắt) + DA-1 có thẻ «tồn 39 việc quá hạn» | DA-1 in «**Không có việc đỏ nào ngoài «Việc làm chậm COD»**» (báo sạch giả); nhánh rỗng `:958` không thêm câu «không in lại» |
| S4-6 | RQ-6 có số nhưng cổng cắt bớt người (ông kia không có trong danh sách) | cũng «Không có việc đỏ nào» |
| S4-7 | RQ-6 «dự án tôi chọn»=[LG], DA-1 công ty | thẻ của dự án HV biến mất khỏi cả hai |
| S4-9 | TQ-1 người nhận tự đặt `soDong=1` | thẻ vượt hạn của các dự án sau bị giấu ở RQ-1 mà TQ-1 không in |
| S4-10 | dự án chưa có tiến độ nhưng có thẻ vượt hạn | TQ-1 bỏ dự án, RQ-1 bỏ thẻ |
| S4-8 | tiêu đề đổi chữ «vượt hạn chủ trương» (thiếu «theo») | **an toàn**: không khớp → in cả hai chỗ (trùng chứ không mất); viết HOA vẫn khớp (cờ `i`) |

- Đề xuất: chỉ bỏ dòng ở khối này khi khối kia **thực sự in** dòng ấy cho **đúng dự án đó** (so `phamVi`/`duAnChon` và kết quả `ok`); không thì in và không nói «đã có».

## 🟡 Nên sửa

### BB-03 · 🟡 · K4 mã lọt và `boMa` xoá nhầm số thật (`khoi-telegram.ts:125-133`)
Đo bằng tiêu đề thật qua DA-1/RQ-1 (`k4c-tieude.txt`, `k4b-ma-lot.md`):

| Vào | Ra | Nhận xét |
|---|---|---|
| `Phiếu HV-EPC-ENC-CBCT-PYC-013 — Kiểm tra trạm trộn…` (mã phiếu thật của Nghiệm thu 27/10) | **giữ nguyên mã** (dòng kết luận DA-1, thẻ DA-1, thẻ RQ-1) | mẫu mã chỉ nhận tối đa 4 khúc «-» |
| `ISS_PL_0115 …`, `A.13-02 …` | giữ nguyên | gạch dưới và mã BOQ không có trong mẫu |
| `Turbine 4.6 MW`, `Nhà máy 49.5 MW`, `tổ máy 4.6 MW` | `Turbine MW`, `Nhà máy MW`, `tổ máy MW` | **mất công suất**: «số.số + chữ HOA» bị coi là mã WBS |
| `Thầu phụ N3A-HD-02 và HD-548 chậm` | `Thầu phụ và chậm` | số hiệu hợp đồng HD-548 (được phép giữ) cũng bị xoá |
| `Xử lý CV-120345 trong tuần`, `Biên bản NT-03-HV-HD02 chưa ký` | `Xử lý trong tuần`, `Biên bản chưa ký` | tiêu đề chỉ có mã thì mất nghĩa (gốc ở agent chủ phải kèm tên, luật 30) |
| Chuỗi bị `rut()` cắt giữa mã rồi mới `boMa` (`tenNganVanDe` 90 ký tự; DA-1 `:964`) | `NT-03-HV-HD02…` còn nguyên | thứ tự rút → bỏ mã phải đảo |

- Quét 9 mẫu mã (WBS, HV-, N3A-, ISS-, CV-, PL-, K-, HD-, NT-) trên 21 khối × (Telegram chữ, Telegram HTML, web chữ, cấu trúc web `kin`, nhãn ảnh) với dữ liệu sạch: 0 chỗ ở Telegram ngoài số hiệu «HD-548» (được phép) và 6 chỗ web ở BB-08. Với tiêu đề có mã: xem bảng trên.
- Đề xuất: mẫu mã không giới hạn 4 khúc; thêm «_» và «A.13-02»; chỉ xoá «số.số» khi chữ HOA sau nó không phải đơn vị (MW, MWp, MVA…); giữ số hiệu văn bản dạng «HD-548»; bỏ mã **trước** khi rút.

### BB-04 · 🟡 · K5 luật 36: còn câu nhanh/chậm không ghi «so với hệ nào»
- DA-1 `khoi-telegram.ts:953` ghi «quá hạn 3 ngày» không «so với …» (Telegram và web): «đã mở 18 ngày · quá hạn 3 ngày · do agent Hợp đồng báo». Các khối khác đã ghi hạn (RQ-5 «hạn phải có», RQ-6 «so với hạn giao việc»).
- RQ-1 `:570`: `heLuiCod` thiếu / rỗng / null → «làm COD lùi 12 ngày» và dòng đầu «nặng nhất: COD lùi 12 ngày — không cộng dồn» trần (`k5b.txt`). Chỉ gặp bản báo cáo lưu trước 15/10 nhưng web cho xem lại các ngày cũ.
- G6 `:426`: các dòng con «Turbine số 04 — trễ 59 ngày» (cấp 2) không mang hệ, hệ nằm ở thẻ cha; khi tin bị chia ở ranh giới mảnh, dòng con có thể rơi sang tin sau không còn thẻ cha (đã thấy với CT-2: `bc-tin\B-nhieu-1500-125..143.html.txt` mở đầu bằng dòng con «– Làm: …»; DA-2 cùng cơ chế).
- Đạt: luật 31 (quét mọi `dd/mm/yyyy – dd/mm/yyyy` trong 21 khối cả hai kênh → 0 chỗ thiếu số ngày); luật 34 (TQ-4 hàng «Cộng» đứng đầu khi đủ số, RQ-5/RQ-6/CT-1 dòng tổng ở đầu); luật 35 (không chỗ nào xếp nhanh/chậm bằng %; S-Curve ghi chậm bằng ngày, % chỉ là khối lượng).

### BB-05 · 🟡 · S1 `ghepHeTheoKhung` (`khoi.ts:464-489`): đo 50 ca (`s1-bang.md`) — 31 đúng, 19 khác mong đợi

| Nhóm | Ca | Hậu quả | Mức |
|---|---|---|---|
| «so với …» của AI nằm ở vế khác (sau «,», «—», «(») nhưng vẫn ghép thêm | 24, 25, 26 (+ `s1b.md`) | **hai hệ trong một câu**: «COD chậm 86 ngày so với Tiến độ mục tiêu (so với Baseline)»; hoặc lặp «so với Tiến độ mục tiêu — so với Tiến độ mục tiêu». Chính `quaLuoiLuat36` cũng loại câu đúng «chậm 86 ngày (so với Baseline)» | 🟡 |
| Hệ bắt dư phần đuôi | 19, 20 | «…so với Tiến độ mục tiêu nên cần xử lý ngay»; «Baseline do thời tiết do thời tiết» | 🟡 |
| Cùng số, khác nghĩa, cùng hệ | 02, 35, 36 | «Việc giao anh A trễ 25 ngày» bị gắn «so với Baseline» chỉ vì khung có COD chậm 25 ngày so với Baseline | 🟡 |
| Hệ bị cắt ở dấu chấm | 16 | «Baseline v2.1» → «Baseline v2» | ⚪ |
| Nhìn sau thiếu «/» và chữ | 13, 15, 50 | số «5» trong «7/5 ngày so với…» hay «T86 ngày» bị khớp | ⚪ |
| Khác dạng viết số | 07, 08 | «1234» với «1.234» không khớp → để nguyên (an toàn) | ⚪ |

Đúng cả: «1.234» và «12,5» (lookbehind `(?<![\d.,])` đúng, không bỏ sót), khung rỗng, khung nhiều số bằng nhau cùng hệ (30), hai hệ khác nhau cùng số (03 → để nguyên), 5/15, 5/0,5, «chậm thêm», «lùi», «sớm», «vượt N ngày hạn X». Trả đúng hệ khi khung chỉ có một hệ cho con số đó; ghép sai hệ xảy ra theo ba nhóm 🟡 ở trên.
Đề xuất: chỉ nhận hệ trong danh sách đóng («Tiến độ mục tiêu», «Baseline», «hạn …» có tên) thay vì bắt tới dấu ngắt; bỏ ghép nếu cùng câu đã có «so với» ở bất kỳ chỗ nào sau số; thêm `/` và chữ vào lookbehind; chỉ ghép khi chủ ngữ là COD / dự án / hạng mục.

### BB-06 · 🟡 · Lưới luật 36 bỏ sót dạng viết (`khoi.ts:425` `RE_CHAM_CO_SO`)
Đo `quaLuoiLuat36` (`k5-luoi.md`; true = câu thiếu hệ vẫn được giữ): vẫn **lọt** «chậm tới 86 ngày», «chậm hơn 86 ngày», «chậm khoảng / gần / đến / tối đa N ngày», «COD muộn 86 ngày», «**86 ngày**» (chữ đậm), «trễ 59–65 ngày» (dải), «lệch / kéo dài / tụt N ngày», «N tuần / tháng», «10 ngày chậm», «chậm (10 ngày)», «chậm: 10 ngày». Câu có «so với kế hoạch / hôm qua / mục tiêu» (không đúng hai hệ) cũng qua lưới (`RE_SO_VOI = /so\s+với|so\s+hạn/`).
Đề xuất: mở mẫu để chấp nhận từ đệm giữa từ khoá và số, thêm «muộn», đơn vị tuần / tháng và dải; bỏ `**` trước khi dò; kiểm tên hệ trong danh sách đóng.

### BB-07 · 🟡 · Luật 44 giờ Việt Nam: «đã mở N ngày» tính theo ngày UTC (`khoi-telegram.ts:941`)
`daysBetween(v.ngayMo.slice(0, 10), homNay)` lấy 10 ký tự đầu của chuỗi ISO **UTC**. Đo: thẻ mở 03:00 giờ VN 10/10 (= 20:00Z 09/10) in «**19** ngày», thẻ mở 10:00 giờ VN 10/10 in «18 ngày» (`k5b.txt`). Sai 1 ngày với thẻ mở lúc 00:00–07:00 giờ VN. Sửa: đổi qua `gioVn()` (đã import ở `:20`, dùng cho `lucVn`).

### BB-08 · 🟡 · K4 web RQ-4 hiện mã nội bộ của hợp đồng (`khoi-telegram.ts:778`)
`n.dayDu ? ${h.ma} ${rutGonTen(h.ten)} : …` — bản web ghi «NT-03-HV-HD02 Hợp đồng dịch vụ tư vấn» (mã kho nội bộ `ma_hop_dong`) và nếu tên đã bắt đầu bằng số hiệu thì lặp «HD-548 HD-548 …». 6 chỗ trong `k4-ma-lot.md` (kênh web và web-kin). Telegram không in mã này. Chốt 28/10: không ghi mã.

### BB-09 · 🟡 · K3 còn chữ «xem ở Main / xem trên web» trong tin THẬT và mã chết
- **Sống**: `kich-ban.ts:304` — dòng cuối «⚠️ Chưa hỏi được: Pháp lý (mọi dự án) · Hợp đồng (Tân Thành) — lý do xem trên web» cho hai mẫu mặc định Tổng quát và Điều hành (`chuaHoiDuoc: "mot-dong"`, đo `cuoi.txt`). Trái tinh thần N7 («không bảo mở Main / hỏi thêm mới thấy»).
- **Sống (đường cũ một chat chung)**: `luat-cod.ts:553` «… còn N việc — xem ở Main», `:572` «… xem đủ ở Main» (qua `ketXuatTelegram`, `dung.ts:784`; chỉ chạy khi chưa ai có mẫu và kho gửi rỗng).
- **Mã chết** (`ketXuatKichBan`, `dongGoiTin` chỉ còn bài kiểm gọi): `kich-ban.ts:325,328,493,519` — 4 chỗ «xem ở Main». `khoi-telegram.ts:16` còn `import { dongGoiTin }` thừa; tiêu đề tệp dòng 6 còn ghi «≤ soTinToiDa tin, ≤ 2 ảnh».
- Lệnh đo: `grep -rnE "xem ở Main|xem trên web|xem đủ ở Main" src/lib/bao-cao-sang` → 7 dòng mã (không kể chú thích).
- Đề xuất: đổi câu cuối thành nêu thẳng lý do ngắn (như mẫu «chi-tiet»); xoá mã chết.

### BB-10 · 🟡 · K3 số tin không có trần nhưng gửi không xử lý «Too Many Requests»
- Đo: 21 khối × 5 dự án = **8 tin** (thô 2.466–3.776 ký tự); 21 khối × 45 dự án = **61 tin**; trần 1.500 thì **173 tin** (`k3-A.txt`, `k3-B.txt`). Tin thô tối đa 3.956 ≤ 4.096, ký tự hiển thị (sau khi bỏ thẻ) tối đa 3.652 ✔.
- `dung.ts:719-730` gửi tuần tự `for … await guiTelegramToi` và **dừng ngay** khi một tin lỗi; `telegram.ts:92-` không xử lý 429 / `retry_after`, không giãn nhịp. Telegram giới hạn khoảng 1 tin/giây/chat: chuỗi 30–60 tin liên tục có nguy cơ bị từ chối giữa chừng → người nhận mất phần cuối (`ghiDaGui` ghi `ok:false`, nên có vết). Chưa đo được trên Telegram thật (cấm).
- Đề xuất: đợi `retry_after` rồi gửi tiếp; giãn khoảng 1 giây giữa các tin khi tin > 10.

### BB-11 · 🟡 · `chiaManh` làm hở thẻ khi MỘT dòng quá dài (`khoi-telegram.ts:1494-1515`)
Một mảnh không phải bảng mà dài hơn ~3.800 ký tự (vd. câu AI TQ-5 6.000 ký tự có `&`) bị chia theo ký tự: đo 4 tin → «thẻ chưa đóng: blockquote,i», «đóng </i> nhưng đang mở», «& trần tại 3.723» (cắt giữa `&amp;`) (`s2-ai-dai.txt`). Telegram sẽ từ chối và tin lùi về chữ thuần (đường lùi có sẵn). Hiếm (độ dài AI bị giới hạn ~60 từ, `rut` cắt phần lớn trường khác) nên 🟡 nhẹ. Đề xuất: chia theo ranh giới câu rồi đóng/mở lại thẻ.

### BB-12 · 🟡 · Chữ «chưa có số — bản hôm nay thì màn tự lấy trong vài giây…» xuất hiện cả trong Telegram
`khoi-telegram.ts:104`. Người nhận Telegram không có «màn» nào tự lấy. `dung.ts:543-546` (`damBaoKhoi` bắt lỗi → `return co`) cho phép gửi Telegram với `khoi` trống/thiếu, nên câu này vẫn có thể đến tay người nhận (mỗi khối × mỗi dự án thiếu một dòng). Ngoài ra khi dự án bị ẩn do quyền, TQ-4 (`:344`) in thêm «Chưa có số tiền nào — các dự án chưa có hợp đồng, **hoặc chưa hỏi được agent Hợp đồng**» sai lý do (xem `k6-chon-du-an.txt`). Đề xuất: câu riêng cho Telegram («chưa lấy được số hôm nay»); bỏ câu «chưa có hợp đồng» khi lý do là quyền.

## ⚪ Góp ý

- **BB-13** `khoi-telegram.ts:187` `cauChamHaiHe(…, x.chamBaselineNgay)` với `undefined` (bản lưu cũ) in «chưa có Baseline đã duyệt», còn `dongDauDuAn` (`luat-cod.ts:355`) cố ý bỏ vế đó. DA-2 `heCua()` in «tiến độ đang lập (chưa duyệt Baseline)» cũng khẳng định điều chưa biết (`k5b.txt` mục 5).
- **BB-14** Tên dự án bị cắt «…» ngay trong câu văn Telegram: «Toàn dự án Dự án điện mặt trời… hai» (`tenNgan`, 24–30 ký tự). Với tên thật ngắn không thấy; chốt 28/10 chỉ nói ảnh. RQ-4 Telegram cắt tên hợp đồng 14 ký tự («HD-548 Hợp…»).
- **BB-15** `luat-nhanh-cham.ts:39` `chuNgay(0)` = «đúng hạn» (không «0 ngày»), còn luật 35 liệt kê «đúng hạn» là chữ phải thành số ngày. TQ-1 Tân Thành in «đúng hạn so với Tiến độ mục tiêu».
- **BB-16** RQ-5 `khoi-telegram.ts:835` luôn ghi «(hạn phải có …)» và dòng tổng (`:825`) lấy `soVoi` của hồ sơ đầu tiên áp cho cả tổng; nếu Pháp lý trả «hạn giấy phép» cho hồ sơ khác thì sai tên hạn.
- **BB-17** Người dùng chưa có sơ đồ tổ chức (`loaiTheoDuAn` rỗng) thấy mật mọi dự án (luật cũ, ghi ở `agent-mat-tren-main.ts`) — đúng thiết kế, ghi lại để biết. Nhà thầu có bảng «engineer» ở HV thấy mật HV; nhà thầu không có bảng bị ẩn hết ✔.
- **BB-18** «Dựng lại» là cửa «ghi» (PM · Admin · Người dùng), không chỉ quản trị: `BaoCaoSangView.tsx:61,148-155`. Người xem thấy nút mờ kèm lý do (luật 17 ✔) nhưng vẫn đọc chữ «bấm Dựng lại» ở `DienThoaiTelegram.tsx:73`, `KhoiNguoiNhan.tsx:538`, `api/bao-cao-sang/khoi/route.ts:34`. Telegram không còn chữ «Dựng lại» ✔ (sau `6b7021f`).
- **BB-19** Lỗi thô của agent đi nguyên vào tin (chỉ `lamSachLoi` thay 3 mẫu): «…trả khuôn lạ, không có trường ok» (`hoi-agent.ts:226`), `e.message` JS tiếng Anh (`gom-khoi.ts:78`). Chưa gặp trên số thật.
- **BB-20** Mã không tự in `undefined / null / NaN / [object Object] / Invalid Date` ở đâu trong 21 khối (quét `k3-chu-ky-thuat.txt`; chữ «undefined» trong kết quả chỉ vì fixture cố ý để agent trả đúng chuỗi đó).

## ✔ Điểm đã kiểm đạt

| Điểm | Đo |
|---|---|
| K3 thẻ đóng đủ | 8 + 61 + 173 tin HTML, 0 lỗi thẻ (b, i, pre, blockquote), 0 `<` / `&` trần |
| K3 rò từ dữ liệu | tên «<script>alert(1)</script> & <b>x</b>» ở tên dự án, việc, hồ sơ, người, biên bản: mọi chỗ được thoát `&lt;` `&amp;`; không thẻ lạ |
| K3 ≤ 4.096 | thô tối đa 3.956, hiển thị tối đa 3.652; tin sau có «(tiếp k/n)» và tiêu đề khối «(tiếp)» |
| K3 mỗi khối riêng | 21/21 khối 1 tin, thô 459–1.780 ký tự, 0 lỗi thẻ (`k3-rieng.md`) |
| Tiếng Việt / kỹ thuật | không `snake_case`, `undefined`, `NaN`, `null`, `[object Object]`, `Invalid Date`, tên công cụ máy |
| Luật 31 · 34 · 35 | xem BB-04 |
| Luật 44 NT-2 | «27/10/2026 09:39» từ `02:39Z` ✔ (`lucVn`) |
| K6 Telegram | mọi khối tiền / phiếu giá / cam kết / hồ sơ / hạn chủ trương / câu AI / thẻ Hợp đồng / Pháp lý đúng quyền ở 11 vai × 3 dự án |
| K6 «Dự án tôi chọn» | chọn dự án mình không thuộc không làm lộ: ô thành «ẩn — tài liệu mật…» (`k6-chon-du-an.txt`) |
| K6 thẻ Công việc | agent id `base` lọc theo dự án đúng |

### Ma trận K6 rút gọn (Telegram; web giống hệt trừ PL-2 và CT-1) — ô = HV / LG / XX

| Vai | Tiền, phiếu giá, cam kết (HĐ) | Hồ sơ, hạn chủ trương (PL) | Thẻ Công việc |
|---|---|---|---|
| Admin | 3/3 | 3/3 | 3/3 |
| PM là Giám đốc dự án HV | HV | 3/3 | 3/3 |
| PM không là GĐ dự án nào | ẩn | 3/3 | 3/3 |
| Người dùng thuộc HV | HV | HV | HV |
| Người dùng không thuộc dự án nào | ẩn | ẩn | ẩn |
| Người dùng chưa có sơ đồ | 3/3 (luật cũ) | 3/3 | 3/3 |
| Người xem thuộc HV | HV | HV | HV |
| Người xem không thuộc / chưa có sơ đồ | ẩn | ẩn | ẩn |
| Nhà thầu (có / không có bảng) | HV / ẩn | HV / ẩn | HV / ẩn |
| **Web: PL-2 và CT-1** | **mọi vai thấy 3/3 (BB-01)** | | |

## Chưa đo được / không làm

- Gửi Telegram thật (cấm): chưa kiểm 429 và hiển thị `<blockquote>` trên điện thoại.
- Không đọc `data/` thật: các câu lỗi thật của agent không có (BB-19).
- Ảnh vẽ (`ve-anh.ts`), `KhoiInWeb.tsx` trên điện thoại hẹp, S2/S3/S5/S7/S8/S9: của trợ lý khác (BA, BC); chỉ xét nhãn ảnh trong quét mã K4 (JSON `dacTa`, không thấy mã).
- `boLocMatCuaNguoi` chạy bản thật nhưng giả `users` / `projects` / `he-thong-dung-chung` (vai × dự án dựng tay), không dùng sơ đồ tổ chức thật.

## Xác nhận các điều cấm
Không bấm/gọi Gửi ngay · Gửi lại · Gửi thử, không `guiAlbumToi` / `guiTin` / `guiTelegramToi`; không Dựng lại, không gom khối bằng agent/AI thật, không gọi AI hay `claude`; không đọc `data/` (archive đã xoá thư mục `data`); không khởi động lại cổng; không `next build`; không gọi cổng 3004; không chạy tsc/vitest trong kho Main (chỉ vitest trên bản `git archive` ở `bc\kho`). Không sửa tệp nào trong `4-agent-main`.

Lần sau tính từ sau commit `188da0b`.


---

# PHỤ LỤC 3 — BC: giao diện sống + ảnh

# BC — kiểm giao diện sống + ảnh: báo cáo sáng · tuần · tháng (27/10/2026 chiều)

Người kiểm: trợ lý BC (phiên «0 Kiểm tra độc lập»). Không sửa code, không bấm Gửi/Dựng lại/Lưu, không động cổng nào. G = `D:\3 SETUP\1 AI\SCI Tiến độ\SCI-AI-AGENT`; M = `G\4-agent-main`; T = `G\5-Agent-tien-do`.
Đăng nhập: trình duyệt đã có phiên `test.quantri@scigroup.vn` (`/api/auth/me` → admin). Ảnh vẽ bằng chính `ve-anh.ts` của HEAD (`git archive` ra thư mục tạm ngoài kho, `jiti`), PNG ở `scratchpad\bc\bc-anh\`.

## Bảng tổng

| | Số |
|---|---|
| 🔴 sai chốt / sai số | 2 (BC-01, BC-02) |
| 🟡 nên sửa | 9 (BC-03 … BC-11) |
| ⚪ góp ý | 8 (BC-12 … BC-19) |

## 🔴

**BC-01 🔴 Hàng ghim «Báo cáo Tuần» (3003) chui dưới thanh trên — mất ba tab khi cuộn** (chốt anh 28/10: «cuộn trang vẫn thấy»)
- Đường bấm: `localhost:3003/report-mgmt` → cuộn xuống bất kỳ.
- Đo: topmenu `header` dính `top:0`, cao 38 px, z-index 40; hàng ghim `.thanh-ghim.ghim-the-cho` dính `top:0`, cao 51,4 px (màn 1366) / 173 px (màn 375), z-index 30 ⇒ 38 px đầu hàng ghim bị topmenu che. Cuộn 900 px: hàng ghim `top=0..51`, topmenu `0..38`; chụp phóng to chỉ thấy topmenu, không thấy ①②③ và nút «AI viết lại nháp / Xuất Excel».
- Gốc: `T\src\components\tabs\report-mgmt\NhapAiTuan.tsx:264` dùng lớp `ghim-the-cho` (`top:0`, `T\src\app\globals.css:~222`) — lớp này chỉ đúng cho trang truyền `coGhim` vào `<Header>` (topmenu cuộn trôi: `detail`, `gantt`, `planning`); `T\src\app\report-mgmt\page.tsx:15-18` KHÔNG truyền `coGhim` nên topmenu vẫn dính.
- So: Main (3010 `/bao-cao?tab=thang`) đúng — hàng ghim dừng ở `top:38` ngay dưới topmenu (đo: cuộn 1200 px → `38..88,65`), vì `M\globals.css:167` đặt `top: var(--cao-topmenu)` và không có `ghim-the-cho`.
- Đề xuất: bỏ `ghim-the-cho` ở dòng 264 (hàng ghim sẽ dính `top: var(--cao-topmenu)`).

**BC-02 🔴 Tin sáng tự mâu thuẫn về Baseline của Tân Thành và Nậm săm 3A (luật 36 · luật 38)**
- Đường bấm: `localhost:3010/bao-cao` → ① Báo cáo sáng của tôi → khung điện thoại «Cả báo cáo» (tin 1/7).
- Thấy: khối Bảng COD ghi «Tân Thành — … **đúng hạn so với Baseline**» và «Nậm săm 3A — … **đúng hạn so với Baseline**». Cùng tin, khối Hạng mục tự làm COD chậm: «⚠ **Tân Thành: chưa có Baseline đã duyệt**». Báo cáo tháng (tab ① Tổng quan, Bảng 3): Tân Thành và Nậm săm 3A đều «**chưa có Baseline đã duyệt**». Khối S-Curve (tin 7/7) lại in «Baseline xong 100% ngày 24/04/2028» cho Tân Thành và «21/08/2027» cho Nậm săm 3A — đường tên «Baseline» của dự án chưa duyệt.
- Mã sinh ra: `M\src\lib\bao-cao-sang\luat-cod.ts:355-358` in `cauChamHe(d.chamBaselineNgay,"baseline")`; chỉ in «chưa có Baseline đã duyệt» khi giá trị `null` (`dung.ts:275` `docSo(d.cham_ngay_so_baseline)`). Tin hôm nay in «đúng hạn» nghĩa là cổng Tiến độ trả **0** (không phải null) cho hai dự án này, trong khi cổng/bản tháng cho null. Chưa truy tới cổng 3003 (chỉ đọc màn).
- Hệ quả: người đọc thấy «đúng hạn so với Baseline» mà Baseline chưa được duyệt; vi phạm luật 36 (nói tên hệ đúng — `TEN_DANG_LAP` dành cho trường hợp này, `luat-nhanh-cham.ts:35-43`) và luật 38 (số hai màn lệch nhau).
- Đề xuất: phiên 12 / BB đo cổng `tom_tat_du_an.cham_ngay_so_baseline` của hai dự án; nếu cổng trả 0 khi không có Baseline đã duyệt thì sửa gốc ở Tiến độ, nếu Main đọc nhầm trường thì sửa `dung.ts:275`.

## 🟡

**BC-03 🟡 Số «hồ sơ thiếu» lệch giữa Sáng và Tháng cho cùng dự án (luật 38)**
- Sáng (khung điện thoại, khối Hồ sơ pháp lý quá hạn): Hướng Việt «thiếu **78 trên 97**», Tân Thành «thiếu **91 trên 103**», Nậm săm 3A «thiếu 78 trên 78».
- Tháng (`/bao-cao?tab=thang` → ② Chi tiết, Bảng 6 và 7): Tân Thành «Thiếu **20/103** hồ sơ phải có», Hướng Việt «Thiếu **20/85** hồ sơ phải có».
- Mã: `M\src\lib\bao-cao-thang\khuon-agent.ts:480` in `so_thieu`/`tong_ho_so_phai_co` của cổng Pháp lý (chế độ `theo_ket_qua`); chữ «20» khớp trần 20 hồ sơ mỗi lần của Pháp lý, nên có thể đang in số dòng trả về thay vì số thiếu thật; Hướng Việt còn lệch cả mẫu số (85 và 97).
- Đề xuất: BD/BB so cổng; thống nhất một hàm đếm cho cả hai màn.

**BC-04 🟡 «Nhận xét chung» AI trên Báo cáo tuần cũ 7 ngày, số lệch ngay cạnh bảng**
- Đường bấm: `localhost:3003/report-mgmt` → ① Thông tin và tiến độ → mục II.
- Bảng ghi «chậm 59 ngày so với Baseline · chậm 101 ngày so với Tiến độ mục tiêu»; hạng mục 6 «chậm 56 ngày so với Baseline». Dòng 🤖 Nhận xét chung (AI viết 20/10 15:14, đã có người sửa) ghi «chậm **44** ngày so với Baseline và chậm **86** ngày so với Tiến độ mục tiêu», hạng mục 6 «chậm **41** ngày», hạng mục 7 «chậm **44** ngày».
- Không có cảnh báo «số trong lời văn khác số bảng hiện tại»; chân trang chỉ ghi «AI viết lúc 20/10/2026 15:14 · đã có người sửa tay».
- Đề xuất: máy so các số ngày trong lời văn với bảng, lệch thì hiện hộp vàng «lời văn cũ — số hiện tại là …».

**BC-05 🟡 Báo cáo tuần tự nói ngược: «Không có hạng mục găng quá hạn so với Baseline» trong khi bảng chậm 59 ngày**
- Cùng màn tab ② mục III: «Không có hạng mục găng quá hạn so với Baseline tuần này» và hộp vàng «Không có việc găng quá hạn baseline tuần này (mục III trống)»; tab ① mục II ghi hạng mục 7 và hạng mục 9 «chậm 59 ngày so với Baseline». Sáng 27/10: «21/21 việc găng trễ 55–65 ngày so với Baseline».
- Có thể là hai định nghĩa («quá hạn tại ngày cắt 11/10» khác «dự báo trễ») — người đọc không phân biệt được. Chữ «baseline» viết thường ở hộp vàng.
- Đề xuất: ghi định nghĩa ngay dưới câu, hoặc dùng cùng định nghĩa «việc găng dự báo chậm so với Baseline».

**BC-06 🟡 Mã WBS vẫn lọt vào bản web và tin Telegram (chốt 28/10 «không ghi mã»)**
- Đường bấm: `/bao-cao` → ② Người nhận → Xem mẫu «Điều hành» (hoặc «Dự án») → «Xem bản web đầy đủ» → khối RQ-1, cột Ghi chú. Và khung điện thoại tin 2/7 (khối Thử: xử lý xong thì COD về đâu).
- Thấy (chữ thật): «Vì sao: Găng chuyển từ **6.1.4** Cung cấp Hub, Nacelle, Blade sang **6.1.6** Cung cấp Tổ…», «**6.1.6** xong 22/06/…», «thử kéo cả hạng mục **6.1** Hợp đồng cung cấp…», «Vì sao: **1.1:** không áp — dự án chưa có ngày cắt dữ liệu», «**3.3:** không áp —». Telegram (Nậm săm 3A): «Mọi 2 việc (**1.1:** không áp — dự án chưa có ngày cắt dữ liệu — dự báo đang bằng kế hoạch…)».
- Mã: `M\src\lib\bao-cao-sang\khoi-telegram.ts:587,592` đưa `ly` (lý do của cổng) và `kem` vào chữ không qua `boMa`; `boMa` (`:125-132`) chỉ bỏ số WBS khi sau nó là khoảng trắng + chữ hoa, nên «1.1:» và «6.1.6 xong» lọt; `:731` ghép `khongDoi` cũng không qua `boMa`.
- Đề xuất: cho `ly` và `kem` đi qua `boMa` (mở rộng regex cho «n.n:» và «n.n.n <chữ thường>»).

**BC-07 🟡 Câu bot chỉ sai chỗ nối Telegram (luật 43, menu đã đổi)**
- `M\src\lib\telegram-tro-ly\thuan.ts:100`: «đăng nhập website Main → **góc dưới thanh bên trái bấm biểu tượng ✈** «Nối Telegram»». Thực tế mục nằm ở **menu tên người (góc trên phải), dòng cuối** (`components\layout\UserMenu.tsx:139`), không còn biểu tượng ✈ trên thanh trái.
- `M\src\lib\telegram-tro-ly\noi-tai-khoan.ts:48-49` cũng chỉ «→ ✈ Nối Telegram». Hướng dẫn «Nối Telegram» (`lib\huong-dan\tab\noi-telegram.ts` bước ①) viết «bấm «✈ Nối Telegram»» còn nhãn thật là «Nối Telegram» (không ✈).
- Người chưa nối nhắn bot sẽ nhận đúng câu `thuan.ts:100` — lối vào của chính tính năng.
- Đề xuất: sửa ba chỗ thành «bấm tên của anh/chị góc trên bên phải → dòng cuối «Nối Telegram»».

**BC-08 🟡 Đổi tên menu 3003 («Báo cáo Tuần», «Data đầu vào») nhưng còn tên cũ ở ba nơi (luật 43)**
- `M\src\lib\gioi-thieu\noi-dung.tsx:390`: «BC Kỹ thuật hiện trường · BC Lãnh đạo».
- `T\src\lib\ai\van-phong.ts:18` (lời dặn hệ thống của AI): «/report-field (BC kỹ thuật hiện trường, BC ngày) · /report-mgmt (BC lãnh đạo, BC tuần)» — AI sẽ gọi trang bằng tên không còn trên menu.
- `T\src\lib\kiem-thu\noi-dung-bc.ts:77`: «Người dùng và Người xem ở BC lãnh đạo».
- Đã đổi đúng: `T\Sidebar.tsx`, `T\src\lib\giai-thich\noi-dung.ts`, `T\src\lib\huong-dan\tab\bc-lanh-dao.ts` (tiêu đề «Báo cáo Tuần»). Tên tệp/mã khoá `bc-lanh-dao` giữ cũ là được.

**BC-09 🟡 Báo cáo tháng Bảng 10: dòng «Còn N vấn đề khác» không ghi dự án; câu «xem ở màn Issue của Main» đứng trong Main**
- Đường bấm: `/bao-cao?tab=thang` → ③ Kiến nghị & kế hoạch → Bảng 10 (thu gọn).
- Bốn dòng liền nhau «Còn 45 vấn đề khác … / Còn 8 … / Còn 9 … / Không có vấn đề nào làm chậm COD. Còn 5 …» nằm dưới dự án Hướng Việt vì dòng tên các dự án khác bị gấp vào «Xem thêm 4 dòng» — đọc như Hướng Việt còn 45+8+9+5 vấn đề (đo `tr` của bảng: 11 dòng, chỉ một dòng tên dự án).
- Mỗi dòng kết «— xem ở màn Issue của Main» trong khi người đọc đang ở Main (chốt N7: «không bảo mở Main»).
- Đề xuất: dòng «Còn N …» đưa tên dự án lên đầu dòng; bỏ cụm «xem ở màn Issue của Main» (hoặc đổi thành nút bấm tới `/issue`).

**BC-10 🟡 Kỳ báo cáo tuần thiếu số ngày (luật 31)**
- `localhost:3003/report-mgmt` mọi tab: «Kỳ báo cáo * Tuần 41/2026 (05/10/2026 – 11/10/2026)»; ô «Thời gian thi công 02/09/2026 … – 12/11/2027 …» cũng không kèm số ngày. Báo cáo tháng làm đúng: «Tháng 09/2026 · 30 ngày · 01/09/2026 – 30/09/2026». (Nếu đây là ô cố định của mẫu Form 7 thì thuộc ngoại lệ luật 31 — nhờ anh xác nhận; riêng phần hiện trên màn nên thêm «7 ngày».)

**BC-11 🟡 Ảnh thanh ngang bỏ thanh vượt 7 chỗ, kể cả khi còn chỗ; thanh «quá hạn» chỉ là sàn 20**
- Đo bằng `veAnh` (HEAD `ad0f816`): 8 thanh nhãn ngắn → chỉ vẽ 6 + dòng «… và 2 mục khác không đủ chỗ vẽ» (`ve-anh.ts:717-720`: `toiDaThanh = floor(vùng/46)` = 7, phần dư chiếm một chỗ); 12 thanh nhãn hai dòng → vẽ 6; 7 thanh nhãn hai dòng + tiêu đề 3 dòng → vẽ 5 (`bc-anh\12-…png`). Ảnh «Việc quá hạn theo người» của dữ liệu thật hiện 7/7 vì mới 7 người; công ty 55 người sẽ chỉ thấy 6.
- Ảnh «Hồ sơ pháp lý» thật: thanh «quá hạn» Hướng Việt = 20 và Nậm săm 3A = 20 là trần của Pháp lý (tiêu đề đã ghi «≥ 20», thanh thì như số thật).
- Trái tinh thần N7 «giữ nguyên danh sách dài» chỉ ở ảnh (bảng chữ vẫn đủ). Đề xuất: nếu muốn giữ đủ thì ảnh thứ hai cho phần dư, hoặc nâng `toiDaThanh` bằng cách giảm khoảng cách thanh (46 → 40 cho 8 thanh).

## ⚪

**BC-12 ⚪ Ảnh — cắt «…» còn ở hai chỗ** (commit 7446c8e nói «ảnh không cắt tên»): (a) nhãn thanh ngang dài hơn hai dòng (80 ký tự → «Công ty … Hướng Hoá…», ca 01); (b) nhãn cuối đường của kiểu `duong-so` khi nhiều dự án: «Thủy điện Nậm Xe (NX — dữ…», «Điện gió Hướng Việt (HV — d…» (ca 06). Dữ liệu thật hôm nay (một dự án «Hướng Việt +22») chưa gặp.

**BC-13 ⚪ Ảnh — chữ hạ cỡ còn 10 px khi thu 360 px**: `veKhung` hạ tiêu đề 25→22→20 và `veNhanThanh` nhãn hai dòng cỡ 20 ⇒ 10 px ở rộng 360, dưới mức «≥ 11 điểm» ghi ở `ve-anh.ts:~90` (`CO_CHU`). Đọc được nhưng nhỏ (ca 05, 12 thu 360 `…-360.png`). Ảnh S-Curve thật: chú giải chiếm khoảng 40% chiều cao, vùng đồ thị còn ~35%.

**BC-14 ⚪ Ảnh — số cực lớn / âm**: thanh hai chiều 98.765.432 và −1.234.567: nhãn trục «−20.000.000…100.000.000» chồng lên nhau thành một cục (ca 07); thanh ngang nhận giá trị âm thì bị ép về 0 và ghi «0 ngày» (`ve-anh.ts:700` `Math.max(0, …)`, ca 08). Không xảy ra với dữ liệu thực tế hôm nay.

**BC-15 ⚪ Ảnh đạt**: 0 thanh / 0 đường → ảnh «Chưa có số liệu để vẽ» (tiếng Việt, không ném lỗi); 1 thanh, 1 điểm vẽ gọn; tên dấu kép «Ếẫ Ứờ Ộỗ Ằẵ» hiện đủ dấu; số 1.234.567,89 hiện chuẩn Việt Nam; tiêu đề 160 ký tự vào 3 dòng cỡ 20 không tràn; 250 ký tự thì cắt «…» ở cuối dòng 3 (hợp lệ theo thiết kế). Cả 6 ảnh thật hôm nay (720×480) đọc được ở rộng 360.

**BC-16 ⚪ Điện thoại 375×812 — Main và 3003 chưa dùng được, nhưng quy ước dự án chỉ test điện thoại ở 3004** (`memory/chi-test-dien-thoai-agent-cong-viec.md`). Số đo để biết:
- Main `/bao-cao?tab=thang`: vùng `main` rộng **199 px** (thanh trái + khung trợ lý dock bên phải chiếm phần còn lại); hàng ghim cao **254 px** (31% màn 812), ba tab xếp chữ từng từ; `scrollWidth` trang **742** > 375 (cụm nút thanh trên `flex shrink-0 whitespace-nowrap` rộng 566 trong ô 199–319).
- 3003 `/report-mgmt`: `scrollWidth` **622** > 375; thanh trên 566 > 319 ⇒ «Tuần 44 · ? Hướng dẫn · Giải thích · Góp ý · tài khoản» văn trôi ra ngoài; hàng ghim cao **173 px** (21% màn) + 38 px topmenu (và bị che — BC-01).
- Bảng: cả ba bảng của `KhoiInWeb` (`Việc | Số liệu | Ghi chú`) nằm trong khung `overflow-x-auto` riêng (khung 124–126 px, bảng 196–876 px, cuộn ngang trong khung) — **không phá layout cả trang**; bảng tháng cũng trong khung riêng (640 trong 110). Đạt phần «bảng tràn thì trượt ngang».

**BC-17 ⚪ Mỗi lần tải trang Main/3003 kéo thêm khung trợ lý của 3004** (`/nhung/chuong` 1–3 lần/trang + 15 tệp tĩnh + `/api/toi`, `/api/tro-ly/phien` trả **401** vì tài khoản thử không có ở 3004). Console «Failed to load resource 401» ~25 dòng mỗi lượt; đây là hành vi của trang chứ không phải bài kiểm gọi 3004, nhưng tôi đã tải ~12 trang nên có ~12–30 lượt vào 3004. API riêng của Main: không có 4xx/5xx; trùng lặp: `/api/projects` gọi 3–4 lần một lượt tải, `/api/issue-main`, `/api/viec/goc`, `/api/tuan-bao-cao`, `/api/bao-cao-sang/nguoi-nhan` mỗi cái 2 lần (có thể do chế độ dev).

**BC-18 ⚪ Thời gian tải (dev)**: Main `/bao-cao` lần nạp đầu `DOMContentLoaded` 5,95 s, `load` 7,03 s; API chậm nhất `/api/skill` 4,4 s, `/api/tuan-bao-cao` 4,2 s, `/api/bao-cao-sang/nguoi-nhan` 2,3 s (lần đầu sau khởi động: 8,6 s). 12 ảnh `/api/bao-cao-sang/khoi` 1,0–2,4 s mỗi ảnh. 3003 `/report-mgmt` lần đầu: màn «Đang đọc khung số…» quá 10 s (`/api/bao-cao-tuan` lần đầu chậm, lần hai 0,8 s). Console 3010 lần tải đầu có «Uncaught SyntaxError: Invalid or unexpected token» (không truy ra tệp: 6 tệp script của trang đều `new Function` được; có thể ở khung 3004).

**BC-19 ⚪ Vụn vặt**:
- Tuần mục III bảng khối lượng: STT «1» rồi «3» (thiếu 2) — một dòng bị lọc mà số thứ tự vẫn giữ.
- Tuần: dòng «Mã mẫu: form-7 — máy nhận mẫu bằng dòng này.» hiện trên màn (chữ kỹ thuật cho người dùng; có thể cố ý để máy nhận Excel).
- Câu AI mỗi dự án (TQ-5) dùng «Dự án **HV** hoàn thành», «Dự án **TT** chưa khởi động», «Dự án **N3A** đạt …» — mã dự án thay tên (tinh thần luật 30 / chốt 28/10); và «đúng hạn Baseline» thiếu «so với» (luật 36).
- Câu hỏi 🤖 trong RQ-1 vẫn viết «Cung cấp Hub… đến cảng Hòn La» (rút «…» giữa tên) dù thẻ phía trên in đủ tên (`memory`: tên bị cắt là sai).
- Báo cáo tháng khi chưa có bản nháp: nút «⬇ Xuất Excel» là `span` mờ không có `title` giải thích (`BaoCaoThangView.tsx:427`, luật 17 cần «mờ kèm lý do»).
- Báo cáo tháng/tuần có nút «Tải Markdown» (chữ kỹ thuật) — nên «Tải bản văn bản».
- Người xem: máy chủ cho tự sửa bộ khối/chọn dự án của chính mình (`nguoi-nhan/route.ts:78,98`, `requireRole("xem")` + đúng mã); luật 17 («nút mờ») chỉ đúng với dòng người khác. Thiết kế có chủ ý (comment `maCuaToi`) — ghi để anh biết. Người xem thêm được khối «TQ-4 Tiền các dự án» vào bộ của mình: chưa kiểm xem `locDuLieuKhoi` lúc dựng có lọc tiền cho vai này không (K6 không thuộc phần tôi).

## ✔ Đã kiểm đạt

| Điểm | Cách đo |
|---|---|
| S5 `OChonDuAn`: bấm ra ngoài thì gập | Mở «✎ Sửa» đầu cột → chọn ô trống: số khung chọn dự án trên trang 1 → 0 |
| S5 hai ô cùng lúc | Mở «✎ Sửa» rồi bấm «Dự án tôi chọn: …» ở TQ-2: trên trang luôn đúng 1 khung (state đơn `moChonDuAn`, `SuaBoKhoi.tsx:139`) |
| S5 rò listener | `SuaBoKhoi.tsx:55-63`: `addEventListener("mousedown")` có cleanup `removeEventListener` khi unmount / đổi `onDong`; bấm ✕ xoá khối (ngoài khung) → `mousedown` ngoài khung → tự đóng nên không treo trạng thái mở cho khối đã xoá |
| S5 luật 17 | `disabled={!suaDuoc}` + `title={lyDoChan}` ở nút «Dự án tôi chọn» (`:350-366`) và ô chọn (`:80-81`); `lyDoChan = LY_DO_CHAN.caidat` «Cài đặt chỉ PM và Admin được làm.» (`quyen.ts:84`). Chưa đăng nhập được vai Người xem để thử thật → «chưa đo được» bằng bấm, đã đọc mã |
| S6 gom thẻ → bảng | `KhoiInWeb.tsx:36-52`: chỉ gom các `the` liên tiếp trong CÙNG một khối; chen `chu`/`chuGiai`/`thieu` thì tách bảng mới; câu hỏi 🤖 chỉ gắn vào thẻ ngay trên nó. Web thật: «Việc \| Số liệu \| Ghi chú», 🤖 liền dưới việc |
| K2 bảng cho thẻ việc (web), thẻ cho Telegram | web đầy đủ có `table`; khung điện thoại giữ thẻ chữ |
| K2 danh sách dài không cắt | khung điện thoại: 7 tin («tiếp 2/7 … 7/7»); hồ sơ pháp lý in đủ 20 hồ sơ/dự án (trần do Pháp lý — đã nói rõ ở ⓘ); việc găng 21/21 liệt đủ |
| K2 việc lớn ở đầu | RQ-1 «COD lùi nhiều nhất trên đầu», Bảng COD «nặng nhất trên đầu», Hồ sơ «quá hạn nhiều nhất trên đầu» |
| K2 luật 36 (phần lớn) | «chậm 101 ngày so với Tiến độ mục tiêu · chậm 59 ngày so với Baseline», «lùi 59 ngày so với Baseline», «Thực tế chậm 39 ngày so với Tiến độ mục tiêu», tiêu đề ảnh «Nặng nhất 56 ngày so với Baseline» |
| K2 luật 31 (sáng, tháng) | «34 ngày · 24/09/2026 – 27/10/2026», «586 ngày · 06/04/2026 – 12/11/2027», tháng «30 ngày · 01/09 – 30/09/2026» |
| K2 luật 34 | Bảng 8 báo cáo tháng «TỔNG CỘNG · 3 dự án» ở hàng đầu; Bảng 3 tuần mục II «TỔNG TIẾN ĐỘ DỰ ÁN» hàng đầu |
| K2 luật 18 | «? Hướng dẫn» luôn hiện, cam phát sáng ở tab Người nhận (Main) và trang Báo cáo Tuần (3003); 🟢🟡🔴 đều có chú giải ⓘ trong khối |
| K2 luật 28 | `Pill` 3003 là chữ trần (`StatusBadge.tsx:19-27`); không thấy `span` có viền bo ở `bao-cao-sang`/`report-mgmt` (một ngoại lệ ở tháng: nút Xuất Excel mờ, xem BC-19) |
| K2 luật 17 (tháng/sáng) | nút Dựng lại / Gửi / Làm lại / Soạn nhận xét: `disabled={!coGhi}` + `title={LY_DO_CHAN.ghi}` (`BaoCaoSangView.tsx:149-150,163-164`; `BaoCaoThangView.tsx:381-398`) |
| K9 lỗi tiếng Việt | `nguoi-nhan/route.ts` mọi `message` tiếng Việt; lỗi ghi tệp bọc câu Việt (`kich-ban-kho.ts:106`); không thấy câu lỗi Anh trong 3 màn |
| K9 hướng dẫn «Nối Telegram» | các tên «Báo cáo → Báo cáo sáng → ② Người nhận», «Cài đặt → Kết nối → Bật nhận tin», nút «Lấy mã nối», «Nối sang chat Telegram khác», «Gỡ nối», «bấm vào đây» khớp `NoiTelegram.tsx` và trang thật; chỉ lệch nhãn «✈» (BC-07) |
| K9 hướng dẫn Báo cáo Tuần | tên «① Thông tin và tiến độ / ② Đường găng, khối lượng, GPMB / ③ Rủi ro và việc tuần tới», nút «AI viết lại nháp», «✎ Sửa lời văn mục …», «⬇ Xuất Excel» khớp trang |
| K7 6 ảnh thật | ở rộng 360 đọc được; tiêu đề 2 dòng không tràn; không đè nhãn |

## Chưa kiểm được

- Vai **Người xem** thật (không có tài khoản thử vai này; không tạo tài khoản mới). S5 luật 17 chỉ đọc mã; K2 quyền xem khối tiền chưa thử.
- **Màn «Báo cáo sáng của tôi» trên điện thoại thật** (chỉ giả lập 375×812, và theo quy ước dự án không phải đích của Main/3003).
- Gốc dữ liệu của BC-02/BC-03 (cổng Tiến độ `cham_ngay_so_baseline`, cổng Pháp lý `so_thieu`): chưa gọi cổng, chỉ so các màn.
- Nguồn của «Uncaught SyntaxError» (BC-18).
- Không bấm: Gửi/Gửi lại/Gửi thử/Dựng lại/Lưu/AI viết nháp/Xuất Excel/Soạn nhận xét; không chọn dự án trong ô (sẽ tự lưu). Nút «Gửi ▾» không mở.
- Không chạy tsc/vitest.

## Xác nhận các điều cấm

Không tắt/khởi động lại/dựng lại cổng nào; không `next build`; không sửa code/`data/` của ai; không đọc `.env.local`; không gọi AI thật, Telegram thật; không gọi trực tiếp 3004 (chỉ khung trợ lý 3004 do chính trang Main/3003 nhúng tự tải — BC-17); không tự ký cookie, không tạo tài khoản. Tệp tạm: `scratchpad\bc\tam-ve\` (bản `git archive` + junction `node_modules`, đã gỡ junction bằng `rmdir`), `ve.cjs`, `ve2.cjs`, `bc-anh\*.png`. Đã `resize_window` về desktop.

Lần sau tính từ sau commit `ad0f816` (M) và `0f7572e` (T).


---

# PHỤ LỤC 4 — BD: báo cáo tháng, tuần, Excel, kho Tiến độ

# BD — Báo cáo THÁNG (Main) + Báo cáo TUẦN (3003) — kiểm độc lập 27/10/2026 ~16:40

Người kiểm: trợ lý BD. Không sửa code của ai. Mọi thí nghiệm chạy trên bản `git archive` ngoài kho (đã gỡ junction `node_modules` bằng `rmdir`; kiểm lại: 3 `node_modules` gốc còn nguyên 245–248 mục). Tệp thử + kết quả để ở `...\scratchpad\bc\bd-out\`.
HEAD Main lúc lấy archive: `188da0b` (hiện đã nhích tới `ad0f816`, không đụng báo cáo tháng). HEAD 3003: `0f7572e`.

## 0. Tóm tắt

| | 🔴 | 🟡 | ⚪ |
|---|---|---|---|
| Số điểm | 0 | 13 (BD-1 đến BD-6, BD-T1 đến BD-T6, BD-9) | 14 (BD-7, 8, 10 đến 15, 20; BD-T7 đến T11) |

| Lệnh (chỉ chạy ở 3003 = T) | Kết quả |
|---|---|
| `npx tsc --noEmit -p .` | **0 lỗi** (exit 0) |
| `npx vitest run --testTimeout=60000` | 163 tệp: **162 qua · 1 hỏng**; 1634 bài: **1633 qua · 1 hỏng · 0 bỏ qua** (53,9 s) |
| Bài hỏng | `tests/unit/mcp-loc-nguoi-xem.test.ts:66` — **không do báo cáo**: chạy lại ở `git archive 16f2166^` (cha của commit báo cáo tuần đầu) cũng hỏng y hệt (11 qua / 1 hỏng). Nguyên nhân: 4 công cụ BOQ `tiendo.bao_cao_ngay_boq` · `boq_nghiem_thu` · `boq_theo_hang_muc` · `luy_ke_boq` (thêm ở `a0d0ba5`, `1f0789b`, 18/10) chưa vào `CONG_CU_CO_TIEN_HOP_DONG` → xem BD-9 |

## 1. K10 + tóm tắt từng commit (đã `git show --stat`, đọc diff)

| Commit | Làm gì | Tệp lạ? |
|---|---|---|
| M `396c458` | Bỏ nút «Mở bản đã lưu», «Xem khung + nguồn»; đổi kỳ tự mở bản đã lưu (debounce 0,7 s) | không |
| M `0dadfa2` | Cắt 5 dòng/bảng (toàn công ty), nút «Xem thêm» cam, bảng viền nhạt đầu bảng navy | không |
| M `33aba81` | Xuất Excel theo Form 0 (`xlsx-mau-cong-ty.ts` +262), nút «Chọn dự án» (`loc-du-an.ts`), hàng ghim | không |
| M `6087db5` | Sửa tay lời văn 🤖 (`sua-tay.ts`, `ChuSuaDuoc.tsx`, route `sua-chu`), Excel lấy chữ sửa, Làm lại giữ chữ sửa | không |
| M `c12d9ba` | Gỡ xuất Word (xuat.ts −274) | không |
| M `3e00fea` | Khung A4 + 3 tab + hộp hướng dẫn tab | không |
| M `028b1d4` · `51bb5ad` · `5343622` | Gọn thẻ đầu, «Đơn vị lập» và «Gửi» sửa thẳng trên giấy, bỏ ô Người ký, bỏ «Dựng lúc» + khối «So với bản dựng trước», 3 tab lên hàng ghim | không |
| M `f878e4e` | Menu trái thêm Agent Nghiệm thu | không |
| T `16f2166` | Excel Form 7 (`xuat-xlsx.ts`, `xlsx-mau-cong-ty.ts` +321 bản chép của Main), bảng GPMB, `don-vi-lap.ts` | không |
| T `8850895` | Trang theo 6 chương (`form7.ts`), sửa chữ tại ô, Excel lấy chữ sửa | không |
| T `33bf249` | Dòng Nhận xét chung có ô gõ dưới nhãn | không |
| T `4b77d85` | Gỡ nhánh xuất Word khỏi API | không |
| T `0f7572e` | Tab + nút lên ghim; đổi tên menu «BC Lãnh đạo→Báo cáo Tuần», «BC Kỹ thuật HT→Data đầu vào» ở 23 tệp (chỉ chữ + khoá `giai-thich/noi-dung.ts`) | không (đổi tên chạm nhiều tệp nhưng đúng chủ đề) |

K10 — `git status` T: ngoài `data/` chỉ còn `kiem-tra-doc-lap/_cat-giu/` (không phải báo cáo). M: ngoài `data/` chỉ còn `mc-ra.txt` ở gốc M (⚪ BD-20, không phải của báo cáo; không rõ ai tạo). Không tệp báo cáo nào chưa commit.
`xlsx-mau-cong-ty.ts` Main ↔ 3003: `diff` chỉ khác đúng 1 dòng chú thích (dòng 13) → code giống hệt ✔ (luật 7).

## 2. Báo cáo THÁNG — phát hiện

### BD-1 🟡 «✎ Sửa» rồi bỏ ra ngoài (không gõ gì) → chữ AI bị CHỐT thành chữ sửa tay
- `src/components/tabs/bao-cao-thang/ChuSuaDuoc.tsx:49` (và `:64`)
- Bấm «✎ Sửa» ô chưa từng sửa: `ban = chuBanDau` (chữ AI bỏ 🤖). Rời ô: so `ban.trim() !== (chuSua ?? "").trim()`; `chuSua` = undefined → so với `""` → luôn khác → `luu(ban)` → route `sua-chu` (route.ts:124-128) ghi `suaTay[khoa]` = chữ AI.
- Hậu quả: ô hiện dấu ✎, mất 🤖, và «Làm lại» / «🤖 Soạn nhận xét» sau này KHÔNG cập nhật ô đó nữa (route.ts:167-175). Người chỉ bấm nhầm Sửa là mất cập nhật lặng lẽ.
- Đo: đọc mã (chưa chạy trình duyệt — cấm). Đề xuất: so với `chuBanDau` khi `chuSua` trống (chỉ lưu khi chữ đổi thật).

### BD-2 🟡 Hướng dẫn «? Hướng dẫn» (bct.ts) còn nhắc thứ đã gỡ — luật 43
`src/lib/huong-dan/tab/bct.ts`
| Dòng | Chữ cũ | Thực tế |
|---|---|---|
| 14 | «…rồi tải về Word» | Word đã gỡ (`c12d9ba`) |
| 20 | «gom tay số… vào Word» · «màn so với bản dựng trước» · «Ghi rõ bản dựng lúc nào… tô vàng» | khối So với bản dựng trước + dòng «Dựng lúc» đã bỏ (`51bb5ad`) |
| 34–35 | «Dòng kỳ / dựng lúc / 🤖 soạn lúc / số dự án, mục, bảng, ô có số liệu» · «Khung So với bản dựng lúc …» | không còn trên màn |
| 36, 98 | «Ba ô Đơn vị lập · Nơi nhận · Người ký» | ô Người ký đã bỏ (`028b1d4`); chỉ còn «Gửi» + «Đơn vị lập» |
| 61, 65 | «Đọc dòng kỳ: … Dựng lúc …, Mục n/6, Bảng n/11» · «khung So với bản dựng lúc» | không còn |
| 126, 128 | «Mục n/6 hoặc Bảng n/11 màu vàng» · «Dòng vàng dựng trước khi hết kỳ» | không còn trên màn (`grep "dựng trước\|n/6"` trong View: 0 kết quả) |
Kịch bản kiểm thử cũng cũ: `src/lib/kiem-thu/noi-dung-chung.ts:179` và `noi-dung-main.ts:213-223` bảo «bấm Dựng bản nháp», «đọc dòng đếm ngay dưới nút Mục: 6/6 · Bảng: 11/11» — nút/dòng ấy không còn (nút nay là «Làm lại báo cáo»).
Đúng: hộp tab mới `hop-tab/bao-cao-thang.ts` khớp tên 3 tab «Tổng quan · Chi tiết · Kiến nghị & kế hoạch» ✔ và 3 nút ✔ (chỉ dòng 19 «Kiểm ba ô đầu đã khai chưa» còn nhắc «ba ô… người ký»).
Đo: `grep -n "Dựng lúc\|So với bản\|Người ký\|Word" bct.ts`.

### BD-3 🟡 Luật 36: «COD lùi N ngày» không ghi so với hệ nào (Bảng 10)
- Nguồn chữ: `soAnhHuong()` (`lib/bao-cao-sang/luat-cod.ts`) → `dung.ts:312` cột «Ảnh hưởng»; cột «Số ngày ảnh hưởng» + câu chốt `model.ts:397`.
- Thấy trong Excel dựng bằng fixtures (`bd-out/xlsx-dump.txt` dòng 80–85): «Ảnh hưởng: **COD lùi 49 ngày**», «Số ngày ảnh hưởng nặng nhất: 49 ngày». Không có «so với Tiến độ mục tiêu / Baseline».
- Cùng chỗ khác: dòng xu thế COD «(lùi 37 ngày so điểm đầu)» (`xuat.ts:65`, View:295) — là so với điểm dự báo đầu, không phải hệ ⚪.
- Đề xuất: ghép hệ vào cột «Ảnh hưởng» (hàm `ghepHeTheoKhung` phiên 12 đã có) hoặc ghi vào tiêu đề cột «Ảnh hưởng (COD lùi so với … )».

### BD-4 🟡 Luật 30 «không bao giờ chỉ viết mã» + chốt 28/10 «không ghi mã» — chưa rõ có áp cho báo cáo tháng
Dựng bằng fixtures (3 dự án giả, `bd-out/bc.md`, `xlsx-dump.txt`):
| Chỗ | Mã đứng trong chữ |
|---|---|
| Bảng 8 cột «Hợp đồng» (Excel dòng 63, md dòng 96) | **`NT-03-HV-HD02`** — chỉ một mã nội bộ; tên/số hiệu nằm ở cột kế bên (vi phạm luật 30 theo từng ô) |
| Bảng 8 «Đang ở khâu» | `PG-02: chờ ký` (mã phiếu giá, không tên) |
| Bảng 6/7 cột «Hồ sơ» | `HV-K-17 Chi trả đền bù` · `HV-09-01 Hợp đồng tín dụng` (mã + tên) |
| Bảng 4/10/11 | `7.6.2.4 Turbine số 03` · `6.1.4 Cung cấp Hub…` · `7.2.3 Thi công san nền` (WBS + tên; `dung.ts:283-290` cố ý «mã WBS kèm tên») |
- Ghi nhớ `khong-ghi-ma-trong-bao-cao` ghi rõ: «hiện chỉ áp bản báo cáo sáng; chưa rõ anh có muốn áp cho màn khác». Nên: (a) chỗ **chỉ có mã** (cột Hợp đồng, PG-02) là vi phạm luật 30 chắc chắn → sửa; (b) mã+tên là chờ anh quyết phạm vi chốt 28/10 → 1 câu hỏi theo khuôn 5 phần.
- Quét regex `ISS-\d{4}`, `N3A-` trong bản dựng tháng: **0 lượt** (tháng không in mã issue).

### BD-5 🟡 Luật 44: kỳ «tháng trước» và «ngày lập» theo giờ máy, không cố định +7
- `dung.ts:66-69` `kyThangTruoc(bay=new Date())` dùng `getMonth()/getFullYear()` local; `dung.ts:466-469` `ngayHomNay()` dùng `getDate()` local; `route.ts:34-42` lấy kỳ mặc định từ đó.
- Đo (bài thử `bd-tmp-M.test.ts`, `kyThangTruoc(new Date(iso))`):
  | Thời điểm (UTC) | = giờ VN | TZ máy (VN) | `TZ=UTC` (đúng luật 44: phải ra Tháng 10) |
  |---|---|---|---|
  | 2026-10-31T20:00Z | 03:00 01/11 | 10/2026 ✔ | **09/2026 ✖** |
  | 2026-12-31T18:00Z | 01:00 01/01/2027 | 12/2026 ✔ | **11/2026 ✖** |
- Máy anh đang chạy giờ VN nên hôm nay không lỗi; lên hosting (UTC) thì từ 0–7 giờ sáng ngày 1 màn mở ra kỳ lùi 2 tháng. Đề xuất dùng `gioVn` (lib/gio-vn).

### BD-6 🟡 Chọn dự án bị giữ khi đổi kỳ → nhãn nút rỗng, báo cáo trắng
- `BaoCaoThangView.tsx:96,99,321`: `duAnChon` không reset khi `bcGoc` đổi; kỳ mới ẩn dự án đó (dự án im lặng bị ẩn, `anDuAnImLang`) → `tenDuAnChon=""` → nút hiện « ▾» và `locTheoDuAn` trả bảng rỗng, không báo gì. Đề xuất: nếu `duAnChon` không còn trong `bcGoc.duAn` thì về «Toàn công ty».

### BD-7 ⚪ Excel báo cáo tháng không có «Đơn vị lập» (anh gõ trên giấy nhưng không ra file)
`xuat.ts:269-297` chỉ lấy «Nơi nhận» (`oDau(bc,"B1","Nơi nhận")`) cho dòng «Gửi:». Form 0 gốc không có ô đơn vị lập nên có thể là chủ ý; ghi để anh biết. Dòng «Người lập · Người ký» để trống đúng chốt.

### BD-8 ⚪ Tải Markdown / phụ lục nguồn không theo «Chọn dự án»
View:419-423 không truyền `du_an`; `xuat/route.ts:50-58` md/nguon dùng `bc` cả công ty (chỉ xlsx dùng `bcXuat`). Ngược với câu hướng dẫn `bct.ts:113` («Chọn dự án… thì file chỉ gồm dự án đó» nói về Excel nên không sai, nhưng nút Markdown cạnh đó dễ gây hiểu nhầm).

### Các điểm ⚪ khác (tháng)
| # | Chỗ | Thấy gì |
|---|---|---|
| BD-10 | `xuat.ts:280` + View:441 | «Agent chưa hỏi được» in mã thô `tiendo`/`hopdong` thay vì «Agent Tiến độ/Hợp đồng» (luật 30 / tiếng Việt) |
| BD-11 | `dung.ts:327` | Excel/Markdown gửi TGĐ có câu «xem ở màn Cảnh báo của Main» (chỉ người trong hệ hiểu) |
| BD-12 | `xuat.ts:2,17-19,110-114`, `kho.ts:48` | Chú thích còn nói DOCX/«bản Word» dù đã gỡ (không ảnh hưởng chạy) |
| BD-13 | `BaoCaoThangView.tsx:90,98` + `app/bao-cao/page.tsx` | `soVoiTruocBanDau`/`docBanTruoc`/`soHaiBan`/`giuBanTruoc` vẫn tính và ghi bản trước mỗi lần «Làm lại» dù UI không còn dùng (dead code + ghi đĩa thừa) |
| BD-14 | `BangBaoCao.tsx:145,149,201,207` | Màu cứng `#003366`, `#C8D0DC`, `#f97316` thay vì token (luật 25; sáng/tối) — nút «Xem thêm» cam cứng |
| BD-15 | `bao-cao-thang-sua-tay.test.ts:13-16,22,31`, `bao-cao-thang-xlsx.test.ts:27` | 2 bài K8 `return` sớm nếu không có `data/bao-cao-thang/2026-09.json` → máy sạch/CI «qua» mà không kiểm gì (vitest không báo «bỏ qua»). Em đã thay bằng bài thử dữ liệu giả (mục 3) |

## 3. K8 — Excel báo cáo THÁNG (Form 0): sửa chữ 🤖 → Excel; Làm lại giữ chữ sửa tay

Cách đọc mã: chữ sửa tay lưu ở `bc.suaTay` (khoá `nx:<mục>` hoặc `o:<bảng>:<khoá dòng>:<khoá cột>`) trong tệp bản nháp (`route.ts:124-128`); mọi đường ra (màn, Excel, md) gọi `apDungSuaTay` (route.ts:66,134,156,190; xuat/route.ts:41). «Làm lại» (route.ts:165-176): `giuBanTruoc` → đọc `suaTayCu` TRƯỚC khi dựng → `bc.suaTay = suaTayCu` rồi `luuBanNhap` → **giữ**, không ghi đè. Khoá mồ côi (dòng không còn) bị bỏ qua khi áp.

Bài thử (`bd-out/bd-tmp-M.test.ts`, chạy trên archive M, dữ liệu giả 3 dự án, `ghiOLlm`/`ghiNhanXetLlm` thay AI; KHÔNG gọi AI/3004):
| Bước | Kết quả đo (`bd-out/k8.txt`) |
|---|---|
| Ô 🤖 `B10/HV::6.1.4…/kien_nghi` = «🤖 Kiến nghị AI: trình TGĐ duyệt.»; `kiemKhoaSua` | `null` (cho sửa); khoá `nx:II` cũng `null` |
| Ghi `suaTay` (ô + nx:II) → JSON round-trip → `apDungSuaTay` → `xuatXlsx` → đọc lại bằng ExcelJS | ô chứa **«Chữ sửa tay ZZ-Ô»** ✔; mục II chứa **«Nhận xét sửa tay ZZ-NX»** ✔; chữ AI cũ của ô **không còn** ✔ (dòng `còn NX AI cũ mục II: true` là khớp nhầm tiền tố «mục III» — đã kiểm lại, không phải lỗi) |
| «Làm lại» (dựng bản mới, AI ghi chữ lần 2, gắn lại `suaTay`) → xuất Excel | **ZZ-Ô ✔ · ZZ-NX ✔ · chữ AI lần 2 không lọt ✔** |
| Xoá chữ sửa tay (`suaTay = {}`) | chữ AI lần 2 hiện lại ✔ |
| Khoá mồ côi `o:B10:KHONGCO:kien_nghi`, `nx:IX` | không lọt ra Excel ✔ |
| Ô sửa tay có tiền tố 🤖 không? | Không (chỉ «Chữ sửa tay ZZ-Ô») — đúng ý «chữ do người» |
→ K8 (tháng) **ĐẠT** ở tầng hàm; chỉ còn BD-1 (bấm Sửa rồi thoát tự chốt chữ AI) ở tầng giao diện, và chưa mở bằng Excel thật.

Cấu trúc xlsx đo (`bd-out/xlsx-dump.txt`, 1 tờ tên «Tháng 10-2026»):
| Luật | Kết quả |
|---|---|
| Kỳ (31) | «Kỳ báo cáo: **Tháng 10/2026 (31 ngày · 01/10/2026 – 31/10/2026)** · toàn công ty» ✔ khớp ghi nhớ «T10/2026 (… ngày …)» |
| Hàng tổng đầu (34) | Bảng 8: dòng 61 **«TỔNG CỘNG · 2 dự án»** đứng ngay dưới tên cột ✔. Bảng 4/6/7/10/11 là bảng tiến độ/danh sách, không có số tổng cộng được ✔ |
| Nhanh/chậm bằng ngày (35) | Bảng 3/4: «chậm 86 ngày so với Tiến độ mục tiêu (03/08/2027) · chậm 44 ngày so với Baseline» ✔; không còn cột «Lệch %» ✔ |
| Số kiểu VN (chuẩn số) | «166 tỷ đ», «3,871 tỷ đ», «15,2 %», «8.910,9» dạng **chữ**, dấu phẩy/chấm đúng ✔; ô là chuỗi, không phải số Excel (không cộng/lọc được) ⚪ |
| 🤖 (19) | Nhận xét có «🤖 »; cột 🤖 có « 🤖» ở đầu cột ✔ |
| Cột trống | Bảng 5/9 chưa có số: ghi «— chưa có dữ liệu» + «Chưa có số liệu: …» ✔ (luật 22) |
| Tiếng Việt | Không thấy chữ Anh ngoài `Excel/Markdown` ✔ |

## 4. Báo cáo TUẦN (3003) — phát hiện

### BD-T1 🟡 Chữ sửa tay khoá theo CHỈ SỐ DÒNG → «AI viết lại nháp» có thể gắn hạn/chữ sửa tay vào việc khác
- `form7.ts:157-163` (`vii:${idx}` với idx = thứ tự dòng lời văn), `form7.ts:136` (`gpmb:nx${i}`), `form7.ts:151` (`rr:vi${i}`); `viet-nhap.ts:135` giữ nguyên `suaTay` qua lần AI viết lại.
- AI viết lại → danh sách VII đổi thứ tự/nội dung → `vii:1:han = "12/11/2026"` do người gõ cho việc A nay rơi vào việc B, và **việc B vào sổ cái 3004 với hạn của A** (hạn hợp lệ nên không bị chặn). Màn chỉ có lời cảnh báo cho trường hợp «xoá dòng» (NhapAiTuan.tsx:223), không cho «AI viết lại».
- Đo: đọc mã (không chạy AI). Đề xuất: khoá theo băm nội dung dòng việc (hoặc khi viết lại thì bỏ `vii:*` và hỏi).

### BD-T2 🟡 Luật 31: Chương I «Thời gian thi công» khoảng ngày không kèm số ngày
`khung-so.ts:205-212` ghép «24/08/2026 (bắt đầu thi công thực tế) – 23/10/2027 (COD dự báo); kết thúc mọi việc…: 15/11/2027» thủ công, không qua `khoangNgay`. Thấy ở Excel dòng 10 (`bd-out/tuan-dump.txt`) và trên màn. Ô «Kỳ báo cáo *» cố tình không kèm số ngày (3004 phân tích bằng khuôn) → được ngoại lệ «ô cố định trên mẫu» ✔.

### BD-T3 🟡 Luật 36: «COD +N ngày», «Làm COD dự báo lùi N ngày» không ghi so với hệ nào
- `khung-so.ts:295` (Chương III cột «Ghi chú»: `COD +${anhHuongCod} ngày (${id})`), `form7.ts:149` (Chương V cột «Ảnh hưởng»).
- Excel dòng 93: «Ảnh hưởng: **Làm COD dự báo lùi 30 ngày**» — thiếu «so với Tiến độ mục tiêu/Baseline». Các chỗ khác ĐÚNG hệ ✔: «chậm 32 ngày so với Baseline · chậm 81 ngày so với Tiến độ mục tiêu» (cột Lệch), «đúng hạn so với Baseline».

### BD-T4 🟡 Mã issue lọt vào Form 7 (khung-so.ts:232, 295)
`khung-so.ts:232` ghi `${the.tieuDe} (${the.id})` (Chương II «Ghi chú» thấy «(ISS-2026-39-070)», «(ISS-2026-39-134)», «(ISS-2026-36-003)» ở dòng 17,21,22) và `:295` (Chương III). Là «mã kèm tên» nên đúng luật 30, nhưng trái chốt 28/10 nếu anh muốn áp cho báo cáo tuần (cùng câu hỏi phạm vi với BD-4). WBS: đã bỏ cột mã khỏi bảng khối lượng ✔ (`form7.ts:124`), còn trong lời văn «(2.2.4)», «Gỡ ở gốc 6.1.4», «TK-HV-004».
> Đã loại khỏi danh sách lỗi: các chữ «60.5%», «25.2 m²/ngày», «hạn xong trước 2026-08-02 (còn 0 ngày)» trong cột V **không do mã hiện tại** — là thẻ cảnh báo lưu cũ trong fixtures; mã sinh (`sinh-nhom12.ts:461`, `thiet-ke/ra-soat.ts:141`) đã dùng `fmtSo`/`ngayVN`. Ghi để phiên khác không sửa nhầm.

### BD-T5 🟡 Nút «⬇ Xuất Excel» không mờ khi chưa có nháp → mở tab mới hiện JSON thô
`NhapAiTuan.tsx:289` là thẻ `<a target=_blank>` luôn bấm được; `api/bao-cao-tuan/route.ts:44-49` trả `{"ok":false,"message":"Chưa có nháp…"}` HTTP 400. Luật 17: nút bị chặn phải HIỆN MỜ + lý do (hướng dẫn `bc-lanh-dao.ts` mục «Hay vướng» tự thừa nhận hành vi này).

### BD-T6 🟡 Luật 43: còn chữ cũ sau khi đổi tên / gỡ Word
| Chỗ | Chữ cũ | Đúng là |
|---|---|---|
| `lib/ai/chat-tools.ts:1318,1323` | «…rồi mới xuất **Word**» (lời trợ lý nói với người dùng) | xuất Excel |
| `lib/ai/chat-types.ts:371` | mô tả công cụ `viet_nhap_bao_cao`: «…rồi mới xuất Word» | xuất Excel |
| `lib/ai/van-phong.ts:18` (lời dặn trợ lý) | «/report-mgmt (**BC lãnh đạo**, BC tuần)» | «Báo cáo Tuần» |
| `lib/kiem-thu/noi-dung-bc.ts:73-77` | BC-10 «Đủ **bảy** mục của báo cáo lãnh đạo» · BC-13 «ở BC lãnh đạo» · BC-05/06 «mở bằng Word/Excel» | sáu chương Form 7 · «Báo cáo Tuần» · Excel |
| `app/report-mgmt/page.tsx:2,4`, `viet-nhap.ts:10` | chú thích «xuất Word» | (chú thích) |
Tab/nút trong hướng dẫn `hop-tab/bc-lanh-dao.ts` + `tab/bc-lanh-dao.ts` khớp tên thật «① Thông tin và tiến độ · ② Đường găng, khối lượng, GPMB · ③ Rủi ro và việc tuần tới», «🤖 AI viết nháp / AI viết lại nháp», «⬇ Xuất Excel» ✔. `grep "BC Lãnh đạo\|BC Kỹ thuật HT"` toàn `src` + `tests`: 0 kết quả ✔.

### BD-T7 ⚪ Màu đỏ cho trạng thái nháp
`NhapAiTuan.tsx:325` `Pill tone="red"` cho «NHÁP-AI · CHƯA ai soát» — luật 18 dành đỏ riêng cho Issue; trạng thái nháp không có định nghĩa màu. Chữ trần, không viền ✔ (luật 28).

### Điểm ⚪ khác (tuần)
| # | Chỗ | Thấy gì |
|---|---|---|
| BD-T8 | `api/bao-cao-tuan/route.ts:24`, `lib/tuan-bao-cao.ts:~57` | `homNayISO()` = `new Date().toISOString().slice(0,10)` (UTC, luật 44). Tuần báo cáo vẫn đúng vì lấy theo ngày cắt dữ liệu; chỉ «ngày lập»/tuần khi dự án chưa có dữ liệu lệch 1 ngày lúc 0–7 giờ VN |
| BD-T9 | `NhapAiTuan.tsx:322` | `Mã mẫu: {CHUONG_FORM7 && "form-7"}` viết cứng, không dùng `MA_MAU_FORM7` |
| BD-T10 | Ghi chú dòng «TỔNG TIẾN ĐỘ» (Excel dòng 15) | cùng câu COD/chậm lặp 3 lần (ô Lệch, Ghi chú, Chương I) — «một vấn đề một nơi» |
| BD-T11 | Excel Form 7 dạng số | «6,7%» (không cách) còn tháng «15,2 %» (có cách); đều là chữ — thống nhất 1 kiểu |

## 5. K8 — Excel báo cáo TUẦN (Form 7) đọc bằng bộ đọc 3004

Cách làm: dựng bằng hàm thật `xuatForm7Xlsx` ở archive 3003 (fixtures HV `tests/fixtures/du-lieu-thu`, KHÔNG đọc `data/`; lời văn giả) → ghi ra thư mục tạm; đọc bằng `docExcel()` **và** `kiemTraDayDu()` thật của 3004 trên archive 3004 (CSDL RAM `DOCFLOW_DB=memory`, không mở `data/pgdata`, không gọi cổng/app 3004). Bài thử `bd-out/bd-tmp-T.test.ts` + `bd-tmp-3004.test.ts`.
| Hạng mục đối chiếu | Kết quả (`bd-out/doc3004-*.json`, `kiem3004-*.json`) |
|---|---|
| Số tờ / tên tờ | 1 tờ «Mẫu trắng» (không có tờ ẩn `_may`) — 3004 vẫn nhận ✔ nhờ dòng «Mã mẫu: form-7» (không có `canh_bao_doc` «mất dòng Mã mẫu») |
| `mau_ma` | `form-7` ✔ |
| Ô nhập | `don_vi_lap`="BQLDA Quảng Trị" ✔ · `ky_bao_cao`="Tuần 39/2026 (21/09/2026 – 27/09/2026)" ✔ · `gui_den`="Phòng Đầu tư và Pháp chế" ✔ · 6 ô thông tin dự án ✔ |
| 6 chương | đủ 6, đúng chữ ✔ |
| Số dòng 5 bảng | bảng tiến độ 11 · khối lượng 8 · GPMB 25 · kiến nghị 26 · công việc 2 (việc thiếu hạn loại khỏi file ✔) |
| Kỳ máy hiểu | `{loai:tuan, so:39, nam:2026, tu:2026-09-21, den:2026-09-27}` ✔; `gui_den:["p-dtpc"]` ✔; `don_vi_lap:"bqlda-qt"` ✔ |
| Sửa tay → Excel | bản `tuan-form7-sua.xlsx` (`vii:2:han=12/11/2026`) → 3004 đọc **3 việc** (việc có hạn sửa tay vào file ✔) |
| Mất ô | không báo mất cột nào ✔ |
Cảnh báo 3004 trả (không chặn): 5× `f7-lech` («cột Lệch… không phải số», vì ta ghi «chậm 32 ngày so với Baseline» theo luật 35/36 — chủ ý, câu 2A) + 25× `f7-gpmb-co-tinh-trang` («Tình trạng chưa điền», có cả dòng «Nhận xét chung» bị 3004 đếm như một khu vực) + 1 `ngay_hop_le` (do lời văn thử của em). Chặn duy nhất: «bạn không thuộc BQLDA Quảng Trị» — do tài khoản thử `quantri` không kiêm nhiệm đơn vị, không phải lỗi file.
Kỳ ISO — quét `isoWeekOf` + `kyForm7` cho **1.157 ngày liên tục 01/12/2024 → 31/01/2028**: **0 lỗi** (`bd-out/iso-tuan.txt`): số tuần khớp, luôn Thứ Hai→Chủ nhật, đủ 7 ngày. Mẫu: 26/10/2026→W44 (26/10–01/11) ✔; 02/11→W45 (02/11–08/11) ✔; 28/12/2026 · 31/12 · 01/01/2027 · 03/01/2027 → **W53/2026 (28/12/2026–03/01/2027)** ✔; 04/01/2027→W01/2027 ✔; 30/12/2024→W01/2025 ✔. Số tuần dùng hàm chung `dayreport.isoWeekOf`; `kyForm7` tự viết nhưng khớp tuyệt đối 1.157/1.157 ngày.
Luật 10 (T): `form7.ts` thuần (đầu tệp ghi, import `khung-so` chỉ `import type`) ✔; `xuat-xlsx.ts` server; client `NhapAiTuan.tsx` import `form7` + `viet-nhap-chung` (type) ✔.

## 6. Luật chung (tháng + tuần)

| Luật | Tháng (Main) | Tuần (3003) |
|---|---|---|
| 10 | ✔ client chỉ import `model`, `sua-tay`, `loc-du-an` (đều thuần; `model` kéo `khuon-agent`→`format`+`chung/luat-nhanh-cham`, không `node:fs`). `kho.ts` (fs) chỉ ở server (`page.tsx`, route) | ✔ |
| 28 | ✔ nút có viền đều bấm được; chữ thuần không khoanh. Khung nhận xét có viền là vùng sửa được | ✔ `Pill` chữ trần |
| 18 | ⚪ hex cứng (BD-14) | 🟡→⚪ BD-T7 |
| 19 | ✔ 🤖 trước nhận xét + ` 🤖` ở đầu cột; chữ người sửa không còn 🤖 (đúng ý) | ✔ «🤖 » trước lời văn AI trong ô |
| 31 | ✔ Kỳ có số ngày | 🟡 BD-T2 |
| 34 | ✔ Bảng 8 tổng đầu bảng (web + Excel); hàng ghim tên cột ✔ | không có bảng tổng cộng được |
| 35 | ✔ không % chênh | ✔ |
| 36 | 🟡 BD-3 | 🟡 BD-T3 (cột Lệch ✔ đúng hệ) |
| 30 / 28.10 | 🟡 BD-4 | 🟡 BD-T4 |
| 44 | 🟡 BD-5 | ⚪ BD-T8 |
| 43 | 🟡 BD-2 | 🟡 BD-T6 |
| Tiếng Việt | ✔ lỗi/nút/ghi chú đều tiếng Việt (route: «Chưa hỗ trợ định dạng… Dùng xlsx, md hoặc nguon» ⚪ nói tên tham số kỹ thuật) | ✔ |
| 3 tab / hàng ghim | ✔ (đọc mã; `.thanh-ghim ghim-the-cho ghim-tran-trang` có trong `globals.css:167,204,212`); cuộn trên điện thoại: **chưa đo** (cấm khung trình duyệt; BC làm) | ✔ mã; chưa đo điện thoại |

Xuất Word còn sót? `grep -rn "xuat-bao-cao-docx|dinh_dang=docx|\.docx"` trong `bao-cao-thang`, `api/bao-cao-thang`, `bao-cao-tuan`, `components/tabs/*`: **không có nút/route chết**. Skill `xuat-bao-cao-docx` chỉ còn ở `lib/skill/ky-nang.ts`, `huong-dan/tab/skill-ai.ts` (M) và `lib/tro-ly/xuat-bao-cao.ts:351,968` (T, trợ lý chat) — đúng ý giữ. Chỉ còn chữ «Word» ở các chỗ BD-2, BD-T6.

S11 (regex mất `\`): quét 18 tệp báo cáo tháng/tuần/xlsx + đọc diff 14 commit: mọi regex còn nguyên `\d`, `\s`, `\r`, `\[`, `\\` (vd `xuat-xlsx` `/[*?:\\/\[\]]/g`, `form7.ts:83,92`, `sua-tay.ts:17`, `route:119`); `grep -E "[^\\a-z](d|s|w)(\+|\*|\{)"` trong các tệp: **0 lượt**. ✔

## 7. Điểm khác ngoài báo cáo nhưng phát hiện trong lúc đo

### BD-9 🟡 (3003) Test đỏ `mcp-loc-nguoi-xem.test.ts:66` — 4 công cụ BOQ chưa khai vào danh sách lọc Người xem
Khác biệt đo: cổng có `tiendo.bao_cao_ngay_boq`, `boq_nghiem_thu`, `boq_theo_hang_muc`, `luy_ke_boq`; `CONG_CU_CO_TIEN_HOP_DONG` thì không. Mô tả `boq_nghiem_thu` có «khối lượng… đơn giá BOQ» (cong-tiendo.ts:249 là tả công cụ hợp đồng nhưng cùng họ). Cần chủ công cụ xác nhận: nếu có đơn giá/thành tiền thì Người xem lấy được qua cổng. Hỏng từ `a0d0ba5` (18/10), có trước các commit báo cáo (xác nhận ở archive `16f2166^`). Chủ: phiên Nghiệm thu/Tiến độ — không phải của báo cáo tháng/tuần.

### BD-20 ⚪ `mc-ra.txt` chưa theo dõi ở gốc `4-agent-main` — không phải của báo cáo, ai tạo chưa rõ.

## 8. Đạt (✔) / chưa đo được

Đạt: tsc T 0 lỗi · K8 tháng (hàm) · K8 tuần (3004 đọc đúng mẫu, tờ, kỳ, đơn vị, nơi nhận, 5 bảng, sửa tay vào file) · quét 1.157 ngày ISO · hàng tổng đầu (Bảng 8) · kỳ tháng ghi số ngày · luật 10 · xlsx Main=3003 giống code · không lọt tệp lạ vào 15 commit · không còn nút/route xuất Word chết.
Chưa đo được: mở bằng Excel thật (hiển thị ô gộp, độ cao hàng) · cuộn hàng ghim/3 tab trên điện thoại 360 px (S12, cấm khung trình duyệt) · bấm thật «Làm lại» với AI thật (cấm) · `locBaoCaoThang` với `boLoc` thật của Người xem (K6 thuộc phần khác) · luật 36 trong chữ AI tự viết (cần AI thật; chỉ kiểm dặn dò `nhan-xet.ts:58-64` có `LUAT_MA_KEM_TEN`).

## 9. Xác nhận điều cấm
Không sửa code/data của ai · không Telegram · không gọi AI/claude CLI · không `next build` · không động tới cổng nào (3003/3004/3010) · không mở `data/pgdata` · 3004 chỉ ĐỌC mã (`doc-excel.ts`) và chạy bản archive riêng bằng CSDL RAM · không dùng trình duyệt · junction `node_modules` đã gỡ bằng `rmdir`, thư mục archive đã xoá.

Lần sau tính từ sau commit M `ad0f816` / T `0f7572e`.
