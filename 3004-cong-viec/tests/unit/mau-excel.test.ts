// Mẫu báo cáo Excel (22/10/2026): dựng tệp 3 tờ từ 12 mẫu Word thật, đọc lại bằng bộ đọc Excel, so với bộ đọc Word cũ.
import { describe, expect, test } from "vitest";
import fs from "node:fs";
import ExcelJS from "exceljs";
import { boCucTuWord, type DinhNghiaCoBang } from "@/lib/mau-excel/bo-cuc";
import { dungTepExcel, dungTepExcelTuBaoCao, TO_GHI, TO_HUONG_DAN, TO_MAY, TO_VI_DU, type MauCanVe } from "@/lib/mau-excel/dung-excel";
import { docExcel, laGoiExcel, type MauDeDoan } from "@/lib/mau-excel/doc-excel";
import { docWord } from "@/lib/kiem-tra/doc-word";
import DN from "../../mau-word/dinh-nghia.json";

type Goc = { ma: string; ten: string; tep: string; phien_ban?: number; dinh_nghia: DinhNghiaCoBang };
const DS = DN as unknown as Goc[];
const DS_DOAN: MauDeDoan[] = DS.map((m) => ({ ma: m.ma, ten: m.ten, dinh_nghia: m.dinh_nghia }));

async function mauVe(m: Goc): Promise<MauCanVe> {
  return {
    mau: { ma: m.ma, ten: m.ten, phien_ban: m.phien_ban ?? 1, dinh_nghia: m.dinh_nghia },
    trang: await boCucTuWord(fs.readFileSync(`mau-word/trang/${m.tep}`), m.dinh_nghia),
    vi_du: await boCucTuWord(fs.readFileSync(`mau-word/${m.tep}`), m.dinh_nghia),
  };
}

/** Bỏ khác biệt trình bày: khoảng trắng, dấu đầu dòng Word. */
const gon = (v: string) => v.replace(/^•\s*/gm, "").replace(/\s+/g, " ").trim();
const gonDong = (ds: Record<string, string>[]) => ds.map((d) => Object.fromEntries(Object.entries(d).map(([k, v]) => [k, gon(v)])));

async function sua(buf: Buffer, fn: (wb: ExcelJS.Workbook, ws: ExcelJS.Worksheet) => void): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ArrayBuffer);
  fn(wb, wb.getWorksheet(TO_GHI)!);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

import { cotBang, cotCo, hangCo, nenCua, oGiaTri } from "./excel-o";

describe("12 mẫu: dựng tệp Excel 3 tờ", () => {
  for (const m of DS)
    test(`${m.ma} có đủ tờ, tờ đầu là Mẫu trắng`, async () => {
      const buf = await dungTepExcel(await mauVe(m));
      expect(laGoiExcel(buf)).toBe(true);
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buf as unknown as ArrayBuffer);
      expect(wb.worksheets.map((w) => w.name)).toEqual([TO_GHI, TO_HUONG_DAN, TO_VI_DU, TO_MAY]);
      expect(wb.getWorksheet(TO_MAY)!.state).toBe("veryHidden");
      // Mẫu trắng chưa điền: máy nhận mẫu, mọi bảng có mặt, không có dòng việc nào
      const nd = await docExcel(buf);
      expect(nd.mau_ma).toBe(m.ma);
      for (const b of m.dinh_nghia.bang ?? []) expect(Object.keys(nd.bang)).toContain(b.tag);
      expect((nd.bang.bang_cong_viec ?? []).filter((d) => d.ten)).toHaveLength(0);
      expect(nd.chan_doc?.join(" ")).toMatch(/chưa ghi gì/);
    });
});

describe("khổ in theo bản Word gốc (Mr. Đại 22/10: A4 dọc; riêng Form 4 Phòng TCKT A4 ngang)", () => {
  for (const [ma, huong] of [["form-1", "portrait"], ["form-7", "portrait"], ["form-4", "landscape"]] as const)
    test(`${ma}: A4 ${huong === "portrait" ? "dọc" : "ngang"}, vừa một trang bề ngang, tắt lưới Excel`, async () => {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load((await dungTepExcel(await mauVe(DS.find((m) => m.ma === ma)!))) as unknown as ArrayBuffer);
      for (const ten of [TO_GHI, TO_VI_DU]) {
        const ws = wb.getWorksheet(ten)!;
        expect(ws.pageSetup).toMatchObject({ paperSize: 9, orientation: huong, fitToPage: true, fitToWidth: 1, fitToHeight: 0 });
        expect(ws.views[0]?.showGridLines).toBe(false);
      }
      expect(wb.getWorksheet(TO_HUONG_DAN)!.pageSetup.orientation).toBe("portrait");
    });
});

