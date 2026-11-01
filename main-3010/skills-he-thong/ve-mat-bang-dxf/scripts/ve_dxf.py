# -*- coding: utf-8 -*-
"""Vẽ mặt bằng dự án điện gió ra DXF mở được trong AutoCAD.

Chạy:  python ve_dxf.py <input.json> <output.dxf>

input.json:
{
  "duAn": "Điện gió Hướng Việt", "tyLe": "1:10000",
  "tru": [ {"ten": "TB01", "x": 552310.5, "y": 1821450.2, "banKinh": 60} ],
  "duong": [ {"ten": "Đường trục chính", "diem": [[x,y], [x,y], ...]} ],
  "cap":   [ {"ten": "Tuyến cáp 22kV L1", "diem": [[x,y], ...]} ],
  "ranhGioi": [[x,y], ...]        (tuỳ chọn — polyline khép kín)
}
Toạ độ VN-2000 (mét). Thiếu khối nào bỏ khối đó, không bịa.

PHẠM VI THẬT (đã nói rõ với Mr. Đại): bản vẽ SƠ ĐỒ / MẶT BẰNG — vị trí trụ,
tuyến đường, tuyến cáp, ranh giới — KHÔNG thay bản vẽ kết cấu của kỹ sư.

Mỗi loại một LAYER đúng lệ bản vẽ: tắt/bật từng lớp trong AutoCAD được.
"""
import json
import math
import sys

# Console Windows mặc định cp1252 không in được tiếng Việt — ép UTF-8 để câu
# báo kết quả không làm CHẾT script sau khi file đã xuất xong (lỗi đo 06/09).
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

import ezdxf


def chay(duong_vao: str, duong_ra: str) -> None:
    d = json.load(open(duong_vao, encoding="utf-8"))
    doc = ezdxf.new("R2013", setup=True)  # R2013 — AutoCAD 2013+ và các viewer free đều mở được
    msp = doc.modelspace()

    # ===== Layer — mỗi loại đối tượng một lớp, màu ACI chuẩn =====
    for ten, mau in [
        ("TRU-TURBINE", 1),      # đỏ
        ("TRU-NHAN", 7),         # trắng/đen
        ("DUONG-NOI-BO", 3),     # xanh lá
        ("TUYEN-CAP", 4),        # xanh lơ
        ("RANH-GIOI", 6),        # tím
        ("KHUNG-TEN", 7),
    ]:
        doc.layers.add(name=ten, color=mau)

    diem_tat_ca: list = []

    # ===== Trụ turbine: tâm + vòng cánh quạt + chữ thập định vị + nhãn =====
    for t in d.get("tru", []):
        x, y = float(t["x"]), float(t["y"])
        bk = float(t.get("banKinh", 60))
        diem_tat_ca.append((x, y))
        msp.add_circle((x, y), radius=bk, dxfattribs={"layer": "TRU-TURBINE"})
        cheo = bk * 0.25
        msp.add_line((x - cheo, y), (x + cheo, y), dxfattribs={"layer": "TRU-TURBINE"})
        msp.add_line((x, y - cheo), (x, y + cheo), dxfattribs={"layer": "TRU-TURBINE"})
        msp.add_text(
            str(t.get("ten", "")),
            dxfattribs={"layer": "TRU-NHAN", "height": bk * 0.5},
        ).set_placement((x + bk * 1.15, y + bk * 0.35))

    # ===== Đường nội bộ + tuyến cáp: polyline theo lớp riêng =====
    for khoa, layer in [("duong", "DUONG-NOI-BO"), ("cap", "TUYEN-CAP")]:
        for tuyen in d.get(khoa, []):
            diem = [(float(p[0]), float(p[1])) for p in tuyen.get("diem", [])]
            if len(diem) < 2:
                continue
            diem_tat_ca.extend(diem)
            msp.add_lwpolyline(diem, dxfattribs={"layer": layer})
            gx, gy = diem[len(diem) // 2]
            msp.add_text(
                str(tuyen.get("ten", "")), dxfattribs={"layer": layer, "height": 25}
            ).set_placement((gx, gy + 30))

    # ===== Ranh giới dự án: polyline khép kín nét đứt =====
    rg = [(float(p[0]), float(p[1])) for p in d.get("ranhGioi", [])]
    if len(rg) >= 3:
        diem_tat_ca.extend(rg)
        doc.linetypes.add("DUT", pattern=[19.0, 12.5, -6.5])
        msp.add_lwpolyline(
            rg, close=True, dxfattribs={"layer": "RANH-GIOI", "linetype": "DUT"}
        )

    if not diem_tat_ca:
        raise SystemExit("Không có toạ độ nào để vẽ — kiểm lại input.json.")

    # ===== Khung tên góc dưới phải, đặt theo khổ hình thật =====
    xs = [p[0] for p in diem_tat_ca]
    ys = [p[1] for p in diem_tat_ca]
    rong = max(xs) - min(xs) or 100.0
    cao_chu = max(rong * 0.012, 10.0)
    kx, ky = max(xs), min(ys) - cao_chu * 6
    khung_w, khung_h = cao_chu * 28, cao_chu * 5
    msp.add_lwpolyline(
        [(kx - khung_w, ky), (kx, ky), (kx, ky + khung_h), (kx - khung_w, ky + khung_h)],
        close=True,
        dxfattribs={"layer": "KHUNG-TEN"},
    )
    for i, dong_chu in enumerate([
        f"MẶT BẰNG BỐ TRÍ — {d.get('duAn', '').upper()}",
        f"Tỷ lệ {d.get('tyLe', 'theo toạ độ, mét')} · hệ VN-2000",
        "Bản vẽ SƠ ĐỒ do SCI Tiến độ sinh — không thay bản vẽ thiết kế",
    ]):
        msp.add_text(
            dong_chu,
            dxfattribs={"layer": "KHUNG-TEN", "height": cao_chu * (1.2 if i == 0 else 0.8)},
        ).set_placement((kx - khung_w + cao_chu, ky + khung_h - cao_chu * (1.6 + i * 1.3)))

    doc.saveas(duong_ra)
    n_tru = len(d.get("tru", []))
    print(f"OK {duong_ra} — {n_tru} trụ, {len(d.get('duong', []))} tuyến đường, "
          f"{len(d.get('cap', []))} tuyến cáp, 6 layer")


if __name__ == "__main__":
    chay(sys.argv[1], sys.argv[2])
