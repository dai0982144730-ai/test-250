# -*- coding: utf-8 -*-
"""Xuất báo cáo tuần BQLDA ra Word theo khuôn 7 mục chuẩn SCI.

Chạy:  python tao_docx.py <input.json> <output.docx>

input.json:
{
  "duAn": "Điện gió Hướng Việt", "tuan": "2026-W35", "ngay": "07/09/2026",
  "nguoiKy": "Nguyễn Chính Đại", "chucDanh": "Giám đốc Ban",
  "muc": {
    "I":   {"bang": [["Tên dự án", "Điện gió Hướng Việt"], ...]},
    "II":  {"doan": ["%TT 12,4 so %KH 15,1 — chậm 2,7 điểm..."],
            "bang": [["Chỉ tiêu","KH","TT","Lệch"], ...]},
    "III": {"doan": [...]}, "IV": {"bang": [...]}, "V": {"doan": [...]},
    "VI":  {"doan": [...]}, "VII": {"doan": [...]}
  }
}
Mục nào thiếu → tự ghi "Không phát sinh." (đúng luật skill viet-bao-cao-tuan).

Khác bản xuất cũ (report-docx.ts):
- Bảng nào cũng kẻ viền, hàng đầu tô nền đậm chữ trắng
- Khối chữ ký hai cột đúng lệ công văn
- Nhận MỌI mục dạng đoạn + bảng trộn nhau — không bó vào một khuôn cứng
"""
import json
import sys

# Console Windows mặc định cp1252 không in được tiếng Việt — ép UTF-8 để câu
# báo kết quả không làm CHẾT script sau khi file đã xuất xong (lỗi đo 06/09).
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

# Tên mục ĐÚNG CHỮ form gốc "Báo cáo tuần của BQLDA.docx" (bóc 02/09)
TEN_MUC = {
    "I": "THÔNG TIN CHUNG DỰ ÁN",
    "II": "TIẾN ĐỘ TỔNG THỂ (Phân tích theo mục thi công)",
    "III": "CHI TIẾT TIẾN ĐỘ TỪNG HẠNG MỤC NẰM TRÊN ĐƯỜNG GĂNG",
    "IV": "KẾ HOẠCH CÔNG VIỆC TUẦN SAU (Lấy theo báo cáo tuần kỹ thuật hiện trường)",
    "V": "GPMB & QUAN HỆ ĐỊA PHƯƠNG",
    "VI": "RỦI RO & KIẾN NGHỊ CHUNG CHO DỰ ÁN MÀ BĐH NHẬN THẤY",
    "VII": "KẾ HOẠCH CÔNG VIỆC TUẦN TỚI CẦN BQL GIẢI QUYẾT",
}
XANH_SCI = RGBColor(0x1F, 0x4E, 0x79)


def to_nen(o_cell, mau_hex: str) -> None:
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:fill"), mau_hex)
    o_cell._tc.get_or_add_tcPr().append(shd)


def them_bang(doc: Document, hang: list) -> None:
    if not hang:
        return
    bang = doc.add_table(rows=len(hang), cols=max(len(h) for h in hang))
    bang.style = "Table Grid"
    bang.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, h in enumerate(hang):
        for j, gia_tri in enumerate(h):
            o = bang.cell(i, j)
            o.text = str(gia_tri)
            for p in o.paragraphs:
                for r in p.runs:
                    r.font.size = Pt(10)
                    if i == 0:
                        r.font.bold = True
                        r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
            if i == 0:
                to_nen(o, "1F4E79")
    doc.add_paragraph()