describe("12 mẫu: số liệu ví dụ đi Word → Excel → đọc lại không mất ô nào", () => {
  for (const m of DS)
    test(`${m.ma} khớp bộ đọc Word`, async () => {
      const mv = await mauVe(m);
      const word = fs.readFileSync(`mau-word/${m.tep}`);
      const buf = await dungTepExcelTuBaoCao(mv, mv.vi_du!);
      const ex = await docExcel(buf);
      const wd = await docWord(word);
      expect(ex.mau_ma).toBe(wd.mau_ma);
      for (const [tag, v] of Object.entries(wd.o_nhap)) expect(gon(ex.o_nhap[tag] ?? "<mất>"), `ô ${tag}`).toBe(gon(v));
      for (const [tag, ds] of Object.entries(wd.bang)) {
        // Excel cho sẵn dòng trống ở bảng việc — so phần có chữ
        const co = (x: Record<string, string>[]) => gonDong(x).filter((d) => Object.entries(d).some(([k, v]) => k !== "nhom" && v));
        expect(co(ex.bang[tag] ?? []), `bảng ${tag}`).toEqual(co(ds));
      }
      expect(ex.tieu_de.map(gon)).toEqual(expect.arrayContaining(wd.tieu_de.filter((t) => /^[IVX]+\./.test(t)).map(gon)));
    });
});

