// Bước "Sửa lỗi" khi nộp báo cáo (Mr. Đại chốt 28/09/2026, Đợt A):
// ghi chữ sửa vào đúng ô của file Word (sua-vao-file.ts) + code soát trả lời của 🤖 (sua-loi-ai.ts).
import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { csdlMoi, nguoi } from "../helpers/csdl";
import type { Q } from "@/lib/db";
import { kiemTraDayDu } from "@/lib/kiem-tra/kiem-tra";
import { docWord } from "@/lib/kiem-tra/doc-word";
import { ghiSuaVaoFile } from "@/lib/kiem-tra/sua-vao-file";
import { CHO_HAN, dungDanhSach, ghepTraLoi, type MucSuaLoi } from "@/lib/kiem-tra/sua-loi-ai";

const mau = (...p: string[]) => fs.readFileSync(path.join(process.cwd(), "mau-word", ...p));

describe("ghi chữ sửa vào file Word", () => {
  let q: Q;
  beforeAll(async () => {
    q = await csdlMoi({ macDinhGoc: true });
  });

  it("thay đúng một ô bảng, ô khác giữ nguyên; đọc lại ra chữ mới; kiểm lại hết lỗi thiếu hạn ở dòng đó", async () => {
    const buf = mau("vi-du", "BaoCao_Tuan29_BQLDA_QuangTri_ban2.docx");
    const nd0 = await docWord(buf);
    const [bang, dongs] = Object.entries(nd0.bang).find(([, d]) => d.length > 0)!;
    const cot = Object.keys(dongs[0])[0];
    const cu = JSON.stringify(nd0.bang);
    const ra = await ghiSuaVaoFile(buf, [{ vi_tri: { bang, dong: 1, cot }, moi: "Chữ mới do người nộp duyệt, hạn 30/10/2026" }]);
    const nd1 = await docWord(ra);
    expect(nd1.bang[bang][0][cot]).toBe("Chữ mới do người nộp duyệt, hạn 30/10/2026");
    // mọi ô khác không đổi
    const khac = (b: typeof nd0.bang) => JSON.stringify({ ...b, [bang]: b[bang].map((d, i) => (i === 0 ? { ...d, [cot]: "" } : d)) });
    expect(khac(nd1.bang)).toBe(khac(JSON.parse(cu)));
    expect(nd1.o_nhap).toEqual(nd0.o_nhap);
  });

  it("ô nhập gắn mã: thay chữ, đọc lại đúng", async () => {
    const buf = mau("vi-du", "BaoCao_Tuan29_BQLDA_QuangTri_ban2.docx");
    const nd0 = await docWord(buf);
    const tag = Object.keys(nd0.o_nhap).find((t) => t !== "mau_ma")!;
    const ra = await ghiSuaVaoFile(buf, [{ vi_tri: { tag }, moi: "Nguyễn Văn Thử" }]);
    expect((await docWord(ra)).o_nhap[tag]).toBe("Nguyễn Văn Thử");
  });

  it("chỗ không có trong file → báo lỗi, không ghi", async () => {
    const buf = mau("vi-du", "BaoCao_Tuan29_BQLDA_QuangTri_ban2.docx");
    await expect(ghiSuaVaoFile(buf, [{ vi_tri: { bang: "khong_co", dong: 1, cot: "x" }, moi: "a" }])).rejects.toThrow(/Không tìm thấy chỗ cần sửa/);
  });

  it("danh sách lỗi: chặn lên trước; việc trùng không sửa bằng file; ô được sửa lấy chữ cũ từ file", async () => {
    const buf = mau("vi-du", "BaoCao_Tuan29_BQLDA_QuangTri_ban2.docx");
    const kq = await kiemTraDayDu(q, await nguoi("nv.bqlda@scigroup.vn"), buf, "ban2.docx", { bo_qua_so_cai: true });
    const ds = dungDanhSach(kq.loi, await docWord(buf), kq.mau);
    const vt = ds.findIndex((m) => m.muc === "canh_bao");
    if (vt >= 0) expect(ds.slice(vt).every((m) => m.muc === "canh_bao")).toBe(true);
    for (const m of ds) for (const o of m.cho_sua) expect(typeof o.cu).toBe("string");
  });
});

