// Dạng luật code (luat/loai-luat.ts) trên dữ liệu DỰNG TAY: mỗi dạng có ca đạt / không đạt, lỗi chỉ đúng chỗ,
// kiemThamSo bắt tag sai, docThanhLoi đọc ra câu dùng nhãn thật.
import { describe, it, expect } from "vitest";
import { LOAI_LUAT, kiemThamSo, docThanhLoi, docSo, DINH_DANG_CO_SAN } from "@/lib/luat/loai-luat";
import type { DuLieuBaoCao, NguCanhKiem } from "@/lib/luat/types";
import type { DinhNghiaMauRutGon } from "@/lib/luat/types-them";

const MAU: DinhNghiaMauRutGon = {
  ma: "form-thu",
  ten: "Mẫu thử",
  o_nhap: [
    { tag: "nguoi_lap", nhan: "Người lập" },
    { tag: "ngay_lap", nhan: "Ngày lập", kieu: "ngay" },
    { tag: "dien_thoai", nhan: "Điện thoại" },
    { tag: "ty_le", nhan: "Tỷ lệ giải ngân" },
    { tag: "loai_bc", nhan: "Loại báo cáo" },
    { tag: "ghi_chu", nhan: "Ghi chú" },
  ],
  bang: [
    {
      tag: "bang_tien_do",
      nhan: "Tiến độ tổng thể",
      cot: [
        { tag: "stt", nhan: "STT" },
        { tag: "hang_muc", nhan: "Hạng mục" },
        { tag: "phan_tram_ht", nhan: "% HT" },
        { tag: "muc_do", nhan: "Mức độ" },
      ],
    },
    {
      tag: "bang_cong_viec",
      nhan: "Công việc",
      cot: [
        { tag: "ma_viec", nhan: "Mã việc" },
        { tag: "ten", nhan: "Công việc" },
        { tag: "phu_trach", nhan: "Người phụ trách" },
        { tag: "bat_dau", nhan: "Bắt đầu" },
        { tag: "ket_thuc", nhan: "Kết thúc" },
        { tag: "da_xong", nhan: "Đã xong" },
      ],
    },
  ],
  muc_bat_buoc: ["NHÂN SỰ", "TIẾN ĐỘ TỔNG THỂ", "CÔNG VIỆC"],
};

const CTX: NguCanhKiem = {
  mau_ma: "form-thu",
  ky_bao_cao: { tu: "2026-07-14", den: "2026-07-20" },
  gia_tri_chua_dien: ["......"],
  dinh_nghia_mau: MAU,
};

function bc(sua: Partial<DuLieuBaoCao> = {}): DuLieuBaoCao {
  return {
    o_nhap: {
      nguoi_lap: "Lý Thị Nga",
      ngay_lap: "21/07/2026",
      dien_thoai: "0912 345 678",
      ty_le: "41,5%",
      loai_bc: "Tuần",
      ghi_chu: "......",
    },
    bang: {
      bang_tien_do: [
        { stt: "1", hang_muc: "Móng trụ", phan_tram_ht: "41,5%", muc_do: "Cao" },
        { stt: "2", hang_muc: "Đường dây", phan_tram_ht: "100", muc_do: "tb" },
        { stt: "3", hang_muc: "", phan_tram_ht: "......", muc_do: "" }, // dòng trống của mẫu
      ],
      bang_cong_viec: [
        { ma_viec: "CV-2026-0001", ten: "GPMB Trụ T11", phu_trach: "BQLDA QT", bat_dau: "14/07/2026", ket_thuc: "05/08/2026", da_xong: "" },
        { ma_viec: "", ten: "Thi công móng", phu_trach: "SCI E&C; Phòng ĐT&PC", bat_dau: "01/07/2026", ket_thuc: "15/08/2026", da_xong: "x" },
        { ma_viec: "......", ten: "......", phu_trach: "......", bat_dau: "......", ket_thuc: "......", da_xong: "" },
      ],
    },
    tieu_de: ["I. NHÂN SỰ", "II. TIẾN ĐỘ TỔNG THỂ", "III. CÔNG VIỆC"],
    muc: [
      { tieu_de: "I. NHÂN SỰ", van_ban: "Tuần này tuyển thêm 2 kỹ sư giám sát." },
      { tieu_de: "II. TIẾN ĐỘ TỔNG THỂ", van_ban: "" },
      { tieu_de: "III. CÔNG VIỆC", van_ban: "" },
    ],
    ...sua,
  };
}

const kiem = (loai: string, ts: Record<string, unknown>, du: DuLieuBaoCao = bc(), ctx: NguCanhKiem = CTX) => {
  expect(kiemThamSo(loai, ts, MAU), `tham số ${loai}`).toEqual([]);
  return LOAI_LUAT[loai].kiem(du, ts, ctx);
};

const suaDong = (bang: string, i: number, sua: Record<string, string>) => {
  const d = bc();
  d.bang[bang][i] = { ...d.bang[bang][i], ...sua };
  return d;
};

