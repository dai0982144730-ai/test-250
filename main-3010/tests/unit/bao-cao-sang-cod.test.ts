// ============================================================
// TEST: LUẬT BÁO CÁO SÁNG 25/09 — chỉ việc làm chậm COD (src/lib/bao-cao-sang/luat-cod.ts)
//
// Mẫu thẻ lấy từ đo thật 25/09 (HV · N3A) qua 4 cổng danh_sach_issue — cắt gọn.
// ============================================================

import { describe, expect, it } from "vitest";
import {
  cauHoiHopLe,
  chuanChu,
  dongDauDuAn,
  gopVaXep,
  ketXuatTinNhan,
  locTheVao,
  lyDoVaoBaoCao,
  rutPhanTrung,
  soVoiHomQua,
  type DauDuAn,
  type TheIssueTho,
  type VanDeSang,
} from "@/lib/bao-cao-sang/luat-cod";
import { ketXuatTelegram, type BaoCaoSang } from "@/lib/bao-cao-sang/model";

const HV = "dien-gio-huong-viet-hv-du-lieu";

const TIEN_DO_HV: TheIssueTho[] = [
  { id: "ISS-2026-39-140", tieu_de: "⛓ Cung cấp Hub, Nacelle… chưa khởi công, dời 24 ngày, kéo theo 20 việc phía sau", mucDo: "do", wbs: "6.1.4", tren_duong_gang: true, so_ngay_anh_huong: 30 },
  { id: "T-2", tieu_de: "Năng suất 0% kế hoạch — Chấp thuận độ cao tĩnh không", mucDo: "do", wbs: "1.1.6", tren_duong_gang: false, so_ngay_anh_huong: null },
  { id: "T-3", tieu_de: "IM LẶNG 128 ngày — Lập hồ sơ BCNCKT", mucDo: "vang", wbs: "1.1.4", tren_duong_gang: false },
];
const PHAP_LY_HV: TheIssueTho[] = [
  { id: "ISS-PL-0115", tieu_de: "COD dự báo vượt hạn theo chủ trương 294 ngày — 1315/QĐ-UBND (hạn Quý IV/2026)", mucDo: "do", wbs: null, tren_duong_gang: true, so_ngay_anh_huong: null, so_ngay_qua_han: 294, doLlmSinh: true },
  { id: "ISS-PL-0020", tieu_de: "Quá hạn 75 ngày: Hợp đồng mua bán điện (PPA) với EVN", mucDo: "vang", wbs: "3.2", tren_duong_gang: false },
];
const BASE_HV: TheIssueTho[] = [
  { id: "ISS-2026-39-020", tieu_de: "WBS 6.1.4 Cung cấp Hub… — trên đường găng, Base không có việc nào gắn mã này", mucDo: "do", wbs: "6.1.4", tren_duong_gang: true, doLlmSinh: false },
  { id: "DX-BASE-113", tieu_de: "Luật 3 — găng, chưa ai nhận: 6.1.4 Cung cấp Hub…", mucDo: "do", wbs: "6.1.4", tren_duong_gang: true, doLlmSinh: true },
  { id: "ISS-2026-37-102", tieu_de: "Sơn (@sonqtn) tồn 4 việc quá hạn ≥ 7 ngày — lâu nhất 55 ngày · 1 việc trên găng", mucDo: "do", wbs: "người:@sonqtn", tren_duong_gang: false },
];
const HOP_DONG_N3A: TheIssueTho[] = [
  { id: "ISS-PG-548.02-003", tieu_de: "Cạy dọn, vệ sinh nền đá — Phiếu giá ghi 240.000 d/m2, căn cứ Bảng 3!E2 ghi 120.000 d/m2", mucDo: "do", wbs: "ISS-PG-548.02-003", so_ngay_anh_huong: null },
  { id: "ISS-PG-548.02-004", tieu_de: "Cạy dọn — Phiếu giá ghi 6.362.880.000 dong, căn cứ Bảng 3!F2 ghi 3.181.440.000 dong", mucDo: "do", wbs: "ISS-PG-548.02-004" },
  { id: "PG-548.01", tieu_de: "PG-548.01 (đợt 1, HD-548) nằm chờ 18 ngày — quá hạn thanh toán 10 ngày", mucDo: "do", wbs: null },
];

