# Kiểm lần 3 — bản sửa 9 điểm vàng, commit `403c05d` (app 3004 → 3004-0.1.5 · app live → 0.1.33)

*Phiên «0 Kiểm tra độc lập», 01/11/2026 tối. Chỉ đọc + đo. Đã chiết xuất `git archive 403c05d` vào `...\scratchpad\d41\apk3\src`. Không chạm kho thật; không đăng nhập live; không gọi lệnh ghi (cầu nối giả chặn mọi POST/PUT, không bấm «Lưu thay đổi»). Tài khoản: `kiemtra.claude@scigroup.vn`, chỉ GET.*

## 1. Bảng 9 điểm

| Điểm | Kết luận | Mức | Đo / đọc | Ghi chú ngắn |
|---|---|---|---|---|
| AQ-01 giữ thẻ khi lỗi | **ĐÃ SỬA ĐÚNG** | ✅ | Đo (13 mã) | `app.js:2182`. Mã 0/500/502/504/524: giữ thẻ, nút bấm lại được, câu «Chưa rõ lệnh đã chạy hay chưa (…)». Mã 400/403/404/409/410/200: xoá thẻ, hiện câu của Main. Bấm lại không làm đôi: máy chủ đánh dấu `da-lam` TRƯỚC khi chạy (`4-agent-main/src/lib/ai/cho-duyet-kho.ts:185`) ⇒ lần hai trả 409 «Việc này đã làm rồi». ⚪ mã 3xx không phải /login (cổng đăng nhập chen) cũng xoá thẻ — chiều an toàn |
| AQ-02 `quenMain` + `cungDiaChi` | **SỬA ĐÚNG phần cũ, nhưng PHÁT SINH LỖI MỚI** | 🟡 → AR-01 | Đọc Kotlin + bản dịch JS (23 cặp) + DNS thật | `quenMain` xoá `main_server`/`main_email` (`Cfg.kt:71`) đúng; `localhost`↔`127.0.0.1`↔`[::1]`, tên máy↔IP, cổng 80/443 ngầm, HOA/thường đều nhận. Nhưng so «cùng IP» làm hai tên khác nhau trên MỘT máy chủ dùng chung bị coi là «cùng máy» (xem AR-01) |
| AQ-03 gửi mật khẩu 3004 sang Main | **SỬA ĐÚNG phần giao thức, nhưng nới điều kiện «cùng máy»** | 🟡 → AR-01 | Đọc + bản dịch JS | `TroLyMain.kt:83-86`: https↔http cùng host: KHÔNG gửi (đo). Cảnh báo http ở ô Main: đạt (bài 44/44). Nhưng «cùng IP» cho phép gửi sang tên khác trên cùng IP công cộng (AR-01) |
| AQ-04 đăng nhập email khác → `quenMain` | **ĐÃ SỬA ĐÚNG** | ✅ | Đọc Kotlin | `MainActivity.kt:182,186`: `emailCu` lấy TRƯỚC khi gọi `Api.dangNhap`; so `equals(email.trim(), ignoreCase=true)`; `Api.dangNhap` lưu `email.trim()` (`Api.kt:129`) nên cùng người gõ khác hoa/thường không bị xoá; đăng nhập hỏng thì không xoá. Hết phiên rồi vào lại cùng email: giữ phiên Main |
| AG-01 (3004) ẩn Chủ trì khi không có quyền giao | **ĐÃ SỬA ĐÚNG** | ✅ | Đo (dữ liệu thật + giả 403) | `app.js:1375,1607`. Không quyền: ô ẨN, 0 lượt GET `nhan-chuyen-tiep`. Đường duy nhất vào bảng Chủ trì là `data-chonct` (`app.js:1378`, `moChon("ct"` chỉ ở `:1100`); «Phối hợp» và «+ Phối hợp» dùng bảng khác, không lọt |
| AL-01 (live) nút Chủ trì mờ | **SỬA LỆCH** | 🟡 → AR-02 | Đo (giả theo khuôn live) | Mờ + lý do đúng ở ca «không còn ai» (D2). Nhưng cũng mờ ở ca nhân viên không quyền giao mà chủ trì là NGƯỜI KHÁC (D1) — ca này «Chính tôi» đang chọn được và máy chủ cho qua |
| AG-02 (cả hai) bỏ ô đối ứng | **ĐÃ SỬA ĐÚNG** | ✅ | Đo (thật 3004: 6 ca; giả: 9 ca, cả hai app) | `3004 app.js:1063` / `live :949`. Chủ trì `nguoi:X` ⇒ mất ô chức danh của X; chủ trì `don_vi:L` ⇒ mất mọi người giữ L; người giữ 2 ô ⇒ mất cả 2; trợ lý kiêm 6 phòng ⇒ biến khỏi mọi phòng; cả đơn vị ⇒ chỉ mất nút tròn của đơn vị đó; X không có trong sơ đồ / chủ trì rỗng / `don_vi_ids` rỗng: không lỗi, không mất ai khác. Kết quả 3004 và live GIỐNG HỆT từng chữ |
| AG-03 (3004) lọc theo `nhan-chuyen-tiep` | **ĐÃ SỬA ĐÚNG** (⚪ AR-03) | ✅ | Đo (thật, 6 việc × 1 bảng) | Cổng trả 36 người; `noi-nhan` có 44 cá nhân ⇒ loại 8 (7 lãnh đạo + chính tài khoản thử). Mọi người còn trong bảng đều nằm trong 36 ⇒ **0 người bị 403 sau Lưu** (cả 6 ca). 7 lãnh đạo vẫn chọn được qua 7–8 ô chức danh; không mất ai (Thủy KSNB qua ô `tbp-ktnb`). Lỗi 500/mạng ⇒ không lọc (quay về hành vi cũ, 3 người dính 403). Cổng trả `{nhom:[]}` ⇒ hết người, còn ô + «Chính tôi» (đúng với máy chủ) |
| AL-02 (cả hai) nhóm ảo `@…` | **ĐÃ SỬA ĐÚNG** (live) · **mã chết** (3004) | ✅ | Đo (giả) | Nhóm ảo 1 nhóm, nhiều nhóm, trùng người giữa hai nhóm, không người (không hiện), người đã ở phòng thật (không lặp): «Khác» = 0 mọi ca. Tên chứa `<img onerror>` / `"><img…>` (cả `don_vi_id`): 0 thẻ `img` được dựng, 0 lần chạy script. 3004: `so-do` của 3004 không có khoá `giao_nguoi` (`grep` mã 3004: 0 chỗ) nên đoạn này không bao giờ chạy — vô hại |

