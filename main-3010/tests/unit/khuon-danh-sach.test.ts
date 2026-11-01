// Khuôn danh sách (Mr. Đại chốt 28/10/2026) — thuần, không AI, không mạng.
import { describe, expect, it } from "vitest";
import { CAI_DAT_MAC_DINH, apDungKhuon, chonChinh, chuanHoaCaiDat, doiXemHet, ngayIso } from "@/lib/ai/khuon-danh-sach-thuan";

const bao = (ten: string, ds: unknown[], args = {}, tin = "", caiDat = CAI_DAT_MAC_DINH) =>
  apDungKhuon({ ten, args, ketQua: { ok: true, summary: "x", data: { du_lieu: { issue: ds, ho_so_thieu: ds, viec: ds, dong: ds, ma: ds, ho_so: ds, viec_gang_dang_tre: ds } } }, caiDat, tin, homNay: "2026-10-28" });
const so = (r: ReturnType<typeof apDungKhuon>, k: string) => ((r.data as { du_lieu: Record<string, unknown[]> }).du_lieu[k] ?? []).length;

describe("theo mức — đỏ trước, vàng sau", () => {
  const ds = [
    ...Array.from({ length: 4 }, (_, i) => ({ id: `d${i}`, mucDo: "do", so_ngay_qua_han: 10 + i })),
    ...Array.from({ length: 20 }, (_, i) => ({ id: `v${i}`, mucDo: "vang", so_ngay_qua_han: i })),
  ];
  it("4 đỏ + 20 vàng → 10 dòng: 4 đỏ đứng đầu, lấp vàng, ghi «Còn 14»", () => {
    const r = apDungKhuon({ ten: "danh_sach_issue", args: {}, ketQua: { ok: true, summary: "s", data: { du_lieu: { issue: ds } } }, caiDat: CAI_DAT_MAC_DINH, homNay: "2026-10-28" });
    const out = (r.data as { du_lieu: { issue: { id: string }[] } }).du_lieu.issue;
    expect(out).toHaveLength(10);
    expect(out.slice(0, 4).every((x) => x.id.startsWith("d"))).toBe(true);
    expect(r.summary).toContain("Còn 14 mục nữa");
  });
  it("12 đỏ → chỉ 10 đỏ, không có vàng", () => {
    const nhieuDo = Array.from({ length: 12 }, (_, i) => ({ id: `d${i}`, mucDo: "do", so_ngay_qua_han: i })).concat([{ id: "v", mucDo: "vang", so_ngay_qua_han: 99 }]);
    const r = apDungKhuon({ ten: "danh_sach_issue", args: {}, ketQua: { ok: true, summary: "s", data: { du_lieu: { issue: nhieuDo } } }, caiDat: CAI_DAT_MAC_DINH, homNay: "2026-10-28" });
    const out = (r.data as { du_lieu: { issue: { mucDo: string }[] } }).du_lieu.issue;
    expect(out).toHaveLength(10);
    expect(out.every((x) => x.mucDo === "do")).toBe(true);
  });
  it("≤ 10 dòng → nguyên kết quả, không ghi chú", () => {
    const r = bao("danh_sach_issue", ds.slice(0, 8));
    expect(r.summary).toBe("x");
  });
});

describe("công tắc và «xem hết»", () => {
  const ds = Array.from({ length: 30 }, (_, i) => ({ mucDo: "vang", so_ngay_qua_han: i }));
  it("chế độ đầy đủ → nguyên", () => {
    const cd = chuanHoaCaiDat({ muc: { cheDo: "day-du" } });
    expect(so(bao("danh_sach_issue", ds, {}, "", cd), "issue")).toBe(30);
  });
  it("người dùng gõ «xem hết» → nguyên lượt đó", () => {
    expect(so(bao("danh_sach_issue", ds, {}, "Cho tôi xem hết issue"), "issue")).toBe(30);
    expect(so(bao("danh_sach_issue", ds, {}, "Có issue nào đang mở?"), "issue")).toBe(10);
  });
  it("doiXemHet nhận không dấu", () => {
    for (const t of ["xem hết", "xem het", "liệt kê đủ", "toàn bộ danh sách", "tất cả các dòng", "cho tôi đầy đủ"]) expect(doiXemHet(t), t).toBe(true);
    for (const t of ["việc nào quá hạn", "hết hạn hôm nay", "bao nhiêu việc"]) expect(doiXemHet(t), t).toBe(false);
  });
  it("cài đặt thiếu/hỏng → mặc định cắt gọn, số dòng kẹp 1…200", () => {
    expect(chuanHoaCaiDat(null).muc.cheDo).toBe("khuon");
    expect(chuanHoaCaiDat({ muc: { soDong: 9999 } }).muc.soDong).toBe(200);
    expect(chuanHoaCaiDat({ boq: { soDong: 15, soDongToiDa: 5 } }).boq.soDongToiDa).toBe(15);
  });
});

