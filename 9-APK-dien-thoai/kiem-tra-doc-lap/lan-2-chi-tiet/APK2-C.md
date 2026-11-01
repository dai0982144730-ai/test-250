# Kiểm độc lập — commit `77ee02c` (app Android LIVE `CodeApp`, mục G + H chuyển từ 3004)

*01/11/2026 · trợ lý kiểm C · chỉ đọc + đo trên bản chiết xuất; không đăng nhập live, không gọi mạng, không ghi.*
Bản chiết xuất: `C:\Users\Admin\AppData\Local\Temp\claude\D--3-SETUP-1-AI-SCI-Ti-n---\82fbe873-f870-4ac5-81da-b0f1f906df08\scratchpad\d41\apk2c\9-APK-dien-thoai\CodeApp\app\src\main\assets\app\app.js`

## 1. Kết luận theo commit

| Mã | Kết luận | Lý do một dòng | Cách |
|---|---|---|---|
| `77ee02c` | 🟡 vừa — **không có 🔴** | Ghi đúng khuôn máy chủ live, 0 lỗi JS, 0 người rơi mất; có 2 chỗ nên sửa (nút Chủ trì mở bảng rỗng; nhóm «Khác» sẽ hiện lại khi máy chủ live nâng cấp) và lời khai «live có cùng lỗi H» không đúng | Đo + Đọc |

`node --check app.js` : qua. (Không chạy `tsc`: app là JS thuần.) Thân lệnh ghi `sua_viec` kiểm bằng cách chạy hàm thật của app trên Chromium headless, cầu nối Android giả (0 mạng).

## 2. Đo khuôn thật của máy chủ live (mục 2 đề)

Thư mục: `...\6-Agent-cong-viec-ban-chay-congviec.scigroup.vn\CodeSCICongViec\src`. **Lưu ý quan trọng:** cây làm việc ở đó đang sửa dở so với `HEAD` (`998b287`, 28/10, bản đã triển khai). Em đọc cả hai: các thứ dưới đây trùng nhau, trừ chỗ có ghi «sắp triển khai».

| Điều đo | Kết quả | Chỗ đọc |
|---|---|---|
| Tuyến `/api/phong/noi-nhan`, `/api/cong-viec/noi-phoi-hop` | **Không tồn tại** (cả HEAD lẫn cây làm việc). `api/phong/` chỉ có `giai-doan, nhac-nop, so-do, tom-tat-tien-do` | `ls src/app/api/phong`, `git ls-tree HEAD` |
| `/api/cong-viec/noi-phoi-hop` rơi vào tuyến động `[id]` | Có `so_cai.xem` → 404 JSON «Không có công việc noi-phoi-hop»; **không có `so_cai.xem` → 403**, không phải 404 (xem AL-09) | `api/cong-viec/[id]/route.ts:16-30` |
| Khuôn `so-do` | `giao_duoc` ("tat_ca" hoặc mảng mã), `giao_nguoi` = `[{don_vi_id, ten (TÊN ĐẦY ĐỦ), nguoi:[{id,ten,chuc_vu}]}]`, `chan_chu_tri` (mảng mã), `phoi_hop` = `{lanh_dao:[{id,ten}], nhom:[{don_vi_id,ten,ca,nguoi:[{id,ten}]}]}`, `o` có `ten_ngan,cha`, `lanh_dao` = MỌI ô `chuc_danh`, `nguoi` có `don_vi_ids` | `api/phong/so-do/route.ts:22-32`, `lib/phong/so-do.ts:47-60,164-171` |
| Khớp khuôn app đang đọc | Tên trường, kiểu đều khớp `noiNhanTuSoDo`/`phoiHopTuSoDo` (app.js:985, 1005). Không có `don_vi_id` ở từng người, nhưng **có ở từng nhóm** — app dùng cái này | |
| `giao_nguoi` = người **MÌNH** giao được? | **Đúng** — `nguoiGiaoDuoc(q, nd, phamViGiao(q, nd))`. Loại: lãnh đạo (trừ quản trị), trưởng đơn vị của chính mình (nếu mình không phải lãnh đạo), đơn vị `ban_tgd/chuc_danh/rieng/ca_nhan/ben_ngoai`, cá nhân công ty ngoài SCI. **Mỗi người xuất hiện ĐÚNG MỘT nhóm** (đơn vị chính xếp trước) | `giao-chuyen-tiep.ts:117-170`, dòng 147 `if (daCo.has(r.id)) continue` |
| Đổi chủ trì = giao lại, có đòi quyền giao? | **Có** — trừ khi nhận về chính mình. `suaViec` → `doiNguoi(..., tuSuaViec=true)` bỏ kiểm «sửa» nhưng vẫn gọi `batBuocTrongPhamVi` (nơi nhận phải nằm trong `phamViGiao`) rồi, nếu là NGƯỜI khác, phải nằm trong `nguoiGiaoDuoc` (không `bld`). Nơi nhận là chính mình thì qua luôn, không cần quyền giao | `dich-vu.ts` (HEAD) :1544-1565, :274-310 · cây làm việc :1604-1625, :330 · `suaViec` :1781/:1842 |
| Máy chủ nhận `chu_tri.loai:"don_vi"`? | **Có** — `PhuTrach.loai` là `"nguoi"\|"don_vi"`; tên lưu **do máy chủ tự tra** (`SQL_PV`: `COALESCE(d.ten, n.ten)` từ bảng đơn vị), `chu_tri.ten` của app chỉ chui vào dòng lịch sử. Bản 3004 và bản live giống nhau ở `doiNguoi`/`suaViec` (em so `diff` hai hàm: HEAD = cây làm việc) | `dich-vu.ts:35` (`SQL_PV`), `[id]/route.ts:88-98` |
| Ô chức danh BLĐ gửi thế nào | `don_vi:<mã ô>`; tên lưu là tên ô = «Chức danh · Tên người» (`db/69-chuc-danh-tu-ghep.sql`: máy tự ghép). Đi qua `batBuocTrongPhamVi` loại `don_vi` → chỉ cần mã ô nằm trong `phamViGiao` và không bị `chan_chu_tri` | |

