// Quản trị người dùng, đơn vị, vai trò: thêm/sửa/khóa, lịch sử, thông báo người chưa gán đơn vị.
import { describe, it, expect, beforeAll } from "vitest";
import { csdlMoi, nguoi } from "../helpers/csdl";
import { layQ, query, tx } from "@/lib/db";
import { napNguoiDung } from "@/lib/phien";
import {
  themNguoiDung,
  suaNguoiDung,
  khoaNguoiDung,
  datLaiMatKhau,
  xacThuc,
  themDonVi,
  suaDonVi,
  ngungDonVi,
  layCayDonVi,
  dungCay,
  taoVaiTro,
  datQuyenVaiTro,
  xoaVaiTro,
  danhSachVaiTro,
  LoiIdentity,
} from "@sci/identity/server";
import { nguCanh } from "@/lib/cau-hinh/cau-noi-identity";
import { danhSachThongBao, demChuaDoc } from "@/lib/thong-bao";

describe("identity — quản trị", () => {
  beforeAll(async () => {
    await csdlMoi();
  });

  it("thêm người dùng chưa gán đơn vị → quản trị viên nhận thông báo, lịch sử ghi sua_nguoi_dung", async () => {
    const qt = await nguoi("quantri@scigroup.vn");
    const truocTB = await demChuaDoc(await layQ(), qt);
    const kq = await tx((q) => themNguoiDung(q, nguCanh(qt), { email: " Moi.Tinh@SciGroup.vn ", ten: "Người Mới Tinh", vai_tro: ["nhan-vien"] }));
    expect(kq.nguoi_dung.id).toBe("moi.tinh@scigroup.vn");
    expect(kq.mat_khau_tu_sinh).toBe(true);
    expect((await xacThuc(await layQ(), "moi.tinh@scigroup.vn", kq.mat_khau)).ok).toBe(true);
    expect(await demChuaDoc(await layQ(), qt)).toBe(truocTB + 1);
    const tb = await danhSachThongBao(await layQ(), qt, { gioi_han: 1 });
    expect(tb[0].loai).toBe("chua_gan_don_vi");
    expect(tb[0].noi_dung).toContain("Người Mới Tinh");
    // người không phải quản trị không nhận
    expect(await demChuaDoc(await layQ(), await nguoi("hung.tv@scigroup.vn"))).toBe(0);
    const ls = await query<{ hanh_dong: string; doi_tuong_loai: string; nguoi: string }>(
      "SELECT hanh_dong, doi_tuong_loai, nguoi FROM docflow.lich_su WHERE doi_tuong_id = 'moi.tinh@scigroup.vn'",
    );
    expect(ls.rows).toEqual([{ hanh_dong: "sua_nguoi_dung", doi_tuong_loai: "nguoi_dung", nguoi: qt.id }]);
  });

  it("từ chối email trùng, email sai, đơn vị không có, vai trò không có", async () => {
    const qt = await nguoi("quantri@scigroup.vn");
    const q = await layQ();
    await expect(themNguoiDung(q, nguCanh(qt), { email: "hung.tv@scigroup.vn", ten: "X" })).rejects.toThrow(/đã có/);
    await expect(themNguoiDung(q, nguCanh(qt), { email: "khong-phai-email", ten: "X" })).rejects.toThrow(LoiIdentity);
    await expect(themNguoiDung(q, nguCanh(qt), { email: "a@b.vn", ten: "X", don_vi_id: "khong-co" })).rejects.toThrow(/không tồn tại/);
    await expect(themNguoiDung(q, nguCanh(qt), { email: "a@b.vn", ten: "X", vai_tro: ["vai-ma"] })).rejects.toThrow(/Không có vai trò/);
  });

  it("gán đơn vị, đổi vai trò, khóa, đặt lại mật khẩu — ghi đủ lịch sử", async () => {
    const qt = await nguoi("quantri@scigroup.vn");
    const id = "moi.tinh@scigroup.vn";
    await tx((q) => suaNguoiDung(q, nguCanh(qt), id, { don_vi_id: "sci-enc", chuc_vu: "Kỹ sư", vai_tro: ["nhan-vien", "van-thu"] }));
    const nd = await napNguoiDung(await layQ(), id);
    expect(nd?.don_vi_id).toBe("sci-enc");
    expect(nd?.cap).toBe(3);
    expect(nd?.vai_tro.sort()).toEqual(["nhan-vien", "van-thu"]);
    const mk = await tx((q) => datLaiMatKhau(q, nguCanh(qt), id, "MatKhau@1"));
    expect(mk).toBe("MatKhau@1");
    expect((await xacThuc(await layQ(), id, "MatKhau@1")).ok).toBe(true);
    await tx((q) => khoaNguoiDung(q, nguCanh(qt), id, true));
    expect(await napNguoiDung(await layQ(), id)).toBeNull();
    expect(await xacThuc(await layQ(), id, "MatKhau@1")).toMatchObject({ ok: false, ly_do: "bi_khoa" });
    const ls = await query<{ tt: string }>(
      "SELECT chi_tiet->>'thao_tac' AS tt FROM docflow.lich_su WHERE doi_tuong_id = $1 ORDER BY id",
      [id],
    );
    expect(ls.rows.map((r) => r.tt)).toEqual(["them", "sua", "dat_lai_mat_khau", "khoa"]);
    // không tự khóa mình
    await expect(khoaNguoiDung(await layQ(), nguCanh(qt), qt.id, true)).rejects.toThrow(/chính mình/);
  });

  it("cấp chức vụ ưu tiên hơn cấp đơn vị", async () => {
    const qt = await nguoi("quantri@scigroup.vn");
    await suaNguoiDung(await layQ(), nguCanh(qt), "photgd@scigroup.vn", { cap_chuc_vu: 0 });
    expect((await nguoi("photgd@scigroup.vn")).cap).toBe(0);
    await expect(suaNguoiDung(await layQ(), nguCanh(qt), "photgd@scigroup.vn", { cap_chuc_vu: -1 })).rejects.toThrow(/Cấp/);
  });

  it("đơn vị: thêm mới không sửa code, chặn vòng tròn, ngừng khi còn người thì bị chặn", async () => {
    const qt = await nguoi("quantri@scigroup.vn");
    const q = await layQ();
    const vp = await themDonVi(q, nguCanh(qt), { ten: "Văn phòng HĐQT", ten_ngan: "VP HĐQT", cap: 0, loai: "rieng" });
    expect(vp.id).toBe("vp-hdqt");
    const to = await themDonVi(q, nguCanh(qt), { ten: "Tổ thư ký", cap: 1, cha_id: vp.id });
    await expect(suaDonVi(q, nguCanh(qt), vp.id, { cha_id: to.id })).rejects.toThrow(/vòng tròn/);
    await expect(themDonVi(q, nguCanh(qt), { ten: "Thiếu cấp" } as never)).rejects.toThrow(/cấp/);
    await expect(themDonVi(q, nguCanh(qt), { ten: "Cấp âm", cap: -2 })).rejects.toThrow(/Cấp/);
    const cay = dungCay(await layCayDonVi(q));
    const goc = cay.find((n) => n.id === "ban-tgd")!;
    expect(goc.con.map((c) => c.id)).toContain("p-dtpc");
    expect(goc.con.find((c) => c.id === "p-dtpc")!.con.map((c) => c.id).sort()).toEqual(["bqlda-lao", "bqlda-qt", "sci-enc", "sci-pmc"]);
    await expect(ngungDonVi(q, nguCanh(qt), "p-dtpc")).rejects.toThrow(/đơn vị con/);
    await expect(ngungDonVi(q, nguCanh(qt), "nm-namxe")).rejects.toThrow(/người dùng/);
    await ngungDonVi(q, nguCanh(qt), to.id);
    expect((await layCayDonVi(q)).some((d) => d.id === to.id)).toBe(false);
    const ls = await query<{ n: number }>("SELECT count(*)::int n FROM docflow.lich_su WHERE doi_tuong_loai='don_vi' AND hanh_dong='sua_nguoi_dung'");
    expect(ls.rows[0].n).toBe(3);
  });

  it("vai trò: tạo mới, bật tắt quyền; vai trò hệ thống không xóa được", async () => {
    const qt = await nguoi("quantri@scigroup.vn");
    const q = await layQ();
    const vt = await taoVaiTro(q, nguCanh(qt), { ten: "Pháp chế", quyen: { "mau.quan_ly": "toan_bo" } });
    expect(vt.id).toBe("phap-che");
    const sau = await datQuyenVaiTro(q, nguCanh(qt), vt.id, { "mau.quan_ly": null, "tai_lieu.xem": "don_vi" });
    expect(sau.quyen).toEqual({ "tai_lieu.xem": "don_vi" });
    await expect(datQuyenVaiTro(q, nguCanh(qt), vt.id, { "quyen.bay": "toan_bo" } as never)).rejects.toThrow(/danh mục/);
    await expect(xoaVaiTro(q, nguCanh(qt), "nhan-vien")).rejects.toThrow(/hệ thống/);
    await xoaVaiTro(q, nguCanh(qt), vt.id);
    expect((await danhSachVaiTro(q)).some((v) => v.id === vt.id)).toBe(false);
    const ls = await query<{ n: number }>("SELECT count(*)::int n FROM docflow.lich_su WHERE doi_tuong_id = 'vai_tro:phap-che' AND hanh_dong='sua_cau_hinh'");
    expect(ls.rows[0].n).toBe(3);
  });
});
