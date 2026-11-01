// Tổ chức & người dùng (Mr. Đại chốt 28/09/2026): chức danh lãnh đạo chỉ khai MỘT nơi —
// đơn vị chức danh lưu chức danh, tên người giữ + chức vụ máy tự ghép (lib/to-chuc.ts, db/69).
import { describe, it, expect, beforeAll } from "vitest";
import { csdlMoi } from "../helpers/csdl";
import { tx } from "@/lib/db";
import { dongBoChucDanh, kiemUyQuyen } from "@/lib/to-chuc";
import { nguoiGiaoTuBaoCao } from "@/lib/so-cai/dich-vu";
import { napNguoiDung } from "@/lib/phien";
import { dauDonVi } from "@/lib/thong-bao";
import { coQuyen } from "@sci/identity";
import { layCayDonVi } from "@sci/identity/don-vi";
import { khoaNguoiDung, suaNguoiDung } from "@sci/identity/server";
import { ghiLichSu } from "@/lib/lich-su/ghi";
import { timLichSu } from "@/lib/lich-su/doc";
import { duocSuaNhom } from "@/lib/cau-hinh/quyen";

describe("đơn vị chức danh tự ghép tên người giữ", () => {
  beforeAll(async () => {
    await csdlMoi();
    await tx(async (q) => {
      // Dữ liệu kiểu cũ: tên đơn vị + chức vụ gõ tay, lẫn cả "(kiêm …)"
      await q.query(
        `INSERT INTO identity.don_vi (id, ten, ten_ngan, cap, cha_id, loai, thu_tu, active)
         VALUES ('bld-test', 'Phó Tổng Giám đốc · Nguyễn Văn A (kiêm Trưởng phòng X)', 'PTGĐ · Nguyễn Văn A', 1, 'ban-tgd', 'chuc_danh', 99, true)`,
      );
      await q.query(
        `INSERT INTO identity.nguoi_dung (id, email, ten, don_vi_id, chuc_vu, active, mat_khau_hash, salt)
         VALUES ('test.a@scigroup.vn', 'test.a@scigroup.vn', 'Nguyễn Văn A', 'bld-test', 'Phó Tổng Giám đốc (kiêm Trưởng phòng X)', true, 'x', 'x')`,
      );
    });
  });

  it("lấy chức danh từ tên cũ, ghép lại tên người, chức vụ = chức danh; chạy lại không đổi gì", async () => {
    await tx((q) => dongBoChucDanh(q));
    const dv = await tx((q) => q.query<{ ten: string; ten_ngan: string; chuc_danh: string }>("SELECT ten, ten_ngan, chuc_danh FROM identity.don_vi WHERE id = 'bld-test'"));
    expect(dv.rows[0]).toEqual({ ten: "Phó Tổng Giám đốc · Nguyễn Văn A", ten_ngan: "PTGĐ · Nguyễn Văn A", chuc_danh: "Phó Tổng Giám đốc" });
    const nd = await tx((q) => q.query<{ chuc_vu: string }>("SELECT chuc_vu FROM identity.nguoi_dung WHERE id = 'test.a@scigroup.vn'"));
    expect(nd.rows[0].chuc_vu).toBe("Phó Tổng Giám đốc");
    expect(await tx((q) => dongBoChucDanh(q))).toBe(0);
  });

  it("đổi người giữ / khóa người giữ → tên đơn vị tự theo", async () => {
    await tx((q) => q.query("UPDATE identity.nguoi_dung SET ten = 'Trần Văn B' WHERE id = 'test.a@scigroup.vn'"));
    await tx((q) => dongBoChucDanh(q));
    let r = await tx((q) => q.query<{ ten: string }>("SELECT ten FROM identity.don_vi WHERE id = 'bld-test'"));
    expect(r.rows[0].ten).toBe("Phó Tổng Giám đốc · Trần Văn B");
    await tx((q) => q.query("UPDATE identity.nguoi_dung SET active = false WHERE id = 'test.a@scigroup.vn'"));
    await tx((q) => dongBoChucDanh(q));
    r = await tx((q) => q.query<{ ten: string }>("SELECT ten FROM identity.don_vi WHERE id = 'bld-test'"));
    expect(r.rows[0].ten).toBe("Phó Tổng Giám đốc");
  });
});

