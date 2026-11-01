// Dòng báo ĐÃ XONG vào sổ cái — Mr. Đại bắt lỗi 02/10/2026 (CV-2026-0098 "Thi công móng trụ T5–T8"):
//   ① báo cáo ghi lại việc đã xong lần hai (không có mã việc) → trước đây sinh việc mới đóng ngay, vì máy chỉ so việc đang mở
//   ② "Thi công … đã xong" bị gợi ý trùng "Nghiệm thu …" (máy chấm 83%) → đóng nhầm việc nghiệm thu
//   ③ việc xong chưa từng có trong sổ → "xong rồi thì không vào sổ"
//   ④ dòng chưa xong khớp việc đã đóng → gợi ý "đã xong — mở lại", người nộp chọn thì mở lại
// Test cũ luôn ghi mã việc (CV-…) trên dòng nên không bao giờ đi vào nhánh so tên với việc đã đóng.
import { describe, it, expect, beforeAll } from "vitest";
import { csdlMoi } from "../helpers/csdl";
import { query, tx } from "@/lib/db";
import type { DauVaoSoCai, DongCongViec } from "@/lib/types";
import { ghiVaoSoCai, xemTruocVaoSoCai } from "@/lib/so-cai/dich-vu";
import { laDaXong } from "@/lib/kiem-tra/chuan-hoa";
import { doGiongViec, khacDongTu } from "@/lib/so-cai/tien-ich";
import { dungYeuCau } from "@/lib/so-cai/ai-ra-viec";
import { cachChon } from "@/components/gui/nop/chon-vao-so";

const BQ = { loai: "don_vi" as const, id: "bqlda-qt", ten: "BQLDA Quảng Trị" };
const dong = (p: Partial<DongCongViec> & { ten: string }): DongCongViec => ({ phu_trach: [BQ], nguon_bang: "bang_cong_viec", dong_so: 1, du_an: "ĐG Hướng Việt", ...p });
const bc = (tuan: number, ngayGui: string, cv: DongCongViec[], extra: Partial<DauVaoSoCai> = {}): DauVaoSoCai => ({
  tai_lieu_id: null,
  phien_ban: null,
  mau_ma: "form-7",
  nhan: `BQLDA Quảng Trị · Form 7 · tuần ${tuan}`,
  don_vi_id: "bqlda-qt",
  cap: 3,
  nguoi_gui: "gd.bqlda@scigroup.vn",
  ky_bao_cao_den: ngayGui.slice(0, 10),
  ngay_gui: ngayGui,
  cong_viec: cv,
  ...extra,
});
const viecTen = async (ten: string) =>
  (await query<{ id: string; trang_thai: string }>("SELECT id, trang_thai FROM docflow.cong_viec WHERE ten = $1 ORDER BY id", [ten])).rows;

describe("ô Tình trạng: nhiều kiểu viết của người làm báo cáo", () => {
  it.each(["Xong", "đã xong", "Đã xong 27/09", "100%", "100 %", "Đạt", "đạt yêu cầu", "Hoàn thành", "Đã hoàn thành.", "Kết thúc", "Đã nghiệm thu", "nghiệm thu xong", "x", "✓"])("“%s” = đã xong", (v) =>
    expect(laDaXong(v)).toBe(true),
  );
  it.each(["Đang làm", "Chưa làm", "chưa xong", "không đạt", "Đạt 80%", "80%", "Sắp xong", "Hoàn thành một phần", "Nghiệm thu", "Đặt hàng", "Dừng: chờ vốn", ""])("“%s” ≠ đã xong", (v) =>
    expect(laDaXong(v)).toBe(false),
  );
});

