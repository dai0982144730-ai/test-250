// ⭐ 18/10/2026 — báo cáo tháng nối các nguồn mới (KE-HOACH/22 mục 10.2, phiên chính chốt):
//   Bảng 4 ← tiendo.tom_tat_du_an `hang_muc_cap_1[]` + `tong_hang_muc` (Tiến độ 9d23288)
//   Bảng 5 ← tiendo.khoi_luong_hang_muc `kl_thiet_ke` · `phan_tram_dat` · `kh_thang_sau` + `thang_sau`
//   Bảng 6, 7 ← phaply.ho_so_thieu `theo_ket_qua: true` → `trang_thai_nop` (Pháp lý b5898b6)
//   Bảng 11 ← tiendo.viec_trong_khoang (tháng tới) + base.viec_co_han_trong_khoang (tháng tới, agent Công việc 180c198)
//            + base.viec_qua_han — gộp, không lặp cùng một việc
// Hàm thuần, không gọi agent nào.
import { describe, expect, it } from "vitest";
import {
  cacLuotHoiCanThiet,
  dienBaoCao,
  docTrangThaiHoSo,
  duAnImLang,
  dungKhungBaoCao,
  hienO,
  laLuotMoiChuaMo,
  moiBang,
  type AnhXaNguon,
  type BaoCaoThang,
  type KetQuaLuot,
  type OSo,
} from "@/lib/bao-cao-thang/model";
import { doiThanhKetQua, kyThang } from "@/lib/bao-cao-thang/dung";
import { chuyenKhuon } from "@/lib/bao-cao-thang/khuon-agent";

const DU_AN = [
  { ma: "HV", ten: "ĐG Hướng Việt", giaiDoan: "Đang thi công" },
  { ma: "TT", ten: "ĐG Tân Thành", giaiDoan: "Chuẩn bị đầu tư" },
];
/** Kỳ 07/2026 → tháng tới 08/2026 */
const khung = (): BaoCaoThang => dungKhungBaoCao({ ky: kyThang(7, 2026), duAn: DU_AN, ngayLap: "01/08/2026" });
function luot(bc: BaoCaoThang, congCu: string, duAn: string): AnhXaNguon {
  const l = cacLuotHoiCanThiet(bc).find((x) => x.congCu === congCu && x.thamSo.du_an === duAn);
  if (!l) throw new Error(`Không có lượt ${congCu} ${duAn}`);
  return l;
}
const traDuoc = (anhXa: AnhXaNguon, duLieu: unknown): KetQuaLuot => ({
  anhXa,
  ok: true,
  moTaNguon: `${anhXa.congCu} · thử`,
  banGhi: chuyenKhuon(anhXa.congCu, duLieu, anhXa.thamSo)!,
});
const lyDo = (o: OSo | undefined): string => (o && !o.coSo ? o.lyDo : "");

describe("Tham số riêng từng công cụ + khoảng tháng tới", () => {
  it("bảng 6, 7 gửi theo_ket_qua; bảng 11 hỏi việc có hạn / mốc tiến độ trong THÁNG TỚI, việc quá hạn giữ kỳ báo cáo", () => {
    const k = khung();
    expect(luot(k, "phaply.ho_so_thieu", "TT").thamSo.theo_ket_qua).toBe(true);
    expect(luot(k, "phaply.ho_so_thieu", "HV").thamSo.theo_ket_qua).toBe(true);
    for (const cc of ["base.viec_co_han_trong_khoang", "tiendo.viec_trong_khoang"]) {
      const l = luot(k, cc, "HV");
      expect([l.thamSo.tu_ngay, l.thamSo.den_ngay, l.thamSo.ma_du_an]).toEqual(["2026-08-01", "2026-08-31", "HV"]);
    }
    expect([luot(k, "base.viec_qua_han", "HV").thamSo.tu_ngay, luot(k, "tiendo.duong_gang", "HV").thamSo.den_ngay]).toEqual(["2026-07-01", "2026-07-31"]);
    expect(luot(k, "tiendo.tom_tat_du_an", "HV").thamSo.theo_ket_qua).toBeUndefined();
  });
});

