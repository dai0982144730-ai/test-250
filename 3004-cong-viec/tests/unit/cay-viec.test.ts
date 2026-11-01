// Màn "Cây việc & đường găng" chép từ agent Base (Mr. Đại chốt 03/10/2026): lớp ánh xạ sổ cái → khuôn việc của màn, 4 thẻ,
// cửa dữ liệu /api/cay-viec (dungManCayViec, agent Tiến độ là hàm giả), sổ "không cần giao", 🤖 soạn giao + giao thật.
// Chạy offline: CSDL RAM (DOCFLOW_DB=memory), thư mục dữ liệu tạm (DOCFLOW_AI_DATA).
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { csdlMoi, nguoi } from "../helpers/csdl";
import { layQ, tx } from "@/lib/db";
import { anhXaViec, chuaAiGiao, chuaToiLucGiao, demBonThe, dungCay, gomTheoWbs, nutGangTrong, sanhWbs, type DauViecCay, type DongSoCai, type ViecCay } from "@/lib/cay-viec/thuan";
import { chonDuAn, dungManCayViec, type NguonHoi } from "@/lib/cay-viec/dung-man";
import { danhDauKhongCanGiao, boDanhDauKhongCanGiao, tapKhongCanGiao } from "@/lib/cay-viec/khong-can-giao";
import { giaoTuCay, soanDeXuat } from "@/lib/cay-viec/soan-giao";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import type { WbsViec } from "@/lib/gan-wbs/thuan";

const BAY_GIO = Date.parse("2026-10-03T03:00:00Z"); // 10:00 giờ VN
const dong = (x: Partial<DongSoCai>): DongSoCai => ({
  id: "CV-1",
  ten: "Việc",
  trang_thai: "dang_mo",
  ket_thuc: null,
  pt_loai: "nguoi",
  pt_id: "a@sci",
  pt_ten: "Nguyễn A",
  cap_nhat_cuoi: null,
  ...x,
});
const gan = (x: Partial<WbsViec>): WbsViec => ({
  cong_viec_id: "CV-1",
  du_an_id: "HV",
  ma_wbs: "7.2.3",
  ten_wbs: "Thi công san nền",
  ly_do: "🤖 khớp",
  do_chac: 0.6,
  nguon: "ai",
  trang_thai: "cho_duyet",
  nguoi_duyet: null,
  luc_duyet: null,
  luc: "",
  ...x,
});

// Tiến độ thật luôn trả ngày bắt đầu; thiếu ngày thì KHÔNG tính "tới lúc giao" (07/10) → mẫu ghi ngày đã qua
const CAY = [
  { wbs: "7", name: "Thi công", critical: true, start: "2026-09-01", pct: 10, end: "2027-06-30" },
  { wbs: "7.2", name: "San nền", critical: true, start: "2026-09-01", pct: 0 },
  { wbs: "7.2.3", name: "Thi công san nền", critical: true, start: "2026-09-01", pct: 0, end: "2026-11-15", contractor: "TS" },
  { wbs: "7.2.4", name: "Lu lèn", critical: true, start: "2026-09-01", pct: 0, end: "2026-11-20" },
  { wbs: "7.10", name: "Hoàn thiện", critical: false, start: "2026-09-01", pct: 0 },
  { wbs: "6", name: "Mua sắm", critical: false, start: "2026-09-01", pct: 0 },
  { wbs: "6.1", name: "Giao thiết bị Turbine", critical: true, start: "2026-09-01", pct: 0, end: "2026-12-01" },
];