## 2. Phát hiện mới (tiền tố AR-)

### AR-01 🟡 — «cùng IP sau phân giải» coi hai tên khác nhau trên MỘT máy chủ dùng chung là «cùng máy»
- **Mã**: `TroLyMain.kt:57-62` (`cungMayChu`), dùng ở `:66` (chặn «Đây là địa chỉ 3004, không phải Main» · `:79`) và `:85` (tự gửi mật khẩu 3004 · `:83-86`).
- **Đo**: DNS thật hôm nay: `congviec.scigroup.vn`, `tiendo.scigroup.vn`, `phaply.scigroup.vn` cùng trả **103.90.224.140**. Bản dịch JS của đúng logic Kotlin (`apk3\cung.js`):

| 3004 đã lưu | Gõ vào ô Main | Chặn «là địa chỉ 3004» | Tự gửi mật khẩu 3004 |
|---|---|---|---|
| https://congviec.scigroup.vn | https://tiendo.scigroup.vn | **có** | **có** |
| https://congviec.scigroup.vn | https://phaply.scigroup.vn | **có** | **có** |
| https://congviec.scigroup.vn | https://scigroup.vn (IP khác 112.78.3.61) | không | không |
| https://congviec.cdn.test | https://ke-xau.cdn.test (cùng IP anycast, giả) | **có** | **có** |

- **Vì sao sai**: (a) khi lên hosting, nếu Main là một tên con khác của `scigroup.vn` cùng máy chủ (đúng kiểu `tiendo`/`phaply` hiện có) thì ô Main bị chặn cứng bằng câu «Đây là địa chỉ SCI Công việc 3004» (sai nghĩa) — lỗi mới do bản này (trước chỉ so chuỗi). (b) Mật khẩu 3004 bị tự gửi sang MỌI tên trỏ về cùng IP cùng giao thức, kể cả tên người gõ nhầm/lạ trên CDN dùng chung (AQ-03 không đóng hẳn, chỉ đổi từ «cùng chữ» sang «cùng IP»). Ở mạng LAN hôm nay (3004 `:3004`, Main `:3010`) không dính vì khác cổng.
- **Gợi ý một dòng**: chỉ coi «cùng IP» khi IP đó là riêng/loopback (10.x, 172.16–31.x, 192.168.x, 127.x, ::1, fc00::/7); IP công cộng chỉ tính «cùng máy» khi hai tên GIỐNG CHỮ.
- Ghi chú: phân giải chạy ở luồng nền thật (`mainTuDangNhap`/`mainDangNhap` mở `Thread`, `goi()` chạy trong `Thread` của `mainApi`; `mainTrangThai`/`diaChiNen` gọi `cungDiaChi` không phân giải), nên không dính NetworkOnMainThread. Không có thời hạn cho `getAllByName` (⚪ AR-04).

