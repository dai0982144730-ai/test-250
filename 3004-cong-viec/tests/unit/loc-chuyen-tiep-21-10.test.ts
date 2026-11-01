// Mr. Đại chốt 21/10/2026 — ô «Lọc tìm kiếm» cột phải (Sơ đồ tổ chức, menu Dự án) thêm hai bộ lọc giao chuyển tiếp
import { describe, it, expect } from "vitest";
import { LOC_CHUYEN_TIEP, laPhamTim, locChuyenTiep, type PhanViecO, type ViecO } from "@/components/phong/viec";

const pt = (loai: "nguoi" | "don_vi", pid: string, vai: "chu_tri" | "phoi_hop" = "chu_tri", xong = false): PhanViecO =>
  ({ id: `${pid}-${vai}`, loai, pid, nut: pid, ten: pid, xong, kt: null, vai }) as PhanViecO;
const viec = (ma: string, ...p: PhanViecO[]): ViecO => ({ ma, ten: ma, pt: p }) as unknown as ViecO;
const LD = new Set(["bld-ptgd-dai"]);
const DS = [
  viec("CV-1", pt("don_vi", "p-dtpc")), // giao cả phòng — chưa giao chuyển tiếp
  viec("CV-2", pt("nguoi", "thinhhp")), // trưởng đã giao cho một người
  viec("CV-3", pt("don_vi", "bld-ptgd-dai")), // chức danh lãnh đạo = một người giữ
  viec("CV-4", pt("nguoi", "thanhnv"), pt("don_vi", "p-hcth")), // hai chủ trì: một phần còn ở cả đơn vị
  viec("CV-5", pt("nguoi", "thinhhp"), pt("don_vi", "p-hcth", "phoi_hop")), // phối hợp là đơn vị — không tính
  viec("CV-6", pt("don_vi", "p-hcth", "chu_tri", true), pt("nguoi", "thanhnv")), // phần đơn vị đã xong — không còn chờ giao
];

describe("lọc giao chuyển tiếp", () => {
  const ma = (k: "da_giao_ct" | "chua_giao_ct") => locChuyenTiep(DS, k, LD).map((v) => v.ma);
  it("chưa giao = còn phần chủ trì mở là cả đơn vị", () => {
    expect(ma("chua_giao_ct")).toEqual(["CV-1", "CV-4"]);
  });
  it("đã giao = mọi phần chủ trì mở là cá nhân (người hoặc chức danh lãnh đạo); phối hợp không tính", () => {
    expect(ma("da_giao_ct")).toEqual(["CV-2", "CV-3", "CV-5", "CV-6"]);
  });
  it("hai bộ lọc cộng lại = cả danh sách, không trùng", () => {
    expect([...ma("chua_giao_ct"), ...ma("da_giao_ct")].sort()).toEqual(DS.map((v) => v.ma).sort());
  });
  it("hai bộ lọc không phải phạm vi tìm (lọc ngay, không cần gõ chữ); nhãn tiếng Việt", () => {
    for (const p of LOC_CHUYEN_TIEP) expect(laPhamTim(p.kieu)).toBe(false);
    expect(laPhamTim("cong_ty")).toBe(true);
    expect(LOC_CHUYEN_TIEP.map((p) => p.nhan)).toEqual(["Việc chưa giao chuyển tiếp", "Việc đã giao chuyển tiếp"]);
  });
});