describe("registry", () => {
  it("đủ 13 dạng với mã cố định (11 dạng gốc + tinh_toan, dong_tong), mỗi dạng có tên, mô tả, ví dụ, tham số", () => {
    expect(Object.keys(LOAI_LUAT).sort()).toEqual(
      [
        "o_co_gia_tri",
        "o_khop_mau",
        "so_sanh_ngay",
        "khoang_so",
        "bang_toi_thieu",
        "cot_bat_buoc",
        "thuoc_danh_sach",
        "neu_thi",
        "muc_co_noi_dung",
        "khong_trung",
        "phu_trach_hop_le",
        "tinh_toan",
        "dong_tong",
      ].sort(),
    );
    for (const [ma, l] of Object.entries(LOAI_LUAT)) {
      expect(l.ma).toBe(ma);
      expect(l.ten && l.mo_ta && l.vi_du).toBeTruthy();
      expect(l.tham_so.length).toBeGreaterThan(0);
      for (const t of l.tham_so) if (t.kieu === "cot") expect(l.tham_so.some((x) => x.khoa === t.theo_bang)).toBe(true);
    }
  });
});

describe("docSo", () => {
  it("hiểu cách viết số Việt Nam", () => {
    expect(docSo("41,5%")).toBe(41.5);
    expect(docSo("1.240")).toBe(1240);
    expect(docSo("1.421,5")).toBe(1421.5);
    expect(docSo("−0,12")).toBe(-0.12);
    expect(docSo("-2,7%")).toBe(-2.7);
    expect(docSo("12,5 tỷ")).toBe(12.5);
    expect(docSo("12,5 tỷ đồng")).toBe(12.5);
    expect(docSo("3.5")).toBe(3.5);
    expect(docSo("~80 triệu")).toBe(80);
    expect(docSo("75 MW")).toBe(75);
    expect(docSo("(2,7)")).toBe(-2.7);
    expect(docSo("1 240 000")).toBe(1240000);
    expect(docSo("21/07/2026")).toBeNull();
    expect(docSo("Chưa có")).toBeNull();
    expect(docSo("T8/2026")).toBeNull();
  });

  // Mr. Đại chốt 12/10/2026 (chốt 130): phần dấu đi qua MỘT bộ đọc lib/chung/doc-so — bảng ví dụ chung ở tests/unit/doc-so.test.ts
  it("phần dấu theo chuẩn số Việt Nam: dấu phẩy là thập phân, dấu chấm ngăn nhóm ba chữ số", () => {
    expect(docSo("1,240")).toBe(1.24);
    expect(docSo("1.240.000")).toBe(1240000);
    expect(docSo("166.000.000.000 đồng")).toBe(166000000000);
    expect(docSo("0,500")).toBe(0.5);
    // gõ kiểu Anh, chỉ MỘT cách hiểu → vẫn đọc
    expect(docSo("1.5")).toBe(1.5);
    expect(docSo("1,234.5")).toBe(1234.5);
    expect(docSo("1,200,000")).toBe(1200000);
    // bản cũ tự đoán dấu đọc sai ba kiểu này: 500 · 1234567 · 12345
    expect(docSo("0.500")).toBe(0.5);
    expect(docSo("1234.567")).toBe(1234.567);
    expect(docSo("1.234.5")).toBeNull();
    expect(docSo("1,234,5")).toBeNull();
    // phần vỏ giữ nguyên: đơn vị, ngoặc âm, dấu ~
    expect(docSo("(1.240,5 tỷ)")).toBe(-1240.5);
    expect(docSo("~1.200 m²")).toBe(1200);
  });
});

describe("o_co_gia_tri", () => {
  it("đạt khi ô có giá trị", () => {
    expect(kiem("o_co_gia_tri", { o: "nguoi_lap" })).toEqual([]);
  });
  it('không đạt khi còn "......" hoặc trống, hoặc mất ô', () => {
    expect(kiem("o_co_gia_tri", { o: "ghi_chu" })).toEqual([{ thong_diep: 'Ô "Ghi chú" còn để "......", cần điền', vi_tri: { tag: "ghi_chu" } }]);
    const d = bc();
    d.o_nhap.nguoi_lap = "  ";
    expect(kiem("o_co_gia_tri", { o: "nguoi_lap" }, d)[0].thong_diep).toBe('Ô "Người lập" chưa điền');
    delete d.o_nhap.nguoi_lap;
    expect(kiem("o_co_gia_tri", { o: "nguoi_lap" }, d)[0].thong_diep).toMatch(/Không thấy ô "Người lập"/);
  });
});

