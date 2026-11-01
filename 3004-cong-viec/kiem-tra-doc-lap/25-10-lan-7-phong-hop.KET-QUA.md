# Kết quả lần 7 — Phòng họp (kiểm độc lập, 26/10/2026)

**Kết luận: ĐẠT CÓ ĐIỀU KIỆN · 🔴 2 · 🟡 9 · ⚪ 14** (đếm gộp hai trợ lý, đã bỏ trùng)

Người kiểm: phiên «0 Kiểm tra độc lập». Phần mã + máy: đọc cả `thuan.ts`, `dich-vu.ts`, 4 route, `db/89`, `PhongHop.tsx`, `DongHop.tsx`, CSS, bài kiểm, 10 commit chuông nhúng; đột biến 13 dạng trong bộ nhớ; `tsc` 6 kho; vitest. Phần trình duyệt: **chỉ làm được một phần** — khung trình duyệt không có phiên đăng nhập 3004 (đi vào `/login`), 3004 không có tài khoản thử và quy tắc của chủ dự án là không tự ký cookie, nên **không chạy `ky-cv2.mjs`** và không đăng nhập. Không ghi dữ liệu thật (không đặt/sửa/huỷ cuộc họp, không «Gửi thông báo»), không mở `pgdata`, không `next build`, không sửa kho nào.

## Hai điểm 🔴 (sửa trước khi đóng gói gửi anh Thịnh)

| # | Mức | Chỗ | Thấy gì | Đề xuất |
|---|---|---|---|---|
| **X1** | 🔴 | `src/lib/phong-hop/dich-vu.ts:182` · `DongHop.tsx:109` · `PhongHop.tsx:270` | Ô «Họp trực tuyến» nhận chữ `javascript:…` và vẽ thành link `<a href>` bấm được cho **mọi người xem cuộc họp**. Máy chủ chỉ cắt độ dài 500 ký tự (`chu(b.duong_dan, 500)`), không kiểm kiểu đường dẫn. Bài thử tạm lưu `javascript:alert(1)` nguyên văn; React 18.3.1 vẽ ra link nguyên văn; dự án không có CSP. Tôi tự đọc lại 3 dòng trên xác nhận | Chỉ nhận `http://` hoặc `https://` ở **cả** máy chủ lẫn giao diện (và thông báo lỗi tiếng Việt) |
| **B1** | 🔴 (mô phỏng, chưa thấy thật) | `DongHop.tsx:61` (`rong=300`) ↔ `ChuongCongViec.tsx:105` ở cả 5 bộ | Khi có cuộc họp, khung chuông nhúng nở thêm tới 300 px. Ép khung từ 40 lên 340 px đúng công thức mã: Hợp đồng, Main, Nghiệm thu ở 1366 px bị đẩy `scrollWidth` 1599 so với `clientWidth` 1351 (nút người dùng văng ra ngoài màn); Tiến độ ở 1000 px tràn tới 1300; Pháp lý ở 1366 px không tràn nhưng khung trong suốt (z 50, x 682–1022) **đè** nút «💡 Giải thích» (831–928) và «? Hướng dẫn» (934–1035) | Khung nở dạng `absolute` (không đẩy nút), hoặc kẹp `rong` theo chỗ trống thật của thanh trên. Xác nhận bằng cuộc họp «test» thật khi phiên 3004 có mặt |

Vì sao B1 xếp 🔴 dù là mô phỏng: nó đánh vào cả 5 bộ đang chạy trên mạng và chỉ cần một cuộc họp sắp tới là xảy ra; nhưng tôi **chưa thấy dòng chữ thật** vì không có phiên 3004, nên mức này có thể hạ nếu phiên viết code thấy khung thật kẹp đúng.

## Cần Mr. Đại quyết (3 câu, đủ 5 phần ở mục 8 của `MA-X` bên dưới)

1. **Ghi chú, link họp, khách ngoài của cuộc họp ai xem được** (`GET /api/phong-hop` trả cho mọi người đăng nhập, kể cả Người xem, cả email người dự). Gợi ý: giữ lịch mở như chốt, chỉ trả phần phụ cho người đặt, người được mời, quản trị. *Quan trọng hơn vì bản này sắp lên bộ chạy trên mạng.*
2. Sửa giờ / đổi phòng / huỷ có cộng vào con số chuông không (trái chữ C5 nếu hiểu rộng). Gợi ý: giữ nguyên, ghi rõ trong hướng dẫn.
3. Người xem có được đặt phòng không. Gợi ý: cho đặt (đúng chữ «ai cũng»), ghi vào hướng dẫn.

## Chốt C1–C16

| Nhóm | Kết |
|---|---|
| ✔ bằng mã và bằng máy | C1 · C2 · C3 · C6 · C7 · C9 · C10 · C11 · C14 · C15 (ảnh: nền ngoài trắng `rgb(255,255,255)`, sảnh + trước cửa WC gạch trắng, hàng dưới WC có 3 bồn rửa, ảnh 1295×1215 đúng) |
| ✔ bằng mã/tính theo công thức CSS thật, **chưa thấy trên màn thật** | C4 · C8 · C12 · C13 · C16. C12: tỉ lệ ảnh luôn 1,0658 (không kéo dãn), dải giữa đúng 345 px ở mọi cỡ, khung phải dương: 1366×768 → 462 · 1280×720 → 423 · 1920×1080 → 711 · 1024×1366 → 308; 880 px chuyển 1 cột, không tràn ngang |
| C5 | Dòng chữ bên phải chuông đúng; sửa/huỷ vẫn cộng số chuông (câu hỏi 2) |
| Chưa đo được | Màu ô thật, hover/bấm ô, đồ hoạ phòng đang họp, vòng Chủ tịch/TGĐ, ghế chủ toạ trên màn, dòng chữ đỏ–trắng xen kẽ thật, N6 (tạo lại `ResizeObserver` / vòng vẽ), luật 28/31 và ô chọn ngày trên màn thật — cần phiên 3004 |

## Điểm tự nghi N1–N12

| # | Kết |
|---|---|
| N1 | ✔ Sửa sang phòng khác khoá đúng phòng + ngày đích (`dich-vu.ts:239`); bài tạm sửa sang phòng bận → 409. Đua thật không thử được, chỉ đọc mã |
| N2 | ✔ Giao ban bị chặn 409 kèm tên «Phạm Thu Hà», cấu hình không bị lưu |
| N3 | ✔ Chỉ `bayGioVN` dùng `Date.now`, cộng +7; bỏ +7 thì 7 bài đỏ |
| N4 | ✔ Chỉ sửa dòng của chính mình |
| N5 | Hiện **cho** Người xem đặt/sửa/huỷ (không kiểm loại) — câu hỏi 3 |
| N6 | Chưa đo (cần phiên 3004) |
| N7 | Xem B1 |
| N8 | ✔ theo công thức (bảng ở mục C12) |
| N9 | ✔ đúng như ghi ở «Hay vướng» |
| N10 | Xác nhận lỗi thời: commit `3b92154` (19/10) thêm agent Nghiệm thu vào danh sách hỏi trùng mà 2 bài `hoi-trung-hoi-cv` vẫn kỳ vọng 4 agent; chạy ở `2127247` (ngay trước `a6ed6b5`) bằng `git archive` cho cùng 2 bài đỏ → không do Phòng họp |
| N11 | ✔ trừ lỗi Postgres tiếng Anh (X5) và 3 chỗ khoảng giờ thiếu số giờ (X7) |
| N12 | `db/89` tự chạy mỗi lần mở CSDL (`db.ts:93-118`) và chạy lại được nhiều lần; `laDonViNgoaiVP` trên `4-agent-main/data/to-chuc.json` (39 đơn vị) loại đúng 21 (7 nhà máy, 14 BĐH), không loại nhầm văn phòng, không để lọt nhà máy; 4 giám đốc nhà máy bị bỏ khỏi danh sách mời, người kiêm nhiệm có đơn vị văn phòng được giữ; mã phòng họp không có đường dẫn `D:\` hay cổng cứng |

## 🟡 khác (xem chi tiết bên dưới)
X2 sửa/huỷ cộng số chuông · X3 Người xem đặt được · X4 API lộ ghi chú/link/email · X5 ngày không thật `2026-02-31` ra lỗi 500 tiếng Anh `date/time field value out of range` · X6 Thứ Hai 15:30–17:00 «Gửi thông báo» báo «Giờ họp đã qua» trong khi màn vẫn hiện buổi kế tiếp là hôm nay · X7 3 chỗ khoảng giờ không kèm số giờ (`dich-vu.ts:260`, `PhongHop.tsx:613,759`) · X8 2 bài `hoi-trung-hoi-cv` lỗi thời nên sửa 2 dòng · **B2 (X9)** giao diện sáng của Tiến độ: chữ «trắng» `#F5F5F4` trên nền ≈ `#FAF9F7` đạt 1,04:1 (không đọc được), đỏ `#F87171` đạt 2,6:1; giao diện tối ổn (15,95:1 và 6,29:1); hiện 5 bộ đang mặc định tối nên chưa thấy.

