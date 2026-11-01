// Bảo mật báo cáo tài chính (Mr. Đại chốt 07/10/2026): cắt chương mật ở nguồn đọc tệp.
// Không mở CSDL thật, không gọi AI: tệp Word dựng trong bài; cấu hình đọc qua q giả (không có hàng → mặc định trong code).
import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import mammoth from "mammoth";
import { describe, expect, it } from "vitest";
import { catChuongMat, coChuongMat, LoiCatChuong } from "@/lib/bao-mat/cat-chuong";
import { catKetQuaKiemTra, cheDoXemNoiDung, duocXemDu, gocChuongMat, gocTenChuong, soLaMa } from "@/lib/bao-mat/quy-tac";
import { locBaoMat, locKetQuaKiemTra, MAY_DOC_TOAN_VAN, cauTuChoi, type PhienBanCoTheCat } from "@/lib/bao-mat/loc";
import { MAC_DINH } from "@/lib/cau-hinh/mac-dinh";
import type { Q } from "@/lib/db";
import type { NguoiDungPhien } from "@/lib/types";

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const p = (chu: string, them = "") => `<w:p><w:r>${them}<w:t xml:space="preserve">${chu}</w:t></w:r></w:p>`;
const bang = (o: string[]) => `<w:tbl>${o.map((x) => `<w:tr><w:tc>${p(x)}</w:tc></w:tr>`).join("")}</w:tbl>`;
const MUC_F4 = MAC_DINH.bao_mat.chuong_mat.concat(["VẤN ĐỀ NỔI BẬT VÀ KIẾN NGHỊ LÃNH ĐẠO", "KẾT QUẢ VÀ KẾ HOẠCH VIỆC TUẦN TỚI"]);