describe("o_khop_mau", () => {
  it("định dạng có sẵn: số điện thoại, ngày, mã việc (cột)", () => {
    expect(kiem("o_khop_mau", { tham_chieu: { o: "dien_thoai" }, dinh_dang: "so_dien_thoai" })).toEqual([]);
    expect(kiem("o_khop_mau", { tham_chieu: { o: "ngay_lap" }, dinh_dang: "ngay" })).toEqual([]);
    // dòng 2 mã việc trống: bỏ qua; dòng 3 toàn "......": không tính
    expect(kiem("o_khop_mau", { tham_chieu: { bang: "bang_cong_viec", cot: "ma_viec" }, dinh_dang: "ma_viec" })).toEqual([]);
  });
  it("không đạt: chỉ đúng ô / đúng dòng", () => {
    const d = bc();
    d.o_nhap.dien_thoai = "12345";
    d.o_nhap.ngay_lap = "31/02/2026";
    expect(kiem("o_khop_mau", { tham_chieu: { o: "dien_thoai" }, dinh_dang: "so_dien_thoai" }, d)).toEqual([
      { thong_diep: 'Ô "Điện thoại" = "12345", phải đúng định dạng số điện thoại (vd 0912 345 678)', vi_tri: { tag: "dien_thoai" } },
    ]);
    expect(kiem("o_khop_mau", { tham_chieu: { o: "ngay_lap" }, dinh_dang: "ngay" }, d)).toHaveLength(1);
    const d2 = suaDong("bang_cong_viec", 1, { ma_viec: "VIEC-12" });
    expect(kiem("o_khop_mau", { tham_chieu: { bang: "bang_cong_viec", cot: "ma_viec" }, dinh_dang: "ma_viec" }, d2)).toEqual([
      {
        thong_diep: 'Dòng 2 bảng "Công việc": cột "Mã việc" = "VIEC-12", phải đúng định dạng mã việc (vd CV-2026-0412)',
        vi_tri: { bang: "bang_cong_viec", dong: 2, cot: "ma_viec" },
      },
    ]);
  });
  it("regex tự viết", () => {
    expect(kiem("o_khop_mau", { tham_chieu: { o: "loai_bc" }, regex: "^(Tuần|Tháng)$" })).toEqual([]);
    expect(kiem("o_khop_mau", { tham_chieu: { o: "loai_bc" }, regex: "/^thang$/i" })).toHaveLength(1);
  });
  it("có đủ định dạng có sẵn", () => {
    expect(DINH_DANG_CO_SAN.map((d) => d.ma)).toEqual(expect.arrayContaining(["so_dien_thoai", "ma_viec", "ngay"]));
  });
});

describe("so_sanh_ngay", () => {
  const ts = { a: { bang: "bang_cong_viec", cot: "bat_dau" }, phep: "<=", b: { bang: "bang_cong_viec", cot: "ket_thuc" } };
  it("cột ↔ cột cùng dòng: đạt", () => {
    expect(kiem("so_sanh_ngay", ts)).toEqual([]);
  });
  it("cột ↔ cột cùng dòng: không đạt đúng dòng", () => {
    const d = suaDong("bang_cong_viec", 1, { bat_dau: "20/08/2026" });
    expect(kiem("so_sanh_ngay", ts, d)).toEqual([
      {
        thong_diep: 'Dòng 2 bảng "Công việc": cột "Bắt đầu" (20/08/2026) phải trước hoặc bằng cột "Kết thúc" (15/08/2026)',
        vi_tri: { bang: "bang_cong_viec", dong: 2, cot: "bat_dau" },
      },
    ]);
  });
  it("lệch ngày: kết thúc không quá bắt đầu + 30 ngày", () => {
    const ts2 = { a: { bang: "bang_cong_viec", cot: "ket_thuc" }, phep: "<=", b: { bang: "bang_cong_viec", cot: "bat_dau" }, lech_ngay: 30 };
    const loi = kiem("so_sanh_ngay", ts2);
    // dòng 1: 14/07 → 05/08 (22 ngày) đạt; dòng 2: 01/07 → 15/08 (45 ngày) không đạt
    expect(loi).toHaveLength(1);
    expect(loi[0].vi_tri).toEqual({ bang: "bang_cong_viec", dong: 2, cot: "ket_thuc" });
    expect(loi[0].thong_diep).toContain('cột "Bắt đầu" + 30 ngày (31/07/2026)');
  });
  it("ô ↔ kỳ báo cáo (cấp tài liệu) và ô ngày không đọc được", () => {
    const tsKy = { a: { o: "ngay_lap" }, phep: ">=", b: { ky: "den" } };
    expect(kiem("so_sanh_ngay", tsKy)).toEqual([]);
    const d = bc();
    d.o_nhap.ngay_lap = "19/07/2026";
    expect(kiem("so_sanh_ngay", tsKy, d)).toEqual([
      { thong_diep: 'Ô "Ngày lập" (19/07/2026) phải sau hoặc bằng ngày cuối kỳ báo cáo (20/07/2026)', vi_tri: { tag: "ngay_lap" } },
    ]);
    d.o_nhap.ngay_lap = "32/07";
    expect(kiem("so_sanh_ngay", tsKy, d)[0].thong_diep).toMatch(/không đọc được thành ngày/);
  });
  it("dòng ĐÃ XONG: không so hạn (Kết thúc) với ô Ngày lập — chốt 29/09", () => {
    const d = bc();
    d.o_nhap.ngay_lap = "20/08/2026"; // dòng 1 hạn 05/08 (chưa xong) → báo; dòng 2 hạn 15/08 nhưng đã xong "x" → bỏ qua
    const loi = kiem("so_sanh_ngay", { a: { bang: "bang_cong_viec", cot: "ket_thuc" }, phep: ">=", b: { o: "ngay_lap" } }, d);
    expect(loi.map((l) => l.vi_tri?.dong)).toEqual([1]);
  });

  it("cột ↔ kỳ: mỗi dòng so với đầu kỳ", () => {
    const loi = kiem("so_sanh_ngay", { a: { bang: "bang_cong_viec", cot: "bat_dau" }, phep: ">=", b: { ky: "tu" } });
    expect(loi.map((l) => l.vi_tri)).toEqual([{ bang: "bang_cong_viec", dong: 2, cot: "bat_dau" }]);
  });
});

