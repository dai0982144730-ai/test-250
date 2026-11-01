// Giao diện căn phòng (Đợt 1, 28/09/2026): tuần báo cáo, xếp ô sơ đồ (đúng vị trí demo), báo cáo nào tính cho tuần,
// dữ liệu sơ đồ theo luồng báo cáo, nhắc nộp (đơn vị chưa có tài khoản → người của ô cha).
import { describe, it, expect, beforeAll } from "vitest";
import { csdlMoi, nguoi } from "../helpers/csdl";
import { layQ, tx, type Q } from "@/lib/db";
import { cacTuanGanDay, khoangNgay, tuanCua } from "@/lib/phong/tuan";
import { duLieuSoDo, kyTinhChoTuan, nhacNop } from "@/lib/phong/so-do";
import { duongNoi, xepSoDo } from "@/components/phong/bo-cuc";

describe("tuần báo cáo", () => {
  it("tuần ISO thứ Hai → Chủ nhật, kể cả tuần vắt năm", () => {
    expect(tuanCua("2026-09-25")).toEqual({ so: 39, nam: 2026, tu: "2026-09-21", den: "2026-09-27" });
    expect(tuanCua("2026-09-21").so).toBe(39);
    expect(tuanCua("2026-09-27").so).toBe(39);
    expect(tuanCua("2027-01-01")).toEqual({ so: 53, nam: 2026, tu: "2026-12-28", den: "2027-01-03" });
    expect(tuanCua("2027-01-04").so).toBe(1);
    expect(cacTuanGanDay("2026-09-28", 3).map((t) => t.so)).toEqual([40, 39, 38]);
  });
  it("khoảng ngày luôn kèm số ngày (luật 31)", () => {
    expect(khoangNgay("2026-09-21", "2026-09-27")).toBe("7 ngày · 21/09/2026 – 27/09/2026");
    expect(khoangNgay("2026-09-25", "2026-07-31")).toMatch(/^⚠ hạn 31\/07\/2026 nằm TRƯỚC/);
  });
  it("báo cáo tính cho tuần: kỳ giao với tuần; báo cáo tháng vừa qua (≤ 35 ngày) vẫn tính", () => {
    const t39 = tuanCua("2026-09-21");
    expect(kyTinhChoTuan({ loai: "tuan", tu: "2026-09-21", den: "2026-09-27" }, t39)).toBe(true);
    expect(kyTinhChoTuan({ loai: "tuan", tu: "2026-09-14", den: "2026-09-20" }, t39)).toBe(false);
    expect(kyTinhChoTuan({ loai: "thang", tu: "2026-08-01", den: "2026-08-31" }, t39)).toBe(true);
    expect(kyTinhChoTuan({ loai: "thang", tu: "2026-07-01", den: "2026-07-31" }, t39)).toBe(false);
    expect(kyTinhChoTuan(null, t39)).toBe(false);
  });
});