async function dungWord(than: string, them: { dataBinding?: boolean } = {}): Promise<Buffer> {
  const z = new JSZip();
  z.file(
    "[Content_Types].xml",
    `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="xlsx" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/footnotes.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml"/><Override PartName="/word/charts/chart1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/></Types>`,
  );
  z.file("_rels/.rels", `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  z.file(
    "word/_rels/document.xml.rels",
    `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdChart" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="charts/chart1.xml"/><Relationship Id="rIdFn" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footnotes" Target="footnotes.xml"/></Relationships>`,
  );
  z.file("word/charts/chart1.xml", `<?xml version="1.0"?><c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:v>98765</c:v></c:chartSpace>`);
  z.file("word/charts/_rels/chart1.xml.rels", `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/package" Target="../embeddings/sheet1.xlsx"/></Relationships>`);
  z.file("word/embeddings/sheet1.xlsx", "so lieu 98765");
  z.file("word/footnotes.xml", `<?xml version="1.0"?><w:footnotes ${W}><w:footnote w:id="1">${p("chú thích 777")}</w:footnote><w:footnote w:id="2">${p("chú thích giữ")}</w:footnote></w:footnotes>`);
  const bd = them.dataBinding ? '<w:sdt><w:sdtPr><w:dataBinding w:xpath="/x"/></w:sdtPr><w:sdtContent>' + p("ô liên kết") + "</w:sdtContent></w:sdt>" : "";
  z.file("word/document.xml", `<?xml version="1.0"?><w:document ${W}><w:body>${than.replace("{BD}", bd)}<w:sectPr/></w:body></w:document>`);
  return (await z.generateAsync({ type: "nodebuffer" })) as Buffer;
}

const THAN_F4 = [
  bang(["CÔNG TY CỔ PHẦN SCI", "BÁO CÁO TUẦN PHÒNG TÀI CHÍNH KẾ TOÁN"]),
  p("I. TÓM TẮT THÔNG TIN CHÍNH  "),
  bang(["BÁO CÁO NGUỒN TIỀN — TÓM TẮT (Tr.đ)", "Tiền mặt 12345"]),
  p("II. BÁO CÁO NGUỒN TIỀN — ĐƠN VỊ: TRIỆU ĐỒNG"),
  `<w:p><w:r><w:drawing><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" r:id="rIdChart"/></w:drawing></w:r></w:p>`,
  `<w:p><w:r><w:t>Vay ngân hàng 55555</w:t></w:r><w:r><w:footnoteReference w:id="1"/></w:r></w:p>`,
  "{BD}",
  p("III. BÁO CÁO CHI PHÍ GIÁ THÀNH — ĐƠN VỊ: TRIỆU ĐỒNG"),
  p("V. Ghi chú nội bộ 44444"),
  p("IV. VẤN ĐỀ NỔI BẬT VÀ KIẾN NGHỊ LÃNH ĐẠO"),
  bang(["Phải trả nhà thầu phụ 3 hóa đơn quá hạn"]),
  `<w:p><w:r><w:t>Xem chú thích</w:t></w:r><w:r><w:footnoteReference w:id="2"/></w:r></w:p>`,
  p("V. KẾT QUẢ VÀ KẾ HOẠCH VIỆC TUẦN TỚI"),
  bang(["Đàm phán lãi suất vay BIDV quý IV"]),
].join("");

const tc = () => ({ mat: gocChuongMat(MAC_DINH.bao_mat), biet: MUC_F4, cau_tu_choi: cauTuChoi(MAC_DINH.bao_mat.cau_tu_choi) });

async function chuCua(buf: Buffer): Promise<string> {
  return (await mammoth.extractRawText({ buffer: buf })).value;
}

describe("luật bảo mật (thuần)", () => {
  it("gốc tên chương bỏ số La Mã, dấu và phần sau dấu —", () => {
    expect(gocTenChuong("II. BÁO CÁO NGUỒN TIỀN — ĐƠN VỊ: TRIỆU ĐỒNG")).toBe("BAO CAO NGUON TIEN");
    expect(gocTenChuong("I. TÓM TẮT THÔNG TIN CHÍNH  ")).toBe("TOM TAT THONG TIN CHINH");
    expect(soLaMa("IV. VẤN ĐỀ")).toBe(4);
    expect(soLaMa("Ghi chú")).toBeNull();
  });
  it("được xem đủ: có tên (email hoặc mã) · người tải bản đó lên; quản trị và máy thì không", () => {
    const cfg = MAC_DINH.bao_mat;
    expect(duocXemDu(cfg, { id: "hungnc@scigroup.vn" }, "x")).toBe(true);
    expect(duocXemDu(cfg, { id: "truong.tckt@scigroup.vn", email: "manhpd@scigroup.vn" }, "x")).toBe(true);
    expect(duocXemDu(cfg, { id: "hoaht@scigroup.vn" }, "hoaht@scigroup.vn")).toBe(true);
    expect(duocXemDu(cfg, { id: "ketoan2@scigroup.vn" }, "hoaht@scigroup.vn")).toBe(false);
    expect(duocXemDu(cfg, { id: "quantri@scigroup.vn" }, "x")).toBe(false);
    expect(duocXemDu(cfg, null, "x")).toBe(false);
  });
  it("Q4: tài liệu khác của phòng TCKT xét theo phân quyền; báo cáo mẫu mật vẫn mở (bản cắt)", () => {
    const cfg = MAC_DINH.bao_mat;
    expect(cheDoXemNoiDung("tat_ca", cfg, { don_vi_lap: "p-tckt", mau_ma: null })).toBe("theo_quyen");
    expect(cheDoXemNoiDung("tat_ca", cfg, { don_vi_lap: "p-tckt", mau_ma: "form-4" })).toBe("tat_ca");
    expect(cheDoXemNoiDung("tat_ca", cfg, { don_vi_lap: "p-dtpc", mau_ma: null })).toBe("tat_ca");
  });
  it("kết quả kiểm tra của bản cắt chỉ giữ phần không mật", () => {
    const kq = catKetQuaKiemTra({
      dat: true,
      mau_ma: "form-4",
      cong_viec: [{ ten: "a" }],
      luat_khi_gui: { luat_ai: ["x"] },
      truong_moi: "12345",
      loi: [{ vi_tri: { bang: "bang_cong_viec" } }, { vi_tri: { bang: "bang_nguon_tien" } }, { vi_tri: null }],
    });
    expect(Object.keys(kq).sort()).toEqual(["cong_viec", "dat", "loi", "mau_ma"]);
    expect(kq.loi).toHaveLength(1);
  });
});

describe("cắt chương mật khỏi tệp Word", () => {
  it("còn IV–V + câu từ chối; mất I–III, đoạn lạc trong chương mật, biểu đồ, tệp nhúng, chú thích", async () => {
    const kq = await catChuongMat(await dungWord(THAN_F4), tc());
    expect(kq.chuong_da_cat).toHaveLength(3);
    const chu = await chuCua(kq.buf);
    for (const co of ["CÔNG TY CỔ PHẦN SCI", "IV. VẤN ĐỀ NỔI BẬT", "Phải trả nhà thầu phụ", "V. KẾT QUẢ VÀ KẾ HOẠCH", "Đàm phán lãi suất", "Không có số liệu, đề nghị người dùng liên hệ trưởng phòng TCKT công ty"])
      expect(chu).toContain(co);
    for (const khong of ["TÓM TẮT THÔNG TIN", "12345", "NGUỒN TIỀN", "55555", "GIÁ THÀNH", "44444"]) expect(chu).not.toContain(khong);
    const z = await JSZip.loadAsync(kq.buf);
    expect(Object.keys(z.files).filter((f) => /charts|embeddings/.test(f))).toEqual([]);
    expect(await z.file("[Content_Types].xml")!.async("string")).not.toContain("chart1.xml");
    expect(await z.file("word/_rels/document.xml.rels")!.async("string")).not.toContain("rIdChart");
    const fn = await z.file("word/footnotes.xml")!.async("string");
    expect(fn).not.toContain("777");
    expect(fn).toContain("chú thích giữ");
  });
  it("tệp không có chương mật → báo lỗi (nơi gọi chặn, không rơi về tệp gốc)", async () => {
    await expect(catChuongMat(await dungWord(p("IV. VẤN ĐỀ NỔI BẬT VÀ KIẾN NGHỊ LÃNH ĐẠO")), tc())).rejects.toBeInstanceOf(LoiCatChuong);
  });
  it("chương mật có ô liên kết dữ liệu ẩn → báo lỗi", async () => {
    await expect(catChuongMat(await dungWord(THAN_F4, { dataBinding: true }), tc())).rejects.toThrow(/liên kết dữ liệu/);
  });
  it("tệp hỏng → báo lỗi", async () => {
    await expect(catChuongMat(Buffer.from("không phải zip"), tc())).rejects.toBeInstanceOf(LoiCatChuong);
  });
  it("dò chương mật theo nội dung (tài liệu không gắn mẫu)", async () => {
    expect(await coChuongMat(await dungWord(THAN_F4), tc().mat)).toBe(true);
    expect(await coChuongMat(await dungWord(p("I. NHÂN SỰ") + p("II. VẤN ĐỀ NỔI BẬT")), tc().mat)).toBe(false);
  });

  // Tệp Form 4 thật trong kho (chỉ đọc tệp — không mở CSDL). Máy khác không có thì bỏ qua.
  const THAT = [
    "4d/4dd5ffe7f52c92b2c7aae414e2122912585e3e52c585abce50fb695bbbce53da",
    "4a/4a76673fcb5852f10b2f1b1df7d039b3b3b75553ff38fac73ab7cd883d81d593",
    "d3/d301d5995653e2e4c1186ac797c4559c89b664c530c3e4190e7cfe9dd3c3ec57",
  ].map((k) => path.join(process.cwd(), "data", "files", k));
  it.skipIf(!THAT.every((f) => fs.existsSync(f)))("3 tệp Form 4 thật: cắt được, còn IV–V, không còn chữ I–III", async () => {
    for (const f of THAT) {
      const goc = fs.readFileSync(f);
      const kq = await catChuongMat(goc, tc());
      const chu = await chuCua(kq.buf);
      expect(chu).toMatch(/VẤN ĐỀ NỔI BẬT VÀ KIẾN NGHỊ LÃNH ĐẠO/);
      expect(chu).toMatch(/V\. (KẾT QUẢ VÀ KẾ HOẠCH|CÔNG VIỆC)/);
      expect(chu).not.toMatch(/TÓM TẮT THÔNG TIN CHÍNH|NGUỒN TIỀN|GIÁ THÀNH/);
      expect(kq.buf.length).toBeLessThan(goc.length);
    }
  });
});

describe("lọc ở nguồn đọc tệp", () => {
  const qGia = { query: async (sql: string) => ({ rows: sql.includes("mau_word") ? [{ muc: MUC_F4 }] : [] }) } as unknown as Q;
  const nd = (id: string, email = id): NguoiDungPhien => ({ id, email, la_quan_tri: id.startsWith("quantri") }) as unknown as NguoiDungPhien;
  const tt = (ten_tep = "BC.docx"): PhienBanCoTheCat => ({
    ten_tep,
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    sha256: "goc",
    kich_thuoc: 1,
    tai_len_boi: "hoaht@scigroup.vn",
    ket_qua_kiem_tra: { mau_ma: "form-4", cong_viec: [], luat_khi_gui: {} },
  });

  it("người thường / quản trị / AI chạy ngầm → bản cắt; danh sách / người tải lên / máy → toàn văn", async () => {
    const buf = await dungWord(THAN_F4);
    for (const ai of [nd("ketoan2@scigroup.vn"), nd("quantri@scigroup.vn"), null]) {
      const r = await locBaoMat(qGia, "form-4", tt(), buf, ai);
      expect(r.thong_tin.da_cat).toBe(true);
      expect(r.thong_tin.sha256).not.toBe("goc");
      expect(r.thong_tin.ket_qua_kiem_tra).not.toHaveProperty("luat_khi_gui");
      expect(await chuCua(r.noi_dung)).not.toContain("12345");
    }
    for (const ai of [nd("hungnc@scigroup.vn"), nd("truong.tckt@scigroup.vn", "manhpd@scigroup.vn"), nd("hoaht@scigroup.vn"), MAY_DOC_TOAN_VAN] as const) {
      const r = await locBaoMat(qGia, "form-4", tt(), buf, ai);
      expect(r.thong_tin.da_cat).toBeUndefined();
      expect(r.noi_dung).toBe(buf);
    }
  });
  it("báo cáo mẫu mật không phải Word → chặn bằng câu từ chối", async () => {
    await expect(locBaoMat(qGia, "form-4", tt("BC.pdf"), Buffer.from("%PDF"), null)).rejects.toThrow(/Không có số liệu, đề nghị người dùng liên hệ trưởng phòng TCKT công ty/);
  });
  it("kết quả kiểm tra trả qua API thông tin tài liệu (kiểm độc lập 10/10): người không có tên chỉ còn lỗi bảng công việc", async () => {
    const kq = {
      dat: false,
      mau_ma: "form-4",
      luat_khi_gui: { luat_ai: ["x"] },
      loi: [
        { vi_tri: { bang: "bang_cong_viec" }, noi_dung: "dòng 3 thiếu hạn" },
        { vi_tri: { tag: "muc:1" }, noi_dung: 'Mục "I. TÓM TẮT THÔNG TIN CHÍNH": còn chỗ "......"' },
      ],
    };
    for (const ai of [nd("anhn@scigroup.vn"), nd("quantri@scigroup.vn"), null]) {
      const r = await locKetQuaKiemTra(qGia, "form-4", kq, "hoaht@scigroup.vn", ai);
      expect(r).not.toHaveProperty("luat_khi_gui");
      expect(r.loi).toHaveLength(1);
    }
    for (const ai of [nd("hungnc@scigroup.vn"), nd("hoaht@scigroup.vn"), MAY_DOC_TOAN_VAN] as const)
      expect(await locKetQuaKiemTra(qGia, "form-4", kq, "hoaht@scigroup.vn", ai)).toBe(kq);
    // Không gắn mẫu mật nhưng câu lỗi nhắc chương mật → vẫn cắt; kết quả thường → nguyên vẹn
    expect((await locKetQuaKiemTra(qGia, null, { ...kq, mau_ma: "form-1" }, "x", nd("anhn@scigroup.vn"))).loi).toHaveLength(1);
    const thuong = { dat: true, mau_ma: "form-1", loi: [{ vi_tri: null, noi_dung: 'Mục "II. NHÂN SỰ" thiếu' }] };
    expect(await locKetQuaKiemTra(qGia, null, thuong, "x", nd("anhn@scigroup.vn"))).toBe(thuong);
  });
  it("tài liệu không gắn mẫu nhưng có chương mật → vẫn cắt; tài liệu thường → nguyên vẹn", async () => {
    const khongMau: PhienBanCoTheCat = { ...tt(), ket_qua_kiem_tra: null };
    expect((await locBaoMat(qGia, null, khongMau, await dungWord(THAN_F4), null)).thong_tin.da_cat).toBe(true);
    const thuong = await dungWord(p("I. NHÂN SỰ") + p("II. VẤN ĐỀ NỔI BẬT VÀ KIẾN NGHỊ LÃNH ĐẠO"));
    expect((await locBaoMat(qGia, null, khongMau, thuong, null)).noi_dung).toBe(thuong);
  });
});
