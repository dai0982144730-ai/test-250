// Nộp báo cáo bằng Excel từ đầu đến cuối (22/10/2026): tải mẫu Excel qua hàm của app (CSDL thật trong RAM, 12 mẫu gieo sẵn) →
// nộp mẫu trắng thì chặn đúng ô → điền kỳ + đơn vị + một việc thì đạt, đúng việc, đúng nơi nhận. Nộp Word mới bị chặn.
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import ExcelJS from "exceljs";
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

import fs from "node:fs";
import path from "node:path";
import { csdlMoi, nguoi } from "../helpers/csdl";
import { layQ, tx, type Q } from "@/lib/db";
import { kiemTraDayDu, layMau } from "@/lib/kiem-tra/kiem-tra";
import { taiLenVaKiemTra } from "@/lib/gui/tai-len";
import { tepExcelCuaMau } from "@/lib/mau-excel/tep-mau";
import { lichSuPhienBanMau } from "@/lib/kiem-tra/quan-ly-mau";
import { TO_GHI } from "@/lib/mau-excel/dung-excel";
import { khoTam } from "../fixtures/chuan-bi";

const MA = Array.from({ length: 12 }, (_, i) => `form-${i}`);
const DUNG_CHUNG = ["form-7", "form-8", "form-10", "form-11"];

let q: Q;
const coCu = process.env.DOCFLOW_CHO_NOP_WORD;
beforeAll(async () => {
  process.env.DOCFLOW_CHO_NOP_WORD = "0"; // bài này kiểm đúng hành vi thật: nộp mới chỉ nhận Excel
  khoTam();
  await csdlMoi();
  q = await layQ();
  await q.query(
    `INSERT INTO identity.don_vi (id, ten, ten_ngan, cap, cha_id, loai, mau_ma, thu_tu)
     VALUES ('bdh-test-loai-khac', 'Ban điều hành dự án test Loại khác', 'BĐH test', 4, 'sci-enc', 'don_vi', 'form-11', 99) ON CONFLICT (id) DO NOTHING`,
  );
});
afterAll(() => {
  process.env.DOCFLOW_CHO_NOP_WORD = coCu;
});

import { cotCo, hangCo, nenCua, oGiaTri } from "./excel-o";

async function dien(buf: Buffer, o: { ky: string; donVi?: string; viec: { ten: string; ket_thuc: string } }): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ArrayBuffer);
  const ws = wb.getWorksheet(TO_GHI)!;
  oGiaTri(ws, "Kỳ báo cáo").value = o.ky;
  if (o.donVi) oGiaTri(ws, "Đơn vị lập").value = o.donVi;
  // bảng việc là bảng cuối (chương «KẾT QUẢ VÀ KẾ HOẠCH…»): hàng tên cột cuối cùng có «Công việc» ở cột A
  const r = hangCo(ws, "Công việc", 1, true);
  const cot = (ten: string) => {
    const c = cotCo(ws, r, ten);
    if (c < 0) throw new Error(`không thấy cột ${ten}`);
    return c;
  };
  ws.getCell(r + 1, cot("Công việc")).value = o.viec.ten;
  ws.getCell(r + 1, cot("Kết thúc")).value = o.viec.ket_thuc;
  return Buffer.from(await wb.xlsx.writeBuffer());
}

