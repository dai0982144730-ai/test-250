# APK2-B — Kiểm độc lập lần 2 app «SCI Công việc 3004» · phần giao diện (app.js / index.html) · thước E, F, G, H + điểm tự nghi 1–9

*01/11/2026 · phạm vi git `1cdb82c..44992cd` · tiền tố mã `AG-` · 🔴 phải sửa trước khi phát APK · 🟡 nên sửa · ⚪ ghi nhận*

## 0. Mã đã kiểm là mã nào

| Việc | Kết quả | Cách |
|---|---|---|
| Bản chạy `CodeApp-3004` so với `44992cd` | `app.js`, `ghep-giao-dien.js`, `thu-giao-dien-tro-ly.js`, `TroLyMain.kt` giống từng byte; `index.html` chỉ khác CRLF/LF (so bỏ CR: không khác dòng nào). **Không có lệch** | [Đo] `cmp`, `diff --strip-trailing-cr` |
| `node --check app.js` | qua | [Đo] |
| `thu-giao-dien-tro-ly.js` (peer khai 41/41) | **41/41 ĐẠT**, 0 lỗi JS (chạy 2 lần, cầu nối Main giả) | [Đo] |
| Dữ liệu thật 3004 | Đăng nhập `kiemtra.claude@scigroup.vn` (quản trị) được; cầu nối Android giả gọi THẬT `localhost:3004`, **chỉ GET**. Mọi lệnh ghi bị chặn tại cầu nối giả, không tới máy chủ. 0 lỗi JS ở các phần E/F/H/G | [Đo] |
| Dữ liệu 3004 có bị đổi không | So `GET /api/so-cai` trước/sau phần G: phần việc của CV-2026-0052 và CV-2026-0130 **không đổi** | [Đo] |

Lưu ý phạm vi G: phần G em có bấm «Lưu thay đổi» **trong cầu nối giả** (lệnh `POST` bị chặn, chỉ ghi lại thân gói) để đọc chính xác app gửi gì. Không có gói nào ra 3004.

## 1. Bảng theo thước

| Thước | Kết luận | Một dòng | Đo/Đọc |
|---|---|---|---|
| E — nhóm găng đứng đầu, `the(v, nhom)` | ✅ sạch | HV: nhóm «Việc nằm trên đường găng (2)» đứng đầu; bấm bản găng chỉ mở bản găng, bấm bản người chỉ mở bản người (luôn đúng 1 thẻ mở) | [Đo] |
| F — bảng tiến độ có Baseline | 🟡 (chữ ✅, hiệu năng/chú giải ⚪) | Luật 31, 35, 36 đúng ở mọi hộp; không có lớp CSS đụng; chú giải ở cuối bảng 6,4 màn hình; vẽ lại toàn bảng khi bung/thu | [Đo] |
| G — Chủ trì/Phối hợp dùng bảng chọn chung | 🟡 | Chạy đúng, nhưng 3 chỗ lệch với máy chủ/quyền (AG-01, AG-02, AG-03) | [Đo]+[Đọc] |
| H — ghép người vào phòng theo `don_vi_ids` | ✅ sạch | 0 người rơi «Khác», 0 lãnh đạo bị mất; cũ khớp tên 15/59 | [Đo] |

## 2. Phát hiện chi tiết

### AG-01 🟡 — Người không có quyền «Giao việc» mở ✏ là hiện thông báo lỗi, nút Chủ trì hiện mà bấm không được

