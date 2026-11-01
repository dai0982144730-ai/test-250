// ============================================================
// TEST: SỔ HỎI–ĐÁP GHI THEO KHUÔN SỔ BẢN 2 (HOP-DONG-KET-NOI 7.1, 26/09/2026) — Main
//
// Canh: ① goiCoGhi tự quyết ketQua (lỗi 2.675 dòng "ok" khi bên kia trả
// KHONG_CO_DU_LIEU) ② mọi dòng ghi ra qua được `thieuTruongV2` ③ header mã
// lượt/mã chuỗi mang đúng mã sang bên nhận ④ cổng MCP ghi vai "nhan" cùng mã
// lượt, KHÔNG ghi lượt quansat đọc sổ nhưng VẪN ghi lượt nghiệp vụ ⑤ ngắt mạch
// ghi dòng `ngat_mach` ⑥ dòng gốc chuỗi.
// Chạy trên thư mục dữ liệu TẠM (vitest.config.ts) — không đụng sổ thật.
// ============================================================

import { describe, expect, it } from "vitest";
import { chayGocChuoi, docNhatKy, goiCoGhi } from "@/lib/nhat-ky/so";
import { chayTrongChuoi, headerChuoi, maChuoiHienTai } from "@/lib/nhat-ky/chuoi";
import {
  HEADER_MA_CHUOI,
  HEADER_MA_LUOT,
  KENH_GOC,
  maHopLe,
  sinhMa,
  thieuTruongV2,
} from "@/lib/nhat-ky/khuon-so";
import { hoiAgent, xoaNgatMach } from "@/lib/nguon/hoi-agent";
import { POST } from "@/app/api/mcp/main/route";

/** Dòng mới nhất có lý do gọi đúng chuỗi này */
function dongCua(lyDo: string) {
  return docNhatKy({}).filter((d) => d.lyDoGoi === lyDo);
}

function goiCong(body: Record<string, unknown>, them: Record<string, string> = {}) {
  return POST(
    new Request("http://localhost:3010/api/mcp/main", {
      method: "POST",
      headers: { "content-type": "application/json", host: "localhost:3010", ...them },
      body: JSON.stringify(body),
    }),
  );
}