### AR-02 🟡 (nhẹ) — live: nút Chủ trì mờ cả khi «Chính tôi» chọn được
- **Mã**: `CodeApp/.../app.js:1491-1493` (`lyDoCt = !coGiao ? " — bạn không có quyền giao việc" : …`, `disabled` khi có `lyDoCt`).
- **Đo** (`apk3\thu-form.js`, bản gắn móc, dữ liệu giả theo khuôn live): `coQuyenGiao()=false` ⇒ nút mờ + «— bạn không có quyền giao việc», dù với nhân viên chủ trì là người khác thì bảng Chủ trì còn «Chính tôi» (kịch bản D1 của `do-live.js`: nhóm `["Chính tôi"]`, 1 nút tròn) và máy chủ cho «nhận về chính mình» không cần quyền giao (`doiNguoi`). Lần 2 chỉ báo lỗi ở ca D2 (chủ trì là chính mình, bảng rỗng).
- **Vì sao sai**: mất đường «nhận việc về mình» bằng ✏ ở app live, lý do hiển thị không đúng. Chưa thử nhân viên thật.
- **Gợi ý**: mờ chỉ khi `!nhomChuTri(sv).length` (đúng như 3004); khi không quyền giao mà còn «Chính tôi» thì cho bấm.

### AR-03 ⚪ — `taiNhanCT` nhớ luôn kết quả lỗi tạm
- `3004 app.js:1075-1078`: lỗi mạng/500 ⇒ `CACHE.nhanCT = null` (không lọc) và không bao giờ thử lại tới lần đăng nhập sau (`xoaBoNho` xoá CACHE). Đo (`nctLoiMang`, `nct500`): bảng quay về 3 người (Nguyễn Chính Đại hai lần, Phạm Văn Nghĩa) dính 403 sau Lưu — hành vi cũ, có báo lỗi tiếng Việt, không mất dữ liệu. Gợi ý: không ghi `null` khi `ma==0` hoặc `>=500`, để lần mở sau thử lại. Live: 404 ⇒ `null` là chủ ý (đo giả, chưa đo live thật).

### AR-04 ⚪ — phân giải DNS không có thời hạn
- `getAllByName` (`TroLyMain.kt:61`) không đặt thời gian chờ; mỗi lần `dangNhap` có thể phân giải tới 4 lượt (hai lần `cungMayChu` × hai tên). Chỉ làm chậm lúc mạng/DNS hỏng, không chặn giao diện (luồng nền). Chưa đo trên máy thật.

### AR-05 ⚪ — chữ tài liệu
- `README-3004.md:35` vẫn ghi «Biên dịch Kotlin cả 10 tệp … 0 lỗi» (đúng cho 0.1.0), trong khi Kotlin đã đổi ở 0.1.1–0.1.5 và lần này chưa biên dịch lại; README mục «Sửa sau kiểm độc lập lần 2» chỉ trỏ tệp SOAT-LAI, `HIEN-TRANG-01-11.md` chưa cập nhật phiên bản (SOAT-LAI đã nói để lúc dựng).
- `quenMain` nay xoá cả địa chỉ Main: ở hosting công khai (không có gợi ý `:3010`) mỗi lần bấm «Đăng nhập lại trợ lý Main» hay đổi người phải gõ lại địa chỉ Main. Đúng ý AQ-02/AQ-04, ghi để anh biết.

### AR-06 ⚪ — có sẵn từ trước, không do bản này
- Mở ✏ rồi gõ ngay ô «Tên việc»: sau ~0,5 giây form vẽ lại, ô mất tiêu điểm và ký tự đang gõ mất (đo với cả `77ee02c` và `403c05d`, giống hệt). Không phải hồi quy.

## 3. Hồi quy (chạy lại)