describe("khoang_so", () => {
  const ts = { tham_chieu: { bang: "bang_tien_do", cot: "phan_tram_ht" }, tu: 0, den: 100 };
  it("đạt (41,5% và 100; dòng trống bỏ qua)", () => {
    expect(kiem("khoang_so", ts)).toEqual([]);
    expect(kiem("khoang_so", { tham_chieu: { o: "ty_le" }, tu: 0, den: 100 })).toEqual([]);
  });
  it("không đạt: báo đúng câu mẫu", () => {
    const d = bc();
    d.bang.bang_tien_do.push({ stt: "4", hang_muc: "Trạm", phan_tram_ht: "120", muc_do: "Cao" });
    d.bang.bang_tien_do[0].phan_tram_ht = "−0,12";
    const loi = kiem("khoang_so", ts, d);
    expect(loi).toEqual([
      { thong_diep: 'Dòng 1 bảng "Tiến độ tổng thể": cột "% HT" = −0,12, phải từ 0 đến 100', vi_tri: { bang: "bang_tien_do", dong: 1, cot: "phan_tram_ht" } },
      { thong_diep: 'Dòng 4 bảng "Tiến độ tổng thể": cột "% HT" = 120, phải từ 0 đến 100', vi_tri: { bang: "bang_tien_do", dong: 4, cot: "phan_tram_ht" } },
    ]);
  });
  it("chữ không phải số; chỉ giới hạn trên", () => {
    const d = bc();
    d.o_nhap.ty_le = "khoảng bốn mươi";
    expect(kiem("khoang_so", { tham_chieu: { o: "ty_le" }, den: 100 }, d)[0].thong_diep).toBe('Ô "Tỷ lệ giải ngân" = "khoảng bốn mươi" không phải số, phải không quá 100');
    d.o_nhap.ty_le = "12,5 tỷ";
    expect(kiem("khoang_so", { tham_chieu: { o: "ty_le" }, den: 10 }, d)).toHaveLength(1);
    expect(kiem("khoang_so", { tham_chieu: { o: "ty_le" }, den: 12.5 }, d)).toEqual([]);
  });
});

describe("bang_toi_thieu", () => {
  it("đạt: 2 dòng có nội dung (dòng toàn ...... không tính)", () => {
    expect(kiem("bang_toi_thieu", { bang: "bang_cong_viec", so_dong: 2 })).toEqual([]);
    expect(kiem("bang_toi_thieu", { bang: "bang_cong_viec" })).toEqual([]);
  });
  it("không đạt", () => {
    expect(kiem("bang_toi_thieu", { bang: "bang_cong_viec", so_dong: 3 })).toEqual([
      { thong_diep: 'Bảng "Công việc" mới có 2 dòng có nội dung, cần ít nhất 3 dòng', vi_tri: { bang: "bang_cong_viec" } },
    ]);
    const d = bc();
    d.bang.bang_cong_viec = [{ ma_viec: "", ten: "......", phu_trach: "", bat_dau: "", ket_thuc: "", da_xong: "" }];
    expect(kiem("bang_toi_thieu", { bang: "bang_cong_viec" }, d)[0].thong_diep).toBe('Bảng "Công việc" chưa có dòng nào có nội dung, cần ít nhất 1 dòng');
    // dòng chỉ có số thứ tự cũng không tính
    d.bang.bang_tien_do = [{ stt: "1", hang_muc: "", phan_tram_ht: "", muc_do: "" }];
    expect(kiem("bang_toi_thieu", { bang: "bang_tien_do" }, d)).toHaveLength(1);
    delete (d.bang as Record<string, unknown>).bang_tien_do;
    expect(kiem("bang_toi_thieu", { bang: "bang_tien_do" }, d)[0].thong_diep).toMatch(/Không thấy bảng "Tiến độ tổng thể"/);
  });
});

describe("cot_bat_buoc", () => {
  it("đạt", () => {
    expect(kiem("cot_bat_buoc", { bang: "bang_cong_viec", cot: "phu_trach" })).toEqual([]);
  });
  it("không đạt: dòng có nội dung mà cột trống / còn ......", () => {
    expect(kiem("cot_bat_buoc", { bang: "bang_cong_viec", cot: "ma_viec" })).toEqual([
      { thong_diep: 'Dòng 2 bảng "Công việc": cột "Mã việc" chưa điền', vi_tri: { bang: "bang_cong_viec", dong: 2, cot: "ma_viec" } },
    ]);
    const d = suaDong("bang_cong_viec", 0, { ket_thuc: "......" });
    expect(kiem("cot_bat_buoc", { bang: "bang_cong_viec", cot: "ket_thuc" }, d)[0].thong_diep).toBe('Dòng 1 bảng "Công việc": cột "Kết thúc" còn để "......", cần điền');
  });
});

