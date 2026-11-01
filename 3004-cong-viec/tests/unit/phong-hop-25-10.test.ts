// Phòng họp (Mr. Đại chốt 25/10/2026; đề xuất DE-XUAT-PHONG-HOP-25-10.md, câu chốt A) — luật thuần + luồng đặt / trùng / sửa / huỷ / giao ban.
// Đồng hồ giả đặt theo giờ VIỆT NAM (luật 44): Thứ Hai 26/10/2026 08:10 giờ VN = 01:10 UTC.
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { csdlMoi, nguoi } from "../helpers/csdl";
import { layQ, tx } from "@/lib/db";
import type { NguoiDungPhien } from "@/lib/types";
import {
  CAC_O,
  bayGioVN,
  chuDongHop,
  denKetThucSom,
  mocKetThucCho,
  trangThaiCuoc,
  khoangGio,
  laDuongDanHop,
  laNgayThat,
  loiDatHop,
  mauO,
  ngayGiaoBanKeTiep,
  nhapNhay,
  tenNganNguoi,
  trangThaiPhong,
  xepGhe,
  PHONG_HOP,
  type CuocHop,
  type NguoiDanhMuc,
} from "@/lib/phong-hop/thuan";
import { datHop, guiGiaoBan, hopCuaToi, huyHop, ketThucSom, suaHop, cuocTheoNgay, daXemHop, danhMucMoi, bungMoi } from "@/lib/phong-hop/dich-vu";
import { laDonViNgoaiVP, locChiTietCuoc } from "@/lib/phong-hop/thuan";

const LUC = Date.UTC(2026, 9, 26, 1, 10); // 26/10/2026 08:10 giờ VN, Thứ Hai
const BAY = bayGioVN(LUC);
const cuoc = (x: Partial<CuocHop>): CuocHop => ({
  id: 1, phong: "p01", ngay: "2026-10-26", tu: "08:00", den: "09:00", noi_dung: "Họp thử test", ghi_chu: null, khach_ngoai: null, duong_dan: null,
  loai: "thuong", nguoi_dat: "a", nguoi_dat_ten: "Người A", moi: [], ...x,
});