describe("tình huống xấu", () => {
  const f1 = DS.find((m) => m.ma === "form-1")!;
  const tepTrang = async () => dungTepExcel(await mauVe(f1));
  /** Cột thứ j (0-based) của bảng việc → cột Excel (ô chính của vùng gộp) */
  const C = (ws: ExcelJS.Worksheet, j: number) => cotBang(ws, hangCo(ws, "Công việc"))[j];
  const dienViec = (ws: ExcelJS.Worksheet, dong: string[][]) => {
    const r = hangCo(ws, "Công việc");
    const cot = cotBang(ws, r);
    dong.forEach((d, i) => d.forEach((v, j) => (ws.getCell(r + 1 + i, cot[j]).value = v)));
    return r;
  };

  test("đọc đúng bảng việc khi đổi thứ tự cột và chèn cột lạ", async () => {
    const buf = await sua(await tepTrang(), (_wb, ws) => {
      const r = hangCo(ws, "Công việc");
      const [cTen, , cBd, cKt] = cotBang(ws, r);
      ws.getCell(r, 14).value = "Ghi chú riêng"; // cột lạ người lập thêm bên phải bảng
      ws.getCell(r + 1, 14).value = "chữ cột lạ";
      // đổi chỗ Bắt đầu ↔ Kết thúc
      const a = ws.getCell(r, cBd).value, b = ws.getCell(r, cKt).value;
      ws.getCell(r, cBd).value = b;
      ws.getCell(r, cKt).value = a;
      ws.getCell(r + 1, cTen).value = "Trình hồ sơ GPXD";
      ws.getCell(r + 1, cBd).value = "20/08/2026"; // giờ là cột Kết thúc
      ws.getCell(r + 1, cKt).value = "05/08/2026";
    });
    const nd = await docExcel(buf);
    expect(nd.bang.bang_cong_viec[0]).toMatchObject({ ten: "Trình hồ sơ GPXD", ket_thuc: "20/08/2026", bat_dau: "05/08/2026" });
  });

  test("ngày Excel tự đổi thành kiểu ngày → đọc ra dd/mm/yyyy, không đảo ngày tháng", async () => {
    const buf = await sua(await tepTrang(), (_wb, ws) => {
      const r = dienViec(ws, [["Họp nghiệm thu"]]);
      ws.getCell(r + 1, C(ws, 3)).value = new Date(Date.UTC(2026, 7, 5)); // 05/08/2026
    });
    expect((await docExcel(buf)).bang.bang_cong_viec[0].ket_thuc).toBe("05/08/2026");
  });

  test("Kết thúc ghi «N ngày sau khi xong …» giữ nguyên chữ", async () => {
    const buf = await sua(await tepTrang(), (_wb, ws) => void dienViec(ws, [["Việc A", "", "", "5 ngày sau khi xong Việc B"]]));
    expect((await docExcel(buf)).bang.bang_cong_viec[0].ket_thuc).toBe("5 ngày sau khi xong Việc B");
  });

  test("một ô nhiều việc (Alt+Enter) giữ xuống dòng cho bộ kiểm cảnh báo", async () => {
    const buf = await sua(await tepTrang(), (_wb, ws) => void dienViec(ws, [["- Việc một\n- Việc hai", "", "", "20/08/2026"]]));
    expect((await docExcel(buf)).bang.bang_cong_viec[0].ten).toBe("- Việc một\n- Việc hai");
  });

  test("dòng chỉ có tên nhóm ở bảng việc không thành việc", async () => {
    const buf = await sua(await tepTrang(), (_wb, ws) => void dienViec(ws, [["SCI QUẢNG TRỊ"], ["Việc thật", "", "", "20/08/2026"]]));
    const nd = await docExcel(buf);
    expect(nd.dong_nhom?.bang_cong_viec).toEqual(["SCI QUẢNG TRỊ"]);
    expect(nd.bang.bang_cong_viec.filter((d) => d.ten).map((d) => d.ten)).toEqual(["Việc thật"]);
  });

  test("dòng nhóm của bảng cảnh báo ghi vào cột nhom của các dòng sau", async () => {
    const buf = await sua(await tepTrang(), (_wb, ws) => {
      const r = hangCo(ws, "TƯ VẤN");
      ws.getCell(r + 1, 1).value = "RFP tư vấn FS";
    });
    const d = (await docExcel(buf)).bang.bang_canh_bao.find((x) => x.ho_so === "RFP tư vấn FS");
    expect(d?.nhom).toBe("TƯ VẤN");
  });

  test("ô gộp dọc cột Dự án → mọi dòng gộp mang tên dự án; gộp ngang không nhân đôi chữ", async () => {
    const buf = await sua(await tepTrang(), (_wb, ws) => {
      const r = dienViec(ws, [["Việc 1", "Hướng Việt", "", "20/08/2026"], ["Việc 2", "", "", "21/08/2026"]]);
      const [cTen, cDa, cBd, cKt] = cotBang(ws, r);
      // gộp dọc vùng Dự án của 2 dòng; gộp ngang dòng 3 từ Công việc tràn qua Dự án
      for (const h of [r + 1, r + 2, r + 3]) {
        ws.unMergeCells(h, cTen, h, cDa - 1);
        ws.unMergeCells(h, cDa, h, cBd - 1);
      }
      ws.mergeCells(r + 1, cDa, r + 2, cBd - 1);
      ws.mergeCells(r + 1, cTen, r + 1, cDa - 1);
      ws.mergeCells(r + 2, cTen, r + 2, cDa - 1);
      ws.mergeCells(r + 3, cTen, r + 3, cBd - 1);
      ws.getCell(r + 3, cTen).value = "Việc 3 gõ tràn ô";
      ws.getCell(r + 3, cKt).value = "22/08/2026";
    });
    const v = (await docExcel(buf)).bang.bang_cong_viec.filter((d) => d.ten);
    expect(v.map((d) => d.du_an)).toEqual(["Hướng Việt", "Hướng Việt", ""]);
    expect(v[2].ten).toBe("Việc 3 gõ tràn ô");
  });

  test("ô công thức: đọc kết quả; mất kết quả thì cảnh báo", async () => {
    const buf = await sua(await tepTrang(), (_wb, ws) => {
      const r = dienViec(ws, [["Việc 1"], ["Việc 2"]]);
      ws.getCell(r + 1, C(ws, 3)).value = { formula: 'TEXT(DATE(2026,8,20),"dd/mm/yyyy")', result: "20/08/2026" };
      ws.getCell(r + 2, C(ws, 3)).value = { formula: "A1" } as ExcelJS.CellFormulaValue;
    });
    const nd = await docExcel(buf);
    expect(nd.bang.bang_cong_viec[0].ket_thuc).toBe("20/08/2026");
    expect(nd.canh_bao_doc?.join(" ")).toMatch(/1 ô công thức không còn kết quả/);
  });

  test("hàng ẩn vẫn đọc và có cảnh báo", async () => {
    const buf = await sua(await tepTrang(), (_wb, ws) => {
      const r = dienViec(ws, [["Việc ẩn", "", "", "20/08/2026"]]);
      ws.getRow(r + 1).hidden = true;
    });
    const nd = await docExcel(buf);
    expect(nd.bang.bang_cong_viec[0].ten).toBe("Việc ẩn");
    expect(nd.canh_bao_doc?.join(" ")).toMatch(/hàng đang ẩn/);
  });

  test("chép nguyên số liệu ví dụ sang tờ Mẫu trắng → chặn", async () => {
    const mv = await mauVe(f1);
    const nd = await docExcel(await dungTepExcelTuBaoCao(mv, mv.vi_du!));
    expect(nd.chan_doc?.join(" ")).toMatch(/số liệu của tờ «Ví dụ đã điền»/);
  });

  test("điền vào tờ Ví dụ, tờ Mẫu trắng bỏ trống → chặn kèm lời chỉ", async () => {
    const nd = await docExcel(await tepTrang());
    expect(nd.chan_doc?.join(" ")).toMatch(/Máy chỉ đọc tờ «Mẫu trắng»/);
  });

  test("đổi tên tờ Mẫu trắng vẫn đọc tờ đó", async () => {
    const buf = await sua(await tepTrang(), (_wb, ws) => {
      ws.name = "Báo cáo tuần 43";
      dienViec(ws, [["Việc đổi tên tờ", "", "", "20/08/2026"]]);
    });
    expect((await docExcel(buf)).bang.bang_cong_viec[0].ten).toBe("Việc đổi tên tờ");
  });

  test("mất tờ ẩn _may (chép sang tệp mới) → đọc theo định nghĩa mẫu", async () => {
    const buf = await sua(await tepTrang(), (wb, ws) => {
      wb.removeWorksheet(wb.getWorksheet(TO_MAY)!.id);
      dienViec(ws, [["Việc không tờ máy", "Hướng Việt", "01/08/2026", "20/08/2026", "Biên bản", "Đang làm"]]);
    });
    const nd = await docExcel(buf, async () => DS_DOAN);
    expect(nd.mau_ma).toBe("form-1");
    expect(nd.bang.bang_cong_viec[0]).toMatchObject({ ten: "Việc không tờ máy", du_an: "Hướng Việt", ket_thuc: "20/08/2026", tinh_trang: "Đang làm" });
  });

  test("mất cả dòng Mã mẫu lẫn tờ _may → nhận mẫu theo tên chương, có cảnh báo", async () => {
    const buf = await sua(await tepTrang(), (wb, ws) => {
      wb.removeWorksheet(wb.getWorksheet(TO_MAY)!.id);
      for (let r = 1; r <= 30; r++) if (/^Mã mẫu/.test(String(ws.getCell(r, 1).value ?? ""))) ws.getCell(r, 1).value = "";
      dienViec(ws, [["Việc", "", "", "20/08/2026"]]);
    });
    const nd = await docExcel(buf, async () => DS_DOAN);
    expect(nd.mau_ma).toBe("form-1");
    expect(nd.canh_bao_doc?.join(" ")).toMatch(/không còn dòng «Mã mẫu»/);
  });

  test("sửa chữ tên cột → cảnh báo thiếu cột, không đọc lệch sang cột khác", async () => {
    const buf = await sua(await tepTrang(), (_wb, ws) => {
      const r = dienViec(ws, [["Việc", "", "", "20/08/2026"]]);
      ws.getCell(r, C(ws, 3)).value = "Hạn chót";
    });
    const nd = await docExcel(buf);
    expect(nd.bang.bang_cong_viec[0].ket_thuc).toBeUndefined();
    expect(nd.canh_bao_doc?.join(" ")).toMatch(/không thấy cột «Kết thúc»/);
  });

  test("chèn thêm dòng giữa bảng, quá 30 dòng in sẵn vẫn đọc hết", async () => {
    const buf = await sua(await tepTrang(), (_wb, ws) => {
      const r = hangCo(ws, "Công việc");
      const [cTen, , , cKt] = cotBang(ws, r);
      // người lập chèn dòng thường (không gộp) giữa bảng — máy vẫn đọc theo ô chính của từng cột
      ws.spliceRows(r + 1, 0, ...Array.from({ length: 35 }, (_, i) => {
        const d: string[] = [];
        d[cTen - 1] = `Việc chèn ${i + 1}`;
        d[cKt - 1] = "20/08/2026";
        return d;
      }));
    });
    expect((await docExcel(buf)).bang.bang_cong_viec.filter((d) => d.ten)).toHaveLength(35);
  });

  test("tệp không phải Excel / Excel hỏng → báo lỗi tiếng Việt", async () => {
    await expect(docExcel(Buffer.from("PK\u0003\u0004 không phải tệp"))).rejects.toThrow(/không mở được bằng Excel/);
  });

  test("Kỳ báo cáo và Đơn vị lập đọc theo nhãn", async () => {
    const buf = await sua(await tepTrang(), (_wb, ws) => {
      oGiaTri(ws, "Kỳ báo cáo").value = "Tuần 43/2026 (19/10/2026 – 25/10/2026)";
    });
    const nd = await docExcel(buf);
    expect(nd.o_nhap.ky_bao_cao).toBe("Tuần 43/2026 (19/10/2026 – 25/10/2026)");
    expect(nd.o_nhap.don_vi_lap).toBe("PHÒNG ĐẦU TƯ VÀ PHÁP CHẾ");
    expect(nd.o_nhap.gui_den).toBe("Ban Tổng giám đốc");
  });
});