describe("theo ngày — chỉ quá hạn và 7 ngày tới khi không nêu khoảng", () => {
  const ds = [
    ...Array.from({ length: 15 }, (_, i) => ({ ho: `a${i}`, ngay_nen_bat_dau: `2026-10-${String(10 + (i % 15)).padStart(2, "0")}` })),
    { ho: "xa", ngay_nen_bat_dau: "2027-03-01" },
  ];
  it("hồ sơ ngày xa (2027) bị loại, còn lại cắt 10", () => {
    const r = bao("phaply_doi_ngay_nen_bat_dau", ds);
    const out = (r.data as { du_lieu: { ho_so: { ho: string }[] } }).du_lieu.ho_so;
    expect(out.length).toBeLessThanOrEqual(10);
    expect(out.some((x) => x.ho === "xa")).toBe(false);
  });
  it("người hỏi có nêu khoảng ngày → không lọc 7 ngày (chỉ cắt N dòng gần hôm nay)", () => {
    const r = bao("phaply_doi_ngay_nen_bat_dau", [...ds, ...ds.map((x, i) => ({ ...x, ho: `b${i}`, ngay_nen_bat_dau: "2027-03-01" }))], { tu_ngay: "2026-10-01", den_ngay: "2027-12-31" });
    expect(so(r, "ho_so")).toBe(10);
  });
  it("ngayIso đọc cả dd/mm/yyyy và yyyy-mm-dd", () => {
    expect(ngayIso("11/10/2026")).toBe("2026-10-11");
    expect(ngayIso("2026-10-11T08:00:00Z")).toBe("2026-10-11");
    expect(ngayIso("không có")).toBe("");
  });
});

describe("xếp hạng chậm", () => {
  it("đường găng: 21 việc → 10 việc chậm nhiều ngày nhất", () => {
    const ds = Array.from({ length: 21 }, (_, i) => ({ wbs: `w${i}`, so_ngay_tre: i }));
    const r = bao("duong_gang", ds);
    const out = (r.data as { du_lieu: { viec_gang_dang_tre: { so_ngay_tre: number }[] } }).du_lieu.viec_gang_dang_tre;
    expect(out.map((x) => x.so_ngay_tre)).toEqual([20, 19, 18, 17, 16, 15, 14, 13, 12, 11]);
  });
  it("Gantt: 27 dòng → 10 dòng chậm nhất theo hệ chậm hơn; dòng chưa có số coi như 0", () => {
    const ds = Array.from({ length: 27 }, (_, i) => ({
      wbs: `w${i}`,
      // xen kẽ: dòng chẵn chậm theo Tiến độ mục tiêu, dòng lẻ chậm theo Baseline
      cham_so_muc_tieu: i % 2 === 0 ? { ngay: i } : { ngay: -5 },
      cham_so_baseline: i % 2 === 1 ? { ngay: i } : undefined,
    }));
    const r = bao("bang_gantt", ds);
    const out = (r.data as { du_lieu: { dong: { wbs: string }[] } }).du_lieu.dong;
    expect(out.map((x) => x.wbs)).toEqual(["w26", "w25", "w24", "w23", "w22", "w21", "w20", "w19", "w18", "w17"]);
    expect(r.summary).toContain("Còn 17 mục nữa");
  });
});

describe("BOQ — khối lượng chính 10–20 dòng, vượt thiết kế luôn hiện", () => {
  it("chonChinh: kẹp trong [10, 20] và lấy tỷ trọng lớn trước", () => {
    const ds = Array.from({ length: 60 }, (_, i) => ({ ma: `m${i}`, w: 60 - i }));
    const g = chonChinh(ds, (r) => r.w as number, 10, 20);
    expect(g.length).toBeGreaterThanOrEqual(10);
    expect(g.length).toBeLessThanOrEqual(20);
    expect((g[0] as { ma: string }).ma).toBe("m0");
  });
  it("trọng số dồn vào 3 dòng → vẫn giữ tối thiểu 10", () => {
    const ds = [{ w: 1000 }, { w: 900 }, { w: 800 }, ...Array.from({ length: 40 }, () => ({ w: 1 }))];
    expect(chonChinh(ds, (r) => r.w as number, 10, 20)).toHaveLength(10);
  });
  it("lũy kế BOQ: dòng vượt thiết kế ngoài nhóm chính vẫn hiện", () => {
    const ds = [
      ...Array.from({ length: 50 }, (_, i) => ({ ma_boq: `b${i}`, kl_boq: 100, da_thi_cong: 10, ty_trong: 50 - i })),
      { ma_boq: "vuot", kl_boq: 100, da_thi_cong: 130, ty_trong: 0.01 },
    ];
    const r = bao("luy_ke_boq", ds);
    const out = (r.data as { du_lieu: { dong: { ma_boq: string }[] } }).du_lieu.dong;
    expect(out.some((x) => x.ma_boq === "vuot")).toBe(true);
    expect(out.length).toBeLessThan(30);
  });
});
