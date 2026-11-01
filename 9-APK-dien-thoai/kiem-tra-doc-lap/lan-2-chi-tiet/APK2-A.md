# APK2-A — Kiểm độc lập lần 2: app «SCI Công việc 3004» (Kotlin + đăng nhập một lần + trợ lý Main + chọn dự án)

*01/11/2026 · phạm vi `1cdb82c..44992cd` · chỉ đọc + đo. Bản chiết xuất để chạy: `...\scratchpad\d41\apk2a\9-APK-dien-thoai\`. Bài đo: `...\scratchpad\d41\apk2a-do\` (`duong.js`, `do-vong.js`, `do-5xx.js`).*
*Không sửa kho, không checkout/commit. Chỉ GET + đăng nhập tài khoản thử `test.quantri@scigroup.vn` trên localhost.*

**Không biên dịch được Kotlin ở máy kiểm** (không có kotlinc/Java/Android SDK). Peer khai `gradle release` 0.1.4 qua — không kiểm lại được. Phần Kotlin chỉ đọc mã.

## 1. Lời khai trong tiêu đề commit / đề — đã đo lại

| Lời khai | Kết quả | Đo/Đọc |
|---|---|---|
| `node --check app.js` qua | ✅ qua | Đo |
| 41/41 bước giao diện | ✅ **41/41 ĐẠT**, 0 lỗi JS (chạy 2 lần) | Đo |
| `index.html` ghép từ demo giống hệt | ✅ chạy lại `ghep-giao-dien.js` trên bản chiết xuất → giống từng chữ (chỉ khác CR/LF) | Đo |
| versionCode/Name | ✅ `5` / `3004-0.1.4` (0.1.0 = 1 → 0.1.4 = 5, liền mạch) | Đọc |
| Khoá ký ngoài kho | ✅ đọc từ `C:/dev/keys/sci-keystore.properties`; `git ls-tree 44992cd` không có `.jks/.keystore/.properties/.apk/.env`; `git grep` không có mật khẩu khoá (chỉ tên biến) | Đo |
| README ghi giới hạn `uiActions` (AP-07) | ✅ có, mục «Giới hạn của bản này» | Đọc |
| README mô tả đúng bản 0.1.4 | ❌ xem AQ-10 | Đọc |

## 2. Đối chiếu AP-01…AP-07 của lần 1

| Mã | Kết luận | Chi tiết |
|---|---|---|
| AP-01 chọn dự án + `?project=` | ✅ đúng | `app.js` `pq()` gắn cho `/api/ai/chat`, `/sessions`, `/messages` (harness log: `?project=hv`, `?project=np`). `xac-nhan` không cần: Main lấy dự án từ việc chờ đã lưu (`xac-nhan/route.ts:53-58`). `/api/projects` không gửi `?project=` đúng (Main bỏ qua). Đo Main thật: `GET /api/projects` 200, 16 dự án; `?project=`, `?all=1` không đổi gì. Đúng demo (4 màn). Dự án nhớ không còn trong danh sách → bỏ, chỉ 1 dự án → chọn luôn, ≥20 có ô tìm — đúng |
| AP-02 giữ thẻ khi mã 0 | 🟡 **thiếu một nửa** | Mã 0 giữ thẻ ✅. Mã 5xx thì **mất thẻ** — xem AQ-01 |
| AP-03 (mật khẩu 3004 sang Main) | 🟡 nặng thêm | Nay chạy **tự động**, so cùng `host` — xem AQ-03 |
| AP-04 siết đường | ✅ đúng (kèm vài lỏng, AQ-05/06) | Chạy lại biểu thức bằng JS (bản dịch): `..`, `%2e%2e`/`%2E%2E` trong đường, `?x=../..`, `/`, `\`, `#`, `;`, `//evil` → đều **false**; DELETE/PATCH/chữ thường `get` → false |
| AP-05 chỉ gợi ý :3010 khi nội bộ | ✅ đúng, lỏng ở biên (AQ-07) | |
| AP-06 cookie chữ thường | ⚪ không đổi | Cookie Main vẫn lưu chữ thường trong SharedPreferences riêng; `allowBackup="false"` (Manifest dòng 14). Mật khẩu Main mã hoá Keystore. Không có `Log.*`/`console.log` nào trong `.kt`/`app.js` |
| AP-07 README ghi uiActions | ✅ | |

## 3. Phát hiện

