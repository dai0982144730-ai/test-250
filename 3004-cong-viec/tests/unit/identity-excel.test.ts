// Nhập người dùng từ Excel: tạo file bằng xlsx ngay trong test, kiểm báo lỗi từng dòng.
import { describe, it, expect, beforeAll } from "vitest";
import * as XLSX from "xlsx";
import { csdlMoi, nguoi } from "../helpers/csdl";
import { layQ, tx } from "@/lib/db";
import { napNguoiDung } from "@/lib/phien";
import { kiemTraNhap, nhapNguoiDungExcel, taoFileExcelMau, docFileExcel, layCayDonVi, danhSachVaiTro, xacThuc } from "@sci/identity/server";
import { nguCanh } from "@/lib/cau-hinh/cau-noi-identity";
import { danhSachThongBao } from "@/lib/thong-bao";

function taoFile(dong: unknown[][]): Uint8Array {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(dong), "Sheet1");
  return new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer);
}

const FILE = () =>
  taoFile([
    ["DANH SÁCH NGƯỜI DÙNG SCI"], // dòng tiêu đề phụ — bỏ qua
    ["Họ tên", "Email", "Mã đơn vị hoặc tên đơn vị", "Chức vụ", "Vai trò"],
    ["Nguyễn Văn An", "an.nv@scigroup.vn", "sci-pmc", "Kỹ sư", "nhan-vien"], // dòng 3: mã đơn vị
    ["Trần Thị Bình", "binh.tt@scigroup.vn", "Phòng Tài chính Kế toán", "Kế toán", "Nhân viên, Văn thư"], // tên đơn vị + tên vai trò
    ["Lê Văn Cường", "cuong.lv@scigroup.vn", "P.HCTH", "Nhân viên", ""], // tên ngắn, vai trò mặc định
    ["", "thieu.ten@scigroup.vn", "p-dtpc", "", ""], // lỗi: thiếu họ tên
    ["Email Sai", "khong-phai-email", "p-dtpc", "", ""], // lỗi: email
    ["Đơn Vị Ma", "ma@scigroup.vn", "Phòng Không Có", "", ""], // lỗi: đơn vị
    ["Vai Trò Ma", "vtma@scigroup.vn", "p-dtpc", "", "sieu-nhan"], // lỗi: vai trò
    ["Nguyễn Văn An 2", "AN.NV@scigroup.vn", "sci-pmc", "", ""], // lỗi: trùng email trong file
    ["Chưa Có Đơn Vị", "chuagan@scigroup.vn", "", "Chuyên gia", ""], // hợp lệ, cảnh báo chưa gán
    ["Trần Văn Hùng", "hung.tv@scigroup.vn", "nm-namxe", "Kỹ sư vận hành", ""], // đã có → cập nhật
    [], // dòng trống
  ]);