describe("thuoc_danh_sach", () => {
  const ts = { tham_chieu: { bang: "bang_tien_do", cot: "muc_do" }, danh_sach: ["Cao", "TB", "Thấp"] };
  it("đạt (không phân biệt hoa thường: 'tb')", () => {
    expect(kiem("thuoc_danh_sach", ts)).toEqual([]);
  });
  it("không đạt; bỏ dấu tùy chọn", () => {
    const d = suaDong("bang_tien_do", 0, { muc_do: "Thap" });
    expect(kiem("thuoc_danh_sach", ts, d)).toEqual([
      { thong_diep: 'Dòng 1 bảng "Tiến độ tổng thể": cột "Mức độ" = "Thap", phải là một trong: Cao, TB, Thấp', vi_tri: { bang: "bang_tien_do", dong: 1, cot: "muc_do" } },
    ]);
    expect(kiem("thuoc_danh_sach", { ...ts, bo_dau: true }, d)).toEqual([]);
    expect(kiem("thuoc_danh_sach", { tham_chieu: { o: "loai_bc" }, danh_sach: ["tuần", "tháng"] })).toEqual([]);
    expect(kiem("thuoc_danh_sach", { tham_chieu: { o: "loai_bc" }, danh_sach: ["Quý"] })).toHaveLength(1);
  });
});

describe("neu_thi", () => {
  const ts = {
    neu: { tham_chieu: { bang: "bang_cong_viec", cot: "da_xong" }, phep: "co_gia_tri" },
    thi: { tham_chieu: { bang: "bang_cong_viec", cot: "ma_viec" }, phep: "co_gia_tri" },
  };
  it("cùng dòng: đạt khi điều kiện nếu không xảy ra hoặc thì đúng", () => {
    const d = suaDong("bang_cong_viec", 1, { ma_viec: "CV-2026-0002" });
    expect(kiem("neu_thi", ts, d)).toEqual([]);
  });
  it("cùng dòng: không đạt đúng dòng", () => {
    expect(kiem("neu_thi", ts)).toEqual([
      {
        thong_diep: 'Dòng 2 bảng "Công việc": vì cột "Đã xong" có giá trị nên cột "Mã việc" phải có giá trị (đang trống)',
        vi_tri: { bang: "bang_cong_viec", dong: 2, cot: "ma_viec" },
      },
    ]);
  });
  it("cấp tài liệu (ô → ô) và phép so số", () => {
    const tsO = { neu: { tham_chieu: { o: "loai_bc" }, phep: "bang", gia_tri: "tuần" }, thi: { tham_chieu: { o: "ty_le" }, phep: "<=", gia_tri: 50 } };
    expect(kiem("neu_thi", tsO)).toEqual([]);
    const d = bc();
    d.o_nhap.ty_le = "60%";
    expect(kiem("neu_thi", tsO, d)).toEqual([
      { thong_diep: 'Vì ô "Loại báo cáo" là "tuần" nên ô "Tỷ lệ giải ngân" phải không quá 50 (đang là "60%")', vi_tri: { tag: "ty_le" } },
    ]);
    d.o_nhap.loai_bc = "Tháng";
    expect(kiem("neu_thi", tsO, d)).toEqual([]);
  });
  it("vế 'thì' là phép so (≤ ≥ < >) mà ô còn trống: không báo — ô trống do luật 'phải có giá trị' kiểm (soát 29/09)", () => {
    const tsO = { neu: { tham_chieu: { o: "loai_bc" }, phep: "bang", gia_tri: "tuần" }, thi: { tham_chieu: { o: "ty_le" }, phep: "<=", gia_tri: 50 } };
    const d = bc();
    d.o_nhap.ty_le = "";
    expect(kiem("neu_thi", tsO, d)).toEqual([]);
    // còn vế "phải có giá trị" thì ô trống vẫn bị báo
    expect(kiem("neu_thi", { ...tsO, thi: { tham_chieu: { o: "ty_le" }, phep: "co_gia_tri" } }, d)).toHaveLength(1);
  });
  it("nếu trên cột, thì trên ô: có dòng thỏa thì ô phải thỏa", () => {
    const t = { neu: { tham_chieu: { bang: "bang_tien_do", cot: "muc_do" }, phep: "bang", gia_tri: "cao" }, thi: { tham_chieu: { o: "ghi_chu" }, phep: "co_gia_tri" } };
    const loi = kiem("neu_thi", t);
    expect(loi).toHaveLength(1);
    expect(loi[0].vi_tri).toEqual({ tag: "ghi_chu" });
    expect(loi[0].thong_diep).toContain("Dòng 1 bảng");
  });
});

describe("muc_co_noi_dung", () => {
  it("đạt: mục có chữ thật; mục chỉ gồm bảng gắn mã có nhãn trùng tiêu đề cũng đạt", () => {
    expect(kiem("muc_co_noi_dung", { muc: "NHÂN SỰ", so_ky_tu: 20 })).toEqual([]);
    expect(kiem("muc_co_noi_dung", { muc: "TIẾN ĐỘ TỔNG THỂ" })).toEqual([]);
  });
  it('không đạt: trống, chỉ "......", ít ký tự, không có mục', () => {
    const d = bc();
    d.muc![0].van_ban = "...... \n .......";
    expect(kiem("muc_co_noi_dung", { muc: "NHÂN SỰ" }, d)).toEqual([{ thong_diep: 'Mục "I. NHÂN SỰ" chưa có nội dung', vi_tri: { tag: "muc:NHÂN SỰ" } }]);
    d.muc![0].van_ban = "Không có ......";
    expect(kiem("muc_co_noi_dung", { muc: "NHÂN SỰ", so_ky_tu: 20 }, d)[0].thong_diep).toBe('Mục "I. NHÂN SỰ" mới có 7 ký tự nội dung, cần ít nhất 20');
    d.muc = d.muc!.slice(1);
    expect(kiem("muc_co_noi_dung", { muc: "NHÂN SỰ" }, d)[0].thong_diep).toBe('Không thấy mục "NHÂN SỰ" trong báo cáo');
  });
});

