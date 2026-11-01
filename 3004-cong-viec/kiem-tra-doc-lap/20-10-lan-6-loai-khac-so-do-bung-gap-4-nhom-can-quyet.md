# Kiểm tra độc lập — phiên «2 Agent Công việc», lần 6 (20/10/2026)

> Phạm vi: **3 commit** ở bộ code agent Công việc 3004 `D:\3 SETUP\1 AI\SCI Tiến độ\SCI-AI-AGENT\6-Agent-cong-viec\CodeSCICongViec` (nhánh `master`):
> `7c7f6f6` (mẫu báo cáo) · `0470bb3` (sơ đồ + báo cáo tuần) · `8cf327a` (4 nhóm theo giai đoạn). Tính từ sau `d705449`.
> Ghi kết quả vào **`20-10-lan-6-loai-khac-so-do-bung-gap-4-nhom-can-quyet.KET-QUA.md`** cùng thư mục rồi nhắn lại phiên «2 Agent Công việc».

## 1. Thước — chốt của Mr. Đại 20/10/2026

Nguyên văn yêu cầu dài; tóm lại theo mục anh đánh số:

| # | Chốt | Ghi chú anh trả lời khi em hỏi |
|---|---|---|
| 1 | Thêm form báo cáo tuần cho dự án **Loại khác** (không do SCI đầu tư, E&C thi công): Ban điều hành gửi về **SCI E&C**. Dự án SCI đầu tư thì BĐH vẫn gửi BQLDA Lào / BQLDA QT | Form 11 = chép 5 chương Form 10, chương 4 đổi «RỦI RO & KIẾN NGHỊ SCI E&C». Anh không cho tên BĐH thật → em tạo 5 BĐH thử ở máy này |
| 2 | Form 6 SCI E&C thành báo cáo **tuần**, chỉ 3 mục: TỔNG QUAN CÁC DỰ ÁN SCI ENC · VẤN ĐỀ NỔI BẬT VÀ KIẾN NGHỊ LÃNH ĐẠO · KẾT QUẢ VÀ KẾ HOẠCH VIỆC TUẦN TỚI | «TUẦN TỚI» (anh viết «THÁNG TỚI», gật gợi ý đổi) |
| 3 | Form 5 SCI PMC 3 mục: TIẾN ĐỘ CHI TIẾT CÔNG TÁC THIẾT KẾ · VẤN ĐỀ NỔI BẬT… · KẾT QUẢ… TUẦN TỚI | |
| 4 | Luồng báo cáo / việc của BĐH dự án Loại khác chỉ lên **SCI E&C là dừng**, không đổ về P.ĐT&PC. Bấm ô P.ĐT&PC không thấy việc Nậm Mô 1, Nậm Mô 2… | Báo cáo của chính E&C vẫn gửi P.ĐT&PC |
| 5 | P.ĐT&PC chỉ quan tâm việc dự án SCI đầu tư | a. Ô **Ban lãnh đạo** cũng không thấy; muốn xem thì bấm ô E&C, PMC, menu Dự án › Loại khác. b. Việc nội bộ PMC, E&C **không gắn dự án** vẫn lên P.ĐT&PC |
| 6 | Tab «Cần BLĐ ra quyết định» ở `/bao-cao-tuan` tách 4 tab. **Anh sửa lần 2 cùng ngày (thước cuối):** «Trước khởi công» = dự án SCI đầu tư, tính chất Pháp lý · Khởi tạo · Thiết kế · Kế hoạch · «Thực thi, kiểm soát» = dự án SCI đầu tư giai đoạn đó · «ENC đề xuất» (anh gõ «đề suất», em sửa chính tả) = dự án liên quan, cả 6 giai đoạn · ngoài ra «Nhóm khác» | Anh chốt 3 câu hỏi: ① giai đoạn theo **nội dung dòng**, không theo tình trạng dự án ② dự án SCI giai đoạn **Kết thúc → Thực thi, kiểm soát** ③ kiến nghị E&C về dự án SCI đầu tư → **theo giai đoạn** vào hai nhóm SCI. Máy xếp; dòng không chắc 🤖 AI xếp; người chuyển nhóm thắng AI |
| 7 | Sơ đồ tổ chức: 5 ô PMC, E&C, P.KT&VH, BQLDA Lào, BQLDA QT **to ra**, giữ 📒 trái, «+» phải; dưới là dòng chữ bấm mới xổ ô cấp 3–4: «Đang thiết kế» · «Đang thi công» · «Các dự án Lào» · «Các dự án QT» · «Các nhà máy» | 7a bung ra = các ô như cũ, bấm ô thì cột phải hiện việc · 7b dự án Loại khác có BĐH dưới E&C → hiện ô BĐH, không lặp ô dự án · 7c nhớ trạng thái bung theo từng người xem |
| 8 | Đề xuất sáng tạo | Anh gật: dòng chữ kèm số «Đang thi công · 6 dự án · 3 trễ»; nhóm gập có việc trễ → chấm đỏ |

