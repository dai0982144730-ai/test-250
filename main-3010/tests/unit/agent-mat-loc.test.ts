// Luật agent mật trên Main (Mr. Đại chốt 05/10/2026): thông tin Agent Hợp đồng hiện trên Main
// theo đúng luật của chính agent đó — hàm lọc thuần ở lib/agent-mat-loc.ts.
import { describe, expect, it } from "vitest";
import {
  AN_HET_MAT,
  agentMatTuTen,
  cauAnMat,
  laAgentMat,
  locBaoCaoSang,
  locBaoCaoThang,
  locManIssue,
  locMauThuan,
  locNhanDinhMauThuan,
  lyDoChanSoanNhanXet,
  type BoLocMat,
} from "@/lib/agent-mat-loc";
import { taoDong, type BaoCaoSang, type DongBaoCao } from "@/lib/bao-cao-sang/model";
import type { VanDeSang } from "@/lib/bao-cao-sang/luat-cod";
import { oCoSo, type BaoCaoThang, type OSo } from "@/lib/bao-cao-thang/model";
import type { KhoiMauThuan } from "@/lib/bang-dieu-hanh/mau-thuan-cheo";

/** Người dùng thuộc HV, không thuộc N3A */
const CHI_HV: BoLocMat = { thayHet: false, thay: (agent, duAn) => agent !== "hopdong" || duAn === "hv" };
const THAY_HET: BoLocMat = { thayHet: true, thay: () => true };

function vd(agent: string, maDuAn: string, id: string, kem: VanDeSang[] = []): VanDeSang {
  return {
    maDuAn,
    agent,
    tenAgent: agent === "hopdong" ? "Hợp đồng" : "Tiến độ",
    idIssue: id,
    wbs: "1.1",
    tieuDe: `thẻ ${id}`,
    lyDo: [],
    soNgayLuiCod: null,
    tienVnd: null,
    mucDo: "do",
    doLlmSinh: false,
    cauHoi: "🤖 câu hỏi",
    kem,
  } as VanDeSang;
}

function bcSang(): BaoCaoSang {
  return {
    ngay: "2026-10-05",
    soDuAn: 2,
    dong: [
      taoDong({ muc: "can-quyet", duAn: "Nậm Sam 3A", noiDung: "phiếu giá", nguon: "Hợp đồng · ISS-PG-1" }),
      taoDong({ muc: "can-quyet", duAn: "Hướng Việt", noiDung: "phiếu giá HV", nguon: "Hợp đồng · ISS-PG-2" }),
      taoDong({ muc: "can-quyet", duAn: "Nậm Sam 3A", noiDung: "chậm", nguon: "Tiến độ · ISS-T1", soNgayAnhHuong: 3 }),
    ].filter((d): d is DongBaoCao => d !== null),
    thieuSot: [],
    luatApDung: [],
    soDongBiLoaiVaThieuNguon: 0,
    dungLuc: "",
    daGuiLuc: null,
    duAn: [
      { maDuAn: "n3a", ten: "Nậm Sam 3A" },
      { maDuAn: "hv", ten: "Hướng Việt" },
    ] as BaoCaoSang["duAn"],
    vanDe: [
      vd("hopdong", "n3a", "ISS-PG-1", [vd("tiendo", "n3a", "ISS-T1")]),
      vd("tiendo", "n3a", "ISS-T2", [vd("hopdong", "n3a", "ISS-PG-3")]),
      vd("hopdong", "hv", "ISS-PG-2"),
    ],
    viecDoKhac: [
      { maDuAn: "n3a", agent: "hopdong", tenAgent: "Hợp đồng", idIssue: "ISS-X", wbs: null, tieuDe: "x", soNgayQuaHan: null, ngayMo: null, doLlmSinh: false },
      { maDuAn: "n3a", agent: "tiendo", tenAgent: "Tiến độ", idIssue: "ISS-Y", wbs: null, tieuDe: "y", soNgayQuaHan: null, ngayMo: null, doLlmSinh: false },
    ],
  };
}

