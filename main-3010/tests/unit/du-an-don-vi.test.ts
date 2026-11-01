// 3 trường gắn đơn vị của dự án ở Main (LOI-DUNG-CHUNG 6g.6 Đợt 2 bước E — Mr. Đại chốt 03/10/2026 "2a").
import { THU_MUC_DU_AN_TEST } from "../ho-tro/du-an-du-lieu-rieng";
import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { doiNhomDonVi, kiemDonViDuAn } from "@/lib/du-an-don-vi";
import { listProjects, updateProject } from "@/lib/projects";
import { banDungChung } from "@/lib/he-thong-dung-chung";

const DV = (id: string, cap: number, them: Record<string, unknown> = {}) => ({ id, ten: id, ten_ngan: id, cap, cha_id: null, loai: "don_vi", thu_tu: 0, active: true, chuc_danh: null, chuc_danh_ngan: null, chuc_nang: null, uy_quyen_truong: null, ...them });
const CAY = [DV("bqlda-lao", 3), DV("sci-pmc", 3), DV("sci-enc", 3), DV("bdh-namkhian1", 4), DV("p-cu", 2, { active: false })];

describe("luật 3 trường gắn đơn vị", () => {
  it("SCI đầu tư: Ban QLDA + đơn vị làm + BĐH đúng → đạt; trùng / đơn vị lạ / ngừng hoạt động / BĐH ở Loại khác → chặn", () => {
    expect(kiemDonViDuAn("sci", { donVi: ["bqlda-lao", "sci-pmc"], banDieuHanh: "bdh-namkhian1" }, CAY)).toBeNull();
    expect(kiemDonViDuAn("sci", { donVi: [], banDieuHanh: null }, CAY)).toBeNull(); // Main mới khai — chưa chọn Ban QLDA vẫn lưu được
    expect(kiemDonViDuAn("sci", { donVi: ["sci-pmc", "sci-pmc"], banDieuHanh: null }, CAY)).toMatch(/hai lần/);
    expect(kiemDonViDuAn("sci", { donVi: ["khong-co"], banDieuHanh: null }, CAY)).toMatch(/Ban QLDA: đơn vị "khong-co" không có/);
    expect(kiemDonViDuAn("khac", { donVi: ["p-cu"], banDieuHanh: null }, CAY)).toMatch(/Đơn vị làm: .*ngừng hoạt động/);
    expect(kiemDonViDuAn("khac", { donVi: ["sci-enc"], banDieuHanh: "bdh-namkhian1" }, CAY)).toMatch(/chỉ dùng cho dự án SCI đầu tư/);
    expect(kiemDonViDuAn(undefined, { donVi: ["sci-enc"], banDieuHanh: null }, CAY)).toMatch(/Chọn nhóm/);
  });
  it("đổi nhóm: SCI → Loại khác bỏ Ban QLDA + BĐH, giữ đơn vị làm; Loại khác → SCI để trống chờ chọn Ban QLDA", () => {
    expect(doiNhomDonVi({ donVi: ["bqlda-lao", "sci-pmc"], banDieuHanh: "bdh-namkhian1" }, "sci", "khac")).toEqual({ donVi: ["sci-pmc"], banDieuHanh: null });
    expect(doiNhomDonVi({ donVi: ["sci-enc"], banDieuHanh: null }, "khac", "sci")).toEqual({ donVi: [], banDieuHanh: null });
  });
});

describe("lưu ở Main", () => {
  it("chưa có tổ chức → chặn, câu báo bảo chạy bộ chuyển; có tổ chức → lưu, giao sang agent; đổi nhóm thì 3 trường đi theo", () => {
    expect(updateProject("nam-khian-1", { donVi: ["bqlda-lao"] })).toMatchObject({ ok: false, error: expect.stringMatching(/bộ chuyển người/) });
    fs.writeFileSync(path.join(THU_MUC_DU_AN_TEST, "to-chuc.json"), JSON.stringify({ don_vi: CAY, kiem_nhiem: [], uy_quyen_ky: [] }));
    expect(updateProject("nam-khian-1", { donVi: ["bqlda-lao", "sci-pmc", "sci-enc"], banDieuHanh: "bdh-namkhian1" }).ok).toBe(true);
    expect(updateProject("nam-mo-1", { donVi: ["sci-pmc", "khong-co"] })).toMatchObject({ ok: false, error: expect.stringMatching(/không có trong tổ chức/) });
    const nk1 = listProjects(true).find((p) => p.id === "nam-khian-1")!;
    expect(nk1).toMatchObject({ donVi: ["bqlda-lao", "sci-pmc", "sci-enc"], banDieuHanh: "bdh-namkhian1" });
    const giao = banDungChung().duAn.find((d) => d.ma === "NK1")!;
    expect(giao).toMatchObject({ donVi: ["bqlda-lao", "sci-pmc", "sci-enc"], banDieuHanh: "bdh-namkhian1" });
    expect(banDungChung().duAn.find((d) => d.ma === "NM1")).not.toHaveProperty("donVi"); // Main chưa quản dự án này
    expect(updateProject("nam-khian-1", { nhom: "khac" }).ok).toBe(true);
    expect(listProjects(true).find((p) => p.id === "nam-khian-1")).toMatchObject({ donVi: ["sci-pmc", "sci-enc"], banDieuHanh: undefined });
  });
});
