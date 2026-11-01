// AI góp ý nội dung trước khi gửi (kỹ năng /kiem-tra-mau): chạy nền, lưu theo sha256, KHÔNG BAO GIỜ chặn gửi.
// runAI luôn là bản giả (vi.mock) — test không gọi AI thật tốn phí.
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";

const aiGia = vi.hoisted(() => ({ runAI: vi.fn<(...a: unknown[]) => Promise<string>>(), mode: "claude-cli" as "claude-cli" | "api" | "off" }));

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
vi.mock("@/lib/so-cai/dich-vu", async (goc) => {
  const g = await import("../fixtures/gia-lap");
  return g.boc((await goc()) as Record<string, unknown>, g.giaLapSoCai);
});

import { csdlMoi, nguoi } from "../helpers/csdl";
import { layQ, tx, type Q } from "@/lib/db";
import { MAC_DINH } from "@/lib/cau-hinh/mac-dinh";
import { docWord } from "@/lib/kiem-tra/doc-word";
import { kiemTraDayDu, gopYNoiDung, layMau } from "@/lib/kiem-tra/kiem-tra";
import { dungYeuCauGopY, ganViTri, gopYBangAi, phanTichGopY } from "@/lib/kiem-tra/gop-y-ai";
import { choGopYXong, layGopY } from "@/lib/kiem-tra/gop-y-luu";
import { napDanhBa } from "@/lib/kiem-tra/phan-giai";
import { taiLenVaKiemTra } from "@/lib/gui/tai-len";
import type { MauWord, NguoiDungPhien } from "@/lib/types";
import { khoTam, tep, viDu, datCauHinh, xoaCauHinh } from "../fixtures/chuan-bi";

let q: Q;
let nd: NguoiDungPhien;
let mau6: MauWord;

/** Câu trả lời mẫu của AI cho báo cáo SCI E&C bản 1 (có rào ```json và một mục lỗi/vị trí lạ). */
const TRA_LOI_DUNG = [
  "```json",
  JSON.stringify({
    gop_y: [
      { vi_tri: "muc:TIẾN ĐỘ THU VỐN & HỢP ĐỒNG", loai: "muc_trong", thong_diep: "TĐ Nậm Khiên 1 còn \"......\" ở GT giải ngân LK, % GT HĐ, phải thu quá hạn" },
      { vi_tri: "bang:bang_cong_viec:2:ket_thuc", loai: "khac", thong_diep: "Rotor turbine chưa có hạn hoàn thành" },
      { vi_tri: "o:nguoi_kiem_soat", loai: "chinh_ta_ten", thong_diep: "Người kiểm soát nên ghi tên người, không ghi chức vụ" },
      { vi_tri: "Mục III", loai: "mau_thuan", thong_diep: "Tổng lao động phổ thông 1.395 không khớp tổng các dòng" },
      { vi_tri: "chỗ không có", loai: "loai_la", thong_diep: "Góp ý không gắn được vị trí" },
      { loai: "khac" }, // thiếu thông điệp → bỏ
      "rác",
    ],
  }),
  "```",
].join("\n");

async function taiLen(ten: string, nguoiGui = nd) {
  const r = await tx((t) => taiLenVaKiemTra(t, nguoiGui, { tep: tep(ten) }));
  return { id: r.tai_lieu_id!, pb: r.phien_ban!, kq: r.ket_qua };
}

beforeAll(async () => {
  khoTam();
  await csdlMoi();
  q = await layQ();
  nd = await nguoi("nv.enc@scigroup.vn");
  mau6 = (await layMau(q, "form-6"))!;
});

beforeEach(() => {
  aiGia.runAI.mockReset();
  aiGia.mode = "claude-cli";
});

afterEach(async () => {
  await choGopYXong();
  await xoaCauHinh(q, "ai");
  await xoaCauHinh(q, "luat_kiem_tra");
});

