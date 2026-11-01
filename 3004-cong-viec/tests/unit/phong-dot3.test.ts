// Giao diện căn phòng Đợt 3 (28/09/2026): việc → dự án, bố cục cây Dự án (đúng số đo demo), bộ lọc "Việc của tôi" /
// "Việc thuộc hệ thống", vạch kéo giữa hai khung (+50% tối đa), 🤖 xếp giai đoạn (code giữ cửa mã lạ).
import { describe, it, expect, beforeAll } from "vitest";
import { csdlMoi } from "../helpers/csdl";
import { tx } from "@/lib/db";
import { MAC_DINH } from "@/lib/cau-hinh/mac-dinh";
import { duAnCuaViec, nutDuAnDuoiDonVi, xepDuAn, G_KHAC, G_SCI } from "@/lib/phong/du-an-thuan";
import { duongNoi } from "@/components/phong/bo-cuc";
import { chuyenViec, locPhamVi, locViec, toiLoc, type ViecApi, type ViecO } from "@/components/phong/viec";
import { doNoiTuChuot, rongPhaiMacDinh } from "@/components/phong/keo-giua";
import { xepMotLuot, suaGiaiDoan, docGiaiDoan } from "@/lib/phong/giai-doan";
import { kiemTra } from "@/lib/cau-hinh/kiem-tra";
import { thongBaoDonVi } from "@/lib/thong-bao";

const DA = MAC_DINH.du_an;

describe("việc thuộc dự án nào", () => {
  it("khớp tên / tên khác; 'Nậm Khiên 1' là tên cũ của Nam Khian 1 (Mr. Đại gộp 03/10)", () => {
    expect(duAnCuaViec("ĐG Hướng Việt", [], DA)).toBe("HV");
    expect(duAnCuaViec("TĐ Nam Khiên 1", [], DA)).toBe("NK1");
    expect(duAnCuaViec("Nậm Khiên 1", [], DA)).toBe("NK1");
    expect(duAnCuaViec("  hp1 ", [], DA)).toBe("HP1");
    expect(duAnCuaViec("Mỏ đá", [], DA)).toBe("MDDT");
  });
  it("không phải dự án thì không gán: Công ty, nhà máy, đơn vị", () => {
    for (const t of ["Công ty", "NM Nậm Xe", "SCI PMC", "BQLDA QT", "", null]) expect(duAnCuaViec(t, [], DA)).toBeNull();
  });
  it("bỏ dấu chỉ nhận khi ra đúng một dự án; không có tên thì xét Ban điều hành được giao", () => {
    expect(duAnCuaViec("Tan Thanh", [], DA)).toBe("TT");
    expect(duAnCuaViec("Cong ty", ["bdh-namlan1"], DA)).toBe("NL1");
  });
  it("ô dự án treo dưới đơn vị làm SCI PMC / SCI E&C — cả SCI đầu tư lẫn loại khác (chỉ đơn vị có trên sơ đồ)", () => {
    const n = nutDuAnDuoiDonVi(DA, new Set(["sci-pmc", "sci-enc"]));
    expect(n.filter((x) => x.cha === "sci-pmc").map((x) => x.da)).toEqual(["NK1", "NM1", "HP1"]);
    expect(n.filter((x) => x.cha === "sci-enc")).toHaveLength(6);
    expect(n[0].id).toBe("NK1@sci-pmc");
    expect(nutDuAnDuoiDonVi(DA, new Set(["sci-pmc"])).every((x) => x.cha === "sci-pmc")).toBe(true);
  });
});