describe("Báo cáo sáng — lọc theo người xem", () => {
  it("PM/Admin thấy nguyên bản", () => {
    const bc = bcSang();
    expect(locBaoCaoSang(bc, THAY_HET)).toBe(bc);
  });

  it("Người dùng HV: bỏ thẻ Hợp đồng N3A, giữ Hợp đồng HV và Tiến độ; nhóm mất dòng thì bỏ 🤖 câu hỏi", () => {
    const r = locBaoCaoSang(bcSang(), CHI_HV);
    expect(r.dong.map((d) => d.nguon)).toEqual(["Hợp đồng · ISS-PG-2", "Tiến độ · ISS-T1"]);
    const ids = r.vanDe!.map((v) => [v.idIssue, ...v.kem.map((k) => k.idIssue)]);
    // nhóm 1: dòng gốc Hợp đồng N3A bị bỏ → dòng kèm Tiến độ lên thay
    expect(ids).toEqual([["ISS-T1"], ["ISS-T2"], ["ISS-PG-2"]]);
    expect(r.vanDe![0].cauHoi).toBeNull();
    expect(r.vanDe![1].cauHoi).toBeNull();
    expect(r.vanDe![2].cauHoi).toBe("🤖 câu hỏi");
    expect(r.viecDoKhac!.map((v) => v.idIssue)).toEqual(["ISS-Y"]);
  });

  it("Người xem (ẩn hết): không còn mã PG nào", () => {
    const r = locBaoCaoSang(bcSang(), AN_HET_MAT);
    expect(JSON.stringify(r.vanDe) + JSON.stringify(r.dong) + JSON.stringify(r.viecDoKhac)).not.toMatch(/ISS-PG|ISS-X/);
  });
});

const ax = (maAgent: string, congCu: string) => ({ maAgent, congCu, thamSo: {} });
const vet = { moTa: "nguồn", thoiDiem: "2026-10-05T00:00:00Z" };
const co = (v: string | number, maAgent: string, congCu: string, agentGoc?: string): OSo => {
  const o = oCoSo(v, ax(maAgent, congCu), vet);
  return agentGoc ? { ...o, agentGoc } : o;
};

function bcThang(coDau = true): BaoCaoThang {
  const cot = (khoa: string, maAgent: string, congCu: string, laKhoa = false) => ({ khoa, nhan: khoa, kieu: "chu" as const, anhXa: ax(maAgent, congCu), laKhoa });
  return {
    ky: { thang: 9, nam: 2026, tuNgay: "01/09/2026", denNgay: "30/09/2026" },
    duAn: [
      { ma: "hv", ten: "Hướng Việt" },
      { ma: "n3a", ten: "Nậm Sam 3A" },
    ],
    dauBaoCao: [],
    muc: [
      {
        ma: "IV",
        ten: "Hợp đồng",
        nhanXet: "🤖 HD-548 chậm thanh toán",
        bang: [
          {
            soHieu: 8, ma: "B8", ten: "HĐ", ghiChuDuoiBang: [], luotHoi: [],
            cot: [cot("du_an", "main", "core.du_an", true), cot("nha_thau", "hopdong", "hopdong.gia_tri_luy_ke", true), cot("gia_tri_hd", "hopdong", "hopdong.gia_tri_luy_ke")],
            dong: [
              { khoa: "n3a::VL", duAn: "n3a", o: { du_an: co("n3a", "main", "core.du_an"), nha_thau: co("Việt Lào", "hopdong", "x"), gia_tri_hd: co(100, "hopdong", "x") } },
              { khoa: "hv::A", duAn: "hv", o: { du_an: co("hv", "main", "core.du_an"), nha_thau: co("Nhà thầu A", "hopdong", "x"), gia_tri_hd: co(50, "hopdong", "x") } },
            ],
          },
        ],
      },
      {
        ma: "V",
        ten: "Vấn đề",
        nhanXet: "🤖 nhận xét V",
        bang: [
          {
            soHieu: 10, ma: "B10", ten: "Vấn đề", ghiChuDuoiBang: [], luotHoi: [],
            cot: [{ ...cot("tt", "main", "main.so_thu_tu"), tuSinh: true }, cot("du_an", "main", "core.du_an", true), cot("van_de", "main", "core.issue", true)],
            dong: [
              { khoa: "n3a::PG", duAn: "n3a", o: { tt: co(1, "main", "x"), du_an: co("n3a", "main", "core.du_an"), van_de: co("PG-548.03 nằm chờ", "main", "core.issue", coDau ? "hopdong" : undefined) } },
              { khoa: "n3a::T", duAn: "n3a", o: { tt: co(2, "main", "x"), du_an: co("n3a", "main", "core.du_an"), van_de: co("chậm đổ bê tông", "main", "core.issue", coDau ? "tiendo" : undefined) } },
            ],
          },
        ],
      },
    ],
    thoiDiemDung: "",
    agentKhongHoiDuoc: [],
    canhBao: [],
  } as unknown as BaoCaoThang;
}

