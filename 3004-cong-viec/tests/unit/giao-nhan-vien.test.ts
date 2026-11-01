// GIAO VIỆC CHO TỪNG NHÂN VIÊN + PHÂN CÔNG (Mr. Đại chốt 30/09):
//  ① Trưởng phòng giao trong PHÒNG MÌNH: bắt buộc chọn MỘT nhân viên làm chủ trì (không giao cho cả phòng).
//  ② Đơn vị cấp dưới: chỉ giao cho CẢ đơn vị — không giao đích danh nhân viên của đơn vị dưới.
//  ③ Việc giao cho cả đơn vị: trưởng đơn vị đó phân công cho một nhân viên của mình (nhân viên thường không làm được).
//  ③b Giao chuyển tiếp (09/10): người đang nhận việc giao tiếp theo quyền Giao việc của mình — không xuống SCI PMC / SCI E&C.
import { describe, it, expect, beforeAll } from "vitest";
import { csdlMoi, nguoi } from "../helpers/csdl";
import { layQ, tx } from "@/lib/db";
import { coThePhanCong, giaHan, giaoViec, ketThucPhanViec, nguoiNhanChuyenTiep, phamViGiao, noiPhoiHop, phanCong, themPhanViec } from "@/lib/so-cai/dich-vu";
import { dauDonVi } from "@/lib/thong-bao";
import { nguoiTagDuoc } from "@/lib/phong/binh-luan";
import type { NguoiDungPhien } from "@/lib/types";

const DV = (id: string, ten: string) => ({ loai: "don_vi" as const, id, ten });
const NG = (id: string, ten: string) => ({ loai: "nguoi" as const, id, ten });
let truong: NguoiDungPhien; // Trưởng P.ĐT&PC — cấp dưới có SCI E&C
let nv: NguoiDungPhien; // nhân viên P.ĐT&PC
let gdEnc: NguoiDungPhien;
let nvEnc: NguoiDungPhien;
let tgd: NguoiDungPhien;
let gdBqlda: NguoiDungPhien;
let nvBqlda: NguoiDungPhien;

beforeAll(async () => {
  await csdlMoi();
  truong = await nguoi("truong.dtpc@scigroup.vn");
  nv = await nguoi("nv.dtpc@scigroup.vn");
  gdEnc = await nguoi("gd.enc@scigroup.vn");
  nvEnc = await nguoi("nv.enc@scigroup.vn");
  tgd = await nguoi("tgd@scigroup.vn");
  gdBqlda = await nguoi("gd.bqlda@scigroup.vn");
  nvBqlda = await nguoi("nv.bqlda@scigroup.vn");
});

const pvCua = async (ma: string) =>
  (await (await layQ()).query<{ id: string; phu_trach_loai: string; phu_trach_id: string; trang_thai: string }>(
    "SELECT id, phu_trach_loai, phu_trach_id, trang_thai FROM docflow.phan_viec WHERE cong_viec_id = $1 AND vai = 'chu_tri'",
    [ma],
  )).rows[0];

describe("① trưởng phòng giao trong phòng mình", () => {
  it("giao cho cả phòng → chặn, bắt chọn một nhân viên; giao cho nhân viên phòng mình → được", async () => {
    await expect(tx((q) => giaoViec(q, truong, { ten: "test cả phòng", ket_thuc: "2099-12-31", phan_viec: [DV("p-dtpc", "P.ĐT&PC")] }))).rejects.toThrow(
      /chọn một nhân viên/,
    );
    const ma = await tx((q) => giaoViec(q, truong, { ten: "test giao nhân viên", ket_thuc: "2099-12-31", phan_viec: [NG(nv.id, nv.ten)] }));
    expect(await pvCua(ma)).toMatchObject({ phu_trach_loai: "nguoi", phu_trach_id: nv.id });
  });
  it("lãnh đạo (phạm vi toàn bộ) vẫn giao cho cả phòng như trước", async () => {
    await expect(tx((q) => giaoViec(q, tgd, { ten: "test TGĐ giao phòng", ket_thuc: "2099-12-31", phan_viec: [DV("p-dtpc", "P.ĐT&PC")] }))).resolves.toMatch(/^CV-/);
  });
});