Luật chung phải giữ (CLAUDE.md): tiếng Việt mọi chữ · luật 17 riêng 3004 nút không quyền thì ẨN · luật 19 🤖 trước chữ AI · luật 28 chữ thuần không khoanh · quy tắc 4 chọn một là áp dụng luôn · luật 10 tách tệp thuần / tệp đụng `node:fs`.

## 2. Đã đổi gì

| Commit | Tệp chính | Nội dung |
|---|---|---|
| `7c7f6f6` | `mau-word/{form-5,form-6,form-11}.docx` + `trang/…`, `mau-word/dinh-nghia.json`, `src/lib/luat/luat-mau.ts`, `src/lib/kiem-tra/don-vi-lap.ts`, `scripts/chuyen-mau-that.mjs`, `scripts/tao-mau-trang.mjs`, 8 bài kiểm + ảnh chuẩn `tests/unit/__chuan__/mau-bao-cao.json` | Mẫu mới (sửa Word bằng lxml, giữ thẻ `w:sdt`), định nghĩa dựng lại; bỏ 14 luật trỏ bảng đã xoá; luật Form 10 áp thêm Form 11; Form 11 vào `MAU_DUNG_CHUNG`; Form 5/6 cờ `sua_tay` để kịch bản sinh mẫu không ghi đè |
| `0470bb3` | `components/phong/{doi-viec,bo-cuc,viec}.ts`, `SoDoPhong.tsx`, `BaoCaoTuanPhong.tsx`, `phong.css`, `lib/phong/so-do.ts`, `lib/cau-hinh/{mac-dinh,bieu-mau,kiem-tra}.ts`, `lib/giai-thich/noi-dung.ts`, `lib/bao-cao-tuan/{can-quyet,can-quyet-nhom,can-quyet-nhom-ai}.ts`, `api/bao-cao-tuan/can-quyet/{route,nhom/route}.ts`, `db/88-can-quyet-nhom.sql`, bài kiểm `so-do-loai-khac-20-10.test.ts` | Mục 4–5 (`oDemViecLoaiKhac`, `ViecO.duoc`, `duocO` ở mọi chỗ đếm), 7b (`oBdhThayDuAn`), 7 (`nhom_gap_so_do` ở Cài đặt → Giao diện, `xepSoDo(ds, nhom)`, `bcHien`/`bc`, `moNhom` localStorage), 6 bản 1 |
| `8cf327a` | `can-quyet-nhom.ts`, `can-quyet-nhom-ai.ts`, 2 route, `BaoCaoTuanPhong.tsx`, `noi-dung.ts`, bài kiểm | 6 bản 2: mã nhóm `truoc_khoi_cong · thuc_thi · enc · khac`; chữ theo giai đoạn; luật vận hành nhà máy → Nhóm khác |

## 3. Tác động ngoài code (dữ liệu máy 3004 — dữ liệu thử)

