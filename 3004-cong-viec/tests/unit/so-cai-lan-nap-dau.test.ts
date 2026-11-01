// LẦN NẠP ĐẦU: dòng báo ĐÃ XONG cũng vào sổ cái (Mr. Đại nêu 08/10, gật 18/10/2026 — tách khỏi đợt dọn dữ liệu bảng B).
// Tuần đầu lên hosting sổ trống → khối xanh "Việc làm xong: Tuần N−1 và N" (họp giao ban) không có gì, vì luật 02/10 "đã xong không
// vào sổ — chỉ dùng để đóng việc đang mở". Bản ĐẦU TIÊN của một đơn vị lập + một mẫu báo cáo: dòng đã xong vào sổ ở trạng thái đã
// xong (ngày xong = cột Kết thúc, trống thì cuối kỳ, không quá ngày nộp) + nguồn (tệp, dòng); không sinh việc đang mở, không chuông.
// Từ kỳ sau: đã xong chỉ để đóng việc như cũ (tests/unit/so-cai-viec-da-xong.test.ts).
import { describe, it, expect, beforeAll } from "vitest";
import { csdlMoi } from "../helpers/csdl";
import { query, tx } from "@/lib/db";
import type { DauVaoSoCai, DongCongViec } from "@/lib/types";
import { ghiVaoSoCai, laLanNapDau, ngayXongLanDau, viecDaXong, xemTruocVaoSoCai } from "@/lib/so-cai/dich-vu";
import { dungYeuCau, mayDinh } from "@/lib/so-cai/ai-ra-viec";
import { cachChon, giaTriGui } from "@/components/gui/nop/chon-vao-so";
import { chuyenViec, khoangViecLamXong, xongMoiTruoc, type ViecApi } from "@/components/phong/viec";
import { tuanCua } from "@/lib/phong/tuan";

const BQ = { loai: "don_vi" as const, id: "bqlda-qt", ten: "BQLDA Quảng Trị" };
const LAO = { loai: "don_vi" as const, id: "bqlda-lao", ten: "BQLDA Lào" };
const PMC = { loai: "don_vi" as const, id: "sci-pmc", ten: "SCI PMC" };
const dong = (p: Partial<DongCongViec> & { ten: string }): DongCongViec => ({ phu_trach: [BQ], nguon_bang: "bang_cong_viec", dong_so: 1, du_an: "ĐG Hướng Việt", ...p });

/** Báo cáo tuần 42 (12/10–18/10/2026) của BQLDA Quảng Trị, nộp thứ Ba 13/10 */
const bc = (taiLieu: string | null, phienBan: number | null, cv: DongCongViec[], extra: Partial<DauVaoSoCai> = {}): DauVaoSoCai => ({
  tai_lieu_id: taiLieu,
  phien_ban: phienBan,
  mau_ma: "form-7",
  nhan: "BQLDA Quảng Trị · Form 7 · tuần 42",
  don_vi_id: "bqlda-qt",
  cap: 3,
  nguoi_gui: "gd.bqlda@scigroup.vn",
  ky_bao_cao_den: "2026-10-18",
  ngay_gui: "2026-10-13T02:00:00Z",
  cong_viec: cv,
  ...extra,
});
const taoTaiLieu = (id: string, donVi = "bqlda-qt", mau = "form-7") =>
  query("INSERT INTO docflow.tai_lieu (id, ten, mau_ma, don_vi_lap, nguoi_tao, trang_thai) VALUES ($1, $2, $3, $4, 'gd.bqlda@scigroup.vn', 'da_gui')", [id, `${id}.docx`, mau, donVi]);
const viecTen = async (ten: string) =>
  (
    await query<{ id: string; trang_thai: string; xong: string | null }>(
      "SELECT id, trang_thai, to_char(dong_luc + interval '7 hours', 'YYYY-MM-DD') AS xong FROM docflow.cong_viec WHERE ten = $1 ORDER BY id",
      [ten],
    )
  ).rows;
