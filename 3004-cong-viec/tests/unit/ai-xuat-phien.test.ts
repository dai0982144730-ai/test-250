// Xuất câu trả lời ra DOCX/XLSX/MD/HTML (không Python) + phiên chat lưu riêng từng người.
import { describe, it, expect, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import AdmZip from "adm-zip";
import ExcelJS from "exceljs";
import { xuatTraLoi } from "@/lib/tro-ly/xuat-chat";
import { mdSangHtml } from "@/lib/tro-ly/md-sang-html";
import { appendMessage, createSession, deleteSession, getSession, listSessions, saveSession } from "@/lib/ai/chat-store";
import { chuanHoaLink, locLinkTraLoi } from "@/lib/ai/trang-co-that";
import { biDanhCli, modelChoCli } from "@/lib/ai/providers";

const tam = fs.mkdtempSync(path.join(os.tmpdir(), "docflow-ai-xp-"));
process.env.DOCFLOW_AI_DATA = tam;

const MD = `## VIỆC SẮP TRỄ

| Mã việc | Công việc | Hạn |
|---|---|---|
| CV-2026-0412 | **Chi trả** GPMB Trụ T11 | 05/08/2026 |
| CV-2026-0415 | Thay relay R21 | 1.234,5 |

- Gợi ý: nhắc [P.ĐT&PC](/so-cai)`;

describe("xuất câu trả lời + phiên chat", () => {
  afterAll(() => fs.rmSync(tam, { recursive: true, force: true }));

  it("DOCX là file Word hợp lệ có chữ và bảng", async () => {
    const f = await xuatTraLoi("docx", MD);
    expect(f.tenFile).toMatch(/^Tra loi tro ly SCI cong viec \d{2}-\d{2}-\d{4} \d{4}\.docx$/);
    const xml = new AdmZip(f.buffer).getEntry("word/document.xml")!.getData().toString("utf8");
    expect(xml).toContain("GPMB Trụ T11");
    expect(xml).toContain("<w:tbl>");
    expect(xml).not.toContain("**");
  });

  it("XLSX mỗi bảng một sheet, số kiểu Việt thành số thật", async () => {
    const f = await xuatTraLoi("xlsx", MD);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(f.buffer as unknown as ArrayBuffer);
    const ws = wb.worksheets[0]!;
    expect(ws.getRow(1).getCell(1).value).toBe("Mã việc");
    expect(ws.getRow(2).getCell(2).value).toBe("Chi trả GPMB Trụ T11");
    expect(ws.getRow(3).getCell(3).value).toBe(1234.5);
  });

  it("MD / HTML; HTML thoát ký tự nguy hiểm", async () => {
    expect((await xuatTraLoi("md", MD)).buffer.toString("utf8")).toContain("| CV-2026-0412 |");
    const h = mdSangHtml("T", "<script>alert(1)</script>\n| a | b |\n|---|---|\n| 1 | 2 |");
    expect(h).not.toContain("<script>alert");
    expect(h).toContain("<table>");
  });

  it("phiên chat nằm trong thư mục RIÊNG từng người", () => {
    const s = createSession("hung.tv@scigroup.vn", "hung.tv@scigroup.vn", "Việc nào sắp trễ?");
    saveSession(appendMessage(s, "user", "Việc nào sắp trễ?"));
    expect(listSessions("hung.tv@scigroup.vn").map((x) => x.id)).toContain(s.id);
    expect(listSessions("nv.dtpc@scigroup.vn")).toEqual([]);
    expect(getSession("nv.dtpc@scigroup.vn", s.id)).toBeNull();
    expect(deleteSession("nv.dtpc@scigroup.vn", s.id).ok).toBe(false);
    expect(deleteSession("hung.tv@scigroup.vn", s.id).ok).toBe(true);
    // id người dùng lạ không thoát khỏi thư mục chat
    createSession("../../thoat", "x", "t");
    expect(fs.existsSync(path.join(tam, "thoat"))).toBe(false);
  });

  it("link trong câu trả lời chỉ vẽ khi là trang có thật; model đầy đủ truyền thẳng cho CLI", () => {
    // Mr. Đại 01/10: chỉ link trong danh sách (màn trên menu + link tải); dạng cũ đổi sang dạng mới, còn lại bỏ link giữ chữ
    expect(chuanHoaLink("/cong-viec/CV-2026-0412")).toBe("/so-do?viec=CV-2026-0412");
    expect(chuanHoaLink("/tai-lieu/tl-abc")).toBe("/api/tai-lieu/tl-abc/tep");
    expect(chuanHoaLink("/so-cai")).toBe("/so-do");
    expect(chuanHoaLink("https://productive-glucose-heroes-pollution.trycloudflare.com/so-cai")).toBe("/so-do");
    expect(chuanHoaLink("/api/tro-ly/xuat/tai?ma=abc123")).toBe("/api/tro-ly/xuat/tai?ma=abc123");
    for (const la of ["/bao-cao", "/lich-su", "/thu-muc", "/thong-bao", "/soan-gui", "/quan-tri/khoa-agent", "/so-do/x"]) expect(chuanHoaLink(la)).toBeNull();
    expect(locLinkTraLoi("Xem [Sổ cái](/so-cai) và [Lịch sử](/lich-su) tại https://x.trycloudflare.com/so-cai.")).toEqual({
      text: "Xem [Sổ cái](/so-do) và Lịch sử tại .",
      bo: 2,
    });
    // Test đêm 01/10: Haiku bịa tên miền https://you-domain.com/so-do?viec=… → đường nội bộ; tên miền giả → bỏ;
    // link ngoài thật chỉ giữ khi tìm web (choNgoai)
    expect(chuanHoaLink("https://you-domain.com/so-do?viec=CV-2026-0056")).toBe("/so-do?viec=CV-2026-0056");
    expect(chuanHoaLink("https://app.bat-ky.vn/cong-viec/CV-2026-0001")).toBe("/so-do?viec=CV-2026-0001");
    expect(chuanHoaLink("https://example.com/bao-cao")).toBeNull();
    expect(chuanHoaLink("https://thuvienphapluat.vn/van-ban/abc")).toBe("https://thuvienphapluat.vn/van-ban/abc");
    expect(chuanHoaLink("https://thuvienphapluat.vn/van-ban/abc", false)).toBeNull();
    expect(locLinkTraLoi("| [CV-2026-0056](https://you-domain.com/so-do?viec=CV-2026-0056) | x | xem https://your-domain.com/du-an.", false)).toEqual({
      text: "| [CV-2026-0056](/so-do?viec=CV-2026-0056) | x | xem .",
      bo: 1,
    });
    expect(locLinkTraLoi("Nguồn [Luật Điện lực](https://thuvienphapluat.vn/a) và https://moit.gov.vn/b", true).bo).toBe(0);
    expect(locLinkTraLoi("Nguồn [Luật Điện lực](https://thuvienphapluat.vn/a) và https://moit.gov.vn/b", false).text).toBe("Nguồn Luật Điện lực và ");
    // Tên đầy đủ truyền thẳng cho Claude CLI (chọn được đúng phiên bản, vd Opus 5.5); bí danh vẫn dùng được
    expect(modelChoCli("claude-opus-5-5")).toBe("claude-opus-5-5");
    expect(modelChoCli(" claude-sonnet-5 ")).toBe("claude-sonnet-5");
    expect(modelChoCli("opus")).toBe("opus");
    expect(modelChoCli("")).toBe("");
    // CLI cũ chưa biết mã mới → lùi về bí danh cùng họ
    expect(biDanhCli("claude-opus-5-5")).toBe("opus");
    expect(biDanhCli("claude-haiku-4-5-20251001")).toBe("haiku");
    expect(biDanhCli("claude-fable-5-1")).toBe("fable");
    expect(biDanhCli("gpt-5")).toBe("");
  });
});
