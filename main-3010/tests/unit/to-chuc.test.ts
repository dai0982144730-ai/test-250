// Tổ chức ở Main (LOI-DUNG-CHUNG 6g.6 A9 · A12, Đợt 2 — 03/10/2026): data/to-chuc.json + trường tổ chức trong users.json.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { chuanHoaToChuc } from "@/lib/to-chuc-kieu";
import { docToChuc, ghiToChuc } from "@/lib/to-chuc";

const DV = (id: string, cha: string | null, them: Record<string, unknown> = {}) => ({ id, ten: `Đơn vị ${id}`, cap: cha ? 2 : 1, cha_id: cha, loai: "phong", ...them });

describe("khuôn tổ chức", () => {
  it("giữ dòng đúng, bỏ dòng sai kèm lý do; kiểm cha, trùng mã, kiêm nhiệm trỏ đơn vị có", () => {
    const { toChuc, loi } = chuanHoaToChuc({
      don_vi: [DV("ban-tgd", null, { loai: "ban_tgd" }), DV("p-dtpc", "ban-tgd", { uy_quyen_truong: "truong.dtpc@scigroup.vn", chuc_nang: "Đầu tư, pháp chế" }), DV("p-dtpc", "ban-tgd"), { id: "thieu-ten", cap: 2, loai: "phong" }, DV("mo-coi", "khong-co")],
      kiem_nhiem: [{ nguoi_id: "truong.ktvh@scigroup.vn", don_vi_id: "p-dtpc", chuc_vu: "kiêm" }, { nguoi_id: "x@y.vn", don_vi_id: "khong-co" }],
    });
    expect(toChuc.don_vi.map((d) => d.id)).toEqual(["ban-tgd", "p-dtpc", "mo-coi"]);
    expect(toChuc.don_vi[1]).toMatchObject({ ten_ngan: "Đơn vị p-dtpc", active: true, thu_tu: 0, chuc_nang: "Đầu tư, pháp chế", uy_quyen_truong: "truong.dtpc@scigroup.vn", chuc_danh: null });
    expect(toChuc.kiem_nhiem).toEqual([{ nguoi_id: "truong.ktvh@scigroup.vn", don_vi_id: "p-dtpc", chuc_vu: "kiêm" }]);
    expect(toChuc.uy_quyen_ky).toEqual([]);
    expect(loi.join("\n")).toMatch(/trùng mã/);
    expect(loi.join("\n")).toMatch(/thiếu mã \/ tên/);
    expect(loi.join("\n")).toMatch(/đơn vị cha khong-co không có/);
    expect(loi.join("\n")).toMatch(/kiêm nhiệm dòng 2/);
  });

  it("chưa có file → 'chua_co'; file hỏng → 'hong' (không phải tổ chức rỗng); ghi rồi đọc lại đúng", () => {
    const goc = process.env.THU_MUC_DU_LIEU;
    const tam = fs.mkdtempSync(path.join(os.tmpdir(), "sci-to-chuc-"));
    process.env.THU_MUC_DU_LIEU = tam;
    try {
      expect(docToChuc().tinhTrang).toBe("chua_co");
      fs.writeFileSync(path.join(tam, "to-chuc.json"), "{ hỏng");
      expect(docToChuc().tinhTrang).toBe("hong");
      expect(ghiToChuc({ don_vi: [DV("ban-tgd", null)], kiem_nhiem: [], uy_quyen_ky: [] }).soLoi).toBe(0);
      const doc = docToChuc();
      expect(doc.tinhTrang).toBe("ok");
      expect(doc.toChuc.don_vi).toHaveLength(1);
      expect(doc.toChuc.cap_nhat).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    } finally {
      process.env.THU_MUC_DU_LIEU = goc;
    }
  });
});