describe("động từ đầu tên việc", () => {
  it("Thi công ≠ Nghiệm thu: dưới ngưỡng gợi ý 60% (trước đây 83%)", () => {
    expect(khacDongTu("Thi công móng trụ T5–T8", "Nghiệm thu móng trụ T5–T8")).toBe(true);
    expect(doGiongViec({ ten: "Thi công móng trụ T5–T8", du_an: "ĐG Hướng Việt" }, { ten: "Nghiệm thu móng trụ T5–T8", du_an: "ĐG Hướng Việt" })).toBeLessThan(0.6);
  });
  it("cùng nhóm hành động vẫn so như thường (duyệt ≈ phê duyệt, rà ≈ rà soát)", () => {
    expect(khacDongTu("Phê duyệt TMĐT điều chỉnh", "Duyệt TMĐT điều chỉnh")).toBe(false);
    expect(khacDongTu("Rà soát HĐ EPC", "Rà điều khoản HĐ EPC")).toBe(false);
    expect(khacDongTu("GPMB Trụ T11", "Chi trả GPMB Trụ T11")).toBe(false); // một bên không bắt đầu bằng động từ đã biết
  });
});

describe("sổ cái: dòng báo đã xong", () => {
  beforeAll(async () => {
    await csdlMoi();
    // Luật 02/10 "đã xong không vào sổ" là luật của KỲ SAU: BQLDA Quảng Trị + Form 7 đã có một kỳ trong sổ. Lần nạp ĐẦU thì dòng
    // đã xong vào sổ ở trạng thái đã xong (Mr. Đại gật 18/10/2026) — tests/unit/so-cai-lan-nap-dau.test.ts
    await tx((q) => ghiVaoSoCai(q, bc(38, "2026-09-18T09:00:00Z", [dong({ ten: "Kỳ trước — việc nền của bài thử", ket_thuc: "2026-12-31", dong_so: 99 })])));
  });

  it("③ việc xong chưa từng có trong sổ → không vào sổ, không sinh việc", async () => {
    const ten = "Lắp đặt biển báo công trường T3";
    const kq = await tx((q) => ghiVaoSoCai(q, bc(40, "2026-09-29T09:00:00Z", [dong({ ten, ket_thuc: "2026-09-27", da_xong: true, tinh_trang: "Đã xong" })])));
    expect(kq[0]).toMatchObject({ hanh_dong: "khong_dung" });
    expect(kq[0].cong_viec_id).toBeUndefined();
    expect(kq[0].ly_do).toMatch(/không vào sổ/);
    expect(await viecTen(ten)).toEqual([]);
  });

  it("③ ghi lại để Rà soát không coi là thiếu (viec_bi_bo có lý do)", async () => {
    const ten = "Dọn mặt bằng bãi tập kết";
    await tx((q) => ghiVaoSoCai(q, bc(40, "2026-09-29T09:00:00Z", [dong({ ten, ket_thuc: "2026-09-27", da_xong: true, dong_so: 7 })], { tai_lieu_id: "tl-thu-xong", phien_ban: 1 })));
    const { rows } = await query<{ ly_do: string }>("SELECT ly_do FROM docflow.viec_bi_bo WHERE tai_lieu_id = 'tl-thu-xong' AND dong_so = 7");
    expect(rows[0]?.ly_do).toMatch(/đã xong/);
  });

  it("① báo cáo khác ghi lại việc đã đóng (không mã) → không sinh việc thứ hai", async () => {
    const ten = "Thi công móng trụ T5–T8";
    // tuần 39: việc vào sổ; tuần 40 (lần 1): báo đã xong → đóng
    const k1 = await tx((q) => ghiVaoSoCai(q, bc(39, "2026-09-25T06:00:00Z", [dong({ ten, bat_dau: "2026-09-05", ket_thuc: "2026-09-27" })])));
    const ma = k1[0].cong_viec_id!;
    // người nộp chọn "Đúng là <mã> — đóng việc này" ở bước 4
    await tx((q) => ghiVaoSoCai(q, bc(40, "2026-09-29T09:00:00Z", [dong({ ten, bat_dau: "2026-09-05", ket_thuc: "2026-09-27", da_xong: true })], { xac_nhan_trung: { 0: ma } })));
    expect((await viecTen(ten)).map((v) => v.trang_thai)).toEqual(["hoan_thanh"]);
    // tuần 40 (lần 2, file khác, người khác): ghi lại đúng dòng đó
    const k3 = await tx((q) =>
      ghiVaoSoCai(q, bc(40, "2026-09-29T17:44:00Z", [dong({ ten, bat_dau: "2026-09-05", ket_thuc: "2026-09-27", da_xong: true })], { nguoi_gui: "doainv@scigroup.vn" })),
    );
    expect(k3[0]).toMatchObject({ hanh_dong: "khong_dung", cong_viec_id: ma });
    expect(k3[0].ly_do).toMatch(/đã ghi xong/);
    expect(await viecTen(ten)).toHaveLength(1); // trước 02/10: thêm CV-…-0098
  });

  it("② “Thi công … đã xong” KHÔNG đóng việc “Nghiệm thu …” đang mở", async () => {
    const tc = "Thi công móng trụ T9–T12";
    const nt = "Nghiệm thu móng trụ T9–T12";
    const k = await tx((q) => ghiVaoSoCai(q, bc(40, "2026-09-29T09:00:00Z", [dong({ ten: nt, ket_thuc: "2026-10-20" })])));
    const maNt = k[0].cong_viec_id!;
    const xem = await tx((q) => xemTruocVaoSoCai(q, bc(41, "2026-10-05T09:00:00Z", [dong({ ten: tc, ket_thuc: "2026-10-03", da_xong: true })])));
    expect(xem[0].hanh_dong).toBe("khong_dung"); // không gợi ý trùng Nghiệm thu
    await tx((q) => ghiVaoSoCai(q, bc(41, "2026-10-05T09:00:00Z", [dong({ ten: tc, ket_thuc: "2026-10-03", da_xong: true })])));
    expect((await viecTen(nt))[0]).toMatchObject({ id: maNt, trang_thai: "dang_mo" });
    expect(await viecTen(tc)).toEqual([]);
  });

  it("dòng đã xong có việc đang mở giống → hỏi người nộp; chọn “không vào sổ” thì việc giữ nguyên", async () => {
    const ten = "Hoàn thiện hồ sơ thanh toán đợt 3 EPC";
    const k = await tx((q) => ghiVaoSoCai(q, bc(40, "2026-09-29T09:00:00Z", [dong({ ten, ket_thuc: "2026-10-10" })])));
    const ma = k[0].cong_viec_id!;
    const dongXong = dong({ ten: "Hoàn thiện hồ sơ thanh toán đợt 3 EPC Hướng Việt", ket_thuc: "2026-10-10", da_xong: true });
    const xem = await tx((q) => xemTruocVaoSoCai(q, bc(41, "2026-10-05T09:00:00Z", [dongXong])));
    expect(xem[0]).toMatchObject({ hanh_dong: "goi_y_trung" });
    expect(xem[0].goi_y?.[0].cong_viec_id).toBe(ma);
    const g = await tx((q) => ghiVaoSoCai(q, bc(41, "2026-10-05T09:00:00Z", [dongXong], { xac_nhan_trung: { 0: "khong" } })));
    expect(g[0].hanh_dong).toBe("khong_dung");
    expect((await viecTen(ten))[0].trang_thai).toBe("dang_mo");
    // chọn đúng việc → đóng việc đó, không sinh việc mới
    const g2 = await tx((q) => ghiVaoSoCai(q, bc(41, "2026-10-05T10:00:00Z", [dongXong], { xac_nhan_trung: { 0: ma } })));
    expect(g2[0]).toMatchObject({ hanh_dong: "dong_viec", cong_viec_id: ma });
    expect(await viecTen("Hoàn thiện hồ sơ thanh toán đợt 3 EPC Hướng Việt")).toEqual([]);
  });

  it("④ dòng CHƯA xong khớp việc đã đóng → gợi ý “đã xong — mở lại”; chọn thì mở lại, không sinh việc mới", async () => {
    const ten = "Thi công đường vào trạm biến áp";
    const k1 = await tx((q) => ghiVaoSoCai(q, bc(39, "2026-09-25T06:00:00Z", [dong({ ten, ket_thuc: "2026-09-28" })])));
    const ma = k1[0].cong_viec_id!;
    await tx((q) => ghiVaoSoCai(q, bc(40, "2026-09-29T09:00:00Z", [dong({ ten, ket_thuc: "2026-09-28", da_xong: true })], { xac_nhan_trung: { 0: ma } })));
    const dangLam = dong({ ten, ket_thuc: "2026-10-15", tinh_trang: "Đang làm" });
    const xem = await tx((q) => xemTruocVaoSoCai(q, bc(41, "2026-10-05T09:00:00Z", [dangLam])));
    expect(xem[0]).toMatchObject({ hanh_dong: "goi_y_trung" });
    expect(xem[0].goi_y?.[0]).toMatchObject({ cong_viec_id: ma });
    expect(xem[0].goi_y?.[0].da_xong).toBeTruthy();
    const g = await tx((q) => ghiVaoSoCai(q, bc(41, "2026-10-05T09:00:00Z", [dangLam], { xac_nhan_trung: { 0: ma } })));
    expect(g[0]).toMatchObject({ hanh_dong: "de", cong_viec_id: ma });
    expect(await viecTen(ten)).toEqual([{ id: ma, trang_thai: "dang_mo" }]);
    const ls = (await query<{ hanh_dong: string }>("SELECT hanh_dong FROM docflow.lich_su WHERE doi_tuong_id = $1 ORDER BY id", [ma])).rows.map((r) => r.hanh_dong);
    expect(ls).toContain("mo_lai_viec");
  });
});

