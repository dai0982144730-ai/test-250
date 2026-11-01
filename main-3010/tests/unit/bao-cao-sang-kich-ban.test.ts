// ============================================================
// TEST: KỊCH BẢN BÁO CÁO SÁNG THEO NGƯỜI NHẬN (src/lib/bao-cao-sang/kich-ban.ts)
// Mr. Đại chốt 04/10/2026: kịch bản = bộ tham số do code dựng · góp ý của ai sửa bản người đó ·
// Chủ tịch biết dự án nào xấu đi · TGĐ biết việc nào cần quyết · PM có danh sách việc hôm nay.
// Số mẫu lấy từ bản thật 04/10 (HV · N3A) — cắt gọn.
// ============================================================

import { describe, expect, it } from "vitest";
import {
  THAM_SO_MAU,
  chuanHoaGhiDe,
  dongGoiTin,
  ketXuatKichBan,
  lyDoGon,
  thamSoHieuLuc,
} from "@/lib/bao-cao-sang/kich-ban";
import { locViecDoKhac, type DauDuAn, type VanDeSang, type ViecKhac } from "@/lib/bao-cao-sang/luat-cod";
import type { BaoCaoSang } from "@/lib/bao-cao-sang/model";

const HV = "dien-gio-huong-viet-hv-du-lieu";
const N3A = "n3a";

function dau(p: Partial<DauDuAn> & { maDuAn: string; ten: string }): DauDuAn {
  return { coTienDo: true, codDuBao: "2027-10-14", codMucTieu: "2027-08-03", chamNgay: 72, soHomQua: 0, lyDoKhongSo: null, loi: null, ...p };
}

function vd(p: Partial<VanDeSang> & { maDuAn: string; tieuDe: string }): VanDeSang {
  return {
    agent: "tiendo",
    tenAgent: "Tiến độ",
    idIssue: "X",
    wbs: null,
    lyDo: ["gang"],
    soNgayLuiCod: null,
    tienVnd: null,
    mucDo: "do",
    doLlmSinh: false,
    cauHoi: null,
    kem: [],
    ...p,
  };
}

function viecDo(n: number, maDuAn: string, tenAgent: string): ViecKhac[] {
  return Array.from({ length: n }, (_, i) => ({
    maDuAn,
    agent: tenAgent,
    tenAgent,
    idIssue: `D${i}`,
    wbs: null,
    tieuDe: `Phiếu giá dòng ${i + 1} cao hơn hợp đồng`,
    soNgayQuaHan: null,
    ngayMo: "2026-09-25",
    doLlmSinh: false,
  }));
}

function bcMau(): BaoCaoSang {
  const duAn: DauDuAn[] = [
    dau({ maDuAn: HV, ten: "Điện gió Hướng Việt (HV — dữ liệu test)" }),
    dau({ maDuAn: N3A, ten: "Nậm săm 3A", codDuBao: "2027-08-21", codMucTieu: null, chamNgay: null, soHomQua: 3 }),
    dau({ maDuAn: "tan-thanh", ten: "Tân Thành", coTienDo: false, codDuBao: null, codMucTieu: null, chamNgay: null, soHomQua: null }),
    dau({ maDuAn: "nam-khian-1", ten: "Nam Khian 1", coTienDo: false, codDuBao: null, codMucTieu: null, chamNgay: null, soHomQua: null }),
  ];
  const vanDe: VanDeSang[] = [
    vd({ maDuAn: HV, wbs: "6.1.4", tenWbs: "Cung cấp Hub, Nacelle, Blade. Drive Train", tieuDe: "⛓ Cung cấp Hub, Nacelle… chưa khởi công, dời 27 ngày", soNgayLuiCod: 30, lyDo: ["gang", "lui-cod"], cauHoi: "Chấp nhận dời 27 ngày hay tìm phương án khẩn?" }),
    ...Array.from({ length: 6 }, (_, i) => vd({ maDuAn: HV, tieuDe: `Việc chậm số ${i + 2}`, soNgayLuiCod: 8 - i, lyDo: ["lui-cod"] })),
    vd({ maDuAn: N3A, tieuDe: "Tắc chuỗi tại Văn bản chấp thuận chuyển mục đích sử dụng đất", agent: "phaply", tenAgent: "Pháp lý" }),
  ];
  return {
    ngay: "2026-10-04",
    soDuAn: duAn.length,
    dong: [],
    thieuSot: [
      { ten: "Agent Công việc", lyDo: "chưa hỏi được vì Dự án TT Tân Thành chưa có cây WBS — CHƯA SOÁT", maDuAn: "tan-thanh", tenDuAn: "Tân Thành" },
      { ten: "Agent Hợp đồng", lyDo: 'chưa hỏi được vì CHƯA CÓ SỔ ISSUE cho dự án "nam-khian-1": chưa có file data/projects/nam-khian-1/issues.json', maDuAn: "nam-khian-1", tenDuAn: "Nam Khian 1" },
    ],
    luatApDung: [],
    soDongBiLoaiVaThieuNguon: 0,
    dungLuc: "2026-10-04T00:00:00.000Z",
    daGuiLuc: null,
    duAn,
    vanDe,
    viecDoKhac: [...viecDo(43, N3A, "Hợp đồng"), ...viecDo(2, N3A, "Công việc")],
    lienKetIssue: "http://localhost:3010/alerts",
    diaChiMain: "http://localhost:3010",
  };
}

