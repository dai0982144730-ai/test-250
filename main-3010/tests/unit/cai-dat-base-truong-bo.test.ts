// 24/09: bỏ 3 trường cài đặt Base Main không dùng (nguongNamImNgay · truongTuyBienWbs ·
// quyDoiDuAn). File cũ còn các khoá đó vẫn đọc được — không sập, khoá cũ không lọt ra ngoài.
// Chạy trên BẢN SAO data/ (vitest.config.ts) — bản sao mang đúng file cũ còn 3 khoá.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { docCaiDat, TRUONG_DA_BO } from "@/lib/cai-dat-base";
import { gocDuLieu } from "@/lib/goc-du-lieu";

// 24/09 lượt 2: thêm nguongViecQuaHan (file thật đang ghi 5) → 4 trường.
describe("cài đặt Base — 4 trường đã bỏ", () => {
  it("file cũ còn khoá đã bỏ → docCaiDat không sập, không trả các khoá đó", () => {
    const tep = path.join(gocDuLieu(), "cai-dat-base.json");
    const tho = fs.existsSync(tep) ? (JSON.parse(fs.readFileSync(tep, "utf8")) as Record<string, unknown>) : {};
    const cd = docCaiDat() as unknown as Record<string, unknown>;
    for (const k of TRUONG_DA_BO) expect(k in cd, `khoá ${k}`).toBe(false);
    // Các trường còn dùng vẫn nguyên
    expect(Array.isArray(cd.danhBaAgent)).toBe(true);
    expect(typeof cd.usernameBase).toBe("string");
    if (typeof tho.tuDienNguCanh === "string") expect(cd.tuDienNguCanh).toBe(tho.tuDienNguCanh);
  });

  it("đúng 4 trường được bỏ", () => {
    expect([...TRUONG_DA_BO].sort()).toEqual(["nguongNamImNgay", "nguongViecQuaHan", "quyDoiDuAn", "truongTuyBienWbs"]);
  });
});
