// Tải lên đúng file Word gốc của công ty (mau-word/goc/OK_FormN_…docx, chưa có ô nhập gắn mã):
// hệ thống tự nhận Form, tự gắn ô nhập rồi kiểm tra như mẫu — không còn báo "không nhận ra mẫu".
import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { csdlMoi, nguoi } from "../helpers/csdl";
import type { Q } from "@/lib/db";
import { kiemTraDayDu } from "@/lib/kiem-tra/kiem-tra";

const goc = (tep: string) => fs.readFileSync(path.join(process.cwd(), "mau-word", "goc", tep));

describe("nhận file Word gốc", () => {
  let q: Q;
  beforeAll(async () => {
    q = await csdlMoi();
  });

  it("Form 5 gốc: nhận là form-5; chỉ còn chặn chương việc trống (K11 02/10) — mẫu bản 6 bỏ ô Người lập, file gốc còn '......' cũng không chặn", async () => {
    const nd = await nguoi("gd.pmc@scigroup.vn");
    const kq = await kiemTraDayDu(q, nd, goc("OK_Form5_SCI_PMC_Sua lan 2.docx"), "OK_Form5_SCI_PMC_Sua lan 2.docx", { bo_qua_so_cai: true });
    expect(kq.mau_ma).toBe("form-5");
    expect(kq.loi.find((l) => l.luat === "dung_mau" && l.muc === "goi_y")?.thong_diep).toContain("tự nhận là Báo cáo SCI PMC (Form 5)");
    expect(kq.loi.some((l) => l.thong_diep.includes("Không nhận ra mẫu"))).toBe(false);
    // File gốc: chương "IV. KẾT QUẢ VÀ KẾ HOẠCH VIỆC TUẦN TỚI" trống (15 việc chỉ từ bảng Tiến độ thiết kế) → chặn K11, không gì khác
    const chan = kq.loi.filter((l) => l.muc === "chan");
    expect(chan.map((l) => l.luat)).toEqual(["bang_viec_trong"]);
    expect(kq.loi.some((l) => l.luat === "nguoi_lap" || l.thong_diep.includes("Người lập"))).toBe(false);
    // ngày nộp do máy ghi (test: đầu kỳ Tuần 29 — tuần ISO thứ Hai 13/07, bản 9 máy tự tính khi ô từ–đến bỏ trống)
    expect(kq.ngay_nop).toBe("2026-07-13");
  });

  it("đổi tên file (không còn chữ Form): nhận theo nội dung", async () => {
    const nd = await nguoi("gd.bqlda@scigroup.vn");
    const kq = await kiemTraDayDu(q, nd, goc("OK_Form7_BQLDA_Sua lan 2.docx"), "bao cao tuan 39.docx", { bo_qua_so_cai: true });
    expect(kq.mau_ma).toBe("form-7");
  });
});
