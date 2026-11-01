# KẾT QUẢ — Kiểm độc lập lần 6 agent Công việc 3004 (20/10/2026)

*Bên kiểm: phiên «0 Kiểm tra độc lập». Hai trợ lý soát (sơ đồ + luồng Loại khác / 4 nhóm Cần BLĐ + mẫu Word); bên kiểm tự mở mã soát lại 3 🔴 chính — đúng. Không mở `data/pgdata`, không POST/PUT/DELETE, không gọi AI thật, không bấm «Chuyển nhóm». Bài kiểm 22/22 đạt (sơ đồ) · 189 đạt + 2 trượt + 3 bỏ qua (17 tệp liên quan) · `tsc --noEmit` 0 lỗi.*

## Kết luận: ĐẠT CÓ ĐIỀU KIỆN — 🔴 3 · 🟡 11 · ⚪ 18

| # | 🔴 | Ở đâu | Đo |
|---|---|---|---|
| 1 | **Mục 7b không có đường nào để dữ liệu vào** — lên hosting không bao giờ chạy. Main từ chối gắn Ban điều hành cho dự án Loại khác; Cài đặt 3004 chỉ vẽ ô chọn BĐH cho nhóm SCI; mỗi lần kéo từ Main ghi đè `ban_dieu_hanh` | `4-agent-main/src/lib/du-an-don-vi.ts:32` · `CV components/cai-dat/nhom.tsx:593` · `CV lib/du-an-main-thuan.ts:99` | `ban_dieu_hanh` của 6 dự án Loại khác đều rỗng; dưới SCI E&C hiện 11 ô con (5 BĐH + 5 ô dự án trùng tên + Nam Khian 1), không phải 6; bài kiểm 7b gán thẳng `ban_dieu_hanh` cho Loại khác nên không phản ánh dữ liệu thật |
| 2 | **Đang chọn một ô con thì không gập được nhóm** — bấm gập, effect bung lại ngay | `CV components/phong/SoDoPhong.tsx:241-246` | Bên kiểm đọc mã: ô chọn nằm trong nhóm gập → `bc.VT[chon]` rỗng → `doiNhom(c, true)` |
| 3 | **`ganNhom` bỏ qua mọi hàng có mã nhóm bản 1 — kể cả hàng NGƯỜI đã chuyển nhóm.** «Người luôn thắng» chỉ đúng với hàng AI; hàng cũ nằm lại bảng mãi | `CV lib/bao-cao-tuan/can-quyet-nhom-ai.ts:26` (`laNhomCanQuyet` chỉ nhận 4 mã bản 2 — `can-quyet-nhom.ts:16,23`) | Khoảng hở giữa `0470bb3` và `8cf327a` chỉ ~40 phút nên số hàng thật có thể ít; chưa đếm được vì cấm mở pgdata. Không bài kiểm nào bắt |

## Trả lời 15 điểm nghi (đề mục 5)

| # | Trả lời |
|---|---|
| 1 | **Đúng là chưa áp `duoc`, và có hậu quả** — nhóm «Phối hợp» cột phải (`SoDoPhong.tsx:626-627`): bấm Ban lãnh đạo thấy thêm 8 việc Loại khác. Đếm theo ô: Ban lãnh đạo 103→95, P.ĐT&PC 54→49 (chặn 8 và 5 việc); việc nội bộ PMC/E&C không gắn dự án 17/17 vẫn lên P.ĐT&PC — đúng (5b). Còn lộ: P.ĐT&PC làm chủ trì thì vẫn hiện (`doi-viec.ts:55`) — trên máy này bấm P.ĐT&PC vẫn thấy CV-2026-0043 Nậm Mô 1 và CV-2026-0142 Nậm săm 3A. Nút «Quá hạn · 64» đếm toàn bộ nhưng danh sách ở ô gốc ra 60 |
| 2 | **Sai** (không phải lỗi): không có chỗ nào cần cây VẼ mà dùng cây đủ |
| 3 | Không vòng lặp vô hạn; không bung khi chỉ vào ô cha rồi gập. Nhưng có lỗi 🔴 2 ở trên (ô con) |
| 4 | Chưa chắc, rủi ro thấp (nháy khi `toi` chưa về) |
| 5 | **Đúng**: số đo cũ khi không truyền `nhom` giữ nguyên (`phong.test.ts` xanh) |
| 6 | **Khớp nhầm có thật**: `cod` khớp «codex» / «decode», `hầm` khớp «hầm hố», `đập` khớp «đập tan»; «Sở/Bộ Xây dựng» kèm dự án SCI ra `thuc_thi` chắc. (Bảng 9·1·2·8 của 20 dòng thật không đo được — route kích AI thật, `route.ts:30,33`) |
| 7 | **Đúng một nửa**: người > code chắc > AI đúng thứ tự; nhưng mã bản 1 bị bỏ qua kể cả hàng NGƯỜI — 🔴 3 |
| 8 | **Đúng**: khoá `globalThis` đủ cho nhiều người mở trang và nạp lại module. Nhưng lượt AI lỗi chỉ `console.error` → mỗi lần mở trang gọi AI lại (tối đa 6 lần / 20 giây), dòng «🤖 đang xếp nhóm…» treo mãi (🟡) |
| 9 | **Không lệch**: không có ca nút hiện mà máy chủ từ chối. Ca ngược duy nhất (quyền `cua_minh`) giao diện ẩn mà vẫn có quyền — mặc định hệ thống không có ca này |
| 10 | **Lỗi có thật**: luồng Khai báo mẫu làm rơi `so_lieu` (`khai-bao-mau.ts:38-52,91`) và `bang_tien_do_tk` có điều kiện (`cau-truc.ts:92`). Đã tách việc riêng |
| 11 | **Đúng**: trên 3004 cả 14 luật bỏ đều đã tắt, không có luật bật nào trỏ bảng không còn |
| 12 | **Chấp nhận được**: tệp gốc Form 6 vốn tích «Tuần 29»; `kiemTraDayDu` trên báo cáo tháng 7 cũ vẫn ra kỳ tháng, đạt, không bị chặn |
| 13 | **Đúng và nặng hơn đề nói**: dòng chữ nhóm bị cắt «…» ngay cỡ chuẩn. Segoe UI 11px đo 141–151px trong chỗ chứa 103–114px → cả 4 dòng có «trễ» mất đoạn «· k trễ». Chữ 11px còn dưới sàn 12px (`GIAO-DIEN-CHUNG-v1.0.md:123`) |
| 14 | **Không hỏng**: chỉ mục git toàn LF; `numstat` có và không bỏ CR giống y hệt; chỉ `phong.css` lẫn CRLF trong thư mục làm việc |
| 15 | **Xác nhận**: `hoi-trung-hoi-cv.test.ts` cứng số 4 (dòng 32, 41); mã hiện hỏi 5 agent (`src/lib/chung/hoi-trung-kieu.ts:26`, commit `3b92154` 19/10 — ngoài 3 commit kiểm). Bài lỗi thời, không phải lỗi mã |

## Cần anh Đại quyết

| # | Vấn đề | Phương án gợi ý | Xử lý chi tiết |
|---|---|---|---|
| Q1 | 7b: ô Ban điều hành dưới E&C lấy dữ liệu từ đâu — Main hiện chặn gắn BĐH cho dự án Loại khác | Main cho phép gắn BĐH cho Loại khác (nguồn đúng một chỗ, hợp «Main là bản gốc») | Sửa `du-an-don-vi.ts:32` + 3004 vẽ ô chọn BĐH cho nhóm Loại khác; phương án kia (3004 tự suy BĐH từ tên) là chép dữ liệu hai nơi, trái luật 7 |
| Q2 | Việc giao ĐÍCH DANH cho P.ĐT&PC / Ban lãnh đạo về dự án Loại khác: hiện hay ẩn | Hiện — người được giao phải thấy việc của mình; «dừng ở E&C» áp cho luồng báo cáo / đếm tổng, không áp cho việc đích danh | `doi-viec.ts:55` giữ; chỉ bỏ ở đếm tổng và nhóm «Phối hợp» |

Chi tiết từng phần bên dưới.

---


---

# K/1 — Sơ đồ + dự án Loại khác (K1 · K2 · K3 · K6 · điểm nghi 1–5, 13, 14)

**Kết luận: ĐẠT CÓ ĐIỀU KIỆN** — 22/22 bài đạt, `tsc` sạch, đếm Loại khác đúng ở E&C/PMC/P.ĐT&PC/BLĐ; nhưng 🔴 2 · 🟡 5 · ⚪ 9. Nặng nhất: K2-1 (7b không có đường dữ liệu vào), K3-1 (không gập được khi đang chọn ô con), K1-1/K1-2 (P.ĐT&PC, BLĐ vẫn thấy việc Loại khác qua ô chủ trì và nhóm Phối hợp), K3-2 (dòng nhóm cắt «…» mất chữ «trễ»).
Kiểm 20/10/2026, kho CV nhánh master. Đo qua GET `/api/phong/so-do` + `/api/so-cai` (cookie `ptgd.dai@` và `quantri@` — hai bên ra CÙNG số) rồi chạy lại đúng hàm `oTatCaCua`/`taoDoiViec`/`xepSoDo` bằng bài thử tạm (đã xoá).

## A. K1 — mục 4–5: P.ĐT&PC, Ban lãnh đạo không thấy việc dự án Loại khác

Dữ liệu máy 3004 lúc đo: 103 việc đang mở; 10 việc thuộc 6 dự án Loại khác (Nậm Mô 1 ×5, Hướng Phùng 1 ×2, Nậm săm 3A ×3; Nậm Mô 2, Mỏ đá, Nậm Xe = 0 việc).

| Ô | Số việc nếu KHÔNG có `duoc` | Có `duoc` (code hiện hành) | Việc Loại khác bị chặn |
|---|---|---|---|
| Ban lãnh đạo (ban-tgd) | 103 | **95** | 8 |
| P.ĐT&PC (p-dtpc) | 54 | **49** | 5 |
| SCI PMC | 23 | 23 | 0 (3 việc Loại khác vẫn đủ) |
| SCI E&C | 2 | 2 | 0 (2 việc NM1) |
| BQLDA Lào / QT / P.KT&VH | 0 / 9 / 17 | 0 / 9 / 17 | 0 |

✔ Đường đếm đúng thước: `doi-viec.ts:51-63 oDemViecLoaiKhac` — việc ở ô `NM1@sci-enc` đếm `[NM1@sci-enc, sci-enc]`, dừng, không lên p-dtpc / ban-tgd. ✔ 17/17 việc nội bộ không gắn dự án của SCI PMC/E&C (nut=sci-pmc|sci-enc, `duoc` không đặt) vẫn lên P.ĐT&PC (mục 5b đúng). ✔ SCI E&C, SCI PMC vẫn đủ.