| Việc | Kết quả |
|---|---|
| `node --check app.js` | đạt cả hai app |
| `kiem-thu/thu-giao-dien-tro-ly.js` | **44/44**, 0 lỗi JS (đếm lại `ĐẠT`; gồm 41 bước cũ + 524 + 2 cảnh báo http) |
| `index.html` ghép lại bằng `ghep-giao-dien.js` (cả hai app, thư mục tạm) | khớp bản lưu (bỏ CR) |
| `build.gradle.kts` | 3004: `versionCode 6`, `3004-0.1.5` · live: `34`, `0.1.33` — khớp lời khai |
| Tab Dự án trên dữ liệu thật (`thu-dl-that.js E`) | HV: 34 thẻ, nhóm «! Việc nằm trên đường găng (2)» đứng ĐẦU; bấm hai bản của một việc găng mở 1 thẻ; mở từ thông báo 4/4 ca mở đúng 1 thẻ. 0 lệnh ghi, 0 lỗi JS |
| Bảng tiến độ (`... F`) | 4 bảng (HV 184 dòng, TT 276, BT 66, N3A 38); mọi chữ nhanh/chậm đều kèm «so với Baseline/Tiến độ mục tiêu» (thiếu 0) |
| Bảng chọn (`... HG`, dữ liệu thật) | 27 nhóm Chủ trì, **nhóm «Khác» = 0**, 53 người; chọn 1 người ⇒ ô đổi «(mới — bấm Lưu để đổi)» và bảng đóng ngay (một cú bấm) |
| Live: `do-live.js` (6 kịch bản + 26 nhóm + phối hợp) chạy trên bản live mới gắn móc | «Khác» = null mọi kịch bản; kịch bản B (nhóm Hỗ trợ BLĐ) hiện nhóm riêng «Hỗ trợ Ban lãnh đạo (2)»; 0 người mất; phối hợp không đổi |

## 4. Đã thử phá nhưng không thủng
- AQ-01: bấm lại sau mã 524/500/502/504 không chạy hai lần (máy chủ trả 409); nút không kẹt `disabled`.
- AQ-04: cùng người gõ hoa/thường hay có khoảng trắng — không bị quên nhầm.
- AG-01: mọi đường vào `moChon("ct")`; ca không quyền ⇒ 0 lượt tải danh sách.
- AG-02/AG-03: 9 ca biên (chủ trì rỗng, X ngoài sơ đồ, người 2 ô, trợ lý kiêm 6 phòng, id có dấu `:`), `nhanCT` rỗng/lọc — không lỗi JS, không mất người ngoài ô đối ứng.
- AL-02: XSS qua tên nhóm và mã nhóm — `esc()` đủ vì mọi thuộc tính dùng nháy kép.
- Kotlin (đọc): cú pháp/kiểu hợp lệ (`Regex.matches`, `intersect`, `catch (_: Exception)`, tham số mặc định `phanGiai`), không có `/*` lồng trong KDoc.

## 5. Chưa kiểm được
- **Kotlin không biên dịch được ở máy kiểm** (không có kotlinc/Java/Android SDK): `Cfg.kt`, `TroLyMain.kt`, `MainActivity.kt` chỉ đọc. Lời khai «gradle release qua» không kiểm lại được. Bản dịch JS của `cungDiaChi` là bản dịch, không phải mã thật (khác biệt có thể có ở chi tiết `java.net.URL`/`InetAddress`).
- Máy chủ live thật (không đăng nhập live): `nhan-chuyen-tiep` trên live có 404 không; `so-do.nguoi` của live có đủ `don_vi_ids` cho `doiUngChuTri` (đọc mã live HEAD: có).
- Nhân viên thật (không quyền giao) ở 3004 và live; tunnel thật (524); Lưu thật rồi xem web; Người xem; hiệu năng DNS/ GPU trên điện thoại; `dainc@` (cố ý không dùng — dùng `kiemtra.claude@`, danh sách 36 người thay vì 37).

## 6. Tệp đo (đều ở `...\scratchpad\d41\apk3\`)
`thu-3004-that.js` (bảng chọn thật, 6 ca + chế độ lỗi) · `thu-aq01.js` (sinh từ `gen-aq01.js`) · `thu-ag02.js` (AG-02/03/AL-02, cả hai app) · `thu-form.js` (AL-01/AG-01) · `cung.js` (bản dịch JS AQ-02/03) · `thu-focus.js` (AR-06) · đầu ra `o-*.txt`, `o-ag02-*.json`.