| | |
|---|---|
| Vị trí | `app.js:1341` (`if (tt.thao === "sua-viec") { moPhoiHop(); taiNoiNhan(); }`) · `app.js:1054-1061` (`taiNoiNhan` → `toast("Bạn không có quyền giao việc")` khi 403) · `app.js:1571` (nút `data-chonct` không kiểm quyền) |
| Máy chủ | `6-Agent-cong-viec/CodeSCICongViec/src/app/api/phong/noi-nhan/route.ts:12` — chỉ quản trị hoặc có quyền `cong_viec.giao` mới được 200, người khác 403 |
| Ai dính | Vai «Nhân viên» có `cong_viec.sua_viec` (cua_minh) nhưng **không có** `cong_viec.giao` (`src/lib/khoi-tao.ts:87`) → mở ✏ trên việc của mình được |
| Tái hiện | Mô phỏng 403 cho `/api/phong/noi-nhan` trong cầu nối giả, mở ✏ ở CV-2026-0052: thông báo «Bạn không có quyền giao việc» hiện ngay khi mở ✏ (không bấm gì); nút «Chủ trì ›» vẫn hiện; bấm → lại thông báo, bảng không mở. **[Đo bằng giả lập; chưa thử bằng tài khoản nhân viên thật — không có tài khoản loại này]** |
| Luật | 17 riêng 3004: nút không có quyền thì **ẨN**; ngoài ra mở ✏ chỉ để sửa tên/hạn mà bị báo lỗi là lỗi mới (bản trước gọi `soDoThoTaiDay()` im lặng). Web cũng không cho nhân viên đổi chủ trì (danh sách `nhan-chuyen-tiep` rỗng khi không có quyền giao: `dich-vu.ts:292-293`) |
| Gợi ý sửa | Dùng sẵn `coQuyenGiao()` (`app.js:280`): chỉ gọi `taiNoiNhan()` và chỉ vẽ nút `data-chonct` khi có quyền; không có quyền thì bỏ dòng Chủ trì khỏi form |

### AG-02 🟡 — Đổi chủ trì «sang chính mình» qua ô chức danh của chính người đó

| | |
|---|---|
| Vị trí | `app.js:1066` (`moChon("ct")` chỉ loại đúng khoá `sv.ctCu`) |
| Đo (dữ liệu thật) | CV-2026-0052 có chủ trì `nguoi:ptgd.dai@scigroup.vn`. Bảng Chủ trì vẫn liệt kê «Nguyễn Chính Đại» trong nhóm Ban lãnh đạo (giá trị `don_vi:bld-ptgd-dai`). Chọn → ô đổi thành «Nguyễn Chính Đại (mới — bấm Lưu để đổi)» và gói gửi đi là `chu_tri {loai:"don_vi", id:"bld-ptgd-dai", ten:"Nguyễn Chính Đại"}`. Chiều ngược lại: CV-2026-0130 có chủ trì `don_vi:bld-ptgd-dai`; «Nguyễn Chính Đại» lại hiện trong P.ĐT&PC và BQLDA QT (giá trị `nguoi:`) |
| Hệ quả | Người dùng thấy cùng một cái tên mà không đổi gì, nhưng máy chủ coi là đổi (`dich-vu.ts:2125` so khoá `loai:id`) → chạy `doiNguoi`: ghi `tao_luc = now()`, lịch sử «chủ trì X → X», báo «chuyển cho bạn». Thực tế có 10 việc chủ trì ở dạng `don_vi:bld-…` và 2 việc dạng `nguoi:` (đo trong `/api/so-cai`) nên cả hai chiều xảy ra thật |
| Trả lời điểm nghi 4 | Có xảy ra. Nên bỏ |
| Gợi ý sửa | Khi lọc ở `moChon("ct")`, loại thêm mọi mục cùng một người với chủ trì hiện tại (ô chức danh `bld-…` ↔ `nguoi:` của người giữ ô; ghép bằng `n.don_vi_ids`) |

### AG-03 🟡 — Danh sách Chủ trì rộng hơn danh sách máy chủ chịu nhận