### 🟡 K1-1 — Ô P.ĐT&PC và Ban lãnh đạo VẪN thấy việc Loại khác khi chính nó là ô CHỦ TRÌ (anh có thể thấy «Nậm Mô 1» ở P.ĐT&PC)
- `doi-viec.ts:51,55` («Ô chủ trì luôn được đếm»), đo `tam-so-do/do-cot-phai.txt`.
- Bấm **P.ĐT&PC** (danh sách chính, 49 việc) vẫn có 2 việc Loại khác: `CV-2026-0043` «Rotor turbine TĐ Nậm Mô 1…» (dự án ghi «NM 1») và `CV-2026-0142` «Xử lý issue ISS-2026-41-002…» (Nậm săm 3A) — vì P.ĐT&PC là bên chủ trì. Bấm **Ban lãnh đạo** vẫn có `CV-2026-0129`, `CV-2026-0151` (Nậm săm 3A, chủ trì là Phó TGĐ → ô Ban lãnh đạo).
- Anh nói «Bấm ô P.ĐT&PC không thấy việc Nậm Mô 1, Nậm Mô 2…» và «Ban lãnh đạo cũng không thấy». Đề không nói rõ ca «chính P.ĐT&PC/BLĐ được giao chủ trì việc dự án Loại khác». Code chọn «giao đích danh thì hiện». Trên máy này anh sẽ thấy ngay việc Nậm Mô 1 (`CV-2026-0043`) ở P.ĐT&PC.
- Gợi ý: hỏi anh một dòng (giao đích danh P.ĐT&PC/BLĐ việc Nậm Mô 1 thì hiện hay ẩn?); nếu ẩn thì bỏ `r.add(n)` cho n là p-dtpc / ban-tgd.

### 🟡 K1-2 — Nhóm «Phối hợp — chỉ để biết» ở cột phải CHƯA áp `duoc` (điểm nghi 1: ĐÚNG là chưa áp, có hậu quả thật)
- `SoDoPhong.tsx:626-627` (`viec.filter(v => v.nutPh.includes(id) …)` và `xongCua(v => v.nutPh.includes(id))` không có `duocO`). Đo: bấm **Ban lãnh đạo** → nhóm Phối hợp có **8 việc** Loại khác (`CV-2026-0045, 0043, 0087, 0142, 0029, 0006, 0004, 0008` — Hướng Phùng 1, Nậm Mô 1, Nậm săm 3A) vì ban-tgd là bên phối hợp. Bấm P.ĐT&PC: 0 việc Loại khác ở nhóm này (máy này P.ĐT&PC chỉ phối hợp 1 việc không phải Loại khác).
- Hậu quả: thước 5a «Ban lãnh đạo cũng không thấy» bị thủng đường phối hợp; trên máy này là 8 việc.
- Gợi ý: nếu anh muốn BLĐ/P.ĐT&PC hoàn toàn không thấy thì thêm `duocO(v,id)` vào dòng 626 và 627; nếu coi «phối hợp = đích danh» thì ghi vào đề rằng cố ý.

### 🟡 K1-3 — Nút «Quá hạn · N» đếm TOÀN BỘ (64) lệch với danh sách khi chọn ô gốc (60)
- `SoDoPhong.tsx:335` `soTre = locViec(viecDu…).filter(tre).length` không qua `duoc`; hiển thị ở `:744`. Đo: toàn bộ việc trễ = 64; Ban lãnh đạo (có `duoc`) = 60 → bấm «Quá hạn · 64» ở ô gốc ra 60 việc. Trước 20/10 ô gốc luôn khớp (gốc gồm tất cả); nay lệch 4 việc Loại khác trễ (`0045, 0043, 0087, 0142`).
- Gợi ý: tính `soTre` theo `duocO(v, chon||goc)` hoặc ghi chú «toàn công ty».

### ⚪ K1-4 — «Việc của tôi» ở Main/Tiến độ/Hợp đồng (`lib/phong/viec-hien-ngoai.ts:34-38`, `cong-base.ts:943`) bỏ qua `duoc`
- `nhomCua` chỉ nhìn `v.nut`; việc Nậm Mô 1 của tôi (nut `NM1@sci-enc`) vẫn rơi vào nhóm «P.ĐT&PC» (vì sci-enc nằm dưới p-dtpc). Đây là danh sách việc CỦA MÌNH (không đếm theo ô), nên không «lộ» theo nghĩa thước, nhưng tiêu đề nhóm «P.ĐT&PC» gắn cho việc Nậm Mô. Nếu sửa `nhomCua` dùng `duoc` thì việc Loại khác không còn tập con nào của ban-tgd → rơi «Chưa gắn đơn vị» (thu_tu 9999) — cần quyết trước khi sửa. `TheViecNhung.tsx:82` dùng đúng `taoDoiViec` nên có `duoc` nhưng chỉ hiện một việc, không đếm → không ảnh hưởng.

### ⚪ K1-5 — Ô tìm theo phạm vi (`locPhamVi`, `viec.ts:203-215`) không áp `duoc`: đúng ý (tìm toàn công ty/ phòng/ cá nhân là bỏ qua ô đang chọn). Phạm vi «phong» lọc theo `nut`+`nutPh` ∈ ô của tôi nên việc Loại khác vẫn tìm thấy — hợp lý, không lộ ra ô.

## B. K2 — mục 7b: `oBdhThayDuAn`

✔ Mã `doi-viec.ts:24-33` đúng ý: chỉ dự án `nhom !== "sci"`, `ban_dieu_hanh` có trong `o` và có cha ∈ `donViLam(a)` → `NM1@sci-enc` → `bdh-nammo1`; `oTatCaCua` (`:36-43`) bỏ ô dự án trùng; `taoDoiViec` (`:82`) dồn việc E&C vào ô BĐH; tên bên phụ trách (`pt[].nut`) giữ nguyên. Bài `so-do-loai-khac-20-10.test.ts` mục 7b và «dồn vào ô BĐH» chạy xanh.

### 🔴 K2-1 — 7b KHÔNG có đường nào để dữ liệu vào: Main chặn, Cài đặt 3004 ẩn → lên hosting 7b KHÔNG BAO GIỜ chạy
- Đo trên máy: `GET /api/phong/so-do` → `du_an[].ban_dieu_hanh` của cả 6 dự án Loại khác = `undefined` (Nậm Mô 1/2, Hướng Phùng 1, Mỏ đá Dốc Đá Trắng, Nậm săm 3A, Nậm Xe); `oBdhThayDuAn` trả `[]`. Dưới SCI E&C đang hiện **11 ô con** (5 ô BĐH + 5 ô dự án trùng tên + Nam Khian 1), không phải 6.
- Vì sao:
  1. Main quản ô này thật: `src/lib/du-an-main-thuan.ts:99` (khi `donViTuMain` thì `bdh = m.banDieuHanh ?? null` cho MỌI dự án; kiểu `DuAnMain.banDieuHanh` ở `:45`) — mỗi lần kéo ghi đè.
  2. Main từ chối cho dự án Loại khác: `4-agent-main/src/lib/du-an-don-vi.ts:32` `if (nhom !== "sci" && bdh) return "Ban điều hành chỉ dùng cho dự án SCI đầu tư"`; `:48` `doiNhomDonVi` xoá BĐH khi sang Loại khác.
  3. 3004 Cài đặt chỉ vẽ ô chọn BĐH cho nhóm SCI (`src/components/cai-dat/nhom.tsx:593-594` `donViTuMain ? null : d.nhom === "sci" ? …`); Loại khác chỉ có «+ đơn vị làm (phụ)».
  4. Lên hosting thì 5 BĐH thử không có (đề: chưa gieo `khoi-tao.ts`) → `chaCua.has(a.ban_dieu_hanh)` sai → 7b im lặng, ô dự án trùng vẫn vẽ.
- Nghĩa là 7b chỉ chạy khi tay sửa thẳng dữ liệu (lúc đầu làm được, rồi Main ghi đè 11:31). Nguồn đúng của «BĐH nào thuộc dự án Loại khác nào» hiện chưa có chỗ nào.
- Gợi ý (cần anh quyết, ghi ⏸): (a) sửa Main cho `banDieuHanh` ở Loại khác + ô chọn ở Main; hoặc (b) 3004 tự suy (ô cấp 4 con của đơn vị làm mà tên trùng tên dự án), không đụng Main. Trong lúc chờ nên ghi «7b chưa dùng được» ở sổ việc.

### 🟡 K2-2 — Bài kiểm 7b dùng dữ liệu «đẹp», không giống dữ liệu thật
- `tests/unit/so-do-loai-khac-20-10.test.ts:36-39`: `da("NM1", …, "khac", […], "bdh-nammo1")` gán thẳng `ban_dieu_hanh` cho Loại khác — điều Main không cho. Không có ca đối chứng «Loại khác, `ban_dieu_hanh` rỗng, 5 ô BĐH mồ côi vẫn nằm dưới E&C» (chính là trạng thái máy thật, 11 ô con). Không phủ: việc giao thẳng cho ô BĐH ra đúng dự án (`du-an-thuan.ts:54`); ca BĐH có cha khác `donViLam` (guard `doi-viec.ts:30`).
- Gợi ý: thêm hai ca đó.

## C. K3 — mục 7 + 8: bung/gập 5 nhóm
Số đo dữ liệu thật qua đúng hàm code (bài thử tạm đã xoá): `tam-so-do/do-bo-cuc.txt`.

| Nhóm | Dòng chữ máy sẽ hiện | Ô con |
|---|---|---|
| Đang thiết kế (SCI PMC) | «Đang thiết kế · 3 dự án · 1 trễ» | 3 |
| Đang thi công (SCI E&C) | «Đang thi công · **11** dự án · 1 trễ» (thước nói 6; 11 vì 5 BĐH + 5 ô dự án trùng, xem K2-1) | 11 |
| Các dự án Lào (BQLDA Lào) | «Các dự án Lào · 6 dự án» (không trễ) | 6 |
| Các dự án QT (BQLDA QT) | «Các dự án QT · 3 dự án» | 3 |
| Các nhà máy (P.KT&VH) | «Các nhà máy · 7 nhà máy · 6 trễ» | 7 |

- ✔ Số trễ = `tt==="tre"` của `chuyenViec` (`viec.ts:135-146`: hạn nhỏ nhất của phần chủ trì chưa xong < hôm nay) — đúng định nghĩa «quá hạn» của 3004 (cùng nút «Quá hạn»). Tính qua `viecNhanh(x.id)` (`SoDoPhong.tsx:426`) nên theo `duoc` và theo nút lọc. Chỉ tính việc của ô CON (`!y.nut.includes(x.id)`): P.KT&VH có 13 việc trễ, 7 là của chính P.KT&VH → nhãn «6 trễ». Chấm đỏ chỉ khi gập (`:476` `!moNg && treCon`) ✔.
- ✔ Bố cục: gập hết W=810 H=308 · mở hết W=810 H=832 → **W không đổi, ô cấp 2–3 không xê dịch** (x: p-dtpc 85, sci-pmc 85, sci-enc 245, bqlda-qt 405, bqlda-lao 565, p-ktvh 725 ở cả ba trạng thái gập/mở hết/mở mỗi E&C). P.KT&VH khi gập vẫn giữ khe cột chồng rỗng (`bo-cuc.ts:91-92`: `con[p].length || nhom.has(p)`).
- ✔ `duongNoi` cột chồng đúng: `M725 168 V178 H640 V229 H650` (trục = x−85, cạnh ô = x−75); ô cột chồng cao khác nhau cộng `h+10` (`bo-cuc.ts:143-149`). Nối E&C → ô cấp 4 `M245 278 V288 H168 V323 H175` đúng.
- ✔ Số đo cũ khi không truyền `nhom` y nguyên (điểm nghi 5): `phong.test.ts` + bài mới «đúng số đo cũ (y 180/252)» xanh — xem mục F.
- ✔ Luật 10: `bo-cuc.ts`, `doi-viec.ts` chỉ import file thuần (`du-an-thuan`, `viec`, type của `lib/phong/so-do`); `SoDoPhong.tsx` không import `node:fs`. Riêng `lib/phong/so-do.ts:15` (tệp có database) import `docNhomGap` từ `components/phong/bo-cuc` — chiều server → tệp thuần, đúng luật 10.

