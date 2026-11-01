// LUẬT 33 — HỎI TRÙNG TRƯỚC KHI SOẠN VIỆC (Mr. Đại chốt 04/10/2026): phần THUẦN — máy lọc ứng viên, khuôn 🤖 AI phán,
// bộ điều phối hỏi lại 3 lần. Không gọi AI thật, không gọi mạng (hàm gọi được tiêm vào).
import { describe, it, expect, vi } from "vitest";
import {
  cauDaCoAgentSoan,
  dieuPhoiHoiTrung,
  docCauHoiTrung,
  docPhanTrung,
  locUngVienTrung,
  phanTrung,
  quanHeWbs,
  tomTatHoiTrung,
  type TraLoiTrung,
  type ViecDeSo,
} from "@/lib/chung/hoi-trung-kieu";

// Ca thật đo 05/10: 6.1.4 có CV-2026-0124 (Cây việc) rồi Tiến độ vẫn giao CV-2026-0132
const CV0124: ViecDeSo = {
  ma: "CV-2026-0124",
  noi_dung: "[Điện gió Hướng Việt] Xử lý 6.1.4 — Cung cấp Hub, Nacelle, Blade. Drive Train, Cooler Tops, Switchgear đến cảng Hòn La",
  ma_du_an: "HV",
  ma_wbs: "6.1.4",
  trang_thai: "da_giao",
  nguoi_nhan: "Nguyễn Văn Đoài",
};
const THIET_KE_711: ViecDeSo = { ma: "CV-2026-0200", noi_dung: "Thiết kế bản vẽ thi công hạng mục khởi công", ma_du_an: "HV", ma_wbs: "7.1.1", trang_thai: "da_giao" };
const DU_AN_KHAC: ViecDeSo = { ...CV0124, ma: "CV-2026-0300", ma_du_an: "N3A" };
const CAU_614 = {
  noi_dung: "Khởi công 6.1.4 Cung cấp Hub, Nacelle, Blade để gỡ 20 việc dời 27 ngày",
  ly_do: "Issue ISS-2026-39-140 gốc chuỗi găng",
  ma_du_an: "HV",
  ma_wbs: "6.1.4",
};

describe("đọc câu hỏi từ tham số cổng", () => {
  it("thiếu nội dung / hạn sai dạng → câu báo tiếng Việt", () => {
    expect(docCauHoiTrung({})).toMatch(/Thiếu nội dung/);
    // Kiểm lần 5: dd/mm/yyyy nay được nhận (đổi về yyyy-mm-dd) — chỉ chữ không phải ngày mới bị từ chối
    expect(docCauHoiTrung({ noi_dung: "Làm hồ sơ", han: "tuần sau" })).toMatch(/yyyy-mm-dd hoặc dd\/mm\/yyyy/);
    expect(docCauHoiTrung({ noi_dung: "Làm hồ sơ HV-09-01", ma_du_an: " HV " })).toMatchObject({ ma_du_an: "HV", ly_do: "" });
  });
});

describe("máy lọc ứng viên — chỉ để đưa AI phán", () => {
  it("quan hệ WBS: trùng · cha–con · không", () => {
    expect(quanHeWbs("6.1.4", "6.1.4")).toBe("trung");
    expect(quanHeWbs("6.1", "6.1.4")).toBe("cha_con");
    expect(quanHeWbs("6.1.4", "6.1.40")).toBeNull();
    expect(quanHeWbs("người:p-dtpc", "6.1")).toBeNull();
  });

  it("ca 6.1.4: bắt được CV-2026-0124, bỏ dự án khác và việc khác mã", () => {
    const ung = locUngVienTrung(CAU_614, [THIET_KE_711, DU_AN_KHAC, CV0124]);
    expect(ung.map((v) => v.ma)).toEqual(["CV-2026-0124"]);
  });

  it("cùng mã WBS vẫn chỉ là ỨNG VIÊN (đo 04/10: 6/7 nhóm cùng WBS là việc khác) — người phán là AI", () => {
    const ung = locUngVienTrung({ noi_dung: "Xin giấy phép xây dựng", ly_do: "", ma_du_an: "HV", ma_wbs: "7.1.1" }, [THIET_KE_711]);
    expect(ung).toHaveLength(1);
  });

  it("không cùng mã nhưng chữ phủ ≥ 60% với ≥ 3 từ chung → ứng viên; phủ ít → bỏ", () => {
    const v: ViecDeSo = { ma: "N1", noi_dung: "Làm hồ sơ hợp đồng tín dụng thu xếp vốn dự án", ma_du_an: "HV", trang_thai: "cho_duyet" };
    expect(locUngVienTrung({ noi_dung: "Hoàn thiện hợp đồng tín dụng thu xếp vốn", ly_do: "", ma_du_an: "HV" }, [v])).toHaveLength(1);
    expect(locUngVienTrung({ noi_dung: "Đổ bê tông móng trụ T5", ly_do: "", ma_du_an: "HV" }, [v])).toHaveLength(0);
  });

  it("nháp giữ chỗ của bên kia mà giữ SAU bên hỏi → bỏ (bên kia nhường); giữ TRƯỚC → ứng viên", () => {
    const giu = (luc: string): ViecDeSo => ({ ...CV0124, ma: "NH-1", trang_thai: "dang_hoi", luc });
    const cau = { ...CAU_614, luc_giu_cho: "2026-10-05T01:00:00.000Z" };
    expect(locUngVienTrung(cau, [giu("2026-10-05T01:00:05.000Z")])).toHaveLength(0);
    expect(locUngVienTrung(cau, [giu("2026-10-05T00:59:55.000Z")])).toHaveLength(1);
  });
});