describe("cây việc — hàm thuần (ánh xạ sổ cái → khuôn việc Base)", () => {
  it("ánh xạ một việc: tên thật, hạn, quá hạn, nằm im, link mở việc, trạng thái gắn cho_duyet ↔ 🤖 chấm vàng", () => {
    const v = anhXaViec(
      dong({ id: "CV-2026-0074", ket_thuc: "2026-09-28", cap_nhat_cuoi: "2026-09-20T03:00:00Z" }),
      gan({ cong_viec_id: "CV-2026-0074" }),
      "2026-10-03",
      BAY_GIO,
      true,
    );
    expect(v).toMatchObject({
      id: "CV-2026-0074",
      tenNguoi: "Nguyễn A",
      han: "2026-09-28",
      quaHanNgay: 5,
      namImNgay: 13,
      link: "/so-do?viec=CV-2026-0074",
      duongGanMa: "ai",
      maWbs: "7.2.3",
      aiGanChuaSoat: true,
      doChacGan: 0.6,
      duyetDuoc: true,
    });
    // đã xong → không quá hạn, không nằm im; người gắn → căn cứ "✎ người gắn"
    const x = anhXaViec(dong({ trang_thai: "hoan_thanh", ket_thuc: "2026-01-01", cap_nhat_cuoi: "2026-01-01" }), gan({ nguon: "nguoi", trang_thai: "da_duyet", ly_do: null, do_chac: null }), "2026-10-03", BAY_GIO, false);
    expect(x).toMatchObject({ daXong: true, quaHanNgay: null, namImNgay: null, aiGanChuaSoat: false, canCuGan: "✎ người gắn", doChacGan: undefined });
    // chưa giao ai, chưa có dòng gắn
    const y = anhXaViec(dong({ pt_id: null, pt_ten: null, pt_loai: null }), undefined, "2026-10-03", BAY_GIO, false);
    expect(y).toMatchObject({ nguoiPhuTrach: "", duongGanMa: null, maWbs: null, aiGanChuaSoat: undefined });
  });

  it("gom theo WBS + dựng cây + 4 thẻ đúng công thức Base (④ = găng − nút có việc − nút 'không cần giao' chưa có việc)", () => {
    const vs: ViecCay[] = [
      anhXaViec(dong({ id: "A" }), gan({ cong_viec_id: "A", ma_wbs: "7.2.3" }), "2026-10-03", BAY_GIO, false),
      anhXaViec(dong({ id: "B", trang_thai: "hoan_thanh" }), gan({ cong_viec_id: "B", ma_wbs: "7.2.3", nguon: "nguoi", trang_thai: "da_duyet" }), "2026-10-03", BAY_GIO, false),
      anhXaViec(dong({ id: "C" }), gan({ cong_viec_id: "C", ma_wbs: null }), "2026-10-03", BAY_GIO, false),
      anhXaViec(dong({ id: "D" }), undefined, "2026-10-03", BAY_GIO, false),
    ];
    const g = gomTheoWbs(vs);
    // Mr. Đại chốt 03/10: mã 🤖 chờ duyệt (A) KHÔNG tính là đã gắn — nằm ở tầng B, không treo lên cây.
    // Mr. Đại chốt 05/10: việc không gắn được mã WBS cụ thể (C — 🤖 kết luận "không thuộc", kể cả còn chờ duyệt) BỎ khỏi màn:
    // không vào tổng, không vào đã xét / chờ duyệt / tầng B — chỉ còn số khongThuoc cho công thức
    expect(g).toMatchObject({ tongSoViec: 3, ganDuoc: 1, daXet: 2, choDuyet: 1, khongThuoc: 1, theoDuong: { ai_cho: 1, ai_duyet: 0, nguoi: 1, ten_viec: 0 } });
    expect(g.chuaGan.map((v) => v.id)).toEqual(["A", "D"]);
    const boQua = new Set(["7.2.4"]);
    const cay = dungCay(CAY, g.theoWbs, boQua, "2026-10-04", 7);
    expect(cay.map((n) => n.wbs)).toEqual(["6", "7"]);
    expect(cay[1].con.map((n) => n.wbs)).toEqual(["7.2", "7.10"]); // 7.10 sau 7.2 (so theo số, không theo chữ)
    const n723 = cay[1].con[0].con[0];
    // chỉ còn B (đã duyệt, đã xong) → "đã có ai nhận" = có việc CHƯA xong → false
    expect(n723).toMatchObject({ wbs: "7.2.3", nhaThau: "TS", end: "2026-11-15", daCoAiNhan: false });
    expect(n723.viec.map((v) => v.id)).toEqual(["B"]);
    expect(cay[1].con[0].con[1].khongCanGiao).toBe(true);
    const the = demBonThe(CAY, g.theoWbs, boQua, "2026-10-04", 7);
    // ⭐ 04/10: chỉ việc LÁ trong cửa sổ giao — găng 5 (7, 7.2 là nút tổng) · lá 3: 7.2.3 có việc · 7.2.4 không cần giao · 6.1
    // không có ngày bắt đầu (coi như đã đến, y luật cũ) → chưa ai giao 1
    expect(the).toMatchObject({ tongWbs: 7, tongGang: 5, gangTheoNhom: "Nhóm 6: 1 · Nhóm 7: 4", soNutGangCoViec: 1, soGangLa: 3, soLaCoViec: 1, soLaKhongCan: 1, soLaChuaToiLuc: 0, nutGangChuaGiao: 1, ngayCuoiCuaSo: "2026-10-11" });
    expect(nutGangTrong(cay).map((n) => n.wbs)).toEqual(["6.1"]);
    expect(sanhWbs("7.10", "7.9")).toBeGreaterThan(0);
  });

  it("chọn dự án: có ?du_an thì đúng dự án đó; không có thì dự án đầu tiên có cây WBS (mọi nhóm, cả Loại khác)", () => {
    const ds = [
      { id: "da-a", nhom: "sci", ma_tien_do: null },
      { id: "da-k", nhom: "khac", ma_tien_do: "khac-1" },
      { id: "HV", nhom: "sci", ma_tien_do: "hv" },
    ];
    expect(chonDuAn(ds, null)?.id).toBe("da-k");
    expect(chonDuAn(ds, "da-a")?.id).toBe("da-a");
    expect(chonDuAn(ds, "khong-co")).toBeUndefined();
  });
});