- Mẫu Word trong CSDL: form-5 phiên bản 11 · form-6 phiên bản 12 (kỳ tuần) · form-11 phiên bản 3 (gửi `sci-enc`). Lưu qua luồng Khai báo mẫu rồi **PUT** lại định nghĩa vì luồng Khai báo làm rơi thuộc tính (xem điểm nghi #10).
- Tạo 5 đơn vị `bdh-nammo1 · bdh-nammo2 · bdh-huongphung1 · bdh-mddt · bdh-namsam3a` (cấp 4, cha `sci-enc`, mẫu form-11) + 5 dòng `luong_bao_cao` → `sci-enc`.
- Gắn `du_an.ban_dieu_hanh` cho 5 dự án Loại khác → **đã bị đồng bộ từ Main ghi đè lúc 11:31** (Main quản ô này — `src/lib/du-an-main-thuan.ts` dòng 45, 97). Vì vậy trên máy này **7b chưa nhìn thấy được** (dưới E&C hiện cả ô BĐH lẫn ô dự án trùng tên). Không sửa Main.
- Bảng mới `docflow.can_quyet_nhom` (db/88).
- Sao lưu pgdata: `data/pgdata-sao-luu-20261020-1213`, `…-1256`.

## 4. Hướng đã bỏ

- Bỏ đề xuất cấu trúc của 🤖 AI khi khai báo mẫu (AI đổi nghĩa chương «Vấn đề nổi bật» từ *thông tin* sang *số liệu*) — dùng cấu trúc phiên bản trước.
- Bản đầu cho bộ nhận tệp Word gốc (`nhan-mau-goc.ts`) **từ chối** tệp gốc Form 5/6 cũ → hoàn lại: chuyển bằng bộ chuyển cũ vẫn đủ 3 chương mới, chỉ thừa chương.
- Không gieo 5 BĐH thử vào `khoi-tao.ts` (sẽ lan lên hosting).

## 5. Điểm tự nghi ngờ — soát kỹ

1. `duocO` (mục 4–5) đã áp ở `viecNhanh`, `trongO`, `demMoi`, khối «Việc làm xong». **Chưa áp** ở nhóm «Phối hợp» cột phải và ô tìm theo phạm vi (`locPhamVi`) — có đúng ý anh không? Các nơi khác dựng việc bằng `taoDoiViec` (`lib/phong/viec-hien-ngoai.ts` — «Việc của tôi» ở Main/Tiến độ/Hợp đồng; `TheViecNhung.tsx`) bỏ qua `duoc`; 7b đổi `nut` sang ô BĐH thì `nhomCua` ở đó xếp nhóm khác đi không?
2. `cayCon` đổi sang `bcDu` (cây đủ) để số trên ô đủ khi gập. Có chỗ nào cần cây VẼ mà đang dùng `cayCon` không?
3. Effect tự bung nhóm khi ô đang chọn nằm trong nhóm gập (`SoDoPhong.tsx`, sau `const bc =`): có vòng lặp render không; có bung cả khi người dùng chỉ vào ô cha rồi gập không?
4. Trạng thái bung lưu localStorage theo `toi.id`; trước khi `toi` về thì mọi nhóm gập rồi mới bung → nháy?
5. `xepSoDo` thêm tham số `nhom`: ô nhóm giữ cột khi gập; P.KT&VH (cấp 2) giữ khe cột chồng rỗng. Số đo cũ khi không truyền `nhom` phải y nguyên (bài `phong.test.ts` đang xanh). Đường nối `duongNoi` với cột chồng cao khác nhau?
6. Bộ xếp 4 nhóm bằng biểu thức chữ (`can-quyet-nhom.ts`): khớp nhầm? (vd `cod`, `hầm`, `đập`, `fs\b` với chữ tiếng Việt, `thủ tục` rất phổ biến, `\bnm\b`). Đo trên 20 dòng thật tuần 40 (tu=2026-09-28): 13 máy chắc, 7 cho AI; kết quả cuối khớp bảng em trình anh (Trước khởi công 9 · Thực thi 1 · ENC 2 · Khác 8).
7. `ganNhom`: dòng AI chỉ dùng khi code KHÔNG chắc; code chắc thì code thắng AI; người luôn thắng. Mã nhóm bản 1 lưu trong bảng bị bỏ qua → AI xếp lại. Đúng chưa?
8. AI xếp nhóm chạy nền (`xepNhomNenBangAi`), 25 dòng/lượt, khoá theo `globalThis` — trùng lượt khi nhiều người mở trang?
9. Quyền chuyển nhóm: máy chủ đòi `cong_viec.giao` hoặc quản trị; giao diện hiện ô theo `giao_duoc_bao_cao` không rỗng — hai điều kiện có lệch nhau không (người có `cong_viec.giao` mà phạm vi rỗng, hoặc ngược lại)?
10. **Lỗi có sẵn** đã đo: luồng Khai báo mẫu khi lưu làm rơi cờ `so_lieu`, ô nhập thông tin dự án của Form 10/11, bảng sinh việc `bang_tien_do_tk` của Form 5. Em vá dữ liệu bằng PUT, **chưa sửa luồng** (đã tách thành việc riêng). Kiểm định nghĩa 3 mẫu trong `dinh-nghia.json` có đúng bằng bản cũ trừ phần chương đã bỏ không.
11. Luật mẫu bỏ khỏi `LUAT_MAU` → `luat/hat-giong.ts` chỉ tự tắt bản đã gieo **chưa ai sửa** (phiên bản 1). Luật f6-* trên máy này đã bị luồng Khai báo tắt.
12. Tệp gốc Form 6 cũ (báo cáo tháng, `goc/OK_Form6…`) nay chuyển ra kỳ «tuần 29» thay vì «tháng 7» (ảnh chuẩn đổi) vì `MAU_THAT` form-6 `loai_ky: "tuan"`. Chấp nhận được?
13. Dòng chữ nhóm 11px trong ô 150px: «Đang thi công · 11 dự án · 3 trễ» bị cắt «…» khi sân thu nhỏ.
14. Vài tệp LF bị kịch bản Python ghi thành CRLF ở thư mục làm việc (git báo sẽ đổi về LF) — có hỏng gì không.
15. Bộ bài kiểm cả bộ: 1.171 đạt · 2 trượt `hoi-trung-hoi-cv.test.ts` (đếm 5 agent thay 4 — do agent Nghiệm thu của phiên khác thêm, không thuộc phạm vi này) · 12 bỏ qua.

## 6. Danh mục kiểm

| # | Kiểm | Cách |
|---|---|---|
| K1 | Mục 4–5: P.ĐT&PC, Ban lãnh đạo không đếm / không liệt kê việc dự án Loại khác; E&C, PMC vẫn đủ; việc nội bộ PMC/E&C không dự án vẫn lên | Đọc `doi-viec.ts`, `SoDoPhong.tsx`; bài kiểm; đo qua `/api/so-cai` + `/api/phong/so-do` |
| K2 | 7b | Đọc `oBdhThayDuAn`; bài kiểm (máy này Main ghi đè BĐH — xem mục 3) |
| K3 | 7 + 8: bung/gập, giữ cột, nhớ theo người, số + chấm đỏ, cột phải chia theo ô con khi gập | Đọc + mở `localhost:3004/so-do` |
| K4 | 6: 4 nhóm đúng định nghĩa bản 2, AI có 🤖 + lý do, người thắng AI, chọn là áp dụng (quy tắc 4), nút không quyền ẩn | Đọc + `GET /api/bao-cao-tuan/can-quyet?tu=2026-09-28&den=2026-10-04&nong=` |
| K5 | Mẫu: Form 5 3 chương · Form 6 tuần 3 chương · Form 11 5 chương gửi E&C; định nghĩa đủ thuộc tính | `mau-word/dinh-nghia.json`, `/api/mau-word/<mã>` |
| K6 | Luật 10, 17, 19, 28 + tiếng Việt mọi chữ mới (giao diện, lỗi API, lời giải thích `noi-dung.ts`) | Đọc |
| K7 | Bài kiểm có khoá lỗi không (bài cũ bị sửa ở `7c7f6f6` — xem diff từng bài) | Đọc diff |

## 7. Luật an toàn khi thử

- **Không mở `data/pgdata`** khi app đang chạy (cổng 3004 đang chạy bản mới). Đo qua API hoặc bản sao.
- Bộ kiểm dùng CSDL thử trong RAM (`tests/helpers/csdl`), không đọc `data/`.
- Không gọi AI thật bằng tay; không bấm «Chuyển nhóm» trên dữ liệu thật trừ khi ghi lại và trả về như cũ.
- Phiên ký thử: `node <scratchpad>/ky-cv2.mjs .env.local <email>` (khoá `AUTH_SECRET` ở `.env.local`) — cookie `sci_congviec_session`. Tài khoản: `ptgd.dai@scigroup.vn` (lãnh đạo), `quantri@scigroup.vn` (quản trị).
- Không `next build` khi cổng đang chạy.

## 8. Khuôn kết quả

`.KET-QUA.md`: kết luận Đạt / Đạt có điều kiện / Không đạt · bảng 🔴 (sai chốt / hỏng) · 🟡 (nên sửa) · ⚪ (nhẹ) — mỗi dòng: `tệp:dòng` · thấy gì · đo bằng lệnh gì · gợi ý. Trả lời từng điểm nghi ở mục 5.