describe("trưởng chính (Mr. Đại chốt 03/10/2026 — thay ủy quyền trưởng db/70)", () => {
  // Ca BQLDA QT: trưởng biên chế (Đoài) + Trưởng phòng nơi khác kiêm nhiệm (Sơn). Ca Phòng Đầu tư: người được chọn sẵn chưa có vai Trưởng (Hương).
  const TP_KIEM = "tp.kiem@scigroup.vn";
  beforeAll(async () => {
    await csdlMoi();
    await tx(async (q) => {
      await q.query(
        `INSERT INTO identity.nguoi_dung (id, email, ten, don_vi_id, chuc_vu, active, mat_khau_hash, salt)
         VALUES ($1, $1, 'Trưởng phòng kiêm', 'p-ktvh', 'Trưởng phòng', true, 'x', 'x')`,
        [TP_KIEM],
      );
      await q.query("INSERT INTO identity.gan_vai_tro (nguoi_dung_id, vai_tro_id) VALUES ($1,'truong-don-vi')", [TP_KIEM]);
      await q.query("INSERT INTO identity.kiem_nhiem (nguoi_dung_id, don_vi_id, chuc_vu) VALUES ($1, 'p-dtpc', 'kiêm Nhóm dự án')", [TP_KIEM]);
      await q.query("INSERT INTO identity.kiem_nhiem (nguoi_dung_id, don_vi_id, chuc_vu) VALUES ('nv.dtpc@scigroup.vn', 'p-ktvh', 'kiêm Nhóm kinh tế')");
    });
  });

  it("chỉ chọn được người mang vai Trưởng thuộc đơn vị (cả kiêm nhiệm); bỏ chọn lúc nào cũng được", async () => {
    expect(await tx((q) => kiemUyQuyen(q, "p-dtpc", "nv.dtpc@scigroup.vn"))).toMatch(/vai trò Trưởng/);
    expect(await tx((q) => kiemUyQuyen(q, "p-dtpc", "hung.tv@scigroup.vn"))).toMatch(/thuộc đơn vị/);
    expect(await tx((q) => kiemUyQuyen(q, "p-dtpc", TP_KIEM))).toBeNull();
    expect(await tx((q) => kiemUyQuyen(q, "p-dtpc", "truong.dtpc@scigroup.vn"))).toBeNull();
    expect(await tx((q) => kiemUyQuyen(q, "p-dtpc", null))).toBeNull();
  });

  // Mr. Đại chốt lại 08/10/2026: trưởng còn lại = TRƯỞNG PHỤ, đủ quyền trưởng; chỉ khác trưởng chính 3 điểm (đứng tên khi máy tự giao ·
  // người mặc định nhận việc của phòng · tên ở Thư mục). Bản 03/10 cho trưởng phụ mất quyền trưởng — đã đảo.
  it("2 trưởng, chọn trưởng chính: trưởng phụ GIỮ ĐỦ quyền trưởng ở đơn vị đó và phòng chính, vẫn nhận chuông; máy tự giao đứng tên trưởng chính", async () => {
    const cay = await tx((q) => layCayDonVi(q, true));
    const truoc = await tx((q) => napNguoiDung(q, TP_KIEM));
    expect(coQuyen(truoc!, "cong_viec.giao", { don_vi_id: "p-dtpc" }, cay)).toBe(true);

    await tx((q) => q.query("UPDATE identity.don_vi SET uy_quyen_truong = 'truong.dtpc@scigroup.vn' WHERE id = 'p-dtpc'"));
    expect(await tx((q) => nguoiGiaoTuBaoCao(q, "p-dtpc", "ai-do@scigroup.vn"))).toBe("truong.dtpc@scigroup.vn");
    const sau = await tx((q) => napNguoiDung(q, TP_KIEM));
    expect(sau?.don_vi_truong).toBeUndefined(); // giữ quyền trưởng ở MỌI đơn vị của mình → không tách bảng quyền
    expect(sau?.don_vi_dau).toEqual(expect.arrayContaining(["p-ktvh", "p-dtpc"]));
    expect(coQuyen(sau!, "cong_viec.giao", { don_vi_id: "p-dtpc" }, cay)).toBe(true); // trưởng phụ vẫn giao việc ở đơn vị đó
    expect(coQuyen(sau!, "cong_viec.giao", { don_vi_id: "p-ktvh" }, cay)).toBe(true);
    expect(coQuyen(sau!, "tai_lieu.kiem_soat", { don_vi_id: "p-dtpc" }, cay)).toBe(true); // quyền trưởng khác cũng giữ
    expect(await tx((q) => dauDonVi(q, "p-dtpc"))).toEqual(expect.arrayContaining(["truong.dtpc@scigroup.vn", TP_KIEM]));
    const chinh = await tx((q) => napNguoiDung(q, "truong.dtpc@scigroup.vn"));
    expect(coQuyen(chinh!, "cong_viec.giao", { don_vi_id: "p-dtpc" }, cay)).toBe(true);
  });

  it("người được chọn sẵn chưa có vai Trưởng (dữ liệu cũ): giữ quyền trưởng ĐÚNG đơn vị đó, không lan sang đơn vị kiêm nhiệm; bỏ chọn là mất", async () => {
    const cay = await tx((q) => layCayDonVi(q, true));
    await tx((q) => q.query("UPDATE identity.don_vi SET uy_quyen_truong = 'nv.dtpc@scigroup.vn' WHERE id = 'p-dtpc'"));
    expect(await tx((q) => nguoiGiaoTuBaoCao(q, "p-dtpc", "ai-do@scigroup.vn"))).toBe("nv.dtpc@scigroup.vn");
    const sau = await tx((q) => napNguoiDung(q, "nv.dtpc@scigroup.vn"));
    expect(sau?.vai_tro).toContain("truong-don-vi");
    expect(sau?.don_vi_truong).toEqual(["p-dtpc"]);
    expect(coQuyen(sau!, "cong_viec.giao", { don_vi_id: "p-dtpc" }, cay)).toBe(true);
    expect(coQuyen(sau!, "cong_viec.giao", { don_vi_id: "p-ktvh" }, cay)).toBe(false); // lỗi cũ: quyền trưởng lan sang đơn vị kiêm

    await tx((q) => q.query("UPDATE identity.don_vi SET uy_quyen_truong = NULL WHERE id = 'p-dtpc'"));
    const bo = await tx((q) => napNguoiDung(q, "nv.dtpc@scigroup.vn"));
    expect(bo?.vai_tro).not.toContain("truong-don-vi");
    expect(bo?.don_vi_truong).toBeUndefined(); // không còn quyền trưởng ở đâu → không tách bảng quyền
  });

  it("trưởng phụ ở đơn vị kiêm (chốt lại 08/10): xem lịch sử đơn vị đó như trưởng, khớp quy tắc sửa cài đặt của trưởng đơn vị đó", async () => {
    await tx(async (q) => {
      await q.query("UPDATE identity.don_vi SET uy_quyen_truong = 'truong.dtpc@scigroup.vn' WHERE id = 'p-dtpc'");
      await ghiLichSu(q, { nguoi: "truong.dtpc@scigroup.vn", don_vi_id: "p-dtpc", doi_tuong_loai: "cong_viec", doi_tuong_id: "cv-soat-dtpc", hanh_dong: "hoan_thanh", chi_tiet: {} });
      await ghiLichSu(q, { nguoi: "truong.ktvh@scigroup.vn", don_vi_id: "p-ktvh", doi_tuong_loai: "cong_viec", doi_tuong_id: "cv-soat-ktvh", hanh_dong: "hoan_thanh", chi_tiet: {} });
    });
    const nd = (await tx((q) => napNguoiDung(q, TP_KIEM)))!;
    const dtpc = await tx((q) => timLichSu(q, nd, { don_vi_id: "p-dtpc" }));
    expect(dtpc.some((d) => d.nguoi === "truong.dtpc@scigroup.vn")).toBe(true); // trưởng phụ xem lịch sử đơn vị như trưởng
    const ktvh = await tx((q) => timLichSu(q, nd, { don_vi_id: "p-ktvh" }));
    expect(ktvh.some((d) => d.nguoi === "truong.ktvh@scigroup.vn")).toBe(true); // phòng chính vẫn xem như trưởng
    const chinh = (await tx((q) => napNguoiDung(q, "truong.dtpc@scigroup.vn")))!;
    expect((await tx((q) => timLichSu(q, chinh, { don_vi_id: "p-dtpc" }))).length).toBeGreaterThan(0);

    const quyTac = (dv: string) => ({ nhom: { luong_bao_cao: { don_vi: [dv], vai_tro: ["truong-don-vi"] } } }) as never;
    expect(duocSuaNhom(nd, "luong_bao_cao", quyTac("p-dtpc"))).toBe(true);
    expect(duocSuaNhom(nd, "luong_bao_cao", quyTac("p-ktvh"))).toBe(true);
    expect(duocSuaNhom(chinh, "luong_bao_cao", quyTac("p-dtpc"))).toBe(true);
  });

  it("soát vòng 2 · mục 2: trưởng chính bị khoá hoặc rời đơn vị → đơn vị về 'chưa chọn', trưởng còn lại lấy lại quyền trưởng", async () => {
    const cay = await tx((q) => layCayDonVi(q, true));
    const ng = { nguoi: "quantri@scigroup.vn" };
    const uyQuyen = async () => (await tx((q) => q.query<{ u: string | null }>("SELECT uy_quyen_truong u FROM identity.don_vi WHERE id = 'p-dtpc'"))).rows[0].u;
    expect(await uyQuyen()).toBe("truong.dtpc@scigroup.vn");
    // ① Khoá trưởng chính
    await tx((q) => khoaNguoiDung(q, ng, "truong.dtpc@scigroup.vn"));
    expect(await uyQuyen()).toBeNull();
    const sauKhoa = (await tx((q) => napNguoiDung(q, TP_KIEM)))!;
    expect(coQuyen(sauKhoa, "cong_viec.giao", { don_vi_id: "p-dtpc" }, cay)).toBe(true);
    await tx((q) => khoaNguoiDung(q, ng, "truong.dtpc@scigroup.vn", false));
    expect(await uyQuyen()).toBeNull(); // mở khoá không tự đặt lại — người quản trị chọn lại
    // ② Trưởng chính rời đơn vị (bỏ kiêm nhiệm)
    await tx((q) => q.query("UPDATE identity.don_vi SET uy_quyen_truong = $1 WHERE id = 'p-dtpc'", [TP_KIEM]));
    await tx((q) => suaNguoiDung(q, ng, TP_KIEM, { kiem_nhiem: [] }));
    expect(await uyQuyen()).toBeNull();
    // ③ Đường ghi khác chưa xoá cột (vd đặt tay): trưởng chính đã khoá thì phiên không tính
    await tx(async (q) => {
      await q.query("INSERT INTO identity.kiem_nhiem (nguoi_dung_id, don_vi_id, chuc_vu) VALUES ($1, 'p-dtpc', 'kiêm Nhóm dự án')", [TP_KIEM]);
      await q.query("UPDATE identity.nguoi_dung SET active = false WHERE id = 'truong.dtpc@scigroup.vn'");
      await q.query("UPDATE identity.don_vi SET uy_quyen_truong = 'truong.dtpc@scigroup.vn' WHERE id = 'p-dtpc'");
    });
    const datTay = (await tx((q) => napNguoiDung(q, TP_KIEM)))!;
    expect(coQuyen(datTay, "cong_viec.giao", { don_vi_id: "p-dtpc" }, cay)).toBe(true);
  });
});
