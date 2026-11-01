import { describe, expect, it } from "vitest";
import { BI_DANH, NHOM_LOI, chonCongCu, khuonCauQuen } from "@/lib/ai/chon-cong-cu";
import { TOOL_SPECS } from "@/lib/ai/chat-types";
import { duocQuaCua } from "@/lib/quyen";

const ten = (cauHoi: string, role: "pm" | "engineer" = "pm") =>
  chonCongCu(role, cauHoi).map((s) => s.name);

describe("chọn công cụ theo câu hỏi (B4)", () => {
  it("nhóm lõi luôn có mặt", () => {
    for (const c of ["Tuần này chậm ở đâu?", "Cập nhật 7.2.2 lên 80%", "COD lùi không?"]) {
      const ds = ten(c);
      for (const loi of NHOM_LOI) expect(ds, `câu: ${c}`).toContain(loi);
    }
  });

  it("giữ đúng công cụ mà câu hỏi cần", () => {
    // ⭐ 24/09: số tiến độ đi hỏi cổng tiendo.* — không còn công cụ ghi %/baseline
    expect(ten("Giao việc cho anh Thịnh ngày mai test phần mềm")).toContain("danh_ba_base");
    expect(ten("Đường găng hiện đi qua những việc nào?")).toContain("duong_gang");
    expect(ten("COD có bị lùi không?")).toContain("du_bao");
    expect(ten("HV đang chậm bao nhiêu ngày, vì sao")).toContain("du_bao");
    expect(ten("Năng suất đổ bê tông tuần trước thế nào")).toContain("nang_suat");
    expect(ten("Khối lượng thầu phụ SNP tuần này")).toContain("khoi_luong_hang_muc");
  });

  it("mọi khoá bí danh phải là tên công cụ THẬT (lỗi đã mắc 06/09)", () => {
    const ten = new Set(TOOL_SPECS.map((s) => s.name));
    for (const k of Object.keys(BI_DANH)) expect(ten, `bí danh lạ: ${k}`).toContain(k);
  });

  it("câu mơ hồ thì trả ĐỦ danh mục — thà tốn token hơn mất công cụ", () => {
    const du = TOOL_SPECS.filter((s) => duocQuaCua("pm", s.cua)).length;
    expect(ten("Chào bạn").length).toBe(du);
    expect(ten("").length).toBe(du);
  });

  it("vòng 2 trở đi mở đủ danh mục", () => {
    const du = TOOL_SPECS.filter((s) => duocQuaCua("pm", s.cua)).length;
    expect(chonCongCu("pm", "Năng suất đổ bê tông tuần trước thế nào", true).length).toBe(du);
  });

  it("công cụ GHI tiến độ không còn ở Main (24/09)", () => {
    const ds = TOOL_SPECS.map((s) => s.name);
    for (const cu of ["update_task_pct", "lock_baseline", "run_analysis", "viet_nhap_bao_cao"]) {
      expect(ds).not.toContain(cu);
    }
  });

  it("hai câu Mr. Đại hỏi 26/10: khối lượng BOQ hạng mục và hồ sơ thiết kế sắp cần phải có công cụ", () => {
    expect(ten("Cho tôi biết Khối lượng BOQ thiết kế chi tiết của hạng mục đường dây 110 của dự án hướng việt?")).toContain("boq_theo_hang_muc");
    expect(ten("Hiện có hồ sơ thiết kế nào mà PMC đang chưa thiết kế mà sắp phải cần để triển khai thi công? dự án hướng việt")).toContain("ho_so_thiet_ke");
    expect(ten("Nhà thầu EPC nhận khối lượng hợp đồng nào")).toContain("hop_dong_nha_thau");
  });

  it("lọc thì luôn ít hơn đủ bộ, và không rỗng", () => {
    const ds = ten("Năng suất đổ bê tông tuần trước thế nào");
    expect(ds.length).toBeGreaterThan(0);
    expect(ds.length).toBeLessThan(TOOL_SPECS.length);
  });
});

describe("khuôn lịch họp — kiểm độc lập 26/10 AI-07 (họp ↔ hợp)", () => {
  const da = [{ ma: "HV", name: "Điện gió Hướng Việt" }];
  const coLichHop = (c: string) => khuonCauQuen(c, da).some((x) => x.name === "base_lich_hop");
  it("câu có «hợp» không bắt nhầm", () => {
    for (const c of ["Trong trường hợp nào thì phạt?", "Hồ sơ đủ hợp lệ chưa?", "Hướng đi hợp lý cho gói thầu?", "Tham dự án Hướng Việt thế nào?", "Có trường hợp gì cần xử lý?"])
      expect(coLichHop(c)).toBe(false);
  });
  it("câu hỏi họp thật vẫn bắt", () => {
    for (const c of ["Sắp tới tôi có lịch họp gì?", "Mai tôi họp gì?", "Tuần này có cuộc họp nào?", "lich hop cua toi"]) expect(coLichHop(c)).toBe(true);
  });
});

describe("đợt 2 (26/10) — câu điều khoản không kéo công cụ tiến độ", () => {
  const da = [{ ma: "HV", name: "Điện gió Hướng Việt" }];
  const ten = (c: string) => khuonCauQuen(c, da).map((x) => x.name);
  it("«phạt chậm tiến độ» không gọi sẵn tom_tat_du_an", () => {
    expect(ten("HĐ 548 phạt chậm tiến độ bao nhiêu?")).not.toContain("tom_tat_du_an");
  });
  it("«HV chậm bao nhiêu ngày» vẫn gọi sẵn", () => {
    expect(ten("HV chậm bao nhiêu ngày?")).toContain("tom_tat_du_an");
  });
});

describe("kiểm độc lập đợt 1 🔴 CC-06 — «tôi … quá hạn» không lẫn «tới / tối / Minh»", () => {
  const da = [{ ma: "HV", name: "Điện gió Hướng Việt" }];
  const ten = (c: string) => khuonCauQuen(c, da).map((x) => x.name);
  it("việc của CHÍNH người hỏi → viec_base", () => {
    for (const c of ["Tôi có việc gì quá hạn?", "Việc quá hạn của tôi là gì?", "Mình đang có việc nào quá hạn không?"]) expect(ten(c)).toContain("viec_base");
  });
  it("không phải của người hỏi → không viec_base", () => {
    for (const c of ["Việc của anh Minh quá hạn bao nhiêu?", "Tuần tới có việc nào quá hạn?", "Cho tôi biết việc quá hạn của dự án HV"]) expect(ten(c)).not.toContain("viec_base");
    expect(ten("Việc quá hạn của dự án HV tuần tới")).toContain("base_viec_qua_han");
  });
  it("28/10: câu có «dự án» hoặc lời lịch sự (kể cả không dấu) → base_viec_qua_han, không viec_base", () => {
    const sai = [
      "cho toi biet viec nao qua han",
      "toi muon xem viec qua han cua du an HV",
      "Giúp tôi xem việc quá hạn của dự án HV",
      "Tôi muốn xem việc quá hạn của dự án HV",
      "Mình muốn biết dự án HV có việc nào quá hạn",
      "Báo cáo giúp tôi những việc quá hạn của dự án",
      "Xin chào, mình hỏi: việc nào quá hạn?",
    ];
    for (const c of sai) {
      expect(ten(c), c).toContain("base_viec_qua_han");
      expect(ten(c), c).not.toContain("viec_base");
    }
  });
  it("28/10: việc của chính mình vẫn đúng khi gõ không dấu", () => {
    for (const c of ["toi co viec gi qua han", "viec qua han cua toi"]) expect(ten(c), c).toContain("viec_base");
  });
});