function dau(p: Partial<DauDuAn> & { maDuAn: string; ten: string }): DauDuAn {
  return {
    coTienDo: true,
    codDuBao: "2027-10-21",
    codMucTieu: "2027-08-03",
    chamNgay: 79,
    chamBaselineNgay: null,
    soHomQua: 0,
    lyDoKhongSo: null,
    loi: null,
    ...p,
  };
}

describe("luật lọc — xét theo ẢNH HƯỞNG, không theo agent", () => {
  it("(1) trên găng → vào", () => {
    expect(lyDoVaoBaoCao({ tren_duong_gang: true })).toEqual(["gang"]);
  });
  it("(2) COD lùi ≥ 1 ngày → vào; lùi 0 ngày không tính là lùi", () => {
    expect(lyDoVaoBaoCao({ so_ngay_anh_huong: 1 })).toEqual(["lui-cod"]);
    expect(lyDoVaoBaoCao({ so_ngay_anh_huong: 0 })).toEqual([]);
  });
  it("(3) COD vượt mốc bắt buộc → vào", () => {
    expect(lyDoVaoBaoCao({ vuot_moc_bat_buoc: true })).toEqual(["vuot-moc"]);
  });
  it("cờ null/thiếu (agent chưa biết) KHÔNG tính là đạt", () => {
    expect(lyDoVaoBaoCao({ tren_duong_gang: null, so_ngay_anh_huong: null })).toEqual([]);
  });
  it("⭐ hợp đồng làm COD lùi → VÀO dù không phải agent tiến độ", () => {
    const ds = locTheVao([{ id: "HD-1", tieu_de: "Chậm giao thiết bị theo hợp đồng EPC", so_ngay_anh_huong: 12, mucDo: "do" }], "n3a", "hopdong", "Agent Hợp đồng");
    expect(ds).toHaveLength(1);
    expect(ds[0].tenAgent).toBe("Hợp đồng");
    expect(ds[0].soNgayLuiCod).toBe(12);
  });
  it("⭐ phiếu giá không đụng COD → KHÔNG vào (đo 25/09: 45 thẻ hợp đồng N3A, 0 vào)", () => {
    expect(locTheVao(HOP_DONG_N3A, "n3a", "hopdong", "Agent Hợp đồng")).toHaveLength(0);
  });
  it("mẫu HV: tiến độ 1/3, pháp lý 1/2, Base 2/3 đạt luật", () => {
    expect(locTheVao(TIEN_DO_HV, HV, "tiendo", "Agent Tiến độ")).toHaveLength(1);
    expect(locTheVao(PHAP_LY_HV, HV, "phaply", "Agent Pháp lý")).toHaveLength(1);
    expect(locTheVao(BASE_HV, HV, "base", "Agent Base.vn")).toHaveLength(2);
  });
});

function vanDeHv(): VanDeSang[] {
  return gopVaXep([
    ...locTheVao(BASE_HV, HV, "base", "Agent Base.vn"),
    ...locTheVao(PHAP_LY_HV, HV, "phaply", "Agent Pháp lý"),
    ...locTheVao(TIEN_DO_HV, HV, "tiendo", "Agent Tiến độ"),
  ]).vanDe;
}

