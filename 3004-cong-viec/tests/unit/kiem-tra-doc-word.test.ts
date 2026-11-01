// docWord trên 9 mẫu THẬT đã chuyển (scripts/chuyen-mau-that.mjs): đọc đúng ô gắn mã, chịu được Word lưu lại,
// mẫu đã chuyển giữ nguyên nội dung/ảnh của file gốc (chỉ thêm mục Công việc; bản 6 bỏ Người lập / Ngày lập / Người kiểm soát,
// dòng ngày ký và khối chữ ký).
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { DOMParser } from "@xmldom/xmldom";
import { docWord, chuanHoaMaMau } from "@/lib/kiem-tra/doc-word";
import { viDu } from "../fixtures/chuan-bi";
import DINH_NGHIA from "../../mau-word/dinh-nghia.json";

const THU_MUC = path.join(process.cwd(), "mau-word");
const mau = (ma: string) => fs.readFileSync(path.join(THU_MUC, `${ma}.docx`));
const goc = (so: number) => fs.readFileSync(path.join(THU_MUC, "goc", fs.readdirSync(path.join(THU_MUC, "goc")).find((f) => f.includes(`Form${so}_`))!));

async function suaXml(buf: Buffer, sua: (xml: string) => string, suaZip?: (z: JSZip) => void): Promise<Buffer> {
  const zip = await JSZip.loadAsync(buf);
  zip.file("word/document.xml", sua(await zip.file("word/document.xml")!.async("string")));
  suaZip?.(zip);
  return zip.generateAsync({ type: "nodebuffer" });
}

/** Toàn bộ chữ của các w:t theo thứ tự (so sánh nội dung gốc / đã chuyển). */
async function chuGhep(buf: Buffer): Promise<string> {
  const x = await (await JSZip.loadAsync(buf)).file("word/document.xml")!.async("string");
  return Array.from(x.matchAll(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g)).map((m) => m[1]).join("");
}

/** Chữ từng đoạn (w:p) theo thứ tự, bỏ đoạn trống — ghép lại bằng "" thì đúng bằng chuGhep. */
async function doanVan(buf: Buffer): Promise<string[]> {
  const x = await (await JSZip.loadAsync(buf)).file("word/document.xml")!.async("string");
  return x
    .split(/<\/w:p>/)
    .map((p) => Array.from(p.matchAll(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g)).map((m) => m[1]).join(""))
    .filter(Boolean);
}

/** Chữ file gốc trừ phần mẫu bản 6 bỏ: 3 cặp nhãn + giá trị ở đầu (Người lập/Tổng hợp bởi, Ngày lập, Người kiểm soát/kiểm tra),
 *  dòng "…, ngày … tháng … năm …" và khối chữ ký ở cuối. */
async function chuGocBan6(buf: Buffer): Promise<string> {
  const ds = await doanVan(buf);
  const kq: string[] = [];
  for (let i = 0; i < ds.length; i++) {
    if (/^(Người lập|Tổng hợp bởi|Ngày lập|Người kiểm soát|Người kiểm tra):$/.test(ds[i])) {
      i++; // bỏ cả ô giá trị bên cạnh
      continue;
    }
    kq.push(ds[i]);
  }
  let cuoi = kq.findLastIndex((d) => /^NGƯỜI (LẬP|TỔNG HỢP)$/.test(d));
  expect(cuoi, "file gốc có khối chữ ký").toBeGreaterThan(0);
  if (/, ngày \d+ tháng \d+ năm \d{4}$/.test(kq[cuoi - 1])) cuoi--;
  return kq.slice(0, cuoi).join("");
}

/**
 * Mẫu bản 9 (Mr. Đại 01/10/2026) cố ý đổi 3 chỗ so với file gốc: khung đầu trang (công ty · "Gửi:" · "BÁO CÁO TUẦN"), ô kỳ
 * (một loại kỳ, bỏ hộp ☐, ngày tuần ISO) và số mục (La Mã liền mạch). Bỏ 3 chỗ đó ở CẢ HAI phía rồi mới so phần còn lại —
 * khung đầu trang + ô kỳ có bài riêng ("đầu trang bản 9").
 */