describe("bố cục cây Dự án = số đo demo khung 'du-an'", () => {
  const bc = xepDuAn(DA);
  // 04/10 (Mr. Đại): Loại khác đổi từ 2 cột sang 1 cột dọc dưới ô "Loại khác", trục bên trái lệch 85.
  // Cùng ngày: cả cây dịch trái 70 cho lề trái = lề phải = 10 (trước mép trái thật — trục BQLDA đầu — ở x 80)
  // Cùng ngày (Mr. Đại: "tăng kích thước … bằng với so-do cùng cấp"): ô lấy cỡ Sơ đồ cùng cấp (220×54 · 150×48 · 140×38),
  // cột BQLDA cách 170 (trước 240) cho sân hẹp lại, thu phóng bằng Sơ đồ
  it("hai nhóm, hai BQLDA, dự án SCI xếp dọc, loại khác 1 cột dọc, lề hai bên bằng nhau", () => {
    expect(bc.VT[G_SCI]).toEqual({ x: 180, y: 12, w: 220, h: 54 });
    expect(bc.VT[G_KHAC]).toEqual({ x: 501, y: 12, w: 220, h: 54 });
    expect(bc.VT["bqlda-qt"]).toEqual({ x: 95, y: 96, w: 150, h: 48 });
    expect(bc.VT["bqlda-lao"]).toEqual({ x: 265, y: 96, w: 150, h: 48 });
    expect(bc.con["bqlda-qt"]).toEqual(["HV", "TT", "BT"]);
    expect(bc.VT["TT"]).toEqual({ x: 95, y: 216, w: 140, h: 38 });
    expect(bc.VT["NM1"]).toEqual({ x: 501, y: 96, w: 140, h: 38 });
    expect(bc.VT["NM2"]).toEqual({ x: 501, y: 148, w: 140, h: 38 });
    expect(bc.VT["N3A"]).toEqual({ x: 501, y: 304, w: 140, h: 38 });
    expect(bc.TRUC["bqlda-qt"]).toBe(10); // mép trái thật = 10
    expect(bc.W).toBe(621); // mép phải ô "Loại khác" (501 + 220/2) + 10 — trước 705 khi cột cách 240
  });
  it("đường nối: dự án dưới BQLDA nối vào trục trái; loại khác cũng nối vào trục trái", () => {
    expect(duongNoi(bc, "bqlda-qt", "TT")).toBe("M95 144 V154 H10 V235 H25");
    expect(duongNoi(bc, G_KHAC, "NM1")).toBe("M501 66 V76 H416 V115 H431");
    expect(duongNoi(bc, G_KHAC, "NM2")).toBe("M501 66 V76 H416 V167 H431");
  });
});

// Ba nút lọc ĐÍCH DANH (Mr. Đại chốt 28/09): Việc tôi giao · Việc tôi nhận · Việc cần tôi phối hợp
type PtMau = ["nguoi" | "don_vi", string, "chu_tri" | "phoi_hop", boolean?];
const viecMau = (ma: string, pt: PtMau[], giao?: { boi: string; tay: boolean }): ViecO =>
  ({
    ma,
    nut: [],
    giaoBoi: giao?.boi ?? null,
    giaoTay: !!giao?.tay,
    pt: pt.map(([loai, pid, vai, xong], i) => ({ id: `${ma}-${i}`, loai, pid, nut: pid, ten: pid, xong: !!xong, kt: null, vai })),
  }) as unknown as ViecO;

describe("Việc tôi giao / Việc tôi nhận / Việc cần tôi phối hợp", () => {
  const lanhDao = new Set(["bld-ptgd-dai", "bld-ptgd-theanh"]);
  const dai = toiLoc({ id: "ptgd.dai@scigroup.vn", don_vi_ids: ["bld-ptgd-dai", "p-dtpc"], vai_tro: ["lanh-dao", "truong-don-vi"] }, lanhDao)!;
  const ha = toiLoc({ id: "nv.dtpc@scigroup.vn", don_vi_ids: ["p-dtpc"], vai_tro: ["nhan-vien"] }, lanhDao)!;
  const ds = [
    viecMau("A", [["don_vi", "p-dtpc", "chu_tri"]]), // việc cả phòng từ báo cáo — KHÔNG phải đích danh
    viecMau("B", [["don_vi", "bld-ptgd-theanh", "chu_tri"]], { boi: "ptgd.dai@scigroup.vn", tay: true }), // anh Đại giao tay
    viecMau("C", [["don_vi", "bld-ptgd-dai", "chu_tri"]], { boi: "ptgd.dai@scigroup.vn", tay: false }), // chức danh anh Đại chủ trì
    viecMau("D", [["don_vi", "p-hcth", "chu_tri"], ["don_vi", "p-dtpc", "phoi_hop"]]), // phòng phối hợp
    viecMau("E", [["don_vi", "p-hcth", "chu_tri"], ["nguoi", "nv.dtpc@scigroup.vn", "phoi_hop"]]), // chị Hà phối hợp đích danh
    viecMau("F", [["don_vi", "p-hcth", "chu_tri"], ["nguoi", "nv.dtpc@scigroup.vn", "phoi_hop", true]]), // phần phối hợp đã xong
    viecMau("G", [["don_vi", "p-dtpc", "chu_tri"], ["don_vi", "bld-ptgd-dai", "phoi_hop"]]), // chủ trì rồi thì không tính phối hợp
  ];
  const ma = (x: ViecO[]) => x.map((v) => v.ma);
  it("tôi giao: chỉ việc giao thủ công, người giao là tôi", () => {
    expect(ma(locViec(ds, "giao", dai))).toEqual(["B"]);
  });
  it("tôi nhận: chủ trì đích danh (tên / chức danh tôi giữ) — việc giao cả phòng không tính", () => {
    expect(ma(locViec(ds, "nhan", dai))).toEqual(["C"]);
    expect(ma(locViec(ds, "nhan", ha))).toEqual([]);
  });
  it("cần tôi phối hợp: đích danh; trưởng đơn vị thấy thêm phần giao cho đơn vị; đã xong / đã chủ trì thì không", () => {
    expect(ma(locViec(ds, "phoi_hop", dai))).toEqual(["D"]);
    expect(ma(locViec(ds, "phoi_hop", ha))).toEqual(["E"]);
  });
  it("ô phạm vi 'Việc thuộc cá nhân' (chốt 30/09): tôi giao + đích danh tên/chức danh tôi; KHÔNG tính việc giao cho cả đơn vị tôi đứng đầu", () => {
    // D (phòng anh Đại phối hợp, giao cho cả phòng) không vào; B tôi giao, C chức danh tôi chủ trì, G chức danh tôi phối hợp
    expect(ma(locPhamVi(ds, "ca_nhan", new Set(), dai))).toEqual(["B", "C", "G"]);
    expect(ma(locPhamVi(ds, "ca_nhan", new Set(), ha))).toEqual(["E", "F"]);
  });
  it("không bật lọc / chưa biết là ai → giữ nguyên", () => {
    expect(locViec(ds, "", dai)).toHaveLength(ds.length);
    expect(locViec(ds, "nhan", null)).toHaveLength(ds.length);
  });
});