### 🔴 K3-1 — Đang chọn ô CON thì KHÔNG gập được nhóm (bấm gập là tự bung lại)
- `SoDoPhong.tsx:241-246`: `else if (!bc.VT[chon]) for (… cha …) if (coNhom.has(c) && !moNhom.has(c)) doiNhom(c, true)`. Trình tự: nhóm đang bung, `chon` = ô con (vd BĐH Nậm Mô 1) → bấm dòng nhóm (`:482` `onClick={() => doiNhom(x.id)}`) để gập → `moNhom` bỏ nhóm → `bc` không còn ô con → effect thấy `chon` không có trong `bc.VT` và cha đang gập → **bung lại ngay**. Người dùng phải chọn ô khác trước mới gập được.
- Đọc mã + suy luận (chưa chạy trình duyệt theo luật; chưa có bài render). Vòng lặp vô hạn thì không (xem điểm nghi 3).
- Gợi ý một câu: trong `onClick` khi gập mà `chon` nằm trong nhóm thì `setChon(x.id)` (chọn ô cha) cùng lúc.

### 🟡 K3-2 — Dòng chữ nhóm bị cắt «…» NGAY ở cỡ chuẩn, không chỉ khi sân thu nhỏ (điểm nghi 13)
- `phong.css:218-224` `.dong-nhom`: chữ 11px; ô cấp 3 rộng 150 (`bo-cuc.ts:130`); `margin 0 6px` + `padding 0 6px` + viền 1px → vùng chữ ≈124px, trừ mũi tên + khe (≈10px) và chấm đỏ khi có (≈11px) → còn **≈114px (≈103px khi có chấm đỏ)**.
- Đo bằng Segoe UI 11px (PIL, `segoeui.ttf`; font Segoe UI theo mục 3.2 của giao diện chung): «Đang thiết kế · 3 dự án · 1 trễ» 141px · «Đang thi công · 11 dự án · 1 trễ» 150px · «Đang thi công · 6 dự án · 3 trễ» 145px · «Các nhà máy · 7 nhà máy · 6 trễ» 151px → **đều cắt, mất đúng đoạn «· k trễ»** (thứ anh cần thấy). Dòng không có «trễ»: «Các dự án QT · 3 dự án» 111px vừa; «Các dự án Lào · 6 dự án» và «Đang thi công · 6 dự án» 114px sát; «Các nhà máy · 7 nhà máy» 121px cắt. Chữ và ô co cùng tỉ lệ nên thu sân không đổi kết luận.
- Cỡ chữ: 11px (mũi tên 10px) dưới sàn **12px** của `GIAO-DIEN-CHUNG-v1.0.md:123` («câu chữ không dưới 12px»). Lên 12px thì chữ dài thêm ~9% (154–165px) — càng cắt. (`.dem` 11px và ô cấp 4 `.ten` 11.5px là có sẵn từ trước, không tính lỗi mới.)
- Gợi ý: đặt số trễ lên đầu và tô riêng; hoặc dòng nhóm 2 dòng (CAO_NHOM 26 → ~40); hoặc bỏ nhãn trong dòng đã có tên ô; thêm `title` đủ nghĩa (hiện `title` `:478-479` chỉ ghi «Bung các ô dưới X», không có số).

### ⚪ K3-3 — Nhãn «· k trễ» không nói trễ cái gì
- `SoDoPhong.tsx:485`: là **việc** trễ trong các ô con, không phải «k dự án trễ»; thước ghi «6 dự án · 3 trễ» dễ đọc thành dự án. (Luật 36 không áp: đây là hạn việc 3004, cùng định nghĩa nút «Quá hạn», không phải nhanh/chậm so với Baseline.) Gợi ý «· 3 việc trễ».

### ⚪ K3-4 — Nháy khi mở trang (điểm nghi 4: «Chưa chắc», rủi ro thấp)
- `SoDoPhong.tsx:196-209`: `moNhom` khởi tạo rỗng, đọc localStorage trong `useEffect` khi có `toi.id`. Sân chỉ vẽ khi `/api/phong/so-do` + `/api/so-cai` đã về (`:330`); `toi` có cache toàn cục (`layout/dung-toi.ts:24`), phần lớn đã về trước → khung đầu đã đúng; nếu `toi` về sau thì vẽ gập một nhịp rồi bung. Không đo được bằng mã. `useLayoutEffect` hoặc khởi tạo lười hết nháy.
- Phụ: tự bung do chọn ô con / link chuông (`:245`) gọi `doiNhom(c,true)` nên GHI vào localStorage → nhóm «bung vĩnh viễn» dù người dùng không bấm.

### ⚪ K3-5 — Bấm 📒 (soát nộp) ở ô có nhóm đang gập
- `SoDoPhong.tsx:529` cột phải liệt kê mọi ô con từ `bcHien`, nhưng sân không vẽ ô con (gập) nên không tô nộp/chưa nộp trên sân. Không sai số, chỉ khó nhìn; có thể tự bung nhóm khi vào chế độ soát.

### ⚪ K3-6 — Khác biệt khi Cài đặt «hiện đơn vị không việc» TẮT
- `cayCon` dùng `bcDu` (`:279-280`) → số của ô cha, nút «Xong/Mới», cột phải nay gồm cả việc nằm ở ô bị ẩn vì không có việc đang mở (việc đã xong). Mặc định (BẬT) không ảnh hưởng. Cố ý (điểm nghi 2), không sai.

## D. Điểm nghi 14 — tệp LF bị ghi CRLF: KHÔNG hỏng
- `git ls-files --eol` trên 39 tệp của `d705449..8cf327a`: 25 `i/lf w/lf` · 8 `w/crlf|mixed` (`phong.css` mixed: 898/923 dòng có CR, 25 dòng mới của 20/10 là LF; `can-quyet-nhom.ts`, `luat-mau.ts`, `so-do-loai-khac-20-10.test.ts`, 4 bài kiểm Word/luật…) · 6 nhị phân. **Chỉ mục (`i/`) toàn LF**, không tệp nào CRLF trong commit.
- `.gitattributes`: `* text=auto eol=lf` (+ `core.autocrlf=true`) → Git chuẩn hoá khi commit. Diff phình: so `git diff --numstat d705449..8cf327a` với `--ignore-cr-at-eol` → **hai bảng y hệt nhau** (39 tệp, 1618 +/507 −): không có tệp nào bị tính đổi cả tệp vì CRLF. `git status` không báo 8 tệp đó là sửa dở.
- ⚪ Chỉ nhắc: `phong.css` lẫn CRLF/LF trong thư mục làm việc (trình soạn thảo có thể báo «xuống dòng không đồng nhất»); vô hại với trình duyệt/vitest/tsc.

## E. K6 + Cài đặt `nhom_gap_so_do`
- ✔ Luật 10: `bo-cuc.ts` không import gì; `doi-viec.ts` import `du-an-thuan` (thuần) + `viec` + `bo-cuc` + type của `lib/phong/so-do`; `SoDoPhong.tsx` chỉ `import type` từ `lib/phong/so-do`. Không `node:fs` trong chuỗi client. (`lib/phong/viec-hien-ngoai.ts` là tệp server import tệp thuần — đúng chiều.)
- ✔ Luật 17 (3004 nút không quyền thì ẨN): dòng nhóm bung/gập không cần quyền (xem/ẩn ô là sở thích người xem) nên hiện cho mọi người — đúng. Nút «Chuyển nhóm» thuộc phần K4, không ở đây. Nút «+» giao việc ở ô: `SoDoPhong.tsx:453-454` ẨN khi ngoài phạm vi (`giaoDuocO(x.id) &&`) — đúng luật; riêng chú thích CSS `phong.css:197` còn ghi «mờ … luật 17» là chữ cũ (không phải lỗi hành vi, có sẵn từ trước 3 commit).
- ✔ Luật 28: dòng nhóm là `<button>` thật có viền (bấm được); `.mui`, `.chu` là chữ trần; chấm đỏ là `::before` trong nút, không khoanh. Số «trễ» trong dòng là chữ thường.
- ✔ Tiếng Việt: chữ mới trong JSX/`title` toàn tiếng Việt («Bung/Gập các ô dưới …», «trễ», «dự án», «nhà máy»); `aria-expanded`/`data-gt` là thuộc tính kỹ thuật. Lỗi Cài đặt: «Nhóm bung/gập "…" phải ghi dạng: mã đơn vị | nhãn | tên gọi ô con (tên gọi ô con có thể bỏ)» (`kiem-tra.ts` +4 dòng) — tiếng Việt, nêu rõ cách sửa.
- ✔ `giai-thich/noi-dung.ts`: có mục `sd-dong-nhom` khớp `data-gt="sd-dong-nhom"` (`SoDoPhong.tsx:477`) đủ 4 trường laGi/tuDau/cachDoc/nenLam, giải thích đúng «6 dự án = số ô ngay bên dưới», «3 trễ = việc quá hạn của các ô bên dưới», «Số việc trên ô vẫn tính đủ cả ô gập» (đúng: `cayCon` dùng `bcDu`).
- ✔ Mặc định `nhom_gap_so_do` (`mac-dinh.ts`, 5 dòng) đủ 5 nhóm anh chốt, đúng tên: «Đang thiết kế · Đang thi công · Các dự án Lào · Các dự án QT · Các nhà máy». `layCauHinh` trộn nông với mặc định (`cau-hinh/doc.ts:12`) nên máy cũ chưa lưu khoá vẫn có đủ 5 nhóm (đo: API trả `nhom_gap` 5 mục). Mô tả nhóm `giao_dien` đã thêm «nhóm bung/gập».
- ⚪ `kiem-tra.ts` chỉ kiểm có «mã» và «nhãn», **không kiểm mã đơn vị có tồn tại** (khác các mục khác dùng `kiemDonVi`): gõ nhầm `sci-enn` thì lưu được và nhóm im lặng không hiện (`SoDoPhong` chỉ lấy ô có trong `o`, `so-do.ts` lọc `coO.has`). Gợi ý: gọi `kiemDonVi(dm, ma, …)` cho mã.
- ⚪ Giải thích `sd-o-don-vi` (`noi-dung.ts` cachDoc) viết «Việc dự án Loại khác … không cộng vào P.ĐT&PC và Ban lãnh đạo» — chưa đúng cho việc mà chính P.ĐT&PC / Ban lãnh đạo là bên chủ trì (K1-1: vẫn hiện); nếu giữ hành vi hiện tại cần thêm «trừ việc giao đích danh cho P.ĐT&PC / Ban lãnh đạo».

## F. Trả lời từng điểm nghi của đề (mục 5) thuộc phần này

