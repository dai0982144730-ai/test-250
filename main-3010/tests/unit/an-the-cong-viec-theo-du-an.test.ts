// ⭐ 18/10/2026 (Q3 kiểm độc lập lần 7 — Mr. Đại gật «ok theo ý bạn»): thẻ issue của agent Công việc có thể nói tới tiền hợp đồng
// (ISS-2026-41-002 «Đợt 3 thanh toán EPC 38,2 tỷ…»). Đo 18/10 màn Issue HV: annv (chỉ thuộc NK1) + hungnc (lãnh đạo chưa gắn dự án)
// thấy đủ 9 thẻ agent Công việc. Nay thẻ ẩn THEO DỰ ÁN CỦA THẺ ở màn Issue, báo cáo sáng, báo cáo tháng và lượt trợ lý chat.
// Hàm lọc thuần ở lib/agent-mat-loc.ts; phép xét người thật kiểm ở loai-theo-so-do.test.ts. Giả fetch — không gọi cổng thật.
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  AN_HET_MAT,
  agentLocTuTen,
  cauAnMat,
  laAgentMat,
  locBaoCaoSang,
  locBaoCaoThang,
  locManIssue,
  locTheIssueTrongKhuon,
  type BoLocMat,
} from "@/lib/agent-mat-loc";
import { taoDong, type BaoCaoSang, type DongBaoCao } from "@/lib/bao-cao-sang/model";
import type { VanDeSang } from "@/lib/bao-cao-sang/luat-cod";
import { oCoSo, type AnhXaNguon, type BaoCaoThang } from "@/lib/bao-cao-thang/model";
import type { KhuonTra } from "@/lib/mcp/khuon";

/** Người thuộc HV, không thuộc NK1 — giả đúng khuôn bộ lọc thật cho agent Công việc */
const NGUOI_HV: BoLocMat = { thayHet: false, thay: (agent, duAn) => agent !== "base" || duAn === "HV" };

// Lượt hỏi thay người trong hoiAgent nạp bộ lọc từ agent-mat-tren-main — giả: «annv» chỉ thuộc NK1, ai khác thấy hết
vi.mock("@/lib/agent-mat-tren-main", () => ({
  boLocMatTheoMaNguoi: (ma: string) =>
    ma === "annv"
      ? { thayHet: false, thay: (agent: string, duAn: string | null) => agent !== "base" || duAn === "NK1" }
      : { thayHet: true, thay: () => true },
}));

import { hoiAgent } from "@/lib/nguon/hoi-agent";

const THE_TIEN = "Đợt 3 thanh toán EPC 38,2 tỷ đồng chậm giải ngân qua BIDV";

