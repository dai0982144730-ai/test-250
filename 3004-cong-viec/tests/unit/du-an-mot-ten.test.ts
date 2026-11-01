// Một dự án một tên + một dự án nhiều đơn vị làm + dò tên dự án trong tên việc (Mr. Đại chốt 03/10/2026)
import { describe, it, expect } from "vitest";
import { duAnHaiTen } from "@/lib/cau-hinh/kiem-tra";
import { MAC_DINH } from "@/lib/cau-hinh/mac-dinh";
import { duAnCuaViec, nutDuAnDuoiDonVi } from "@/lib/phong/du-an-thuan";

describe("dự án — một tên, nhiều đơn vị làm", () => {
  it("chặn hai dòng tên gần trùng (Nam Khian 1 ~ Nậm Khiên 1), không báo khác số (Nậm Mô 1/2); danh mục mặc định sạch", () => {
    expect(duAnHaiTen([{ ten: "Nam Khian 1", ten_khac: [] }, { ten: "Nậm Khiên 1", ten_khac: [] }])).toHaveLength(1);
    expect(duAnHaiTen([{ ten: "Nậm Mô 1" }, { ten: "Nậm Mô 2" }])).toEqual([]);
    expect(duAnHaiTen(MAC_DINH.du_an)).toEqual([]);
    expect(MAC_DINH.du_an.some((d) => d.id === "da-nkh1")).toBe(false);
  });

  it("việc ghi 'Nậm Khiên 1' (tên cũ) về Nam Khian 1; việc ghi 'Công ty' mà tên việc nói dự án thì dò trong tên", () => {
    const ds = MAC_DINH.du_an;
    expect(duAnCuaViec("Nậm Khiên 1", [], ds)).toBe("NK1");
    expect(duAnCuaViec("TĐ Nậm Khiên 1", [], ds)).toBe("NK1");
    expect(duAnCuaViec("Công ty", [], ds, "Bổ sung TMĐT DA Nậm Khiên 1 khoảng 45 tỷ")).toBe("NK1");
    expect(duAnCuaViec("Công ty", [], ds, "GPMB Trụ T12–T18 DA Hướng Việt chưa xong")).toBe("HV");
    expect(duAnCuaViec("Công ty", [], ds, "Họp giao ban tháng 10")).toBeNull();
  });

  it("ô dự án SCI đầu tư treo dưới đơn vị làm (không treo dưới Ban QLDA đứng đầu)", () => {
    const n = nutDuAnDuoiDonVi(MAC_DINH.du_an, new Set(["sci-pmc", "sci-enc", "bqlda-lao"])).filter((x) => x.da === "NK1");
    expect(n.map((x) => x.cha).sort()).toEqual(["sci-enc", "sci-pmc"]);
  });
});
