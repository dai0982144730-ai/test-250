// Danh mục dự án kéo từ Main (LOI-DUNG-CHUNG 6g.6, Đợt 1 — Mr. Đại chốt 03/10/2026): hàm thuần trộn Main + trường riêng tại chỗ
import { describe, it, expect } from "vitest";
import { MAC_DINH, type CauHinh } from "@/lib/cau-hinh/mac-dinh";
import { MA_CU, doiMaCu, ketLuanCay, tronDuAn, type DuAnMain } from "@/lib/du-an-main-thuan";
import { chonDuAn } from "@/lib/cay-viec/dung-man";
import { G_CHUA_BAN, xepDuAn } from "@/lib/phong/du-an-thuan";
import { chuoiOnDinh, soSanhCauHinh } from "@/lib/cau-hinh/ghi";

type Ds = CauHinh["du_an"];
const TAI: Ds = [
  { id: "da-hv", ten: "Hướng Việt", loai: "Điện gió", nhom: "sci", don_vi: ["bqlda-qt"], ban_dieu_hanh: "bdh-hv", ten_khac: ["HV cũ tại chỗ"], ma_tien_do: "dien-gio-huong-viet-hv-du-lieu" },
  { id: "TT", ten: "Tân Thành", loai: "Điện gió", nhom: "sci", don_vi: ["bqlda-qt", "sci-pmc"], ten_khac: [] },
  { id: "da-x", ten: "Dự án chỉ có ở đây", loai: "", nhom: "khac", don_vi: [], ten_khac: [] },
];
const MAIN: DuAnMain[] = [
  { id: "default", ma: "", ten: "Dự án demo" },
  { id: "tan-thanh", ma: "TT", ten: "Tân Thành", nhom: "sci", tenKhac: ["ĐG Tân Thành", "tân thành"] },
  { id: "huong-viet", ma: "hv", ten: "Hướng Việt", nhom: "sci", tenKhac: ["ĐG Hướng Việt"] },
  { id: "ia-dreng-1", ma: "IAD1", ten: "IA Dreng 1", nhom: "sci" },
  { id: "luu", ma: "OLD", ten: "Dự án đã lưu trữ", luuTru: true },
];

