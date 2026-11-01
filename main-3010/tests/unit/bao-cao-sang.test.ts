// ============================================================
// BÁO CÁO SÁNG — bộ test phần THUẦN (luat.ts + model.ts)
// MD: PLAN-MAIN-AGENT mục 6 · 7 · KE-HOACH/05 A.4
//
// Chỗ đáng test nhất của cả phần này là ĐỌC CÂU NHẮN RA HẠN HIỆU LỰC: đọc sai
// một câu là luật sống mãi thay vì rụng sau một ngày, và ba tháng sau có 90
// luật chồng nhau. Vì vậy nhóm test ⭐ dưới đây soi đúng cái đó.
//
// Mốc thời gian dùng ngày thật để kiểm cả thứ trong tuần:
//   04/09/2026 Thứ Sáu · 05/09 Thứ Bảy · 06/09 CHỦ NHẬT · 07/09 Thứ Hai
// ============================================================

import { describe, expect, it } from "vitest";
import {
  apDungLuat,
  boDau,
  chuDeCanBo,
  chuDeCanKy,
  chuNhatCuaTuan,
  chuanHoaLuat,
  conHieuLuc,
  congNgay,
  docCauNhan,
  laCauHoiLuat,
  laCauXoaLuat,
  locLuatConHieuLuc,
  locLuatHetHan,
  maLuat,
  moTaHieuLuc,
  ngayVn,
  nhanDienPhamVi,
  tinhHieuLucDen,
  type LuatBaoCao,
} from "@/lib/bao-cao-sang/luat";
import {
  NHIP_DINH_KY,
  THU_TU_MUC,
  cauGiaiThichSoNgay,
  coBatThuong,
  denGioChayNhip,
  dungKhung,
  hienSo,
  ketXuatTelegram,
  locDongCoNguon,
  soNgayNangNhat,
  taoDong,
  type BaoCaoSang,
  type DongBaoCao,
} from "@/lib/bao-cao-sang/model";
import { gioVn } from "@/lib/gio-vn";

/** Mốc UTC sao cho giờ VN đúng bằng chuỗi cho trước */
function lucVn(iso: string): Date {
  return new Date(`${iso}+07:00`);
}

/** Dựng nhanh một dòng đã có nguồn — ném nếu tạo hỏng để test lộ ngay */
function dong(noiDung: string, soNgay: number | null = null, muc: DongBaoCao["muc"] = "can-quyet"): DongBaoCao {
  const d = taoDong({ muc, noiDung, nguon: "test", soNgayAnhHuong: soNgay });
  if (!d) throw new Error("taoDong trả null trong dữ liệu test");
  return d;
}

const NGUOI = { nguoiDat: "dai@sci.vn" };

// ─────────────────────────────────────────────────────────────
// 1. Chuẩn hoá chữ
// ─────────────────────────────────────────────────────────────

describe("boDau", () => {
  it("bỏ dấu tiếng Việt và hạ chữ thường", () => {
    expect(boDau("Từ Nay Trở Đi")).toBe("tu nay tro di");
  });

  it("đổi đ/Đ thành d và gộp khoảng trắng thừa", () => {
    expect(boDau("  Đắp   đất  TB02 ")).toBe("dap dat tb02");
  });
});

// ─────────────────────────────────────────────────────────────
// 2. Nhận diện phạm vi hiệu lực — bảng mục 6.2
// ─────────────────────────────────────────────────────────────