describe("Báo cáo tháng — lọc theo người xem", () => {
  it("Người dùng HV: bỏ dòng hợp đồng N3A, giữ HV; bỏ issue Hợp đồng N3A, giữ issue Tiến độ; nhận xét mục có ô ẩn bị thay", () => {
    const r = locBaoCaoThang(bcThang(), CHI_HV);
    const b8 = r.muc[0].bang[0];
    expect(b8.dong.map((d) => d.khoa)).toEqual(["hv::A"]);
    const b10 = r.muc[1].bang[0];
    expect(b10.dong.map((d) => d.khoa)).toEqual(["n3a::T"]);
    expect(b10.dong[0].o.tt.giaTri).toBe(1); // đánh lại số thứ tự
    expect(r.muc[0].nhanXet).toMatch(/^Ẩn nhận xét/);
    expect(r.muc[1].nhanXet).toMatch(/^Ẩn nhận xét/);
    expect(JSON.stringify(r)).not.toMatch(/HD-548|PG-548|Việt Lào/);
  });

  it("Không sửa bản gốc", () => {
    const goc = bcThang();
    locBaoCaoThang(goc, CHI_HV);
    expect(goc.muc[0].bang[0].dong.length).toBe(2);
  });

  it("Bản cũ chưa có dấu agent: ô issue coi như mật — người không thuộc N3A không thấy", () => {
    const r = locBaoCaoThang(bcThang(false), CHI_HV);
    expect(JSON.stringify(r)).not.toMatch(/PG-548|chậm đổ bê tông/);
  });

  it("Người xem: bảng hết dòng thì còn một dòng giữ chỗ nói rõ vì sao", () => {
    const r = locBaoCaoThang(bcThang(), AN_HET_MAT);
    const b8 = r.muc[0].bang[0];
    expect(b8.dong).toHaveLength(1);
    expect(b8.dong[0].laDongGiuCho).toBe(true);
    expect(b8.lyDoTrong).toMatch(/tài liệu mật/);
  });

  it("🤖 Soạn nhận xét: chỉ người thấy hợp đồng mọi dự án trong bản", () => {
    expect(lyDoChanSoanNhanXet(bcThang(), THAY_HET)).toBeNull();
    expect(lyDoChanSoanNhanXet(bcThang(), CHI_HV)).toMatch(/Nậm Sam 3A/);
  });
});