describe("khong_trung", () => {
  it("đạt", () => {
    expect(kiem("khong_trung", { bang: "bang_cong_viec", cot: "ma_viec" })).toEqual([]);
  });
  it("không đạt: báo dòng trùng sau (không phân biệt hoa thường, bỏ dấu tùy chọn)", () => {
    const d = suaDong("bang_cong_viec", 1, { ma_viec: "cv-2026-0001", ten: "gpmb trụ t11" });
    expect(kiem("khong_trung", { bang: "bang_cong_viec", cot: "ma_viec" }, d)).toEqual([
      { thong_diep: 'Dòng 2 bảng "Công việc": cột "Mã việc" = "cv-2026-0001" trùng với dòng 1', vi_tri: { bang: "bang_cong_viec", dong: 2, cot: "ma_viec" } },
    ]);
    const d2 = suaDong("bang_cong_viec", 1, { ten: "GPMB Tru T11" });
    expect(kiem("khong_trung", { bang: "bang_cong_viec", cot: "ten" }, d2)).toEqual([]);
    expect(kiem("khong_trung", { bang: "bang_cong_viec", cot: "ten", bo_dau: true }, d2)).toHaveLength(1);
  });
});

describe("phu_trach_hop_le", () => {
  const biet = new Set(["bqlda qt", "sci e&c", "phòng đt&pc", "p. đt&pc"]);
  const ctx: NguCanhKiem = { ...CTX, phan_giai_ten: (t) => biet.has(t.toLowerCase()) };
  it("đạt: mọi tên (tách ; , + và trong ngoặc) đều phân giải được", () => {
    expect(kiem("phu_trach_hop_le", { bang: "bang_cong_viec" }, bc(), ctx)).toEqual([]);
    const d = suaDong("bang_cong_viec", 0, { phu_trach: "BQLDA QT (P. ĐT&PC)" });
    expect(kiem("phu_trach_hop_le", { bang: "bang_cong_viec", cot: "phu_trach" }, d, ctx)).toEqual([]);
  });
  it("không đạt: chỉ ra tên lạ, đúng dòng; không có danh bạ thì bỏ qua", () => {
    const d = suaDong("bang_cong_viec", 1, { phu_trach: "SCI E&C + Các GS trưởng công trường" });
    expect(kiem("phu_trach_hop_le", { bang: "bang_cong_viec" }, d, ctx)).toEqual([
      {
        thong_diep: 'Dòng 2 bảng "Công việc": cột "Người phụ trách" có "Các GS trưởng công trường" không nhận ra là đơn vị hay người trong hệ thống',
        vi_tri: { bang: "bang_cong_viec", dong: 2, cot: "phu_trach" },
      },
    ]);
    expect(kiem("phu_trach_hop_le", { bang: "bang_cong_viec" }, d, CTX)).toEqual([]);
  });
});

describe("không có định nghĩa mẫu trong ngữ cảnh: lời báo dùng tag", () => {
  it("khoang_so", () => {
    const ctx = { ...CTX, dinh_nghia_mau: undefined };
    const d = bc();
    d.bang.bang_tien_do[1].phan_tram_ht = "101";
    expect(LOAI_LUAT.khoang_so.kiem(d, { tham_chieu: { bang: "bang_tien_do", cot: "phan_tram_ht" }, tu: 0, den: 100 }, ctx)[0].thong_diep).toBe(
      'Dòng 2 bảng "bang_tien_do": cột "phan_tram_ht" = 101, phải từ 0 đến 100',
    );
  });
});