describe("② đơn vị cấp dưới: chỉ giao cho cả đơn vị", () => {
  it("giao đích danh nhân viên BQLDA QT → chặn; giao cho BQLDA QT → được", async () => {
    await expect(tx((q) => giaoViec(q, truong, { ten: "test đích danh cấp dưới", ket_thuc: "2099-12-31", phan_viec: [NG(nvBqlda.id, nvBqlda.ten)] }))).rejects.toThrow(
      /chỉ giao cho từng nhân viên phòng mình/,
    );
    await expect(tx((q) => giaoViec(q, truong, { ten: "test giao BQLDA QT", ket_thuc: "2099-12-31", phan_viec: [DV("bqlda-qt", "BQLDA QT")] }))).resolves.toMatch(/^CV-/);
  });
  it("SCI PMC / SCI E&C: giao cho CẢ đơn vị → được; giao đích danh cá nhân của họ → chặn, kể cả lãnh đạo (Mr. Đại sửa lại 10/10 chiều); trong chính E&C vẫn giao", async () => {
    for (const ai of [truong, tgd]) {
      const ma = await tx((q) => giaoViec(q, ai, { ten: "test giao E&C", ket_thuc: "2099-12-31", phan_viec: [DV("sci-enc", "SCI E&C")] }));
      expect(await pvCua(ma)).toMatchObject({ phu_trach_loai: "don_vi", phu_trach_id: "sci-enc" });
    }
    await expect(tx((q) => giaoViec(q, tgd, { ten: "test đích danh E&C", ket_thuc: "2099-12-31", phan_viec: [NG(nvEnc.id, nvEnc.ten)] }))).rejects.toThrow(/Không giao đích danh được/);
    await expect(tx((q) => giaoViec(q, tgd, { ten: "test giao PMC", ket_thuc: "2099-12-31", phan_viec: [NG("gd.pmc@scigroup.vn", "GĐ PMC")] }))).rejects.toThrow(/công ty SCI có cổ phần/);
    await expect(
      tx((q) => giaoViec(q, tgd, { ten: "test phối hợp E&C", ket_thuc: "2099-12-31", phan_viec: [DV("bqlda-qt", "BQLDA QT"), DV("sci-enc", "SCI E&C")] })),
    ).resolves.toMatch(/^CV-/);
    await expect(tx((q) => giaoViec(q, gdEnc, { ten: "test E&C nội bộ", ket_thuc: "2099-12-31", phan_viec: [NG(nvEnc.id, nvEnc.ten)] }))).resolves.toMatch(/^CV-/);
  });
  it("việc lãnh đạo giao cho CẢ SCI E&C: người đứng đầu E&C giao chuyển tiếp cho nhân viên E&C; lãnh đạo SCI không giao tiếp thay được", async () => {
    const ma = await tx((q) => giaoViec(q, tgd, { ten: "test E&C nhận rồi giao tiếp", ket_thuc: "2099-12-31", phan_viec: [DV("sci-enc", "SCI E&C")] }));
    const p = await pvCua(ma);
    expect(await tx((q) => coThePhanCong(q, gdEnc, p))).toBe(true);
    expect(await tx((q) => coThePhanCong(q, tgd, p))).toBe(false); // không thuộc SCI E&C
    await tx((q) => phanCong(q, gdEnc, { phan_viec_id: p.id, nguoi_id: nvEnc.id }));
    expect(await pvCua(ma)).toMatchObject({ phu_trach_loai: "nguoi", phu_trach_id: nvEnc.id, trang_thai: "dang_lam" });
  });
});