describe("identity — nhập Excel", () => {
  beforeAll(async () => {
    await csdlMoi();
  });

  it("xem trước: báo lỗi đúng từng dòng, không ghi gì", async () => {
    const ds = await kiemTraNhap(await layQ(), FILE(), { vai_tro_mac_dinh: ["nhan-vien"] });
    const theoDong = Object.fromEntries(ds.map((d) => [d.dong, d]));
    expect(theoDong[3]).toMatchObject({ hanh_dong: "tao_moi", don_vi_id: "sci-pmc", vai_tro: ["nhan-vien"], loi: [] });
    expect(theoDong[4]).toMatchObject({ hanh_dong: "tao_moi", don_vi_id: "p-tckt", vai_tro: ["nhan-vien", "van-thu"] });
    expect(theoDong[5]).toMatchObject({ hanh_dong: "tao_moi", don_vi_id: "p-hcth", vai_tro: ["nhan-vien"] });
    expect(theoDong[6].loi).toEqual(["Thiếu họ tên"]);
    expect(theoDong[7].loi[0]).toMatch(/Email không hợp lệ/);
    expect(theoDong[8].loi[0]).toMatch(/Không có đơn vị "Phòng Không Có"/);
    expect(theoDong[9].loi[0]).toMatch(/Không có vai trò "sieu-nhan"/);
    expect(theoDong[10].loi[0]).toBe("Email trùng với dòng 3");
    expect(theoDong[11]).toMatchObject({ hanh_dong: "tao_moi", don_vi_id: null });
    expect(theoDong[11].canh_bao[0]).toMatch(/Chưa gán đơn vị/);
    expect(theoDong[12]).toMatchObject({ hanh_dong: "cap_nhat", don_vi_id: "nm-namxe" });
    expect(ds).toHaveLength(10);
    expect(await napNguoiDung(await layQ(), "an.nv@scigroup.vn")).toBeNull();
  });

  it("nhập: tạo dòng hợp lệ, bỏ dòng lỗi, cập nhật người đã có, nhắc quản trị người chưa gán", async () => {
    const qt = await nguoi("quantri@scigroup.vn");
    const kq = await tx((q) => nhapNguoiDungExcel(q, nguCanh(qt), FILE(), { vai_tro_mac_dinh: ["nhan-vien"] }));
    expect(kq).toMatchObject({ tong: 10, tao_moi: 4, cap_nhat: 1, bo_qua: 5 });
    expect(kq.mat_khau).toHaveLength(4);
    const an = await napNguoiDung(await layQ(), "an.nv@scigroup.vn");
    expect(an).toMatchObject({ ten: "Nguyễn Văn An", don_vi_id: "sci-pmc", chuc_vu: "Kỹ sư", cap: 3 });
    const mk = kq.mat_khau.find((m) => m.email === "an.nv@scigroup.vn")!.mat_khau;
    expect((await xacThuc(await layQ(), "an.nv@scigroup.vn", mk)).ok).toBe(true);
    const hung = await napNguoiDung(await layQ(), "hung.tv@scigroup.vn");
    expect(hung).toMatchObject({ don_vi_id: "nm-namxe", chuc_vu: "Kỹ sư vận hành" });
    expect(hung?.vai_tro).toEqual(["nhan-vien"]); // không ghi vai trò → giữ vai trò cũ
    const tb = await danhSachThongBao(await layQ(), qt, { chua_doc: true });
    expect(tb.filter((t) => t.loai === "chua_gan_don_vi").map((t) => t.noi_dung).join(" ")).toContain("Chưa Có Đơn Vị");
  });

  it("mật khẩu ban đầu chung + không cập nhật người đã có", async () => {
    const qt = await nguoi("quantri@scigroup.vn");
    const f = taoFile([
      ["Họ và tên", "E-mail", "Đơn vị", "Chức vụ", "Vai trò"],
      ["Phan Văn Dũng", "dung.pv@scigroup.vn", "SCI E&C", "", "truong-don-vi"],
      ["Trần Văn Hùng", "hung.tv@scigroup.vn", "p-ktvh", "", ""],
    ]);
    const kq = await tx((q) => nhapNguoiDungExcel(q, nguCanh(qt), f, { mat_khau_ban_dau: "Sci@2026", cap_nhat_nguoi_da_co: false }));
    expect(kq).toMatchObject({ tao_moi: 1, cap_nhat: 0, bo_qua: 1, mat_khau: [] });
    expect((await xacThuc(await layQ(), "dung.pv@scigroup.vn", "Sci@2026")).ok).toBe(true);
    expect((await napNguoiDung(await layQ(), "hung.tv@scigroup.vn"))?.don_vi_id).toBe("nm-namxe");
  });

  it("file mẫu tải về đọc lại được, file thiếu cột Email bị từ chối", async () => {
    const q = await layQ();
    const mau = taoFileExcelMau(await layCayDonVi(q), await danhSachVaiTro(q));
    const doc = docFileExcel(mau);
    expect(doc.cot).toMatchObject({ ho_ten: 0, email: 1, don_vi: 2, chuc_vu: 3, vai_tro: 4 });
    const ds = await kiemTraNhap(q, mau);
    expect(ds.every((d) => d.loi.length === 0)).toBe(true);
    expect(() => docFileExcel(taoFile([["Họ tên", "Đơn vị"], ["A", "p-dtpc"]]))).toThrow(/Email/);
    expect(() => docFileExcel(new TextEncoder().encode("không phải excel"))).toThrow();
  });
});