describe("luật thuần", () => {
  it("15 ô giờ làm việc 08:00–12:00 · 13:30–17:00 (bỏ 06–08, 12–13:30, 17–18); giờ VN; khoảng giờ kèm số giờ (luật 31)", () => {
    expect(CAC_O.length).toBe(15);
    expect([CAC_O[0], CAC_O[7], CAC_O[8], CAC_O[14]]).toEqual(["08:00", "11:30", "13:30", "16:30"]);
    expect(BAY).toEqual({ ngay: "2026-10-26", phut: 490, gio: "08:10" });
    expect(khoangGio("15:00", "17:00")).toBe("2 giờ · 15:00 – 17:00");
    expect(khoangGio("09:00", "10:30")).toBe("1 giờ 30 phút · 09:00 – 10:30");
  });
  it("màu ô: đang họp (đỏ) · đã đặt (vàng) · trống (xanh) · đã qua (xám)", () => {
    const ds = [cuoc({}), cuoc({ id: 2, tu: "10:00", den: "11:00" })];
    expect(mauO(ds, "p01", BAY.ngay, "08:00", BAY).mau).toBe("dang");
    expect(mauO(ds, "p01", BAY.ngay, "10:30", BAY).mau).toBe("dat");
    expect(mauO(ds, "p01", BAY.ngay, "09:00", BAY).mau).toBe("trong");
    expect(mauO(ds, "p01", BAY.ngay, "07:00", BAY).mau).toBe("qua");
    expect(mauO(ds, "p03", BAY.ngay, "08:00", BAY).mau).toBe("trong");
    // cuộc họp ĐÃ XONG hôm nay → xám như giờ đã qua (trước tô vàng, bấm vào mở Sửa — Mr. Đại bắt 25/10)
    expect(mauO([cuoc({ tu: "06:00", den: "07:30" })], "p01", BAY.ngay, "07:00", BAY).mau).toBe("qua");
  });
  it("trạng thái phòng trên mặt bằng: đang họp · sắp tới hôm nay · tắt (không còn cuộc nào tới 17:00)", () => {
    const ds = [cuoc({}), cuoc({ id: 2, phong: "p03", tu: "14:00", den: "15:00" }), cuoc({ id: 3, phong: "p09", tu: "06:00", den: "07:00" })];
    expect(trangThaiPhong(ds, "p01", BAY).tt).toBe("dang");
    expect(trangThaiPhong(ds, "p03", BAY).tt).toBe("sap");
    expect(trangThaiPhong(ds, "p09", BAY).tt).toBe("tat");
  });
  it("kiểm đầu vào: giờ đã qua, kết thúc trước bắt đầu, ngoài giờ làm việc, thiếu nội dung — câu tiếng Việt", () => {
    const v = { phong: "p01", ngay: BAY.ngay, tu: "09:00", den: "10:00", noi_dung: "Họp" };
    expect(loiDatHop(v, BAY)).toBeNull();
    expect(loiDatHop({ ...v, tu: "07:00", den: "08:00" }, BAY)).toMatch(/giờ bắt đầu 07:00 không hợp lệ/);
    expect(loiDatHop({ ...v, den: "09:00" }, BAY)).toBe("Giờ kết thúc phải sau giờ bắt đầu");
    expect(loiDatHop({ ...v, den: "17:30" }, BAY)).toMatch(/giờ kết thúc 17:30 không hợp lệ/);
    expect(loiDatHop({ ...v, tu: "09:15" }, BAY)).toMatch(/bước 30 phút/);
    expect(loiDatHop({ ...v, tu: "11:30", den: "14:00" }, BAY)).toMatch(/không họp xuyên giờ nghỉ trưa/);
    // ô đang chạy vẫn đặt được (họp ngay bây giờ); ô đã hết thì không
    expect(loiDatHop({ ...v, tu: "08:00", den: "09:00" }, BAY)).toBeNull();
    expect(loiDatHop({ ...v, tu: "08:00", den: "09:00" }, bayGioVN(Date.UTC(2026, 9, 26, 1, 40)))).toBe("Giờ họp đã qua — chọn giờ khác");
    expect(mocKetThucCho("11:00")).toEqual(["11:30", "12:00"]);
    expect(denKetThucSom(BAY)).toBe("08:30");
    expect(trangThaiCuoc({ ngay: BAY.ngay, tu: "08:00", den: "09:00" }, BAY)).toBe("dang");
    expect(loiDatHop({ ...v, noi_dung: " " }, BAY)).toBe("Chưa ghi nội dung họp");
    expect(loiDatHop({ ...v, phong: "p99" }, BAY)).toBe("Chưa chọn phòng họp");
  });
  it("giao ban kế tiếp theo GIỜ BẮT ĐẦU (kiểm lần 7 X6): Thứ Hai còn chọn được ô 15:00 → hôm nay; 15:30 trở đi → tuần sau; Thứ Tư → 28/10", () => {
    expect(ngayGiaoBanKeTiep(1, "15:00", BAY)).toBe("2026-10-26");
    expect(ngayGiaoBanKeTiep(1, "15:00", bayGioVN(Date.UTC(2026, 9, 26, 8, 10)))).toBe("2026-10-26"); // 15:10 — ô 15:00 còn chọn được
    expect(ngayGiaoBanKeTiep(1, "15:00", bayGioVN(Date.UTC(2026, 9, 26, 8, 30)))).toBe("2026-11-02"); // 15:30 — trước báo «hôm nay» mà gửi bị «Giờ họp đã qua»
    expect(ngayGiaoBanKeTiep(3, "15:00", BAY)).toBe("2026-10-28");
  });
  it("kiểm lần 7: đường dẫn họp chỉ http(s) (X1) · ngày không có trên lịch (X5) · biên đúng phút kết thúc", () => {
    expect(laDuongDanHop("https://meet.google.com/abc-defg-hij")).toBe(true);
    expect(laDuongDanHop("http://zoom.us/j/123")).toBe(true);
    expect(laDuongDanHop("javascript:alert(1)")).toBe(false);
    expect(laDuongDanHop("JaVaScRiPt:alert(1)")).toBe(false);
    expect(laDuongDanHop("data:text/html,<b>x</b>")).toBe(false);
    const v = { phong: "p01", ngay: "2026-10-27", tu: "09:00", den: "10:00", noi_dung: "Họp test" };
    expect(loiDatHop({ ...v, duong_dan: "javascript:alert(1)" }, BAY)).toBe("Đường dẫn họp trực tuyến phải bắt đầu bằng http:// hoặc https://");
    expect(loiDatHop({ ...v, duong_dan: "https://teams.microsoft.com/l/x" }, BAY)).toBeNull();
    expect(laNgayThat("2026-02-31")).toBe(false);
    expect(laNgayThat("2028-02-29")).toBe(true);
    expect(loiDatHop({ ...v, ngay: "2026-02-31" }, BAY)).toBe("Ngày họp 2026-02-31 không có trên lịch");
    expect(trangThaiCuoc(cuoc({ tu: "16:00", den: "17:00" }), { ngay: "2026-10-26", phut: 16 * 60 + 59, gio: "16:59" })).toBe("dang");
    expect(trangThaiCuoc(cuoc({ tu: "16:00", den: "17:00" }), { ngay: "2026-10-26", phut: 17 * 60, gio: "17:00" })).toBe("xong");
  });
  it("dòng chữ đỏ: nhấp nháy khi chưa xem và 15 phút trước giờ họp; chữ có giờ, nội dung, phòng", () => {
    const c = { ...cuoc({ tu: "08:20", den: "09:00" }), da_xem: true };
    expect(nhapNhay(c, BAY)).toBe(true); // còn 10 phút
    expect(nhapNhay({ ...c, tu: "09:00" }, BAY)).toBe(false); // còn 50 phút, đã xem
    expect(nhapNhay({ ...c, tu: "09:00", da_xem: false }, BAY)).toBe(true);
    expect(chuDongHop(cuoc({ tu: "15:00", den: "17:00", noi_dung: "giao ban tuần", phong: "p09" }), BAY)).toBe("15:00 họp giao ban tuần · Phòng họp 09");
    expect(chuDongHop(cuoc({ ngay: "2026-10-27", tu: "09:00" }), BAY)).toBe("mai 09:00 họp Họp thử test · Phòng họp 01");
  });
  it("người ngồi: tên ngắn hai chữ cuối; Chủ tịch vòng đỏ, TGĐ vòng xanh; ghế chủ toạ theo cấp; hai Phó tổng không phân được → trống", () => {
    expect(tenNganNguoi("Nguyễn Chính Đại")).toBe("Chính Đại");
    expect(tenNganNguoi("Lan")).toBe("Lan");
    const dm = new Map<string, NguoiDanhMuc>([
      ["ct", { id: "ct", ten: "Nguyễn Công Hùng", don_vi: null, bld: "bld-ct-hdqt" }],
      ["tgd", { id: "tgd", ten: "Trương Bửu Ngọc", don_vi: null, bld: "bld-tgd" }],
      ["pct", { id: "pct", ten: "Nguyễn Văn Phúc", don_vi: null, bld: "bld-pct-hdqt" }],
      ["p1", { id: "p1", ten: "Nguyễn Văn Độ", don_vi: null, bld: "bld-ptgd-do" }],
      ["p2", { id: "p2", ten: "Đoàn Thế Anh", don_vi: null, bld: "bld-ptgd-theanh" }],
      ["tp", { id: "tp", ten: "Lê Minh Tuấn", don_vi: "P.ĐT&PC", chuc_vu: "Trưởng phòng" }],
      ["nv", { id: "nv", ten: "Phạm Thu Hà", don_vi: "P.ĐT&PC", chuc_vu: "Nhân viên" }],
    ]);
    const m = (...ids: string[]) => ids.map((id) => ({ id, ten: dm.get(id)!.ten }));
    const p01 = PHONG_HOP[0];
    // Chủ tịch dự → chủ toạ, vòng đỏ; TGĐ vòng xanh
    const a = xepGhe(cuoc({ nguoi_dat: "nv", moi: m("nv", "tgd", "ct", "tp") }), dm);
    expect(a[0]).toMatchObject({ nguoi: { id: "ct" }, chu_toa: true, vong: "do", x: p01.ghe[0][0], y: p01.ghe[0][1] });
    expect(a.find((x) => x.nguoi.id === "tgd")?.vong).toBe("xanh");
    // Phó chủ tịch HĐQT: vòng xanh dương, không ghi tên (Mr. Đại 26/10/2026)
    expect(xepGhe(cuoc({ nguoi_dat: "nv", moi: m("nv", "pct") }), dm).find((x) => x.nguoi.id === "pct")?.vong).toBe("xanh-duong");
    expect(a.find((x) => x.nguoi.id === "tp")?.vong).toBeNull();
    // Không ai cao hơn người tạo → người tạo chủ toạ
    expect(xepGhe(cuoc({ nguoi_dat: "tp", moi: m("tp", "nv") }), dm)[0]).toMatchObject({ nguoi: { id: "tp" }, chu_toa: true });
    // Hai Phó tổng, người tạo là một trong hai → người tạo chủ toạ
    expect(xepGhe(cuoc({ nguoi_dat: "p2", moi: m("p1", "p2", "nv") }), dm)[0]).toMatchObject({ nguoi: { id: "p2" }, chu_toa: true });
    // Hai Phó tổng, người tạo là nhân viên → không phân được: ghế chủ toạ (ghế đầu) TRỐNG
    const b = xepGhe(cuoc({ nguoi_dat: "nv", moi: m("p1", "p2", "nv") }), dm);
    expect(b.some((x) => x.chu_toa)).toBe(false);
    expect(b.some((x) => x.x === p01.ghe[0][0] && x.y === p01.ghe[0][1])).toBe(false);
    expect(b.length).toBe(3);
    // Quá số ghế → chỉ vẽ bằng số ghế
    // Quá số ghế → chỉ vẽ bằng số ghế; cùng cấp thường (nhân viên) thì người tạo chủ toạ (người tạo luôn là người dự)
    const dong = Array.from({ length: 12 }, (_, i) => ({ id: `x${i}`, ten: `Người ${i}` }));
    const d = xepGhe(cuoc({ nguoi_dat: "x5", moi: dong }), dm);
    expect(d.length).toBe(p01.so_ghe);
    expect(d[0]).toMatchObject({ nguoi: { id: "x5" }, chu_toa: true });
  });
});