describe("Bảng 11 — gộp bốn nguồn, không lặp cùng một việc", () => {
  const VIEC_CV = { ma_viec_base: "CV-2026-0130", ten: "[ĐG Hướng Việt] Trình hồ sơ đấu nối", ten_nguoi_phu_trach: "Nguyễn Văn A", han: "2026-08-20" };

  it("việc agent Công việc có ở cả hai công cụ → MỘT dòng; mốc Tiến độ trùng việc găng → MỘT dòng; việc đã xong bị bỏ", () => {
    const k = khung();
    const bc = dienBaoCao(k, [
      traDuoc(luot(k, "tiendo.duong_gang", "HV"), {
        chuoi_gang: [{ wbs: "7.2.3", ten: "Thi công san nền", batDau: "2026-07-20", du_bao_xong: "2026-08-15", pct: 40, baseline_xong: "2026-08-07" }],
      }),
      traDuoc(luot(k, "tiendo.viec_trong_khoang", "HV"), {
        viec: [
          { ma_wbs: "7.2.3", ma_va_ten: "7.2.3 Thi công san nền", tren_duong_gang: true, da_xong: false, nha_thau: "TS", du_bao_xong: "2026-08-15", roi_vao: ["xong_du_bao", "xong_baseline"], cau_so_baseline: "Dự báo xong chậm 8 ngày so với Baseline", pct_thuc_te: 40 },
          { ma_wbs: "7.6.1", ma_va_ten: "7.6.1 Mốc đóng điện T1", la_moc: true, tren_duong_gang: false, da_xong: false, du_bao_xong: "2026-08-30", roi_vao: ["xong_du_bao"], cau_so_baseline: "Đúng hạn so với Baseline", pct_thuc_te: 0 },
          { ma_wbs: "1.1", ma_va_ten: "1.1 Đã xong", da_xong: true, du_bao_xong: "2026-08-02", roi_vao: ["xong_du_bao"] },
        ],
      }),
      traDuoc(luot(k, "base.viec_co_han_trong_khoang", "HV"), {
        viec: [{ ...VIEC_CV, trang_thai_chu: "đang làm — đã giao 12/07/2026", ma_wbs: "7.4.1", ten_wbs: "Đấu nối 110kV" }],
      }),
      traDuoc(luot(k, "base.viec_qua_han", "HV"), {
        viec: [
          { ...VIEC_CV, han: "2026-08-20", qua_han_ngay: 3 },
          { ma_viec_base: "CV-2026-0099", ten: "[ĐG Hướng Việt] Nộp hồ sơ ĐTM", ten_nguoi_phu_trach: "Trần B", han: "2026-05-02", qua_han_ngay: 77 },
        ],
      }),
    ]);
    const b11 = moiBang(bc).find((b) => b.ma === "B11")!;
    const cv = b11.dong.map((d) => hienO(d.o.cong_viec));
    expect(cv).toEqual(["7.2.3 Thi công san nền", "7.6.1 Mốc đóng điện T1", "CV-2026-0130 Trình hồ sơ đấu nối", "CV-2026-0099 Nộp hồ sơ ĐTM"]);
    const loai = b11.dong.map((d) => hienO(d.o.loai_viec));
    expect(loai[0]).toBe("Việc găng");
    expect(loai[1]).toBe("Mốc tiến độ");
    expect(hienO(b11.dong[1].o.ghi_chu)).toBe("tháng tới: xong (dự báo) · Đúng hạn so với Baseline");
    expect(hienO(b11.dong[3].o.ghi_chu)).toBe("quá hạn 77 ngày");
    expect(hienO(b11.dong[2].o.nguoi_phu_trach)).toBe("Nguyễn Văn A");
  });

  it("công cụ mới agent chưa mở (3004 / 3003 chưa dựng lại) → bỏ qua IM LẶNG, đường cũ vẫn ra dòng, không đếm là hỏng", () => {
    const k = khung();
    const chuaMo = (cc: string): KetQuaLuot => ({
      anhXa: luot(k, cc, "HV"),
      ok: false,
      maLoi: "KHONG_HIEU_YEU_CAU",
      lyDo: `base · ${cc}: không có công cụ "${cc}"`,
    });
    const ketQua = [
      chuaMo("base.viec_co_han_trong_khoang"),
      chuaMo("tiendo.viec_trong_khoang"),
      traDuoc(luot(k, "base.viec_qua_han", "HV"), { viec: [{ ...VIEC_CV, qua_han_ngay: 3 }] }),
    ];
    const bc = dienBaoCao(k, ketQua);
    const b11 = moiBang(bc).find((b) => b.ma === "B11")!;
    expect(b11.dong.map((d) => hienO(d.o.cong_viec))).toEqual(["CV-2026-0130 Trình hồ sơ đấu nối"]);
    expect(JSON.stringify(b11)).not.toMatch(/không có công cụ/);
    expect(ketQua.filter((x) => laLuotMoiChuaMo(x.anhXa, x))).toHaveLength(2);
    // Lỗi khác (agent tắt) của công cụ mới vẫn phải nói ra
    const tat: KetQuaLuot = { anhXa: luot(k, "base.viec_co_han_trong_khoang", "HV"), ok: false, maLoi: "AGENT_KHONG_SAN_SANG", lyDo: "agent Công việc tắt" };
    expect(laLuotMoiChuaMo(tat.anhXa, tat)).toBe(false);
    // Dự án chỉ có lượt «chưa mở» + «không có dữ liệu» vẫn được coi là im lặng (ẩn), không bị giữ lại vì «lỗi»
    const tt = (cc: string): KetQuaLuot => ({ anhXa: luot(k, cc, "TT"), ok: false, maLoi: cc.startsWith("base.viec_co") ? "KHONG_HIEU_YEU_CAU" : "KHONG_CO_DU_LIEU", lyDo: "x" });
    const cuaTT = cacLuotHoiCanThiet(k).filter((l) => l.thamSo.du_an === "TT").map((l) => tt(l.congCu));
    expect(duAnImLang(DU_AN, cuaTT).has("TT")).toBe(true);
  });
});

