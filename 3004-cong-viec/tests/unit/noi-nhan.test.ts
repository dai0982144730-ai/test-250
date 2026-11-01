// ============================================================
// TEST: ô "Giao cho" bản gọn — dựng danh sách nơi nhận (src/lib/cay-viec/noi-nhan-thuan.ts, Mr. Đại chốt 04/10/2026 tối)
// Mẫu thu gọn từ sơ đồ thật đo 04/10: Ban TGĐ có 8 chức danh (1 trợ lý), P.ĐT&PC cấp 2 có SCI PMC cấp 3 bên dưới.
// Thuần — không mở CSDL.
// ============================================================
import { describe, expect, it } from "vitest";
import { dungNhomNoiNhan, type DonViNoiNhan, type NguoiNoiNhan } from "@/lib/cay-viec/noi-nhan-thuan";

const dv = (id: string, ten: string, loai: string, cha: string | null, cap: number, thu_tu: number): DonViNoiNhan => ({ id, ten, ten_ngan: ten, cap, cha_id: cha, loai, thu_tu });
const DON_VI: DonViNoiNhan[] = [
  dv("ban-tgd", "Ban Tổng giám đốc", "ban_tgd", null, 1, 1),
  dv("bld-ptgd-dai", "Phó Tổng Giám đốc · Nguyễn Chính Đại", "chuc_danh", "ban-tgd", 1, 7),
  dv("bld-tgd", "Tổng Giám đốc · Trương Bửu Ngọc", "chuc_danh", "ban-tgd", 1, 3),
  dv("bld-tro-ly", "Trợ lý Chủ tịch HĐQT · Nguyễn Văn Thanh", "chuc_danh", "ban-tgd", 1, 8),
  dv("p-dtpc", "Phòng Đầu tư và Pháp chế", "phong", "ban-tgd", 2, 21),
  dv("p-cd", "Phòng Cơ điện", "phong", "ban-tgd", 2, 25),
  dv("sci-pmc", "SCI PMC", "don_vi", "p-dtpc", 3, 31),
  dv("bdh-hv", "BĐH Hướng Việt", "don_vi", "sci-pmc", 4, 51),
];
const NGUOI: NguoiNoiNhan[] = [
  { id: "ptgd.dai", ten: "Nguyễn Chính Đại", dv: "PTGĐ", don_vi_ids: ["bld-ptgd-dai", "p-dtpc"] },
  { id: "thinhhp", ten: "Hoàng Phú Thịnh", dv: "P.ĐT&PC", don_vi_ids: ["p-dtpc"] },
  { id: "cuongdm", ten: "Đỗ Mạnh Cường", dv: "P.CĐ", don_vi_ids: ["p-cd"] },
];

describe("dungNhomNoiNhan", () => {
  it("Ban lãnh đạo bỏ trợ lý, theo thứ tự sơ đồ; cây bỏ Ban TGĐ + chức danh, thụt theo cấp", () => {
    const n = dungNhomNoiNhan(DON_VI, NGUOI, { id: "ptgd.dai", don_vi_ids: ["bld-ptgd-dai", "p-dtpc"] }, "tat_ca");
    expect(n.lanh_dao).toEqual(["bld-tgd", "bld-ptgd-dai"]);
    expect(n.cay).toEqual([
      { id: "p-dtpc", thut: 0 },
      { id: "sci-pmc", thut: 1 },
      { id: "bdh-hv", thut: 2 },
      { id: "p-cd", thut: 0 },
    ]);
  });

  it("gõ @: phạm vi toàn bộ (lãnh đạo / quản trị) thấy cả công ty — khớp máy chủ", () => {
    const n = dungNhomNoiNhan(DON_VI, NGUOI, { id: "ptgd.dai", don_vi_ids: ["bld-ptgd-dai", "p-dtpc"] }, "tat_ca");
    expect(n.ca_nhan.sort()).toEqual(["cuongdm", "ptgd.dai", "thinhhp"]);
  });

  it("gõ @: trưởng đơn vị chỉ thấy người cùng đơn vị + chính mình; phạm vi giao lọc cả lãnh đạo và cây", () => {
    const hep = dungNhomNoiNhan(DON_VI, NGUOI, { id: "thinhhp", don_vi_ids: ["p-dtpc"] }, ["p-dtpc", "sci-pmc"]);
    expect(hep.ca_nhan.sort()).toEqual(["ptgd.dai", "thinhhp"]);
    expect(hep.lanh_dao).toEqual([]);
    expect(hep.cay.map((c) => c.id)).toEqual(["p-dtpc", "sci-pmc"]);
  });
});
