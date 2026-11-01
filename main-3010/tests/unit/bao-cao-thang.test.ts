// ============================================================
// BỘ TEST BÁO CÁO THÁNG — PLAN-MAIN-AGENT mục 2 · 3 · KE-HOACH/05 A.4
//
// Bộ test này canh đúng bốn thứ dễ hỏng nhất và hỏng thì hỏng nặng:
//   ① đủ 6 mục 11 bảng, không thiếu bảng nào dù agent chết hết
//   ② MỌI ô khai được nó hỏi ai — kể cả ô chưa hỏi được
//   ③ không hỏi được thì `null` → "—", KHÔNG BAO GIỜ 0
//   ④ có số mà không dẫn được nguồn = KHÔNG HỢP LỆ
// ============================================================

import { describe, expect, it } from "vitest";
import {
  baoCaoHopLe,
  cacLuotHoiCanThiet,
  CAU_GIAI_THICH_NGAY_ANH_HUONG,
  DAU_TRONG,
  demO,
  dienBaoCao,
  docTrangThaiHoSo,
  dongDauLlm,
  dungKhungBaoCao,
  ghiNhanXetLlm,
  ghiOLlm,
  hienO,
  khoaLuot,
  moiBang,
  moiO,
  moTaNguonO,
  ngayAnhHuongNangNhat,
  nhanKy,
  nhanKyChu,
  oCoSo,
  oHopLe,
  oThieu,
  SO_BANG,
  SO_MUC,
  TIEN_TO_LLM,
  type AnhXaNguon,
  type BaoCaoThang,
  type KetQuaLuot,
  type OSo,
} from "@/lib/bao-cao-thang/model";
import {
  bocBanGhi,
  doiThanhKetQua,
  ketQuaVanDeNoiBat,
  kyThang,
  kyThangTruoc,
  noiNguon,
  TRAN_VAN_DE_MOI_DU_AN,
} from "@/lib/bao-cao-thang/dung";
import { chuyenKhuon, thangToi } from "@/lib/bao-cao-thang/khuon-agent";
import { anDuAnImLang, CC_VAN_DE_NOI_BAT, duAnImLang, soHaiBan, trinhBayBang } from "@/lib/bao-cao-thang/model";
import type { KetQuaGomVanDe } from "@/lib/bao-cao-sang/dung";
import type { VanDeSang } from "@/lib/bao-cao-sang/luat-cod";
import { xuatMarkdown, xuatPhuLucNguon, xuatXlsx } from "@/lib/bao-cao-thang/xuat";
import type { KhuonTra } from "@/lib/mcp/khuon";

// 13/10: TT đang "Chuẩn bị đầu tư" → hồ sơ thủ tục của TT vào Bảng 6; HV · BT vào Bảng 7
const DU_AN = [
  { ma: "HV", ten: "ĐG Hướng Việt", giaiDoan: "Đang thi công", congSuat: "30 MW" },
  { ma: "TT", ten: "ĐG Tân Thành", giaiDoan: "Chuẩn bị đầu tư" },
  { ma: "BT", ten: "ĐG Ba Tầng 1" },
];

function khung(): BaoCaoThang {
  return dungKhungBaoCao({ ky: kyThang(7, 2026), duAn: DU_AN, ngayLap: "01/08/2026" });
}

function timLuot(bc: BaoCaoThang, congCu: string, duAn?: string): AnhXaNguon {
  const l = cacLuotHoiCanThiet(bc).find(
    (x) => x.congCu === congCu && (duAn === undefined || x.thamSo.du_an === duAn),
  );
  if (!l) throw new Error(`Không có lượt hỏi ${congCu}${duAn ? ` cho ${duAn}` : ""}`);
  return l;
}

/** Mọi lượt đều hỏng — dùng để kiểm "agent chết hết thì báo cáo trông thế nào" */
function moiLuotHong(bc: BaoCaoThang, lyDo = "Agent đang TẮT trong Danh bạ agent."): KetQuaLuot[] {
  return cacLuotHoiCanThiet(bc).map((anhXa) => ({ anhXa, ok: false, lyDo }));
}

function oTrongBang(bc: BaoCaoThang, maBang: string, khoaDong: string, khoaCot: string): OSo {
  const b = moiBang(bc).find((x) => x.ma === maBang);
  const d = b?.dong.find((x) => x.khoa === khoaDong);
  const o = d?.o[khoaCot];
  if (!o) throw new Error(`Không thấy ô ${maBang}/${khoaDong}/${khoaCot}`);
  return o;
}

// ─────────────────────────────────────────────────────────────
// ① Cấu trúc 6 mục · 11 bảng
// ─────────────────────────────────────────────────────────────

