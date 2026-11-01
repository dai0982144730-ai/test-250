# Đề kiểm tra độc lập — Báo cáo sáng · tuần · tháng (Main 3010 + Tiến độ 3003)

*Lập 16:15 ngày máy 27/10/2026 (các tệp kế hoạch ghi «28/10») · phiên «@ Báo cáo: dữ liệu và trình bầy» gửi theo lệnh anh Đại · KẾT QUẢ ghi vào `27-10-bao-cao-sang-tuan-thang-toan-bo-phien.KET-QUA.md` cùng thư mục rồi nhắn lại phiên Báo cáo.*

> **Quy tắc người kiểm:** KHÔNG sửa code. KHÔNG bấm «Gửi ngay / Gửi lại / Gửi thử» (chỉ có MỘT chat Telegram nối — «Quản trị viên»). Được bấm «Dựng lại» **một lần** (gọi AI thật, ghi đè báo cáo thử hôm nay). Đăng nhập thử: `test.quantri@scigroup.vn` (mật khẩu = email), **không tự ký cookie**. Bộ kiểm đọc `tests/fixtures`, không đọc `data/`.

## 1. Thước (chốt của anh Đại — đối chiếu mọi điểm với các câu này)

| Chốt | Nội dung |
|---|---|
| N7 (27/10) | «Giữ nguyên danh sách dài. Không bảo mở Main hoặc hỏi thêm mới thấy. Việc lớn quan trọng để đầu danh sách» · «cắt gọn là gọn văn phong, không gọn thông tin» |
| Luật 30 | Không bao giờ chỉ viết mã; 28/10: **không ghi mã** (WBS/hồ sơ/issue) trong báo cáo — ghi nội dung đủ hiểu |
| Luật 31 / 34 / 35 / 36 | Khoảng ngày kèm số ngày · hàng tổng đầu bảng · nhanh/chậm bằng NGÀY (cấm %) · mọi câu nhanh/chậm ghi rõ «so với hệ nào» |
| Luật 10 | Lib đụng `node:fs` tách tệp thuần; client chỉ import tệp thuần |
| Luật 28 / 18 / 19 | Viền chỉ cho thứ bấm được · màu có định nghĩa · 🤖 đứng trước nội dung AI sinh |
| Luật 43 | Đổi tên màn/nút thì grep hướng dẫn + giải thích |
| Anh duyệt A 27–28/10 | KE-HOACH/33 (đợt 1–3), /34–/36 (khối mới), /37–/38 (trình bày + kế hoạch tuần/tháng); chọn dự án tại khối; luật 36 ghép theo khung; web hiện bảng, Telegram giữ thẻ việc |
| Tiếng Việt | Mọi thứ đến tay người dùng là tiếng Việt, kể cả lỗi |

## 2. Việc cần kiểm — danh sách commit theo NGƯỜI LÀM

**Lấy từ `git log 6b7021f^..HEAD` ở `4-agent-main` và `git log --since="2026-10-27 08:30"` ở `5-Agent-tien-do`. Git là sự thật.**

### A. Phiên Báo cáo (em) — 9 commit Main

| Commit | Việc |
|---|---|
| `6b7021f` | Sửa «chưa có số — bấm Dựng lại»: Dựng lại gom lại cả khối đã có; màn xem trước tự lấy số khối thiếu |
| `7568425` | Kiểu ảnh `duong-so` (một ảnh nhiều dự án) |
| `f180a17` `3e14e47` | Chọn dự án ngay tại khối «Dự án tôi chọn» + hướng dẫn |
| `d215e4c` | Sửa bài kiểm đỏ sau `6b7021f` |
| `cc010f6` | Đợt 1: khuôn trình bày chung (`khoi-in.ts`) + **không cắt danh sách** + gói tin theo mảnh (`dongGoiManh`) |
| `7446c8e` | Gỡ trùng RQ-1/DA-1 theo bộ; ảnh không cắt tên «…»; câu hỏi 🤖 dưới thẻ việc |
| `a6ca54d` | Commit hộ `xlsx-mau-cong-ty.ts` (+62 dòng của phiên báo cáo tháng, theo lệnh anh) |
| `0ee302d` | Luật 36 ghép «so với» theo khung (`ghepHeTheoKhung`) + web hiện BẢNG cho thẻ việc (`KhoiInWeb.tsx`) + lời dặn AI |

### B. Phiên khác làm tiếp lúc phiên Báo cáo hết token (mới nhất 15:00 → 15:39)