## Máy

| Phép đo | Kết |
|---|---|
| `phong-hop-25-10.test.ts` | 13/13 xanh (8,15 s) |
| Đột biến 13 dạng | Bắt 12, sống 1 (biên đúng phút kết thúc cuộc họp, `thuan.ts:155`) |
| `tsc` CV | exit 0; `tsc` 5 bộ chuông nhúng: exit 0 |
| vitest toàn bộ | 5 đỏ, 22 tệp lỗi `Hook timed out` do nghẽn tải; chạy riêng 4 tệp liên quan: 45 bài xanh, chỉ `hoi-trung-hoi-cv` đỏ 2 bài (cũ) |
| 10 commit chuông nhúng | Mỗi bộ đúng 2 commit, 1 tệp, đúng phạm vi; 4 bộ giống hệt từng dòng (Pháp lý chỉ khác cách viết style); không kéo lib máy chủ/`node:fs` vào client; không `fetch` mới sang agent khác. Phía nhận ở 5 bộ có kiểm `e.origin` (dòng 41; Pháp lý 39). Phía 3004 nghe `sci-chuong-dong` không kiểm origin và gửi lên cha bằng `"*"` (X11, rủi ro nhỏ) |
| `git status` CV (trừ `data/`) | 13 → 13 |

## Phụ thuộc máy này khi đem sang bộ chạy trên mạng (N12)
`db/89` tự áp dụng khi khởi động (idempotent); ảnh `?v=3` là đường tương đối trong `public/`; không có đường dẫn `D:\` hay cổng cứng trong mã phòng họp. Hai việc cần nhắc anh Thịnh: sửa X1 trước khi gửi; bộ trên mạng chạy `laDonViNgoaiVP` theo **tên** đơn vị nên nếu bên đó đổi tên (NM/Nhà máy/BĐH/Ban điều hành) thì lọc sẽ lệch.

---

# PHỤ LỤC 1 — Đọc mã + chạy máy (trợ lý X)

# MA-X — Kiểm độc lập lần 7 «Phòng họp» · trợ lý X (đọc mã + chạy máy, không trình duyệt) · 26/10/2026

CV = `D:\3 SETUP\1 AI\SCI Tiến độ\SCI-AI-AGENT\6-Agent-cong-viec\CodeSCICongViec`. Đường dẫn dưới đây tính từ CV.
Nhắc: đã đọc hết `thuan.ts` (297 dòng), `dich-vu.ts` (375), 4 route, `db/89-phong-hop.sql`, `PhongHop.tsx` (993), `DongHop.tsx` (124), `phong-hop.css`, bài kiểm 13 bài, 10 commit chuông nhúng.

## 0. Tóm tắt — 🔴 1 · 🟡 7 · ⚪ 12

| # | Mức | Một dòng | Chỗ |
|---|---|---|---|
| X1 | 🔴 | Ô «Họp trực tuyến» nhận chữ `javascript:...` nguyên văn rồi vẽ thành link bấm được cho MỌI người xem cuộc họp (tấn công chèn mã khi bấm) | `src/lib/phong-hop/dich-vu.ts:182` · `DongHop.tsx:109` · `PhongHop.tsx:270` |
| X2 | 🟡 | Sửa giờ / đổi phòng / huỷ / kết thúc sớm vẫn tạo tin chuông loại `phong_hop` → kênh «khác» → CỘNG vào con số chuông (trái chữ C5 nếu hiểu rộng) — **cần anh quyết** | `dich-vu.ts:228` · `mac-dinh.ts:448` |
| X3 | 🟡 | Không đâu kiểm quyền: Người xem đặt / sửa / huỷ cuộc của mình được — **cần anh quyết** (N5) | 4 route · `dich-vu.ts:203` |
| X4 | 🟡 | `GET /api/phong-hop` trả cho mọi người đăng nhập (kể cả Người xem) cả ghi chú, link họp, khách ngoài, danh sách người dự (kèm email) của MỌI cuộc — **cần anh quyết** | `dich-vu.ts:37` COT · `route.ts:25` |
| X5 | 🟡 | Ngày không có thật (`2026-02-31`) → lỗi 500 tiếng Anh `date/time field value out of range` (luật «thông báo lỗi tiếng Việt») | `route.ts:11,20` · `phien.ts:151` |
| X6 | 🟡 | Thứ Hai 15:30–17:00 (giao ban đang diễn ra): «Gửi thông báo» báo «Giờ họp đã qua» trong khi màn vẫn hiện buổi kế tiếp = hôm nay và nút còn bật | `thuan.ts:112-116,149` |
| X7 | 🟡 | Khoảng giờ không kèm số giờ (luật 31): chuông sửa giờ, cảnh báo bận, «buổi đã gửi» | `dich-vu.ts:260` · `PhongHop.tsx:613,759` |
| X8 | 🟡 | 2 bài `hoi-trung-hoi-cv` đỏ — lỗi thời từ 19/10 (N10 xác nhận), nên sửa 2 dòng để bộ kiểm xanh | `tests/unit/hoi-trung-hoi-cv.test.ts:32,41` |
| X9 | 🟡 | Chuông nhúng ở bộ Tiến độ có giao diện sáng: chữ «trắng» `#F5F5F4` của cuộc thứ hai có thể không đọc được trên thanh trên sáng — **đọc mã nghi, cần trợ lý trình duyệt xác nhận** | `phong-hop.css:177` ↔ `5-Agent-tien-do/src/app/globals.css:381-384` |
| X10–X21 | ⚪ | Xem mục 4 (chi tiết) | |

Kết luận phần X: **ĐẠT CÓ ĐIỀU KIỆN** — luật nghiệp vụ (C1 C3 C7 C9 C10 C11 C14, N1 N2 N3 N4 N9 N12) đúng bằng mã VÀ bằng máy; còn X1 là lỗi an toàn nên sửa trước khi đóng gói gửi anh Thịnh.

## 1. C1–C16 đối chiếu với MÃ

