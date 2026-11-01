// Văn thư nhập văn bản của người ngoài công ty vào sổ văn bản đến, rồi chuyển đơn vị xử lý.
import { describe, it, expect, beforeAll, vi } from "vitest";

vi.mock("@/lib/thu-muc/dich-vu", async (goc) => {
  const g = await import("../fixtures/gia-lap");
  return g.boc((await goc()) as Record<string, unknown>, g.giaLapThuMuc);
});
vi.mock("@/lib/so-cai/dich-vu", async (goc) => {
  const g = await import("../fixtures/gia-lap");
  return g.boc((await goc()) as Record<string, unknown>, g.giaLapSoCai);
});

import { csdlMoi, nguoi } from "../helpers/csdl";
import { layQ, tx, type Q } from "@/lib/db";
import { nhapVanBanDen, chuyenXuLy, danhSachSoDen } from "@/lib/van-thu/dich-vu";
import { cayHanhTrinh, traLai, nhan } from "@/lib/gui/dich-vu";
import { thongTinTaiLieuGui } from "@/lib/gui/doc";
import { khoTam, tep } from "../fixtures/chuan-bi";

let q: Q;

beforeAll(async () => {
  khoTam();
  await csdlMoi();
  q = await layQ();
});

describe("sổ văn bản đến", () => {
  it("văn thư vào sổ: số đến tự tăng theo năm, vào Đến của P.HCTH, lịch sử ghi thay_cho = nơi gửi thật", async () => {
    const vt = await nguoi("vanthu@scigroup.vn");
    const a = await tx((x) =>
      nhapVanBanDen(x, vt, {
        noi_gui: "UBND huyện Hướng Hóa",
        so_ky_hieu: "125/UBND-TNMT",
        ngay_van_ban: "02/08/2026",
        hinh_thuc: "giay",
        trich_yeu: "V/v phương án bồi thường GPMB Trụ T11",
        tep: tep("YKien_PhapLy_ThuVon.docx"),
      }),
    );
    const b = await tx((x) =>
      nhapVanBanDen(x, vt, {
        noi_gui: "Công ty Điện lực Quảng Trị",
        hinh_thuc: "email",
        email_gui: "vanthu@pcquangtri.vn",
        trich_yeu: "Lịch cắt điện đấu nối",
        tep: tep("YKien_PhapLy_ThuVon.docx"),
        don_vi_xu_ly: "p-ktvh",
      }),
    );
    const nam = new Date().getFullYear();
    expect([a.so_den, b.so_den]).toEqual([1, 2]);
    expect(a.nam).toBe(nam);
    const vi = await q.query<{ don_vi_id: string; loai: string }>(
      "SELECT t.don_vi_id, t.loai FROM docflow.vi_tri v JOIN docflow.thu_muc t ON t.id = v.thu_muc_id WHERE v.tai_lieu_id = $1",
      [a.tai_lieu_id],
    );
    expect(vi.rows).toEqual([{ don_vi_id: "p-hcth", loai: "den" }]);
    const tl = await q.query<{ nguoi_gui_that: string; don_vi_lap: string | null }>("SELECT nguoi_gui_that, don_vi_lap FROM docflow.tai_lieu WHERE id = $1", [a.tai_lieu_id]);
    expect(tl.rows[0]).toEqual({ nguoi_gui_that: "UBND huyện Hướng Hóa", don_vi_lap: null });
    const ls = await q.query<{ nguoi: string; thay_cho: string; chi_tiet: { so_den: number } }>(
      "SELECT nguoi, thay_cho, chi_tiet FROM docflow.lich_su WHERE doi_tuong_id = $1 AND hanh_dong = 'vao_so_van_ban_den'",
      [a.tai_lieu_id],
    );
    expect(ls.rows[0]).toMatchObject({ nguoi: "vanthu@scigroup.vn", thay_cho: "UBND huyện Hướng Hóa", chi_tiet: { so_den: 1 } });
    // b đã chuyển luôn cho P.KT&VH
    const cayB = await cayHanhTrinh(q, b.tai_lieu_id);
    expect(cayB[0]).toMatchObject({ tu_ten: "Công ty Điện lực Quảng Trị", den_don_vi: "p-hcth", trang_thai: "da_xu_ly" });
    expect(cayB[0].con.map((n) => [n.loai, n.den_don_vi])).toEqual([["chuyen_tiep", "p-ktvh"]]);

    const so = await danhSachSoDen(q, { nam });
    expect(so.map((s) => s.so_den)).toEqual([2, 1]);
    expect(so[1]).toMatchObject({ noi_gui: "UBND huyện Hướng Hóa", so_ky_hieu: "125/UBND-TNMT", ngay_van_ban: "2026-08-02", hinh_thuc: "giay" });
    expect(so[0].don_vi_xu_ly_ten).toBe("Phòng Kinh tế và Vận hành");
    expect((await danhSachSoDen(q, { tu_khoa: "hướng hóa" })).length).toBe(1);

    // chuyển a cho P.ĐT&PC xử lý; P.ĐT&PC trả lại về văn thư được, bước vào sổ (từ bên ngoài) thì không trả lại được
    const bc = await tx((x) => chuyenXuLy(x, vt, a.id, "p-dtpc"));
    const dtpc = await nguoi("truong.dtpc@scigroup.vn");
    await tx((x) => nhan(x, dtpc, bc));
    const tt = await thongTinTaiLieuGui(q, dtpc, a.tai_lieu_id);
    expect(tt.so_den).toMatchObject({ so_den: 1, noi_gui: "UBND huyện Hướng Hóa" });
    expect(tt.buoc_cua_toi[0].thao_tac).toContain("tra_lai");
    const tv = await thongTinTaiLieuGui(q, vt, a.tai_lieu_id);
    expect(tv.buoc_cua_toi.find((x) => x.buoc_id === a.buoc_id)!.thao_tac).not.toContain("tra_lai");
    await expect(tx((x) => traLai(x, vt, { buoc_id: a.buoc_id, ly_do: "không rõ" }))).rejects.toMatchObject({ status: 409 });
    const tlId = await tx((x) => traLai(x, dtpc, { buoc_id: bc, ly_do: "Không thuộc thẩm quyền, chuyển P.KT&VH" }));
    const r = await q.query<{ den_don_vi: string }>("SELECT den_don_vi FROM docflow.buoc_hanh_trinh WHERE id = $1", [tlId]);
    expect(r.rows[0].den_don_vi).toBe("p-hcth");
  });

  it("văn bản ĐẾN đúng mẫu Form báo cáo vẫn KHÔNG sinh việc (Mr. Đại chốt 28/09: việc chỉ từ Form nội bộ đã gửi + giao thủ công)", async () => {
    const vt = await nguoi("vanthu@scigroup.vn");
    const truoc = (await q.query<{ n: number }>("SELECT count(*)::int AS n FROM docflow.cong_viec")).rows[0].n;
    const r = await tx((x) =>
      nhapVanBanDen(x, vt, { noi_gui: "Nhà thầu Thử", hinh_thuc: "email", trich_yeu: "Gửi kèm báo cáo tuần", tep: tep("BaoCao_Tuan28_BQLDA_QuangTri.docx") }),
    );
    expect(r.so_den).toBeGreaterThan(0);
    // đúng là văn bản theo mẫu (trước 28/09 loại này sinh việc cấp "bên ngoài")
    expect((await q.query<{ mau_ma: string | null }>("SELECT mau_ma FROM docflow.tai_lieu WHERE id = $1", [r.tai_lieu_id])).rows[0].mau_ma).toBe("form-7");
    expect((await q.query<{ n: number }>("SELECT count(*)::int AS n FROM docflow.cong_viec")).rows[0].n).toBe(truoc);
    expect((await q.query<{ n: number }>("SELECT count(*)::int AS n FROM docflow.nguon_cong_viec WHERE tai_lieu_id = $1", [r.tai_lieu_id])).rows[0].n).toBe(0);
  });

  it("chỉ văn thư được vào sổ; thiếu nơi gửi/trích yếu/file bị từ chối", async () => {
    const hung = await nguoi("hung.tv@scigroup.vn");
    await expect(
      tx((x) => nhapVanBanDen(x, hung, { noi_gui: "A", hinh_thuc: "giay", trich_yeu: "B", tep: tep("YKien_PhapLy_ThuVon.docx") })),
    ).rejects.toMatchObject({ status: 403 });
    const vt = await nguoi("vanthu@scigroup.vn");
    await expect(tx((x) => nhapVanBanDen(x, vt, { noi_gui: " ", hinh_thuc: "giay", trich_yeu: "B", tep: tep("YKien_PhapLy_ThuVon.docx") }))).rejects.toThrow(/nơi gửi/);
    await expect(
      tx((x) => nhapVanBanDen(x, vt, { noi_gui: "A", hinh_thuc: "giay", trich_yeu: "B", ngay_van_ban: "31/02/2026", tep: tep("YKien_PhapLy_ThuVon.docx") })),
    ).rejects.toThrow(/Ngày văn bản/);
  });
});
