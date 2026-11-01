// kiemTraTaiLieu: đúng bảng "Hệ thống kiểm tra những gì" + luật là cấu hình.
// so-cai.xemTruocVaoSoCai: dùng hàm thật nếu module so-cai đã làm, còn "Chưa làm" thì giả lập (tests/fixtures/gia-lap.ts).
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";

vi.mock("@/lib/so-cai/dich-vu", async (goc) => {
  const g = await import("../fixtures/gia-lap");
  return g.boc((await goc()) as Record<string, unknown>, g.giaLapSoCai);
});

import { csdlMoi, nguoi } from "../helpers/csdl";
import { layQ, type Q } from "@/lib/db";
import { kiemTraDayDu, kiemTraTaiLieu, danhSachMau, layMau } from "@/lib/kiem-tra/kiem-tra";
import { chiSoVaoSoCai } from "@/lib/kiem-tra/dau-vao";
import { docKyBaoCao } from "@/lib/kiem-tra/chuan-hoa";
import { napDanhBa, phanGiaiPhuTrach, timTen } from "@/lib/kiem-tra/phan-giai";
import type { LoiKiemTra } from "@/lib/types";
import { MAC_DINH } from "@/lib/cau-hinh/mac-dinh";
import { khoTam, viDu, boSinh, datCauHinh, xoaCauHinh } from "../fixtures/chuan-bi";
import { thay } from "../fixtures/gia-lap";

let q: Q;
const chan = (l: LoiKiemTra[]) => l.filter((x) => x.muc === "chan");

beforeAll(async () => {
  khoTam();
  await csdlMoi();
  q = await layQ();
});

afterEach(async () => {
  for (const k of Object.keys(thay)) delete thay[k];
  await xoaCauHinh(q, "luat_kiem_tra");
  await xoaCauHinh(q, "quy_tac_de");
});

describe("12 mẫu gieo sẵn", () => {
  it("có Form 0–11, file mẫu trong kho, gửi đến mặc định theo mẫu (Form 11 BĐH dự án Loại khác → SCI E&C, 20/10/2026)", async () => {
    const ds = await danhSachMau(q);
    expect(ds.map((m) => m.ma)).toEqual(["form-0", "form-1", "form-2", "form-3", "form-4", "form-5", "form-6", "form-7", "form-8", "form-9", "form-10", "form-11"]);
    const gd = Object.fromEntries(ds.map((m) => [m.ma, m.gui_den_mac_dinh]));
    expect(gd).toMatchObject({ "form-5": "p-dtpc", "form-6": "p-dtpc", "form-7": "p-dtpc", "form-8": "p-ktvh", "form-1": "ban-tgd", "form-4": "ban-tgd", "form-0": "ban-tgd", "form-11": "sci-enc" });
    expect(ds.find((m) => m.ma === "form-6")?.loai_ky).toBe("tuan");
    const { rows } = await q.query<{ n: number }>("SELECT count(*)::int n FROM docflow.mau_word WHERE khoa_luu IS NOT NULL");
    expect(rows[0].n).toBe(12);
    const f0 = await layMau(q, "form-0");
    expect(f0!.dinh_nghia.bang_cong_viec.find((b) => b.tag === "bang_quyet_dinh")?.la_quyet_dinh).toBe(true);
    expect(f0!.dinh_nghia.muc_bat_buoc).toContain("VIỆC CẦN LÃNH ĐẠO QUYẾT ĐỊNH TUẦN NÀY");
    expect(f0!.phien_ban).toBeGreaterThanOrEqual(2);
  });
});

