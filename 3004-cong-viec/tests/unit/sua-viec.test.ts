// CÂY BÚT ✏ SỬA VIỆC (Mr. Đại chốt 29/09/2026): quyền riêng "cong_viec.sua_viec" ở ma trận Cài đặt; sửa một lượt tên,
// kết quả cần có, ngày bắt đầu, hạn (không bắt lý do), chủ trì (trong phạm vi giao), phối hợp.
import { describe, it, expect, beforeAll } from "vitest";
import { csdlMoi, nguoi } from "../helpers/csdl";
import { layQ, tx } from "@/lib/db";
import { coTheSuaViec, giaoViec, suaViec } from "@/lib/so-cai/dich-vu";
import type { NguoiDungPhien } from "@/lib/types";

const DV = (id: string, ten: string) => ({ loai: "don_vi" as const, id, ten });
let tgd: NguoiDungPhien;
let truong: NguoiDungPhien;

beforeAll(async () => {
  await csdlMoi();
  // Tệp này dùng SCI PMC / SCI E&C làm đơn vị cấp dưới mẫu; luật "ngoài SCI" (db/85, chốt 10/10) kiểm riêng ở giao-nhan-vien.test.ts
  await (await layQ()).query("UPDATE identity.don_vi SET ngoai_sci = false WHERE id IN ('sci-pmc', 'sci-enc')");
  tgd = await nguoi("tgd@scigroup.vn");
  truong = await nguoi("truong.dtpc@scigroup.vn");
});

const viec = async (id: string) => (await (await layQ()).query("SELECT * FROM docflow.cong_viec WHERE id = $1", [id])).rows[0] as never;
const phan = async (id: string) =>
  (
    await (await layQ()).query<{ phu_trach_id: string; vai: string; noi_dung: string; ket_thuc: string | null; trang_thai: string; da_bo: boolean }>(
      "SELECT phu_trach_id, vai, noi_dung, ket_thuc::text, trang_thai, da_bo FROM docflow.phan_viec WHERE cong_viec_id = $1 ORDER BY thu_tu",
      [id],
    )
  ).rows;

describe("quyền Sửa việc — mặc định người giao + lãnh đạo", () => {
  it("TGĐ giao cho P.ĐT&PC: TGĐ + lãnh đạo có bút; trưởng P.ĐT&PC (chủ trì, không phải người giao) không có", async () => {
    const ma = await tx((q) => giaoViec(q, tgd, { ten: "test bút quyền", ket_thuc: "2099-12-31", phan_viec: [DV("p-dtpc", "P.ĐT&PC")] }));
    const cv = await viec(ma);
    expect(await tx((q) => coTheSuaViec(q, tgd, cv))).toBe(true);
    const ld = await nguoi("photgd@scigroup.vn");
    expect(await tx((q) => coTheSuaViec(q, ld, cv))).toBe(true);
    expect(await tx((q) => coTheSuaViec(q, truong, cv))).toBe(false);
    await expect(tx((q) => suaViec(q, truong, { cong_viec_id: ma, ten: "đổi trộm" }))).rejects.toMatchObject({ status: 403 });
  });

  it("quản trị tắt quyền Sửa việc của Lãnh đạo → mất bút, còn quyền Gia hạn thì vẫn giữ (hai quyền riêng)", async () => {
    const q = await layQ();
    await q.query("DELETE FROM identity.quyen_vai_tro WHERE vai_tro_id = 'lanh-dao' AND quyen = 'cong_viec.sua_viec'");
    try {
      const ld = await nguoi("photgd@scigroup.vn");
      const ma = await tx((t) => giaoViec(t, tgd, { ten: "test tắt bút", ket_thuc: "2099-12-31", phan_viec: [DV("p-dtpc", "P.ĐT&PC")] }));
      const cv = await viec(ma);
      expect(await tx((t) => coTheSuaViec(t, ld, cv))).toBe(false);
      expect(ld.quyen["cong_viec.sua"]).toBe("toan_bo");
    } finally {
      await q.query("INSERT INTO identity.quyen_vai_tro (vai_tro_id, quyen, pham_vi) VALUES ('lanh-dao', 'cong_viec.sua_viec', 'toan_bo') ON CONFLICT DO NOTHING");
    }
  });
});

describe("sửa một lượt", () => {
  it("đổi tên + kết quả + hạn (không lý do) + chủ trì + phối hợp → lưu đủ, phần việc theo tên mới, ghi lịch sử", async () => {
    const ma = await tx((q) =>
      giaoViec(q, truong, { ten: "test sửa gốc", ket_thuc: "2099-12-31", phan_viec: [DV("sci-pmc", "SCI PMC"), DV("p-tckt", "P.TCKT")] }),
    );
    const r = await tx((q) =>
      suaViec(q, truong, {
        cong_viec_id: ma,
        ten: "test sửa mới",
        ket_qua_can_co: "biên bản",
        ket_thuc: "2100-01-15",
        chu_tri: DV("sci-enc", "SCI E&C"),
        phoi_hop: [DV("p-hcth", "P.HCTH")],
      }),
    );
    expect(r.thay.length).toBeGreaterThanOrEqual(5);
    const cv = (await viec(ma)) as { ten: string; ket_qua_can_co: string };
    expect(cv.ten).toBe("test sửa mới");
    expect(cv.ket_qua_can_co).toBe("biên bản");
    const ds = (await phan(ma)).filter((p) => !p.da_bo);
    expect(ds.find((p) => p.vai !== "phoi_hop")).toMatchObject({ phu_trach_id: "sci-enc", noi_dung: "test sửa mới", ket_thuc: "2100-01-15" });
    expect(ds.filter((p) => p.vai === "phoi_hop").map((p) => p.phu_trach_id)).toEqual(["p-hcth"]);
    const q = await layQ();
    expect((await q.query("SELECT 1 FROM docflow.lich_su WHERE doi_tuong_id = $1 AND hanh_dong = 'sua_viec'", [ma])).rows).toHaveLength(1);
  });

  it("chủ trì ngoài phạm vi giao → chặn; bắt đầu sau hạn → chặn; không đổi gì → báo", async () => {
    const ma = await tx((q) => giaoViec(q, truong, { ten: "test sửa chặn", ket_thuc: "2099-12-31", phan_viec: [DV("sci-pmc", "SCI PMC")] }));
    await expect(tx((q) => suaViec(q, truong, { cong_viec_id: ma, ten: "test sửa chặn", chu_tri: DV("ban-tgd", "Ban TGĐ") }))).rejects.toThrow(/ngoài phạm vi/);
    await expect(tx((q) => suaViec(q, truong, { cong_viec_id: ma, ten: "test sửa chặn", bat_dau: "2100-02-01" }))).rejects.toThrow(/sau hạn/);
    await expect(tx((q) => suaViec(q, truong, { cong_viec_id: ma, ten: "test sửa chặn" }))).rejects.toThrow(/Chưa đổi gì/);
  });
});