| | |
|---|---|
| Vị trí | `app.js:1064-1066` (Chủ trì lấy `/api/phong/noi-nhan`) |
| Máy chủ | `dich-vu.ts:1799-1806`: đổi chủ trì sang **một người** (≠ chính mình) phải nằm trong `nguoiNhanChuyenTiep` (loại người mang vai Lãnh đạo, trưởng ở đơn vị mình, ô Ban TGĐ/chức danh). Web 3004 dùng đúng danh sách này (`SoDoPhong.tsx:1175` → `/api/cong-viec/nhan-chuyen-tiep`) |
| Đo | Quản trị: app liệt kê 38 người trong các phòng; máy chủ chấp nhận 36 người → **2 người bị từ chối** sau khi bấm Lưu (Nguyễn Chính Đại, Phạm Văn Nghĩa — đều PTGĐ). Tài khoản dainc: 1 người (Phạm Văn Nghĩa) |
| Hệ quả | Thông báo lỗi tiếng Việt của máy chủ hiện ra («Không đổi chủ trì sang … được: ngoài phạm vi giao việc…») — không mất dữ liệu, nhưng người dùng chọn xong mới biết |
| Ghi chú | Chốt 01/11 của anh Đại là «Chủ trì lấy phạm vi Giao cho», nên chọn cả đơn vị (`don_vi`) và ô lãnh đạo là cố ý; chỉ phần người bị từ chối là lệch |
| Gợi ý sửa | Lọc nhóm `nguoi:` của bảng Chủ trì theo `GET /api/cong-viec/nhan-chuyen-tiep` (một lượt gọi, đã có) và giữ nguyên các mục `don_vi:` |

### AG-04 ⚪ — Nhóm không có người vẫn hiện mũi tên ▸, bấm mở ra trống

Đo: bảng Chủ trì 12/27 nhóm, bảng Phối hợp 22/34 nhóm chỉ có nút tròn «cả đơn vị», không có ai để bung; vẫn có `▸` và bấm vào đổi thành `▾` mà không có gì hiện. `app.js:1022`. Gợi ý: không vẽ mũi tên và không gắn `data-cn` khi `gr.nguoi.length === 0`.

### AG-05 ⚪ — Chú giải bảng tiến độ nằm cuối bảng

Đo HV: 184 dòng, `scrollHeight` 5.648 px, chú giải ở vị trí 5.550 px = **6,4 màn hình** cuộn (mở lần đầu bung hết dòng). Người dùng điện thoại gần như không thấy. `app.js:716-719` (`chuGiaiTD` ghép sau `td-luoi`). Gợi ý: ghim chú giải dưới thanh trên hoặc hiện thành nút «?» nhỏ.

### AG-06 ⚪ — Bung/thu vẽ lại cả bảng

Đo (Chromium headless, giả chậm CPU bằng CDP; **không phải máy thật**):

| Bảng | DOM node | HTML | Bung/thu/zoom, CPU thường | CPU chậm 4× | CPU chậm 6× |
|---|---|---|---|---|---|
| HV 184 dòng | 1.890 | 82 KB | 2–5 ms | 17–63 ms | 63–314 ms |
| TT 276 dòng | 2.757 | 117 KB | 4–8 ms | 48–232 ms | 58–481 ms |
| N3A 38 dòng | 466 | 20 KB | 10–16 ms | 43–109 ms | 57–313 ms |

Cuộn và bấm một dòng: **0** thay đổi DOM (không vẽ lại) — tốt. Chỉ nút bung/thu (`data-tg`), C2/C3, +/− gọi `veTd()` dựng lại toàn bộ bằng `innerHTML`. Máy cao cấp ổn; máy trung bình có thể thấy khựng ~0,2–0,5 giây ở bảng 276 dòng. Chưa đo trên điện thoại thật.

### AG-07 ⚪ — Thang màu và hộp có chỗ chưa truy về định nghĩa (luật 18)

| Chỗ | Điều đo/đọc |
|---|---|
| Cột «% TH» màu vàng (vượt khối lượng) | Chú giải không có mục nào giải thích vàng/xanh của cột này. Bản web cũng chưa ghi ở chú giải. `app.js:608-613` |
| Hộp ghi «Mục tiêu: 85 ngày…» và «so với Tiến độ mục tiêu» | Thanh Tiến độ mục tiêu không vẽ và chú giải không có mục «Tiến độ mục tiêu» (ẩn mặc định như web). Người đọc thấy tên hệ mà không thấy hình |
| Nhóm găng chữ đỏ cả dòng | CSS comment «đỏ = găng»; luật 18 ghi đỏ dành riêng Issue. Đây là quy ước dấu «!» găng đã có từ trước ở web 3004, nên chỉ ghi nhận |