| Chốt | Kết | Bằng chứng |
|---|---|---|
| C1 ai cũng đặt, không giành phòng đã có người (kể cả lãnh đạo) | ✔ | `dich-vu.ts:203-209` kiểm `cuocTrung` rồi mới INSERT, 409 kèm tên người đặt (`thuan.ts:205`). Quản trị cũng bị chặn: bài `trùng phòng…` (test dòng 162-169) xanh; đột biến `bo_kiem_trung` → 2 bài đỏ. «Ai cũng» gồm cả Người xem — xem X3 |
| C2 3 phòng trên ảnh 1295×1215 | ✔ (mã) | `thuan.ts:22-23,31-56`; `file public/phong-hop/mat-bang.webp` = WebP **1295x1215**, đã vào git (`git ls-files`). Số ghế khớp mảng: P.01 8=1+3+3+1 · P.03 10=1+4+4+1 · P.09 24=3+7+7+3+4. Khớp mặt phẳng thật: để trợ lý trình duyệt |
| C3 08:00–12:00 · 13:30–17:00, ô 30 phút, 15 ô, họp gọn một buổi | ✔ | `thuan.ts:62-80,141-147,191-199`. Đo: `CAC_O.length=15`, `[08:00,11:30,13:30,16:30]` (bài 1). Chặn xuyên trưa: bài có `không họp xuyên giờ nghỉ trưa`. Đột biến `gio_o` (13:30→13:00) → bài đỏ; `xuyen_trua` → bài đỏ |
| C4 màu ô | ✔ (mã) / hình: để trợ lý trình duyệt | `thuan.ts:161-172` + CSS `--ph-trong/dat/dang/qua/chon` (`phong-hop.css:7`): xanh `#22C55E` · vàng `#EAB308` · đỏ `#DC2626` · xám `#D6D3D1` · xanh dương `#2563EB` |
| C5 báo họp không cộng con số chuông; chữ bên phải chuông | ✔ cho dòng chữ · ✖/chưa rõ cho sửa/huỷ | `KhungPhong.tsx:320` đặt `<DongHop>` SAU `</Chuong>`; `datHop` không tạo tin chuông. Nhưng `dich-vu.ts:228` (`baoNguoiDu`) gọi `taoThongBao(loai "phong_hop")` khi sửa giờ/đổi phòng/huỷ/kết thúc sớm/bỏ khỏi cuộc; `kenhChoLoai` cho loại lạ rơi về `khac` = `trong_app:true` (`mac-dinh.ts:448`) → +1 vào số chuông (`demChuaDoc` đếm mọi dòng chưa đọc). Bài kiểm tự khẳng định số này (`test:176-177` =1). → X2 |
| C5 từ 2 cuộc: đỏ – trắng xen kẽ | ✔ (mã) | `DongHop.tsx:81-86`: `i % 2 ? "trang" : "do"`; CSS `:176-177`. Hình: trợ lý trình duyệt. Nghi màu trắng trên nền sáng → X9 |
| C6 nhấp nháy khi chưa xem và 15 phút trước giờ, họp xong thì tắt | ✔ | `thuan.ts:213-219` (`PHUT_NHAC_TRUOC=15`, chỉ cùng ngày, `0 < còn ≤ 15`), `conHien` (`:227`) ẩn khi hết `den`. Bài `dòng chữ đỏ…` xanh; đột biến `nhac_5_phut` → đỏ. Sau giờ bắt đầu thôi nhấp nháy (đang họp = chữ đứng yên) đúng comment |
| C7 giao ban Thứ Hai 15:00–17:00, P.09, BLĐ + Trưởng phòng; gửi = đặt luôn; gửi lại = cập nhật; chỉ BLĐ/trưởng phòng/quản trị | ✔ | Mặc định: `db/89:34-39`, `dich-vu.ts:321`. Gửi: `guiGiaoBan` `:358-375` (có buổi `loai='giao_ban'` cùng ngày → `suaHop`, không → `datHop`). Quyền: `duocLapGiaoBan` `:325-328` (+ `luuGiaoBan:348` chặn 403). Bài `giao ban (câu chốt A)` xanh: 1 buổi duy nhất sau 2 lần gửi, nhân viên 403. Lỗ nhỏ: X6 |
| C8 đồ hoạ phòng | ✔ (mã) | `trangThaiPhong` `thuan.ts:175-181` (dang/sap/tat); vẽ người `PhongHop.tsx:174-189`; khung đỏ/vàng/phủ xám CSS `.ph-o-phong.tt-*`. Hình: trợ lý trình duyệt |
| C9 tên ngắn 2 chữ cuối; CT vòng đỏ nhấp nháy, TGĐ vòng xanh, không ghi tên | ✔ | `tenNganNguoi` `thuan.ts:252-255`; `vongDau:267`; vẽ `PhongHop.tsx:184` (có vòng thì không in tên); `<title>` rê chuột có đủ tên (`:181`). CSS `.vong-do` nhấp nháy, `.vong-xanh` `#16A34A`. Đột biến `ten_ngan_1_chu` → đỏ. Mã chức danh thật `bld-ct-hdqt`, `bld-tgd` có trong `4-agent-main/data/to-chuc.json` (khớp) |
| C10 ghế chủ toạ cao nhất; không ai cao hơn → người tạo; đồng cấp không phân được → để trống | ✔ | `xepGhe` `thuan.ts:278-293`. Đột biến `dao_cap_bac`, `dong_cap_lay_dau`, `ghe_chu_toa_sai` → cùng 1 bài đỏ (bài người ngồi). Thừa người: `slice(0, ghe.length-1)` (bài `d.length = so_ghe`) |
| C11 danh sách mời bỏ nhà máy + BĐH tổng thầu và người chỉ thuộc đó | ✔ | `dich-vu.ts:77-96,115-124,127-161` + `thuan.ts:296-297`. Đo dữ liệu thật ở mục 3 (N12): 21/21 đơn vị đúng, 4 người bị bỏ, 1 người kiêm nhiệm được giữ. Đột biến `dao_loc_nha_may` → 4 bài đỏ |
| C12 bố cục 3 cột, ảnh không kéo dãn, lịch giữa 345, ảnh +10% | ✔ (tính toán) / hình: trợ lý trình duyệt | `phong-hop.css:7-22`: ảnh `aspect-ratio:1295/1215`, `grid-template-columns: ảnh+24 | minmax(345px,1fr) | 2·gốc−ảnh+24`. Tính tay: 1920×1080 → ảnh 839,9 · phải 711 · giữa 345; 1280×720 → ảnh 487,9 · phải 423; 901×… → phải ≥253 (không bao giờ âm với vw ≥ 900; ≤900 chuyển 1 cột `:193`). N8 qua phần tính |
| C13 lịch giữa không cuộn, ô chỉ ghi nội dung, rê chuột hiện tên + chủ trì + người dự, bấm → chi tiết phải; bỏ nút «Lịch họp các phòng»; 2 nút bằng nhau | ✔ (mã) | Ô: `{c.noi_dung}` (`PhongHop.tsx:876`); rê: `:882-895` (tên, giờ, chủ trì, người dự); bấm: `moCuoc :950`. Hai nút `NUT :962-965`, chung lớp `nut-ph to`, lưới 2 cột bằng nhau (`css:.ph-nut-trai`). Tiêu đề «Lịch họp các phòng» còn là chữ đầu khối, không phải nút. Còn sót: link «Mở Lịch họp các phòng →» trong hộp dòng chữ đỏ (`DongHop.tsx:117`) và mục giải thích chết (X15) |
| C14 bấm ô đỏ → xem chi tiết (không mở Sửa); người đặt có «Kết thúc sớm» | ✔ | `PhongHop.tsx:432-440` (chỉ `trangThai==="sap"` mới `moSua`, còn lại `setXemCuoc`); nút `:560-564` chỉ người đặt/quản trị và khi `denKetThucSom < den`; máy chủ `ketThucSom dich-vu.ts:268-279` kiểm 403/409. Bài `cuộc đang họp…` xanh |
| C15 ảnh mặt bằng (nền trắng, gạch WC, bồn rửa) | chưa đo được | hình — trợ lý trình duyệt. Mã chỉ xác nhận tệp 1295×1215 và `?v=3` (`PhongHop.tsx:160`) |
| C16 đồng hồ to góc trên phải | ✔ (mã) | `PhongHop.tsx:164`: tâm (1152,132) bán kính 62 → mép phải 1214 < 1295, mép trên 70 > 0, nằm trong ảnh. Hình: trợ lý trình duyệt |

## 2. N1–N5, N9, N11, N12 (phần mã + máy)

| N | Kết | Đo / đọc |
|---|---|---|
| N1 khoá giao dịch khi SỬA sang phòng khác | ✔ | `suaHop :239` gọi `khoaPhong(q, v.phong, v.ngay)` với `v` = phòng/ngày ĐÍCH (`:236`), cùng khoá với `datHop :207` (`phong-hop:<phong>:<ngay>`) nên sửa-vào-ô và đặt-vào-ô tuần tự hoá. Bài tạm (CSDL RAM): A (P.03 14:00) sửa sang P.01 14:00 đã có B → **409**; sửa sang P.09 13:30 → OK. Không thử được đua thật (PGlite một kết nối) — chỉ đọc mã. Nhỏ: đọc `cu` và kiểm quyền TRƯỚC khi khoá (`:233-235`) → X17 |
| N2 giao ban khi P.09 đã có cuộc thường của người khác | ✔ | Bài tạm: nv đặt P.09 26/10 15:00–16:00; tp gọi `guiGiaoBan` → **409**, thông báo chứa «Phạm Thu Hà» (tên người đặt), cấu hình giao ban KHÔNG bị lưu (giao dịch hoàn lại, `noi_dung` trước = sau), 0 buổi giao ban được tạo. Đường cập nhật đã có bài chính thức (test:202-203). Nhưng: người gửi bị mất cấu hình đã nhập (hoàn lại) — hợp lý |
| N3 giờ VN (+7) | ✔ | `grep "new Date\|Date.now\|getHours\|toLocale"` trong `src/lib/phong-hop`, `src/components/phong-hop`, 4 route, `src/app/phong-hop`: chỉ 4 chỗ — `thuan.ts:83-84` (`ms + 7*3600_000` rồi `toISOString`, không phụ thuộc múi giờ máy), `:102,107` (`...T00:00:00Z` + `getUTCDay`/`setUTCDate`, thuần ngày). Phía SQL: `hopCuaToi` dùng `bay.ngay` VN (`:296`), `sua_luc AT TIME ZONE 'UTC' + interval '7 hours'` (`:318`, cột `timestamptz` — đúng). Đột biến `gio_utc` (bỏ +7) → **7 bài đỏ** (bài kiểm thật bắt được). «Giờ họp đã qua» (`thuan.ts:198`), «hôm nay» (`route.ts:17`), 15 phút (`:217`) đều qua `bayGioVN` |
| N4 POST cua-toi đánh dấu cuộc không được mời | ✔ | `daXemHop :301-303`: `UPDATE ... WHERE nguoi_id = $1 AND cuoc_id = ANY(...) AND xem_luc IS NULL` — chỉ sửa dòng của chính mình trong `phong_hop_moi`, không tạo dòng. Bài tạm: người không được mời gọi `daXemHop` → số dòng mời **không đổi**, cuộc không hiện trong `hopCuaToi` của họ |
| N5 Người xem đặt được không | **hiện CHO PHÉP** | 4 route chỉ gọi `batBuocDangNhap` (vd `route.ts:35`), không gọi `coQuyen`; `datHop`/`suaHop` chỉ so `nguoi_dat`/`la_quan_tri`. Màn không ẩn nút Đăng ký với ai. → mục «Cần anh quyết» Q3 |
| N9 `bungMoi` «cả phòng X» lấy người lúc đặt | ✔ như đã ghi | `dich-vu.ts:115-124` bung ngay lúc đặt; `ghiMoi` chốt danh sách; hướng dẫn «Hay vướng» ghi đúng (`huong-dan/tab/phong-hop.ts:170`). Sửa cuộc họp gửi lại danh sách → thêm/bớt (`suaHop:247-251`). Ghi nhận: người vào phòng sau không nhận; không có lỗi mã |
| N11 chuỗi tiếng Anh · khoảng giờ có số giờ | ✖ một phần | Câu lỗi mã chủ động đều tiếng Việt (đã đọc hết 4 route + dich-vu + thuan). Lọt tiếng Anh: lỗi hệ thống của Postgres đi qua `xuLy` (`phien.ts:151` trả `e.message`) — đo: `cuocTheoNgay(.., "2026-02-31")` → «date/time field value out of range: "2026-02-31"» → X5. Khoảng giờ: tooltip/ chi tiết/ chuông huỷ dùng `khoangGio` ✔ («2 giờ · 15:00 – 17:00»); còn 3 chỗ trần → X7 |
| N12 phụ thuộc máy | ✔ có ghi chú | Mục 3 |