describe("Bảng 6, 7 — trạng thái NỘP tách 🔴 / 🟡", () => {
  it("đọc đủ bốn giá trị trang_thai_nop; chữ lạ vẫn null", () => {
    expect(["chua_nop", "da_nop_cho_ket_qua", "da_co_ket_qua", "chua_ro"].map(docTrangThaiHoSo)).toEqual(["chua_nop_duoc", "da_nop_cho_ket_qua", "da_co", "chua_ro"]);
    expect(docTrangThaiHoSo("thiếu")).toBeNull();
  });

  it("bảng 6 in 🔴 / 🟡 / đã có / chưa rõ; hàng tổng đếm theo trạng thái nộp; ngày nộp + lý do «chưa rõ» vào ghi chú", () => {
    const k = khung();
    const bc = dienBaoCao(k, [
      traDuoc(luot(k, "phaply.ho_so_thieu", "TT"), {
        so_thieu: 25,
        tong_ho_so_phai_co: 40,
        dem_trang_thai_nop: { chua_nop: 20, da_nop_cho_ket_qua: 3, da_co_ket_qua: 0, chua_ro: 2 },
        ho_so_thieu: [
          { ma_ho_so: "TT-K-01", ten: "Chấp thuận chủ trương", trang_thai_nop: "chua_nop", trang_thai_nop_chu: "Chưa nộp", trang_thai_do: "chua_thay" },
          { ma_ho_so: "TT-K-02", ten: "Thỏa thuận đấu nối", trang_thai_nop: "da_nop_cho_ket_qua", ngay_nop: "2026-07-05" },
          { ma_ho_so: "TT-K-03", ten: "Giấy phép môi trường", trang_thai_nop: "chua_ro", ly_do_trang_thai_nop: "có văn bản nghi khớp, chưa ai xác nhận" },
        ],
      }),
    ]);
    const b6 = moiBang(bc).find((b) => b.ma === "B6")!;
    const tong = b6.dong.find((d) => d.loai === "tong")!;
    expect(hienO(tong.o.ghi_chu)).toBe("Thiếu 25/40 hồ sơ phải có (chưa nộp 20 · đã nộp chờ kết quả 3 · chưa rõ 2) — in 3 hồ sơ gấp nhất");
    const thuong = b6.dong.filter((d) => d.loai !== "tong");
    expect(thuong.map((d) => hienO(d.o.trang_thai))).toEqual(["🔴 Chưa nộp được", "🟡 Đã nộp, chờ kết quả", "Chưa rõ đã nộp hay chưa"]);
    expect(hienO(thuong[1].o.ghi_chu)).toContain("nộp ngày 05/07/2026");
    expect(hienO(thuong[2].o.ghi_chu)).toContain("có văn bản nghi khớp, chưa ai xác nhận");
  });

  it("Pháp lý bản cũ (chưa có trang_thai_nop) → in trạng thái ĐO như trước 18/10", () => {
    const bg = chuyenKhuon("phaply.ho_so_thieu", { ho_so_thieu: [{ ma_ho_so: "X", ten: "Y", trang_thai_do: "chua_thay" }] }, {})!;
    expect(bg[1]).toMatchObject({ trang_thai: "chua_thay", trang_thai_chu: "Chưa thấy văn bản kết quả" });
  });
});

