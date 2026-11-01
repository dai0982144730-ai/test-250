---
name: xuat-bao-cao-docx
description: >-
  Xuất báo cáo tuần BQLDA ra file Word (.docx) đúng khuôn 7 mục chuẩn SCI bằng
  script Python kèm skill — quốc hiệu, 7 mục cố định, bảng kẻ viền, khối chữ ký
  hai cột. Dùng khi người dùng cần FILE Word báo cáo để ký/gửi; soạn nội dung
  chữ thì dùng skill viet-bao-cao-tuan trước rồi mới xuất.
---

# Xuất báo cáo tuần ra Word — script kèm skill

Skill này TẠO FILE THẬT bằng `scripts/tao_docx.py`. Nội dung chữ soạn theo
khung 7 mục của skill `viet-bao-cao-tuan` (I. Thông tin chung · II. Tiến độ
tổng thể · III. Chi tiết đường găng · IV. Kế hoạch tuần sau · V. GPMB ·
VI. Rủi ro & kiến nghị · VII. Việc cần BQL giải quyết).

## Cách làm — đúng 3 bước

1. Ghi `bc.json` vào thư mục làm việc. Mỗi mục nhận `doan` (mảng đoạn văn)
   và/hoặc `bang` (mảng hàng, hàng đầu là tiêu đề):

```json
{
  "duAn": "Điện gió Hướng Việt", "tuan": "2026-W35", "ngay": "07/09/2026",
  "nguoiKy": "Nguyễn Chính Đại", "chucDanh": "Giám đốc Ban",
  "muc": {
    "I":  {"bang": [["Hạng mục", "Giá trị"], ["Tên dự án", "..."]]},
    "II": {"doan": ["%TT 12,4 so %KH 15,1 — chậm 2,7 điểm."],
           "bang": [["Chỉ tiêu", "KH", "TT", "Lệch"]]},
    "VI": {"doan": ["..."]}
  }
}
```

   Mục thiếu thì script TỰ ghi "Không phát sinh." — đừng bịa nội dung lấp chỗ.

2. Chạy: `python <thư mục skill này>/scripts/tao_docx.py bc.json bao-cao-W35.docx`

3. Báo người dùng tên file + nhắc đây là **BẢN NHÁP AI, người duyệt rồi mới
   phát hành** (dòng này đã in sẵn trong ô ký của file).

## Luật cứng

- Mọi con số trong file phải là số người dùng đưa hoặc số từ kết quả công cụ —
  số không nguồn thì bỏ ra, liệt kê cuối câu trả lời là còn thiếu gì.
- Không đổi thứ tự 7 mục, không gộp mục.