describe("kiểm tra báo cáo tuần 29 BQLDA Quảng Trị (Form 7)", () => {
  it("bản 1 (file cũ, Người lập còn '......'): mẫu bản 6 không kiểm Người lập nữa → đạt; kỳ báo cáo chưa tích thì chặn đúng ô kỳ", async () => {
    const nd = await nguoi("nv.bqlda@scigroup.vn");
    const kq = await kiemTraDayDu(q, nd, viDu("BaoCao_Tuan29_BQLDA_QuangTri_ban1.docx"), "BaoCao_Tuan29_BQLDA_QuangTri_ban1.docx");
    expect(kq.dat).toBe(true);
    expect(kq.mau_ma).toBe("form-7");
    expect(chan(kq.loi)).toEqual([]);
    expect(kq.loi.some((l) => l.luat === "nguoi_lap" || ["nguoi_lap", "ngay_lap", "nguoi_kiem_soat"].includes(l.vi_tri?.tag ?? ""))).toBe(false);
    // ngày nộp do máy ghi (test: đầu kỳ — tuần 29 ISO bắt đầu thứ Hai 13/07; ví dụ sửa ngày 01/10)
    expect(kq.ngay_nop).toBe("2026-07-13");
    // ô bắt buộc còn lại của mẫu bản 6 để trống → chặn đúng một ô, các điều kiện khác đạt
    const { taoBaoCao, VI_DU } = await boSinh();
    const g = VI_DU.bqlda(29, "");
    g.o.ky_bao_cao = { chon: "", tuan: "......./2026" };
    const kqChan = await kiemTraDayDu(q, nd, await taoBaoCao("form-7", g), "ban1-chua-ky.docx");
    expect(kqChan.dat).toBe(false);
    const c = chan(kqChan.loi);
    expect(c).toHaveLength(1);
    expect(c[0]).toMatchObject({ luat: "ky_bao_cao", vi_tri: { tag: "ky_bao_cao" } });
    expect(kq.ky_bao_cao).toEqual({ loai: "tuan", so: 29, nam: 2026, tu: "2026-07-13", den: "2026-07-19" });
    expect(kq.gui_den).toEqual(["p-dtpc"]);
    // Mẫu phiên bản 4 (29/09): việc CHỈ lấy từ chương "KẾT QUẢ VÀ KẾ HOẠCH VIỆC TUẦN TỚI" — bảng Kiến nghị / GPMB không sinh việc
    expect(kq.cong_viec.map((c) => c.nguon_bang)).toEqual(["bang_cong_viec", "bang_cong_viec", "bang_cong_viec"]);
  });

  it("bản 2 (đã điền người lập): đạt; bắt đầu trống → ngày nộp; không có hạn → treo (cảnh báo); bảng không có cột phụ trách → việc của đơn vị lập, không cảnh báo", async () => {
    const nd = await nguoi("nv.bqlda@scigroup.vn");
    const kq = await kiemTraDayDu(q, nd, viDu("BaoCao_Tuan29_BQLDA_QuangTri_ban2.docx"), "ban2.docx");
    expect(kq.dat).toBe(true);
    const [gpmb, dat, mong] = kq.cong_viec;
    expect(gpmb).toMatchObject({ ten: "GPMB Trụ T11", du_an: "ĐG Hướng Việt", bat_dau: "2026-07-14", ket_thuc: "2026-08-05", nguon_bang: "bang_cong_viec", dong_so: 1 });
    expect(gpmb.phu_trach).toEqual([expect.objectContaining({ loai: "don_vi", id: "bqlda-qt" })]);
    expect(gpmb.bat_dau_kieu).toBe("ngay");
    // Ô Bắt đầu trống → ngày nộp máy ghi (mẫu bản 6; test: đầu kỳ) — không đọc ô Ngày lập của file cũ nữa
    expect(dat.bat_dau).toBe("2026-07-13");
    expect(dat.bat_dau_kieu).toBe("ngay_bao_cao");
    expect(dat.ket_thuc).toBeUndefined();
    expect(dat.phu_trach_tu_gan).toBeUndefined();
    expect(dat.phu_trach).toEqual([expect.objectContaining({ loai: "don_vi", id: "bqlda-qt" })]);
    expect(mong.phu_trach.map((p) => p.id)).toEqual(["bqlda-qt"]);
    const luonMo = kq.loi.find((l) => l.luat === "ngay_trong");
    expect(luonMo).toMatchObject({ muc: "canh_bao", vi_tri: { bang: "bang_cong_viec", dong: 2, cot: "ket_thuc" } });
    expect(luonMo!.thong_diep).toContain("TREO");
    expect(kq.loi.some((l) => l.vi_tri?.cot === "phu_trach")).toBe(false);
    expect(kq.du_doan).toHaveLength(3); // đã hỏi sổ cái (xem trước): 3 việc của chương việc
  });

  it("file sai mẫu (Word thường, không có ô gắn mã) bị chặn", async () => {
    const nd = await nguoi("nv.bqlda@scigroup.vn");
    const kq = await kiemTraTaiLieu(q, nd, viDu("BaoCao_SaiMau.docx"), "BaoCao_SaiMau.docx");
    expect(kq.dat).toBe(false);
    expect(chan(kq.loi)[0]).toMatchObject({ luat: "dung_mau", vi_tri: { tag: "mau_ma" } });
    expect(chan(kq.loi)[0].thong_diep).toContain("Không nhận ra mẫu");
  });

  it("mất mục bắt buộc và mất ô nhập bị chặn, chỉ đúng chỗ", async () => {
    const nd = await nguoi("nv.bqlda@scigroup.vn");
    const kq = await kiemTraTaiLieu(q, nd, viDu("BaoCao_Tuan29_BQLDA_MatO.docx"), "MatO.docx");
    expect(kq.dat).toBe(false);
    const c = chan(kq.loi);
    expect(c.some((l) => l.thong_diep.includes('Thiếu mục "RỦI RO & KIẾN NGHỊ PHÒNG ĐT&PC"'))).toBe(true);
    // file cũ mất ô Người kiểm soát: mẫu bản 6 đã bỏ ô này → không báo
    expect(c.some((l) => l.vi_tri?.tag === "nguoi_kiem_soat")).toBe(false);
    // mẫu bản 6: xóa mất ô bắt buộc còn lại (Kỳ báo cáo) thì bị chặn
    const { taoBaoCao, VI_DU } = await boSinh();
    const kq2 = await kiemTraTaiLieu(q, nd, await taoBaoCao("form-7", { ...VI_DU.bqlda(29, "Lý Thị Nga"), bo_o: ["ky_bao_cao"] }), "MatO2.docx");
    expect(kq2.dat).toBe(false);
    expect(chan(kq2.loi).some((l) => l.vi_tri?.tag === "ky_bao_cao" && l.thong_diep.includes("Mất ô nhập"))).toBe(true);
  });

  it("ngày bắt đầu sau kết thúc, ngày sai dạng → chặn đúng ô; dd/mm thiếu năm → hiểu theo năm kỳ báo cáo", async () => {
    const nd = await nguoi("nv.bqlda@scigroup.vn");
    const { taoBaoCao, VI_DU } = await boSinh();
    const g = VI_DU.bqlda(29, "Lý Thị Nga");
    g.bang.bang_cong_viec[0] = { ...g.bang.bang_cong_viec[0], bat_dau: "20/08/2026", ket_thuc: "10/08/2026" };
    g.bang.bang_cong_viec[2] = { ...g.bang.bang_cong_viec[2], bat_dau: "32/07/2026", ket_thuc: "15/08" };
    const kq = await kiemTraDayDu(q, nd, await taoBaoCao("form-7", g), "x.docx");
    expect(kq.dat).toBe(false);
    const c = chan(kq.loi);
    expect(c.find((l) => l.vi_tri?.dong === 1)).toMatchObject({ luat: "ngay_hop_le", vi_tri: { bang: "bang_cong_viec", dong: 1, cot: "ket_thuc" } });
    expect(c.find((l) => l.vi_tri?.dong === 3)).toMatchObject({ luat: "ngay_hop_le", vi_tri: { cot: "bat_dau" } });
    expect(kq.cong_viec[2].ket_thuc).toBe("2026-08-15");
  });

  it("ô Bắt đầu trống + hạn đã qua trước ngày nộp báo cáo (chưa xong) → chặn; đã xong thì không chặn (Mr. Đại bắt 29/09: 23 việc lọt sổ)", async () => {
    const nd = await nguoi("nv.bqlda@scigroup.vn");
    const { taoBaoCao, VI_DU } = await boSinh();
    const g = VI_DU.bqlda(29, "Lý Thị Nga");
    g.bang.bang_cong_viec[0] = { ...g.bang.bang_cong_viec[0], bat_dau: "", ket_thuc: "02/01/2026", da_xong: "", tinh_trang: "Đang làm" };
    g.bang.bang_cong_viec[1] = { ...g.bang.bang_cong_viec[1], bat_dau: "", ket_thuc: "02/01/2026", da_xong: "x", tinh_trang: "Đã xong" };
    const kq = await kiemTraDayDu(q, nd, await taoBaoCao("form-7", g), "x.docx");
    const c = chan(kq.loi).filter((l) => l.thong_diep.includes("đã qua trước ngày nộp báo cáo"));
    expect(c.map((l) => l.vi_tri?.dong)).toEqual([1]);
    expect(c[0]).toMatchObject({ luat: "ngay_hop_le", vi_tri: { bang: "bang_cong_viec", cot: "ket_thuc" } });
  });

  it("kỳ báo cáo chưa tích/chưa ghi số → chặn ô ky_bao_cao; không có nơi nhận nào → chặn gui_den", async () => {
    const nd = await nguoi("nv.bqlda@scigroup.vn");
    const { taoBaoCao, VI_DU } = await boSinh();
    const g = VI_DU.bqlda(29, "Lý Thị Nga");
    g.o.ky_bao_cao = { chon: "", tuan: "......./2026" };
    const kq = await kiemTraDayDu(q, nd, await taoBaoCao("form-7", g), "x.docx");
    expect(chan(kq.loi).map((l) => l.vi_tri?.tag)).toEqual(["ky_bao_cao"]);
    expect(chan(kq.loi)[0].thong_diep).toContain("Chưa ghi số tuần"); // mẫu bản 9: không còn hộp tích kỳ
    // mẫu không có nơi nhận mặc định, đơn vị không có luồng báo cáo
    await q.query("UPDATE docflow.mau_word SET gui_den_mac_dinh = NULL WHERE ma = 'form-7'");
    await datCauHinh(q, "luong_bao_cao", []);
    g.o.ky_bao_cao = { chon: "tuan", tuan: "29/2026   (13/07 – 19/07/2026)" };
    g.o.gui_den = "";
    const kq2 = await kiemTraDayDu(q, nd, await taoBaoCao("form-7", g), "x.docx");
    expect(chan(kq2.loi)).toEqual([expect.objectContaining({ luat: "gui_den", vi_tri: { tag: "gui_den" } })]);
    await q.query("UPDATE docflow.mau_word SET gui_den_mac_dinh = 'p-dtpc' WHERE ma = 'form-7'");
    await xoaCauHinh(q, "luong_bao_cao");
  });

  it("luật là cấu hình: hạ mức, tắt, chỉ áp dụng cho mẫu khác; tắt 'việc không ngày luôn mở' thì chặn", async () => {
    const nd = await nguoi("nv.bqlda@scigroup.vn");
    // mẫu bản 6 bỏ ô Người lập: dùng ô bắt buộc còn lại — Kỳ báo cáo chưa tích (luật ky_bao_cao)
    const { taoBaoCao, VI_DU } = await boSinh();
    const g = VI_DU.bqlda(29, "Lý Thị Nga");
    g.o.ky_bao_cao = { chon: "", tuan: "......./2026" };
    const ban1 = await taoBaoCao("form-7", g);
    const luat = structuredClone(MAC_DINH.luat_kiem_tra);
    luat.luat.find((l) => l.ma === "ky_bao_cao")!.muc = "canh_bao";
    await datCauHinh(q, "luat_kiem_tra", luat);
    let kq = await kiemTraTaiLieu(q, nd, ban1, "b1.docx");
    expect(kq.dat).toBe(true);
    expect(kq.loi.find((l) => l.luat === "ky_bao_cao")?.muc).toBe("canh_bao");

    luat.luat.find((l) => l.ma === "ky_bao_cao")!.muc = "chan";
    luat.luat.find((l) => l.ma === "ky_bao_cao")!.ap_dung = ["form-6"];
    await datCauHinh(q, "luat_kiem_tra", luat);
    kq = await kiemTraTaiLieu(q, nd, ban1, "b1.docx");
    expect(kq.loi.some((l) => l.luat === "ky_bao_cao" && l.muc !== "goi_y")).toBe(false);

    luat.luat.find((l) => l.ma === "ky_bao_cao")!.ap_dung = "tat_ca";
    luat.luat.find((l) => l.ma === "ky_bao_cao")!.bat = false;
    await datCauHinh(q, "luat_kiem_tra", luat);
    kq = await kiemTraTaiLieu(q, nd, ban1, "b1.docx");
    expect(kq.dat).toBe(true);

    await xoaCauHinh(q, "luat_kiem_tra");
    await datCauHinh(q, "quy_tac_de", { ...MAC_DINH.quy_tac_de, viec_khong_ngay_luon_mo: false });
    kq = await kiemTraTaiLieu(q, nd, viDu("BaoCao_Tuan29_BQLDA_QuangTri_ban2.docx"), "b2.docx");
    expect(kq.dat).toBe(false);
    expect(chan(kq.loi)).toEqual([expect.objectContaining({ luat: "ngay_trong", vi_tri: { bang: "bang_cong_viec", dong: 2, cot: "ket_thuc" } })]);
  });
});

