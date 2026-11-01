import { describe, it, expect } from "vitest";
import { lamSachHtml } from "@/lib/thu-muc/lam-sach-html";
import { taoBanXem, hienTrucTiepDuoc, doanMime } from "@/lib/thu-muc/xem-truoc";

describe("xem trước: làm sạch HTML", () => {
  it("giữ thẻ trình bày, bỏ script/style/iframe và mọi on*", () => {
    const vao =
      '<p onclick="x()">Chào <strong>bố</strong></p><script>alert(1)</script><style>p{}</style>' +
      '<iframe src="http://x"></iframe><table><tr><td colspan="2" style="color:red">ô</td></tr></table>';
    const ra = lamSachHtml(vao);
    expect(ra).toBe('<p>Chào <strong>bố</strong></p><table><tr><td colspan="2">ô</td></tr></table>');
  });

  it("chặn javascript: kể cả mã hóa, chỉ cho ảnh data:image", () => {
    expect(lamSachHtml('<a href="javascript:alert(1)">x</a>')).toBe("<a>x</a>");
    expect(lamSachHtml('<a href="jav&#x61;script:alert(1)">x</a>')).toBe("<a>x</a>");
    expect(lamSachHtml('<a href="https://scigroup.vn">x</a>')).toBe('<a href="https://scigroup.vn" target="_blank" rel="noopener noreferrer">x</a>');
    expect(lamSachHtml('<img src="data:image/png;base64,iVBORw0KGgo=" onerror="x()">')).toBe('<img src="data:image/png;base64,iVBORw0KGgo=">');
    expect(lamSachHtml('<img src="data:text/html;base64,PHNjcmlwdD4=">')).toBe("<img>");
    expect(lamSachHtml("<svg><script>alert(1)</script></svg>ok")).toBe("ok");
    expect(lamSachHtml('<img src="x>" onerror=alert(1)>')).not.toMatch(/<img[^>]*onerror/);
    expect(lamSachHtml("<<script>script>alert(1)<</script>/script>")).not.toMatch(/<script/i);
  });

  it("docx thật → HTML (mammoth), pdf/ảnh hiện trực tiếp, đuôi lạ báo tải về", async () => {
    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell } = await import("docx");
    const tai = new Document({
      sections: [
        {
          children: [
            new Paragraph({ children: [new TextRun({ text: "Báo cáo tuần 29", bold: true })] }),
            new Table({ rows: [new TableRow({ children: [new TableCell({ children: [new Paragraph("GPMB T11")] })] })] }),
          ],
        },
      ],
    });
    const buf = await Packer.toBuffer(tai);
    const kq = await taoBanXem("BaoCao.docx", doanMime("BaoCao.docx"), buf, "0".repeat(64));
    expect(kq.loai).toBe("html");
    expect(kq.html).toContain("<strong>Báo cáo tuần 29</strong>");
    expect(kq.html).toContain("<td>");
    expect((await taoBanXem("a.pdf", "application/pdf", Buffer.from("%PDF"), "0".repeat(64))).loai).toBe("pdf");
    expect((await taoBanXem("a.png", "image/png", Buffer.from(""), "0".repeat(64))).loai).toBe("anh");
    expect((await taoBanXem("a.txt", "text/plain", Buffer.from("xin chào"), "0".repeat(64))).chu).toBe("xin chào");
    expect((await taoBanXem("a.zip", "application/zip", Buffer.from(""), "0".repeat(64))).loai).toBe("khong_ho_tro");
    expect((await taoBanXem("hong.docx", "", Buffer.from("không phải zip"), "0".repeat(64))).loai).toBe("khong_ho_tro");
    expect(hienTrucTiepDuoc("a.html", "text/html")).toBe(false);
    expect(hienTrucTiepDuoc("a.svg", "image/svg+xml")).toBe(false);
    expect(hienTrucTiepDuoc("a.PDF", "application/octet-stream")).toBe(true);
  });
});