describe("goiCoGhi — hàm bọc tự quyết ketQua", () => {
  it("hàm trả KHONG_CO_DU_LIEU → dòng khong-co-du-lieu + maLoi, đạt khuôn", async () => {
    const lyDo = `kiểm khuôn sổ 2 — KCD ${Date.now()}`;
    const kq = await goiCoGhi(
      { agentTraLoi: "tiendo", congCu: "tiendo.so_tuan", thamSo: { ma_du_an: "HV" }, lyDoGoi: lyDo, duong: "tay" },
      async () => ({ ok: false as const, ma_loi: "KHONG_CO_DU_LIEU", thong_diep: "Chưa có BC tuần" }),
    );
    expect(kq.ok).toBe(false); // trả nguyên vẹn
    const [d] = dongCua(lyDo);
    expect(d).toMatchObject({ phienBanSo: 2, vai: "goi", ketQua: "khong-co-du-lieu", maLoi: "KHONG_CO_DU_LIEU", loaiLuot: "nghiep-vu" });
    expect(d.bam).toBeUndefined();
    expect(maHopLe(d.maLuot)).toBe(true);
    expect(maHopLe(d.maChuoi)).toBe(true);
    expect(thieuTruongV2(d as unknown as Record<string, unknown>)).toEqual([]);
  });

  it("ok có nguồn → nguồn dẫn tự rút, có dấu vân, đạt khuôn", async () => {
    const lyDo = `kiểm khuôn sổ 2 — OK ${Date.now()}`;
    await goiCoGhi(
      { agentTraLoi: "tiendo", congCu: "tiendo.tom_tat_du_an", thamSo: {}, lyDoGoi: lyDo, duong: "tay" },
      async () => ({ ok: true as const, du_lieu: { w: "W38" }, nguon: [{ file_goc: "HV/so.json" }, { ma: "HV.1.2" }] }),
    );
    const [d] = dongCua(lyDo);
    expect(d).toMatchObject({ ketQua: "ok", nguonDan: "HV/so.json · HV.1.2" });
    expect(d.bam).toHaveLength(16);
    // Sổ bên GỌI không ghi nội dung khi bên kia là agent (sổ bên nhận ghi)
    expect(d.traLoi).toBeUndefined();
    expect(thieuTruongV2(d as unknown as Record<string, unknown>)).toEqual([]);
  });

  it("gọi LLM (ngoài hệ) → sổ bên gọi ghi nội dung trả lời", async () => {
    const lyDo = `kiểm khuôn sổ 2 — LLM ${Date.now()}`;
    await goiCoGhi({ agentTraLoi: "llm", congCu: "llm.tom_tat", thamSo: {}, lyDoGoi: lyDo, duong: "tay" }, async () => "câu LLM viết");
    const [d] = dongCua(lyDo);
    expect(d).toMatchObject({ ketQua: "ok", traLoi: "câu LLM viết", biCat: false });
    expect(thieuTruongV2(d as unknown as Record<string, unknown>)).toEqual([]);
  });

  it("kiểu trả về riêng có `ok` (Base.vn/LLM) không bị coi là khuôn MCP rỗng", async () => {
    const lyDo = `kiểm khuôn sổ 2 — ok riêng ${Date.now()}`;
    await goiCoGhi({ agentTraLoi: "llm", congCu: "llm.x", thamSo: {}, lyDoGoi: lyDo, duong: "tay" }, async () => ({ ok: false, message: "hết hạn mức" }));
    const [d] = dongCua(lyDo);
    expect(d).toMatchObject({ ketQua: "loi", maLoi: "LOI_NOI_BO", loi: "hết hạn mức" });
    expect(thieuTruongV2(d as unknown as Record<string, unknown>)).toEqual([]);
  });

  it("ném lỗi → ghi loi/LOI_NOI_BO rồi ném tiếp", async () => {
    const lyDo = `kiểm khuôn sổ 2 — ném ${Date.now()}`;
    await expect(
      goiCoGhi({ agentTraLoi: "llm", congCu: "llm.y", thamSo: {}, lyDoGoi: lyDo, duong: "tay" }, async () => {
        throw new Error("mạng đứt");
      }),
    ).rejects.toThrow("mạng đứt");
    const [d] = dongCua(lyDo);
    expect(d).toMatchObject({ ketQua: "loi", maLoi: "LOI_NOI_BO", loi: "mạng đứt" });
    expect(thieuTruongV2(d as unknown as Record<string, unknown>)).toEqual([]);
  });
});

describe("ngữ cảnh chuỗi + header", () => {
  it("header trong lượt mang đúng mã lượt của dòng và mã chuỗi đang chạy", async () => {
    const lyDo = `kiểm khuôn sổ 2 — header ${Date.now()}`;
    const maChuoi = sinhMa("main");
    const h = await chayTrongChuoi(maChuoi, () =>
      goiCoGhi({ agentTraLoi: "tiendo", congCu: "tiendo.so_tuan", thamSo: {}, lyDoGoi: lyDo, duong: "tay" }, async () => headerChuoi()),
    );
    const [d] = dongCua(lyDo);
    expect(h[HEADER_MA_CHUOI]).toBe(maChuoi);
    expect(h[HEADER_MA_LUOT]).toBe(d.maLuot);
    expect(d.maChuoi).toBe(maChuoi);
  });

  it("ngoài chuỗi thì không có header, không có mã chuỗi", () => {
    expect(headerChuoi()).toEqual({});
    expect(maChuoiHienTai()).toBeUndefined();
  });
});