describe("phân giải người phụ trách, Form 0, Form 8, việc trùng", () => {
  it("Form 8 Nậm Xe: việc thuộc đơn vị lập (mẫu không có cột phụ trách), gửi P.KT&VH", async () => {
    const nd = await nguoi("gd.namxe@scigroup.vn");
    const kq = await kiemTraDayDu(q, nd, viDu("BaoCao_Tuan29_NM_NamXe.docx"), "nx.docx");
    expect(kq.dat).toBe(true);
    expect(kq.gui_den).toEqual(["p-ktvh"]);
    expect(kq.cong_viec[0].ten).toBe("Thay relay bảo vệ R21 máy phát TM2");
    expect(kq.cong_viec[0].phu_trach.map((p) => p.id)).toEqual(["nm-namxe"]);
    expect(kq.cong_viec).toHaveLength(1); // bảng Sự cố / Kiến nghị không sinh việc
  });

  it("Form 0 cột Bộ phận phụ trách: tên người, email, tên không nhận ra (cảnh báo, tạm gán đơn vị lập)", async () => {
    const nd = await nguoi("photgd@scigroup.vn");
    const { taoBaoCao, VI_DU } = await boSinh();
    const g = VI_DU.bqlda(29, "Lý Thị Nga");
    g.bang.bang_cong_viec[0].phu_trach = "Phó TGĐ phụ trách + hung.tv@scigroup.vn, Nhà máy Nậm Xe";
    g.bang.bang_cong_viec[2].phu_trach = "Ông Tư ngoài công trường";
    const kq = await kiemTraDayDu(q, nd, await taoBaoCao("form-0", { bang: g.bang }), "x.docx");
    expect(kq.cong_viec.find((c) => c.nguon_bang === "bang_cong_viec" && c.dong_so === 1)!.phu_trach).toEqual([
      expect.objectContaining({ loai: "nguoi", id: "photgd@scigroup.vn" }),
      expect.objectContaining({ loai: "nguoi", id: "hung.tv@scigroup.vn" }),
      expect.objectContaining({ loai: "don_vi", id: "nm-namxe" }),
    ]);
    const c2 = kq.cong_viec.find((c) => c.nguon_bang === "bang_cong_viec" && c.dong_so === 3)!;
    expect(c2.phu_trach).toEqual([expect.objectContaining({ id: "ban-tgd" })]); // tạm gán đơn vị lập Form 0
    const w = kq.loi.find((l) => l.vi_tri?.bang === "bang_cong_viec" && l.vi_tri?.dong === 3 && l.vi_tri?.cot === "phu_trach");
    expect(w).toMatchObject({ luat: "ten_viec", muc: "canh_bao" });
  });

  it("Form 0 hợp nhất tuần 30: dòng quyết định TGĐ đọc được nhưng không vào sổ cái lúc gửi", async () => {
    const nd = await nguoi("photgd@scigroup.vn");
    const kq = await kiemTraDayDu(q, nd, viDu("BaoCao_HopNhat_Tuan30.docx"), "f0.docx");
    expect(kq.dat).toBe(true);
    expect(kq.gui_den).toEqual(["ban-tgd"]);
    const qds = kq.cong_viec.filter((c) => c.nguon_bang === "bang_quyet_dinh");
    expect(qds).toHaveLength(6); // 5 dòng có sẵn trong mẫu thật + dòng của kịch bản
    const qd = qds.find((c) => c.ten === "Chi trả GPMB Trụ T11")!;
    expect(qd).toMatchObject({ han_quyet_dinh: "2026-07-28", mo_ta: "Nâng đơn giá bồi thường cho 3 hộ theo QĐ mới của UBND tỉnh", cot_khac: { uu_tien: "4" } });
    expect(qd.ket_thuc).toBeUndefined(); // hạn việc do TGĐ đặt khi giao
    expect(qd.phu_trach.map((p) => p.id)).toEqual(["bqlda-qt", "p-dtpc"]);
    // "BQLDA QT (P. ĐT&PC)" → cả hai đơn vị; dòng quyết định không bị báo "luôn mở"
    expect(qds.find((c) => c.ten.startsWith("Ký Công văn"))!.phu_trach.map((p) => p.id)).toEqual(["bqlda-qt", "p-dtpc"]);
    expect(kq.loi.some((l) => l.luat === "ngay_trong" && l.vi_tri?.bang === "bang_quyet_dinh")).toBe(false);
    const vao = chiSoVaoSoCai(kq, kq.mau);
    expect(vao.map((i) => kq.cong_viec[i].nguon_bang)).toEqual(["bang_cong_viec"]);
  });

  it("việc trùng: báo trước việc sẽ bị đè / không được dùng / gợi ý trùng, chỉ đúng dòng", async () => {
    thay.xemTruocVaoSoCai = async () => [
      { dong: 0, hanh_dong: "de", cong_viec_id: "CV-2026-0412", ly_do: "cùng cấp, ngày sau" },
      { dong: 1, hanh_dong: "goi_y_trung", goi_y: [{ cong_viec_id: "CV-2026-0413", ten: "Chuyển mục đích đất rừng", do_giong: 0.8 }] },
      { dong: 2, hanh_dong: "khong_dung", cong_viec_id: "CV-2026-0401", ly_do: "thua cấp" },
    ];
    const nd = await nguoi("nv.bqlda@scigroup.vn");
    const kq = await kiemTraDayDu(q, nd, viDu("BaoCao_Tuan29_BQLDA_QuangTri_ban2.docx"), "b2.docx");
    const t = kq.loi.filter((l) => l.luat === "viec_trung");
    expect(t).toHaveLength(3);
    expect(t[0]).toMatchObject({ muc: "canh_bao", vi_tri: { bang: "bang_cong_viec", dong: 1 } });
    expect(t[0].thong_diep).toContain("CV-2026-0412");
    expect(t[1].thong_diep).toContain("có vẻ trùng CV-2026-0413");
    expect(t[2].thong_diep).toContain("không được dùng (thua cấp)");
    expect(kq.du_doan.map((d) => d.chi_so)).toEqual([0, 1, 2]);
    expect(kq.dat).toBe(true);
  });

  it("module sổ cái lỗi thì kiểm tra vẫn chạy (không chặn)", async () => {
    thay.xemTruocVaoSoCai = async () => {
      throw new Error("Chưa làm");
    };
    const nd = await nguoi("nv.bqlda@scigroup.vn");
    const kq = await kiemTraDayDu(q, nd, viDu("BaoCao_Tuan29_BQLDA_QuangTri_ban2.docx"), "b2.docx");
    expect(kq.dat).toBe(true);
    expect(kq.so_cai_chua_san_sang).toBe("Chưa làm");
  });

  it("góp ý nội dung (móc AI) không chặn: mục IV của SCI E&C bản 1 còn '......'", async () => {
    const nd = await nguoi("nv.enc@scigroup.vn");
    const kq = await kiemTraDayDu(q, nd, viDu("BaoCao_Thang7_SCI_ENC.docx"), "enc.docx");
    expect(kq.dat).toBe(true);
    expect(kq.ky_bao_cao).toMatchObject({ loai: "thang", so: 7, tu: "2026-07-01", den: "2026-07-31" });
    // 5 việc chương "KẾT QUẢ VÀ KẾ HOẠCH VIỆC THÁNG TỚI"; bảng Kiến nghị không sinh việc (mẫu phiên bản 4)
    expect(kq.cong_viec).toHaveLength(5);
    const g = kq.loi.find((l) => l.luat === "noi_dung_ai");
    expect(g).toMatchObject({ vi_tri: { tag: "muc:TIẾN ĐỘ THU VỐN & HỢP ĐỒNG" } });
    expect(kq.cong_viec.filter((c) => c.nguon_bang === "bang_cong_viec")).toHaveLength(5);
    // Mẫu không có cột phụ trách → việc của đơn vị lập (SCI E&C)
    expect(kq.cong_viec.every((c) => c.phu_trach.map((p) => p.id).join() === "sci-enc")).toBe(true);
    const ban2 = await kiemTraDayDu(q, nd, viDu("BaoCao_Thang7_SCI_ENC_ban2.docx"), "enc2.docx");
    expect(ban2.loi.some((l) => l.luat === "noi_dung_ai")).toBe(false);
    expect(g!.muc).not.toBe("chan");
  });

  it("báo cáo của đơn vị khác (người nộp không thuộc): theo NỘI DUNG file là BQLDA QT, và CHẶN — chốt 29/09", async () => {
    const nd = await nguoi("nv.enc@scigroup.vn");
    const kq = await kiemTraDayDu(q, nd, viDu("BaoCao_Tuan29_BQLDA_QuangTri_ban2.docx"), "b2.docx");
    expect(kq.don_vi_lap).toBe("bqlda-qt");
    expect(kq.dat).toBe(false);
    expect(kq.loi.find((l) => l.luat === "dung_mau" && l.muc === "chan")?.thong_diep).toContain("bạn không thuộc BQLDA Quảng Trị");
  });
});