describe("việc giao đích danh một lãnh đạo", () => {
  it("chức danh BLĐ gộp vào ô Ban lãnh đạo trên sơ đồ nhưng vẫn hiện TÊN RIÊNG người chủ trì", () => {
    const v = {
      id: "CV-2026-0064", ten: "Test giao đoàn thế anh", du_an: null, ket_qua_can_co: null, luon_mo: false, bat_dau: "2026-09-28", ket_thuc: "2026-10-01",
      giao_boi: "ptgd.dai@scigroup.vn", don_vi_giao: "bld-ptgd-dai",
      phan_viec: [
        { id: "p1", phu_trach_loai: "don_vi", phu_trach_id: "bld-ptgd-theanh", phu_trach_ten: "Phó Tổng Giám đốc · Đoàn Thế Anh", ket_thuc: "2026-10-01", trang_thai: "dang_lam", vai: "chu_tri" },
        { id: "p2", phu_trach_loai: "don_vi", phu_trach_id: "nm-namxe", ket_thuc: null, trang_thai: "dang_lam", vai: "phoi_hop" },
      ],
    } as ViecApi;
    const oCua = (id: string | null) => (id?.startsWith("bld-") ? "ban-tgd" : id);
    const x = chuyenViec(v, "2026-09-28", oCua, {}, {}, { "bld-ptgd-theanh": "PTGĐ · Đoàn Thế Anh" });
    expect(x.nut).toEqual(["ban-tgd"]); // vẫn đếm ở ô Ban lãnh đạo
    expect(x.pt[0].tenRieng).toBe("PTGĐ · Đoàn Thế Anh");
    expect(x.pt[1].tenRieng).toBeUndefined(); // đơn vị có ô riêng thì hiện tên ô như cũ
  });
});

describe("vạch kéo giữa hai khung", () => {
  it("mặc định như 1,5 : 1, tối thiểu 380 px", () => {
    expect(rongPhaiMacDinh(1510)).toBe(600);
    expect(rongPhaiMacDinh(800)).toBe(380);
  });
  it("nới tối đa +50%, không nhỏ hơn mặc định", () => {
    // khung 1510: phải mặc định 600, mép phải ở x=1510
    expect(doNoiTuChuot(1510, 1510 - 5 - 750, 1510)).toBeCloseTo(0.25);
    expect(doNoiTuChuot(1510, 100, 1510)).toBe(0.5);
    expect(doNoiTuChuot(1510, 1400, 1510)).toBe(0);
  });
});