describe("cây việc — cửa /api/cay-viec + giao từ cây (CSDL RAM)", () => {
  let tmp = "";
  const hoiOk: NguonHoi = {
    hoiGang: async () => ({
      ok: true,
      du_lieu: { cod_du_bao: "2027-10-14", cod_muc_tieu: "2027-09-30", lech_ngay_so_muc_tieu: 14, chuoi_gang: [{ wbs: "7.2.3", ten: "Thi công san nền", batDau: "", ketThuc: "", pct: 0, quanHeTruoc: "" }] },
      nguon: [{ loai: "file", duong_dan: "x", mo_ta: "test" }] as never,
      canh_bao: [],
      thoi_diem_tra_loi: "2026-10-03T03:00:00Z",
    }),
    hoiCay: async () => ({ ok: true, du_lieu: { tasks: CAY }, nguon: [], thoi_diem_tra_loi: "" }) as never,
  };

  beforeAll(async () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cay-viec-"));
    process.env.DOCFLOW_AI_DATA = tmp;
    await csdlMoi();
    await tx(async (q) => {
      for (const [id, ten, da, tt, het] of [
        ["CV-C-1", "Thi công san nền khu trụ T5", "ĐG Hướng Việt", "dang_mo", "2026-09-30"],
        ["CV-C-2", "Họp giao ban nội bộ", "Hướng Việt", "dang_mo", "2026-10-30"],
        ["CV-C-3", "Mua văn phòng phẩm", "Công ty", "dang_mo", "2026-10-30"],
      ]) {
        await q.query("INSERT INTO docflow.cong_viec (id, ten, du_an, trang_thai, ket_thuc) VALUES ($1,$2,$3,$4,$5)", [id, ten, da, tt, het]);
        await q.query("INSERT INTO docflow.phan_viec (id, cong_viec_id, phu_trach_loai, phu_trach_id, noi_dung, vai) VALUES ($1,$2,'nguoi','hung.tv@scigroup.vn',$3,'chu_tri')", [`${id}-p`, id, ten]);
      }
      await q.query(
        `INSERT INTO docflow.wbs_viec (cong_viec_id, du_an_id, ma_wbs, ten_wbs, ly_do, do_chac, nguon, trang_thai) VALUES
          ('CV-C-1','HV','7.2.3','Thi công san nền','🤖 khớp san nền',0.9,'ai','da_duyet'),
          ('CV-C-2','HV',NULL,NULL,'🤖 việc nội bộ',0.95,'ai','cho_duyet')`,
      );
    });
  });
  afterAll(() => {
    delete process.env.DOCFLOW_AI_DATA;
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("ghép hai nguồn: 4 thẻ, cây, tầng B, quyền; việc ngoài dự án không lọt vào", async () => {
    const nd = await nguoi("quantri@scigroup.vn");
    const kq = await dungManCayViec(nd, "HV", hoiOk);
    expect(kq.ok).toBe(true);
    if (!kq.ok) return;
    expect(kq.du_an).toEqual({ id: "HV", ten: "Hướng Việt" });
    expect(kq.quyen).toEqual({ gan: true, giao: true });
    // CV-C-2 = 🤖 kết luận "không thuộc đầu việc nào" (chờ duyệt) → bỏ khỏi màn (Mr. Đại chốt 05/10)
    expect(kq.so_viec).toMatchObject({ tongSoViec: 1, soViecGanDuocWbs: 1, soDaXet: 1, soChoDuyet: 0, tongWbs: 7, tongGang: 5, soNutGangCoViec: 1, nutGangChuaGiao: 2, soGiaiDoan: 2, codDuBao: "2027-10-14", tongViecChuaGan: 0, soKetLuanKhongThuoc: 1 });
    expect(kq.so_viec.viecChuaGan ?? []).toEqual([]);
    expect(kq.so_viec.viecChoDuyet ?? []).toEqual([]);
    expect(kq.du_lieu.chuoi_gang[0]).toMatchObject({ wbs: "7.2.3", daCoAiNhan: true });
    const v = kq.du_lieu.cay[1].con[0].con[0].viec[0];
    expect(v).toMatchObject({ id: "CV-C-1", tenNguoi: "Trần Văn Hùng", nguoiPhuTrach: "hung.tv@scigroup.vn", aiGanChuaSoat: false, duyetDuoc: true, link: "/so-do?viec=CV-C-1" });
    expect(v.quaHanNgay).not.toBeNull();
    // nhân viên: không quyền Duyệt gắn WBS / Giao việc → nút ẩn
    const nv = await nguoi("nv.dtpc@scigroup.vn");
    const kq2 = await dungManCayViec(nv, "HV", hoiOk);
    expect(kq2.ok && kq2.quyen).toEqual({ gan: false, giao: false });
    expect(kq2.ok && kq2.du_lieu.cay[1].con[0].con[0].viec[0].duyetDuoc).toBe(false);
  });

  it("agent Tiến độ không trả đường găng → ok:false kèm số việc trong sổ; dự án chưa có cây → báo, không hiện số dự án khác", async () => {
    const nd = await nguoi("quantri@scigroup.vn");
    const kq = await dungManCayViec(nd, "HV", { ...hoiOk, hoiGang: async () => ({ ok: false, ma_loi: "KHONG_KET_NOI", thong_diep: "Agent tiến độ chưa bật" }) as never });
    expect(kq).toMatchObject({ ok: false, ma_loi: "KHONG_KET_NOI", so_viec: { ok: true, tongSoViec: 1 } });
    const kq2 = await dungManCayViec(nd, "TT", hoiOk);
    expect(kq2).toMatchObject({ ok: false, ma_loi: "KHONG_CO_DU_LIEU" });
    expect(!kq2.ok && kq2.thong_diep).toMatch(/chưa có cây WBS bên agent Tiến độ/);
    await expect(dungManCayViec(nd, "khong-co", hoiOk)).rejects.toThrow(/Không có dự án/);
    // không ?du_an → dự án đầu tiên có cây
    const kq3 = await dungManCayViec(nd, null, hoiOk);
    expect(kq3.du_an?.id).toBe("HV");
  });

  it("sổ 'không cần giao': đánh dấu trừ khỏi thẻ ④, bỏ đánh dấu trả lại; chia theo dự án", async () => {
    const nd = await nguoi("quantri@scigroup.vn");
    danhDauKhongCanGiao("HV", "6.1", nd.id);
    danhDauKhongCanGiao("HV", "6.1", nd.id); // không ghi trùng
    expect([...tapKhongCanGiao("HV")]).toEqual(["6.1"]);
    expect(tapKhongCanGiao("TT").size).toBe(0);
    const kq = await dungManCayViec(nd, "HV", hoiOk);
    // ⭐ 04/10: chỉ việc lá (7.2.3 có việc · 7.2.4 · 6.1) — 6.1 đánh dấu không cần giao → còn 1
    expect(kq.ok && kq.so_viec.nutGangChuaGiao).toBe(1);
    boDanhDauKhongCanGiao("HV", "6.1");
    const kq2 = await dungManCayViec(nd, "HV", hoiOk);
    expect(kq2.ok && kq2.so_viec.nutGangChuaGiao).toBe(2);
  });

  it("🤖 soạn giao: chỉ nhận người có trong lịch sử việc đã gắn mã; AI bịa người thì không dùng", async () => {
    const ds = await tx((q) => layCauHinh(q, "du_an"));
    const ten = new Map(CAY.map((t) => [t.wbs, t.name]));
    let gui = "";
    const ok = await tx((q) =>
      soanDeXuat(q, ds, { id: "HV", ten: "Hướng Việt" }, { ma_wbs: "7.2.4", ten: "Lu lèn", han: "2026-11-20" }, ten, async (p) => {
        gui = p;
        return '{"ma":"hung.tv@scigroup.vn","ly_do":"thường làm 7.2.3 san nền"}';
      }),
    );
    expect(gui).toContain("Thi công san nền khu trụ T5 | hung.tv@scigroup.vn (Trần Văn Hùng) | 7.2.3 Thi công san nền");
    expect(gui).not.toContain("Họp giao ban"); // việc "không thuộc" không vào lịch sử
    expect(ok).toMatchObject({ ok: true, de_xuat: { giao_cho: "hung.tv@scigroup.vn", loai: "nguoi", ten_day_du: "Trần Văn Hùng", du_an_ten: "Hướng Việt" } });
    expect(ok.ok && ok.de_xuat.can_cu).toMatch(/^🤖 thường làm 7\.2\.3 Thi công san nền.*giai đoạn 7 Thi công/);
    const bia = await tx((q) => soanDeXuat(q, ds, { id: "HV", ten: "Hướng Việt" }, { ma_wbs: "7.2.4", ten: "Lu lèn" }, ten, async () => '{"ma":"ai.do@x","ly_do":"x"}'));
    expect(bia).toMatchObject({ ok: false });
    expect(!bia.ok && bia.thong_diep).toMatch(/không có trong lịch sử/);
  });

  it("soạn KHÔNG giữ khoá CSDL trong lúc chờ AI (runAI tự đọc Cài đặt bằng layQ — bọc tx là treo cả app, lỗi 03/10)", async () => {
    const ds = await tx((q) => layCauHinh(q, "du_an"));
    const ten = new Map(CAY.map((t) => [t.wbs, t.name]));
    const q = await layQ();
    const kq = await Promise.race([
      soanDeXuat(q, ds, { id: "HV", ten: "Hướng Việt" }, { ma_wbs: "7.2.4", ten: "Lu lèn" }, ten, async () => {
        // giống chonTaiKhoan → cauHinhTk: đọc CSDL bằng layQ() giữa lượt AI
        await (await layQ()).query("SELECT 1");
        return '{"ma":"hung.tv@scigroup.vn","ly_do":"x"}';
      }),
      new Promise<"treo">((r) => setTimeout(() => r("treo"), 5000)),
    ]);
    expect(kq).not.toBe("treo");
  });

  it("giao từ cây: tạo việc thật trong sổ cái (người giao = người bấm) + gắn mã WBS nguồn người; không quyền thì chặn", async () => {
    const tgd = await nguoi("tgd@scigroup.vn");
    const ma = await tx((q) => giaoTuCay(q, tgd, { id: "HV", ten: "Hướng Việt" }, { ma_wbs: "7.2.4", ten: "Lu lèn", han: "2026-11-20", giao_cho: "hung.tv@scigroup.vn", can_cu: "🤖 thử" }));
    const cv = (await tx((q) => q.query<{ ten: string; du_an: string; giao_boi: string; ket_thuc: string }>("SELECT ten, du_an, giao_boi, ket_thuc::text FROM docflow.cong_viec WHERE id = $1", [ma]))).rows[0];
    expect(cv).toMatchObject({ ten: "[Hướng Việt] Xử lý 7.2.4 — Lu lèn", du_an: "Hướng Việt", giao_boi: "tgd@scigroup.vn", ket_thuc: "2026-11-20" });
    const w = (await tx((q) => q.query<{ ma_wbs: string; nguon: string; trang_thai: string }>("SELECT ma_wbs, nguon, trang_thai FROM docflow.wbs_viec WHERE cong_viec_id = $1", [ma]))).rows[0];
    expect(w).toEqual({ ma_wbs: "7.2.4", nguon: "nguoi", trang_thai: "da_duyet" });
    const kq = await dungManCayViec(tgd, "HV", hoiOk);
    expect(kq.ok && kq.so_viec.soNutGangCoViec).toBe(2);
    const nv = await nguoi("nv.dtpc@scigroup.vn");
    await expect(tx((q) => giaoTuCay(q, nv, { id: "HV", ten: "Hướng Việt" }, { ma_wbs: "7.2", ten: "San nền", han: "2026-11-20", giao_cho: "hung.tv@scigroup.vn" }))).rejects.toThrow(/không có quyền giao việc/);
    await expect(tx((q) => giaoTuCay(q, tgd, { id: "HV", ten: "Hướng Việt" }, { ma_wbs: "7.2", ten: "San nền", giao_cho: "khong.co@x" }))).rejects.toThrow(/Không có người hay đơn vị/);
  });

  it("04/10 (6g.7 mục 2): việc AI agent khác đề xuất, người duyệt tại chỗ — câu nguồn ghi agent + người duyệt; không mã WBS thì không gắn", async () => {
    const tgd = await nguoi("tgd@scigroup.vn");
    const tu = { maAgent: "phaply", tenAgent: "agent Pháp lý" };
    const ma = await tx((q) =>
      giaoTuCay(q, tgd, { id: "HV", ten: "Hướng Việt" }, { ma_wbs: "", ten: "Làm hồ sơ pháp lý: Văn bản thỏa thuận đo đếm", han: "2026-11-20", giao_cho: "hung.tv@scigroup.vn", can_cu: "🤖 hồ sơ quá hạn" }, tu),
    );
    const cv = (await tx((q) => q.query<{ ten: string; ket_qua_can_co: string; giao_boi: string }>("SELECT ten, ket_qua_can_co, giao_boi FROM docflow.cong_viec WHERE id = $1", [ma]))).rows[0];
    expect(cv.ten).toBe("[Hướng Việt] Làm hồ sơ pháp lý: Văn bản thỏa thuận đo đếm");
    expect(cv.giao_boi).toBe("tgd@scigroup.vn");
    expect(cv.ket_qua_can_co).toMatch(/^🤖 AI agent Pháp lý đề xuất, .+ duyệt và giao tại agent Pháp lý\./);
    expect(cv.ket_qua_can_co).not.toMatch(/ĐƯỜNG GĂNG/);
    const w = (await tx((q) => q.query("SELECT 1 FROM docflow.wbs_viec WHERE cong_viec_id = $1", [ma]))).rows;
    expect(w).toHaveLength(0);
    const ma2 = await tx((q) => giaoTuCay(q, tgd, { id: "HV", ten: "Hướng Việt" }, { ma_wbs: "7.2.5", ten: "Hồ sơ đất", han: null, giao_cho: "hung.tv@scigroup.vn" }, tu));
    const w2 = (await tx((q) => q.query<{ ma_wbs: string; ly_do: string }>("SELECT ma_wbs, ly_do FROM docflow.wbs_viec WHERE cong_viec_id = $1", [ma2]))).rows[0];
    expect(w2.ma_wbs).toBe("7.2.5");
    expect(w2.ly_do).toMatch(/agent Pháp lý đề xuất mã/);
  });
});

describe("chốt 03/10: chỉ tính mã WBS đã duyệt + duyệt cả lô ≥ 70%", () => {
  it("việc chờ duyệt không treo lên cây; duyệt cả lô chỉ nhận đề xuất chắc ≥ 0,7, ghi lịch sử, nhân viên không duyệt được", async () => {
    await csdlMoi();
    await tx(async (q) => {
      for (const id of ["CV-L-1", "CV-L-2", "CV-L-3"]) {
        await q.query("INSERT INTO docflow.cong_viec (id, ten, du_an, trang_thai) VALUES ($1,$1,'ĐG Hướng Việt','dang_mo')", [id]);
        await q.query("INSERT INTO docflow.phan_viec (id, cong_viec_id, phu_trach_loai, phu_trach_id, noi_dung, vai) VALUES ($1,$2,'don_vi','bdh-huongviet','x','chu_tri')", [`${id}-p`, id]);
      }
      await q.query(
        `INSERT INTO docflow.wbs_viec (cong_viec_id, du_an_id, ma_wbs, ten_wbs, ly_do, do_chac, nguon, trang_thai) VALUES
          ('CV-L-1','HV','7.2.3','Thi công san nền','🤖 a',0.9,'ai','cho_duyet'),
          ('CV-L-2','HV','7.2.4','Lu lèn','🤖 b',0.6,'ai','cho_duyet'),
          ('CV-L-3','HV','7.2.4','Lu lèn','🤖 c',NULL,'ai','cho_duyet')`,
      );
    });
    const { duyetCaLo } = await import("@/lib/gan-wbs/gan-wbs");
    const nv = await nguoi("nv.dtpc@scigroup.vn");
    expect(await duyetCaLo(tx, nv, "HV")).toEqual({ da_duyet: [], khong_quyen: ["CV-L-1"] });
    const gd = await nguoi("gd.bqlda@scigroup.vn");
    expect(await duyetCaLo(tx, gd, "HV")).toEqual({ da_duyet: ["CV-L-1"], khong_quyen: [] });
    const { rows } = await tx((q) => q.query<{ cong_viec_id: string; trang_thai: string }>("SELECT cong_viec_id, trang_thai FROM docflow.wbs_viec ORDER BY 1"));
    expect(rows.map((r) => r.trang_thai)).toEqual(["da_duyet", "cho_duyet", "cho_duyet"]);
    const ls = await tx((q) => q.query("SELECT 1 FROM docflow.lich_su WHERE doi_tuong_id = 'CV-L-1' AND hanh_dong = 'duyet_wbs'"));
    expect(ls.rows.length).toBe(1);
  });
});

describe("cửa sổ giao việc găng (Mr. Đại chốt 04/10: việc lá, bắt đầu trong N ngày tới)", () => {
  const T: DauViecCay[] = [
    { wbs: "9", name: "Thử nghiệm", critical: true, pct: 0, start: "2026-10-05" },
    { wbs: "9.1", name: "Đã qua ngày bắt đầu", critical: true, pct: 0, start: "2026-09-01" },
    { wbs: "9.2", name: "Bắt đầu đúng ngày cuối cửa sổ", critical: true, pct: 0, start: "2026-10-11" },
    { wbs: "9.3", name: "Còn xa", critical: true, pct: 0, start: "2027-04-27" },
    { wbs: "9.4", name: "Đã xong theo tiến độ", critical: true, pct: 100, start: "2026-09-01" },
  ] as DauViecCay[];
  it("đếm: 9 là nút tổng (không đếm) · 9.1, 9.2 tới lúc · 9.3 chưa tới lúc · 9.4 đã xong", () => {
    const the = demBonThe(T, new Map(), new Set(), "2026-10-04", 7);
    expect(the).toMatchObject({ soGangLa: 4, soLaDaXong: 1, soLaChuaToiLuc: 1, nutGangChuaGiao: 2, ngayCuoiCuaSo: "2026-10-11" });
    const cay = dungCay(T, new Map(), new Set(), "2026-10-04", 7);
    const con = cay[0].con;
    expect(chuaAiGiao(cay[0])).toBe(false); // nút tổng
    expect(con.filter(chuaAiGiao).map((n) => n.wbs)).toEqual(["9.1", "9.2"]);
    expect(con.filter(chuaToiLucGiao).map((n) => n.wbs)).toEqual(["9.3"]);
    expect(con.find((n) => n.wbs === "9.3")?.conNgay).toBe(205);
    expect(nutGangTrong(cay).map((n) => n.wbs)).toEqual(["9.1", "9.2"]);
  });
  it("cửa sổ 0 ngày = chỉ khi đã đến ngày bắt đầu (luật cũ)", () => {
    expect(demBonThe(T, new Map(), new Set(), "2026-10-04", 0).nutGangChuaGiao).toBe(1);
  });
});

