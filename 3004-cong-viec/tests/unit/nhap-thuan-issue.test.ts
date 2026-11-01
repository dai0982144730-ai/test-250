// Nháp giao việc mặc định của một thẻ issue (đợt ⑤, 06/10/2026 — lib/cay-viec/issue/nhap-thuan.ts): MỘT chỗ cho khối dưới thẻ,
// màn Việc của tôi và cửa base.viec_cho_duyet của Main. Q4: thẻ nhắc (gom theo người) không sinh việc mới. Thuần — không CSDL.
import { describe, it, expect } from "vitest";
import type { TheCanhBao } from "@/lib/cay-viec/issue/model";
import { canGiaoViec, laNutGang, laTheNhac, nguoiTrongKhoa, nhapMacDinh, viecCuCuaThe } from "@/lib/cay-viec/issue/nhap-thuan";

const HOM_NAY = "2026-10-06";
const the = (x: Partial<TheCanhBao>): TheCanhBao => ({
  id: "ISS-2026-41-001",
  nguon: "su-kien",
  mucDo: "red",
  tieuDe: "Thiếu xe tải tại Turbine 04",
  phanTich: "",
  anhHuongCod: 0,
  nguonDuLieu: "",
  deXuat: "Bổ sung 2 xe tải trong tuần",
  dieuKien: "dang-vi-pham",
  xuLy: "chua-ai-dong",
  ghiNhan: [],
  ngayMo: HOM_NAY,
  ...x,
} as TheCanhBao);

describe("nhap-thuan — thẻ nhắc (Q4)", () => {
  it("khoá gom theo người là thẻ nhắc; mã WBS thường thì không", () => {
    expect(laTheNhac({ wbs: "người:u-12" })).toBe(true);
    expect(laTheNhac({ wbs: "xong-giấy:u-12" })).toBe(true);
    expect(laTheNhac({ wbs: "chưa-đóng:u-12" })).toBe(true);
    expect(laTheNhac({ wbs: "7.5.2" })).toBe(false);
    expect(nguoiTrongKhoa("người:u-12")).toBe("u-12");
    expect(nguoiTrongKhoa("người:chưa-giao")).toBeNull();
  });
  it("lấy mã việc cũ từ phần phân tích, bỏ trùng", () => {
    expect(viecCuCuaThe({ phanTich: "• CV-2026-0030 a\n• CV-2026-0031 b\n• CV-2026-0030 lặp" })).toEqual(["CV-2026-0030", "CV-2026-0031"]);
    expect(viecCuCuaThe({ phanTich: "" })).toEqual([]);
  });
});

describe("nhap-thuan — nháp mặc định", () => {
  it("issue thường: tên 'Xử lý issue …', kết quả = đề xuất, hạn = hạn xử lý còn hiệu lực", () => {
    const n = nhapMacDinh(the({ hanXuLy: "2026-10-10" }), { duAnTen: "Hướng Việt", homNay: HOM_NAY });
    expect(n.ten).toBe("Xử lý issue ISS-2026-41-001: Thiếu xe tải tại Turbine 04");
    expect(n.kq).toBe("Bổ sung 2 xe tải trong tuần");
    expect(n.han).toBe("2026-10-10");
  });
  it("hạn xử lý đã qua → hôm nay + 7 ngày (không gửi việc có hạn đã qua)", () => {
    expect(nhapMacDinh(the({ hanXuLy: "2026-10-01" }), { duAnTen: "HV", homNay: HOM_NAY }).han).toBe("2026-10-13");
    expect(nhapMacDinh(the({}), { duAnTen: "HV", homNay: HOM_NAY }).han).toBe("2026-10-13");
  });
  it("nút găng: tên kèm mã WBS + tên đầu việc (luật 30)", () => {
    const t = the({ nguon: "gang", wbs: "7.5.2", tieuDe: "WBS 7.5.2 Thi công móng bê tông — chưa ai nhận" });
    expect(laNutGang(t)).toBe(true);
    const n = nhapMacDinh(t, { duAnTen: "HV", homNay: HOM_NAY, dauViec: { "7.5.2": { ten: "Thi công móng bê tông" } as never } });
    expect(n.ten).toBe("[HV] Xử lý 7.5.2 — Thi công móng bê tông");
  });
  it("chỉ thẻ chưa giao, chưa 'không cần giao', chưa đóng mới có khối giao — 07/10: đề xuất 🤖 cũng có (bỏ Duyệt/Bác bỏ)", () => {
    expect(canGiaoViec(the({}), null)).toBe(true);
    expect(canGiaoViec(the({ xuLy: "da-giao-viec" }), null)).toBe(false);
    expect(canGiaoViec(the({ khongCanGiao: { nguoi: "A", luc: HOM_NAY } }), null)).toBe(false);
    expect(canGiaoViec(the({ dieuKien: "da-dong" }), null)).toBe(false);
    expect(canGiaoViec(the({ nguon: "ai" }), null)).toBe(true);
    expect(canGiaoViec(the({}), "Issue do agent khác sinh")).toBe(false);
  });
});