describe("bước 4: ô Vào sổ cái + AI rà lần cuối", () => {
  const c = dong({ ten: "Bàn giao mặt bằng trụ T11", ket_thuc: "2026-10-01", tinh_trang: "đã có biên bản bàn giao" });

  it("🤖 AI đọc tình trạng là đã xong (code chưa nhận ra) → mặc định không vào sổ, có lựa chọn vẫn vào sổ", () => {
    const cc = cachChon({ dong: 0, hanh_dong: "tao_moi" }, c, { chi_so: 0, tinh_trang: { gia_tri: "xong", ly_do: "có biên bản bàn giao" } });
    expect(cc.aiXong).toBe("có biên bản bàn giao");
    expect(cc.macDinh).toBe("khong");
    expect(cc.luaChon.map((o) => o.v)).toEqual(["khong", "moi"]);
  });

  it("ứng viên của máy mà 🤖 AI cho là khác việc: vẫn hiện để người quyết, nhưng không bắt chọn", () => {
    const d = { dong: 0, hanh_dong: "goi_y_trung" as const, goi_y: [{ cong_viec_id: "CV-2026-0086", ten: "Nghiệm thu bàn giao trụ T11", do_giong: 0.7 }] };
    const cc = cachChon(d, { ...c, tinh_trang: undefined }, { chi_so: 0, may_sai: [{ ma: "CV-2026-0086", ly_do: "nghiệm thu khác bàn giao" }] });
    expect(cc.macDinh).toBe("moi");
    expect(cc.luaChon.find((o) => o.v === "CV-2026-0086")?.nhan).toMatch(/🤖 khác việc/);
    const cc2 = cachChon(d, { ...c, tinh_trang: undefined }, undefined);
    expect(cc2.macDinh).toBe(""); // không có AI phản đối → bắt chọn như cũ
  });

  it("dòng đã xong không bao giờ có lựa chọn “Việc mới”", () => {
    const d = { dong: 0, hanh_dong: "goi_y_trung" as const, goi_y: [{ cong_viec_id: "CV-2026-0001", ten: "Bàn giao mặt bằng trụ T11", do_giong: 0.95 }] };
    const cc = cachChon(d, { ...c, da_xong: true }, undefined);
    expect(cc.luaChon.map((o) => o.v)).toEqual(["khong", "CV-2026-0001"]);
  });

  it("lời dặn AI có ô tình trạng nguyên văn, ứng viên của máy và kế hoạch máy định", () => {
    const { prompt, system } = dungYeuCau(
      [dong({ ten: "Thi công móng trụ T5–T8", da_xong: true, tinh_trang: "Đã xong" })],
      [{ id: "CV-2026-0003", ten: "Thi công móng trụ T5–T8", du_an: "ĐG Hướng Việt", xong_ngay: "2026-09-29" }],
      [],
      [],
      [[{ cong_viec_id: "CV-2026-0003", ten: "Thi công móng trụ T5–T8", do_giong: 1, da_xong: "2026-09-29" }]],
    );
    expect(prompt).toContain('tình trạng ghi: "Đã xong" (máy đọc: ĐÃ XONG)');
    expect(prompt).toContain("đã xong 29/09/2026");
    expect(prompt).toContain("máy định: không vào sổ — đã ghi xong ở CV-2026-0003");
    expect(system).toContain("RÀ LẦN CUỐI");
  });
});