| Mã | Mức | Điều đo được | Đo/Đọc |
|---|---|---|---|
| **AQ-01** | 🟡 | **AP-02 mới sửa mã 0.** `✅ Làm` gặp **502 / 504 / 524 / 500** thì thẻ chờ duyệt **biến mất** (1 → 0) và chữ báo chỉ là «Main trả lỗi 502 [/api/ai/chat/xac-nhan]», **không** có câu «Chưa rõ lệnh đã chạy…». `do-5xx.js`: mã 502/504/524/500 → sau=0; mã 409 → sau=0 (đúng, 409 là «đã xong trước»); mã 0 → sau=1. Gốc `app.js:2155`: `CHAT.cho = r.ma===200 && … : CHAT.cho.filter(v=>v.id!==id)` — chỉ nhánh `r.ma===0` (dòng ~2147) được giữ. Anh dùng tunnel công khai: Cloudflare cắt ở ~100 giây → 524, mà `xac-nhan` chạy công cụ ghi — lệnh có thể đã chạy, người dùng không thấy thẻ để kiểm, hỏi lại trợ lý → làm đôi. Sửa một dòng: coi `ma>=500` (và 0) như «chưa rõ» → giữ thẻ + câu cảnh báo | Đo |
| **AQ-02** | 🟡 | **Màn «không phải máy Main» (saiMay) tự chặn đường thoát.** Nút «Đăng nhập lại trợ lý Main» (`app.js:2028`) → `NA.mainThoat()` → `Cfg.quenMain` (`Cfg.kt:70`) chỉ xoá cookie + mật khẩu, **giữ `main_server`** → `tuDnMain` → `TroLyMain.diaChiNen` (`TroLyMain.kt:42-45`) trả lại đúng địa chỉ sai đã lưu → đăng nhập được → `/api/projects` 404 → lại saiMay. `do-vong.js` CA3: bấm 3 lần = 4 lần tự đăng nhập + 4 lần GET `/api/projects`, **ô nhập tay không bao giờ hiện**; câu trên màn hứa «thoát rồi nhập đúng địa chỉ» nhưng không có ô nào. Đăng xuất app cũng không gỡ (`dangXuat` → `quenMain`). Khi nào tới được: `cungDiaChi` (`TroLyMain.kt:56-59`) chỉ chặn **đúng chuỗi** host+cổng của 3004; cách viết khác của cùng máy 3004 (`localhost` ↔ `127.0.0.1`, tên máy ↔ IP, tên miền ↔ IP) lọt qua; 3004 nhận `password` (`6-Agent-cong-viec/.../api/auth/login/route.ts:15-16`) nên «đăng nhập được» → đúng lỗi anh gặp ở 0.1.0 vẫn còn ở dạng khác. Sửa: khi saiMay (hoặc `mainThoat`) xoá cả `main_server`, để ô nhập tay hiện với địa chỉ trống | Đọc (Kotlin) + Đo (JS, cầu nối giả) |
| **AQ-03** | 🟡 | **Mật khẩu 3004 gửi sang Main chỉ so `host`, bỏ qua giao thức và cổng** (`TroLyMain.kt:74`: `URL(goc).host == URL(Cfg.server(c)).host`). Hệ quả: 3004 chạy `https://…` mà Main gõ `http://cùng-tên-miền:3010` → mật khẩu đi **không mã hoá qua Internet**, và từ 0.1.1 việc này là **tự động** (`tuDnMain` ngay sau đăng nhập 3004, không còn người bấm). Ô Main không có cảnh báo «http ra Internet» như ô 3004 (`app.js:78` chỉ gắn ô `dn-s`). Cùng host khác cổng thì gửi cho dịch vụ bất kỳ ở cổng đó (đo: `:3003/:3012/:3015` trên localhost đều nhận đăng nhập Main-style và trả 200 — đều là agent SCI, nên là thiết kế, không phải lỗ; nhưng không có gì phân biệt). `instanceFollowRedirects=false` ✅ nên không bị chuyển hướng sang host khác. `host` giả bằng `user@`/`#`/`\` đã thử qua `new URL` → host thật là phần sau `@` → không so khớp → an toàn. Sửa: chỉ tự gửi khi `cùng host` **và** (`https` hoặc cả hai đều mạng nội bộ) | Đọc + Đo Main |
| **AQ-04** | 🟡 | **Đăng nhập 3004 bằng email KHÁC mà không «Đăng xuất» thì phiên Main của người cũ còn nguyên.** `Cau.dangNhap` (`MainActivity.kt:180`) và `Api.dangNhap` không đụng `main_*`. Nếu tự đăng nhập Main của người mới hỏng (không có tài khoản Main / mật khẩu khác) thì `mainTrangThai` (`MainActivity.kt:206-213`) vẫn trả `dangNhap=true` chỉ vì còn cookie → Trợ lý chạy bằng quyền + lịch sử chat của **người cũ**; `main_mk` (mật khẩu người cũ, mã hoá) còn để `TroLyMain.goi` tự đăng nhập lại. Đường tới được: mật khẩu bị 3004 từ chối → màn đăng nhập hiện → người khác nhập tài khoản mình trên cùng điện thoại. Hiếm nhưng là rò quyền. Sửa: trong `Cau.dangNhap` nếu email khác `Cfg.emailMain` thì gọi `Cfg.quenMain`; hoặc `mainTrangThai.dangNhap` thêm điều kiện `emailMain == Cfg.email` | Đọc (không có đường chạy thật ở máy kiểm) |
| AQ-05 | ⚪ | `duongDuocGoi("POST","/api/projects")` = **true** (đo `duong.js`). Main: `POST /api/projects` là TẠO dự án (cửa `caidat`, `projects/route.ts:56`). Lần 1 AP-04 đã đề nghị «chỉ GET/POST» nhưng mẫu không gắn phương thức với đường: `projects` nên chỉ GET. Chỉ vào được qua JS của app (WebView chỉ nạp `file:///android_asset`); XSS đã thử ở lần 1 → không có | Đo |
| AQ-06 | ⚪ | Phần query `[^/#\\]*` cho **xuống dòng**: `/api/ai/chat/sessions?x=a\r\nHost: evil` = true; `?@evil.com` = true (vô hại — chỉ là query). Nên thêm `\s` vào lớp loại trừ. App chỉ sinh query bằng `encodeURIComponent` nên không khai thác được | Đo |
| AQ-07 | ⚪ | `diaChiGoiY` (`TroLyMain.kt:32`) dùng `containsMatchIn` với `^(10\.|192\.168\.…)` **không đòi hết là địa chỉ IP**: `http://10.evil.com`, `192.168.evil.com`, `127.evil.com`, `172.16.evil.com`, `10.0.0.5@evil.com` đều bị coi là nội bộ và được gợi ý `:3010` (đo `duong.js`). Chỉ là gợi ý (host đó người dùng đã gõ cho 3004), nhưng nên neo `\d+\.\d+\.\d+$`. Biên đúng: 172.15.x → rỗng ✅, 172.16/172.31 → gợi ý ✅, 172.32.x → rỗng ✅, cổng 80/443/không cổng → gợi ý ✅, `https://` → rỗng ✅, IPv6 `[::1]` → rỗng (an toàn nhưng không gợi ý), `Http://` viết hoa ✅. **Không nhận**: `100.64.x` (Tailscale/CGNAT), `169.254`, tên máy Windows trần `http://may-sci:3004`, IPv6 → người dùng phải gõ tay (chấp nhận được) | Đo |
| AQ-08 | ⚪ | `saiMay` chỉ thấy khi `/api/projects` = 404. Đo trên localhost: `:3004` 401 (không cookie; có cookie anh báo 404), `:3013` **404**, `:3014` **404**, nhưng `:3003/:3012/:3015` nhận đăng nhập Main-style, `/api/projects` **200 cùng danh sách** và `/api/ai/chat/sessions` 200 → nếu gõ nhầm cổng 3003/3012/3015 vào ô Main, app **không phát hiện** và mở trợ lý của agent Tiến độ/Hợp đồng/Nghiệm thu gọi là «Trợ lý Main». (3013/3014 thì đăng nhập đã hỏng trước khi tới saiMay: 307 / 401.) `cungDiaChi` cũng bỏ qua giao thức (`http://x:443` = `https://x`) | Đo |
| AQ-09 | ⚪ | Mở Trợ lý đúng lúc đăng nhập nền (sau đăng nhập 3004, `tuDnMain(true)`) còn chạy: `moChat` → `tuDnMain()` thoát sớm vì `CHAT.tuDn`, **không gọi `veChat()`** → khung trống đến khi xong (đo `do-vong.js` CA2: nội dung `""`, ~0–12 giây). Sau đó tự điền đúng (CA2b: «Hỏi về dự án Điện gió Hướng Việt»). Sửa: `if (CHAT.tuDn) { veChat(); return; }` | Đo |
| AQ-10 | ⚪ | README-3004 lệch: dòng 10 vẫn «3004-0.1.0 (bản 1)» (thực 0.1.4/5); dòng 38 «25/25», dòng 55 «39/39… Kotlin chưa biên dịch lại» (đề/commit nói 41/41 và đã `gradle release`); không có chữ nào về «đăng nhập MỘT lần», chặn gõ nhầm địa chỉ 3004, `cungDiaChi` | Đọc |
| AQ-11 | ⚪ | `TroLyMain.goi` (`TroLyMain.kt:108`) không khoá đồng thời như `Api.lamLaiPhien` (`@Synchronized`): hai cuộc gọi cùng gặp cookie hết hạn → hai lần đăng nhập, một cái hỏng có thể `xoaPhienMain` đè cookie mới. Hiếm (cần hai lệnh trong vài trăm ms) | Đọc |
| AQ-12 | ⚪ | Commit nói «sau 0.1.4: ghép người vào phòng» nhưng `versionName/Code` vẫn 0.1.4/5 → APK dựng lại từ commit này trùng số với bản đã cài thử; khi anh báo lỗi khó biết bản nào | Đọc |
| AQ-13 | ⚪ | `loiMain` (`app.js:1891` phía trên) cho ra chữ kỹ thuật tới tay người dùng: «Main trả lỗi 502 [/api/ai/chat/xac-nhan]». Tiếng Việt đủ, nhưng đường API không có nghĩa với người đọc | Đo |
| AQ-14 | ⚪ | Gợi ý thiết kế (không phải lỗi): 3004 khi đăng nhập đã **xin Main phiên chung và đặt cookie `sci_session`** (`login/route.ts:22-26`); `Api.gomCookie` giữ mọi tên cookie → `Cfg.cookie` có sẵn token Main. App có thể gửi đúng cookie `sci_session` cho Main mà **không cần gửi mật khẩu lần thứ hai** — gỡ cả AQ-03. Cần đo xem Main nhận token đó (cùng `AUTH_SECRET` chung) | Đọc |

