# SOÁT LẠI kết quả kiểm độc lập — Quản lý token AI Đợt 1 + 1b (phiên "1 Agent quan sát", 04/10 ~03:00)

> Kết quả của phiên "0 Kiểm tra độc lập": `04-10-token-ai-dot-1.KET-QUA.md` (không lỗi 🔴 · 3 🟡 · 7 ⚪, bản kiểm chưa trọn vì hết hạn mức).
> Phiên gửi đo lại TỪNG điểm trước khi sửa. Sửa ở commit ngay sau file này.

## Từng điểm

| # | Phiên kiểm nói | Đo lại | Xử lý |
|---|---|---|---|
| 1 🟡 | Sổ `data/ai-*.jsonl` (có mã người) chưa vào `.gitignore` | ĐÚNG — `git check-ignore` trả rỗng cho cả 5 sổ | **Sửa**: thêm `data/ai-*.jsonl`, `data/ai-*.jsonl.tam`, `data/ai-tai-khoan-het.json` (cùng loại `data/chat/`). Đo: 6/6 sổ bị chặn, `ai-danh-muc-model.json` · `ai-model-cli.json` · `nhat-ky-hoi-agent.jsonl` KHÔNG bị chặn nhầm |
| 2 🟡 | Góp ý + luật AI sau khi nộp kế thừa ngữ cảnh người → có thể dùng tài khoản cá nhân | ĐÚNG — trùng giả định phiên gửi đã ghi (N1) | **⏸ Hỏi Mr. Đại** — nghĩa "việc nền" ở T7. Code giữ nguyên (cách ① "chỉ bộ hẹn giờ") tới khi anh chốt |
| 3 🟡 | Tài khoản công ty lỗi 401 (mã hết hạn) → không chuyển tài khoản, không ghi ngừng | ĐÚNG. Hiện tk1/tk2 chưa ai dán mã → chưa thể xảy ra | **⏸ Hỏi Mr. Đại** kèm đề xuất: coi như tài khoản tạm không dùng được, chuyển TK kia, báo chuông quản trị |
| 4 ⚪ | Công ty đánh dấu hết bằng mốc ĐOÁN 15 phút → đi thẳng tài khoản cá nhân | ĐÚNG — trái thứ tự T7 "công ty trước" | **Sửa**: thêm cờ `het_doan` (ghi đĩa); mốc đoán thì thử công ty MỘT lần trước. Test mới: mốc đoán + tk1 đã mở → chạy tk1, không đụng cá nhân; tk1 vẫn hết → sang cá nhân |
| 5 ⚪ | Người thường thấy `goi: "Claude Max"` | ĐÚNG (có từ trước đợt này) | **Sửa**: gói chỉ cho người có `cau_hinh.sua`. Đo: người thường 0 lần, quản trị thấy "Claude Max" |
| 6 ⚪ | `?ngay=2026-13-45` → lặng lẽ trả hôm nay | ĐÚNG | **Sửa**: 400 "Ngày "2026-13-45" không có thật — ghi dạng năm-tháng-ngày, ví dụ 2026-10-04." |
| 7 ⚪ | `hover:bg-white/5` viết tay (luật 25) | ĐÚNG — 2 chỗ | **Sửa**: `color-mix(in srgb, var(--text) 6%, transparent)` |
| 8 ⚪ | Câu lỗi + "hết hạn mức" chữ đỏ (đỏ dành cho Issue) | ĐÚNG | **Sửa** "hết hạn mức — dùng lại khoảng…" ở khung Hai tài khoản → vàng (T10: ngừng = vàng). Câu báo lỗi đỏ (nếp hộp báo nhanh chung cả app) → **⏸ hỏi Mr. Đại** |
| 9 ⚪ | `0o600` vô tác dụng trên Windows | ĐÚNG | Không sửa (ghi chú đủ) |
| 10 ⚪ | Sổ cũ `ai-do-thoi-gian.jsonl` ghi song song | ĐÚNG, không đếm đôi | Để sau 1 tuần sổ mới chạy ổn rồi bỏ ghi sổ cũ |

## Phần phiên kiểm chưa đo được — phiên gửi đo bổ sung

| Việc | Số đo |
|---|---|
| Bộ test đủ `vitest --maxWorkers=2` | 936 đạt · 1 hỏng do sửa file giữa lượt (chạy lại đạt) · 12 bỏ qua; **0 lượt CLI thật** (đếm sổ phiên CLI `~/.claude/projects/*docflow-ai-sandbox*` sau mốc) |
| Cụm test AI sau các sửa trên | 59/59 (7 file) · tsc 0 lỗi · 0 lượt CLI thật |
| N13 sổ 13 tháng | Sổ giả 100.000 dòng = 25,9 MB: mở Ngày đọc 112 ms · Tuần 128 ms · Tháng 114 ms; tính 1 ms; heap 123–187 MB lúc đọc. Không cần sửa (bài đo tạm đã xoá) |
| curl sau sửa | `/cai-dat` · `/tai-khoan-claude` · `/so-do` · `/api/ai/tai-khoan-ca-nhan` 200/200; `/api/ai/thong-ke` 200 / người thường 403 |

## Ghi chú về câu "Mr. Đại đã duyệt gửi tự động" (dòng 5 của KET-QUA)
Đúng là lời phiên Quan sát nói — nguồn: anh trả "đồng ý làm đi" cho 11 đề xuất đêm 03/10, đề xuất 9 = "xong Đợt 1 tự gửi phiên 0 Kiểm tra độc lập". Anh xác nhận lại khi đọc báo cáo sáng.
