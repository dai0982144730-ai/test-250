// Mr. Đại chốt 29/10/2026 — gom việc theo người (tên đậm, A–Z theo tên riêng, việc chung cuối) · hộp «Giao cho cá nhân» · công ty độc lập dừng
import { describe, it, expect } from "vitest";
import { gomTheoNguoi, type ViecO } from "@/components/phong/viec";
import { oDemDungOCongTy } from "@/components/phong/doi-viec";
import { nhomCaNhanTheoDonVi, type DonViNoiNhan, type NguoiNoiNhan } from "@/lib/cay-viec/noi-nhan-thuan";

const v = (ma: string, nguoiTen: string | null) => ({ ma, nguoiTen }) as unknown as ViecO;

describe("gom việc theo người", () => {
  it("xếp A–Z theo tên riêng (chữ cuối), việc chung cuối cùng", () => {
    const r = gomTheoNguoi([v("1", "Quách Thị Thanh Thủy"), v("2", null), v("3", "Nguyễn Văn An"), v("4", "Hoàng Phú Thịnh"), v("5", "Nguyễn Văn An")]);
    expect(r.map((g) => g.nguoi)).toEqual(["Nguyễn Văn An", "Hoàng Phú Thịnh", "Quách Thị Thanh Thủy", null]);
    expect(r[0].ds.map((x) => x.ma)).toEqual(["3", "5"]);
    expect(r[3].ds.map((x) => x.ma)).toEqual(["2"]);
  });
  it("việc nhiều người chủ trì hiện ở từng người", () => {
    const r = gomTheoNguoi([v("1", "Lê An, Trần Bình")]);
    expect(r.map((g) => g.nguoi)).toEqual(["Lê An", "Trần Bình"]);
  });
});

describe("hộp giao cho cá nhân", () => {
  const dv = (id: string, loai: string, cap: number, thu_tu: number): DonViNoiNhan => ({ id, ten: id, ten_ngan: id, cap, cha_id: null, loai, thu_tu });
  const donVi = [dv("bld-ct", "chuc_danh", 1, 1), dv("p-dtpc", "phong", 2, 2), dv("p-hcth", "phong", 2, 3)];
  const ng = (id: string, ten: string, ...d: string[]): NguoiNoiNhan => ({ id, ten, dv: null, don_vi_ids: d });
  const nguoi = [ng("a", "Lê Văn Bình", "p-hcth"), ng("b", "Đỗ Thị An", "p-dtpc"), ng("c", "Phạm Chủ Tịch", "bld-ct"), ng("d", "Ẩn Danh", "p-dtpc")];
  it("Ban lãnh đạo đứng đầu, rồi đơn vị theo cây; trong nhóm A–Z theo tên riêng; chỉ người trong danh sách được giao", () => {
    const r = nhomCaNhanTheoDonVi(donVi, nguoi, ["a", "b", "c"], "b");
    expect(r.map((g) => g.don_vi)).toEqual(["Ban lãnh đạo", "p-dtpc", "p-hcth"]);
    expect(r[1].nguoi).toEqual([{ id: "b", ten: "Đỗ Thị An", toi: true }]);
  });
});

describe("công ty độc lập: việc đơn vị con dừng ở công ty", () => {
  const theoId = { "bld": {}, "p-dtpc": { cha: "bld" }, "sci-enc": { cha: "p-dtpc" }, "bdh-1": { cha: "sci-enc" } } as unknown as Record<string, { cha: string | null }>;
  const dung = new Set(["sci-enc"]);
  it("ô con của E&C đếm tới E&C, không lên P.ĐT&PC", () => {
    expect(oDemDungOCongTy(["bdh-1"], dung, theoId, "bld")?.sort()).toEqual(["bdh-1", "sci-enc"]);
  });
  it("ô không dưới công ty độc lập thì để mặc định (null)", () => {
    expect(oDemDungOCongTy(["p-dtpc"], dung, theoId, "bld")).toBeNull();
  });
});