describe("nhanDienPhamVi", () => {
  it('"sáng mai báo kỹ về HP1" → một ngày', () => {
    expect(nhanDienPhamVi("sáng mai báo kỹ về HP1")).toBe("mot-ngay");
  });

  it('"từ nay bỏ mục nhân lực" → không hạn', () => {
    expect(nhanDienPhamVi("từ nay bỏ mục nhân lực")).toBe("khong-han");
  });

  it('"tuần này theo dõi sát nhà thầu TS" → tuần này', () => {
    expect(nhanDienPhamVi("tuần này theo dõi sát nhà thầu TS")).toBe("tuan-nay");
  });

  it('"từ tuần này trở đi" → KHÔNG HẠN (không-hạn xét trước tuần-này)', () => {
    expect(nhanDienPhamVi("từ tuần này trở đi bỏ mục thời tiết")).toBe("khong-han");
  });

  it("đọc được cả câu gõ KHÔNG DẤU", () => {
    expect(nhanDienPhamVi("tu nay tro di bo muc nhan luc")).toBe("khong-han");
    expect(nhanDienPhamVi("tuan nay theo doi sat nha thau TS")).toBe("tuan-nay");
  });

  it("⭐ không nói gì về thời hạn → MẶC ĐỊNH một ngày", () => {
    expect(nhanDienPhamVi("báo kỹ tiến độ gói HP1")).toBe("mot-ngay");
  });
});

// ─────────────────────────────────────────────────────────────
// 3. ⭐ LUẬT QUAN TRỌNG NHẤT — lệnh hôm nay chỉ áp cho hôm nay
// ─────────────────────────────────────────────────────────────

describe("⭐ lệnh nhắn hôm nay CHỈ ÁP CHO HÔM NAY", () => {
  const kq = docCauNhan("báo kỹ tiến độ gói HP1", { ...NGUOI, luc: lucVn("2026-09-05T09:00:00") });

  it("đọc ra một luật một ngày, hết hạn ngay trong ngày nhắn", () => {
    expect(kq.loai).toBe("them-luat");
    if (kq.loai !== "them-luat") return;
    expect(kq.luat.phamVi).toBe("mot-ngay");
    expect(kq.luat.hieuLucTu).toBe("2026-09-05");
    expect(kq.luat.hieuLucDen).toBe("2026-09-05");
  });

  it("hôm sau KHÔNG còn hiệu lực nữa", () => {
    if (kq.loai !== "them-luat") throw new Error("phải ra luật");
    expect(conHieuLuc(kq.luat, "2026-09-05")).toBe(true);
    expect(conHieuLuc(kq.luat, "2026-09-06")).toBe(false);
    expect(conHieuLuc(kq.luat, "2026-12-31")).toBe(false);
  });

  it('"sáng mai báo kỹ về HP1" áp cho NGÀY MAI, không áp hôm nay', () => {
    const k = docCauNhan("sáng mai báo kỹ về HP1", {
      ...NGUOI,
      luc: lucVn("2026-09-05T21:30:00"),
    });
    if (k.loai !== "them-luat") throw new Error("phải ra luật");
    expect(k.luat.hieuLucTu).toBe("2026-09-06");
    expect(k.luat.hieuLucDen).toBe("2026-09-06");
    expect(conHieuLuc(k.luat, "2026-09-05")).toBe(false);
    expect(conHieuLuc(k.luat, "2026-09-06")).toBe(true);
    expect(conHieuLuc(k.luat, "2026-09-07")).toBe(false);
  });
});

describe('"từ nay trở đi" thì KHÔNG HẠN', () => {
  const kq = docCauNhan("từ nay bỏ mục nhân lực", {
    ...NGUOI,
    luc: lucVn("2026-09-05T09:00:00"),
  });

  it("hieuLucDen là null", () => {
    if (kq.loai !== "them-luat") throw new Error("phải ra luật");
    expect(kq.luat.phamVi).toBe("khong-han");
    expect(kq.luat.hieuLucDen).toBeNull();
  });

  it("một năm sau vẫn còn hiệu lực", () => {
    if (kq.loai !== "them-luat") throw new Error("phải ra luật");
    expect(conHieuLuc(kq.luat, "2027-09-05")).toBe(true);
  });

  it("nhưng KHÔNG áp ngược về trước ngày đặt", () => {
    if (kq.loai !== "them-luat") throw new Error("phải ra luật");
    expect(conHieuLuc(kq.luat, "2026-09-04")).toBe(false);
  });
});

