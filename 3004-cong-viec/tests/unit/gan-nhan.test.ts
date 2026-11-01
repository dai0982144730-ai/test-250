// Đợt B — GẮN NHÃN BẰNG CODE (Khai báo mẫu không cần sửa code, 01/10/2026).
// Khứ hồi trên file THẬT: báo cáo đã điền → gỡ hết nhãn (thành Word thường) → máy gắn nhãn theo cau_truc
// → bộ kiểm tra thật phải đọc ra ĐÚNG các việc như bản gốc. Cùng file + cùng cau_truc → cùng kết quả.
import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { DOMParser } from "@xmldom/xmldom";
import { csdlMoi, nguoi } from "../helpers/csdl";
import type { Q } from "@/lib/db";
import type { CauTrucMau, CotMau } from "@/lib/types";
import { kiemTraDayDu } from "@/lib/kiem-tra/kiem-tra";
import { docWord } from "@/lib/kiem-tra/doc-word";
import { sinhTruongCu } from "@/lib/kiem-tra/cau-truc";
import { ganNhanTheoCauTruc, goHetNhan } from "@/lib/kiem-tra/gan-nhan";
import { W, cells, chu, conPT, conTen, rows, tatCa } from "../../scripts/chuyen-mau-that.mjs";

const THU_MUC = path.join(process.cwd(), "..", "File test tuần 40 - mẫu bản 8");
const NGAY_NOP = "2026-10-01T09:00:00+07:00";

/** Đọc tiêu đề cột + tag cột của một bảng đã gắn nhãn (để dựng cau_truc giống người quản trị khai). */
async function cotCuaBang(buf: Buffer, tagBang: string): Promise<CotMau[]> {
  const doc = new DOMParser().parseFromString(await (await JSZip.loadAsync(buf)).file("word/document.xml")!.async("string"), "text/xml");
  const tbl = tatCa(doc, "tbl").find((t) => conTen(conTen(t, "tblPr") ?? t, "tblCaption")?.getAttributeNS(W, "val") === tagBang);
  if (!tbl) throw new Error(`không thấy bảng ${tagBang}`);
  const [dau, ...du] = rows(tbl);
  const tagO = (tc: unknown) => tatCa(tc, "tag")[0]?.getAttributeNS(W, "val") ?? "";
  const mau = du.find((tr) => cells(tr).some((tc) => tagO(tc))) ?? du[0];
  return cells(dau)
    .map((tc, i) => ({ tieu_de: chu(tc).trim(), tag: tagO(cells(mau)[i]) }))
    .filter((x) => x.tag && x.tieu_de && x.tag !== "stt")
    .map((x) => ({ tag: x.tag, tieu_de: x.tieu_de, nghia: (["ten", "du_an", "phu_trach", "bat_dau", "ket_thuc", "ket_qua_can_co", "tinh_trang", "ma_viec"].includes(x.tag) ? x.tag : "them") as CotMau["nghia"] }));
}

const CA = [
  { tep: "TEST - Tuần 40 - P.TCKT (Form 4).docx", ma: "form-4" },
  { tep: "TEST - Tuần 40 - P.KT&VH (Form 2).docx", ma: "form-2" },
  { tep: "TEST - Tuần 40 - BQLDA QT (Form 7).docx", ma: "form-7" },
];