describe("Màn Issue — thẻ agent Công việc theo dự án của thẻ", () => {
  const dat = () => ({
    issue: [
      { agentChu: "base", maDuAn: "HV", id: "ISS-2026-41-002", tieuDe: THE_TIEN },
      { agentChu: "base", maDuAn: "NK1", id: "ISS-NK1-1", tieuDe: "việc NK1" },
      { agentChu: "base", id: "ISS-KHONG-GAN", tieuDe: "thẻ không ghi dự án" },
      { agentChu: "tiendo", id: "ISS-T1", tieuDe: "chậm đổ bê tông" },
    ],
    chuaGom: [] as { ma: string; ten: string; lyDo: string }[],
    thieuThe: [{ ma: "base" }],
    khongCoIssue: [] as { ma: string; ten: string }[],
  });

  it("người ngoài HV xem HV: không còn thẻ agent Công việc nào của HV, có một dòng nói rõ ẩn mấy thẻ", () => {
    const nk1: BoLocMat = { thayHet: false, thay: (agent, duAn) => agent !== "base" || duAn === "NK1" };
    const r = locManIssue(dat(), nk1, "HV");
    expect(r.issue.map((i) => i.id)).toEqual(["ISS-NK1-1", "ISS-T1"]);
    expect(JSON.stringify(r.issue)).not.toMatch(/38,2 tỷ/);
    // Thẻ không ghi dự án lấy dự án đang xem (HV) → ẩn; người không thấy HV thì bỏ cả dòng «còn N thẻ chưa lấy về»
    expect(r.thieuThe).toEqual([]);
    expect(r.chuaGom).toHaveLength(1);
    expect(r.chuaGom[0]!.lyDo).toMatch(/^Agent Công việc: ẩn 2 thẻ issue — chỉ thành viên dự án của thẻ xem được/);
  });

  it("người của HV: giữ thẻ HV + thẻ không ghi dự án (dự án đang xem), bỏ thẻ NK1", () => {
    const r = locManIssue(dat(), NGUOI_HV, "HV");
    expect(r.issue.map((i) => i.id)).toEqual(["ISS-2026-41-002", "ISS-KHONG-GAN", "ISS-T1"]);
    expect(r.thieuThe).toEqual([{ ma: "base" }]);
    expect(r.chuaGom[0]!.lyDo).toMatch(/ẩn 1 thẻ issue/);
  });

  it("PM · Admin thấy nguyên bản; không biết ai xem thì ẩn hết thẻ agent Công việc", () => {
    const d = dat();
    expect(locManIssue(d, { thayHet: true, thay: () => true }, "HV")).toBe(d);
    const r = locManIssue(dat(), AN_HET_MAT, "HV");
    expect(r.issue.map((i) => i.agentChu)).toEqual(["tiendo"]);
  });

  it("agent Công việc KHÔNG thành agent mật: chỉ thẻ issue bị lọc, câu ẩn không gọi là «tài liệu mật»", () => {
    expect(laAgentMat("base")).toBe(false);
    expect(AN_HET_MAT.thay("tiendo", "HV")).toBe(true);
    expect(AN_HET_MAT.thay("base", "HV")).toBe(false);
    expect(cauAnMat("base")).toMatch(/^Thẻ issue của Agent Công việc chỉ thành viên dự án của thẻ xem được/);
    expect(cauAnMat("base")).not.toMatch(/tài liệu mật/);
    expect(agentLocTuTen("Agent Công việc · ISS-2026-41-002")).toBe("base");
    expect(agentLocTuTen("Hợp đồng · ISS-PG-1")).toBe("hopdong");
    expect(agentLocTuTen("Tiến độ · ISS-1")).toBeNull();
  });
});

