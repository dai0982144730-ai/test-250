// LUẬT 33 — phần HỎI của Main (chép bài kiểm bản Tiến độ): giữ chỗ → hỏi trùng → trùng thì bản ghi trùng (không soạn) · không trùng thì
// LLM soạn · hỏi ngầm thấy trùng muộn thì gắn cờ · "Vẫn soạn việc riêng" dùng lại bản ghi trùng.
// Kho nháp nằm trong thư mục dữ liệu test (vitest.config.ts đặt THU_MUC_DU_LIEU). Giả bước hỏi + AI — không gọi agent / AI thật.
import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { gocDuLieu } from "@/lib/goc-du-lieu";
import type { KetQuaHoiTrung } from "@/lib/chung/hoi-trung-kieu";
import type { TheCanhBao } from "@/lib/canh-bao/model";

const gia = vi.hoisted(() => ({
  hoi: vi.fn(),
  ai: vi.fn(async () => '{"ten":"Đẩy nhanh 6.1.4 Cung cấp Hub","moTa":"Vì thẻ báo chậm 12 ngày. Làm việc với nhà cung cấp."}'),
}));
vi.mock("@/lib/chung/hoi-trung-hoi", () => ({ hoiTrungTruocKhiSoan: gia.hoi }));
vi.mock("@/lib/ai/providers", () => ({ runAI: gia.ai }));
vi.mock("@/lib/nhat-ky/so", () => ({ goiCoGhi: (_nc: unknown, fn: () => Promise<unknown>) => fn() }));
vi.mock("@/lib/chung/tu-dien-ma-du-an", () => ({ ganTenLlm: async (s: string) => s, tuDienDuAn: async () => ({}) }));
vi.mock("@/lib/projects", () => ({ listProjects: () => [{ id: "dien-gio-huong-viet-hv-du-lieu", ma: "HV" }] }));

import { docNhapCua, docTatCaNhap, ghiNhapCoHoiTrung, nhapTheoThe, soanViecTuIssue } from "@/lib/chung/viec-ai-soan";

const PID = "dien-gio-huong-viet-hv-du-lieu";
const TEP = path.join(gocDuLieu(), "viec", "viec-ai-soan.json");
const THE = {
  id: "ISS-TEST-001",
  mucDo: "red",
  tieuDe: "6.1.4 Cung cấp Hub chậm 12 ngày",
  phanTich: "Hub về công trường trễ 12 ngày so với kế hoạch",
  wbs: "6.1.4",
  anhHuongCod: 12,
  deXuat: "Làm việc với nhà cung cấp đẩy nhanh giao hàng",
} as unknown as TheCanhBao;

const kqKhongTrung = (chua: string[] = []): KetQuaHoiTrung => ({ trung: null, nghi: [], da_hoi: ["hopdong", "phaply", "base", "main"].filter((a) => !chua.includes(a)), chua_hoi_duoc: chua });
const kqTrung = (): KetQuaHoiTrung => ({
  trung: { agent: "base", trung: true, cach_phan: "ai", so_ung_vien: 1, ly_do: "cùng khởi công 6.1.4", viec: { ma: "CV-2026-0132", noi_dung: "Khởi công 6.1.4 Cung cấp Hub", trang_thai: "da_giao", nguoi_nhan: "Ban ĐH" } },
  nghi: [],
  da_hoi: ["base"],
  chua_hoi_duoc: [],
});

beforeEach(() => {
  fs.mkdirSync(path.dirname(TEP), { recursive: true });
  fs.writeFileSync(TEP, "[]\n", "utf8");
  gia.hoi.mockReset();
  gia.ai.mockClear();
});