describe("gộp trùng + xếp", () => {
  it("Base 2 thẻ cùng 6.1.4 → 1 dòng; giữ thẻ KHÔNG do LLM sinh", () => {
    const g = gopVaXep(locTheVao(BASE_HV, HV, "base", "Agent Base.vn"));
    expect(g.vanDe).toHaveLength(1);
    expect(g.soGop).toBe(1);
    expect(g.vanDe[0].idIssue).toBe("ISS-2026-39-020");
  });
  it("khác agent cùng mã WBS → dòng Base đi KÈM dưới dòng gốc tiến độ; xếp theo ngày lùi COD", () => {
    const ds = vanDeHv();
    expect(ds).toHaveLength(2);
    expect(ds[0].agent).toBe("tiendo");
    expect(ds[0].soNgayLuiCod).toBe(30);
    expect(ds[0].kem.map((k) => k.agent)).toEqual(["base"]);
    expect(ds[1].idIssue).toBe("ISS-PL-0115");
  });
  it("cùng tiêu đề trong cùng agent → 1 dòng", () => {
    const t: TheIssueTho = { id: "a", tieu_de: "Tắc chuỗi X", tren_duong_gang: true };
    expect(gopVaXep(locTheVao([t, { ...t, id: "b" }], "n3a", "phaply", "Agent Pháp lý")).vanDe).toHaveLength(1);
  });
});

describe("chữ người đọc", () => {
  it("dòng kèm không chép lại tên đầu việc đã in ở dòng gốc", () => {
    const goc = "⛓ Cung cấp Hub, Nacelle, Blade. Drive Train, Cooler Tops đến cảng Hòn La chưa khởi công, dời 24 ngày";
    const kem = "WBS 6.1.4 Cung cấp Hub, Nacelle, Blade. Drive Train, Cooler Tops đến cảng Hòn La — trên đường găng, Base không có việc nào gắn mã này";
    expect(rutPhanTrung(kem, goc)).toBe("WBS 6.1.4 … — trên đường găng, Base không có việc nào gắn mã này");
    expect(rutPhanTrung("Việc ngắn khác hẳn", goc)).toBe("Việc ngắn khác hẳn");
  });
  it('"dong" → "đồng", "d/m2" → "đ/m²"', () => {
    expect(chuanChu("ghi 6.362.880.000 dong, căn cứ 240.000 d/m2 và 64.000 d/m3")).toBe(
      "ghi 6.362.880.000 đồng, căn cứ 240.000 đ/m² và 64.000 đ/m³",
    );
  });
});

describe("so hôm qua — đọc sổ mốc COD của tiến độ", () => {
  const vn = (iso: string) => iso.slice(0, 10);
  it("điểm gần nhất TRƯỚC ngày báo cáo, cùng cách tính → hiệu số ngày", () => {
    const moc = [
      { thoi_diem: "2026-09-24T06:42:28Z", cod_du_bao: "2027-10-18", cach_tinh: "COD dự báo theo năng suất 7 ngày" },
      { thoi_diem: "2026-09-25T16:01:44Z", cod_du_bao: "2027-10-21", cach_tinh: "COD dự báo theo năng suất 7 ngày" },
    ];
    expect(soVoiHomQua("2027-10-21", moc, "2026-09-25", vn)).toEqual({ so: 3, lyDo: null });
  });
  it("điểm trước tính theo cách cũ → KHÔNG so, nói lý do", () => {
    const moc = [{ thoi_diem: "2026-09-21T03:47:18Z", cod_du_bao: "2027-09-21", cach_tinh: "cách cũ trước 24/09: …" }];
    const r = soVoiHomQua("2027-10-21", moc, "2026-09-25", vn);
    expect(r.so).toBe(null);
    expect(r.lyDo).toContain("cách cũ");
  });
});