### Mỗi vai thấy gì (ĐỌC mã; vai mặc định ở `lib/khoi-tao.ts:56-100`)

Máy chủ live chỉ có vai `quan-tri, lanh-dao, truong-don-vi, nhan-vien, van-thu` — **không có vai tên «PM» hay «Người xem»**; em quy: BLĐ=`lanh-dao`, PM≈`truong-don-vi`, Người dùng=`nhan-vien`, Người xem=không có `cong_viec.sua_viec` (chưa đo bằng tài khoản thật).

| Vai | `giao_duoc` | Bảng Chủ trì (đã đo bằng kịch bản giả A–D) | Bảng Phối hợp (`noiPhoiHopDuoc`) |
|---|---|---|---|
| Quản trị / BLĐ | `"tat_ca"` | Chính tôi · Ban lãnh đạo (ô chức danh, trừ «Trợ lý…») · MỌI đơn vị có nút tròn · người trong `giao_nguoi` (BLĐ không có cá nhân lãnh đạo, chỉ ô) | ô lãnh đạo cấp 1 (trừ ô mình) · mọi đơn vị «Cả …» · mọi người trừ lãnh đạo / cá nhân ngoài SCI |
| Trưởng đơn vị (≈PM) | mảng: đơn vị mình + cấp dưới | Chính tôi · đơn vị trong phạm vi (đơn vị **mình** không nút tròn) · người trong các đơn vị đó (trừ trưởng đơn vị mình). **Không có nhóm BLĐ** | cả đơn vị ngang cấp + cấp dưới; đích danh theo bậc |
| Nhân viên (≈Người dùng) | `[]` | **Chỉ «Chính tôi»**; nếu chủ trì hiện tại đã là mình → bảng **rỗng** (AL-01). Máy chủ cũng chặn người khác (`pv` rỗng) → danh sách khớp luật | cả đơn vị CẤP DƯỚI; đích danh nhân viên ngang cấp + mọi người cấp dưới |
| Người xem | — | không có ✏ (không có `cong_viec.sua_viec`) — chưa đo | — |

→ Giả thuyết của peer «người không có quyền giao thì chỉ còn đơn vị, không có cá nhân» **ngược thực tế**: không có quyền giao thì **không có cả hai**, chỉ còn «Chính tôi». Có quyền giao thì có cả đơn vị lẫn người, đúng như máy chủ sẽ chấp nhận.

## 3. Phát hiện chi tiết

