// ============================================================
// TÓM TẮT BỐN DÒNG — src/lib/bang-dieu-hanh/tom-tat-bon-dong.ts (Mr. Đại chốt 01/11/2026 «cách 1»)
// Ba câu AI viết sai đo được trên màn HV 01/11 phải bị máy soát chặn; câu đúng phải qua.
// ============================================================

import { describe, expect, it } from "vitest";
import { dungKhungBonDong, soatDong, type KhungDong } from "@/lib/bang-dieu-hanh/tom-tat-bon-dong";
import type { DuLieuBdh } from "@/lib/bang-dieu-hanh/gom";

const hm = (wbs: string, ten: string, n: number, tt = 0) => ({
  wbs, ten, duBaoXong: null, baselineXong: null, tuLamCodCham: n, trongDoThoiTiet: tt, soViecGang: 1,
});

/** Bộ số đúng như màn HV 01/11/2026 */
function bdh(): DuLieuBdh {
  return {
    duAn: [{ ma: "hv", ten: "Điện gió Hướng Việt", so: null, loi: null }],
    dangChon: "hv",
    canhBaoLechDuAn: "",
    chiTiet: {
      codDuBao: "2027-11-17", codMucTieu: "2027-08-03", lechNgay: 106, codBaseline: "2027-09-14", lechNgaySoBaseline: 64,
      tachChamCod: "COD dự báo 17/11/2027 chậm 106 ngày so với Tiến độ mục tiêu = 42 + 64",
      hangMucTuLam: [
        hm("6.1", "Hợp đồng cung cấp turbine", 61),
        hm("7.6", "Vận chuyển và Lắp đặt Turbine", 20, 20),
        hm("7.6.2", "Lắp đặt cơ khí Turbine", 20, 20),
        hm("7.1", "Các mốc chính", 0),
      ],
      mocSoSanh: "", chuoiGang: [], loi: null,
    },
    sCurve: null,
    soTuan: {
      tuanTruoc: "2026-W40", tuanNay: "2026-W41", loi: null,
      thuocDo: [
        { ten: "Chậm so với Tiến độ mục tiêu", truoc: "36 ngày", nay: "39 ngày", doi: "+3 ngày", tone: "red", ghiChu: "" },
        { ten: "Chậm so với Baseline", truoc: "29 ngày", nay: "34 ngày", doi: "+5 ngày", tone: "red", ghiChu: "" },
      ],
    },
    nguonLuc: null,
    phapLy: {
      tongPhaiCo: 97, soThieu: 78, loi: null,
      dong: [
        { maHoSo: "K-01", ten: "Hợp đồng tín dụng / văn bản thu xếp vốn cho dự án", coQuan: "", quaHanNgay: 265 },
        { maHoSo: "K-02", ten: "Đánh giá tác động tiếng ồn khu vực tuabin", coQuan: "Sở Y tế", quaHanNgay: 241 },
        { maHoSo: "K-03", ten: "Hồ sơ khác", coQuan: "", quaHanNgay: 10 },
      ],
    },
    tac: null,
    tien: null,
    daThanhIssue: [{ khoa: "K-01", maIssue: "ISS-1" }],
    lucSo: null,
    banCu: [],
  } as unknown as DuLieuBdh;
}

const k = dungKhungBonDong(bdh());
/** Dòng tuần tự dựng — số chậm theo tuần tính từ S-Curve (tuan-khac.ts), bộ thử không có điểm S-Curve */
const tuan: KhungDong = {
  khoa: "tuan", nhan: "Tuần này", neo: "khoi-tuan-nay",
  duLieu: "Tuần 40 → Tuần 41: so với Baseline chậm 29 ngày → 34 ngày; so với Tiến độ mục tiêu chậm 36 ngày → 39 ngày (đo trên đường S, cùng mức khối lượng).",
  cauMay: "Tuần 40 → Tuần 41: so với Baseline chậm 29 ngày → 34 ngày; so với Tiến độ mục tiêu chậm 36 ngày → 39 ngày (đo trên đường S, cùng mức khối lượng).",
};
const dong = (khoa: string): KhungDong => (khoa === "tuan" ? tuan : k.find((x) => x.khoa === khoa)!);

