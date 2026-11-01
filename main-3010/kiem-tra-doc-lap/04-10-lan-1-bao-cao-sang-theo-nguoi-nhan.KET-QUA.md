# KẾT QUẢ KIỂM TRA ĐỘC LẬP — lần 1 phiên "4 Main agent": báo cáo sáng theo người nhận (04/10/2026)

> Người kiểm: phiên **"0 Kiểm tra độc lập"** · 04/10/2026 20:20 → 21:05 · Chỉ đọc code + vitest tạm (đã xoá) + curl 3010 bằng cookie tự ký. **Không gửi Telegram** (không gọi `gui`/`gui-thu`/`chay-nhip`), không `next build`.
> Thử API ghi: `quantri` chọn 2 dự án cho CHÍNH MÌNH rồi xoá đúng dòng `quantri` khỏi `data/bao-cao-sang-kich-ban.json`; dòng `ptgd.dai@scigroup.vn` **không đụng** (so JSON trước/sau: bằng nhau; tệp chỉ khác định dạng khoảng trắng 392 → 410 byte vì Python ghi lại).
> Số đo thô: scratchpad phiên kiểm `main-3-mau.txt` (3 mẫu dựng từ bản cuối), `test7-4-agent-main.txt`, `tsc7-4-agent-main.txt`.

## 1. Kết luận một dòng

**Đạt — 0 🔴 · 4 🟡 · 6 ⚪; C1–C6 đạt (C6 một phần: màu "đã nối"/"chưa chọn dự án" chưa có định nghĩa, câu lỗi đĩa có thể lọt tiếng Anh).** tsc 0 lỗi; vitest 760 đạt + 3 hỏng cũ (`man-cua-main`, không thuộc việc này); 3 mẫu dựng từ bản thật 04/10 đều 1 tin ≤ 3.573 ký tự; quyền 403 đúng; sáng 05/10 đúng là chỉ Mr. Đại nhận 1 tin nhắc chọn dự án.

## 2. Chốt C1–C6