## 4. Điểm tự nghi 10, 11, 12 trong đề mục 5

| # | Kết luận |
|---|---|
| **10** vòng tự đăng nhập | **Không có vòng lặp.** `do-vong.js`: CA1 tự đăng nhập hỏng liên tục, mở/đóng Trợ lý 10 lần → `mainTuDangNhap` gọi **đúng 1 lần** (`daThuTuDn` chặn). `daThuTuDn` đặt lại ở: đăng nhập 3004 (`app.js:96`), bấm «Đăng nhập lại trợ lý Main» (dòng 2201), đăng xuất/đổi tài khoản (`xoaBoNho` dòng 54). Trần mỗi chu kỳ mở Trợ lý: **1** lần từ JS + **1** lần từ Kotlin `TroLyMain.goi` khi cookie hết hạn (sau khi hỏng, cookie bị xoá nên các lệnh sau không thử nữa) = **tối đa 2 lượt `/api/auth/login` mỗi chu kỳ**. CA4 (cookie hết hạn + tự đăng nhập hỏng): lần mở đầu hiện ô nhập tay, mở lại → 1 lần thử rồi dừng. Main không có khoá tài khoản sau nhiều lần sai (`verifyUser` `users.ts:274` không đếm) → không có rủi ro khoá nhầm. Riêng nút «Đăng nhập lại» ở saiMay là «vòng» do AQ-02 (người bấm, không tự lặp). Mật khẩu: `Nhat.ghi` chỉ ghi câu cố định hoặc `$loi` (câu lỗi từ Main/mã); không có mật khẩu trong nhật ký, không có `Log.*`; mật khẩu nhớ mã hoá AES-GCM Keystore (`Cfg.kt:39-52`); cookie chữ thường (AP-06) |
| **11** Main có trả 404 `/api/projects`? | **Không** — Main thật (`localhost:3010`, tài khoản thử): có cookie → 200 (mọi `?project=`/`?all=1` như nhau); không cookie hoặc cookie hỏng `sci_session=hong` → **307 → `/login`** (cả hai) — đúng thứ `goiMot` nhận ra. Route `projects/route.ts` GET không có nhánh 404; middleware chỉ chuyển `/login` hoặc 403 nhà thầu. 404 chỉ đến từ máy KHÁC (đo `:3013`, `:3014`; `:3004` theo lời anh). → `saiMay` đúng nghĩa, không báo nhầm Main thật. Giới hạn: xem AQ-08 |
| **12** Kotlin `cungDiaChi` + cổng 80/443 | Logic `x.port<0 → defaultPort` đúng cho `http`=80, `https`=443; so host không phân biệt hoa thường; URL hỏng/thiếu giao thức → `false` (an toàn: coi là khác). Điểm yếu: bỏ qua giao thức (`http://x:443` = `https://x`) và chỉ so chuỗi (AQ-02/08). `private → công khai` không gây lỗi: `MainActivity` đã gọi `TroLyMain.cungDiaChi(...)` và `diaChiNen(...)`, cả hai khai báo `fun` công khai trong `object`. Đọc cú pháp: `try … catch (_: Exception) { false }` dạng biểu thức, `Regex(..., RegexOption.IGNORE_CASE).matches(...)`, `return "…" + x.let { … " — thử $it" }` đều hợp lệ; `when` không dùng; luồng nền `mainTuDangNhap`/`mainDangNhap` không bọc try nhưng mọi ngoại lệ mạng là `IOException` đã bắt trong `dangNhap` (không thấy nhánh ném `RuntimeException`) |