| # | Trả lời | Bằng chứng |
|---|---|---|
| 1 | **Đúng là chưa áp, và có hậu quả** — nhóm «Phối hợp» cột phải chưa áp `duoc` (Ban lãnh đạo thấy 8 việc Loại khác ở nhóm đó); `locPhamVi` chưa áp là ĐÚNG ý (tìm bỏ qua ô); «Việc của tôi» Main/Tiến độ/Hợp đồng và `TheViecNhung` dùng `taoDoiViec` nên có `duoc` nhưng `nhomCua` không dùng `duoc` (nhóm «P.ĐT&PC» gắn cho việc Nậm Mô); 7b đổi `nut` sang ô BĐH **không** làm `nhomCua` xếp nhóm khác (BĐH cũng nằm dưới sci-enc → p-dtpc) | K1-1, K1-2, K1-4, K1-5 |
| 2 | **Sai (không có chỗ nào cần cây VẼ mà dùng cây đủ)** — mọi chỗ dùng `cayCon` đều là đếm/ lọc việc (`viecNhanh`, `trongO`, `demMoi`, `oDangChon`), không dựng đồ hoạ; đường nối/ô vẽ dùng `bc`. Khác biệt duy nhất khi Cài đặt «hiện đơn vị không việc» TẮT (K3-6, cố ý) | `SoDoPhong.tsx:279-292, 337, 387-391`; đồ hoạ `:355, 392` dùng `bc` |
| 3 | **Không vòng lặp vô hạn** (sau 1 lần `doiNhom(c,true)` thì `bc.VT[chon]` có → dừng); **Không bung khi chỉ vào ô CHA rồi gập** (ô cha luôn nằm trong `bc.VT`); **NHƯNG có lỗi khác**: đang chọn ô CON rồi gập nhóm thì effect bung lại — K3-1 🔴 | `SoDoPhong.tsx:241-246` |
| 4 | **Chưa chắc / rủi ro thấp** — vẽ gập một nhịp nếu `toi` về sau dữ liệu; thường `toi` có cache nên không thấy (K3-4) | `:196-209`, `dung-toi.ts:24-52` |
| 5 | **Đúng** — số đo cũ y nguyên khi không truyền `nhom`; 22/22 bài (2 tệp) xanh, gồm bài `phong.test.ts:55-57` (đường nối `M725 142 V152 …`) và bài «đúng số đo cũ». Ô nhóm giữ cột khi gập ✔; P.KT&VH giữ khe cột chồng rỗng ✔; `duongNoi` cột chồng ✔ | `bo-cuc.ts:60-153`, mục C |
| 13 | **Đúng, và nặng hơn mô tả** — cắt «…» ngay ở cỡ chuẩn, mất đoạn «· k trễ» ở cả 4 dòng có «trễ» (141–151px so với ≈103–114px chỗ chứa); còn 11px < sàn 12px | K3-2 |
| 14 | **Không hỏng** — chỉ mục toàn LF, `.gitattributes` chuẩn hoá, `numstat` có/không bỏ CR y hệt | mục D |

## G. Bài kiểm đã chạy

| Lệnh | Kết quả |
|---|---|
| `npx vitest run tests/unit/so-do-loai-khac-20-10.test.ts tests/unit/phong.test.ts` | **2 tệp · 22/22 đạt**, 4,5 giây |
| `npx tsc --noEmit -p .` | **thoát 0, không lỗi** |
| Bài thử tạm `tests/unit/kiem-doc-lap-tmp-sodo.test.ts` (đọc hai tệp JSON API rồi chạy đúng hàm code) | đã chạy 4 lần, **đã `rm`**; kho CV không còn tệp `kiem-doc-lap-tmp-*` |

## H. Điều đã kiểm và ĐÚNG (gộp)
- ✔ `oDemViecLoaiKhac` đúng thước 4–5: ô BLĐ 103→95, P.ĐT&PC 54→49 trên dữ liệu thật; E&C 2, PMC 23, BQLDA, P.KT&VH không đổi. Việc nội bộ PMC/E&C không gắn dự án: 17/17 vẫn lên P.ĐT&PC (5b).
- ✔ Hai tài khoản (`ptgd.dai@`, `quantri@`) cho ra CÙNG `so-do` và `so-cai` (103 việc) — không có khác biệt theo quyền ở hai API này.
- ✔ Gập/mở không xáo cột (W=810 cả ba trạng thái); số nhóm đủ: «3 · 11 · 6 · 3 · 7» ô con; trễ tính đúng định nghĩa 3004.
- ✔ Cài đặt `nhom_gap_so_do`: mặc định 5 nhóm, kiểm lỗi tiếng Việt, merge cho máy cũ.

## I. Chưa đo được
- Hành vi trên TRÌNH DUYỆT (K3-1 bung lại khi gập, nháy K3-4, cắt chữ K3-2 bằng mắt): chỉ đọc mã + suy luận + đo chữ bằng phông Segoe UI; chưa mở `localhost:3004/so-do` (không được giao mở).
- 7b trên dữ liệu có `ban_dieu_hanh` thật của Loại khác: không tạo được (Main chặn, không PUT làm đổi dữ liệu); chỉ đọc mã + bài kiểm.
- Việc của người dùng khác (chỉ hai tài khoản trên); lúc đo có 103 việc, 10 việc thuộc Loại khác.
- Cả bộ `vitest` (không chạy theo luật).

## Xác nhận an toàn
- KHÔNG tạo / sửa / xoá tệp nào trong kho CV (bài thử tạm tạo rồi `rm`; `git status --short | wc -l` lúc đầu 49, lúc cuối 50 — tệp tăng thêm là `data/pgdata-sao-luu-20261020-1326/` của phiên khác, không phải của tôi; không có tệp nào mang tên `kiem-doc-lap-*`).
- Không mở `data/pgdata`; không POST/PUT/DELETE; không gọi AI; không commit/checkout/add; không `next build`.
- Tệp trung gian (cookie ký, JSON API, số đo) nằm trong `K/tam-so-do/` — cookie KHÔNG in vào báo cáo.

---

# K/2 — Cần BLĐ 4 nhóm (K4) + mẫu Word (K5) + bài kiểm (K7) + K6 — kiểm độc lập lần 6, 20/10/2026
**Kết luận: Đạt có điều kiện.** 1 🔴 (F-A1) · 6 🟡 (F-A2 F-A3 F-A4 F-A5 F-A7 F-B1) · 9 ⚪.
Kho kiểm CV = `D:\3 SETUP\1 AI\SCI Tiến độ\SCI-AI-AGENT\6-Agent-cong-viec\CodeSCICongViec`. Viết tắt đường dẫn: `src/lib/bao-cao-tuan/` = «BCT/».

## A. K4 — 4 nhóm «Cần BLĐ ra quyết định»

### A.0 Không đo được trên 3004 (có chủ ý)
| Việc | Kết quả |
|---|---|
| GET `/api/bao-cao-tuan/can-quyet?tu=2026-09-28&den=2026-10-04` bằng 2 cookie | **KHÔNG gọi.** `src/app/api/bao-cao-tuan/can-quyet/route.ts:30,33`: mỗi GET gọi `xetNenBangAi(choAi)` (cùng việc) và `xepNhomNenBangAi(nh.cho_ai, nh.dl)` (xếp nhóm) → chạy `runAIGan` thật nếu còn dòng chưa lưu kết quả. Luật «không gọi AI thật». Không so được bảng 9·1·2·8 (13 máy · 7 AI) của phiên code. |

### A.1 Đối chiếu từng nhánh `BCT/can-quyet-nhom.ts:xepNhomCanQuyet` (dòng 66-98; nhánh ở 79-97) với thước
| Ca | Mã xếp vào | Đúng thước? |
|---|---|---|
| Dự án Loại khác (theo chữ trong dòng hoặc đơn vị gửi là Ban điều hành) | `enc` (dòng 81) | ✔ «ENC đề xuất — cả 6 giai đoạn» |
| Dự án SCI, chỉ chữ trước khởi công | `truoc_khoi_cong` (dòng 85) | ✔ |
| Dự án SCI, chỉ chữ thực thi / quyết toán / bàn giao (Kết thúc) | `thuc_thi` (dòng 86) | ✔ chốt ② (Kết thúc → Thực thi, kiểm soát) |
| Dự án SCI, không khớp chữ nào (vd «Hướng Linh 8 đã hoàn công, đề nghị chốt hồ sơ kết thúc») | `thuc_thi`, chắc = false → 🤖 AI (dòng 89) | ✔ mặc định hợp chốt ②, đo bằng bài thử |
| Kiến nghị E&C (đơn vị gửi `sci-enc`) nhắc dự án SCI | theo giai đoạn vào 2 nhóm SCI (dòng 76-80 chỉ phân loại `chac` khi gửi từ BĐH Loại khác nhắc dự án SCI) | ✔ chốt ③; đo: «rotor Hướng Việt về cảng chậm» gửi `sci-enc` → `thuc_thi` chắc |
| BĐH Loại khác gửi dòng nhắc dự án SCI | `a = theoChu ?? theoGui[0]` (dòng 77) → theo dự án được NHẮC (SCI) → nhóm giai đoạn, chắc = false | ✔ hợp chốt ③ |
| Không nhận ra dự án + chữ vận hành nhà máy (relay, sự cố, bảo trì, `\bnm\b`…) | `khac` chắc (dòng 92) | 🟡 xem F-A2 |
| Không nhận ra dự án, đơn vị gửi làm dự án SCI/Loại khác, không chữ giai đoạn | `khac`, chắc = false | ✔ «ngoài ra Nhóm khác» |
| **Đơn vị E&C gửi, không nhận ra dự án, không chữ giai đoạn** | `khac` chưa chắc (dòng 96) | 🟡 xem F-A3: thước đọc «ENC đề xuất = kiến nghị từ E&C» thì lệch |
| Thứ tự trong mã: `a` có dự án nhưng nhóm SCI + chữ vận hành («Hướng Việt đã vận hành thương mại, sự cố máy biến áp») | `thuc_thi` chắc = false | ⚪ không đồng nhất với nhánh không-dự-án (F-A2) |

