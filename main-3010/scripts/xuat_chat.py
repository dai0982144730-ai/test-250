# -*- coding: utf-8 -*-
"""
XUẤT CÂU TRẢ LỜI TRỢ LÝ ra DOCX / XLSX / DXF (S8 tầng 2 — lệnh Mr. Đại 05/09).

stdin  : JSON {"dinh_dang": "docx|xlsx|dxf", "tieu_de": "...", "noi_dung": "<markdown>",
               "duong_ra": "<đường dẫn file cần ghi>"}
stdout : JSON {"ok": true} hoặc {"ok": false, "loi": "..."}

Chỉ dùng 3 thư viện ĐÃ CÓ trên máy chủ (đo 05/09): python-docx, openpyxl, ezdxf.
Markdown hiểu mức đủ dùng: tiêu đề #, đậm **x**, gạch đầu dòng -/•, bảng | a | b |.
"""
import json
import re
import sys


def doc_markdown(md):
    """Tách markdown thành khối: {"loai": "tieu-de"|"doan"|"muc"|"bang", ...}"""
    khoi = []
    bang = None
    for dong in md.replace("\r\n", "\n").split("\n"):
        s = dong.strip()
        la_bang = s.startswith("|") and s.endswith("|") and s.count("|") >= 2
        if la_bang:
            o = [c.strip() for c in s.strip("|").split("|")]
            if all(re.fullmatch(r":?-{2,}:?", c or "-") for c in o):
                continue  # dòng kẻ |---|---|
            if bang is None:
                bang = []
            bang.append(o)
            continue
        if bang is not None:
            khoi.append({"loai": "bang", "dong": bang})
            bang = None
        if s == "":
            continue
        m = re.match(r"^(#{1,6})\s+(.*)$", s)
        if m:
            khoi.append({"loai": "tieu-de", "cap": len(m.group(1)), "chu": m.group(2)})
        elif re.match(r"^[-*•]\s+", s):
            khoi.append({"loai": "muc", "chu": re.sub(r"^[-*•]\s+", "", s)})
        else:
            khoi.append({"loai": "doan", "chu": s})
    if bang is not None:
        khoi.append({"loai": "bang", "dong": bang})
    return khoi


def bo_dam(s):
    return s.replace("**", "").replace("`", "")


def xuat_docx(tieu_de, khoi, duong_ra):
    from docx import Document
    from docx.shared import Pt

    doc = Document()
    doc.add_heading(tieu_de, level=1)
    for k in khoi:
        if k["loai"] == "tieu-de":
            doc.add_heading(bo_dam(k["chu"]), level=min(k["cap"] + 1, 4))
        elif k["loai"] == "muc":
            doc.add_paragraph(bo_dam(k["chu"]), style="List Bullet")
        elif k["loai"] == "bang":
            dong = k["dong"]
            if not dong:
                continue
            so_cot = max(len(d) for d in dong)
            b = doc.add_table(rows=len(dong), cols=so_cot)
            b.style = "Table Grid"
            for i, d in enumerate(dong):
                for j in range(so_cot):
                    o = b.cell(i, j)
                    o.text = bo_dam(d[j]) if j < len(d) else ""
                    if i == 0:
                        for run in o.paragraphs[0].runs or [o.paragraphs[0].add_run("")]:
                            run.bold = True
        else:
            p = doc.add_paragraph()
            # giữ ĐẬM của **...**
            for phan in re.split(r"(\*\*[^*]+\*\*)", k["chu"]):
                if phan.startswith("**") and phan.endswith("**"):
                    p.add_run(phan[2:-2]).bold = True
                elif phan:
                    p.add_run(phan.replace("`", ""))
            for run in p.runs:
                run.font.size = Pt(11)
    doc.save(duong_ra)


