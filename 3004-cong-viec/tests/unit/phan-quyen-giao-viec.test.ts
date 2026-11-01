// PHÂN QUYỀN GIAO / SỬA VIỆC (Mr. Đại bắt 28/09, sửa 29/09):
//  ① Nơi CHỦ TRÌ phải nằm trong phạm vi quyền "Giao việc" (Mình + cấp dưới) — trước đây trưởng phòng giao được cho TGĐ.
//     Mời PHỐI HỢP không kiểm phạm vi (chỉ để biết, không hạn riêng).
//  ② Công tắc "chỉ người giao được sửa" TẮT: quyền sửa cả việc theo đơn vị CHỦ TRÌ — đơn vị mình chỉ phối hợp thì không
//     gia hạn / hủy được việc của đơn vị khác.
import { describe, it, expect, beforeAll } from "vitest";
import { csdlMoi, nguoi } from "../helpers/csdl";
import { datCauHinh } from "../fixtures/chuan-bi";
import { layQ, tx } from "@/lib/db";
import { MAC_DINH } from "@/lib/cau-hinh/mac-dinh";
import { coTheSua, doiNguoi, giaHan, giaoViec, phamViGiao, themPhanViec } from "@/lib/so-cai/dich-vu";
import type { NguoiDungPhien } from "@/lib/types";

const DV = (id: string, ten: string) => ({ loai: "don_vi" as const, id, ten });
let truong: NguoiDungPhien; // Trưởng P.ĐT&PC: phạm vi P.ĐT&PC + SCI PMC/E&C + BQLDA…
let tckt: NguoiDungPhien;

beforeAll(async () => {
  await csdlMoi();
  // Tệp này dùng SCI PMC / SCI E&C làm đơn vị cấp dưới mẫu; luật "ngoài SCI" (db/85, chốt 10/10) kiểm riêng ở giao-nhan-vien.test.ts
  await (await layQ()).query("UPDATE identity.don_vi SET ngoai_sci = false WHERE id IN ('sci-pmc', 'sci-enc')");
  truong = await nguoi("truong.dtpc@scigroup.vn");
  tckt = await nguoi("truong.tckt@scigroup.vn");
  await datCauHinh(await layQ(), "so_cai", { ...MAC_DINH.so_cai, chi_nguoi_giao_duoc_sua: false });
});

describe("① giao việc trong phạm vi", () => {
  it("phạm vi của trưởng P.ĐT&PC: đơn vị mình + cấp dưới, không có Ban TGĐ / phòng ngang cấp", async () => {
    const pv = await tx((q) => phamViGiao(q, truong));
    expect(pv).not.toBe("tat_ca");
    expect(pv).toEqual(expect.arrayContaining(["p-dtpc", "sci-enc", "bqlda-qt"]));
    expect(pv).not.toContain("ban-tgd");
    expect(pv).not.toContain("p-tckt");
  });

  it("giao chủ trì cho Ban TGĐ / phòng ngang cấp → chặn; cho đơn vị cấp dưới → được; mời phòng khác phối hợp → được", async () => {
    await expect(tx((q) => giaoViec(q, truong, { ten: "test giao TGĐ", ket_thuc: "2099-12-31", phan_viec: [DV("ban-tgd", "Ban TGĐ")] }))).rejects.toThrow(
      /ngoài phạm vi giao việc/,
    );
    await expect(tx((q) => giaoViec(q, truong, { ten: "test giao TCKT", ket_thuc: "2099-12-31", phan_viec: [DV("p-tckt", "P.TCKT")] }))).rejects.toThrow(
      /ngoài phạm vi/,
    );
    const ma = await tx((q) =>
      giaoViec(q, truong, { ten: "test giao SCI E&C", ket_thuc: "2099-12-31", phan_viec: [DV("sci-enc", "SCI E&C"), DV("p-tckt", "P.TCKT")] }),
    );
    expect(ma).toMatch(/^CV-/);
    // Chính mình → luôn được
    await expect(
      tx((q) => giaoViec(q, truong, { ten: "test tự giao", ket_thuc: "2099-12-31", phan_viec: [{ loai: "nguoi", id: truong.id, ten: truong.ten }] })),
    ).resolves.toMatch(/^CV-/);
  });

  it("đổi CHỦ TRÌ sang nơi ngoài phạm vi → chặn (đổi người = giao lại)", async () => {
    const ma = await tx((q) => giaoViec(q, truong, { ten: "test đổi chủ trì", ket_thuc: "2099-12-31", phan_viec: [DV("sci-pmc", "SCI PMC")] }));
    const q = await layQ();
    const pv = (await q.query<{ id: string }>("SELECT id FROM docflow.phan_viec WHERE cong_viec_id = $1", [ma])).rows[0].id;
    await expect(tx((t) => doiNguoi(t, truong, { phan_viec_id: pv, phu_trach: DV("bld-tgd", "TGĐ") }))).rejects.toThrow(/ngoài phạm vi/);
    await tx((t) => doiNguoi(t, truong, { phan_viec_id: pv, phu_trach: DV("sci-enc", "SCI E&C") }));
    // Thêm phối hợp ngoài phạm vi: được
    await expect(tx((t) => themPhanViec(t, truong, { cong_viec_id: ma, phu_trach: DV("p-hcth", "P.HCTH") }))).resolves.toBeTruthy();
  });
});