describe("ba mẫu — đúng công dụng Mr. Đại chốt 04/10", () => {
  it("Tổng quát: mỗi dự án MỘT dòng, dự án xấu đi lên đầu, dự án chưa có tiến độ KHÔNG in (13/10)", () => {
    const [tin, ...thua] = ketXuatKichBan({ bc: bcMau(), mau: "tong-quat", thamSo: THAM_SO_MAU["tong-quat"], duAnChon: null });
    expect(thua).toHaveLength(0);
    const dong = tin.split("\n");
    // N3A lùi 3 ngày so hôm qua → đứng trước HV (±0)
    const iN3a = dong.findIndex((d) => d.startsWith("• Nậm săm 3A"));
    const iHv = dong.findIndex((d) => d.startsWith("• Điện gió Hướng Việt"));
    expect(iN3a).toBeGreaterThan(-1);
    expect(iN3a).toBeLessThan(iHv);
    expect(tin).toContain("so hôm qua +3 ngày");
    // 13/10 Mr. Đại: "chưa có tiến độ" lặp mỗi sáng là rác thông tin — không dòng, không đếm; tiêu đề đếm dự án CÓ MẶT
    expect(tin).toContain("📋 Báo cáo sáng 04/10/2026 — 2 dự án");
    expect(tin).not.toContain("chưa có tiến độ");
    expect(tin).not.toContain("Tân Thành");
    // chỗ "chưa hỏi được" của chính các dự án vắng mặt cũng không in
    expect(tin).not.toContain("Chưa hỏi được");
    // Không in từng việc, chỉ dòng nặng nhất (mã + tên ngắn — luật 30)
    expect(tin).not.toContain("Việc chậm số 2");
    expect(tin).toContain("Nặng nhất: 6.1.4 Cung cấp Hub, Nacelle, Blade — COD lùi 30 ngày (Điện gió Hướng Việt)");
    expect(tin).not.toContain("🤖 →");
    expect(tin).toContain("Xem chi tiết: http://localhost:3010/bao-cao?tab=sang");
  });

  it("Điều hành: mỗi dự án tối đa 5 việc + câu hỏi 🤖, phần còn lại thành một dòng", () => {
    const tin = ketXuatKichBan({ bc: bcMau(), mau: "dieu-hanh", thamSo: THAM_SO_MAU["dieu-hanh"], duAnChon: null });
    const chu = tin.join("\n");
    expect(chu).toContain("việc làm chậm COD (8)");
    expect(chu).toContain("5. Việc chậm số 5");
    expect(chu).not.toContain("6. Việc chậm số 6");
    expect(chu).toContain("… còn 2 việc làm chậm COD — xem ở Main");
    expect(chu).toContain("🤖 → Chấp nhận dời 27 ngày");
    expect(chu).not.toContain("chưa có tiến độ");
    expect(chu).not.toContain("Chưa hỏi được");
    expect(chu).not.toContain("issues.json");
  });

  it("tham số riêng bật lại dòng đếm: «N dự án chưa có tiến độ» + chỗ thiếu gộp một dòng", () => {
    const t = thamSoHieuLuc("dieu-hanh", { duAnChuaCoTienDo: "dem" });
    const chu = ketXuatKichBan({ bc: bcMau(), mau: "dieu-hanh", thamSo: t, duAnChon: null }).join("\n");
    expect(chu).toContain("🏗 2 dự án chưa có tiến độ");
    // Chỗ thiếu gộp một dòng, tên agent bỏ chữ "Agent", không đường dẫn file
    expect(chu).toContain("⚠️ Chưa hỏi được: Công việc (Tân Thành) · Hợp đồng (Nam Khian 1)");
    expect(chu).not.toContain("issues.json");
    const tq = ketXuatKichBan({ bc: bcMau(), mau: "tong-quat", thamSo: thamSoHieuLuc("tong-quat", { duAnChuaCoTienDo: "liet-ke" }), duAnChon: null })[0];
    expect(tq).toContain("📋 Báo cáo sáng 04/10/2026 — 4 dự án");
    expect(tq).toContain("• Tân Thành — chưa có tiến độ");
  });

  it("⭐ 13/10: dự án chưa có tiến độ nhưng CÓ việc đỏ vẫn in cả khối — không giấu việc vì thiếu tiến độ", () => {
    const bc = bcMau();
    bc.viecDoKhac = [...(bc.viecDoKhac ?? []), ...viecDo(2, "tan-thanh", "Pháp lý")];
    const chu = ketXuatKichBan({ bc, mau: "du-an", thamSo: THAM_SO_MAU["du-an"], duAnChon: ["tan-thanh", "nam-khian-1"] }).join("\n");
    expect(chu).toContain("🏗 Tân Thành — chưa có tiến độ");
    expect(chu).toContain("• Pháp lý — 2 việc");
    // Tân Thành có mặt → chỗ thiếu của nó vẫn in; Nam Khian 1 im lặng → vắng cả dòng lẫn chỗ thiếu, tiêu đề chỉ nêu dự án có mặt
    expect(chu).toContain("⚠️ Chưa hỏi được Công việc ở Tân Thành");
    expect(chu).not.toContain("Nam Khian 1");
    expect(chu).toContain("việc cần xử lý · Tân Thành");
  });

  it("⭐ 13/10: hỏi tiến độ HỎNG là sự cố — vẫn in một dòng, không coi là «chưa có tiến độ»", () => {
    const bc = bcMau();
    bc.duAn = (bc.duAn ?? []).map((d) => (d.maDuAn === "tan-thanh" ? { ...d, loi: "chưa hỏi được tiến độ (agent Tiến độ không thưa)" } : d));
    const dh = ketXuatKichBan({ bc, mau: "dieu-hanh", thamSo: THAM_SO_MAU["dieu-hanh"], duAnChon: null }).join("\n");
    expect(dh).toContain("🏗 Tân Thành — chưa hỏi được tiến độ (agent Tiến độ không thưa)");
    expect(dh).not.toContain("Nam Khian 1");
    const tq = ketXuatKichBan({ bc, mau: "tong-quat", thamSo: THAM_SO_MAU["tong-quat"], duAnChon: null })[0];
    expect(tq).toContain("• Tân Thành — chưa hỏi được tiến độ");
    expect(tq).toContain("— 3 dự án");
  });

  it("⭐ 13/10: mọi dự án đã chọn đều im lặng → MỘT dòng nói rõ, không để tin trống", () => {
    const tin = ketXuatKichBan({ bc: bcMau(), mau: "du-an", thamSo: THAM_SO_MAU["du-an"], duAnChon: ["tan-thanh", "nam-khian-1"] });
    expect(tin).toHaveLength(1);
    expect(tin[0]).toContain("việc cần xử lý · Tân Thành · Nam Khian 1");
    expect(tin[0]).toContain("Chưa có việc nào cần báo — 2 dự án trong bản này chưa có tiến độ.");
    expect(tin[0]).not.toContain("🏗");
    expect(tin[0]).not.toContain("Chưa hỏi được");
  });

  it("Dự án: chỉ dự án CHỌN TAY, có khối việc đỏ khác gom theo agent, 3 việc/agent", () => {
    const tin = ketXuatKichBan({ bc: bcMau(), mau: "du-an", thamSo: THAM_SO_MAU["du-an"], duAnChon: [N3A] });
    const chu = tin.join("\n");
    expect(chu).toContain("việc cần xử lý · Nậm săm 3A");
    expect(chu).not.toContain("Hướng Việt");
    expect(chu).toContain("Làm chậm COD (1):");
    expect(chu).toContain("Việc đỏ khác (45):");
    expect(chu).toContain("• Hợp đồng — 43 việc");
    expect(chu).toContain("… còn 40 — xem ở http://localhost:3010/alerts");
    expect(chu).toContain("• Công việc — 2 việc");
    // Chỗ thiếu của dự án KHÁC không lọt vào bản của PM dự án này
    expect(chu).not.toContain("Tân Thành");
    expect(chu).not.toContain("Nam Khian 1");
  });

  it("Dự án: một PM chọn NHIỀU dự án (khác BQLDA) — đủ cả hai, tên hai dự án lên tiêu đề", () => {
    const chu = ketXuatKichBan({ bc: bcMau(), mau: "du-an", thamSo: THAM_SO_MAU["du-an"], duAnChon: [N3A, HV] }).join("\n");
    expect(chu).toContain("việc cần xử lý · Nậm săm 3A · Điện gió Hướng Việt (HV — dữ liệu test)");
    expect(chu).toContain("🏗 Nậm săm 3A");
    expect(chu).toContain("🏗 Điện gió Hướng Việt");
    // mẫu Dự án in MỌI việc làm chậm COD của dự án đã chọn (không cắt 5 như Điều hành)
    expect(chu).toContain("7. Việc chậm số 7");
    expect(chu).not.toContain("Tân Thành");
  });

  it("Dự án: chưa chọn dự án nào thì VẪN có tin — lời nhắc chọn ở đâu, không bản toàn công ty", () => {
    const tin = ketXuatKichBan({ bc: bcMau(), mau: "du-an", thamSo: THAM_SO_MAU["du-an"], duAnChon: [] });
    expect(tin).toHaveLength(1);
    expect(tin[0]).toContain("📋 Báo cáo sáng 04/10/2026 — chưa chọn dự án");
    expect(tin[0]).toContain("Chưa chọn dự án nào cho bản này — chọn ở Báo cáo → Sáng → Người nhận báo cáo sáng.");
    expect(tin[0]).toContain("Chọn dự án ở: http://localhost:3010/bao-cao?tab=sang");
    expect(tin[0]).not.toContain("Hướng Việt");
    expect(tin[0]).not.toContain("Nậm săm");
  });

  it("Tổng quát · Điều hành là TOÀN CÔNG TY — danh sách dự án chọn tay không thu hẹp hai mẫu này", () => {
    for (const mau of ["tong-quat", "dieu-hanh"] as const) {
      const chu = ketXuatKichBan({ bc: bcMau(), mau, thamSo: THAM_SO_MAU[mau], duAnChon: [N3A] }).join("\n");
      expect(chu).toContain("Điện gió Hướng Việt");
      expect(chu).toContain("Nậm săm 3A");
    }
  });
});