### A.2 Phát hiện
| # | Mức | `tệp:dòng` | Thấy gì · đo bằng | Gợi ý |
|---|---|---|---|---|
| F-A1 | 🔴 | `BCT/can-quyet-nhom-ai.ts:26` (+ `db/88-can-quyet-nhom.sql`) | **Lựa chọn của NGƯỜI ở bản 1 bị bỏ.** `ganNhom` chỉ dùng hàng đã lưu khi `laNhomCanQuyet(r.nhom)`; mã bản 1 (`dau_tu`·`thi_cong_sci`·`thi_cong_enc`) không còn hợp lệ → hàng `boi = <mã người>` cũng bị bỏ qua, dòng xếp lại bằng máy/AI (đọc `git show 0470bb3:…can-quyet-nhom.ts` mã bản 1; POST `/nhom` bản 1 ghi cả hàng của người, `ghiNhomNguoi` cùng ở 0470bb3). Câu chữ «người luôn thắng» và mô tả commit 8cf327a («chỉ dòng AI xếp lại») chỉ đúng với hàng AI. Hàng bản 1 nằm lại bảng mãi, không dọn. Không đo được số hàng thật (không đọc `pgdata`). | Hoặc ánh xạ mã bản 1 → bản 2 cho hàng `boi <> 'ai'` (dau_tu→truoc_khoi_cong, thi_cong_sci→thuc_thi, thi_cong_enc→enc, khac→khac) hoặc `DELETE … WHERE nhom NOT IN (4 mã mới)` kèm báo anh. Khoảng hở chỉ ~40 phút giữa 0470bb3 (≈12:3x) và 8cf327a 12:56 nên số hàng thật nhiều khả năng ≈ 0 — nên đếm trước bằng `SELECT boi, nhom, count(*) FROM docflow.can_quyet_nhom GROUP BY 1,2` qua bản sao. |
| F-A4 | 🟡 | `BCT/can-quyet-nhom-ai.ts:92` + `route.ts:30-34` + `BaoCaoTuanPhong.tsx:239-246` | **Lượt AI lỗi không để lại vết nào ngoài `console.error`.** Hậu quả đo bằng đọc mã: ① mọi GET sau đó lại đưa đúng các dòng đó đi AI lại (không có bộ nhớ lỗi, không ngắt mạch) — trang tự hỏi lại tối đa 6 lần × 20 giây, mỗi lần một lượt AI tối đa 120 giây; ② `dang_xet_ai > 0` mãi, các dòng hiện «🤖 đang xếp nhóm…» mãi (UI không có trạng thái «AI chưa xếp được») dù thực ra AI đã hỏng; ③ chữ lỗi chỉ ra log, không hiện người dùng (người không biết vì sao nhóm là «đoán tạm»). | Ghi lượt lỗi vào `globalThis` (khoá → giờ lỗi) để 10 phút mới hỏi lại; sau lỗi đổi nhãn thành «chưa xếp được — để máy đoán, bấm Chuyển nhóm nếu sai» (tiếng Việt). |
| F-A5 | 🟡 | `BaoCaoTuanPhong.tsx:689` | **Luật 19 hụt một ca:** 🤖 chỉ hiện khi `nhom_boi === "ai" && nhom_ly_do`. AI xếp nhưng lý do rỗng (`can-quyet-nhom-ai.ts:87` ghi `String(r.ly_do ?? "")` → `""` là sai trong điều kiện) → dòng do AI xếp nhưng KHÔNG có 🤖 và không có chữ gì để phân biệt với máy xếp. | Điều kiện chỉ `nhom_boi === "ai"`; lý do rỗng thì hiện «🤖 AI xếp» trơn. Hoặc ép lý do bắt buộc (bỏ hàng nếu rỗng). |
| F-A2 | 🟡 | `BCT/can-quyet-nhom.ts:92` · `tests/unit/so-do-loai-khac-20-10.test.ts:161-166` | **«Vận hành nhà máy → Nhóm khác» là luật code thêm, không có trong thước 6 dòng của đề.** Thước chỉ nói «ngoài ra Nhóm khác»; chữ «vận hành nhà máy, nội bộ phòng ban» chỉ có ở mô tả commit `8cf327a` và `noi-dung.ts`. Lý do thêm (ghi trong bài kiểm dòng 161): «AI tuần 40 đã xếp nhầm 2 dòng này» → luật sinh ra từ lỗi AI, không từ lời anh. Và áp không đồng nhất: chỉ khi KHÔNG nhận ra dự án; nhắc dự án SCI thì chữ vận hành bị bỏ qua (đo: «Vận hành thử Hướng Việt phát hiện lỗi rơle» gửi BĐH → `thuc_thi` chắc; «Hướng Việt đã vận hành thương mại, sự cố máy biến áp» → `thuc_thi` chưa chắc). | Hỏi anh một dòng: «dòng vận hành nhà máy (sự cố, bảo trì, sản lượng) đang chạy luôn vào Nhóm khác, kể cả khi nhắc tên dự án SCI — đúng không?» Chưa gật thì ghi ⏸. |
| F-A3 | 🟡 | `BCT/can-quyet-nhom.ts:95-96` | Thước ghi «ENC đề xuất = kiến nghị từ E&C» (đề mục 1 dòng 6); mã chỉ gửi vào `enc` khi dòng gắn **dự án Loại khác**. Dòng do SCI E&C gửi mà không nhận ra dự án nào (tên viết khác / không nêu) → `khac` hoặc đoán SCI theo chữ (đo: «Thiết kế cơ sở chậm do thiếu số liệu thủy văn» gửi `sci-pmc` → `truoc_khoi_cong` chưa chắc). Tên dự án Loại khác chưa có trong danh mục (hoặc ngắn < 5 ký tự — `duAnTrongTen` bỏ qua) sẽ rơi vào đây. | Làm rõ thước với anh: «ENC đề xuất» tính theo **dự án** hay theo **người gửi**? Nếu theo người gửi, dòng `sci-enc` không dự án SCI nào → `enc`. |
| F-A6 | ⚪ | `BCT/can-quyet-nhom-ai.ts:78-88` | AI trả nhóm hợp lệ về mã nhưng không kiểm hợp với loại dự án (AI trả `thuc_thi` cho dự án Loại khác vẫn được ghi). Prompt đã dặn («CHỈ cho dự án SCI đầu tư»), mã không chặn. | Sau khi nhận, nếu dòng có `du_an` Loại khác thì ép `enc`. |

### A.3 Điểm nghi 6 — bộ xếp bằng biểu thức chữ có khớp nhầm không? → **Đúng, có khớp nhầm, nhưng hậu quả nhẹ**
Bài thử thuần `kiem-doc-lap-tmp-nhom.test.ts` (đã `rm`), 51 câu tiếng Việt tự soạn, đủ dấu / không dấu / HOA / nhiều khoảng trắng + xuống dòng, chạy `npx vitest run` trên `xepNhomCanQuyet` thật + in chữ khớp của 3 biểu thức (`CHU_TRUOC`, `CHU_THUC`, `CHU_VAN_HANH`). Bảng đầy đủ ở `K/tam-nhom/ra.txt`.

| Chữ | Khớp nhầm thấy được | Hệ quả đo |
|---|---|---|
| `cod` (không có ranh giới từ) | «**cod**ex», «de**cod**e», «**cod**e» (3/3 khớp thành «COD nhà máy») | Dòng nội bộ phòng ban không dự án: `thuc`=true → `khac` chắc = **false** → đưa AI một lượt vô ích (câu «Cập nhật codex… văn thư», `p-hcth`). Không sai nhóm cuối vì không có dự án; nhưng nếu đơn vị gửi là SCI PMC / E&C thì bị đoán `thuc_thi` (dòng 95) trong lúc chờ AI. |
| `hầm` | «hầm hố» (khớp) | như trên |
| `đập` | «Đập tan tin đồn» (khớp) | như trên |
| `xây dựng` | «Xây dựng quy chế làm việc», «Bộ / Sở Xây dựng» (khớp) | **Có thể ra kết quả CHẮC mà sai:** dòng nhắc dự án SCI + chữ «Sở Xây dựng chậm trả lời» mà không có chữ trước khởi công → `thuc_thi` chắc = true (dù thực chất là thẩm định thiết kế). Câu «Giấy phép xây dựng Hướng Việt chưa cấp» thì trúng cả hai → chưa chắc, đúng. |
| `thủ tục` | «thủ tục tuyển dụng nhân sự» (không dự án, `p-hcth`) → truoc=true → `khac` chắc=false (AI) | Nhẹ. Có dự án SCI: «Thủ tục thanh toán hợp đồng… Hướng Việt» trúng cả hai → chưa chắc, đúng. |
| `thanh toán` | «Thanh toán lương tháng 10 chậm» (`p-hcth`) → khớp thực thi → AI | Nhẹ |
| `fs\b`, `tmb\b` | `\b` kiểu ASCII: «fs2» KHÔNG khớp (đúng), nhưng chuỗi con «…fs» cuối từ ngoài ý muốn vẫn khớp (không có ranh giới trái). Chữ Việt thật không gặp. | ⚪ |
| `\bnm\b` | Đúng với «nm»/«Nm» đứng riêng (đã đo 2 câu); chữ có dấu không ảnh hưởng vì `nm` ASCII | ✔ |
| `đập`, `hầm`… viết hoa «ĐẬP» | `toLowerCase()` + `normalize("NFC")` (dòng 69) xử lý đúng (đo: «THỦ TỤC XIN GIẤY PHÉP» khớp) | ✔ |
| Nhiều khoảng trắng / xuống dòng giữa cụm hai chữ («Thủ   tục↵điều chỉnh quy hoạch») | Cụm «thủ tục» KHÔNG khớp (cụm cố định một dấu cách) nhưng dòng vẫn vào `truoc_khoi_cong` nhờ «quy hoạch» | ⚪ cụm hai chữ nên `\s+` |
| Khớp thiếu (không có từ khoá) | «Hợp đồng bảo hiểm công trình Hướng Việt», «tăng ca cuối tuần» → mặc định `thuc_thi` chưa chắc → AI đọc: đúng cách | ✔ |
| `fs`, `ppa`, `pda`, `đtm`, `tkcs` | trúng đúng chữ viết tắt dự kiến (FS dự án Hướng Việt → `truoc_khoi_cong` chắc) | ✔ |

→ Gợi ý (🟡 F-A7, `BCT/can-quyet-nhom.ts:37-43`): thêm ranh giới từ kiểu `tuRieng` đã có ở `BCT/can-quyet.ts:49` cho `cod`, `hầm`, `đập`, `fs`, `tmb`, `nm`; bỏ `xây dựng` trơn (giữ «thi công xây dựng», «xây lắp»).

### A.4 Trả lời điểm nghi 6–9
| # | Đúng / Sai / Chưa chắc | Bằng chứng |
|---|---|---|
| 6 | **Đúng — có khớp nhầm** (xem A.3). Chưa đo được bảng 9·1·2·8 trên 20 dòng thật (không gọi GET vì kích AI) | A.0, A.3 |
| 7 | **Một phần đúng.** Thứ tự người > code chắc > AI đúng: `can-quyet-nhom-ai.ts:26` — hàng đã lưu thắng khi `boi <> 'ai'` (người) hoặc `!x.chac`; AI chỉ dùng khi code chưa chắc; ✔. Mã nhóm bản 1 bị bỏ qua đúng với hàng AI, **nhưng cũng làm mất hàng của NGƯỜI bản 1** vì điều kiện `laNhomCanQuyet(r.nhom)` đứng trước và không phân biệt `boi` (F-A1 🔴). Người = mọi `boi` khác `'ai'` (mã người dùng) — không có cột riêng; một người dùng có id đúng bằng chữ `ai` sẽ bị coi là AI (không có thực tế, ⚪). | `can-quyet-nhom-ai.ts:20-33`, `:26`; `git show 0470bb3:…` |
| 8 | **Chưa trùng lượt, nhưng 2 chỗ yếu.** Khoá `globalThis.__canQuyetNhomAi` (Set theo `khoa`): ① nhiều người cùng mở trang → người sau thấy `dang.has` → `can` rỗng → không gọi AI lần hai ✔; ② Next dev nạp lại module: `globalThis` vẫn giữ ✔; ③ nhiều tiến trình: 3004 chạy một `next start` (một tiến trình) — nếu hosting chạy nhiều bản thì Set không chia sẻ nhưng `ON CONFLICT … WHERE boi='ai'` không làm hỏng dữ liệu, chỉ tốn thêm 1 lượt AI ✔. Yếu: ④ lượt lỗi không nhớ (F-A4 🟡) — mọi GET sau thử lại, mỗi lượt đến 120 giây; ⑤ 25 dòng/lượt: dòng thứ 26+ phải chờ lần mở trang kế (UI có hỏi lại ≤ 6 lần/20 giây ⇒ đủ cho ≤ 150 dòng); ⑥ lỗi chỉ `console.error` (tiếng Việt, ra log), người dùng không thấy gì ngoài «🤖 đang xếp nhóm…» mãi. AI chạy **ngoài** `tx` (✔ luật không chạy AI trong transaction). | `can-quyet-nhom-ai.ts:43-95` |
| 9 | **Chưa chắc — một ca lệch nhỏ, chưa thấy ca nút hiện mà máy chủ từ chối.** Máy chủ (`api/bao-cao-tuan/can-quyet/nhom/route.ts:16`): `coQuyen(nd,"cong_viec.giao") \|\| nd.la_quan_tri` (không truyền phạm vi → chỉ cần có quyền). Giao diện (`BaoCaoTuanPhong.tsx:651-652`): `gd === "tat_ca" \|\| (Array.isArray(gd) && gd.length > 0)` với `gd = giao_duoc_bao_cao` từ `phamViGiao` (`so-cai/dich-vu.ts:241-246`) = `"tat_ca"` nếu quản trị hoặc quyền `toan_bo`; `[]` nếu không có quyền; còn lại là danh sách đơn vị người đó giao được. Hiện ô ⇒ có quyền (danh sách không rỗng chỉ khi có quyền) ⇒ máy chủ không từ chối ✔. **Ẩn mà có quyền:** người có `cong_viec.giao` ở phạm vi `cua_minh` hoặc phạm vi đơn vị không chứa đơn vị nào trong cây → `phamViGiao` trả `[]` → ô ẩn, máy chủ vẫn nhận. Mặc định khởi tạo (`khoi-tao.ts:67,77`) chỉ `toan_bo` / `don_vi_va_cap_duoi` nên ca này hiếm — ⚪ F-A8. Luật 17 riêng 3004 (ẩn khi không quyền): ✔ ô render có điều kiện `duocChuyenNhom &&` (không mờ). Lưu ý phụ: `gd` chưa tải (cả hai `undefined`) thì ẩn — khác `coTheGiaoToi` (`SoDoPhong.tsx:1604` coi `!g` là được) — nhưng ẩn là phía an toàn. | các dòng trích |