describe("kiemThamSo", () => {
  it("dạng không có, thiếu tham số, sai kiểu", () => {
    expect(kiemThamSo("khong_co", {}, null)[0]).toMatch(/Không có dạng luật "khong_co"/);
    expect(kiemThamSo("cot_bat_buoc", { bang: "bang_cong_viec" }, MAU)).toEqual(['Thiếu tham số "Cột phải điền" (cot)']);
    expect(kiemThamSo("khoang_so", { tham_chieu: { o: "ty_le" }, tu: "abc" }, MAU)[0]).toMatch(/phải là số/);
    expect(kiemThamSo("so_sanh_ngay", { a: { o: "ngay_lap" }, phep: "~", b: { ky: "den" } }, MAU)[0]).toMatch(/Phép so/);
    expect(kiemThamSo("thuoc_danh_sach", { tham_chieu: { o: "loai_bc" }, danh_sach: "Cao" }, MAU)[0]).toMatch(/danh sách/);
    expect(kiemThamSo("o_khop_mau", { tham_chieu: { ky: "tu" }, dinh_dang: "ngay" }, MAU)[0]).toMatch(/không trỏ tới kỳ báo cáo/);
  });
  it("bắt tag ô / bảng / cột / mục không có trong mẫu", () => {
    expect(kiemThamSo("o_co_gia_tri", { o: "nguoi_lapp" }, MAU)).toEqual(['"Ô cần điền": ô "nguoi_lapp" không có trong mẫu Mẫu thử']);
    expect(kiemThamSo("bang_toi_thieu", { bang: "bang_viec" }, MAU)).toEqual(['"Bảng": bảng "bang_viec" không có trong mẫu Mẫu thử']);
    expect(kiemThamSo("cot_bat_buoc", { bang: "bang_cong_viec", cot: "nguoi" }, MAU)).toEqual(['"Cột phải điền": bảng "Công việc" không có cột "nguoi"']);
    expect(kiemThamSo("khoang_so", { tham_chieu: { bang: "bang_tien_do", cot: "ht" }, den: 100 }, MAU)[0]).toMatch(/không có cột "ht"/);
    expect(kiemThamSo("muc_co_noi_dung", { muc: "TÀI CHÍNH" }, MAU)[0]).toMatch(/mục "TÀI CHÍNH" không có trong mẫu/);
    expect(
      kiemThamSo("neu_thi", { neu: { tham_chieu: { o: "khong_co" }, phep: "co_gia_tri" }, thi: { tham_chieu: { o: "ghi_chu" }, phep: "co_gia_tri" } }, MAU)[0],
    ).toMatch(/ô "khong_co" không có trong mẫu/);
  });
  it("mau null: chỉ kiểm cú pháp", () => {
    expect(kiemThamSo("o_co_gia_tri", { o: "tag_bat_ky" }, null)).toEqual([]);
    expect(kiemThamSo("cot_bat_buoc", { bang: "b", cot: "c" }, null)).toEqual([]);
    expect(kiemThamSo("o_co_gia_tri", { o: 12 }, null)[0]).toMatch(/phải là tag ô/);
  });
  it("ràng buộc riêng từng dạng", () => {
    expect(kiemThamSo("khoang_so", { tham_chieu: { o: "ty_le" } }, MAU)).toEqual(["Cần ít nhất một đầu khoảng: từ hoặc đến"]);
    expect(kiemThamSo("khoang_so", { tham_chieu: { o: "ty_le" }, tu: 100, den: 0 }, MAU)[0]).toMatch(/Khoảng sai/);
    expect(kiemThamSo("o_khop_mau", { tham_chieu: { o: "ty_le" } }, MAU)[0]).toMatch(/định dạng có sẵn hoặc/);
    expect(kiemThamSo("o_khop_mau", { tham_chieu: { o: "ty_le" }, regex: "([a-" }, MAU)[0]).toMatch(/sai cú pháp/);
    expect(kiemThamSo("o_khop_mau", { tham_chieu: { o: "ty_le" }, dinh_dang: "fax" }, MAU)[0]).toMatch(/không có sẵn/);
    expect(kiemThamSo("bang_toi_thieu", { bang: "bang_cong_viec", so_dong: 0 }, MAU)[0]).toMatch(/số nguyên từ 1/);
    expect(kiemThamSo("so_sanh_ngay", { a: { bang: "bang_cong_viec", cot: "bat_dau" }, phep: "<=", b: { bang: "bang_tien_do", cot: "hang_muc" } }, MAU)[0]).toMatch(
      /hai bảng khác nhau/,
    );
    expect(kiemThamSo("so_sanh_ngay", { a: { o: "ngay_lap" }, phep: "<=", b: { o: "ngay_lap" } }, MAU)[0]).toMatch(/cùng một chỗ/);
    expect(kiemThamSo("neu_thi", { neu: { tham_chieu: { o: "ty_le" }, phep: ">" }, thi: { tham_chieu: { o: "ghi_chu" }, phep: "co_gia_tri" } }, MAU)[0]).toMatch(
      /thiếu giá trị/,
    );
    expect(kiemThamSo("neu_thi", { neu: { tham_chieu: { o: "ty_le" }, phep: ">", gia_tri: "nhiều" }, thi: { tham_chieu: { o: "ghi_chu" }, phep: "co_gia_tri" } }, MAU)[0]).toMatch(
      /cần giá trị là số hoặc ngày/,
    );
  });
});

