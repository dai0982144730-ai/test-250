// Bí danh tài khoản email cũ → email mới (LOI-DUNG-CHUNG 6g.6 Đợt 2, 03/10/2026)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { biDanhHopLe, docBiDanhTaiKhoan } from "@/lib/bi-danh-tai-khoan";

describe("bí danh tài khoản", () => {
  it("đọc file, chuẩn hoá chữ thường, bỏ dòng hỏng / trùng email cũ; chưa có file → rỗng", () => {
    const goc = process.env.THU_MUC_DU_LIEU;
    const tam = fs.mkdtempSync(path.join(os.tmpdir(), "sci-bi-danh-"));
    process.env.THU_MUC_DU_LIEU = tam;
    try {
      expect(docBiDanhTaiKhoan()).toEqual([]);
      fs.writeFileSync(
        path.join(tam, "bi-danh-tai-khoan.json"),
        JSON.stringify([
          { email_cu: "Dai@SCI.vn", email_moi: "dainc@scigroup.vn", cach: "gop", ly_do: "cùng là Mr. Đại" },
          { email_cu: "admin@sci.vn", email_moi: "quantri@scigroup.vn", cach: "chuyen_chu", ly_do: "tài khoản mẫu" },
          { email_cu: "dai@sci.vn", email_moi: "khac@scigroup.vn" },
          { email_cu: "", email_moi: "x@y.vn" },
          { email_cu: "a@b.vn", email_moi: "a@b.vn" },
        ]),
      );
      const ds = docBiDanhTaiKhoan();
      expect(ds.map((x) => `${x.email_cu}>${x.email_moi}:${x.cach}`)).toEqual(["dai@sci.vn>dainc@scigroup.vn:gop", "admin@sci.vn>quantri@scigroup.vn:chuyen_chu"]);
    } finally {
      process.env.THU_MUC_DU_LIEU = goc;
    }
  });

  it("soát vòng 2: chỉ giao bí danh khớp người Main — email mới đang hoạt động, email cũ không còn ở Main", () => {
    const nguoi = [
      { email: "dainc@scigroup.vn", active: true },
      { email: "quantri@scigroup.vn", active: true },
      { email: "nghi@scigroup.vn", active: false },
      { email: "con@sci.vn", active: true },
    ];
    const b = (cu: string, moi: string) => ({ email_cu: cu, email_moi: moi, cach: "gop" as const, ly_do: "" });
    const kq = biDanhHopLe(
      [b("dai@sci.vn", "dainc@scigroup.vn"), b("admin@sci.vn", "quantri@scigroup.vn"), b("x@sci.vn", "dainc@scigroup.vm"), b("y@sci.vn", "nghi@scigroup.vn"), b("con@sci.vn", "dainc@scigroup.vn")],
      nguoi,
    );
    expect(kq.map((x) => x.email_cu)).toEqual(["dai@sci.vn", "admin@sci.vn"]); // gõ sai "vm", người đã khoá, email cũ còn ở Main → bỏ
  });
});