describe.skipIf(!fs.existsSync(THU_MUC))("gắn nhãn bằng code — khứ hồi trên báo cáo thật (Đợt B)", () => {
  let q: Q;
  beforeAll(async () => {
    q = await csdlMoi();
  });

  for (const ca of CA)
    it(`${ca.tep}: gỡ nhãn → máy gắn lại theo cau_truc → việc ra như bản gốc`, async () => {
      const goc = fs.readFileSync(path.join(THU_MUC, ca.tep));
      const { rows: r } = await q.query<{ dinh_nghia: { muc_bat_buoc: string[]; bang_cong_viec: { tag: string; nhan: string }[] } }>("SELECT dinh_nghia FROM docflow.mau_word WHERE ma = $1", [ca.ma]);
      const dnGoc = r[0].dinh_nghia;
      const nd0 = await nguoi("truong.dtpc@scigroup.vn");
      const tc = { bo_qua_so_cai: true, ngay_nop: NGAY_NOP };
      const kqGoc = await kiemTraDayDu(q, nd0, goc, "goc.docx", tc);
      const ndDung = { ...nd0, don_vi_id: kqGoc.don_vi_lap, don_vi_ids: [kqGoc.don_vi_lap!] } as typeof nd0;
      const kq1 = await kiemTraDayDu(q, ndDung, goc, "goc.docx", tc);

      // cau_truc như người quản trị khai: các chương bắt buộc + chương việc có bảng bang_cong_viec (cột lấy từ file)
      const ct: CauTrucMau = {
        chuong: await Promise.all(
          dnGoc.muc_bat_buoc.map(async (m) => {
            const viec = /KẾT QUẢ VÀ KẾ HOẠCH VIỆC/.test(m);
            return {
              tieu_de: m,
              nghia: viec ? ("sinh_viec_bang" as const) : ("thong_tin" as const),
              bat_buoc: true,
              bang: viec ? [{ tag: "bang_cong_viec", tieu_de: "Công việc", nghia: "sinh_viec" as const, cot: await cotCuaBang(goc, "bang_cong_viec") }] : [],
            };
          }),
        ),
      };
      const tron = await goHetNhan(goc);
      expect((await docWord(tron)).mau_ma).toBeNull(); // đúng là Word thường
      const gan = await ganNhanTheoCauTruc(tron, ca.ma, ct);
      expect(gan.thieu).toEqual([]);
      const dn = { ...dnGoc, cau_truc: ct, ...sinhTruongCu(ct) };
      await q.query("UPDATE docflow.mau_word SET dinh_nghia = $2::jsonb WHERE ma = $1", [ca.ma, JSON.stringify(dn)]);
      const kq2 = await kiemTraDayDu(q, ndDung, gan.buf, "gan-lai.docx", tc);
      await q.query("UPDATE docflow.mau_word SET dinh_nghia = $2::jsonb WHERE ma = $1", [ca.ma, JSON.stringify(dnGoc)]);

      expect(kq2.mau_ma).toBe(ca.ma);
      expect(kq2.ky_bao_cao).toEqual(kq1.ky_bao_cao);
      expect(kq2.don_vi_lap).toBe(kq1.don_vi_lap);
      const viec = (k: typeof kq1) => k.cong_viec.map((c) => [c.ten, c.ket_thuc ?? null, c.du_an ?? null, !!c.da_xong, c.ket_qua_can_co ?? null]);
      expect(viec(kq2)).toEqual(viec(kq1));
      expect(kq2.loi.filter((l) => l.muc === "chan").map((l) => l.thong_diep)).toEqual(kq1.loi.filter((l) => l.muc === "chan").map((l) => l.thong_diep));
      void conPT;
    });
});

describe.skipIf(!fs.existsSync(THU_MUC))("gắn nhãn — khai sai thì báo thiếu, không lặng lẽ bỏ qua", () => {
  it("cột / chương / bảng khai mà file không có → nằm trong danh sách thiếu", async () => {
    const tron = await goHetNhan(fs.readFileSync(path.join(THU_MUC, "TEST - Tuần 40 - P.TCKT (Form 4).docx")));
    const gan = await ganNhanTheoCauTruc(tron, "form-4", {
      chuong: [
        { tieu_de: "KẾT QUẢ VÀ KẾ HOẠCH VIỆC TUẦN TỚI", nghia: "sinh_viec_bang", bat_buoc: true, bang: [{ tag: "bang_cong_viec", tieu_de: "Công việc", nghia: "sinh_viec", cot: [
          { tag: "ten", tieu_de: "Công việc", nghia: "ten" },
          { tag: "muc_uu_tien", tieu_de: "Mức ưu tiên", nghia: "them" },
        ] }] },
        { tieu_de: "CHƯƠNG KHÔNG CÓ TRONG FILE", nghia: "thong_tin", bat_buoc: true, bang: [] },
      ],
    });
    expect(gan.thieu).toEqual(['Bảng "Công việc": không thấy cột "Mức ưu tiên"', 'Không thấy chương "CHƯƠNG KHÔNG CÓ TRONG FILE"']);
  });
});
