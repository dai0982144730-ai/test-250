// Tóm tắt tiến độ dự án (Mr. Đại giao 13/10/2026) — đọc tệp Excel sáu cột, trục tháng/tuần, câu «còn bao ngày», quyền nạp.
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { capWbs, chuNgayDong, conBaoNgay, docBangTomTat, docNgayO, soTuanIso, thuHai, trucTomTat, wbsCoCon } from "@/lib/tom-tat-tien-do/thuan";
import { docTepTomTat, napDuocTomTat, xuatTepTomTat } from "@/lib/tom-tat-tien-do/luu";
import type { DuAn } from "@/lib/phong/du-an-thuan";

const TIEU_DE = ["WBS", "Công việc", "Đơn vị", "Khối lượng", "Bắt đầu", "Kết thúc"];

describe("đọc ô ngày", () => {
  it("nhận ngày/tháng/năm, năm-tháng-ngày, số thứ tự ngày của Excel", () => {
    expect(docNgayO("22/05/2027")).toBe("2027-05-22");
    expect(docNgayO("5-1-27")).toBe("2027-01-05");
    expect(docNgayO("2027-04-07")).toBe("2027-04-07");
    expect(docNgayO(46213)).toBe("2026-07-10"); // ô ngày thật của Excel
    expect(docNgayO(new Date(Date.UTC(2026, 8, 1)))).toBe("2026-09-01");
  });
  it("chữ không phải ngày, ngày không có thật → null", () => {
    expect(docNgayO("31/02/2027")).toBeNull();
    expect(docNgayO("quý 2")).toBeNull();
    expect(docNgayO(12)).toBeNull();
    expect(docNgayO(null)).toBeNull();
  });
});

describe("đọc bảng sáu cột", () => {
  it("tìm hàng tiêu đề, đọc số kiểu Việt Nam, bỏ hàng trống", () => {
    const { dong, canh_bao } = docBangTomTat([
      ["TỔNG TIẾN ĐỘ RÚT GỌN"],
      TIEU_DE,
      ["1", "DỰ ÁN", null, null, "10/07/2026", "15/09/2027"],
      ["1.4", "4. THỰC THI", null, null, 46213, 46611],
      [null, null, null, null, null, null],
      ["1.4.7.2", "  Bê tông   móng trụ ", "m³", "4.500", "09/01/2027", "07/04/2027"],
      ["1.4.7.3", "Đắp hoàn trả", "m³", 15000.5, "22/02/2027", "22/04/2027"],
    ]);
    expect(canh_bao).toEqual([]);
    expect(dong.map((d) => d.wbs)).toEqual(["1", "1.4", "1.4.7.2", "1.4.7.3"]);
    expect(dong[1]).toMatchObject({ bat_dau: "2026-07-10", ket_thuc: "2027-08-12" });
    expect(dong[2]).toEqual({ wbs: "1.4.7.2", ten: "Bê tông móng trụ", don_vi: "m³", khoi_luong: 4500, bat_dau: "2027-01-09", ket_thuc: "2027-04-07" });
    expect(dong[3].khoi_luong).toBe(15000.5);
  });

  it("cột đổi chỗ, tên cột viết khác vẫn nhận", () => {
    const { dong } = docBangTomTat([
      ["Tên công việc", "wbs", "Ngày kết thúc", "Ngày bắt đầu", "ĐVT", "KL"],
      ["Đường vận hành", "1.4.2", "01/10/2026", "10/07/2026", "km", "5"],
    ]);
    expect(dong).toEqual([{ wbs: "1.4.2", ten: "Đường vận hành", don_vi: "km", khoi_luong: 5, bat_dau: "2026-07-10", ket_thuc: "2026-10-01" }]);
  });

  it("nhắc: WBS sai dạng, WBS trùng, ngày không đọc được, kết thúc trước bắt đầu", () => {
    const { dong, canh_bao } = docBangTomTat([
      TIEU_DE,
      ["1", "A", null, null, "01/01/2027", "31/12/2026"],
      ["1", "B", null, null, "sớm nhất", null],
      ["một", "C", null, null, null, null],
      ["2", "", null, null, null, null],
    ]);
    expect(dong.map((d) => d.ten)).toEqual(["A", "B"]);
    expect(canh_bao.join("\n")).toMatch(/Bỏ qua 2 hàng/);
    expect(canh_bao.join("\n")).toMatch(/WBS bị trùng: 1/);
    expect(canh_bao.join("\n")).toMatch(/Ngày không đọc được/);
    expect(canh_bao.join("\n")).toMatch(/kết thúc nằm trước/);
  });

  it("không có hàng tiêu đề → coi sáu cột đầu theo thứ tự, có lời nhắc", () => {
    const { dong, canh_bao } = docBangTomTat([["1.1", "Khởi tạo", "bộ", 1, "29/08/2026", "19/09/2026"]]);
    expect(dong).toHaveLength(1);
    expect(canh_bao[0]).toMatch(/Không thấy hàng tiêu đề/);
  });

  it("đọc được tệp .xlsx thật (ô ngày của Excel, WBS kiểu chữ)", () => {
    const ws = XLSX.utils.aoa_to_sheet([TIEU_DE, ["1.4.10", "Tuabin số 02", null, null, new Date(Date.UTC(2027, 4, 11)), new Date(Date.UTC(2027, 6, 3))], ["1.4.10.1", "Lắp đặt", "trụ", 1, "11/05/2027", "20/05/2027"]], { cellDates: true });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tiến độ rút gọn");
    const { dong, canh_bao } = docTepTomTat(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer);
    expect(canh_bao).toEqual([]);
    expect(dong[0]).toMatchObject({ wbs: "1.4.10", bat_dau: "2027-05-11", ket_thuc: "2027-07-03" });
    expect(dong[1]).toMatchObject({ wbs: "1.4.10.1", don_vi: "trụ", khoi_luong: 1, bat_dau: "2027-05-11" });
  });
});

