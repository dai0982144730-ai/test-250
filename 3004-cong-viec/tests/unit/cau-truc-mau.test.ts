// Khai báo mẫu theo NGHĨA (Đợt A — 0 Tài liệu thiết kế/DE-XUAT-KHAI-BAO-MAU-BAO-CAO-v0.1-CHO-DUYET.md, ca kiểm thử 2–4):
// đổi tag cột / tên chương trên file Word + khai cau_truc trong mẫu → máy vẫn tách đúng việc, KHÔNG sửa code.
import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { csdlMoi, nguoi } from "../helpers/csdl";
import type { Q } from "@/lib/db";
import type { CauTrucMau } from "@/lib/types";
import { kiemTraDayDu } from "@/lib/kiem-tra/kiem-tra";
import { kiemCauTruc, sinhTruongCu } from "@/lib/kiem-tra/cau-truc";

const TEP = path.join(process.cwd(), "..", "File test tuần 40 - mẫu bản 8", "TEST - Tuần 40 - P.TCKT (Form 4).docx");
const NGAY_NOP = "2026-10-01T09:00:00+07:00";
const CHUONG_MOI = "KẾ HOẠCH CÔNG VIỆC TUẦN SAU";

/** Sửa XML trong docx: đổi tag cột + đổi chữ tiêu đề chương việc. */
async function suaDocx(buf: Buffer, doi: [RegExp, string][]): Promise<Buffer> {
  const zip = await JSZip.loadAsync(buf);
  let xml = await zip.file("word/document.xml")!.async("string");
  for (const [a, b] of doi) xml = xml.replace(a, b);
  zip.file("word/document.xml", xml);
  return zip.generateAsync({ type: "nodebuffer" });
}

async function datCauTruc(q: Q, ma: string, ct: CauTrucMau | null) {
  const { rows } = await q.query<{ dinh_nghia: Record<string, unknown> }>("SELECT dinh_nghia FROM docflow.mau_word WHERE ma = $1", [ma]);
  const dn = { ...rows[0].dinh_nghia };
  if (ct) Object.assign(dn, { cau_truc: ct, ...sinhTruongCu(ct) });
  else delete dn.cau_truc;
  await q.query("UPDATE docflow.mau_word SET dinh_nghia = $2::jsonb WHERE ma = $1", [ma, JSON.stringify(dn)]);
}