### AL-01 🟡 Nút «Chủ trì» vẫn bấm được nhưng mở bảng rỗng «Không tìm thấy.»
- Điều kiện: người **không có quyền giao** và **chính mình đang chủ trì** (nhân viên sửa việc do mình giao rồi tự làm). Đo kịch bản D2: `nhóm: []`, thân bảng chỉ có «Không tìm thấy.» (chữ này sai nghĩa: đây là «không có ai để chọn», không phải kết quả tìm).
- `app.js:1456` (nút `data-chonct` luôn `chon-nut co`), `app.js:950-952`, `veChon` (≈ dòng 903-912).
- Luật 17 (bản live: nút không có gì để làm thì **MỜ**) + luật 4 (bớt cú bấm vô ích).
- Gợi ý: tính `moChon("ct").nhom().length` trước khi vẽ nút; rỗng → nút mờ, chữ «… (không có người khác để đổi)».

### AL-02 🟡 Khi máy chủ live nâng cấp (bản đang sửa dở 29/10), nhóm «Khác» quay lại cho BLĐ/quản trị
- Cây làm việc (chưa commit) thêm vào `giao_nguoi` nhóm ảo `{don_vi_id:"@ho-tro-bld", ten:"Hỗ trợ Ban lãnh đạo"}` (`giao-chuyen-tiep.ts` đoạn `DON_VI_HO_TRO_BLD`, chỉ cho lãnh đạo/quản trị khi Cài đặt `giao_viec.ho_tro_ban_lanh_dao` có người). Nhóm này không có trên sơ đồ nên không nằm trong `cay`.
- Đo kịch bản B (cùng dữ liệu A + nhóm đó, 2 người): nhóm hiện **«Khác (2)»** = Lê Văn Trợ, Phạm Kiểm. HEAD (A): không có «Khác». Chính chốt G muốn «không còn Khác».
- `app.js:859-861` (`khac`), `app.js:985-1003` (`noiNhanTuSoDo` đẩy người nhóm này vào `nguoi` nhưng không có chỗ vẽ). `nhomChuyenTiep` (app.js:~870-880) đã xử lý `@ho-tro-bld`, bảng Chủ trì thì chưa.
- Gợi ý: trong `noiNhanTuSoDo` gom nhóm `@ho-tro-bld` vào `nhom.lanh_dao`-style nhóm riêng «Hỗ trợ Ban lãnh đạo» (hoặc để `nhomGiaoMoi` nhận id bắt đầu bằng `@`). Chưa lộ trên máy live hôm nay, lộ ngay khi triển khai.

### AL-03 ⚪ Lời khai «bản live có cùng lỗi H» không đúng; phần H gần như là mã chết trên live
- Đo kịch bản E (nhóm `giao_nguoi` không có `don_vi_id`, ghép theo tên): vẫn **0 «Khác»**, 10/10 người đúng phòng. Kịch bản A: **0 người mất** (`server cho 7`, `hiện 10` = 7 người + 3 ô BLĐ).
- Vì sao: người của live đến từ `giao_nguoi` (nhóm đã có mã; ghép ở `goc`, app.js:849) và `dv` = **tên đầy đủ** `d.ten`, không phải tên ngắn. Lỗi 44/59 của 3004 sinh ra từ `/api/phong/noi-nhan` (nguồn khác) — live không có tuyến đó. Nhánh `thuoc()` (app.js:852) chỉ chạy cho đơn vị không có trong `giao_nguoi`, mà khi đó `d.nguoi` (cũng từ `giao_nguoi`) không có ai thuộc nó → luôn rỗng (đo: «Phòng Dự phòng», «SCI PMC» chỉ có nút tròn). Bộ lọc `oLd` (app.js:859) cũng không bao giờ trúng vì `giao_nguoi` không có nhóm `chuc_danh`.
- Không hại, chỉ là lời khai quá tay. Thêm `don_vi_ids` ở `noiNhanTuSoDo` vô hại.

### AL-04 ⚪ Ô chức danh **của chính mình** vẫn hiện trong «Ban lãnh đạo» (điểm nghi 4)
- Đo `do-live2.js`: chủ trì hiện tại là `nguoi:dainc` → nhóm vẫn còn `don_vi:bld-ptgd-dai` («Nguyễn Chính Đại»); BLĐ thấy tên mình hai lần khi chủ trì khác mình (nhóm «Chính tôi» + ô trong «Ban lãnh đạo»).
- Chọn ô đó gửi `chu_tri {loai:"don_vi", id:"bld-ptgd-dai"}`; máy chủ nhận (khoá `don_vi:…` ≠ `nguoi:…`), đổi người thành ô cùng một người. Máy chủ ở ô Phối hợp **tự loại ô của mình** (`noiPhoiHopDuoc`: `!nd.don_vi_ids.includes(d.id)`), ô Chủ trì không.
- Gợi ý: loại ô thuộc `CACHE.me.don_vi_ids` khỏi `nh.lanh_dao` trong `noiNhanTuSoDo`. (Bản 3004 có cùng mã.)

