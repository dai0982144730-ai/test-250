// TAG TÊN + QUYỀN BÌNH LUẬN (Mr. Đại chốt 29/09/2026) — chỉ tag NGƯỜI:
//  · gõ "@"  = người liên quan việc (người giao, người được giao, mọi người thuộc đơn vị chủ trì/phối hợp đang làm, đã bình luận, đã được @)
//  · gõ "@@" = mở rộng theo quyền "Tag tên" (NV mình + cấp dưới, trưởng/lãnh đạo toàn bộ)
//  · bình luận được = người liên quan (kể cả đã được @) + phạm vi quyền "Giao việc"; còn lại chỉ đọc
import { describe, it, expect, beforeAll } from "vitest";
import { csdlMoi, nguoi } from "../helpers/csdl";
import { layQ, tx } from "@/lib/db";
import { giaoViec } from "@/lib/so-cai/dich-vu";
import { coTheBinhLuan, nguoiTagDuoc, vietBinhLuan } from "@/lib/phong/binh-luan";
import type { NguoiDungPhien } from "@/lib/types";

const DV = (id: string, ten: string) => ({ loai: "don_vi" as const, id, ten });
let tgd: NguoiDungPhien;
let truong: NguoiDungPhien;
let nv: NguoiDungPhien;
let ma = "";

beforeAll(async () => {
  await csdlMoi();
  // Tệp này dùng SCI PMC / SCI E&C làm đơn vị cấp dưới mẫu; luật "ngoài SCI" (db/85, chốt 10/10) kiểm riêng ở giao-nhan-vien.test.ts
  await (await layQ()).query("UPDATE identity.don_vi SET ngoai_sci = false WHERE id IN ('sci-pmc', 'sci-enc')");
  tgd = await nguoi("tgd@scigroup.vn");
  truong = await nguoi("truong.dtpc@scigroup.vn");
  nv = await nguoi("nv.dtpc@scigroup.vn");
  // Trưởng P.ĐT&PC giao cho SCI PMC chủ trì, P.TCKT phối hợp
  ma = await tx((q) => giaoViec(q, truong, { ten: "test tag tên", ket_thuc: "2099-12-31", phan_viec: [DV("sci-pmc", "SCI PMC"), DV("p-tckt", "P.TCKT")] }));
});

describe("gõ @ — chỉ người liên quan", () => {
  it("danh sách @ = người giao + người thuộc SCI PMC (chủ trì) + P.TCKT (phối hợp); không có TGĐ", async () => {
    const q = await layQ();
    const mong = (
      await q.query<{ id: string }>(
        "SELECT id FROM identity.nguoi_dung WHERE active AND id <> $1 AND (id = $2 OR don_vi_id IN ('sci-pmc', 'p-tckt'))",
        [nv.id, truong.id],
      )
    ).rows.map((r) => r.id);
    const ds = await tx((t) => nguoiTagDuoc(t, nv, ma));
    expect(ds.map((n) => n.id).sort()).toEqual(mong.sort());
    expect(ds.every((n) => n.trong_viec)).toBe(true);
    expect(ds.map((n) => n.id)).not.toContain("tgd@scigroup.vn");
  });
});

describe("gõ @@ — mở rộng theo quyền Tag tên", () => {
  it("nhân viên P.ĐT&PC: + đơn vị mình và cấp dưới, người liên quan đứng đầu; không có TGĐ / trưởng P.CĐ", async () => {
    const ds = await tx((q) => nguoiTagDuoc(q, nv, ma, true));
    const ids = ds.map((n) => n.id);
    expect(ds[0].trong_viec).toBe(true);
    expect(ids).toContain("truong.dtpc@scigroup.vn");
    expect(ids).not.toContain("tgd@scigroup.vn");
    expect(ids).not.toContain(nv.id);
  });

  it("trưởng đơn vị + lãnh đạo: cả công ty", async () => {
    const tong = (await (await layQ()).query<{ n: number }>("SELECT count(*)::int AS n FROM identity.nguoi_dung WHERE active")).rows[0].n;
    expect(await tx((q) => nguoiTagDuoc(q, truong, ma, true))).toHaveLength(tong - 1);
    expect(await tx((q) => nguoiTagDuoc(q, tgd, ma, true))).toHaveLength(tong - 1);
  });

  it("bỏ quyền Tag tên của Nhân viên → @@ rỗng, @ vẫn còn người liên quan", async () => {
    const q = await layQ();
    await q.query("DELETE FROM identity.quyen_vai_tro WHERE vai_tro_id = 'nhan-vien' AND quyen = 'cong_viec.tag_ten'");
    try {
      const nv0 = await nguoi("nv.dtpc@scigroup.vn");
      expect(await tx((t) => nguoiTagDuoc(t, nv0, ma, true))).toEqual([]);
      expect((await tx((t) => nguoiTagDuoc(t, nv0, ma))).length).toBeGreaterThan(0);
    } finally {
      await q.query(
        "INSERT INTO identity.quyen_vai_tro (vai_tro_id, quyen, pham_vi) VALUES ('nhan-vien', 'cong_viec.tag_ten', 'don_vi_va_cap_duoi') ON CONFLICT (vai_tro_id, quyen) DO UPDATE SET pham_vi = EXCLUDED.pham_vi",
      );
    }
  });
});

describe("quyền bình luận = người liên quan + phạm vi Giao việc", () => {
  it("NV P.ĐT&PC (không liên quan, không có quyền Giao việc) chỉ đọc → gửi bị 403; TGĐ + người SCI PMC bình luận được", async () => {
    expect(await tx((q) => coTheBinhLuan(q, nv, ma))).toBe(false);
    await expect(tx((q) => vietBinhLuan(q, nv, ma, { noi_dung: "góp ý" }))).rejects.toMatchObject({ status: 403 });
    expect(await tx((q) => coTheBinhLuan(q, tgd, ma))).toBe(true);
    const pmc = await nguoi("gd.pmc@scigroup.vn");
    expect(await tx((q) => coTheBinhLuan(q, pmc, ma))).toBe(true);
  });

  it("trưởng P.CĐ (phạm vi Giao việc = P.CĐ + cấp dưới, không liên quan) → chỉ đọc; được @ rồi thì trả lời được", async () => {
    const cd = await nguoi("truong.cd@scigroup.vn");
    expect(await tx((q) => coTheBinhLuan(q, cd, ma))).toBe(false);
    await tx((q) => vietBinhLuan(q, truong, ma, { noi_dung: `@${cd.ten} phòng xem giúp`, nhac: [cd.id] }));
    expect(await tx((q) => coTheBinhLuan(q, cd, ma))).toBe(true);
  });

  it("NV được @ → thành người liên quan, bình luận được; nhưng gọi thẳng API tag TGĐ (ngoài @ và @@ của NV) → 403", async () => {
    await tx((q) => vietBinhLuan(q, truong, ma, { noi_dung: `@${nv.ten} em theo dõi`, nhac: [nv.id] }));
    expect(await tx((q) => coTheBinhLuan(q, nv, ma))).toBe(true);
    await expect(tx((q) => vietBinhLuan(q, nv, ma, { noi_dung: "@TGĐ xem giúp", nhac: ["tgd@scigroup.vn"] }))).rejects.toMatchObject({ status: 403 });
  });
});