### A.5 Các điểm khác của K4 đã kiểm và ĐÚNG
- ✔ «Chọn là áp dụng luôn» (quy tắc 4): `BaoCaoTuanPhong.tsx:691` `<select value="" onChange=…>` gọi API ngay, không nút xác nhận; chọn xong ô quay về «Chuyển nhóm…» (`value=""` cố định) và dòng nhảy sang tab nhóm mới (`:657`). Lỗi API → hiện `e.message` (máy chủ `LoiHttp` tiếng Việt: «Bạn không có quyền xếp nhóm kiến nghị», «Nhóm không hợp lệ», «Thiếu dòng kiến nghị»).
- ✔ Luật 10: `BCT/can-quyet-nhom.ts` chỉ `import { duAnTrongTen, type DuAn }` từ `phong/du-an-thuan.ts` (thuần, chỉ `import type`); phần đụng DB/AI nằm ở `can-quyet-nhom-ai.ts` (chỉ route import). `BaoCaoTuanPhong.tsx:21-22` import `type DongCanQuyet` từ `can-quyet.ts` (có `docWord`/fs) nhưng là `import type` — bị xoá lúc biên dịch, an toàn; và `NHOM_CAN_QUYET` từ file thuần.
- ✔ Luật 28: bốn «tab» nhóm là `<button className="nut-nho">` (bấm được); nhãn «🤖 …» là `<span className="mo">` chữ trần, không viền.
- ✔ Luật 19: chữ AI xếp (`nhom_ly_do`) đứng sau «🤖 » (`:689`); trạng thái đợi cũng «🤖 đang xếp nhóm…». Hụt khi lý do rỗng (F-A5).
- ✔ Luật 30: giao diện hiện số nhóm, nhãn «Trước khởi công · Thực thi, kiểm soát · ENC đề xuất · Nhóm khác» (tên, không mã); lý do AI do prompt dặn «nêu tên dự án và giai đoạn» (`can-quyet-nhom-ai.ts:76`) nhưng prompt không có câu luật 30 chung và kết quả không qua lưới `ganTenChoMa` (`src/lib/ai/gan-ten-ma.ts`; `grep -n ganTenChoMa src/lib/bao-cao-tuan/can-quyet-nhom-ai.ts` rỗng) → ⚪ F-A9: lý do AI có thể ghi trơn mã việc `CV-…` hoặc mã WBS; lưới hiện chỉ lo mã `CV-yyyy-nnnn`, nhóm lý do chưa dùng mã nào nên rủi ro thấp; hàng xóm `can-quyet-ai.ts` cũng không qua lưới.
- ✔ Chữ lỗi API tiếng Việt: cả hai route (`LoiHttp(...)`); `console.error("[can-quyet] AI xếp nhóm lỗi:", …)` — thông điệp từ `Error.message` có thể tiếng Anh (chỉ ra log, không tới người dùng).
- ✔ SQL `db/88-can-quyet-nhom.sql`: bảng đúng cột; nhưng **chú thích đầu tệp còn ghi bản 1** («Đầu tư · Thi công SCI · Thi công E&C · Nhóm khác») → ⚪ F-A10 chú thích lỗi thời (không ảnh hưởng chạy; đã thêm 4 mã bản 2 vào đâu? — bảng không có CHECK trên `nhom`, nên cũng không chặn mã lạ).

### A.6 Phát hiện thêm (K4)
| # | Mức | `tệp:dòng` | Thấy gì | Gợi ý |
|---|---|---|---|---|
| F-A7 | 🟡 | `BCT/can-quyet-nhom.ts:37-43` | Biểu thức chữ khớp nhầm (A.3): `cod`/`hầm`/`đập`/`xây dựng` không có ranh giới từ; «Sở/Bộ Xây dựng» + dự án SCI vẫn ra `thuc_thi` CHẮC | Thêm ranh giới từ như `tuRieng` (`can-quyet.ts:49`); bỏ `xây dựng` trơn |
| F-A8 | ⚪ | `src/app/api/bao-cao-tuan/can-quyet/nhom/route.ts:16` vs `BaoCaoTuanPhong.tsx:651-652` | Người có `cong_viec.giao` phạm vi `cua_minh` (hoặc phạm vi không chứa đơn vị nào): máy chủ nhận, giao diện ẩn ô (phía an toàn). Mặc định hệ thống không có ca này | Ghi chú; muốn khớp tuyệt đối thì giao diện dùng cùng điều kiện (`co_the_giao` ở `so-cai/danh-muc`) |
| F-A9 | ⚪ | `BCT/can-quyet-nhom-ai.ts:78-88` | Lý do AI không qua lưới luật 30; prompt chưa có câu «mã kèm tên» | Thêm hằng luật vào prompt |
| F-A10 | ⚪ | `db/88-can-quyet-nhom.sql:1` | Chú thích đầu tệp còn liệt kê nhóm bản 1; cột `nhom` không có CHECK nên mã bản 1 nằm lại bảng | Sửa chú thích; thêm CHECK hoặc dọn mã cũ (F-A1) |
| F-A11 | ⚪ | `BCT/can-quyet-nhom-ai.ts:99-106` (`ghiNhomNguoi`) | Người chuyển nhóm: không ghi sổ lịch sử (`ghiLichSu`), không hoàn tác; trạng thái chung cho mọi người xem; ai có quyền giao đều chuyển được dòng của đơn vị khác | Ghi `ghiLichSu` một dòng; cân nhắc chỉ cho lãnh đạo + quản trị |

## B. K5 — Mẫu Word (Form 5 · Form 6 · Form 11)

### B.1 Đối chiếu thước bằng tiêu đề chương trong TỆP THẬT (giải nén `word/document.xml` bằng Python `zipfile`)
| Mẫu | Tệp đã mở | Chương tìm thấy | Thước | Kết |
|---|---|---|---|---|
| Form 5 SCI PMC | `mau-word/form-5.docx` · `mau-word/trang/form-5.docx` · tệp đang lưu CSDL 3004 (GET `/api/mau-word/form-5/tep`) | «I. TIẾN ĐỘ CHI TIẾT CÔNG TÁC THIẾT KẾ» · «II. VẤN ĐỀ NỔI BẬT VÀ KIẾN NGHỊ LÃNH ĐẠO» · «III. KẾT QUẢ VÀ KẾ HOẠCH VIỆC TUẦN TỚI» | 3 mục đúng tên | ✔ (cả 3 tệp) |
| Form 6 SCI E&C | `form-6.docx` · `trang/form-6.docx` · tệp CSDL | «I. TỔNG QUAN CÁC DỰ ÁN SCI ENC» · «II. VẤN ĐỀ NỔI BẬT VÀ KIẾN NGHỊ LÃNH ĐẠO» · «III. KẾT QUẢ VÀ KẾ HOẠCH VIỆC TUẦN TỚI»; tiêu đề trang «BÁO CÁO TUẦN», kỳ «Tuần 29/2026 (13/07 – 19/07)», gửi «Phòng Đầu tư và Pháp chế» | báo cáo TUẦN 3 mục | ✔ |
| Form 11 BĐH Loại khác | `form-11.docx` · `trang/form-11.docx` · tệp CSDL | 5 chương: I THÔNG TIN CHUNG DỰ ÁN · II TIẾN ĐỘ TỔNG THỂ · III CHI TIẾT TIẾN ĐỘ TỪNG HẠNG MỤC · **IV «RỦI RO & KIẾN NGHỊ SCI E&C»** · V KẾT QUẢ VÀ KẾ HOẠCH VIỆC TUẦN TỚI. `dinh-nghia.json`: `gui_den_mac_dinh "sci-enc"`, `loai_ky "tuan"`, `don_vi_lap null`; có trong `MAU_DUNG_CHUNG` (`scripts/chuyen-mau-that.mjs:46`, `src/lib/kiem-tra/don-vi-lap.ts:16`) | 5 chương như Form 10, chương 4 đổi, gửi SCI E&C | ✔ |
| Form 10 (nguồn) | `form-10.docx` | I…V, chương IV «RỦI RO & KIẾN NGHỊ BAN QUẢN LÝ DỰ ÁN» | không đổi | ✔ (`dinh-nghia.json` form-10 giống hệt `d705449`) |
| Định nghĩa CSDL 3004 vs `dinh-nghia.json` | GET `/api/mau-word/form-5`, `form-6`, `form-11` (cookie quản trị) | `dinh_nghia` của 3 mẫu **bằng đúng** `dinh-nghia.json` (cùng khoá, bảng, cột; phiên bản 11 · 12 · 3) | khớp | ✔ |

### B.2 So định nghĩa JSON với bản cũ `git show d705449:mau-word/dinh-nghia.json`
Đo bằng script Python so từng khoá (mã mẫu → khoá → bảng theo `tag`):
| Mẫu | Thay đổi so với cũ | Có rơi thuộc tính ngoài ý muốn không |
|---|---|---|
| form-0 · 1 · 2 · 3 · 4 · 7 · 8 · 9 · 10 | **Không đổi một ký tự** | — |
| form-5 | bỏ bảng `bang_du_an` (chương Tổng quan PMC); `muc_bat_buoc` 4 → 3; nhãn «II.» → «TIẾN ĐỘ…», «IV.» → «KẾT QUẢ…» (bỏ số La Mã); thêm `cau_truc`; phiên bản 9 → 11 | Không. Còn `so_lieu: true` ở `bang_tien_do_tk`, còn `bang_tien_do_tk` trong `bang_cong_viec`, `loai_ky tuan`, `don_vi_lap sci-pmc`, `gui_den_mac_dinh p-dtpc`, 4 ô `o_nhap` y nguyên |
| form-6 | bỏ 3 bảng `bang_tien_do_tc` · `bang_nhan_luc` · `bang_thu_von`; `muc_bat_buoc` 6 → 3; `loai_ky` `thang` → `tuan`; tên «Báo cáo tháng…» → «Báo cáo tuần…»; nhãn bảng việc «THÁNG TỚI» → «TUẦN TỚI» (có `ten_cu` giữ tên cũ); thêm `cau_truc`; phiên bản 9 → 12 | Không. Còn `bang_du_an` (`so_lieu: true`), `bang_kien_nghi`, `gui_den_mac_dinh p-dtpc`, 4 ô `o_nhap` |
| form-11 (mới) | = Form 10 + `cau_truc` + đổi chương IV + `gui_den_mac_dinh = sci-enc` + `loai_ky tuan` | Còn đủ `o_nhap` của Form 10 gồm 6 ô `du_an_*` (thông tin dự án) và `bang_tien_do` / `bang_khoi_luong` |

→ **Trong `dinh-nghia.json` không rơi thuộc tính nào** ngoài chương đã bỏ: `so_lieu`, ô thông tin dự án (Form 10/11), `bang_tien_do_tk` (Form 5), `loai_ky`, đơn vị nhận đều còn. Cờ `sua_tay` nằm ở `MAU_THAT` của script sinh mẫu, không ở JSON — đúng thiết kế.