describe('"tuần này" hết hạn ĐÚNG CHỦ NHẬT', () => {
  it("đặt Thứ Sáu 04/09 → hết hạn Chủ nhật 06/09", () => {
    const kq = docCauNhan("tuần này theo dõi sát nhà thầu TS", {
      ...NGUOI,
      luc: lucVn("2026-09-04T08:00:00"),
    });
    if (kq.loai !== "them-luat") throw new Error("phải ra luật");
    expect(kq.luat.phamVi).toBe("tuan-nay");
    expect(kq.luat.hieuLucDen).toBe("2026-09-06");
    expect(conHieuLuc(kq.luat, "2026-09-06")).toBe(true);
    expect(conHieuLuc(kq.luat, "2026-09-07")).toBe(false);
  });

  it("đặt Thứ Hai 07/09 → hết hạn Chủ nhật 13/09 (trọn tuần)", () => {
    expect(chuNhatCuaTuan("2026-09-07")).toBe("2026-09-13");
    expect(tinhHieuLucDen("tuan-nay", "2026-09-07")).toBe("2026-09-13");
  });

  it("đặt ĐÚNG Chủ nhật → chỉ còn hiệu lực hôm đó, không kéo sang tuần sau", () => {
    expect(chuNhatCuaTuan("2026-09-06")).toBe("2026-09-06");
  });
});

// ─────────────────────────────────────────────────────────────
// 4. Câu hỏi luật / xoá luật / không hiểu
// ─────────────────────────────────────────────────────────────

describe("nhận biết câu hỏi luật", () => {
  it('"đang bật những luật gì?" → liệt kê, KHÔNG đẻ thêm luật', () => {
    expect(laCauHoiLuat("đang bật những luật gì?")).toBe(true);
    expect(docCauNhan("đang bật những luật gì?", NGUOI).loai).toBe("hoi-luat");
  });

  it("câu đặt luật bình thường KHÔNG bị nhầm thành câu hỏi", () => {
    expect(laCauHoiLuat("từ nay bỏ mục nhân lực")).toBe(false);
    expect(docCauNhan("từ nay bỏ mục nhân lực", NGUOI).loai).toBe("them-luat");
  });

  it('"xoá luật HP1" → chỉ đường sang màn hình, không xoá mù', () => {
    expect(laCauXoaLuat("xoá luật HP1")).toBe(true);
    const kq = docCauNhan("xoá luật HP1", NGUOI);
    expect(kq.loai).toBe("xoa-luat");
    if (kq.loai === "xoa-luat") expect(kq.goiY).toContain("màn Báo cáo sáng");
  });

  it("câu quá ngắn → không hiểu, KHÔNG đoán bừa thành luật", () => {
    const kq = docCauNhan("ok", NGUOI);
    expect(kq.loai).toBe("khong-hieu");
  });
});

// ─────────────────────────────────────────────────────────────
// 5. Lọc luật — hết hạn TỰ RỤNG
// ─────────────────────────────────────────────────────────────