## 5. Các soi riêng trong lệnh

| # | Soi | Kết quả |
|---|---|---|
| 1 | Mật khẩu 3004 sang Main | AQ-03. Nhật ký/Logcat/chữ thường: sạch (xem mục 4 điểm 10) |
| 2 | Vòng tự đăng nhập | Không vòng; trần 2 lượt/chu kỳ; AQ-02 là lối kẹt do người bấm |
| 3 | `duongDuocGoi` | Bảng 37 ca ở `apk2a-do/duong.js` (bản dịch JS, `matches()` = khớp toàn chuỗi). Hợp lệ → true; `..`, `%2e%2e` trong đường, `?x=../..`, `/` `\` `#` `;`, `//host`, hoa/thường sai, DELETE/PATCH → false. Lọt: `POST /api/projects` (AQ-05), xuống dòng/`@` trong query (AQ-06). `%2e%2e%2f` trong **query** = true nhưng vô hại (không đổi đường) |
| 4 | `diaChiGoiY` | AQ-07 (35 địa chỉ đã thử) |
| 5 | `taiDa` 404 → saiMay, đo Main thật | Mục 4 điểm 11 + AQ-08 |
| 6 | Kotlin | Không biên dịch được; đọc cú pháp/kiểu/import: không thấy lỗi. Thông báo `saiMay`/`cungDiaChi` đều tiếng Việt |
| 7 | `build.gradle.kts` + khoá ký | Mục 1: sạch |
| 8 | README AP-07 | Có; nhưng README lệch phiên bản (AQ-10) |