### AL-05 ⚪ Không có cách «giữ nguyên chủ trì» sau khi chọn nhầm
- `moChon("ct")` luôn loại người/đơn vị đang chủ trì (app.js:952) nên sau khi chọn người mới, không chọn lại được người cũ; phải đóng ✏ (nút ✏ bấm lại) rồi mở. Dropdown cũ có dòng «(đang chủ trì)». Hai cú bấm thay vì một, trái tinh thần luật 4 nhẹ.

### AL-06 ⚪ Nhận diện nhóm BLĐ ở Phối hợp bằng **tên** (`/lãnh đạo/i`)
- `app.js:923`. Đo P1 với đơn vị giả «Phòng Lãnh đạo kỹ thuật»: mất nút tròn «cả đơn vị», dòng «Cả Phòng Lãnh đạo kỹ thuật» hiện như một **người**. Chưa biết tên thật nào chứa chữ đó (db seed không có). Gợi ý: `phoiHopTuSoDo` đánh `bld:true` cho nhóm đầu (đã biết chắc là `lanh_dao`) và `nhomPhoiHop` dùng cờ, không dùng tên.

### AL-07 ⚪ Người kiêm nhiệm chỉ hiện ở đơn vị CHÍNH (khác điểm nghi 5 của đề)
- Máy chủ live đã loại trùng (`giao-chuyen-tiep.ts:147`), đo: «Đỗ Giang (chính KH, kiêm nhiệm QT)» chỉ ở KH. Bản 3004 đề ghi «hiện ở mọi đơn vị». Không mất người, nhưng ai tìm anh ấy theo đơn vị kiêm nhiệm sẽ không thấy. Chỉ ghi nhận, vì đó là luật máy chủ.

### AL-08 ⚪ Hai lời gọi nạp song song khi mở ✏
- `app.js:1226` `moPhoiHop(); taiNoiNhan();` không chờ nhau; `soDoThoTaiDay` (app.js:979) không gộp lời gọi đang bay → nếu `CACHE.soDoRaw` chưa có sẽ gọi `/api/phong/so-do` hai lần. Thường đã có (`moThe` nạp `taiSoDo`, app.js:1553), chưa đo trên mạng thật.

### AL-09 ⚪ Thăm dò 404 trên tuyến động `[id]`
- `moPhoiHop` (app.js:1596) gọi `GET /api/cong-viec/noi-phoi-hop`; live trả 404 JSON nhưng phải qua `chiTietCoQuyen` (truy vấn DB tìm việc tên «noi-phoi-hop») mỗi lần mở ✏; và người không có `so_cai.xem` nhận 403 → nhánh dự phòng (`r.ma === 404`) không chạy. Thực tế vô hại vì người đó cũng không mở được thẻ việc. Gợi ý: nhớ cờ «máy này không có noi-phoi-hop» sau lần 404 đầu.

### AL-10 ⚪ Dòng lịch sử ghi tên rút
- `chu_tri.ten` gửi đi: ô BLĐ = «Nguyễn Công Hùng» (đã rút «Chức danh · »), đơn vị = «Ban QLDA Quảng Trị» (đã bỏ «Cả »). Máy chủ ghi lịch sử «chủ trì <cũ: Chức danh · Tên> → <ten>» → hai khuôn tên khác nhau trong cùng dòng. Chỉ trình bày; tên lưu thật do máy chủ tra (trả lời điểm nghi 1, 2 của đề).

## 4. Điểm nghi của đề (mục 7b + mục 5 phần G/H)