const soViecDangMo = async () => (await query<{ n: number }>("SELECT count(*)::int AS n FROM docflow.so_cai")).rows[0].n;

describe("ngày xong của dòng đã xong vào sổ lần nạp đầu", () => {
  const dv = { ky_bao_cao_den: "2026-10-18", ngay_gui: "2026-10-13T02:00:00Z" };
  it("cột Kết thúc của dòng", () => expect(ngayXongLanDau({ ket_thuc: "2026-10-09" }, dv)).toBe("2026-10-09"));
  it("Kết thúc sau ngày nộp (đã báo xong thì xong trước lúc nộp) → ngày nộp", () => expect(ngayXongLanDau({ ket_thuc: "2026-10-30" }, dv)).toBe("2026-10-13"));
  it("không có Kết thúc → cuối kỳ báo cáo, không quá ngày nộp", () => {
    expect(ngayXongLanDau({}, { ...dv, ky_bao_cao_den: "2026-10-11" })).toBe("2026-10-11");
    expect(ngayXongLanDau({}, dv)).toBe("2026-10-13");
  });
  it("ngày nộp tính theo giờ Việt Nam (23:30 giờ UTC 12/10 = 06:30 ngày 13/10)", () => expect(ngayXongLanDau({}, { ky_bao_cao_den: null, ngay_gui: "2026-10-12T23:30:00Z" })).toBe("2026-10-13"));
});