function boKhacBan9(s: string): string {
  return s
    .slice(s.indexOf("Kỳ báo cáo:"))
    .replace(/^Kỳ báo cáo:\s*(?:[☐☒]?\s*(?:Tuần|Tháng)\s*[\d.]+\s*\/\s*(?:\d{4}|20\.\.\.)\s*(?:\([^)]*\))?\s*)+/, "Kỳ báo cáo:")
    .replace(/(?:[IVX]+|[A-Z]\d?|\d{1,2})\. (?=[A-ZĐÂĂÊÔƠƯÁÀẢÃẠẤẦẨẪẬẮẰẲẴẶÉÈẺẼẸẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌỐỒỔỖỘỚỜỞỠỢÚÙỦŨỤỨỪỬỮỰÝỲỶỸỴ]{2})/g, "");
}

describe("9 mẫu thật đã chuyển", () => {
  it("document.xml hợp lệ; nội dung, ảnh của anh Đại giữ nguyên (chỉ thêm mục Công việc); có dấu nhận mẫu", async () => {
    // Form 5, Form 6 sửa tay 20/10/2026 (bỏ chương, Form 6 thành báo cáo tuần) — không còn là "gốc + chương việc", xem so-do-loai-khac-20-10
    for (const i of [0, 1, 2, 3, 4, 7, 8, 10]) {
      const zMoi = await JSZip.loadAsync(mau(`form-${i}`));
      const zGoc = await JSZip.loadAsync(goc(i));
      const loi: string[] = [];
      new DOMParser({ errorHandler: { warning: () => undefined, error: (m: string) => loi.push(m), fatalError: (m: string) => loi.push(m) } }).parseFromString(
        await zMoi.file("word/document.xml")!.async("string"),
        "text/xml",
      );
      expect(loi, `form-${i}`).toEqual([]);
      // ảnh, kiểu, đánh số: y nguyên
      for (const f of Object.keys(zGoc.files).filter((f) => /^word\/(media\/|styles|numbering|theme\/)/.test(f) && !zGoc.files[f].dir)) {
        expect(Buffer.compare(await zMoi.file(f)!.async("nodebuffer"), await zGoc.file(f)!.async("nodebuffer")), `form-${i} ${f}`).toBe(0);
      }
      // chữ: gốc + đúng chương việc thêm vào (mẫu phiên bản 4: 6 cột, Form 0 thêm "Bộ phận phụ trách", ô chọn Tình trạng hiện "Chọn").
      // Form 6: đổi tại chỗ chương "KẾ HOẠCH CÔNG VIỆC THÁNG TỚI" + bảng cũ → so riêng bên dưới
      const a = await chuGocBan6(goc(i));
      // Bản 5 (29/09): cuối mẫu thêm ghi chú chữ đỏ in nghiêng cho người lập — bỏ ra trước khi so chữ gốc
      const ghiChu = "Ghi chú cho người lập báo cáo";
      const b0 = await chuGhep(mau(`form-${i}`));
      expect(b0, `form-${i} có ghi chú cuối`).toContain(ghiChu);
      const b = b0.slice(0, b0.indexOf(ghiChu));
      // Bản 6: không còn khối chữ ký, dòng ngày ký, ô Người lập / Ngày lập
      for (const s of ["(Ký, ghi rõ họ tên)", "(Ký, đóng dấu)", "NGƯỜI LẬP", "Người lập:", "Ngày lập:", "Tổng hợp bởi:"]) expect(b, `form-${i} còn "${s}"`).not.toContain(s);
      const them = /(?:[IVX]+|[A-Z])\. KẾT QUẢ VÀ KẾ HOẠCH VIỆC TUẦN TỚICông việcDự án(?:Bộ phận phụ trách)?Bắt đầuKết thúcKết quả cần cóTình trạng(?:Chọn)+/;
      expect(boKhacBan9(b.replace(them, "")), `form-${i}`).toBe(boKhacBan9(a));
      expect(them.test(b)).toBe(true);
      expect(await zMoi.file("docProps/custom.xml")!.async("string")).toContain(`<vt:lpwstr>form-${i}</vt:lpwstr>`);
    }
  });

  it("mỗi mẫu có đủ ô và bảng đúng như định nghĩa (dinh-nghia.json)", async () => {
    for (const d of DINH_NGHIA) {
      const r = await docWord(mau(d.ma));
      expect(r.mau_ma).toBe(d.ma);
      for (const o of d.dinh_nghia.o_nhap) expect(o.tag in r.o_nhap, `${d.ma} thiếu ô ${o.tag}`).toBe(true);
      for (const b of d.dinh_nghia.bang) expect(b.tag in r.bang, `${d.ma} thiếu bảng ${b.tag}`).toBe(true);
      const td = r.tieu_de.map((t) => t.replace(/^\s*(?:[IVX]+|[A-Z]\d?|\d{1,2})\.\s*/, ""));
      for (const m of d.dinh_nghia.muc_bat_buoc) expect(td, `${d.ma} thiếu mục ${m}`).toContain(m);
      expect("gui_den" in r.o_nhap, d.ma).toBe(true); // mẫu bản 9: mọi mẫu có dòng "Gửi:" ở đầu trang
    }
  });

  it("đầu trang bản 9: công ty · Gửi: <nơi nhận> | BÁO CÁO TUẦN/THÁNG · đơn vị; mục La Mã liền mạch; ghi chú tô đúng màu", async () => {
    const { DAU_BAN_9 } = await import("../../scripts/chuyen-mau-that.mjs");
    const LA_MA = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
    for (const d of DINH_NGHIA) {
      const sp = DAU_BAN_9[d.ma];
      const ds = (await doanVan(mau(d.ma))).slice(0, 7);
      if (sp.cong_ty) expect(ds[0], d.ma).toBe(sp.cong_ty);
      expect(ds, d.ma).toContain(`Gửi: ${sp.gui}`);
      expect(ds, d.ma).toContain(sp.tieu_de);
      expect(ds.join(" "), `${d.ma} không còn dòng địa chỉ`).not.toContain("Tầng 3");
      const r = await docWord(mau(d.ma));
      expect(r.tieu_de.map((t) => t.split(".")[0]), d.ma).toEqual(LA_MA.slice(0, r.tieu_de.length));
      const xml = await (await JSZip.loadAsync(mau(d.ma))).file("word/document.xml")!.async("string");
      const mauDong = (dau: string) => new RegExp(`<w:color w:val="([0-9A-F]{6})"/>(?:(?!</w:r>).)*<w:t[^>]*>${dau}`).exec(xml)?.[1];
      expect(mauDong("• Chữ màu ĐỎ"), d.ma).toBe("C00000");
      expect(mauDong("• Chữ màu XANH LÁ"), d.ma).toBe("00B050");
      expect(mauDong("• Không xóa ô"), d.ma).toBe("000000");
    }
  });

  it("mẫu bản 6: không còn khối chữ ký, không còn ô Người lập / Ngày lập / Người kiểm soát — cả định nghĩa lẫn file", async () => {
    const BO = ["nguoi_lap", "ngay_lap", "nguoi_kiem_soat"];
    for (const d of DINH_NGHIA) {
      const tags = d.dinh_nghia.o_nhap.map((o) => o.tag);
      expect(tags.filter((t) => t.startsWith("ky_") && !t.startsWith("ky_bao_cao")), `${d.ma} còn ô chữ ký`).toEqual([]);
      for (const t of BO) expect(tags, `${d.ma} còn ô ${t}`).not.toContain(t);
      const r = await docWord(mau(d.ma));
      expect(Object.keys(r.o_nhap).filter((t) => t.startsWith("ky_") && t !== "ky_bao_cao" || BO.includes(t)), d.ma).toEqual([]);
      expect(r.van_ban, `${d.ma} còn dòng ngày ký`).not.toMatch(/, ngày \S+ tháng \S+ năm/);
    }
  });

  it("đọc mẫu Form 7: ô chung, dòng Gửi, kỳ báo cáo một ô, bảng kiến nghị, bảng Công việc 3 dòng trống", async () => {
    const r = await docWord(mau("form-7"));
    // bản 6: đầu báo cáo chỉ còn Kỳ báo cáo (+ dòng đơn vị lập)
    expect(r.o_nhap.nguoi_lap).toBeUndefined();
    expect(r.o_nhap.nguoi_kiem_soat).toBeUndefined();
    expect(r.o_nhap.ngay_lap).toBeUndefined();
    expect(r.o_nhap.don_vi_lap).toBe("BQLDA QUẢNG TRỊ");
    expect(r.o_nhap.gui_den).toBe("Phòng Đầu tư và Pháp chế");
    expect(r.o_nhap.ky_bao_cao).toBe("Tuần 29/2026   (13/07/2026 – 19/07/2026)"); // bản 9: một loại kỳ, ngày tuần ISO
    expect(r.bang.bang_cong_viec).toHaveLength(3);
    expect(Object.keys(r.bang.bang_cong_viec[0])).toEqual(["ten", "du_an", "bat_dau", "ket_thuc", "ket_qua_can_co", "tinh_trang"]);
    expect(r.bang.bang_cong_viec[0].tinh_trang).toBe(""); // ô chọn chưa chọn (chữ giữ chỗ "Chọn") = trống
    expect(r.bang.bang_kien_nghi).toHaveLength(3);
    expect(Object.keys(r.bang.bang_kien_nghi[0])).toEqual(["stt", "noi_dung", "muc_do", "anh_huong", "kien_nghi"]);
    expect(r.bang.bang_kien_nghi[0].noi_dung).toContain("GPMB T11");
    expect(r.tieu_de).toEqual([
      "I. THÔNG TIN CHUNG DỰ ÁN",
      "II. TIẾN ĐỘ TỔNG THỂ",
      "III. CHI TIẾT TIẾN ĐỘ TỪNG HẠNG MỤC",
      "IV. GPMB & QUAN HỆ ĐỊA PHƯƠNG",
      "V. RỦI RO & KIẾN NGHỊ PHÒNG ĐT&PC",
      "VI. KẾT QUẢ VÀ KẾ HOẠCH VIỆC TUẦN TỚI",
    ]);
  });

  it("Form 0: bảng quyết định (Ưu tiên · Nội dung · Phụ trách (trình) · Hạn quyết định · Tài liệu); Form 6: chương việc THÁNG TỚI", async () => {
    const f0 = await docWord(mau("form-0"));
    // bản 6: bỏ "Tổng hợp bởi" (nguoi_lap) và "Người kiểm tra" (nguoi_kiem_soat)
    expect(f0.o_nhap.nguoi_lap).toBeUndefined();
    expect(f0.o_nhap.nguoi_kiem_soat).toBeUndefined();
    expect(f0.bang.bang_quyet_dinh).toHaveLength(5);
    expect(Object.keys(f0.bang.bang_quyet_dinh[0])).toEqual(["uu_tien", "ten", "phu_trach", "han_quyet_dinh", "tai_lieu"]);
    expect(f0.bang.bang_quyet_dinh[0].ten.split("\n")[0]).toBe("Phê duyệt Điều chỉnh Tổng mức đầu tư Dự án Nậm Khiên 1");
    expect(f0.tieu_de.at(-1)).toBe("VI. KẾT QUẢ VÀ KẾ HOẠCH VIỆC TUẦN TỚI"); // bản 9: A0/A1/B1/C/D → I…VI
    expect(Object.keys(f0.bang.bang_cong_viec[0])).toEqual(["ten", "du_an", "phu_trach", "bat_dau", "ket_thuc", "ket_qua_can_co", "tinh_trang"]);
    // 20/10/2026: Form 6 báo cáo tuần, 3 chương; Form 5 3 chương; Form 11 = Form 10 đổi chương 4
    const f6 = await docWord(mau("form-6"));
    expect(f6.bang.bang_ke_hoach).toBeUndefined();
    expect(f6.bang.bang_cong_viec).toHaveLength(3);
    expect(f6.tieu_de).toEqual(["I. TỔNG QUAN CÁC DỰ ÁN SCI ENC", "II. VẤN ĐỀ NỔI BẬT VÀ KIẾN NGHỊ LÃNH ĐẠO", "III. KẾT QUẢ VÀ KẾ HOẠCH VIỆC TUẦN TỚI"]);
    expect((await docWord(mau("form-5"))).tieu_de).toEqual(["I. TIẾN ĐỘ CHI TIẾT CÔNG TÁC THIẾT KẾ", "II. VẤN ĐỀ NỔI BẬT VÀ KIẾN NGHỊ LÃNH ĐẠO", "III. KẾT QUẢ VÀ KẾ HOẠCH VIỆC TUẦN TỚI"]);
    const f11 = await docWord(mau("form-11"));
    expect(f11.mau_ma).toBe("form-11");
    expect(f11.tieu_de[3]).toBe("IV. RỦI RO & KIẾN NGHỊ SCI E&C");
  });
});