| Nhóm | Commit |
|---|---|
| Báo cáo sáng — đợt 2, 3 (KE-HOACH/33) | `9ea9985` `5252be9` `6720fe3` `69331bd` `6c34de4` `ebd4bf6` `6ed0b56` |
| Báo cáo sáng — khuôn đọc mới + khối mới (KE-HOACH/35, 36) | `e4eb9b3` `e8f247d` `af2bbd2` |
| Báo cáo sáng — khung điện thoại, tab Người nhận | `0985899` `6ee9808` `a19e0c0` `fea5349` |
| Nối Telegram / menu hướng dẫn | `b7b791b` `e1bb0d0` `f1a2fa6` |
| Bảng điều hành | `e8575d5` `d7af38d` |
| Báo cáo tháng (Main) | `396c458` `0dadfa2` `33aba81` `6087db5` `c12d9ba` `3e00fea` `028b1d4` `51bb5ad` `5343622` · menu `f878e4e` |
| Báo cáo tuần (3003 `5-Agent-tien-do`) | `16f2166` `8850895` `33bf249` `4b77d85` `0f7572e` |

### C. Phiên 11 «Việc chung» — CHỈ kiểm khi chạm tệp báo cáo sáng
`ba6052d` `642890f` `e5dd82e` `b774616` (chat/Telegram trợ lý, KE-HOACH/31). Ranh giới đã chốt: phiên 11 giữ `lib/ai/chat-*`, `lib/telegram-tro-ly/*`; phiên Báo cáo giữ `lib/bao-cao-sang/*`, `components/tabs/bao-cao-sang/*`, `api/bao-cao-sang/*`.

## 3. Tác động ngoài code

| Chỗ | Tác động |
|---|---|
| `data/bao-cao-sang-khoi/<ngày>.json`, `data/bao-cao-sang-lich-su.jsonl` | Dựng lại ghi đè; em đã bấm Dựng lại 4 lần hôm nay (AI thật) |
| `data/bdh-tom-tat.json` | Câu AI Hướng Việt dùng lại từ bộ nhớ 24 giờ |
| `data/bao-cao-sang-kich-ban.json` | Tài khoản thử `test.quantri` được đặt bộ 16→21 khối |
| Telegram | Em gửi THỬ 1 album 6 ảnh + 1 tin nhắc «🧪 THỬ» vào chat «Quản trị viên» (lúc 15:4x) — chỉ một lần |
| Cổng 3010 | Khởi động lại 1 lần (sáng) |

## 4. Hướng đã bỏ
- Đường «xuất Word» của báo cáo tháng/tuần (đã gỡ `c12d9ba` `4b77d85`) — skill `xuat-bao-cao-docx` giữ vì trợ lý chat còn dùng.
- Trần số tin Telegram theo mẫu (`soTinToiDa`) và số dòng mặc định (`soDongMacDinh`) — gỡ theo N7.
- HD-1 (bảo lãnh/tạm ứng), PL-1 (giấy phép) — bỏ theo KE-HOACH/35 mục «việc 2». NT-4, CT-3, VC-1 — hoãn.

## 5. Điểm phiên Báo cáo TỰ NGHI NGỜ (soát kỹ nhất)