describe("lần nạp đầu của đơn vị lập + mẫu: dòng đã xong vào sổ ở trạng thái đã xong", () => {
  beforeAll(async () => {
    await csdlMoi();
    await taoTaiLieu("tl-dau-bq");
    await taoTaiLieu("tl-sau-bq");
    await taoTaiLieu("tl-dau-lao", "bqlda-lao");
  });

  it("sổ trống → là lần nạp đầu; ghi không có tài liệu (giao tay) / tài liệu không theo mẫu → không", async () => {
    await tx(async (q) => {
      expect(await laLanNapDau(q, bc("tl-dau-bq", 1, []), true)).toBe(true);
      expect(await laLanNapDau(q, bc(null, null, []), false)).toBe(true); // xem trước lúc vừa tải lên, chưa có mã tài liệu
      expect(await laLanNapDau(q, bc(null, null, []), true)).toBe(false);
      expect(await laLanNapDau(q, bc("tl-dau-bq", 1, [], { mau_ma: null }), true)).toBe(false);
    });
  });

  const xongCu = dong({ ten: "Đổ bê tông móng trụ T14", ket_thuc: "2026-10-09", da_xong: true, tinh_trang: "Đã xong", dong_so: 1 });
  const xongNay = dong({ ten: "Nghiệm thu cốt thép móng trụ T15", ket_thuc: "2026-10-20", da_xong: true, tinh_trang: "100%", dong_so: 2 });
  const dangLam = dong({ ten: "Lắp dựng cột tháp T16", ket_thuc: "2026-11-15", tinh_trang: "Đang làm", dong_so: 3 });

  it("xem trước: dòng đã xong → «vào sổ — đã xong ngày …»; dòng đang làm → việc mới như cũ", async () => {
    const xem = await tx((q) => xemTruocVaoSoCai(q, bc("tl-dau-bq", 1, [xongCu, xongNay, dangLam])));
    expect(xem.map((d) => d.hanh_dong)).toEqual(["vao_so_xong", "vao_so_xong", "tao_moi"]);
    expect(xem.map((d) => d.xong_lan_dau)).toEqual(["2026-10-09", "2026-10-13", "2026-10-13"]);
    expect(xem[0].ly_do).toMatch(/lần nạp đầu.*đã xong ngày 09\/10\/2026/);
  });

  it("ghi: việc HOÀN THÀNH đúng ngày xong, nguồn hiện hành có tệp + dòng, phần việc đã kết thúc; không thêm việc đang mở, không chuông", async () => {
    const moTruoc = await soViecDangMo();
    const tbTruoc = (await query<{ n: number }>("SELECT count(*)::int AS n FROM docflow.thong_bao")).rows[0].n;
    const kq = await tx((q) => ghiVaoSoCai(q, bc("tl-dau-bq", 1, [xongCu, xongNay, dangLam])));
    expect(kq.map((d) => d.hanh_dong)).toEqual(["vao_so_xong", "vao_so_xong", "tao_moi"]);
    expect(await viecTen(xongCu.ten)).toEqual([{ id: kq[0].cong_viec_id, trang_thai: "hoan_thanh", xong: "2026-10-09" }]);
    expect(await viecTen(xongNay.ten)).toEqual([{ id: kq[1].cong_viec_id, trang_thai: "hoan_thanh", xong: "2026-10-13" }]);
    expect(await soViecDangMo()).toBe(moTruoc + 1); // chỉ "Lắp dựng cột tháp T16"
    const ng = (
      await query<{ trang_thai: string; tai_lieu_id: string; dong_so: number; da_xong: string }>(
        "SELECT g.trang_thai, g.tai_lieu_id, g.dong_so, g.du_lieu->>'da_xong' AS da_xong FROM docflow.cong_viec c JOIN docflow.nguon_cong_viec g ON g.id = c.nguon_hien_hanh_id WHERE c.id = $1",
        [kq[0].cong_viec_id],
      )
    ).rows;
    expect(ng).toEqual([{ trang_thai: "hien_hanh", tai_lieu_id: "tl-dau-bq", dong_so: 1, da_xong: "true" }]);
    const pv = (await query<{ trang_thai: string; vai: string }>("SELECT trang_thai, vai FROM docflow.phan_viec WHERE cong_viec_id = $1", [kq[0].cong_viec_id])).rows;
    expect(pv).toEqual([{ trang_thai: "da_ket_thuc", vai: "chu_tri" }]);
    const ls = (await query<{ hanh_dong: string; lan: string }>("SELECT hanh_dong, chi_tiet->>'lan_nap_dau' AS lan FROM docflow.lich_su WHERE doi_tuong_id = $1 ORDER BY id", [kq[0].cong_viec_id])).rows;
    expect(ls).toEqual([
      { hanh_dong: "vao_so_cai", lan: "true" },
      { hanh_dong: "cong_viec_hoan_thanh", lan: "true" },
    ]);
    // việc đã xong không có chuông nào (giao việc / hoàn thành)
    for (const ma of [kq[0].cong_viec_id, kq[1].cong_viec_id])
      expect((await query<{ n: number }>("SELECT count(*)::int AS n FROM docflow.thong_bao WHERE noi_dung LIKE $1 OR lien_ket LIKE $1", [`%${ma}%`])).rows[0].n).toBe(0);
    // phụ trách "Lắp dựng cột tháp" là chính đơn vị lập → cũng không chuông giao việc
    expect((await query<{ n: number }>("SELECT count(*)::int AS n FROM docflow.thong_bao")).rows[0].n).toBe(tbTruoc);
  });

  it("khối «Việc làm xong: Tuần 41 và 42» (thứ Ba 13/10 họp giao ban) hiện cả hai việc, mới xong đứng trước", async () => {
    const homNay = "2026-10-13";
    const k = khoangViecLamXong(tuanCua(homNay), homNay);
    expect(k.nhan).toBe("Việc làm xong: Tuần 41 và 42");
    const ds = await tx((q) => viecDaXong(q, { tu: k.tu, hom_nay: homNay }));
    const viecO = ds.map((v) => chuyenViec(v as unknown as ViecApi, homNay, () => "bqlda-qt", {}, {}));
    const trong = xongMoiTruoc(viecO, k).map((v) => [v.ten, v.ttChu]);
    expect(trong).toEqual([
      [xongNay.ten, "Xong ngày 13/10/2026"],
      [xongCu.ten, "Xong ngày 09/10/2026"],
    ]);
  });

  it("Rà soát chạy lại đúng bản đã ghi → không ghi lần hai, không còn là lần nạp đầu", async () => {
    await tx(async (q) => expect(await laLanNapDau(q, bc("tl-dau-bq", 1, []), true)).toBe(false));
    const kq = await tx((q) => ghiVaoSoCai(q, bc("tl-dau-bq", 1, [xongCu, xongNay, dangLam])));
    expect(kq.map((d) => d.ly_do)).toEqual(Array(3).fill("dòng này đã vào sổ cái trước đó"));
    expect(await viecTen(xongCu.ten)).toHaveLength(1);
  });

  it("gửi lại bản 2 của CHÍNH báo cáo đầu (cùng kỳ) vẫn là lần đầu: dòng đã xong mới thêm vào sổ, dòng cũ không ghi đôi", async () => {
    const moi = dong({ ten: "Bàn giao mặt bằng trụ T17 cho nhà thầu", ket_thuc: "2026-10-12", da_xong: true, dong_so: 4 });
    const kq = await tx((q) => ghiVaoSoCai(q, bc("tl-dau-bq", 2, [xongCu, moi])));
    expect(kq[0]).toMatchObject({ hanh_dong: "khong_dung" });
    expect(kq[0].ly_do).toMatch(/đã ghi xong/);
    expect(kq[1]).toMatchObject({ hanh_dong: "vao_so_xong" });
    expect(await viecTen(xongCu.ten)).toHaveLength(1);
    expect((await viecTen(moi.ten))[0]).toMatchObject({ trang_thai: "hoan_thanh", xong: "2026-10-12" });
  });

  it("KỲ SAU (tài liệu khác, cùng đơn vị + mẫu): đã xong chưa từng có → không vào sổ như luật 02/10", async () => {
    const ten = "Dọn vệ sinh lán trại công trường T18";
    const kq = await tx((q) =>
      ghiVaoSoCai(q, bc("tl-sau-bq", 1, [dong({ ten, ket_thuc: "2026-10-16", da_xong: true })], { nhan: "BQLDA Quảng Trị · Form 7 · tuần 43", ky_bao_cao_den: "2026-10-25", ngay_gui: "2026-10-19T02:00:00Z" })),
    );
    expect(kq[0]).toMatchObject({ hanh_dong: "khong_dung" });
    expect(kq[0].xong_lan_dau).toBeUndefined();
    expect(kq[0].ly_do).toMatch(/không vào sổ/);
    expect(await viecTen(ten)).toEqual([]);
  });

  it("đơn vị khác dùng CÙNG mẫu (BQLDA Lào · Form 7) vẫn có lần nạp đầu riêng", async () => {
    const ten = "Hoàn thành khảo sát tuyến đường vào nhà máy";
    const kq = await tx((q) =>
      ghiVaoSoCai(q, bc("tl-dau-lao", 1, [dong({ ten, phu_trach: [LAO], ket_thuc: "2026-10-10", da_xong: true })], { don_vi_id: "bqlda-lao", nhan: "BQLDA Lào · Form 7 · tuần 42" })),
    );
    expect(kq[0]).toMatchObject({ hanh_dong: "vao_so_xong" });
    expect((await viecTen(ten))[0]).toMatchObject({ trang_thai: "hoan_thanh", xong: "2026-10-10" });
  });
});

