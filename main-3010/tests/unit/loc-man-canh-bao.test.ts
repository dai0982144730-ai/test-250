// ============================================================
// BỘ LỌC MÀN CẢNH BÁO MAIN — src/lib/issue-main/loc-man.ts (Mr. Đại duyệt demo bản 3, 01/11/2026)
// Chặn tái phạm lỗi anh bắt: «60 issue mà cộng số trên tab ra 62» — chip chủ đề phải cộng đúng «Tất cả».
// ============================================================

import { describe, expect, it } from "vitest";
import { BO_LOC_DAU, QUAN_TRONG, cacAgent, dsHien, nenLoc, quaLoc, soNgayQuaHan, trenGang } from "@/lib/issue-main/loc-man";
import { MOI_NHOM, nhomChinhCuaIssue, type IssueMain } from "@/lib/issue-main/model";
import { vanTapIssue } from "@/lib/issue-main/nhip-dem";

let dem = 0;
function is(p: Partial<IssueMain>): IssueMain {
  dem++;
  return {
    id: `I-${dem}`,
    agentChu: "tiendo",
    tenAgentChu: "Agent Tiến độ",
    tieuDe: `Issue ${dem}`,
    moTa: "",
    nguonDuLieu: "nguồn thử",
    dieuKienDong: "Đóng khi hết vi phạm",
    mucDo: "vang",
    nhomChinh: "khac",
    nhomPhu: [],
    doLlmSinh: false,
    doNguoiThem: false,
    soNgayAnhHuong: null,
    tienAnhHuongVnd: null,
    daDong: false,
    ...p,
  } as IssueMain;
}

const ds = [
  is({ tieuDe: "⛓ Cung cấp turbine chưa khởi công", mucDo: "do", nhomChinh: "thiet-bi", nhomPhu: ["duong-gang"], soNgayAnhHuong: 64 }),
  is({ tieuDe: "Quá hạn 264 ngày so với hạn phải có: Hợp đồng tín dụng", agentChu: "phaply", tenAgentChu: "Agent Pháp lý", nhomChinh: "phap-ly" }),
  is({ tieuDe: "Quá hạn 22 ngày so với hạn phải có: PPA", agentChu: "phaply", tenAgentChu: "Agent Pháp lý", nhomChinh: "phap-ly", lyDoChon: "Chặn ký PPA" }),
  is({ tieuDe: "Phiếu giá chờ ký", agentChu: "hopdong", tenAgentChu: "Agent Hợp đồng", mucDo: "do", nhomChinh: "hop-dong" }),
  is({ tieuDe: "Thiếu tôn lợp mái", nhomChinh: "khac" }),
  is({ tieuDe: "Đã đóng", daDong: true, nhomChinh: "cod" }),
  is({ tieuDe: "Đang ẩn", an: true, nhomChinh: "mat-bang" }),
];

describe("bộ lọc màn Cảnh báo", () => {
  const nen = nenLoc(ds, false, false);

  it("nền bỏ issue đã đóng và issue đang ẩn; bật hiện ẩn / xem đã đóng thì có lại", () => {
    expect(nen).toHaveLength(5);
    expect(nenLoc(ds, false, true)).toHaveLength(6);
    expect(nenLoc(ds, true, false).map((i) => i.tieuDe)).toEqual(["Đã đóng"]);
  });

  it("chip chủ đề chỉ đếm nhóm chính — cộng lại đúng bằng «Tất cả» (lỗi 60/62)", () => {
    const tong = MOI_NHOM.reduce((a, n) => a + nen.filter((i) => nhomChinhCuaIssue(i) === n).length, 0);
    expect(tong).toBe(nen.length);
    // issue có nhóm PHỤ đường găng không làm chip Đường găng tăng
    expect(quaLoc(nen, { ...BO_LOC_DAU, chuDe: "duong-gang" })).toHaveLength(0);
  });

  it("ô Mức độ quan trọng: đúng 5 lựa chọn, đúng thứ tự anh chốt; không có «kéo lùi COD»", () => {
    expect(QUAN_TRONG.map((q) => q.nhan)).toEqual([
      "Tất cả — nặng nhất trước",
      "Chỉ nghiêm trọng",
      "Trên đường găng",
      "Có quá hạn — lâu nhất trước",
      "AI chọn: cần anh xem",
    ]);
  });

  it("đếm từng lựa chọn", () => {
    const so = (ma: string) => nen.filter(QUAN_TRONG.find((q) => q.ma === ma)!.loc).length;
    expect([so("nang"), so("do"), so("gang"), so("qua-han"), so("can-xem")]).toEqual([5, 2, 1, 2, 1]);
  });

  it("nặng nhất trước: nghiêm trọng + găng + kéo lùi COD lên đầu; «có quá hạn» xếp số ngày giảm dần", () => {
    expect(dsHien(nen, BO_LOC_DAU)[0]!.tieuDe).toContain("turbine");
    expect(dsHien(nen, { ...BO_LOC_DAU, quanTrong: "qua-han" }).map(soNgayQuaHan)).toEqual([264, 22]);
  });

  it("ba tầng lọc chồng nhau; đếm mỗi tầng bỏ qua chính nó", () => {
    const b = { chuDe: "phap-ly" as const, agent: "phaply", quanTrong: "can-xem" as const };
    expect(quaLoc(nen, b)).toHaveLength(1);
    expect(quaLoc(nen, b, "quanTrong")).toHaveLength(2);
    expect(quaLoc(nen, b, "chuDe")).toHaveLength(1);
  });

  it("danh sách agent lấy từ dữ liệu, không gắn cứng", () => {
    expect(cacAgent(nen).map((a) => a.ma)).toEqual(["tiendo", "phaply", "hopdong"]);
  });

  it("trên găng nhận cả nhóm phụ và dấu ⛓", () => {
    expect(trenGang(ds[0]!)).toBe(true);
    expect(trenGang(ds[1]!)).toBe(false);
  });
});

describe("nhịp đêm — dấu vân tập issue", () => {
  it("không phụ thuộc thứ tự; đổi khi có issue mới", () => {
    expect(vanTapIssue(["a", "b"])).toBe(vanTapIssue(["b", "a"]));
    expect(vanTapIssue(["a", "b"])).not.toBe(vanTapIssue(["a", "b", "c"]));
  });
});
