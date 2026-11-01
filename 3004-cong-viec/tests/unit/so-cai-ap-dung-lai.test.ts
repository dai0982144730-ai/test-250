// Áp dụng lại quy tắc đè cho việc đang mở khi đổi cài đặt (quy_tac_de.ap_dung_lai_khi_doi).
// Chuỗi GPMB T11 theo kế hoạch v2: BQLDA tuần 28 → tuần 29 → P.ĐT&PC tuần 29 (cấp cao đè) → BQLDA tuần 30 (thua cấp).
// Đổi "cấp trước" → "chỉ theo ngày": BQLDA tuần 30 (kỳ mới nhất) thành nguồn hiện hành.
import { describe, it, expect, beforeAll } from "vitest";
import { csdlMoi, nguoi } from "../helpers/csdl";
import { query, tx } from "@/lib/db";
import type { DauVaoSoCai, DongCongViec, NguoiDungPhien } from "@/lib/types";
import { chiTietViec, ghiVaoSoCai, giaHan, giaoViec, ketThucPhanViec } from "@/lib/so-cai/dich-vu";
import { apDungLaiQuyTac, xemTruocApDungLai } from "@/lib/so-cai/ap-dung-lai";
import { ghiCauHinh, type KetQuaGhiThem } from "@/lib/cau-hinh/ghi";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import type { CauHinh } from "@/lib/cau-hinh/mac-dinh";

const BQ = { loai: "don_vi" as const, id: "bqlda-qt", ten: "BQLDA Quảng Trị" };
const DT = { loai: "don_vi" as const, id: "p-dtpc", ten: "Phòng Đầu tư và Pháp chế" };

function dong(p: Partial<DongCongViec> & { ten: string }): DongCongViec {
  return { phu_trach: [], nguon_bang: "bang_cong_viec", dong_so: 1, ...p };
}

function bqlda(tuan: number, kyDen: string, ngayGui: string, cv: DongCongViec[], extra: Partial<DauVaoSoCai> = {}): DauVaoSoCai {
  return {
    tai_lieu_id: null,
    phien_ban: null,
    mau_ma: "form-7",
    nhan: `BQLDA Quảng Trị · Form 7 · tuần ${tuan}`,
    don_vi_id: "bqlda-qt",
    cap: 3,
    nguoi_gui: "gd.bqlda@scigroup.vn",
    ky_bao_cao_den: kyDen,
    ngay_gui: ngayGui,
    cong_viec: cv,
    ...extra,
  };
}

function dtpc(tuan: number, kyDen: string, ngayGui: string, cv: DongCongViec[], extra: Partial<DauVaoSoCai> = {}): DauVaoSoCai {
  return {
    tai_lieu_id: null,
    phien_ban: null,
    mau_ma: "form-1",
    nhan: `Phòng Đầu tư và Pháp chế · Form 1 · tuần ${tuan}`,
    don_vi_id: "p-dtpc",
    cap: 2,
    nguoi_gui: "truong.dtpc@scigroup.vn",
    ky_bao_cao_den: kyDen,
    ngay_gui: ngayGui,
    cong_viec: cv,
    ...extra,
  };
}

async function lichSu(id: string) {
  const { rows } = await query<{ hanh_dong: string; chi_tiet: Record<string, unknown>; nguoi: string }>(
    "SELECT hanh_dong, chi_tiet, nguoi FROM docflow.lich_su WHERE doi_tuong_loai = 'cong_viec' AND doi_tuong_id = $1 ORDER BY id",
    [id],
  );
  return rows;
}

async function demLichSu(): Promise<number> {
  const { rows } = await query<{ n: number }>("SELECT count(*)::int AS n FROM docflow.lich_su");
  return Number(rows[0].n);
}

async function anhNguon(): Promise<string> {
  const { rows } = await query("SELECT id, trang_thai, ly_do FROM docflow.nguon_cong_viec ORDER BY id");
  const { rows: cv } = await query("SELECT id, ten, ket_thuc::text, nguon_hien_hanh_id, trang_thai FROM docflow.cong_viec ORDER BY id");
  const { rows: pv } = await query("SELECT id, trang_thai, da_bo, ket_thuc::text FROM docflow.phan_viec ORDER BY id");
  return JSON.stringify([rows, cv, pv]);
}