describe("tham số riêng từng người", () => {
  it("ghi đè sai kiểu / sai khoảng bị BỎ, không đoán", () => {
    // "phamVi" (theo sơ đồ) đã bỏ 04/10 tối — dự án mẫu Dự án nay chọn tay ở kho, không phải tham số
    const g = chuanHoaGhiDe({ viecCodMoiDuAn: -1, soTinToiDa: 9, cauHoiAi: "có", phamVi: "cua-toi", boChuDe: ["nhân lực", "", 5], la: 1 });
    expect(g).toEqual({ boChuDe: ["nhân lực"] });
    expect(thamSoHieuLuc("tong-quat", { viecNangNhat: 3 }).viecNangNhat).toBe(3);
    expect(thamSoHieuLuc("tong-quat", { viecNangNhat: 3 }).soTinToiDa).toBe(1);
  });

  it("bỏ chủ đề: dòng bị giấu và bản nói rõ đã giấu bao nhiêu", () => {
    const t = thamSoHieuLuc("dieu-hanh", { boChuDe: ["tắc chuỗi"] });
    const chu = ketXuatKichBan({ bc: bcMau(), mau: "dieu-hanh", thamSo: t, duAnChon: null }).join("\n");
    expect(chu).not.toContain("Tắc chuỗi tại");
    expect(chu).toContain("📌 Kịch bản riêng: bỏ «tắc chuỗi» (đã giấu 1 dòng)");
  });
});