describe("locLuatConHieuLuc", () => {
  const ds: LuatBaoCao[] = [
    {
      ma: "A",
      noiDung: "hôm qua báo kỹ HP1",
      phamVi: "mot-ngay",
      hieuLucTu: "2026-09-04",
      hieuLucDen: "2026-09-04",
      nguoiDat: "a",
      thoiDiemDat: "2026-09-04T01:00:00.000Z",
      nguon: "telegram",
    },
    {
      ma: "B",
      noiDung: "tuần này theo dõi TS",
      phamVi: "tuan-nay",
      hieuLucTu: "2026-09-04",
      hieuLucDen: "2026-09-06",
      nguoiDat: "a",
      thoiDiemDat: "2026-09-04T01:00:00.000Z",
      nguon: "telegram",
    },
    {
      ma: "C",
      noiDung: "từ nay bỏ mục nhân lực",
      phamVi: "khong-han",
      hieuLucTu: "2026-09-01",
      hieuLucDen: null,
      nguoiDat: "a",
      thoiDiemDat: "2026-09-01T01:00:00.000Z",
      nguon: "telegram",
    },
  ];

  it("luật hết hạn TỰ RỤNG khỏi danh sách, không cần ai dọn", () => {
    const con = locLuatConHieuLuc(ds, "2026-09-05");
    expect(con.map((l) => l.ma)).toEqual(["B", "C"]);
  });

  it("qua Chủ nhật thì luật tuần cũng rụng, chỉ còn luật không hạn", () => {
    expect(locLuatConHieuLuc(ds, "2026-09-07").map((l) => l.ma)).toEqual(["C"]);
  });

  it("locLuatHetHan trả về đúng phần bù, không mất dòng nào", () => {
    const con = locLuatConHieuLuc(ds, "2026-09-05");
    const het = locLuatHetHan(ds, "2026-09-05");
    expect(con.length + het.length).toBe(ds.length);
    expect(het.map((l) => l.ma)).toEqual(["A"]);
  });
});

// ─────────────────────────────────────────────────────────────
// 6. Tính ngày, mô tả, chuẩn hoá
// ─────────────────────────────────────────────────────────────

describe("tiện ích ngày", () => {
  it("congNgay vượt qua ranh giới tháng và năm", () => {
    expect(congNgay("2026-09-30", 1)).toBe("2026-10-01");
    expect(congNgay("2026-12-31", 1)).toBe("2027-01-01");
    expect(congNgay("2026-09-01", -1)).toBe("2026-08-31");
  });

  it("ngayVn lấy đúng ngày giờ VN (23:30 UTC đã sang hôm sau)", () => {
    expect(ngayVn(new Date("2026-09-05T23:30:00Z"))).toBe("2026-09-06");
  });

  it("nhắn lúc 23:30 UTC ngày 05 → luật áp cho ngày VN 06, không phải 05", () => {
    const kq = docCauNhan("báo kỹ HP1", { ...NGUOI, luc: new Date("2026-09-05T23:30:00Z") });
    if (kq.loai !== "them-luat") throw new Error("phải ra luật");
    expect(kq.luat.hieuLucTu).toBe("2026-09-06");
  });

  it("moTaHieuLuc nói rõ ba kiểu hạn, không giấu cách tính", () => {
    const nen = { ma: "x", noiDung: "n", nguoiDat: "a", thoiDiemDat: "t", nguon: "telegram" };
    expect(moTaHieuLuc({ ...nen, phamVi: "khong-han", hieuLucTu: "2026-09-05", hieuLucDen: null })).toContain("Không hạn");
    expect(moTaHieuLuc({ ...nen, phamVi: "mot-ngay", hieuLucTu: "2026-09-05", hieuLucDen: "2026-09-05" })).toBe("Chỉ ngày 05/09");
    expect(moTaHieuLuc({ ...nen, phamVi: "tuan-nay", hieuLucTu: "2026-09-04", hieuLucDen: "2026-09-06" })).toBe("Từ 04/09 đến hết 06/09");
  });

  it("maLuat tất định — cùng đầu vào cho cùng mã, không random", () => {
    expect(maLuat("2026-09-05T09:00:00.000Z", "báo kỹ HP1")).toBe(
      maLuat("2026-09-05T09:00:00.000Z", "báo kỹ HP1"),
    );
    expect(maLuat("2026-09-05T09:00:00.000Z", "báo kỹ HP1")).not.toBe(
      maLuat("2026-09-05T09:00:00.000Z", "báo kỹ HP2"),
    );
  });

  it("chuanHoaLuat bỏ dòng hỏng, giữ dòng đủ trường", () => {
    expect(chuanHoaLuat(null)).toBeNull();
    expect(chuanHoaLuat({ noiDung: "", hieuLucTu: "2026-09-05" })).toBeNull();
    expect(chuanHoaLuat({ noiDung: "x", hieuLucTu: "linh tinh" })).toBeNull();
    const l = chuanHoaLuat({ noiDung: "từ nay bỏ nhân lực", hieuLucTu: "2026-09-05", phamVi: "khong-han" });
    expect(l?.hieuLucDen).toBeNull();
    expect(l?.ma).not.toBe("");
  });
});