describe("Bảng 4, 5 — số mới của agent Tiến độ", () => {
  it("bảng 4: hàng hạng mục từ hang_muc_cap_1 (câu so với từng hệ), hàng tổng từ tong_hang_muc — cùng cơ sở", () => {
    const bg = chuyenKhuon(
      "tiendo.tom_tat_du_an",
      {
        pctTotal: 4.5,
        pctBaselineNgayCat: 15.2,
        cod_du_bao: "2027-09-30",
        tong_hang_muc: { pct_thuc_te: 14.3, pct_ke_hoach_baseline: 14, ly_do_chua_co: {} },
        pctNhom: [{ wbs: "7", ten: "cũ", pct: 1, pctBaseline: 2 }],
        hang_muc_cap_1: [
          { wbs: "7", ma_va_ten: "7 Thi công xây dựng và lắp đặt", pct_thuc_te: 20.1, pct_ke_hoach_baseline: 25, so_viec_la: 120, cau_so_muc_tieu: "Dự báo xong chậm 86 ngày so với Tiến độ mục tiêu", cau_so_baseline: "Dự báo xong chậm 44 ngày so với Baseline", ly_do_chua_co: {} },
          { wbs: "9", ma_va_ten: "9 Vận hành thử", pct_thuc_te: null, pct_ke_hoach_baseline: null, so_viec_la: 0, cau_so_muc_tieu: "", cau_so_baseline: "", ly_do_chua_co: { pct_thuc_te: "Hạng mục không có việc nào có thời lượng (chỉ có mốc) — không tính được %." } },
        ],
      },
      {},
    )!;
    expect(bg).toHaveLength(3);
    expect(bg[0]).toMatchObject({ __tong: true, th_luy_ke: 14.3, kh_luy_ke: 14 });
    // Bảng 3 nói CÙNG con số với hàng tổng bảng 4 (một số một nghĩa trong cùng báo cáo) — không còn 4,5% / 15,2% tới mốc COD
    expect(String(bg[0].tien_do)).toMatch(/^Hoàn thành 14,3% \(theo Baseline 14%\)/);
    const cu = chuyenKhuon("tiendo.tom_tat_du_an", { pctTotal: 4.5, pctBaselineNgayCat: 15.2 }, {})!;
    expect(String(cu[0].tien_do)).toMatch(/^Hoàn thành 4,5% \(theo Baseline 15,2%\)/); // cổng cũ chưa có tong_hang_muc
    expect(bg[1]).toMatchObject({ hang_muc: "7 Thi công xây dựng và lắp đặt", th_luy_ke: 20.1, kh_luy_ke: 25, cham_baseline: "Dự báo xong chậm 44 ngày so với Baseline" });
    expect((bg[2].__ly_do as Record<string, string>).th_luy_ke).toMatch(/chỉ có mốc/);
    const k = khung();
    const b4 = moiBang(k).find((b) => b.ma === "B4")!;
    expect(b4.cot.find((c) => c.khoa === "th_luy_ke")!.nhan).toBe("TH lũy kế");
  });

  it("bảng 5: ba cột KL thiết kế · KH tháng sau · % đạt có số; ô trống mang câu agent Tiến độ; hàng dự án nói khoảng tháng sau kèm số ngày", () => {
    const k = khung();
    const bc = dienBaoCao(k, [
      traDuoc(luot(k, "tiendo.khoi_luong_hang_muc", "HV"), {
        thang_sau: { tu: "2026-08-01", den: "2026-08-31", so_ngay: 31 },
        dong: [
          { ma_wbs: "7.2.3", ten: "Đổ bê tông móng", don_vi: "m3", kl_trong_ky: 120, kl_luy_ke: 400, kl_thiet_ke: 1000, phan_tram_dat: 40, kh_thang_sau: 155.5, ly_do_chua_co: {} },
          { ma_wbs: "7.2.4", ten: "Cốt thép móng", don_vi: "tấn", kl_trong_ky: 5, kl_luy_ke: 9, kl_thiet_ke: null, phan_tram_dat: null, kh_thang_sau: null, ly_do_chua_co: { kl_thiet_ke: "Việc chưa khai khối lượng thiết kế.", kh_thang_sau: "Dự án chưa có Baseline đã duyệt." } },
        ],
      }),
    ]);
    const b5 = moiBang(bc).find((b) => b.ma === "B5")!;
    const tong = b5.dong.find((d) => d.loai === "tong")!;
    expect(hienO(tong.o.ghi_chu)).toMatch(/^KH tháng sau: 31 ngày · 01\/08\/2026 – 31\/08\/2026/);
    const [a, b] = b5.dong.filter((d) => d.loai !== "tong");
    expect([a.o.kl_thiet_ke.coSo, a.o.kh_thang_sau.coSo, a.o.phan_tram_dat.coSo]).toEqual([true, true, true]);
    expect(lyDo(b.o.kl_thiet_ke)).toBe("Việc chưa khai khối lượng thiết kế.");
    expect(lyDo(b.o.kh_thang_sau)).toBe("Dự án chưa có Baseline đã duyệt.");
  });
});