describe("bảo mật Form 4: cắt chương mật khỏi tệp Excel", async () => {
  const { catChuongMatExcel, coChuongMatExcel } = await import("@/lib/bao-mat/cat-chuong-excel");
  const { gocChuongMat } = await import("@/lib/bao-mat/quy-tac");
  const { MAC_DINH } = await import("@/lib/cau-hinh/mac-dinh");
  const mat = gocChuongMat(MAC_DINH.bao_mat);
  const f4 = DS.find((m) => m.ma === "form-4")!;
  const biet = f4.dinh_nghia.muc_bat_buoc;

  test("báo cáo Form 4 điền số: người thường nhận tệp không còn số, còn chương IV, V", async () => {
    const mv = await mauVe(f4);
    const buf = await dungTepExcelTuBaoCao(mv, mv.vi_du!);
    expect(await coChuongMatExcel(buf, mat)).toBe(true);
    const kq = await catChuongMatExcel(buf, { mat, biet, cau_tu_choi: "Không có số liệu." });
    expect(kq.chuong_da_cat).toHaveLength(3);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(kq.buf as unknown as ArrayBuffer);
    expect(wb.worksheets.map((w) => w.name)).toEqual([TO_GHI, TO_MAY]);
    const chu: string[] = [];
    wb.worksheets.forEach((w) => w.eachRow((r) => r.eachCell((c) => void chu.push(c.text))));
    const tat = chu.join("\n");
    expect(tat).toMatch(/Phần số liệu tài chính đã ẩn/);
    expect(tat).not.toMatch(/NGUỒN TIỀN|CHI PHÍ GIÁ THÀNH|TÓM TẮT THÔNG TIN/);
    // Số tiền ví dụ của chương mật không còn ở đâu
    const soMat = (mv.vi_du!.khoi.find((k) => k.loai === "bang" && k.tag === "bang_nguon_tien") as { dong: { gt?: Record<string, string> }[] }).dong
      .flatMap((d) => Object.values(d.gt ?? {})).filter((v) => /\d{3}/.test(v));
    for (const v of soMat.slice(0, 20)) expect(tat).not.toContain(v);
    // Bản cắt vẫn đọc được: bảng việc + kiến nghị còn, bảng mật mất
    const nd = await docExcel(kq.buf);
    expect(nd.mau_ma).toBe("form-4");
    expect(Object.keys(nd.bang)).toEqual(expect.arrayContaining(["bang_kien_nghi", "bang_cong_viec"]));
    expect(nd.bang.bang_nguon_tien).toBeUndefined();
    expect(nd.bang.bang_chi_phi).toBeUndefined();
  });

  test("tệp không có chương mật → chặn (không bao giờ trả tệp gốc)", async () => {
    const f1 = DS.find((m) => m.ma === "form-1")!;
    const buf = await dungTepExcel(await mauVe(f1));
    expect(await coChuongMatExcel(buf, mat)).toBe(false);
    await expect(catChuongMatExcel(buf, { mat, biet: [], cau_tu_choi: "x" })).rejects.toThrow(/không thấy chương mật/);
  });
});