describe("khung chat: link báo cáo mở cửa sổ xem, khoanh dòng ?tim=", () => {
  it("chấp nhận ?tim= và đọc ra chữ cần khoanh", async () => {
    const { chuanHoaLink, linkTaiLieu } = await import("@/lib/ai/trang-co-that");
    const lk = "/api/tai-lieu/tl-mupo6oxx-1996b7/tep?tim=Thi%20c%C3%B4ng%20m%C3%B3ng%20tr%E1%BB%A5";
    expect(chuanHoaLink(lk)).toBe(lk);
    expect(linkTaiLieu(lk)).toEqual({ id: "tl-mupo6oxx-1996b7", tim: "Thi công móng trụ" });
    expect(linkTaiLieu("/api/tai-lieu/tl-x/tep")).toEqual({ id: "tl-x", tim: null });
    expect(chuanHoaLink("/api/tai-lieu/tl-x/tep?tim=a&xoa=1")).toBeNull(); // tham số lạ → bỏ link
  });
});

describe("độ giống: tên ngắn chỉ một chữ có nghĩa", () => {
  it("chung đúng một chữ (“test”) không thành gợi ý trùng (test 02/10: 75% → dưới 60%)", async () => {
    const { doGiongTen } = await import("@/lib/so-cai/tien-ich");
    expect(doGiongTen("Kiểm định cẩu tháp TC-02 (TEST 02-10)", "test c?y b?t d? s?a")).toBeLessThan(0.6);
    expect(doGiongTen("GPMB Trụ T11", "Chi trả GPMB Trụ T11 cho 3 hộ")).toBeGreaterThanOrEqual(0.6); // tên ngắn ≥ 2 chữ vẫn khớp
  });
});