| Điểm | Kết luận | Cách |
|---|---|---|
| 7b: `giao_nguoi` là người MÌNH giao được → Chủ trì chỉ còn đơn vị? | **Không đúng chiều**: không có quyền giao thì không có cả đơn vị lẫn người, chỉ «Chính tôi»; có quyền thì có cả hai; khớp với luật máy chủ chặn (AL-01 là hệ quả UI). Đổi chủ trì **đòi quyền giao** trừ khi nhận về chính mình | Đọc + Đo |
| G1: BLĐ gửi `don_vi:<ô>`, tên lưu? | Máy chủ tự tra tên ô = «Chức danh · Tên»; `ten` của app chỉ vào lịch sử (AL-10). Hiển thị về sau: `tenRut(ctCuTen)` ra đúng tên người. Chưa bấm Lưu thật | Đọc + Đo (thân lệnh) |
| G2: `ten` cả đơn vị bỏ «Cả » | Không lệch gì: máy chủ không dùng `ten` để lưu; app so khoá `loai:id` | Đọc |
| G3: chip rút tên vs gửi tên đủ | Máy chủ so theo khoá `loai:id` (`khoa(x)`, `suaViec`), không so tên → không ảnh hưởng. Trong app cũng so theo `loai`+`id` | Đọc |
| G4: ô BLĐ của chính mình | Có thật, nên bỏ (AL-04) | Đo |
| G: chủ trì tự chọn lại chính mình | Khi chủ trì khác mình: «Chính tôi» chọn được, thân `{loai:"nguoi",id:<mình>}`, máy chủ cho qua không cần quyền giao. Khi đã là mình: bị loại khỏi bảng (đúng) | Đo + Đọc |
| H5: kiêm nhiệm / `don_vi_ids` rỗng | Trên live không xảy ra (AL-03, AL-07) | Đo |
| H6: lãnh đạo không có ô chức danh | Lãnh đạo (vai `lanh-dao`) bị máy chủ loại khỏi `giao_nguoi` (luật «không giao ngược lên lãnh đạo»), nên chỉ chọn được qua ô; không có ô thì không chọn được — đúng luật, không phải mất dữ liệu | Đọc |
| Chủ trì 26 nhóm | Đo kịch bản F: 26 đơn vị × 2 người → **28 nhóm** (Chính tôi + Ban lãnh đạo + 26), 54 người (52−1+3 ô BLĐ), 0 «Khác», 0 lỗi JS | Đo |
| Lệch so với web live (SoDoPhong.tsx `FormSuaViec`) | Web live Chủ trì chỉ cho **người** (`luatGiao.nhom`); app thêm đơn vị + ô BLĐ + «Chính tôi». Máy chủ nhận hết nên không lỗi, nhưng cùng một việc sửa trên web và app cho khả năng khác nhau. Đây là chủ đích của chốt G (anh chọn «Chủ trì lấy phạm vi Giao cho») — ghi nhận, cần anh biết | Đọc |

## 5. So bài thử của peer `thu-chon-live.js` với khuôn thật (ĐỌC; **không chạy**)

Không chạy vì bài thử đăng nhập `127.0.0.1:3004` bằng `dainc@scigroup.vn` (tài khoản thật của anh trên 3004), trái luật 3 của CHUNG.md (vé đăng nhập chỉ qua Main 3010 với tài khoản thử). Thay bằng bài đo giả hoàn toàn: `do-live.js`, `do-live2.js` cùng thư mục.

| # | Chỗ bài thử mô phỏng | Khuôn thật | Hệ quả |
|---|---|---|---|
| M1 | Dựng `giao_nguoi` từ `nn.nguoi[].don_vi_ids` → người kiêm nhiệm hiện ở **mọi** đơn vị | Máy chủ chỉ cho mỗi người **một** nhóm (`giao-chuyen-tiep.ts:147`) | Đếm người nhiều hơn thật |
| M2 | Chỉ loại nhóm `chuc_danh` | Máy chủ còn loại: người vai lãnh đạo, trưởng đơn vị mình (nếu mình không là lãnh đạo), loại đơn vị `ban_tgd/rieng/ca_nhan/ben_ngoai`, cá nhân công ty ngoài SCI | «Chủ trì 26 nhóm» là của dữ liệu 3004 chưa lọc, không chắc bằng live |
| M3 | Không có nhóm `@ho-tro-bld` | Bản sắp triển khai có | Bỏ sót AL-02 |
| M4 | Chỉ thử một tài khoản (dainc, `tat_ca`) | Trưởng đơn vị / nhân viên cho danh sách khác hẳn, có ca rỗng | Bỏ sót AL-01 |
| M5 | `phoi_hop.nhom[].don_vi_id = ca ? ca.id : ""` | Máy chủ luôn có `don_vi_id` | Vô hại |
| M6 | `phoi_hop.lanh_dao` lấy từ nhóm «lãnh đạo» của 3004 | Máy chủ: ô `chuc_danh` cấp 1, **trừ ô của chính mình**, chỉ cho lãnh đạo/quản trị | Nhỏ |
| M7 | `giao_nguoi.ten` = tên đầy đủ, bỏ `chuc_vu` | Khớp / vô hại | — |