describe("đóng gói tin nhắn", () => {
  it("quá trần thì CHIA tin (không cắt), mỗi tin ≤ trần, phần cuối luôn ở tin cuối", () => {
    const than = Array.from({ length: 12 }, (_, i) => `🏗 Dự án ${i + 1}\n${"x".repeat(300)}`);
    const tin = dongGoiTin("📋 Đầu", than, "Xem và xử lý: L", 1000, 5, "L");
    expect(tin.length).toBeGreaterThan(1);
    expect(tin.length).toBeLessThanOrEqual(5);
    for (const t of tin) expect(t.length).toBeLessThanOrEqual(1000);
    expect(tin[0].startsWith("📋 Đầu")).toBe(true);
    expect(tin[1].startsWith(`📋 (tiếp 2/${tin.length})`)).toBe(true);
    expect(tin[tin.length - 1].endsWith("Xem và xử lý: L")).toBe(true);
  });

  it("hết số tin cho phép → khối còn lại thành MỘT dòng 'còn N mục'", () => {
    const than = Array.from({ length: 12 }, (_, i) => `🏗 Dự án ${i + 1}\n${"x".repeat(300)}`);
    const tin = dongGoiTin("📋 Đầu", than, "Xem và xử lý: L", 1000, 2, "L");
    expect(tin).toHaveLength(2);
    const conIn = tin.join("\n").match(/🏗 Dự án/g)?.length ?? 0;
    expect(tin[1]).toContain(`… còn ${12 - conIn} mục chưa in — xem ở Main: L`);
  });
});

