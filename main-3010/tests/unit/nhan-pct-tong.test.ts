// Bảng điều hành — số % luôn đi kèm NHÃN của cổng tiến độ (Mr. Đại chốt 25/09
// "hai số cho hai câu hỏi"): pctTotal = chỉ tính việc nối tới mốc COD,
// pctToanBoViec = toàn bộ việc. Main chỉ ánh xạ, không tự tính.
// Khối mâu thuẫn chéo: mã trạng thái hợp đồng không được in thẳng ra câu.
import { describe, expect, it } from "vitest";
import { cauPctTong } from "@/lib/bang-dieu-hanh/gom";
import { chuTrangThaiHopDong } from "@/lib/bang-dieu-hanh/mau-thuan-cheo";

describe("câu % tổng kèm nhãn", () => {
  it("cổng trả đủ hai số + hai nhãn", () => {
    expect(
      cauPctTong({ pctTong: 3.3, nhanPctTong: "chỉ tính việc nối tới mốc COD", pctToanBo: 6, nhanPctToanBo: "toàn bộ việc" })
    ).toBe("hoàn thành 3,3% (chỉ tính việc nối tới mốc COD) · 6% (toàn bộ việc)");
  });
  it("cổng cũ chưa trả nhãn / chưa trả % toàn bộ → vẫn ghi rõ 'tới mốc COD', không thêm số tự tính", () => {
    expect(cauPctTong({ pctTong: 3.3, nhanPctTong: "", pctToanBo: null, nhanPctToanBo: "" })).toBe(
      "hoàn thành 3,3% (tới mốc COD)"
    );
  });
});

describe("mã trạng thái hợp đồng → chữ", () => {
  it("chua_co_hop_dong nói 'chưa thấy hợp đồng trong kho'", () => {
    expect(chuTrangThaiHopDong("chua_co_hop_dong")).toBe("chưa thấy hợp đồng trong kho");
  });
  it("không có mã nào lọt ra câu", () => {
    for (const ma of ["chua_co_hop_dong", "co_hop_dong_chua_nghiem_thu", "da_nghiem_thu", "khong_tra_duoc", "la", undefined]) {
      expect(chuTrangThaiHopDong(ma)).not.toMatch(/_/);
    }
  });
});