describe("🤖 xếp giai đoạn PMP", () => {
  beforeAll(async () => {
    await csdlMoi();
    await tx(async (q) => {
      for (const [id, ten, da] of [["CV-T-1", "Lập TKKT hạng mục đập", "ĐG Hướng Việt"], ["CV-T-2", "Nghiệm thu hoàn thành COD", "HP1"], ["CV-T-3", "Mua văn phòng phẩm", "Công ty"]])
        await q.query("INSERT INTO docflow.cong_viec (id, ten, du_an, trang_thai) VALUES ($1,$2,$3,'dang_mo')", [id, ten, da]);
    });
  });
  it("chỉ gửi AI việc thuộc dự án; code giữ cửa: mã việc lạ, giai đoạn lạ bị bỏ; người sửa thì AI không xếp đè", async () => {
    let gui = "";
    const n = await tx((q) =>
      xepMotLuot(q, async (prompt) => (gui = prompt) &&
        JSON.stringify([
          { ma: "CV-T-1", giai_doan: "ke-hoach", ly_do: "thiết kế kỹ thuật" },
          { ma: "CV-T-2", giai_doan: "bay-bong", ly_do: "x" },
          { ma: "CV-LA", giai_doan: "thuc-thi", ly_do: "x" },
        ]),
      ),
    );
    expect(n).toBe(1);
    expect(gui).toContain("CV-T-1");
    expect(gui).not.toContain("CV-T-3"); // "Công ty" không phải dự án → không tốn lượt AI
    const nd = { id: "quantri@scigroup.vn" } as Parameters<typeof suaGiaiDoan>[1];
    await tx((q) => suaGiaiDoan(q, nd, "CV-T-1", "thuc-thi"));
    await tx((q) => xepMotLuot(q, async () => JSON.stringify([{ ma: "CV-T-1", giai_doan: "ket-thuc" }, { ma: "CV-T-2", giai_doan: "ket-thuc", ly_do: "COD" }])));
    const g = await tx((q) => docGiaiDoan(q));
    expect(g["CV-T-1"]).toMatchObject({ giai_doan: "thuc-thi", nguon: "nguoi", nguoi_sua: "quantri@scigroup.vn" });
    expect(g["CV-T-2"]).toMatchObject({ giai_doan: "ket-thuc", nguon: "ai", ly_do: "COD" });
    await expect(tx((q) => suaGiaiDoan(q, nd, "CV-T-2", "khong-co"))).rejects.toThrow(/không hợp lệ/);
  });
});

describe("sơ đồ tổ chức dự án (Cài đặt) + tin gửi Ban TGĐ", () => {
  it("dự án SCI đầu tư có Ban QLDA đứng đầu, thêm đơn vị làm được (chốt 03/10); Loại khác không bắt buộc đơn vị làm", async () => {
    expect(await tx((q) => kiemTra(q, "du_an", DA))).toEqual([]);
    const khacTrong = DA.map((d) => (d.id === "N3A" ? { ...d, don_vi: [] } : d));
    expect(await tx((q) => kiemTra(q, "du_an", khacTrong))).toEqual([]);
    const sciCoLam = DA.map((d) => (d.id === "HV" ? { ...d, don_vi: ["bqlda-qt", "sci-pmc", "sci-enc"] } : d));
    expect(await tx((q) => kiemTra(q, "du_an", sciCoLam))).toEqual([]);
    // 6g.6: dự án Main mới khai chưa chọn Ban QLDA vẫn lưu được (để lượt kéo từ Main không bị chặn); có đơn vị làm mà thiếu ban thì chặn
    const sciKhongBan = DA.map((d) => (d.id === "HV" ? { ...d, don_vi: [] } : d));
    expect(await tx((q) => kiemTra(q, "du_an", sciKhongBan))).toEqual([]);
    const lamMaKhongBan = DA.map((d) => (d.id === "HV" ? { ...d, don_vi: ["", "sci-pmc"] } : d));
    expect((await tx((q) => kiemTra(q, "du_an", lamMaKhongBan))).join()).toMatch(/Hướng Việt.*chọn Ban QLDA trước/);
    const haiTen = [...DA, { id: "da-x", ten: "Nậm Khian 2", loai: "Thủy điện", nhom: "khac" as const, don_vi: [], ten_khac: [] }];
    expect((await tx((q) => kiemTra(q, "du_an", haiTen))).join()).toMatch(/tên gần trùng/);
  });
  it("tin gửi Ban TGĐ tập thể tới cả lãnh đạo ở đơn vị chức danh (Mr. Đại chốt a: cả 8 lãnh đạo)", async () => {
    await tx(async (q) => {
      await q.query("INSERT INTO identity.don_vi (id, ten, ten_ngan, cap, cha_id, loai, thu_tu, active) VALUES ('bld-thu', 'Phó TGĐ · Thử', 'PTGĐ · Thử', 1, 'ban-tgd', 'chuc_danh', 99, true)");
      await q.query("UPDATE identity.nguoi_dung SET don_vi_id = 'bld-thu' WHERE id = 'tgd@scigroup.vn'");
      await thongBaoDonVi(q, "ban-tgd", { loai: "thu", noi_dung: "tin thử Ban TGĐ" });
    });
    const { rows } = await tx((q) => q.query<{ nguoi_nhan: string }>("SELECT nguoi_nhan FROM docflow.thong_bao WHERE noi_dung = 'tin thử Ban TGĐ' ORDER BY 1"));
    expect(rows.map((r) => r.nguoi_nhan)).toEqual(["photgd@scigroup.vn", "tgd@scigroup.vn"]);
  });
});