describe("ô kỳ báo cáo một ô (mẫu thật) và tên nơi nhận", () => {
  it("đọc ☒/☐, số kỳ/năm, từ–đến; ngày thiếu năm lấy năm của kỳ; tháng/quý tự tính đầu–cuối", () => {
    expect(docKyBaoCao("☒ Tuần 29/2026   (13/07 – 19/07/2026)\n☐ Tháng ......./2026")).toMatchObject({ loai: "tuan", so: 29, nam: 2026, tu: "2026-07-13", den: "2026-07-19", loi: [] });
    expect(docKyBaoCao("☐ Tuần ......./2026\n☒ Tháng 07/2026")).toMatchObject({ loai: "thang", so: 7, tu: "2026-07-01", den: "2026-07-31", loi: [] });
    expect(docKyBaoCao("x Tuần 30/2026 (20/07/2026 - 26/07/2026)  ☐ Tháng ....../20")).toMatchObject({ loai: "tuan", so: 30, tu: "2026-07-20", loi: [] });
    expect(docKyBaoCao("☒ Quý 3/2026")).toMatchObject({ loai: "quy", tu: "2026-07-01", den: "2026-09-30" });
    expect(docKyBaoCao("☐ Tuần 29/2026 (14/07 – 20/07/2026)\n☐ Tháng ......./2026").goi_y[0]).toContain("Chưa tích");
    expect(docKyBaoCao("☒ Tuần 29/2026\n☒ Tháng 07/2026").loi[0]).toContain("nhiều kỳ");
    // Mẫu bản 9 (Mr. Đại 01/10/2026): ô kỳ chỉ một loại, không hộp tích; "từ – đến" phải KHỚP số tuần ISO, bỏ trống thì máy tự tính
    expect(docKyBaoCao("Tuần 29/2026")).toMatchObject({ loai: "tuan", tu: "2026-07-13", den: "2026-07-19", loi: [] });
    expect(docKyBaoCao("Tuần 40/2026   (....../....../20... – ....../....../20...)")).toMatchObject({ tu: "2026-09-28", den: "2026-10-04", loi: [] });
    expect(docKyBaoCao("Tuần 40/2026 (28/09/2026 – 04/10/2026)")).toMatchObject({ so: 40, tu: "2026-09-28", den: "2026-10-04", loi: [] });
    expect(docKyBaoCao("Tuần 40/2026 (21/09/2026 – 27/09/2026)").loi).toEqual([
      "Kỳ báo cáo: tuần 40/2026 là 7 ngày · 28/09/2026 – 04/10/2026, file ghi 7 ngày · 21/09/2026 – 27/09/2026 — sửa số tuần hoặc ngày cho khớp",
    ]);
    expect(docKyBaoCao("Tuần 1/2027 (04/01/2027 – 10/01/2027)").loi).toEqual([]); // tuần 1 = tuần chứa 04/01
    expect(docKyBaoCao("Tháng 09/2026")).toMatchObject({ loai: "thang", tu: "2026-09-01", den: "2026-09-30", loi: [] });
    expect(docKyBaoCao("☒ Tuần 29/2026 (20/07 – 14/07/2026)").loi[0]).toContain("sau đến ngày");
    expect(docKyBaoCao("☐ Tuần ......./2026\n☐ Tháng ......./2026").loi[0]).toContain("Chưa tích");
  });

  it("tên đơn vị viết kiểu mẫu thật: '& ', '— SCI Corp', 'SCI ENC', 'P. TC&KT', ngoặc", async () => {
    const db = await napDanhBa(q);
    const id = (t: string, chiDv = false) => timTen(t, db, chiDv)?.id ?? null;
    expect(id("Phòng Đầu tư & Pháp chế — SCI Corp", true)).toBe("p-dtpc");
    expect(id("Phòng Đầu tư & Pháp chế — SCI Group", true)).toBe("p-dtpc");
    expect(id("Phòng Kinh tế & Vận hành — SCI Corp", true)).toBe("p-ktvh");
    expect(id("SCI ENC")).toBe("sci-enc");
    expect(id("P. TC&KT")).toBe("p-tckt");
    expect(id("P. ĐT&PC")).toBe("p-dtpc");
    expect(id("P. HCTH")).toBe("p-hcth");
    expect(phanGiaiPhuTrach("BQLDA QT (P. ĐT&PC)", db).phu_trach.map((p) => p.id)).toEqual(["bqlda-qt", "p-dtpc"]);
  });
});