describe("Màn Issue + mâu thuẫn chéo", () => {
  it("Issue N3A với người không thuộc N3A: bỏ thẻ Hợp đồng, báo một dòng ẩn", () => {
    const dat = {
      issue: [{ agentChu: "hopdong" }, { agentChu: "tiendo" }],
      chuaGom: [] as { ma: string; ten: string; lyDo: string }[],
      thieuThe: [{ ma: "hopdong" }],
      khongCoIssue: [{ ma: "hopdong", ten: "Agent Hợp đồng" }],
    };
    const r = locManIssue(dat, CHI_HV, "n3a");
    expect(r.issue).toEqual([{ agentChu: "tiendo" }]);
    expect(r.thieuThe).toEqual([]);
    expect(r.khongCoIssue).toEqual([]);
    expect(r.chuaGom[0].lyDo).toMatch(/tài liệu mật/);
    expect(locManIssue(dat, CHI_HV, "hv")).toBe(dat);
  });

  it("Mâu thuẫn: bỏ dòng có bên Agent Hợp đồng + nhận định loại nghiệm thu", () => {
    const ket = {
      duAn: "n3a",
      luc: "",
      daSoat: { hoSo: 1, nghiemThu: 1 },
      chuaHoiDuoc: [],
      chuaTraDuoc: [{ wbs: "1", lyDo: "Hợp đồng chưa tra được" }],
      dong: [
        { loai: "nghiem-thu", wbs: "1", tenWbs: "", gang: false, benA: { agent: "Agent tiến độ", noiDung: "", nguon: "" }, benB: { agent: "Agent Hợp đồng", noiDung: "chưa có biên bản", nguon: "" } },
        { loai: "ho-so", wbs: "2", tenWbs: "", gang: false, benA: { agent: "Agent Công việc", noiDung: "", nguon: "" }, benB: { agent: "Agent Pháp lý", noiDung: "", nguon: "" } },
      ],
    } as KhoiMauThuan;
    const r = locMauThuan(ket, CHI_HV);
    expect(r.dong.map((d) => d.wbs)).toEqual(["2"]);
    expect(r.chuaTraDuoc).toEqual([]);
    expect(r.chuaHoiDuoc.join(" ")).toMatch(/Agent Hợp đồng: ẩn/);
    const nd = locNhanDinhMauThuan({ "n3a|nghiem-thu|1": 1, "n3a|ho-so|2": 2 }, "n3a", CHI_HV);
    expect(Object.keys(nd)).toEqual(["n3a|ho-so|2"]);
  });

  // ⭐ Mr. Đại chốt 12/10/2026: «Main ẩn thẻ Pháp lý với người ngoài dự án, giống đang ẩn thẻ Hợp đồng»
  it("Pháp lý cũng là agent mật trên Main: thẻ issue, dòng báo cáo sáng, dòng mâu thuẫn hồ sơ bị bỏ với người ngoài dự án", () => {
    expect(laAgentMat("phaply")).toBe(true);
    expect(agentMatTuTen("Agent pháp lý")).toBe("phaply");
    expect(agentMatTuTen("Pháp lý · ISS-K-09")).toBe("phaply");
    /** Người thuộc HV, không thuộc N3A — áp cho CẢ Hợp đồng lẫn Pháp lý */
    const HV_CA_HAI: BoLocMat = { thayHet: false, thay: (agent, duAn) => (agent !== "hopdong" && agent !== "phaply") || duAn === "hv" };

    const dat = {
      issue: [{ agentChu: "phaply" }, { agentChu: "hopdong" }, { agentChu: "tiendo" }, { agentChu: "base" }],
      chuaGom: [] as { ma: string; ten: string; lyDo: string }[],
      thieuThe: [{ ma: "phaply" }],
      khongCoIssue: [{ ma: "phaply", ten: "Agent Pháp lý" }],
    };
    const r = locManIssue(dat, HV_CA_HAI, "n3a");
    expect(r.issue).toEqual([{ agentChu: "tiendo" }, { agentChu: "base" }]);
    expect(r.thieuThe).toEqual([]);
    expect(r.chuaGom.map((c) => c.ma).sort()).toEqual(["hopdong", "phaply"]);
    expect(locManIssue(dat, HV_CA_HAI, "hv")).toBe(dat);

    const bc = bcSang();
    bc.dong.push(taoDong({ muc: "can-quyet", duAn: "Nậm Sam 3A", noiDung: "thiếu giấy phép", nguon: "Pháp lý · ISS-K-09" })!);
    bc.dong.push(taoDong({ muc: "can-quyet", duAn: "Hướng Việt", noiDung: "thiếu giấy phép HV", nguon: "Pháp lý · ISS-K-10" })!);
    bc.vanDe!.push(vd("phaply", "n3a", "ISS-K-09"));
    const s = locBaoCaoSang(bc, HV_CA_HAI);
    expect(s.dong.map((d) => d.nguon)).toEqual(["Hợp đồng · ISS-PG-2", "Tiến độ · ISS-T1", "Pháp lý · ISS-K-10"]);
    expect(s.vanDe!.some((v) => v.agent === "phaply")).toBe(false);

    const ket = {
      duAn: "n3a",
      luc: "",
      daSoat: { hoSo: 1, nghiemThu: 0 },
      chuaHoiDuoc: [],
      chuaTraDuoc: [],
      dong: [
        { loai: "ho-so", wbs: "2", tenWbs: "", gang: false, benA: { agent: "Agent Công việc", noiDung: "", nguon: "" }, benB: { agent: "Agent Pháp lý", noiDung: "thiếu K-09", nguon: "" } },
      ],
    } as KhoiMauThuan;
    const m = locMauThuan(ket, HV_CA_HAI);
    expect(m.dong).toEqual([]);
    expect(m.chuaHoiDuoc.join(" ")).toMatch(/Agent Pháp lý: ẩn/);
    expect(Object.keys(locNhanDinhMauThuan({ "n3a|ho-so|2": 2, "n3a|khac|3": 3 }, "n3a", HV_CA_HAI))).toEqual(["n3a|khac|3"]);

    expect(cauAnMat("phaply")).toMatch(/Hồ sơ pháp lý của dự án chỉ thành viên dự án xem được/);
    expect(cauAnMat("phaply")).toMatch(/luật và mẫu biểu chung thì ai cũng xem được/);
    expect(cauAnMat("hopdong")).toMatch(/Agent Hợp đồng là tài liệu mật/);
  });

  it("Nhận tên agent mật từ chuỗi", () => {
    expect(agentMatTuTen("Agent Hợp đồng")).toBe("hopdong");
    expect(agentMatTuTen("Hợp đồng · ISS-PG-1")).toBe("hopdong");
    expect(agentMatTuTen("Tiến độ · ISS-1")).toBeNull();
  });
});