describe("lần nạp đầu: dòng đã xong có việc đang mở giống — luật đóng việc giữ nguyên", () => {
  const tenMo = "Hoàn thiện hồ sơ thanh toán đợt 2 EPC";
  const xong = dong({ ten: "Hoàn thiện hồ sơ thanh toán đợt 2 EPC Hướng Việt", ket_thuc: "2026-10-10", da_xong: true });
  let maMo = "";
  beforeAll(async () => {
    await csdlMoi();
    // việc đang mở do P.ĐT&PC (Form 1) giao SCI PMC chủ trì
    const k = await tx((q) =>
      ghiVaoSoCai(q, { ...bc(null, null, [dong({ ten: tenMo, phu_trach: [PMC], ket_thuc: "2026-10-30" })]), mau_ma: "form-1", don_vi_id: "p-dtpc", cap: 2, nguoi_gui: "truong.dtpc@scigroup.vn", nhan: "P.ĐT&PC · Form 1 · tuần 41" }),
    );
    maMo = k[0].cong_viec_id!;
    for (const id of ["tl-a", "tl-b", "tl-c", "tl-d"]) await taoTaiLieu(id, id === "tl-a" ? "bqlda-qt" : id === "tl-b" ? "bqlda-lao" : id === "tl-c" ? "sci-pmc" : "sci-enc", id === "tl-a" || id === "tl-b" ? "form-7" : id === "tl-c" ? "form-5" : "form-6");
  });

  it("xem trước: hỏi người nộp — đóng việc đó, vào sổ đã xong (lần nạp đầu), hay không vào sổ", async () => {
    const xem = await tx((q) => xemTruocVaoSoCai(q, bc("tl-a", 1, [xong])));
    expect(xem[0]).toMatchObject({ hanh_dong: "goi_y_trung", xong_lan_dau: "2026-10-10" });
    expect(xem[0].goi_y?.[0].cong_viec_id).toBe(maMo);
    const cc = cachChon(xem[0], xong, undefined);
    expect(cc.macDinh).toBe(""); // bắt chọn
    expect(cc.luaChon.map((o) => o.v)).toEqual(["xong", "khong", maMo]);
    expect(giaTriGui(cc, "xong")).toBe("xong");
  });

  it("chọn «Vào sổ — đã xong» → việc đã xong mới, việc đang mở GIỮ NGUYÊN", async () => {
    const kq = await tx((q) => ghiVaoSoCai(q, bc("tl-a", 1, [xong], { xac_nhan_trung: { 0: "xong" } })));
    expect(kq[0]).toMatchObject({ hanh_dong: "vao_so_xong" });
    expect((await viecTen(xong.ten))[0]).toMatchObject({ trang_thai: "hoan_thanh" });
    expect(await viecTen(tenMo)).toMatchObject([{ id: maMo, trang_thai: "dang_mo" }]);
  });

  it("chọn «Không vào sổ» → không ghi, có dòng viec_bi_bo", async () => {
    const kq = await tx((q) => ghiVaoSoCai(q, { ...bc("tl-b", 1, [{ ...xong, ten: `${xong.ten} (Lào)`, phu_trach: [LAO] }], { xac_nhan_trung: { 0: "khong" } }), don_vi_id: "bqlda-lao" }));
    expect(kq[0]).toMatchObject({ hanh_dong: "khong_dung" });
    expect(await viecTen(`${xong.ten} (Lào)`)).toEqual([]);
    expect((await query("SELECT 1 FROM docflow.viec_bi_bo WHERE tai_lieu_id = 'tl-b'")).rows).toHaveLength(1);
  });

  it("chọn đúng việc đang mở → ĐÓNG việc đó như cũ (SCI PMC chủ trì báo xong), không sinh việc đã xong mới", async () => {
    const kq = await tx((q) =>
      ghiVaoSoCai(q, { ...bc("tl-c", 1, [{ ...xong, phu_trach: [PMC] }], { xac_nhan_trung: { 0: maMo } }), mau_ma: "form-5", don_vi_id: "sci-pmc", nguoi_gui: "gd.pmc@scigroup.vn", nhan: "SCI PMC · Form 5 · tuần 42" }),
    );
    expect(kq[0]).toMatchObject({ hanh_dong: "dong_viec", cong_viec_id: maMo });
    expect(await viecTen(tenMo)).toMatchObject([{ id: maMo, trang_thai: "hoan_thanh" }]);
    expect(await viecTen(xong.ten)).toHaveLength(1); // chỉ bản tl-a
  });

  it("đã ghi xong từ trước (≥ 90% giống việc đã xong) → không ghi lần nữa dù là lần nạp đầu", async () => {
    const kq = await tx((q) => ghiVaoSoCai(q, { ...bc("tl-d", 1, [xong]), mau_ma: "form-6", don_vi_id: "sci-enc", nhan: "SCI E&C · Form 6 · tháng 10" }));
    expect(kq[0]).toMatchObject({ hanh_dong: "khong_dung" });
    expect(kq[0].ly_do).toMatch(/đã ghi xong/);
    expect(await viecTen(xong.ten)).toHaveLength(1);
  });
});