| # | Điểm | Vì sao nghi |
|---|---|---|
| S1 | `ghepHeTheoKhung` (`lib/bao-cao-sang/khoi.ts`) | Mở rộng chốt 26/10 («chậm/lùi không đoán hệ»). Có thể ghép SAI hệ nếu khung ghi số trùng ngẫu nhiên (vd 20 ngày của hai thứ khác nhau cùng một hệ nhưng khác nghĩa)? Regex nhìn trước `(?<![\d.,])` có bỏ sót «1.234»? Thử câu mơ hồ, số có dấu «,» «.» |
| S2 | `dongGoiManh` / `chiaManh` (`khoi-telegram.ts`) | Chia khối dài sang tin sau «(tiếp)». Có thể làm hở `<pre>`/`<b>`/`<blockquote>`? Tin vượt 4.096 ký tự? Khối RQ-5 hôm nay 7.853 ký tự — đo từng tin thật bằng `ketXuatBoKhoi` |
| S3 | `damBaoKhoi(lamMoi)` (`dung.ts`) | Gom lại MỌI khối đã gom trong ngày — có thể gọi quá nhiều agent / quá lâu khi 55 người nhận? Có khoá trùng với lượt gom ngầm khác không? |
| S4 | Gỡ trùng theo bộ (`rq1`, `da1`) | Regex `LA_VUOT_HAN_CHU_TRUONG`, `LA_TON_VIEC_QUA_HAN` khớp chữ tiêu đề — tiêu đề đổi chữ thì hết khớp. Bộ có TQ-1 mà TQ-1 lại không in dòng vượt hạn (hanChuTruong lỗi) → mất tin? |
| S5 | `OChonDuAn` (`SuaBoKhoi.tsx`) | Bấm ra ngoài thì gập (listener `mousedown` toàn trang) — rò listener? Hai ô mở cùng lúc? Người xem (không quyền sửa) thấy nút mờ đúng luật 17? |
| S6 | `KhoiInWeb.tsx` gom thẻ thành bảng | Thẻ ngăn cách bởi khối khác có bị gom nhầm? Bảng 3 cột trên điện thoại hẹp có tràn ngang (luật bảng)? |
| S7 | Ảnh (`ve-anh.ts`: `veNhanThanh`, `ngatDong`, tiêu đề 3 dòng) | Nhãn 2 dòng đè nhau khi nhiều thanh? Tiêu đề hạ cỡ 20 vẫn tràn? Hãy tự vẽ với dữ liệu xấu (tên 80 ký tự, 12 thanh, 1 thanh, 0 thanh) |
| S8 | `tom-tat-ai.ts` (HE_THONG +1 câu) | Mô-đun dùng chung với trang Bảng điều hành; câu thêm vào có làm AI viết dài quá 60 từ? Bài `tom-tat-ai.test.ts` có khoá câu cũ? |
| S9 | `lib/bao-cao-sang/telegram.ts` `guiAlbumToi` | Album 2–10 ảnh; ảnh lẻ cuối nhóm gửi đơn; `TRAN_ANH_MOI_SANG` còn 2 hay đã bỏ? Chú thích ≤ 1.024 ký tự? |
| S10 | `xlsx-mau-cong-ty.ts` | Em commit hộ phần của phiên khác mà chưa mở Excel bằng Excel thật. Mẫu Form 0 cũ có đổi hành vi không (thêm tuỳ chọn mặc định)? |
| S11 | Lỗi lặp: dấu `\` bị đổi khi sửa bằng lệnh shell | Em dính 2 lần hôm nay (`/tồn \d+/`, `/\s*\(…\)/`) — **grep toàn bộ tệp phiên Báo cáo và phiên kia đã sửa trong ngày tìm regex mất `\`** (vd `d+`, `s*`, `(?:chức danh))s*`) |
| S12 | Hàng ghim, 3 tab trên điện thoại (báo cáo tháng/tuần) | Chưa thử cuộn trên điện thoại (bàn giao ghi) |

## 6. Danh mục kiểm (đo thật, dán số)

| Mã | Việc đo |
|---|---|
| K1 | `npx tsc --noEmit` ở `4-agent-main` và `5-Agent-tien-do`: 0 lỗi. `npx vitest run` cả hai: đếm qua / hỏng / bỏ qua (**xem cả số bỏ qua**). Bài `bao-cao-sang-cod` (300 vấn đề) hay quá 5 giây khi chạy cả bộ — chạy riêng 23/23 |
| K2 | Soát từng chốt ở mục 1 lên **bản sống** `localhost:3010/bao-cao` (3 tab Báo cáo sáng, tab Người nhận, tab Báo cáo tháng) và `localhost:3003/report-mgmt` |
| K3 | Chạy `scripts` hoặc jiti dựng bản đầy đủ 21 khối với số ngày hiện có (mẫu: gọi `dungBoKhoi` + `ketXuatBoKhoi` như `tests/unit/bao-cao-sang-khoi.test.ts`); in từng tin Telegram HTML; kiểm thẻ đóng đủ, ≤ 4.096, không rò `<...>` từ dữ liệu, không còn «xem ở Main» (`grep -rn "xem ở Main" src/lib/bao-cao-sang`) |
| K4 | Quét **mã** lọt vào chữ người đọc: `grep` các dòng in ra có dạng `\b\d+(\.\d+)+\b` (WBS), `HV-\d`, `N3A-`, `ISS-\d{4}` trong bản đầy đủ 21 khối |
| K5 | Luật 36 trên MỌI câu nhanh/chậm trong bản 21 khối: có câu nào «chậm/trễ/lùi/sớm/vượt N ngày» mà vế đó không có «so với»? |
| K6 | Quyền & agent mật: Người xem không thấy khối tiền/hợp đồng/pháp lý của dự án không thuộc mình (`locDuLieuKhoi`, `locBaoCaoSang`) — thử bằng `boLoc` thật, KHÔNG tạo tài khoản mới ngoài thử |
| K7 | Ảnh: vẽ 6 ảnh hôm nay + 5 ca xấu ở S7; nhìn bằng mắt từng ảnh (đọc được trên 360 px?) |
| K8 | Báo cáo tuần Excel Form 7 (3003): mở bằng bộ đọc `doc-excel.ts` của 3004 và đối chiếu cột; Báo cáo tháng Excel (Form 0): sửa chữ 🤖 tại chỗ → Excel lấy chữ đã sửa; «Làm lại» giữ chữ sửa tay |
| K9 | Tiếng Việt: lỗi, nút, hướng dẫn của mọi màn mới có chữ Anh/chữ kỹ thuật không? Hướng dẫn «Nối Telegram», «? Hướng dẫn» đúng tên màn (luật 43) |
| K10 | Git: `git status` hai repo — tệp liên quan chưa vào commit? Commit nào lọt tệp của phiên khác? |

## 7. Khuôn kết quả
Mỗi điểm: `🔴 / 🟡 / ⚪` · tệp:dòng · số đo thật dán lệnh · vì sao sai · gợi ý sửa. Cuối tệp: bảng tổng (đỏ·vàng·nhẹ), danh sách **điểm đã kiểm đạt**, danh sách **chưa kiểm được + lý do**, và dòng «Lần sau tính từ sau commit …». Điểm nào phiên Báo cáo sẽ không sửa thì ghi vào `.SOAT-LAI.md` kèm lý do.
