// Luật AI chạy nền + lưu theo (tài liệu, phiên bản, sha256, dấu bộ luật); gộp với góp ý AI một lượt cho mỗi file.
// runAI luôn là bản giả (vi.mock); bộ luật áp dụng lấy từ danh sách giả (vi.mock luatApDung).
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";

const aiGia = vi.hoisted(() => ({ runAI: vi.fn<(...a: unknown[]) => Promise<string>>(), mode: "claude-cli" as "claude-cli" | "api" | "off" }));
const luatGia = vi.hoisted(() => ({ ds: [] as unknown[] }));

vi.mock("@/lib/ai/providers", async (goc) => {
  const that = (await goc()) as Record<string, unknown>;
  return {
    ...that,
    runAI: (...a: unknown[]) => aiGia.runAI(...a),
    // Quản lý token AI (04/10): chỗ gọi đi qua runAIGan(nhãn tính năng, …) — giả cả hàm này, không thì test gọi Claude THẬT
    runAIGan: (_ma: string, ...a: unknown[]) => aiGia.runAI(...a),
    getAIConfig: () => ({ mode: aiGia.mode, provider: "anthropic", apiKey: "", model: "", baseUrl: "" }),
  };
});
vi.mock("@/lib/luat/kho-luat", async (goc) => {
  const that = (await goc()) as Record<string, unknown>;
  return { ...that, luatApDung: async () => luatGia.ds };
});
vi.mock("@/lib/so-cai/dich-vu", async (goc) => {
  const g = await import("../fixtures/gia-lap");
  return g.boc((await goc()) as Record<string, unknown>, g.giaLapSoCai);
});

import { csdlMoi, nguoi } from "../helpers/csdl";
import { layQ, tx, type Q } from "@/lib/db";
import { MAC_DINH } from "@/lib/cau-hinh/mac-dinh";
import { taiLenVaKiemTra } from "@/lib/gui/tai-len";
import { layGopY } from "@/lib/kiem-tra/gop-y-luu";
import { batDauKiemAi, choLuotAiXong, ketQuaKiemAi } from "@/lib/luat/kiem-ai";
import type { LuatKiemTra } from "@/lib/luat/types";
import type { NguoiDungPhien } from "@/lib/types";
import { khoTam, tep, datCauHinh, xoaCauHinh } from "../fixtures/chuan-bi";

let q: Q;
let nd: NguoiDungPhien;

function luatAi(id: string, huongDan: string, them: Partial<LuatKiemTra> = {}): LuatKiemTra {
  return {
    id,
    ma: id,
    ten: `Luật ${id}`,
    cau_luat: huongDan,
    mo_ta: null,
    he_thong: false,
    cach_kiem: "ai",
    loai: null,
    tham_so: null,
    huong_dan_ai: huongDan,
    ap_dung: ["form-7"],
    muc: "canh_bao",
    khi_ai_loi: "cho_gui",
    bat: true,
    nhom: "Nội dung",
    thu_tu: 0,
    phien_ban: 1,
    tao_boi: null,
    tao_luc: "",
    sua_boi: null,
    sua_luc: "",
    da_xoa: false,
    ...them,
  };
}

const L1 = luatAi("l-nguyen-nhan", "Hạng mục chậm tiến độ phải nêu rõ nguyên nhân", { muc: "chan", khi_ai_loi: "chan" });
const L2 = luatAi("l-kien-nghi", "Rủi ro mức Cao phải có kiến nghị", { thu_tu: 1 });
const TRA_LOI_LUAT = JSON.stringify({
  luat: [
    { id: "L1", dat: false, thong_diep: "Chưa nêu nguyên nhân chậm", vi_tri: "o:nguoi_lap" },
    { id: "L2", dat: true, thong_diep: "Đạt" },
  ],
});

async function taiLen(ten: string) {
  const r = await tx((t) => taiLenVaKiemTra(t, nd, { tep: tep(ten) }));
  return { id: r.tai_lieu_id!, pb: r.phien_ban!, mau: r.ket_qua.mau_ma };
}

const tatGopY = () => datCauHinh(q, "ai", { ...MAC_DINH.ai, bat_gop_y: false });

beforeAll(async () => {
  khoTam();
  await csdlMoi();
  q = await layQ();
  nd = await nguoi("gd.bqlda@scigroup.vn");
});

beforeEach(() => {
  aiGia.runAI.mockReset();
  aiGia.mode = "claude-cli";
  luatGia.ds = [L1, L2];
});

afterEach(async () => {
  await choLuotAiXong();
  await xoaCauHinh(q, "ai");
});