describe("Báo cáo sáng + báo cáo tháng — thẻ agent Công việc theo dự án", () => {
  it("báo cáo sáng: bỏ vấn đề + dòng + việc đỏ khác của agent Công việc ở dự án người xem không thuộc", () => {
    const vd = (maDuAn: string, id: string, tieuDe: string): VanDeSang =>
      ({ maDuAn, agent: "base", tenAgent: "Agent Công việc", idIssue: id, wbs: null, tieuDe, lyDo: [], soNgayLuiCod: null, tienVnd: null, mucDo: "do", doLlmSinh: false, cauHoi: null, kem: [] }) as unknown as VanDeSang;
    const bc = {
      ngay: "2026-10-18",
      soDuAn: 2,
      dong: [
        taoDong({ muc: "can-quyet", duAn: "Hướng Việt", noiDung: THE_TIEN, nguon: "Agent Công việc · ISS-2026-41-002" }),
        taoDong({ muc: "can-quyet", duAn: "Nam Khian 1", noiDung: "việc NK1", nguon: "Agent Công việc · ISS-NK1-1" }),
      ].filter((d): d is DongBaoCao => d !== null),
      thieuSot: [],
      luatApDung: [],
      soDongBiLoaiVaThieuNguon: 0,
      dungLuc: "",
      daGuiLuc: null,
      duAn: [
        { maDuAn: "HV", ten: "Hướng Việt" },
        { maDuAn: "NK1", ten: "Nam Khian 1" },
      ] as BaoCaoSang["duAn"],
      vanDe: [vd("HV", "ISS-2026-41-002", THE_TIEN), vd("NK1", "ISS-NK1-1", "việc NK1")],
      viecDoKhac: [{ maDuAn: "HV", agent: "base", tenAgent: "Agent Công việc", idIssue: "ISS-X", wbs: null, tieuDe: "thanh toán 38,2 tỷ", soNgayQuaHan: null, ngayMo: null, doLlmSinh: false }],
    } as BaoCaoSang;
    const nk1: BoLocMat = { thayHet: false, thay: (agent, duAn) => agent !== "base" || duAn === "NK1" };
    const r = locBaoCaoSang(bc, nk1);
    expect(r.vanDe!.map((v) => v.idIssue)).toEqual(["ISS-NK1-1"]);
    expect(r.dong.map((d) => d.nguon)).toEqual(["Agent Công việc · ISS-NK1-1"]);
    expect(r.viecDoKhac).toEqual([]);
    expect(JSON.stringify(r)).not.toMatch(/38,2 tỷ/);
  });

  it("báo cáo tháng: ô issue của agent Công việc (agentGoc base) ở dự án không thuộc bị bỏ dòng, nhận xét 🤖 của mục bị ẩn", () => {
    const ax = (maAgent: string, congCu: string) => ({ maAgent, congCu, thamSo: {} }) as unknown as AnhXaNguon;
    const vet = { moTa: "nguồn", thoiDiem: "2026-10-05T00:00:00Z" };
    const co = (v: string | number, agentGoc?: string) => {
      const o = oCoSo(v, ax("main", "core.issue"), vet);
      return agentGoc ? { ...o, agentGoc } : o;
    };
    const cot = (khoa: string, laKhoa = false) => ({ khoa, nhan: khoa, kieu: "chu" as const, anhXa: ax("main", "core.issue"), laKhoa });
    const bc = {
      ky: { thang: 9, nam: 2026, tuNgay: "01/09/2026", denNgay: "30/09/2026" },
      duAn: [{ ma: "HV", ten: "Hướng Việt" }],
      dauBaoCao: [],
      muc: [
        {
          ma: "V",
          ten: "Vấn đề",
          nhanXet: "🤖 Đợt 3 thanh toán chậm",
          bang: [
            {
              soHieu: 10, ma: "B10", ten: "Vấn đề", ghiChuDuoiBang: [], luotHoi: [],
              cot: [cot("du_an", true), cot("van_de", true)],
              dong: [
                { khoa: "HV::1", duAn: "HV", o: { du_an: co("HV"), van_de: co(THE_TIEN, "base") } },
                { khoa: "HV::2", duAn: "HV", o: { du_an: co("HV"), van_de: co("chậm đổ bê tông", "tiendo") } },
              ],
            },
          ],
        },
      ],
      thoiDiemDung: "",
      agentKhongHoiDuoc: [],
      canhBao: [],
    } as unknown as BaoCaoThang;
    const ngoai: BoLocMat = { thayHet: false, thay: (agent) => agent !== "base" };
    const r = locBaoCaoThang(bc, ngoai);
    expect(r.muc[0]!.bang[0]!.dong.map((d) => d.khoa)).toEqual(["HV::2"]);
    expect(r.muc[0]!.nhanXet).toMatch(/^Ẩn nhận xét 🤖 của mục này — mục có thông tin của Agent Công việc mà chỉ thành viên dự án xem được/);
    expect(JSON.stringify(r)).not.toMatch(/38,2 tỷ|Đợt 3 thanh toán/);
  });
});

