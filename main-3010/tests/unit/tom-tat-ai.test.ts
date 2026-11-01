// ============================================================
// CÂU TÓM TẮT 🤖 BẢNG ĐIỀU HÀNH — src/lib/bang-dieu-hanh/tom-tat-ai.ts (QS-077, 27/09)
// LLM giả (không tốn tiền, không mạng). Sổ bdh-tom-tat.json ghi vào BẢN SAO data/ của bộ test.
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const llm = vi.hoisted(() => ({ dem: 0, cho: null as Promise<void> | null, tuyChon: [] as unknown[] }));

vi.mock("@/lib/ai/providers", () => ({
  runAI: async (_p: string, _s: string, _k: unknown, tc: unknown) => {
    llm.dem++;
    llm.tuyChon.push(tc);
    if (llm.cho) await llm.cho;
    // 01/11: AI trả JSON bốn dòng — ở bộ số thử chỉ có dòng Pháp lý
    return '{"phap_ly":"Thiếu 20/96 hồ sơ, lâu nhất Hồ sơ 5 quá hạn 150 ngày, chưa giao việc."}';
  },
}));
vi.mock("@/lib/chung/tu-dien-ma-du-an", () => ({ ganTenLlm: async (t: string) => t }));

import { dungPrompt, layTomTatAi, xoaDangVietTomTat, HE_THONG } from "@/lib/bang-dieu-hanh/tom-tat-ai";
import type { DuLieuBdh } from "@/lib/bang-dieu-hanh/gom";
import { gocDuLieu } from "@/lib/goc-du-lieu";

function bdh(soThieu = 20): DuLieuBdh {
  return {
    duAn: [
      {
        ma: "hv-thu",
        ten: "HV · Điện gió Hướng Việt",
        so: {
          pctTong: 3.3,
          nhanPctTong: "tới mốc COD",
          pctToanBo: 12.5,
          nhanPctToanBo: "toàn bộ việc",
          codTinhToan: "2027-12-10",
          codMucTieu: "2027-09-22",
          lechNgay: 79,
          lechNgaySoBaseline: null,
          soViecGang: 14,
          soViecGangDangTre: 3,
          tomTat: "",
        },
        loi: null,
      },
    ],
    dangChon: "hv-thu",
    canhBaoLechDuAn: "",
    chiTiet: {
      codDuBao: "2027-12-10",
      codMucTieu: "2027-09-22",
      lechNgay: 79,
      codBaseline: null,
      lechNgaySoBaseline: null,
      tachChamCod: null,
      hangMucTuLam: [],
      mocSoSanh: "2026-09-24",
      chuoiGang: [1, 2, 3, 4, 5].map((i) => ({
        wbs: `9.6.${i}`,
        ten: `Thử nghiệm ${i}`,
        batDau: "",
        ketThuc: "",
        pct: 0,
        pctKeHoach: null,
        soNgayTre: null,
      })),
      loi: null,
    },
    sCurve: null,
    soTuan: null,
    nguonLuc: null,
    phapLy: {
      tongPhaiCo: 96,
      soThieu,
      dong: [1, 2, 3, 4, 5].map((i) => ({ maHoSo: `K-0${i}`, ten: `Hồ sơ ${i}`, coQuan: "Sở Công Thương", quaHanNgay: 30 * i })),
      loi: null,
    },
    tac: {
      soQuaHan: 97,
      dong: [1, 2, 3, 4, 5].map((i) => ({ ten: `Việc Base ${i}`, nguoiPhuTrach: "chưa giao ai", quaHanNgay: i })),
      quyTrinh: "",
      phieuGia: "",
      loi: null,
    },
    tien: null,
    daThanhIssue: [],
    lucSo: null,
    banCu: [],
  };
}

beforeEach(() => {
  llm.dem = 0;
  llm.cho = null;
  llm.tuyChon = [];
  xoaDangVietTomTat();
  try {
    fs.rmSync(path.join(gocDuLieu(), "bdh-tom-tat.json"));
  } catch {
    /* chưa có */
  }
});

describe("QS-077 — câu 🤖 tóm tắt tình hình", () => {
  it("prompt chỉ mang số của các khối, mỗi khối tối đa 3 dòng; đo độ dài", () => {
    const p = dungPrompt(bdh());
    expect(p).toContain("Thiếu 20/96");
    expect(p).toContain("Hồ sơ 5 quá hạn 150 ngày"); // 01/11: hai hồ sơ quá hạn lâu nhất
    expect(p).not.toContain("Hồ sơ 3");
    expect(p).not.toContain("Việc Base"); // bốn dòng không có khối Việc tắc
    // Số đo in ra để ghi vào báo cáo (bản 26/09 cùng bộ số: xem báo cáo QS-077)
    console.log(`[đo QS-077] prompt ${p.length} ký tự · hệ thống ${HE_THONG.length} ký tự`);
    expect(p.length).toBeLessThan(700);
  });

  it("hai yêu cầu cùng lúc (React dev chạy hiệu ứng hai lần) → MỘT lượt LLM; lần sau cùng số → từ bộ nhớ", async () => {
    const [a, b] = await Promise.all([layTomTatAi(bdh(), "dai"), layTomTatAi(bdh(), "dai")]);
    expect(a.ok && b.ok).toBe(true);
    expect(a.dong?.[0]).toMatchObject({ khoa: "phap_ly", laAi: true });
    expect(llm.dem).toBe(1);
    const c = await layTomTatAi(bdh(), "dai");
    expect(c.tuBoNho).toBe(true);
    expect(llm.dem).toBe(1);
    // tắt suy nghĩ ngầm — viết 1–2 câu không cần nghĩ
    expect(llm.tuyChon[0]).toEqual({ tokenNghi: 0 });
  });

  it("số đổi → dấu vân đổi → viết lại", async () => {
    await layTomTatAi(bdh(20), "dai");
    await layTomTatAi(bdh(19), "dai");
    expect(llm.dem).toBe(2);
  });

  it("quá hạn chờ → trả 'đang viết' tiếng Việt; lượt viết chạy tiếp và lần hỏi sau lấy được câu, không gọi LLM lần hai", async () => {
    let mo!: () => void;
    llm.cho = new Promise<void>((r) => (mo = r));
    const dau = await layTomTatAi(bdh(), "dai", true, 20);
    expect(dau.ok).toBe(false);
    expect(dau.dangViet).toBe(true);
    expect(dau.loi).toMatch(/chưa viết xong sau/);
    mo();
    const sau = await layTomTatAi(bdh(), "dai", true, 5_000);
    expect(sau.ok).toBe(true);
    expect(llm.dem).toBe(1);
  });

  it("Người xem không sinh lượt LLM mới khi chưa có câu", async () => {
    const k = await layTomTatAi(bdh(), "xem", false);
    expect(k.ok).toBe(false);
    expect(llm.dem).toBe(0);
  });
});
