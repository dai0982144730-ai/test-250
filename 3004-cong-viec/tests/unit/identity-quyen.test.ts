// Phạm vi quyền: của mình / đơn vị / đơn vị và cấp dưới / toàn bộ; người chưa gán đơn vị; kiêm nhiệm.
import { describe, it, expect, beforeAll } from "vitest";
import { csdlMoi, nguoi } from "../helpers/csdl";
import { layQ } from "@/lib/db";
import {
  coQuyen,
  duocQuanLyNguoi,
  duocTraoVaiTro,
  phamViTiep,
  layCayDonVi,
  datKiemNhiem,
  taoVaiTro,
  suaNguoiDung,
} from "@sci/identity/server";
import { nguCanh } from "@/lib/cau-hinh/cau-noi-identity";
import type { DonVi } from "@/lib/types";

let cay: DonVi[];

describe("identity — phạm vi quyền", () => {
  beforeAll(async () => {
    await csdlMoi();
    cay = await layCayDonVi(await layQ());
  });

  it("xoay vòng phạm vi khi bấm ô ma trận", () => {
    expect(phamViTiep(null)).toBe("cua_minh");
    expect(phamViTiep("cua_minh")).toBe("don_vi");
    expect(phamViTiep("don_vi")).toBe("don_vi_va_cap_duoi");
    expect(phamViTiep("don_vi_va_cap_duoi")).toBe("toan_bo");
    expect(phamViTiep("toan_bo")).toBeNull();
  });

  it("của mình: nhân viên chỉ xóa file mình tải lên", async () => {
    const hung = await nguoi("hung.tv@scigroup.vn");
    expect(hung.quyen["tai_lieu.xoa"]).toBe("cua_minh");
    expect(coQuyen(hung, "tai_lieu.xoa", { chu_so_huu: hung.id, don_vi_id: "p-dtpc" }, cay)).toBe(true);
    expect(coQuyen(hung, "tai_lieu.xoa", { chu_so_huu: "nguoi-khac", don_vi_id: "p-ktvh" }, cay)).toBe(false);
  });

  it("đơn vị: trưởng phòng xóa được trong đơn vị mình, không được ở đơn vị con", async () => {
    const truong = await nguoi("truong.dtpc@scigroup.vn");
    expect(coQuyen(truong, "tai_lieu.xoa", { chu_so_huu: "x", don_vi_id: "p-dtpc" }, cay)).toBe(true);
    expect(coQuyen(truong, "tai_lieu.xoa", { chu_so_huu: "x", don_vi_id: "bqlda-qt" }, cay)).toBe(false);
  });

  it("đơn vị và cấp dưới: trưởng ĐT&PC kiểm soát báo cáo BQLDA (đơn vị con), không kiểm soát NM Nậm Xe", async () => {
    const truong = await nguoi("truong.dtpc@scigroup.vn");
    expect(coQuyen(truong, "tai_lieu.kiem_soat", { don_vi_id: "bqlda-qt" }, cay)).toBe(true);
    expect(coQuyen(truong, "tai_lieu.kiem_soat", { don_vi_id: "p-dtpc" }, cay)).toBe(true);
    expect(coQuyen(truong, "tai_lieu.kiem_soat", { don_vi_id: "nm-namxe" }, cay)).toBe(false);
    // thiếu cây đơn vị thì không suy ra được cấp dưới
    expect(coQuyen(truong, "tai_lieu.kiem_soat", { don_vi_id: "bqlda-qt" }, [])).toBe(false);
  });

  it("toàn bộ: lãnh đạo kiểm soát mọi đơn vị; quản trị viên có mọi quyền", async () => {
    const tgd = await nguoi("tgd@scigroup.vn");
    expect(coQuyen(tgd, "tai_lieu.kiem_soat", { don_vi_id: "nm-namxe" }, cay)).toBe(true);
    expect(coQuyen(tgd, "nguoi_dung.quan_ly")).toBe(false);
    const qt = await nguoi("quantri@scigroup.vn");
    expect(coQuyen(qt, "cau_hinh.sua", { don_vi_id: "nm-namxe" }, cay)).toBe(true);
  });

  it("người chưa gán đơn vị: có quyền tối thiểu, không có quyền theo đơn vị, cấp thấp nhất", async () => {
    const moi = await nguoi("nguoimoi@scigroup.vn");
    expect(moi.don_vi_id).toBeNull();
    expect(moi.don_vi_ids).toEqual([]);
    expect(moi.cap).toBe(3);
    expect(coQuyen(moi, "tai_lieu.gui")).toBe(true); // có quyền ở phạm vi nào đó
    expect(coQuyen(moi, "tai_lieu.gui", { don_vi_id: "p-ktvh" }, cay)).toBe(false);
    expect(coQuyen(moi, "tai_lieu.tai_len")).toBe(false); // tải thẳng lên thư mục: không cấp sẵn
    expect(coQuyen(moi, "tai_lieu.xem", { don_vi_id: "p-ktvh" }, cay)).toBe(true); // xem: toàn bộ
    // chỉ người quản trị toàn bộ mới quản lý được người chưa gán đơn vị
    const truongHcth = await nguoi("truong.hcth@scigroup.vn");
    const qt = await nguoi("quantri@scigroup.vn");
    expect(duocQuanLyNguoi(qt, { id: moi.id, don_vi_id: null }, cay)).toBe(true);
    expect(duocQuanLyNguoi(truongHcth, { id: moi.id, don_vi_id: null }, cay)).toBe(false);
  });

  it("kiêm nhiệm: người thuộc thêm đơn vị khác có quyền đơn vị ở cả hai nơi", async () => {
    const q = await layQ();
    const qt = await nguoi("quantri@scigroup.vn");
    await datKiemNhiem(q, nguCanh(qt), "truong.ktvh@scigroup.vn", [{ don_vi_id: "p-tckt", chuc_vu: "Phó phòng" }]);
    const vinh = await nguoi("truong.ktvh@scigroup.vn");
    expect(vinh.don_vi_ids).toEqual(["p-ktvh", "p-tckt"]);
    expect(coQuyen(vinh, "tai_lieu.xoa", { chu_so_huu: "x", don_vi_id: "p-tckt" }, cay)).toBe(true);
    expect(coQuyen(vinh, "tai_lieu.xoa", { chu_so_huu: "x", don_vi_id: "p-hcth" }, cay)).toBe(false);
    // kiêm nhiệm trùng đơn vị chính thì bỏ qua
    await datKiemNhiem(q, nguCanh(qt), "truong.ktvh@scigroup.vn", [{ don_vi_id: "p-ktvh" }]);
    expect((await nguoi("truong.ktvh@scigroup.vn")).don_vi_ids).toEqual(["p-ktvh"]);
  });

  it("quản lý người dùng theo phạm vi: vai trò Nhân sự HCTH (đơn vị và cấp dưới) chỉ sửa người trong cây của mình", async () => {
    const q = await layQ();
    const qt = await nguoi("quantri@scigroup.vn");
    await taoVaiTro(q, nguCanh(qt), { id: "quan-ly-dtpc", ten: "Quản lý người dùng ĐT&PC", quyen: { "nguoi_dung.quan_ly": "don_vi_va_cap_duoi" } });
    await suaNguoiDung(q, nguCanh(qt), "nv.dtpc@scigroup.vn", { vai_tro: ["nhan-vien", "quan-ly-dtpc"] });
    const ha = await nguoi("nv.dtpc@scigroup.vn");
    expect(duocQuanLyNguoi(ha, { id: "nv.bqlda@scigroup.vn", don_vi_id: "bqlda-qt" }, cay)).toBe(true);
    expect(duocQuanLyNguoi(ha, { id: "hung.tv@scigroup.vn", don_vi_id: "p-ktvh" }, cay)).toBe(false);
    // không trao được vai trò rộng hơn quyền mình có
    expect(duocTraoVaiTro(ha, { "nguoi_dung.quan_ly": "don_vi" })).toBe(true);
    expect(duocTraoVaiTro(ha, { "nguoi_dung.quan_ly": "toan_bo" })).toBe(false);
    expect(duocTraoVaiTro(ha, { "cau_hinh.sua": "toan_bo" })).toBe(false);
  });
});
