// Sửa theo kiểm độc lập lần 8 (26/10/2026) — Tóm tắt tiến độ lấy từ agent Tiến độ + route Phòng họp.
// Không gọi mạng thật: `hoiTienDo` được thay; route Phòng họp thay phiên đăng nhập + dữ liệu.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CuocHop } from "@/lib/phong-hop/thuan";

const goi = vi.hoisted(() => ({ dem: 0, traLoi: null as null | ((t: Record<string, unknown>) => unknown) }));
vi.mock("@/lib/nguon-tien-do", () => ({
  hoiTienDo: async (_cc: string, t: Record<string, unknown>) => {
    goi.dem++;
    return goi.traLoi ? goi.traLoi(t) : { ok: false, ma_loi: "KHONG_KET_NOI", thong_diep: "agent Tiến độ đang tắt" };
  },
}));

const phien = vi.hoisted(() => ({ nd: null as null | { id: string; ten: string; la_quan_tri?: boolean } }));
vi.mock("@/lib/phien", async (goc) => {
  const g = (await goc()) as Record<string, unknown>;
  return { ...g, batBuocDangNhap: async () => phien.nd };
});
vi.mock("@/lib/db", async (goc) => ({ ...((await goc()) as Record<string, unknown>), layQ: async () => ({}) }));
const cuocMau: CuocHop = {
  id: 1, phong: "p01", ngay: "2026-10-26", tu: "08:00", den: "09:00", noi_dung: "Họp thử test", ghi_chu: "mang hồ sơ",
  khach_ngoai: "Công ty ABC", duong_dan: "https://meet.example/x", loai: "thuong", nguoi_dat: "dat", nguoi_dat_ten: "Người đặt",
  moi: [{ id: "moi", ten: "Người được mời" }],
} as CuocHop;
vi.mock("@/lib/phong-hop/dich-vu", () => ({
  cuocTheoNgay: async () => [cuocMau],
  danhMucMoi: async () => null,
  duocLapGiaoBan: async () => false,
  datHop: async () => null,
}));

import { _xoaNghiChoBaiKiem, coBangGantt, layBangGanttNhanh, layBangGanttTheoTrang } from "@/lib/tom-tat-tien-do/dong-bo";
import { GET as getPhongHop } from "@/app/api/phong-hop/route";

const dong = (i: number) => ({ wbs: `1.${i}`, ten: `Việc ${i}`, cap: 2 });

describe("CT-2 · bảng cụt không được báo «ok»", () => {
  it("trang 2 hỏng → ok:false, nói rõ mới lấy được bao nhiêu dòng", async () => {
    const kq = await layBangGanttTheoTrang("HV", async (t) =>
      Number(t.vi_tri) === 0
        ? { ok: true, du_lieu: { co_baseline_duyet: true, dong: Array.from({ length: 100 }, (_, i) => dong(i)), tong_so: 183, con_nua: true } }
        : { ok: false, ma_loi: "QUA_HAN", thong_diep: "quá hạn" },
    );
    expect(kq).toMatchObject({ ok: false, chua_co: false });
    expect(!kq.ok && kq.thong_diep).toContain("100/183");
  });
  it("cổng báo hết trang mà thiếu dòng so với tong_so → ok:false", async () => {
    const kq = await layBangGanttTheoTrang("HV", async () => ({ ok: true, du_lieu: { co_baseline_duyet: true, dong: [dong(1)], tong_so: 5, con_nua: false } }));
    expect(kq.ok).toBe(false);
  });
});

describe("CT-3 · CT-5 · agent Tiến độ tắt", () => {
  beforeEach(() => {
    goi.dem = 0;
    goi.traLoi = null;
    _xoaNghiChoBaiKiem();
  });
  it("lượt đầu hỏng → các dự án sau KHÔNG hỏi nữa trong 60 giây (không bắn 3 lỗi làm ngắt mạch); chưa biết thì trả null", async () => {
    const ra = [];
    for (const ma of ["X1", "X2", "X3"]) ra.push(await coBangGantt(ma, `Dự án ${ma}`));
    expect(ra).toEqual([null, null, null]);
    expect(goi.dem).toBe(1);
    const nhanh = await layBangGanttNhanh("X4", "Dự án X4");
    expect(nhanh).toMatchObject({ ok: false, chua_co: false });
    expect(goi.dem).toBe(1);
  });
  it("dự án chưa có tiến độ → false (khác «chưa hỏi được»)", async () => {
    goi.traLoi = () => ({ ok: false, ma_loi: "KHONG_CO_DU_LIEU", thong_diep: "Dự án chưa có tiến độ đã lưu — chưa có bảng Gantt." });
    expect(await coBangGantt("Y1", "Dự án Y1")).toBe(false);
  });
});

describe("CT-421b · GET /api/phong-hop lọc chi tiết theo người hỏi", () => {
  const hoi = async () => (await (await getPhongHop(new Request("http://x/api/phong-hop?ngay=2026-10-26&danh_muc=0"))).json()).cuoc[0];
  it("người ngoài mất ghi chú, đường dẫn, khách ngoài; người đặt, người được mời, quản trị thấy đủ", async () => {
    phien.nd = { id: "ngoai", ten: "Người ngoài" };
    expect(await hoi()).toMatchObject({ noi_dung: "Họp thử test", ghi_chu: null, duong_dan: null, khach_ngoai: null, an_chi_tiet: true });
    for (const nd of [{ id: "dat", ten: "Đặt" }, { id: "moi", ten: "Mời" }, { id: "qt", ten: "Quản trị", la_quan_tri: true }]) {
      phien.nd = nd;
      expect(await hoi()).toMatchObject({ ghi_chu: "mang hồ sơ", duong_dan: "https://meet.example/x", khach_ngoai: "Công ty ABC" });
    }
  });
});