describe("xếp ô sơ đồ — đúng vị trí demo (thước)", () => {
  const O = (id: string, cha: string | null, thu_tu: number) => ({ id, cha, thu_tu });
  const ds = [
    O("ban-tgd", null, 0),
    O("p-dtpc", "ban-tgd", 1), O("p-ktvh", "ban-tgd", 2), O("p-hcth", "ban-tgd", 3), O("p-tckt", "ban-tgd", 4), O("p-cd", "ban-tgd", 4),
    O("sci-pmc", "p-dtpc", 5), O("sci-enc", "p-dtpc", 6), O("bqlda-qt", "p-dtpc", 7), O("bqlda-lao", "p-dtpc", 7),
    ...["nm-namxe", "nm-cannan1", "nm-cannan2", "nm-namlum1", "nm-namlum2", "nm-huonglinh7", "nm-huonglinh8"].map((id, i) => O(id, "p-ktvh", 8 + i)),
    O("bdh-huongviet", "bqlda-qt", 15), O("bdh-tanthanh", "bqlda-qt", 16), O("bdh-batang1", "bqlda-qt", 17),
    O("bdh-namkhian1", "bqlda-lao", 18),
  ];
  const bc = xepSoDo(ds);
  it("5 cột 160 px: P.ĐT&PC trên hàng 4 đơn vị, P.KT&VH trên cột nhà máy, 3 phòng còn lại lấp cột giữa", () => {
    expect(bc.W).toBe(810);
    expect(bc.VT["ban-tgd"]).toMatchObject({ x: 405, y: 12 });
    expect(["p-dtpc", "p-hcth", "p-tckt", "p-cd", "p-ktvh"].map((id) => bc.VT[id].x)).toEqual([85, 245, 405, 565, 725]);
    expect(["sci-pmc", "sci-enc", "bqlda-qt", "bqlda-lao"].map((id) => [bc.VT[id].x, bc.VT[id].y])).toEqual([[85, 161], [245, 161], [405, 161], [565, 161]]);
    expect(bc.VT["nm-namxe"]).toMatchObject({ x: 725, y: 161 });
    expect(bc.VT["nm-huonglinh8"]).toMatchObject({ x: 725, y: 161 + 6 * 56 });
    expect(bc.VT["bdh-batang1"]).toMatchObject({ x: 405, y: 233 + 2 * 46 });
    expect(bc.cap).toMatchObject({ "ban-tgd": 1, "p-cd": 2, "bqlda-lao": 3, "nm-namxe": 3, "bdh-namkhian1": 4 });
  });
  it("con xếp dọc nối vào trục bên trái; hàng ngang nối kiểu thanh", () => {
    expect(duongNoi(bc, "p-ktvh", "nm-namxe")).toBe(`M725 142 V152 H${725 - 85} V184 H650`);
    expect(duongNoi(bc, "bqlda-qt", "bdh-huongviet")).toBe(`M405 207 V217 H${405 - 77} V252 H335`);
    expect(duongNoi(bc, "p-dtpc", "bqlda-qt")).toBe("M85 142 V147 H405 V161");
  });
});

describe("dữ liệu sơ đồ + nhắc nộp", () => {
  let q: Q;
  beforeAll(async () => {
    await csdlMoi();
    q = await layQ();
  });
  it("ô cha theo luồng báo cáo: BĐH → BQLDA, BQLDA → P.ĐT&PC, nhà máy → P.KT&VH; Ban TGĐ là gốc", async () => {
    const dl = await duLieuSoDo(q, "2026-09-25");
    const cha = Object.fromEntries(dl.o.map((o) => [o.id, o.cha]));
    expect(cha["ban-tgd"]).toBeNull();
    expect(cha["bdh-huongviet"]).toBe("bqlda-qt");
    expect(cha["bdh-namlan2"]).toBe("bqlda-lao");
    expect(cha["bqlda-qt"]).toBe("p-dtpc");
    expect(cha["nm-namxe"]).toBe("p-ktvh");
    expect(dl.tuan).toMatchObject({ so: 39, tu: "2026-09-21" });
    expect(dl.bao_cao).toEqual({});
  });
  it("nhắc BĐH chưa có tài khoản → tin tới người của BQLDA; ghi sổ nhắc; đơn vị lạ → 404", async () => {
    const qt = await nguoi("quantri@scigroup.vn");
    const nhanQt = (await q.query<{ id: string }>("SELECT id FROM identity.nguoi_dung WHERE don_vi_id = 'bqlda-qt' AND active")).rows.map((r) => r.id);
    const r = await tx((t) => nhacNop(t, qt, "bdh-huongviet", "2026-09-23"));
    if (nhanQt.length) expect(r.nguoi_nhan.sort()).toEqual(nhanQt.sort());
    else expect(r.nguoi_nhan).toEqual(["quan-tri"]);
    const tin = await q.query<{ noi_dung: string }>("SELECT noi_dung FROM docflow.thong_bao WHERE loai = 'nhac_nop'");
    expect(tin.rows[0].noi_dung).toMatch(/^Nhắc nộp báo cáo tuần 39 \(7 ngày · 21\/09\/2026 – 27\/09\/2026\): Ban điều hành tổng thầu dự án Hướng Việt chưa nộp/);
    const dl = await duLieuSoDo(q, "2026-09-21");
    expect(Object.keys(dl.nhac)).toEqual(["bdh-huongviet"]);
    expect((await duLieuSoDo(q, "2026-09-28")).nhac).toEqual({});
    await expect(tx((t) => nhacNop(t, qt, "khong-co", "2026-09-23"))).rejects.toMatchObject({ status: 404 });
  });
});