describe("tin nhắn — một màn điện thoại", () => {
  const duAn = [
    dau({ maDuAn: HV, ten: "Điện gió Hướng Việt (HV — dữ liệu test)" }),
    dau({ maDuAn: "n3a", ten: "Nậm săm 3A", codDuBao: "2027-08-21", codMucTieu: null, chamNgay: null }),
    dau({ maDuAn: "tan-thanh", ten: "Tân Thành", coTienDo: false, codDuBao: null, codMucTieu: null, chamNgay: null, soHomQua: null }),
  ];
  const link = "http://localhost:3010/alerts";

  it("dòng đầu dự án: tên thật, COD dự báo · mục tiêu · chậm · so hôm qua; chưa có tiến độ KHÔNG in (13/10)", () => {
    const chu = ketXuatTinNhan({ ngay: "2026-09-25", duAn, vanDe: vanDeHv(), chuaHoiDuoc: [], luat: [], lienKetIssue: link });
    expect(chu).toContain("🏗 Điện gió Hướng Việt (HV — dữ liệu test)");
    // Luật 35 + 36 (14/10/2026): số ngày + tên hệ, cả hai hệ; thiếu hệ nào nói thẳng
    expect(chu).toContain(
      "COD dự báo 21/10/2027 · chậm 79 ngày so với Tiến độ mục tiêu (03/08/2027) · chưa có Baseline đã duyệt · so hôm qua ±0",
    );
    expect(chu).toContain("chưa có ngày Tiến độ mục tiêu");
    // 13/10 Mr. Đại: dòng "chưa có tiến độ" lặp mỗi sáng là rác thông tin — có tiến độ thì tự hiện
    expect(chu).not.toContain("Tân Thành");
    expect(chu).not.toContain("chưa có tiến độ");
    expect(chu).not.toContain(HV); // không in slug
    expect(chu).toContain("✓ Không có việc nào làm chậm COD"); // N3A trong mẫu này không có vấn đề
    expect(chu).toContain(link);
  });

  it("dòng vấn đề: số ảnh hưởng + tên agent; KHÔNG có đường dẫn file", () => {
    const chu = ketXuatTinNhan({ ngay: "2026-09-25", duAn, vanDe: vanDeHv(), chuaHoiDuoc: [], luat: [], lienKetIssue: link });
    expect(chu).toContain("1. 6.1.4 · ⛓ Cung cấp Hub");
    expect(chu).toContain("COD lùi 30 ngày (Tiến độ)");
    expect(chu).toContain("   + Base: WBS 6.1.4");
    expect(chu).toMatch(/2\. 🤖 COD dự báo vượt hạn theo chủ trương 294 ngày .* — trên găng \(Pháp lý\)/);
    expect(chu).not.toMatch(/data\/|\.json|\.jsonl|prisma|[A-Z]:\//);
  });

  it("🤖 câu hỏi in dưới dòng; không có câu hỏi thì vẫn gửi phần số", () => {
    const ds = vanDeHv();
    ds[0].cauHoi = "Có ép nhà cung cấp giao sớm để kéo lại 30 ngày COD?";
    const chu = ketXuatTinNhan({ ngay: "2026-09-25", duAn, vanDe: ds, chuaHoiDuoc: [], luat: [], lienKetIssue: link });
    expect(chu).toContain("   🤖 → Có ép nhà cung cấp giao sớm để kéo lại 30 ngày COD?");
    expect(chu.split("🤖 →").length - 1).toBe(1);
  });

  it("⭐ 300 vấn đề vẫn < 4.096 ký tự, bỏ NGUYÊN DÒNG từ cuối, ghi 'còn N việc — xem ở Main'", () => {
    const nhieu: VanDeSang[] = Array.from({ length: 300 }, (_, i) => ({
      ...vanDeHv()[0],
      idIssue: `X-${i}`,
      wbs: `7.${i}`,
      tieuDe: `Việc găng số ${i} chậm giao vật tư theo hợp đồng thầu phụ, kéo theo chuỗi lắp dựng phía sau`,
      soNgayLuiCod: 300 - i,
      kem: [],
    }));
    const chu = ketXuatTinNhan({ ngay: "2026-09-25", duAn, vanDe: nhieu, chuaHoiDuoc: [], luat: [], lienKetIssue: link });
    expect(chu.length).toBeLessThan(4096);
    const m = /… còn (\d+) việc — xem ở Main: (\S+)/.exec(chu);
    expect(m).not.toBeNull();
    const conLai = Number(m![1]);
    const daIn = (chu.match(/^\d+\. /gm) ?? []).length;
    expect(daIn + conLai).toBe(300);
    // việc nặng nhất (lùi 300 ngày) còn, việc nhẹ nhất bị bỏ
    expect(chu).toContain("Việc găng số 0 ");
    expect(chu).not.toContain("Việc găng số 299 ");
    // mọi dòng đầu dự án CÓ TIẾN ĐỘ vẫn còn; dự án chưa có tiến độ, không việc thì không in (13/10)
    expect(chu).toContain("🏗 Nậm săm 3A");
    expect(chu).not.toContain("Tân Thành");
    // không dòng nào bị cắt dở: dòng vấn đề nào cũng kết thúc bằng "(Tiến độ)"
    for (const d of chu.split("\n").filter((x) => /^\d+\. /.test(x))) expect(d.endsWith("(Tiến độ)")).toBe(true);
  });

  it("ketXuatTelegram dùng khuôn mới khi bản có duAn/vanDe; bản cũ vẫn đọc được", () => {
    const bc: BaoCaoSang = {
      ngay: "2026-09-25",
      soDuAn: 3,
      dong: [],
      thieuSot: [{ ten: "Agent Base.vn", lyDo: "chưa hỏi được vì hết giờ" }],
      luatApDung: [{ ma: "L1", noiDung: "Tuần này theo dõi sát nhà thầu TS", moTaHieuLuc: "Từ 25/09 đến hết 27/09" }],
      soDongBiLoaiVaThieuNguon: 0,
      dungLuc: "2026-09-25T15:00:00Z",
      daGuiLuc: null,
      duAn,
      vanDe: vanDeHv(),
      lienKetIssue: link,
    };
    const chu = ketXuatTelegram(bc);
    expect(chu).toContain("việc làm chậm COD (2)");
    expect(chu).toContain("⚠️ Chưa hỏi được: Agent Base.vn — chưa hỏi được vì hết giờ");
    expect(chu).toContain("📌 Luật đang áp: «Tuần này theo dõi sát nhà thầu TS»");
    expect(chu).not.toContain("🟡 Đáng chú ý");
  });

  it("dòng đầu: sớm hơn mục tiêu / COD lùi so hôm qua in đúng dấu", () => {
    expect(dongDauDuAn(dau({ maDuAn: "x", ten: "X", chamNgay: -5, soHomQua: 3 }))).toContain(
      "sớm 5 ngày so với Tiến độ mục tiêu (03/08/2027) · chưa có Baseline đã duyệt · so hôm qua +3 ngày",
    );
    // Bản lưu trước 15/10 chưa có trường Baseline → bỏ vế, không nói oan «chưa có Baseline đã duyệt»
    expect(dongDauDuAn(dau({ maDuAn: "x", ten: "X", chamBaselineNgay: undefined }))).not.toContain("Baseline");
    expect(dongDauDuAn(dau({ maDuAn: "x", ten: "X", chamNgay: 79, chamBaselineNgay: 44 }))).toContain(
      "chậm 79 ngày so với Tiến độ mục tiêu (03/08/2027) · chậm 44 ngày so với Baseline",
    );
    expect(dongDauDuAn(dau({ maDuAn: "x", ten: "X", soHomQua: -2 }))).toContain("so hôm qua −2 ngày");
    expect(dongDauDuAn(dau({ maDuAn: "x", ten: "X", soHomQua: null }))).toContain("so hôm qua: chưa có số");
  });
});

describe("🤖 câu hỏi — cấm số ngoài khung", () => {
  const khung = "⛓ Cung cấp Hub chưa khởi công, dời 24 ngày, kéo theo 20 việc | COD lùi 30 ngày | 6.1.4";
  it("câu chỉ dùng số trong khung → nhận", () => {
    expect(cauHoiHopLe("Có ép nhà cung cấp 6.1.4 giao sớm để gỡ 30 ngày lùi COD?", khung)).toBe(true);
  });
  it("câu có số bịa (7 ngày) → loại", () => {
    expect(cauHoiHopLe("Có yêu cầu nhà cung cấp cam kết trong 7 ngày?", khung)).toBe(false);
  });
  it("không phải câu hỏi → loại", () => {
    expect(cauHoiHopLe("Cần ép nhà cung cấp giao sớm.", khung)).toBe(false);
  });
});
