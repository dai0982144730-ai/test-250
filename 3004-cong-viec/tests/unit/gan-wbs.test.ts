// Gắn việc vào cây WBS của agent Tiến độ (Mr. Đại chốt 03/10/2026 — agent Công việc thay vai agent Base).
// Chạy offline: cây WBS + AI là hàm giả; CSDL RAM (DOCFLOW_DB=memory).
import { describe, it, expect, beforeAll } from "vitest";
import { csdlMoi, nguoi } from "../helpers/csdl";
import { tx } from "@/lib/db";
import { aiTuDuyet, docDoChac, ganTenWbs, maTrongTen, nhanWbs } from "@/lib/gan-wbs/thuan";
import { docGanWbs, duyetHoacSua, ganMotLuot, type LayCay } from "@/lib/gan-wbs/gan-wbs";
import { kiemTra } from "@/lib/cau-hinh/kiem-tra";
import { MAC_DINH } from "@/lib/cau-hinh/mac-dinh";

const CAY = [
  { wbs: "7", name: "Thi công" },
  { wbs: "7.2.3", name: "Họp dân chi trả đền bù móng turbine" },
  { wbs: "7.5.4.6", name: "Đổ bê tông móng trụ T9" },
  { wbs: "6.1.4", name: "Giao thiết bị Turbine" },
];
const layCay: LayCay = async () => ({ ok: true, tasks: CAY });

describe("gắn WBS — hàm thuần", () => {
  it("mã trong tên: chỉ nhận mã có trong cây, đúng một mã, ít nhất 2 dấu chấm", () => {
    const co = new Set(CAY.map((t) => t.wbs));
    expect(maTrongTen("Họp dân chi trả đền bù (7.2.3)", co)).toBe("7.2.3");
    expect(maTrongTen("Báo cáo ngày 7.5 và 9.9.9", co)).toBeNull(); // 7.5 không phải mã, 9.9.9 không có trong cây
    expect(maTrongTen("Gộp 7.2.3 và 6.1.4", co)).toBeNull(); // hai mã → máy không đoán
  });
  it("độ chắc: đọc 0,8 / 80 / 0.8; đọc không được thì null (không mặc định 1)", () => {
    expect(docDoChac("0,8")).toBe(0.8);
    expect(docDoChac(80)).toBe(0.8);
    expect(docDoChac("cao")).toBeNull();
  });
  it("AI tự duyệt chỉ khi chế độ AI tự duyệt và độ chắc đo được ≥ ngưỡng", () => {
    expect(aiTuDuyet("nguoi_duyet", 0.7, 0.99)).toBe(false);
    expect(aiTuDuyet("ai_tu_duyet", 0.7, 0.7)).toBe(true);
    expect(aiTuDuyet("ai_tu_duyet", 0.7, 0.69)).toBe(false);
    expect(aiTuDuyet("ai_tu_duyet", 0.7, null)).toBe(false);
  });
  it("luật 30: mã WBS trần trong lý do được gắn tên; mã đã có tên thì để nguyên", () => {
    const ten = new Map(CAY.map((t) => [t.wbs, t.name]));
    expect(ganTenWbs("khớp 7.2.3 vì có chữ họp dân", ten)).toBe("khớp 7.2.3 Họp dân chi trả đền bù móng turbine vì có chữ họp dân");
    expect(ganTenWbs("khớp 7.2.3 Họp dân chi trả", ten)).toBe("khớp 7.2.3 Họp dân chi trả");
    expect(nhanWbs(null, null)).toBe("Không thuộc đầu việc nào");
  });
  it("Cài đặt: kiểm hợp lệ nhóm gắn WBS và mã bên Tiến độ", async () => {
    await csdlMoi({ macDinhGoc: true });
    expect(await tx((q) => kiemTra(q, "gan_wbs", MAC_DINH.gan_wbs))).toEqual([]);
    expect((await tx((q) => kiemTra(q, "gan_wbs", { ...MAC_DINH.gan_wbs, nguong_tu_duyet: 2 }))).join()).toMatch(/từ 0 đến 1/);
    const sai = MAC_DINH.du_an.map((d) => (d.id === "HV" ? { ...d, ma_tien_do: "dien gio" } : d));
    expect((await tx((q) => kiemTra(q, "du_an", sai))).join()).toMatch(/không được có dấu cách/);
    expect(MAC_DINH.du_an.find((d) => d.id === "HV")?.ma_tien_do).toBe("HV"); // 6g.6: mã bên Tiến độ = mã ngắn Main
  });
});

