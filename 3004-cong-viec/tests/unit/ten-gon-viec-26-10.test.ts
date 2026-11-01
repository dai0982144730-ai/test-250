// Tên việc gọn + loại dòng phụ trách cho base.tai_viec_theo_nguoi (26/10/2026 — lỗi Telegram: tên việc méo, lặp chữ; gọi đơn vị là «phòng»)
import { describe, expect, it } from "vitest";
import { tenGonViec, tongHopTaiTheoNguoi } from "@/lib/mcp/cong-base-thuan";

describe("tenGonViec", () => {
  it("bỏ tiền tố dự án trong ngoặc vuông, cắt ở câu đầu", () => {
    expect(
      tenGonViec("[Điện gió Hướng Việt (HV — dữ liệu test)] Xử lý 6.1.4 — Cung cấp Hub, Nacelle, Blade. Drive Train, Cooler Tops, Switchgear đến cảng Hòn La"),
    ).toBe("Xử lý 6.1.4 — Cung cấp Hub, Nacelle, Blade…"); // cắt câu có «…» (kiểm độc lập P-CV-1)
  });
  it("tên dài quá 24 chữ thì cắt kèm dấu …; 15 chữ giữ nguyên", () => {
    const hai5 = Array.from({ length: 26 }, (_, i) => `c${i + 1}`).join(" ");
    const r = tenGonViec(hai5);
    expect(r.endsWith("…")).toBe(true);
    expect(r.split(" ").length).toBe(24);
    const muoiLam = Array.from({ length: 15 }, (_, i) => `c${i + 1}`).join(" ");
    expect(tenGonViec(muoiLam)).toBe(muoiLam);
  });
  it("tên ngắn giữ nguyên", () => {
    expect(tenGonViec("Hợp đồng tín dụng")).toBe("Hợp đồng tín dụng");
  });
});

describe("tongHopTaiTheoNguoi — loại dòng", () => {
  it("ghi loại + thuộc đơn vị do bên gọi phân loại", () => {
    const ds = tongHopTaiTheoNguoi(
      [
        { id: "CV-1", ten: "[HV] Việc A", nguoiPhuTrach: "p-dtpc", daXong: false, han: null, quaHanNgay: 3, maWbs: [] },
        { id: "CV-2", ten: "Việc B", nguoiPhuTrach: "doainv@scigroup.vn", daXong: false, han: null, quaHanNgay: null, maWbs: [] },
      ],
      new Set(),
      "2026-10-26",
      () => null,
      5,
      (m) => (m === "p-dtpc" ? { loai: "phong", thuoc: "Ban TGĐ" } : { loai: "nguoi", thuoc: "BQLDA QT" }),
    );
    expect(ds.find((d) => d.ma_base === "p-dtpc")?.loai).toBe("phong");
    expect(ds.find((d) => d.ma_base === "doainv@scigroup.vn")).toMatchObject({ loai: "nguoi", thuoc: "BQLDA QT" });
    expect(ds[0].viec_nang[0].ten_gon).toBe("Việc A");
  });
});

describe("tenGonViec — kiểm độc lập P-CV-1/2", () => {
  it("cắt câu có dấu …, không để ngoặc mở", () => {
    const r = tenGonViec("TKCS ĐG Hướng Việt bị Bộ Công Thương kéo dài thẩm định (77 ngày > KH 60 ngày) cần đôn đốc gấp để kịp mốc khởi công");
    expect(r.endsWith("…")).toBe(true);
    expect((r.match(/\(/g) ?? []).length).toBe((r.match(/\)/g) ?? []).length);
  });
  it("«Hạng mục 6.1. Lắp đặt…» không bị cắt ở mã", () => {
    expect(tenGonViec("Hạng mục 6.1. Lắp đặt tua bin gió")).toBe("Hạng mục 6.1. Lắp đặt tua bin gió");
  });
  it("«đợt 1; đợt 2» không cắt (sau dấu không phải chữ hoa)", () => {
    expect(tenGonViec("Thanh toán đợt 1; đợt 2; đợt 3 theo HĐ EPC")).toBe("Thanh toán đợt 1; đợt 2; đợt 3 theo HĐ EPC");
  });
  it("tên chỉ có [..] hoặc rỗng không trả rỗng; bỏ nhiều tiền tố [..]", () => {
    expect(tenGonViec("[HV]")).toBe("[HV]");
    expect(tenGonViec("[A] [B] Việc X")).toBe("Việc X");
  });
});