def xuat_xlsx(tieu_de, khoi, duong_ra):
    from openpyxl import Workbook
    from openpyxl.styles import Font

    wb = Workbook()
    ws = wb.active
    ws.title = "Trả lời trợ lý"
    ws.append([tieu_de])
    ws["A1"].font = Font(bold=True, size=13)
    ws.append([])
    for k in khoi:
        if k["loai"] == "bang":
            for i, d in enumerate(k["dong"]):
                ws.append([bo_dam(c) for c in d])
                if i == 0:
                    for cell in ws[ws.max_row]:
                        cell.font = Font(bold=True)
            ws.append([])
        elif k["loai"] == "tieu-de":
            ws.append([bo_dam(k["chu"])])
            ws[f"A{ws.max_row}"].font = Font(bold=True)
        else:
            ws.append([("• " if k["loai"] == "muc" else "") + bo_dam(k["chu"])])
    # nới cột theo dữ liệu (trần 60 ký tự cho khỏi vô hạn)
    for cot in ws.columns:
        rong = max((len(str(c.value)) for c in cot if c.value is not None), default=8)
        ws.column_dimensions[cot[0].column_letter].width = min(rong + 2, 60)
    wb.save(duong_ra)


def xuat_dxf(tieu_de, khoi, duong_ra):
    """Bản vẽ chữ mở bằng AutoCAD: mỗi dòng một TEXT; bảng kẻ LINE + TEXT.
    Đơn vị bản vẽ: 1 = 1mm; chữ cao 3.5mm (chuẩn ghi chú bản vẽ)."""
    import ezdxf

    doc = ezdxf.new("R2010")  # DXF 2010 — AutoCAD 2010+ mở được
    msp = doc.modelspace()
    cao, buoc, y = 5.0, 9.0, 0.0
    msp.add_text(tieu_de, dxfattribs={"height": cao * 1.4}).set_placement((0, y))
    y -= buoc * 1.8
    for k in khoi:
        if k["loai"] == "bang":
            dong = k["dong"]
            so_cot = max(len(d) for d in dong)
            rong_cot = 70.0
            for i, d in enumerate(dong):
                for j in range(so_cot):
                    chu = bo_dam(d[j]) if j < len(d) else ""
                    msp.add_text(chu[:38], dxfattribs={"height": cao * 0.8}).set_placement(
                        (j * rong_cot + 2, y - buoc * i - buoc + 2)
                    )
            # kẻ khung
            rong = so_cot * rong_cot
            cao_bang = len(dong) * buoc
            for i in range(len(dong) + 1):
                msp.add_line((0, y - buoc * i), (rong, y - buoc * i))
            for j in range(so_cot + 1):
                msp.add_line((j * rong_cot, y), (j * rong_cot, y - cao_bang))
            y -= cao_bang + buoc
        else:
            chu = bo_dam(k.get("chu", ""))
            if k["loai"] == "muc":
                chu = "- " + chu
            h = cao * (1.15 if k["loai"] == "tieu-de" else 1.0)
            msp.add_text(chu[:110], dxfattribs={"height": h}).set_placement((0, y))
            y -= buoc
    doc.saveas(duong_ra)


def main():
    d = json.loads(sys.stdin.buffer.read().decode("utf-8"))
    dinh_dang = d["dinh_dang"]
    khoi = doc_markdown(d["noi_dung"])
    if dinh_dang == "docx":
        xuat_docx(d["tieu_de"], khoi, d["duong_ra"])
    elif dinh_dang == "xlsx":
        xuat_xlsx(d["tieu_de"], khoi, d["duong_ra"])
    elif dinh_dang == "dxf":
        xuat_dxf(d["tieu_de"], khoi, d["duong_ra"])
    else:
        raise ValueError("Không hỗ trợ định dạng: " + dinh_dang)
    print(json.dumps({"ok": True}))


if __name__ == "__main__":
    try:
        main()
    except Exception as e:  # noqa: BLE001 — trả lỗi JSON cho Node đọc
        print(json.dumps({"ok": False, "loi": str(e)}, ensure_ascii=False))
        sys.exit(1)