describe("bước 4: ô Vào sổ cái khi lần nạp đầu", () => {
  const c = dong({ ten: "Bàn giao mặt bằng trụ T11", ket_thuc: "2026-10-01", tinh_trang: "đã có biên bản bàn giao" });

  it("dòng code đọc là đã xong → mặc định «Vào sổ — đã xong ngày …» (không gửi gì lên: máy chủ tự làm đúng)", () => {
    const cc = cachChon({ dong: 0, hanh_dong: "vao_so_xong", xong_lan_dau: "2026-10-01" }, { ...c, da_xong: true }, undefined);
    expect(cc.macDinh).toBe("xong");
    expect(cc.luaChon).toEqual([
      { v: "xong", nhan: "Vào sổ — đã xong ngày 01/10/2026 (lần nạp đầu)" },
      { v: "khong", nhan: "Không vào sổ — việc đã xong" },
    ]);
    expect(giaTriGui(cc, "xong")).toBeNull();
    expect(giaTriGui(cc, "khong")).toBe("khong");
  });

  it("🤖 AI đọc là đã xong (code chưa nhận ra) → cũng mặc định vào sổ đã xong; vẫn chọn được «Vẫn vào sổ — việc mới»", () => {
    const cc = cachChon({ dong: 0, hanh_dong: "tao_moi", xong_lan_dau: "2026-10-01" }, c, { chi_so: 0, tinh_trang: { gia_tri: "xong", ly_do: "có biên bản bàn giao" } });
    expect(cc.macDinh).toBe("xong");
    expect(cc.luaChon.map((o) => o.v)).toEqual(["xong", "khong", "moi"]);
  });

  it("không phải lần nạp đầu → như cũ: mặc định không vào sổ", () => {
    const cc = cachChon({ dong: 0, hanh_dong: "khong_dung" }, { ...c, da_xong: true }, undefined);
    expect(cc.macDinh).toBe("khong");
    expect(cc.xongLanDau).toBeNull();
  });

  it("dòng chưa xong của báo cáo lần đầu: không có lựa chọn «đã xong»", () => {
    const cc = cachChon({ dong: 0, hanh_dong: "tao_moi", xong_lan_dau: "2026-10-01" }, { ...c, tinh_trang: "Đang làm" }, undefined);
    expect(cc.macDinh).toBe("moi");
    expect(cc.luaChon.map((o) => o.v)).toEqual(["moi"]);
  });
});

describe("🤖 AI rà lần cuối biết lần nạp đầu (không thêm lượt AI)", () => {
  const d = dong({ ten: "Đổ bê tông móng trụ T14", da_xong: true, tinh_trang: "Đã xong" });
  it("máy định ghi đúng kế hoạch", () => {
    expect(mayDinh(d, [], true)).toBe("vào sổ ở trạng thái ĐÃ XONG — lần nạp đầu (không giao, không thành việc đang mở)");
    expect(mayDinh(d, [])).toBe("không vào sổ — việc đã xong, sổ chưa từng có");
    expect(mayDinh(d, [{ cong_viec_id: "CV-2026-0003", ten: "Đổ bê tông móng trụ T14", do_giong: 1, da_xong: "2026-10-01" }], true)).toBe("không vào sổ — đã ghi xong ở CV-2026-0003");
  });
  it("lời dặn AI có ngoại lệ lần nạp đầu", () => {
    const { prompt, system } = dungYeuCau([d], [], [], [], [[]], true);
    expect(prompt).toContain("máy định: vào sổ ở trạng thái ĐÃ XONG — lần nạp đầu");
    expect(system).toContain("LẦN NẠP ĐẦU");
  });
});