describe("gắn WBS — một lượt + người duyệt", () => {
  beforeAll(async () => {
    await csdlMoi();
    await tx(async (q) => {
      for (const [id, ten, da] of [
        ["CV-W-1", "Họp dân chi trả đền bù mặt bằng móng turbine (7.2.3)", "ĐG Hướng Việt"],
        ["CV-W-2", "Đổ bê tông móng trụ T9", "ĐG Hướng Việt"],
        ["CV-W-3", "Họp giao ban nội bộ", "Hướng Việt"],
        ["CV-W-4", "Mua văn phòng phẩm", "Công ty"],
      ]) {
        await q.query("INSERT INTO docflow.cong_viec (id, ten, du_an, trang_thai) VALUES ($1,$2,$3,'dang_mo')", [id, ten, da]);
        // việc "Công ty" giao Phòng HCTH — giao Ban điều hành Hướng Việt thì máy tính nó thuộc dự án (đúng luật tra dự án)
        await q.query("INSERT INTO docflow.phan_viec (id, cong_viec_id, phu_trach_loai, phu_trach_id, noi_dung, vai) VALUES ($1,$2,'don_vi',$4,$3,'chu_tri')", [`${id}-p`, id, ten, da === "Công ty" ? "p-hcth" : "bdh-huongviet"]);
      }
    });
  });

  it("mã trong tên chỉ là GỢI Ý cho AI (không tự gắn); 🤖 AI đề xuất chờ duyệt; mã bịa bị bỏ; việc ngoài dự án không gửi AI", async () => {
    let gui = "";
    const kq = await tx((q) =>
      ganMotLuot(q, layCay, async (p) => {
        gui = p;
        return JSON.stringify([
          // đo 03/10: tên ghi 7.2.3 nhưng nội dung không khớp đầu việc 7.2.3 → AI tự chọn mã đúng
          { ma_viec: "CV-W-1", ma: "7.2.3", ly_do: "tên ghi 7.2.3 và nội dung khớp họp dân đền bù", do_chac: 0.9 },
          { ma_viec: "CV-W-2", ma: "7.5.4.6", ly_do: "đổ bê tông móng T9 khớp 7.5.4.6", do_chac: 0.95 },
          { ma_viec: "CV-W-3", ma: "9.9.9", ly_do: "x", do_chac: 0.9 },
          { ma_viec: "CV-LA", ma: "7.2.3", ly_do: "x", do_chac: 1 },
        ]);
      }),
    );
    expect(kq[0]).toMatchObject({ du_an_id: "HV", so_xet: 3, theo_ten: 1, ai_de_xuat: 3, ai_tu_duyet: 0, loi: 0 });
    expect(gui).toContain("CV-W-1 | Họp dân chi trả đền bù mặt bằng móng turbine (7.2.3) | tên ghi mã: 7.2.3 Họp dân chi trả đền bù móng turbine");
    expect(gui).not.toContain("CV-W-4");
    const g = Object.fromEntries((await tx((q) => docGanWbs(q))).map((w) => [w.cong_viec_id, w]));
    expect(g["CV-W-1"]).toMatchObject({ ma_wbs: "7.2.3", nguon: "ai", trang_thai: "cho_duyet" });
    expect(g["CV-W-2"]).toMatchObject({ ma_wbs: "7.5.4.6", ten_wbs: "Đổ bê tông móng trụ T9", nguon: "ai", trang_thai: "cho_duyet", do_chac: 0.95 });
    expect(g["CV-W-2"].ly_do).toContain("🤖");
    expect(g["CV-W-2"].ly_do).toContain("7.5.4.6 Đổ bê tông móng trụ T9");
    expect(g["CV-W-3"]).toMatchObject({ ma_wbs: null, trang_thai: "cho_duyet", do_chac: null });
    expect(g["CV-W-3"].ly_do).toMatch(/không có trong cây/);
    expect(g["CV-W-4"]).toBeUndefined();
  });

  it("đã có dòng thì lượt sau không hỏi AI lại (người/AI không bị gắn đè)", async () => {
    let goi = 0;
    await tx((q) => ganMotLuot(q, layCay, async () => (goi++, "[]")));
    expect(goi).toBe(0);
  });

  it("quyền Duyệt gắn WBS: nhân viên bị chặn; Giám đốc BQLDA (đơn vị + cấp dưới) duyệt / sửa được, ghi lịch sử", async () => {
    const nv = await nguoi("hung.tv@scigroup.vn");
    await expect(tx((q) => duyetHoacSua(q, nv, "CV-W-2", {}))).rejects.toThrow(/không có quyền/);
    const gd = await nguoi("gd.bqlda@scigroup.vn");
    const a = await tx((q) => duyetHoacSua(q, gd, "CV-W-2", {}));
    expect(a).toMatchObject({ ma_wbs: "7.5.4.6", nguon: "ai", trang_thai: "da_duyet", nguoi_duyet: "gd.bqlda@scigroup.vn" });
    const maCo = new Map(CAY.map((t) => [t.wbs, t.name]));
    await expect(tx((q) => duyetHoacSua(q, gd, "CV-W-3", { ma: "1.2.3" }, maCo))).rejects.toThrow(/không có trong cây/);
    const b = await tx((q) => duyetHoacSua(q, gd, "CV-W-3", { ma: "6.1.4" }, maCo));
    expect(b).toMatchObject({ ma_wbs: "6.1.4", ten_wbs: "Giao thiết bị Turbine", nguon: "nguoi", trang_thai: "da_duyet" });
    const { rows } = await tx((q) => q.query<{ hanh_dong: string }>("SELECT hanh_dong FROM docflow.lich_su WHERE doi_tuong_id IN ('CV-W-2','CV-W-3') ORDER BY id"));
    expect(rows.map((r) => r.hanh_dong)).toEqual(["duyet_wbs", "gan_wbs"]);
  });

  it("AI tự duyệt: chỉ đề xuất có độ chắc ≥ ngưỡng có hiệu lực ngay", async () => {
    await tx(async (q) => {
      await q.query("INSERT INTO docflow.cau_hinh (khoa, gia_tri, phien_ban) VALUES ('gan_wbs', $1, 1) ON CONFLICT (khoa) DO UPDATE SET gia_tri = EXCLUDED.gia_tri", [
        JSON.stringify({ bat: true, che_do: "ai_tu_duyet", nguong_tu_duyet: 0.7 }),
      ]);
      for (const [id, ten] of [["CV-W-5", "Giao thiết bị turbine đợt 2"], ["CV-W-6", "Việc chung chung"]]) {
        await q.query("INSERT INTO docflow.cong_viec (id, ten, du_an, trang_thai) VALUES ($1,$2,'ĐG Hướng Việt','dang_mo')", [id, ten]);
      }
    });
    const kq = await tx((q) =>
      ganMotLuot(q, layCay, async () =>
        JSON.stringify([
          { ma_viec: "CV-W-5", ma: "6.1.4", ly_do: "giao thiết bị", do_chac: 0.9 },
          { ma_viec: "CV-W-6", ma: "7", ly_do: "đoán", do_chac: 0.4 },
        ]),
      ),
    );
    expect(kq[0]).toMatchObject({ ai_de_xuat: 2, ai_tu_duyet: 1 });
    const g = Object.fromEntries((await tx((q) => docGanWbs(q, "HV"))).map((w) => [w.cong_viec_id, w]));
    expect(g["CV-W-5"]).toMatchObject({ trang_thai: "da_duyet", nguoi_duyet: null });
    expect(g["CV-W-6"]).toMatchObject({ trang_thai: "cho_duyet" });
  });

  it("agent Tiến độ không trả cây → không gọi AI, ghi rõ lý do", async () => {
    await tx((q) => q.query("INSERT INTO docflow.cong_viec (id, ten, du_an, trang_thai) VALUES ('CV-W-7','Việc mới','ĐG Hướng Việt','dang_mo')"));
    let goi = 0;
    const kq = await tx((q) => ganMotLuot(q, async () => ({ ok: false, thong_diep: "Agent tiến độ chưa bật" }), async () => (goi++, "[]")));
    expect(goi).toBe(0);
    expect(kq[0].thong_diep).toMatch(/Chưa lấy được cây WBS.*chưa bật/);
  });
});