## 3. N12 chi tiết

| Hạng mục | Kết |
|---|---|
| Ảnh `?v=3` | `PhongHop.tsx:160` `/phong-hop/mat-bang.webp?v=3`; tệp có trong git (`git ls-files public/phong-hop`), `deploy/cap-nhat.sh:8` chép `public` vào standalone. Đổi ảnh lần sau phải tăng số `v` bằng tay (⚪) |
| `db/89-phong-hop.sql` tự chạy khi khởi động? | **Có.** `db.ts:93-102` `chayLuocDo` đọc MỌI `db/*.sql` theo tên và `exec` lúc mở CSDL lần đầu (`mo()` dòng 118), cả PGlite lẫn PostgreSQL (`DATABASE_URL`). Tệp mới tự áp dụng; `deploy/cap-nhat.sh:10` chép thư mục `db` vào `.next/standalone`. Idempotent: `CREATE TABLE IF NOT EXISTS` ×3, `CREATE INDEX IF NOT EXISTS` ×2, `INSERT … ON CONFLICT (id) DO NOTHING` ✔. Chạy lại không đổi gì. Nhắc: `pm2` chạy 1 tiến trình (`deploy/ecosystem.config.cjs`) nên không đua tạo bảng |
| `laDonViNgoaiVP` nhận theo TÊN — dữ liệu thật | Đọc `4-agent-main/data/to-chuc.json` (cập nhật 20/10/2026 04:31Z, JSON, không mở pgdata): **39 đơn vị → 21 bị coi là ngoài văn phòng, 18 giữ**. 21 bị loại = 7 NM (Nậm Xe, Ca Nan 1/2, Nậm Lụm 1/2, Hướng Linh 7/8) + 14 BĐH (Hướng Việt, Tân Thành, Ba Tầng 1, Nam Khian 1/2/3, Nam Neun hạ lưu, Nam Lan 1/2, Nậm Mô 1/2, Hướng Phùng 1, Mỏ đá Dốc Đá Trắng, Nậm Săm 3A). 18 giữ = Ban TGĐ, 9 chức danh lãnh đạo, 5 phòng (ĐT&PC, KT&VH, HCTH, TCKT, CĐ), SCI PMC, SCI E&C, BQLDA QT, BQLDA Lào. **Không văn phòng nào bị loại nhầm; không nhà máy / BĐH nào lọt.** Người dùng (Main `users.json`, 55 tài khoản, 51 đang hoạt động): 4 người chỉ thuộc nhà máy bị bỏ khỏi danh sách mời (Hoàng Ngọc An, Nguyễn Bá Hoàng, Nguyễn Quang Sang, Thân Long Thạch), 1 người có đơn vị văn phòng + kiêm nhiệm NM (Nguyễn Văn Trung) được giữ, 3 người chưa gán đơn vị được giữ (đúng `dich-vu.ts:95` «chưa gán thì giữ»). Rủi ro còn lại: nhận theo chữ — đơn vị mới đặt tên «NMĐ …», «Nhà máy» viết tắt khác, «TĐ …» sẽ lọt; không có cờ khai ở Cài đặt (⚪ X20) |
| Cổng 3004 / đường dẫn `D:\` | `grep "D:\\|D:/\|3004\|localhost"` trong mã phòng họp: **không có**, chỉ một chữ «3004» trong comment `dich-vu.ts:324` |

## 4. Mọi phát hiện (chi tiết)

| # | Mức | Chỗ | Thấy gì · đo gì | Gợi ý |
|---|---|---|---|---|
| X1 | 🔴 | `dich-vu.ts:182` (`duong_dan: chu(b.duong_dan, 500) \|\| null`) · `DongHop.tsx:109` · `PhongHop.tsx:270` | Server không kiểm kiểu đường dẫn; giao diện vẽ `<a href={c.duong_dan} target="_blank">`. Đo: (1) bài tạm CSDL RAM: đặt cuộc với `duong_dan:"javascript:alert(1)"` → lưu **nguyên văn**; (2) `react-dom/server` 18.3.1 (đúng bản dự án `package.json:30-31`) vẽ ra `<a href="javascript:alert(document.cookie)" target="_blank">` — chỉ cảnh báo «tương lai sẽ chặn». Không có tiêu đề CSP (`next.config.mjs` không đặt). Ai đăng nhập (kể cả Người xem) cũng đặt được, chi tiết cuộc hiện cho mọi người → kẻ đặt gài link, người bấm chạy mã trong phiên 3004 của họ (có thể gọi API giao việc, huỷ cuộc…). | Máy chủ: chỉ nhận `^https?://` (trống thì bỏ), báo 400 tiếng Việt; giao diện: chỉ vẽ `<a>` khi khớp `^https?://`, còn lại in chữ thuần. Sửa một hàm dùng chung (luật 7) |
| X2 | 🟡 | `dich-vu.ts:228,263`; `thong-bao.ts:15-31`; `mac-dinh.ts:448` | xem C5. Số: mỗi người dự +1 tin chuông cho mỗi lần sửa giờ/đổi phòng/huỷ/kết thúc sớm; đặt mới & giao ban thì 0 | → Q1 |
| X3 | 🟡 | 4 route · `dich-vu.ts:203-217,232-265` | N5 | → Q3 |
| X4 | 🟡 | `dich-vu.ts:37-38` COT; `route.ts:22-29`; `PhongHop.tsx:238-278` | Trả `ghi_chu`, `duong_dan`, `khach_ngoai`, `moi[{id=email,ten}]` của mọi cuộc cho mọi người đăng nhập, không có khái niệm «cuộc riêng». Ngoài ra `moi[].id` là địa chỉ email. Hợp với lịch mở C13 (rê chuột cần tên + chủ trì + người dự) nhưng ghi chú/link họp (có thể kèm mật khẩu Zoom) không cần cho người không được mời | → Q2 |
| X5 | 🟡 | `route.ts:11` regex chỉ dạng · `phien.ts:151` | GET `?ngay=2026-02-31` và POST ngày tương lai không có thật → Postgres ném lỗi tiếng Anh, `xuLy` trả 500 + `e.message`. Đo: `date/time field value out of range: "2026-02-31"`. Ngoài ra `den` không giới hạn khoảng → `?ngay=2000-01-01&den=2999-12-31` kéo cả bảng (⚪) | Kiểm ngày thật (`new Date(…)` quay vòng) → 400 «Ngày không hợp lệ»; kẹp `den − ngay ≤ 62` ngày |
| X6 | 🟡 | `thuan.ts:112-116` + `:149-150` + `PhongHop.tsx:675-679` | `ngayGiaoBanKeTiep` chỉ nhảy sang tuần sau từ khi qua `den` (17:00), nhưng `loiDatHop` coi ô 15:00 là đã qua từ 15:30. Đo (đồng hồ giả Thứ Hai 16:00 VN): `guiGiaoBan` → **400 «Giờ họp đã qua — chọn giờ khác»**; 17:30 VN → buổi 02/11 OK. Màn hiện «Buổi kế tiếp: Thứ Hai 26/10» và nút bật suốt 15:30–17:00 | Sau giờ BẮT ĐẦU của buổi đang diễn ra → coi là sang tuần sau (hoặc màn báo rõ «buổi hôm nay đã bắt đầu») |
| X7 | 🟡 | `dich-vu.ts:260` («trước: P.01 09:00 – 10:00 ngày …») · `PhongHop.tsx:613` (cảnh báo người bận `{tu} – {den}`) · `PhongHop.tsx:759` (buổi đã gửi `{tu} – {den}`) | Luật 31 yêu cầu khoảng giờ kèm số giờ | Dùng `khoangGio()` sẵn có |
| X8 | 🟡 | `tests/unit/hoi-trung-hoi-cv.test.ts:32,41` | Xem mục 5 — lỗi từ trước, không do Phòng họp | Đổi kỳ vọng 4→5 agent, thêm `nghiemthu` |
| X9 | 🟡 | `phong-hop.css:177` (`.trang { color:#F5F5F4 }`), `:176` (`#F87171`) | Thanh trên 3004 tối (`--p-header:#1A1A1A`, `phong.css:8`) nên đọc được. Nhưng chuông nhúng nằm trên thanh trên của 5 bộ khác: Tiến độ có giao diện sáng (`globals.css:381-384`, `--bg:#faf9f7`) và header theo `bg` → chữ trắng gần như vô hình, đỏ nhạt tương phản yếu. Chưa nhìn bằng mắt | Trợ lý trình duyệt chụp Tiến độ ở giao diện sáng; nếu đúng thì dùng màu tương phản theo `prefers`/biến truyền vào, hoặc nền chữ riêng cho khung nhúng |
| X10 | ⚪ | `DongHop.tsx:61` vs `:63` | Khung nhúng được báo nở +300px khi `ds.length>0` nhưng hết giờ trong lúc chưa tải lại (60 s) thì `hien` rỗng, component trả `null` mà khung bên cha vẫn rộng +300 tới lần tải kế (tối đa 60 s) | Báo `rong` theo `hien.length` |
| X11 | ⚪ | `DongHop.tsx:54` / `:61` | Nghe `sci-chuong-dong` không kiểm `event.origin`/`source`, và gửi lên cha bằng `"*"`. Hệ quả thật: trang nào nhúng được 3004 gửi tin giả chỉ đóng được khung chi tiết; tin gửi đi chỉ có `{rong, mo}`, không nhạy cảm. Chiều nhận ở 5 bộ ĐÃ kiểm `e.origin !== nguon` (`ChuongCongViec.tsx:41` cả 5 bộ) và kẹp `0..400` | Có thể thêm `e.source === window.parent` |
| X12 | ⚪ | `phong-hop.css`, `PhongHop.tsx:6`, `thuan.ts:4,174`, `db/89:2`, `tests:60` | Chú thích còn «06:00–18:00 / 18:00» (đã bỏ, C3). Không ảnh hưởng chạy | Sửa chữ (luật 43) |
| X13 | ⚪ | `noi-dung.ts:1524` mục `ph-nut-lich` | Mục giải thích của nút «Lịch họp các phòng» đã bỏ; `grep "ph-nut-lich" src` chỉ còn đúng dòng này, không phần tử nào mang `data-gt` đó → mục chết. Link `DongHop.tsx:117` «Mở Lịch họp các phòng →` trỏ `?xem=lich` mà `PhongHop.tsx:908` chỉ hiểu `giao-ban` (tham số `ngay` vẫn dùng được) | Xoá mục chết; đổi chữ link thành «Mở màn Phòng họp →» |
| X14 | ⚪ | `db/89-phong-hop.sql` | Không `CHECK (tu < den)`, không ràng buộc loại trừ trùng giờ — chống trùng CHỈ dựa vào khoá tư vấn trong mã. Mọi đường khác (SQL tay, nạp lại bản sao lưu, mã mới quên khoá) đặt trùng được. Không có `loai`/`phong` CHECK | Chấp nhận được hôm nay. `EXCLUDE USING gist` cần `btree_gist` — PGlite có thể không có, không khuyến nghị lúc này |
| X15 | ⚪ | `dich-vu.ts:370` | Gửi lại giao ban đổi `nguoi_dat` sang người gửi lần sau; người đặt cũ mất quyền sửa, không ai được báo | Ghi nhận |
| X16 | ⚪ | `dich-vu.ts:233-239,243` | `UPDATE … WHERE id = $1` không kèm `huy_luc IS NULL`; hai người (đặt + quản trị) sửa/huỷ cùng lúc → bản đến sau thắng, không báo | Ghi nhận (hiếm) |
| X17 | ⚪ | cùng chỗ | Đọc cuộc cũ + kiểm quyền trước khi khoá | Ghi nhận |
| X18 | ⚪ | `PhongHop.tsx:915-935` | Mỗi người mở trang tải `/api/phong-hop` kèm danh mục (≈ 30+ truy vấn: `nguoiCuaDonVi` từng đơn vị) mỗi 60 giây + `taiNgay` mỗi lần `dl` đổi. Chưa đo thời gian thật (không chạm 3004) | Đo trên máy thật khi có 30 người mở cùng lúc |
| X19 | ⚪ | `dich-vu.ts:98-113` | Tên trưởng phòng/BLĐ phụ thuộc `loai='chuc_danh'/'phong'` — đúng với dữ liệu 20/10; đổi cấu trúc sơ đồ thì danh sách đổi theo (đúng ý) | — |
| X20 | ⚪ | `thuan.ts:296-297` | Luật nhận theo chữ, không có cờ khai trong Cài đặt (xem mục 3) | Nếu thêm đơn vị mới kiểu «NMĐ …» thì cần sửa regex hoặc thêm cờ |
| X21 | ⚪ | Bài kiểm 13 bài | Chạy xanh (13/13, 8,15 s). Đột biến 13 dạng trong bộ nhớ (mục 6): **12 bị bắt, 1 sống sót** (`bay.phut <= phut(den)` trong `trangThaiCuoc` — biên đúng phút kết thúc). Không có bài nào cho 4 route (quyền HTTP), cho khoá đua, cho tin chuông `phong_hop` của huỷ/kết thúc sớm, cho `javascript:` | Thêm 1 bài biên 17:00:00, 1 bài kiểm đường dẫn họp |

## 5. Bộ kiểm — số đo

| Lệnh (ở CV) | Kết quả |
|---|---|
| `npx vitest run tests/unit/phong-hop-25-10.test.ts --testTimeout=60000` | **13 passed (13)**, 8,15 s |
| `npx tsc --noEmit -p .` | **exit 0**, không lỗi (tsc-cv.txt) |
| `npx vitest run --testTimeout=60000` (toàn bộ) | 24 tệp đỏ / 116 xanh / 4 bỏ; **5 bài đỏ · 1122 xanh · 160 bỏ**, 366 s. 22 tệp đỏ là `Hook timed out in 60000ms` (mở CSDL RAM bị nghẽn khi 144 tệp chạy song song, cùng lúc tsc/nền khác) — **không phải lỗi mã**: chạy riêng `ai-tai-khoan-ca-nhan`, `ai-hai-tai-khoan`, `cay-viec-issue`, `to-chuc` (47 bài) cho **45 xanh**; chỉ còn `hoi-trung-hoi-cv` đỏ 2 bài |
| **N10** 2 bài `hoi-trung-hoi-cv` | **Xác nhận lỗi thời từ trước.** Bài kỳ vọng hỏi 4 agent (`['hopdong','main','phaply','tiendo']`), thực tế hỏi 5 (thêm `nghiemthu`). Nguồn: commit `3b92154` (19/10/2026) «danh sách agent được hỏi thêm agent Nghiệm thu» sửa `src/lib/chung/hoi-trung-kieu.ts` nhưng không sửa bài. Chạy lại ở commit **cha của `a6ed6b5` (`2127247`)** — `git archive` ra thư mục tạm + junction `node_modules` (đã gỡ, `Test-Path` thư mục tạm = False, `node_modules` gốc còn nguyên): **cùng 2 bài đỏ, cùng thông báo** → không do Phòng họp |
| Đột biến 13 dạng (bài tạm, nội dung thuan.ts đổi trong bộ nhớ, tệp thật không đổi) | Gốc 13/13 xanh. Bắt được: `gio_o` (1 đỏ) · `bo_kiem_trung` (2) · `cham_mep_la_trung` (3) · `dao_cap_bac` (1) · `dong_cap_lay_dau` (1) · `dao_loc_nha_may` (4) · `gio_utc` (7) · `nhac_5_phut` (1) · `xuyen_trua` (1) · `ten_ngan_1_chu` (1) · `giao_ban_17_dung` (1) · `ghe_chu_toa_sai` (1). **Sống sót:** `dang_hop_den_bang` (đúng phút kết thúc vẫn tính «đang họp») |

## 6. Quyền & an toàn API (mục 3 của việc giao)

| Hạng | Kết |
|---|---|
| Đăng nhập | ✔ Cả 4 route + `page.tsx:11-12` gọi `batBuocDangNhap`/`layNguoiDung`; chưa đăng nhập → 401 / chuyển `/login` |
| Xem | Mọi người đăng nhập xem hết (X4) |
| Sửa/huỷ/kết thúc sớm cuộc người khác | ✔ Chỉ `nguoi_dat` hoặc `la_quan_tri` (`dich-vu.ts:219-225`); đang họp → chỉ kết thúc sớm; đã xong → không động. Bài `huyHop(tp)` → 403 ✔ |
| Giao ban | ✔ `duocLapGiaoBan` kiểm ở `luuGiaoBan` (PUT) và `guiGiaoBan` (POST); GET trả `duoc_sua` để ẩn nút (luật 17 riêng 3004 ✔: `PhongHop.tsx:709,762`) |
| SQL | ✔ Mọi giá trị người dùng đi qua tham số `$n`; chỗ nội suy duy nhất là hằng `COT` (`dich-vu.ts:37`). `ANY($1::bigint[])`/`text[]` có ép kiểu; `ids` từ `cua-toi` đã lọc số nguyên dương (`cua-toi/route.ts:22`) |
| Chữ do người dùng nhập | ✔ `noi_dung`, `ghi_chu`, `khach_ngoai` vẽ dạng chữ React (tự thoát); ✖ `duong_dan` — X1 |
| Giới hạn | `slice` độ dài đủ; `moi` ≤ 300 mục; không giới hạn số cuộc/ngày xa/người (ai cũng đặt – ý anh) ⚪ |
| `db/89` | Khoá dùng `pg_advisory_xact_lock(hashtext(...))` trong giao dịch (`db.ts:44-52,69-87` mỗi `tx` là một giao dịch thật); chỉ mục `(ngay, phong)`, `(nguoi_id)`; khoá ngoại `moi → cuoc ON DELETE CASCADE`; không ràng buộc trùng giờ ở CSDL (X14) |

## 7. Chuông nhúng ở 5 bộ khác

| Hạng | Kết |
|---|---|
| Phạm vi 10 commit | Mỗi bộ đúng **2 commit, 1 tệp**: `src/components/layout/ChuongCongViec.tsx` (Pháp lý: `components/ChuongCongViec.tsx`). Tiến độ / Hợp đồng / Main / Nghiệm thu: phần thay đổi **giống hệt nhau từng dòng** (so `git show` bằng `diff`); Pháp lý chỉ khác cách viết style (`position:"relative"…` thay `className`) |
| Họ làm gì | Thêm `rong` (kẹp `0..400`) và `moHop` từ tin `sci-chuong-rong`; khung `width = RONG_DONG + rong`; khi `moHop` khung nở như hộp tin (`max(600, RONG_DONG+rong)`); lắng bấm-ra-ngoài cũng chạy khi `moHop`. Commit 2 chỉ sửa chú thích |
| Chạm thứ khác? | Không — `git show --stat` mỗi commit 1 tệp, 15+/7- và 1+/1- |
| Kéo lib máy chủ / `node:fs` vào client? | Không: chỉ `react` + `KhaiHuongDan` (đã có). `grep "import "` mỗi tệp = 2 dòng đó |
| `fetch(` thẳng sang agent khác (luật 29)? | Không mới. Tệp có 2 `fetch`: `/api/viec/goc` (cùng bộ) và `fetch(${goc}/nhung/chuong, {mode:"no-cors"})` — dò sức khoẻ cổng (ngoại lệ ping của luật 29, có sẵn từ trước 25/10) |
| Kiểm nguồn tin | Phía nhận ở 5 bộ: `if (e.origin !== nguon) return` (dòng 41; Pháp lý 39) ✔ — chỉ nhận từ cổng 3004. Phía 3004 gửi `postMessage(…, "*")` và nghe `sci-chuong-dong` không kiểm origin → X11 (rủi ro nhỏ) |
| Nới khung 400px bởi tin giả? | Chỉ trang chạy trong khung nhúng đúng `origin` 3004 mới đổi được `rong`; trang khác bị chặn bởi `e.origin`. Kẻ gửi tin giả từ 3004 phải có mã chạy trong 3004 — tức đã vượt X1 |
| `tsc --noEmit -p .` mỗi bộ (chỉ đọc) | Cả 5 bộ **exit 0, không lỗi**: Pháp lý 68 s · Nghiệm thu 47 s · Hợp đồng 9 s · Main 8 s · Tiến độ 5 s (3 bộ sau nhanh vì có `tsbuildinfo` sẵn; tệp kết quả chỉ 1 dòng `exit=0`). Kể cả với thay đổi chưa commit của phiên khác |
| Chưa commit ở 5 bộ | Tiến độ 309 · Hợp đồng 88 · Main 109 · Pháp lý 2 · Nghiệm thu 11 thay đổi chưa commit (việc của phiên khác, KHÔNG phải 2 commit chuông) — `tsc` các bộ này phản ánh cả việc đang dở đó |

## 8. Cần anh quyết (khuôn 5 phần)

**Q1 — Sửa giờ / đổi phòng / huỷ có cộng vào con số chuông không**
| Phần | Nội dung |
|---|---|
| Vấn đề | Chốt C5: «Báo họp không cộng vào con số chuông». Mã làm đúng với lời mời họp (chỉ hiện dòng chữ). Nhưng khi người đặt SỬA giờ, ĐỔI phòng, HUỶ, hoặc KẾT THÚC SỚM thì mỗi người dự nhận thêm 1 tin chuông (loại `phong_hop`, rơi vào kênh «khác», `trong_app:true`) → con số chuông +1. Hướng dẫn tab «Dòng chữ đỏ» nói «không cộng», hướng dẫn tab «Sửa» nói «nhận chuông báo» — hai câu cùng đúng nhưng người đọc dễ thấy mâu thuẫn. Đo bằng bài kiểm: 1 lần sửa giờ → 1 tin cho người dự |
| Gợi ý | **(gợi ý) Giữ như đang chạy**, ghi rõ trong hướng dẫn «chỉ lời mời là dòng chữ; thay đổi/huỷ là tin chuông» |
| Vì sao | Huỷ làm dòng chữ biến mất lặng lẽ; nếu không có tin chuông người dự không biết vì sao cuộc họp mất. Tin đổi giờ cần giữ lại dấu để đọc lại |
| Nhược điểm | Con số chuông có thể tăng vì họp — đúng điều anh muốn tách |
| Không chọn | (a) **Bỏ hẳn tin chuông, chỉ dùng dòng chữ**: ưu — đúng chữ C5 tuyệt đối, chuông chỉ còn việc; khuyết — huỷ/ đổi phòng không để lại dấu (dòng chữ chỉ cập nhật, người đang đi họp không biết đổi). (b) **Gửi tin chuông nhưng đánh dấu «đã đọc» sẵn**: ưu — không cộng số; khuyết — người dự không thấy tin đổi, chẳng khác (a) |

**Q2 — Ghi chú, link họp, khách ngoài của cuộc họp ai xem được**
| Phần | Nội dung |
|---|---|
| Vấn đề | API trả mọi cuộc kèm `ghi_chu`, `duong_dan`, `khach_ngoai` và danh sách người dự cho TẤT CẢ người đăng nhập, kể cả Người xem. Đúng chữ C13 với tên + chủ trì + người dự; nhưng link Zoom/Teams (có khi kèm mật khẩu) và ghi chú dặn («mang hồ sơ mật…») không cần cho người không được mời |
| Gợi ý | **(gợi ý) Giữ lịch mở như chốt (tên, giờ, chủ trì, người dự), nhưng chỉ trả `ghi_chu`, `duong_dan`, `khach_ngoai` cho người đặt, người được mời và quản trị** |
| Vì sao | Không đổi gì anh đã chốt về lịch giữa; chỉ khép phần thông tin phụ. Sửa ở một chỗ máy chủ |
| Nhược điểm | Người không được mời không xem được link khi muốn xin vào dự; phải hỏi người đặt |
| Không chọn | (a) **Giữ như hiện nay**: ưu — đơn giản, minh bạch, ai cũng vào được cuộc mở; khuyết — lộ link/mật khẩu họp và ghi chú nội bộ cho cả Người xem. (b) **Thêm ô «Cuộc họp riêng» người đặt tick**: ưu — người đặt tự quyết; khuyết — thêm ô, thêm cú bấm, người hay quên tick |

**Q3 — Người xem có được đặt phòng không**
| Phần | Nội dung |
|---|---|
| Vấn đề | Hiện bốn loại người dùng (PM · Admin · Người dùng · Người xem) đều đặt, sửa, huỷ cuộc của mình được và gửi được chuông cho người khác — mã không kiểm loại. «Người xem» theo chốt 25/09 là Upload ✗. Anh chốt C1 «ai cũng đặt được» |
| Gợi ý | **(gợi ý) Cho cả Người xem đặt** (đúng chữ «ai cũng») và ghi vào hướng dẫn |
| Vì sao | Phòng họp là việc vận hành văn phòng, không phải dữ liệu dự án; chặn Người xem thì họ phải nhờ người khác đặt hộ, trái tinh thần «không có lễ tân» |
| Nhược điểm | Người xem gài được cuộc họp, gửi tin cho người khác; cộng X1 (nay đã chặn bằng sửa X1) |
| Không chọn | **Chặn Người xem đặt/sửa (chỉ xem lịch)**: ưu — khớp định nghĩa «Người xem»; khuyết — thêm một điều kiện quyền (`cong_viec.sua`?), Người xem không dự họp qua dòng chữ vẫn nhận mời nên phải nhờ người khác đặt |

## 9. Chưa đo được

| Việc | Vì sao |
|---|---|
| Hình ảnh / bố cục thật (C4 màu thật, C8 khung nhấp nháy, C12 ba cột ở các cỡ màn, C13 không thanh cuộn, C15 ảnh mặt bằng, C16 đồng hồ, N6 vòng vẽ lại, N7 khung nhúng, N8 tại màn thật) | Việc của trợ lý trình duyệt; tôi chỉ tính tay N8 |
| Đua thật hai giao dịch cùng lúc (N1) | PGlite một kết nối; chỉ đọc mã + bài logic |
| Thời gian phản hồi thật của API (X18) | Không chạm 3004 |
| Gọi 4 route qua HTTP với từng loại tài khoản | Cấm ký cookie / ghi dữ liệu thật; quyền chỉ đo bằng đọc mã |
| Người dùng Người xem thật trong CSDL | Không mở pgdata |
| Dựng bản chạy thật (`next build`) của 5 bộ khác | Cấm; `tsc` sạch chưa chứng minh dựng được |

## 10. Xác nhận không sửa kho

- Chỉ tạo/xoá tạm: `tests/unit/kiem-doc-lap-tmp-dotbien.test.ts`, `…-x2.test.ts`, `…-x3.test.ts` (đã `rm` ngay; `ls tests/unit | grep kiem-doc-lap-tmp` = 0); thư mục tạm `tam-x/cu` (git archive + junction `node_modules`) đã gỡ.
- Không commit / checkout / stash / add / worktree / `next build`; không bật tắt cổng; không mở `data/pgdata`; không POST/PUT/DELETE lên 3004; không ký cookie; không gọi AI. Dữ liệu cấu hình đọc từ `4-agent-main/data/to-chuc.json` và `users.json` (JSON; không in mật khẩu / băm ra tệp này).
- `git -C CV status --short | grep -v " data/" | wc -l`: trước = 13 · sau = **13** (cùng danh sách; không tăng do tôi).


---

# PHỤ LỤC 2 — Trình duyệt (trợ lý B)

# TRINH-DUYET — Kiểm độc lập lần 7 «Phòng họp» · trợ lý B (trình duyệt) · 26/10/2026

Đã đọc: LUAT-CHUNG.md, MA-X.md. Trình duyệt trong app, thẻ riêng (tab-2). Không có phiên đăng nhập 3004 → phần đo màn Phòng họp thật (bước 1–4 trừ ảnh tĩnh) **không làm được**; làm thêm: (a) đo ảnh mặt bằng (tệp tĩnh công khai), (b) dựng bản mô phỏng bố cục bằng ĐÚNG công thức CSS thật để đo C12/N8, (c) bước 5 đầy đủ ở 5 bộ khác.

## 0. Tóm tắt — 🔴 1 · 🟡 2 · ⚪ 5

| # | Mức | Một dòng | Chỗ |
|---|---|---|---|
| B1 | 🔴 (mô phỏng) | Khung chuông nhúng nở +300px khi có cuộc họp: Hợp đồng, Main, Nghiệm thu ở 1366 đẩy nút người dùng ra 1599 px (thanh trên tràn ngang 248 px); Tiến độ ở 1000 px tràn 300 px; Pháp lý ở 1366 khung trong suốt (z 50) đè «💡 Giải thích» và «? Hướng dẫn» | `DongHop.tsx:61` (rong=300) ↔ `ChuongCongViec.tsx:105` (cả 5 bộ) |
| B2 | 🟡 | X9 xác nhận bằng số: giao diện sáng của Tiến độ chữ «trắng» #F5F5F4 trên nền #FAF9F7 độ tương phản 1,04:1 (không đọc được); đỏ #F87171 chỉ 2,6:1 | `phong-hop.css:176-177` |
| B3 | 🟡 | Không có phiên đăng nhập 3004 sẵn → 12 chốt/điểm màn thật «chưa đo được» (xem mục 5) | — |
| B4 | ⚪ | Ở 1000 px thanh trên Main (+306 px) và Nghiệm thu (+105 px) đã tràn sẵn, KHÔNG do chuông | 3010, 3015 |
| B5 | ⚪ | Pháp lý đặt chuông cuối dãy menu (sau «Dự án», x=682), 4 bộ kia đặt ngay sau «Việc của tôi» (x≈282) | `3-agent-phap-ly-code …/ChuongCongViec.tsx` |
| B6 | ⚪ | 1024×1366 và 901–1000 px: khung phải còn 308 px / ~253 px (dương, không âm), chưa xem được form ở bề rộng đó | mô phỏng |
| B7 | ⚪ | Chuông khi chưa đăng nhập 3004: biểu tượng mờ (opacity 0,5), rê chuột ghi «Chưa đăng nhập agent Công việc — bấm để đăng nhập (thẻ mới), rồi tải lại trang này» — tiếng Việt, đúng, ở cả 5 bộ | `/nhung/chuong` |
| B8 | ⚪ | Nút trong thanh trên Pháp lý (nav 141–463) cao −2…40 px so với thanh 38 px (lệch 2 px) | 3013 |

Kết luận phần B: phần chuông nhúng **CHƯA ĐẠT ở khoảng trống thanh trên** (B1); ảnh mặt bằng C15 và bố cục 3 cột C12 (tính theo công thức thật) đạt.

## 1. Bước 0 — phiên

| Mục | Kết |
|---|---|
| Mở `http://localhost:3004/phong-hop` | Chuyển sang `/login?tiep=%2Fphong-hop` → **không có phiên 3004**. Không đăng nhập (không có tài khoản thử ở 3004, cấm ký cookie). Dừng đo màn 3004 |
| Phiên các bộ khác | 3003, 3010, 3012, 3013, 3015 đều đã có phiên «Quản trị thử (agent kiểm)» sẵn trong khung trình duyệt, nên không phải đăng nhập |
| `/nhung/chuong` (khung chuông 3004 nhúng) | Trả chuông xám «chưa đăng nhập agent Công việc» → không có dữ liệu cuộc họp → **không thể thấy dòng chữ đỏ/trắng thật** |

## 2. C15 + C2 + C16 — ảnh mặt bằng (tệp công khai `/phong-hop/mat-bang.webp?v=3`, đo + nhìn bằng mắt)

| Chốt | Kết | Số đo |
|---|---|---|
| C2 kích thước ảnh | ✔ | naturalWidth×naturalHeight = **1295×1215** (cả trình duyệt lẫn tệp ổ đĩa); có đủ 3 nhãn PHÒNG HỌP 01, 03, 09 trên ảnh |
| C15 nền ngoài toà nhà trắng | ✔ | lấy 3 điểm ngoài (trái-dưới, phải-dưới, dưới) = rgb(255,255,255) |
| C15 WC + sảnh gạch trắng kẻ ô | ✔ | nhìn ảnh: WC và sảnh bên phải WC trắng có kẻ ô. Đo: WC 64% điểm ảnh gần trắng (>225), sảnh 92%, dải trước cửa WC 79%; màu sảnh rgb(241,241,241) (xám trắng, không phải kem rgb(243,234,221)) |
| C15 ô kem trước cửa WC gạch trắng | ✔ | dải x 225–285, y 110–230 (trước cửa WC) = rgb(241,241,241) |
| C15 dãy tiểu nam → bàn 3 bồn rửa | ✔ | nhìn ảnh: hàng dưới của WC có đúng 3 bồn rửa tròn (y≈290); không còn dãy tiểu nam; hàng trên cũng 3 bồn rửa (y≈30) |
| C16 đồng hồ to góc trên phải | chưa đo được | đồng hồ là SVG vẽ trên màn thật (cần phiên). Theo mã: tâm (1152,132) bán kính 62 → nằm trong ảnh. Vùng ảnh ở đó (x 1090–1214, y 70–194) là mặt tường/hành lang cầu thang, không đè bàn ghế phòng nào — ✔ về vị trí trống |

## 3. C12 + N8 — bố cục 3 cột (BẢN MÔ PHỎNG, dùng đúng công thức `phong-hop.css:7-22,148,193`, ảnh thật; chưa đo trên màn thật vì không có phiên)

| Viewport | Ảnh (rộng×cao) · tỉ lệ | Dải giữa | Khung phải | Tràn ngang |
|---|---|---|---|---|
| 1366×768 | 535,3×502,2 · 1,0659 | **345,0** | 462,0 | không (1366/1366) |
| 1280×720 | 487,8×457,7 · 1,0658 | **345,0** | 423,1 | không |
| 1920×1080 | 839,8×788,0 · 1,0657 | **345,0** | 711,1 | không |
| 1024×1366 | 347,0×325,6 · 1,0657 | **345,0** | 307,9 (dương, hẹp) | không |
| 880×700 | 841,1×789,2 · 1,0658 (1 cột) | 865 (70% vh) | 865 | không (865/865) |

- Tỉ lệ gốc ảnh 1295/1215 = 1,0658 → ảnh KHÔNG kéo dãn ở cả 5 cỡ (✔ C12, N8). Ảnh to hơn --ph-rong-goc đúng 10%: 1366 → 535,2 / 486,5 = 1,10; khung phải = 2·486,5−535,2+24 = 461,8 ≈ 462,0 ✔ (khung phải hẹp đúng phần ảnh nở).
- Hai nút trái: 264+264 = 528 (+8 khoảng) = đúng bề rộng ảnh 535 (1366); 240+240 (1280); 416+416 (1920); 170+170 (1024) → bằng nhau và dài hết bề rộng ảnh ✔ (phần C13 hai nút, nhưng chưa xem nhãn «Lịch họp các phòng» đã bỏ ở màn thật).
- Ở 1366×768 ảnh thấp 502 px còn khung trái chừa 730 px → dưới ảnh ~140 px trống (không còn chú thích) — khớp chốt «bỏ chú thích», không phải lỗi (⚪).
- Chưa đo được: chữ «N ghế» không còn, chú thích dưới ảnh không còn (cần màn thật).

## 4. Bước 5 — chuông nhúng ở 5 bộ (đăng nhập sẵn «Quản trị thử (agent kiểm)»; theme tối ở cả 5)

Khung chuông là iframe `http://localhost:3004/nhung/chuong` rộng 40 × cao 34, nằm trong thanh trên cao 38 px (top 2, bottom 36) ở cả 5 bộ.

| Bộ | Cổng | Vị trí chuông (x) | Thanh trên 1366 (sw/cw) | Thanh trên 1000 (sw/cw) | Giả lập +300 px (khung 340) |
|---|---|---|---|---|---|
| Tiến độ | 3003 | 282–322 | 1366/1366 ✔ | 1000/1000 ✔ | 1366: không tràn (sw=cw) · **1000: sw 1300 > cw 1000, nút người dùng ra x=1300** |
| Hợp đồng | 3012 | 282–322 | 1351/1351 ✔ | 985/985 ✔ | **1366: sw 1599 > cw 1351** (+248), nút người dùng x=1599 |
| Main | 3010 | 281–321 | 1351/1351 ✔ | **1291/985** (đã tràn sẵn +306, không do chuông) | **1366: sw 1599 > cw 1351** (+248) |
| Nghiệm thu | 3015 | 282–322 | 1366/1366 ✔ | **1090/985** (đã tràn sẵn +105) | **1366: sw 1599 > cw 1351** (+233) |
| Pháp lý | 3013 | 682–722 (cuối dãy menu) | 1358/1358 ✔ | 992/992 ✔ | 1366: không tràn nhưng khung 682–1022 **đè «💡 Giải thích» 831–928 và «? Hướng dẫn» 934–1035**; khung z-index 50, trong suốt → chặn bấm hai nút |

- Cách giả lập: vì không có phiên 3004 nên dòng chữ không hiện thật; tôi ép tạm kiểu của khung từ 40 → 340 px bằng DOM (đúng `rong=300` trong `DongHop.tsx:61` và `RONG_DONG + rong` trong `ChuongCongViec.tsx:105`), đo, rồi trả lại. Không bấm gì, không ghi gì. Cần xem lại bằng mắt khi có phiên và có cuộc họp.
- **B1 🔴 (theo mô phỏng)**: C5/N7 «không đè nội dung» chưa đạt ở Hợp đồng, Main, Nghiệm thu (tràn ngang, nút «Quản trị thử» văng ra khỏi màn), Tiến độ ở ≤ ~1100 px, Pháp lý (đè nút). Gợi ý: cho khung nhúng nở bằng `position:absolute` trên khoảng trống (không chiếm chỗ trong luồng), hoặc cho `rong` = min(300, chỗ trống đo thật của thanh trên), hoặc nhận `rong` nhỏ hơn khi bề rộng thanh trên < 1500.
- Khung chi tiết (khi bấm dòng chữ): `max(600, 40+rong)` rộng, cao `min(760px, 100vh−8px)`, z 50 → đè nội dung trang như hộp tin chuông (đúng thiết kế, chưa đo được thật).

### X9 — chữ «trắng» trên thanh trên sáng

| Thứ | Giá trị đo | Độ tương phản |
|---|---|---|
| Thanh trên Tiến độ giao diện tối | rgb(26,26,26) | chữ trắng #F5F5F4 = **15,95:1** ✔ · đỏ #F87171 = **6,29:1** ✔ |
| Thanh trên Tiến độ giao diện sáng (đổi `data-theme` tạm, trả lại ngay) | màu(0,98 0,976 0,969 / 0,68) trên nền #FAF9F7 ≈ #FAF9F7 | chữ trắng #F5F5F4 = **≈1,04:1 (vô hình)** · đỏ #F87171 = **≈2,6:1 (yếu, dưới 3)** |

Mặc định cả 5 bộ đang tối nên chưa thấy lỗi; chỉ vỡ khi người dùng bật giao diện sáng (nút ◐) và có ≥ 2 cuộc (chữ trắng) — còn chữ đỏ của cuộc đầu cũng yếu. Gợi ý: màu theo biến của bộ nhúng (khung `color-scheme: light` đã ép) hoặc dùng đỏ đậm #B91C1C + xám đậm #44403C khi nền sáng; hoặc cho `DongHop` chữ có nền riêng.

## 5. Chưa đo được (vì không có phiên đăng nhập 3004; không tự tạo cuộc họp)

| Mã | Việc |
|---|---|
| C3 | 15 ô/phòng, nhãn 13:30 không dính «14» |
| C4 | màu ô thật (getComputedStyle) — xanh trống/vàng/đỏ/xám/viền xanh dương (giá trị khai trong CSS: #22C55E #EAB308 #DC2626 #D6D3D1 #2563EB — chưa xác nhận lên ô) |
| C8, C9, C10, C14 | đồ hoạ phòng, tên ngắn, vòng đỏ/xanh, ghế chủ toạ, bấm ô đỏ |
| C12 (màn thật) | getBoundingClientRect của dải giữa/khung phải trên trang Phòng họp thật; chú thích dưới ảnh, chữ «N ghế» |
| C13 | không thanh cuộn lịch, hover tooltip, bấm ô; nút «Lịch họp các phòng» đã bỏ; 2 nút trên màn thật |
| C16 | đồng hồ SVG (chỉ xác nhận vùng ảnh) |
| N6 | MutationObserver 1 phút, bảng điều khiển (cảnh báo, vòng lặp) trên màn Phòng họp |
| Luật 28/31, chữ tiếng Việt, ô chọn ngày nền sáng (d5b2dd5) | trên màn thật |
| Dòng chữ báo họp thật, đỏ-trắng xen kẽ, cuộc thứ hai | không có dữ liệu để thấy dòng chữ |

## 6. Xác nhận an toàn

- Không bấm Sửa/Huỷ/Lưu/Đặt/Gửi thông báo/Kết thúc sớm; không tạo cuộc họp; không POST/PUT/DELETE; không đăng nhập; không tự ký cookie; không chạy script ký phiên; không mở pgdata.
- Chỉ GET: `/phong-hop` (bị chuyển sang `/login`), `/login`, `/nhung/chuong`, ảnh tĩnh `/phong-hop/mat-bang.webp`, và trang chủ 5 bộ khác. Mọi thay đổi DOM (đổi `data-theme`, ép chiều rộng khung chuông, dựng bản mô phỏng bố cục) làm tạm trong trang, không lưu; trang đã tải lại/chuyển đi. Không đụng kho mã.
- Viewport đã trả `desktop`; thẻ tab-2 do tôi mở (thẻ 3003 của người dùng chỉ tải lại đúng địa chỉ đang mở).