describe("docWord chịu được Word lưu lại", () => {
  it("run bị tách, rsid, proofErr, bookmark, ô hiện chữ gợi ý, bản xóa có theo dõi, dòng bảng thêm tay", async () => {
    const buf = await suaXml(viDu("BaoCao_Tuan29_BQLDA_QuangTri_ban2.docx"), (xml) => {
      let s = xml.replace(
        '<w:t xml:space="preserve">Lý Thị Nga</w:t></w:r>',
        '<w:t xml:space="preserve">Lý </w:t></w:r><w:proofErr w:type="spellStart"/><w:bookmarkStart w:id="0" w:name="_GoBack"/><w:r w:rsidR="00A1B2C3" w:rsidRPr="00FF0011"><w:rPr><w:b/></w:rPr><w:t>Thị</w:t></w:r><w:bookmarkEnd w:id="0"/><w:r w:rsidR="00D4E5F6"><w:t xml:space="preserve"> Nga</w:t></w:r><w:proofErr w:type="spellEnd"/>',
      );
      if (!s.includes("00A1B2C3")) throw new Error("chưa tách được run");
      s = s.replace(/(<w:alias w:val="Ngày lập"\/><w:tag w:val="ngay_lap"\/><w:id w:val="\d+"\/>)/, "$1<w:showingPlcHdr/>");
      if (!s.includes("<w:showingPlcHdr/>")) throw new Error("chưa gắn chữ gợi ý");
      s = s.replace("Phó Tổng Giám đốc phụ trách</w:t></w:r>", 'Phó Tổng Giám đốc phụ trách</w:t></w:r><w:del w:id="9" w:author="A"><w:r><w:delText>XÓA</w:delText></w:r></w:del>');
      const hang =
        "<w:tr>" +
        ["Lắp đặt cột thép T9", "ĐG Hướng Việt", "01/08/2026", "30/08/2026", "Dựng xong cột", "Đang làm"]
          .map((x) => `<w:tc><w:p><w:r><w:t>${x}</w:t></w:r></w:p></w:tc>`)
          .join("") +
        "</w:tr>";
      const i = s.indexOf('<w:tag w:val="bang_cong_viec"/>');
      const cuoi = s.indexOf("</w:tbl>", i);
      return s.slice(0, cuoi) + hang + s.slice(cuoi);
    });
    const r = await docWord(buf);
    expect(r.o_nhap.nguoi_lap).toBe("Lý Thị Nga");
    expect(r.o_nhap.ngay_lap).toBe("");
    expect(r.o_nhap.nguoi_kiem_soat).toBe("Phó Tổng Giám đốc phụ trách");
    expect(r.bang.bang_cong_viec).toHaveLength(4);
    expect(r.bang.bang_cong_viec[3]).toMatchObject({ ten: "Lắp đặt cột thép T9", ket_thuc: "30/08/2026", tinh_trang: "Đang làm" });
  });

  it("mẫu thật lưu lại tách run trong ô kỳ báo cáo và hộp tích vẫn đọc đúng", async () => {
    const buf = await suaXml(mau("form-2"), (xml) => {
      const s = xml.replace(/<w:t>Tuần 29\/2026<\/w:t><\/w:r>/, '<w:t>Tuần 2</w:t></w:r><w:r w:rsidR="00ABCDEF"><w:t>9/2026</w:t></w:r>');
      if (s === xml) throw new Error("không tìm thấy chữ kỳ báo cáo");
      return s;
    });
    const r = await docWord(buf);
    expect(r.o_nhap.ky_bao_cao.split("\n")[0]).toBe("Tuần 29/2026   (13/07/2026 – 19/07/2026)");
  });

  it("bảng nhận ra bằng tiêu đề bảng (tblCaption) khi Word bỏ mất content control bọc bảng", async () => {
    const buf = await suaXml(viDu("BaoCao_Tuan29_BQLDA_QuangTri_ban2.docx"), (xml) => {
      const i = xml.indexOf('<w:tag w:val="bang_cong_viec"/>');
      const dauSdt = xml.lastIndexOf("<w:sdt>", i);
      const dauNd = xml.indexOf("<w:sdtContent>", i) + "<w:sdtContent>".length;
      const cuoiTbl = xml.indexOf("</w:tbl>", i) + "</w:tbl>".length;
      const cuoiSdt = xml.indexOf("</w:sdt>", cuoiTbl) + "</w:sdt>".length;
      return xml.slice(0, dauSdt) + xml.slice(dauNd, cuoiTbl) + xml.slice(cuoiSdt);
    });
    const r = await docWord(buf);
    expect(r.bang.bang_cong_viec).toHaveLength(3);
    expect(r.o_nhap.ten).toBeUndefined();
  });

  it("dấu nhận mẫu: mất ô tiêu đề vẫn nhận ra qua thuộc tính tài liệu SCI_MauMa; mất cả hai thì không", async () => {
    const boDau = (xml: string) => xml.replace(/w:val="mau_ma:form-7"/, 'w:val="tieu_de"');
    const r1 = await docWord(await suaXml(mau("form-7"), boDau));
    expect(r1.mau_ma).toBe("form-7");
    const r2 = await docWord(await suaXml(mau("form-7"), boDau, (z) => z.remove("docProps/custom.xml")));
    expect(r2.mau_ma).toBeNull();
  });

  it("file Word thường (không có ô gắn mã) → không nhận ra mẫu; file không phải docx → lỗi", async () => {
    const r = await docWord(viDu("BaoCao_SaiMau.docx"));
    expect(r.mau_ma).toBeNull();
    expect(r.van_ban).toContain("BÁO CÁO TUẦN 29");
    expect((await docWord(goc(7))).mau_ma).toBeNull(); // file gốc của anh Đại chưa có ô gắn mã
    await expect(docWord(Buffer.from("không phải zip"))).rejects.toThrow(/không phải Word/);
  });

  it("chia mục theo tiêu đề (cho góp ý nội dung), dừng ở dòng ngày ký", async () => {
    const r = await docWord(viDu("BaoCao_Thang7_SCI_ENC.docx"));
    const iv = r.muc!.find((m) => m.tieu_de.startsWith("IV."))!;
    expect(iv.van_ban).toContain("......");
    expect(r.muc!.at(-1)!.tieu_de).toBe("VI. KẾT QUẢ VÀ KẾ HOẠCH VIỆC THÁNG TỚI");
    expect(r.muc!.at(-1)!.van_ban).not.toContain("Hà Nội");
  });

  it("chuẩn hóa mã mẫu", () => {
    expect(chuanHoaMaMau("Form 7")).toBe("form-7");
    expect(chuanHoaMaMau(" FORM-07 ")).toBe("form-7");
    expect(chuanHoaMaMau("form_9")).toBe("form-9");
    expect(chuanHoaMaMau("")).toBeNull();
  });
});