describe("②b mời phối hợp: người / đơn vị ngang cấp và cấp dưới; PMC, E&C chỉ cả đơn vị (Mr. Đại chốt 10/10 tối)", () => {
  const vaiCua = async (ma: string, id: string) =>
    (await (await layQ()).query<{ vai: string; loai: string }>("SELECT vai, phu_trach_loai AS loai FROM docflow.phan_viec WHERE cong_viec_id = $1 AND phu_trach_id = $2", [ma, id])).rows[0];
  it("lãnh đạo: mời được mọi người của SCI, mọi đơn vị, lãnh đạo khác; cá nhân SCI E&C → chặn, cả SCI E&C → được", async () => {
    const np = await tx((q) => noiPhoiHop(q, tgd));
    for (const e of ["nv.dtpc", "truong.dtpc", "nv.bqlda", "gd.namxe"]) expect(np.nguoi.has(`${e}@scigroup.vn`), e).toBe(true);
    for (const e of ["nv.enc", "gd.enc", "gd.pmc", "tgd"]) expect(np.nguoi.has(`${e}@scigroup.vn`), e).toBe(false);
    for (const d of ["p-dtpc", "bqlda-qt", "sci-enc", "sci-pmc"]) expect(np.don_vi.has(d), d).toBe(true);
    const ma = await tx((q) => giaoViec(q, tgd, { ten: "test phối hợp cá nhân", ket_thuc: "2099-12-31", phan_viec: [DV("p-dtpc", "P.ĐT&PC")] }));
    await tx((q) => themPhanViec(q, tgd, { cong_viec_id: ma, phu_trach: NG(nvBqlda.id, nvBqlda.ten) }));
    expect(await vaiCua(ma, nvBqlda.id)).toMatchObject({ vai: "phoi_hop", loai: "nguoi" });
    await expect(tx((q) => themPhanViec(q, tgd, { cong_viec_id: ma, phu_trach: NG(nvEnc.id, nvEnc.ten) }))).rejects.toThrow(/chỉ mời cả đơn vị/);
    await tx((q) => themPhanViec(q, tgd, { cong_viec_id: ma, phu_trach: DV("sci-enc", "SCI E&C") }));
    expect(await vaiCua(ma, "sci-enc")).toMatchObject({ vai: "phoi_hop", loai: "don_vi" });
  });
  it("trưởng phòng: các phòng + nhân sự các phòng + đơn vị con + nhân sự con; không mời lãnh đạo; cá nhân E&C không, cả E&C có", async () => {
    const np = await tx((q) => noiPhoiHop(q, truong));
    for (const d of ["p-dtpc", "p-hcth", "p-ktvh", "bqlda-qt", "sci-enc"]) expect(np.don_vi.has(d), d).toBe(true);
    for (const e of ["nv.dtpc", "hung.tv", "nv.bqlda", "gd.bqlda", "gd.namxe"]) expect(np.nguoi.has(`${e}@scigroup.vn`), e).toBe(true);
    for (const e of ["tgd", "photgd", "nv.enc", "gd.enc", "truong.dtpc"]) expect(np.nguoi.has(`${e}@scigroup.vn`), e).toBe(false);
    expect(np.lanh_dao.size).toBe(0);
    const ma = await tx((q) => giaoViec(q, truong, { ten: "test trưởng mời phối hợp", ket_thuc: "2099-12-31", phan_viec: [DV("bqlda-qt", "BQLDA QT")] }));
    await tx((q) => themPhanViec(q, truong, { cong_viec_id: ma, phu_trach: NG("hung.tv@scigroup.vn", "Hùng") }));
    expect(await vaiCua(ma, "hung.tv@scigroup.vn")).toMatchObject({ vai: "phoi_hop", loai: "nguoi" });
    await expect(tx((q) => themPhanViec(q, truong, { cong_viec_id: ma, phu_trach: DV("p-hcth", "P.HCTH") }))).resolves.toBeTruthy();
    await expect(tx((q) => themPhanViec(q, truong, { cong_viec_id: ma, phu_trach: NG(tgd.id, tgd.ten) }))).rejects.toMatchObject({ status: 403 });
    await expect(tx((q) => themPhanViec(q, truong, { cong_viec_id: ma, phu_trach: NG(nvEnc.id, nvEnc.ten) }))).rejects.toThrow(/chỉ mời cả đơn vị/);
  });
  it("nhân viên: chỉ nhân viên ngang cấp (không trưởng, không cả phòng) + đơn vị con và nhân sự con; PMC, E&C chỉ cả đơn vị", async () => {
    const np = await tx((q) => noiPhoiHop(q, nv));
    expect(np.nguoi.has("nv.bqlda@scigroup.vn")).toBe(true); // nhân sự đơn vị con
    expect(np.nguoi.has("gd.bqlda@scigroup.vn")).toBe(true); // cả người đứng đầu đơn vị con
    for (const e of ["truong.dtpc", "tgd", "nv.enc", "nv.dtpc"]) expect(np.nguoi.has(`${e}@scigroup.vn`), e).toBe(false);
    for (const d of ["bqlda-qt", "sci-enc", "sci-pmc"]) expect(np.don_vi.has(d), d).toBe(true);
    for (const d of ["p-dtpc", "p-hcth"]) expect(np.don_vi.has(d), d).toBe(false);
    expect(np.lanh_dao.size).toBe(0);
  });
});