## 6. Đã thử phá nhưng không thủng

| Thử | Kết quả |
|---|---|
| `host` giả để lấy mật khẩu: `http://10.0.0.5@evil.com`, `…#@…`, `…\@…` | `java.net.URL.host`/WHATWG đều lấy phần sau `@` → khác host 3004 → không gửi |
| Chuyển hướng 3xx khi đăng nhập Main | `instanceFollowRedirects=false` cả đăng nhập lẫn gọi |
| Mở lại Trợ lý 10 lần khi tự đăng nhập hỏng | 1 lượt đăng nhập (CA1) |
| `%2e%2e`, `..`, `\`, `//host` trong đường | bị chặn |
| Gõ đúng địa chỉ 3004 (cùng host+cổng) vào ô Main | `dangNhap` trả câu «Đây là địa chỉ SCI Công việc 3004…» kèm gợi ý; `mainTrangThai.dangNhap=false` nếu cookie Main trỏ 3004 (đọc mã) |
| Dự án nhớ lần trước không còn quyền | `taiDa` bỏ về «Chọn dự án» (harness + đọc) |
| Đổi dự án khi đang chờ trả lời | `CHAT.tok++` → trả lời cũ bị bỏ, Main vẫn lưu vào phiên cũ (đọc + harness) |
| Chèn `<script>` trong trả lời | vẫn thoát HTML (bước harness ĐẠT) |

## 7. Chưa kiểm được

- Biên dịch Kotlin, dựng/ký APK, chạy trên Xiaomi; hành vi mạng thật từ điện thoại; thời gian chờ 300 giây qua tunnel (AQ-01 suy từ mã + mã 524 giả lập).
- `GET /api/projects` ở `:3004` **có cookie** trả 404 (cần đăng nhập 3004 thật — không dùng tài khoản người thật). Chỉ có lời anh + đọc mã (3004 không có route `projects`).
- Người dùng thường / Người xem ở Main (chỉ có tài khoản quản trị thử).
- Gửi câu AI thật và bấm ✅ Làm thật (cố ý không làm).
- Không chạy phần E–H (tab Dự án, bảng tiến độ, bảng «Giao cho»): ngoài phạm vi lệnh này.

## 8. Kho và `git status`

Chỉ đọc kho `tl-branch` (`git diff`, `git archive`, `git ls-tree`, `git grep`, `git show --stat`). `git status --short` kho đó: sạch (không in dòng nào). Không đụng cây làm việc của phiên khác. Không có junction hay `tsc` (kho Android không dùng).
