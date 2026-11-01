# -*- coding: utf-8 -*-
"""Xuất bảng tiến độ ra Excel THẬT — công thức sống, màu theo ngưỡng, đóng băng hàng đầu.

Chạy:  python tao_xlsx.py <input.json> <output.xlsx>

input.json:
{
  "tieuDe": "TIẾN ĐỘ THI CÔNG — DỰ ÁN ...",
  "tuan": "2026-W35",
  "dong": [
    {"wbs": "7.2.3", "ten": "San gạt...", "donVi": "m²",
     "klThietKe": 9000, "klLuyKe": 3146.6, "pctKeHoach": 50.0,
     "nhaThau": "SNP", "gang": true}
  ]
}

Khác bản xuất cũ của hệ (thư viện xlsx JS) ở chỗ:
- % hoàn thành là CÔNG THỨC =LK/TK — sửa số trong file thì % tự tính lại
- Dòng tổng dùng =SUM() thật, không phải số chết
- Tô màu theo ngưỡng: %TT < %KH quá 20 điểm → đỏ; 5–20 → vàng
- Đóng băng hàng tiêu đề, bật autofilter — mở ra là lọc được ngay
"""
import json
import sys

# Console Windows mặc định cp1252 không in được tiếng Việt — ép UTF-8 để câu
# báo kết quả không làm CHẾT script sau khi file đã xuất xong (lỗi đo 06/09).
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter


def chay(duong_vao: str, duong_ra: str) -> None:
    du_lieu = json.load(open(duong_vao, encoding="utf-8"))
    dong = du_lieu.get("dong", [])

    wb = Workbook()
    ws = wb.active
    ws.title = "Tiến độ"

    # ===== Kiểu =====
    vien = Border(*[Side(style="thin", color="B0B0B0")] * 4)
    dam = Font(bold=True)
    giua = Alignment(horizontal="center", vertical="center", wrap_text=True)
    phai = Alignment(horizontal="right")
    nen_tieu_de = PatternFill("solid", fgColor="1F4E79")
    chu_trang = Font(bold=True, color="FFFFFF")
    nen_do = PatternFill("solid", fgColor="F4CCCC")
    nen_vang = PatternFill("solid", fgColor="FFF2CC")
    nen_gang = PatternFill("solid", fgColor="FCE5CD")

    # ===== Tiêu đề lớn =====
    ws.merge_cells("A1:I1")
    o = ws["A1"]
    o.value = du_lieu.get("tieuDe", "TIẾN ĐỘ THI CÔNG")
    o.font = Font(bold=True, size=14)
    o.alignment = giua
    ws.merge_cells("A2:I2")
    ws["A2"] = f"Tuần {du_lieu.get('tuan', '')} — xuất tự động từ SCI Tiến độ"
    ws["A2"].alignment = giua
    ws["A2"].font = Font(italic=True, size=9, color="666666")

    # ===== Đầu bảng =====
    cot = ["WBS", "Hạng mục / đầu việc", "ĐVT", "KL thiết kế", "KL lũy kế",
           "% hoàn thành", "% kế hoạch", "Lệch (điểm %)", "Nhà thầu"]
    HANG_DAU = 4
    for i, ten in enumerate(cot, start=1):
        c = ws.cell(row=HANG_DAU, column=i, value=ten)
        c.font = chu_trang
        c.fill = nen_tieu_de
        c.alignment = giua
        c.border = vien

    # ===== Thân bảng — % là CÔNG THỨC, không phải số chết =====
    r = HANG_DAU
    for d in dong:
        r += 1
        gang = bool(d.get("gang"))
        ws.cell(row=r, column=1, value=d.get("wbs", ""))
        c_ten = ws.cell(row=r, column=2, value=("★ " if gang else "") + d.get("ten", ""))
        if gang:
            c_ten.fill = nen_gang
        ws.cell(row=r, column=3, value=d.get("donVi", ""))
        ws.cell(row=r, column=4, value=d.get("klThietKe"))
        ws.cell(row=r, column=5, value=d.get("klLuyKe"))
        # =E/D — sửa lũy kế trong file thì % tự tính lại
        ws.cell(row=r, column=6, value=f"=IF(D{r}>0,E{r}/D{r},\"\")")
        pct_kh = d.get("pctKeHoach")
        ws.cell(row=r, column=7, value=(pct_kh / 100.0) if isinstance(pct_kh, (int, float)) else None)
        ws.cell(row=r, column=8, value=f"=IF(AND(ISNUMBER(F{r}),ISNUMBER(G{r})),(F{r}-G{r})*100,\"\")")
        ws.cell(row=r, column=9, value=d.get("nhaThau", ""))
        for i in range(1, 10):
            ws.cell(row=r, column=i).border = vien
        for i in (4, 5):
            ws.cell(row=r, column=i).number_format = "#,##0.0"
            ws.cell(row=r, column=i).alignment = phai
        for i in (6, 7):
            ws.cell(row=r, column=i).number_format = "0.0%"
            ws.cell(row=r, column=i).alignment = phai
        ws.cell(row=r, column=8).number_format = "+0.0;-0.0"
        ws.cell(row=r, column=8).alignment = phai
        # Tô màu theo lệch tính sẵn (file mở không cần macro): đỏ >20 điểm, vàng 5–20
        pct_tt = None
        tk, lk = d.get("klThietKe"), d.get("klLuyKe")
        if isinstance(tk, (int, float)) and tk > 0 and isinstance(lk, (int, float)):
            pct_tt = lk / tk * 100
        if pct_tt is not None and isinstance(pct_kh, (int, float)):
            lech = pct_tt - pct_kh
            if lech <= -20:
                ws.cell(row=r, column=8).fill = nen_do
            elif lech <= -5:
                ws.cell(row=r, column=8).fill = nen_vang

    # ===== Dòng tổng — =SUM() thật =====
    r += 1
    ws.cell(row=r, column=2, value="TỔNG").font = dam
    for i in (4, 5):
        cl = get_column_letter(i)
        c = ws.cell(row=r, column=i, value=f"=SUM({cl}{HANG_DAU + 1}:{cl}{r - 1})")
        c.font = dam
        c.number_format = "#,##0.0"
        c.alignment = phai
    c = ws.cell(row=r, column=6, value=f"=IF(D{r}>0,E{r}/D{r},\"\")")
    c.font = dam
    c.number_format = "0.0%"
    c.alignment = phai
    for i in range(1, 10):
        ws.cell(row=r, column=i).border = vien

    # ===== Bề rộng cột + đóng băng + lọc =====
    rong = [10, 42, 7, 12, 12, 12, 12, 12, 14]
    for i, w in enumerate(rong, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.freeze_panes = f"A{HANG_DAU + 1}"
    ws.auto_filter.ref = f"A{HANG_DAU}:I{r - 1}"

    wb.save(duong_ra)
    print(f"OK {duong_ra} — {len(dong)} dòng + dòng tổng, công thức sống")


if __name__ == "__main__":
    chay(sys.argv[1], sys.argv[2])
