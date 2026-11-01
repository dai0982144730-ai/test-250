---
name: tong-hop-bao-cao
description: >-
  Gộp báo cáo tuần/tháng của các đơn vị cấp dưới thành báo cáo của đơn vị cấp
  trên (vd Form 1 của P.ĐT&PC từ SCI PMC, SCI E&C, các BQLDA; Form 2 của P.KT&VH
  từ các nhà máy) hoặc BÁO CÁO HỢP NHẤT Form 0 từ các phòng, lấy việc từ sổ cái.
  Dùng khi hỏi "tổng hợp báo cáo tuần 29 cho P.ĐT&PC", "soạn Form 0 tuần này",
  "gộp báo cáo các đơn vị".
---

# Tổng hợp báo cáo (/tong-hop-bao-cao)

## Luồng báo cáo

Đơn vị nào gửi lên đơn vị nào là cấu hình "luồng báo cáo" (Cài đặt), đổi theo thời gian —
KHÔNG tự nhớ. Xem mục BỐI CẢNH của lời dặn, hoặc tra bằng `thumuc.liet_ke` (loai = "den")
của đơn vị tổng hợp: báo cáo nào đã gửi đến là của đơn vị cấp dưới.

## Các bước

1. Xác định báo cáo đích (Form 1 / 2 / 0) và kỳ (tuần N hoặc tháng M/năm). Chưa rõ thì hỏi lại MỘT câu.
2. Lấy báo cáo nguồn cùng kỳ: `thumuc.liet_ke` (don_vi = đơn vị tổng hợp, loai = "den",
   tu_khoa = kỳ) — hoặc theo từng đơn vị nguồn. Đọc từng bản bằng `thumuc.doc`.
3. Lấy việc từ SỔ CÁI thay vì chép tay từ báo cáo:
   - Việc đang mở của từng đơn vị nguồn: `socai.viec_cua_don_vi`.
   - Việc quá hạn/sắp đến hạn: `socai.danh_sach_viec` với `canh_bao`.
   - Việc đã xong trong kỳ: `lichsu.tra_cuu_viec` (tu, den = đầu/cuối kỳ).
   Sổ cái đã áp quy tắc đè — dùng `nguon_hien_hanh` là số đáng tin nhất.
4. Đơn vị nào CHƯA nộp báo cáo kỳ này → ghi rõ tên đơn vị + "chưa nộp" ở mục I, không tự điền thay. Đơn vị cấp dưới lấy theo luồng báo cáo — liệt kê ĐỦ, kể cả đơn vị chưa nộp.
5. Đọc nội dung từng báo cáo nguồn bằng `thumuc.doc` (cột Kết quả cần có, Tình trạng lấy từ file) — sổ cái chỉ để đối chiếu.

## Chuỗi theo dõi việc (Mr. Đại chốt 01/10/2026 — BẮT BUỘC)

Báo cáo kỳ N phải ghi ĐỦ mọi việc trong kế hoạch của báo cáo kỳ N−1, kèm tình hình kỳ này:
- xong trong kỳ → vẫn ghi, Tình trạng "Đã xong (dd/mm/yyyy)";
- dừng / không làm nữa → vẫn ghi, Tình trạng "Dừng: <lý do>";
- còn đang làm → cập nhật tình trạng, hạn.
Chỉ đến kỳ N+1 việc đã xong / đã dừng mới được bỏ khỏi báo cáo. Không được lặng lẽ xoá một việc của kỳ trước —
mất dòng là mất chuỗi theo dõi tuần trước → tuần sau.

## Khuôn báo cáo tổng hợp

**I. THÔNG TIN CHUNG** — đơn vị lập, kỳ, danh sách báo cáo nguồn đã gộp (link).

**II. TÌNH HÌNH THỰC HIỆN THEO ĐƠN VỊ** — mỗi đơn vị 3–5 gạch, giữ số liệu gốc.

**III. CÔNG VIỆC** — bảng chuẩn SCI công việc (để kỳ sau đọc lại vào sổ cái):

| Công việc | Dự án | Bắt đầu | Kết thúc | Kết quả cần có | Tình trạng |
|---|---|---|---|---|---|

Việc không có hạn ghi "thường xuyên". Đối chiếu bảng việc của báo cáo tổng hợp KỲ TRƯỚC (`thumuc.liet_ke` báo cáo của chính đơn vị tổng hợp, kỳ trước) — việc nào của kỳ trước không còn ở bảng này là sai luật chuỗi theo dõi. Tình trạng: đang làm 1/2 · quá hạn · xong trong kỳ.

**IV. VẤN ĐỀ NỔI BẬT VÀ KIẾN NGHỊ** — gộp kiến nghị các đơn vị, bỏ trùng.
Riêng Form 0: bảng quyết định — mỗi dòng một đề xuất, có người phụ trách + hạn quyết định.

## Luật cứng

- Số liệu chỉ lấy từ báo cáo nguồn và sổ cái; thiếu thì ghi "Chưa có thông tin".
- Không đổi thứ tự mục; mục không có nội dung ghi "Không phát sinh".
- Muốn ra file Word: chọn nút DOCX dưới ô nhập rồi gửi lại yêu cầu (hoặc bấm DOCX dưới câu trả lời).
- Mẫu hiện hành không có ô chữ ký / người lập — không thêm vào.
- Muốn ra đúng file Word theo mẫu để nộp: dùng skill `/lam-bao-cao`.