describe("🤖 AI phán", () => {
  it("bóc câu AI: trùng đúng mã · không trùng · mã lạ → null · rác → null", () => {
    expect(docPhanTrung('{"trung":true,"ma":"CV-2026-0124","ly_do":"cùng 6.1.4 Cung cấp thiết bị"}', [CV0124])?.viec?.ma).toBe("CV-2026-0124");
    expect(docPhanTrung('```json\n{"trung":false,"ma":null,"ly_do":"khác hành động"}\n```', [CV0124])).toEqual({ trung: false, ly_do: "khác hành động" });
    expect(docPhanTrung('{"trung":true,"ma":"CV-9999","ly_do":"x"}', [CV0124])).toBeNull();
    expect(docPhanTrung("không biết", [CV0124])).toBeNull();
  });

  it("không ứng viên → KHÔNG gọi AI (0 token)", async () => {
    const ai = vi.fn(async () => "{}");
    const kq = await phanTrung(CAU_614, [THIET_KE_711], ai);
    expect(kq).toEqual({ trung: false, cach_phan: "khong_ung_vien", so_ung_vien: 0 });
    expect(ai).not.toHaveBeenCalled();
  });

  it("có ứng viên → AI phán; AI lỗi → ai_loi kèm việc nghi để người xem lại", async () => {
    const tl = await phanTrung(CAU_614, [CV0124], async () => '{"trung":true,"ma":"CV-2026-0124","ly_do":"cùng việc"}');
    expect(tl).toMatchObject({ trung: true, cach_phan: "ai", viec: { ma: "CV-2026-0124" } });
    const loi = await phanTrung(CAU_614, [CV0124], async () => {
      throw new Error("hết hạn mức");
    });
    expect(loi).toMatchObject({ trung: false, cach_phan: "ai_loi", nghi: { ma: "CV-2026-0124" } });
  });
});

describe("câu ghi ra khi trùng — nguyên văn anh chốt", () => {
  it("việc đã giao / nháp chờ duyệt", () => {
    expect(cauDaCoAgentSoan("base", CV0124)).toBe(
      `Việc này đã được agent Công việc soạn giao việc có nội dung là "${CV0124.noi_dung}" (việc CV-2026-0124 đã giao cho Nguyễn Văn Đoài)`,
    );
    expect(cauDaCoAgentSoan("phaply", { ma: "VCD-1", noi_dung: "Làm hồ sơ HV-09-01", trang_thai: "cho_duyet" })).toMatch(
      /^Việc này đã được agent Pháp lý soạn giao việc có nội dung là "Làm hồ sơ HV-09-01" \(nháp VCD-1 đang chờ duyệt ở agent Pháp lý\)$/,
    );
  });
});

