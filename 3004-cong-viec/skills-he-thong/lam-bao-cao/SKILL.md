---
name: lam-bao-cao
description: >-
  Làm báo cáo tuần/tháng của đơn vị thành file Word ĐÚNG MẪU để nộp. Máy tự lấy
  báo cáo đơn vị đã nộp kỳ trước, mang các việc chưa xong sang; người dùng kể
  bằng lời kỳ này làm được gì, tình hình thế nào, có việc mới nào; thiếu ngày
  kết thúc, kết quả cần có… thì hỏi lại; đủ thì trả file .docx đã qua máy kiểm
  tra + nút "Nộp báo cáo này". Dùng khi nói "làm báo cáo tuần", "viết báo cáo
  tuần này giúp tôi".
---

# Làm báo cáo (/lam-bao-cao)

Skill này do CODE dẫn từng bước (`src/lib/tro-ly/lam-bao-cao.ts`) — file này chỉ để
hiện trong danh sách skill và mô tả cho người dùng.

## Người dùng làm gì

1. Gõ `/lam-bao-cao` (có thể kể luôn: `/lam-bao-cao tuần này xong hồ sơ A, B đang chờ sở ký`).
2. Máy báo đã lấy báo cáo kỳ trước nào, hiện bảng việc mang sang.
3. Kể tình hình bằng lời thường. Máy hỏi lại những chỗ còn thiếu (ngày, kết quả cần có…).
4. Đủ thông tin → tải file .docx hoặc bấm **📤 Nộp báo cáo này** (mở màn Gửi báo cáo với đúng file đó).

## Chuỗi theo dõi việc (Mr. Đại chốt 01/10/2026 — BẮT BUỘC)

Báo cáo kỳ N phải ghi ĐỦ mọi việc trong kế hoạch của báo cáo kỳ N−1, kèm tình hình kỳ này:
- xong trong kỳ → vẫn ghi, Tình trạng "Đã xong (dd/mm/yyyy)";
- dừng / không làm nữa → vẫn ghi, Tình trạng "Dừng: <lý do>";
- còn đang làm → cập nhật tình trạng, hạn.
Chỉ đến kỳ N+1 việc đã xong / đã dừng mới được bỏ khỏi báo cáo. Không được lặng lẽ xoá một việc của kỳ trước —
mất dòng là mất chuỗi theo dõi tuần trước → tuần sau.

## Ai làm gì

| CODE | 🤖 AI |
|---|---|
| Chọn đơn vị, mẫu, kỳ; lấy báo cáo kỳ trước | Đọc lời người dùng → cập nhật từng việc (kèm căn cứ) |
| Soát thiếu bằng đúng bộ luật lúc nộp; tính số ngày | — |
| Điền mẫu Word hiện hành, đặt tên file tiếng Việt, kiểm lần cuối | — |

AI không tự đặt ngày, dự án, kết quả cần có — thiếu thì máy hỏi.