describe("luật AI chạy nền", () => {
  it("không có luật AI áp dụng → 'khong_co', không gọi AI", async () => {
    await tatGopY();
    luatGia.ds = [luatAi("l-code", "x", { cach_kiem: "code" }), luatAi("l-tat", "y", { bat: false })];
    const a = await taiLen("BaoCao_Tuan29_BQLDA_QuangTri_ban1.docx");
    expect(a.mau).toBe("form-7");
    expect(await ketQuaKiemAi(q, a.id, a.pb)).toEqual({ trang_thai: "khong_co", ket_qua: [] });
    await batDauKiemAi(q, a.id, a.pb);
    await choLuotAiXong();
    expect(aiGia.runAI).not.toHaveBeenCalled();
  });

  it("hỏi lần đầu tự bắt đầu → xong; một lượt AI cho nhiều luật; nhớ theo sha256 + dấu bộ luật; sửa luật → kiểm lại", async () => {
    await tatGopY();
    aiGia.runAI.mockResolvedValue(TRA_LOI_LUAT);
    const a = await taiLen("BaoCao_Tuan29_BQLDA_QuangTri_ban1.docx");
    const r1 = await ketQuaKiemAi(q, a.id, a.pb);
    expect(r1).toMatchObject({ trang_thai: "dang_kiem", ket_qua: [] });
    expect((await ketQuaKiemAi(q, a.id, a.pb)).trang_thai).toBe("dang_kiem"); // hỏi dồn: vẫn một lượt
    await choLuotAiXong();
    const r2 = await ketQuaKiemAi(q, a.id, a.pb);
    expect(r2.trang_thai).toBe("xong");
    expect(r2.ket_qua).toEqual([
      { luat_id: "l-nguyen-nhan", dat: false, thong_diep: "Chưa nêu nguyên nhân chậm", vi_tri: { tag: "nguoi_lap" }, muc: "chan", khi_ai_loi: "chan", ten: "Luật l-nguyen-nhan" },
      { luat_id: "l-kien-nghi", dat: true, thong_diep: "Đạt", muc: "canh_bao", khi_ai_loi: "cho_gui", ten: "Luật l-kien-nghi" },
    ]);
    expect(aiGia.runAI).toHaveBeenCalledTimes(1);
    const [prompt, system, , model, ms] = aiGia.runAI.mock.calls[0] as [string, string, unknown, string, number];
    expect(prompt).toContain("id=L1");
    expect(prompt).toContain("id=L2");
    expect(system).not.toContain('"gop_y"'); // góp ý đang tắt → chỉ kiểm luật
    expect(model).toBe(MAC_DINH.ai.model_mac_dinh);
    expect(ms).toBe(60_000);

    // Tài liệu khác, cùng file → dùng lại, không gọi AI
    const b = await taiLen("BaoCao_Tuan29_BQLDA_QuangTri_ban1.docx");
    expect((await ketQuaKiemAi(q, b.id, b.pb)).trang_thai).toBe("xong");
    expect(aiGia.runAI).toHaveBeenCalledTimes(1);

    // Đổi mức luật (không đổi nội dung) → không kiểm lại, mức mới hiện ngay
    luatGia.ds = [{ ...L1, muc: "canh_bao", phien_ban: 2 }, L2];
    const r3 = await ketQuaKiemAi(q, a.id, a.pb);
    expect(r3.trang_thai).toBe("xong");
    expect(r3.ket_qua[0].muc).toBe("canh_bao");
    expect(aiGia.runAI).toHaveBeenCalledTimes(1);

    // Sửa nội dung luật → dấu bộ luật đổi → kiểm lại
    luatGia.ds = [{ ...L1, huong_dan_ai: "Hạng mục chậm quá 7 ngày phải nêu nguyên nhân và biện pháp", phien_ban: 3 }, L2];
    aiGia.runAI.mockResolvedValue(JSON.stringify({ luat: [{ id: "L1", dat: true, thong_diep: "Đã nêu" }, { id: "L2", dat: true, thong_diep: "Đạt" }] }));
    expect((await ketQuaKiemAi(q, a.id, a.pb)).trang_thai).toBe("dang_kiem");
    await choLuotAiXong();
    const r4 = await ketQuaKiemAi(q, a.id, a.pb);
    expect(r4.trang_thai).toBe("xong");
    expect(r4.ket_qua.map((k) => k.dat)).toEqual([true, true]);
    expect(aiGia.runAI).toHaveBeenCalledTimes(2);
    expect(aiGia.runAI.mock.calls[1][0]).toContain("phải nêu nguyên nhân và biện pháp");
    // Thêm luật → cũng kiểm lại
    luatGia.ds = [L1, L2, luatAi("l-ba", "Báo cáo phải có chữ ký")];
    expect((await ketQuaKiemAi(q, b.id, b.pb)).trang_thai).toBe("dang_kiem");
    await choLuotAiXong();
    expect(aiGia.runAI).toHaveBeenCalledTimes(3);
  });

  it("AI trả sai JSON → 'loi', mọi luật dat null; không tự gọi lại; thu_lai / batDauKiemAi chạy lại", async () => {
    await tatGopY();
    aiGia.runAI.mockResolvedValue("Xin lỗi, em không đọc được file này.");
    const a = await taiLen("BaoCao_Tuan29_BQLDA_QuangTri_ban2.docx");
    await ketQuaKiemAi(q, a.id, a.pb);
    await choLuotAiXong();
    const r = await ketQuaKiemAi(q, a.id, a.pb);
    expect(r.trang_thai).toBe("loi");
    expect(r.loi).toMatch(/JSON/);
    expect(r.ket_qua.map((k) => k.dat)).toEqual([null, null]);
    expect(r.ket_qua[0]).toMatchObject({ luat_id: "l-nguyen-nhan", khi_ai_loi: "chan", muc: "chan" });
    expect((await ketQuaKiemAi(q, a.id, a.pb)).trang_thai).toBe("loi");
    expect(aiGia.runAI).toHaveBeenCalledTimes(1);
    // Thử lại: AI treo → quá thời gian chờ → vẫn lỗi, không treo
    aiGia.runAI.mockImplementation(() => new Promise(() => undefined));
    expect((await ketQuaKiemAi(q, a.id, a.pb, { thu_lai: true, thoiGianChoMs: 30 })).trang_thai).toBe("dang_kiem");
    await choLuotAiXong();
    const r2 = await ketQuaKiemAi(q, a.id, a.pb);
    expect(r2.trang_thai).toBe("loi");
    expect(r2.loi).toMatch(/không trả lời/);
    // batDauKiemAi cũng chạy lại được
    aiGia.runAI.mockResolvedValue(TRA_LOI_LUAT);
    await batDauKiemAi(q, a.id, a.pb);
    await choLuotAiXong();
    expect((await ketQuaKiemAi(q, a.id, a.pb)).trang_thai).toBe("xong");
    expect(aiGia.runAI).toHaveBeenCalledTimes(3);
  });

  it("AI tắt → 'loi' với từng luật dat null, không gọi AI", async () => {
    aiGia.mode = "off";
    const a = await taiLen("BaoCao_Tuan29_BQLDA_QuangTri_ban2.docx");
    const r = await ketQuaKiemAi(q, a.id, a.pb);
    expect(r.trang_thai).toBe("loi");
    expect(r.ket_qua).toHaveLength(2);
    expect(r.ket_qua.every((k) => k.dat === null)).toBe(true);
    expect(aiGia.runAI).not.toHaveBeenCalled();
  });

  it("GỘP với góp ý AI: mỗi file một lượt AI, kết quả góp ý và luật đều được lưu", async () => {
    aiGia.runAI.mockResolvedValue(
      JSON.stringify({
        gop_y: [{ vi_tri: "o:nguoi_kiem_soat", loai: "khac", thong_diep: "Người kiểm soát nên ghi tên người" }],
        luat: [
          { id: "L1", dat: true, thong_diep: "Đã nêu nguyên nhân" },
          { id: "L2", dat: false, thong_diep: "Rủi ro dòng 1 chưa có kiến nghị", vi_tri: "bang:bang_kien_nghi:1:kien_nghi" },
        ],
      }),
    );
    const a = await taiLen("BaoCao_Tuan28_BQLDA_QuangTri.docx");
    expect(a.mau).toBe("form-7");
    // Màn Soạn và gửi hỏi góp ý trước, rồi hỏi luật AI
    expect((await layGopY(q, a.id, a.pb)).trang_thai).toBe("dang_gop_y");
    expect((await ketQuaKiemAi(q, a.id, a.pb)).trang_thai).toBe("dang_kiem");
    await choLuotAiXong();
    expect(aiGia.runAI).toHaveBeenCalledTimes(1);
    const system = aiGia.runAI.mock.calls[0][1] as string;
    expect(system).toContain('"gop_y"');
    expect(system).toContain('"luat"');
    const gy = await layGopY(q, a.id, a.pb);
    expect(gy.trang_thai).toBe("xong");
    expect(gy.gop_y[0]).toMatchObject({ muc: "goi_y", vi_tri: { tag: "nguoi_kiem_soat" } });
    const kl = await ketQuaKiemAi(q, a.id, a.pb);
    expect(kl.trang_thai).toBe("xong");
    expect(kl.ket_qua[1]).toMatchObject({ luat_id: "l-kien-nghi", dat: false });
    expect(aiGia.runAI).toHaveBeenCalledTimes(1);
  });

  it("GỘP theo chiều ngược: hỏi luật AI trước → góp ý cũng có sẵn, không gọi AI thêm", async () => {
    aiGia.runAI.mockResolvedValue(JSON.stringify({ gop_y: [], luat: [{ id: "L1", dat: true, thong_diep: "Đạt" }, { id: "L2", dat: true, thong_diep: "Đạt" }] }));
    const a = await taiLen("BaoCao_Tuan29_BQLDA_MatO.docx");
    if (a.mau !== "form-7") luatGia.ds = [{ ...L1, ap_dung: "tat_ca" }, { ...L2, ap_dung: "tat_ca" }];
    expect((await ketQuaKiemAi(q, a.id, a.pb)).trang_thai).toBe("dang_kiem");
    expect((await layGopY(q, a.id, a.pb)).trang_thai).toBe("dang_gop_y");
    await choLuotAiXong();
    expect((await layGopY(q, a.id, a.pb)).trang_thai).toBe("xong");
    expect((await ketQuaKiemAi(q, a.id, a.pb)).trang_thai).toBe("xong");
    expect(aiGia.runAI).toHaveBeenCalledTimes(1);
  });
});