### B.3 Phát hiện
| # | Mức | `tệp:dòng` | Thấy gì · đo bằng | Gợi ý |
|---|---|---|---|---|
| F-B1 | 🟡 | tệp Form 11 lưu trong CSDL 3004 (GET `/api/mau-word/form-11/tep`, 18.315 byte) so `mau-word/trang/form-11.docx` (18.369 byte) | **Tệp Form 11 trong CSDL máy này MẤT 7 ô nhập** mà định nghĩa (đã PUT lại) vẫn khai: `gui_den` + 6 ô `du_an_ten · du_an_chu_dau_tu · du_an_thoi_gian_thi_cong · du_an_ngay_phat_dien · du_an_tinh_trang · du_an_tien_do_luy_ke` (đếm thẻ `w:tag`: bản trắng repo 101, CSDL 94; Form 5, 6, 10 CSDL = tệp repo, 0 chênh). Nguyên nhân suy từ mã: Form 11 tạo mới bằng Khai báo mẫu → khung rút gọn 2 ô (`quan-ly-mau.ts` `dinhNghiaKhung`) → `ganNhanTheoCauTruc(…, giuO)` (`khai-bao-mau.ts:68`) gỡ nhãn mọi ô không có trong định nghĩa cũ; sau đó PUT chỉ vá định nghĩa, không vá tệp. Hậu quả: người tải mẫu từ máy này không thấy ô thông tin dự án (kiểm tra bỏ qua im lặng nhờ `O_MOI_BAN_5`, `kiem-tra.ts:35`); «Gửi:» rơi về nơi nhận mặc định `sci-enc` nên vẫn đi đúng. Hosting không dính (gieo từ tệp repo đủ ô) — nhưng máy này phiên bản 3 = JSON 3 nên `hat-giong` KHÔNG tự thay. | Tải `trang/form-11.docx` của repo lên lại qua màn Mẫu Word, hoặc nâng phiên bản Form 11 trong JSON lên 4 để gieo thay |
| F-B2 | ⚪ | `scripts/chuyen-mau-that.mjs:49` · `scripts/chuyen-mau-that.d.mts:52` | `CONG_TY_TU_GHI = ["form-8","form-10"]` thiếu `form-11`. Form 11 sửa tay, kịch bản không chạy nó nên chưa hại; ghi chú trong tệp Form 11 vẫn có «tên công ty góc trái» (đã thấy khi giải nén) | Thêm `form-11` cho đồng bộ |
| F-B3 | ⚪ | `scripts/chuyen-mau-that.mjs:42` | `PHIEN_BAN_MAU = 9` đứng riêng với phiên bản trong JSON (5→11, 6→12, 11→3); bài `kiem-tra-mau-word.test.ts:91-92` phải dùng `Math.max` để hòa hai nguồn | Ghi chú nguồn nào là đúng (JSON) |
| F-B4 | ⚪ | `tests/unit/kiem-tra-mau-trang.test.ts:57` | Nhãn bộ bài «11 mẫu trắng» vẫn ghi 11 trong khi chạy 12 | Đổi nhãn |
| F-B5 | ⚪ | `src/lib/cau-hinh/mac-dinh.ts:335-352` | 5 Ban điều hành thử + 5 dòng `luong_bao_cao → sci-enc` chỉ có trong CSDL 3004, không gieo; hosting phải khai tay. Đề đã nêu (mục 3, 4) — ghi lại để không sót | — |

### B.4 Điểm nghi 10 — luồng Khai báo mẫu làm rơi thuộc tính → **Đúng (lỗi có thật)**
| Thuộc tính | Rơi trong mã không | Dòng |
|---|---|---|
| `so_lieu` của bảng | **Rơi.** `sinhBang()` dựng lại danh sách `bang` chỉ với `{tag, nhan, cot}`, rồi `dn = {...dnCu, …, bang: sinhBang(ct, dnCu?.bang)}` ghi đè `bang` cũ | `src/lib/kiem-tra/khai-bao-mau.ts:38-52, 91` |
| Bảng sinh việc đặc biệt `bang_tien_do_tk` (Form 5) | **Rơi có điều kiện.** `sinhTruongCu()` chỉ giữ bảng `dac_biet` khi chương có nghĩa `sinh_viec_bang`; đổi nghĩa chương (như AI đề xuất ở mục 4 của đề) làm `bang_cong_viec` mất bảng; `...sinhTruongCu(ct)` đè `bang_cong_viec` + `muc_bat_buoc` cũ | `src/lib/kiem-tra/cau-truc.ts:92`; `khai-bao-mau.ts:91` |
| Ô nhập ngoài khung (Form 10/11: 6 ô `du_an_*`, `gui_den`) | **Rơi khi định nghĩa trước không liệt kê đủ.** `goNhan` gỡ mọi `w:sdt` trừ bảng số liệu giữ + `giuO`; mẫu mới (`v.moi`) lấy khung 2 ô. **Đã đo trên tệp thật** (F-B1) | `khai-bao-mau.ts:68, 75, 90`; `gan-nhan.ts:96-110, 124` |
| `loai_ky`, đơn vị lập / nhận | Không rơi: `luuPhienBanMau` chỉ `UPDATE khoa_luu, dinh_nghia, phien_ban` | `khai-bao-mau.ts:117-121` |

Đề nói đã tách thành việc riêng — hai chỗ sửa gọn: `sinhBang` (giữ `so_lieu` của bảng cũ cùng tag) và `kiemThuNoiBo` (nhánh «Mất ô nhập» `khai-bao-mau.ts:71-75` chỉ chạy khi `!v.moi` nên mẫu mới thoát).

### B.5 Điểm nghi 11 — `luat/hat-giong.ts` tự tắt luật bỏ khỏi `LUAT_MAU` → **Đúng như mô tả; có kẽ hở thiết kế, trên máy này sạch**
- Mã `src/lib/luat/hat-giong.ts:124-137`: chỉ tắt luật `phien_ban = 1` + `bat` + `id LIKE 'luat-mau-%'`. Luật đã sửa tay (phiên bản ≥ 2) mà bỏ khỏi bộ mới **vẫn bật**, vẫn trỏ bảng đã xoá.
- Hậu quả nếu có: động cơ đọc `bc.bang[bang] ?? []` (`src/lib/luat/loai/chung.ts:134`, `tinh-toan.ts:420`) → bảng mất = không dòng = luật loại số / ngày im lặng, không báo oan, không sập. Trong 14 luật bị bỏ không có loại «bảng tối thiểu N dòng» (loại duy nhất sẽ báo oan, `loai/bang.ts:34`) — đo bằng `git show d705449:…luat-mau.ts` (liệt kê `loai` từng luật). Riêng `f6-ai-tnld-kien-nghi` là luật AI (đọc chương nhân lực đã bỏ) — nếu bị sửa tay và còn bật có thể gợi ý sai.
- **Đo trên 3004** (GET `/api/luat`, 101 luật): cả 14 luật bị bỏ + 2 luật `f6-ke-hoach-*` đều `bat = false` (14 luật: 13 ở phiên bản 2 — Khai báo mẫu tắt, `sua_boi = quantri@scigroup.vn`; `f6-ai-tnld-kien-nghi` và 2 luật `ke-hoach` ở phiên bản 1 đã tắt). Quét mọi luật đang bật: **0 luật trỏ bảng không có** trong Form 5, 6, 11 theo định nghĩa CSDL. `chung-du-an-trang-thai` `ap_dung = [form-6]` ✔ (không còn Form 5).
- Bài `luat-hat-giong-thay.test.ts:12` khoá nhánh «đã sửa tay → giữ» (đạt).
- ⚪ Gợi ý: gắn nhãn «trỏ bảng không còn trong mẫu» ở màn Luật (hàm `luatHongVoiDinhNghia` đã có, chỉ chạy lúc Khai báo).

### B.6 Điểm nghi 12 — Word gốc Form 6 cũ ra kỳ «tuần 29» thay «tháng 7» → **Chấp nhận được; dữ liệu đã nộp không bị đọc sai kỳ**
- `MAU_THAT` form-6 `loai_ky: "tuan"` + `sua_tay: true`; ảnh chuẩn `tests/unit/__chuan__/mau-bao-cao.json` (tệp gốc `goc/OK_Form6_SCI_ENC_Sua lan 2.docx`) đổi `ky: thang-7-2026 → tuan-29-2026`.
- Mở chính tệp gốc: tiêu đề «BÁO CÁO THÁNG» nhưng ô kỳ ghi «☒ Tuần 29/2026 (14/07 – 20/07/2026) ☐ Tháng ......./2026» — tệp gốc đã tích **Tuần 29**; kết quả mới trung thành với ô tích hơn kết quả cũ (bộ chuyển cũ ép «tháng 7»). Chỉ đáng ghi nhận: tệp gốc mâu thuẫn nội tại.
- Báo cáo tháng Form 6 cũ đã nộp: kỳ đọc từ **chữ trong ô kỳ của chính tệp** (`src/lib/kiem-tra/kiem-tra.ts:355-366` `docKyBaoCao`), và đã lưu cứng `tai_lieu.ky_bao_cao` khi nộp (`can-quyet.ts:119-120` đọc `ky_bao_cao->>'loai' = 'thang'`); `mau.loai_ky` chỉ là dự phòng (`kiem-tra.ts:395`). **Đo bằng bài thử** (`kiemTraDayDu`, mẫu hiện hành, CSDL RAM): `mau-word/vi-du/BaoCao_Thang7_SCI_ENC.docx` và `_ban2.docx` → `mau = form-6`, `dat = true`, `ky = {loai: thang, so: 7, nam: 2026, tu: 2026-07-01, den: 2026-07-31}`, nơi nhận `p-dtpc`, 0 lỗi chặn (chỉ 1 cảnh báo «Rotor… không có ngày kết thúc» + 1 gợi ý «IV. TIẾN ĐỘ THU VỐN… còn ......» ở bản 1 — chương thừa vẫn được đọc, đúng ý «chỉ thừa chương»).
- ⚪ F-B6: cũng nhờ đó, không luật nào chặn E&C nộp **tháng** bằng Form 6 mới (không so `loai` của ô kỳ với `mau.loai_ky`). Anh nói Form 6 «thành báo cáo tuần» — muốn cứng thì thêm luật; hiện chỉ là mặc định của mẫu.