describe("đợt 2: tô lỗi vào tệp Excel · sửa thẳng vào ô · bản xem nhanh", async () => {
  const { danhDauLoiExcel } = await import("@/lib/mau-excel/danh-dau-excel");
  const { ghiSuaVaoExcel } = await import("@/lib/mau-excel/sua-vao-excel");
  const { taoBanXem } = await import("@/lib/thu-muc/xem-truoc");
  const f1 = DS.find((m) => m.ma === "form-1")!;
  const coViec = async () =>
    sua(await dungTepExcel(await mauVe(f1)), (_wb, ws) => {
      const r = hangCo(ws, "Công việc");
      const [cTen, cDa, , cKt] = cotBang(ws, r);
      ws.getCell(r + 1, cTen).value = "Trình hồ sơ GPXD trạm 110 kV";
      ws.getCell(r + 1, cDa).value = "Hướng Việt"; // chỉ ghi tên việc thì máy hiểu là dòng tên nhóm (chốt 10/10)
      ws.getCell(r + 2, cTen).value = "Họp nghiệm thu móng";
      ws.getCell(r + 2, cKt).value = "20/08/2026";
    });
  const LOI = [
    { luat: "x", muc: "chan" as const, thong_diep: "Thiếu ngày kết thúc", vi_tri: { bang: "bang_cong_viec", dong: 1, cot: "ket_thuc" } },
    { luat: "x", muc: "canh_bao" as const, thong_diep: "Dòng này chưa ghi kết quả", vi_tri: { bang: "bang_cong_viec", dong: 2 } },
    { luat: "x", muc: "canh_bao" as const, thong_diep: "Cảnh báo cùng ô với lỗi chặn", vi_tri: { bang: "bang_cong_viec", dong: 1, cot: "ket_thuc" } },
    { luat: "x", muc: "chan" as const, thong_diep: "Kỳ báo cáo còn để trống", vi_tri: { tag: "ky_bao_cao" } },
    { luat: "x", muc: "canh_bao" as const, thong_diep: "Lỗi chung không gắn ô nào" },
  ];
  const nen = nenCua;
  /** ô Kết thúc dòng n của bảng việc · ô giá trị Kỳ báo cáo */
  const kt = (ws: ExcelJS.Worksheet, n: number) => ws.getCell(hangCo(ws, "Công việc") + n, cotCo(ws, hangCo(ws, "Công việc"), "Kết thúc"));
  const ky = (ws: ExcelJS.Worksheet) => oGiaTri(ws, "Kỳ báo cáo");
  const mo = async (b: Buffer) => {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(b as unknown as ArrayBuffer);
    return wb;
  };

  test("tô đỏ / vàng đúng ô, ghi chú tại ô, tờ «Lỗi cần sửa» đủ 5 lỗi; máy vẫn đọc tệp như cũ", async () => {
    const goc = await coViec();
    const { buf, so_cho } = await danhDauLoiExcel(goc, LOI as never);
    expect(so_cho).toBe(4);
    const wb = await mo(buf);
    const ws = wb.getWorksheet(TO_GHI)!;
    const r = hangCo(ws, "Công việc");
    expect(nen(kt(ws, 1))).toBe("FFFF8A80"); // chặn + cảnh báo cùng ô → ĐỎ
    expect(String(kt(ws, 1).note)).toContain("[CHẶN GỬI] Thiếu ngày kết thúc");
    for (const c of cotBang(ws, r)) expect(nen(ws.getCell(r + 2, c))).toBe("FFFFF2A8"); // lỗi cả dòng → tô cả dòng
    expect(nen(ky(ws))).toBe("FFFF8A80");
    const loi = wb.getWorksheet("Lỗi cần sửa")!;
    expect(loi.rowCount).toBeGreaterThanOrEqual(6);
    expect(wb.worksheets.at(-1)!.name).toBe("Lỗi cần sửa");
    expect(wb.getWorksheet(TO_MAY)!.state).toBe("veryHidden");
    const nd = await docExcel(buf);
    expect(nd.mau_ma).toBe("form-1");
    expect(nd.bang.bang_cong_viec.filter((d) => d.ten).map((d) => d.ten)).toEqual(["Trình hồ sơ GPXD trạm 110 kV", "Họp nghiệm thu móng"]);
  });

  test("đánh dấu lại bản đã đánh dấu: bỏ màu + ghi chú cũ, ô trả đúng nền gốc của mẫu (đỏ / xanh), không nhân đôi tờ lỗi", async () => {
    const lan1 = (await danhDauLoiExcel(await coViec(), LOI as never)).buf;
    const lan2 = (await danhDauLoiExcel(lan1, [LOI[1]] as never)).buf;
    const wb = await mo(lan2);
    const ws = wb.getWorksheet(TO_GHI)!;
    const r = hangCo(ws, "Công việc");
    expect(nen(kt(ws, 1))).toBe("FFFBDADA"); // cột Kết thúc nền đỏ của mẫu
    expect(kt(ws, 1).note).toBeUndefined();
    expect(nen(ky(ws))).toBe("FFD6E6FA"); // Kỳ báo cáo nền xanh của mẫu
    expect(nen(ws.getCell(r + 2, cotBang(ws, r)[0]))).toBe("FFFFF2A8");
    expect(wb.worksheets.filter((w) => w.name === "Lỗi cần sửa")).toHaveLength(1);
  });

  test("sửa thẳng vào ô bảng và ô nhập; bỏ màu lỗi ô đó; danh sách chọn + tờ ẩn còn nguyên", async () => {
    const daDanh = (await danhDauLoiExcel(await coViec(), LOI as never)).buf;
    const moi = await ghiSuaVaoExcel(daDanh, [
      { vi_tri: { bang: "bang_cong_viec", dong: 1, cot: "ket_thuc" }, moi: "30/08/2026" },
      { vi_tri: { tag: "ky_bao_cao" }, moi: "Tuần 43/2026 (19/10/2026 – 25/10/2026)" },
    ]);
    const nd = await docExcel(moi);
    expect(nd.bang.bang_cong_viec[0]).toMatchObject({ ten: "Trình hồ sơ GPXD trạm 110 kV", ket_thuc: "30/08/2026" });
    expect(nd.o_nhap.ky_bao_cao).toBe("Tuần 43/2026 (19/10/2026 – 25/10/2026)");
    const wb = await mo(moi);
    const ws = wb.getWorksheet(TO_GHI)!;
    const r = hangCo(ws, "Công việc");
    expect(nen(kt(ws, 1))).toBe("FFFBDADA");
    expect(kt(ws, 1).note).toBeUndefined();
    expect(nen(ky(ws))).toBe("FFD6E6FA");
    expect(ws.getCell(r + 3, cotCo(ws, r, "Tình trạng")).dataValidation?.type).toBe("list");
    expect(wb.getWorksheet(TO_MAY)!.state).toBe("veryHidden");
  });

  test("sửa vào chỗ không có trong tệp → báo lỗi, không ghi nửa chừng", async () => {
    await expect(ghiSuaVaoExcel(await coViec(), [{ vi_tri: { bang: "bang_cong_viec", dong: 99, cot: "ket_thuc" }, moi: "x" }])).rejects.toThrow(/Không tìm thấy chỗ cần sửa/);
  });

  test("bản xem nhanh: chỉ tờ báo cáo (không Hướng dẫn, Ví dụ, tờ ẩn), không hàng trống, việc nằm trọn một hàng để khoanh", async () => {
    const b = await coViec();
    const x = await taoBanXem("bc.xlsx", "", b, "sha");
    expect(x.loai).toBe("html");
    const html = (x as { html: string }).html;
    expect(html).toContain("Trình hồ sơ GPXD trạm 110 kV");
    expect(html).not.toMatch(/HƯỚNG DẪN ĐIỀN|VÍ DỤ ĐÃ ĐIỀN|ma_mau|vi_du/);
    expect(html).not.toMatch(/<tr>(?:<td[^>]*><\/td>)*<\/tr>/);
    const hang = html.split("<tr").find((t) => t.includes("Họp nghiệm thu móng"))!;
    expect(hang).toContain("20/08/2026");
  });
});
