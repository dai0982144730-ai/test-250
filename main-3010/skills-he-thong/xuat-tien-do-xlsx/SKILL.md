---
name: xuat-tien-do-xlsx
description: >-
  Xuất bảng tiến độ thi công ra file Excel (.xlsx) THẬT bằng script Python kèm
  skill — công thức % sống, dòng tổng =SUM, tô màu theo ngưỡng lệch, đóng băng
  hàng đầu, bật lọc. Dùng khi người dùng cần file Excel tiến độ để gửi đi, in,
  hay sửa tiếp — KHÔNG dùng khi họ chỉ hỏi số liệu (trả lời thẳng là đủ).
---

# Xuất tiến độ ra Excel — script kèm skill

Skill này TẠO FILE THẬT bằng script `scripts/tao_xlsx.py`. Không tự vẽ bảng
bằng chữ — hãy chạy script.

## Cách làm — đúng 3 bước

1. Gom số liệu người dùng cần xuất thành JSON, ghi ra `vao.json` trong thư mục
   làm việc (cwd):

```json
{
  "tieuDe": "TIẾN ĐỘ THI CÔNG — DỰ ÁN <TÊN>",
  "tuan": "2026-W35",
  "dong": [
    {"wbs": "7.2.3.4", "ten": "San gạt mặt bằng Turbine 04", "donVi": "m²",
     "klThietKe": 9000, "klLuyKe": 3146.6, "pctKeHoach": 60.0,
     "nhaThau": "SNP", "gang": true}
  ]
}
```

2. Chạy: `python <thư mục skill này>/scripts/tao_xlsx.py vao.json tien-do.xlsx`
   (đường dẫn script nằm cạnh SKILL.md này — dùng đường dẫn tuyệt đối của nó).

3. Script in `OK <file> — N dòng…` là xong. Báo người dùng tên file vừa tạo và
   nhắc: **tải về ở nút 📎 của khung chat** (file nằm trong thư mục làm việc).

## Luật cứng

- KHÔNG bịa số: chỉ đưa vào JSON những số người dùng cung cấp hoặc số lấy từ
  kết quả công cụ trong lượt chat. Thiếu cột nào bỏ trống cột đó.
- Số liệu là của người dùng — không thêm dòng "ví dụ" nào vào file thật.
- Script lỗi thì trả nguyên văn lỗi cho người dùng, không lặng lẽ vẽ bảng chữ.