def chay(duong_vao: str, duong_ra: str) -> None:
    d = json.load(open(duong_vao, encoding="utf-8"))
    doc = Document()

    # Lề chuẩn công văn
    for sec in doc.sections:
        sec.left_margin, sec.right_margin = Cm(3), Cm(2)
        sec.top_margin, sec.bottom_margin = Cm(2), Cm(2)

    # ===== Đầu văn bản — ĐÚNG bảng 1 + bảng 2 của form gốc (bóc 02/09) =====
    dau = doc.add_table(rows=1, cols=2)
    dau.style = "Table Grid"
    trai, phai = dau.cell(0, 0), dau.cell(0, 1)
    trai.text = "BAN ĐIỀU HÀNH TỔNG THẦU\nGửi: Phòng Đầu tư & Pháp chế — SCI Corp"
    phai.text = f"BÁO CÁO TUẦN\nBQLDA DỰ ÁN {d.get('duAn', '').upper()}"
    for o, co_mau in ((trai, False), (phai, True)):
        for p in o.paragraphs:
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for r in p.runs:
                r.font.size = Pt(11)
                r.font.bold = True
                if co_mau:
                    r.font.color.rgb = XANH_SCI

    tuan = d.get("tuan", "")
    nam, so_tuan = (tuan.split("-W") + [""])[:2] if "-W" in tuan else ("", tuan)
    ky = doc.add_table(rows=2, cols=4)
    ky.style = "Table Grid"
    o_ky = [
        ("Kỳ báo cáo:", f"☒ Tuần {so_tuan}/{nam} ({d.get('kyBaoCao', '')})\n☐ Tháng ……/{nam}"),
        ("Người lập:", d.get("nguoiKy", "……")),
        ("Ngày lập:", d.get("ngay", "")),
        ("Người kiểm soát:", "Phó Giám đốc phụ trách"),
    ]
    for i, (nhan, gia_tri) in enumerate(o_ky):
        hang, cot = divmod(i, 2)
        ky.cell(hang, cot * 2).text = nhan
        ky.cell(hang, cot * 2 + 1).text = gia_tri
    for row in ky.rows:
        for o in row.cells:
            for p in o.paragraphs:
                for r in p.runs:
                    r.font.size = Pt(10)
    doc.add_paragraph()

    # ===== 7 mục — thiếu mục nào ghi "Không phát sinh." =====
    muc = d.get("muc", {})
    for so in ["I", "II", "III", "IV", "V", "VI", "VII"]:
        p = doc.add_paragraph()
        r = p.add_run(f"{so}. {TEN_MUC[so]}")
        r.font.bold = True
        r.font.size = Pt(12)
        r.font.color.rgb = XANH_SCI

        noi_dung = muc.get(so) or {}
        doan = noi_dung.get("doan") or []
        bang = noi_dung.get("bang") or []
        if not doan and not bang:
            doc.add_paragraph("Không phát sinh.")
            continue
        for chu in doan:
            pp = doc.add_paragraph(str(chu))
            for rr in pp.runs:
                rr.font.size = Pt(11)
        them_bang(doc, bang)

    # ===== Địa danh ngày tháng + khối ký — đúng bảng 10 của form gốc =====
    ngay_lap = d.get("ngay", "")  # dd/mm/yyyy
    phan_ngay = ngay_lap.split("/") if ngay_lap.count("/") == 2 else ["…", "…", "…"]
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    r = p.add_run(f"Hà Nội, ngày {phan_ngay[0]} tháng {phan_ngay[1]} năm {phan_ngay[2]}")
    r.font.italic = True
    r.font.size = Pt(11)

    ky3 = doc.add_table(rows=1, cols=3)
    ky3.alignment = WD_TABLE_ALIGNMENT.CENTER
    ba_cap = [
        ("NGƯỜI LẬP", "(Ký, ghi rõ họ tên)", d.get("nguoiKy", "")),
        ("TRƯỞNG PHÒNG / GĐ ĐƠN VỊ", "(Ký, ghi rõ họ tên)", ""),
        ("PHÓ TỔNG GIÁM ĐỐC PHỤ TRÁCH", "(Ký, đóng dấu)", ""),
    ]
    for i, (vai_tro, kieu_ky, ten) in enumerate(ba_cap):
        o = ky3.cell(0, i)
        o.text = f"{vai_tro}\n{kieu_ky}\n\n\n\n{ten}"
        for p in o.paragraphs:
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for r in p.runs:
                r.font.size = Pt(10)
                r.font.bold = True

    doc.save(duong_ra)
    print(f"OK {duong_ra} — đúng form gốc: đầu 2 bảng, 7 mục, ký 3 cấp")


if __name__ == "__main__":
    chay(sys.argv[1], sys.argv[2])
