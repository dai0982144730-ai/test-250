// "Một web trống dùng được sci-identity theo README": CSDL riêng chỉ có lược đồ identity, không có lịch sử/cấu hình SCI công việc.
import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import type { Q } from "@/lib/db";
import {
  themDonVi,
  taoVaiTro,
  themNguoiDung,
  xacThuc,
  napNguoiDungPhien,
  coQuyen,
  kyToken,
  kiemToken,
  layCayDonVi,
  type NguCanh,
  type SuKienIdentity,
} from "@sci/identity/server";

let q: Q;
const nhatKy: SuKienIdentity[] = [];
const ng: NguCanh = { nguoi: "he-thong", ghiNhatKy: async (_q, e) => void nhatKy.push(e) };

describe("sci-identity trên một web trống", () => {
  beforeAll(async () => {
    const pg = new PGlite();
    await pg.exec(fs.readFileSync(path.join(process.cwd(), "packages/sci-identity/sql/identity.sql"), "utf8"));
    await pg.exec(fs.readFileSync(path.join(process.cwd(), "packages/sci-identity/sql/identity.sql"), "utf8")); // chạy lại không lỗi
    q = { query: async <T,>(sql: string, ts?: unknown[]) => ({ rows: (await pg.query<T>(sql, ts)).rows }) };
  });

  it("dựng đơn vị, vai trò, người dùng; đăng nhập; tính quyền; ký phiên", async () => {
    const cty = await themDonVi(q, ng, { ten: "Công ty ABC", ten_ngan: "ABC", cap: 1, loai: "ban_tgd" });
    const phong = await themDonVi(q, ng, { ten: "Phòng Kỹ thuật", ten_ngan: "P.KT", cap: 2, cha_id: cty.id, loai: "phong" });
    await taoVaiTro(q, ng, { id: "truong-phong", ten: "Trưởng phòng", quyen: { "tai_lieu.xoa": "don_vi_va_cap_duoi" } });
    const { mat_khau } = await themNguoiDung(q, ng, { email: "a@abc.vn", ten: "Nguyễn A", don_vi_id: phong.id, vai_tro: ["truong-phong"] });

    expect((await xacThuc(q, "a@abc.vn", "sai")).ok).toBe(false);
    const dn = await xacThuc(q, "A@abc.vn", mat_khau);
    expect(dn.ok).toBe(true);

    const nd = (await napNguoiDungPhien(q, "a@abc.vn"))!;
    expect(nd).toMatchObject({ don_vi_id: "p-kt", cap: 2, quyen: { "tai_lieu.xoa": "don_vi_va_cap_duoi" } });
    const cay = await layCayDonVi(q);
    expect(coQuyen(nd, "tai_lieu.xoa", { don_vi_id: "p-kt" }, cay)).toBe(true);
    expect(coQuyen(nd, "tai_lieu.xoa", { don_vi_id: "abc" }, cay)).toBe(false);

    const khoa = "khoa-bi-mat-cua-web-trong-it-nhat-32-ky-tu";
    const token = await kyToken({ id: nd.id, ten: nd.ten }, khoa);
    expect((await kiemToken(token, khoa))?.id).toBe("a@abc.vn");
    expect(await kiemToken(token, khoa + "x")).toBeNull();

    expect(nhatKy.map((e) => `${e.loai}:${e.thao_tac}`)).toEqual(["don_vi:them", "don_vi:them", "vai_tro:them", "nguoi_dung:them"]);
  });
});