describe("luồng đặt phòng trên cơ sở dữ liệu thử", () => {
  let nv: NguoiDungPhien, tp: NguoiDungPhien, qt: NguoiDungPhien, tp2: NguoiDungPhien;
  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(LUC);
    await csdlMoi();
    nv = await nguoi("nv.dtpc@scigroup.vn");
    tp = await nguoi("truong.dtpc@scigroup.vn");
    tp2 = await nguoi("truong.ktvh@scigroup.vn");
    qt = await nguoi("quantri@scigroup.vn");
  });
  afterAll(() => vi.useRealTimers());

  it("phòng họp ở văn phòng: bỏ nhà máy, Ban điều hành tổng thầu và người chỉ thuộc các đơn vị đó (Mr. Đại chốt 25/10/2026)", async () => {
    expect(laDonViNgoaiVP({ ten: "Nhà máy thủy điện Nậm Xe", ten_ngan: "NM Nậm Xe" })).toBe(true);
    expect(laDonViNgoaiVP({ ten: "Ban điều hành dự án Hướng Việt", ten_ngan: "BĐH Hướng Việt" })).toBe(true);
    expect(laDonViNgoaiVP({ ten: "Phòng Kinh tế và Vận hành", ten_ngan: "P.KT&VH" })).toBe(false);
    expect(laDonViNgoaiVP({ ten: "SCI E&C", ten_ngan: "SCI E&C" })).toBe(false);
    const q = await layQ();
    const dm = await danhMucMoi(q);
    expect(dm.don_vi.some((d) => d.id === "nm-namxe")).toBe(false);
    expect(dm.nguoi.some((n) => n.id === "gd.namxe@scigroup.vn")).toBe(false);
    expect(dm.nguoi.some((n) => n.id === "truong.ktvh@scigroup.vn")).toBe(true);
    // máy chủ cũng lọc: gửi thẳng người nhà máy lên vẫn bị bỏ
    expect(await bungMoi(q, [{ loai: "nguoi", id: "gd.namxe@scigroup.vn" }, { loai: "nguoi", id: "hung.tv@scigroup.vn" }])).toEqual(["hung.tv@scigroup.vn"]);
  });
  it("đặt phòng trống → nhận; người tạo tự là người dự (đã xem); cả phòng bung ra người", async () => {
    const c = await tx((q) => datHop(q, nv, { phong: "p01", ngay: "2026-10-26", tu: "09:00", den: "10:00", noi_dung: "Họp thử test A", moi: [{ loai: "don_vi", id: "p-ktvh" }] }));
    expect(c.moi.map((m) => m.id)).toEqual(expect.arrayContaining([nv.id, tp2.id, "hung.tv@scigroup.vn"]));
    const cuaNv = await hopCuaToi(await layQ(), nv.id);
    expect(cuaNv.find((x) => x.id === c.id)?.da_xem).toBe(true);
    const cuaTp2 = await hopCuaToi(await layQ(), tp2.id);
    expect(cuaTp2.find((x) => x.id === c.id)?.da_xem).toBe(false);
    await tx((q) => daXemHop(q, tp2.id, [c.id]));
    expect((await hopCuaToi(await layQ(), tp2.id)).find((x) => x.id === c.id)?.da_xem).toBe(true);
  });
  it("trùng phòng trùng giờ → từ chối 409, nói rõ ai đặt; chạm mép giờ thì được; lãnh đạo / quản trị cũng không giành", async () => {
    await expect(tx((q) => datHop(q, qt, { phong: "p01", ngay: "2026-10-26", tu: "09:30", den: "10:30", noi_dung: "Họp chồng test" }))).rejects.toMatchObject({
      status: 409,
      message: expect.stringContaining("Phạm Thu Hà"),
    });
    const sau = await tx((q) => datHop(q, tp, { phong: "p01", ngay: "2026-10-26", tu: "10:00", den: "11:00", noi_dung: "Họp nối tiếp test" }));
    expect(sau.tu).toBe("10:00");
  });
  it("sửa / huỷ: người khác bị chặn; người đặt đổi giờ → người dự phải xem lại + chuông; huỷ → biến khỏi lịch", async () => {
    const [c] = (await cuocTheoNgay(await layQ(), "2026-10-26")).filter((x) => x.noi_dung === "Họp thử test A");
    await expect(tx((q) => huyHop(q, tp, c.id))).rejects.toMatchObject({ status: 403 });
    const moi = c.moi.map((m) => ({ loai: "nguoi" as const, id: m.id }));
    await tx((q) => suaHop(q, nv, c.id, { phong: "p03", ngay: "2026-10-26", tu: "13:30", den: "14:30", noi_dung: c.noi_dung, moi }));
    expect((await hopCuaToi(await layQ(), tp2.id)).find((x) => x.id === c.id)).toMatchObject({ phong: "p03", tu: "13:30", da_xem: false });
    const { rows } = await (await layQ()).query<{ n: number }>("SELECT count(*)::int AS n FROM docflow.thong_bao WHERE loai = 'phong_hop' AND nguoi_nhan = $1", [tp2.id]);
    expect(rows[0].n).toBe(1);
    await tx((q) => huyHop(q, qt, c.id)); // quản trị huỷ được
    expect((await cuocTheoNgay(await layQ(), "2026-10-26")).some((x) => x.id === c.id)).toBe(false);
  });
  it("cuộc đang họp: không sửa, không huỷ (409) — chỉ kết thúc sớm, trả phòng từ mốc 30 phút kế tiếp", async () => {
    const c = await tx((q) => datHop(q, nv, { phong: "p09", ngay: "2026-10-26", tu: "08:00", den: "10:00", noi_dung: "Họp đang diễn ra test" }));
    await expect(tx((q) => suaHop(q, nv, c.id, { phong: "p09", ngay: "2026-10-26", tu: "08:00", den: "11:00", noi_dung: c.noi_dung }))).rejects.toMatchObject({ status: 409 });
    await expect(tx((q) => huyHop(q, nv, c.id))).rejects.toMatchObject({ status: 409 });
    await expect(tx((q) => ketThucSom(q, tp, c.id))).rejects.toMatchObject({ status: 403 });
    const sau = await tx((q) => ketThucSom(q, nv, c.id));
    expect(sau.den).toBe("08:30");
    // phòng trống lại từ 08:30
    const moi = await tx((q) => datHop(q, tp, { phong: "p09", ngay: "2026-10-26", tu: "08:30", den: "09:30", noi_dung: "Họp sau khi trả phòng test" }));
    expect(moi.tu).toBe("08:30");
  });
  it("giao ban (câu chốt A): gửi → đặt luôn phòng cho buổi kế tiếp + báo thành phần; gửi lại → cập nhật, không tạo buổi thứ hai; nhân viên bị chặn", async () => {
    const body = { thu: 1, tu: "15:00", den: "17:00", phong: "p09", noi_dung: "Họp giao ban tuần test", thanh_phan: [{ loai: "nhom", id: "truong_phong" }] };
    await expect(tx((q) => guiGiaoBan(q, nv, body))).rejects.toMatchObject({ status: 403 });
    const r1 = await tx((q) => guiGiaoBan(q, tp, body));
    expect(r1).toMatchObject({ cap_nhat: false, cuoc: { ngay: "2026-10-26", phong: "p09", loai: "giao_ban" } });
    expect(r1.cuoc.moi.map((m) => m.id)).toEqual(expect.arrayContaining([tp.id, tp2.id, "truong.hcth@scigroup.vn"]));
    const r2 = await tx((q) => guiGiaoBan(q, tp2, { ...body, tu: "14:00" }));
    expect(r2).toMatchObject({ cap_nhat: true, cuoc: { id: r1.cuoc.id, tu: "14:00" } });
    expect((await cuocTheoNgay(await layQ(), "2026-10-26")).filter((c) => c.loai === "giao_ban").length).toBe(1);
    // phòng giờ đó đã có người đặt → không gửi được, nói rõ ai đặt
    await tx((q) => datHop(q, nv, { phong: "p03", ngay: "2026-10-26", tu: "15:00", den: "16:00", noi_dung: "Họp chiếm P03 test" }));
    await expect(tx((q) => guiGiaoBan(q, tp, { ...body, phong: "p03" }))).rejects.toMatchObject({ status: 409 });
  });
});

describe("Chi tiết cuộc họp chỉ người đặt / được mời / quản trị xem (Mr. Đại chốt 26/10/2026)", () => {
  it("locChiTietCuoc: người ngoài mất ghi chú, đường dẫn, khách ngoài; người đặt, người được mời, quản trị giữ nguyên", () => {
    const c = cuoc({ nguoi_dat: "dat", moi: [{ id: "moi", ten: "Người mời" }], ghi_chu: "mang hồ sơ", duong_dan: "https://meet.example/x", khach_ngoai: "Công ty ABC" });
    expect(locChiTietCuoc(c, { id: "ngoai" })).toMatchObject({ ghi_chu: null, duong_dan: null, khach_ngoai: null, an_chi_tiet: true, noi_dung: c.noi_dung });
    for (const nd of [{ id: "dat" }, { id: "moi" }, { id: "ngoai", la_quan_tri: true }]) expect(locChiTietCuoc(c, nd)).toBe(c);
  });
});