// ─────────────────────────────────────────────────────────────
// 7. Áp luật động vào nội dung
// ─────────────────────────────────────────────────────────────

describe("apDungLuat", () => {
  const ds = [
    dong("HP1 — hồ sơ chấp thuận độ cao quá hạn 12 ngày"),
    dong("Nhân lực HV thiếu 12 người so với biểu đồ"),
    dong("Nhà thầu TS chậm huy động thiết bị"),
  ];

  it("bóc đúng chủ đề sau mốc từ", () => {
    expect(chuDeCanBo("từ nay bỏ mục nhân lực")).toBe("nhan luc");
    expect(chuDeCanKy("tuần này theo dõi sát nhà thầu TS")).toBe("nha thau ts");
    expect(chuDeCanBo("báo kỹ HP1")).toBe("");
  });

  it('"báo kỹ Hướng Việt" khớp theo TÊN DỰ ÁN gắn vào dòng (noiDungKy do dung.ts ghép); "bỏ" thì không', () => {
    const theoDa = [
      { noiDung: "Cấp giấy phép quá hạn 12 ngày", noiDungKy: "Cấp giấy phép quá hạn 12 ngày Nậm săm 3A N3A" },
      { noiDung: "Việc 6.1.4 chậm", noiDungKy: "Việc 6.1.4 chậm Điện gió Hướng Việt (HV — dữ liệu test) HV Hướng Việt ĐG HV" },
    ];
    const kq = apDungLuat(theoDa, [{ noiDung: "sáng mai báo kỹ về Hướng Việt" }]);
    expect(kq.dong[0]!.noiDung).toContain("6.1.4");
    expect(kq.dong.length).toBe(2);
    // luật «bỏ» KHÔNG xét tên dự án: bỏ qua Hướng Việt không loại việc nào chỉ vì tên dự án
    const bo = apDungLuat(theoDa, [{ noiDung: "từ nay bỏ qua Hướng Việt" }]);
    expect(bo.dong.length).toBe(2);
    expect(bo.soBiLuatBo).toBe(0);
  });

  it('"từ nay bỏ mục nhân lực" loại đúng dòng nhân lực', () => {
    const kq = apDungLuat(ds, [{ noiDung: "từ nay bỏ mục nhân lực" }]);
    expect(kq.dong.length).toBe(2);
    expect(kq.soBiLuatBo).toBe(1);
    expect(kq.dong.some((d) => d.noiDung.includes("Nhân lực"))).toBe(false);
  });

  it('"theo dõi sát nhà thầu TS" đẩy dòng đó lên đầu, không xoá dòng nào', () => {
    const kq = apDungLuat(ds, [{ noiDung: "tuần này theo dõi sát nhà thầu TS" }]);
    expect(kq.dong.length).toBe(3);
    expect(kq.soBiLuatBo).toBe(0);
    expect(kq.dong[0].noiDung).toContain("Nhà thầu TS");
  });

  it("lệnh BỎ thắng lệnh BÁO KỸ khi cùng trỏ một chủ đề", () => {
    const kq = apDungLuat(ds, [
      { noiDung: "từ nay bỏ mục nhân lực" },
      { noiDung: "hôm nay báo kỹ nhân lực HV" },
    ]);
    expect(kq.dong.some((d) => d.noiDung.includes("Nhân lực"))).toBe(false);
  });

  it("không có luật nào thì giữ nguyên thứ tự và số dòng", () => {
    const kq = apDungLuat(ds, []);
    expect(kq.dong.map((d) => d.noiDung)).toEqual(ds.map((d) => d.noiDung));
    expect(kq.soBiLuatBo).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────
// 8. Luật cứng 1 — không nguồn thì không vào báo cáo
// ─────────────────────────────────────────────────────────────

describe("luật cứng 1 — dòng thiếu nguồn bị loại", () => {
  it("taoDong trả null khi nguồn rỗng", () => {
    expect(taoDong({ muc: "can-quyet", noiDung: "HP1 quá hạn", nguon: "" })).toBeNull();
  });

  it("nguồn toàn khoảng trắng cũng là thiếu nguồn", () => {
    expect(taoDong({ muc: "can-quyet", noiDung: "HP1 quá hạn", nguon: "   " })).toBeNull();
  });

  it("nội dung rỗng cũng bị loại dù có nguồn", () => {
    expect(taoDong({ muc: "can-quyet", noiDung: "  ", nguon: "wbs:HP1" })).toBeNull();
  });

  it("locDongCoNguon đếm được số dòng bị loại, không loại lặng lẽ", () => {
    const kq = locDongCoNguon([
      { muc: "can-quyet", noiDung: "có nguồn", nguon: "wbs:HP1" },
      { muc: "can-quyet", noiDung: "không nguồn", nguon: "" },
      { muc: "dang-chu-y", noiDung: "cũng không nguồn", nguon: "  " },
    ]);
    expect(kq.dong.length).toBe(1);
    expect(kq.soBiLoai).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────
// 9. Luật cứng 3 + 4 — không ước số, không cộng dồn
// ─────────────────────────────────────────────────────────────

describe("số ngày ảnh hưởng", () => {
  const ds = [dong("A", 4), dong("B", 6), dong("C", null)];

  it("lấy cái NẶNG NHẤT chứ KHÔNG cộng dồn (4 và 6 → 6, không phải 10)", () => {
    expect(soNgayNangNhat(ds)).toBe(6);
  });

  it("không dòng nào có số → null, KHÔNG phải 0", () => {
    expect(soNgayNangNhat([dong("X", null), dong("Y", null)])).toBeNull();
  });

  it("hienSo: null hiện dấu gạch, còn 0 vẫn hiện 0 (hai chuyện khác nhau)", () => {
    expect(hienSo(null)).toBe("—");
    expect(hienSo(0)).toBe("0");
    expect(hienSo(6)).toBe("6");
  });

  it("câu giải thích nói thẳng là KHÔNG cộng dồn", () => {
    const cau = cauGiaiThichSoNgay(ds);
    expect(cau).toContain("6 ngày");
    expect(cau).toContain("KHÔNG cộng dồn");
  });

  it("chưa dòng nào đo được thì câu giải thích nói rõ là không ước", () => {
    expect(cauGiaiThichSoNgay([dong("X", null)])).toContain("không ước");
  });
});

// ─────────────────────────────────────────────────────────────
// 10. Khung báo cáo — không có gì bất thường VẪN GỬI
// ─────────────────────────────────────────────────────────────

describe("ketXuatTelegram", () => {
  const rong: BaoCaoSang = dungKhung({ ngay: "2026-09-05", soDuAn: 3, dungLuc: "2026-09-05T00:00:00.000Z" });

  it("⭐ không có gì bất thường VẪN dựng ra báo cáo, không rỗng", () => {
    const chu = ketXuatTelegram(rong);
    expect(chu.length).toBeGreaterThan(80);
    expect(coBatThuong(rong)).toBe(false);
  });

  it("luôn in đủ BA đầu mục cố định dù mục nào cũng rỗng", () => {
    const chu = ketXuatTelegram(rong);
    expect(chu).toContain("🔴 Cần anh quyết");
    expect(chu).toContain("🟡 Đáng chú ý");
    expect(chu).toContain("✅ Đêm qua hệ thống đã làm");
    expect(chu).toContain("Không có gì bất thường đáng chú ý.");
  });

  it("thứ tự ba mục là cố định, không sắp lại theo số dòng", () => {
    expect([...THU_TU_MUC]).toEqual(["can-quyet", "dang-chu-y", "da-lam"]);
    const chu = ketXuatTelegram(rong);
    expect(chu.indexOf("🔴")).toBeLessThan(chu.indexOf("🟡"));
    expect(chu.indexOf("🟡")).toBeLessThan(chu.indexOf("✅"));
  });

  it("số dự án chưa đếm được thì in — chứ không in 0", () => {
    const chu = ketXuatTelegram(dungKhung({ ngay: "2026-09-05" }));
    expect(chu).toContain("— dự án");
    expect(chu).not.toContain("0 dự án");
  });

  it("luật cứng 2 — in 🤖 trước nội dung do LLM sinh, và chỉ nội dung đó", () => {
    const bc: BaoCaoSang = {
      ...rong,
      dong: [
        taoDong({ muc: "can-quyet", noiDung: "Do máy đọc ra", nguon: "wbs:HP1", doLlmSinh: true })!,
        taoDong({ muc: "can-quyet", noiDung: "Do code tính", nguon: "wbs:HP2" })!,
      ],
    };
    const chu = ketXuatTelegram(bc);
    expect(chu).toContain("🤖 Do máy đọc ra");
    expect(chu).not.toContain("🤖 Do code tính");
  });

  it("mỗi dòng đều kèm nguồn dẫn — không có dòng trần", () => {
    const bc: BaoCaoSang = {
      ...rong,
      dong: [taoDong({ muc: "dang-chu-y", noiDung: "HV đắp đất chậm", nguon: "bc-ngay:HV-0904" })!],
    };
    expect(ketXuatTelegram(bc)).toContain("↳ nguồn: bc-ngay:HV-0904");
  });

  it("luật cứng 5 — agent chưa hỏi được thì ghi rõ, báo cáo vẫn ra chữ", () => {
    const bc: BaoCaoSang = {
      ...rong,
      thieuSot: [{ ten: "Agent Pháp lý", lyDo: "chưa hỏi được vì agent đang TẮT trong Danh bạ" }],
    };
    const chu = ketXuatTelegram(bc);
    expect(chu).toContain("Chưa hỏi được");
    expect(chu).toContain("Agent Pháp lý");
    expect(chu).toContain("đang TẮT");
  });

  it("nói rõ đã bỏ bao nhiêu dòng vì thiếu nguồn", () => {
    const chu = ketXuatTelegram({ ...rong, soDongBiLoaiVaThieuNguon: 2 });
    expect(chu).toContain("Đã bỏ 2 dòng vì không dẫn được nguồn");
  });

  it("liệt kê luật đang áp; không có luật thì nói rõ là chạy khung mặc định", () => {
    expect(ketXuatTelegram(rong)).toContain("Không có luật động nào đang áp");
    const bc: BaoCaoSang = {
      ...rong,
      luatApDung: [{ ma: "A", noiDung: "tuần này theo dõi TS", moTaHieuLuc: "Từ 04/09 đến hết 06/09" }],
    };
    expect(ketXuatTelegram(bc)).toContain("tuần này theo dõi TS");
  });

  it("báo cáo dài quá trần Telegram thì cắt và mời mở trên web", () => {
    const nhieu = Array.from({ length: 300 }, (_, i) =>
      taoDong({ muc: "dang-chu-y", noiDung: `Dòng số ${i} rất dài dài dài`, nguon: "wbs:X" })!,
    );
    const chu = ketXuatTelegram({ ...rong, dong: nhieu });
    expect(chu.length).toBeLessThanOrEqual(4000);
    expect(chu).toContain("/bao-cao?tab=sang");
    expect(chu).not.toContain("/bao-cao-sang"); // đường cũ trước gọn menu 26/09
  });

  it("coBatThuong đúng: chỉ mục đã-làm thì không tính là bất thường", () => {
    const chiDaLam: BaoCaoSang = {
      ...rong,
      dong: [taoDong({ muc: "da-lam", noiDung: "Bóc 4 báo cáo ngày", nguon: "so-hen-gio" })!],
    };
    expect(coBatThuong(chiDaLam)).toBe(false);
    expect(coBatThuong({ ...rong, dong: [dong("HP1 quá hạn")] })).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// 11. Kịch bản định kỳ — mục 7
// ─────────────────────────────────────────────────────────────

describe("denGioChayNhip", () => {
  // ⭐ 04/10: dựng dời 21:00 → 06:30 (bản 21:00 mang ngày hôm đó, 07:00 sáng sau không thấy → dựng lại, gửi trùng)
  const dungDem = NHIP_DINH_KY.find((n) => n.ma === "dung-bao-cao-dem")!; // 06:30 hằng ngày
  const guiSang = NHIP_DINH_KY.find((n) => n.ma === "gui-bao-cao-sang")!; // 07:00 hằng ngày
  const nhacTuan = NHIP_DINH_KY.find((n) => n.ma === "nhac-bc-tuan")!; // T2 14:00
  const bcThang = NHIP_DINH_KY.find((n) => n.ma === "nhap-bc-thang")!; // ngày 1, 08:00

  it("bảng nhịp có đủ bốn nhịp theo giờ của mục 7 — dựng TRƯỚC gửi, cùng một ngày", () => {
    expect(NHIP_DINH_KY.length).toBe(4);
    expect(dungDem.gio).toBe("06:30");
    expect(guiSang.gio).toBe("07:00");
    expect(dungDem.gio < guiSang.gio).toBe(true);
  });

  it("chưa tới giờ thì chưa chạy; qua giờ và hôm nay chưa chạy thì chạy", () => {
    expect(denGioChayNhip(dungDem, gioVn(lucVn("2026-09-05T06:29:00")), null)).toBe(false);
    expect(denGioChayNhip(dungDem, gioVn(lucVn("2026-09-05T06:31:00")), null)).toBe(true);
  });

  it("hôm nay đã chạy thì không chạy lại (mỗi ngày một lần)", () => {
    expect(denGioChayNhip(dungDem, gioVn(lucVn("2026-09-05T23:59:00")), "2026-09-05")).toBe(false);
    expect(denGioChayNhip(dungDem, gioVn(lucVn("2026-09-05T23:59:00")), "2026-09-04")).toBe(true);
  });

  it("nhịp nhắc báo cáo tuần chỉ chạy đúng Thứ Hai", () => {
    // 07/09/2026 là Thứ Hai, 05/09 là Thứ Bảy
    expect(denGioChayNhip(nhacTuan, gioVn(lucVn("2026-09-07T14:01:00")), null)).toBe(true);
    expect(denGioChayNhip(nhacTuan, gioVn(lucVn("2026-09-05T14:01:00")), null)).toBe(false);
    expect(denGioChayNhip(nhacTuan, gioVn(lucVn("2026-09-07T13:59:00")), null)).toBe(false);
  });

  it("nhịp báo cáo tháng chỉ chạy ngày mùng 1", () => {
    expect(denGioChayNhip(bcThang, gioVn(lucVn("2026-10-01T08:01:00")), null)).toBe(true);
    expect(denGioChayNhip(bcThang, gioVn(lucVn("2026-10-02T08:01:00")), null)).toBe(false);
    expect(denGioChayNhip(bcThang, gioVn(lucVn("2026-10-01T07:59:00")), null)).toBe(false);
  });
});