describe("② quyền sửa việc theo ma trận Cài đặt (cong_viec.sua) — mặc định: người giao + lãnh đạo", () => {
  it("mặc định: TGĐ giao cho P.TCKT (SCI E&C phối hợp) → trưởng P.TCKT (chủ trì) và trưởng P.ĐT&PC (phối hợp) đều KHÔNG sửa; TGĐ + lãnh đạo khác sửa được", async () => {
    const tgd = await nguoi("tgd@scigroup.vn");
    const ma = await tx((q) =>
      giaoViec(q, tgd, { ten: "test thu vốn phối hợp", ket_thuc: "2099-12-31", phan_viec: [DV("p-tckt", "P.TCKT"), DV("sci-enc", "SCI E&C")] }),
    );
    const q = await layQ();
    const cv = (await q.query("SELECT * FROM docflow.cong_viec WHERE id = $1", [ma])).rows[0] as never;
    expect(await tx((t) => coTheSua(t, truong, cv))).toBe(false);
    expect(await tx((t) => coTheSua(t, tckt, cv))).toBe(false);
    expect(await tx((t) => coTheSua(t, tgd, cv))).toBe(true);
    const ld = await nguoi("photgd@scigroup.vn");
    expect(await tx((t) => coTheSua(t, ld, cv))).toBe(true); // lãnh đạo khác
    await expect(tx((t) => giaHan(t, tckt, { cong_viec_id: ma, ket_thuc: "2100-01-31", ly_do: "test" } as never))).rejects.toMatchObject({ status: 403 });
    // Người giao là trưởng phòng → chính người đó sửa được việc mình giao
    const ma2 = await tx((t) => giaoViec(t, truong, { ten: "test trưởng giao", ket_thuc: "2099-12-31", phan_viec: [DV("sci-pmc", "SCI PMC")] }));
    const cv2 = (await q.query("SELECT * FROM docflow.cong_viec WHERE id = $1", [ma2])).rows[0] as never;
    expect(await tx((t) => coTheSua(t, truong, cv2))).toBe(true);
    const pmc = await nguoi("gd.pmc@scigroup.vn");
    expect(await tx((t) => coTheSua(t, pmc, cv2))).toBe(false); // chủ trì không sửa
  });

  it("quản trị đổi phạm vi trong ma trận: Trưởng đơn vị = 'Đơn vị' → sửa được việc đơn vị mình CHỦ TRÌ, vẫn không sửa việc mình chỉ phối hợp", async () => {
    const q = await layQ();
    await q.query("UPDATE identity.quyen_vai_tro SET pham_vi = 'don_vi' WHERE vai_tro_id = 'truong-don-vi' AND quyen = 'cong_viec.sua'");
    try {
      const tckt2 = await nguoi("truong.tckt@scigroup.vn");
      const dtpc2 = await nguoi("truong.dtpc@scigroup.vn");
      const tgd = await nguoi("tgd@scigroup.vn");
      const ma = await tx((t) => giaoViec(t, tgd, { ten: "test đơn vị chủ trì", ket_thuc: "2099-12-31", phan_viec: [DV("p-tckt", "P.TCKT"), DV("p-dtpc", "P.ĐT&PC")] }));
      const cv = (await q.query("SELECT * FROM docflow.cong_viec WHERE id = $1", [ma])).rows[0] as never;
      expect(await tx((t) => coTheSua(t, tckt2, cv))).toBe(true);
      expect(await tx((t) => coTheSua(t, dtpc2, cv))).toBe(false);
    } finally {
      await q.query("UPDATE identity.quyen_vai_tro SET pham_vi = 'cua_minh' WHERE vai_tro_id = 'truong-don-vi' AND quyen = 'cong_viec.sua'");
    }
  });
});