describe("Lượt hỏi thay một người (trợ lý chat) — lưới trong hoiAgent", () => {
  const traLoi = (): KhuonTra =>
    ({
      ok: true,
      du_lieu: {
        agent: "base",
        so_the_dang_mo: 3,
        issue: [
          { id: "ISS-2026-41-002", tieu_de: THE_TIEN, ma_du_an: "HV" },
          { id: "ISS-NK1-1", tieu_de: "việc NK1", ma_du_an: "NK1" },
          { id: "ISS-KHONG-GAN", tieu_de: "không ghi dự án" },
        ],
      },
      nguon: [{ loai: "issue", ma: "sổ issue", file_goc: "x", vi_tri: "", thoi_diem_trich: "" }],
      thoi_diem_tra_loi: "2026-10-18T00:00:00Z",
      canh_bao: [],
    }) as unknown as KhuonTra;

  it("hàm thuần: bỏ thẻ ngoài dự án, bỏ số đếm cũ, tom_tat nói thẳng ẩn mấy thẻ; bản gốc không đổi", () => {
    const goc = traLoi();
    const r = locTheIssueTrongKhuon("base", goc, NGUOI_HV, "NK1");
    expect(r.ok).toBe(true);
    const d = (r as { du_lieu: Record<string, unknown> }).du_lieu;
    expect((d.issue as { id: string }[]).map((x) => x.id)).toEqual(["ISS-2026-41-002"]);
    expect(d.so_the_dang_mo).toBeUndefined();
    expect(d.so_the_an).toBe(2);
    expect(d.tom_tat).toMatch(/^Ẩn 2\/3 thẻ issue — Thẻ issue của Agent Công việc/);
    expect((goc as { du_lieu: { issue: unknown[] } }).du_lieu.issue).toHaveLength(3);
    // Thấy hết · agent khác · câu lỗi → trả nguyên
    expect(locTheIssueTrongKhuon("base", goc, { thayHet: true, thay: () => true }, "HV")).toBe(goc);
    expect(locTheIssueTrongKhuon("tiendo", goc, NGUOI_HV, "HV")).toBe(goc);
    const loi = { ok: false, ma_loi: "KHONG_CO_DU_LIEU", thong_diep: "trống" } as KhuonTra;
    expect(locTheIssueTrongKhuon("base", loi, NGUOI_HV, "HV")).toBe(loi);
  });

  const KHOA_CU = process.env.AUTH_SECRET;
  beforeAll(() => {
    process.env.AUTH_SECRET = KHOA_CU || "khoa-bai-kiem-an-the-cong-viec";
    process.env.URL_AGENT_BASE = "http://127.0.0.1:59981";
  });
  afterEach(() => vi.unstubAllGlobals());
  const giaFetch = () =>
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(traLoi()), { headers: { "content-type": "application/json" } })),
    );

  it("hoiAgent kèm ma_nguoi_dung người ngoài HV hỏi dự án NK1: thẻ 38,2 tỷ của HV không tới tay trợ lý", async () => {
    giaFetch();
    const kq = await hoiAgent("base", "base.danh_sach_issue", `kiểm ẩn thẻ ${Date.now()}`, {
      tham_so: { ma_du_an: "NK1" },
      ma_nguoi_dung: "annv",
      boQuaMaTran: true,
      boQuaNho: true,
    });
    expect(kq.ok).toBe(true);
    expect(JSON.stringify(kq)).not.toMatch(/38,2 tỷ/);
    // giữ thẻ NK1 + thẻ không ghi dự án (lấy dự án đã hỏi = NK1)
    expect(((kq as { du_lieu: { issue: { id: string }[] } }).du_lieu.issue).map((x) => x.id)).toEqual(["ISS-NK1-1", "ISS-KHONG-GAN"]);
    expect(JSON.stringify(kq)).toMatch(/Ẩn 1\/3 thẻ issue/);
  });

  it("lượt máy–máy (không ma_nguoi_dung) giữ nguyên — lớp màn Issue / báo cáo tự lọc", async () => {
    giaFetch();
    const kq = await hoiAgent("base", "base.danh_sach_issue", `kiểm máy-máy ${Date.now()}`, {
      tham_so: { ma_du_an: "HV" },
      boQuaMaTran: true,
      boQuaNho: true,
    });
    expect(((kq as { du_lieu: { issue: unknown[] } }).du_lieu.issue)).toHaveLength(3);
  });
});