describe("phân tích câu trả lời của AI", () => {
  it("JSON đúng → góp ý mức goi_y, gắn đúng tag / mục / bảng-dòng-cột; mục sai bỏ qua", async () => {
    const noiDung = await docWord(viDu("BaoCao_Thang7_SCI_ENC.docx"));
    const ds = phanTichGopY(TRA_LOI_DUNG, noiDung, mau6);
    expect(ds).toHaveLength(5);
    expect(ds.every((g) => g.muc === "goi_y" && g.luat === "noi_dung_ai")).toBe(true);
    expect(ds[0]).toMatchObject({ loai: "muc_trong", vi_tri: { tag: "muc:TIẾN ĐỘ THU VỐN & HỢP ĐỒNG" } });
    expect(ds[1]).toMatchObject({ vi_tri: { bang: "bang_cong_viec", dong: 2, cot: "ket_thuc" } });
    expect(ds[2]).toMatchObject({ loai: "chinh_ta_ten", vi_tri: { tag: "nguoi_kiem_soat" } });
    expect(ds[3]).toMatchObject({ loai: "mau_thuan", vi_tri: { tag: "muc:NHÂN LỰC & AN TOÀN LAO ĐỘNG" } });
    expect(ds[4]).toMatchObject({ loai: "khac", cho: "chỗ không có" });
    expect(ds[4].vi_tri).toBeUndefined();
    // Mảng trần, tên mục kèm số La Mã
    expect(ganViTri("IV. TIẾN ĐỘ THU VỐN & HỢP ĐỒNG", noiDung, mau6)).toEqual({ tag: "muc:TIẾN ĐỘ THU VỐN & HỢP ĐỒNG" });
    expect(phanTichGopY('Đây: [{"vi_tri":"o:ngay_lap","loai":"khac","thong_diep":"x"}]', noiDung, mau6)[0].vi_tri).toEqual({ tag: "ngay_lap" });
  });

  it("JSON hỏng → ném lỗi (nơi gọi bỏ qua)", async () => {
    const noiDung = await docWord(viDu("BaoCao_Thang7_SCI_ENC.docx"));
    expect(() => phanTichGopY("Xin chào, em là trợ lý", noiDung, mau6)).toThrow(/JSON/);
    expect(() => phanTichGopY('{"ket_qua": 1}', noiDung, mau6)).toThrow(/gop_y/);
  });

  it("yêu cầu gửi AI: có tên mẫu, vị trí hợp lệ, danh bạ, số liệu mục IV; độ dài có giới hạn", async () => {
    const noiDung = await docWord(viDu("BaoCao_Thang7_SCI_ENC.docx"));
    const { system, prompt } = dungYeuCauGopY(noiDung, mau6, await napDanhBa(q));
    expect(prompt).toContain(mau6.ten);
    expect(prompt).toContain("muc:TIẾN ĐỘ THU VỐN & HỢP ĐỒNG");
    expect(prompt).toContain("bang:bang_cong_viec");
    expect(prompt).toContain("o:nguoi_lap");
    expect(prompt).toContain("SCI E&C");
    expect(prompt).toContain("2.650,0");
    expect(prompt.length).toBeLessThanOrEqual(24_100);
    expect(system).toContain('"gop_y"');
    expect(system).toContain("muc_trong");
  });

  it("quá thời gian chờ → lỗi rõ ràng, không treo", async () => {
    aiGia.runAI.mockImplementation(() => new Promise(() => undefined));
    const noiDung = await docWord(viDu("BaoCao_Thang7_SCI_ENC.docx"));
    await expect(gopYBangAi(noiDung, mau6, { thoiGianChoMs: 30 })).rejects.toThrow(/không trả lời/);
  });

  it("gopYNoiDung có AI: giữ phần dò \"......\", thêm góp ý AI mức goi_y; AI lỗi thì chỉ còn phần dò", async () => {
    const noiDung = await docWord(viDu("BaoCao_Thang7_SCI_ENC.docx"));
    const chuaDien = MAC_DINH.luat_kiem_tra.gia_tri_chua_dien;
    aiGia.runAI.mockResolvedValue(TRA_LOI_DUNG);
    const co = await gopYNoiDung(noiDung, mau6, chuaDien, { thoiGianChoMs: 1000 });
    expect(co.filter((g) => g.muc === "goi_y")).toHaveLength(5);
    expect(co.some((g) => !g.muc && g.vi_tri?.tag === "muc:TIẾN ĐỘ THU VỐN & HỢP ĐỒNG")).toBe(true);
    aiGia.runAI.mockRejectedValue(new Error("Claude CLI thoát với mã 1"));
    const loi = await gopYNoiDung(noiDung, mau6, chuaDien, { thoiGianChoMs: 1000 });
    expect(loi.length).toBeGreaterThan(0);
    expect(loi.every((g) => !g.muc)).toBe(true);
  });
});