describe("code soát trả lời 🤖", () => {
  const goc: MucSuaLoi[] = [
    { i: 0, muc: "chan", luat: "ten_viec", thong_diep: '"A": chưa có hạn — …', noi: "", can_han: true, cho_sua: [{ vi_tri: { bang: "b", dong: 1, cot: "kien_nghi" }, nhan: "Kiến nghị", cu: "Trình ký ngay" }] },
    { i: 1, muc: "canh_bao", luat: "ten_viec", thong_diep: "x", noi: "", can_han: false, cho_sua: [{ vi_tri: { tag: "t" }, nhan: "Ô", cu: "cũ" }] },
    { i: 2, muc: "canh_bao", luat: "viec_trung", thong_diep: "y", noi: "", can_han: false, cho_sua: [] },
  ];

  it("AI bịa ngày cho lỗi thiếu hạn → code thay bằng chỗ giữ {HAN}; ô không có thật / chữ như cũ → không đề xuất", () => {
    const kq = ghepTraLoi(
      goc,
      JSON.stringify({
        sua: [
          { i: 0, giai_thich: "Chưa ghi hạn.", o: 0, moi: "Trình ký ngay, hạn 30/10/2026" },
          { i: 1, giai_thich: "g", o: 5, moi: "mới" },
          { i: 2, giai_thich: "trùng", o: -1, moi: null, khong_can_sua: "chọn ở bảng" },
        ],
      }),
    );
    expect(kq[0].de_xuat).toEqual({ o: 0, moi: `Trình ký ngay, hạn ${CHO_HAN}` });
    expect(kq[0].giai_thich).toBe("Chưa ghi hạn.");
    expect(kq[1].de_xuat).toBeNull();
    expect(kq[2].de_xuat).toBeNull();
    expect(kq[2].khong_sua_file).toBe("chọn ở bảng");
  });

  it("AI không đề xuất cho lỗi thiếu hạn → code tự đề xuất thêm “hạn {HAN}” vào ô cuối", () => {
    const kq = ghepTraLoi(goc, '{"sua":[{"i":0,"giai_thich":"g","o":-1,"moi":null}]}');
    expect(kq[0].de_xuat).toEqual({ o: 0, moi: `Trình ký ngay, hạn ${CHO_HAN}` });
  });

  it("thiếu hạn ở CỘT NGÀY (Kết thúc): đề xuất chỉ là ngày, không ghi 'hạn …' vào ô ngày", () => {
    const goc: MucSuaLoi[] = [
      {
        i: 0,
        muc: "chan",
        luat: "ngay_trong",
        thong_diep: '"Kiểm định cầu trục": thiếu ngày kết thúc',
        noi: "",
        cho_sua: [{ vi_tri: { bang: "bang_cong_viec", dong: 3, cot: "ket_thuc" }, nhan: "Kết thúc", cu: "" }],
        can_han: true,
      },
    ];
    // AI viết "hạn {HAN}" vào ô ngày (đo 29/09, file Phòng Cơ điện) → máy chữa thành chỉ ngày
    expect(ghepTraLoi(goc, JSON.stringify({ sua: [{ i: 0, giai_thich: "g", o: 0, moi: `hạn ${CHO_HAN}` }] }))[0].de_xuat).toEqual({ o: 0, moi: CHO_HAN });
    // AI không đề xuất → đề xuất của máy cũng chỉ là ngày
    expect(ghepTraLoi(goc, '{"sua":[{"i":0,"giai_thich":"g","o":-1,"moi":null}]}')[0].de_xuat).toEqual({ o: 0, moi: CHO_HAN });
  });
});