describe("mở lại việc: cấp dưới không mở lại được việc cấp trên đã báo xong (Mr. Đại chốt 02/10 chiều)", () => {
  beforeAll(async () => {
    await csdlMoi();
  });
  const dtpc = (ngay: string, cv: DongCongViec[], extra: Partial<DauVaoSoCai> = {}): DauVaoSoCai => ({
    ...bc(40, ngay, cv),
    mau_ma: "form-1",
    nhan: "Phòng Đầu tư và Pháp chế · Form 1 · tuần 40",
    don_vi_id: "p-dtpc",
    cap: 2,
    nguoi_gui: "truong.dtpc@scigroup.vn",
    ...extra,
  });

  it("BQLDA (cấp 3) ghi đang làm việc P.ĐT&PC (cấp 2) đã báo xong → giữ đã xong, ghi ý kiến khác, báo người giao", async () => {
    const ten = "GPMB Trụ T21 thử cấp";
    const k1 = await tx((q) => ghiVaoSoCai(q, bc(39, "2026-09-25T06:00:00Z", [dong({ ten, ket_thuc: "2026-10-15" })])));
    const ma = k1[0].cong_viec_id!;
    await tx((q) => ghiVaoSoCai(q, dtpc("2026-10-01T09:00:00Z", [dong({ ten, ket_thuc: "2026-10-15", da_xong: true })], { xac_nhan_trung: { 0: ma } })));
    expect((await viecTen(ten))[0].trang_thai).toBe("hoan_thanh");
    const dangLam = dong({ ten, ket_thuc: "2026-10-15", tinh_trang: "Đang làm" });
    // xem trước: ứng viên mang dấu cấp trên đã báo xong → ô chọn ghi "ghi ý kiến khác", không "mở lại"
    const xem = await tx((q) => xemTruocVaoSoCai(q, bc(40, "2026-10-02T09:00:00Z", [dangLam])));
    expect(xem[0].goi_y?.[0]).toMatchObject({ cong_viec_id: ma });
    expect(xem[0].goi_y?.[0].cap_tren_xong).toMatch(/Đầu tư và Pháp chế/);
    // người nộp chọn đúng việc đó → KHÔNG mở lại
    const g = await tx((q) => ghiVaoSoCai(q, bc(40, "2026-10-02T09:00:00Z", [dangLam], { xac_nhan_trung: { 0: ma } })));
    expect(g[0]).toMatchObject({ hanh_dong: "khong_dung", cong_viec_id: ma });
    expect(g[0].ly_do).toMatch(/cấp trên/);
    expect(await viecTen(ten)).toEqual([{ id: ma, trang_thai: "hoan_thanh" }]);
    const ls = (await query<{ hanh_dong: string }>("SELECT hanh_dong FROM docflow.lich_su WHERE doi_tuong_id = $1", [ma])).rows.map((r) => r.hanh_dong);
    expect(ls).toContain("y_kien_khac");
    expect(ls).not.toContain("mo_lai_viec");
    const giao = (await query<{ giao_boi: string }>("SELECT giao_boi FROM docflow.cong_viec WHERE id = $1", [ma])).rows[0].giao_boi;
    const tb = (await query<{ n: number }>("SELECT count(*)::int AS n FROM docflow.thong_bao WHERE nguoi_nhan = $1 AND loai = 'y_kien_khac'", [giao])).rows[0].n;
    expect(giao === "gd.bqlda@scigroup.vn" || tb === 1).toBe(true);
  });

  it("cùng cấp báo xong rồi ghi đang làm → vẫn được mở lại", async () => {
    const ten = "Đo điện trở nối đất trạm thử cấp";
    const k1 = await tx((q) => ghiVaoSoCai(q, bc(39, "2026-09-25T06:00:00Z", [dong({ ten, ket_thuc: "2026-10-15" })])));
    const ma = k1[0].cong_viec_id!;
    await tx((q) => ghiVaoSoCai(q, bc(40, "2026-10-01T09:00:00Z", [dong({ ten, ket_thuc: "2026-10-15", da_xong: true })], { xac_nhan_trung: { 0: ma } })));
    const g = await tx((q) => ghiVaoSoCai(q, bc(40, "2026-10-02T09:00:00Z", [dong({ ten, ket_thuc: "2026-10-20", tinh_trang: "Đang làm" })], { xac_nhan_trung: { 0: ma } })));
    expect(g[0]).toMatchObject({ hanh_dong: "de", cong_viec_id: ma });
    expect((await viecTen(ten))[0].trang_thai).toBe("dang_mo");
  });
});