describe("nút AI soạn việc giao — soanViecTuIssue", () => {
  it("trùng ngay → không gọi AI soạn, nháp thành bản ghi trùng: không hiện ở Việc của tôi, thẻ mang câu trùng", async () => {
    gia.hoi.mockResolvedValueOnce(kqTrung());
    const kq = await soanViecTuIssue(THE, "dainc", PID);
    expect(kq.ok).toBe(true);
    expect(kq.trung?.tomTat).toContain('Việc này đã được agent Công việc soạn giao việc có nội dung là "Khởi công 6.1.4 Cung cấp Hub"');
    expect(gia.ai).not.toHaveBeenCalled();
    expect(docNhapCua("dainc")).toHaveLength(0);
    expect(nhapTheoThe(["dainc"])[THE.id]).toMatchObject({ coNhap: false, trung: kq.trung!.tomTat });
    // câu hỏi gửi đi: mã ngắn dự án + mã WBS số của thẻ + lúc giữ chỗ
    const [cau, tuyChon] = gia.hoi.mock.calls[0] as [Record<string, unknown>, Record<string, unknown>];
    expect(cau).toMatchObject({ ma_du_an: "HV", ma_wbs: "6.1.4" });
    expect(typeof cau.luc_giu_cho).toBe("string");
    expect(tuyChon).toMatchObject({ cho: "nguoi", duong: "tay" });
  });

  it("không trùng → AI soạn 1 lần, nháp hiện kèm kết quả hỏi, hết giữ chỗ", async () => {
    gia.hoi.mockResolvedValueOnce(kqKhongTrung(["phaply"]));
    const kq = await soanViecTuIssue(THE, "dainc", PID);
    expect(kq.ok && kq.nhap).toBeTruthy();
    expect(gia.ai).toHaveBeenCalledTimes(1);
    const ds = docNhapCua("dainc");
    expect(ds).toHaveLength(1);
    expect(ds[0]).toMatchObject({ ten: "Đẩy nhanh 6.1.4 Cung cấp Hub", tuIssue: THE.id, hoiTrung: { chuaHoiDuoc: ["phaply"] } });
    expect(ds[0].dangHoi).toBeUndefined();
    expect(nhapTheoThe(["dainc"])[THE.id]).toMatchObject({ coNhap: true });
  });

  it("lượt hỏi ngầm thấy trùng muộn → GẮN CỜ, nháp vẫn hiện", async () => {
    gia.hoi.mockImplementationOnce(async (_c: unknown, t: { sauKhiHoiNot: (k: KetQuaHoiTrung) => void }) => {
      setTimeout(() => t.sauKhiHoiNot(kqTrung()), 0);
      return kqKhongTrung(["base"]);
    });
    await soanViecTuIssue(THE, "dainc", PID);
    await new Promise((r) => setTimeout(r, 10));
    const ds = docNhapCua("dainc");
    expect(ds).toHaveLength(1);
    expect(ds[0].hoiTrung).toMatchObject({ muon: true, trung: { ma: "CV-2026-0132" } });
    expect(nhapTheoThe(["dainc"])[THE.id]).toMatchObject({ coNhap: true });
  });

  it("\"Vẫn soạn việc riêng\" → dùng lại bản ghi trùng (cùng mã), không hỏi lại, AI soạn", async () => {
    gia.hoi.mockResolvedValueOnce(kqTrung());
    const dau = await soanViecTuIssue(THE, "dainc", PID);
    const kq = await soanViecTuIssue(THE, "dainc", PID, { vanSoan: true });
    expect(gia.hoi).toHaveBeenCalledTimes(1);
    expect(kq.nhap?.id).toBe(dau.nhap?.id);
    expect(docTatCaNhap()).toHaveLength(1);
    expect(docNhapCua("dainc")[0]).toMatchObject({ vanSoan: { nguoi: "dainc" }, hoiTrung: { trung: { ma: "CV-2026-0132" } } });
  });

  it("AI soạn lỗi → trả giữ chỗ (xoá nháp), không để rác", async () => {
    gia.hoi.mockResolvedValueOnce(kqKhongTrung());
    gia.ai.mockRejectedValueOnce(new Error("hết hạn mức"));
    await expect(soanViecTuIssue(THE, "dainc", PID)).rejects.toThrow();
    expect(docTatCaNhap()).toHaveLength(0);
  });

  it("đang giữ chỗ cho thẻ (bấm hai lần) → lần hai bị chặn, không hỏi thêm", async () => {
    let tha: (k: KetQuaHoiTrung) => void = () => undefined;
    gia.hoi.mockImplementationOnce(() => new Promise<KetQuaHoiTrung>((r) => (tha = r)));
    const lan1 = soanViecTuIssue(THE, "dainc", PID);
    await new Promise((r) => setTimeout(r, 0));
    const lan2 = await soanViecTuIssue(THE, "dainc", PID);
    expect(lan2.ok).toBe(false);
    expect(gia.hoi).toHaveBeenCalledTimes(1);
    tha(kqKhongTrung());
    await lan1;
    expect(docNhapCua("dainc")).toHaveLength(1);
  });
});

describe("trợ lý chat soạn nháp từ câu nói — ghiNhapCoHoiTrung", () => {
  const VAO = { nguoi: "dainc", ten: "Họp dân thôn 3 về đền bù", moTa: "", projectId: PID };

  it("trùng → bản ghi trùng (ẩn), vanSoan → dùng lại chính nó", async () => {
    gia.hoi.mockResolvedValueOnce(kqTrung());
    const a = await ghiNhapCoHoiTrung(VAO, { duong: "A" });
    expect(a.trung).toBeTruthy();
    expect(docNhapCua("dainc")).toHaveLength(0);
    const b = await ghiNhapCoHoiTrung(VAO, { duong: "A", vanSoan: true });
    expect(b.trung).toBeUndefined();
    expect(b.nhap.id).toBe(a.nhap.id);
    expect(docNhapCua("dainc")).toHaveLength(1);
    expect(gia.hoi).toHaveBeenCalledTimes(1);
  });

  it("không trùng → nháp hiện, giữ chỗ được gỡ", async () => {
    gia.hoi.mockResolvedValueOnce(kqKhongTrung());
    const a = await ghiNhapCoHoiTrung(VAO, { duong: "A" });
    expect(a.trung).toBeUndefined();
    expect(docNhapCua("dainc")).toMatchObject([{ id: a.nhap.id, hoiTrung: { tomTat: expect.stringContaining("không trùng") } }]);
  });
});
