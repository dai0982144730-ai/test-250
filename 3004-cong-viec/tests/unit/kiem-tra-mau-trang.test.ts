// Mẫu Word TRẮNG (mau-word/trang/form-N.docx, scripts/tao-mau-trang.mjs): mở được, đủ tag như định nghĩa, sạch số liệu ví dụ,
// tải lên kiểm tra thì nhận đúng mẫu nhưng bị CHẶN ở kỳ báo cáo (mẫu bản 6: bỏ Người lập / Ngày lập / chữ ký); điền ô bắt buộc thì đạt. Hệ thống lưu hai bản
// (trắng = bản chính, có ví dụ = tham khảo), API tải trả đúng bản.
import { describe, it, expect, beforeAll, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import type { NguoiDungPhien } from "@/lib/types";

const phien = vi.hoisted(() => ({ nd: null as NguoiDungPhien | null }));
vi.mock("@/lib/phien", async (goc) => {
  const g = (await goc()) as Record<string, unknown>;
  return {
    ...g,
    batBuocDangNhap: async () => {
      if (!phien.nd) throw new (g.LoiHttp as new (s: number, m: string) => Error)(401, "Chưa đăng nhập");
      return phien.nd;
    },
  };
});

import { csdlMoi, nguoi } from "../helpers/csdl";
import { layQ, tx, type Q } from "@/lib/db";
import { docWord } from "@/lib/kiem-tra/doc-word";
import { kiemTraDayDu, layMau } from "@/lib/kiem-tra/kiem-tra";
import { docTepMau, lichSuPhienBanMau, taiLenTepMau } from "@/lib/kiem-tra/quan-ly-mau";
import { hatGiong, PHIEN_BAN_VI_DU } from "@/lib/kiem-tra/hat-giong";
import { ghiTep } from "@/lib/luu-tru/kho";
import { khoTam } from "../fixtures/chuan-bi";
import { dienOBatBuoc, NHAC_BIEU_DO, SO_DONG_TRONG, taoMauTrang } from "../../scripts/tao-mau-trang.mjs";

const GOC = path.join(process.cwd(), "mau-word");
const MA = Array.from({ length: 12 }, (_, i) => `form-${i}`);
const trang = (ma: string) => fs.readFileSync(path.join(GOC, "trang", `${ma}.docx`));
const viDu = (ma: string) => fs.readFileSync(path.join(GOC, `${ma}.docx`));

/** Số liệu ví dụ đặc trưng của từng mẫu (có trong bản ví dụ, không được còn trong bản trắng). */
const SO_LIEU_VI_DU: Record<string, string[]> = {
  "form-0": ["1.240 giờ", "GPMB Trụ T11", "40.951", "31/07/2026", "Tuần 30/2026"],
  "form-1": ["TKCS Hướng Phùng 1 chờ BộCT", "45 tỷ", "Tuần 29/2026"],
  "form-2": ["1.240 giờ", "97,8% KH", "Van xả cống số 2"],
  "form-3": ["Tuyển mới 1 CBVH", "30F-789", "Đầu tuần (14/07)"],
  "form-4": ["673.396", "8,2 tỷ", "tháng 6/2026"],
  // 20/10/2026: Form 5 bỏ chương Tổng quan dự án; Form 6 thành báo cáo tuần, bỏ chương tiến độ thi công · nhân lực · thu vốn
  "form-5": ["48 MW", "Tuần 29/2026"],
  "form-6": ["12,5 tỷ", "Rotor turbine", "TĐ Nậm Mô 1", "Tuần 29/2026"],
  "form-7": ["41,5%", "GPMB T11", "3.200"],
  "form-8": ["Relay bảo vệ R21", "1.226", "94,7%", "Tuần 29 (14–20/07/2026)"],
  "form-9": ["WTG-05", "63 MVA", "Tuần 39/2026", "kiểm định 08/10"],
  "form-10": ["41,5%", "GPMB T11", "3.200"],
  "form-11": ["41,5%", "GPMB T11", "3.200"],
};

async function tatCaTag(buf: Buffer): Promise<Set<string>> {
  const xml = await (await JSZip.loadAsync(buf)).file("word/document.xml")!.async("string");
  return new Set(Array.from(xml.matchAll(/<w:tag w:val="([^"]+)"/g), (m) => m[1]));
}

let q: Q;
beforeAll(async () => {
  khoTam();
  await csdlMoi();
  q = await layQ();
});

describe("12 mẫu trắng (form-0 … form-11)", () => {
  it.each(MA)("%s: mở được, đủ mọi tag, không còn số liệu ví dụ", async (ma) => {
    const mau = (await layMau(q, ma))!;
    const dn = mau.dinh_nghia as typeof mau.dinh_nghia & { bang?: { tag: string; so_lieu?: boolean; cot: { tag: string }[] }[] };
    const [b, v] = [trang(ma), viDu(ma)];
    const [nd, ndVd] = [await docWord(b), await docWord(v)];
    expect(nd.mau_ma).toBe(ma);
    // tag: đúng bộ tag của bản đã chuyển; mọi ô nhập và bảng của định nghĩa còn đọc được
    expect(await tatCaTag(b)).toEqual(await tatCaTag(v));
    for (const o of dn.o_nhap) expect(Object.keys(nd.o_nhap), `${ma} thiếu ô ${o.tag}`).toContain(o.tag);
    // bảng số liệu gắn mã (an toàn, KPI, tiến độ…): làm trắng theo đặc tả (giữ nhãn danh mục) — vẫn đủ cột gắn mã
    for (const bang of (dn.bang ?? []).filter((b) => b.so_lieu)) {
      expect(nd.bang[bang.tag]?.length, `${ma} thiếu bảng ${bang.tag}`).toBeGreaterThan(0);
      for (const d of nd.bang[bang.tag]) expect(Object.keys(d).sort()).toEqual(bang.cot.map((c) => c.tag).sort());
    }
    for (const bang of (dn.bang ?? []).filter((b) => !b.so_lieu)) {
      expect(nd.bang[bang.tag], `${ma} thiếu bảng ${bang.tag}`).toHaveLength(SO_DONG_TRONG);
      for (const d of nd.bang[bang.tag]) {
        expect(Object.keys(d).sort()).toEqual(bang.cot.map((c) => c.tag).sort());
        expect(Object.values(d).every((x) => x === "")).toBe(true);
      }
    }
    // tiêu đề mục và dòng "Gửi:" giữ nguyên
    expect(nd.tieu_de).toEqual(ndVd.tieu_de);
    expect(nd.o_nhap.gui_den ?? null).toBe(ndVd.o_nhap.gui_den ?? null);
    // mẫu bản 6: bỏ ô Người lập / Ngày lập / Người kiểm soát và khối chữ ký — định nghĩa và file đều không còn; kỳ bỏ tích
    for (const t of ["nguoi_lap", "ngay_lap", "nguoi_kiem_soat"]) {
      expect(dn.o_nhap.some((o) => o.tag === t), `${ma} còn ô ${t} trong định nghĩa`).toBe(false);
      expect(nd.o_nhap[t], `${ma} còn ô ${t} trong file`).toBeUndefined();
    }
    // Mẫu bản 9: ô kỳ chỉ MỘT loại kỳ, không hộp tích — mẫu tuần giữ "từ – đến" (Form 6 thành báo cáo tuần 20/10/2026)
    expect(nd.o_nhap.ky_bao_cao).toMatch(/^Tuần \.{6}\/20\.\.\. +\(\.{6}\/\.{6}\/20\.\.\. – \.{6}\/\.{6}\/20\.\.\.\)$/);
    const xml = await (await JSZip.loadAsync(b)).file("word/document.xml")!.async("string");
    expect(xml).not.toContain('w14:checked w14:val="1"');
    // số liệu ví dụ: có trong bản ví dụ, không còn trong bản trắng
    for (const s of SO_LIEU_VI_DU[ma]) {
      expect(ndVd.van_ban, `${ma}: bản ví dụ phải có "${s}"`).toContain(s);
      expect(nd.van_ban, `${ma}: bản trắng còn "${s}"`).not.toContain(s);
    }
    expect(nd.van_ban).not.toMatch(/ngày \d+ tháng \d+ năm \d{4}/);
  });

  it("bảng danh mục cố định giữ nhãn, xóa số; ảnh biểu đồ số liệu (Form 8; Form 6 bỏ chương có biểu đồ 20/10) bỏ, thay dòng nhắc", async () => {
    const f0 = (await docWord(trang("form-0"))).van_ban;
    for (const s of ["Sự cố an toàn lao động (kể cả nhà thầu phụ)", "Hướng Linh 7", "Ca Nan 1", "2. Doanh thu bán điện", "ĐẦU TƯ", "VẬN HÀNH"]) expect(f0).toContain(s);
    const f4 = (await docWord(trang("form-4"))).van_ban;
    for (const s of ["Tiền mặt và tiền gửi ngân hàng", "CHI PHÍ SẢN XUẤT", "Doanh thu tháng ....../20..."]) expect(f4).toContain(s);
    for (const ma of ["form-8"]) {
      const z = await JSZip.loadAsync(trang(ma));
      expect(Object.keys(z.files).filter((f) => f.startsWith("word/media/"))).toEqual([]);
      expect((await z.file("word/document.xml")!.async("string")).includes("<w:drawing")).toBe(false);
      expect((await docWord(trang(ma))).van_ban).toContain(NHAC_BIEU_DO);
    }
    expect((await docWord(trang("form-8"))).van_ban).toContain("Gửi: Phòng Kinh tế");
  });

  it("sinh lại từ mẫu đã chuyển ra đúng file đang có (không lệch với script)", async () => {
    const kq = await taoMauTrang(viDu("form-7"), "form-7");
    const [a, b] = [await docWord(kq.buf), await docWord(trang("form-7"))];
    expect(a.van_ban).toBe(b.van_ban);
    expect(a.o_nhap).toEqual(b.o_nhap);
  });
});

describe("kiểm tra mẫu trắng", () => {
  beforeAll(async () => {
    // Bộ dữ liệu gieo chưa có Ban điều hành dự án Loại khác (trên máy thật do quản trị tạo) → tạo một ban thử dưới SCI E&C
    await q.query(
      `INSERT INTO identity.don_vi (id, ten, ten_ngan, cap, cha_id, loai, mau_ma, thu_tu)
       VALUES ('bdh-test-loai-khac', 'Ban điều hành dự án test Loại khác', 'BĐH test', 4, 'sci-enc', 'don_vi', 'form-11', 99) ON CONFLICT (id) DO NOTHING`,
    );
  });
  it.each(MA)("%s: nhận đúng mẫu, bị CHẶN đúng ô kỳ báo cáo; điền ô bắt buộc thì đạt", async (ma) => {
    const qt = await nguoi("quantri@scigroup.vn");
    const mau = (await layMau(q, ma))!;
    // Mẫu dùng chung nhiều đơn vị (Form 10 — Ban điều hành tổng thầu, không gắn đơn vị lập): lập thay đơn vị đầu tiên dùng mẫu
    const dvMau = (await q.query<{ id: string }>("SELECT id FROM identity.don_vi WHERE mau_ma = $1 ORDER BY thu_tu LIMIT 1", [ma])).rows[0]?.id;
    const dv = mau.don_vi_lap ?? dvMau;
    const tc = { don_vi_lap: dv, bo_qua_so_cai: true };
    // Báo cáo của đơn vị nào do nội dung file nói (chốt 29/09) — người nộp phải thuộc đơn vị đó: cho quản trị kiêm nhiệm
    await q.query("INSERT INTO identity.kiem_nhiem (nguoi_dung_id, don_vi_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [qt.id, dv]);
    const qtKiem = await nguoi("quantri@scigroup.vn");
    const dungChung = ["form-7", "form-8", "form-10", "form-11"].includes(ma);
    const kq = await kiemTraDayDu(q, qtKiem, trang(ma), `${ma}.docx`, tc);
    expect(kq.mau_ma).toBe(ma);
    expect(kq.dat).toBe(false);
    // Mẫu trắng: bảng việc trống → chặn K11 (02/10) ở bảng việc; còn lại chỉ chặn ô kỳ báo cáo (+ đơn vị lập ở mẫu dùng chung)
    expect(kq.loi.some((l) => l.muc === "chan" && l.luat === "bang_viec_trong")).toBe(true);
    const chan = kq.loi.filter((l) => l.muc === "chan" && l.luat !== "bang_viec_trong");
    const oChan = new Set(chan.map((l) => l.vi_tri?.tag));
    // Mẫu bản 6: đầu báo cáo chỉ còn "Kỳ báo cáo" (+ dòng đơn vị) — Người lập / Ngày lập đã bỏ, ngày nộp do máy ghi
    expect(oChan).toContain("ky_bao_cao");
    for (const t of oChan) expect(["ky_bao_cao", ...(dungChung ? ["don_vi_lap"] : [])]).toContain(t);
    // Mẫu dùng chung: dòng "Đơn vị lập" để "......" → chặn, bắt ghi tên đơn vị; mẫu riêng: tên đơn vị có sẵn
    if (dungChung) expect(oChan).toContain("don_vi_lap");
    expect(chan.some((l) => l.luat === "dung_mau" && l.vi_tri?.tag !== "don_vi_lap")).toBe(false);
    expect(chan.some((l) => l.vi_tri?.tag === "nguoi_lap" || l.vi_tri?.tag === "ngay_lap")).toBe(false);

    const bangViec = "bang_cong_viec"; // chương "KẾT QUẢ VÀ KẾ HOẠCH VIỆC …" — mọi mẫu (Form 5 còn bảng Tiến độ thiết kế)
    const tenDv = (await q.query<{ ten: string }>("SELECT ten FROM identity.don_vi WHERE id = $1", [dv])).rows[0].ten;
    const dien = await dienOBatBuoc(trang(ma), ma, {
      ...(dungChung ? { o: { don_vi_lap: tenDv } } : {}),
      bang: { [bangViec]: [{ ten: "Rà soát hồ sơ tuần", ket_thuc: "31/07/2026" }] },
    });
    const kq2 = await kiemTraDayDu(q, qtKiem, dien, `${ma}.docx`, tc);
    expect(kq2.don_vi_lap).toBe(dv);
    expect(kq2.loi.filter((l) => l.muc === "chan")).toEqual([]);
    expect(kq2.dat).toBe(true);
    // Form 10: dòng "Gửi:" để trống → nơi nhận theo luồng báo cáo, BĐH Hướng Việt → BQLDA Quảng Trị
    if (ma === "form-10") expect(kq2.gui_den).toEqual(["bqlda-qt"]);
    // Form 11 (20/10/2026): BĐH dự án Loại khác → SCI E&C
    if (ma === "form-11") expect(kq2.gui_den).toEqual(["sci-enc"]);
    expect(kq2.ky_bao_cao?.loai).toBe(mau.loai_ky);
    expect(kq2.cong_viec.map((c) => c.ten)).toEqual(["Rà soát hồ sơ tuần"]);
  });
});

describe("lưu hai bản mẫu", () => {
  it("gieo: bản chính là mẫu trắng, bản có ví dụ lưu riêng (không lẫn vào phiên bản)", async () => {
    for (const ma of MA) {
      expect((await docTepMau(q, ma))!.noi_dung.equals(trang(ma))).toBe(true);
      const vd = await docTepMau(q, ma, undefined, "vi_du");
      expect(vd!.noi_dung.equals(viDu(ma))).toBe(true);
      expect(vd!.ten_tep).toBe(`${ma}-co-vi-du.docx`);
      const pb = await lichSuPhienBanMau(q, ma);
      expect(pb.map((p) => p.phien_ban)).not.toContain(PHIEN_BAN_VI_DU);
      expect(pb.length).toBeGreaterThan(0);
    }
  });

  it("CSDL cũ (bản chính còn là bản ví dụ) → đổi sang mẫu trắng; mẫu quản trị đã tải file mới thì giữ", async () => {
    const vd = await ghiTep(viDu("form-2"));
    await q.query("UPDATE docflow.mau_word SET khoa_luu = $1 WHERE ma = 'form-2'", [vd.khoa]);
    await q.query("UPDATE docflow.mau_word_phien_ban SET khoa_luu = $1, sha256 = $2 WHERE ma = 'form-2' AND phien_ban > 0", [vd.khoa, vd.sha256]);
    await q.query("DELETE FROM docflow.mau_word_phien_ban WHERE ma = 'form-2' AND phien_ban = $1", [PHIEN_BAN_VI_DU]);
    const qt = await nguoi("quantri@scigroup.vn");
    const tepRieng = await (async () => {
      const z = await JSZip.loadAsync(trang("form-3"));
      z.file("docProps/app.xml", "<Properties/>");
      return z.generateAsync({ type: "nodebuffer" });
    })();
    await tx((x) => taiLenTepMau(x, qt, "form-3", { ten_tep: "form-3-sua.docx", noi_dung: tepRieng }));
    const pb3 = (await layMau(q, "form-3"))!.phien_ban;

    await hatGiong(q);
    expect((await docTepMau(q, "form-2"))!.noi_dung.equals(trang("form-2"))).toBe(true);
    expect((await docTepMau(q, "form-2", undefined, "vi_du"))!.noi_dung.equals(viDu("form-2"))).toBe(true);
    const pb2 = await lichSuPhienBanMau(q, "form-2");
    expect((await docTepMau(q, "form-2", pb2[0].phien_ban))!.noi_dung.equals(trang("form-2"))).toBe(true);
    // quản trị đã tải file riêng: không bị đè, phiên bản không đổi
    expect((await docTepMau(q, "form-3"))!.noi_dung.equals(tepRieng)).toBe(true);
    expect((await layMau(q, "form-3"))!.phien_ban).toBe(pb3);
    // chạy lại không đổi gì
    await hatGiong(q);
    expect((await lichSuPhienBanMau(q, "form-2")).length).toBe(pb2.length);
  });
});

// Cửa tải mẫu đổi sang tệp Excel ba tờ (22/10/2026) — bài kiểm nằm ở tests/unit/mau-excel-nop.test.ts