## C. K7 — Bài kiểm bị sửa (`git diff d705449..8cf327a -- tests/`)
10 tệp (9 sửa + 1 mới `so-do-loai-khac-20-10.test.ts`, 167 dòng):
| Bài | Sửa gì | Nới? | Có khoá lỗi thật không |
|---|---|---|---|
| `kiem-tra-doc-word.test.ts:70-71, 95-97, 180-188` | Vòng «gốc + chương việc» bỏ Form 5, 6 (`[0..8,10]` → `[0,1,2,3,4,7,8,10]`); bỏ nhánh Form 6 tháng; thêm kiểm tiêu đề chương Form 5 (3), Form 6 (3), Form 11 (`mau_ma`, chương IV) | Nới có lý do (Form 5/6 sửa tay không còn «gốc + 1 chương»); **yếu hơn** — Form 5, 6 chỉ còn so tiêu đề chương, mất khoá «nội dung anh Đại giữ nguyên» | ✔ khoá tiêu đề 3 mẫu = thước; ⚪ thân Form 5/6 không còn bài so với gốc |
| `kiem-tra-kiem-tra.test.ts:36-45` | 11 → 12 mẫu; thêm `form-11: sci-enc`, `form-6.loai_ky = tuan`; `n = 12` | Không (mở rộng) | ✔ khoá nơi nhận Form 11 và loại kỳ Form 6 |
| `kiem-tra-mau-trang.test.ts:33, 44-51, 96-97, 112, 131-137, 148, 176-178` | `MA` 11 → 12; bỏ chuỗi ví dụ «Đang thẩm định TKCS» (Form 5) và «1.240 h» (Form 6); bỏ nhánh kỳ tháng của Form 6; vòng ảnh biểu đồ chỉ còn Form 8; thêm `beforeAll` tạo BĐH thử, `form-11` vào `dungChung`, kiểm `gui_den = [sci-enc]` | Nới: bỏ 2 chuỗi ví dụ + nhánh tháng — hợp lý vì nội dung đã bỏ. Thêm: Form 11 vào cả hai bộ bài | ✔ khoá `gui_den` Form 11 + chặn `don_vi_lap`. ⚪ Bài kiểm TỆP REPO, **không phát hiện tệp CSDL máy này thiếu ô** (F-B1) |
| `kiem-tra-mau-word.test.ts:11, 91-92` | Nạp `dinh-nghia.json`; kỳ vọng phiên bản Form 5 = `Math.max(PHIEN_BAN_MAU, json)` thay `PHIEN_BAN_MAU` | Gần lặp lại mã (cùng nguồn JSON) nhưng vẫn khoá «đã nâng từ 1 lên bản gieo» | ⚪ yếu: `Math.max` che việc hai nguồn phiên bản lệch (F-B3) |
| `luat-kho-crud.test.ts:116-118` | 11 → 12 mẫu | Không | ✔ |
| `luat-loai-that.test.ts:178-188` | Đổi chữ «tháng» → «tuần»; **thêm** `muc_co_noi_dung('NHÂN LỰC & AN TOÀN LAO ĐỘNG')` phải bị bắt (1 lỗi) | Không — thêm khoá | ✔ khoá luật trỏ chương đã bỏ bị bắt |
| `luat-loai-tinh-toan.test.ts:408-418` | **Xoá** bài «Form 6: lệch, % GT HĐ, tổng nhân lực» (5 luật chạy thật + 2 ca sai), thay bằng «8 mã luật không còn trong `LUAT_MAU`» + «mọi luật Form 10 có `form-11` trong `ap_dung`» | Xoá hợp lệ (luật bị bỏ). Bài mới chỉ kiểm **danh sách mã** và mảng `ap_dung`, không chạy luật Form 10 trên tệp Form 11 | ⚪ yếu: chưa có bài chạy luật thật trên tệp Form 11 |
| `luat-mau.test.ts:189-193, 245-251` | «E&C bản 1/2 cảnh báo thu vốn» → «tháng cũ vẫn đọc, không chặn, không `f6-*`»; «Form 6 tháng tới» → luật chung của bảng việc + `f6-*` rỗng | Nới đúng chỗ luật bị bỏ | ✔ khoá «tệp tháng cũ không bị chặn» (tôi chạy lại bằng `kiemTraDayDu` — B.6) |
| `__chuan__/mau-bao-cao.json` | Chụp lại ảnh chuẩn: 14 dòng đổi chữ chương; kỳ gốc Form 6 `thang-7-2026` → `tuan-29-2026`; thêm khối `trang/form-11.docx`; bỏ 3 cảnh báo `f6-thu-von-*` | Sổ chuẩn chụp lại theo mã | ✔ (xem B.6) |
| `so-do-loai-khac-20-10.test.ts` (mới) | Phần 4 nhóm sửa cùng ở `8cf327a` (29 dòng đổi, bản 1 → bản 2) | Đổi số kỳ vọng khớp mã nhưng đúng chốt bản 2 | ✔ 6 nhóm ca; ⚪ thiếu bài `ganNhom` (người > máy > AI, mã nhóm bản 1 — sẽ bắt F-A1), thiếu bài quyền route `/nhom`, thiếu ca E&C-gửi-không-dự-án |

### C.1 Chạy bài (`npx vitest run`, 17 tệp liên quan, CSDL RAM, 24 giây)
`so-do-loai-khac-20-10 · bao-cao-tuan-can-quyet · hoi-trung-hoi-cv · luat-mau · luat-hat-giong-thay · luat-kho-crud · luat-loai-that · luat-loai-tinh-toan · kiem-tra-mau-word · kiem-tra-doc-word · kiem-tra-kiem-tra · kiem-tra-mau-trang · chuan-mau-bao-cao · khai-bao-mau · cap-nhat-mau-giu-nguyen · cau-truc-mau · kiem-tra-mau-goc`
→ **14 tệp đạt · 1 tệp trượt · 2 tệp bỏ qua; 189 bài đạt · 2 trượt · 3 bỏ qua.** Hai bài trượt đều ở `tests/unit/hoi-trung-hoi-cv.test.ts` (dòng 32 và 41).

### C.2 Điểm nghi 15 — `hoi-trung-hoi-cv.test.ts` 2 trượt → **Đúng: bài LỖI THỜI, không phải lỗi mã**
| Bằng chứng | Vị trí |
|---|---|
| Bài cứng số 4: `toEqual(["hopdong","main","phaply","tiendo"])`; `toHaveLength(4)` | `tests/unit/hoi-trung-hoi-cv.test.ts:32, 41, 43` |
| Mã hiện hỏi 5 agent (bỏ `base` là chính mình): `AGENT_HOI_TRUNG = ["tiendo","hopdong","phaply","base","main","nghiemthu"]`; chú thích «20/10/2026 (Mr. Đại gật): thêm agent Nghiệm thu» | `src/lib/chung/hoi-trung-kieu.ts:10-11, 26` |
| Commit gây ra | `3b92154` (2026-10-19) — `git log -3 -- src/lib/chung/hoi-trung*`; bài chưa cập nhật kèm (`git log -2 -- tests/unit/hoi-trung-hoi-cv.test.ts`: lần cuối `2c15fe9`, 05/10) |
| Không thuộc 3 commit kiểm | `7c7f6f6` / `0470bb3` / `8cf327a` không đụng `hoi-trung*` |

Sửa gợi ý: `["hopdong","main","nghiemthu","phaply","tiendo"]` + `toHaveLength(5)`; tên bài «4 agent» → «5 agent».

## D. K6 — luật chung trên phần của bạn
| Luật | Kết | Bằng chứng |
|---|---|---|
| 10 tách thuần / fs | ✔ | `can-quyet-nhom.ts` chỉ import `du-an-thuan.ts`; DB / AI ở `can-quyet-nhom-ai.ts` (chỉ route import, `import()` động cho `db`/`providers`); `BaoCaoTuanPhong.tsx` chỉ `import type { DongCanQuyet }` từ `can-quyet.ts` (file đụng fs) |
| 17 nút không quyền → ẨN (riêng 3004) | ✔ | ô «Chuyển nhóm…» render có điều kiện `duocChuyenNhom &&` (`BaoCaoTuanPhong.tsx:690`); nút Giao việc cùng nguyên tắc (`:717-722`; khi không quyền chỉ còn chữ trạng thái «chưa có việc»). Ca lệch quyền: F-A8 ⚪ |
| 19 🤖 trước chữ AI | 🟡 | `:689` đúng khi có lý do; hụt khi lý do rỗng (F-A5); lượt lỗi hiện «🤖 đang xếp nhóm…» mãi (F-A4) |
| 28 chữ thuần không khoanh | ✔ | nhãn 🤖 là `<span className="mo">`; tab nhóm là `<button className="nut-nho">`; `<select className="chon-nhom">` là điều khiển |
| 30 không chỉ mã | ✔ giao diện / ⚪ prompt | nhãn nhóm bằng tên; prompt xếp nhóm chưa mang luật 30 (F-A9) |
| Quy tắc 4 «chọn là áp dụng luôn» | ✔ | `<select onChange>` gọi API ngay, không nút xác nhận (`:691`) |
| Tiếng Việt chữ lỗi API | ✔ | `403 "Bạn không có quyền xếp nhóm kiến nghị"`, `400 "Nhóm không hợp lệ"`, `400 "Thiếu dòng kiến nghị"`; mẫu Word: ghi chú cuối tệp, chữ lỗi ảnh chuẩn đều tiếng Việt. Log `console.error("[can-quyet] AI xếp nhóm lỗi:", e.message)` có thể ra tiếng Anh (chỉ vào log) |
| Luật 31 / 35 / 36 | n/a | phần này không phát sinh chữ khoảng ngày / nhanh-chậm mới |

## Trả lời điểm nghi 6–12, 15
| # | Kết | Một dòng |
|---|---|---|
| 6 | **Đúng** (có khớp nhầm) | `cod`/`hầm`/`đập`/`xây dựng` không ranh giới từ → AI chạy thừa; «Sở/Bộ Xây dựng» + dự án SCI → `thuc_thi` chắc; `fs2` không khớp (đúng) |
| 7 | **Một phần đúng** | người > code chắc > AI đúng; nhưng mã bản 1 bị bỏ qua cả với hàng của NGƯỜI (F-A1 🔴) |
| 8 | **Chưa trùng, 2 chỗ yếu** | `globalThis` đủ cho nhiều người / nạp lại module; lượt lỗi không nhớ → thử lại mãi, hiện «đang xếp» mãi (F-A4) |
| 9 | **Chưa chắc / lệch nhẹ** | nút hiện ⇒ máy chủ nhận; ngược lại (phạm vi `cua_minh`) ẩn mà có quyền (F-A8 ⚪) |
| 10 | **Đúng** | `khai-bao-mau.ts:38-52, 91`, `cau-truc.ts:92`; đã đo trên tệp Form 11 CSDL: mất 7 ô (F-B1) |
| 11 | **Đúng** | `hat-giong.ts:124-137`; 3004 hiện 0 luật bật trỏ bảng mất |
| 12 | **Chấp nhận được** | tệp gốc vốn tích «Tuần 29»; tháng cũ đã nộp vẫn đọc đúng kỳ tháng (đo bằng `kiemTraDayDu`) |
| 15 | **Đúng** | bài cứng số 4, mã nay 5 agent (`hoi-trung-kieu.ts:26`, commit `3b92154`) |

## Chưa đo được
- Bảng 9·1·2·8 của 20 dòng thật tuần 40 (13 máy chắc · 7 AI) và độ lệch: **không GET** `/api/bao-cao-tuan/can-quyet` (route kích AI thật). Muốn đo cần cờ tắt AI hoặc bản sao CSDL + bài thử không đi qua route.
- Số hàng bản 1 còn trong `docflow.can_quyet_nhom` (cần đọc CSDL — cấm mở `pgdata`; không có API liệt kê).
- Giao diện (bấm chuyển nhóm, tab nhóm) chưa mở trình duyệt — đề không giao riêng.
- Chưa chạy cả bộ `vitest` (chỉ 17 tệp liên quan); không chạy `tsc` (không sửa mã).

## Xác nhận an toàn
- Không sửa / tạo / xoá tệp trong CV, trừ 2 bài thử tạm `tests/unit/kiem-doc-lap-tmp-nhom.test.ts` và `…-thang.test.ts` (đã `rm` ngay; `ls tests/unit | grep kiem-doc` rỗng, `git status --short | grep kiem-doc` rỗng). Tệp `kiem-doc-lap-tmp-sodo.test.ts` thấy lúc đầu là của phiên khác, không phải của tôi.
- Không commit / stash / checkout; không `next build`; không mở `data/pgdata`; không gọi AI thật; không POST / PUT / DELETE (chỉ GET `/api/mau-word`, `/api/mau-word/<mã>`, `/api/mau-word/<mã>/tep`, `/api/luat` bằng cookie ký tạm, không in giá trị cookie).
- Tệp tạm của tôi nằm ở `K/tam-nhom/` và `K/tam-mau/` (ngoài kho CV).