describe("docThanhLoi", () => {
  const doc = (loai: string, ts: Record<string, unknown>) => docThanhLoi(loai, ts, MAU);
  it("đọc ra câu dùng nhãn thật", () => {
    expect(doc("khoang_so", { tham_chieu: { bang: "bang_tien_do", cot: "phan_tram_ht" }, tu: 0, den: 100 })).toBe('Cột "% HT" của bảng "Tiến độ tổng thể" phải từ 0 đến 100');
    expect(doc("khoang_so", { tham_chieu: { o: "ty_le" }, tu: 0.5 })).toBe('Ô "Tỷ lệ giải ngân" phải từ 0,5 trở lên');
    expect(doc("o_co_gia_tri", { o: "nguoi_lap" })).toBe('Ô "Người lập" phải được điền (không để trống hay "......")');
    expect(doc("o_khop_mau", { tham_chieu: { bang: "bang_cong_viec", cot: "ma_viec" }, dinh_dang: "ma_viec" })).toBe(
      'Cột "Mã việc" của bảng "Công việc" phải đúng định dạng mã việc (vd CV-2026-0412)',
    );
    expect(doc("so_sanh_ngay", { a: { bang: "bang_cong_viec", cot: "bat_dau" }, phep: "<=", b: { bang: "bang_cong_viec", cot: "ket_thuc" } })).toBe(
      'Ở mỗi dòng bảng "Công việc": cột "Bắt đầu" phải trước hoặc bằng cột "Kết thúc"',
    );
    expect(doc("so_sanh_ngay", { a: { o: "ngay_lap" }, phep: ">=", b: { ky: "den" }, lech_ngay: -2 })).toBe('Ô "Ngày lập" phải sau hoặc bằng ngày cuối kỳ báo cáo − 2 ngày');
    expect(doc("bang_toi_thieu", { bang: "bang_cong_viec" })).toBe('Bảng "Công việc" phải có ít nhất 1 dòng có nội dung');
    expect(doc("cot_bat_buoc", { bang: "bang_cong_viec", cot: "phu_trach" })).toBe('Mỗi dòng có nội dung của bảng "Công việc" phải điền cột "Người phụ trách"');
    expect(doc("thuoc_danh_sach", { tham_chieu: { bang: "bang_tien_do", cot: "muc_do" }, danh_sach: ["Cao", "TB"], bo_dau: true })).toBe(
      'Cột "Mức độ" của bảng "Tiến độ tổng thể" phải là một trong: Cao, TB (không phân biệt hoa thường, bỏ qua dấu)',
    );
    expect(
      doc("neu_thi", {
        neu: { tham_chieu: { bang: "bang_cong_viec", cot: "da_xong" }, phep: "co_gia_tri" },
        thi: { tham_chieu: { bang: "bang_cong_viec", cot: "ket_thuc" }, phep: "co_gia_tri" },
      }),
    ).toBe('Ở mỗi dòng bảng "Công việc": nếu cột "Đã xong" có giá trị thì cột "Kết thúc" phải có giá trị');
    expect(doc("neu_thi", { neu: { tham_chieu: { o: "loai_bc" }, phep: "bang", gia_tri: "Tháng" }, thi: { tham_chieu: { o: "ty_le" }, phep: ">=", gia_tri: 10 } })).toBe(
      'Nếu ô "Loại báo cáo" là "Tháng" thì ô "Tỷ lệ giải ngân" phải từ 10 trở lên',
    );
    expect(doc("muc_co_noi_dung", { muc: "nhân sự", so_ky_tu: 20 })).toBe('Mục "NHÂN SỰ" phải có nội dung thật (ít nhất 20 ký tự), không để trống hay chỉ có "......"');
    expect(doc("khong_trung", { bang: "bang_cong_viec", cot: "ma_viec" })).toBe('Cột "Mã việc" của bảng "Công việc" không được trùng giữa các dòng');
    expect(doc("phu_trach_hop_le", { bang: "bang_cong_viec" })).toBe(
      'Mỗi tên trong cột "Người phụ trách" của bảng "Công việc" phải là đơn vị hoặc người có trong hệ thống',
    );
  });
  it("không có mẫu: dùng tag; dạng lạ / tham số thiếu không ném lỗi", () => {
    expect(docThanhLoi("bang_toi_thieu", { bang: "bang_x", so_dong: 2 }, null)).toBe('Bảng "bang_x" phải có ít nhất 2 dòng có nội dung');
    expect(docThanhLoi("xyz", {}, null)).toMatch(/không có/);
    expect(() => docThanhLoi("neu_thi", {}, MAU)).not.toThrow();
    expect(() => docThanhLoi("so_sanh_ngay", {}, null)).not.toThrow();
    for (const ma of Object.keys(LOAI_LUAT)) expect(typeof docThanhLoi(ma, {}, null)).toBe("string");
  });
});

describe("khoang_so bỏ qua dấu gạch 'không có số'", () => {
  it("— / – / N/A không bị báo lỗi, chữ lạ vẫn bị báo", async () => {
    const { LOAI_LUAT } = await import("@/lib/luat/loai-luat");
    const bc = { o_nhap: {}, tieu_de: [], bang: { b: [{ x: "—" }, { x: "–" }, { x: "N/A" }, { x: "abc" }, { x: "150" }] } };
    const loi = LOAI_LUAT.khoang_so.kiem(bc, { tham_chieu: { bang: "b", cot: "x" }, tu: 0, den: 100 }, { mau_ma: null, gia_tri_chua_dien: ["......"] });
    expect(loi.map((l) => l.vi_tri?.dong)).toEqual([4, 5]);
  });
});

describe("so_sanh_ngay — hạn theo việc khác (đo 30/09, Form 10 BĐH Hướng Việt)", () => {
  const ts = { a: { bang: "bang_cong_viec", cot: "bat_dau" }, phep: "<=", b: { bang: "bang_cong_viec", cot: "ket_thuc" } };
  it('"3 ngày sau khi xong <việc>" là cách ghi hợp lệ: không báo "không đọc được thành ngày"', () => {
    const d = suaDong("bang_cong_viec", 0, { ket_thuc: "3 ngày sau khi xong Đổ bê tông móng trụ T9" });
    expect(kiem("so_sanh_ngay", ts, d)).toEqual([]);
  });
  it("chữ không phải ngày, không phải mốc việc: vẫn báo", () => {
    const d = suaDong("bang_cong_viec", 0, { ket_thuc: "tuần sau" });
    expect(kiem("so_sanh_ngay", ts, d)[0]?.thong_diep).toMatch(/không đọc được thành ngày/);
  });
});