describe("cấp, dòng nhóm, trục thời gian", () => {
  const dong = docBangTomTat([TIEU_DE, ["1", "DỰ ÁN", null, null, "10/07/2026", "15/09/2027"], ["1.1", "Khởi tạo", null, null, "29/08/2026", "15/09/2027"], ["1.1.1", "Thẩm định", "bộ", 1, "29/08/2026", "19/09/2026"]]).dong;
  it("cấp theo số đoạn WBS; dòng nhóm là dòng có con trong bảng", () => {
    expect(dong.map((d) => capWbs(d.wbs))).toEqual([1, 2, 3]);
    expect([...wbsCoCon(dong)].sort()).toEqual(["1", "1.1"]);
  });
  it("tuần ISO: 27/04/2026 là thứ Hai của tuần 18 (mẫu «W18·27/4»)", () => {
    expect(thuHai("2026-04-29")).toBe("2026-04-27");
    expect(soTuanIso("2026-04-27")).toBe(18);
    expect(soTuanIso("2027-01-03")).toBe(53); // Chủ nhật 03/01/2027 còn thuộc tuần 53 của 2026
    expect(soTuanIso("2027-01-04")).toBe(1);
  });
  it("trục bắt đầu thứ Hai trước ngày sớm nhất một tuần, nhãn tháng «T7/26», nhãn tuần «W27·29/6»", () => {
    const t = trucTomTat(dong, "2026-10-13")!;
    expect(t.dau).toBe("2026-06-29");
    expect(t.cuoi).toBe("2027-09-29");
    expect(t.tuan[0]).toMatchObject({ iso: "2026-06-29", ngay: 0, nhan: "W27·29/6" });
    expect(t.thang.slice(0, 2).map((m) => m.nhan)).toEqual(["T6/26", "T7/26"]);
    expect(t.thang[1].ngay).toBe(2);
    expect(trucTomTat([{ wbs: "1", ten: "x", don_vi: null, khoi_luong: null, bat_dau: null, ket_thuc: null }], "2026-10-13")).toBeNull();
  });
  it("hôm nay nằm sau ngày muộn nhất không quá 90 ngày thì trục nới ra tới hôm nay", () => {
    expect(trucTomTat(dong, "2027-10-01")!.cuoi).toBe("2027-10-15");
    expect(trucTomTat(dong, "2028-06-01")!.cuoi).toBe("2027-09-29");
  });
});