Kết luận: mô phỏng đúng *tên trường* nhưng **rộng hơn** khuôn thật ở M1–M2 và hẹp hơn ở M3–M4; con số «26 nhóm, không Khác» của họ không bị bác nhưng chỉ đúng cho một vai.

## 6. Luật

| Luật | Kết quả |
|---|---|
| Tiếng Việt | Đạt: «Đổi chủ trì…», «Thêm phối hợp…», «Phối hợp với…», «(mới — bấm Lưu để đổi)», «Đang tải danh sách…», «Bạn không có quyền giao việc». Thông báo 404 có đường dẫn `[404 /api/…]` là cố ý (chụp màn hình báo lỗi) |
| 28 viền | Không thêm `span` có viền/nền mới trong diff (chỉ đổi `select` thành `button.chon-nut`, lớp có sẵn) |
| 4 bớt cú bấm | Chọn là đóng (đo: `chonXong` → `dongChon` ngay); nhưng ✏ vẫn cần «Lưu thay đổi» (cùng khuôn form cũ). AL-05 |
| 17 (live: mờ) | Vi phạm nhẹ AL-01; nút «＋ thêm phối hợp…» khi chưa nạp xong vẫn bấm được nhưng không làm gì (app.js:1232 `if (v && CACHE.noiPh)`) |
| 30 mã kèm tên | Chip, nút, toast đều chỉ hiện tên; dự phòng `H.sCtTen \|\| sv.ct` (app.js:1455) sẽ hiện mã thô «don_vi:…» nếu `ten` rỗng — đo không xảy ra (mọi đường chọn đều có tên) |
| Lệch với 3004 | Logic 5 hàm (`nhomPhoiHop, tenTrongNhom, taiNoiNhan, moChon, chonXong`, `phoiHopTuSoDo`) **giống từng byte** với 3004 (md5 trùng); `nhomGiaoMoi` chỉ khác câu chú thích; `noiNhanTuSoDo` chỉ khác `don_vi_ids`. Chỗ khác thật sự là **nguồn dữ liệu** (so-do thay cho tuyến riêng) — chủ đích |

## 7. Đã thử phá nhưng không thủng
- 26 đơn vị × 2 người: không mất ai, không «Khác», 0 lỗi JS.
- Người kiêm nhiệm: xuất hiện đúng một lần, không mất.
- Tên ngắn ≠ tên đầy đủ, nhóm không có `don_vi_id`: vẫn ghép đúng (khớp tên đầy đủ).
- Đơn vị không có người («Phòng Dự phòng», «SCI PMC»): chỉ nút tròn, không nhóm lép.
- Chủ trì tự chọn lại chính mình, chủ trì là ô BLĐ, chủ trì cả đơn vị: thân `chu_tri` đúng `{loai,id,ten}`.
- Chọn rồi đóng: không để `CHON` treo; Back/✕ vẫn đóng được.

## 8. Chưa kiểm được
- Chưa gọi máy chủ live thật (đúng dặn): chưa thấy phản hồi thật của `suaViec` với `don_vi`/ô BLĐ; kết luận chỉ từ đọc mã `HEAD 998b287` + cây làm việc (cả hai trùng ở `doiNguoi`, `suaViec`, `batBuocTrongPhamVi`).
- Chưa biết bản đang chạy ở congviec.scigroup.vn có đúng `HEAD 998b287` không (giả định theo đề).
- Chưa có dữ liệu tổ chức thật của live: chưa biết có đơn vị nào chứa chữ «lãnh đạo» (AL-06), chưa so được cờ `ngoai_sci` (máy chủ) với `CACHE.sd.dung` (app, `trongCongTyNgoai`) — hai nguồn riêng, nếu lệch thì người hoặc nhóm công ty ngoài sẽ rơi «Khác» hoặc biến mất.
- Chưa dựng APK/chưa thử trên máy thật.
- Tài khoản Người xem / PM thật: chưa đo; chỉ suy từ ma trận vai mặc định.

## 9. `git status` / dọn dẹp
Không đụng kho thật: chỉ `git archive` / `git show` / `git diff` đọc. Không tạo junction (không cần `tsc`). Bản gắn móc `inst/app.js` chỉ nằm trong scratchpad (thêm đúng một dòng `window.__T = …` trước `})();`).