describe("kéo danh mục dự án từ Main", () => {
  it("Main giữ mã · tên · nhóm · tên gọi khác; tại chỗ giữ loại · Ban QLDA · đơn vị làm · BĐH; mã Tiến độ = mã ngắn khi có cây", () => {
    const t = tronDuAn(MAIN, TAI, new Set(["HV"]));
    const hv = t.ds.find((d) => d.id === "HV")!;
    expect(hv).toMatchObject({ ten: "Hướng Việt", loai: "Điện gió", nhom: "sci", don_vi: ["bqlda-qt"], ban_dieu_hanh: "bdh-hv", ten_khac: ["ĐG Hướng Việt"], ma_tien_do: "HV" });
    const tt = t.ds.find((d) => d.id === "TT")!;
    expect(tt.don_vi).toEqual(["bqlda-qt", "sci-pmc"]);
    expect(tt.ma_tien_do).toBeUndefined(); // Tiến độ chưa có cây → không điền
    expect(tt.ten_khac).toEqual(["ĐG Tân Thành"]); // bỏ trùng tên chính (không phân biệt hoa thường)
  });

  it("bỏ dự án lưu trữ / không mã; dự án Main mới → báo mới + chưa chọn Ban QLDA; dự án chỉ có tại chỗ giữ nguyên; giữ thứ tự cũ", () => {
    const t = tronDuAn(MAIN, TAI, new Set());
    expect(t.ds.map((d) => d.id)).toEqual(["HV", "TT", "IAD1", "da-x"]);
    expect(t.moi).toEqual(["IAD1"]);
    expect(t.thieuBan).toEqual(["IAD1"]);
    expect(t.chiTaiCho).toEqual(["Dự án chỉ có ở đây"]);
    expect(t.ds.find((d) => d.id === "IAD1")?.don_vi).toEqual([]);
  });

  it("kéo lần hai không đổi gì (để không sinh phiên bản Cài đặt mới mỗi 30 phút)", () => {
    const l1 = tronDuAn(MAIN, TAI, new Set(["HV"])).ds;
    const l2 = tronDuAn(MAIN, l1, new Set(["HV"])).ds;
    expect(JSON.stringify(l2)).toBe(JSON.stringify(l1));
  });

  it("soát 03/10 điểm 1: Tiến độ tắt/chậm = CHƯA BIẾT, không phải 'không có cây'", () => {
    expect(ketLuanCay({ ok: true, du_lieu: { totalTasks: 330 } })).toBe(true);
    expect(ketLuanCay({ ok: true, du_lieu: { totalTasks: 0 } })).toBe(false);
    expect(ketLuanCay({ ok: false, ma_loi: "KHONG_CO_DU_LIEU" })).toBe(false); // Tiến độ trả lời: không có dự án này
    expect(ketLuanCay({ ok: false, ma_loi: "AGENT_KHONG_SAN_SANG" })).toBeNull(); // tắt / ngắt mạch
    expect(ketLuanCay({ ok: false, ma_loi: "HET_HAN_CHO" })).toBeNull();
    expect(ketLuanCay({ ok: false, ma_loi: "HET_HAN_CHO" }, true)).toBe(true); // có bản nhớ thì dùng lại
    expect(ketLuanCay(null)).toBeNull();
  });

  it("chưa biết thì giữ nguyên 'Mã bên Tiến độ' đang có — HV không mất cây khi bật máy lúc Tiến độ chưa lên", () => {
    const l1 = tronDuAn(MAIN, TAI, new Set(["HV"])).ds;
    const l2 = tronDuAn(MAIN, l1, new Set(), new Set(["HV", "TT", "IAD1"])).ds;
    expect(l2.find((d) => d.id === "HV")?.ma_tien_do).toBe("HV");
    expect(l2.find((d) => d.id === "TT")?.ma_tien_do).toBeUndefined(); // chưa có thì vẫn chưa có
    expect(JSON.stringify(l2)).toBe(JSON.stringify(l1)); // không đổi gì → không sinh phiên bản Cài đặt
    expect(tronDuAn(MAIN, l1, new Set()).ds.find((d) => d.id === "HV")?.ma_tien_do).toBeUndefined(); // Tiến độ trả lời "không có" thì mới bỏ
  });

  it("soát 03/10 điểm 9: Main đổi nhóm — SCI→Loại khác bỏ Ban QLDA + BĐH giữ đơn vị làm; Loại khác→SCI chờ chọn Ban QLDA", () => {
    const tai: Ds = [
      { id: "TT", ten: "Tân Thành", loai: "", nhom: "sci", don_vi: ["bqlda-qt", "sci-pmc"], ban_dieu_hanh: "bdh-tt", ten_khac: [] },
      { id: "NM1", ten: "Nậm Mô 1", loai: "", nhom: "khac", don_vi: ["sci-pmc", "sci-enc"], ten_khac: [] },
    ];
    const main: DuAnMain[] = [
      { id: "tan-thanh", ma: "TT", ten: "Tân Thành", nhom: "khac" },
      { id: "nam-mo-1", ma: "NM1", ten: "Nậm Mô 1", nhom: "sci" },
    ];
    const t = tronDuAn(main, tai, new Set());
    expect(t.ds.find((d) => d.id === "TT")).toMatchObject({ nhom: "khac", don_vi: ["sci-pmc"] });
    expect(t.ds.find((d) => d.id === "TT")?.ban_dieu_hanh).toBeUndefined();
    expect(t.ds.find((d) => d.id === "NM1")).toMatchObject({ nhom: "sci", don_vi: [] });
    expect(t.thieuBan).toEqual(["NM1"]);
  });

  it("6g.6 bước E: Main giữ 3 trường gắn đơn vị → lấy theo Main (kể cả xoá BĐH); dự án Main chưa mang trường giữ bản tại chỗ; Main bản cũ → như Đợt 1", () => {
    const main: DuAnMain[] = [
      { id: "tan-thanh", ma: "TT", ten: "Tân Thành", nhom: "sci", donVi: ["bqlda-lao", "sci-enc"], banDieuHanh: null },
      { id: "huong-viet", ma: "HV", ten: "Hướng Việt", nhom: "sci" }, // bộ chuyển chưa ghép được → giữ tại chỗ
      { id: "ia-dreng-1", ma: "IAD1", ten: "IA Dreng 1", nhom: "sci", donVi: [], banDieuHanh: null },
    ];
    const t = tronDuAn(main, TAI, new Set());
    expect(t.donViTuMain).toBe(true);
    const tt = t.ds.find((d) => d.id === "TT")!;
    expect(tt.don_vi).toEqual(["bqlda-lao", "sci-enc"]);
    expect(tt.ban_dieu_hanh).toBeUndefined();
    expect(t.ds.find((d) => d.id === "HV")).toMatchObject({ don_vi: ["bqlda-qt"], ban_dieu_hanh: "bdh-hv" });
    expect(t.thieuBan).toEqual(["IAD1"]);
    const tt2 = tronDuAn([{ ...main[0], banDieuHanh: "bdh-tt" }], TAI, new Set()).ds.find((d) => d.id === "TT")!;
    expect(tt2.ban_dieu_hanh).toBe("bdh-tt");
    // Main bản cũ (không dự án nào mang donVi) → giữ tại chỗ, Cài đặt còn sửa được
    const cu = tronDuAn(MAIN, TAI, new Set());
    expect(cu.donViTuMain).toBe(false);
    expect(cu.ds.find((d) => d.id === "TT")?.don_vi).toEqual(["bqlda-qt", "sci-pmc"]);
    // kéo lần hai không đổi
    expect(tronDuAn(main, t.ds, new Set()).ds).toEqual(t.ds);
  });

  it("so cấu hình không phụ thuộc thứ tự trường (jsonb xếp lại khoá) — không sinh phiên bản rỗng mỗi lượt kéo", () => {
    const a = [{ id: "HV", ten: "Hướng Việt", don_vi: ["bqlda-qt"], ban_dieu_hanh: "bdh-hv", ten_khac: ["x"] }];
    const b = [{ ten_khac: ["x"], ban_dieu_hanh: "bdh-hv", id: "HV", don_vi: ["bqlda-qt"], ten: "Hướng Việt" }];
    expect(soSanhCauHinh(a, b)).toEqual([]);
    expect(chuoiOnDinh(a)).toBe(chuoiOnDinh(b));
    expect(soSanhCauHinh(a, [{ ...b[0], don_vi: ["bqlda-lao"] }])).toHaveLength(1);
    expect(soSanhCauHinh([1, 2], [2, 1])).toHaveLength(1); // thứ tự phần tử mảng vẫn tính
  });

  it("link cũ ?du_an=da-hv vẫn mở đúng dự án; bảng mã cũ phủ hết danh mục mặc định", () => {
    expect(doiMaCu("da-nkh1")).toBe("NK1");
    expect(doiMaCu("HV")).toBe("HV");
    expect(chonDuAn(MAC_DINH.du_an, "da-hv")?.id).toBe("HV");
    expect(chonDuAn(MAC_DINH.du_an, "HV")?.id).toBe("HV");
    expect(chonDuAn(MAC_DINH.du_an, "khong-co")).toBeUndefined();
    const ma = new Set(Object.values(MA_CU));
    for (const d of MAC_DINH.du_an) expect(ma.has(d.id)).toBe(true);
  });

  it("cây Dự án: dự án SCI đầu tư chưa chọn Ban QLDA treo dưới nút 'Chưa chọn Ban QLDA', đứng sau các ban", () => {
    const bc = xepDuAn([...MAC_DINH.du_an, { id: "IAD1", ten: "IA Dreng 1", loai: "", nhom: "sci", don_vi: [], ten_khac: [] }]);
    expect(bc.con[G_CHUA_BAN]).toEqual(["IAD1"]);
    expect(bc.con["g-sci"].at(-1)).toBe(G_CHUA_BAN);
    expect(bc.ten[G_CHUA_BAN]).toBe("Chưa chọn Ban QLDA");
    expect(xepDuAn(MAC_DINH.du_an).con["g-sci"]).not.toContain(G_CHUA_BAN);
  });
});