describe("chữ của hộp rê chuột", () => {
  it("còn bao ngày kết thúc", () => {
    expect(conBaoNgay({ bat_dau: "2026-07-10", ket_thuc: "2026-10-23" }, "2026-10-13")).toBe("Còn 10 ngày nữa kết thúc");
    expect(conBaoNgay({ bat_dau: "2026-12-01", ket_thuc: "2026-12-20" }, "2026-10-13")).toBe("Còn 49 ngày nữa bắt đầu · còn 68 ngày nữa kết thúc");
    expect(conBaoNgay({ bat_dau: "2026-10-22", ket_thuc: "2026-10-22" }, "2026-10-13")).toBe("Còn 9 ngày nữa tới mốc");
    expect(conBaoNgay({ bat_dau: "2026-07-10", ket_thuc: "2026-10-13" }, "2026-10-13")).toBe("Kết thúc hôm nay");
    expect(conBaoNgay({ bat_dau: "2026-07-10", ket_thuc: "2026-10-01" }, "2026-10-13")).toBe("Đã qua ngày kết thúc ghi trong tệp nạp 12 ngày (chưa so với Tiến độ mục tiêu hay Baseline)");
    expect(conBaoNgay({ bat_dau: null, ket_thuc: null }, "2026-10-13")).toBe("Chưa có ngày kết thúc");
  });
  it("khoảng ngày kèm số ngày (luật 31); việc một ngày ghi Mốc", () => {
    expect(chuNgayDong({ bat_dau: "2027-05-22", ket_thuc: "2027-05-31" })).toBe("10 ngày · 22/05/2027 – 31/05/2027");
    expect(chuNgayDong({ bat_dau: "2026-12-01", ket_thuc: "2026-12-01" })).toBe("Mốc · 01/12/2026");
  });
});

describe("ai nạp được", () => {
  const hv = { id: "HV", ten: "Hướng Việt", nhom: "sci", don_vi: ["bqlda-qt", "sci-pmc"], ban_dieu_hanh: "bdh-huongviet" } as unknown as DuAn;
  const n3a = { id: "N3A", ten: "Nậm Săm 3A", nhom: "khac", don_vi: ["sci-enc"], ban_dieu_hanh: null } as unknown as DuAn;
  it("chỉ người của Ban QLDA (đơn vị đầu của dự án SCI đầu tư) — đơn vị làm, ban điều hành, lãnh đạo đều không", () => {
    expect(napDuocTomTat({ don_vi_ids: ["bqlda-qt"] }, hv)).toBe(true);
    expect(napDuocTomTat({ don_vi_ids: ["p-kt", "bqlda-qt"] }, hv)).toBe(true);
    expect(napDuocTomTat({ don_vi_ids: ["sci-pmc"] }, hv)).toBe(false);
    expect(napDuocTomTat({ don_vi_ids: ["bdh-huongviet"] }, hv)).toBe(false);
    expect(napDuocTomTat({ don_vi_ids: ["bld-ptgd"] }, hv)).toBe(false);
  });
  it("dự án Loại khác không có Ban QLDA → người của đơn vị gắn với dự án", () => {
    expect(napDuocTomTat({ don_vi_ids: ["sci-enc"] }, n3a)).toBe(true);
    expect(napDuocTomTat({ don_vi_ids: ["bqlda-qt"] }, n3a)).toBe(false);
  });
});

describe("tải file rồi nạp ngược lại", () => {
  it("tệp tải về đọc lại ra đúng bảng cũ, không lời nhắc", async () => {
    const dong = docBangTomTat([TIEU_DE, ["1", "DỰ ÁN", null, null, "10/07/2026", "15/09/2027"], ["1.10", "Tuabin số 02", null, null, "11/05/2027", "03/07/2027"], ["1.10.1", "Bê tông móng", "m³", "4.500,5", "09/01/2027", "07/04/2027"], ["1.10.2", "Mốc chưa có ngày", null, null, null, null]]).dong;
    const kq = docTepTomTat(await xuatTepTomTat({ du_an: "HV", ten_tep: "a.xlsx", nap_luc: "2026-10-13T00:00:00Z", nap_boi: "x", nap_boi_ten: "X", dong }));
    expect(kq.canh_bao).toEqual([]);
    expect(kq.dong).toEqual(dong);
  });
  it("dự án chưa có bảng → tệp mẫu chỉ có hàng tiêu đề", async () => {
    expect(docTepTomTat(await xuatTepTomTat(null))).toEqual({ dong: [], canh_bao: [] });
  });
});