describe("góp ý nền theo tài liệu / phiên bản / sha256", () => {
  it("tải lên không gọi AI và không chờ AI; góp ý không bao giờ làm dat=false", async () => {
    aiGia.runAI.mockResolvedValue(TRA_LOI_DUNG);
    const kq = await kiemTraDayDu(q, nd, viDu("BaoCao_Thang7_SCI_ENC.docx"), "enc.docx");
    expect(aiGia.runAI).not.toHaveBeenCalled();
    expect(kq.dat).toBe(true);
    expect(kq.loi.filter((l) => l.luat === "noi_dung_ai").every((l) => l.muc !== "chan")).toBe(true);
  });

  it("lần hỏi đầu: đang góp ý → xong, đúng vị trí; kết quả kiểm tra đã lưu vẫn đạt; cùng file không gọi AI lại", async () => {
    aiGia.runAI.mockResolvedValue(TRA_LOI_DUNG);
    const a = await taiLen("BaoCao_Thang7_SCI_ENC.docx");
    expect(a.kq.dat).toBe(true);
    const r1 = await layGopY(q, a.id, a.pb);
    expect(r1.trang_thai).toBe("dang_gop_y");
    // hỏi dồn trong lúc AI đang chạy: vẫn chỉ một lần gọi AI
    expect((await layGopY(q, a.id, a.pb)).trang_thai).toBe("dang_gop_y");
    await choGopYXong();
    const r2 = await layGopY(q, a.id, a.pb);
    expect(r2.trang_thai).toBe("xong");
    expect(r2.gop_y).toHaveLength(5);
    expect(r2.gop_y.every((g) => g.muc === "goi_y")).toBe(true);
    expect(r2.gop_y[0].vi_tri).toEqual({ tag: "muc:TIẾN ĐỘ THU VỐN & HỢP ĐỒNG" });
    expect(r2.model).toBe(MAC_DINH.ai.model_mac_dinh);
    expect(aiGia.runAI).toHaveBeenCalledTimes(1);
    expect(aiGia.runAI.mock.calls[0][3]).toBe(MAC_DINH.ai.model_mac_dinh);
    // Góp ý không đụng tới kết quả kiểm tra đã lưu
    const { rows } = await q.query<{ ket_qua_kiem_tra: { dat: boolean } }>(
      "SELECT ket_qua_kiem_tra FROM docflow.phien_ban_tep WHERE tai_lieu_id = $1 AND phien_ban = $2",
      [a.id, a.pb],
    );
    expect(rows[0].ket_qua_kiem_tra.dat).toBe(true);

    // Tài liệu khác, cùng file (cùng sha256) → dùng lại ngay, không gọi AI
    const b = await taiLen("BaoCao_Thang7_SCI_ENC.docx");
    expect(b.id).not.toBe(a.id);
    const r3 = await layGopY(q, b.id, b.pb);
    expect(r3.trang_thai).toBe("xong");
    expect(r3.gop_y).toEqual(r2.gop_y);
    expect(aiGia.runAI).toHaveBeenCalledTimes(1);
    const { rows: dem } = await q.query<{ n: number }>("SELECT count(*)::int n FROM docflow.gop_y_ai WHERE sha256 = (SELECT sha256 FROM docflow.phien_ban_tep WHERE tai_lieu_id = $1 AND phien_ban = $2)", [a.id, a.pb]);
    expect(dem[0].n).toBe(2);
  });

  it("AI trả sai JSON → trạng thái lỗi, không ném; không tự gọi lại; thu_lai chạy lại (quá giờ → lỗi)", async () => {
    aiGia.runAI.mockResolvedValue("Xin lỗi, em không đọc được file này.");
    const a = await taiLen("BaoCao_Thang7_SCI_ENC_ban2.docx");
    expect(a.kq.dat).toBe(true);
    expect((await layGopY(q, a.id, a.pb)).trang_thai).toBe("dang_gop_y");
    await choGopYXong();
    const r = await layGopY(q, a.id, a.pb);
    expect(r.trang_thai).toBe("loi");
    expect(r.loi).toMatch(/JSON/);
    expect(r.gop_y).toEqual([]);
    expect(aiGia.runAI).toHaveBeenCalledTimes(1);
    // Hỏi lại không thu_lai: giữ lỗi, không gọi AI tốn phí
    expect((await layGopY(q, a.id, a.pb)).trang_thai).toBe("loi");
    expect(aiGia.runAI).toHaveBeenCalledTimes(1);
    // Thử lại, AI treo → quá thời gian chờ → lỗi
    aiGia.runAI.mockImplementation(() => new Promise(() => undefined));
    expect((await layGopY(q, a.id, a.pb, { thu_lai: true, thoiGianChoMs: 30 })).trang_thai).toBe("dang_gop_y");
    await choGopYXong();
    const r2 = await layGopY(q, a.id, a.pb);
    expect(r2.trang_thai).toBe("loi");
    expect(r2.loi).toMatch(/không trả lời/);
    expect(aiGia.runAI).toHaveBeenCalledTimes(2);
    // AI ném lỗi (vd CLI bận) → cũng chỉ là lỗi góp ý
    aiGia.runAI.mockRejectedValue(new Error("Máy chủ đang xử lý 3 yêu cầu AI khác"));
    await layGopY(q, a.id, a.pb, { thu_lai: true });
    await choGopYXong();
    expect((await layGopY(q, a.id, a.pb)).loi).toMatch(/Máy chủ đang xử lý/);
  });

  it("tắt ai.bat_gop_y / tắt luật noi_dung_ai / kết nối AI tắt → trạng thái tắt, không gọi AI", async () => {
    aiGia.runAI.mockResolvedValue(TRA_LOI_DUNG);
    const nx = await nguoi("gd.namxe@scigroup.vn").catch(() => null);
    const a = nx ? await taiLen("BaoCao_Tuan29_NM_NamXe.docx", nx) : await taiLen("BaoCao_Thang7_SCI_ENC.docx");
    await datCauHinh(q, "ai", { ...MAC_DINH.ai, bat_gop_y: false });
    const r = await layGopY(q, a.id, a.pb);
    expect(r).toMatchObject({ trang_thai: "tat", gop_y: [] });
    expect(r.ly_do).toMatch(/tắt/);
    await xoaCauHinh(q, "ai");
    await datCauHinh(q, "luat_kiem_tra", {
      ...MAC_DINH.luat_kiem_tra,
      luat: MAC_DINH.luat_kiem_tra.luat.map((l) => (l.ma === "noi_dung_ai" ? { ...l, bat: false } : l)),
    });
    expect((await layGopY(q, a.id, a.pb)).trang_thai).toBe("tat");
    await xoaCauHinh(q, "luat_kiem_tra");
    aiGia.mode = "off";
    expect((await layGopY(q, a.id, a.pb)).trang_thai).toBe("tat");
    await choGopYXong();
    expect(aiGia.runAI).not.toHaveBeenCalled();
    const { rows } = await q.query<{ n: number }>("SELECT count(*)::int n FROM docflow.gop_y_ai WHERE tai_lieu_id = $1", [a.id]);
    expect(rows[0].n).toBe(0);
  });
});
