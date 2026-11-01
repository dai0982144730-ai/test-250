// Kiểm độc lập Đợt 2 (KE-HOACH/31) B2-03 / M2-01: 14/17 đột biến sống — mọi đường mới của Đợt 2 chưa có bài giữ.
// Tệp này giữ: khuôn PL-11 / PL-13 / PL-14 · công cụ cần WBS không gọi sẵn · tra_ma theo dạng mã · gọn tên 100 ký tự ·
// mốc tuần · bộ chọn đủ công cụ cho bộ câu hỏi kiểm (78/78 lúc chốt 27/10).
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { chonCongCu, khuonCauQuen } from "@/lib/ai/chon-cong-cu";
import { agentTheoMa } from "@/lib/ai/chat-tools";
import { gonKetQuaCongCu } from "@/lib/ai/chat-gon-ket-qua";
import { dongTuan } from "@/lib/ai/chat-agent";
import { TOOL_SPECS } from "@/lib/ai/chat-types";
import { listProjects } from "@/lib/projects";

const ten = (cau: string) => khuonCauQuen(cau, listProjects()).map((x) => x.name);

describe("khuôn câu quen Đợt 2", () => {
  it("PL-14 không có mã WBS → từ đợt 3d (Pháp lý bỏ trống WBS được) gọi sẵn, không mang ma_wbs", () => {
    const k = khuonCauQuen("Giấy phép nào sắp hết hạn trong 30 ngày?", listProjects()).find((x) => x.name === "phaply_han_giay_phep");
    expect(k).toBeDefined();
    expect(k!.args.ma_wbs).toBeUndefined();
  });
  it("PL-14 có mã WBS → gọi sẵn kèm ma_wbs", () => {
    const k = khuonCauQuen("Giấy phép của 7.1.1 dự án HV sắp hết hạn chưa?", listProjects()).find((x) => x.name === "phaply_han_giay_phep");
    expect(k?.args.ma_wbs).toBe("7.1.1");
  });
  it("PL-14 không bắt nhầm «văn bản hết hiệu lực», «chứng nhận bảo hiểm» (B2-06)", () => {
    expect(ten("Văn bản nào của HV đã hết hiệu lực?")).not.toContain("phaply_han_giay_phep");
    expect(ten("Chứng nhận bảo hiểm HV sắp hết hạn chưa?")).not.toContain("phaply_han_giay_phep");
  });
  it("PL-11 bắt ĐTM; không bắt hồ sơ thiết kế / thanh toán (B2-07)", () => {
    expect(ten("Hồ sơ đánh giá tác động môi trường HV đã duyệt chưa?")).toContain("phaply_ho_so_thieu");
    expect(ten("Hồ sơ thiết kế HV đã duyệt chưa?")).not.toContain("phaply_ho_so_thieu");
    expect(ten("Hồ sơ thanh toán đợt 2 HV đã duyệt chưa?")).not.toContain("phaply_ho_so_thieu");
  });
  it("PL-13 không gọi sẵn tra văn bản (cần từ khoá — B2-04)", () => {
    expect(ten("Luật Lào về đầu tư điện quy định gì về thời hạn?")).not.toContain("phaply_tra_van_ban");
  });
});

describe("tra_ma — chọn agent theo dạng mã (B2-02)", () => {
  it.each([
    ["HV-06-03", "phaply"],
    ["HV-AI-44", "phaply"],
    ["AI-44", "phaply"],
    ["HV-K-09", "phaply"],
    ["K-09", "phaply"],
    ["1315/QĐ-UBND", "phaply"],
    ["ISS-PL-0115", "phaply"],
    ["CV-2026-0130", "base"],
    ["HD-548", "hopdong"],
    ["PG-NT-03-HV-HD02.01", "hopdong"],
    ["6.1.4", "tiendo"],
    ["A.1.6-02", "tiendo"],
    ["TP-HV-03", "tiendo"],
    ["ISS-2026-40-014", "tiendo"],
    ["P04", "tiendo"],
  ])("%s → %s", (ma, agent) => {
    expect(agentTheoMa(ma)).toBe(agent);
  });
});