describe("nộp bằng Excel — 12 mẫu", () => {
  it.each(MA)("%s: tệp trắng bị chặn đúng ô; điền kỳ + một việc thì đạt", async (ma) => {
    const qt = await nguoi("quantri@scigroup.vn");
    const mau = (await layMau(q, ma))!;
    const dvMau = (await q.query<{ id: string }>("SELECT id FROM identity.don_vi WHERE mau_ma = $1 ORDER BY thu_tu LIMIT 1", [ma])).rows[0]?.id;
    const dv = mau.don_vi_lap ?? dvMau;
    await q.query("INSERT INTO identity.kiem_nhiem (nguoi_dung_id, don_vi_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [qt.id, dv]);
    const nd = await nguoi("quantri@scigroup.vn");
    const tc = { don_vi_lap: dv, bo_qua_so_cai: true, moi_nop: true };
    const tep = (await tepExcelCuaMau(q, ma))!;
    expect(tep.ten_tep).toBe(`${mau.ten} - mẫu báo cáo.xlsx`);

    const kq = await kiemTraDayDu(q, nd, tep.noi_dung, tep.ten_tep, tc);
    expect(kq.mau_ma).toBe(ma);
    expect(kq.dat).toBe(false);
    const oChan = new Set(kq.loi.filter((l) => l.muc === "chan" && l.vi_tri?.tag).map((l) => l.vi_tri!.tag));
    // Kỳ báo cáo máy ghi sẵn tuần lúc tải mẫu → không chặn ở ô kỳ; tệp trắng bị chặn bằng câu «chưa ghi gì»
    expect(oChan).not.toContain("ky_bao_cao");
    if (DUNG_CHUNG.includes(ma)) expect(oChan).toContain("don_vi_lap");
    for (const t of oChan) expect(["ky_bao_cao", "don_vi_lap"]).toContain(t);
    expect(kq.loi.some((l) => l.muc === "chan" && /chưa ghi gì/.test(l.thong_diep))).toBe(true);

    const tenDv = (await q.query<{ ten: string }>("SELECT ten FROM identity.don_vi WHERE id = $1", [dv])).rows[0].ten;
    const daDien = await dien(tep.noi_dung, {
      ky: "Tuần 31/2026 (27/07/2026 – 02/08/2026)",
      ...(DUNG_CHUNG.includes(ma) ? { donVi: tenDv } : {}),
      viec: { ten: "Rà soát hồ sơ tuần", ket_thuc: "31/07/2026" },
    });
    const kq2 = await kiemTraDayDu(q, nd, daDien, `${ma}.xlsx`, tc);
    expect(kq2.loi.filter((l) => l.muc === "chan")).toEqual([]);
    expect(kq2.dat).toBe(true);
    expect(kq2.don_vi_lap).toBe(dv);
    expect(kq2.ky_bao_cao?.loai).toBe("tuan");
    expect(kq2.cong_viec.map((c) => c.ten)).toEqual(["Rà soát hồ sơ tuần"]);
    if (ma === "form-10") expect(kq2.gui_den).toEqual(["bqlda-qt"]);
    if (ma === "form-11") expect(kq2.gui_den).toEqual(["sci-enc"]);
  });

  it("nộp mới bằng Word → chặn, chỉ đường tải mẫu Excel; báo cáo Word cũ vẫn kiểm lại được (không moi_nop)", async () => {
    const nd = await nguoi("quantri@scigroup.vn");
    const word = fs.readFileSync(path.join(process.cwd(), "mau-word", "trang", "form-1.docx"));
    const r = await tx((x) => taiLenVaKiemTra(x, nd, { tep: { ten_tep: "bc.docx", mime: "", noi_dung: word }, luu: false }));
    expect(r.ket_qua.dat).toBe(false);
    expect(r.ket_qua.loi[0].thong_diep).toMatch(/là Word — từ ngày 22\/10\/2026 báo cáo nộp bằng tệp Excel \(\.xlsx\)/);
    const cu = await kiemTraDayDu(q, nd, word, "bc-cu.docx", { bo_qua_so_cai: true });
    expect(cu.mau_ma).toBe("form-1");
  });

  it("tệp .xlsx không theo mẫu nào → chặn với lời chỉ tải mẫu, không lỗi khó hiểu", async () => {
    const nd = await nguoi("quantri@scigroup.vn");
    const wb = new ExcelJS.Workbook();
    wb.addWorksheet("Sheet1").addRow(["Bảng tính bất kỳ", 123]);
    const buf = Buffer.from(await wb.xlsx.writeBuffer());
    const kq = await kiemTraDayDu(q, nd, buf, "bang-tinh.xlsx", { moi_nop: true, bo_qua_so_cai: true });
    expect(kq.dat).toBe(false);
    expect(kq.loi.map((l) => l.thong_diep).join(" ")).toMatch(/Không nhận ra mẫu: tệp "bang-tinh.xlsx" không có dòng «Mã mẫu»/);
  });
});

describe("API /api/mau-word/[ma]/tep", () => {
  it("mặc định trả tệp Excel 3 tờ, tên tiếng Việt; ?word=1 trả Word gốc; ?ban=vi_du (link cũ) vẫn ra Excel; phiên bản sai → 400/404", async () => {
    phien.nd = await nguoi("hung.tv@scigroup.vn");
    const { GET } = await import("@/app/api/mau-word/[ma]/tep/route");
    const goi = (qs: string) => GET(new Request(`http://x/api/mau-word/form-7/tep${qs}`), { params: { ma: "form-7" } });
    const r1 = await goi("");
    expect(r1.status).toBe(200);
    expect(r1.headers.get("content-type")).toContain("spreadsheetml");
    expect(decodeURIComponent(r1.headers.get("content-disposition") ?? "")).toContain("Báo cáo BQLDA Quảng Trị (Form 7) - mẫu báo cáo.xlsx");
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load((await r1.arrayBuffer()) as ArrayBuffer);
    expect(wb.worksheets.filter((w) => w.state === "visible").map((w) => w.name)).toEqual(["Mẫu trắng", "Hướng dẫn", "Ví dụ đã điền"]);
    const rw = await goi("?word=1");
    expect(rw.headers.get("content-type")).toContain("wordprocessingml");
    expect(decodeURIComponent(rw.headers.get("content-disposition") ?? "")).toContain("bản Word gốc.docx");
    expect((await goi("?ban=vi_du")).headers.get("content-type")).toContain("spreadsheetml");
    const pb = (await lichSuPhienBanMau(q, "form-7"))[0].phien_ban;
    expect((await goi(`?phien_ban=${pb}`)).status).toBe(200);
    expect((await goi("?phien_ban=abc")).status).toBe(400);
    expect((await goi("?phien_ban=99")).status).toBe(404);
    phien.nd = null;
    expect((await goi("")).status).toBe(401);
  });
});

describe("đợt 2 qua API: nộp tệp lỗi → tải bản đánh dấu lỗi → sửa thẳng vào ô → bản mới hết lỗi chặn", () => {
  it("Form 3 · kỳ trống + việc thiếu ngày kết thúc", async () => {
    const qt = await nguoi("quantri@scigroup.vn");
    await q.query("INSERT INTO identity.kiem_nhiem (nguoi_dung_id, don_vi_id) VALUES ($1, 'p-hcth') ON CONFLICT DO NOTHING", [qt.id]);
    phien.nd = await nguoi("quantri@scigroup.vn");
    const tep = (await tepExcelCuaMau(q, "form-3"))!;
    // việc thứ nhất quên ngày kết thúc, kỳ còn «......»
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(tep.noi_dung as unknown as ArrayBuffer);
    const ws = wb.getWorksheet(TO_GHI)!;
    const r = hangCo(ws, "Công việc", 1, true);
    oGiaTri(ws, "Kỳ báo cáo").value = "Tuần ....../20...  (....../....../20... – ....../....../20...)"; // người lập xoá kỳ máy ghi sẵn
    ws.getCell(r + 1, cotCo(ws, r, "Công việc")).value = "Gia hạn hợp đồng thuê văn phòng (test)";
    ws.getCell(r + 1, cotCo(ws, r, "Dự án")).value = "Văn phòng Hà Nội";
    const loiBuf = Buffer.from(await wb.xlsx.writeBuffer());
    const nop = await tx((x) => taiLenVaKiemTra(x, phien.nd!, { tep: { ten_tep: "bc-tuan-43.xlsx", mime: "", noi_dung: loiBuf } }));
    expect(nop.ket_qua.dat).toBe(false);
    const chan = nop.ket_qua.loi.filter((l) => l.muc === "chan");
    expect(chan.some((l) => l.vi_tri?.tag === "ky_bao_cao")).toBe(true);
    // thiếu ngày kết thúc: CSDL kiểm để «việc không ngày luôn mở» → cảnh báo (máy thật mặc định chặn)
    expect(nop.ket_qua.loi.some((l) => l.muc === "canh_bao" && l.vi_tri?.bang === "bang_cong_viec" && l.vi_tri?.dong === 1 && l.vi_tri?.cot === "ket_thuc")).toBe(true);

    // ① tải bản đánh dấu lỗi
    const { GET } = await import("@/app/api/kiem-tra/danh-dau/route");
    const rd = await GET(new Request(`http://x/api/kiem-tra/danh-dau?tai_lieu_id=${nop.tai_lieu_id}&phien_ban=${nop.phien_ban}`));
    expect(rd.status).toBe(200);
    expect(rd.headers.get("content-type")).toContain("spreadsheetml");
    expect(decodeURIComponent(rd.headers.get("content-disposition") ?? "")).toContain("bc-tuan-43 - đánh dấu lỗi.xlsx");
    const dd = new ExcelJS.Workbook();
    await dd.xlsx.load((await rd.arrayBuffer()) as ArrayBuffer);
    expect(dd.worksheets.map((w) => w.name)).toContain("Lỗi cần sửa");
    const wsD = dd.getWorksheet(TO_GHI)!;
    expect(nenCua(oGiaTri(wsD, "Kỳ báo cáo"))).toBe("FFFF8A80");
    const cotKt = cotCo(wsD, r, "Kết thúc");
    expect(nenCua(wsD.getCell(r + 1, cotKt))).toBe("FFFFF2A8");
    expect(String(wsD.getCell(r + 1, cotKt).note)).toContain("không có ngày kết thúc");

    // ② sửa thẳng vào ô qua cửa sửa lỗi (đúng thân yêu cầu nút «Sửa vào file» gửi)
    const { POST } = await import("@/app/api/kiem-tra/sua-loi/route");
    const rs = await POST(
      new Request("http://x/api/kiem-tra/sua-loi", {
        method: "POST",
        body: JSON.stringify({
          tai_lieu_id: nop.tai_lieu_id,
          sua: [
            { vi_tri: { tag: "ky_bao_cao" }, moi: "Tuần 31/2026 (27/07/2026 – 02/08/2026)" },
            { vi_tri: { bang: "bang_cong_viec", dong: 1, cot: "ket_thuc" }, moi: "31/07/2026" },
          ],
        }),
      }),
    );
    expect(rs.status).toBe(200);
    const j = (await rs.json()) as { phien_ban: number; ket_qua: { dat: boolean; loi: { muc: string; thong_diep: string }[]; cong_viec: { ten: string; ket_thuc: string | null }[] } };
    expect(j.phien_ban).toBe((nop.phien_ban ?? 0) + 1);
    expect(j.ket_qua.loi.filter((l) => l.muc === "chan")).toEqual([]);
    expect(j.ket_qua.cong_viec.map((c) => [c.ten, c.ket_thuc])).toEqual([["Gia hạn hợp đồng thuê văn phòng (test)", "2026-07-31"]]);
    phien.nd = null;
  });
});