describe("Bảng 8 — giá trị hợp đồng · đã thanh toán (agent Hợp đồng debb181)", () => {
  const CANH_BAO = [
    "Chi phí = lũy kế giá trị thực hiện đã lên phiếu giá (dòng A bảng E): trước thuế. `chi_phi_luy_ke` null = CHƯA CÓ SỐ.",
    "HD-548 Thi công đường nội bộ: phiếu PG-548.02 ghi cột «giá trị hợp đồng» 49.114.230.000 đ, KHÁC giá trị hợp đồng 21.886.655.000 đ (máy bóc từ chữ hợp đồng) — kiểm phụ lục điều chỉnh giá trị; máy giữ số theo hợp đồng.",
    "HD-NX-14 Tổng thầu EPC: đợt 3 có 2 phiếu giá (PG-1, PG-2) — có thể nạp trùng.",
  ];
  const DU_LIEU = {
    hop_dong: [
      { ma: "HD-548", ten: "Thi công đường nội bộ", nha_thau: "Việt Lào", gia_tri_hop_dong: 21886655000, chi_phi_luy_ke: 2828154092, da_thanh_toan: null, vi_sao_chua_co_da_thanh_toan: "Chưa phiếu giá nào được Giám đốc dự án ký ✍." },
      { ma: "HD-NX-14", ten: "Tổng thầu EPC", nha_thau: "PCC1", gia_tri_hop_dong: null, vi_sao_chua_co_gia_tri_hop_dong: "Hợp đồng chưa ghi số tiền bằng số.", chi_phi_luy_ke: 500000000000, da_thanh_toan: 490300722244 },
    ],
  };

  it("giá trị HĐ · % đã lên phiếu (code tính) · đã thanh toán; ô trống mang câu vi_sao_…; cảnh báo của đúng hợp đồng vào Ghi chú", () => {
    const bg = chuyenKhuon("hopdong.chi_phi_theo_hop_dong", DU_LIEU, {}, CANH_BAO)!;
    const [tong, a, b] = bg;
    expect(tong).toMatchObject({ __tong: true, gia_tri_hd: 21.887, da_thanh_toan: 490.301 });
    expect(a).toMatchObject({ hop_dong: "HD-548", gia_tri_hd: 21.887, da_thanh_toan_lk: 2.828, phan_tram_hd: 12.9, da_thanh_toan: null });
    expect(String(a.ghi_chu)).toMatch(/^phiếu PG-548\.02 ghi cột «giá trị hợp đồng» 49\.114\.230\.000 đ, KHÁC/);
    expect((a.__ly_do as Record<string, string>).da_thanh_toan).toBe("Chưa phiếu giá nào được Giám đốc dự án ký ✍.");
    expect(b).toMatchObject({ hop_dong: "HD-NX-14", gia_tri_hd: null, da_thanh_toan: 490.301, phan_tram_hd: null });
    expect((b.__ly_do as Record<string, string>).gia_tri_hd).toBe("Hợp đồng chưa ghi số tiền bằng số.");
    expect(String(b.ghi_chu)).toMatch(/^đợt 3 có 2 phiếu giá/);
    // câu định nghĩa chung (có tên trường kỹ thuật) không lọt vào dòng nào
    expect(JSON.stringify(bg)).not.toMatch(/chi_phi_luy_ke/);
  });

  it("bảng có cột «Đã thanh toán (theo phiếu đã ký)» · «% đã lên phiếu» · «% sản lượng» · «Ghi chú», câu dưới bảng nói rõ chưa phải tiền đã chi", () => {
    const b8 = moiBang(khung()).find((b) => b.ma === "B8")!;
    const nhan = b8.cot.map((c) => c.nhan);
    expect(nhan).toEqual(expect.arrayContaining(["Đã thanh toán (theo phiếu đã ký)", "% đã lên phiếu", "% sản lượng", "Ghi chú"]));
    expect(b8.ghiChuDuoiBang.join(" ")).toMatch(/theo phiếu đã ký, chưa phải số tiền đã chi/);
  });
});