describe("cổng MCP /api/mcp/main — vai nhan", () => {
  it("ghi CÙNG mã lượt + mã chuỗi bên gọi gửi sang, đạt khuôn", async () => {
    const lyDo = `kiểm khuôn sổ 2 — cổng ${Date.now()}`;
    const maLuot = sinhMa("tiendo");
    const maChuoi = sinhMa("tiendo");
    const res = await goiCong(
      { cong_cu: "suc_khoe", tham_so: {}, agent_goi: "tiendo", ly_do_goi: lyDo },
      { [HEADER_MA_LUOT]: maLuot, [HEADER_MA_CHUOI]: maChuoi },
    );
    const j = (await res.json()) as { ok: boolean; du_lieu?: { khuon_so?: string } };
    expect(j.ok).toBe(true);
    expect(j.du_lieu?.khuon_so).toBe("2.0");
    const [d] = dongCua(lyDo);
    expect(d).toMatchObject({ vai: "nhan", maLuot, maChuoi, loaiLuot: "ha-tang", agentHoi: "tiendo", agentTraLoi: "main" });
    expect(thieuTruongV2(d as unknown as Record<string, unknown>)).toEqual([]);
  });

  it("quansat đọc sổ → KHÔNG ghi; quansat gọi công cụ nghiệp vụ (bị chặn) → VẪN ghi", async () => {
    const lyDo1 = `kiểm khuôn sổ 2 — quansat đọc ${Date.now()}`;
    const r1 = await goiCong({ cong_cu: "main.nhat_ky_gan_day", tham_so: { gioi_han: 1 }, agent_goi: "quansat", ly_do_goi: lyDo1 });
    expect(((await r1.json()) as { ok: boolean }).ok).toBe(true);
    expect(dongCua(lyDo1)).toHaveLength(0);

    const lyDo2 = `kiểm khuôn sổ 2 — quansat nghiệp vụ ${Date.now()}`;
    const r2 = await goiCong({ cong_cu: "main.viec_nghiep_vu_thu", tham_so: {}, agent_goi: "quansat", ly_do_goi: lyDo2 });
    expect(((await r2.json()) as { ma_loi?: string }).ma_loi).toBe("KHONG_CO_QUYEN");
    const [d] = dongCua(lyDo2);
    expect(d).toMatchObject({ vai: "nhan", ketQua: "loi", maLoi: "KHONG_CO_QUYEN", loaiLuot: "nghiep-vu" });
    expect(thieuTruongV2(d as unknown as Record<string, unknown>)).toEqual([]);
  });

  it("header rác bị bỏ, cổng tự sinh mã hợp lệ", async () => {
    const lyDo = `kiểm khuôn sổ 2 — rác ${Date.now()}`;
    await goiCong({ cong_cu: "suc_khoe", agent_goi: "tiendo", ly_do_goi: lyDo }, { [HEADER_MA_LUOT]: "x".repeat(80) });
    const [d] = dongCua(lyDo);
    expect(maHopLe(d.maLuot)).toBe(true);
    expect(d.maLuot).not.toBe("x".repeat(80));
  });
});

describe("ngắt mạch ghi sổ khi xảy ra thật", () => {
  it("3 lỗi liên tiếp → một dòng ngat_mach (ha-tang, AGENT_KHONG_SAN_SANG)", async () => {
    xoaNgatMach();
    process.env.URL_AGENT_THUMACH = "http://127.0.0.1:9";
    const lyDo = `kiểm khuôn sổ 2 — mạch ${Date.now()}`;
    for (let i = 0; i < 3; i++) await hoiAgent("thumach", "thumach.x", lyDo);
    delete process.env.URL_AGENT_THUMACH;
    const mach = docNhatKy({}).filter((d) => d.congCu === "ngat_mach" && String(d.agentTraLoi) === "thumach");
    expect(mach.length).toBeGreaterThanOrEqual(1);
    expect(mach[0]).toMatchObject({ loaiLuot: "ha-tang", ketQua: "loi", maLoi: "AGENT_KHONG_SAN_SANG" });
    expect(mach[0].lyDoGoi).toMatch(/3 lỗi liên tiếp tới .* — nghỉ 10 phút/);
    expect(thieuTruongV2(mach[0] as unknown as Record<string, unknown>)).toEqual([]);
    xoaNgatMach();
  });
});