describe("③ phân công việc giao cho cả đơn vị", () => {
  it("GĐ BQLDA QT phân công cho nhân viên BQLDA; nhân viên, người ngoài đơn vị, người giao đều không phân công được", async () => {
    const ma = await tx((q) => giaoViec(q, truong, { ten: "test phân công", ket_thuc: "2099-12-31", phan_viec: [DV("bqlda-qt", "BQLDA QT")] }));
    const p = await pvCua(ma);
    expect(await tx((q) => coThePhanCong(q, gdBqlda, p))).toBe(true);
    expect(await tx((q) => coThePhanCong(q, nvBqlda, p))).toBe(false); // nhân viên không có quyền giao
    expect(await tx((q) => coThePhanCong(q, truong, p))).toBe(false); // người giao không thuộc BQLDA QT
    await expect(tx((q) => phanCong(q, nvBqlda, { phan_viec_id: p.id, nguoi_id: nvBqlda.id }))).rejects.toMatchObject({ status: 403 });
    await expect(tx((q) => phanCong(q, gdBqlda, { phan_viec_id: p.id, nguoi_id: nv.id }))).rejects.toThrow(/ngoài phạm vi giao việc/);
    await tx((q) => phanCong(q, gdBqlda, { phan_viec_id: p.id, nguoi_id: nvBqlda.id }));
    expect(await pvCua(ma)).toMatchObject({ phu_trach_loai: "nguoi", phu_trach_id: nvBqlda.id, trang_thai: "dang_lam" });
    // Đã giao cho người khác: GĐ không còn đang nhận phần này → không giao chuyển tiếp nữa
    await expect(tx((q) => phanCong(q, gdBqlda, { phan_viec_id: p.id, nguoi_id: gdBqlda.id }))).rejects.toMatchObject({ status: 403 });
    const tb = (await (await layQ()).query<{ noi_dung: string }>("SELECT noi_dung FROM docflow.thong_bao WHERE nguoi_nhan = $1 ORDER BY id DESC LIMIT 1", [nvBqlda.id])).rows[0];
    expect(tb.noi_dung).toMatch(new RegExp(`phân công bạn làm việc ${ma} test phân công`));
  });
});

