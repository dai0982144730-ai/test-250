---
name: trich-cong-viec
description: >-
  Đọc một báo cáo/tờ trình Word và trích ra bảng CÔNG VIỆC chuẩn (công việc,
  dự án, bắt đầu, kết thúc, kết quả cần có, tình trạng) để người gửi xác nhận
  trước khi vào sổ cái. Dùng khi hỏi "trích việc trong file này", "báo cáo này
  giao những việc gì", hoặc khi tài liệu chưa có bảng Công việc mà có mục
  "Vấn đề nổi bật và kiến nghị" / "Nội dung cần TGĐ quyết định".
---

# Trích công việc từ file Word (/trich-cong-viec)

Mục tiêu: một bảng việc **sẵn sàng để người gửi bấm xác nhận** — đúng các cột
của bảng Công việc chuẩn SCI công việc. Bạn chỉ ĐỀ XUẤT; việc vào sổ cái do người gửi
xác nhận trên màn Gửi báo cáo.

## Nguồn đọc (theo thứ tự ưu tiên)

1. Bảng Công việc gắn mã (khối "Ô nhập gắn mã" / "Bảng bang_cong_viec" trong file
   đính kèm, hoặc `cau_truc` của `thumuc.doc`) — lấy nguyên từng dòng.
2. Form 0: bảng "Nội dung cần TGĐ quyết định" — mỗi dòng TGĐ đã quyết định là
   một việc giao (cấp 1, đè mọi bản khác).
3. Mẫu tháng (SCI E&C): "KẾT QUẢ VÀ KẾ HOẠCH VIỆC THÁNG TỚI". Các bảng cảnh báo, kiến nghị, số liệu KHÔNG sinh việc.
4. Mục "Vấn đề nổi bật và kiến nghị" của mọi mẫu: kiến nghị **chỉ thành việc khi
   lãnh đạo đã quyết định** — chưa quyết thì liệt kê riêng là "kiến nghị chờ quyết định".

## Quy tắc điền

| Cột | Quy tắc |
|---|---|
| Công việc | Động từ + đối tượng, ngắn: "Chi trả GPMB Trụ T11". Giữ tên dự án/hạng mục nếu có. |
| Dự án | Tên dự án nếu việc thuộc dự án; không thì để trống. Việc mặc định do đơn vị lập báo cáo chủ trì. |
| Bắt đầu / Kết thúc | dd/mm/yyyy. Thiếu ngày kết thúc → ghi chú "thiếu hạn — vào sổ cái là việc treo". KHÔNG tự đoán ngày. Bắt đầu sau kết thúc → đánh dấu lỗi. |
| Kết quả cần có | Sản phẩm bàn giao: "Biên bản thỏa thuận 3 hộ", "Công văn gửi UBND huyện". |
| Tình trạng | Chép nguyên lời báo cáo (đang làm, xong, chờ…). |
| Mã việc | Nếu báo cáo ghi lại mã việc → giữ, việc này cập nhật việc cũ. |

Muốn biết việc đã có trong sổ cái chưa: gọi `socai.danh_sach_viec` với `tu_khoa`
là tên việc/dự án; khớp thì ghi "có vẻ trùng CV-…" — người gửi xác nhận hoặc bỏ qua.
Không bao giờ tự gộp mà không báo.

## Khuôn trả lời

**A. BẢNG CÔNG VIỆC ĐỀ XUẤT**

| # | Công việc | Dự án | Bắt đầu | Kết thúc | Kết quả cần có | Tình trạng | Ghi chú |
|---|---|---|---|---|---|---|---|

Ghi chú: "có vẻ trùng CV-… <tên việc>", "thiếu ngày kết thúc", "thiếu kết quả cần có". Khoảng ngày viết kèm số ngày: "16 ngày · 05/10/2026 – 20/10/2026".

**B. KIẾN NGHỊ CHỜ QUYẾT ĐỊNH** (nếu có) — chưa thành việc.

**C. CẦN NGƯỜI GỬI XÁC NHẬN** — tối đa 3 điểm mơ hồ nhất.

## Luật cứng

- Không bịa người, ngày, mã việc. Không thấy thì để trống và nói rõ.
- Bảng markdown đúng cột trên để xuất Excel được ngay (nút XLSX dưới câu trả lời).