### AG-08 ⚪ — Tên «cả đơn vị» không thống nhất giữa Chủ trì và Phối hợp

Chủ trì hiện «Cả Phòng Đầu tư và Pháp chế» (tên đầy đủ, `tenTrongNhom` `app.js:1048`) và gửi `ten` = «Phòng Đầu tư và Pháp chế». Chip Phối hợp hiện «Cả P.ĐT&PC» (tên server `noi-phoi-hop`). Máy chủ không lưu `ten` do app gửi (lấy tên từ bảng `identity.don_vi` — `dich-vu.ts:146-152,1808`), chỉ dùng cho dòng lịch sử → không lệch dữ liệu, chỉ lệch chữ.

### AG-09 ⚪ — `tdPopup` không phòng thủ khi dữ liệu thiếu mảng

`app.js:764-766`: `h.dong.map`, `h.ghiChu.filter`, `h.cham.length` ném lỗi nếu máy chủ trả hộp thiếu một mảng. Dữ liệu thật hiện tại: 34 hộp bấm thử ở 4 dự án, 0 lỗi. Chỉ [Đọc] cho nhánh thiếu.

### AG-10 ⚪ — Tổng dự án không cộng khớp số thẻ hiển thị (cố ý)

HV: «32 việc» nhưng 34 thẻ trên màn vì 2 việc găng hiện hai lần (nhóm găng + nhóm người). Nậm săm 3A: «3 việc», 5 thẻ. Đúng chốt «việc găng vẫn hiện thêm ở nhóm dưới»; ghi để người kiểm khỏi nhầm.

## 3. Điểm tự nghi 1–9 — kết luận từng điểm