describe("③b giao chuyển tiếp theo quyền người nhận (Mr. Đại chốt 09/10)", () => {
  it("lãnh đạo nhận việc đích danh → giao tiếp cho nhân viên, trưởng phòng, nhân sự BQLDA; không cho SCI PMC / SCI E&C, không ngược lên Ban TGĐ", async () => {
    const ma = await tx((q) => giaoViec(q, tgd, { ten: "test lãnh đạo giao tiếp", ket_thuc: "2099-12-31", phan_viec: [NG(tgd.id, tgd.ten)] }));
    const p = await pvCua(ma);
    expect(await tx((q) => coThePhanCong(q, tgd, p))).toBe(true);
    const nhan = await tx((q) => nguoiNhanChuyenTiep(q, tgd));
    for (const e of ["nv.dtpc", "truong.dtpc", "nv.bqlda", "gd.namxe", "nv.cd"]) expect(nhan.has(`${e}@scigroup.vn`), e).toBe(true);
    for (const e of ["nv.enc", "gd.enc", "gd.pmc", "photgd", "tgd"]) expect(nhan.has(`${e}@scigroup.vn`), e).toBe(false);
    await expect(tx((q) => phanCong(q, tgd, { phan_viec_id: p.id, nguoi_id: nvEnc.id }))).rejects.toThrow(/ngoài SCI/);
    await tx((q) => phanCong(q, tgd, { phan_viec_id: p.id, nguoi_id: nv.id }));
    expect(await pvCua(ma)).toMatchObject({ phu_trach_loai: "nguoi", phu_trach_id: nv.id });
  });
  it("trưởng phòng nhận việc đích danh → nhân viên phòng mình + nhân sự đơn vị con trực thuộc (BQLDA); không sang phòng khác, không SCI E&C", async () => {
    const nhan = await tx((q) => nguoiNhanChuyenTiep(q, truong));
    expect(nhan.has(nv.id)).toBe(true);
    expect(nhan.has("nv.bqlda@scigroup.vn")).toBe(true);
    expect(nhan.has("gd.bqlda@scigroup.vn")).toBe(true);
    expect(nhan.has("hung.tv@scigroup.vn")).toBe(false); // P.KT&VH — không phải cấp dưới
    expect(nhan.has(nvEnc.id)).toBe(false); // SCI E&C — công ty SCI có cổ phần
    const ma = await tx((q) => giaoViec(q, tgd, { ten: "test trưởng giao tiếp", ket_thuc: "2099-12-31", phan_viec: [NG(truong.id, truong.ten)] }));
    const p = await pvCua(ma);
    await tx((q) => phanCong(q, truong, { phan_viec_id: p.id, nguoi_id: "nv.bqlda@scigroup.vn" }));
    expect(await pvCua(ma)).toMatchObject({ phu_trach_loai: "nguoi", phu_trach_id: "nv.bqlda@scigroup.vn" });
  });
  it("nhân viên được giao đích danh (không có quyền Giao việc) → không có ô giao tiếp", async () => {
    const ma = await tx((q) => giaoViec(q, truong, { ten: "test nhân viên", ket_thuc: "2099-12-31", phan_viec: [NG(nv.id, nv.ten)] }));
    const p = await pvCua(ma); // đọc NGOÀI tx — PGlite một kết nối, đọc trong tx là treo
    expect(await tx((q) => coThePhanCong(q, nv, p))).toBe(false);
  });
});