describe("bộ điều phối hỏi lại 3 lần", () => {
  const khong: TraLoiTrung = { trung: false, cach_phan: "khong_ung_vien", so_ung_vien: 0 };
  const coTrung = (v: ViecDeSo): TraLoiTrung => ({ trung: true, viec: v, cach_phan: "ai", so_ung_vien: 1, ly_do: "cùng việc" });
  const khongBaoGioHet = () => new Promise<void>(() => undefined);

  it("máy soạn (nền): agent tắt 2 lần đầu, lần 3 thưa → đã hỏi đủ; đồng hồ chờ đúng 60 giây rồi 120 giây", async () => {
    const cho: number[] = [];
    let lanBase = 0;
    const kq = await dieuPhoiHoiTrung(
      ["base", "phaply"],
      async (a) => (a === "base" ? (lanBase++ < 2 ? null : khong) : khong),
      { cho: "nen", ngu: async (ms) => void cho.push(ms), hetGio: khongBaoGioHet },
    );
    expect(cho).toEqual([60_000, 120_000]);
    expect(kq.da_hoi.sort()).toEqual(["base", "phaply"]);
    expect(kq.chua_hoi_duoc).toEqual([]);
  });

  it("agent im cả 3 lần → trả 'chưa hỏi được' (rồi bên gọi cứ soạn)", async () => {
    const kq = await dieuPhoiHoiTrung(["hopdong"], async () => null, { cho: "nen", ngu: async () => undefined, hetGio: khongBaoGioHet });
    expect(kq.chua_hoi_duoc).toEqual(["hopdong"]);
    expect(tomTatHoiTrung(kq)).toMatch(/chưa hỏi được agent Hợp đồng/);
  });

  it("agent treo quá 15 giây tính là không thưa", async () => {
    const kq = await dieuPhoiHoiTrung(["main"], () => new Promise(() => undefined), { cho: "nguoi", ngu: async () => undefined, hetGio: async () => undefined });
    expect(kq.chua_hoi_duoc).toEqual(["main"]);
  });

  it("người đang chờ: trả ngay sau lần 1, hỏi ngầm phần còn lại rồi báo kết quả muộn", async () => {
    let lan = 0;
    const muon = new Promise<unknown>((xong) => {
      void dieuPhoiHoiTrung(["tiendo"], async () => (lan++ === 0 ? null : coTrung(CV0124)), {
        cho: "nguoi",
        ngu: async () => undefined,
        hetGio: khongBaoGioHet,
        sauKhiHoiNot: xong,
      }).then((dau) => {
        expect(dau.trung).toBeNull();
        expect(dau.chua_hoi_duoc).toEqual(["tiendo"]);
      });
    });
    expect(await muon).toMatchObject({ trung: { agent: "tiendo", viec: { ma: "CV-2026-0124" } }, chua_hoi_duoc: [] });
  });

  it("nhiều bên cùng trùng → ưu tiên việc ĐÃ GIAO hơn nháp; thấy trùng thì thôi gọi lại", async () => {
    const goi = vi.fn(async (a: string) =>
      a === "phaply" ? coTrung({ ma: "VCD-1", noi_dung: "nháp", trang_thai: "cho_duyet" }) : a === "base" ? coTrung(CV0124) : null,
    );
    const kq = await dieuPhoiHoiTrung(["phaply", "base", "hopdong"], goi, { cho: "nen", ngu: async () => undefined, hetGio: khongBaoGioHet });
    expect(kq.trung?.viec?.ma).toBe("CV-2026-0124");
    expect(goi).toHaveBeenCalledTimes(3); // hopdong không thưa nhưng đã thấy trùng → không gọi lại
  });
});

describe("kiểm độc lập lần 5 (05/10)", () => {
  it("🔴1: hạn dd/mm/yyyy được nhận và đổi về yyyy-mm-dd; sai dạng thì báo câu tiếng Việt", async () => {
    const { docCauHoiTrung, chuanHanHoiTrung } = await import("@/lib/chung/hoi-trung-kieu");
    expect(docCauHoiTrung({ noi_dung: "Họp dân thôn 3 về đền bù", han: "14/10/2026" })).toMatchObject({ han: "2026-10-14" });
    expect(docCauHoiTrung({ noi_dung: "Họp dân thôn 3 về đền bù", han: "2026-10-14" })).toMatchObject({ han: "2026-10-14" });
    expect(docCauHoiTrung({ noi_dung: "Họp dân thôn 3 về đền bù", han: "5/1/2027" })).toMatchObject({ han: "2027-01-05" });
    expect(docCauHoiTrung({ noi_dung: "Họp dân thôn 3 về đền bù", han: "mai" })).toBe("Hạn phải dạng yyyy-mm-dd hoặc dd/mm/yyyy.");
    expect(chuanHanHoiTrung("")).toBeNull();
    expect(chuanHanHoiTrung("32/10/2026")).toBeUndefined();
  });

  it("agent TỪ CHỐI câu hỏi → không gọi lại (vẫn ghi chưa hỏi được); agent IM → vẫn gọi lại đủ 3 lần", async () => {
    const { dieuPhoiHoiTrung } = await import("@/lib/chung/hoi-trung-kieu");
    const goi: Record<string, number> = {};
    const kq = await dieuPhoiHoiTrung(
      ["tiendo", "hopdong"],
      async (ma) => {
        goi[ma] = (goi[ma] ?? 0) + 1;
        return ma === "tiendo" ? "tu_choi" : null;
      },
      { cho: "nen", ngu: async () => undefined },
    );
    expect(goi).toEqual({ tiendo: 1, hopdong: 3 });
    expect(kq.chua_hoi_duoc.sort()).toEqual(["hopdong", "tiendo"]);
  });
});