describe("Cấu trúc mẫu — 6 mục, 11 bảng", () => {
  it("1. Khung có đúng 6 mục I..VI", () => {
    const bc = khung();
    expect(bc.muc).toHaveLength(SO_MUC);
    expect(bc.muc.map((m) => m.ma)).toEqual(["I", "II", "III", "IV", "V", "VI"]);
  });

  it("2. Khung có đúng 11 bảng, đánh số 1..11 không trùng không hụt", () => {
    const b = moiBang(khung());
    expect(b).toHaveLength(SO_BANG);
    expect(b.map((x) => x.soHieu)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it("3. Mục II có ba dạng bảng: theo hạng mục, chi tiết khối lượng, chuẩn bị đầu tư", () => {
    const bc = khung();
    const mucII = bc.muc.find((m) => m.ma === "II")!;
    expect(mucII.bang.map((b) => b.ma)).toEqual(["B4", "B5", "B6"]);
    // Đang thi công đo bằng %, chuẩn bị đầu tư đo bằng thủ tục — hai dạng khác hẳn
    expect(mucII.bang[0].cot.some((c) => c.kieu === "phan_tram")).toBe(true);
    expect(mucII.bang[2].cot.some((c) => c.kieu === "phan_tram")).toBe(false);
  });

  it("4. Mục III là Pháp lý & GPMB — mục An toàn lao động của mẫu ENC đã bỏ hẳn", () => {
    const bc = khung();
    const m = bc.muc.find((x) => x.ma === "III")!;
    expect(m.ten).toContain("Pháp lý");
    const chu = JSON.stringify(bc).toLowerCase();
    expect(chu).not.toContain("tnlđ");
    expect(chu).not.toContain("giờ công an toàn");
  });

  it("5. Mọi bảng đều có cột Dự án hoặc thuộc khối đầu báo cáo (gộp 3 dự án một file)", () => {
    for (const b of moiBang(khung())) {
      if (b.soHieu <= 2) continue;
      expect(b.cot.some((c) => c.khoa === "du_an")).toBe(true);
    }
  });

  it("6. Mục I có khối ◆ xu thế cho TỪNG dự án, nguồn là tiendo.lich_su_du_bao KÈM mã dự án (13/10)", () => {
    const m = khung().muc.find((x) => x.ma === "I")!;
    expect(m.khoiThem).toHaveLength(DU_AN.length);
    for (const kt of m.khoiThem!) {
      expect(kt.anhXa.congCu).toBe("tiendo.lich_su_du_bao");
      // đo 13/10: hỏi không kèm mã dự án thì agent Tiến độ trả "Thiếu ma_du_an" — khối trống suốt
      expect(kt.anhXa.thamSo.ma_du_an).toBe(kt.duAn);
    }
  });
});

// ─────────────────────────────────────────────────────────────
// ② Mọi ô khai được nguồn
// ─────────────────────────────────────────────────────────────

describe("Ánh xạ nguồn — mọi ô khai được nó hỏi ai", () => {
  it("7. Mọi cột của mọi bảng đều có maAgent và congCu không rỗng", () => {
    for (const b of moiBang(khung())) {
      for (const c of b.cot) {
        expect(c.anhXa.maAgent.trim()).not.toBe("");
        expect(c.anhXa.congCu.trim()).not.toBe("");
      }
    }
  });

  it("8. Mọi ô trong khung đều mang ánh xạ nguồn, kể cả ô chưa hỏi được", () => {
    const t = moiO(khung());
    expect(t.length).toBeGreaterThan(0);
    for (const x of t) {
      expect(x.o.anhXa.congCu).toBeTruthy();
      expect(moTaNguonO(x.o)).toContain(x.o.anhXa.congCu);
    }
  });

  it("9. Ánh xạ theo đúng PLAN mục 2.2: hồ sơ thiếu hỏi pháp lý, phiếu giá hỏi hợp đồng", () => {
    const b = moiBang(khung());
    const b6 = b.find((x) => x.ma === "B6")!;
    expect(b6.cot.find((c) => c.khoa === "ho_so")!.anhXa).toMatchObject({
      maAgent: "phaply",
      congCu: "phaply.ho_so_thieu",
    });
    const b8 = b.find((x) => x.ma === "B8")!;
    expect(b8.cot.find((c) => c.khoa === "so_ngay_cho")!.anhXa).toMatchObject({
      maAgent: "hopdong",
      congCu: "hopdong.phieu_gia_dang_cho",
    });
    expect(b8.cot.find((c) => c.khoa === "dang_o_ban")!.anhXa.congCu).toBe("hopdong.phieu_gia_dang_cho");
    expect(b8.cot.find((c) => c.khoa === "hop_dong")!.anhXa.congCu).toBe("hopdong.chi_phi_theo_hop_dong");
    expect(b8.cot.find((c) => c.khoa === "san_luong_thang")!.anhXa.congCu).toBe("tiendo.san_luong_hop_dong");
  });

  it("10. Bảng 9 khai hai agent khác nhau cho cam kết và thực tế", () => {
    const b9 = moiBang(khung()).find((x) => x.ma === "B9")!;
    expect(b9.cot.find((c) => c.khoa === "nhan_luc_cam_ket")!.anhXa.maAgent).toBe("hopdong");
    expect(b9.cot.find((c) => c.khoa === "nhan_luc_thuc_te")!.anhXa.maAgent).toBe("tiendo");
  });

  it("11. Lượt hỏi trùng nhau được gộp làm một lời gọi", () => {
    const bc = khung();
    const luot = cacLuotHoiCanThiet(bc);
    const khoa = luot.map(khoaLuot);
    expect(new Set(khoa).size).toBe(khoa.length);
    // tom_tat_du_an dùng cho cả bảng 3 và bảng 4 → chỉ 1 lượt mỗi dự án
    const tom = luot.filter((l) => l.congCu === "tiendo.tom_tat_du_an");
    expect(tom).toHaveLength(DU_AN.length);
  });

  it("12. Ba cột chưa có trong core.du_an được khai riêng để biết còn thiếu (PLAN 2.3)", () => {
    const b3 = moiBang(khung()).find((x) => x.ma === "B3")!;
    for (const k of ["cong_suat", "loai_hinh", "dia_diem"]) {
      expect(b3.cot.find((c) => c.khoa === k)!.anhXa.congCu).toBe(`core.du_an.${k}`);
    }
  });
});

// ─────────────────────────────────────────────────────────────
// ③ Không hỏi được → null, không bao giờ 0
// ─────────────────────────────────────────────────────────────

describe("Thiếu số liệu — null chứ không phải 0", () => {
  it("13. Ô chưa hỏi được có giaTri null và hiện ra là “—”", () => {
    const o = oTrongBang(khung(), "B3", "HV", "tien_do");
    expect(o.coSo).toBe(false);
    expect(o.giaTri).toBeNull();
    expect(hienO(o)).toBe(DAU_TRONG);
    expect(hienO(o)).not.toBe("0");
  });

  it("14. Agent chết hết: không một ô nào bị điền 0 hay chuỗi rỗng", () => {
    const k = khung();
    const bc = dienBaoCao(k, moiLuotHong(k));
    for (const x of moiO(bc)) {
      if (!x.o.coSo) {
        expect(x.o.giaTri).toBeNull();
        expect(hienO(x.o)).toBe(DAU_TRONG);
      } else {
        expect(x.o.giaTri).not.toBe(0);
        expect(x.o.giaTri).not.toBe("");
      }
    }
  });

  it("15. Ô thiếu luôn kèm LÝ DO tiếng Việt, không để trống", () => {
    const k = khung();
    const bc = dienBaoCao(k, moiLuotHong(k, "Agent Hợp đồng đang TẮT trong Danh bạ agent."));
    for (const x of moiO(bc)) {
      if (!x.o.coSo) expect(x.o.lyDo.trim().length).toBeGreaterThan(0);
    }
  });

  it("16. Agent tắt thì ô ghi rõ agent nào tắt, không ghi chung chung", () => {
    const k = khung();
    const bc = dienBaoCao(k, moiLuotHong(k, "Agent “Agent Hợp đồng” đang TẮT trong Danh bạ agent."));
    const o = oTrongBang(bc, "B8", "__giu_cho__", "gia_tri_hd");
    expect(o.coSo).toBe(false);
    expect((o as Extract<OSo, { coSo: false }>).lyDo).toContain("Agent Hợp đồng");
  });

  it("17. demO đếm đúng số ô còn thiếu", () => {
    const k = khung();
    const d = demO(k);
    expect(d.tong).toBe(d.coSo + d.thieu);
    expect(d.thieu).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────
// ④ Có số mà thiếu nguồn = KHÔNG HỢP LỆ
// ─────────────────────────────────────────────────────────────

describe("Luật dẫn nguồn — có số thì phải có nguồn", () => {
  const anhXa: AnhXaNguon = { maAgent: "tiendo", congCu: "tiendo.tom_tat_du_an", thamSo: {} };

  it("18. oCoSo với vết nguồn rỗng bị HẠ thành ô thiếu, không ghi số", () => {
    const o = oCoSo(41.5, anhXa, { moTa: "   ", thoiDiem: "2026-08-01T00:00:00Z" });
    expect(o.coSo).toBe(false);
    expect(o.giaTri).toBeNull();
    expect((o as Extract<OSo, { coSo: false }>).lyDo).toContain("không dẫn được nguồn");
  });

  it("19. Ô có giá trị mà thiếu nguồn bị coi là KHÔNG HỢP LỆ", () => {
    const bay = { coSo: true, giaTri: 41.5, anhXa, vet: { moTa: "", thoiDiem: "x" } };
    expect(oHopLe(bay)).toBe(false);
  });

  it("20. Ô thiếu mà không có lý do cũng KHÔNG HỢP LỆ", () => {
    expect(oHopLe({ coSo: false, giaTri: null, anhXa, lyDo: "" })).toBe(false);
  });

  it("21. Ô dựng đúng khuôn thì hợp lệ", () => {
    expect(oHopLe(oCoSo(41.5, anhXa, { moTa: "wbs · HV-1", thoiDiem: "t" }))).toBe(true);
    expect(oHopLe(oThieu(anhXa, "Agent tắt."))).toBe(true);
  });

  it("22. baoCaoHopLe bắt được ô bậy nhét vào báo cáo đã lưu", () => {
    const bc = khung();
    expect(baoCaoHopLe(bc).ok).toBe(true);
    const b3 = moiBang(bc).find((x) => x.ma === "B3")!;
    b3.dong[0].o.cong_suat = {
      coSo: true,
      giaTri: "48 MW",
      anhXa,
      vet: { moTa: "", thoiDiem: "t" },
    } as unknown as OSo;
    const soat = baoCaoHopLe(bc);
    expect(soat.ok).toBe(false);
    expect(soat.loi.join(" ")).toContain("B3");
  });

  it("23. baoCaoHopLe bắt được báo cáo thiếu mục hoặc thiếu bảng", () => {
    const bc = khung();
    bc.muc = bc.muc.slice(0, 5);
    const soat = baoCaoHopLe(bc);
    expect(soat.ok).toBe(false);
    expect(soat.loi.join(" ")).toContain("6 mục");
  });

  it("24. Agent trả số nhưng KHÔNG dẫn nguồn thì Main từ chối dùng số đó", () => {
    const tra: KhuonTra = {
      ok: true,
      du_lieu: [{ hang_muc: "Móng tua bin", th_luy_ke: 37 }],
      nguon: [],
      thoi_diem_tra_loi: "2026-08-01T00:00:00Z",
      canh_bao: [],
    };
    const kq = doiThanhKetQua(anhXa, tra);
    expect(kq.ok).toBe(false);
    expect(kq.lyDo).toContain("KHÔNG dẫn được nguồn");
  });
});

// ─────────────────────────────────────────────────────────────
// ⑤ Không giấu bảng
// ─────────────────────────────────────────────────────────────

describe("Không giấu bảng nào", () => {
  it("25. Agent chết hết vẫn ra đủ 6 mục 11 bảng", () => {
    const k = khung();
    const bc = dienBaoCao(k, moiLuotHong(k));
    expect(bc.muc).toHaveLength(SO_MUC);
    expect(moiBang(bc)).toHaveLength(SO_BANG);
  });

  it("26. Bảng không có dòng nào vẫn đủ cột, có một dòng giữ chỗ và câu nói rõ vì sao", () => {
    const k = khung();
    const bc = dienBaoCao(k, moiLuotHong(k, "Agent pháp lý chưa bật."));
    const b6 = moiBang(bc).find((x) => x.ma === "B6")!;
    expect(b6.dong).toHaveLength(1);
    expect(b6.dong[0].laDongGiuCho).toBe(true);
    expect(Object.keys(b6.dong[0].o).sort()).toEqual(b6.cot.map((c) => c.khoa).sort());
    expect(b6.lyDoTrong).toContain("Agent pháp lý chưa bật");
  });

  it("27. Bảng 3 luôn có đủ dòng cho từng dự án dù mọi agent đều tắt", () => {
    const k = khung();
    const bc = dienBaoCao(k, moiLuotHong(k));
    const b3 = moiBang(bc).find((x) => x.ma === "B3")!;
    expect(b3.dong.map((d) => d.khoa)).toEqual(["HV", "TT", "BT"]);
    expect(hienO(b3.dong[0].o.du_an)).toBe("ĐG Hướng Việt");
  });

  it("28. Một agent hỏng ở dự án HV không làm mờ số của dự án TT", () => {
    const k = khung();
    const lHV = timLuot(k, "tiendo.tom_tat_du_an", "HV");
    const lTT = timLuot(k, "tiendo.tom_tat_du_an", "TT");
    const bc = dienBaoCao(k, [
      { anhXa: lHV, ok: false, lyDo: "Hết hạn chờ khi hỏi dự án HV." },
      {
        anhXa: lTT,
        ok: true,
        moTaNguon: "wbs · TT-0 · schedule.json",
        banGhi: [{ tien_do: "Đang lập NCKT" }],
      },
    ]);
    expect(oTrongBang(bc, "B3", "HV", "tien_do").coSo).toBe(false);
    expect(hienO(oTrongBang(bc, "B3", "TT", "tien_do"))).toBe("Đang lập NCKT");
    // Ô Giai đoạn lấy từ sổ dự án của Main, không hỏi agent nào
    expect(hienO(oTrongBang(bc, "B3", "TT", "trang_thai"))).toBe("Chuẩn bị đầu tư");
    expect(oTrongBang(bc, "B3", "BT", "trang_thai").coSo).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// ⑥ Bảng 9 — dòng duy nhất cần hai agent
// ─────────────────────────────────────────────────────────────

describe("Bảng 9 — cam kết (Hợp đồng) vs thực tế (tiến độ)", () => {
  it("29. Hai agent điền chung MỘT dòng, không bên nào đè bên kia", () => {
    const k = khung();
    const lCam = timLuot(k, "hopdong.cam_ket_nha_thau", "HV");
    const lThuc = timLuot(k, "tiendo.nguon_luc_huy_dong", "HV");
    const bc = dienBaoCao(k, [
      {
        anhXa: lCam,
        ok: true,
        moTaNguon: "hop-dong · HD-EPC-08/2024",
        banGhi: [{ nha_thau: "SCI ENC", nhan_luc_cam_ket: 185, thiet_bi_cam_ket: 14 }],
      },
      {
        anhXa: lThuc,
        ok: true,
        moTaNguon: "bc-ngay · HV 07/2026",
        banGhi: [{ nha_thau: "SCI ENC", nhan_luc_thuc_te: 148, so_may: 12 }],
      },
    ]);
    const b9 = moiBang(bc).find((x) => x.ma === "B9")!;
    const dong = b9.dong.filter((d) => !d.laDongGiuCho);
    expect(dong).toHaveLength(1);
    expect(hienO(dong[0].o.nhan_luc_cam_ket)).toBe("185 người");
    expect(hienO(dong[0].o.nhan_luc_thuc_te)).toBe("148 người");
    expect(dong[0].o.nhan_luc_cam_ket.anhXa.maAgent).toBe("hopdong");
    expect(dong[0].o.nhan_luc_thuc_te.anhXa.maAgent).toBe("tiendo");
  });

  it("30. Thiếu một bên thì ô bên đó là “—”, KHÔNG lấy bên kia điền thay", () => {
    const k = khung();
    const lCam = timLuot(k, "hopdong.cam_ket_nha_thau", "HV");
    const bc = dienBaoCao(k, [
      {
        anhXa: lCam,
        ok: true,
        moTaNguon: "hop-dong · HD-EPC-08/2024",
        banGhi: [{ nha_thau: "SCI ENC", nhan_luc_cam_ket: 185 }],
      },
    ]);
    const dong = moiBang(bc)
      .find((x) => x.ma === "B9")!
      .dong.find((d) => !d.laDongGiuCho)!;
    expect(hienO(dong.o.nhan_luc_cam_ket)).toBe("185 người");
    expect(dong.o.nhan_luc_thuc_te.coSo).toBe(false);
    expect(hienO(dong.o.nhan_luc_thuc_te)).toBe(DAU_TRONG);
  });

  it("31. Ô Đánh giá của bảng 9 là phần 🤖, chưa soạn thì để trống có lý do", () => {
    const k = khung();
    const lCam = timLuot(k, "hopdong.cam_ket_nha_thau", "HV");
    const bc = dienBaoCao(k, [
      {
        anhXa: lCam,
        ok: true,
        moTaNguon: "hop-dong · HD-EPC",
        banGhi: [{ nha_thau: "SCI ENC", nhan_luc_cam_ket: 185 }],
      },
    ]);
    const dong = moiBang(bc)
      .find((x) => x.ma === "B9")!
      .dong.find((d) => !d.laDongGiuCho)!;
    expect(dong.o.danh_gia.coSo).toBe(false);
    expect((dong.o.danh_gia as Extract<OSo, { coSo: false }>).lyDo).toContain("🤖");
  });
});

// ─────────────────────────────────────────────────────────────
// ⑦ Số ngày ảnh hưởng — lấy MAX, không cộng
// ─────────────────────────────────────────────────────────────

describe("Số ngày ảnh hưởng không cộng dồn", () => {
  function bcCoIssue(): BaoCaoThang {
    const k = khung();
    // 13/10: Bảng 10 lấy từ MỘT lượt gom (cùng luật "làm chậm COD" của báo cáo sáng), không ghép hai công cụ nữa
    const lVanDe = timLuot(k, CC_VAN_DE_NOI_BAT, "HV");
    return dienBaoCao(k, [
      {
        anhXa: lVanDe,
        ok: true,
        moTaNguon: "sổ Issue của các agent · ISS-101, ISS-102, ISS-103",
        banGhi: [
          { van_de: "GPMB T11 khiếu nại", muc_do: "Nghiêm trọng", so_ngay_anh_huong: 32 },
          { van_de: "Thiếu nhân lực ENC", muc_do: "Nghiêm trọng", so_ngay_anh_huong: 12 },
          { van_de: "Phiếu giá đợt 4 chờ duyệt", muc_do: "Đáng chú ý", so_ngay_anh_huong: 3 },
        ],
      },
    ]);
  }

  it("32. Lấy cái NẶNG NHẤT (32) chứ không cộng dồn (47)", () => {
    const b10 = moiBang(bcCoIssue()).find((x) => x.ma === "B10")!;
    const o = ngayAnhHuongNangNhat(b10)!;
    expect(o.giaTri).toBe(32);
    expect(o.giaTri).not.toBe(47);
  });

  it("33. Ô nặng nhất vẫn dẫn được về đúng lượt hỏi sinh ra nó", () => {
    const b10 = moiBang(bcCoIssue()).find((x) => x.ma === "B10")!;
    const o = ngayAnhHuongNangNhat(b10)!;
    expect(o.coSo).toBe(true);
    expect(o.anhXa.congCu).toBe(CC_VAN_DE_NOI_BAT);
    expect(moTaNguonO(o)).toContain("sổ Issue");
  });

  it("34. Không dòng nào có số ngày dẫn được nguồn thì trả null, không trả 0", () => {
    const k = khung();
    const bc = dienBaoCao(k, moiLuotHong(k));
    const b10 = moiBang(bc).find((x) => x.ma === "B10")!;
    expect(ngayAnhHuongNangNhat(b10)).toBeNull();
  });

  it("35. Câu giải thích “không cộng dồn” in ngay dưới bảng 10", () => {
    const b10 = moiBang(khung()).find((x) => x.ma === "B10")!;
    expect(b10.ghiChuDuoiBang).toContain(CAU_GIAI_THICH_NGAY_ANH_HUONG);
    expect(CAU_GIAI_THICH_NGAY_ANH_HUONG).toContain("KHÔNG cộng dồn");
  });
});

// ─────────────────────────────────────────────────────────────
// ⑧ Trạng thái hồ sơ phải tách đôi 🔴 / 🟡
// ─────────────────────────────────────────────────────────────

describe("Trạng thái hồ sơ tách đôi 🔴 / 🟡", () => {
  it("36. Đọc đúng ba trạng thái, chữ lạ thì trả null chứ không đoán", () => {
    expect(docTrangThaiHoSo("chua_nop_duoc")).toBe("chua_nop_duoc");
    expect(docTrangThaiHoSo("Đã nộp")).toBe("da_nop_cho_ket_qua");
    expect(docTrangThaiHoSo("đã có")).toBe("da_co");
    expect(docTrangThaiHoSo("thiếu")).toBeNull();
    expect(docTrangThaiHoSo(7)).toBeNull();
  });

  it("37. Bảng 6 hiện 🔴 và 🟡 tách riêng, không gộp thành một chữ “thiếu”", () => {
    const k = khung();
    const l = timLuot(k, "phaply.ho_so_thieu", "TT");
    const bc = dienBaoCao(k, [
      {
        anhXa: l,
        ok: true,
        moTaNguon: "ho-so-phap-ly · PL-TT-01, PL-TT-02",
        banGhi: [
          { ho_so: "Chấp thuận chủ trương đầu tư", trang_thai: "chua_nop_duoc" },
          { ho_so: "Thỏa thuận đấu nối 110kV", trang_thai: "da_nop_cho_ket_qua" },
        ],
      },
    ]);
    const b6 = moiBang(bc).find((x) => x.ma === "B6")!;
    const chu = b6.dong.map((d) => hienO(d.o.trang_thai));
    expect(chu).toContain("🔴 Chưa nộp được");
    expect(chu).toContain("🟡 Đã nộp, chờ kết quả");
  });

  it("38. Trạng thái agent trả về không đọc được thì để trống kèm lý do, không gộp bừa", () => {
    const k = khung();
    const l = timLuot(k, "phaply.ho_so_thieu", "TT");
    const bc = dienBaoCao(k, [
      {
        anhXa: l,
        ok: true,
        moTaNguon: "ho-so-phap-ly · PL-TT-09",
        banGhi: [{ ho_so: "Hồ sơ X", trang_thai: "đang bị vướng" }],
      },
    ]);
    const o = moiBang(bc).find((x) => x.ma === "B6")!.dong[0].o.trang_thai;
    expect(o.coSo).toBe(false);
    expect((o as Extract<OSo, { coSo: false }>).lyDo).toContain("Chưa nộp được");
  });
});

// ─────────────────────────────────────────────────────────────
// ⑨ Dấu 🤖 trước nội dung LLM
// ─────────────────────────────────────────────────────────────

describe("Nội dung do LLM sinh luôn có 🤖 đứng trước", () => {
  it("39. dongDauLlm thêm dấu, và không nhân đôi dấu khi gọi lại", () => {
    expect(dongDauLlm("Ba dự án cùng tắc ở Sở NN&PTNT")).toBe(
      `${TIEN_TO_LLM}Ba dự án cùng tắc ở Sở NN&PTNT`,
    );
    expect(dongDauLlm(dongDauLlm("x"))).toBe(`${TIEN_TO_LLM}x`);
    expect(dongDauLlm("   ")).toBe("");
  });

  it("40. Nhận xét mục mang dấu 🤖", () => {
    const bc = ghiNhanXetLlm(khung(), "V", "Vấn đề GPMB là gốc của chuỗi tắc.");
    expect(bc.muc.find((m) => m.ma === "V")!.nhanXet!.startsWith("🤖")).toBe(true);
  });

  it("41. Ô kiến nghị do LLM soạn vừa mang dấu 🤖 vừa dẫn được nguồn", () => {
    const k = khung();
    const l = timLuot(k, CC_VAN_DE_NOI_BAT, "HV");
    let bc = dienBaoCao(k, [
      {
        anhXa: l,
        ok: true,
        moTaNguon: "sổ Issue của các agent · ISS-101",
        banGhi: [{ van_de: "GPMB T11 khiếu nại", muc_do: "Cao" }],
      },
    ]);
    const dong = moiBang(bc).find((x) => x.ma === "B10")!.dong[0];
    bc = ghiOLlm(bc, "B10", dong.khoa, "kien_nghi", "Trình TGĐ duyệt nâng đơn giá.", "llm · lượt 3");
    const o = oTrongBang(bc, "B10", dong.khoa, "kien_nghi");
    expect(o.coSo).toBe(true);
    expect(String(o.giaTri).startsWith("🤖")).toBe(true);
    expect(oHopLe(o)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// ⑩ Bóc câu trả lời cổng MCP · kỳ báo cáo
// ─────────────────────────────────────────────────────────────

describe("Bóc câu trả lời MCP và tính kỳ", () => {
  const anhXa: AnhXaNguon = { maAgent: "tiendo", congCu: "tiendo.tom_tat_du_an", thamSo: {} };

  it("42. bocBanGhi nhận ba dạng du_lieu hay gặp, dạng lạ thì trả null", () => {
    expect(bocBanGhi([{ a: 1 }])).toEqual([{ a: 1 }]);
    expect(bocBanGhi({ danh_sach: [{ a: 1 }] })).toEqual([{ a: 1 }]);
    expect(bocBanGhi({ a: 1 })).toEqual([{ a: 1 }]);
    expect(bocBanGhi("41,5%")).toBeNull();
    expect(bocBanGhi([1, 2, 3])).toBeNull();
  });

  it("43. noiNguon nối được các mảnh dẫn nguồn thành câu đọc được", () => {
    expect(noiNguon([{ loai: "wbs", ma: "HV-1", file_goc: "schedule.json" }])).toBe(
      "wbs · HV-1 · schedule.json",
    );
    expect(noiNguon([])).toBe("");
  });

  it("44. Cổng trả lỗi thì kết quả mang nguyên văn thông điệp của cổng", () => {
    const kq = doiThanhKetQua(anhXa, {
      ok: false,
      ma_loi: "AGENT_KHONG_SAN_SANG",
      thong_diep: "Agent “Agent Hợp đồng” đang TẮT trong Danh bạ agent.",
    });
    expect(kq.ok).toBe(false);
    expect(kq.lyDo).toContain("đang TẮT");
  });

  it("45. Cổng trả đúng khuôn thì kết quả mang cả bản ghi lẫn nguồn", () => {
    const kq = doiThanhKetQua(anhXa, {
      ok: true,
      du_lieu: [{ hang_muc: "Móng tua bin", th_luy_ke: 37 }],
      nguon: [{ loai: "wbs", ma: "HV-3", file_goc: "schedule.json" }],
      thoi_diem_tra_loi: "2026-08-01T00:00:00Z",
      canh_bao: [],
    });
    expect(kq.ok).toBe(true);
    expect(kq.banGhi).toHaveLength(1);
    expect(kq.moTaNguon).toContain("HV-3");
  });

  it("46. kyThang tính đúng ngày cuối tháng, kể cả tháng 2 năm nhuận", () => {
    expect(kyThang(7, 2026)).toMatchObject({ tuNgay: "01/07/2026", denNgay: "31/07/2026" });
    expect(kyThang(2, 2024).denNgay).toBe("29/02/2024");
    expect(kyThang(2, 2026).denNgay).toBe("28/02/2026");
  });

  it("47. kyThangTruoc lùi qua năm khi đang ở tháng 1", () => {
    expect(kyThangTruoc(new Date(2027, 0, 15))).toMatchObject({ thang: 12, nam: 2026 });
    expect(kyThangTruoc(new Date(2026, 8, 5))).toMatchObject({ thang: 8, nam: 2026 });
  });

  it("48. Nhãn kỳ dùng cho tham số hỏi và cho người đọc là hai dạng khác nhau", () => {
    expect(nhanKy(kyThang(7, 2026))).toBe("2026-07");
    expect(nhanKyChu(kyThang(7, 2026))).toBe("Tháng 07/2026");
  });
});

// ─────────────────────────────────────────────────────────────
// ⑪ Kết xuất
// ─────────────────────────────────────────────────────────────

describe("Kết xuất Markdown và phụ lục nguồn", () => {
  it("49. Markdown in đủ 6 mục và 11 bảng, không giấu bảng nào", () => {
    const k = khung();
    const md = xuatMarkdown(dienBaoCao(k, moiLuotHong(k)));
    for (const m of ["I.", "II.", "III.", "IV.", "V.", "VI."]) expect(md).toContain(`## ${m}`);
    for (let i = 1; i <= SO_BANG; i++) expect(md).toContain(`#### Bảng ${i} —`);
  });

  it("50. Markdown in “—” cho ô thiếu và in câu không cộng dồn dưới bảng 10", () => {
    const k = khung();
    const md = xuatMarkdown(dienBaoCao(k, moiLuotHong(k)));
    expect(md).toContain(DAU_TRONG);
    expect(md).toContain("KHÔNG cộng dồn");
    expect(md).toContain("BẢN NHÁP");
  });

  it("51. Dựng được file Excel thật, không ném lỗi khi báo cáo toàn ô trống", async () => {
    const k = khung();
    const buf = await xuatXlsx(dienBaoCao(k, moiLuotHong(k)));
    // "PK" là chữ ký đầu file zip — XLSX là một gói zip
    expect(buf.length).toBeGreaterThan(1000);
    expect(buf.subarray(0, 2).toString("latin1")).toBe("PK");
  });

  it("52. Phụ lục nguồn liệt kê được từng ô kèm chỗ nó lấy số về", () => {
    const k = khung();
    const bc = dienBaoCao(k, moiLuotHong(k));
    const pl = xuatPhuLucNguon(bc);
    expect(pl).toContain("tiendo.tom_tat_du_an");
    expect(pl).toContain("phaply.ho_so_thieu");
    expect(pl).toContain("hopdong.cam_ket_nha_thau");
    expect(pl.split("\n").length).toBeGreaterThan(moiO(bc).length / 2);
  });
});

// ─────────────────────────────────────────────────────────────
// ⑫ BẢN 2 — 13/10/2026 (KE-HOACH/22): chuyển khuôn riêng từng công cụ · ẩn dự án chưa có dữ liệu ·
//    hàng dự án thay cột dự án · Bảng 10 tối đa 10 vấn đề mỗi dự án · so với bản trước
// ─────────────────────────────────────────────────────────────

/** Khuôn THẬT của tiendo.tom_tat_du_an đo 13/10 (rút gọn) */
const TOM_TAT_HV = {
  projectName: "Điện gió Hướng Việt",
  pctTotal: 4.5,
  pctBaselineNgayCat: 15.2,
  cod_du_bao: "2027-10-28",
  cod_muc_tieu: "2027-08-03",
  cham_ngay_so_muc_tieu: 86,
  cod_baseline: "2027-09-14",
  cham_ngay_so_baseline: 44,
  so_viec_gang_dang_tre: 21,
  ngay_cat_du_lieu: "2026-10-11",
  pctNhom: [
    { wbs: "2", ten: "ĐẤT, RỪNG & GIẢI PHÓNG MẶT BẰNG", pct: 0, pctBaseline: null, soViec: 7 },
    { wbs: "7", ten: "THI CÔNG XÂY DỰNG VÀ LẮP ĐẶT", pct: 6, pctBaseline: 20, soViec: 120 },
  ],
  viecGangDangTre: [{ wbs: "7.6.2.4", ten: "Turbine số 03", treNgay: 50 }],
};

function vanDe(i: number, them: Partial<VanDeSang> = {}): VanDeSang {
  return {
    maDuAn: "HV",
    agent: "tiendo",
    tenAgent: "Tiến độ",
    idIssue: `I${i}`,
    wbs: null,
    tieuDe: `Việc chậm số ${i}`,
    lyDo: ["lui-cod"],
    soNgayLuiCod: 50 - i,
    tienVnd: null,
    mucDo: "do",
    doLlmSinh: false,
    cauHoi: null,
    kem: [],
    ...them,
  };
}

function gom(soVanDe: number, soTheMo: number): KetQuaGomVanDe {
  return {
    duAn: [],
    vanDe: Array.from({ length: soVanDe }, (_, i) => vanDe(i + 1)),
    viecDoKhac: [],
    thieuSot: [],
    soTheXet: soTheMo,
    soVao: soVanDe,
    soGop: 0,
    soTheMo: { HV: soTheMo },
  };
}

describe("Bản 2 (13/10) — chuyển khuôn riêng từng công cụ", () => {
  it("53. tiendo.tom_tat_du_an: hàng TỔNG mang % toàn dự án, mỗi hạng mục một dòng «mã + tên», Bảng 3 có câu tiến độ", () => {
    const bg = chuyenKhuon("tiendo.tom_tat_du_an", TOM_TAT_HV, {})!;
    // Luật 35 + 36 (14/10/2026): không còn cột «Lệch» điểm % — nhanh/chậm bằng NGÀY, mỗi hệ một cột, ghi rõ hệ
    expect(bg[0]).toMatchObject({
      __tong: true,
      kh_luy_ke: 15.2,
      th_luy_ke: 4.5,
      cham_muc_tieu: "chậm 86 ngày",
      cham_baseline: "chậm 44 ngày",
    });
    expect(bg[0]).not.toHaveProperty("lech");
    expect(String(bg[0].tien_do)).toBe(
      "Hoàn thành 4,5% (theo Baseline 15,2%) · COD dự báo 28/10/2027 · chậm 86 ngày so với Tiến độ mục tiêu (03/08/2027) · " +
        "chậm 44 ngày so với Baseline · 21 việc găng dự báo chậm so với Baseline",
    );
    // Chưa có Baseline đã duyệt → nói thẳng, không bỏ vế
    const chuaDuyet = chuyenKhuon("tiendo.tom_tat_du_an", { ...TOM_TAT_HV, cham_ngay_so_baseline: null }, {})!;
    expect(chuaDuyet[0].cham_baseline).toBeNull();
    expect(String(chuaDuyet[0].tien_do)).toContain("chưa có Baseline đã duyệt");
    expect(String(chuaDuyet[0].tien_do)).toContain("việc găng dự báo chậm so với tiến độ đang lập (chưa duyệt Baseline)");
    expect(bg[1].hang_muc).toBe("2 ĐẤT, RỪNG & GIẢI PHÓNG MẶT BẰNG");
    expect(bg[1].kh_luy_ke).toBeNull(); // agent chưa có % kế hoạch của hạng mục → null, KHÔNG phải 0
    expect(bg[2]).toMatchObject({ kh_luy_ke: 20, th_luy_ke: 6, cham_muc_tieu: null, cham_baseline: null });
    expect(String(bg[2].tinh_trang)).toContain("việc găng chậm nhất: 7.6.2.4 Turbine số 03 — chậm 50 ngày so với Baseline");
  });

  it("54. Điền vào báo cáo: Bảng 3 có ô Tiến độ, Bảng 4 có hàng tổng + hàng hạng mục; ô thiếu ghi lý do cho NGƯỜI ĐỌC", () => {
    const k = khung();
    const l = timLuot(k, "tiendo.tom_tat_du_an", "HV");
    const kq = doiThanhKetQua(l, {
      ok: true,
      du_lieu: TOM_TAT_HV,
      nguon: [{ loai: "tien-do", ma: "HV", file_goc: "schedule.json" }],
      thoi_diem_tra_loi: "2026-10-13T00:00:00.000Z",
      canh_bao: [],
    });
    const bc = dienBaoCao(k, [kq]);
    expect(hienO(oTrongBang(bc, "B3", "HV", "tien_do"))).toContain("Hoàn thành 4,5%");
    const b4 = moiBang(bc).find((x) => x.ma === "B4")!;
    expect(b4.dong.filter((d) => d.loai === "tong")).toHaveLength(1);
    expect(b4.dong).toHaveLength(3);
    const oKh = b4.dong[1].o.kh_luy_ke as Extract<OSo, { coSo: false }>;
    expect(oKh.coSo).toBe(false);
    expect(oKh.lyDo).toBe("Agent Tiến độ chưa trả % khối lượng theo Baseline của hạng mục.");
    expect(oKh.lyDo).not.toContain("["); // không lòi danh sách tên trường ra cho người đọc
  });

  it("55. phaply.ho_so_thieu: quá hạn nhiều lên đầu, trạng thái đo đổi sang tiếng Việt, hàng tổng đếm thiếu/phải có", () => {
    const bg = chuyenKhuon(
      "phaply.ho_so_thieu",
      {
        tong_ho_so_phai_co: 85,
        so_thieu: 20,
        ho_so_thieu: [
          { ma_ho_so: "HV-09-01", ten: "Hợp đồng tín dụng", giai_doan: "tai_chinh_quyet_toan", han: "2026-04-10", so_ngay_qua_han: 186, trang_thai_do: "chua_thay" },
          { ma_ho_so: "HV-K-17", ten: "Chi trả đền bù", giai_doan: "dat_dai_gpmb", han: "2024-10-06", so_ngay_qua_han: 737, trang_thai_do: "nghi_ngo", co_quan_dang_giu: "UBND tỉnh" },
        ],
      },
      {},
    )!;
    expect(bg[0]).toMatchObject({ __tong: true, ghi_chu: "Thiếu 20/85 hồ sơ phải có — in 2 hồ sơ gấp nhất" });
    expect(bg[1]).toMatchObject({
      ho_so: "HV-K-17 Chi trả đền bù",
      loai: "Đất đai – GPMB",
      han_baseline: "06/10/2024",
      trang_thai_chu: "Có văn bản nghi khớp — chờ người xác nhận",
      ghi_chu: "quá hạn 737 ngày · nơi giữ: UBND tỉnh",
    });
    // Vào Bảng 6 (TT đang chuẩn bị đầu tư): in đúng chữ agent nói, không ép thành 🔴/🟡
    const k = khung();
    const bc = dienBaoCao(k, [{ anhXa: timLuot(k, "phaply.ho_so_thieu", "TT"), ok: true, moTaNguon: "ho-so · TT", banGhi: bg }]);
    const b6 = moiBang(bc).find((x) => x.ma === "B6")!;
    expect(b6.dong.map((d) => hienO(d.o.trang_thai))).toContain("Chưa thấy văn bản kết quả");
  });

  it("56. Bảng 8 ghép BA công cụ theo MÃ hợp đồng: giá trị (Hợp đồng) + phiếu giá chờ (Hợp đồng) + sản lượng (Tiến độ)", () => {
    const k = khung();
    const ts = { ky: "2026-07" };
    const kq = (cc: string, duLieu: unknown): KetQuaLuot => ({
      anhXa: timLuot(k, cc, "HV"),
      ok: true,
      moTaNguon: `nguồn ${cc}`,
      banGhi: chuyenKhuon(cc, duLieu, ts)!,
    });
    const bc = dienBaoCao(k, [
      kq("hopdong.chi_phi_theo_hop_dong", {
        hop_dong: [{ ma: "NT-03-HV-HD02", so_hieu: "01/2026/HĐ-EPC", ten: "Tổng thầu EPC", nha_thau: "ENC", gia_tri_hop_dong: 166000000000, chi_phi_luy_ke: 16600000000 }],
      }),
      kq("hopdong.phieu_gia_dang_cho", {
        phieu_gia: [
          { ma_phieu_gia: "PG-01", ma_hop_dong: "NT-03-HV-HD02", so_ngay_cho: 3, khau: "cho-dua-vao-ho-so", vuong: "còn 2 issue mở" },
          { ma_phieu_gia: "PG-02", ma_hop_dong: "NT-03-HV-HD02", so_ngay_cho: 12, khau: "cho-ky" },
        ],
      }),
      kq("tiendo.san_luong_hop_dong", {
        thang: [{ thang: "2026-07" }],
        hop_dong: [{ ma: "NT-03-HV-HD02", thang: [3870509187], luy_ke: 5453487956 }],
        tong_du_an: { thang: [3870509187], luy_ke: 5453487956 },
      }),
    ]);
    const b8 = moiBang(bc).find((x) => x.ma === "B8")!;
    const d = b8.dong.find((x) => x.khoa === "HV::NT-03-HV-HD02")!;
    expect(hienO(d.o.gia_tri_hd)).toBe("166 tỷ đ");
    expect(hienO(d.o.da_thanh_toan_lk)).toBe("16,6 tỷ đ");
    expect(hienO(d.o.phan_tram_hd)).toBe("10 %");
    expect(hienO(d.o.phieu_gia_cho_duyet)).toBe("2 phiếu");
    expect(hienO(d.o.so_ngay_cho)).toBe("12 ngày");
    expect(hienO(d.o.dang_o_ban)).toBe("PG-02: chờ ký");
    expect(hienO(d.o.san_luong_thang)).toBe("3,871 tỷ đ");
    // hàng tổng của dự án: ba công cụ cùng điền MỘT dòng
    const tong = b8.dong.filter((x) => x.loai === "tong");
    expect(tong).toHaveLength(1);
    expect(hienO(tong[0].o.gia_tri_hd)).toBe("166 tỷ đ");
    expect(hienO(tong[0].o.san_luong_luy_ke)).toBe("5,453 tỷ đ");
  });

  it("57. Bảng 11 gom việc của HAI agent vào chung cột; việc găng chỉ lấy việc chạm THÁNG TỚI", () => {
    expect(thangToi("2026-12-31")).toEqual({ tu: "2027-01-01", den: "2027-01-31" });
    const k = khung(); // kỳ 07/2026 → tháng tới = 08/2026
    const lGang = timLuot(k, "tiendo.duong_gang", "HV");
    const lQua = timLuot(k, "base.viec_qua_han", "HV");
    const gang = chuyenKhuon(
      "tiendo.duong_gang",
      {
        chuoi_gang: [
          { wbs: "7.2.3", ten: "Thi công san nền", batDau: "2026-07-20", du_bao_xong: "2026-08-15", pct: 40, so_ngay_tre: 8, ke_hoach_xong: "2026-08-07", baseline_xong: "2026-08-07", nhaThau: "TS" },
          { wbs: "7.6.2", ten: "Lắp turbine", batDau: "2027-06-01", du_bao_xong: "2027-07-31", pct: 0 },
          { wbs: "1.1", ten: "Đã xong", batDau: "2026-01-01", du_bao_xong: "2026-08-05", pct: 100 },
        ],
      },
      lGang.thamSo,
    )!;
    expect(gang).toHaveLength(1);
    const bc = dienBaoCao(k, [
      { anhXa: lGang, ok: true, moTaNguon: "đường găng · HV", banGhi: gang },
      {
        anhXa: lQua,
        ok: true,
        moTaNguon: "sổ cái công việc · HV",
        banGhi: chuyenKhuon("base.viec_qua_han", { viec: [{ ma_viec_base: "CV-2026-0130", ten: "[ĐG Hướng Việt] Trình hồ sơ đấu nối", ten_nguoi_phu_trach: "Nguyễn Văn A", han: "2026-02-09", qua_han_ngay: 246 }] }, lQua.thamSo)!,
      },
    ]);
    const b11 = moiBang(bc).find((x) => x.ma === "B11")!;
    expect(b11.dong.map((d) => hienO(d.o.cong_viec))).toEqual(["7.2.3 Thi công san nền", "CV-2026-0130 Trình hồ sơ đấu nối"]);
    expect(b11.dong.map((d) => hienO(d.o.loai_viec))).toEqual(["Việc găng", "Việc quá hạn còn mở"]);
    expect(hienO(b11.dong[0].o.ghi_chu)).toBe("dự báo xong chậm 8 ngày so với Baseline (07/08/2026) · đã làm 40%");
    expect(hienO(b11.dong[1].o.nguoi_phu_trach)).toBe("Nguyễn Văn A");
    // nguồn của ô là lượt hỏi THẬT đã điền nó, không phải công cụ khai mặc định của cột
    expect(b11.dong[1].o.han_ht.anhXa.congCu).toBe("base.viec_qua_han");
    expect(b11.dong[0].o.han_ht.anhXa.congCu).toBe("tiendo.duong_gang");
  });

  it("58. tiendo.lich_su_du_bao: mỗi tháng lấy lần dự báo CUỐI, tính lùi so điểm đầu", () => {
    const bg = chuyenKhuon(
      "tiendo.lich_su_du_bao",
      {
        moc: [
          { thoi_diem: "2026-09-03T13:48:50Z", cod_du_bao: "2027-09-21" },
          { thoi_diem: "2026-09-28T01:00:00Z", cod_du_bao: "2027-10-14" },
          { thoi_diem: "2026-10-11T01:00:00Z", cod_du_bao: "2027-10-28" },
        ],
      },
      {},
    )!;
    expect(bg).toEqual([
      { nhan: "T09/2026", gia_tri: 0, chu: "COD dự báo 14/10/2027" },
      { nhan: "T10/2026", gia_tri: 14, chu: "COD dự báo 28/10/2027" },
    ]);
  });
});

describe("Bản 2 (13/10) — Bảng 10: tối đa 10 vấn đề mỗi dự án, còn lại một dòng đếm", () => {
  const a: AnhXaNguon = { maAgent: "main", congCu: CC_VAN_DE_NOI_BAT, thamSo: { du_an: "HV" } };

  it("59. 14 vấn đề làm chậm COD trong 40 thẻ mở → in đúng 10 nặng nhất + MỘT dòng đếm 30", () => {
    const kq = ketQuaVanDeNoiBat(a, gom(14, 40));
    expect(kq.ok).toBe(true);
    const thuong = kq.banGhi!.filter((b) => !b.__dem);
    expect(thuong).toHaveLength(TRAN_VAN_DE_MOI_DU_AN);
    expect(thuong[0]).toMatchObject({ van_de: "Việc chậm số 1", muc_do: "Nghiêm trọng", so_ngay_anh_huong: 49, anh_huong: "COD lùi 49 ngày", nguon_bao: "Tiến độ" });
    const dem = kq.banGhi!.filter((b) => b.__dem);
    expect(dem).toHaveLength(1);
    expect(String(dem[0].van_de)).toBe("Còn 30 vấn đề khác đang mở — xem ở màn Cảnh báo của Main.");
  });

  it("60. Không thẻ nào đang mở → «không có dữ liệu» (để dự án im lặng được ẩn), không bịa dòng", () => {
    const kq = ketQuaVanDeNoiBat(a, gom(0, 0));
    expect(kq.ok).toBe(false);
    expect(kq.maLoi).toBe("KHONG_CO_DU_LIEU");
  });

  it("61. Có thẻ mở nhưng không thẻ nào làm chậm COD → chỉ một dòng đếm nói rõ", () => {
    const kq = ketQuaVanDeNoiBat(a, gom(0, 7));
    expect(kq.banGhi).toHaveLength(1);
    expect(String(kq.banGhi![0].van_de)).toBe("Không có vấn đề nào làm chậm COD. Còn 7 vấn đề khác đang mở — xem ở màn Cảnh báo của Main.");
  });

  it("62. Mã WBS luôn kèm tên việc (luật 30)", () => {
    const g = gom(0, 1);
    g.vanDe = [vanDe(1, { wbs: "6.1.4", tenWbs: "Cung cấp Hub, Nacelle, Blade. Drive Train", tieuDe: "chưa khởi công, dời 41 ngày" })];
    const kq = ketQuaVanDeNoiBat(a, g);
    expect(String(kq.banGhi![0].van_de)).toMatch(/^6\.1\.4 Cung cấp Hub, Nacelle, Blade · chưa khởi công/);
  });
});

describe("Bản 2 (13/10) — ẩn dự án chưa có dữ liệu", () => {
  function ketQuaBaDuAn(): { k: BaoCaoThang; kq: KetQuaLuot[] } {
    const k = khung();
    const kq: KetQuaLuot[] = cacLuotHoiCanThiet(k).map((anhXa) => {
      const da = anhXa.thamSo.du_an;
      if (da === "HV" && anhXa.congCu === "tiendo.tom_tat_du_an") {
        return { anhXa, ok: true, moTaNguon: "tien-do · HV", banGhi: chuyenKhuon("tiendo.tom_tat_du_an", TOM_TAT_HV, {})! };
      }
      if (da === "HV" && anhXa.congCu === "tiendo.lich_su_du_bao") {
        return { anhXa, ok: true, moTaNguon: "so-cod · HV", banGhi: [{ nhan: "T09/2026", gia_tri: 0, chu: "COD dự báo 14/10/2027" }] };
      }
      // BT: có MỘT lượt hỏng vì agent hết giờ — KHÔNG phải "chưa có dữ liệu"
      if (da === "BT" && anhXa.congCu === "tiendo.tom_tat_du_an") return { anhXa, ok: false, maLoi: "HET_HAN_CHO", lyDo: "hết giờ" };
      return { anhXa, ok: false, maLoi: "KHONG_CO_DU_LIEU", lyDo: "chưa có dữ liệu" };
    });
    return { k, kq };
  }

  it("63. Mọi lượt hỏi của dự án đều «không có dữ liệu» → im lặng; có lượt hỏng vì lý do khác → KHÔNG im lặng", () => {
    const { k, kq } = ketQuaBaDuAn();
    expect(Array.from(duAnImLang(k.duAn, kq))).toEqual(["TT"]);
  });

  it("64. Dự án im lặng bị gỡ khỏi MỌI bảng và khối ◆, ghi lại ở duAnAn; ô Phạm vi đi theo", () => {
    const { k, kq } = ketQuaBaDuAn();
    const bc = anDuAnImLang(dienBaoCao(k, kq), kq);
    expect(bc.duAn.map((d) => d.ma)).toEqual(["HV", "BT"]);
    expect((bc.duAnAn ?? []).map((d) => d.ma)).toEqual(["TT"]);
    for (const b of moiBang(bc)) expect(b.dong.some((d) => d.duAn === "TT")).toBe(false);
    // khối ◆: TT im lặng → gỡ; BT chưa có lịch sử dự báo ("không có dữ liệu") → gỡ, không in câu lỗi; HV có điểm → giữ
    expect(bc.muc[0].khoiThem!.map((x) => x.duAn)).toEqual(["HV"]);
    expect(bc.muc[0].khoiThem![0].diem).toEqual([{ nhan: "T09/2026", giaTri: 0, chu: "COD dự báo 14/10/2027" }]);
    expect(hienO(oTrongBang(bc, "B1", "dau_bao_cao", "pham_vi"))).toBe("2 dự án: ĐG Hướng Việt, ĐG Ba Tầng 1");
    // BT hỏng vì hết giờ vẫn có dòng ở Bảng 3 kèm lý do — sự cố phải hiện ra
    expect(moiBang(bc).find((x) => x.ma === "B3")!.dong.map((d) => d.khoa)).toEqual(["HV", "BT"]);
    expect(baoCaoHopLe(bc).ok).toBe(true);
  });
});

describe("Bản 2 (13/10) — trình bày: hàng dự án thay cột dự án, hàng tổng trên cùng, bỏ cột trống", () => {
  function bcHaiDuAn(): BaoCaoThang {
    const k = khung();
    const hd = (da: string, ma: string, giaTri: number) => ({
      anhXa: timLuot(k, "hopdong.chi_phi_theo_hop_dong", da),
      ok: true,
      moTaNguon: `hop-dong · ${ma}`,
      banGhi: chuyenKhuon("hopdong.chi_phi_theo_hop_dong", { hop_dong: [{ ma, nha_thau: "Nhà thầu", gia_tri_hop_dong: giaTri }] }, {})!,
    });
    return dienBaoCao(k, [hd("HV", "HD-01", 100e9), hd("TT", "HD-02", 50e9)]);
  }
  const ten = (ma: string) => DU_AN.find((d) => d.ma === ma)?.ten ?? ma;

  it("65. Không còn cột Dự án; mỗi dự án một HÀNG tên, số cộng của dự án nằm ngay ở hàng đó", () => {
    const bay = trinhBayBang(moiBang(bcHaiDuAn()).find((x) => x.ma === "B8")!, ten);
    expect(bay.nhom).toBe(true);
    expect(bay.cot.map((c) => c.khoa)).not.toContain("du_an");
    const duAn = bay.hang.filter((h) => h.kieu === "du-an");
    expect(duAn.map((h) => h.nhan)).toEqual(["ĐG Hướng Việt", "ĐG Tân Thành"]);
    expect(hienO(duAn[0].o.gia_tri_hd!)).toBe("100 tỷ đ");
    expect(bay.hang.filter((h) => h.kieu === "thuong").map((h) => h.stt)).toEqual([1, 1]);
  });

  it("66. Luật 34: từ hai dự án trở lên, hàng TỔNG CỘNG là hàng ĐẦU TIÊN và cộng các hàng dự án", () => {
    const bay = trinhBayBang(moiBang(bcHaiDuAn()).find((x) => x.ma === "B8")!, ten);
    expect(bay.hang[0].kieu).toBe("tong-cong");
    expect(bay.hang[0].nhan).toBe("TỔNG CỘNG · 2 dự án");
    expect(hienO(bay.hang[0].o.gia_tri_hd!)).toBe("150 tỷ đ");
  });

  it("67. Luật 22: cột không có ô nào có số thì không in, gom tên về cotAn", () => {
    const bay = trinhBayBang(moiBang(bcHaiDuAn()).find((x) => x.ma === "B8")!, ten);
    expect(bay.cot.map((c) => c.khoa)).toEqual(["hop_dong", "nha_thau", "gia_tri_hd"]);
    expect(bay.cotAn).toContain("Sản lượng trong tháng");
    expect(bay.cotAn).toContain("Phiếu giá chờ");
  });

  it("68. Bảng phẳng (1 · 2 · 3) in nguyên, giữ cột Dự án của Bảng 3", () => {
    const bay = trinhBayBang(moiBang(khung()).find((x) => x.ma === "B3")!, ten);
    expect(bay.nhom).toBe(false);
    expect(bay.cot.map((c) => c.khoa)).toContain("du_an");
    expect(bay.hang).toHaveLength(3);
  });

  it("69. Bản Markdown và Excel dựng được; bảng nhóm không còn cột Dự án, không in ghi chú thiết kế", async () => {
    const bc = bcHaiDuAn();
    const md = xuatMarkdown(bc);
    expect(md).toContain("| Hợp đồng | Nhà thầu | Giá trị HĐ |");
    expect(md).toContain("| **TỔNG CỘNG · 2 dự án** |");
    expect(md).toContain("| **ĐG Hướng Việt** |");
    expect(md).not.toContain("PLAN mục");
    expect(md).not.toContain("DAC-TA");
    expect(md).not.toContain("Base.vn");
    const buf = await xuatXlsx(bc);
    expect(buf.length).toBeGreaterThan(2000);
  });

  it("70. So hai bản: đếm số ô có số / số dòng đổi theo từng bảng", () => {
    const truoc = dienBaoCao(khung(), []);
    const nay = bcHaiDuAn();
    const so = soHaiBan(truoc, nay);
    expect(so.coSo.nay).toBeGreaterThan(so.coSo.truoc);
    expect(so.bang.map((b) => b.soHieu)).toEqual([8]);
    expect(so.bang[0]).toMatchObject({ dongTruoc: 0, dongNay: 4 });
  });
});

describe("Bản 2 (13/10) — lỗi bắt được khi nhìn bản Word thật", () => {
  const ten = (ma: string) => DU_AN.find((d) => d.ma === ma)?.ten ?? ma;

  it("71. Dòng đếm của Bảng 10 in CÂU đếm, không in nhầm số thứ tự; 🤖 không soạn cho dòng đếm", () => {
    const k = khung();
    const a = timLuot(k, CC_VAN_DE_NOI_BAT, "HV");
    const bc = dienBaoCao(k, [ketQuaVanDeNoiBat(a, gom(2, 9))]);
    const b10 = moiBang(bc).find((x) => x.ma === "B10")!;
    const bay = trinhBayBang(b10, ten);
    const dem = bay.hang.filter((h) => h.kieu === "dem");
    expect(dem).toHaveLength(1);
    expect(dem[0].nhan).toBe("Còn 7 vấn đề khác đang mở — xem ở màn Cảnh báo của Main.");
    expect(bay.hang.filter((h) => h.kieu === "thuong").map((h) => h.stt)).toEqual([1, 2]);
    // ô trắng của dòng đếm không tính là "thiếu số liệu"
    const truoc = demO(bc).thieu;
    b10.dong = b10.dong.filter((d) => d.loai !== "dem");
    expect(demO(bc).thieu).toBe(truoc);
  });

  it("72. Dòng trong bảng xếp theo thứ tự DỰ ÁN của báo cáo, không theo lượt hỏi nào trả về trước", () => {
    const k = khung();
    const mot = (da: string, ma: string) => ({
      anhXa: timLuot(k, "hopdong.chi_phi_theo_hop_dong", da),
      ok: true,
      moTaNguon: "hop-dong",
      banGhi: chuyenKhuon("hopdong.chi_phi_theo_hop_dong", { hop_dong: [{ ma, nha_thau: "NT", gia_tri_hop_dong: 1e9 }] }, {})!,
    });
    // BT trả về trước HV
    const bc = dienBaoCao(k, [mot("BT", "HD-B"), mot("HV", "HD-A")]);
    const bay = trinhBayBang(moiBang(bc).find((x) => x.ma === "B8")!, ten);
    expect(bay.hang.filter((h) => h.kieu === "du-an").map((h) => h.nhan)).toEqual(["ĐG Hướng Việt", "ĐG Ba Tầng 1"]);
  });

  it("73. Tên vấn đề không lặp tên việc hai lần khi tiêu đề đã mở đầu bằng chính tên việc", () => {
    const g = gom(0, 1);
    g.vanDe = [vanDe(1, { wbs: "6.1.4", tenWbs: "Cung cấp Hub, Nacelle, Blade. Drive Train", tieuDe: "⛓ Cung cấp Hub, Nacelle, Blade. Drive Train đến cảng chưa khởi công" })];
    const kq = ketQuaVanDeNoiBat({ maAgent: "main", congCu: CC_VAN_DE_NOI_BAT, thamSo: { du_an: "HV" } }, g);
    expect(String(kq.banGhi![0].van_de)).toBe("6.1.4 · ⛓ Cung cấp Hub, Nacelle, Blade. Drive Train đến cảng chưa khởi công");
  });
});

