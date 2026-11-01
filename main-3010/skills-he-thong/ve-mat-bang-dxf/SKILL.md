---
name: ve-mat-bang-dxf
description: >-
  Vẽ mặt bằng dự án điện gió ra file DXF mở được trong AutoCAD bằng script
  Python kèm skill — vị trí trụ turbine (vòng + chữ thập + nhãn), tuyến đường
  nội bộ, tuyến cáp, ranh giới dự án, mỗi loại một layer riêng, kèm khung tên.
  Dùng khi người dùng cần bản vẽ SƠ ĐỒ/MẶT BẰNG từ toạ độ; KHÔNG dùng thay bản
  vẽ kết cấu của kỹ sư thiết kế.
---

# Vẽ mặt bằng ra DXF — script kèm skill

Skill này TẠO FILE DXF THẬT (chuẩn R2013, AutoCAD 2013+ và mọi viewer miễn phí
mở được) bằng `scripts/ve_dxf.py`.

## Cách làm — đúng 3 bước

1. Ghi `mb.json` vào thư mục làm việc. Toạ độ VN-2000, đơn vị mét. Khối nào
   không có dữ liệu thì BỎ HẲN khối đó — script không cần đủ:

```json
{
  "duAn": "Điện gió Hướng Việt", "tyLe": "1:10000",
  "tru": [{"ten": "TB01", "x": 552300, "y": 1821400, "banKinh": 60}],
  "duong": [{"ten": "Đường trục chính", "diem": [[552100, 1821200], [552900, 1821650]]}],
  "cap": [{"ten": "Tuyến cáp 22kV L1", "diem": [[552300, 1821400], [552900, 1821750]]}],
  "ranhGioi": [[552000, 1821100], [554400, 1821100], [554400, 1822700], [552000, 1822700]]
}
```

2. Chạy: `python <thư mục skill này>/scripts/ve_dxf.py mb.json mat-bang.dxf`

3. Báo người dùng tên file. Layer trong bản vẽ: `TRU-TURBINE` · `TRU-NHAN` ·
   `DUONG-NOI-BO` · `TUYEN-CAP` · `RANH-GIOI` · `KHUNG-TEN` — tắt/bật từng lớp
   trong AutoCAD được.

## Luật cứng

- **Toạ độ là dữ liệu, không đoán được** — người dùng chưa đưa toạ độ thì HỎI,
  tuyệt đối không bịa toạ độ cho "đẹp bản vẽ".
- Bản vẽ ra là SƠ ĐỒ. Khung tên đã in sẵn dòng "không thay bản vẽ thiết kế" —
  không xoá dòng đó.