describe("câu kiểm nhanh kiem_ma (Mr. Đại chốt 05/10 — chỉ hỏi lại bản ghi trùng khi việc bên kia đổi trạng thái)", () => {
  it("còn → trả việc + trạng thái hiện tại; không còn → trung=false; không bao giờ gọi AI", async () => {
    const { phanTrung, docCauHoiTrung } = await import("@/lib/chung/hoi-trung-kieu");
    const ai = vi.fn(async () => "{}");
    const ds = [{ ma: "CV-2026-0124", noi_dung: "Xử lý 6.1.4", ma_du_an: "HV", ma_wbs: "6.1.4", trang_thai: "da_giao" as const }];
    const cau = docCauHoiTrung({ noi_dung: "Kiểm việc trùng cũ", kiem_ma: "CV-2026-0124", ma_du_an: "HV" });
    if (typeof cau === "string") throw new Error(cau);
    expect(await phanTrung(cau, ds, ai)).toMatchObject({ trung: true, viec: { ma: "CV-2026-0124", trang_thai: "da_giao" }, so_ung_vien: 1 });
    expect(await phanTrung({ ...cau, kiem_ma: "CV-2026-0999" }, ds, ai)).toMatchObject({ trung: false, so_ung_vien: 0 });
    expect(ai).not.toHaveBeenCalled();
  });
});


describe("máy soạn NỀN nhiều việc một lượt — taoHoiTrungNen (05/10)", () => {
  const KHONG: TraLoiTrung = { trung: false, cach_phan: "khong_ung_vien", so_ung_vien: 0 };
  it("agent im đủ 3 lần ở việc đầu → việc sau không gọi lại, vẫn ghi chưa hỏi được; trùng sớm thì agent hụt lần 1 KHÔNG bị coi là im", async () => {
    const { taoHoiTrungNen } = await import("@/lib/chung/hoi-trung-kieu");
    const goi: string[] = [];
    let coTrung = false;
    const hoi = taoHoiTrungNen(
      ["tiendo", "base", "main"],
      () => async (ma, lan) => {
        goi.push(`${ma}#${lan}`);
        if (ma === "main") return null;
        if (coTrung && ma === "base") return { trung: true, cach_phan: "ai", so_ung_vien: 1, viec: { ma: "CV-test-1", noi_dung: "test", trang_thai: "da_giao" } };
        if (coTrung && ma === "tiendo") return null; // hụt lần 1 đúng lúc base báo trùng
        return KHONG;
      },
      async () => undefined,
    );
    const a = await hoi({ noi_dung: "việc 1", ly_do: "test" });
    expect(goi.filter((x) => x.startsWith("main"))).toEqual(["main#0", "main#1", "main#2"]);
    expect(a.chua_hoi_duoc).toEqual(["main"]);
    goi.length = 0;
    coTrung = true;
    const b = await hoi({ noi_dung: "việc 2", ly_do: "test" });
    expect(goi.some((x) => x.startsWith("main"))).toBe(false);
    expect(b.trung?.agent).toBe("base");
    expect(b.chua_hoi_duoc.sort()).toEqual(["main", "tiendo"]);
    goi.length = 0;
    coTrung = false;
    await hoi({ noi_dung: "việc 3", ly_do: "test" });
    expect(goi.filter((x) => x.startsWith("tiendo"))).toEqual(["tiendo#0"]); // tiendo vẫn được hỏi
  });
});
