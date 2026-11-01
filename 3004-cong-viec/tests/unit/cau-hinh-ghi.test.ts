// Ghi cấu hình: kiểm tra trước khi lưu, phiên bản, nhật ký, lịch sử, quay lại, xuất/nhập, phân quyền từng nhóm.
import { describe, it, expect, beforeAll } from "vitest";
import { csdlMoi, nguoi } from "../helpers/csdl";
import { layQ, query, tx } from "@/lib/db";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { MAC_DINH } from "@/lib/cau-hinh/mac-dinh";
import {
  ghiCauHinh,
  kiemTraCauHinh,
  quayLaiPhienBan,
  xuatCauHinh,
  nhapCauHinh,
  nhatKyCauHinh,
  LoiCauHinh,
} from "@/lib/cau-hinh/ghi";
import { timVong } from "@/lib/cau-hinh/kiem-tra";
import { duocSuaNhom, nhomDuocSua } from "@/lib/cau-hinh/quyen";

describe("cấu hình — ghi, phiên bản, quay lại", () => {
  beforeAll(async () => {
    await csdlMoi({ macDinhGoc: true });
  });

  it("không cho bật cùng lúc «hiện danh sách tài khoản» và «bấm tên là đăng nhập luôn»", async () => {
    const q = await layQ();
    const ca2 = { ...MAC_DINH.tai_khoan, danh_sach_dang_nhap: true, bam_la_dang_nhap: true };
    const loi = await kiemTraCauHinh(q, "tai_khoan", ca2 as never);
    expect(loi.join(" ")).toMatch(/không được bật cùng lúc/i);
    for (const [a1, b1] of [[true, false], [false, true], [false, false]]) {
      expect(await kiemTraCauHinh(q, "tai_khoan", { ...MAC_DINH.tai_khoan, danh_sach_dang_nhap: a1, bam_la_dang_nhap: b1 } as never)).toEqual([]);
    }
  });

  it("mặc định hợp lệ ở mọi nhóm", async () => {
    const q = await layQ();
    for (const k of Object.keys(MAC_DINH) as (keyof typeof MAC_DINH)[]) {
      expect(await kiemTraCauHinh(q, k, MAC_DINH[k] as never), k).toEqual([]);
    }
  });

  it("ghi → hiệu lực ngay, tăng phiên bản, nhật ký từ gì sang gì, lịch sử sua_cau_hinh", async () => {
    const qt = await nguoi("quantri@scigroup.vn");
    const q = await layQ();
    const cu = await layCauHinh(q, "quy_tac_de");
    const pb = await tx((t) => ghiCauHinh(t, qt, "quy_tac_de", { ...cu, thu_tu: "ngay_truoc", ngay_sau_tinh_theo: "ngay_gui" }));
    expect(pb).toBe(1);
    expect((await layCauHinh(q, "quy_tac_de")).thu_tu).toBe("ngay_truoc");
    const pb2 = await ghiCauHinh(q, qt, "quy_tac_de", { ...(await layCauHinh(q, "quy_tac_de")), thu_tu: "chi_cap" });
    expect(pb2).toBe(2);
    // lưu lại y nguyên thì không tăng phiên bản
    expect(await ghiCauHinh(q, qt, "quy_tac_de", await layCauHinh(q, "quy_tac_de"))).toBe(2);
    const nk = await nhatKyCauHinh(q, "quy_tac_de");
    expect(nk.map((d) => d.phien_ban)).toEqual([2, 1]);
    expect(nk[1].thay_doi).toEqual([
      { truong: "thu_tu", tu: "cap_truoc", sang: "ngay_truoc" },
      { truong: "ngay_sau_tinh_theo", tu: "ky_bao_cao", sang: "ngay_gui" },
    ]);
    expect(nk[0].boi_ten).toBe("Quản trị viên");
    const ls = await query<{ n: number }>("SELECT count(*)::int n FROM docflow.lich_su WHERE hanh_dong='sua_cau_hinh' AND doi_tuong_id='quy_tac_de'");
    expect(ls.rows[0].n).toBe(2);
  });

  it("quay lại bản cũ bằng một nút: tạo phiên bản mới mang giá trị cũ; 0 = mặc định", async () => {
    const qt = await nguoi("quantri@scigroup.vn");
    const q = await layQ();
    expect(await quayLaiPhienBan(q, qt, "quy_tac_de", 1)).toBe(3);
    expect((await layCauHinh(q, "quy_tac_de")).thu_tu).toBe("ngay_truoc");
    expect(await quayLaiPhienBan(q, qt, "quy_tac_de", 0)).toBe(4);
    expect(await layCauHinh(q, "quy_tac_de")).toEqual(MAC_DINH.quy_tac_de);
    await expect(quayLaiPhienBan(q, qt, "quy_tac_de", 99)).rejects.toThrow(/Không có phiên bản/);
    const ls = await query<{ v: string }>(
      "SELECT chi_tiet->>'quay_lai_phien_ban' v FROM docflow.lich_su WHERE hanh_dong='sua_cau_hinh' ORDER BY id DESC LIMIT 1",
    );
    expect(ls.rows[0].v).toBe("0");
  });

  it("từ chối cấu hình sai: luồng vòng tròn, đơn vị không tồn tại, số âm, sai kiểu, trường lạ", async () => {
    const qt = await nguoi("quantri@scigroup.vn");
    const q = await layQ();
    const vong = [...MAC_DINH.luong_bao_cao, { tu: "ban-tgd", den: "bqlda-qt", kiem_soat: [] }];
    const loiVong = await kiemTraCauHinh(q, "luong_bao_cao", vong);
    expect(loiVong).toEqual(["Luồng báo cáo bị vòng tròn: P.ĐT&PC → Ban TGĐ → BQLDA QT → P.ĐT&PC"]);
    await expect(ghiCauHinh(q, qt, "luong_bao_cao", vong)).rejects.toBeInstanceOf(LoiCauHinh);
    expect(await layCauHinh(q, "luong_bao_cao")).toEqual(MAC_DINH.luong_bao_cao);

    expect((await kiemTraCauHinh(q, "luong_bao_cao", [{ tu: "khong-co", den: "p-dtpc", kiem_soat: [] }]))[0]).toMatch(/không tồn tại/);
    expect(await kiemTraCauHinh(q, "so_cai", { ...MAC_DINH.so_cai, sap_den_han_ngay: -1 })).toEqual(["sap_den_han_ngay: không được là số âm (-1)"]);
    expect(await kiemTraCauHinh(q, "quy_tac_de", { ...MAC_DINH.quy_tac_de, da_xong_luon_ghi_nhan: "co" as never })).toEqual([
      "da_xong_luon_ghi_nhan: phải là bật/tắt, đang là chữ",
    ]);
    expect(await kiemTraCauHinh(q, "quy_tac_de", { ...MAC_DINH.quy_tac_de, thu_tu: "lung_tung" as never })).toHaveLength(1);
    // Công tắc "Bên ngoài đè được việc trong công ty" đã bỏ (28/09): cấu hình / tệp xuất cũ còn trường này vẫn lưu được
    expect(await kiemTraCauHinh(q, "quy_tac_de", { ...MAC_DINH.quy_tac_de, cap_ben_ngoai_duoc_de: true } as never)).toEqual([]);
    expect(await kiemTraCauHinh(q, "thu_muc", { ...MAC_DINH.thu_muc, la: 1 } as never)).toEqual(["la: trường lạ, không có trong cấu hình"]);
    expect((await kiemTraCauHinh(q, "ky_bao_cao", { ...MAC_DINH.ky_bao_cao, han_nop_theo_cap: { ...MAC_DINH.ky_bao_cao.han_nop_theo_cap, cap2: { tuan: "nay", thu: 9, gio: "25:00" } } })).length).toBe(2);
    expect(await kiemTraCauHinh(q, "khong_co" as never, {} as never)).toEqual(['Không có nhóm cài đặt "khong_co"']);
    // vòng tự thân (Ban TGĐ → Ban TGĐ) là hợp lệ
    expect(timVong([{ tu: "a", den: "a" }])).toBeNull();
    expect(timVong([{ tu: "a", den: "b" }, { tu: "b", den: "c" }, { tu: "c", den: "a" }])).toEqual(["a", "b", "c", "a"]);
  });

  it("phân quyền từng nhóm: trưởng ĐT&PC sửa luật kiểm tra, không sửa quy tắc đè; nhân viên không sửa gì", async () => {
    const q = await layQ();
    const pq = await layCauHinh(q, "phan_quyen_cau_hinh");
    const truong = await nguoi("truong.dtpc@scigroup.vn");
    const truongKt = await nguoi("truong.ktvh@scigroup.vn");
    const nv = await nguoi("nv.dtpc@scigroup.vn");
    expect(nhomDuocSua(truong, pq)).toEqual(["luat_kiem_tra"]);
    expect(duocSuaNhom(truongKt, "luat_kiem_tra", pq)).toBe(false);
    expect(nhomDuocSua(nv, pq)).toEqual([]);
    const luat = await layCauHinh(q, "luat_kiem_tra");
    luat.luat[8].bat = false;
    expect(await ghiCauHinh(q, truong, "luat_kiem_tra", luat)).toBe(1);
    await expect(ghiCauHinh(q, truong, "quy_tac_de", MAC_DINH.quy_tac_de)).rejects.toThrow(/không có quyền/);
    await expect(ghiCauHinh(q, truong, "phan_quyen_cau_hinh", { nhom: {} })).rejects.toThrow(/không có quyền/);
  });

  it("xuất rồi nhập sang máy khác: đủ mọi nhóm; nhập file sai thì không ghi gì", async () => {
    const qt = await nguoi("quantri@scigroup.vn");
    const q = await layQ();
    await ghiCauHinh(q, qt, "so_cai", { ...MAC_DINH.so_cai, sap_den_han_ngay: 5 });
    const file = JSON.parse(JSON.stringify(await xuatCauHinh(q))) as { cau_hinh: Record<string, { phien_ban: number; gia_tri: unknown }> };
    expect(Object.keys(file.cau_hinh).sort()).toEqual(Object.keys(MAC_DINH).sort());
    expect(file.cau_hinh.so_cai).toEqual({ phien_ban: 1, gia_tri: { ...MAC_DINH.so_cai, sap_den_han_ngay: 5 } });

    // "máy khác": CSDL mới tinh
    await csdlMoi({ macDinhGoc: true });
    const qt2 = await nguoi("quantri@scigroup.vn");
    const q2 = await layQ();
    const hong = structuredClone(file);
    (hong.cau_hinh.giao_dien.gia_tri as { mau_chinh: string }).mau_chinh = "xanh";
    const loi = await tx((t) => nhapCauHinh(t, qt2, hong));
    expect(loi).toEqual(['Giao diện, sao lưu: Màu chính "xanh" phải dạng #RRGGBB']);
    expect((await layCauHinh(q2, "so_cai")).sap_den_han_ngay).toBe(3);

    expect(await tx((t) => nhapCauHinh(t, qt2, file))).toEqual([]);
    expect((await layCauHinh(q2, "so_cai")).sap_den_han_ngay).toBe(5);
    expect((await layCauHinh(q2, "luat_kiem_tra")).luat[8].bat).toBe(false);
    // chỉ nhóm khác mặc định mới tạo phiên bản
    const { rows } = await query<{ khoa: string }>("SELECT khoa FROM docflow.cau_hinh ORDER BY khoa");
    expect(rows.map((r) => r.khoa)).toEqual(["luat_kiem_tra", "so_cai"]);
    const nv = await nguoi("nv.dtpc@scigroup.vn");
    expect((await nhapCauHinh(q2, nv, { so_cai: MAC_DINH.so_cai }))[0]).toMatch(/không có quyền/);
    expect(await nhapCauHinh(q2, qt2, { dinh_dang: "khac", cau_hinh: {} })).toHaveLength(1);
  });
});