describe("③c làm trưởng ở (db/86, Mr. Đại chốt 10/10) + giao chuyển tiếp không ngang/ngược", () => {
  it("trưởng phòng kiêm BQLDA QT làm nhân viên: khai 'làm trưởng ở' P.KT&VH thì không còn quyền trưởng ở BQLDA QT; không khai thì như cũ", async () => {
    const q = await layQ();
    await q.query("INSERT INTO identity.kiem_nhiem (nguoi_dung_id, don_vi_id, chuc_vu) VALUES ('truong.ktvh@scigroup.vn', 'bqlda-qt', 'Nhóm chuẩn bị sản xuất') ON CONFLICT DO NOTHING");
    const sonCu = await nguoi("truong.ktvh@scigroup.vn");
    expect(await tx((qq) => phamViGiao(qq, sonCu))).toContain("bqlda-qt");
    await q.query("INSERT INTO identity.truong_tai (nguoi_dung_id, don_vi_id) VALUES ('truong.ktvh@scigroup.vn', 'p-ktvh') ON CONFLICT DO NOTHING");
    const son = await nguoi("truong.ktvh@scigroup.vn");
    const pv = await tx((qq) => phamViGiao(qq, son));
    expect(pv).toContain("p-ktvh");
    expect(pv).not.toContain("bqlda-qt");
    expect((await tx((qq) => nguoiNhanChuyenTiep(qq, son))).has("nv.bqlda@scigroup.vn")).toBe(false);
    expect(await tx((qq) => dauDonVi(qq, "bqlda-qt"))).not.toContain(son.id); // chuông "đầu đơn vị" BQLDA QT không còn tới
    await q.query("DELETE FROM identity.truong_tai WHERE nguoi_dung_id = 'truong.ktvh@scigroup.vn'");
    await q.query("DELETE FROM identity.kiem_nhiem WHERE nguoi_dung_id = 'truong.ktvh@scigroup.vn' AND don_vi_id = 'bqlda-qt'");
  });
  it("trưởng không thấy lãnh đạo kiêm trưởng phòng mình; quản trị viên vẫn là người nhận của lãnh đạo (chốt 10/10)", async () => {
    const q = await layQ();
    await q.query("INSERT INTO identity.kiem_nhiem (nguoi_dung_id, don_vi_id, chuc_vu) VALUES ('photgd@scigroup.vn', 'p-dtpc', 'Trưởng phòng') ON CONFLICT DO NOTHING");
    const nhan = await tx(async (qq) => nguoiNhanChuyenTiep(qq, truong));
    expect(nhan.has("photgd@scigroup.vn")).toBe(false);
    expect(nhan.has(nv.id)).toBe(true);
    expect((await tx((qq) => nguoiNhanChuyenTiep(qq, tgd))).has("quantri@scigroup.vn")).toBe(true);
    await q.query("DELETE FROM identity.kiem_nhiem WHERE nguoi_dung_id = 'photgd@scigroup.vn' AND don_vi_id = 'p-dtpc'");
  });
});

describe("④ người phân công nhận tin (test đêm 01/10: trưởng phòng mất dấu việc đã phân công)", () => {
  it("nhân viên được gia hạn / báo xong → người phân công nhận chuông; danh sách @ của nhân viên có người phân công", async () => {
    const ma = await tx((q) => giaoViec(q, truong, { ten: "test báo người phân công", ket_thuc: "2099-12-31", phan_viec: [DV("bqlda-qt", "BQLDA QT")] }));
    const p = await pvCua(ma);
    await tx((q) => phanCong(q, gdBqlda, { phan_viec_id: p.id, nguoi_id: nvBqlda.id }));
    const tinMoi = async (id: string) =>
      (await (await layQ()).query<{ loai: string; noi_dung: string }>("SELECT loai, noi_dung FROM docflow.thong_bao WHERE nguoi_nhan = $1 ORDER BY id DESC LIMIT 1", [id])).rows[0];
    await tx((q) => giaHan(q, truong, { cong_viec_id: ma, phan_viec_id: p.id, ket_thuc: "2100-01-15", ly_do: "test" }));
    expect(await tinMoi(gdBqlda.id)).toMatchObject({ loai: "gia_han", noi_dung: expect.stringMatching(/bạn phân công.*15\/01\/2100/) });
    const tag = await tx((q) => nguoiTagDuoc(q, nvBqlda, ma));
    expect(tag.map((x) => x.id)).toContain(gdBqlda.id);
    await tx((q) => ketThucPhanViec(q, nvBqlda, p.id, { ghi_chu: "xong" }));
    expect(await tinMoi(gdBqlda.id)).toMatchObject({ loai: "ket_thuc_phan_viec", noi_dung: expect.stringMatching(/bạn phân công.*đã xong/) });
  });
});