| # | Chốt | Kết quả | Bằng chứng |
|---|---|---|---|
| C1 | Kịch bản = bộ tham số code dựng | ✅ | `kich-ban.ts:60` `ThamSoKichBan` 10 khoá, `chuanHoaGhiDe` lọc kiểu/khoảng; `ketXuatKichBan` ghép chữ từ số, AI không viết bản; câu 🤖 chỉ là `v.cauHoi` đã có sẵn trong bản |
| C2 | Góp ý của ai chỉ sửa bản của người đó | ✅ | Kho khoá theo mã người (`kich-ban-kho.ts:57` `maNguoi`); `nguoi-nhan/route.ts:66` `chon-du-an`: không Cài đặt + `maCuaEmail ≠ ma` → 403. Đo: `anhn` (engineer) và cookie `viewer` chọn dự án cho `ptgd.dai` → **403** "Chỉ chọn được dự án cho bản của chính mình…"; `anhn` `dat-mau` → 403 "Cài đặt chỉ PM và Admin"; kho sau 3 lượt 403 y nguyên |
| C3 | Chủ tịch: dự án xấu đi · TGĐ: việc cần quyết · PM: việc hôm nay | ✅ | `CONG_DUNG_MAU`; `xepDuAn` (có tiến độ → COD lùi so hôm qua nhiều → chậm mục tiêu nhiều); Tổng quát mỗi dự án một dòng + "Nặng nhất"; Điều hành 5 việc COD/dự án + câu hỏi 🤖; Dự án đủ việc COD + khối "Việc đỏ khác" 3 việc/agent (đo bản HV: 15 việc đỏ, Công việc 6 · Tiến độ 9) |
| C4 | 3 mẫu; dự án "dữ liệu test" không loại | ✅ | `THAM_SO_MAU` 3 mẫu; bản Tổng quát đo có "Điện gió Hướng Việt (HV — dữ liệu test)" dòng đầu |
| C5 | Tổng quát · Điều hành toàn công ty; Dự án chọn tay 1 hoặc nhiều | ✅ | `duAnTrongBan` (`kich-ban.ts:239`): khác `du-an` → mọi dự án; `kich-ban-kho.ts` `duAnChon` + `chuanDuAnChon` (bỏ dự án lạ, giữ thứ tự sổ). Đo: `quantri` gửi `["n3a","tan-thanh","khong-co-du-an-nay"]` → lưu `["n3a","tan-thanh"]`, lịch sử "Chọn 2 dự án: Nậm săm 3A, Tân Thành" |
| C6 | Bớt cú bấm · tiếng Việt · im lặng ≠ hỏng · LLM không ước số · luật 10/11/13/17/18/28/29/30/31 | ✅ một phần | Bấm là lưu (`batTatDuAn` gửi cả danh sách, không nút xác nhận) ✓ · Mẫu Dự án chưa chọn vẫn 1 tin 182 ký tự "chưa chọn dự án…" ✓ · Luật 10: `kich-ban.ts` chỉ import `luat`/`luat-cod`/`model`/`ma-kem-ten` (đều ghi THUẦN), màn hình import `kich-ban` + `model` ✓ · Luật 11: `text-green`/`text-yellow`/`text-red` có trong `tailwind.config.ts:19–21` ✓ · Luật 17: nút `disabled` + `title` lý do (`KhoiNguoiNhan.tsx:273, 297, 331`) ✓ · Luật 28: ô chọn dự án là `<button>` có viền ✓, "đã nối" là `<span>` không viền ✓ · Luật 29: hỏi tên WBS qua `hoiAgent` ✓ · Luật 30: mọi việc "mã · tên" (đo 3 mẫu) ✓ · **Luật 18**: xanh "đã nối", vàng "chưa chọn dự án" không truy về định nghĩa (⚪ #5) · **Tiếng Việt**: lỗi đĩa lọt tiếng Anh (🟡 #2) |

## 3. Lỗi — nặng → nhẹ

| # | Mức | Mô tả lời thường | Tệp:dòng | Bằng chứng | Đề xuất |
|---|---|---|---|---|---|
| 1 | 🟡 | **Bấm "Gửi ngay" đúng lúc nhịp 07:00 đang gửi → người nhận có thể nhận 2 bản.** Khoá chống chồng chỉ bọc NHỊP (`__nhipDangChay`) và bước DỰNG (`__dangDungBaoCao`); bước GỬI theo người (`guiBaoCaoSangTho` → `guiChoMotNguoi`) không có khoá, cũng không xem sổ `bao-cao-sang-da-gui.jsonl` đã gửi cho người đó hôm nay chưa | `dung.ts:564–` `guiBaoCaoSang`, `:802–808` | Đọc code: route `POST /api/bao-cao-sang {hanhDong:"gui"}` (`route.ts:82`) gọi thẳng `guiBaoCaoSang`, không qua `chayNhip`. Chưa tái hiện sống (cấm gửi thật) | Khoá "đang gửi ngày N" dùng chung cho nhịp và tay; hoặc trước khi gửi cho một người, tra `docDaGui` có dòng `ngay = hôm nay · ma · duong ≠ "thu" · ok` thì hỏi lại / bỏ |
| 2 | 🟡 | **Lỗi đĩa khi lưu kho → câu tiếng Anh tới màn.** `ghiKho` không bọc lỗi; route `catch` trả `e.message` nguyên văn (vd `EPERM: operation not permitted…`) | `kich-ban-kho.ts:95` `ghiKho` · `nguoi-nhan/route.ts:60, 75` | Đọc code; `datMau`/`chonDuAn` ném "Không tìm thấy tài khoản" là Việt, nhưng lỗi `fs` thì không | Bọc `ghiKho` → ném "Không ghi được kho kịch bản — thử lại hoặc báo quản trị" (ghi câu gốc vào nhật ký máy chủ) |
| 3 | 🟡 | **Đường cũ dự phòng bỏ qua lựa chọn "Không nhận".** Khi không ai đủ điều kiện (`danhSachNguoiNhan()` rỗng), bản Điều hành gửi vào `TELEGRAM_CHAT_ID` — chat đó là của Mr. Đại; nếu anh chọn "Không nhận" (hoặc tắt tài khoản) mà không còn ai khác, sáng sau vẫn nhận bản cũ | `dung.ts` `guiBaoCaoSangTho` nhánh `nhan.length === 0` · `kich-ban-kho.ts:108` `mauMacDinh` | Hiện KHÔNG xảy ra (dainc có mẫu Dự án) — lỗi logic chờ sẵn | Đường cũ chỉ dùng khi KHÔNG có bản ghi nào trong kho (chưa ai từng chọn); có người chọn "Không nhận" thì tôn trọng — không gửi, ghi sổ "không ai nhận" |
| 4 | 🟡 | **Nhịp hỏng giữa chừng → im lặng cả ngày.** Ghi "đã chạy" ở đầu (chống gửi 3 lần — đúng), nhưng lỗi giữa chừng thì không ghi trạng thái "hỏng", không chuông; 07:00 im → trái 6.3 "im lặng dễ nhầm với hỏng" | `dung.ts:745` | Đọc code; phiên gửi tự khai "hỏng giữa chừng thì mai chạy lại" | Ghi `{ngay, hong: câu lỗi}` vào `bao-cao-sang-nhip.json`; màn Báo cáo sáng hiện dòng đỏ/vàng "07:00 hôm nay hỏng: …" + nút Gửi lại |
| 5 | ⚪ | Màu chưa có định nghĩa (luật 18): `text-green` "đã nối", `text-yellow` "chưa chọn dự án — 07:00 chỉ nhận lời nhắc" | `KhoiNguoiNhan.tsx:262, 305` | Token có thật (luật 11 ✓) nhưng không có ngưỡng/vòng đời nào định nghĩa xanh/vàng ở đây | Chữ thuần màu `text-text-secondary`, phân biệt bằng chữ (như luật 18 dặn) — hoặc Mr. Đại chốt vàng = "chưa đủ điều kiện gửi" |
| 6 | ⚪ | Câu hỏi 🤖 lặp tên việc: *"7.2.3 Thi công san nền San nền: đền bù chặn đường…"*, *"6.1.4 Cung cấp Hub, Nacelle, Blade Cung thiết bị: …"*, *"7.2.3.4 Turbine số 04 Turbine 04: …"* — AI đã tự viết tên ngắn sau mã, lưới `ganTenChoMa` gắn thêm tên đầy đủ → lặp. Có TRƯỚC việc này (lưới 26/09), nhưng mẫu mới in câu 🤖 ở cả Điều hành và Dự án nên lộ nhiều hơn (19 câu 🤖 trong 3 mẫu đo) | `kich-ban.ts` → `luat-cod.ts` `motVanDe` → `ganTenChoMa` | Đo bản dựng 04/10 18:31 | Lưới bỏ phần AI đã viết trùng (`rutPhanTrung`) hoặc không gắn tên khi ngay sau mã đã có chữ |
| 7 | ⚪ | `batTatDuAn` hiện ngay trên màn và gửi CẢ danh sách mỗi lần bấm, không tải lại khi lưu được — bấm liền tay thì hai yêu cầu có thể tới máy chủ **ngược thứ tự** (mạng), danh sách cuối trên đĩa là của yêu cầu tới SAU, có thể mất một lần bấm; màn không biết vì không tải lại. Hiếm, chỉ trên mạng chậm | `KhoiNguoiNhan.tsx:123–150` | Đọc code | Kèm `luc` (mốc bấm) trong thân, máy chủ bỏ yêu cầu cũ hơn bản đã lưu; hoặc xếp hàng gửi tuần tự ở trình duyệt |
| 8 | ⚪ | Bản cũ (trước 18:31) không có `viecDoKhac`, `maDuAn` trong `thieuSot` → xem trước ngày cũ: mẫu Dự án không có khối "Việc đỏ khác", dòng chưa hỏi được ghi "(mọi dự án)" | `kich-ban.ts` `dongChuaHoiDuoc` | Lịch sử 62 dòng: dòng 18:31 mới có `viecDoKhac` (58) và `thieuSot` 24 dòng có `maDuAn`; 4 dòng trước đó `thieuSot` 2 dòng không `maDuAn` | Chấp nhận — ghi chú trên màn "bản trước 04/10 18:31 thiếu việc đỏ khác" |
| 9 | ⚪ | Hai thứ tự dự án cùng tồn tại: 3 mẫu mới xếp "xấu đi lên đầu"; đường cũ `ketXuatTelegram` (dự phòng + khung "Chữ sẽ gửi" khi chưa ai có mẫu) vẫn theo sổ dự án | `kich-ban.ts` `xepDuAn` · `luat-cod.ts` `ketXuatTelegram` | Đo `/api/bao-cao-sang` trả `chu` đường cũ: HV → N3A → Tân Thành… theo sổ | Khi đường cũ bị bỏ hẳn thì tự hết |
| 10 | ⚪ | Script kiểm đo: kho sau khi tôi xoá dòng `quantri` khác bản gốc 18 byte (định dạng), JSON bằng nhau | `data/bao-cao-sang-kich-ban.json` | — | Không cần làm gì; lần ghi sau của app sẽ về định dạng của nó |

## 4. 12 điểm mục 5

| # | Trả lời |
|---|---|
| 1 | Không tin nào vượt: dựng 3 mẫu từ bản thật 04/10 (15 dự án, 7 việc COD, 58 việc đỏ khác): Tổng quát **508** · Điều hành **2.050** · Dự án mọi dự án **3.133** · Dự án chưa chọn **182** · Dự án HV **2.402** · Dự án HV+N3A+Tân Thành **3.573** ký tự UTF-16 (JS `.length` đếm đúng đơn vị Telegram, emoji = 2) — tất cả 1 tin, dòng cuối "Xem và xử lý: …" / "Chọn dự án ở: …" đều có. `dongGoiTin`: khối dài > trần cắt NGUYÊN DÒNG (`catKhoi`), phần cuối luôn ở tin cuối, vòng `while` nhả khối có điều kiện dừng (`giuToiThieu`) — không treo |
| 2 | Dựng: chờ lượt đang chạy theo ngày ✓. Ghi "đã chạy" đầu: hỏng giữa chừng → cả ngày không chạy lại, im lặng (🟡 #4). **"Gửi ngay" trong lúc nhịp đang gửi → có thể 2 lần** (🟡 #1) |
| 3 | Đúng: lỗi đĩa → câu tiếng Anh (🟡 #2) |
| 4 | Đo được bằng tài khoản thật: `anhn` (engineer) và cookie `viewer` → **403** cả `chon-du-an` người khác và `dat-mau`; kho không đổi. Người xem tự chọn dự án cho bản của MÌNH: cửa "xem" cho qua — không trái luật Người xem (không phải AI, không ghi nghiệp vụ; chỉ chỉnh thứ mình nhận) nhưng Người xem chỉ nhận được khi Admin đã chọn mẫu cho họ |
| 5 | Có thể mất một lần bấm khi hai yêu cầu tới ngược thứ tự (⚪ #7); bình thường không mất |
| 6 | Có: chủ chat `TELEGRAM_CHAT_ID` chọn "Không nhận" mà không còn ai → vẫn nhận qua đường cũ (🟡 #3) |
| 7 | Khớp đúng 2 người: "Chủ tịch HĐQT" → Nguyễn Công Hùng (Tổng quát, mặc định) · "Tổng Giám đốc" → Trương Bửu Ngọc (Điều hành, mặc định); 4 "Phó Tổng Giám đốc" + "Phó Chủ tịch HĐQT" không khớp — đúng ý "để trống, Admin chọn". 27 chức vụ khác không lọt |
| 8 | Đúng là đổi; hợp công dụng C3 (Chủ tịch nhìn dòng đầu là thấy dự án xấu đi). Đường cũ còn theo sổ (⚪ #9) |
| 9 | Xác nhận (⚪ #8) |
| 10 | **Xác nhận có từ trước** việc này: lặp do `ganTenChoMa` gắn tên đầy đủ sau mã mà AI đã viết tên ngắn; mẫu mới chỉ làm lộ rõ hơn (⚪ #6) |
| 11 | **Xác nhận không thuộc việc này**: 3 bài hỏng `man-cua-main.test.ts:171, 206, 322` đều về menu trái / `open_tab`; tôi đã thấy đúng 3 bài này hỏng lúc kiểm lần 2 (12:30, trước `198f26a` 18:35) |
| 12 | Token có thật (`tailwind.config.ts:19–21`); định nghĩa màu chưa có (⚪ #5); luật 28: ô chọn dự án là `<button>` (viền đúng), "đã nối" `<span>` không viền ✓ |

## 5. Mục 3 — việc ngoài code

| # | Soát | Kết quả |
|---|---|---|
| 1 | Cổng 3010 sau 3 lần khởi động lại | `/bao-cao?tab=sang` 200 · `/alerts` 200 · `/viec-cua-toi` 200 · `/settings` 200 · `/api/bao-cao-sang` 200 · `/api/bao-cao-sang/nguoi-nhan` 200 |
| 2 | Bản dựng 18:31 | Dòng cuối lịch sử: `dungLuc 2026-10-04T11:31:19Z` (18:31 VN), 7 việc COD, `thieuSot` 24 dòng có `maDuAn`, `viecDoKhac` 58, `daGuiLuc null` ✓ (62 dòng tổng) |
| 3 | 8 lượt `danh_sach_issue` mã lạ | Không đếm lại sổ 4 agent (ngoài phạm vi Main); không ảnh hưởng dữ liệu |
| 4 | Kho kịch bản | Trước kiểm: đúng 1 dòng `ptgd.dai@scigroup.vn` (mẫu `du-an`, `duAnChon []`, 1 phiên bản 12:01Z bởi quantri). Sau kiểm: vẫn 1 dòng, nội dung bằng nhau |
| 5 | `bao-cao-sang-nhip.json` | `gui-bao-cao-sang 2026-10-04 · dung-bao-cao-dem 2026-10-04 · nhac-bc-tuan 2026-09-28` ✓ → 05/10 06:30 và 07:00 sẽ chạy |
| 6 | Sáng 05/10 ai nhận gì | `GET nguoi-nhan` (quantri): 3 người có mẫu — Nguyễn Chính Đại (du-an, đã nối Telegram, **thiếu dự án** → 1 tin nhắc), Nguyễn Công Hùng (tong-quat mặc định, **chưa nối**), Trương Bửu Ngọc (dieu-hanh mặc định, **chưa nối**) → `danhSachNguoiNhan` = 1 người = Mr. Đại, 1 tin 182 ký tự "📋 Báo cáo sáng 05/10/2026 — chưa chọn dự án … Chọn dự án ở: …/bao-cao?tab=sang" ✓ đúng như phiên gửi nói |

## 6. Đã kiểm · chưa kiểm · cần Mr. Đại

- **Đã kiểm:** tsc **0 lỗi**; vitest **760 đạt · 2 bỏ qua · 3 hỏng cũ** (`man-cua-main`); grep rác `duAnCuaToi` · `cua-toi` · `duAnCuaNguoi` · `chiDuAn` trong `src` + `tests`: **0** (chỉ còn `/viec-cua-toi` là tên trang); tài liệu `PLAN-MAIN-AGENT-v1.0.md` 6.6 (dòng 423–473), 6.4 (384), mục 7 (481–482) khớp code; "21:00" còn lại trong `CHOT` (dòng 51) là hẹn giờ Tiến độ đã tắt, không phải báo cáo sáng ✓; `TELEGRAM_CHAT_ID` chỉ còn ghi là đường dự phòng ✓.
- **Chưa kiểm được:** gửi thật (cấm) — chia tin, `messageId`, gửi thử; nhánh 2 lần gửi (🟡 #1) chỉ đọc code.
- **Cần Mr. Đại:** ① màu xanh "đã nối" / vàng "chưa chọn dự án" — giữ hay về chữ thuần (luật 18)? ② đường cũ `TELEGRAM_CHAT_ID`: bỏ hẳn khi đã có người chọn mẫu, hay giữ?

**Tổng: 0 🔴 · 4 🟡 · 6 ⚪ — C1 ✅ · C2 ✅ · C3 ✅ · C4 ✅ · C5 ✅ · C6 ✅ (một phần).**


## Mr. Đại chốt (04/10 tối, trả lời phiên kiểm)

- ⚪ #5: **GIỮ** màu xanh "đã nối" và vàng "chưa chọn dự án" — không đổi.
- Đường cũ `TELEGRAM_CHAT_ID` (🟡 #3): anh chưa trả lời — giữ ⏸.