describe.skipIf(!fs.existsSync(TEP))("cấu trúc mẫu theo nghĩa (Đợt A)", () => {
  let q: Q;
  let goc: Awaited<ReturnType<typeof kiemTraDayDu>>;
  let dnGoc: Record<string, unknown>;
  beforeAll(async () => {
    q = await csdlMoi();
    dnGoc = (await q.query<{ dinh_nghia: Record<string, unknown> }>("SELECT dinh_nghia FROM docflow.mau_word WHERE ma = 'form-4'")).rows[0].dinh_nghia;
    goc = await kiemTraDayDu(q, await nguoi("truong.tckt@scigroup.vn"), fs.readFileSync(TEP), "goc.docx", { bo_qua_so_cai: true, ngay_nop: NGAY_NOP });
  });

  const ct = (tieuDeChuong: string, tenCu: string[] = []): CauTrucMau => ({
    chuong: [
      ...(dnGoc.muc_bat_buoc as string[]).filter((m) => !/KẾT QUẢ VÀ KẾ HOẠCH/.test(m)).map((m) => ({ tieu_de: m, nghia: "thong_tin" as const, bat_buoc: true, bang: [] })),
      {
        tieu_de: tieuDeChuong,
        ten_cu: tenCu,
        nghia: "sinh_viec_bang",
        bat_buoc: true,
        bang: [
          {
            tag: "bang_cong_viec",
            tieu_de: "Công việc",
            nghia: "sinh_viec",
            cot: [
              { tag: "noi_dung_cv", tieu_de: "Nội dung công việc", nghia: "ten" },
              { tag: "du_an", tieu_de: "Dự án", nghia: "du_an" },
              { tag: "bat_dau", tieu_de: "Bắt đầu", nghia: "bo_qua" },
              { tag: "han_ht", tieu_de: "Hạn hoàn thành", nghia: "ket_thuc" },
              { tag: "ket_qua_can_co", tieu_de: "Kết quả cần có", nghia: "them", ten_them: "ket_qua_mong_doi" },
              { tag: "tinh_trang", tieu_de: "Tình trạng", nghia: "tinh_trang" },
            ],
          },
        ],
      },
    ],
  });

  it("đổi tag cột + đổi tên chương + khai cau_truc → việc ra đúng như bản gốc", async () => {
    expect(goc.dat).toBe(true);
    expect(goc.cong_viec.length).toBeGreaterThan(0);
    await datCauTruc(q, "form-4", ct(CHUONG_MOI));
    const buf = await suaDocx(fs.readFileSync(TEP), [
      [/w:val="ten"/g, 'w:val="noi_dung_cv"'],
      [/w:val="ket_thuc"/g, 'w:val="han_ht"'],
      [/KẾT QUẢ VÀ KẾ HOẠCH VIỆC TUẦN TỚI/g, CHUONG_MOI],
    ]);
    const kq = await kiemTraDayDu(q, await nguoi("truong.tckt@scigroup.vn"), buf, "moi.docx", { bo_qua_so_cai: true, ngay_nop: NGAY_NOP, don_vi_lap: goc.don_vi_lap });
    await datCauTruc(q, "form-4", null);
    expect(kq.loi.filter((l) => l.muc === "chan").map((l) => l.thong_diep)).toEqual([]);
    expect(kq.cong_viec.map((c) => [c.ten, c.ket_thuc, c.du_an ?? null])).toEqual(goc.cong_viec.map((c) => [c.ten, c.ket_thuc, c.du_an ?? null]));
    // "Bắt đầu" khai Không lấy → như ô Bắt đầu trống: ngày lập báo cáo (bat_dau_kieu "ngay_bao_cao"), không còn ngày ghi trên file
    for (const c of kq.cong_viec) expect(c.bat_dau_kieu).toBe("ngay_bao_cao");
    expect(new Set(kq.cong_viec.map((c) => c.bat_dau)).size).toBe(1);
    // "Kết quả cần có" khai Thông tin thêm → vào cột khác
    expect(kq.cong_viec.map((c) => c.ket_qua_can_co ?? null)).toEqual(kq.cong_viec.map(() => null));
    expect(kq.cong_viec.map((c) => (c as { cot_khac?: Record<string, string> }).cot_khac?.ket_qua_mong_doi)).toEqual(goc.cong_viec.map((c) => c.ket_qua_can_co));
  });

  it("file theo tên chương cũ vẫn nhận khi khai tên cũ; không khai thì báo thiếu chương", async () => {
    const buf = await suaDocx(fs.readFileSync(TEP), [
      [/w:val="ten"/g, 'w:val="noi_dung_cv"'],
      [/w:val="ket_thuc"/g, 'w:val="han_ht"'],
    ]);
    const nd = await nguoi("truong.tckt@scigroup.vn");
    const tc = { bo_qua_so_cai: true, ngay_nop: NGAY_NOP, don_vi_lap: goc.don_vi_lap };
    await datCauTruc(q, "form-4", ct(CHUONG_MOI, ["KẾT QUẢ VÀ KẾ HOẠCH VIỆC TUẦN TỚI"]));
    const coTenCu = await kiemTraDayDu(q, nd, buf, "cu.docx", tc);
    await datCauTruc(q, "form-4", ct(CHUONG_MOI));
    const khongTenCu = await kiemTraDayDu(q, nd, buf, "cu.docx", tc);
    await datCauTruc(q, "form-4", null);
    expect(coTenCu.loi.filter((l) => l.luat === "dung_mau").map((l) => l.thong_diep)).toEqual([]);
    expect(khongTenCu.loi.some((l) => l.luat === "dung_mau" && l.thong_diep.includes(CHUONG_MOI))).toBe(true);
  });

  it("kiểm cấu trúc: bảng sinh việc thiếu cột Ngày kết thúc / Tình trạng thì báo lỗi", () => {
    const x = ct(CHUONG_MOI);
    expect(kiemCauTruc(x)).toEqual([]);
    x.chuong[x.chuong.length - 1].bang[0].cot = x.chuong[x.chuong.length - 1].bang[0].cot.filter((c) => c.nghia !== "ket_thuc" && c.nghia !== "tinh_trang");
    expect(kiemCauTruc(x)).toEqual(['Bảng sinh việc "Công việc" thiếu cột Ngày kết thúc / hạn', 'Bảng sinh việc "Công việc" thiếu cột Tình trạng / đã xong']);
  });
});