describe("dòng gốc chuỗi", () => {
  it("một câu chat: mọi lượt con chung mã chuỗi với dòng gốc; dòng gốc có câu hỏi + câu trả lời", async () => {
    const lyDo = `kiểm khuôn sổ 2 — gốc ${Date.now()}`;
    await chayGocChuoi(
      { kenh: KENH_GOC.chat, lyDoGoi: lyDo, cauHoi: "tiến độ HV thế nào?", duong: "A" },
      async () => {
        await goiCoGhi({ agentTraLoi: "llm", congCu: "llm.z", thamSo: {}, lyDoGoi: lyDo + " (con)", duong: "A" }, async () => "x");
        return { reply: "HV đạt 42%" };
      },
      (kq) => kq.reply,
    );
    const [goc] = dongCua(lyDo);
    const [con] = dongCua(lyDo + " (con)");
    expect(goc).toMatchObject({ loaiLuot: "goc", vai: "goi", congCu: "troly.chat", agentHoi: "main", agentTraLoi: "main", traLoi: "HV đạt 42%" });
    expect(goc.thamSo.cau_hoi).toBe("tiến độ HV thế nào?");
    expect(con.maChuoi).toBe(goc.maChuoi);
    expect(thieuTruongV2(goc as unknown as Record<string, unknown>)).toEqual([]);
  });
});

describe("ba cửa quan sát trả đủ trường khuôn bản 2", () => {
  it("ma_luot · ma_chuoi · bam · loai_luot · tra_loi.du_lieu = traLoi; lọc ma_chuoi chạy thật", async () => {
    const { ganDaySo, hoiThoaiSo, demNgatMach } = await import("@/lib/nhat-ky/cua-quan-sat");
    const maChuoi = sinhMa("tiendo");
    const moi = {
      thoiDiem: "2026-09-26T11:00:00.000Z",
      agentHoi: "tiendo",
      agentTraLoi: "main",
      congCu: "main.x",
      ketQua: "ok",
      miliGiay: 5,
      lyDoGoi: "đo",
      phienBanSo: 2,
      maLuot: sinhMa("tiendo"),
      maChuoi,
      vai: "nhan",
      loaiLuot: "nghiep-vu",
      bam: "0123456789abcdef",
      traLoi: '{"w":"W38"}',
      biCat: false,
    };
    const cu = { thoiDiem: "2026-09-26T10:00:00.000Z", agentHoi: "main", agentTraLoi: "tiendo", congCu: "tiendo.x", ketQua: "ok", lyDoGoi: "cũ", traLoiGon: "w=W38" };
    const g = ganDaySo([moi, cu], {}, "Main");
    if (!g.ok) throw new Error("phải ok");
    const [d1, d2] = (g.du_lieu as { dong: Record<string, unknown>[] }).dong;
    expect(d1).toMatchObject({ ma_luot: moi.maLuot, ma_chuoi: maChuoi, bam_tra_loi: moi.bam, loai_luot: "nghiep-vu", vai: "nhan" });
    expect(d2).toMatchObject({ ma_luot: null, ma_chuoi: null, bam_tra_loi: null });
    const h = hoiThoaiSo([moi, cu], { ma_chuoi: maChuoi }, "Main");
    if (!h.ok) throw new Error("phải ok");
    const dong = (h.du_lieu as { dong: { tra_loi: { du_lieu: string; bi_cat: boolean } }[] }).dong;
    expect(dong).toHaveLength(1);
    expect(dong[0].tra_loi).toMatchObject({ du_lieu: '{"w":"W38"}', bi_cat: false });
    // Ngắt mạch: dòng `ngat_mach` thật được đếm, không cộng đôi với chuỗi lỗi
    const loi = (s: number) => ({ ...moi, thoiDiem: `2026-09-26T12:00:0${s}.000Z`, ketQua: "loi", maLoi: "AGENT_KHONG_SAN_SANG" });
    const ngat = { ...loi(4), congCu: "ngat_mach", loaiLuot: "ha-tang" };
    expect(demNgatMach([loi(1), loi(2), loi(3), ngat])).toBe(1);
  });
});
