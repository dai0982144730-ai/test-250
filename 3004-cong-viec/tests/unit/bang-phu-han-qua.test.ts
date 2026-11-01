// Form 5 "Tiến độ chi tiết công tác thiết kế" (bảng phụ sinh việc): hạng mục trễ phải trỏ về CỘT THẬT "Ngày kế hoạch",
// câu báo nói đúng cột của bảng — đo 30/09: báo "cột Kết thúc / Tình trạng Đã xong" trong khi bảng không có hai cột đó.
import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import { csdlMoi } from "../helpers/csdl";
import { layQ, type Q } from "@/lib/db";
import { kiemTraDayDu } from "@/lib/kiem-tra/kiem-tra";
import type { NguoiDungPhien } from "@/lib/types";
import { dienOBatBuoc } from "../../scripts/tao-mau-trang.mjs";

let q: Q;
beforeAll(async () => {
  await csdlMoi();
  q = await layQ();
});

describe("bảng phụ Form 5 — hạn đã qua", () => {
  it("trỏ cột Ngày kế hoạch, hướng sửa theo cột của bảng", async () => {
    const nd = { id: "pmc@test", ten: "PMC", don_vi_id: "sci-pmc", don_vi_ids: ["sci-pmc"], cap: 3, quyen: [], vai_tro: [] } as unknown as NguoiDungPhien;
    const buf = await dienOBatBuoc(fs.readFileSync("mau-word/trang/form-5.docx"), "form-5", {
      bang: { bang_tien_do_tk: [{ stt: "1", du_an: "ĐG Hướng Việt", hang_muc: "Thiết kế cơ sở", ngay_ke_hoach: "02/01/2026", pt_ht: "90%", ghi_chu: "chờ thẩm định" }] },
    });
    const kq = await kiemTraDayDu(q, nd, buf, "pmc.docx", { bo_qua_so_cai: true });
    const l = kq.loi.find((x) => x.vi_tri?.bang === "bang_tien_do_tk" && /đã qua/.test(x.thong_diep));
    expect(l?.vi_tri?.cot).toBe("ngay_ke_hoach");
    expect(l?.thong_diep).toMatch(/Ngày kế hoạch/);
    expect(l?.thong_diep).not.toMatch(/cột Kết thúc|Tình trạng/);
  });
});