async function luuQuyTac(qt: NguoiDungPhien, doi: Partial<CauHinh["quy_tac_de"]>): Promise<KetQuaGhiThem> {
  const ra: KetQuaGhiThem = {};
  await tx(async (q) => ghiCauHinh(q, qt, "quy_tac_de", { ...(await layCauHinh(q, "quy_tac_de")), ...doi }, null, ra));
  return ra;
}

describe("áp dụng lại quy tắc đè khi đổi cài đặt", () => {
  let qt: NguoiDungPhien;
  let A = ""; // chuỗi GPMB T11
  let B = ""; // có phần việc đã kết thúc + gia hạn tay sau bản thua
  let C = ""; // quyết định TGĐ
  let D = ""; // đã hoàn thành
  let pvBqB = "";
  let pvDtB = "";

  beforeAll(async () => {
    await csdlMoi();
    qt = await nguoi("quantri@scigroup.vn");
    const tDt = await nguoi("truong.dtpc@scigroup.vn");
    const gd = await nguoi("gd.bqlda@scigroup.vn");
    const tgd = await nguoi("tgd@scigroup.vn");

    // --- A: GPMB Trụ T11 ---
    const tenA = "GPMB Trụ T11 · 3 hộ khiếu nại đơn giá";
    A = (await tx((q) => ghiVaoSoCai(q, bqlda(28, "2026-07-13", "2026-07-14T03:00:00Z", [dong({ ten: tenA, du_an: "ĐG Hướng Việt", bat_dau: "2026-07-14", ket_thuc: "2026-07-30" })]))))[0]
      .cong_viec_id!;
    await tx((q) => ghiVaoSoCai(q, bqlda(29, "2026-07-20", "2026-07-21T03:05:00Z", [dong({ ma_viec: A, ten: tenA, du_an: "ĐG Hướng Việt", bat_dau: "2026-07-14", ket_thuc: "2026-08-05" })])));
    const k3 = await tx((q) =>
      ghiVaoSoCai(q, dtpc(29, "2026-07-20", "2026-07-22T02:00:00Z", [dong({ ten: "GPMB trụ T11 (3 hộ khiếu nại)", du_an: "ĐG Hướng Việt", phu_trach: [BQ], bat_dau: "2026-07-14", ket_thuc: "2026-08-10" })], { xac_nhan_trung: { 0: A } })),
    );
    expect(k3[0]).toMatchObject({ hanh_dong: "de", ly_do: "cấp cao hơn đè" });
    const k4 = await tx((q) => ghiVaoSoCai(q, bqlda(30, "2026-07-27", "2026-07-28T02:00:00Z", [dong({ ma_viec: A, ten: tenA, ket_thuc: "2026-08-12" })])));
    expect(k4[0]).toMatchObject({ hanh_dong: "khong_dung", ly_do: "thua cấp" });

    // --- B: P.ĐT&PC giao 2 phần; phần P.ĐT&PC đã kết thúc; BQLDA tuần 30 thua; sau đó người giao gia hạn tay phần BQLDA ---
    B = (await tx((q) => ghiVaoSoCai(q, dtpc(29, "2026-07-20", "2026-07-22T02:10:00Z", [dong({ ten: "Thỏa thuận đấu nối 110kV Hướng Việt", phu_trach: [BQ, DT], ket_thuc: "2026-08-10" })]))))[0]
      .cong_viec_id!;
    const ctB = await tx((q) => chiTietViec(q, B));
    pvBqB = ctB!.phan_viec.find((p) => p.phu_trach_id === "bqlda-qt")!.id;
    pvDtB = ctB!.phan_viec.find((p) => p.phu_trach_id === "p-dtpc")!.id;
    await tx((q) => ketThucPhanViec(q, tDt, pvDtB, { ghi_chu: "đã gửi hồ sơ" }));
    await tx((q) => ghiVaoSoCai(q, bqlda(30, "2026-07-27", "2026-07-28T02:10:00Z", [dong({ ma_viec: B, ten: "Thỏa thuận đấu nối 110kV Hướng Việt", phu_trach: [BQ], ket_thuc: "2026-08-20" })])));
    await tx((q) => giaHan(q, tDt, { cong_viec_id: B, phan_viec_id: pvBqB, ket_thuc: "2026-08-25", ly_do: "chờ EVN trả lời" }));

    // --- C: quyết định TGĐ; báo cáo BQLDA về sau (ngày rất mới) thua ---
    C = await tx((q) => giaoViec(q, tgd, { ten: "Nâng đơn giá bồi thường GPMB Trụ T20", phan_viec: [{ ...BQ, ket_thuc: "2099-08-15" }], la_quyet_dinh: true })); // hạn 2099: từ 04/10/2026 giaoViec chặn hạn đã qua
    const kC = await tx((q) => ghiVaoSoCai(q, bqlda(40, "2098-12-31", "2099-01-01T02:00:00Z", [dong({ ma_viec: C, ten: "Nâng đơn giá bồi thường GPMB Trụ T20", ket_thuc: "2099-02-01" })])));
    expect(kC[0].hanh_dong).toBe("khong_dung");

    // --- D: cùng dạng chuỗi như A nhưng đã hoàn thành ---
    const tenD = "Đo đạc cắm mốc Trụ T12";
    D = (await tx((q) => ghiVaoSoCai(q, bqlda(28, "2026-07-13", "2026-07-14T04:00:00Z", [dong({ ten: tenD, ket_thuc: "2026-07-30" })]))))[0].cong_viec_id!;
    await tx((q) => ghiVaoSoCai(q, dtpc(29, "2026-07-20", "2026-07-22T04:00:00Z", [dong({ ma_viec: D, ten: tenD, phu_trach: [BQ], ket_thuc: "2026-08-10" })])));
    await tx((q) => ghiVaoSoCai(q, bqlda(30, "2026-07-27", "2026-07-28T04:00:00Z", [dong({ ma_viec: D, ten: tenD, ket_thuc: "2026-08-12" })])));
    const pvD = (await tx((q) => chiTietViec(q, D)))!.phan_viec[0].id;
    const xong = await tx((q) => ketThucPhanViec(q, gd, pvD, { ghi_chu: "xong" }));
    expect(xong.hoan_thanh).toBe(true);
  });

  it("xem trước (không ghi): liệt kê việc sẽ đổi theo giá trị định lưu", async () => {
    const truoc = await anhNguon();
    const soLs = await demLichSu();
    const xt = await tx((q) => xemTruocApDungLai(q, { thu_tu: "chi_ngay" }));
    expect(xt.viec.map((v) => v.cong_viec_id).sort()).toEqual([A, B].sort());
    const a = xt.viec.find((v) => v.cong_viec_id === A)!;
    expect(a).toMatchObject({
      loai: "doi_nguon",
      nguon_cu: { nhan: "Phòng Đầu tư và Pháp chế · Form 1 · tuần 29" },
      nguon_moi: { nhan: "BQLDA Quảng Trị · Form 7 · tuần 30" },
      han_cu: "2026-08-10",
      han_moi: "2026-08-12",
    });
    expect(a.ly_do).toContain("ngày sau đè");
    const b = xt.viec.find((v) => v.cong_viec_id === B)!;
    expect(b.giu_thao_tac_tay.join(" ")).toContain("gia hạn tay");
    expect(b.bo_phan_viec).toEqual([]);
    // Không ghi gì
    expect(await anhNguon()).toBe(truoc);
    expect(await demLichSu()).toBe(soLs);
  });

  it("công tắc TẮT: đổi thứ tự chỉ áp dụng cho báo cáo gửi từ nay, việc đang mở giữ nguyên", async () => {
    const truoc = await anhNguon();
    const ra = await luuQuyTac(qt, { thu_tu: "chi_ngay", ap_dung_lai_khi_doi: false });
    expect(ra.so_viec_ap_dung_lai).toBeUndefined();
    expect(await anhNguon()).toBe(truoc);
    const ct = await tx((q) => chiTietViec(q, A));
    expect(ct!.nguon_hien_hanh!.nhan).toBe("Phòng Đầu tư và Pháp chế · Form 1 · tuần 29");
    expect(ct!.ket_thuc).toBe("2026-08-10");
    // Bật công tắc mà không đổi trường nào ảnh hưởng thứ tự → cũng không chạy
    const ra2 = await luuQuyTac(qt, { ap_dung_lai_khi_doi: true });
    expect(ra2.so_viec_ap_dung_lai).toBeUndefined();
    expect(await anhNguon()).toBe(truoc);
    await luuQuyTac(qt, { thu_tu: "cap_truoc", ap_dung_lai_khi_doi: false });
  });

  it("công tắc BẬT, cấp trước → chỉ theo ngày: nguồn thắng + hạn đổi đúng, lịch sử có dòng áp dụng lại", async () => {
    const ra = await luuQuyTac(qt, { thu_tu: "chi_ngay", ap_dung_lai_khi_doi: true });
    expect(ra.so_viec_ap_dung_lai).toBe(2);

    const ct = await tx((q) => chiTietViec(q, A));
    expect(ct!.nguon_hien_hanh!.nhan).toBe("BQLDA Quảng Trị · Form 7 · tuần 30");
    expect(ct!.ket_thuc).toBe("2026-08-12");
    expect(ct!.phan_viec).toHaveLength(1);
    expect(ct!.phan_viec[0]).toMatchObject({ phu_trach_id: "bqlda-qt", ket_thuc: "2026-08-12" });
    expect(ct!.cac_nguon.map((n) => n.trang_thai)).toEqual(["bi_de", "bi_de", "bi_de", "hien_hanh"]);
    expect(ct!.so_ban_da_de).toBe(3);

    const ls = await lichSu(A);
    const cuoi = ls[ls.length - 1];
    expect(cuoi.hanh_dong).toBe("bi_de");
    expect(cuoi.nguoi).toBe(qt.id);
    expect(cuoi.chi_tiet).toMatchObject({
      ap_dung_lai: true,
      tu: "BQLDA Quảng Trị · Form 7 · tuần 30",
      bi_de: "Phòng Đầu tư và Pháp chế · Form 1 · tuần 29",
      han_cu: "2026-08-10",
      han_moi: "2026-08-12",
      cau_hinh_cu: { thu_tu: "cap_truoc" },
      cau_hinh_moi: { thu_tu: "chi_ngay" },
    });

    // Nhật ký cài đặt ghi số việc đã đổi
    const { rows } = await query<{ chi_tiet: Record<string, unknown> }>(
      "SELECT chi_tiet FROM docflow.lich_su WHERE doi_tuong_loai = 'cau_hinh' AND doi_tuong_id = 'quy_tac_de' ORDER BY id DESC LIMIT 1",
    );
    expect(rows[0].chi_tiet.ap_dung_lai_so_viec).toBe(2);

    // Người gửi bản bị thay được báo (bao_nguoi_gui_khi_khong_dung mặc định bật)
    const tb = await query<{ noi_dung: string }>("SELECT noi_dung FROM docflow.thong_bao WHERE nguoi_nhan = 'truong.dtpc@scigroup.vn' AND loai = 'bi_de'");
    expect(tb.rows.some((r) => r.noi_dung.includes(A) && r.noi_dung.includes("đổi quy tắc đè"))).toBe(true);
  });

  it("phần việc đã kết thúc giữ nguyên; gia hạn tay sau bản thắng được giữ", async () => {
    const ct = await tx((q) => chiTietViec(q, B));
    expect(ct!.nguon_hien_hanh!.nhan).toBe("BQLDA Quảng Trị · Form 7 · tuần 30");
    expect(ct!.trang_thai).toBe("dang_mo");
    const dt = ct!.phan_viec.find((p) => p.id === pvDtB)!;
    expect(dt.trang_thai).toBe("da_ket_thuc"); // không bị bỏ dù bản thắng không nhắc P.ĐT&PC
    const bq = ct!.phan_viec.find((p) => p.id === pvBqB)!;
    expect(bq.ket_thuc).toBe("2026-08-25"); // gia hạn tay sau khi BQLDA tuần 30 đến
    expect(ct!.phan_viec).toHaveLength(2);
    expect(ct!.tien_do).toBe("0/1"); // tiến độ chỉ tính chủ trì (BQLDA); P.ĐT&PC phối hợp đã xong phần mình
  });

  it("quyết định TGĐ không bị lật; việc đã hoàn thành không bị đụng", async () => {
    const c = await tx((q) => chiTietViec(q, C));
    expect((c!.nguon_hien_hanh as { la_quyet_dinh?: boolean }).la_quyet_dinh).toBe(true);
    expect(c!.ket_thuc).toBe("2099-08-15");
    expect((await lichSu(C)).some((l) => l.chi_tiet.ap_dung_lai)).toBe(false);

    const d = await tx((q) => chiTietViec(q, D));
    expect(d!.trang_thai).toBe("hoan_thanh");
    expect(d!.nguon_hien_hanh!.nhan).toBe("Phòng Đầu tư và Pháp chế · Form 1 · tuần 29");
    expect(d!.cac_nguon.map((n) => n.trang_thai)).toEqual(["bi_de", "hien_hanh", "khong_dung"]);
    expect((await lichSu(D)).some((l) => l.chi_tiet.ap_dung_lai)).toBe(false);
  });

  it("chạy lại lần nữa không đổi gì (đã theo quy tắc hiện hành)", async () => {
    const truoc = await anhNguon();
    const kq = await tx((q) => apDungLaiQuyTac(q, qt, "chạy tay"));
    expect(kq.so_viec).toBe(0);
    expect(await anhNguon()).toBe(truoc);
  });

  it("bật 'đã xong luôn được ghi nhận' + áp dụng lại: báo đã xong từng bị thua nay đóng phần của người báo", async () => {
    // Quay về cấp trước, tắt ghi nhận đã xong (không áp dụng lại)
    await luuQuyTac(qt, { thu_tu: "cap_truoc", da_xong_luon_ghi_nhan: false, ap_dung_lai_khi_doi: false });
    const tenE = "Cắm biển hành lang tuyến T13";
    const E = (await tx((q) => ghiVaoSoCai(q, dtpc(29, "2026-07-20", "2026-07-22T05:00:00Z", [dong({ ten: tenE, phu_trach: [BQ], ket_thuc: "2026-08-10" })]))))[0].cong_viec_id!;
    const kE = await tx((q) => ghiVaoSoCai(q, bqlda(30, "2026-07-27", "2026-07-28T05:00:00Z", [dong({ ma_viec: E, ten: tenE, da_xong: true })])));
    expect(kE[0].hanh_dong).toBe("khong_dung");
    expect((await tx((q) => chiTietViec(q, E)))!.trang_thai).toBe("dang_mo");

    const xt = await tx((q) => xemTruocApDungLai(q, { da_xong_luon_ghi_nhan: true }));
    expect(xt.viec.find((v) => v.cong_viec_id === E)).toMatchObject({ loai: "ghi_nhan_da_xong" });

    await luuQuyTac(qt, { da_xong_luon_ghi_nhan: true, ap_dung_lai_khi_doi: true });
    const e = await tx((q) => chiTietViec(q, E));
    expect(e!.trang_thai).toBe("hoan_thanh");
    const ls = await lichSu(E);
    expect(ls.some((l) => l.hanh_dong === "ket_thuc_phan_viec" && l.chi_tiet.ap_dung_lai === true)).toBe(true);
    // A quay về cấp trước: P.ĐT&PC tuần 29 lại là nguồn hiện hành
    const a = await tx((q) => chiTietViec(q, A));
    expect(a!.nguon_hien_hanh!.nhan).toBe("Phòng Đầu tư và Pháp chế · Form 1 · tuần 29");
    expect(a!.ket_thuc).toBe("2026-08-10");
  });
});