describe("gọn kết quả — tên / tiêu đề không cụt ở 80 ký tự (M2-01)", () => {
  it("tiêu đề 120 ký tự có ngày ở ký tự ~85 vẫn giữ ngày, cắt ở khoảng trắng", () => {
    const tieuDe = "Quá hạn 259 ngày so với hạn phải có 09/02/2026: Hợp đồng tín dụng / văn bản thu xếp vốn cho dự án điện gió";
    const ds = Array.from({ length: 40 }, (_, i) => ({ id: `ISS-PL-${i}`, tieu_de: `${"Mục ".repeat(10)}${tieuDe}`.slice(0, 120), mo_ta: "x".repeat(400) }));
    const g = gonKetQuaCongCu({ issue: ds }, 12000, () => "");
    const ra = JSON.parse(g.chuoi.replace(/ …\[CẮT CỤT.*$/, "")) as { issue: Array<{ tieu_de?: string } | string> };
    const dau = ra.issue[0] as { tieu_de: string };
    expect(dau.tieu_de.length).toBeGreaterThan(80);
    expect(dau.tieu_de).not.toMatch(/\d\/\d…$/);
  });
});

describe("mốc tuần (TD-09, TD-13)", () => {
  it("27/10/2026 là W44 · tuần sau 02/11 – 08/11", () => {
    const d = dongTuan("2026-10-27");
    expect(d).toContain("Tuần này: 2026-W44 · 26/10/2026 – 01/11/2026");
    expect(d).toContain("Tuần sau: 2026-W45 · 02/11/2026 – 08/11/2026");
  });
  it("Chủ nhật vẫn thuộc tuần đang chạy", () => {
    expect(dongTuan("2026-11-01")).toContain("Tuần này: 2026-W44");
  });
});

describe("bộ chọn công cụ trên bộ câu hỏi kiểm (B2-03 — giữ 78/78 lúc chốt 27/10)", () => {
  const tep = path.resolve(process.cwd(), "..", "KE-HOACH", "31-BO-CAU-HOI-KIEM.json");
  const co = fs.existsSync(tep);
  it.skipIf(!co)("mọi câu có công cụ mong đợi ĐÃ CÓ trong danh mục → công cụ đó nằm trong tay AI (danh mục ∪ gọi sẵn)", () => {
    const bo = JSON.parse(fs.readFileSync(tep, "utf8")).cau as string[][];
    const coThat = new Set(TOOL_SPECS.map((s) => s.name));
    const truot: string[] = [];
    let tong = 0;
    for (const [ma, nhom, cau, mongDoi] of bo) {
      if (nhom === "bien") continue;
      const can = mongDoi!.split("+").map((x) => x.trim()).filter((x) => /^[a-z_]+$/.test(x) && coThat.has(x));
      if (!can.length) continue;
      tong++;
      const tay = new Set([...chonCongCu("admin" as never, cau!).map((s) => s.name), ...ten(cau!)]);
      if (!can.some((c) => tay.has(c))) truot.push(`${ma} ${cau}`);
    }
    expect(tong).toBeGreaterThanOrEqual(78);
    expect(truot).toEqual([]);
  });
});

describe("đợt 3 (PL-02) — luật 35: bỏ «(quá N tháng)» khi dòng đã có số ngày", () => {
  it("dòng có số ngày → bỏ cụm tháng", async () => {
    const { boThangKhiCoNgay } = await import("@/lib/ai/chat-agent");
    expect(boThangKhiCoNgay("• HV-01-03 — Nên bắt đầu: 19/02/2026 (quá 8 tháng) · Quá hạn: **160 ngày**")).toBe(
      "• HV-01-03 — Nên bắt đầu: 19/02/2026 · Quá hạn: **160 ngày**",
    );
  });
  it("dòng không có số ngày → để nguyên, không đoán", async () => {
    const { boThangKhiCoNgay } = await import("@/lib/ai/chat-agent");
    expect(boThangKhiCoNgay("Hồ sơ này quá hạn (quá 8 tháng)")).toBe("Hồ sơ này quá hạn (quá 8 tháng)");
  });
});

describe("nguonGon — không để tên tệp kỹ thuật lọt vào chữ người đọc (kiểm 30/10)", () => {
  const nguon = (file_goc: string) => [{ loai: "x", ma: "m", file_goc, thoi_diem_trich: "2026-10-30T00:00:00Z" }];
  it("đường dẫn kết thúc .json → bỏ", async () => {
    const { nguonGon } = await import("@/lib/ai/chat-tools");
    expect(nguonGon(nguon("data/hop-dong.json"))).toBe("x:m");
  });
  it("đường dẫn .json kèm lời mô tả phía sau → bỏ tên tệp, giữ lời mô tả", async () => {
    const { nguonGon } = await import("@/lib/ai/chat-tools");
    const r = nguonGon(nguon("data/nha-thau.json — bản sao sổ nhà thầu chính của agent Tiến độ"));
    expect(r).not.toMatch(/\.json/);
    expect(r).toContain("bản sao sổ nhà thầu chính");
  });
  it("tên màn / tệp người dùng nhìn thấy được (không phải .json) → giữ", async () => {
    const { nguonGon } = await import("@/lib/ai/chat-tools");
    expect(nguonGon(nguon("Màn Báo cáo tuần agent Công việc"))).toContain("Màn Báo cáo tuần agent Công việc");
  });
});