describe("khung bốn dòng", () => {
  it("đủ bốn dòng theo thứ tự; hạng mục con 7.6.2 bị bỏ vì nằm trong 7.6 (không cộng dồn)", () => {
    expect(k.map((x) => x.khoa)).toEqual(["goc", "thu_hai", "phap_ly"]); // chưa có S-Curve → không có dòng Tuần (không đoán)
    expect(dong("goc").cauMay).toBe("6.1 Hợp đồng cung cấp turbine: nếu làm đúng Baseline thì COD sớm hơn 61 ngày.");
    expect(dong("thu_hai").cauMay).toBe("7.6 Vận chuyển và Lắp đặt Turbine: nếu làm đúng Baseline thì COD sớm hơn 20 ngày, toàn bộ do thời tiết.");
    expect(dong("thu_hai").cauMay).not.toContain("7.6.2");
  });
  it("pháp lý ghi đúng hồ sơ nào đã thành việc", () => {
    expect(dong("phap_ly").cauMay).toBe(
      "Thiếu 78/97 hồ sơ. Hợp đồng tín dụng / văn bản… quá hạn 265 ngày (đã thành việc); Đánh giá tác động tiếng ồn khu… quá hạn 241 ngày (chưa giao việc)."
    );
  });
  it("câu máy ghép tự qua máy soát của chính nó", () => {
    for (const x of [...k, tuan]) expect(soatDong(x.cauMay, x)).toBeNull();
  });
});

describe("máy soát — ba câu sai đo được 01/11", () => {
  it("① «6.1 kéo COD chậm 106 ngày» — 106 là số cả dự án, không có trong dòng Kéo lùi COD nhiều nhất", () => {
    expect(soatDong("6.1 Hợp đồng cung cấp turbine kéo COD dự báo chậm 106 ngày.", dong("goc"))).toMatch(/106/);
  });
  it("② «7.6.2 chậm thêm 20 ngày» — cộng dồn giữa hạng mục", () => {
    expect(soatDong("7.6 Vận chuyển và Lắp đặt Turbine chậm thêm 20 ngày do thời tiết.", dong("thu_hai"))).toMatch(/cộng dồn/);
  });
  it("③ «Hợp đồng tín dụng chưa rõ trách nhiệm» — hồ sơ đã thành việc", () => {
    expect(
      soatDong("Thiếu 78/97 hồ sơ; Hợp đồng tín dụng quá hạn 265 ngày chưa rõ trách nhiệm chủ trì.", dong("phap_ly"))
    ).toMatch(/đã thành việc/);
  });
  it("câu đúng thì qua — kể cả khi AI viết gọn tên hồ sơ (đo 01/11: «Đánh giá tiếng ồn»)", () => {
    expect(
      soatDong("Thiếu 78/97 hồ sơ; Hợp đồng tín dụng quá hạn 265 ngày (đã thành việc); Đánh giá tiếng ồn quá hạn 241 ngày (chưa giao việc).", dong("phap_ly"))
    ).toBeNull();
    expect(soatDong("Đánh giá tác động tiếng ồn tuabin quá hạn 241 ngày, chưa giao việc; thiếu 78/97 hồ sơ.", dong("phap_ly"))).toBeNull();
    expect(soatDong("Tuần 41 chậm 34 ngày so với Baseline, tăng từ 29 ngày.", dong("tuan"))).toBeNull();
  });
  it("dòng tuần thiếu hệ, dòng hạng mục gắn «so với Baseline», dòng quá dài đều trượt", () => {
    expect(soatDong("Tuần 41 chậm 34 ngày, tuần 40 chậm 29 ngày.", dong("tuan"))).toMatch(/luật 36/);
    expect(soatDong("6.1 Hợp đồng cung cấp turbine chậm 61 ngày so với Baseline.", dong("goc"))).toMatch(/hệ so sánh/);
    expect(soatDong(Array(45).fill("chữ").join(" "), dong("goc"))).toMatch(/dài/);
  });
});
