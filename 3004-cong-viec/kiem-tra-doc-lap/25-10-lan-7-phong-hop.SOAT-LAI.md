# Soát lại kết quả kiểm lần 7 — Phòng họp (phiên «2 Agent Công việc», 25/10/2026 tối)

Kết quả phiên kiểm: ĐẠT CÓ ĐIỀU KIỆN · 🔴 2 · 🟡 9 · ⚪ 14. Soát lại từng điểm bằng đo thật rồi mới sửa.

## Đã sửa

| # | Soát lại | Sửa |
|---|---|---|
| X1 🔴 | Đúng — `chu(b.duong_dan, 500)` không kiểm kiểu, 2 chỗ vẽ `<a href>` thẳng | `laDuongDanHop` (chỉ `http(s)://`) ở `thuan.ts`; máy chủ chặn trong `loiDatHop` (400 tiếng Việt); giao diện chỉ vẽ link khi hợp lệ, còn lại hiện chữ trơn; ô nhập báo đỏ ngay. Bài kiểm: `javascript:`, `JaVaScRiPt:`, `data:` đều bị chặn |
| B1 🔴 | Đúng gốc: khung bọc chuông ở 5 bộ đặt `shrink-0` + `width = 40 + rong` nên nở 300 px là đẩy nút | Khung bọc `flex: 0 1000 <40+rong>px; minWidth: 40` — co trước mọi nút (nút thường hệ số 1, không co dưới chữ của nó); khung nhúng rộng theo bề rộng THẬT đo bằng `ResizeObserver`. Thiếu chỗ thì chỉ dòng chữ hẹp lại. 5 bộ: Main `ae5a813` · HĐ `28c85a4` · NT `52467f2` · TĐ `749ca72` · PL `b0f8b16` |
| X5 | Đúng — `2026-02-31` lọt xuống Postgres | `laNgayThat`; GET trả 400 tiếng Việt; `loiDatHop` báo «Ngày họp … không có trên lịch» |
| X6 | Đúng — hai bản tính (máy chủ + giao diện) theo giờ KẾT THÚC | `ngayGiaoBanKeTiep(thu, tu)` theo giờ bắt đầu, cùng luật `mocBatDauCho`; giao diện gọi đúng hàm máy chủ (bỏ bản chép tay) |
| X7 | Đúng 3 chỗ | `khoangGio` ở chuông đổi giờ (phần «trước»), cảnh báo người bận, «Buổi này đã gửi» |
| X8 | Đúng — lỗi thời từ `3b92154` | Bài hỏi trùng đủ 5 agent (thêm `nghiemthu`), số lượt 5 · 5 · 15 |
| B2 | Đúng theo phép tính tương phản | Ô chữ có nền tối riêng `#1C1917` (đây là nút bấm được — luật 28 cho mặc nền): đỏ ≈ 6,3:1 · trắng ≈ 16:1 trên mọi thanh |
| X10 | Đúng | Báo nở theo `hien.length` (cuộc còn hiện) |
| X11 | Đúng, rủi ro nhỏ | Nghe `sci-chuong-dong` chỉ khi `e.source === window.parent` |
| X12 | Đúng | Chú thích «06:00–18:00 / tới 18:00» → giờ làm việc / 17:00 (thuan, PhongHop, db/89, tên bài kiểm) |
| X13 | Đúng | Xoá mục giải thích chết `ph-nut-lich`; link hộp dòng chữ «Mở màn Phòng họp →», bỏ `xem=lich` |
| X21 | Đúng | Thêm 1 bài: đường dẫn họp, ngày không có thật, biên đúng phút kết thúc (16:59 đang · 17:00 xong); sửa bài giao ban theo X6 (15:10 hôm nay · 15:30 tuần sau) |

Commit 3004: `a274eed` (mã) · `e03fbbf` (hướng dẫn) · `99232b3` (chuông nhúng một hàng — đo thật ra dòng chữ rớt xuống dòng 2, khung 34 px che). B1 làm lại lần 2 ở 5 bộ: đo khoảng trống thật từ chuông tới nút kế bên (Main `5824061` · HĐ `5dacce3` · NT `1a79471` · TĐ `a5adacf` · PL `0690748`) — đo trên Tiến độ: 1.920 px dòng chữ 300 px, nút kế bên không xê dịch; 1.366 px dòng chữ ẩn, trang không tràn. Cách «co trước, hệ số 1000» lần 1 KHÔNG đủ: nhóm chứa chuông không tự nở nên ở 1.920 px vẫn bóp còn 40 px. Bài kiểm Phòng họp + hỏi trùng: 18/18 xanh. `tsc` 6 bộ exit 0.

## Theo gợi ý của phiên kiểm, không đổi mã — chỉ ghi vào hướng dẫn

| # | Lý do |
|---|---|
| Q1 (X2) sửa / huỷ có cộng chuông | Giữ: huỷ làm dòng chữ biến mất lặng lẽ, cần tin chuông để người dự biết. Hướng dẫn tab ④ ghi «chỉ lời mời là dòng chữ; đổi giờ, đổi phòng, huỷ, kết thúc sớm là tin chuông» |
| Q3 (X3) Người xem đặt phòng | Giữ: đúng chữ chốt «mọi người … đều có quyền tổ chức và tự đăng ký họp». Hướng dẫn tab ① ghi rõ |

## Chờ Mr. Đại quyết

| # | |
|---|---|
| Q2 (X4) | Ghi chú, đường dẫn họp, khách ngoài của cuộc họp — ai xem được |

## Không sửa (ghi nhận)

X14 (không ràng buộc trùng giờ trong CSDL — PGlite không chắc có `btree_gist`) · X15 (gửi lại giao ban đổi người đặt) · X16, X17 (hai người sửa cùng lúc — hiếm) · X18 (đo tải khi 30 người mở — làm khi lên máy thật) · X19, X20 (lọc nhà máy / BĐH theo tên — đã ghi trong gói gửi anh Thịnh).