| # | Điểm | Kết luận | Số đo / dẫn chứng |
|---|---|---|---|
| 1 | G chủ trì là BLĐ: máy chủ ghi tên người hay chức danh? Hiển thị về sau lệch không? | **Không lệch** | App gửi `chu_tri {loai:"don_vi", id:"bld-ptgd-dai", ten:"Nguyễn Chính Đại"}` [Đo, gói bị chặn]. Máy chủ **không lưu `ten` của app**: `doiNguoi` ghi `phu_trach_loai/id` (`dich-vu.ts:1811-1816`), `phu_trach_ten` về sau là `COALESCE(d.ten, n.ten, id)` lấy từ bảng đơn vị (`dich-vu.ts:35`) = «Phó Tổng Giám đốc · Nguyễn Chính Đại». App hiển thị lại bằng `tenRut()` → «Nguyễn Chính Đại (đang chủ trì)». Cách này đã là dạng thật: 10 việc chủ trì dạng `don_vi:bld-…` trong `/api/so-cai`, app đọc đúng. `ten` chỉ vào dòng lịch sử «chủ trì A → B» |
| 2 | G chủ trì cả đơn vị: `ten` bỏ «Cả » khác `ten_ngan`? | Có khác chữ, **không ảnh hưởng dữ liệu** | Gửi `ten:"Phòng Đầu tư và Pháp chế"` [Đo]; máy chủ bỏ qua khi lưu (xem AG-08) |
| 3 | G chip phối hợp `tenRut` hiện nhưng gửi `x.ten` đủ — có chỗ nào so sánh tên để lọc trùng? | **Không** | App lọc trùng bằng `loai`+`id` (`app.js:1600`, `daCo` = `loai:id` `app.js:1348-1350`); máy chủ khoá bằng `loai:id` (`dich-vu.ts:2122-2143`). Gói gửi: `phoi_hop:[{loai:"don_vi",id:"bld-ct-hdqt",ten:"Chủ tịch HĐQT · Nguyễn Công Hùng"}]` [Đo] |
| 4 | G `daCo` chủ trì: đổi sang chính mình qua ô chức danh BLĐ | **Có xảy ra, nên bỏ** | AG-02 [Đo] |
| 5 | H người kiêm nhiệm hiện ở mọi đơn vị; `don_vi_ids` rỗng quay về so tên | Đúng như thiết kế | Đo: 59 người, 0 người có `don_vi_ids` rỗng → nhánh dự phòng so tên **chưa chạm dữ liệu thật** (chỉ [Đọc] `app.js:966`). Kiêm nhiệm: 10 người ở ≥2 phòng (trợ lý Chủ tịch ở 6 phòng); trong bảng Chủ trì 57 lượt hiện / 42 người khác nhau, ví dụ Nguyễn Văn Thanh ×4 |
| 6 | H «Khác» bỏ người BLĐ — có lãnh đạo rơi mất? | **Không mất ai** | `nhom.lanh_dao` có 8 ô, đủ 8 hiện trong nhóm «Ban lãnh đạo (8)». 6 người chỉ giữ ô chức danh (không thuộc phòng nào) → hiện ở BLĐ; số người «Khác» = **0**. Chỉ người có ô nằm trong `nhom.lanh_dao` bị bỏ khỏi «Khác»; người ở ô khác (trợ lý Chủ tịch `bld-troly-ct`) vẫn còn ở các phòng của họ. Mô phỏng và đo DOM khớp nhau (cả quản trị lẫn dainc). Cũ: 15/59 khớp tên [Đo] |
| 7 | E `the(v, nhom)`: có chỗ gọi `the(v,"")` ngoài ý muốn? Mở từ thông báo mở đúng bản đầu? | **Sạch** | `grep`: 4 chỗ `.map(the)` (số thứ tự → `typeof` chặn, thành `""`) và 1 chỗ `the(v,"g")` có chủ ý. Gọi `moLienKet` cho 4 việc găng thật: tất cả mở ở tab Phòng ban (nhóm «-», không có bản găng), đúng 1 thẻ mở. Nhánh «mở ở tab Dự án» (`app.js:1852`) chỉ chạy khi tab Phòng ban không có thẻ — **chưa tái hiện được bằng dữ liệu thật**; đọc mã thì nhất quán (`thay()` lấy bản đầu rồi `moThe(ma, thay().dataset.nhom)`) |
| 8 | F dòng tên dự án: luật 31 | **Đúng** | Hộp ghép: «Baseline: 523 ngày · 10/04/2026 – 14/09/2027» (số ngày tính cả hai đầu, đúng khuôn); COD là một ngày nên không cần số ngày. Không có câu nhanh/chậm ở dòng này |
| 9 | F tên lớp CSS ngắn có đụng lớp sẵn có? | **Không đụng** | [Đo] Duyệt mọi luật CSS không thuộc nhóm `td`: trên 4 bảng, chỉ `*`, `button`, `.tb-dau`, `.lui` khớp phần tử trong `#man-td` (thanh trên + nút quay lại, có từ trước). [Đọc] `.gang` có 4 luật khác (`.viec .gang`, `.vitri .gang`, `.nhom2 .gang`, `.td-*`) đều có tiền tố phạm vi; `.dat` chỉ ở `.o.dat`; `.xanh/.vang/.trang/.db/.cho/.kh/.th/.hn/.cod/.cg/.nguon/.hd/.gc/.ch` đều gắn sau `.td-chu`/`.td-pct`/`#td-pop.toi`. Luật 28: không span/i nào có viền + nền + bo trong vùng bảng và nhóm găng |

## 4. Luật chung đã soi