describe("việc đỏ ngoài luật COD", () => {
  it("chỉ lấy thẻ ĐỎ không đạt luật COD; chuẩn chữ đồng, đ/m²", () => {
    const ds = locViecDoKhac(
      [
        { id: "A", tieu_de: "Trên găng", mucDo: "do", tren_duong_gang: true },
        { id: "B", tieu_de: "Phiếu giá ghi 240.000 d/m2", mucDo: "do", wbs: "ISS-PG-1", so_ngay_qua_han: 5, ngay_mo: "2026-09-25T01:00:00Z" },
        { id: "C", tieu_de: "Vàng thôi", mucDo: "vang" },
      ],
      N3A,
      "hopdong",
      "Agent Hợp đồng",
    );
    expect(ds).toHaveLength(1);
    expect(ds[0]).toMatchObject({ idIssue: "B", wbs: null, tenAgent: "Hợp đồng", soNgayQuaHan: 5, ngayMo: "2026-09-25", tieuDe: "Phiếu giá ghi 240.000 đ/m²" });
  });

  it("lý do chưa hỏi được rút gọn: bỏ đường dẫn file phía sau", () => {
    expect(lyDoGon('chưa hỏi được vì CHƯA CÓ SỔ ISSUE cho dự án "nk1": chưa có file data/projects/nk1/issues.json')).toBe(
      'CHƯA CÓ SỔ ISSUE cho dự án "nk1"',
    );
  });
});

describe("câu hỏi 🤖 — mã kèm tên không lặp (kiểm độc lập 04/10 ⚪6)", () => {
  it("AI đã viết tên sau mã thì để nguyên; mã trơn mới gắn tên sổ", async () => {
    const { ganTenCauHoi } = await import("@/lib/bao-cao-sang/luat-cod");
    expect(ganTenCauHoi("7.2.3 San nền: đền bù chặn đường — tạm dừng?", "7.2.3", "Thi công san nền")).toBe(
      "7.2.3 San nền: đền bù chặn đường — tạm dừng?",
    );
    expect(ganTenCauHoi("Việc 7.2.3: tạm dừng hay đổi phương án?", "7.2.3", "Thi công san nền")).toBe(
      "Việc 7.2.3 Thi công san nền: tạm dừng hay đổi phương án?",
    );
  });
});