describe("Bảng 9 — cam kết của MỌI hợp đồng trong dự án (agent Hợp đồng bcdf19c)", () => {
  const HOP_DONG = [
    { ma_hop_dong: "HD-548", ten: "Thi công đường nội bộ", nha_thau: "Việt Lào", co_so: true, tong_nhan_cong: 45, tong_may: 6, ly_do_chua_co: null },
    { ma_hop_dong: "HD-TVGS-15", ten: "Tư vấn giám sát", nha_thau: "TVGS Miền Bắc", co_so: false, tong_nhan_cong: null, tong_may: null, ly_do_chua_co: "Hợp đồng không có phụ lục nhân sự, thiết bị." },
  ];

  it("ok: in đủ hai hợp đồng; co_so:false thì ô trống mang câu ly_do_chua_co; số thực tế Tiến độ ghép đúng dòng", () => {
    const k = khung();
    const lCam = luot(k, "hopdong.cam_ket_nha_thau", "HV");
    const tra = { ok: true, du_lieu: { nha_thau: "Việt Lào", tong_nhan_cong: 45, tong_may: 6, hop_dong: HOP_DONG }, nguon: [{ loai: "hop-dong", ma: "HD-548", file_goc: "x" }], thoi_diem_tra_loi: "", canh_bao: [] };
    const bc = dienBaoCao(k, [
      doiThanhKetQua(lCam, tra as never),
      traDuoc(luot(k, "tiendo.nguon_luc_huy_dong", "HV"), { dong: [{ thau_phu: "Việt Lào", nhan_cong_binh_quan: 38, may_chinh_binh_quan: 5 }] }),
    ]);
    const dong = moiBang(bc).find((b) => b.ma === "B9")!.dong.filter((d) => !d.laDongGiuCho);
    expect(dong.map((d) => hienO(d.o.nha_thau))).toEqual(["Việt Lào", "TVGS Miền Bắc"]);
    expect([hienO(dong[0].o.nhan_luc_cam_ket), hienO(dong[0].o.nhan_luc_thuc_te), hienO(dong[0].o.thiet_bi_cam_ket)]).toEqual(["45 người", "38 người", "6 máy"]);
    expect(lyDo(dong[1].o.nhan_luc_cam_ket)).toBe("HD-TVGS-15: Hợp đồng không có phụ lục nhân sự, thiết bị.");
  });

  it("hợp đồng đầu không có số (ok:false) mà có mảng hop_dong cạnh thong_diep → vẫn in đủ, nguồn nói rõ lượt đó", () => {
    const k = khung();
    const lCam = luot(k, "hopdong.cam_ket_nha_thau", "HV");
    const kq = doiThanhKetQua(lCam, { ok: false, ma_loi: "KHONG_CO_DU_LIEU", thong_diep: "HD-TVGS-15 chưa có cam kết", hop_dong: [HOP_DONG[1], HOP_DONG[0]] } as never);
    expect(kq.ok).toBe(true);
    expect(kq.banGhi!.map((b) => b.nha_thau)).toEqual(["TVGS Miền Bắc", "Việt Lào"]);
    expect(kq.moTaNguon).toMatch(/hợp đồng HD-TVGS-15, HD-548 \(hợp đồng đầu: HD-TVGS-15 chưa có cam kết\)/);
    // cổng cũ (không có mảng) → rơi về bộ bóc chung như trước
    expect(chuyenKhuon("hopdong.cam_ket_nha_thau", { nha_thau: "X", tong_nhan_cong: 1 }, {})).toBeNull();
  });
});