| Luật | Kết quả |
|---|---|
| 28 | Đo bằng `getComputedStyle`: 0 chữ thuần có viền+nền+bo ở bảng tiến độ và nhóm găng ✅ |
| 18 | Thang màu: xem AG-07 (⚪) |
| 17 (3004: ẨN khi không quyền) | AG-01 🟡 |
| 30 | Không chỗ nào hiện mã trơn trong phần diff: tiêu đề hộp «1 BÁO CÁO NGHIÊN CỨU KHẢ THI…» có mã kèm tên ✅ |
| 31 | Mọi khoảng ngày trong hộp có «N ngày ·»; chú giải/COD một ngày ✅. Chỉ ghi nhận bảng KHÔNG Baseline (cũ, ngoài diff): «Kết thúc: 06/12/2028 · 766 ngày» — số ngày đặt sau dòng kết thúc, không đúng khuôn «N ngày · a – b» |
| 35/36 | Lọc 34 hộp ở HV/TT/N3A: mọi câu «chậm/sớm/đúng hạn» đều kèm «so với Baseline» hoặc «so với Tiến độ mục tiêu»; không có câu nào dùng chênh % để kết luận nhanh/chậm. Cột «% TH» chỉ nói đã làm bao nhiêu ✅ (chữ do máy chủ dựng sẵn, app chỉ hiển thị) |
| 34 | Dòng «32 việc · 27 quá hạn» nằm trên đầu ✅; bảng tiến độ không có hàng tổng |
| Tiếng Việt | Mọi chữ mới/thông báo mới là tiếng Việt (chỉ còn thuật ngữ «agent», «Baseline», «COD» là tên riêng của hệ) ✅ |
| Bớt cú bấm | Bấm một người/«tròn cả đơn vị» → áp dụng và đóng luôn (đo: `bảng đóng = true`) ✅ |
| Luật 44 (giờ VN) | `homNay()` qua `T.bayGioVN()` ở mọi chỗ mới ✅ [Đọc] |
| Luật 29 | `app.js` không có `fetch(`/`XMLHttpRequest`; mọi gọi qua cầu nối ✅ |

## 5. Đã thử phá nhưng không thủng

- Bấm hai bản của cùng một việc găng, bấm qua lại: luôn đúng 1 thẻ mở, đúng bản được bấm (HV, CV-2026-0124).
- Duyệt CSS toàn trang tìm luật đụng tên lớp (xem điểm 9).
- Đếm người rơi «Khác»/mất lãnh đạo bằng hai cách (mô phỏng mã trên JSON thật + đếm DOM thật): cùng kết quả, 0/0.
- Cuộn, bấm một dòng bảng: 0 lần vẽ lại.
- Hơn 100 lượt gọi GET thật: 0 lỗi JS ở app; 0 lệnh ghi lọt ra ngoài.

## 6. Chưa kiểm được

| Việc | Vì sao |
|---|---|
| Hiệu năng trên điện thoại thật (Xiaomi 14 Ultra hay máy yếu hơn) | Chỉ có Chromium headless + giả chậm CPU; số ở AG-06 là ước lượng |
| AG-01 bằng tài khoản «Nhân viên» thật | Không có tài khoản loại này; em giả lập 403 của `/api/phong/noi-nhan`, còn việc nhân viên nhận 403 là [Đọc] `route.ts:12` |
| Lưu thật chủ trì sang ô BLĐ / cả đơn vị rồi xem màn hình web hiển thị | Không được ghi lên 3004; kết luận điểm 1 dựa vào [Đọc] `dich-vu.ts` + gói [Đo] |
| Nhánh mở từ thông báo vào tab Dự án có bản găng | Không dựng được tình huống bằng dữ liệu thật (tab Phòng ban luôn có thẻ trước) |
| Nhánh `don_vi_ids` rỗng, máy chủ cũ không có `giao_nguoi`/`noi-nhan` | Dữ liệu thật không rơi vào nhánh này |
| Hai lỗi `fetch failed` thoáng qua ở lượt chạy phần E đầu tiên | Phát sinh ở bài thử gọi 3004 (không phải app); 5 lượt chạy sau không lặp lại |
| Phần Kotlin, trợ lý Main, đăng nhập một lần (điểm 10–12 của đề) | Ngoài phạm vi phần này |

## 7. Tệp bài thử (scratchpad, không đưa vào kho)

`...\scratchpad\d41\apk2b\thu-dl-that.js` (E/F/HG/G) · `thu-f2.js` · `thu-g403.js` · `h.js` (mô phỏng H trên JSON thật) · kết quả JSON và ảnh ở `...\apk2b\anh\`.
