// Mr. Đại duyệt 29/10/2026 — phương án A: quyền sửa, hủy của TRƯỞNG ĐƠN VỊ CHỦ TRÌ
//   · việc do người khác giao (giao tay): chỉ GIA HẠN phần việc của đơn vị mình; không sửa tên, không hủy
//   · việc máy sinh / người giao không còn: sửa, hủy, mở lại được
import { describe, it, expect, beforeAll } from "vitest";
import { csdlMoi, nguoi } from "../helpers/csdl";
import { layQ, tx } from "@/lib/db";
import { coTheSua, dongViec, giaHan, giaoViec, moLaiViec, phanDonViMinhTruong, suaViec } from "@/lib/so-cai/dich-vu";
import type { NguoiDungPhien } from "@/lib/types";

const DV = (id: string, ten: string) => ({ loai: "don_vi" as const, id, ten });
let tgd: NguoiDungPhien;
let truongDtpc: NguoiDungPhien;
let nhanVien: NguoiDungPhien;

beforeAll(async () => {
  await csdlMoi();
  tgd = await nguoi("tgd@scigroup.vn");
  truongDtpc = await nguoi("truong.dtpc@scigroup.vn");
  nhanVien = await nguoi("nv.dtpc@scigroup.vn");
});

const viec = async (id: string) => (await (await layQ()).query("SELECT * FROM docflow.cong_viec WHERE id = $1", [id])).rows[0] as never;

describe("việc do TGĐ giao cho P.ĐT&PC", () => {
  it("trưởng P.ĐT&PC: không sửa cả việc, nhưng gia hạn được phần việc của phòng mình", async () => {
    const ma = await tx((q) => giaoViec(q, tgd, { ten: "test A giao tay", ket_thuc: "2099-12-30", phan_viec: [DV("p-dtpc", "P.ĐT&PC")] }));
    const cv = await viec(ma);
    expect(await tx((q) => coTheSua(q, truongDtpc, cv))).toBe(false);
    const mine = await tx((q) => phanDonViMinhTruong(q, truongDtpc, cv));
    expect(mine.length).toBe(1);
    await tx((q) => giaHan(q, truongDtpc, { cong_viec_id: ma, phan_viec_id: mine[0], ket_thuc: "2099-12-31" }));
    // gia hạn cả việc (không chỉ phần) hoặc hủy: vẫn 403
    await expect(tx((q) => giaHan(q, truongDtpc, { cong_viec_id: ma, ket_thuc: "2099-12-31" }))).rejects.toMatchObject({ status: 403 });
    await expect(tx((q) => dongViec(q, truongDtpc, { cong_viec_id: ma, ly_do: "thử hủy" }))).rejects.toMatchObject({ status: 403 });
    await expect(tx((q) => suaViec(q, truongDtpc, { cong_viec_id: ma, ten: "đổi trộm" }))).rejects.toMatchObject({ status: 403 });
  });

  it("nhân viên P.ĐT&PC (không phải trưởng): không gia hạn được", async () => {
    const ma = await tx((q) => giaoViec(q, tgd, { ten: "test A nhân viên", ket_thuc: "2099-12-30", phan_viec: [DV("p-dtpc", "P.ĐT&PC")] }));
    const cv = await viec(ma);
    expect(await tx((q) => phanDonViMinhTruong(q, nhanVien, cv))).toEqual([]);
  });
});

describe("việc không còn người giao", () => {
  it("giao_boi trống → trưởng đơn vị chủ trì sửa, hủy, mở lại được; trưởng phòng khác thì không", async () => {
    const ma = await tx((q) => giaoViec(q, tgd, { ten: "test A mồ côi", ket_thuc: "2099-12-30", phan_viec: [DV("p-dtpc", "P.ĐT&PC")] }));
    await (await layQ()).query("UPDATE docflow.cong_viec SET giao_boi = NULL WHERE id = $1", [ma]);
    const cv = await viec(ma);
    expect(await tx((q) => coTheSua(q, truongDtpc, cv))).toBe(true);
    const khac = await nguoi("truong.tckt@scigroup.vn");
    expect(await tx((q) => coTheSua(q, khac, cv))).toBe(false);
    await tx((q) => dongViec(q, truongDtpc, { cong_viec_id: ma, ly_do: "việc trùng" }));
    const daDong = await viec(ma);
    await tx((q) => moLaiViec(q, truongDtpc, { cong_viec_id: ma, ly_do: "mở lại thử" }));
    expect((await viec(ma) as { trang_thai: string }).trang_thai).toBe("dang_mo");
    expect(daDong).toBeTruthy();
  });
});
