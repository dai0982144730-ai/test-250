// Đóng việc (kết thúc phần việc kèm báo cáo ngắn) → cấp trên của bộ phận được báo:
// BQLDA/PMC/E&C → P.ĐT&PC · nhà máy → P.KT&VH · các phòng → Ban lãnh đạo · lãnh đạo (chức danh) → mọi phòng + Ban lãnh đạo.
import { describe, it, expect, beforeAll } from "vitest";
import { csdlMoi, nguoi } from "../helpers/csdl";
import { query, tx } from "@/lib/db";
import type { DauVaoSoCai, NguoiDungPhien } from "@/lib/types";
import { chiTietViec, ghiVaoSoCai, ketThucPhanViec } from "@/lib/so-cai/dich-vu";

async function taoViec(donVi: { id: string; ten: string }, ten: string): Promise<string> {
  const dv: DauVaoSoCai = {
    tai_lieu_id: null,
    phien_ban: null,
    mau_ma: null,
    nhan: `${donVi.ten} · thử`,
    don_vi_id: donVi.id,
    cap: 3,
    nguoi_gui: "quantri@scigroup.vn",
    ngay_gui: new Date().toISOString(),
    cong_viec: [{ ten, phu_trach: [{ loai: "don_vi", id: donVi.id, ten: donVi.ten }], ket_thuc: "2026-12-31", nguon_bang: "bang_cong_viec", dong_so: 1 }],
  };
  const [r] = await tx((q) => ghiVaoSoCai(q, dv));
  return r.cong_viec_id!;
}

async function dong(nd: NguoiDungPhien, cvId: string, baoCao: string) {
  const ct = await tx((q) => chiTietViec(q, cvId));
  await tx((q) => ketThucPhanViec(q, nd, ct!.phan_viec[0].id, { ghi_chu: baoCao }));
}

async function nhanDuoc(email: string, chu: string): Promise<boolean> {
  const { rows } = await query("SELECT 1 FROM docflow.thong_bao WHERE nguoi_nhan = $1 AND noi_dung LIKE $2", [email, `%${chu}%`]);
  return rows.length > 0;
}

describe("đóng việc báo cấp trên", () => {
  beforeAll(async () => {
    await csdlMoi();
    // Một chức danh lãnh đạo trong Ban TGĐ (như Cài đặt → Đơn vị, chức danh)
    await query(
      `INSERT INTO identity.don_vi (id, ten, ten_ngan, cap, cha_id, loai, thu_tu) VALUES ('bld-tgd', 'Tổng Giám đốc · Thử', 'TGĐ · Thử', 1, 'ban-tgd', 'chuc_danh', 3)`,
    );
    await query("UPDATE identity.nguoi_dung SET don_vi_id = 'bld-tgd' WHERE id = 'tgd@scigroup.vn'");
  });

  it("BQLDA đóng → P.ĐT&PC nhận kèm báo cáo, P.KT&VH không", async () => {
    const id = await taoViec({ id: "bqlda-qt", ten: "BQLDA Quảng Trị" }, "Việc BQLDA");
    await dong(await nguoi("gd.bqlda@scigroup.vn"), id, "đã xong ở hiện trường");
    expect(await nhanDuoc("truong.dtpc@scigroup.vn", "đã xong ở hiện trường")).toBe(true);
    expect(await nhanDuoc("truong.ktvh@scigroup.vn", "đã xong ở hiện trường")).toBe(false);
  });

  it("nhà máy đóng → P.KT&VH nhận", async () => {
    const id = await taoViec({ id: "nm-namxe", ten: "Nhà máy thủy điện Nậm Xe" }, "Việc nhà máy");
    await dong(await nguoi("gd.namxe@scigroup.vn"), id, "relay đã thay");
    expect(await nhanDuoc("truong.ktvh@scigroup.vn", "relay đã thay")).toBe(true);
  });

  it("phòng đóng → Ban lãnh đạo nhận", async () => {
    const id = await taoViec({ id: "p-hcth", ten: "Phòng Hành chính Tổng hợp" }, "Việc HCTH");
    await dong(await nguoi("truong.hcth@scigroup.vn"), id, "đã tổ chức hội nghị");
    expect(await nhanDuoc("photgd@scigroup.vn", "đã tổ chức hội nghị")).toBe(true);
    expect(await nhanDuoc("truong.dtpc@scigroup.vn", "đã tổ chức hội nghị")).toBe(false);
  });

  it("lãnh đạo đóng → mọi phòng + Ban lãnh đạo nhận", async () => {
    const id = await taoViec({ id: "bld-tgd", ten: "Tổng Giám đốc · Thử" }, "Việc của TGĐ");
    await dong(await nguoi("tgd@scigroup.vn"), id, "đã ký quyết định");
    for (const e of ["truong.dtpc@scigroup.vn", "truong.ktvh@scigroup.vn", "truong.hcth@scigroup.vn", "truong.tckt@scigroup.vn", "photgd@scigroup.vn"])
      expect(await nhanDuoc(e, "đã ký quyết định"), e).toBe(true);
    expect(await nhanDuoc("gd.namxe@scigroup.vn", "đã ký quyết định")).toBe(false);
  });
});