describe("Bảng 8 — «% sản lượng» = sản lượng lũy kế ÷ giá trị HĐ (Mr. Đại gật 18/10, câu 9)", () => {
  it("dòng hợp đồng + hàng tổng tính từ TỔNG hai vế (không cộng %); thiếu vế nào thì ô trống nói đúng vế đó; ô mang agent Hợp đồng để lọc mật", () => {
    const k = khung();
    const bc = dienBaoCao(k, [
      traDuoc(luot(k, "hopdong.chi_phi_theo_hop_dong", "HV"), {
        hop_dong: [
          { ma: "HD-1", ten: "A", nha_thau: "X", gia_tri_hop_dong: 100e9, chi_phi_luy_ke: 20e9 },
          { ma: "HD-2", ten: "B", nha_thau: "Y", gia_tri_hop_dong: 50e9, chi_phi_luy_ke: 10e9 },
          { ma: "HD-3", ten: "C", nha_thau: "Z", gia_tri_hop_dong: null, vi_sao_chua_co_gia_tri_hop_dong: "Hợp đồng chưa ghi số tiền.", chi_phi_luy_ke: null },
        ],
      }),
      traDuoc(luot(k, "tiendo.san_luong_hop_dong", "HV"), {
        thang: [{ thang: "2026-07" }],
        tong_du_an: { thang: [0], luy_ke: 45e9 },
        hop_dong: [
          { ma: "HD-1", thang: [0], luy_ke: 30e9 },
          { ma: "HD-3", thang: [0], luy_ke: 5e9 },
        ],
      }),
    ]);
    const b8 = moiBang(bc).find((b) => b.ma === "B8")!;
    const theo = (ma: string) => b8.dong.find((d) => hienO(d.o.hop_dong) === ma)!;
    expect(hienO(theo("HD-1").o.phan_tram_hd)).toBe("20 %");
    expect(hienO(theo("HD-1").o.phan_tram_san_luong)).toBe("30 %");
    // hàng tổng: 45 tỷ ÷ 150 tỷ = 30% — không phải 30% + … cộng dồn
    const tong = b8.dong.find((d) => d.loai === "tong")!;
    expect(hienO(tong.o.phan_tram_san_luong)).toBe("30 %");
    expect(lyDo(theo("HD-2").o.phan_tram_san_luong)).toMatch(/chưa có sản lượng lũy kế/);
    expect(lyDo(theo("HD-3").o.phan_tram_san_luong)).toMatch(/chưa có giá trị HĐ \(Hợp đồng chưa ghi số tiền\.\)/);
    expect(theo("HD-1").o.phan_tram_san_luong.agentGoc).toBe("hopdong");
    expect(b8.ghiChuDuoiBang.join(" ")).toMatch(/phần đã làm mà chưa đòi tiền .* hoặc đã đòi tiền trước khi làm/);
  });
});
